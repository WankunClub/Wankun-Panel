// ── ANALISIS DE CLIENTES ──────────────────────────────────────────────────────
let analRowsCache=[];
async function analCargar(){
  const st=document.getElementById('anal-status');
  st.className='conn-status conn-loading';st.textContent='Calculando...';
  try{
    const rows=await fetchCSV('Ventas');
    analRowsCache=rows;
    const hoy=new Date();
    const mesActual=hoy.getFullYear()+'-'+(hoy.getMonth()+1).toString().padStart(2,'0');
    const diaHoy=hoy.getDate();

    // Solo usar registros CON telefono (desde 16 jun en adelante)
    // ID unico = telefono
    const hist={};
    rows.forEach(function(r){
      const tel=(r['TELEFONO']||r['telefono']||'').toString().replace(/\D/g,'');
      if(!tel||tel.length<8)return; // solo con telefono valido
      const f=parseFecha(r['FECHA']||r['Fecha']||'');
      if(!f||isNaN(f))return;
      const nom=(r['CLIENTE']||r['Cliente']||'').trim();
      if(!nom)return;
      if(!hist[tel])hist[tel]={nombre:nom,tel:tel,compras:[]};
      hist[tel].compras.push({
        fecha:f,
        producto:[r['Marca']||'',r['producto']||''].filter(Boolean).join(' - '),
        mes:f.getFullYear()+'-'+(f.getMonth()+1).toString().padStart(2,'0'),
        dia:f.getDate()
      });
    });

    // Mes anterior
    const mesAnterior=new Date(hoy.getFullYear(),hoy.getMonth()-1,1);
    const mesAntKey=mesAnterior.getFullYear()+'-'+(mesAnterior.getMonth()+1).toString().padStart(2,'0');

    // Clientes con tel que compraron en mes anterior (dias 1 a diaHoy) pero NO en mes actual
    const noVolvieron=[];
    Object.values(hist).forEach(function(c){
      const enMesAnt=c.compras.filter(function(x){return x.mes===mesAntKey&&x.dia<=diaHoy;});
      const enMesAct=c.compras.filter(function(x){return x.mes===mesActual&&x.dia<=diaHoy;});
      if(enMesAnt.length>0&&enMesAct.length===0){
        const totalCompras=c.compras.length;
        const ultimoProd=c.compras.slice().sort(function(a,b){return b.fecha-a.fecha;})[0].producto||'--';
        noVolvieron.push({nombre:c.nombre,tel:c.tel,totalCompras:totalCompras,ultimoProd:ultimoProd});
      }
    });

    // Filtrar clientes contactados este mes (se resetea) y descartados (permanente)
    let estadoStore={};
    try{estadoStore=JSON.parse(localStorage.getItem(AN_ESTADO_KEY)||'{}');}catch(e){estadoStore={};}
    let descarteStore={};
    try{descarteStore=JSON.parse(localStorage.getItem(AN_DESCARTE_KEY)||'{}');}catch(e){descarteStore={};}
    const noVolvieronPendientes=noVolvieron.filter(function(c){return !estadoStore[c.tel+'|'+mesActual]&&!descarteStore[c.tel];});

    // Clasificar por total de compras historicas con tel
    const urgente=noVolvieronPendientes.filter(function(c){return c.totalCompras>=3;}).sort(function(a,b){return b.totalCompras-a.totalCompras;});
    const seguimiento=noVolvieronPendientes.filter(function(c){return c.totalCompras===2;});
    const primera=noVolvieronPendientes.filter(function(c){return c.totalCompras===1;});

    st.className='conn-status conn-ok';
    st.textContent=noVolvieronPendientes.length+' clientes';
    document.getElementById('anal-panel').style.display='block';

    // Metricas
    document.getElementById('anal-metrics').innerHTML=
      '<div class="metric"><div class="metric-label">No volvieron</div><div class="metric-value" style="color:#c0392b">'+noVolvieronPendientes.length+'</div></div>'+
      '<div class="metric"><div class="metric-label">Urgente</div><div class="metric-value" style="color:#c0392b">'+urgente.length+'</div></div>'+
      '<div class="metric"><div class="metric-label">Seguimiento</div><div class="metric-value" style="color:#856404">'+seguimiento.length+'</div></div>'+
      '<div class="metric"><div class="metric-label">Primera vez</div><div class="metric-value">'+primera.length+'</div></div>';

    // Render tablas
    function renderAnalTabla(lista,elId){
      const tb=document.getElementById(elId);
      if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin clientes en este grupo</div>';return;}
      tb.innerHTML=lista.map(function(c){
        const tel=c.tel||'';
        const num=tel.toString().replace(/\D/g,'');
        const full=num.startsWith('54')?num:'54'+num;
        const primer=c.nombre.split(' ')[0];
        const msg='Hola '+primer+', cómo está tu perrito? Te escribo porque debe estar por terminarse el alimento. ¿Te gustaría que coordinemos la reposición? Entregamos en el día y como siempre van los snacks de Filan.';
        const claveEstado=(tel+'|'+mesActual).replace(/'/g,"\\'");
        const waBtn=tel?'<a class="wa-link" href="https://wa.me/'+full+'?text='+encodeURIComponent(msg)+'" target="_blank" onclick="analMarcarContactado(\''+claveEstado+'\')">WA</a>':' <span style="color:var(--gris-dark);font-size:12px">Sin tel</span>';
        const descBtn='<button class="btn" style="font-size:10px;padding:2px 6px" onclick="analDescartar(\''+tel+'\')">Descartar</button>';
        return '<div class="table-row" style="grid-template-columns:1fr 100px 120px 60px 80px"><span style="font-weight:500;cursor:pointer;color:var(--azul-med)" onclick="analVerFicha(\''+tel+'\',\''+c.nombre.replace(/'/g,"\\'")+'\')">'+c.nombre+'</span><span style="text-align:center;font-size:12px">'+c.totalCompras+'</span><span style="font-size:11px;color:var(--gris-dark)">'+c.ultimoProd.substring(0,25)+'</span>'+waBtn+descBtn+'</div>';
      }).join('');
    }

    renderAnalTabla(urgente,'anal-urgente');
    renderAnalTabla(seguimiento,'anal-seguimiento');
    renderAnalTabla(primera,'anal-primera');

    // Guardar snapshot de todos los clientes vistos (con y sin filtrar) para poder reconstruir la fila al reactivar
    let snapStore={};
    try{snapStore=JSON.parse(localStorage.getItem(AN_SNAP_KEY)||'{}');}catch(e){snapStore={};}
    noVolvieron.forEach(function(c){snapStore[c.tel]={nombre:c.nombre,tel:c.tel,totalCompras:c.totalCompras,ultimoProd:c.ultimoProd};});
    localStorage.setItem(AN_SNAP_KEY,JSON.stringify(snapStore));

    analRenderInactiva();

  }catch(e){st.className='conn-status conn-err';st.textContent='Error: '+e.message;console.error(e);}
}
const AN_DESCARTE_KEY='wankun_anal_descarte_v1';
const AN_SNAP_KEY='wankun_anal_snap_v1';
function analMarcarContactado(clave){
  let store={};
  try{store=JSON.parse(localStorage.getItem(AN_ESTADO_KEY)||'{}');}catch(e){store={};}
  store[clave]={fecha:new Date().toISOString()};
  localStorage.setItem(AN_ESTADO_KEY,JSON.stringify(store));
  analCargar();
}
function analDescartar(tel){
  let store={};
  try{store=JSON.parse(localStorage.getItem(AN_DESCARTE_KEY)||'{}');}catch(e){store={};}
  store[tel]={fecha:new Date().toISOString()};
  localStorage.setItem(AN_DESCARTE_KEY,JSON.stringify(store));
  analCargar();
}
function analReactivar(tel){
  let store={};
  try{store=JSON.parse(localStorage.getItem(AN_DESCARTE_KEY)||'{}');}catch(e){store={};}
  delete store[tel];
  localStorage.setItem(AN_DESCARTE_KEY,JSON.stringify(store));
  analCargar();
}
function analRenderInactiva(){
  let descarteStore={};
  try{descarteStore=JSON.parse(localStorage.getItem(AN_DESCARTE_KEY)||'{}');}catch(e){descarteStore={};}
  let snapStore={};
  try{snapStore=JSON.parse(localStorage.getItem(AN_SNAP_KEY)||'{}');}catch(e){snapStore={};}
  const tels=Object.keys(descarteStore);
  const countEl=document.getElementById('anal-inactiva-count');
  if(countEl)countEl.textContent=tels.length;
  const tb=document.getElementById('anal-inactiva');
  if(!tb)return;
  if(!tels.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin clientes descartados</div>';return;}
  tb.innerHTML=tels.map(function(tel){
    const c=snapStore[tel]||{nombre:'(sin datos)',totalCompras:'--',ultimoProd:'--'};
    return '<div class="table-row" style="grid-template-columns:1fr 100px 120px 90px"><span style="font-weight:500;cursor:pointer;color:var(--azul-med)" onclick="analVerFicha(\''+tel+'\',\''+(c.nombre||'').replace(/'/g,"\\'")+'\')">'+c.nombre+'</span><span style="text-align:center;font-size:12px">'+c.totalCompras+'</span><span style="font-size:11px;color:var(--gris-dark)">'+(c.ultimoProd||'--').substring(0,25)+'</span><button class="btn" style="font-size:10px;padding:2px 6px" onclick="analReactivar(\''+tel+'\')">Reactivar</button></div>';
  }).join('');
}
function analToggleInactiva(){
  const wrap=document.getElementById('anal-inactiva-wrap');
  const arrow=document.getElementById('anal-inactiva-arrow');
  const abierto=wrap.style.display!=='none';
  wrap.style.display=abierto?'none':'block';
  arrow.textContent=abierto?'▶':'▼';
}
function analVerFicha(tel,nombre){
  const compras=analRowsCache.filter(function(r){
    const t=(r['TELEFONO']||r['telefono']||'').toString().replace(/\D/g,'');
    return t===tel;
  }).map(function(r){
    return {
      fecha:parseFecha(r['FECHA']||r['Fecha']||''),
      fechaTxt:r['FECHA']||r['Fecha']||'',
      producto:[r['Marca']||'',r['producto']||''].filter(Boolean).join(' - ')||'--',
      kg:r['kg']||r['Kg']||'--',
      fac:parseFac(getCol(r,'Facturación','Facturacion',' Facturación')||0)
    };
  }).sort(function(a,b){return(b.fecha||0)-(a.fecha||0);});

  const totalFac=compras.reduce(function(s,c){return s+(c.fac||0);},0);
  const totalKg=compras.reduce(function(s,c){return s+(parseFloat(c.kg)||0);},0);

  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.onclick=function(e){if(e.target===modal)modal.remove();};
  modal.innerHTML='<div style="background:#fff;border-radius:16px;padding:24px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">'
    +'<div><div style="font-size:20px;font-weight:700">'+nombre+'</div>'
    +'<div style="font-size:12px;color:var(--gris-dark);margin-top:2px">Tel: '+(tel||'--')+'</div></div>'
    +'<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gris-dark)">×</button>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">'
    +'<div style="background:var(--verde-bg);border-radius:8px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:700;color:var(--verde)">'+compras.length+'</div><div style="font-size:11px;color:var(--verde);font-weight:500">Compras</div></div>'
    +'<div style="background:#dbeafe;border-radius:8px;padding:12px;text-align:center"><div style="font-size:16px;font-weight:700;color:#1d4ed8">'+(totalFac>0?'$'+(totalFac/1000).toFixed(0)+'K':'--')+'</div><div style="font-size:11px;color:#1d4ed8;font-weight:500">Facturado</div></div>'
    +'<div style="background:#f3e8ff;border-radius:8px;padding:12px;text-align:center"><div style="font-size:16px;font-weight:700;color:#7c3aed">'+(totalKg>0?totalKg.toFixed(1)+'kg':'--')+'</div><div style="font-size:11px;color:#7c3aed;font-weight:500">Kg totales</div></div>'
    +'</div>'
    +'<div style="font-size:13px;font-weight:600;margin-bottom:8px">Historial de compras</div>'
    +'<div style="border:1px solid var(--gris-med);border-radius:8px;overflow:hidden">'
    +'<div style="display:grid;grid-template-columns:80px 1fr 60px 90px;padding:8px 12px;background:var(--gris);font-size:11px;font-weight:600;color:var(--gris-dark);text-transform:uppercase"><span>Fecha</span><span>Producto</span><span>Kg</span><span>Monto</span></div>'
    +(compras.length?compras.map(function(c,i){
        const fTxt=c.fecha?c.fecha.toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'2-digit'}):c.fechaTxt;
        return '<div style="display:grid;grid-template-columns:80px 1fr 60px 90px;padding:8px 12px;border-top:1px solid var(--gris-med);font-size:12px;align-items:center;background:'+(i%2===0?'var(--gris)':'#fff')+'"><span style="font-family:\'DM Mono\',monospace">'+fTxt+'</span><span>'+c.producto+'</span><span>'+c.kg+'</span><span style="font-weight:500">'+(c.fac?'$'+(c.fac/1000).toFixed(0)+'K':'--')+'</span></div>';
      }).join(''):'<div style="padding:16px;text-align:center;color:var(--gris-dark)">Sin historial</div>')
    +'</div></div>';
  document.body.appendChild(modal);
}
const AN_ESTADO_KEY='wankun_anal_estado_v1';


