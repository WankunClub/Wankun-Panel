// ── RECOMPRAS ─────────────────────────────────────────────────────────────────
let avTodos=[],avFiltered=[],avPredicciones={};

async function avConectar(){
  const st=document.getElementById('av-status');
  st.className='conn-status conn-loading';st.textContent='Calculando...';
  try{
    const[vRows,fRows]=await Promise.all([fetchCSV('Ventas'),fetchCSV('Flex meli')]);
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const flexClientes=fRows.map(r=>{
      const nom=(r['NOMBRE']||'').trim();
      const tel=(r['TELEFONO']||'').toString();
      const recompraFecha=parseFecha(r['Recompra']||r['recompra']||'');
      const ultimaFecha=parseFecha(r['Fecha compra']||'');
      if(!nom)return null;
      // Permitir registros sin recompraFecha para que aparezcan en "Compraron ayer"
      const diasHastaRecompra=recompraFecha?Math.floor((recompraFecha-hoy)/(1000*60*60*24)):null;
      let estado='ok';
      if(diasHastaRecompra!==null&&diasHastaRecompra<-2)estado='vencido';
      else if(diasHastaRecompra!==null&&diasHastaRecompra<=2)estado='proximo';
      return{nombre:nom,localidad:r['LOCALIDAD']||'',direccion:r['DIRECCION']||'',telefono:tel,nCompras:1,ultima:ultimaFecha||(recompraFecha||null),dias:ultimaFecha?Math.floor((hoy-ultimaFecha)/(1000*60*60*24)):null,freq:null,prox:diasHastaRecompra,recompraFecha:recompraFecha||null,estado,ultimoProd:r['REFERNCIA']||'',fuente:'Flex Meli'};
    }).filter(Boolean);
    // Historial de compras Flex Meli por cliente, para cruzar con Ventas (mismo cliente, distinto canal)
    const normTel=t=>(t||'').toString().replace(/\D/g,'');
    const flexFechasPorTel={},flexFechasPorNombre={};
    fRows.forEach(r=>{
      const tel=normTel(r['TELEFONO']);
      const nom=(r['NOMBRE']||'').trim().toLowerCase();
      const f=parseFecha(r['Fecha compra']||'');
      if(!f||isNaN(f)||f>hoy)return;
      if(tel&&tel.length>=8)(flexFechasPorTel[tel]=flexFechasPorTel[tel]||[]).push(f);
      if(nom)(flexFechasPorNombre[nom]=flexFechasPorNombre[nom]||[]).push(f);
    });
    const hist={};
    vRows.forEach(r=>{
      const nom=(r['CLIENTE']||r['Cliente']||'').trim();
      if(!nom)return;
      const f=parseFecha(r['FECHA']||r['Fecha']||'');
      if(!f||isNaN(f)||f>hoy)return;
      // Identidad de cliente: SIEMPRE por telefono cuando existe (unico ID confiable).
      // Agrupar por nombre parte el historial de un mismo cliente en variantes de tipeo
      // (mayusculas, espacios, con/sin segundo nombre) y le hace perder la frecuencia
      // de recompra calculada -> desaparece de "Preparar stock" aunque compre seguido.
      // Telefono siempre esta en la columna K de Ventas (confirmado) -> si el encabezado
      // no matchea textualmente "TELEFONO" (tilde/mayuscula/otro nombre), usamos la columna
      // K por posicion (_col10) como respaldo, validando que tenga cara de telefono (6+ digitos).
      const telHeader=getCol(r,'TELEFONO','Teléfono','TELÉFONO','Telefono','telefono','Cel','Celular');
      const telColK=(r['_col10']||'').toString();
      const telRaw=(telHeader||(/\d{6,}/.test(telColK)?telColK:'')).toString().trim();
      const telN=normTel(telRaw);
      const key=telN&&telN.length>=8?('T:'+telN):('N:'+nom.toLowerCase());
      if(!hist[key])hist[key]={nombre:nom,localidad:r['Barrio/Localidad']||r['Localidad']||'',telefono:'',compras:[]};
      if(telRaw&&!hist[key].telefono)hist[key].telefono=telRaw;
      hist[key].compras.push({fecha:f,fac:parseFac(getCol(r,'Facturación','Facturacion',' Facturación')||0),kg:parseFloat((getCol(r,'kg')||0).toString().replace(',','.'))||0,producto:[r['Marca']||'',r['producto']||''].filter(Boolean).join(' - ')});
    });
    const ventasClientes=Object.values(hist).map(c=>{
      c.compras.sort((a,b)=>a.fecha-b.fecha);
      const ultima=c.compras[c.compras.length-1].fecha;
      const dias=Math.floor((hoy-ultima)/(1000*60*60*24));
      // Cruzar con compras Flex Meli del mismo cliente (por telefono, respaldo por nombre) para no perder frecuencia real entre canales
      const telN=normTel(c.telefono);
      const flexFechas=(telN&&flexFechasPorTel[telN])?flexFechasPorTel[telN]:(flexFechasPorNombre[c.nombre.toLowerCase()]||[]);
      const todasFechas=[...c.compras.map(x=>x.fecha),...flexFechas].sort((a,b)=>a-b);
      let freq=null;
      if(todasFechas.length>=2){const diffs=[];for(let i=1;i<todasFechas.length;i++){const d=Math.floor((todasFechas[i]-todasFechas[i-1])/(1000*60*60*24));if(d>0&&d<200)diffs.push(d);}if(diffs.length)freq=mediana(diffs);}
      let prox=null,estado='sin_datos';
      if(freq){prox=freq-dias;if(prox<-5)estado='vencido';else if(prox<=5)estado='proximo';else estado='ok';}
      else{if(dias>45)estado='vencido';else if(dias>38)estado='proximo';else estado='ok';}
      const ultimaFechaMs=ultima.getTime();
      const ultimosProds=c.compras.filter(x=>x.fecha.getTime()===ultimaFechaMs).map(x=>x.producto).filter(Boolean);
      const ultimoProd=ultimosProds.length?ultimosProds.join(' / '):c.compras[c.compras.length-1].producto;
      // Ciclo POR PRODUCTO: un cliente que compra mas de un alimento (distintas mascotas,
      // o rota entre marcas) tiene un ritmo de recompra propio para CADA producto. Mezclarlos
      // en una sola frecuencia general distorsiona la fecha (ver caso real: Iara Michailenko,
      // compra Diabetic y Pro Plan con ciclos distintos -> la frecuencia mezclada la escondia
      // de "Preparar stock" aunque el Pro Plan ya estaba por vencer).
      // Se usa solo para decidir QUE PRODUCTO mostrar/ofrecer en Preparar stock, no reemplaza
      // freq/prox/estado de arriba (esos siguen alimentando Vencidos, Activos, etc.).
      const porProducto={};
      c.compras.forEach(x=>{const p=x.producto||'Sin especificar';(porProducto[p]=porProducto[p]||[]).push(x.fecha);});
      const ciclosProducto=Object.keys(porProducto).map(p=>{
        const fechasP=porProducto[p].slice().sort((a,b)=>a-b);
        const ultimaP=fechasP[fechasP.length-1];
        const diasP=Math.floor((hoy-ultimaP)/(1000*60*60*24));
        let freqP=null;
        if(fechasP.length>=2){const diffsP=[];for(let i=1;i<fechasP.length;i++){const d=Math.floor((fechasP[i]-fechasP[i-1])/(1000*60*60*24));if(d>0&&d<200)diffsP.push(d);}if(diffsP.length)freqP=mediana(diffsP);}
        return{producto:p,freq:freqP,ultima:ultimaP,dias:diasP,prox:freqP?freqP-diasP:null,nCompras:fechasP.length};
      });
      // El producto "conductor" para Preparar stock: entre los que ya tienen ciclo propio
      // (2+ compras de ESE producto), el que este mas cerca de vencer.
      const conCiclo=ciclosProducto.filter(x=>x.prox!==null).sort((a,b)=>a.prox-b.prox);
      const prodProximo=conCiclo.length?conCiclo[0]:null;
      return{nombre:c.nombre,localidad:c.localidad,direccion:'',telefono:c.telefono,nCompras:todasFechas.length,comprasDirecta:c.compras.length,ultima,dias,freq,prox,estado,ultimoProd,ultimosProds,ciclosProducto,prodProximo,fuente:'Directa'};
    });
    avTodos=[...flexClientes,...ventasClientes];
    avTodos.sort((a,b)=>(a.prox!==null?a.prox:999)-(b.prox!==null?b.prox:999));
    st.className='conn-status conn-ok';st.textContent=avTodos.length+' clientes';
    document.getElementById('av-panel').style.display='block';
    avMetricas();avMostrarStockProx();avMostrarRevisar25();avMostrarVentasHoy();avProyeccion();
    avActualizarPredicciones();
  }catch(e){st.className='conn-status conn-err';st.textContent='Error: '+e.message;console.error(e);}
}

function avMetricas(){
  const directa=avTodos.filter(c=>c.fuente==='Directa');
  const t=directa.length,l=directa.filter(c=>esLocal(c.localidad)).length;
  // "Clientes activos", "Vencidos" y "Proximos 7d" se sacaron temporalmente (17/9) junto con las
  // tarjetas "No compraron lo previsto" y "Compraron 1 sola vez": dependen de la misma identidad
  // de cliente / frecuencia que todavia se esta limpiando. Se reconstruyen cuando eso este resuelto.
  // Alerta de integridad de datos: clientes del canal directo sin telefono en NINGUNA fila de su historial.
  // Estos siguen agrupandose por nombre (unico fallback posible) y quedan expuestos al mismo riesgo de
  // fragmentacion que causo el bug de "Preparar stock" (clientes con compras reales que no aparecian).
  // Si este numero crece, hay que cargar telefonos en la planilla Ventas -- no es un bug de codigo, es un hueco de datos.
  const sinTel=directa.filter(c=>!c.telefono).length;
  const sinTelHtml=sinTel>0?`<div class="metric" title="Clientes sin telefono cargado en Ventas: se agrupan por nombre y pueden fragmentarse/perderse de las predicciones. Cargar el telefono en la planilla."><div class="metric-label">Sin tel (riesgo dup.)</div><div class="metric-value" style="color:#c0392b">${sinTel}</div></div>`:'';
  document.getElementById('av-metrics').innerHTML=`<div class="metric"><div class="metric-label">Clientes unicos (directo)</div><div class="metric-value">${t}</div></div><div class="metric"><div class="metric-label">Zona local</div><div class="metric-value">${l}</div></div>${sinTelHtml}`;
}

function avMostrarHoy(){
  const hoy=new Date();hoy.setHours(0,0,0,0);
  // Antes solo mostraba match exacto con hoy: si se pasaba un dia, el cliente desaparecia sin avisar.
  // Ahora muestra hoy Y todos los atrasados (recompra prevista <= hoy), ordenados de mas atrasado a menos.
  const urgentes=avTodos.filter(c=>{if(c.fuente!=='Flex Meli')return false;if(!c.recompraFecha)return false;const f=new Date(c.recompraFecha);f.setHours(0,0,0,0);return f.getTime()<=hoy.getTime();})
    .sort((a,b)=>new Date(a.recompraFecha)-new Date(b.recompraFecha));
  const tb=document.getElementById('av-hoy');
  if(!urgentes.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin contactos para hoy</div>';return;}
  tb.innerHTML=urgentes.map(c=>{
    const tel=c.telefono||'';
    const f=new Date(c.recompraFecha);f.setHours(0,0,0,0);
    const diasAtraso=Math.round((hoy-f)/(1000*60*60*24));
    const label=diasAtraso<=0?'<span style="color:#c0392b;font-weight:700;font-size:11px">Hoy</span>':`<span style="color:#c0392b;font-weight:700;font-size:11px">Atrasado ${diasAtraso}d</span>`;
    return`<div class="table-row" style="grid-template-columns:1fr 100px 130px 100px 80px"><span style="font-weight:500">${c.nombre}</span>${label}<span style="font-size:11px">${c.localidad||'--'} <span class="${esLocal(c.localidad)?'local-tag':'fuera-tag'}">${esLocal(c.localidad)?'local':'fuera'}</span></span><span style="font-size:12px;color:var(--gris-dark)">${c.ultimoProd||'--'}</span>${tel?`<a class="wa-link" href="${avWaLink(tel,c.nombre,c.ultimoProd)}" target="_blank">WA 🐾</a>`:'<span style="color:var(--gris-dark);font-size:12px">Sin tel</span>'}</div>`;}).join('');
}


function waLinkCamino(tel,nombre){const num=tel.toString().replace(/\D/g,'');const full=num.startsWith('54')?num:'54'+num;const primer=(nombre||'').split(' ')[0];const msg='Hola '+primer+'! Te saluda Nacho de Wankun Club.\nEl alimento para tu mascota ya esta en camino.\nEntregamos hoy.\nSaludos, Nacho';return 'https://wa.me/'+full+'?text='+encodeURIComponent(msg);}

function avMostrarEntregasHoy(){
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const lista=avTodos.filter(function(c){if(c.fuente!=='Flex Meli')return false;if(!c.ultima)return false;const f=new Date(c.ultima);f.setHours(0,0,0,0);return f.getTime()===hoy.getTime();});
  const tb=document.getElementById('av-entregas-hoy');if(!tb)return;
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin entregas hoy</div>';return;}
  tb.innerHTML=lista.map(function(c){const tel=c.telefono||'';const waBtn=tel?'<a class="wa-link" href="'+waLinkCamino(tel,c.nombre)+'" target="_blank">WA 🚚</a>':'<span style="color:var(--gris-dark);font-size:12px">Sin tel</span>';const zonaTag='<span class="'+(esLocal(c.localidad)?'local-tag':'fuera-tag')+'">'+(esLocal(c.localidad)?'local':'fuera')+'</span>';return '<div class="table-row" style="grid-template-columns:1fr 130px 120px 80px"><span style="font-weight:500">'+c.nombre+'</span><span style="font-size:11px">'+(c.localidad||'--')+' '+zonaTag+'</span><span style="font-size:12px;color:var(--gris-dark)">'+(c.ultimoProd||'--')+'</span>'+waBtn+'</div>';}).join('');
}

function avWaLinkAyer(tel,nombre){const num=tel.toString().replace(/\D/g,'');const full=num.startsWith('54')?num:'54'+num;const primer=(nombre||'').split(' ')[0];const msg='Hola '+primer+', cómo está tu perrito? Te escribo porque debe estar por terminarse el alimento. ¿Te gustaría que coordinemos la reposición? Entregamos en el día y como siempre van los snacks de Filan.';return 'https://wa.me/'+full+'?text='+encodeURIComponent(msg);}

function avMostrarReactivar(){
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const lista=avTodos.filter(function(c){if(c.fuente!=='Directa')return false;if(!c.ultima)return false;var f=new Date(c.ultima);f.setHours(0,0,0,0);var dias=Math.round((hoy-f)/(1000*60*60*24));return dias>=90&&dias<=150;}).sort(function(a,b){return(b.dias||0)-(a.dias||0);});
  const tb=document.getElementById('av-reactivar');if(!tb)return;
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin clientes en este rango</div>';return;}
  tb.innerHTML=lista.map(function(c){const tel=c.telefono||'';const hoyD=new Date();hoyD.setHours(0,0,0,0);const ult=new Date(c.ultima);ult.setHours(0,0,0,0);const dias=Math.round((hoyD-ult)/(1000*60*60*24));const waBtn=tel?'<a class="wa-link" href="'+avWaLink(tel,c.nombre,c.ultimoProd)+'" target="_blank">WA</a>':'<span style="color:var(--gris-dark);font-size:12px">Sin tel</span>';const zonaTag='<span class="'+(esLocal(c.localidad)?'local-tag':'fuera-tag')+'">'+(esLocal(c.localidad)?'local':'fuera')+'</span>';return '<div class="table-row" style="grid-template-columns:1fr 130px 60px 80px"><span style="font-weight:500">'+c.nombre+'</span><span style="font-size:11px">'+(c.localidad||'--')+' '+zonaTag+'</span><span style="font-size:12px;color:#9333ea;font-weight:600">'+dias+'d</span>'+waBtn+'</div>';}).join('');
}

function avMostrarStockProx(){
  // Preferimos el ciclo del producto especifico que esta por vencer (prodProximo).
  // Si el cliente todavia no tiene 2 compras de un mismo producto (no hay ciclo propio
  // para ninguno), caemos al calculo general viejo para no perder a esos clientes.
  // Si Nacho ajusto a mano la fecha del proximo mensaje en la ficha, manda esa fecha.
  const proxDe=c=>{const aj=pmDiasAjuste(c);if(aj!==null)return aj;return c.prodProximo?c.prodProximo.prox:c.prox;};
  const prodDe=c=>c.prodProximo?c.prodProximo.producto:c.ultimoProd;
  const lista=avTodos.filter(function(c){if(c.fuente!=='Directa')return false;const p=proxDe(c);if(p===null||p===undefined)return false;return p>=0&&p<=5;}).sort(function(a,b){return(proxDe(a)||0)-(proxDe(b)||0);});
  const tb=document.getElementById('av-stock-prox');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin entregas en los próximos 5 días</div>';return;}
  tb.innerHTML=lista.map(function(c){const prox=proxDe(c);const prodPrincipal=prodDe(c);const zonaTag='<span class="'+(esLocal(c.localidad)?'local-tag':'fuera-tag')+'">'+(esLocal(c.localidad)?'local':'fuera')+'</span>';const proxLabel=prox===0?'<span style="color:#c0392b;font-weight:700;font-size:11px">Hoy</span>':'<span style="color:#7c3aed;font-weight:700;font-size:11px">'+prox+'d</span>';const prodsBase=c.prodProximo?[prodPrincipal]:(c.ultimosProds&&c.ultimosProds.length?c.ultimosProds:[c.ultimoProd]);const prods=prodsBase.filter(Boolean).map(function(p){return'<span style="display:inline-block;background:#f3e8ff;color:#7c3aed;border-radius:4px;padding:2px 6px;font-size:10px;margin:1px">'+p+'</span>';}).join(' ');const tel=c.telefono||'';const pmE=pmEstado(c);const waHref=pmE?pmWaLink(tel,pmE.texto):avWaLink(tel,c.nombre,prodPrincipal);const waBtn=tel?'<a class="wa-link" href="'+waHref+'" target="_blank">WA'+(pmE&&pmE.manual?' ✏️':'')+'</a>':'<span style="color:var(--gris-dark);font-size:12px">Sin tel</span>';const nombreEsc=c.nombre.replace(/'/g,"\\'");return '<div class="table-row" style="grid-template-columns:1fr 100px 60px 200px 70px"><span style="font-weight:500;cursor:pointer;color:var(--azul-med)" onclick="clVerFicha(\''+nombreEsc+'\')">'+c.nombre+'</span><span style="font-size:11px">'+(c.localidad||'--')+' '+zonaTag+'</span>'+proxLabel+'<div>'+prods+'</div>'+waBtn+'</div>';}).join('');
}

// Chequeo manual de respaldo: sin importar ninguna frecuencia calculada, toda venta de un
// producto que tenga 25+ dias y no se haya repetido tiene que quedar visible para que Nacho
// decida a ojo si corresponde mandar el mensaje, usando su propia tabla de recompra. Existe
// para no depender 100% del motor de prediccion mientras se sigue afinando (ver caso Iara).
function avMostrarRevisar25(){
  const filas=[];
  avTodos.filter(c=>c.fuente==='Directa').forEach(function(c){
    (c.ciclosProducto||[]).forEach(function(cp){
      if(cp.dias>=25)filas.push({nombre:c.nombre,telefono:c.telefono,localidad:c.localidad,producto:cp.producto,dias:cp.dias});
    });
  });
  // Orden ascendente: primero los que HOY cumplen justo 25 dias (el checkpoint recien alcanzado,
  // el mas accionable), y a medida que se scrollea van apareciendo 26, 27, 28... dias. Un cliente
  // que no compra hace 380 dias no es urgente verlo primero -- ya esta perdido hace rato, lo
  // importante es agarrar a tiempo al que recien esta entrando en la ventana de revision.
  filas.sort(function(a,b){return a.dias-b.dias;});
  const tb=document.getElementById('av-revisar25');
  if(!tb)return;
  if(!filas.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Nada con 25+ días todavía</div>';return;}
  tb.innerHTML=filas.map(function(f){const zonaTag='<span class="'+(esLocal(f.localidad)?'local-tag':'fuera-tag')+'">'+(esLocal(f.localidad)?'local':'fuera')+'</span>';const tel=f.telefono||'';const waBtn=tel?'<a class="wa-link" href="'+avWaLink(tel,f.nombre,f.producto)+'" target="_blank">WA</a>':'<span style="color:var(--gris-dark);font-size:12px">Sin tel</span>';const nombreEsc=f.nombre.replace(/'/g,"\\'");return '<div class="table-row" style="grid-template-columns:1fr 130px 100px 70px 60px"><span style="font-weight:500;cursor:pointer;color:var(--azul-med)" onclick="clVerFicha(\''+nombreEsc+'\')">'+f.nombre+'</span><span style="font-size:12px">'+f.producto+'</span><span style="font-size:11px">'+(f.localidad||'--')+' '+zonaTag+'</span><span style="font-size:12px">'+f.dias+'d</span>'+waBtn+'</div>';}).join('');
}

// ── VENCIDOS (recompra) ─────────────────────────────────────────────────────
// Antes esto dependia de una memoria acumulada en localStorage que solo sumaba un
// cliente a la lista el dia exacto en que entraba en la ventana de 0-5 dias y el panel
// estaba abierto ese dia. Si no se abria el panel esa semana, el cliente quedaba
// vencido pero invisible para siempre. Ahora se recalcula en vivo desde avTodos cada
// vez que se conecta, asi que ningun vencido depende de que dia se miro el panel.
// Solo se guarda en localStorage la lista de "descartados" (para que un Descartar
// manual no reaparezca), y se limpia sola cuando ese cliente vuelve a comprar.
const AV_DISMISS_KEY='wankun_vencidos_dismiss_v1';
function avGetDismissStore(){
  try{return JSON.parse(localStorage.getItem(AV_DISMISS_KEY)||'{}');}catch(e){return{};}
}
function avSetDismissStore(store){localStorage.setItem(AV_DISMISS_KEY,JSON.stringify(store));}
function avActualizarPredicciones(){
  // Se mantiene el nombre de la funcion (se llama desde avConectar) pero ahora solo
  // limpia descartes vencidos: si el cliente ya volvio a comprar despues de la fecha
  // en que se lo descarto, se le saca el descarte para que si vuelve a atrasarse
  // aparezca de nuevo.
  const store=avGetDismissStore();
  const directaMap={};
  avTodos.filter(function(c){return c.fuente==='Directa';}).forEach(function(c){directaMap[c.nombre.toLowerCase().trim()]=c;});
  let cambio=false;
  Object.keys(store).forEach(function(key){
    const actual=directaMap[key];
    if(actual&&actual.ultima){
      const ultimaActualMs=actual.ultima.getTime();
      const descartadoEnMs=store[key].descartadoConUltima?new Date(store[key].descartadoConUltima).getTime():0;
      if(ultimaActualMs>descartadoEnMs){delete store[key];cambio=true;}
    }
  });
  if(cambio)avSetDismissStore(store);
  avPredicciones=store;
}
// ── COMPRARON 1 SOLA VEZ Y NO VOLVIERON: toda su historia directa es una unica compra, ordenados por antiguedad ────
function avMostrarUnaVez(){
  const resumen=document.getElementById('av-unavez-resumen');
  const tb=document.getElementById('av-unavez-tabla');
  if(!resumen||!tb)return;
  const unaVez=avTodos.filter(c=>c.fuente==='Directa'&&c.comprasDirecta===1);
  if(!unaVez.length){
    resumen.innerHTML='';
    tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin clientes en esta situación</div>';
    return;
  }
  // Desglose por producto y por zona, para detectar patrones
  const porProducto={},porZona={};
  unaVez.forEach(c=>{
    const prod=(c.ultimoProd||'Sin especificar').trim()||'Sin especificar';
    const zona=(c.localidad||'Sin especificar').trim()||'Sin especificar';
    porProducto[prod]=(porProducto[prod]||0)+1;
    porZona[zona]=(porZona[zona]||0)+1;
  });
  const topProducto=Object.entries(porProducto).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const topZona=Object.entries(porZona).sort((a,b)=>b[1]-a[1]).slice(0,5);
  resumen.innerHTML=`<strong>${unaVez.length} clientes</strong> compraron una sola vez en toda su historia directa.<br>
    <span style="font-size:12px">Por producto: ${topProducto.map(([p,n])=>p+' ('+n+')').join(' · ')}</span><br>
    <span style="font-size:12px">Por zona: ${topZona.map(([z,n])=>z+' ('+n+')').join(' · ')}</span><br>
    <span style="font-size:11px;color:#856404">⚠️ Antes del 16/6 no había teléfono como dato — a esos clientes se los identifica por nombre, y pueden estar duplicados por variantes de tipeo. Están marcados abajo.</span>`;

  const ordenados=unaVez.slice().sort((a,b)=>(b.dias||0)-(a.dias||0));
  tb.innerHTML=ordenados.map(c=>{
    const waBtn=c.telefono?'<a class="wa-link" href="'+avWaLink(c.telefono,c.nombre)+'" target="_blank">WA</a>':'<span style="color:var(--gris-dark);font-size:11px">Sin tel</span>';
    const avisoDup=!c.telefono?' <span title="Sin teléfono — identificado por nombre, podría ser un duplicado no detectado" style="color:#856404;cursor:help">⚠️</span>':'';
    return `<div class="table-row" style="grid-template-columns:1fr 130px 130px 80px 60px">
      <span>${c.nombre}${avisoDup}</span>
      <span style="color:var(--gris-dark);font-size:12px">${c.ultimoProd||'--'}</span>
      <span style="color:var(--gris-dark);font-size:12px">${c.localidad||'--'}</span>
      <span style="font-size:12px">${c.dias!=null?c.dias+'d':'--'}</span>
      <span>${waBtn}</span>
    </div>`;
  }).join('');
}
function avMostrarFaltaron(){
  const dismiss=avGetDismissStore();
  const vencidos=avTodos.filter(function(c){
    if(c.estado!=='vencido')return false;
    return !dismiss[c.nombre.toLowerCase().trim()];
  }).sort(function(a,b){return(a.prox!==null&&a.prox!==undefined?a.prox:-9999)-(b.prox!==null&&b.prox!==undefined?b.prox:-9999);});
  const tb=document.getElementById('av-faltaron');if(!tb)return;
  if(!vencidos.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin clientes atrasados</div>';return;}
  tb.innerHTML=vencidos.map(function(c){
    const tel=c.telefono||'';
    const diasAtraso=(c.prox!==null&&c.prox!==undefined)?Math.abs(c.prox):Math.max(0,(c.dias||0)-45);
    const label=(c.prox!==null&&c.prox!==undefined)?'No compró':'Sin ciclo, +45d';
    const waBtn=tel?'<a class="wa-link" href="'+avWaLink(tel,c.nombre,c.ultimoProd)+'" target="_blank">WA</a>':'<span style="color:var(--gris-dark);font-size:12px">Sin tel</span>';
    const zonaTag='<span class="'+(esLocal(c.localidad)?'local-tag':'fuera-tag')+'">'+(esLocal(c.localidad)?'local':'fuera')+'</span>';
    const key=c.nombre.toLowerCase().trim();
    return '<div class="table-row" style="grid-template-columns:1fr 100px 90px 80px 60px"><span style="font-weight:500">'+c.nombre+'</span><span style="font-size:11px">'+(c.localidad||'--')+' '+zonaTag+'</span><span style="font-size:11px;font-weight:600;color:#c0392b">'+label+' ('+diasAtraso+'d)</span>'+waBtn+'<button class="btn" style="font-size:10px;padding:2px 6px" onclick="avDescartarPrediccion(\''+key.replace(/'/g,"\\'")+'\')">Descartar</button></div>';
  }).join('');
}
function avDescartarPrediccion(key){
  const store=avGetDismissStore();
  const c=avTodos.find(function(x){return x.fuente==='Directa'&&x.nombre.toLowerCase().trim()===key;});
  store[key]={descartadoConUltima:c&&c.ultima?c.ultima.toISOString():new Date().toISOString()};
  avSetDismissStore(store);
  avPredicciones=store;
  avMostrarFaltaron();
}

function avMostrarVentasHoy(){
  const lista=avTodos.filter(function(c){if(c.fuente!=='Directa')return false;if(c.prox===null||c.prox===undefined)return false;return c.prox<=5&&c.prox>=-1;}).sort(function(a,b){return(a.prox||0)-(b.prox||0);});
  const tb=document.getElementById('av-ventas-hoy');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin contactos en los próximos 5 días</div>';return;}
  tb.innerHTML=lista.map(function(c){const tel=c.telefono||'';const waBtn=tel?'<a class="wa-link" href="'+avWaLink(tel,c.nombre,c.ultimoProd)+'" target="_blank">WA</a>':'<span style="color:var(--gris-dark);font-size:12px">Sin tel</span>';const zonaTag='<span class="'+(esLocal(c.localidad)?'local-tag':'fuera-tag')+'">'+(esLocal(c.localidad)?'local':'fuera')+'</span>';const proxLabel=c.prox<0?'<span style="color:#c0392b;font-weight:600;font-size:11px">'+Math.abs(c.prox)+'d pasado</span>':c.prox===0?'<span style="color:#c0392b;font-weight:600;font-size:11px">Hoy</span>':'<span style="color:#856404;font-weight:600;font-size:11px">En '+c.prox+'d</span>';return '<div class="table-row" style="grid-template-columns:1fr 120px 80px 80px 80px"><span style="font-weight:500">'+c.nombre+'</span><span style="font-size:11px">'+(c.localidad||'--')+' '+zonaTag+'</span><span style="font-size:12px;color:var(--gris-dark)">'+(c.ultimoProd||'--').substring(0,20)+'</span>'+proxLabel+waBtn+'</div>';}).join('');
}

function avMostrarAyer(){
  const hoy=new Date();hoy.setHours(0,0,0,0);const ayer=new Date(hoy);ayer.setDate(ayer.getDate()-1);
  const lista=avTodos.filter(function(c){if(c.fuente!=='Flex Meli')return false;if(!c.ultima)return false;var f=new Date(c.ultima);f.setHours(0,0,0,0);return f.getTime()===ayer.getTime();});
  const tb=document.getElementById('av-ayer');if(!tb)return;
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin compras de ayer</div>';return;}
  tb.innerHTML=lista.map(function(c){const tel=c.telefono||'';const waBtn=tel?'<a class="wa-link" href="'+avWaLinkAyer(tel,c.nombre)+'" target="_blank">WA</a>':'<span style="color:var(--gris-dark);font-size:12px">Sin tel</span>';const zonaTag='<span class="'+(esLocal(c.localidad)?'local-tag':'fuera-tag')+'">'+(esLocal(c.localidad)?'local':'fuera')+'</span>';return '<div class="table-row" style="grid-template-columns:1fr 130px 120px 80px"><span style="font-weight:500">'+c.nombre+'</span><span style="font-size:11px">'+(c.localidad||'--')+' '+zonaTag+'</span><span style="font-size:12px;color:var(--gris-dark)">'+(c.ultimoProd||'--')+'</span>'+waBtn+'</div>';}).join('');
}

function avMostrarManana(){
  const hoy=new Date();hoy.setHours(0,0,0,0);const manana=new Date(hoy);manana.setDate(manana.getDate()+1);
  const lista=avTodos.filter(c=>{if(c.fuente!=='Flex Meli')return false;if(!c.recompraFecha)return false;const f=new Date(c.recompraFecha);f.setHours(0,0,0,0);return f.getTime()===manana.getTime();});
  const tb=document.getElementById('av-manana');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin contactos para mañana</div>';return;}
  tb.innerHTML=lista.map(c=>{const tel=c.telefono||'';return`<div class="table-row" style="grid-template-columns:1fr 130px 120px 80px"><span style="font-weight:500">${c.nombre}</span><span style="font-size:11px">${c.localidad||'--'} <span class="${esLocal(c.localidad)?'local-tag':'fuera-tag'}">${esLocal(c.localidad)?'local':'fuera'}</span></span><span style="font-size:12px;color:var(--gris-dark)">${c.ultimoProd||'--'}</span>${tel?`<a class="wa-link" href="${avWaLink(tel,c.nombre,c.ultimoProd)}" target="_blank">WA 🐾</a>`:'<span style="color:var(--gris-dark);font-size:12px">Sin tel</span>'}</div>`;}).join('');
}

function avFiltrar(){
  const zona=document.getElementById('av-zona').value,estado=document.getElementById('av-estado').value;
  avFiltered=avTodos.filter(c=>{
    if(zona==='local'&&!esLocal(c.localidad))return false;
    if(zona==='fuera'&&esLocal(c.localidad))return false;
    if(estado!=='todos'&&c.estado!==estado)return false;
    return true;
  });
  document.getElementById('av-count').textContent=avFiltered.length+' clientes';
  const tb=document.getElementById('av-table');if(!tb)return;
  if(!avFiltered.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin resultados</div>';return;}
  tb.innerHTML=avFiltered.slice(0,500).map(c=>{
    const tel=c.telefono||clData.find(x=>(x.nombre||'').toLowerCase().startsWith((c.nombre||'').toLowerCase().split(' ')[0])&&x.telefono)?.telefono||'';
    const pc=c.estado==='vencido'?'#c0392b':c.estado==='proximo'?'#856404':c.estado==='ok'?'var(--verde)':'var(--gris-dark)';
    const pl=c.prox===null?'--':c.prox<0?Math.abs(c.prox)+'d pasado':'en '+c.prox+'d';
    return`<div class="table-row" style="grid-template-columns:1fr 90px 60px 80px 70px 80px 60px"><span style="font-weight:500">${c.nombre}</span><span style="font-size:11px">${c.localidad||'--'}</span><span style="font-size:12px;text-align:center">${c.nCompras}</span><span style="font-size:12px">${c.ultima.toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</span><span style="font-size:12px;text-align:center">${c.freq?c.freq+'d':'--'}</span><span style="font-size:12px;font-weight:600;color:${pc}">${pl}</span>${tel?`<a class="wa-link" href="${avWaLink(tel,c.nombre,c.ultimoProd)}" target="_blank">WA</a>`:'<span>--</span>'}</div>`;
  }).join('');
}

function avWaLink(tel,nombre,prod){
  const num=tel.toString().replace(/\D/g,'');const full=num.startsWith('54')?num:'54'+num;const primer=(nombre||'').split(' ')[0];
  const msg='Hola '+primer+', cómo está tu perrito? Te escribo porque debe estar por terminarse el alimento. ¿Te gustaría que coordinemos la reposición? Entregamos en el día y como siempre van los snacks de Filan.';
  return 'https://wa.me/'+full+'?text='+encodeURIComponent(msg);
}

// ── PROXIMO MENSAJE POR CLIENTE (desde 21/10/2026) ──────────────────────────────
// Cada compra deja "programado" el proximo mensaje de recompra en la ficha del cliente,
// tomando como antecedente su ULTIMA compra. Solo canal directo (Flex Meli va por Migracion).
// Ciclo usado, de mas confiable a menos: ciclo propio del producto (2+ compras de ese producto,
// mediana) -> ciclo general del cliente -> 25 dias por defecto (primera compra).
// Nacho puede ajustar fecha y/o texto a mano: se guarda en localStorage (solo este navegador)
// junto con la fecha de la ultima compra al momento del ajuste. Si el cliente vuelve a comprar,
// el ajuste se descarta solo y se recalcula. Un ajuste de fecha tambien mueve "Preparar stock".
const PM_KEY='wankun_proxmsg_v1';
const PM_DEFECTO=25;
let pmActual=null;
function pmStore(){try{return JSON.parse(localStorage.getItem(PM_KEY)||'{}');}catch(e){return{};}}
function pmSetStore(s){try{localStorage.setItem(PM_KEY,JSON.stringify(s));}catch(e){}}
function pmKey(c){const t=(c.telefono||'').toString().replace(/\D/g,'');return t.length>=8?'T:'+t:'N:'+(c.nombre||'').toLowerCase().trim();}
function pmEsc(s){return(s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function pmHoy(){const h=new Date();h.setHours(0,0,0,0);return h;}
function pmDiasHasta(f){const d=new Date(f);d.setHours(0,0,0,0);return Math.round((d-pmHoy())/864e5);}
function pmIso(f){const d=new Date(f);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function pmFmt(f){return new Date(f).toLocaleDateString('es-AR',{weekday:'short',day:'2-digit',month:'2-digit'});}
function pmTextoAuto(nombre,prod){
  const primer=(nombre||'').split(' ')[0];
  const p=(prod&&prod!=='Sin especificar')?('el '+prod.replace(/\s*-\s*/g,' ')):'el alimento';
  return 'Hola '+primer+', cómo está tu perrito? Te escribo porque debe estar por terminarse '+p+'. ¿Te gustaría que coordinemos la reposición? Entregamos en el día y como siempre van los snacks de Filan.';
}
function pmWaLink(tel,texto){const num=(tel||'').toString().replace(/\D/g,'');if(!num)return null;const full=num.startsWith('54')?num:'54'+num;return 'https://wa.me/'+full+'?text='+encodeURIComponent(texto);}
// Calculo automatico: candidatos = productos de la ultima compra + productos con ciclo propio
// que siguen "vivos" (no pasaron mas de 2 ciclos sin comprarlos). Gana el que vence antes.
function pmAuto(c){
  if(!c||!c.ultima)return null;
  const ultMs=c.ultima.getTime();
  const cands=(c.ciclosProducto||[]).filter(cp=>cp.ultima.getTime()===ultMs||(cp.freq&&cp.dias<=cp.freq*2));
  let best=null;
  cands.forEach(cp=>{
    let ciclo,base;
    if(cp.freq){ciclo=cp.freq;base='producto';}
    else if(c.freq){ciclo=c.freq;base='general';}
    else{ciclo=PM_DEFECTO;base='defecto';}
    const f=new Date(cp.ultima);f.setDate(f.getDate()+ciclo);
    if(!best||f<best.fecha)best={fecha:f,producto:cp.producto,ciclo,base,ultimaProd:cp.ultima};
  });
  if(!best){const ciclo=c.freq||PM_DEFECTO;const f=new Date(c.ultima);f.setDate(f.getDate()+ciclo);best={fecha:f,producto:c.ultimoProd,ciclo,base:c.freq?'general':'defecto',ultimaProd:c.ultima};}
  return best;
}
// Ajuste manual vigente (o null). Si hubo una compra posterior al ajuste, lo borra.
function pmAjuste(c){
  if(!c||!c.ultima)return null;
  const s=pmStore();const k=pmKey(c);const o=s[k];
  if(!o)return null;
  if((o.ultimaRef||0)<c.ultima.getTime()){delete s[k];pmSetStore(s);return null;}
  return o;
}
function pmEstado(c){
  const a=pmAuto(c);if(!a)return null;
  const o=pmAjuste(c);
  const textoAuto=pmTextoAuto(c.nombre,a.producto);
  if(o){const f=o.fecha?parseFecha(o.fecha):null;return Object.assign({},a,{fecha:f||a.fecha,texto:o.texto||textoAuto,textoAuto,manual:true});}
  return Object.assign({},a,{texto:textoAuto,textoAuto,manual:false});
}
// Dias hasta la fecha ajustada a mano (null si no hay ajuste) -> lo usa "Preparar stock".
function pmDiasAjuste(c){const o=pmAjuste(c);if(!o||!o.fecha)return null;const f=parseFecha(o.fecha);return f?pmDiasHasta(f):null;}
function pmBuscar(tel,nombre){
  const t=(tel||'').toString().replace(/\D/g,'');
  const directa=avTodos.filter(c=>c.fuente==='Directa');
  if(t.length>=8){const m=directa.find(c=>(c.telefono||'').toString().replace(/\D/g,'')===t);if(m)return m;}
  const n=(nombre||'').toLowerCase().trim();
  return directa.find(c=>(c.nombre||'').toLowerCase().trim()===n)||null;
}
function pmBloqueHtml(){
  if(!pmActual||!pmActual.c)return`<div style="font-size:12px;color:var(--gris-dark)">Sin compras en el canal directo. Si viene de Flex Meli, el seguimiento va por Migración.</div>`;
  const c=pmActual.c;const e=pmEstado(c);
  if(!e)return`<div style="font-size:12px;color:var(--gris-dark)">Sin datos de compra para calcular.</div>`;
  const dias=pmDiasHasta(e.fecha);
  const cuando=dias<0?`hace ${Math.abs(dias)}d (atrasado)`:dias===0?'hoy':`en ${dias}d`;
  const colorCuando=dias<0?'#c0392b':dias<=5?'#856404':'var(--verde)';
  const baseTxt=e.base==='producto'?`${e.ciclo} días (ciclo de este producto)`:e.base==='general'?`${e.ciclo} días (ciclo general del cliente)`:`${e.ciclo} días (por defecto, primera compra)`;
  const ult=new Date(e.ultimaProd).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'});
  const wa=pmWaLink(c.telefono,e.texto);
  const fila=(k,v)=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;font-size:12px"><span style="color:var(--gris-dark)">${k}</span><span style="text-align:right">${v}</span></div>`;
  return`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap">
      <div style="font-size:13px;font-weight:600">Próximo mensaje</div>
      ${e.manual?'<span style="font-size:11px;padding:2px 10px;border-radius:6px;background:#fff3cd;color:#856404;font-weight:600">Ajustado manualmente</span>':''}
    </div>
    ${fila('Última compra',ult+' · '+pmEsc(e.producto||'--'))}
    ${fila('Ciclo',baseTxt)}
    ${fila('Enviar el',`<b>${pmFmt(e.fecha)}</b> <span style="color:${colorCuando};font-weight:600">· ${cuando}</span>`)}
    <div id="pm-vista" style="background:#fff;border:1px solid var(--gris-med);border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.6;margin:10px 0;white-space:pre-wrap">${pmEsc(e.texto)}</div>
    <div id="pm-editor" style="display:none;margin:10px 0">
      <div style="font-size:11px;color:var(--gris-dark);font-weight:600;margin-bottom:4px">Fecha de envío</div>
      <input type="date" id="pm-fecha" value="${pmIso(e.fecha)}" oninput="document.getElementById('pm-err').textContent=''" style="width:100%;padding:8px;border:1px solid var(--gris-med);border-radius:6px;font-size:13px;margin-bottom:8px;box-sizing:border-box">
      <div style="font-size:11px;color:var(--gris-dark);font-weight:600;margin-bottom:4px">Texto del mensaje</div>
      <textarea id="pm-texto" rows="5" oninput="document.getElementById('pm-err').textContent=''" style="width:100%;padding:8px;border:1px solid var(--gris-med);border-radius:6px;font-size:12px;font-family:inherit;line-height:1.5;box-sizing:border-box">${pmEsc(e.texto)}</textarea>
      <div id="pm-err" style="font-size:12px;color:#c0392b;margin-top:4px"></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap" id="pm-botones">
      ${wa?`<a href="${wa}" target="_blank" style="font-size:12px;padding:6px 12px;border-radius:6px;background:var(--verde-bg);color:var(--verde);font-weight:600;text-decoration:none">WhatsApp 🐾</a>`:'<span style="font-size:12px;color:var(--gris-dark);padding:6px 0">Sin teléfono</span>'}
      <button id="pm-b-ajustar" onclick="pmAbrirEditor()" style="font-size:12px;padding:6px 12px;border-radius:6px;background:#fff;border:1px solid var(--gris-med);cursor:pointer;font-weight:600">✏️ Ajustar</button>
      <button id="pm-b-guardar" onclick="pmGuardar()" style="display:none;font-size:12px;padding:6px 12px;border-radius:6px;background:var(--azul-med);color:#fff;border:none;cursor:pointer;font-weight:600">Guardar</button>
      <button id="pm-b-cancelar" onclick="pmRender()" style="display:none;font-size:12px;padding:6px 12px;border-radius:6px;background:#fff;border:1px solid var(--gris-med);cursor:pointer">Cancelar</button>
      ${e.manual?'<button onclick="pmReset()" style="font-size:12px;padding:6px 12px;border-radius:6px;background:#fff;border:1px solid var(--gris-med);cursor:pointer">↺ Volver al automático</button>':''}
    </div>`;
}
function pmRender(){const el=document.getElementById('pm-bloque');if(el)el.innerHTML=pmBloqueHtml();const t=document.getElementById('pm-recorrido');if(t&&pmActual&&pmActual.c){const e=pmEstado(pmActual.c);if(e){const d=pmDiasHasta(e.fecha);t.textContent=pmFmt(e.fecha)+(e.manual?' ✏️':'');t.style.color=d<0?'#c0392b':d<=5?'#856404':'var(--verde)';}}}
function pmAbrirEditor(){
  document.getElementById('pm-editor').style.display='block';
  document.getElementById('pm-vista').style.display='none';
  document.getElementById('pm-b-ajustar').style.display='none';
  document.getElementById('pm-b-guardar').style.display='inline-block';
  document.getElementById('pm-b-cancelar').style.display='inline-block';
}
function pmGuardar(){
  if(!pmActual||!pmActual.c)return;
  const fecha=document.getElementById('pm-fecha').value;
  const texto=document.getElementById('pm-texto').value.trim();
  const err=document.getElementById('pm-err');
  if(!fecha){err.textContent='Poné una fecha';return;}
  if(!texto){err.textContent='El mensaje no puede quedar vacío';return;}
  const c=pmActual.c;const e=pmEstado(c);
  const s=pmStore();
  s[pmKey(c)]={fecha,texto:texto===e.textoAuto?'':texto,ultimaRef:c.ultima.getTime(),nombre:c.nombre,guardado:new Date().toISOString()};
  pmSetStore(s);
  pmRender();
  if(document.getElementById('av-stock-prox'))avMostrarStockProx();
}
function pmReset(){
  if(!pmActual||!pmActual.c)return;
  const s=pmStore();delete s[pmKey(pmActual.c)];pmSetStore(s);
  pmRender();
  if(document.getElementById('av-stock-prox'))avMostrarStockProx();
}

function avProyeccion(){
  const hoy=new Date(),dia=hoy.getDate(),diasMes=new Date(hoy.getFullYear(),hoy.getMonth()+1,0).getDate();
  // Usar facturación real del mes actual desde el Sheets
  const facActual=FAC_LIVE[FAC_LIVE.length-1]||0;
  const proy=dia>0?Math.round(facActual/dia*diasMes):0;
  // Objetivo = mejor mes anterior * 1.15
  const facMesAnterior=FAC_LIVE[FAC_LIVE.length-2]||19314000;
  const obj=Math.round(facMesAnterior*1.15);
  const diff=proy-obj;
  document.getElementById('av-proyeccion').innerHTML=`<div class="metric"><div class="metric-label">Dia del mes</div><div class="metric-value">${dia}/${diasMes}</div></div><div class="metric"><div class="metric-label">Facturado hasta hoy</div><div class="metric-value">$${(facActual/1e6).toFixed(1)}M</div></div><div class="metric"><div class="metric-label">Proyeccion cierre</div><div class="metric-value" style="color:var(--verde)">$${(proy/1e6).toFixed(1)}M</div></div><div class="metric"><div class="metric-label">Objetivo (+15%)</div><div class="metric-value">$${(obj/1e6).toFixed(1)}M</div></div><div class="metric"><div class="metric-label">Diferencia</div><div class="metric-value" style="color:${diff>=0?'var(--verde)':'#c0392b'}">${diff>=0?'+':''}$${(Math.abs(diff)/1e6).toFixed(1)}M</div></div>`;
}

function avExportar(){
  const rows=[['Cliente','Localidad','Compras','Ultima compra','Frecuencia','Proxima'],...avFiltered.map(c=>[c.nombre,c.localidad,c.nCompras,c.ultima.toLocaleDateString('es-AR'),c.freq||'--',c.prox!==null?c.prox+'d':'--'])];
  const csv=rows.map(r=>r.map(v=>`"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='recompras_wankun.csv';a.click();URL.revokeObjectURL(url);
}

