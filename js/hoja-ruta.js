// ── HOJA DE RUTA ──────────────────────────────────────────────────────────────
// Arma la ruta del día con las ventas de esa fecha (Ventas = canal directo, Flex meli = envíos Flex).
// Las paradas, su orden y las correcciones se guardan en este navegador, por fecha.
// Coordenadas exactas del pin de Wankun Club (la dirección escrita Google la ubica mal, en Highland Park)
const HR_ORIGEN='-34.4447773,-58.7654003';
let hrFecha='',hrParadas=[],hrClientes={},hrCargando=false;
function hrHoyISO(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function hrEsc(t){return(t==null?'':String(t)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function hrNorm(t){return(t||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();}
function hrMismaFecha(s){const f=parseFecha(s);if(!f)return false;const[y,m,d]=hrFecha.split('-').map(Number);return f.getFullYear()===y&&f.getMonth()===m-1&&f.getDate()===d;}
function hrFmtFecha(f){const[y,m,d]=f.split('-');return d+'/'+m+'/'+y;}
function hrKey(){return 'wankun_ruta_'+hrFecha;}
function hrGuardar(){try{localStorage.setItem(hrKey(),JSON.stringify({paradas:hrParadas,vuelta:document.getElementById('hr-vuelta').checked}));}catch(e){}}
function hrLeer(){try{const raw=localStorage.getItem(hrKey());if(raw){const s=JSON.parse(raw);hrParadas=Array.isArray(s.paradas)?s.paradas:[];document.getElementById('hr-vuelta').checked=s.vuelta!==false;return;}}catch(e){}hrParadas=[];document.getElementById('hr-vuelta').checked=true;}
const HR_REP_KEY='wankun_ruta_reparto';
function hrRepMem(){try{return JSON.parse(localStorage.getItem(HR_REP_KEY)||'{}');}catch(e){return{};}}
function hrRepRecordar(nombre,v){try{const m=hrRepMem();m[hrNorm(nombre)]=v;localStorage.setItem(HR_REP_KEY,JSON.stringify(m));}catch(e){}}
function hrRepInicial(p){return hrRepMem()[hrNorm(p.nombre)]===true;}
function hrPropias(){return hrParadas.filter(p=>p.reparto);}
function hrOrdenar(){hrParadas=[...hrParadas.filter(x=>x.reparto),...hrParadas.filter(x=>!x.reparto)];}
function hrReparto(i,v){const p=hrParadas[i];p.reparto=v;hrRepRecordar(p.nombre,v);
  if(v){hrParadas.splice(i,1);const n=hrPropias().length;hrParadas.splice(n,0,p);}else hrOrdenar();
  hrGuardar();hrRender();}
function hrInit(){
  const inp=document.getElementById('hr-fecha');
  if(!hrFecha){hrFecha=hrHoyISO();inp.value=hrFecha;hrLeer();hrRender();if(!hrParadas.length)hrTraer();}
}
function hrCambiarFecha(){const v=document.getElementById('hr-fecha').value;if(!v)return;hrFecha=v;hrLeer();hrRender();if(!hrParadas.length)hrTraer();}
async function hrTraer(){
  if(hrCargando)return;hrCargando=true;
  const btn=document.getElementById('hr-btn-traer');btn.textContent='Trayendo…';btn.disabled=true;
  let agregadas=0,error='';
  try{
    const[vRows,fRows]=await Promise.all([fetchCSV('Ventas'),fetchCSV('Flex meli').catch(()=>[])]);
    // Base de clientes para autocompletar (última dirección conocida)
    vRows.forEach(r=>{const n=(r['CLIENTE']||r['Cliente']||'').trim();if(!n)return;const dir=(r['_col3']||'').trim(),loc=(r['_col4']||'').trim();if(dir||!hrClientes[n])hrClientes[n]={dir:dir||(hrClientes[n]&&hrClientes[n].dir)||'',loc:loc||(hrClientes[n]&&hrClientes[n].loc)||''};});
    fRows.forEach(r=>{const n=(r['NOMBRE']||'').trim();if(!n||hrClientes[n])return;hrClientes[n]={dir:(r['DIRECCION']||r['Direccion']||'').trim(),loc:(r['LOCALIDAD']||'').trim()};});
    document.getElementById('hr-clientes').innerHTML=Object.keys(hrClientes).sort((a,b)=>a.localeCompare(b,'es')).map(n=>'<option value="'+hrEsc(n)+'">').join('');
    const nuevas=[],vistos={};
    vRows.forEach(r=>{
      if(!hrMismaFecha(r['FECHA']||r['Fecha']||''))return;
      const nombre=(r['CLIENTE']||r['Cliente']||'').trim();if(!nombre)return;
      const prod=[(r['_col5']||'').trim(),(r['_col6']||'').trim()].filter(Boolean).join(' ')||getCol(r,'ARTICULO','Articulo','Artículo')||'';
      const k='d:'+hrNorm(nombre);
      if(vistos[k]){if(prod&&vistos[k].alimento.indexOf(prod)<0)vistos[k].alimento+=(vistos[k].alimento?' + ':'')+prod;return;}
      vistos[k]={id:k,fuente:'directo',nombre,direccion:(r['_col3']||'').trim(),localidad:(r['_col4']||'').trim(),alimento:prod};nuevas.push(vistos[k]);
    });
    fRows.forEach(r=>{
      const fecha=r['Fecha envio']||r['Fecha envío']||r['Fecha de envio']||r['Fecha de envío']||r['FECHA ENVIO']||r['Fecha compra']||'';
      if(!hrMismaFecha(fecha))return;
      const nombre=(r['NOMBRE']||'').trim();if(!nombre)return;
      const prod=(r['REFERNCIA']||'').trim();const k='f:'+hrNorm(nombre);
      if(vistos[k]){if(prod&&vistos[k].alimento.indexOf(prod)<0)vistos[k].alimento+=(vistos[k].alimento?' + ':'')+prod;return;}
      vistos[k]={id:k,fuente:'flex',nombre,direccion:(r['DIRECCION']||r['Direccion']||'').trim(),localidad:(r['LOCALIDAD']||'').trim(),alimento:prod};nuevas.push(vistos[k]);
    });
    const ya=new Set(hrParadas.map(p=>p.id));
    nuevas.forEach(p=>{if(!ya.has(p.id)){p.reparto=hrRepInicial(p);hrParadas.push(p);agregadas++;}});
    hrOrdenar();
    hrGuardar();
  }catch(e){error='No se pudieron leer las planillas. Probá de nuevo en un rato.';}
  hrCargando=false;btn.textContent='Traer ventas del día';btn.disabled=false;
  hrRender(error||(agregadas?'Se agregaron '+agregadas+' entregas.':'No hay entregas nuevas para esta fecha en las planillas.'));
}
function hrAutocompletar(){const n=document.getElementById('hr-n-nombre').value.trim();const c=hrClientes[n];if(!c)return;const d=document.getElementById('hr-n-dir'),l=document.getElementById('hr-n-loc');if(!d.value)d.value=c.dir;if(!l.value)l.value=c.loc;}
function hrAgregar(){
  const g=id=>document.getElementById(id);const nombre=g('hr-n-nombre').value.trim();
  if(!nombre&&!g('hr-n-dir').value.trim()){g('hr-n-nombre').focus();return;}
  hrParadas.push({id:'m:'+Date.now(),fuente:'manual',nombre:nombre||'(sin nombre)',direccion:g('hr-n-dir').value.trim(),localidad:g('hr-n-loc').value.trim(),alimento:g('hr-n-ali').value.trim()});
  hrParadas[hrParadas.length-1].reparto=true;hrOrdenar();
  ['hr-n-nombre','hr-n-dir','hr-n-loc','hr-n-ali'].forEach(id=>g(id).value='');
  hrGuardar();hrRender();g('hr-n-nombre').focus();
}
function hrMover(i,d){const j=i+d;if(j<0||j>=hrParadas.length||!hrParadas[i].reparto||!hrParadas[j].reparto)return;const t=hrParadas[i];hrParadas[i]=hrParadas[j];hrParadas[j]=t;hrGuardar();hrRender();}
function hrQuitar(i){const p=hrParadas[i];if(!confirm('¿Sacar a '+p.nombre+' de la ruta?'))return;hrParadas.splice(i,1);hrGuardar();hrRender();}
function hrEditar(i,campo,valor){hrParadas[i][campo]=valor;hrGuardar();hrRenderHoja();}
function hrDirMaps(p){return[p.direccion,p.localidad,'Buenos Aires, Argentina'].filter(Boolean).join(', ');}
function hrLinksMaps(){
  const pts=[HR_ORIGEN,...hrPropias().filter(p=>p.direccion||p.localidad).map(hrDirMaps)];
  if(document.getElementById('hr-vuelta').checked)pts.push(HR_ORIGEN);
  const links=[];let i=0;
  while(i<pts.length-1){
    const seg=pts.slice(i,i+11); // origen + 9 paradas intermedias + destino
    const way=seg.slice(1,-1);
    links.push('https://www.google.com/maps/dir/?api=1&travelmode=driving&origin='+encodeURIComponent(seg[0])+'&destination='+encodeURIComponent(seg[seg.length-1])+(way.length?'&waypoints='+encodeURIComponent(way.join('|')):''));
    i+=seg.length-1;
  }
  return links;
}
function hrRender(msg){
  const el=document.getElementById('hr-lista');
  const fuenteTxt={directo:'Directo',flex:'Flex',manual:'A mano'};
  let h=msg?'<div class="hr-help" style="color:var(--verde);font-weight:600">'+hrEsc(msg)+'</div>':'';
  if(!hrParadas.length){h+='<div class="hr-vacio">Todavía no hay entregas para el '+hrFmtFecha(hrFecha)+'.</div>';}
  else{const np=hrPropias().length,nl=hrParadas.length-np;h+='<div class="hr-help">Tildá <b>Reparto</b> en las que llevamos nosotros. <b>'+np+'</b> en el recorrido · <b>'+nl+'</b> afuera (logística). El Panel se acuerda de cada cliente para la próxima.</div>';
  let n=0;h+=hrParadas.map((p,i)=>(!p.reparto&&(i===0||hrParadas[i-1].reparto)?'<div class="hr-sep">Sin tildar — no entran en el recorrido</div>':'')+'<div class="hr-row'+(p.reparto?'':' hr-log')+'"><div class="hr-num">'+(p.reparto?(++n):'—')+'</div>'+
    '<div class="hr-nomwrap"><span class="hr-nom">'+hrEsc(p.nombre)+'</span><span class="hr-src '+p.fuente+'">'+fuenteTxt[p.fuente]+'</span></div>'+
    '<input class="hr-in'+(p.direccion?'':' hr-falta')+'" value="'+hrEsc(p.direccion)+'" placeholder="Falta dirección" onchange="hrEditar('+i+',\'direccion\',this.value);this.classList.toggle(\'hr-falta\',!this.value)">'+
    '<input class="hr-in" value="'+hrEsc(p.localidad)+'" placeholder="Localidad" onchange="hrEditar('+i+',\'localidad\',this.value)">'+
    '<input class="hr-in'+(p.alimento?'':' hr-falta')+'" value="'+hrEsc(p.alimento)+'" placeholder="Falta alimento" onchange="hrEditar('+i+',\'alimento\',this.value);this.classList.toggle(\'hr-falta\',!this.value)">'+
    '<div class="hr-acc"><label class="hr-logchk" title="La llevamos nosotros"><input type="checkbox" '+(p.reparto?'checked':'')+' onchange="hrReparto('+i+',this.checked)"> Reparto</label>'+(!p.reparto?'':'<button title="Subir" onclick="hrMover('+i+',-1)">↑</button><button title="Bajar" onclick="hrMover('+i+',1)">↓</button>')+'<button class="del" title="Sacar" onclick="hrQuitar('+i+')">✕</button></div></div>').join('');}
  el.innerHTML=h;
  hrRenderHoja();
}
function hrRenderHoja(){
  const card=document.getElementById('hr-hoja-card');
  const P=hrPropias();if(!P.length){card.style.display='none';return;}
  card.style.display='block';
  const links=hrLinksMaps();
  document.getElementById('hr-maps').innerHTML=links.map((u,i)=>'<a class="hr-maps-btn" href="'+u+'" target="_blank" rel="noopener">Abrir en Google Maps'+(links.length>1?' — tramo '+(i+1):'')+'</a>').join('');
  document.getElementById('hr-hoja').innerHTML='<div class="hr-help">'+hrFmtFecha(hrFecha)+' · '+P.length+' paradas · salida desde Alta Golf Gracia 1984</div>'+
    P.map((p,i)=>'<div class="hr-stop"><div class="n">'+(i+1)+'</div><div><b>'+hrEsc(p.nombre)+'</b><div class="a">'+hrEsc([p.direccion,p.localidad].filter(Boolean).join(', ')||'Falta dirección')+'</div><div class="f">'+hrEsc(p.alimento||'Falta alimento')+'</div></div></div>').join('');
}
function hrTexto(){
  let t='HOJA DE RUTA – '+hrFmtFecha(hrFecha)+'\n\n';
  hrPropias().forEach((p,i)=>{t+=(i+1)+'. '+p.nombre+'\n   '+([p.direccion,p.localidad].filter(Boolean).join(', ')||'(falta dirección)')+'\n   '+(p.alimento||'(falta alimento)')+'\n\n';});
  return t.trim();
}
async function hrCopiar(){try{await navigator.clipboard.writeText(hrTexto());alert('Hoja de ruta copiada.');}catch(e){prompt('Copiá la hoja de ruta:',hrTexto());}}
function hrImprimir(){
  const w=window.open('','_blank');if(!w){alert('Habilitá las ventanas emergentes para imprimir.');return;}
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Hoja de ruta '+hrFmtFecha(hrFecha)+'</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{font-size:20px;margin:0 0 4px}p{color:#555;margin:0 0 16px;font-size:13px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #ccc;padding:8px 6px;text-align:left;vertical-align:top}th{font-size:11px;text-transform:uppercase;color:#555}td.n{font-weight:700;width:24px}</style></head><body><h1>Hoja de ruta — Wankun Club</h1><p>'+hrFmtFecha(hrFecha)+' · '+hrPropias().length+' paradas</p><table><tr><th>#</th><th>Cliente</th><th>Dirección</th><th>Alimento</th></tr>'+
    hrPropias().map((p,i)=>'<tr><td class="n">'+(i+1)+'</td><td>'+hrEsc(p.nombre)+'</td><td>'+hrEsc([p.direccion,p.localidad].filter(Boolean).join(', '))+'</td><td>'+hrEsc(p.alimento)+'</td></tr>').join('')+'</table></body></html>');
  w.document.close();w.focus();setTimeout(()=>w.print(),300);
}

