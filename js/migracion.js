// ── MIGRACION: Flex Meli -> canal directo, seguimiento hasta la 2da compra directa ────
let migSeguimiento=[];
async function migConectar(){
  const st=document.getElementById('mig-status');
  st.className='conn-status conn-loading';st.textContent='Calculando...';
  try{
    const[vRows,fRows]=await Promise.all([fetchCSV('Ventas'),fetchCSV('Flex meli')]);
    let mlRows=[];
    try{mlRows=await fetchCSV('ML Total');}catch(e){mlRows=[];} // pestaña opcional, todavia puede no existir
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const normTel=t=>(t||'').toString().replace(/\D/g,'');

    // Historial Flex Meli por telefono: primera compra, direccion, localidad, producto
    const flexPorTel={};
    fRows.forEach(r=>{
      const tel=normTel(r['TELEFONO']);
      if(!tel||tel.length<8)return;
      const f=parseFecha(r['Fecha compra']||'');
      if(!f||isNaN(f)||f>hoy)return;
      if(!flexPorTel[tel]||f<flexPorTel[tel].fecha){
        flexPorTel[tel]={fecha:f,nombre:(r['NOMBRE']||'').trim(),direccion:r['DIRECCION']||'',localidad:r['LOCALIDAD']||'',producto:r['REFERNCIA']||''};
      }
    });

    // Historial Ventas (Directa) por telefono: todas las compras
    const ventasPorTel={};
    vRows.forEach(r=>{
      const tel=normTel(r['TELEFONO']);
      if(!tel||tel.length<8)return;
      const f=parseFecha(r['FECHA']||r['Fecha']||'');
      if(!f||isNaN(f)||f>hoy)return;
      if(!ventasPorTel[tel])ventasPorTel[tel]={nombre:(r['CLIENTE']||r['Cliente']||'').trim(),direccion:r['Domicilio']||r['domicilio']||'',localidad:r['Barrio/Localidad']||r['Localidad']||'',compras:[]};
      ventasPorTel[tel].compras.push({fecha:f,producto:[r['Marca']||'',r['producto']||''].filter(Boolean).join(' - ')});
    });

    // Cruce: cliente con historial en Flex Y exactamente 1 compra directa (recien migro, esperando la 2da)
    const seguimiento=[];
    Object.keys(flexPorTel).forEach(tel=>{
      const flex=flexPorTel[tel];
      const directa=ventasPorTel[tel];
      if(!directa)return; // aun no migro
      if(directa.compras.length!==1)return; // ya hizo 2+ compras directas -> pasa a Recompras normal, sale de esta lista
      const migro=directa.compras[0].fecha;
      if(migro<flex.fecha)return; // la compra directa es anterior a la de flex, no es una migracion real
      const freq=Math.round((migro-flex.fecha)/(1000*60*60*24));
      const proxFecha=new Date(migro);proxFecha.setDate(proxFecha.getDate()+freq);
      const diasAtraso=Math.floor((hoy-proxFecha)/(1000*60*60*24));
      let estado,color;
      if(diasAtraso>0){estado='Vencido hace '+diasAtraso+'d';color='#c0392b';}
      else if(diasAtraso===0){estado='Hoy';color='#c0392b';}
      else{estado='En '+(-diasAtraso)+'d';color='#7c3aed';}
      seguimiento.push({
        nombre:directa.nombre||flex.nombre,tel,
        direccion:directa.direccion||flex.direccion,localidad:directa.localidad||flex.localidad,
        fechaFlex:flex.fecha,fechaMigro:migro,producto:directa.compras[0].producto||flex.producto,
        freq,proxFecha,diasAtraso,estado,color
      });
    });
    seguimiento.sort((a,b)=>b.diasAtraso-a.diasAtraso);
    migSeguimiento=seguimiento;

    // Tracking de conversiones: comparar contra el seguimiento anterior guardado para detectar quien paso a tener 2+ compras
    const MIG_TRACK_KEY='wankun_mig_track_v1',MIG_CONV_MAXDIAS=30;
    let track={};
    try{track=JSON.parse(localStorage.getItem(MIG_TRACK_KEY)||'{}');}catch(e){track={};}
    // Actualizar/crear entradas 'en_seguimiento' para los actuales
    seguimiento.forEach(c=>{
      track[c.tel]={estado:'seguimiento',nombre:c.nombre,localidad:c.localidad};
    });
    // Cualquier tel que estaba en 'seguimiento' pero ya no aparece en la lista actual, y tiene 2+ compras directas ahora -> convertido
    Object.keys(track).forEach(tel=>{
      if(track[tel].estado!=='seguimiento')return;
      const yaNoEsta=!seguimiento.find(c=>c.tel===tel);
      if(!yaNoEsta)return;
      const directa=ventasPorTel[tel];
      if(directa&&directa.compras.length>=2){
        const fecha2da=directa.compras.sort((a,b)=>a.fecha-b.fecha)[1].fecha;
        track[tel]={estado:'convertido',nombre:directa.nombre,localidad:directa.localidad,fecha2da:fecha2da.toISOString(),detectado:hoy.toISOString()};
      }else{
        delete track[tel]; // ya no esta en flex tampoco, se limpia
      }
    });
    // Limpiar convertidos viejos (>30 dias)
    Object.keys(track).forEach(tel=>{
      if(track[tel].estado==='convertido'){
        const dias=Math.floor((hoy-new Date(track[tel].fecha2da))/(1000*60*60*24));
        if(dias>MIG_CONV_MAXDIAS)delete track[tel];
      }
    });
    localStorage.setItem(MIG_TRACK_KEY,JSON.stringify(track));
    const convertidos=Object.keys(track).filter(tel=>track[tel].estado==='convertido').map(tel=>({tel,...track[tel]})).sort((a,b)=>new Date(b.fecha2da)-new Date(a.fecha2da));
    migConvertidos=convertidos;

    st.className='conn-status conn-ok';st.textContent=seguimiento.length+' clientes en seguimiento';
    document.getElementById('mig-panel').style.display='block';
    migMetricas();migRenderTabla();migRenderConvertidos();
    migProductoCalcular(vRows,fRows,mlRows);
  }catch(e){st.className='conn-status conn-err';st.textContent='Error: '+e.message;console.error(e);}
}

// ── INACTIVOS: migrados Flex Meli -> directo, con al menos 1 compra directa, que dejaron de comprar ────
let inLista=[];
const IN_KEY='wankun_inactivos_contactados_v1';
function inContactados(){try{return JSON.parse(localStorage.getItem(IN_KEY)||'{}');}catch(e){return{};}}
function inGuardar(m){try{localStorage.setItem(IN_KEY,JSON.stringify(m));}catch(e){}}
function inTel(t){let d=(t||'').toString().replace(/\D/g,'');if(d.startsWith('549'))d=d.slice(3);else if(d.startsWith('54'))d=d.slice(2);if(d.startsWith('0'))d=d.slice(1);return d.length>=10?d.slice(-10):'';}
function inNom(s){return (s||'').toString().normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim();}
function inTipo(p){const s=(p||'').toLowerCase();if(/hypo|diab|renal|anal|urin|gastro|mobil|hepat|satiet|cardiac|derma|obes|sensib/.test(s))return'Medicado';if(/pupp|junior|cachorr|kitten|starter/.test(s))return'Cachorro';return'Mantenimiento';}
async function inCargar(){
  const st=document.getElementById('in-status');
  st.className='conn-status conn-loading';st.textContent='Calculando...';
  try{
    const[vRows,fRows]=await Promise.all([fetchCSV('Ventas'),fetchCSV('Flex meli')]);
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const DIA=86400000;
    const valida=f=>f&&!isNaN(f)&&f<=hoy&&f.getFullYear()>=2023;
    // Flex Meli por telefono: primera y ultima compra
    const flex={};const nomFlex={};
    fRows.forEach(r=>{
      const tel=inTel(r['TELEFONO']);if(!tel)return;
      const f=parseFecha(r['Fecha compra']||'');if(!valida(f))return;
      if(!flex[tel])flex[tel]={primera:f,ultima:f,nombre:(r['NOMBRE']||'').trim(),loc:r['LOCALIDAD']||''};
      if(f<flex[tel].primera)flex[tel].primera=f;
      if(f>flex[tel].ultima)flex[tel].ultima=f;
      const n=inNom(r['NOMBRE']);
      if(n.includes(' ')){if(!nomFlex[n])nomFlex[n]=new Set();nomFlex[n].add(tel);}
    });
    // Ventas viejas sin telefono: se asocian por nombre completo solo si ese nombre es de un unico telefono en Flex
    const telPorNombre=n=>(nomFlex[n]&&nomFlex[n].size===1)?[...nomFlex[n]][0]:'';
    const dir={};
    vRows.forEach(r=>{
      const f=parseFecha(r['FECHA']||r['Fecha']||'');if(!valida(f))return;
      const nombre=(r['CLIENTE']||r['Cliente']||'').trim();if(!nombre)return;
      const tel=inTel(r['TELEFONO'])||telPorNombre(inNom(nombre));
      if(!tel||!flex[tel])return;
      if(!dir[tel])dir[tel]={nombre,compras:[],fac:0,loc:'',prod:'',ult:null};
      const d=dir[tel];
      d.compras.push(f);d.fac+=parseFac(r['Facturación']||r['Facturacion']||'');
      if(!d.ult||f>=d.ult){d.ult=f;d.nombre=nombre;d.loc=r['Barrio/Localidad']||r['Localidad']||d.loc;d.prod=[r['Marca'],r['producto']].filter(x=>x&&x.toLowerCase()!=='vacía'&&x.toLowerCase()!=='vacia').join(' ');}
    });
    const lista=[];
    Object.keys(dir).forEach(tel=>{
      const d=dir[tel],fx=flex[tel];
      const dias=[...new Set(d.compras.map(x=>x.getTime()))].sort((a,b)=>a-b);
      if(dias[0]<fx.primera.getTime())return; // compraba directo antes de Flex: no es migrado
      if(fx.ultima>d.ult)return;               // volvio a comprar por Meli despues: no esta inactivo, esta en Meli
      const gaps=[];for(let i=1;i<dias.length;i++){const g=Math.round((dias[i]-dias[i-1])/DIA);if(g>=10)gaps.push(g);}
      const ciclo=gaps.length?mediana(gaps):null;
      const umbral=ciclo?Math.max(45,Math.round(ciclo*1.5)):45;
      const sin=Math.floor((hoy-d.ult)/DIA);
      if(sin<=umbral)return;
      const seg=sin<=75?'Enfriándose':sin<=150?'Dormido':'Frío';
      lista.push({tel,nombre:d.nombre||fx.nombre,loc:d.loc||fx.loc,prod:d.prod||'--',tipo:inTipo(d.prod),sin,ult:d.ult,compras:dias.length,fac:d.fac,ciclo,seg});
    });
    inLista=lista;
    st.className='conn-status conn-ok';st.textContent=lista.length+' clientes a recuperar';
    document.getElementById('in-panel').style.display='block';
    inMetricas();inRender();
  }catch(e){st.className='conn-status conn-err';st.textContent='Error: '+e.message;console.error(e);}
}
function inMetricas(){
  const c=s=>inLista.filter(x=>x.seg===s).length;
  const fac=inLista.reduce((a,x)=>a+x.fac,0);
  const cont=inContactados();const nc=inLista.filter(x=>cont[x.tel]).length;
  document.getElementById('in-metrics').innerHTML=
    '<div class="metric"><div class="metric-label">A recuperar</div><div class="metric-value">'+inLista.length+'</div></div>'+
    '<div class="metric"><div class="metric-label">Enfriándose (46–75 d)</div><div class="metric-value" style="color:#856404">'+c('Enfriándose')+'</div></div>'+
    '<div class="metric"><div class="metric-label">Dormidos (76–150 d)</div><div class="metric-value" style="color:#c2410c">'+c('Dormido')+'</div></div>'+
    '<div class="metric"><div class="metric-label">Fríos (+150 d)</div><div class="metric-value" style="color:#c0392b">'+c('Frío')+'</div></div>'+
    '<div class="metric"><div class="metric-label">Facturaron históricamente</div><div class="metric-value">'+fmt(fac)+'</div></div>'+
    '<div class="metric"><div class="metric-label">Contactados</div><div class="metric-value">'+nc+'</div></div>';
}
function inToggle(tel){const m=inContactados();if(m[tel])delete m[tel];else m[tel]=Date.now();inGuardar(m);inMetricas();inRender();}
function inRender(){
  const seg=document.getElementById('in-f-seg').value,tipo=document.getElementById('in-f-tipo').value,cont=document.getElementById('in-f-cont').value,ord=document.getElementById('in-f-ord').value;
  const m=inContactados();
  let l=inLista.filter(x=>(seg==='todos'||x.seg===seg)&&(tipo==='todos'||x.tipo===tipo)&&(cont==='todos'||(cont==='si'?!!m[x.tel]:!m[x.tel])));
  l.sort((a,b)=>ord==='dias'?a.sin-b.sin:ord==='compras'?(b.compras-a.compras||b.fac-a.fac):b.fac-a.fac);
  document.getElementById('in-count').textContent=l.length;
  const segCls={'Enfriándose':'tag-warn','Dormido':'tag-warn','Frío':'tag-bad'};
  const tb=document.getElementById('in-tabla');
  if(!l.length){tb.innerHTML='<div style="padding:14px;color:var(--gris-dark);font-size:13px">No hay clientes con este filtro.</div>';return;}
  tb.innerHTML=l.map(x=>{
    const hecho=!!m[x.tel];
    const wa='<a class="wa-link" href="https://wa.me/549'+x.tel+'" target="_blank">WA</a>';
    const btn='<button class="wa-link" style="background:'+(hecho?'var(--gris-med)':'#e0e7ff')+';color:'+(hecho?'var(--gris-dark)':'#3730a3')+'" onclick="inToggle(\''+x.tel+'\')">'+(hecho?'Contactado':'Marcar')+'</button>';
    return '<div class="table-row" style="grid-template-columns:1.3fr 1fr 1.3fr 100px 80px 70px 100px 150px;'+(hecho?'opacity:.55':'')+'">'+
      '<span style="font-weight:500;cursor:pointer;color:var(--azul-med)" onclick="clVerFicha(\''+x.nombre.replace(/\\/g,'').replace(/'/g,"\\'")+'\')">'+x.nombre+'</span>'+
      '<span style="font-size:12px">'+(x.loc||'--')+'</span>'+
      '<span style="font-size:12px">'+x.prod+'</span>'+
      '<span style="font-size:12px">'+x.tipo+'</span>'+
      '<span><span class="'+segCls[x.seg]+'" style="display:inline-block;font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600" title="'+x.seg+(x.ciclo?' · ciclo habitual '+x.ciclo+' d':'')+'">'+x.sin+' d</span></span>'+
      '<span style="text-align:center;font-size:12px">'+x.compras+'</span>'+
      '<span style="font-size:12px;font-weight:600">'+fmtARS(x.fac)+'</span>'+
      '<span style="display:flex;gap:6px">'+wa+btn+'</span></div>';
  }).join('');
}

// ── MIGRACION POR PRODUCTO Y MES: de los compradores Flex Meli de un producto en un mes, cuantos (por telefono) tienen despues alguna compra en canal directo ────
// mlRows (opcional): pestaña "ML Total" con Mes|Producto|Total ML (carga manual de Nacho) -> permite calcular "Mercado Envios" = Total ML - Flex Meli
function migProductoCalcular(vRows,fRows,mlRows){
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const normTel=t=>(t||'').toString().replace(/\D/g,'');
  const normNombreDir=(n,d)=>((n||'').trim().toLowerCase()+'|'+(d||'').trim().toLowerCase());
  // Guarda contra typos de año en la planilla (ej "1-ago-61" en vez de "1-ago-26" -> parsea como 2061)
  // cualquier fecha fuera de un rango razonable se descarta como dato corrupto, no como venta real
  const ANIO_MIN=2023;
  const fechaValida=f=>f&&!isNaN(f)&&f<=hoy&&f.getFullYear()>=ANIO_MIN;

  // Primera fecha de compra directa por identificador (telefono si hay, sino nombre+direccion), guardando tambien nombre/tel para mostrar
  // Ademas guardamos TODAS las fechas de compra directa de cada id, para poder saber si se consolido (2+) o se quedo en 1 sola
  const primeraDirectaPorId={};
  const historialDirectaPorId={}; // id -> array de fechas, para contar compras totales y calcular la mediana de frecuencia
  vRows.forEach(r=>{
    const tel=normTel(r['TELEFONO']);
    const id=tel&&tel.length>=8?('T:'+tel):('N:'+normNombreDir(r['CLIENTE']||r['Cliente'],r['Domicilio']||r['domicilio']));
    const f=parseFecha(r['FECHA']||r['Fecha']||'');
    if(!fechaValida(f))return;
    if(!historialDirectaPorId[id])historialDirectaPorId[id]=[];
    historialDirectaPorId[id].push(f);
    if(!primeraDirectaPorId[id]||f<primeraDirectaPorId[id].fecha){
      primeraDirectaPorId[id]={fecha:f,nombre:(r['CLIENTE']||r['Cliente']||'').trim(),tel};
    }
  });

  // Cohortes Flex Meli: agrupadas por mes de compra + producto (REFERNCIA), clientes distintos por id
  // El mismo producto puede venir escrito con distinta capitalizacion/typo en la planilla
  // -> diccionario de alias confirmado con Nacho: fusiona variantes conocidas del MISMO producto,
  //    pero NO fusiona productos que son realmente distintos (ej Anallergenic != Hypo)
  const ALIAS_PRODUCTO={
    'hypo':'Hypo','hypoallaregenic':'Hypo','hypoallargenic':'Hypo','hypoallergenic':'Hypo',
    'anallergenic':'Anallergenic',
    'med adu':'Med Adu','medium adult':'Med Adu',
    'diabetic':'Diabetic',
    'maxi puppy':'Maxi Puppy',
    'pro plan gastro':'Pro Plan Gastro'
  };
  const normProducto=p=>(p||'Sin especificar').trim().replace(/\s+/g,' ').toLowerCase();
  const labelProducto=p=>{
    const norm=normProducto(p);
    if(ALIAS_PRODUCTO[norm])return ALIAS_PRODUCTO[norm];
    return norm.replace(/\b\w/g,c=>c.toUpperCase()); // producto no listado en el alias: title-case tal cual viene
  };
  const cohortes={}; // key: 'YYYY-MM|producto-canonico' -> {compradores:Map(id->{fecha,nombre,tel})}
  fRows.forEach(r=>{
    const f=parseFecha(r['Fecha compra']||'');
    if(!fechaValida(f))return;
    const tel=normTel(r['TELEFONO']);
    const id=tel&&tel.length>=8?('T:'+tel):('N:'+normNombreDir(r['NOMBRE'],r['DIRECCION']||r['Direccion']));
    const productoCanon=labelProducto(r['REFERNCIA']);
    const mesKey=f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0');
    const key=mesKey+'|'+productoCanon;
    if(!cohortes[key])cohortes[key]={mesKey,producto:productoCanon,compradores:new Map()};
    // si el mismo id compro el mismo producto mas de una vez en el mes, nos quedamos con la fecha mas temprana
    const existente=cohortes[key].compradores.get(id);
    if(!existente||f<existente.fecha){
      cohortes[key].compradores.set(id,{fecha:f,nombre:(r['NOMBRE']||'').trim(),tel});
    }
  });

  // Por cada cohorte: cuantos de esos compradores tienen una compra directa posterior a su fecha Flex, y el detalle de quienes son
  // Ademas clasificamos cada migrado en 3 estados (misma logica que Recompras/vencidos, para que sean consistentes en todo el panel):
  //  - "activo": 2+ compras directas y no vencido (al dia con su ritmo de reposicion)
  //  - "estancado": 1 sola compra directa desde que migro (probo una vez y no volvio)
  //  - "vencido": 2+ compras directas pero ya se paso la fecha esperada de la proxima (dejo de comprar)
  const filas=Object.values(cohortes).map(c=>{
    const migradosDetalle=[];
    c.compradores.forEach((infoFlex,id)=>{
      const directa=primeraDirectaPorId[id];
      if(directa&&directa.fecha>=infoFlex.fecha){
        const historial=(historialDirectaPorId[id]||[]).slice().sort((a,b)=>a-b);
        const totalCompras=historial.length;
        let estado='estancado';
        if(totalCompras>=2){
          const intervalos=[];
          for(let i=1;i<historial.length;i++)intervalos.push(Math.round((historial[i]-historial[i-1])/(1000*60*60*24)));
          const freq=mediana(intervalos)||30;
          const ultima=historial[historial.length-1];
          const proxEsperada=new Date(ultima);proxEsperada.setDate(proxEsperada.getDate()+freq);
          estado=proxEsperada<hoy?'vencido':'activo';
        }
        migradosDetalle.push({
          nombre:directa.nombre||infoFlex.nombre||'Sin nombre',
          tel:directa.tel||infoFlex.tel||'',
          fechaFlex:infoFlex.fecha,
          fechaMigro:directa.fecha,
          totalCompras,estado
        });
      }
    });
    migradosDetalle.sort((a,b)=>a.nombre.localeCompare(b.nombre));
    const activos=migradosDetalle.filter(m=>m.estado==='activo').length;
    const estancados=migradosDetalle.filter(m=>m.estado==='estancado').length;
    const vencidos=migradosDetalle.filter(m=>m.estado==='vencido').length;
    return{mesKey:c.mesKey,producto:c.producto,total:c.compradores.size,migrados:migradosDetalle.length,tasa:c.compradores.size?Math.round(migradosDetalle.length/c.compradores.size*1000)/10:0,migradosDetalle,activos,estancados,vencidos};
  });

  // Cruce opcional con "ML Total" (carga manual): Mes(YYYY-MM)|Producto|Total ML -> Mercado Envios = Total ML - Flex Meli
  // Si Nacho todavia no cargo esa pestaña, mlRows viene vacio y este bloque no agrega nada (las filas quedan sin totalML)
  const totalMLPorKey={};
  (mlRows||[]).forEach(r=>{
    const mesRaw=(r['Mes']||'').toString().trim();
    const productoCanon=labelProducto(r['Producto']);
    const totalML=parseInt((r['Total ML']||'0').toString().replace(/\D/g,''),10)||0;
    if(!mesRaw)return;
    totalMLPorKey[mesRaw+'|'+productoCanon]=totalML;
  });
  filas.forEach(f=>{
    const totalML=totalMLPorKey[f.mesKey+'|'+f.producto];
    if(totalML!==undefined){
      f.totalML=totalML;
      f.mercadoEnvios=Math.max(0,totalML-f.total);
    }
  });

  filas.sort((a,b)=>b.mesKey.localeCompare(a.mesKey)||b.total-a.total);
  migProductoFilas=filas;
  migProductoRender();
}
let migProductoFilas=[];
function migProductoRender(){
  const tb=document.getElementById('mig-prod-tabla');if(!tb)return;
  if(!migProductoFilas.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin datos</div>';return;}
  const meses=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  // Agrupar por mes: se muestra solo el resumen (colapsado); al tocar el mes se despliega el detalle por producto
  const porMes={};
  migProductoFilas.forEach(f=>{
    if(!porMes[f.mesKey])porMes[f.mesKey]=[];
    porMes[f.mesKey].push(f);
  });
  const mesesOrdenados=Object.keys(porMes).sort((a,b)=>b.localeCompare(a));
  tb.innerHTML=mesesOrdenados.map(mesKey=>{
    const filasMes=porMes[mesKey];
    const[y,m]=mesKey.split('-');
    const mesLabel=meses[parseInt(m,10)-1]+' '+y;
    const totalFlex=filasMes.reduce((s,f)=>s+f.total,0);
    const totalMig=filasMes.reduce((s,f)=>s+f.migrados,0);
    const totalActivos=filasMes.reduce((s,f)=>s+f.activos,0);
    const tasaMes=totalFlex?Math.round(totalMig/totalFlex*1000)/10:0;
    let colorMes='#c0392b';
    if(tasaMes>=40)colorMes='#16a34a';else if(tasaMes>=20)colorMes='#856404';
    const idSeguro=mesKey.replace(/[^0-9]/g,'-');
    const filaResumen=`<div class="table-row" style="grid-template-columns:22px 100px 1fr 90px 90px 90px 80px;background:#f8fafc;font-weight:700;cursor:pointer" onclick="migProductoToggle('${idSeguro}')">
      <span id="mig-prod-arrow-${idSeguro}" style="font-size:11px;color:var(--gris-dark)">▸</span>
      <span style="font-size:12px">${mesLabel}</span>
      <span>${filasMes.length} producto${filasMes.length===1?'':'s'}</span>
      <span style="font-size:14px">${totalFlex}</span>
      <span style="font-size:14px">${totalMig}</span>
      <span style="font-size:14px;color:#16a34a">${totalActivos}</span>
      <span style="color:${colorMes}">${tasaMes}%</span>
    </div>`;
    const filasProducto=filasMes.sort((a,b)=>b.total-a.total).map((f,i)=>{
      let color='#c0392b';
      if(f.tasa>=40)color='#16a34a';else if(f.tasa>=20)color='#856404';
      const prodId=idSeguro+'-p'+i;
      const subtitMercado=f.totalML!==undefined
        ?`<div style="font-size:11px;color:var(--gris-dark);margin-top:2px">Total ML: <strong>${f.totalML}</strong> · Mercado Envíos (no migran): <strong style="color:#c0392b">${f.mercadoEnvios}</strong></div>`
        :'';
      const filaProducto=`<div class="table-row" style="grid-template-columns:22px 100px 1fr 90px 90px 90px 80px;cursor:pointer" onclick="migProductoToggleCompradores('${prodId}')">
        <span></span><span></span>
        <span style="color:var(--gris-dark)"><span id="mig-prod-arrow-${prodId}" style="font-size:10px;margin-right:6px">▸</span>${f.producto}${subtitMercado}</span>
        <span style="font-size:13px">${f.total}</span>
        <span style="font-size:13px">${f.migrados}</span>
        <span style="font-size:13px;color:#16a34a">${f.activos}</span>
        <span style="font-weight:700;color:${color}">${f.tasa}%</span>
      </div>`;
      const listaCompradores=f.migradosDetalle.length?f.migradosDetalle.map(c=>{
        const waBtn=c.tel?'<a class="wa-link" href="'+avWaLink(c.tel,c.nombre,f.producto)+'" target="_blank">WA</a>':'<span style="color:var(--gris-dark);font-size:11px">Sin tel</span>';
        return `<div class="table-row" style="grid-template-columns:22px 100px 1fr 90px 90px 60px;font-size:12px">
          <span></span><span></span>
          <span>${c.nombre}</span>
          <span style="color:var(--gris-dark)">${c.totalCompras} compra${c.totalCompras===1?'':'s'}</span>
          <span style="color:var(--gris-dark)">${c.tel||'--'}</span>
          <span>${waBtn}</span>
        </div>`;
      }).join(''):'<div style="padding:10px 14px;color:var(--gris-dark);font-size:12px">Sin migraciones en esta cohorte</div>';
      return filaProducto+`<div id="mig-prod-compradores-${prodId}" style="display:none;background:#fbfbfb">${listaCompradores}</div>`;
    }).join('');
    return filaResumen+`<div id="mig-prod-detalle-${idSeguro}" style="display:none">${filasProducto}</div>`;
  }).join('');
}
function migProductoToggle(idSeguro){
  const el=document.getElementById('mig-prod-detalle-'+idSeguro);
  const arrow=document.getElementById('mig-prod-arrow-'+idSeguro);
  if(!el)return;
  const abierto=el.style.display!=='none';
  el.style.display=abierto?'none':'block';
  if(arrow)arrow.textContent=abierto?'▸':'▾';
}
function migProductoToggleCompradores(prodId){
  const el=document.getElementById('mig-prod-compradores-'+prodId);
  const arrow=document.getElementById('mig-prod-arrow-'+prodId);
  if(!el)return;
  const abierto=el.style.display!=='none';
  el.style.display=abierto?'none':'block';
  if(arrow)arrow.textContent=abierto?'▸':'▾';
}
let migConvertidos=[];
function migRenderConvertidos(){
  const tb=document.getElementById('mig-convertidos');if(!tb)return;
  if(!migConvertidos.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin conversiones recientes</div>';return;}
  tb.innerHTML=migConvertidos.map(c=>{
    const zonaTag='<span class="'+(esLocal(c.localidad)?'local-tag':'fuera-tag')+'">'+(esLocal(c.localidad)?'local':'fuera')+'</span>';
    return `<div class="table-row" style="grid-template-columns:1fr 130px 90px 90px">
      <span style="font-weight:500">${c.nombre}</span>
      <span style="font-size:11px">${c.localidad||'--'} ${zonaTag}</span>
      <span style="font-size:11px">${new Date(c.fecha2da).toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</span>
      <span style="color:#16a34a;font-weight:700;font-size:16px">✓</span>
    </div>`;
  }).join('');
}
function migMetricas(){
  const t=migSeguimiento.length,v=migSeguimiento.filter(c=>c.diasAtraso>0).length;
  document.getElementById('mig-metrics').innerHTML=`<div class="metric"><div class="metric-label">En seguimiento</div><div class="metric-value">${t}</div></div><div class="metric"><div class="metric-label">Vencidos (esperando 2da compra)</div><div class="metric-value" style="color:#c0392b">${v}</div></div>`;
}
function migRenderTabla(){
  const tb=document.getElementById('mig-seguimiento');
  if(!migSeguimiento.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin clientes en seguimiento de migración</div>';return;}
  tb.innerHTML=migSeguimiento.map(c=>{
    const zonaTag='<span class="'+(esLocal(c.localidad)?'local-tag':'fuera-tag')+'">'+(esLocal(c.localidad)?'local':'fuera')+'</span>';
    const waBtn=c.tel?'<a class="wa-link" href="'+avWaLink(c.tel,c.nombre,c.producto)+'" target="_blank">WA</a>':'<span style="color:var(--gris-dark);font-size:12px">Sin tel</span>';
    return `<div class="table-row" style="grid-template-columns:1fr 130px 90px 90px 90px 60px 80px" title="${(c.direccion||'').replace(/"/g,'')}">
      <span style="font-weight:500">${c.nombre}</span>
      <span style="font-size:11px">${c.localidad||'--'} ${zonaTag}</span>
      <span style="font-size:11px">${c.fechaFlex.toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</span>
      <span style="font-size:11px">${c.fechaMigro.toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</span>
      <span style="font-size:11px">${c.proxFecha.toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</span>
      <span style="font-size:11px;font-weight:600;color:${c.color}">${c.estado}</span>
      ${waBtn}
    </div>`;
  }).join('');
}

