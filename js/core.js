
const PROXY='https://cool-meadow-3b33.wankun-petshop.workers.dev';
const VERDE='#2d6a4f',VERDE_CL='#74c69d',AZUL='#457b9d';
const ZONAS_LOCAL=['pilar','del viso','escobar','maschwitz','maschwitz p','maschwitz privado','maschwits','maschwits privado','maschwitch','maschwitz priivado','benavidez','tigre','nordelta','villanueva','tortuguitas','manuel alberti','pilara','pilar del este','la montura','recodo','el recodo','roble joven','highlands','altos del barranco','las liebres','ayres','azurra','puertos','galapagos','caamaño','pacheco','bermudas','olivos gold','olivos golf','la lomada','canton','el canton','de vicenzo','sausalito','smo','santa maria','san matias','mapuche','martin dale','haras de santa maria','sheraton','sheraton pilar','grand bourg','gran bourg','argentino golf'];
function esLocal(l){return ZONAS_LOCAL.includes((l||'').trim().toLowerCase());}
function fmt(n){return '$'+(n/1e6).toFixed(1)+'M';}

// ── Normalización de marcas y zonas (evita duplicados tipo "Pro plan" / "Pro Plan") ──
const MARCAS_CANON=['Balanced','Club Performance','Eukanuba','Excellent','Fawna','Mon Ami','Nutrique','Old Prince','Optimus','Pro Plan','Prof Vet','Royal Canin','Unik','Vital Can','Golocan','Dog Selection','Cristal Cat','Fit','Bio','Cidar','Roa'];
const MARCAS_ALIAS={'royal':'Royal Canin','rc':'Royal Canin','euka':'Eukanuba','unilk':'Unik','balance':'Balanced','proplan':'Pro Plan','pp':'Pro Plan','oldprince':'Old Prince','monami':'Mon Ami','profvet':'Prof Vet','clubperformance':'Club Performance','vitalcantherapy':'Vital Can','vitalcan':'Vital Can','rpuppies':'Royal Canin'};
const _MARCA_IDX={};MARCAS_CANON.forEach(m=>{_MARCA_IDX[m.toLowerCase().replace(/[^a-z0-9]/g,'')]=m;});
function normMarca(m){
  const k=(m||'').toString().normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  if(!k||k==='vacia')return'Sin marca';
  return _MARCA_IDX[k]||MARCAS_ALIAS[k]||'Sin marca';
}
const LOC_ALIAS={'recodo':'el recodo','maschwitz p':'maschwitz','maschwitz privado':'maschwitz','maschwits':'maschwitz','maschwits privado':'maschwitz','maschwitch':'maschwitz','maschwitz priivado':'maschwitz','olivos gold':'olivos golf','canton':'el canton','capital federal':'caba','c.a.b.a':'caba','gran bourg':'grand bourg','sheraton pilar':'sheraton'};
function normLoc(l){let k=(l||'').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');k=LOC_ALIAS[k]||k;return k;}
function zonaGrupo(l){const k=normLoc(l);if(!k)return'Sin dato';if(k==='caba'||k.includes('caba')||k.includes('capital'))return'CABA';if(esLocal(k)||esLocal((l||'').trim().toLowerCase()))return'Local 15 km';return'Resto GBA';}
function capWords(s){return(s||'').split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');}

// ── Nombre del mes actual dinámico ──────────────────────────────────────────
const MESES_NOM_ES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_LARGO=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const _hoyInit=new Date();
const MES_ACTUAL_IDX=_hoyInit.getMonth();   // 0-based
const ANIO_ACTUAL=_hoyInit.getFullYear();
const MES_ACTUAL_KEY=ANIO_ACTUAL+'-'+(MES_ACTUAL_IDX+1).toString().padStart(2,'0');

// Actualizar label dinámico en el HTML
document.getElementById('m-mes-label').textContent=MESES_LARGO[MES_ACTUAL_IDX]+' '+ANIO_ACTUAL;

// ── Datos de respaldo (sin hardcodear mayo como último) ──────────────────────
// Se usan solo mientras carga el live. Incluye Jun con 0 para que el panel
// no muestre mayo como mes "actual".
let MESES_LIVE=['Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr','May','Jun'];
let KG_LIVE=[],KEYS_LIVE=[];
let FAC_LIVE=   [4351700,7950760,8804030,9844900,9661745,11334800,16575600,19314000,19700000,0];

// ── AVISO TEMPORAL (nov 2026) — sin reparto 9, 10 y 11 de noviembre ──────────
// Borrar este bloque, la pagina page-aviso y su item del menu despues del 12/11.
const AP_KEY='wankun_aviso_papa_v1';
const AP_DESDE=new Date(2026,9,6), AP_HASTA=new Date(2026,9,14), AP_NOV=new Date(2026,10,1);
let apLista=[], apFiltroAct='pend', apCargando=false;
function apEnviados(){try{return JSON.parse(localStorage.getItem(AP_KEY)||'{}');}catch(e){return{};}}
function apGuardar(m){try{localStorage.setItem(AP_KEY,JSON.stringify(m));}catch(e){}}
function apNorm(s){return (s||'').toString().normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim();}
function apProd(marca,prod){
  let p=((marca&&!/^vac/i.test(marca)?marca+' ':'')+(prod||'')).replace(/\s+/g,' ').trim();
  const fix=[[/\bMed Adu(lt)?\b/gi,'Medium Adult'],[/\bMax(i)? Adu(lt)?\b/gi,'Maxi Adult'],[/\bHypo Puppt\b/gi,'Hypoallergenic Puppy'],[/\bHypo\b/gi,'Hypoallergenic'],[/\bDiabetc\b/gi,'Diabetic'],[/\bWC\b/g,'Weight Care'],[/^royal canin/i,'Royal Canin'],[/^Balance Medium$/i,'Balanced Medium Adult']];
  fix.forEach(f=>{p=p.replace(f[0],f[1]);});
  return p;
}
function apMensaje(nombre,prods){
  const primer=(nombre||'').trim().split(/[\s\-]+/)[0];
  const n=primer.charAt(0).toUpperCase()+primer.slice(1).toLowerCase();
  const pt=prods.length===1?prods[0]:prods.slice(0,-1).join(', ')+' y '+prods[prods.length-1];
  return '¡Hola '+n+'! 🐾 Te saluda Nacho de Wankun Club para avisarte con tiempo: el lunes 9, martes 10 y miércoles 11 de noviembre no vamos a tener entregas por la visita del Papa.\n\n'+
    'Como en octubre te llevaste '+pt+', puede que se te esté terminando justo por esos días. Para que no te quedes sin alimento, te lo podemos mandar antes del lunes o agendarlo para el jueves 12.\n\n'+
    '¿Qué te queda mejor? Avisame y te lo reservo 🙌';
}
function apWa(tel,msg){const d=(tel||'').replace(/\D/g,'');const full=d.length===10?'549'+d:(d.startsWith('54')?d:'54'+d);return 'https://wa.me/'+full+'?text='+encodeURIComponent(msg);}
async function apCargar(){
  if(apCargando)return; apCargando=true;
  const st=document.getElementById('ap-status');
  st.textContent='Cargando…'; st.className='conn-status';
  try{
    const rows=await fetchCSV('Ventas');
    const grupos={};
    const EXCL=/shampoo|perfume|desparasit|piedras|artrin|bit trio|churrasq|golocan|humedo|pouch|lata|flura|recovery|moscu/i;
    rows.forEach(r=>{
      const f=parseFecha(r['FECHA']||r['Fecha']||''); if(!f||isNaN(f))return;
      const nombre=(r['CLIENTE']||r['Cliente']||'').trim(); const nn=apNorm(nombre);
      if(!nn||nn==='xx'||nn==='vete'||nn==='lulo')return;
      let tel=(getCol(r,'TELEFONO','Telefono','Teléfono')||r['_col10']||'').toString().replace(/\D/g,'');
      if(tel.length<10)tel='';
      const key=tel?('t'+tel.slice(-10)):('n'+nn);
      (grupos[key]=grupos[key]||[]).push({f,nombre,tel,loc:(r['Barrio/Localidad']||r['Localidad']||'').trim(),marca:r['Marca']||'',prod:r['producto']||r['Producto']||''});
    });
    // Unir por nombre completo los grupos sin telefono con los que si tienen
    const porNombre={};
    Object.keys(grupos).forEach(k=>{if(k[0]==='t')grupos[k].forEach(x=>{const nn=apNorm(x.nombre);if(nn.split(' ').length>=2)porNombre[nn]=k;});});
    Object.keys(grupos).forEach(k=>{if(k[0]==='n'){const nn=k.slice(1);if(porNombre[nn]){grupos[porNombre[nn]].push(...grupos[k]);delete grupos[k];}}});
    const lista=[];
    Object.keys(grupos).forEach(k=>{
      const g=grupos[k];
      const oct=g.filter(x=>x.f>=AP_DESDE&&x.f<=AP_HASTA);
      if(!oct.length)return;
      if(g.some(x=>x.f>=AP_NOV))return;
      const ult=new Date(Math.max(...oct.map(x=>x.f)));
      let ps=oct.filter(x=>+x.f===+ult&&!EXCL.test(x.prod));
      if(!ps.length)ps=oct.filter(x=>+x.f===+ult);
      const prods=[...new Set(ps.map(x=>apProd(x.marca,x.prod)).filter(Boolean))];
      const desp=g.filter(x=>x.f>AP_HASTA&&x.f<AP_NOV).sort((a,b)=>b.f-a.f)[0];
      const nombre=oct.map(x=>x.nombre).sort((a,b)=>b.length-a.length)[0];
      const tel=(g.slice().reverse().find(x=>x.tel)||{}).tel||'';
      const loc=(g.slice().reverse().find(x=>x.loc)||{}).loc||'';
      lista.push({key:k,nombre,tel,loc,fecha:ult,prods,volvio:desp?desp.f:null,msg:apMensaje(nombre,prods)});
    });
    lista.sort((a,b)=>a.fecha-b.fecha||a.nombre.localeCompare(b.nombre));
    apLista=lista;
    st.textContent='Actualizado '+new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}); st.className='conn-status conn-ok';
    apRender();
  }catch(e){st.textContent='No se pudo leer la hoja Ventas. Tocá Actualizar de nuevo.';st.className='conn-status conn-err';}
  apCargando=false;
}
function apFiltro(f){apFiltroAct=f;document.querySelectorAll('[data-apf]').forEach(b=>b.className='btn'+(b.dataset.apf===f?' btn-primary':''));apRender();}
// Al abrir WhatsApp desde el boton WA se marca como notificado; el re-render va con demora para no cortar la apertura del link.
function apAbrio(k){const m=apEnviados();if(!m[k]){m[k]=Date.now();apGuardar(m);}setTimeout(apRender,400);}
function apToggle(k){const m=apEnviados();if(m[k])delete m[k];else m[k]=Date.now();apGuardar(m);apRender();}
function apRender(){
  const env=apEnviados();
  const tot=apLista.length, nEnv=apLista.filter(c=>env[c.key]).length, nVolv=apLista.filter(c=>c.volvio).length;
  document.getElementById('ap-metrics').innerHTML=
    '<div class="metric"><div class="metric-label">Clientes a avisar</div><div class="metric-value">'+tot+'</div></div>'+
    '<div class="metric"><div class="metric-label">Notificados</div><div class="metric-value" style="color:var(--verde)">'+nEnv+'</div></div>'+
    '<div class="metric"><div class="metric-label">Faltan</div><div class="metric-value">'+(tot-nEnv)+'</div></div>'+
    '<div class="metric"><div class="metric-label">Volvieron a fin de oct</div><div class="metric-value" style="color:#d97706">'+nVolv+'</div></div>';
  const fil=apLista.filter(c=>apFiltroAct==='all'||(apFiltroAct==='env'?env[c.key]:apFiltroAct==='volv'?c.volvio:!env[c.key]));
  const tb=document.getElementById('ap-tabla');
  if(!fil.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">'+(apLista.length?'No queda nadie en esta vista':'Tocá Actualizar para armar la lista')+'</div>';return;}
  const fd=d=>d.getDate()+'/'+(d.getMonth()+1);
  tb.innerHTML=fil.map(c=>{
    const e=!!env[c.key];
    const wa=c.tel?'<a class="wa-link" href="'+apWa(c.tel,c.msg)+'" target="_blank" rel="noopener" onclick="apAbrio(\''+c.key+'\')">WA</a>':'<span style="color:var(--gris-dark);font-size:12px">Sin tel</span>';
    const btn='<button class="wa-link" style="background:'+(e?'var(--verde)':'var(--gris-med)')+';color:'+(e?'#fff':'var(--texto)')+'" onclick="apToggle(\''+c.key+'\')">'+(e?'Deshacer':'Enviado')+'</button>';
    const flag=c.volvio?'<div style="font-size:11px;color:#d97706">Volvió a comprar el '+fd(c.volvio)+'</div>':'';
    return '<div class="table-row" style="grid-template-columns:1.2fr 1fr 1.4fr 70px 150px;'+(e?'opacity:.55':'')+'"><span style="font-weight:500">'+c.nombre+flag+'</span><span style="font-size:12px">'+(c.loc||'--')+'</span><span style="font-size:12px">'+c.prods.join(' · ')+'</span><span style="font-size:12px">'+fd(c.fecha)+'</span><span style="display:flex;gap:6px">'+wa+btn+'</span></div>';
  }).join('');
}
// ── fin AVISO TEMPORAL ──────────────────────────────────────────────────────

function irA(p){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
  const el=document.getElementById('page-'+p);
  if(el)el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(x=>{if(x.getAttribute('onclick')&&x.getAttribute('onclick').includes("'"+p+"'"))x.classList.add('active');});
  if(p==='stock'){setTimeout(function(){skRenderTabla();skRenderMetricas();},50);}
  const t={'inicio':'Inicio','ventas':'Ventas','financiero':'Financiero','vete':'Vete','clientes':'Clientes','recompras':'Recompras','migracion':'Migración','inactivos':'Migrados que dejaron de comprar','analisis':'Análisis de clientes','resenas':'Reseñas','envios':'Envíos','ruta':'Hoja de ruta','marketing':'Agente Marketing','sorteo':'Sorteo Mundial','roadmap':'Roadmap','precios':'Precios','stock':'Control de Stock','aviso':'Aviso sin reparto 9–11 nov'};
  document.getElementById('page-title').textContent=t[p]||p;
  if(p==='ventas'){renderMensualKg();renderPeq('zonas-bars',ZONAS_DATA,VERDE);renderPeq('marcas-bars',MARCAS_DATA,AZUL);}
  if(p==='resenas'){resenasCargarHistorial();}
  if(p==='ruta'){hrInit();}
  if(p==='precios'){prInit();}
  if(p==='financiero'){if(!FIN_DATA)finCargar();}
  if(p==='vete'){if(!VETE_DATA)veteCargar();}
  if(p==='aviso'){if(!apLista.length)apCargar();else apRender();}
  if(p==='inactivos'){inCargar();}
}

document.getElementById('fecha-hoy').textContent=new Date().toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short',year:'numeric'});

function parseFecha(s){
  if(!s)return null;
  s=s.toString().trim();
  // ISO: yyyy-mm-dd o yyyy/mm/dd
  const miso=s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if(miso)return new Date(parseInt(miso[1]),parseInt(miso[2])-1,parseInt(miso[3]));
  // d/m/yy o d-m-yy
  const m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if(m){let y=parseInt(m[3]);if(y<100)y+=2000;return new Date(y,parseInt(m[2])-1,parseInt(m[1]));}
  const meses={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,ene:0,abr:3,ago:7,set:8,dic:11};
  const m2=s.match(/^(\d{1,2})[\/\-](\w+)[\/\-](\d{2,4})$/i);
  if(m2){const mes=meses[m2[2].toLowerCase().substring(0,3)];let y=parseInt(m2[3]);if(y<100)y+=2000;if(mes!==undefined)return new Date(y,mes,parseInt(m2[1]));}
  return null;
}

// Mediana en vez de promedio: si un cliente tuvo un bache aislado (dejo de comprarnos un tiempo y volvio),
// ese intervalo larguisimo no debe arrastrar hacia arriba la frecuencia estimada de recompra real.
function mediana(arr){
  if(!arr.length)return null;
  const s=[...arr].sort((a,b)=>a-b);
  const mid=Math.floor(s.length/2);
  return s.length%2!==0?s[mid]:Math.round((s[mid-1]+s[mid])/2);
}

function getCol(r,...keys){
  for(const k of keys){
    if(r[k]!==undefined&&r[k]!==null&&r[k]!=='')return r[k];
    const trimmed=Object.keys(r).find(rk=>rk.trim().toLowerCase()===k.toLowerCase());
    if(trimmed&&r[trimmed]!==undefined&&r[trimmed]!==null&&r[trimmed]!=='')return r[trimmed];
  }
  return '';
}
function parseFac(v){
  if(!v)return 0;
  if(typeof v==='number')return v;
  let s=v.toString().replace(/["']/g,'').replace(/\$/g,'').replace(/\s/g,'').trim();
  if(!s)return 0;
  // Formato argentino: 74.700,00 → tiene punto Y coma
  if(s.includes(',')&&s.includes('.')){s=s.replace(/\./g,'').replace(',','.');}
  // Solo coma como decimal: 74700,00
  else if(s.includes(',')&&!s.includes('.')){s=s.replace(',','.');}
  s=s.replace(/[^0-9.]/g,'');
  return parseFloat(s)||0;
}

async function fetchCSV(sheet){
  const r=await fetch(PROXY+'/?sheet='+encodeURIComponent(sheet));
  if(!r.ok)throw new Error('Error leyendo '+sheet);
  return parseCSV(await r.text());
}

function parseCSV(text){
  const lines=text.trim().split('\n');
  let hi=0;
  for(let i=0;i<Math.min(lines.length,15);i++){if(lines[i].split(',').filter(c=>c.trim()).length>2){hi=i;break;}}
  const headers=lines[hi].split(',').map(c=>c.replace(/^"|"$/g,'').trim());
  const rows=[];
  for(let i=hi+1;i<lines.length;i++){
    if(!lines[i].trim())continue;
    const vals=[];let cur='',inQ=false;
    for(const ch of lines[i]){if(ch==='"')inQ=!inQ;else if(ch===','&&!inQ){vals.push(cur.trim());cur='';}else cur+=ch;}
    vals.push(cur.trim());
    const obj={};headers.forEach((h,idx)=>{obj[h]=vals[idx]||'';});
    // Acceso posicional por si el encabezado de una columna no coincide textualmente con lo que
    // busca el codigo (tilde, mayuscula, nombre distinto). _col0=A, _col1=B, ... _col10=K, etc.
    vals.forEach((v,idx)=>{obj['_col'+idx]=v||'';});
    rows.push(obj);
  }
  return rows;
}

