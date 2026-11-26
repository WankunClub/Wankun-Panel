// ── AVISO DE AUSENCIA — avisarle a los compradores que no vamos a repartir ──
// Herramienta permanente (no es para un solo evento). Por default NO muestra a todos
// los compradores históricos: mandar 400+ WhatsApp de golpe desde el mismo número
// termina en baneo. Muestra solo a quienes, según el mismo cálculo de frecuencia de
// Recompras, tienen la reposición vencida o próxima (quienes realmente necesitan
// saber que no va a haber reparto) — el universo completo queda disponible destildando
// el filtro, por si hace falta buscar a alguien puntual. El botón WA marca avisado
// solo al tocarlo. Para un cliente que todavía no compró (nuevo, "paracaidista"), se
// agrega a mano al final — esos siempre aparecen, sin filtrar.
const AUS_EST_KEY='wankun_aviso_ausencia_est';
const AUS_TPL_KEY='wankun_aviso_ausencia_tpl';
const AUS_MANUAL_KEY='wankun_aviso_ausencia_manual';
let ausData=[],ausCargando=false,ausUltimasFechas={desde:'',hasta:''};

// Identidad de cliente: por teléfono (único ID confiable) cuando hay 8+ dígitos,
// si no por nombre normalizado. Agrupar solo por nombre fragmenta a un mismo
// cliente en variantes de tipeo y, con un universo de 1500+ filas de compras,
// infla el conteo de "compradores" muy por encima de los clientes reales.
function ausNormTel(t){return(t||'').toString().replace(/\D/g,'');}
function ausKey(tel,nombre){const t=ausNormTel(tel);return(t&&t.length>=8)?('T:'+t):('N:'+(nombre||'').trim().toLowerCase());}
function ausFmtFecha(iso){if(!iso)return'';const[,m,d]=iso.split('-');return d+'/'+m;}
function ausFmtFechaObj(f){return String(f.getDate()).padStart(2,'0')+'/'+String(f.getMonth()+1).padStart(2,'0');}
function ausSumarDias(iso,n){const[y,m,d]=iso.split('-').map(Number);const f=new Date(y,m-1,d);f.setDate(f.getDate()+n);return f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0');}

function ausPlantilla(desde,hasta){
  if(!desde||!hasta)return'';
  const vuelve=ausSumarDias(hasta,1);
  return 'Buen día [Nombre]! Queremos contarte que entre el '+ausFmtFecha(desde)+' y el '+ausFmtFecha(hasta)+' inclusive Wankun Club no va a estar recibiendo pedidos. Si necesitás que coordinemos la reposición para esos días, avisanos hoy por favor, para que no le falte alimento a tu perrito en esos días. El '+ausFmtFecha(vuelve)+' retomamos todo con normalidad. ¡Gracias por elegirnos y confiar en nosotros siempre! \u{1F43E} Nacho';
}

function ausGuardarTpl(){
  try{localStorage.setItem(AUS_TPL_KEY,JSON.stringify({desde:document.getElementById('aus-desde').value,hasta:document.getElementById('aus-hasta').value,msg:document.getElementById('aus-msg').value}));}catch(e){}
}

function ausFechaCambio(){
  const desde=document.getElementById('aus-desde').value,hasta=document.getElementById('aus-hasta').value;
  const msgEl=document.getElementById('aus-msg');
  const anterior=ausPlantilla(ausUltimasFechas.desde,ausUltimasFechas.hasta);
  // Si no tocó el texto a mano, lo regeneramos con las fechas nuevas; si lo editó, lo respetamos.
  if(!msgEl.value.trim()||msgEl.value===anterior)msgEl.value=ausPlantilla(desde,hasta);
  ausUltimasFechas={desde,hasta};
  ausGuardarTpl();
}

function ausInit(){
  const desdeEl=document.getElementById('aus-desde'),hastaEl=document.getElementById('aus-hasta');
  let guardado=null;
  try{guardado=JSON.parse(localStorage.getItem(AUS_TPL_KEY)||'null');}catch(e){}
  desdeEl.value=(guardado&&guardado.desde)||'2026-11-27';
  hastaEl.value=(guardado&&guardado.hasta)||'2026-11-30';
  ausUltimasFechas={desde:desdeEl.value,hasta:hastaEl.value};
  document.getElementById('aus-msg').value=(guardado&&guardado.msg)||ausPlantilla(desdeEl.value,hastaEl.value);
  ausCargarClientes();
}

function ausManualLeer(){try{return JSON.parse(localStorage.getItem(AUS_MANUAL_KEY)||'[]');}catch(e){return[];}}
function ausManualGuardar(l){try{localStorage.setItem(AUS_MANUAL_KEY,JSON.stringify(l));}catch(e){}}

async function ausCargarClientes(){
  if(ausCargando)return;ausCargando=true;
  const st=document.getElementById('aus-status');st.textContent='Cargando…';
  try{
    // Solo canal directo (Ventas): la regla del proyecto es no mezclar nunca la
    // lógica de recompra con Flex Meli (volumen altísimo de Mercado Libre, en su
    // mayoría compras sueltas, sin ID de cliente propio). Mezclarla fue lo que
    // infló la lista a miles de "compradores".
    const vRows=await fetchCSV('Ventas');
    const idx={};
    function upsert(key,nombre,telefono,f,manual){
      const ex=idx[key];
      if(ex){
        if(telefono&&!ex.telefono)ex.telefono=telefono;
        if(f&&!isNaN(f))ex.fechas.push(f);
        if(manual)ex.manual=true;
      }else{
        idx[key]={nombre,telefono:telefono||'',fechas:(f&&!isNaN(f))?[f]:[],manual:!!manual,key};
      }
    }
    vRows.forEach(r=>{
      const nombre=(r['CLIENTE']||r['Cliente']||'').trim();if(!nombre)return;
      // La planilla de Ventas ya trae un ID de cliente propio (WK0101...), repetido
      // en todas sus compras: es la identidad más confiable que hay, mejor que
      // teléfono (que recién se carga de forma sistemática desde mediados de año)
      // o nombre (varía de tipeo entre filas de la misma persona).
      const idCliente=(r['ID']||'').trim();
      const telHeader=getCol(r,'TELEFONO','Teléfono','TELÉFONO','Telefono','telefono','Cel','Celular');
      const telColK=(r['_col10']||'').toString();
      const telRaw=telHeader||(/\d{6,}/.test(telColK)?telColK:'');
      const telN=ausNormTel(telRaw);
      const f=parseFecha(r['FECHA']||r['Fecha']||'');
      const key=idCliente?('ID:'+idCliente):ausKey(telRaw,nombre);
      upsert(key,nombre,(telN&&telN.length>=8)?telRaw:'',f);
    });
    ausManualLeer().forEach(m=>upsert(ausKey(m.telefono,m.nombre),m.nombre,m.telefono,null,true));
    // Un cliente puede tener dos ID distintos si en algún momento se cargó mal
    // (p.ej. dos altas por error) pero comparte teléfono: unificar por las dudas.
    const porTel={},sinTel=[];
    Object.values(idx).forEach(c=>{
      const telN=ausNormTel(c.telefono);
      if(telN&&telN.length>=8){
        if(porTel[telN]){
          const base=porTel[telN];
          base.fechas=base.fechas.concat(c.fechas);
          if(c.manual)base.manual=true;
          return;
        }
        porTel[telN]=c;
      }else sinTel.push(c);
    });
    const hoy=new Date();hoy.setHours(0,0,0,0);
    // Mismo cálculo de frecuencia/estado que Recompras (mediana de intervalos entre
    // compras): vencido/próximo = le toca reponer alimento ya o en los próximos días,
    // así que es a quien hay que avisarle sí o sí que no va a haber reparto.
    function calcularEstado(c){
      const fechas=(c.fechas||[]).filter(f=>f&&!isNaN(f)).sort((a,b)=>a-b);
      if(!fechas.length){c.ultimaFecha=null;c.estadoRecompra=c.manual?'nuevo':'sin_datos';c.urgente=!!c.manual;return;}
      const ultima=fechas[fechas.length-1];
      c.ultimaFecha=ultima;
      const dias=Math.floor((hoy-ultima)/(1000*60*60*24));
      let freq=null;
      if(fechas.length>=2){const diffs=[];for(let i=1;i<fechas.length;i++){const d=Math.floor((fechas[i]-fechas[i-1])/(1000*60*60*24));if(d>0&&d<200)diffs.push(d);}if(diffs.length)freq=mediana(diffs);}
      let estado;
      if(freq!==null){const prox=freq-dias;estado=prox<-5?'vencido':(prox<=5?'proximo':'ok');}
      else estado=dias>45?'vencido':(dias>38?'proximo':'ok');
      c.estadoRecompra=estado;
      // Tope de actividad: "vencido" sin techo marca para siempre a cualquiera que
      // compró una sola vez hace un año (no es alguien que espera un pedido esta
      // semana, es un cliente que ya se fue). Sin esto, casi toda la base histórica
      // termina "vencida" y la lista deja de ser chica. Solo cuenta como urgente si
      // compró hace 60 días o menos — ahí sí hay una relación activa en curso.
      c.urgente=c.manual||(dias<=60&&(estado==='vencido'||estado==='proximo'));
    }
    const combinados=[...Object.values(porTel),...sinTel];
    combinados.forEach(calcularEstado);
    ausData=combinados.sort((a,b)=>{
      if(a.urgente!==b.urgente)return a.urgente?-1:1;
      if(a.ultimaFecha&&b.ultimaFecha)return b.ultimaFecha-a.ultimaFecha;
      if(a.ultimaFecha)return -1;
      if(b.ultimaFecha)return 1;
      return a.nombre.localeCompare(b.nombre,'es');
    });
    const urgentes=ausData.filter(c=>c.urgente).length;
    st.textContent=urgentes+' con recompra próxima/vencida · '+ausData.length+' compradores en total';
  }catch(e){st.textContent='Error al cargar';}
  ausCargando=false;
  ausFiltrar();
}

function ausGetEstadoMapa(){try{return JSON.parse(localStorage.getItem(AUS_EST_KEY)||'{}');}catch(e){return{};}}
function ausSetEstadoUno(key,estado){const m=ausGetEstadoMapa();m[key]=estado;try{localStorage.setItem(AUS_EST_KEY,JSON.stringify(m));}catch(e){}}
function ausToggle(key){const m=ausGetEstadoMapa();const cur=!!(m[key]&&m[key].avisado);ausSetEstadoUno(key,{avisado:!cur});ausFiltrar();}
function ausMarcarAvisado(key){const m=ausGetEstadoMapa();if(m[key]&&m[key].avisado)return;ausSetEstadoUno(key,{avisado:true});ausFiltrar();}

function ausWaLink(tel,msg){
  const d=(tel||'').replace(/\D/g,'');if(!d)return null;
  const full=d.startsWith('54')?d:(d.length===10?'549'+d:'54'+d);
  return 'https://wa.me/'+full+'?text='+encodeURIComponent(msg);
}
function ausWaLinkFila(c){
  const msgTpl=document.getElementById('aus-msg').value;
  const primer=(c.nombre||'').split(/\s+/)[0];
  return ausWaLink(c.telefono,msgTpl.replace(/\[Nombre\]/g,primer));
}

const AUS_ESTADO_TAG={vencido:'<span class="check-tag tag-bad">vencido</span>',proximo:'<span class="check-tag tag-warn">próximo</span>',nuevo:'<span class="check-tag" style="background:#dbeafe;color:#1d4ed8">nuevo</span>',ok:'',sin_datos:''};

function ausFiltrar(){
  if(!ausData.length&&!document.getElementById('aus-table'))return;
  const f=document.getElementById('aus-filtro').value;
  const q=(document.getElementById('aus-buscar').value||'').trim().toLowerCase();
  const soloUrgentes=document.getElementById('aus-solo-urgentes').checked;
  const est=ausGetEstadoMapa();
  const lista=ausData.filter(c=>{
    c._avisado=!!(est[c.key]&&est[c.key].avisado);
    if(soloUrgentes&&!c.urgente)return false;
    if(f==='pendiente'&&c._avisado)return false;
    if(f==='avisado'&&!c._avisado)return false;
    if(q&&c.nombre.toLowerCase().indexOf(q)<0)return false;
    return true;
  });
  document.getElementById('aus-count').textContent=lista.length+' clientes';
  const tb=document.getElementById('aus-table');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin resultados'+(soloUrgentes?' — probá destildar "solo recompra próxima/vencida"':'')+'</div>';return;}
  tb.innerHTML=lista.map(c=>{
    const fecha=c.ultimaFecha?ausFmtFechaObj(c.ultimaFecha):'--';
    const tag=AUS_ESTADO_TAG[c.estadoRecompra]||'';
    const wa=c.telefono?`<a class="wa-link" href="${ausWaLinkFila(c)}" target="_blank" onclick="event.stopPropagation();ausMarcarAvisado('${c.key}')">WA</a>`:'<span style="color:var(--gris-dark);font-size:12px">--</span>';
    return `<div class="table-row" style="grid-template-columns:1fr 100px 120px 90px 80px">
      <span style="font-weight:500">${c.nombre} ${tag}</span>
      <span style="font-size:12px">${fecha}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px">${c.telefono||'--'}</span>
      <span style="text-align:center"><input type="checkbox" ${c._avisado?'checked':''} onchange="ausToggle('${c.key}')" style="width:18px;height:18px;cursor:pointer"></span>
      ${wa}
    </div>`;
  }).join('');
}

function ausAgregarManual(){
  const nombre=document.getElementById('aus-add-nombre').value.trim();
  const tel=document.getElementById('aus-add-tel').value.trim();
  if(!nombre){alert('Cargá el nombre del cliente.');return;}
  if(!tel.replace(/\D/g,'')){alert('Cargá el teléfono.');return;}
  const key=ausKey(tel,nombre);
  if(!ausData.some(c=>c.key===key)){
    ausData.unshift({nombre,telefono:tel,ultimaFecha:null,estadoRecompra:'nuevo',urgente:true,key,manual:true});
    const man=ausManualLeer();man.push({nombre,telefono:tel});ausManualGuardar(man);
  }
  document.getElementById('aus-add-nombre').value='';document.getElementById('aus-add-tel').value='';
  ausFiltrar();
}

ausInit();
