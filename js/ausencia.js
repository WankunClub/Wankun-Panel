// ── AVISO DE AUSENCIA — avisarle a cualquier comprador que no vamos a repartir ──
// Herramienta permanente (no es para un solo evento): no hay lista automática de a
// quién avisar porque siempre cae algún cliente imprevisto ("paracaidista"). Nacho
// busca al cliente por nombre (se autocompleta el teléfono) o lo carga a mano si es
// nuevo, ajusta fechas y mensaje si hace falta, y el panel lleva registro local de a
// quién ya le avisó para esta tanda.
const AUS_HIST_KEY='wankun_aviso_ausencia_hist';
const AUS_TPL_KEY='wankun_aviso_ausencia_tpl';
let ausClientes={},ausCargando=false,ausUltimasFechas={desde:'',hasta:''};

function ausFmtFecha(iso){if(!iso)return'';const[,m,d]=iso.split('-');return d+'/'+m;}
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
  ausHistRender();
}

async function ausCargarClientes(){
  if(ausCargando)return;ausCargando=true;
  const st=document.getElementById('aus-status');st.textContent='Cargando…';
  try{
    const[vRows,fRows]=await Promise.all([fetchCSV('Ventas'),fetchCSV('Flex meli').catch(()=>[])]);
    const idx={};
    vRows.forEach(r=>{const n=(r['CLIENTE']||r['Cliente']||'').trim();if(!n)return;const tel=(getCol(r,'TELEFONO','Telefono','Teléfono')||'').toString().trim();if(tel||!idx[n])idx[n]=tel||(idx[n]||'');});
    fRows.forEach(r=>{const n=(r['NOMBRE']||'').trim();if(!n)return;const tel=(r['TELEFONO']||'').toString().trim();if(tel||!idx[n])idx[n]=tel||(idx[n]||'');});
    ausClientes=idx;
    document.getElementById('aus-clientes').innerHTML=Object.keys(idx).sort((a,b)=>a.localeCompare(b,'es')).map(n=>'<option value="'+n.replace(/"/g,'&quot;')+'">').join('');
    st.textContent=Object.keys(idx).length+' clientes';
  }catch(e){st.textContent='Error al cargar';}
  ausCargando=false;
}

function ausAutocompletar(){
  const n=document.getElementById('aus-nombre').value.trim();
  const tel=ausClientes[n];
  if(tel)document.getElementById('aus-tel').value=tel;
}

function ausWaLink(tel,msg){
  const d=(tel||'').replace(/\D/g,'');if(!d)return null;
  const full=d.startsWith('54')?d:(d.length===10?'549'+d:'54'+d);
  return 'https://wa.me/'+full+'?text='+encodeURIComponent(msg);
}

function ausHistLeer(){try{return JSON.parse(localStorage.getItem(AUS_HIST_KEY)||'[]');}catch(e){return[];}}
function ausHistGuardar(l){try{localStorage.setItem(AUS_HIST_KEY,JSON.stringify(l));}catch(e){}}

function ausHistRender(){
  const l=ausHistLeer();
  const cont=document.getElementById('aus-historial');
  if(!l.length){cont.innerHTML='<div style="font-size:12px;color:var(--gris-dark)">Todavía no le avisaste a nadie en esta tanda.</div>';return;}
  cont.innerHTML='<div style="font-size:12px;color:var(--gris-dark);margin-bottom:6px">Ya avisados ('+l.length+')</div>'+
    l.slice().reverse().map((h,i)=>{
      const idx=l.length-1-i;
      return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:5px 8px;background:var(--gris);border-radius:6px;margin-bottom:4px"><span>'+h.nombre+' <span style="color:var(--gris-dark);font-family:\'DM Mono\',monospace">'+(h.telefono||'')+'</span></span><span style="display:flex;gap:10px;align-items:center"><span style="color:var(--gris-dark)">'+h.hora+'</span><a href="#" onclick="ausHistQuitar('+idx+');return false" style="color:#c0392b">quitar</a></span></div>';
    }).join('');
}

function ausHistQuitar(i){
  const l=ausHistLeer();l.splice(i,1);ausHistGuardar(l);ausHistRender();
}

function ausVaciarHist(){
  if(!confirm('¿Vaciar la lista de avisados? (arranca una tanda nueva)'))return;
  ausHistGuardar([]);ausHistRender();
}

function ausEnviar(){
  const nombre=document.getElementById('aus-nombre').value.trim();
  const tel=document.getElementById('aus-tel').value.trim();
  const msgTpl=document.getElementById('aus-msg').value;
  if(!nombre){alert('Cargá el nombre del cliente.');return;}
  if(!tel.replace(/\D/g,'')){alert('Cargá el teléfono (no lo tengo guardado para este cliente).');return;}
  const primer=nombre.split(/\s+/)[0];
  const msg=msgTpl.replace(/\[Nombre\]/g,primer);
  const url=ausWaLink(tel,msg);
  if(!url){alert('El teléfono no parece válido.');return;}
  window.open(url,'_blank','noopener');
  const l=ausHistLeer();
  l.push({nombre,telefono:tel,hora:(new Date()).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})});
  ausHistGuardar(l);
  ausHistRender();
  document.getElementById('aus-nombre').value='';document.getElementById('aus-tel').value='';
  document.getElementById('aus-nombre').focus();
}

ausInit();
