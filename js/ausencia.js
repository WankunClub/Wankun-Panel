// ── AVISO DE AUSENCIA — avisarle a los compradores que no vamos a repartir ──
// Herramienta permanente (no es para un solo evento). La lista de compradores se
// arma sola desde Ventas + Flex Meli (como las otras tarjetas de Envíos), con filtro
// de estado y buscador. El botón WA marca avisado solo al tocarlo. Para un cliente
// que todavía no compró (nuevo, "paracaidista"), se agrega a mano al final.
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
  return 'Hola [Nombre]! Te escribimos para avisarte que desde el '+ausFmtFecha(desde)+' hasta el '+ausFmtFecha(hasta)+' inclusive vamos a estar ausentes, asi que no vamos a poder hacer entregas esos dias. A partir del '+ausFmtFecha(vuelve)+' retomamos el servicio con normalidad. Gracias por tu paciencia! Saludos, Nacho.';
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
    const[vRows,fRows]=await Promise.all([fetchCSV('Ventas'),fetchCSV('Flex meli').catch(()=>[])]);
    const idx={};
    function upsert(key,nombre,telefono,f){
      const ex=idx[key];
      if(ex){
        if(telefono&&!ex.telefono)ex.telefono=telefono;
        if(f&&!isNaN(f)&&(!ex.ultimaFecha||f>ex.ultimaFecha))ex.ultimaFecha=f;
      }else{
        idx[key]={nombre,telefono:telefono||'',ultimaFecha:(f&&!isNaN(f))?f:null,key};
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
    fRows.forEach(r=>{
      const nombre=(r['NOMBRE']||'').trim();if(!nombre)return;
      const telRaw=(r['TELEFONO']||'').toString();
      const telN=ausNormTel(telRaw);
      const f=parseFecha(r['Fecha compra']||r['Fecha envio']||r['Fecha envío']||'');
      upsert(ausKey(telRaw,nombre),nombre,(telN&&telN.length>=8)?telRaw:'',f);
    });
    ausManualLeer().forEach(m=>upsert(ausKey(m.telefono,m.nombre),m.nombre,m.telefono,null));
    // Flex Meli no tiene ID propio: si un cliente aparece también con el mismo
    // teléfono del lado de Ventas (clave 'ID:...'), es la misma persona — unificar
    // para no mostrarla dos veces en la lista.
    const porTel={},sinTel=[];
    Object.values(idx).forEach(c=>{
      const telN=ausNormTel(c.telefono);
      if(telN&&telN.length>=8){
        if(porTel[telN]){
          const base=porTel[telN];
          if(c.ultimaFecha&&(!base.ultimaFecha||c.ultimaFecha>base.ultimaFecha))base.ultimaFecha=c.ultimaFecha;
          return;
        }
        porTel[telN]=c;
      }else sinTel.push(c);
    });
    ausData=[...Object.values(porTel),...sinTel].sort((a,b)=>{
      if(a.ultimaFecha&&b.ultimaFecha)return b.ultimaFecha-a.ultimaFecha;
      if(a.ultimaFecha)return -1;
      if(b.ultimaFecha)return 1;
      return a.nombre.localeCompare(b.nombre,'es');
    });
    st.textContent=ausData.length+' compradores';
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

function ausFiltrar(){
  if(!ausData.length&&!document.getElementById('aus-table'))return;
  const f=document.getElementById('aus-filtro').value;
  const q=(document.getElementById('aus-buscar').value||'').trim().toLowerCase();
  const est=ausGetEstadoMapa();
  const lista=ausData.filter(c=>{
    c._avisado=!!(est[c.key]&&est[c.key].avisado);
    if(f==='pendiente'&&c._avisado)return false;
    if(f==='avisado'&&!c._avisado)return false;
    if(q&&c.nombre.toLowerCase().indexOf(q)<0)return false;
    return true;
  });
  document.getElementById('aus-count').textContent=lista.length+' clientes';
  const tb=document.getElementById('aus-table');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin resultados</div>';return;}
  tb.innerHTML=lista.map(c=>{
    const fecha=c.ultimaFecha?ausFmtFechaObj(c.ultimaFecha):'--';
    const wa=c.telefono?`<a class="wa-link" href="${ausWaLinkFila(c)}" target="_blank" onclick="event.stopPropagation();ausMarcarAvisado('${c.key}')">WA</a>`:'<span style="color:var(--gris-dark);font-size:12px">--</span>';
    return `<div class="table-row" style="grid-template-columns:1fr 100px 120px 90px 80px">
      <span style="font-weight:500">${c.nombre}</span>
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
    ausData.unshift({nombre,telefono:tel,ultimaFecha:null,key,manual:true});
    const man=ausManualLeer();man.push({nombre,telefono:tel});ausManualGuardar(man);
  }
  document.getElementById('aus-add-nombre').value='';document.getElementById('aus-add-tel').value='';
  ausFiltrar();
}

ausInit();
