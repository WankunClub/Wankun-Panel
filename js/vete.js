// ── VETE (venta viva de la veterinaria) ───────────────────────────────────────
// Fuente: pestañas "Vete Historial", "Vete Movimientos" y "Vete Stock" del Sheet Ventas,
// sincronizadas desde la base del artifact "Ventas Vete · Wankun Club".
let VETE_DATA=null, VETE_CARGANDO=false;

function fmtARS(n){return '$'+Math.round(n||0).toLocaleString('es-AR');}

function parseVeteNum(v){
  if(v===undefined||v===null)return 0;
  if(typeof v==='number')return v;
  let s=v.toString().trim();
  if(!s)return 0;
  s=s.replace(/[$"'\s]/g,'');
  s=s.replace(/\./g,'');   // punto = separador de miles
  s=s.replace(/,/g,'.');    // coma decimal
  const n=parseFloat(s);
  return isNaN(n)?0:n;
}

// Extrae el peso en kg del texto libre del producto (ej: "RC MAXI PUPPY 15KG" -> 15, "FIT GATO 1,5KG" -> 1.5)
function parseKgDeProducto(producto){
  const s=(producto||'').toLowerCase().replace(',', '.');
  const m=s.match(/(\d+(?:\.\d+)?)\s*kg/);
  return m?parseFloat(m[1]):0;
}

async function veteCargar(){
  if(VETE_CARGANDO)return;
  VETE_CARGANDO=true;
  const err=document.getElementById('vete-error');
  if(err)err.style.display='none';
  try{
    const [historial,movimientos,stock]=await Promise.all([
      fetchCSV('Vete Historial'),fetchCSV('Vete Movimientos'),fetchCSV('Vete Stock')
    ]);
    VETE_DATA={historial,movimientos,stock};
    veteRenderTodo();
  }catch(e){
    console.error('Error Vete:',e);
    if(err)err.style.display='block';
  }finally{
    VETE_CARGANDO=false;
  }
}

function veteRenderTodo(){
  if(!VETE_DATA)return;
  const {historial,movimientos,stock}=VETE_DATA;

  let kgTot=0,ventaTot=0,costoTot=0,costoCobroVete=0,gananciaCobroClub=0;
  const porMes={};
  const porAlimento={};

  historial.forEach(r=>{
    const alimento=(getCol(r,'Producto')||'').trim();
    if(!alimento)return;
    const fechaStr=getCol(r,'Fecha');
    const fecha=parseFecha(fechaStr);
    const peso=parseKgDeProducto(alimento);
    const precio=parseVeteNum(getCol(r,'Precio'));
    const costo=parseVeteNum(getCol(r,'Costo'));
    const cobro=(getCol(r,'Cobro')||'').trim();

    kgTot+=peso; ventaTot+=precio; costoTot+=costo;
    if(cobro==='Vete')costoCobroVete+=costo;
    else gananciaCobroClub+=(precio-costo);

    if(fecha){
      const key=fecha.getFullYear()+'-'+(fecha.getMonth()+1).toString().padStart(2,'0');
      if(!porMes[key])porMes[key]={kg:0,venta:0,costo:0,cobroVete:0,cobroClub:0,anio:fecha.getFullYear(),mesIdx:fecha.getMonth()};
      porMes[key].kg+=peso;porMes[key].venta+=precio;porMes[key].costo+=costo;
      if(cobro==='Vete')porMes[key].cobroVete+=costo;
      else porMes[key].cobroClub+=(precio-costo);
    }

    const keyAli=alimento.trim().toUpperCase().replace(/\s+/g,' ');
    if(!porAlimento[keyAli])porAlimento[keyAli]={unidades:0,kg:0,venta:0,costo:0};
    porAlimento[keyAli].unidades+=1;
    porAlimento[keyAli].kg+=peso;
    porAlimento[keyAli].venta+=precio;
    porAlimento[keyAli].costo+=costo;
  });

  const utilidad=ventaTot-costoTot;

  let pagoVete=0,pagoWankun=0,interno=0;
  movimientos.forEach(r=>{
    const tipo=(getCol(r,'Tipo')||'').trim();
    const monto=parseVeteNum(getCol(r,'Monto'));
    if(tipo==='pagoVete')pagoVete+=monto;
    else if(tipo==='pagoWankun')pagoWankun+=monto;
    else if(tipo==='interno')interno+=monto;
  });
  const liquidado=pagoVete-pagoWankun+interno;
  const saldo=costoCobroVete-gananciaCobroClub-liquidado;

  document.getElementById('vete-kg').textContent=Math.round(kgTot).toLocaleString('es-AR')+' kg';
  document.getElementById('vete-total').textContent=fmtARS(ventaTot);
  document.getElementById('vete-costo').textContent=fmtARS(costoTot);
  document.getElementById('vete-utilidad').textContent=fmtARS(utilidad);
  document.getElementById('vete-cobro-vete').textContent=fmtARS(costoCobroVete);
  document.getElementById('vete-cobro-club').textContent=fmtARS(gananciaCobroClub);
  document.getElementById('vete-diferencia').textContent=fmtARS(interno);
  document.getElementById('vete-debes').textContent=fmtARS(liquidado);
  const netoEl=document.getElementById('vete-neto');
  netoEl.textContent=(saldo>=0?'':'-')+fmtARS(Math.abs(saldo))+(saldo>=0?' (te debe la Vete)':' (le debes al Club)');
  netoEl.style.color=saldo>=0?'var(--verde)':'#dc2626';

  const mesesKeys=Object.keys(porMes).sort();
  let mesHtml='';
  mesesKeys.forEach(k=>{
    const m=porMes[k];
    mesHtml+='<div class="table-row" style="grid-template-columns:1fr 1fr 1.2fr 1fr 1fr 1.2fr 1.2fr">'
      +'<span>'+MESES_LARGO[m.mesIdx]+' '+m.anio+'</span>'
      +'<span>'+Math.round(m.kg)+' kg</span>'
      +'<span>'+fmtARS(m.venta)+'</span>'
      +'<span>'+fmtARS(m.costo)+'</span>'
      +'<span>'+fmtARS(m.venta-m.costo)+'</span>'
      +'<span>'+fmtARS(m.cobroVete)+'</span>'
      +'<span>'+fmtARS(m.cobroClub)+'</span>'
      +'</div>';
  });
  document.getElementById('vete-tabla-mensual').innerHTML=mesHtml||'<div style="padding:20px;color:var(--gris-dark);font-size:13px">Sin datos</div>';

  const alimentos=Object.keys(porAlimento).sort((a,b)=>porAlimento[b].venta-porAlimento[a].venta);
  let aliHtml='';
  alimentos.forEach(a=>{
    const d=porAlimento[a];
    aliHtml+='<div class="table-row" style="grid-template-columns:1.6fr 1fr 1fr 1fr 1fr">'
      +'<span>'+a+'</span>'
      +'<span>'+d.unidades+'</span>'
      +'<span>'+Math.round(d.kg)+' kg</span>'
      +'<span>'+fmtARS(d.venta)+'</span>'
      +'<span>'+fmtARS(d.costo)+'</span>'
      +'</div>';
  });
  document.getElementById('vete-tabla-alimento').innerHTML=aliHtml||'<div style="padding:20px;color:var(--gris-dark);font-size:13px">Sin datos</div>';

  const bajos=stock.filter(r=>parseVeteNum(getCol(r,'Cantidad'))<2)
    .sort((a,b)=>parseVeteNum(getCol(a,'Cantidad'))-parseVeteNum(getCol(b,'Cantidad')));
  let bajosHtml='';
  bajos.forEach(r=>{
    bajosHtml+='<div class="table-row" style="grid-template-columns:1fr 1.6fr 0.6fr 0.6fr">'
      +'<span>'+(getCol(r,'Marca')||'')+'</span>'
      +'<span>'+(getCol(r,'Producto')||'')+'</span>'
      +'<span>'+(getCol(r,'Kg')||'')+'</span>'
      +'<span style="color:#dc2626;font-weight:600">'+(getCol(r,'Cantidad')||'0')+'</span>'
      +'</div>';
  });
  document.getElementById('vete-tabla-pendientes').innerHTML=bajosHtml||'<div style="padding:20px;color:var(--gris-dark);font-size:13px">Sin alertas de stock</div>';
}
