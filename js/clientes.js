// ── CLIENTES ──────────────────────────────────────────────────────────────────
let clData=[];

async function conectarClientes(){
  const st=document.getElementById('cl-status');
  st.className='conn-status conn-loading';st.textContent='Cargando...';
  try{
    const[vRows,fRows]=await Promise.all([fetchCSV('Ventas'),fetchCSV('Flex meli')]);
    const directas=vRows.map(r=>{
      const marca=r['Marca']||r['marca']||'';
      const prod=r['producto']||r['Producto']||'';
      const art=[marca,prod].filter(Boolean).join(' - ');
      return{nombre:r['CLIENTE']||r['Cliente']||'',localidad:r['Barrio/Localidad']||r['Localidad']||'',direccion:r['Domicilio']||r['domicilio']||'',telefono:(r['TELEFONO']||'').toString().trim(),articulo:art,fecha:r['FECHA']||r['Fecha']||'',fac:parseFac(getCol(r,'Facturación','Facturacion',' Facturación')||0),kg:parseFloat((getCol(r,'kg')||0).toString().replace(',','.'))||0,fuente:'Directa',id:r['ID']||''};
    }).filter(r=>r.nombre);
    const flex=fRows.map(r=>({nombre:r['NOMBRE']||'',localidad:r['LOCALIDAD']||'',direccion:r['DIRECCION']||r['Direccion']||'',telefono:(r['TELEFONO']||'').toString(),articulo:r['REFERNCIA']||'',fecha:r['Fecha compra']||'',recompraFlex:r['Recompra']||r['Recompra ']||r['recompra']||'',fac:0,kg:0,fuente:'Flex Meli'})).filter(r=>r.nombre);
    clData=[...directas,...flex];
    st.className='conn-status conn-ok';st.textContent=clData.length+' registros';
    document.getElementById('cl-panel').style.display='block';
    clPoblarLocs();clMetricas();clFiltrar();
  }catch(e){st.className='conn-status conn-err';st.textContent='Error: '+e.message;console.error(e);}
}

function clPoblarLocs(){
  const locs=[...new Set(clData.map(c=>c.localidad).filter(Boolean))].sort();
  const sel=document.getElementById('cl-localidad');
  sel.innerHTML='<option value="">Todas</option>';
  locs.forEach(l=>{const o=document.createElement('option');o.value=l;o.textContent=l;sel.appendChild(o);});
}

function clMetricas(){
  const t=clData.length,loc=clData.filter(c=>esLocal(c.localidad)).length,tel=clData.filter(c=>c.telefono).length,lt=clData.filter(c=>esLocal(c.localidad)&&c.telefono).length;
  document.getElementById('cl-metrics').innerHTML=`<div class="metric"><div class="metric-label">Total registros</div><div class="metric-value">${t}</div></div><div class="metric"><div class="metric-label">Zona local</div><div class="metric-value">${loc}</div></div><div class="metric"><div class="metric-label">Con telefono</div><div class="metric-value">${tel}</div></div><div class="metric"><div class="metric-label">Local + telefono</div><div class="metric-value">${lt}</div></div>`;
}

let clFiltered=[];
function clFiltrar(){
  const zona=document.getElementById('cl-zona').value,loc=document.getElementById('cl-localidad').value,tel=document.getElementById('cl-tel').value;
  clFiltered=clData.filter(c=>{
    if(zona==='local'&&!esLocal(c.localidad))return false;
    if(zona==='fuera'&&esLocal(c.localidad))return false;
    if(loc&&c.localidad!==loc)return false;
    if(tel==='contel'&&!c.telefono)return false;
    return true;
  });
  clFiltered.sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  document.getElementById('cl-count').textContent=clFiltered.length+' registros';
  const labels={todas:'Todos los registros',local:'Clientes zona local (15 km)',fuera:'Clientes fuera del radio'};
  document.getElementById('cl-title').textContent=labels[zona]||'Clientes';
  const tb=document.getElementById('cl-table');
  tb.innerHTML=clFiltered.map(c=>`<div class="table-row" style="grid-template-columns:1fr 130px 140px 120px 80px"><span style="font-weight:500;cursor:pointer;color:var(--azul-med)" onclick="clVerFicha('${c.nombre.replace(/'/g,"\\'")}')">${c.nombre||'--'}</span><span>${c.localidad||'--'} <span class="${esLocal(c.localidad)?'local-tag':'fuera-tag'}">${esLocal(c.localidad)?'local':'fuera'}</span></span><span style="font-family:'DM Mono',monospace;font-size:12px">${c.telefono||'--'}</span><span style="font-size:12px;color:var(--gris-dark)">${c.articulo||'--'}</span>${c.telefono?`<a class="wa-link" href="${waLink(c.telefono,c.nombre)}" target="_blank">WA</a>`:'<span></span>'}</div>`).join('');
}

function clBuscar(q){
  const res=document.getElementById('cl-buscar-result');
  if(!q||q.length<2){res.innerHTML='';return;}
  const ql=q.replace(/[^0-9]/g,'');
  const found=clData.filter(c=>{
    const tel=(c.telefono||'').toString().replace(/[^0-9]/g,'');
    const nom=(c.nombre||'').toLowerCase();
    return (ql.length>=4&&tel.includes(ql))||nom.includes(q.toLowerCase());
  });
  if(!found.length){res.innerHTML='<div style="padding:12px;color:var(--gris-dark);font-size:13px">Sin resultados</div>';return;}
  const unicos={};found.forEach(c=>{const k=(c.nombre||'').toLowerCase();if(!unicos[k])unicos[k]=c;});
  res.innerHTML=Object.values(unicos).slice(0,10).map(c=>`
    <div style="background:var(--gris);border-radius:8px;padding:12px 14px;margin-bottom:8px;cursor:pointer;border:1px solid var(--gris-med)" onclick="clVerFicha('${c.nombre.replace(/'/g,"\\'")}')">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div><div style="font-weight:600;font-size:14px">${c.nombre}</div><div style="font-size:12px;color:var(--gris-dark);margin-top:2px">${c.localidad||'--'} <span class="${esLocal(c.localidad)?'local-tag':'fuera-tag'}">${esLocal(c.localidad)?'local':'fuera'}</span></div></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${c.direccion?`<span style="font-size:11px;color:var(--gris-dark)">${c.direccion}</span>`:''}
          <span style="font-family:'DM Mono',monospace;font-size:12px">${c.telefono||'Sin telefono'}</span>
          ${c.telefono?`<a class="wa-link" href="${waLink(c.telefono,c.nombre)}" target="_blank" onclick="event.stopPropagation()">WA</a>`:''}
          ${c.id?`<button onclick="event.stopPropagation();navigator.clipboard.writeText('${c.id}');this.textContent='Copiado!';setTimeout(()=>this.textContent='ID: ${c.id}',1500)" style="font-size:11px;padding:3px 8px;border-radius:6px;background:#dbeafe;color:#1d4ed8;border:none;cursor:pointer;font-weight:600">ID: ${c.id}</button>`:''}
          <span style="font-size:11px;color:var(--azul-med);font-weight:500">Ver ficha →</span>
        </div>
      </div>
    </div>`).join('');
}

async function clVerFicha(nombre){
  // La ficha depende de clData, que antes solo se cargaba si se visitaba la pestaña "Clientes"
  // y se apretaba su boton de cargar. Si se toca un nombre desde Recompras sin haber pasado por
  // ahi, clData estaba vacio y no pasaba nada (bug reportado: "no me deja tocar la ficha").
  // Ahora, si todavia no se cargo, se carga sola antes de intentar abrir la ficha.
  if(!clData.length){
    await conectarClientes();
    if(!clData.length)return; // sin datos ni despues de intentar cargar -> no hay nada que mostrar
  }
  // Cruce en 3 niveles, de mas confiable a menos:
  // 1) Telefono (solo existe desde el 16-jun-2026 en adelante)
  // 2) Nombre exacto (normalizado)
  // 3) Primer nombre + direccion normalizada — respaldo para compras VIEJAS (antes del 16-jun,
  //    sin telefono) donde en Flex Meli el nombre puede venir abreviado ('Nestor' vs 'Nestor Degregorio').
  //    A proposito NO se usa el producto/alimento como criterio de match: mucha gente distinta compra
  //    lo mismo (ej. 'Royal Canin Maxi Puppy'), usarlo generaria falsos positivos.
  function normTxt(s){return(s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
  const nombreNorm=normTxt(nombre);
  const primerNombreObjetivo=nombreNorm.split(' ')[0]||'';
  const porNombre=clData.filter(c=>normTxt(c.nombre)===nombreNorm);
  if(!porNombre.length)return;
  const telClave=(porNombre.find(r=>r.telefono)?.telefono||'').toString().replace(/\D/g,'');
  const dirObjetivo=normTxt(porNombre.find(r=>r.direccion)?.direccion||'');
  const registros=clData.filter(c=>{
    if(telClave&&(c.telefono||'').toString().replace(/\D/g,'')===telClave)return true;
    if(normTxt(c.nombre)===nombreNorm)return true;
    if(dirObjetivo&&primerNombreObjetivo){
      const cDir=normTxt(c.direccion);
      const cPrimer=normTxt(c.nombre).split(' ')[0]||'';
      if(cPrimer===primerNombreObjetivo&&cDir&&(cDir===dirObjetivo||cDir.includes(dirObjetivo)||dirObjetivo.includes(cDir)))return true;
    }
    return false;
  });
  const tel=telClave||'';
  // Proximo mensaje: usa el mismo calculo por producto que Recompras. Si Recompras todavia
  // no se cargo en esta sesion, se carga sola (igual que clData arriba).
  if(!avTodos.length){try{await avConectar();}catch(e){}}
  pmActual={c:pmBuscar(tel,nombre)};
  const loc=registros[0].localidad||'';
  const dir=(registros.find(r=>r.fuente==='Flex Meli'&&r.direccion)||registros.find(r=>r.direccion))?.direccion||'';
  const compras=registros.filter(r=>r.fecha).sort((a,b)=>{const fa=parseFecha(a.fecha),fb=parseFecha(b.fecha);return fb&&fa?fb-fa:0;});
  const totalFac=registros.reduce((s,r)=>s+(r.fac||0),0);
  const totalKg=registros.reduce((s,r)=>s+(r.kg||0),0);
  const fechas=compras.map(r=>parseFecha(r.fecha)).filter(f=>f&&!isNaN(f)).sort((a,b)=>a-b);

  // ── Trazabilidad Flex Meli -> Directa ──────────────────────────────────
  const comprasFlex=registros.filter(r=>r.fuente==='Flex Meli'&&r.fecha).sort((a,b)=>parseFecha(a.fecha)-parseFecha(b.fecha));
  const comprasDirecta=registros.filter(r=>r.fuente==='Directa'&&r.fecha).sort((a,b)=>parseFecha(a.fecha)-parseFecha(b.fecha));
  const primeraFlex=comprasFlex.length?parseFecha(comprasFlex[0].fecha):null;
  const mensaje25=comprasFlex.length?parseFecha(comprasFlex[0].recompraFlex):null;
  const compraMigratoria=(comprasFlex.length&&comprasDirecta.length)?parseFecha(comprasDirecta[0].fecha):null;
  const fmtCorta=f=>f&&!isNaN(f)?f.toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'2-digit'}):null;

  // Frecuencia
  let frecuencia=null;
  if(fechas.length>=2){
    const diffs=[];
    for(let i=1;i<fechas.length;i++){const d=Math.floor((fechas[i]-fechas[i-1])/(1000*60*60*24));if(d>0&&d<200)diffs.push(d);}
    if(diffs.length)frecuencia=mediana(diffs);
  }
  const ultima=fechas.length?fechas[fechas.length-1]:null;
  const diasDesde=ultima?Math.floor((new Date()-ultima)/(1000*60*60*24)):null;
  const proxDias=frecuencia&&diasDesde!==null?frecuencia-diasDesde:null;
  const proxColor=proxDias===null?'var(--gris-dark)':proxDias<0?'#c0392b':proxDias<=5?'#856404':'var(--verde)';
  const proxLabel=proxDias===null?'Sin datos':proxDias<0?`Vencio hace ${Math.abs(proxDias)}d`:proxDias===0?'Hoy':`En ${proxDias} dias`;

  // Producto mas comprado
  const prodCount={};
  compras.forEach(c=>{if(c.articulo){prodCount[c.articulo]=(prodCount[c.articulo]||0)+1;}});
  const prodTop=Object.entries(prodCount).sort((a,b)=>b[1]-a[1])[0];
  const prodHabitual=prodTop?prodTop[0]:'--';

  // Ultimo producto
  const ultimoProd=compras[0]?.articulo||'--';

  const pmE0=pmActual&&pmActual.c?pmEstado(pmActual.c):null;
  // Si hay proximo mensaje, el boton de WhatsApp vive en ese bloque (evita dos mensajes distintos).
  const waMsg=(tel&&!pmE0)?(`https://wa.me/54${tel.toString().replace(/\D/g,'')}?text=${encodeURIComponent('Hola '+(nombre.split(' ')[0])+', cómo está tu perrito? Te escribo porque debe estar por terminarse el alimento. ¿Te gustaría que coordinemos la reposición? Entregamos en el día y como siempre van los snacks de Filan.')}`):null;

  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`<div style="background:#fff;border-radius:16px;padding:24px;max-width:660px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
      <div>
        <div style="font-size:22px;font-weight:700">${nombre}</div>
        <div style="font-size:13px;color:var(--gris-dark);margin-top:4px">${loc} <span class="${esLocal(loc)?'local-tag':'fuera-tag'}">${esLocal(loc)?'local':'fuera'}</span></div>
      </div>
      <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gris-dark)">×</button>
    </div>

    <!-- Metricas principales -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
      <div style="background:var(--verde-bg);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--verde)">${registros.length}</div>
        <div style="font-size:11px;color:var(--verde);font-weight:500">Compras</div>
      </div>
      <div style="background:#dbeafe;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:18px;font-weight:700;color:#1d4ed8">${totalFac>0?'$'+(totalFac/1000).toFixed(0)+'K':'--'}</div>
        <div style="font-size:11px;color:#1d4ed8;font-weight:500">Facturado</div>
      </div>
      <div style="background:#f3e8ff;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:18px;font-weight:700;color:#7c3aed">${totalKg>0?totalKg+'kg':'--'}</div>
        <div style="font-size:11px;color:#7c3aed;font-weight:500">Kg totales</div>
      </div>
      <div style="background:${proxDias!==null&&proxDias<0?'#ffe5e5':proxDias!==null&&proxDias<=5?'#fff3cd':'var(--gris)'};border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:16px;font-weight:700;color:${proxColor}">${proxLabel}</div>
        <div style="font-size:11px;color:var(--gris-dark);font-weight:500">Próxima compra</div>
      </div>
    </div>

    <!-- Proximo mensaje (se arma solo con cada compra, ajustable a mano) -->
    <div id="pm-bloque" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:20px">${pmBloqueHtml()}</div>

    <!-- Trazabilidad Flex Meli -> Directa -->
    <div style="font-size:13px;font-weight:600;margin-bottom:10px">Recorrido del cliente</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px">
      <div style="background:#f3e8ff;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:#7c3aed;font-weight:600;text-transform:uppercase;margin-bottom:4px">1ra compra Flex Meli</div>
        <div style="font-size:13px;font-weight:700;color:${primeraFlex?'#7c3aed':'var(--gris-dark)'}">${fmtCorta(primeraFlex)||'Nunca compró'}</div>
      </div>
      <div style="background:#fff3cd;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:#856404;font-weight:600;text-transform:uppercase;margin-bottom:4px">Mensaje 25 días</div>
        <div style="font-size:13px;font-weight:700;color:${mensaje25?'#856404':'var(--gris-dark)'}">${fmtCorta(mensaje25)||'--'}</div>
      </div>
      <div style="background:${compraMigratoria?'var(--verde-bg)':'var(--gris)'};border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:${compraMigratoria?'var(--verde)':'var(--gris-dark)'};font-weight:600;text-transform:uppercase;margin-bottom:4px">Compra migratoria</div>
        <div style="font-size:13px;font-weight:700;color:${compraMigratoria?'var(--verde)':'var(--gris-dark)'}">${fmtCorta(compraMigratoria)||'Aún no migró'}</div>
      </div>
      <div style="background:#dbeafe;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:#1d4ed8;font-weight:600;text-transform:uppercase;margin-bottom:4px">Próximo mensaje</div>
        <div id="pm-recorrido" style="font-size:13px;font-weight:700;color:${proxColor}">${proxLabel}</div>
      </div>
    </div>

    <!-- Datos de contacto y producto -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:var(--gris);border-radius:8px;padding:14px">
        <div style="font-size:11px;color:var(--gris-dark);font-weight:600;text-transform:uppercase;margin-bottom:6px">Teléfono</div>
        <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:600">${tel||'Sin teléfono'}</div>
        ${waMsg?`<a href="${waMsg}" target="_blank" style="display:inline-block;margin-top:8px;font-size:11px;padding:5px 12px;border-radius:6px;background:var(--verde-bg);color:var(--verde);font-weight:600;text-decoration:none">WA Reposición 🐾</a>`:''}
      </div>
      <div style="background:var(--gris);border-radius:8px;padding:14px">
        <div style="font-size:11px;color:var(--gris-dark);font-weight:600;text-transform:uppercase;margin-bottom:6px">Frecuencia de compra</div>
        <div style="font-size:20px;font-weight:700;color:var(--azul-med)">${frecuencia?frecuencia+' días':'Sin datos'}</div>
        <div style="font-size:11px;color:var(--gris-dark);margin-top:2px">${ultima?'Última: '+ultima.toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'2-digit'}):''}</div>
      </div>
      <div style="background:var(--gris);border-radius:8px;padding:14px">
        <div style="font-size:11px;color:var(--gris-dark);font-weight:600;text-transform:uppercase;margin-bottom:6px">Producto habitual</div>
        <div style="font-size:13px;font-weight:600">${prodHabitual}</div>
        ${prodHabitual!==ultimoProd?`<div style="font-size:11px;color:var(--gris-dark);margin-top:4px">Último: ${ultimoProd}</div>`:''}
      </div>
      <div style="background:var(--gris);border-radius:8px;padding:14px">
        <div style="font-size:11px;color:var(--gris-dark);font-weight:600;text-transform:uppercase;margin-bottom:6px">Dirección</div>
        <div style="font-size:12px">${dir||'Sin dirección'}</div>
      </div>
    </div>

    <!-- Historial -->
    <div style="font-size:13px;font-weight:600;margin-bottom:10px">Historial de compras</div>
    <div style="border:1px solid var(--gris-med);border-radius:8px;overflow:hidden">
      <div style="display:grid;grid-template-columns:90px 1fr 60px 80px;padding:8px 12px;background:var(--gris);font-size:11px;font-weight:600;color:var(--gris-dark);text-transform:uppercase">
        <span>Fecha</span><span>Producto</span><span>Kg</span><span>Monto</span>
      </div>
      ${compras.length?compras.map((c,i)=>{const f=parseFecha(c.fecha);return`<div style="display:grid;grid-template-columns:90px 1fr 60px 80px;padding:8px 12px;border-top:1px solid var(--gris-med);font-size:12px;align-items:center;background:${i%2===0?'var(--gris)':'#fff'}"><span style="font-family:'DM Mono',monospace">${f?f.toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'2-digit'}):c.fecha}</span><span>${c.articulo||'--'}</span><span>${c.kg||'--'}</span><span style="font-weight:500">${c.fac?'$'+(c.fac/1000).toFixed(0)+'K':'--'}</span></div>`;}).join(''):'<div style="padding:16px;text-align:center;color:var(--gris-dark)">Sin historial</div>'}
    </div>
  </div>`;
  document.body.appendChild(modal);
  pmRender();
}

function waLink(tel,nombre){
  const num=tel.toString().replace(/\D/g,'');
  const full=num.startsWith('54')?num:'54'+num;
  const primer=(nombre||'').split(' ')[0];
  const partes=['Hola '+primer+'!','','Sabemos lo mucho que queres a tu perrito, por eso queremos que sea parte de la fiesta mas grande del anio!','','Estamos sorteando 20 camisetas de la Seleccion Argentina, porque ellos tambien se merecen ponerse la 10!','','Para participar:','- Seguinos en @wankunclub','- Dale like a esta publicacion:'];
  const igLink='https://www.instagram.com/p/DYk2'+'Zi_oYgY/';
  const resto=['- Comentá con el talle y la raza de tu perrito','','El sorteo es el 11 de junio a las 22hs.','','Vamos Argentina!'];
  const msg=encodeURIComponent(partes.join('\n'))+'%0A'+encodeURIComponent(igLink)+'%0A'+encodeURIComponent(resto.join('\n'));
  return 'https://wa.me/'+full+'?text='+msg;
}

function toggleSorteoMsg(){const p=document.getElementById('sorteo-msg-panel');p.style.display=p.style.display==='none'?'block':'none';}
function copiarMsg(){const t=document.getElementById('sorteo-msg-text').textContent;navigator.clipboard.writeText(t).then(()=>{const b=event.target,o=b.textContent;b.textContent='Copiado!';setTimeout(()=>b.textContent=o,2000);});}
let sorteoData=[];
function esCaba(loc){const l=(loc||'').toLowerCase();return l.includes('caba')||l.includes('capital federal')||l.includes('buenos aires ciudad')||l.includes('c.a.b.a');}
async function sorteoCargar(){
  const[vRows,fRows]=await Promise.all([fetchCSV('Ventas'),fetchCSV('Flex meli')]);
  const vistos={};
  const telMap={};
  fRows.forEach(r=>{const n=(r['NOMBRE']||'').trim().toLowerCase();const t=(r['TELEFONO']||'').toString().trim();if(n&&t)telMap[n]=t;});
  sorteoData=[...fRows.map(r=>({nombre:(r['NOMBRE']||'').trim(),localidad:r['LOCALIDAD']||'',telefono:(r['TELEFONO']||'').toString()})).filter(r=>r.nombre)].filter(r=>{const k=r.nombre.toLowerCase();if(vistos[k])return false;vistos[k]=true;return true;}).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  document.getElementById('sorteo-wrap').style.display='block';
  sorteoFiltrar();
}
function sorteoFiltrar(){
  const zona=document.getElementById('sorteo-zona').value;
  const tel=document.getElementById('sorteo-tel').value;
  let lista=sorteoData.filter(c=>{
    if(zona==='caba'&&!esCaba(c.localidad))return false;
    if(zona==='local'&&!esLocal(c.localidad))return false;
    if(zona==='fuera'&&(esLocal(c.localidad)||esCaba(c.localidad)))return false;
    if(tel==='contel'&&!c.telefono)return false;
    return true;
  }).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  document.getElementById('sorteo-count').textContent=lista.length+' clientes';
  const tb=document.getElementById('sorteo-table');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin resultados</div>';return;}
  tb.innerHTML=lista.slice(0,300).map(c=>`<div class="table-row" style="grid-template-columns:1fr 130px 120px 80px"><span style="font-weight:500">${c.nombre}</span><span style="font-size:11px">${c.localidad||'--'} <span class="${esCaba(c.localidad)?'local-tag':esLocal(c.localidad)?'local-tag':'fuera-tag'}">${esCaba(c.localidad)?'CABA':esLocal(c.localidad)?'local':'fuera'}</span></span><span style="font-family:'DM Mono',monospace;font-size:12px">${c.telefono||'--'}</span>${c.telefono?`<a class="wa-link" href="${waLink(c.telefono,c.nombre)}" target="_blank">WA</a>`:'<span style="color:var(--gris-dark);font-size:12px">--</span>'}</div>`).join('');
}
function copiarSorteoMsg(){const t=`Hola [Nombre]!\n\nSabemos lo mucho que queres a tu perrito, por eso queremos que sea parte de la fiesta mas grande del anio!\n\nEstamos sorteando 20 camisetas de la Seleccion Argentina, porque ellos tambien se merecen ponerse la 10!\n\nPara participar:\n- Seguinos en @wankunclub\n- Dale like a esta publicacion: https://www.instagram.com/p/DYk2Zi_oYgY/\n- Comentá con el talle y la raza de tu perrito\n\nEl sorteo es el 11 de junio a las 22hs.\n\nVamos Argentina!`;navigator.clipboard.writeText(t).then(()=>{const b=event.target,o=b.textContent;b.textContent='Copiado!';setTimeout(()=>b.textContent=o,2000);});}
function clExportar(){const rows=[['Nombre','Localidad','Telefono','Articulo','Zona'],...clFiltered.map(c=>[c.nombre,c.localidad,c.telefono,c.articulo,esLocal(c.localidad)?'Local':'Fuera'])];const csv=rows.map(r=>r.map(v=>`"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='clientes_wankun.csv';a.click();URL.revokeObjectURL(url);}

// ── RESEÑAS GOOGLE ───────────────────────────────────────────────────────────
// El registro de reseñas pedidas vive en la hoja "Resenas" de la planilla de Ventas
// (vía Apps Script), así es el mismo en todos los dispositivos. localStorage queda
// solo como copia de respaldo por si la planilla no responde.
let resenasData=[];
const RS_LINK='https://g.page/r/CWpl5hrUBgqFEBM/review';
const RS_API='https://script.google.com/macros/s/AKfycbzQabnMbn1s8fsQ1rDKn2_SXCX4UZLBX2NI_9p03IAveJZlK7ehiNbEtDjT6VP4yto3XA/exec';
let rsMapa={};          // clave -> {telefono,nombre,pedida(bool),fechaPedida,dejada}
let rsRemotoOk=false;
function rsNormTel(t){let d=(t||'').toString().replace(/\D/g,'');if(d.startsWith('54'))d=d.slice(2);if(d.startsWith('9')&&d.length===11)d=d.slice(1);return d;}
function rsKey(tel,nombre){const t=rsNormTel(tel);return t?('tel:'+t):('nom:'+(nombre||'').trim().toLowerCase());}
function rsLocalLeer(){try{const raw=localStorage.getItem('wankun_resenas');return raw?JSON.parse(raw):{};}catch(e){return{};}}
function rsLocalGuardar(){try{localStorage.setItem('wankun_resenas',JSON.stringify(rsMapa));}catch(e){}}
async function rsCargarRemoto(){
  // Respaldo local primero (normalizando claves viejas)
  const local=rsLocalLeer();rsMapa={};
  Object.values(local).forEach(v=>{const k=rsKey(v.telefono,v.nombre);rsMapa[k]={telefono:v.telefono||'',nombre:v.nombre||'',pedida:!!v.pedida,fechaPedida:v.fechaPedida||'',dejada:!!v.dejada};});
  if(!RS_API||RS_API.startsWith('PEGAR')){rsRemotoOk=false;return;}
  try{
    const r=await fetch(RS_API,{cache:'no-store'});const j=await r.json();
    if(!j.ok)throw new Error(j.error||'error');
    const remoto={};
    j.filas.forEach(f=>{const k=rsKey(f.telefono,f.nombre);remoto[k]={telefono:f.telefono,nombre:f.nombre,pedida:!!f.pedida,fechaPedida:f.pedida||'',dejada:!!f.dejada};});
    // Lo que estaba marcado solo en este navegador y no en la planilla: se sube.
    const subir=Object.entries(rsMapa).filter(([k,v])=>(v.pedida||v.dejada)&&!remoto[k]).map(([k,v])=>({telefono:v.telefono,nombre:v.nombre,pedida:v.pedida,dejada:v.dejada,origen:'migrado-navegador'}));
    if(subir.length){await rsEnviar({lote:subir});subir.forEach(v=>{remoto[rsKey(v.telefono,v.nombre)]={...v,fechaPedida:''};});}
    rsMapa=remoto;rsRemotoOk=true;rsLocalGuardar();
  }catch(e){console.error('Reseñas: no se pudo leer la planilla',e);rsRemotoOk=false;}
}
async function rsEnviar(payload){
  if(!RS_API||RS_API.startsWith('PEGAR'))return false;
  try{const r=await fetch(RS_API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});const j=await r.json();return !!j.ok;}catch(e){console.error('Reseñas: no se pudo guardar',e);return false;}
}
function rsGetEstado(key){return rsMapa[key]||{pedida:false,dejada:false,nombre:'',telefono:'',fechaPedida:''};}
function rsSetEstado(key,estado){
  const prev=rsMapa[key]||{};
  const hoy=new Date().toISOString().slice(0,10);
  rsMapa[key]={...prev,...estado,fechaPedida:prev.fechaPedida||(estado.pedida?hoy:'')};
  rsLocalGuardar();
  // rsEnviar deshabilitado — estado solo en localStorage
}
function rsFechaCorta(f){if(!f)return'';const p=f.split('-');return p.length===3?(p[2]+'/'+p[1]):f;}
function resenasWaLink(tel,nombre){const num=tel.toString().replace(/\D/g,'');const full=num.startsWith('54')?num:'54'+num;const primer=(nombre||'').split(' ')[0];const msg='Hola '+primer+'! Te saluda Nacho de Wankun Club 🐾\n\nNos ayudarias muchisimo si nos dejas una resena en Google contandonos que te parecio el servicio. Te dejo este link, es cortito:\n'+RS_LINK+'\n\nMuchas gracias!';return 'https://wa.me/'+full+'?text='+encodeURIComponent(msg);}
function rsEsAyer(fechaStr){const f=parseFecha(fechaStr);if(!f)return false;const h=new Date();const ayer=new Date(h.getFullYear(),h.getMonth(),h.getDate()-1);return f.getFullYear()===ayer.getFullYear()&&f.getMonth()===ayer.getMonth()&&f.getDate()===ayer.getDate();}
async function resenasCargar(){
  await rsCargarRemoto();
  const vRows=await fetchCSV('Ventas');
  const vistos={};
  const lista=[];
  vRows.forEach(r=>{
    const fecha=r['FECHA']||r['Fecha']||'';
    if(!rsEsAyer(fecha))return;
    const nombre=(r['CLIENTE']||r['Cliente']||'').trim();if(!nombre)return;
    const tel=(getCol(r,'TELEFONO','Telefono','Celular')||'').toString().trim();
    const articulo=getCol(r,'ARTICULO','Articulo','Artículo')||'';
    const key=rsKey(tel,nombre);
    if(vistos[key])return;vistos[key]=true;
    lista.push({nombre,telefono:tel,articulo});
  });
  lista.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  resenasData=lista.map(c=>{const key=rsKey(c.telefono,c.nombre);const est=rsGetEstado(key);return{...c,key,pedida:est.pedida,dejada:est.dejada,fechaPedida:est.fechaPedida};});
  document.getElementById('rs-wrap').style.display='block';
  rsAvisoEstado();
  resenasFiltrar();
  resenasCargarHistorial();
}
function rsAvisoEstado(){const el=document.getElementById('rs-sync');if(!el)return;el.textContent='Guardado en este dispositivo';el.style.background='#d1fae5';el.style.color='#065f46';}
function resenasMetricas(){
  const t=resenasData.length,p=resenasData.filter(c=>c.pedida).length,d=resenasData.filter(c=>c.dejada).length,pend=resenasData.filter(c=>!c.pedida).length;
  document.getElementById('rs-m-total').textContent=t;
  document.getElementById('rs-m-pedidas').textContent=p;
  document.getElementById('rs-m-dejadas').textContent=d;
  document.getElementById('rs-m-pendientes').textContent=pend;
}
function resenasToggle(key,campo){
  const c=resenasData.find(x=>x.key===key);if(!c)return;
  if(campo==='pedida'&&c.pedida){resenasFiltrar();return;} // una reseña pedida no se puede desmarcar
  c[campo]=!c[campo];
  if(campo==='dejada'&&c.dejada)c.pedida=true;
  rsSetEstado(key,{pedida:c.pedida,dejada:c.dejada,nombre:c.nombre,telefono:c.telefono});
  c.fechaPedida=rsGetEstado(key).fechaPedida;
  resenasMetricas();resenasFiltrar();resenasCargarHistorial();
}
function resenasMarcarPedida(key){
  const c=resenasData.find(x=>x.key===key);if(!c||c.pedida)return;
  c.pedida=true;rsSetEstado(key,{pedida:c.pedida,dejada:c.dejada,nombre:c.nombre,telefono:c.telefono});c.fechaPedida=rsGetEstado(key).fechaPedida;resenasMetricas();resenasFiltrar();resenasCargarHistorial();
}
async function resenasCargarHistorial(){
  try{
    if(!Object.keys(rsMapa).length)await rsCargarRemoto();
    rsAvisoEstado();
    const entries=Object.entries(rsMapa).filter(([k,v])=>v.pedida||v.dejada).sort((a,b)=>(b[1].fechaPedida||'').localeCompare(a[1].fechaPedida||'')||(a[1].nombre||'').localeCompare(b[1].nombre||'','es'));
    const tb=document.getElementById('rs-hist-table');
    const wrap=document.getElementById('rs-hist-wrap');
    document.getElementById('rs-hist-count').textContent=entries.length+' clientes';
    if(!entries.length){wrap.style.display='block';tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin historial todavía</div>';return;}
    wrap.style.display='block';
    tb.innerHTML=entries.map(([key,v])=>{
      return`<div class="table-row" style="grid-template-columns:1fr 130px 80px 80px;${v.dejada?'opacity:0.5':''}">
      <span style="font-weight:500;${v.dejada?'text-decoration:line-through;color:var(--gris-dark)':''}">${v.nombre||key}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px">${v.telefono||'--'}</span>
      <span style="text-align:center">${v.pedida?'<span style="color:#d97706;font-size:13px">✓ '+rsFechaCorta(v.fechaPedida)+'</span>':'--'}</span>
      <span style="text-align:center">${v.dejada?'<span style="color:var(--verde-claro);font-size:18px">✓</span>':'--'}</span>
    </div>`;}).join('');
  }catch(e){console.error(e);}
}
function resenasFiltrar(){
  const f=document.getElementById('rs-filtro').value;
  let lista=resenasData.filter(c=>{
    if(f==='pendiente')return !c.pedida;
    if(f==='pedida')return c.pedida&&!c.dejada;
    if(f==='dejada')return c.dejada;
    return true;
  });
  document.getElementById('rs-count').textContent=lista.length+' clientes';
  const tb=document.getElementById('rs-table');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin compras hoy o sin resultados</div>';resenasMetricas();return;}
  tb.innerHTML=lista.map(c=>{
    const done=c.dejada;
    const asked=c.pedida&&!c.dejada;
    const nameStyle=done?'text-decoration:line-through;color:var(--gris-dark)':asked?'color:var(--gris-dark)':'font-weight:500';
    let accion;
    if(c.pedida){accion=`<span style="font-size:11px;color:#92400e;background:#fef3c7;padding:2px 6px;border-radius:8px;text-align:center" title="Ya se le pidió reseña">Pedida ${rsFechaCorta(c.fechaPedida)}</span>`;}
    else if(false){/* rsRemotoOk ya no bloquea */}
    else if(c.telefono){accion=`<a class="wa-link" href="${resenasWaLink(c.telefono,c.nombre)}" target="_blank" rel="noopener" onclick="event.stopPropagation();setTimeout(()=>resenasMarcarPedida('${c.key}'),0)">WA 📨</a>`;}
    else{accion='<span style="color:var(--gris-dark);font-size:12px">--</span>';}
    return `<div class="table-row" style="grid-template-columns:1fr 1fr 120px 90px 90px 80px;${done?'opacity:0.45;':''}">
    <span style="${nameStyle}">${c.nombre}${asked?' <span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:8px;font-weight:500">pedida</span>':''}</span>
    <span style="font-size:12px;color:var(--gris-dark)">${c.articulo||'--'}</span>
    <span style="font-family:'DM Mono',monospace;font-size:12px">${c.telefono||'--'}</span>
    <span style="text-align:center"><input type="checkbox" ${c.pedida?'checked disabled':''} onchange="resenasToggle('${c.key}','pedida')" style="width:18px;height:18px;cursor:${c.pedida?'not-allowed':'pointer'}"></span>
    <span style="text-align:center"><input type="checkbox" ${c.dejada?'checked':''} onchange="resenasToggle('${c.key}','dejada')" style="width:18px;height:18px;cursor:pointer"></span>
    ${accion}
  </div>`;}).join('');
  resenasMetricas();
}

