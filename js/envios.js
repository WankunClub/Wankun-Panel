// ── ENVIOS (aviso de envio - compras de hoy) ──────────────────────────────────
let enviosData=[];
function envKey(tel,nombre){const t=(tel||'').toString().replace(/\D/g,'');return t?('tel:'+t):('nom:'+(nombre||'').trim().toLowerCase());}
function envGetEstado(key){try{const raw=localStorage.getItem('wankun_envios');const map=raw?JSON.parse(raw):{};return map[key]||{avisado:false};}catch(e){return{avisado:false};}}
function envSetEstado(key,estado){try{const raw=localStorage.getItem('wankun_envios');const map=raw?JSON.parse(raw):{};map[key]=estado;localStorage.setItem('wankun_envios',JSON.stringify(map));}catch(e){console.error(e);}}
function envParseSaldo(v){if(v===undefined||v===null)return 0;let s=v.toString().trim();if(!s)return 0;const neg=/^\(.*\)$/.test(s)||s.indexOf('-')>=0;s=s.replace(/[$"'\s()\-]/g,'').replace(/\./g,'').replace(/,/g,'.');const n=parseFloat(s);return isNaN(n)?0:(neg?-n:n);}
function envUnirLista(arr){if(arr.length<=1)return arr.join('');return arr.slice(0,-1).join(', ')+' y '+arr[arr.length-1];}
function enviosMensaje(c){const primer=(c.nombre||'').split(' ')[0];const prods=(c.productos||[]).filter(Boolean);let msg='Hola '+primer+'! ';if(!prods.length)msg+='El alimento para tu perrito está en camino';else if(prods.length===1)msg+='El alimento '+prods[0]+' está en camino';else msg+='Los alimentos '+envUnirLista(prods)+' están en camino';msg+=(c.direccion?', lo entregamos en '+c.direccion:', lo entregamos')+' a partir de las 17 hs. ';const saldo=Math.round(c.saldo||0);msg+=saldo>0?('El saldo a pagar es de '+fmtARS(saldo)+'. '):'El pedido ya está abonado. ';msg+='Te deseamos en nombre de Wankun Club un gran día! 🐾';return msg;}
function enviosWaLink(c){const num=c.telefono.toString().replace(/\D/g,'');const full=num.startsWith('54')?num:'54'+num;return 'https://wa.me/'+full+'?text='+encodeURIComponent(enviosMensaje(c));}
function enviosEsHoy(fechaStr){const f=parseFecha(fechaStr);if(!f)return false;const hoy=new Date();return f.getFullYear()===hoy.getFullYear()&&f.getMonth()===hoy.getMonth()&&f.getDate()===hoy.getDate();}
async function enviosCargar(){
  const vRows=await fetchCSV('Ventas');
  const vistos={};
  const lista=[];
  vRows.forEach(r=>{
    const fecha=r['FECHA']||r['Fecha']||'';
    if(!enviosEsHoy(fecha))return;
    const nombre=(r['CLIENTE']||r['Cliente']||'').trim();if(!nombre)return;
    const tel=(getCol(r,'TELEFONO','Telefono','Celular')||'').toString().trim();
    const articulo=getCol(r,'ARTICULO','Articulo','Artículo')||'';
    // Datos para el mensaje: D+E=direccion y localidad, F+G=marca+producto, I=saldo (por posicion de columna)
    const direccion=[(r['_col3']||'').trim(),(r['_col4']||'').trim()].filter(Boolean).join(', ');
    const producto=[(r['_col5']||'').trim(),(r['_col6']||'').trim()].filter(Boolean).join(' ');
    const saldo=envParseSaldo(r['_col8']);
    const key=envKey(tel,nombre);
    if(vistos[key]){const c=vistos[key];if(producto&&c.productos.indexOf(producto)<0)c.productos.push(producto);c.saldo+=saldo;if(!c.direccion&&direccion)c.direccion=direccion;if(articulo&&c.articulo.indexOf(articulo)<0)c.articulo=c.articulo?(c.articulo+' + '+articulo):articulo;return;}
    const c={nombre,telefono:tel,articulo,direccion,productos:producto?[producto]:[],saldo};
    vistos[key]=c;lista.push(c);
  });
  lista.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  enviosData=lista.map(c=>{const key=envKey(c.telefono,c.nombre);const est=envGetEstado(key);return{...c,key,avisado:est.avisado};});
  document.getElementById('env-wrap').style.display='block';
  enviosFiltrar();
}
function enviosMetricas(){
  const t=enviosData.length,a=enviosData.filter(c=>c.avisado).length;
  document.getElementById('env-m-total').textContent=t;
  document.getElementById('env-m-avisados').textContent=a;
  const tf=enviosFlexData.length,af=enviosFlexData.filter(c=>c.avisado).length;
  document.getElementById('env-m-flex-total').textContent=tf;
  document.getElementById('env-m-flex-avisados').textContent=af;
  const th=(typeof enviosFlexHoyData!=='undefined'?enviosFlexHoyData.length:0);
  const ah=(typeof enviosFlexHoyData!=='undefined'?enviosFlexHoyData.filter(c=>c.avisado).length:0);
  const elTh=document.getElementById('env-m-flex-hoy-total');if(elTh)elTh.textContent=th;
  const elAh=document.getElementById('env-m-flex-hoy-avisados');if(elAh)elAh.textContent=ah;
  const t25=(typeof enviosFlex25Data!=='undefined'?enviosFlex25Data.length:0);
  const a25=(typeof enviosFlex25Data!=='undefined'?enviosFlex25Data.filter(c=>c.avisado).length:0);
  const el25t=document.getElementById('env-m-flex25-total');if(el25t)el25t.textContent=t25;
  const el25a=document.getElementById('env-m-flex25-avisados');if(el25a)el25a.textContent=a25;
}
function enviosToggle(key){
  const c=enviosData.find(x=>x.key===key);if(!c)return;
  c.avisado=!c.avisado;
  envSetEstado(key,{avisado:c.avisado});
  enviosMetricas();enviosFiltrar();
}
function enviosMarcarAvisado(key){
  const c=enviosData.find(x=>x.key===key);if(!c||c.avisado)return;
  c.avisado=true;envSetEstado(key,{avisado:c.avisado});enviosMetricas();enviosFiltrar();
}
function enviosFiltrar(){
  const f=document.getElementById('env-filtro').value;
  let lista=enviosData.filter(c=>{
    if(f==='pendiente')return !c.avisado;
    if(f==='avisado')return c.avisado;
    return true;
  });
  document.getElementById('env-count').textContent=lista.length+' clientes';
  const tb=document.getElementById('env-table');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin resultados</div>';enviosMetricas();return;}
  tb.innerHTML=lista.map(c=>`<div class="table-row" style="grid-template-columns:1fr 1fr 120px 90px 80px">
    <span style="font-weight:500">${c.nombre}</span>
    <span style="font-size:12px">${c.articulo||'--'}</span>
    <span style="font-family:'DM Mono',monospace;font-size:12px">${c.telefono||'--'}</span>
    <span style="text-align:center"><input type="checkbox" ${c.avisado?'checked':''} onchange="enviosToggle('${c.key}')" style="width:18px;height:18px;cursor:pointer"></span>
    ${c.telefono?`<a class="wa-link" href="${enviosWaLink(c)}" target="_blank" onclick="event.stopPropagation();enviosMarcarAvisado('${c.key}')">WA</a>`:'<span style="color:var(--gris-dark);font-size:12px">--</span>'}
  </div>`).join('');
  enviosMetricas();
}

// ── ENVIOS FLEX MELI ──────────────────────────────────────────────────────────
let enviosFlexData=[];
const ENV_FLEX_KEY_PREFIX='flex:';
function envFlexKey(tel,nombre){const t=(tel||'').toString().replace(/\D/g,'');return t?(ENV_FLEX_KEY_PREFIX+'tel:'+t):(ENV_FLEX_KEY_PREFIX+'nom:'+(nombre||'').trim().toLowerCase());}
function envFlexGetEstado(key){try{const raw=localStorage.getItem('wankun_envios_flex');const map=raw?JSON.parse(raw):{};return map[key]||{avisado:false};}catch(e){return{avisado:false};}}
function envFlexSetEstado(key,estado){try{const raw=localStorage.getItem('wankun_envios_flex');const map=raw?JSON.parse(raw):{};map[key]=estado;localStorage.setItem('wankun_envios_flex',JSON.stringify(map));}catch(e){console.error(e);}}
function enviosFlexWaLink(tel,nombre){const num=tel.toString().replace(/\D/g,'');const full=num.startsWith('54')?num:'54'+num;const primer=(nombre||'').split(' ')[0];const msg='Hola '+primer+' buen dia! Cuando llegue el momento de reponer el alimento para tu mascota, escribime en forma directa y lo coordinamos. Entregamos en el dia, el precio es mejor que en Mercado Libre y el alimento siempre va acompañado con snacks de Filan. Que tengas un gran dia! Saludos, Nacho.';return 'https://wa.me/'+full+'?text='+encodeURIComponent(msg);}
async function enviosFlexCargar(){
  const fRows=await fetchCSV('Flex meli');
  const vistos={};
  const lista=[];
  fRows.forEach(r=>{
    const fecha=r['Fecha compra']||'';
    if(!rsEsAyer(fecha))return;
    const nombre=(r['NOMBRE']||'').trim();if(!nombre)return;
    const tel=(r['TELEFONO']||'').toString().trim();
    const articulo=r['REFERNCIA']||'';
    const key=envFlexKey(tel,nombre);
    if(vistos[key])return;vistos[key]=true;
    lista.push({nombre,telefono:tel,articulo});
  });
  lista.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  enviosFlexData=lista.map(c=>{const key=envFlexKey(c.telefono,c.nombre);const est=envFlexGetEstado(key);return{...c,key,avisado:est.avisado};});
  document.getElementById('env-flex-wrap').style.display='block';
  enviosFlexFiltrar();
}
function enviosFlexToggle(key){
  const c=enviosFlexData.find(x=>x.key===key);if(!c)return;
  c.avisado=!c.avisado;
  envFlexSetEstado(key,{avisado:c.avisado});
  enviosMetricas();enviosFlexFiltrar();
}
function enviosFlexMarcarAvisado(key){
  const c=enviosFlexData.find(x=>x.key===key);if(!c||c.avisado)return;
  c.avisado=true;envFlexSetEstado(key,{avisado:c.avisado});enviosMetricas();enviosFlexFiltrar();
}
function enviosFlexFiltrar(){
  const f=document.getElementById('env-flex-filtro').value;
  let lista=enviosFlexData.filter(c=>{
    if(f==='pendiente')return !c.avisado;
    if(f==='avisado')return c.avisado;
    return true;
  });
  document.getElementById('env-flex-count').textContent=lista.length+' clientes';
  const tb=document.getElementById('env-flex-table');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin resultados</div>';enviosMetricas();return;}
  tb.innerHTML=lista.map(c=>`<div class="table-row" style="grid-template-columns:1fr 1fr 120px 90px 80px">
    <span style="font-weight:500">${c.nombre}</span>
    <span style="font-size:12px">${c.articulo||'--'}</span>
    <span style="font-family:'DM Mono',monospace;font-size:12px">${c.telefono||'--'}</span>
    <span style="text-align:center"><input type="checkbox" ${c.avisado?'checked':''} onchange="enviosFlexToggle('${c.key}')" style="width:18px;height:18px;cursor:pointer"></span>
    ${c.telefono?`<a class="wa-link" href="${enviosFlexWaLink(c.telefono,c.nombre)}" target="_blank" onclick="event.stopPropagation();enviosFlexMarcarAvisado('${c.key}')">WA</a>`:'<span style="color:var(--gris-dark);font-size:12px">--</span>'}
  </div>`).join('');
  enviosMetricas();
}

// ── ENVIOS FLEX MELI HOY (aviso "en camino" — envíos que se entregan hoy) ────
let enviosFlexHoyData=[];
const ENV_FLEX_HOY_KEY_PREFIX='flexhoy:';
function envFlexHoyKey(tel,nombre){const t=(tel||'').toString().replace(/\D/g,'');return t?(ENV_FLEX_HOY_KEY_PREFIX+'tel:'+t):(ENV_FLEX_HOY_KEY_PREFIX+'nom:'+(nombre||'').trim().toLowerCase());}
function envFlexHoyGetEstado(key){try{const raw=localStorage.getItem('wankun_envios_flex_hoy');const map=raw?JSON.parse(raw):{};return map[key]||{avisado:false};}catch(e){return{avisado:false};}}
function envFlexHoySetEstado(key,estado){try{const raw=localStorage.getItem('wankun_envios_flex_hoy');const map=raw?JSON.parse(raw):{};map[key]=estado;localStorage.setItem('wankun_envios_flex_hoy',JSON.stringify(map));}catch(e){console.error(e);}}
function enviosFlexHoyWaLink(tel,nombre){const num=tel.toString().replace(/\D/g,'');const full=num.startsWith('54')?num:'54'+num;const primer=(nombre||'').split(' ')[0];const msg='Hola '+primer+', te saluda Nacho desde Wankun Club, el alimento para tu mascota esta en camino';return 'https://wa.me/'+full+'?text='+encodeURIComponent(msg);}
function enviosFlexHoyEsHoy(fechaStr){const f=parseFecha(fechaStr);if(!f)return false;const hoy=new Date();return f.getFullYear()===hoy.getFullYear()&&f.getMonth()===hoy.getMonth()&&f.getDate()===hoy.getDate();}
async function enviosFlexHoyCargar(){
  const fRows=await fetchCSV('Flex meli');
  const vistos={};
  const lista=[];
  fRows.forEach(r=>{
    // Fecha de envío puede llamarse de varias formas — probamos varias, y si no, caemos a "Fecha compra"
    const fecha=r['Fecha envio']||r['Fecha envío']||r['Fecha de envio']||r['Fecha de envío']||r['FECHA ENVIO']||r['Fecha compra']||'';
    if(!enviosFlexHoyEsHoy(fecha))return;
    const nombre=(r['NOMBRE']||'').trim();if(!nombre)return;
    const tel=(r['TELEFONO']||'').toString().trim();
    const articulo=r['REFERNCIA']||'';
    const key=envFlexHoyKey(tel,nombre);
    if(vistos[key])return;vistos[key]=true;
    lista.push({nombre,telefono:tel,articulo});
  });
  lista.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  enviosFlexHoyData=lista.map(c=>{const key=envFlexHoyKey(c.telefono,c.nombre);const est=envFlexHoyGetEstado(key);return{...c,key,avisado:est.avisado};});
  document.getElementById('env-flex-hoy-wrap').style.display='block';
  enviosFlexHoyFiltrar();
}
function enviosFlexHoyToggle(key){
  const c=enviosFlexHoyData.find(x=>x.key===key);if(!c)return;
  c.avisado=!c.avisado;
  envFlexHoySetEstado(key,{avisado:c.avisado});
  enviosMetricas();enviosFlexHoyFiltrar();
}
function enviosFlexHoyMarcarAvisado(key){
  const c=enviosFlexHoyData.find(x=>x.key===key);if(!c||c.avisado)return;
  c.avisado=true;envFlexHoySetEstado(key,{avisado:c.avisado});enviosMetricas();enviosFlexHoyFiltrar();
}
function enviosFlexHoyFiltrar(){
  const f=document.getElementById('env-flex-hoy-filtro').value;
  let lista=enviosFlexHoyData.filter(c=>{
    if(f==='pendiente')return !c.avisado;
    if(f==='avisado')return c.avisado;
    return true;
  });
  document.getElementById('env-flex-hoy-count').textContent=lista.length+' clientes';
  const tb=document.getElementById('env-flex-hoy-table');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin resultados</div>';enviosMetricas();return;}
  tb.innerHTML=lista.map(c=>`<div class="table-row" style="grid-template-columns:1fr 1fr 120px 90px 80px">
    <span style="font-weight:500">${c.nombre}</span>
    <span style="font-size:12px">${c.articulo||'--'}</span>
    <span style="font-family:'DM Mono',monospace;font-size:12px">${c.telefono||'--'}</span>
    <span style="text-align:center"><input type="checkbox" ${c.avisado?'checked':''} onchange="enviosFlexHoyToggle('${c.key}')" style="width:18px;height:18px;cursor:pointer"></span>
    ${c.telefono?`<a class="wa-link" href="${enviosFlexHoyWaLink(c.telefono,c.nombre)}" target="_blank" onclick="event.stopPropagation();enviosFlexHoyMarcarAvisado('${c.key}')">WA</a>`:'<span style="color:var(--gris-dark);font-size:12px">--</span>'}
  </div>`).join('');
  enviosMetricas();
}

// ── ENVIOS FLEX MELI 25 DIAS (migración — 3er punto de contacto, no confundir con recompra del canal directo) ────
let enviosFlex25Data=[];
const ENV_FLEX25_KEY_PREFIX='flex25:';
function envFlex25Key(tel,nombre){const t=(tel||'').toString().replace(/\D/g,'');return t?(ENV_FLEX25_KEY_PREFIX+'tel:'+t):(ENV_FLEX25_KEY_PREFIX+'nom:'+(nombre||'').trim().toLowerCase());}
function envFlex25GetEstado(key){try{const raw=localStorage.getItem('wankun_envios_flex25');const map=raw?JSON.parse(raw):{};return map[key]||{avisado:false};}catch(e){return{avisado:false};}}
function envFlex25SetEstado(key,estado){try{const raw=localStorage.getItem('wankun_envios_flex25');const map=raw?JSON.parse(raw):{};map[key]=estado;localStorage.setItem('wankun_envios_flex25',JSON.stringify(map));}catch(e){console.error(e);}}
function enviosFlex25WaLink(tel,nombre){const num=tel.toString().replace(/\D/g,'');const full=num.startsWith('54')?num:'54'+num;const primer=(nombre||'').split(' ')[0];const msg='Hola '+primer+' te saluda Nacho desde Wankun Club, Estimamos que el alimento para tu perrito debe estar acabandose, te gustaria coordinar la reposicion? Entregamos hoy, y acompañamos el alimento con Snacks de Filan.';return 'https://wa.me/'+full+'?text='+encodeURIComponent(msg);}
function enviosFlex25EsHoy(fechaStr){const f=parseFecha(fechaStr);if(!f)return false;const hoy=new Date();return f.getFullYear()===hoy.getFullYear()&&f.getMonth()===hoy.getMonth()&&f.getDate()===hoy.getDate();}
async function enviosFlex25Cargar(){
  const fRows=await fetchCSV('Flex meli');
  const vistos={};
  const lista=[];
  fRows.forEach(r=>{
    const fecha=r['Recompra']||r['recompra']||'';
    if(!enviosFlex25EsHoy(fecha))return;
    const nombre=(r['NOMBRE']||'').trim();if(!nombre)return;
    const tel=(r['TELEFONO']||'').toString().trim();
    const articulo=r['REFERNCIA']||'';
    const key=envFlex25Key(tel,nombre);
    if(vistos[key])return;vistos[key]=true;
    lista.push({nombre,telefono:tel,articulo});
  });
  lista.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  enviosFlex25Data=lista.map(c=>{const key=envFlex25Key(c.telefono,c.nombre);const est=envFlex25GetEstado(key);return{...c,key,avisado:est.avisado};});
  document.getElementById('env-flex25-wrap').style.display='block';
  enviosFlex25Filtrar();
}
function enviosFlex25Toggle(key){
  const c=enviosFlex25Data.find(x=>x.key===key);if(!c)return;
  c.avisado=!c.avisado;
  envFlex25SetEstado(key,{avisado:c.avisado});
  enviosMetricas();enviosFlex25Filtrar();
}
function enviosFlex25MarcarAvisado(key){
  const c=enviosFlex25Data.find(x=>x.key===key);if(!c||c.avisado)return;
  c.avisado=true;envFlex25SetEstado(key,{avisado:c.avisado});enviosMetricas();enviosFlex25Filtrar();
}
function enviosFlex25Filtrar(){
  const f=document.getElementById('env-flex25-filtro').value;
  let lista=enviosFlex25Data.filter(c=>{
    if(f==='pendiente')return !c.avisado;
    if(f==='avisado')return c.avisado;
    return true;
  });
  document.getElementById('env-flex25-count').textContent=lista.length+' clientes';
  const tb=document.getElementById('env-flex25-table');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin resultados</div>';enviosMetricas();return;}
  tb.innerHTML=lista.map(c=>`<div class="table-row" style="grid-template-columns:1fr 1fr 120px 90px 80px">
    <span style="font-weight:500">${c.nombre}</span>
    <span style="font-size:12px">${c.articulo||'--'}</span>
    <span style="font-family:'DM Mono',monospace;font-size:12px">${c.telefono||'--'}</span>
    <span style="text-align:center"><input type="checkbox" ${c.avisado?'checked':''} onchange="enviosFlex25Toggle('${c.key}')" style="width:18px;height:18px;cursor:pointer"></span>
    ${c.telefono?`<a class="wa-link" href="${enviosFlex25WaLink(c.telefono,c.nombre)}" target="_blank" onclick="event.stopPropagation();enviosFlex25MarcarAvisado('${c.key}')">WA</a>`:'<span style="color:var(--gris-dark);font-size:12px">--</span>'}
  </div>`).join('');
  enviosMetricas();
}

