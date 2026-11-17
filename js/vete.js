// ── VETE ─────────────────────────────────────────────────────────────────────
let VETE_DATA=null, VETE_CARGANDO=false;

function fmtARS(n){return '$'+Math.round(n||0).toLocaleString('es-AR');}

function parseVeteNum(v){
  if(v===undefined||v===null)return 0;
  let s=v.toString().trim();
  if(!s)return 0;
  s=s.replace(/[$"'\s]/g,'');
  s=s.replace(/\./g,'');   // punto = separador de miles en esta planilla
  s=s.replace(/,/g,'.');    // por si viniera con coma decimal
  const n=parseFloat(s);
  return isNaN(n)?0:n;
}

function parsePesoKg(v){
  if(!v)return 0;
  let s=v.toString().toLowerCase().replace('kg','').replace(',','.').trim();
  const n=parseFloat(s);
  return isNaN(n)?0:n;
}

async function veteCargar(){
  if(VETE_CARGANDO)return;
  VETE_CARGANDO=true;
  const err=document.getElementById('vete-error');
  if(err)err.style.display='none';
  try{
    const [ventas,internos]=await Promise.all([fetchCSV('Vete'),fetchCSV('Costos Internos')]);
    VETE_DATA={ventas,internos};
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
  const {ventas,internos}=VETE_DATA;

  let kgTot=0,ventaTot=0,costoTot=0,cobroVete=0,cobroClub=0;
  const porMes={};
  const porAlimento={};
  const pendientes=[];

  ventas.forEach(r=>{
    const alimento=(getCol(r,'Alimento')||'').trim();
    if(!alimento)return;
    const fechaStr=getCol(r,'Fecha');
    const fecha=parseFecha(fechaStr);
    const peso=parsePesoKg(getCol(r,'Peso'));
    const costo=parseVeteNum(getCol(r,'Costo'));
    const venta=parseVeteNum(getCol(r,'Precio de Venta'));
    const destino=(getCol(r,'Destino')||'').trim().toLowerCase();

    kgTot+=peso; ventaTot+=venta; costoTot+=costo;
    if(destino.indexOf('pendiente')>-1)cobroVete+=costo;
    else if(destino.indexOf('cobrado')>-1)cobroClub+=costo;

    if(fecha){
      const key=fecha.getFullYear()+'-'+(fecha.getMonth()+1).toString().padStart(2,'0');
      if(!porMes[key])porMes[key]={kg:0,venta:0,costo:0,cobroVete:0,cobroClub:0,anio:fecha.getFullYear(),mesIdx:fecha.getMonth()};
      porMes[key].kg+=peso;porMes[key].venta+=venta;porMes[key].costo+=costo;
      if(destino.indexOf('pendiente')>-1)porMes[key].cobroVete+=costo;
      else if(destino.indexOf('cobrado')>-1)porMes[key].cobroClub+=costo;
    }

    if(!porAlimento[alimento])porAlimento[alimento]={unidades:0,kg:0,venta:0,costo:0};
    porAlimento[alimento].unidades+=1;
    porAlimento[alimento].kg+=peso;
    porAlimento[alimento].venta+=venta;
    porAlimento[alimento].costo+=costo;

    if(destino.indexOf('pendiente')>-1){
      pendientes.push({fecha,fechaStr,alimento,costo});
    }
  });

  const utilidad=ventaTot-costoTot;
  const diferencia=costoTot-(cobroVete+cobroClub);

  let debesInternos=0;
  internos.forEach(r=>{debesInternos+=parseVeteNum(getCol(r,'Costo'));});
  const neto=cobroVete-debesInternos;

  document.getElementById('vete-kg').textContent=Math.round(kgTot).toLocaleString('es-AR')+' kg';
  document.getElementById('vete-total').textContent=fmtARS(ventaTot);
  document.getElementById('vete-costo').textContent=fmtARS(costoTot);
  document.getElementById('vete-utilidad').textContent=fmtARS(utilidad);
  document.getElementById('vete-cobro-vete').textContent=fmtARS(cobroVete);
  document.getElementById('vete-cobro-club').textContent=fmtARS(cobroClub);
  const difEl=document.getElementById('vete-diferencia');
  difEl.textContent=Math.abs(diferencia)<1?'$0':fmtARS(diferencia);
  difEl.style.color=Math.abs(diferencia)<1?'var(--verde)':'#dc2626';
  document.getElementById('vete-debes').textContent=fmtARS(debesInternos);
  const netoEl=document.getElementById('vete-neto');
  netoEl.textContent=(neto>=0?'':'-')+fmtARS(Math.abs(neto));
  netoEl.style.color=neto>=0?'var(--verde)':'#dc2626';

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

  pendientes.sort((x,y)=>(x.fecha?x.fecha.getTime():0)-(y.fecha?y.fecha.getTime():0));
  const hoy=new Date();
  let pendHtml='';
  pendientes.forEach(p=>{
    const dias=p.fecha?Math.floor((hoy-p.fecha)/86400000):null;
    const color=dias>14?'#dc2626':(dias>7?'#b45309':'inherit');
    pendHtml+='<div class="table-row" style="grid-template-columns:1fr 1.6fr 1fr 0.7fr">'
      +'<span>'+p.fechaStr+'</span>'
      +'<span>'+p.alimento+'</span>'
      +'<span>'+fmtARS(p.costo)+'</span>'
      +'<span style="color:'+color+';font-weight:600">'+(dias!=null?dias:'\u2014')+'</span>'
      +'</div>';
  });
  document.getElementById('vete-tabla-pendientes').innerHTML=pendHtml||'<div style="padding:20px;color:var(--gris-dark);font-size:13px">Sin pendientes</div>';
}

