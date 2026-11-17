// ── FINANCIERO ───────────────────────────────────────────────────────────────
// Nota: esta planilla usa formato numérico US (coma=miles, punto=decimal),
// distinto del formato argentino de Ventas/Flex Meli. Por eso usa su propio parser.
let FIN_DATA=null, FIN_CARGANDO=false;

function parseFinNum(v){
  if(v===undefined||v===null)return 0;
  let s=v.toString().trim();
  if(!s||s.indexOf('DIV/0')>-1)return 0;
  const neg=/^\(.*\)$/.test(s.replace(/[$\s]/g,''));
  s=s.replace(/["']/g,'').replace(/\$/g,'').replace(/[()]/g,'').replace(/\s/g,'').replace(/,/g,'');
  const n=parseFloat(s);
  if(isNaN(n))return 0;
  return neg?-Math.abs(n):n;
}

async function fetchRawCSV(sheet){
  const r=await fetch(PROXY+'/?sheet='+encodeURIComponent(sheet));
  if(!r.ok)throw new Error('Error leyendo '+sheet);
  const text=await r.text();
  return text.replace(/\r/g,'').trim().split('\n').map(line=>{
    const vals=[];let cur='',inQ=false;
    for(const ch of line){
      if(ch==='"')inQ=!inQ;
      else if(ch===','&&!inQ){vals.push(cur.trim());cur='';}
      else cur+=ch;
    }
    vals.push(cur.trim());
    return vals;
  });
}

function finFilaEn(rows,col,label){
  return rows.find(r=>(r[col]||'').trim().toLowerCase()===label.trim().toLowerCase());
}

function finMesesDesde(row,startCol){
  const out=[];
  if(!row)return out;
  for(let m=0;m<12;m++){
    out.push({budget:parseFinNum(row[startCol+2*m]),real:parseFinNum(row[startCol+2*m+1])});
  }
  return out;
}

async function finCargar(){
  if(FIN_CARGANDO)return;
  FIN_CARGANDO=true;
  const err=document.getElementById('fin-error');
  if(err)err.style.display='none';
  try{
    const [resumen,finanzas,facturacion]=await Promise.all([
      fetchRawCSV('FinResumen'),fetchRawCSV('FinFinanzas'),fetchRawCSV('FinFacturacion')
    ]);
    FIN_DATA={resumen,finanzas,facturacion};
    finRenderTodo();
  }catch(e){
    console.error('Error financiero:',e);
    if(err)err.style.display='block';
  }finally{
    FIN_CARGANDO=false;
  }
}

function finRenderTodo(){
  if(!FIN_DATA)return;
  const {resumen,finanzas,facturacion}=FIN_DATA;

  const rFacturacion=finFilaEn(finanzas,1,'Facturación');
  const rGastosFijos=finFilaEn(finanzas,1,'Total Gasto Fijos');
  const rGastosVar=finFilaEn(finanzas,1,'Total Gastos Variables');
  const rResultado=finFilaEn(finanzas,1,'Resultado(Ventas-Gastos-Ahorros)');
  const rWkn=finFilaEn(facturacion,1,'Wkn Club');
  const rML=finFilaEn(facturacion,1,'Mercado libre');

  const facMeses=finMesesDesde(rFacturacion,2);
  const gfMeses=finMesesDesde(rGastosFijos,2);
  const gvMeses=finMesesDesde(rGastosVar,2);
  const resMeses=finMesesDesde(rResultado,2);
  const wknMeses=finMesesDesde(rWkn,2);
  const mlMeses=finMesesDesde(rML,2);

  const mesIdx=Math.min(MES_ACTUAL_IDX,11);
  const facMes=facMeses[mesIdx]||{budget:0,real:0};
  const gfMes=gfMeses[mesIdx]||{budget:0,real:0};
  const gvMes=gvMeses[mesIdx]||{budget:0,real:0};
  const resMes=resMeses[mesIdx]||{budget:0,real:0};

  document.getElementById('fin-fac-mes').textContent=fmt(facMes.real);
  const cumpl=facMes.budget>0?Math.round(facMes.real/facMes.budget*100):null;
  const cumplEl=document.getElementById('fin-fac-mes-delta');
  cumplEl.textContent=cumpl!=null?cumpl+'% del presupuesto':'sin presupuesto cargado';
  cumplEl.className='metric-delta '+(cumpl!=null?(cumpl>=100?'delta-up':'delta-down'):'');

  document.getElementById('fin-resultado-mes').textContent=(resMes.real>=0?'':'-')+fmt(Math.abs(resMes.real));
  const resEl=document.getElementById('fin-resultado-mes-delta');
  resEl.textContent=resMes.real>=0?'Ganancia del mes':'Pérdida del mes';
  resEl.className='metric-delta '+(resMes.real>=0?'delta-up':'delta-down');

  const pctGF=facMes.real>0?(gfMes.real/facMes.real*100):0;
  const pctGV=facMes.real>0?(gvMes.real/facMes.real*100):0;
  document.getElementById('fin-gf-pct').textContent=pctGF.toFixed(1)+'%';
  document.getElementById('fin-gv-pct').textContent=pctGV.toFixed(1)+'%';

  const rIngTot=finFilaEn(resumen,2,'Ingresos totales');
  const rAhorroTot=finFilaEn(resumen,2,'Ahorros totales');
  const rResTot=finFilaEn(resumen,2,'Resultados TOTALES');
  const ingTot=rIngTot?parseFinNum(rIngTot[3]):0;
  const ahorroTot=rAhorroTot?parseFinNum(rAhorroTot[3]):0;
  const resTot=rResTot?parseFinNum(rResTot[3]):0;

  document.getElementById('fin-resultado-anual').textContent=(resTot>=0?'':'-')+fmt(Math.abs(resTot));
  const resAnualEl=document.getElementById('fin-resultado-anual-delta');
  const pctResTot=ingTot>0?(resTot/ingTot*100):0;
  resAnualEl.textContent=pctResTot.toFixed(1)+'% sobre ingresos del año';
  resAnualEl.className='metric-delta '+(resTot>=0?'delta-up':'delta-down');

  document.getElementById('fin-ahorro-anual').textContent=fmt(ahorroTot);
  const pctAhorro=ingTot>0?(ahorroTot/ingTot*100):0;
  document.getElementById('fin-ahorro-anual-delta').textContent=pctAhorro.toFixed(2)+'% sobre ingresos del año';

  const tbody=document.getElementById('fin-tabla-mensual');
  let rowsHtml='';
  for(let m=0;m<12;m++){
    const f=facMeses[m],gf=gfMeses[m],gv=gvMeses[m],r=resMeses[m];
    if(!f||(f.real===0&&f.budget===0))continue;
    const cump=f.budget>0?Math.round(f.real/f.budget*100):null;
    rowsHtml+='<div class="table-row" style="grid-template-columns:1fr 1.3fr 1fr 1fr 1.3fr">'
      +'<span>'+MESES_LARGO[m]+'</span>'
      +'<span>'+fmt(f.real)+(cump!=null?' <span style="color:var(--gris-dark);font-size:11px">('+cump+'%)</span>':'')+'</span>'
      +'<span>'+fmt(gf.real)+'</span>'
      +'<span>'+fmt(gv.real)+'</span>'
      +'<span style="color:'+(r.real>=0?'var(--verde)':'#dc2626')+';font-weight:600">'+(r.real>=0?'':'-')+fmt(Math.abs(r.real))+'</span>'
      +'</div>';
  }
  tbody.innerHTML=rowsHtml||'<div style="padding:20px;color:var(--gris-dark);font-size:13px">Sin datos</div>';

  const tbodyCanal=document.getElementById('fin-tabla-canal');
  let canalHtml='';
  for(let m=0;m<12;m++){
    const w=wknMeses[m],ml=mlMeses[m];
    if(!w||(w.real===0&&(!ml||ml.real===0)))continue;
    const totalMes=(w.real||0)+((ml&&ml.real)||0);
    const pctDirecto=totalMes>0?Math.round(w.real/totalMes*100):0;
    canalHtml+='<div class="table-row" style="grid-template-columns:1fr 1.2fr 1.2fr 1fr">'
      +'<span>'+MESES_LARGO[m]+'</span>'
      +'<span>'+fmt(w.real)+'</span>'
      +'<span>'+(ml&&ml.real?fmt(ml.real):'—')+'</span>'
      +'<span style="font-weight:600">'+pctDirecto+'%</span>'
      +'</div>';
  }
  renderCanalTotal('fin-canal-chart',wknMeses,mlMeses);
  tbodyCanal.innerHTML=canalHtml||'<div style="padding:20px;color:var(--gris-dark);font-size:13px">Sin datos</div>';

  renderPeq('fin-gastos-bars',{'Gastos Fijos':gfMes.real||0.01,'Gastos Variables':gvMes.real||0.01},AZUL);
}

// ── Negocio completo: barras apiladas Wkn Club (directo) + Mercado Libre, total y variación vs mes anterior ──
function renderCanalTotal(id,wkn,ml){
  const el=document.getElementById(id);if(!el)return;
  const NOM=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const rows=[];
  for(let m=0;m<12;m++){
    const d=(wkn[m]&&wkn[m].real)||0,l=(ml[m]&&ml[m].real)||0;
    if(d>0||l>0)rows.push({lab:NOM[m],d,l,t:d+l});
  }
  if(!rows.length){el.innerHTML='';return;}
  const n=rows.length,bw=56,H=230,top=34,base=H-22,W=n*bw;
  const maxT=Math.max(...rows.map(r=>r.t),1);
  const hh=v=>(v/maxT)*(base-top);
  const fk=v=>Math.round(v).toLocaleString('es-AR');
  let svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block" font-family="DM Sans,sans-serif">';
  rows.forEach((r,i)=>{
    const x=i*bw+8,w=bw-16,cx=i*bw+bw/2,hd=hh(r.d),hl=hh(r.l);
    const tip=r.lab+' — Total $ '+fk(r.t)+' · Directo $ '+fk(r.d)+' ('+Math.round(r.d/r.t*100)+'%) · Mercado Libre $ '+fk(r.l);
    svg+='<rect x="'+x+'" y="'+(base-hd)+'" width="'+w+'" height="'+hd+'" fill="'+VERDE+'"><title>'+tip+'</title></rect>';
    if(hl>0)svg+='<rect x="'+x+'" y="'+(base-hd-hl)+'" width="'+w+'" height="'+hl+'" fill="#f2c14e"><title>'+tip+'</title></rect>';
    svg+='<text x="'+cx+'" y="'+(base-hd-hl-5)+'" text-anchor="middle" font-size="10" font-weight="600" fill="#2b2b2b">'+(r.t/1e6).toLocaleString('es-AR',{maximumFractionDigits:1})+'M</text>';
    if(i>0&&rows[i-1].t>0){
      const v=Math.round((r.t-rows[i-1].t)/rows[i-1].t*100);
      svg+='<text x="'+cx+'" y="'+(base-hd-hl-17)+'" text-anchor="middle" font-size="9" font-weight="600" fill="'+(v>=0?VERDE:'#c0392b')+'">'+(v>=0?'+':'')+v+'%</text>';
    }
    svg+='<text x="'+cx+'" y="'+(base+14)+'" text-anchor="middle" font-size="10" fill="#5f6b66">'+r.lab+'</text>';
  });
  svg+='</svg>';
  el.innerHTML='<div style="display:flex;gap:16px;font-size:11px;color:var(--gris-dark);margin-bottom:6px;flex-wrap:wrap"><span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+VERDE+';vertical-align:-1px"></span> Wkn Club (directo)</span><span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#f2c14e;vertical-align:-1px"></span> Mercado Libre</span><span>Arriba: total del negocio y variación vs mes anterior</span></div>'+svg;
}

let ZONAS_DATA={},MARCAS_DATA={};

function renderBarras(id,fac,mes){
  const el=document.getElementById(id);if(!el)return;
  const data=fac||FAC_LIVE,labels=mes||MESES_LIVE,maxF=Math.max(...data.filter(v=>v>0),1);
  el.innerHTML=labels.map((m,i)=>{
    const h=data[i]>0?Math.round((data[i]/maxF)*160):2;
    const isLast=i===data.length-1;
    const isPrev=i===data.length-2;
    const color=isPrev?VERDE:isLast?AZUL:VERDE_CL;
    const valLabel=data[i]>0?fmt(data[i]):'—';
    return`<div class="bar-wrap"><div class="bar-val">${valLabel}</div><div class="bar" style="height:${h}px;background:${color};opacity:${data[i]>0?1:0.2}"></div><div class="bar-label">${m}</div></div>`;
  }).join('');
}

// ── Facturación y kilos por mes: barras $ + curva kg + crecimiento real ──
function renderMensualKg(){
  const el=document.getElementById('bar-ventas');if(!el)return;
  const fac=FAC_LIVE,kg=KG_LIVE,lab=MESES_LIVE,n=lab.length;
  if(!n||kg.length!==n){renderBarras('bar-ventas');return;}
  const maxF=Math.max(...fac,1),maxK=Math.max(...kg,1);
  const bw=56,H=210,top=24,base=H-34,W=n*bw;
  const yF=v=>base-(v/maxF)*(base-top),yK=v=>base-(v/maxK)*(base-top);
  const fmtK=v=>Math.round(v).toLocaleString('es-AR');
  let svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block" font-family="DM Sans,sans-serif">';
  const pts=[];
  for(let i=0;i<n;i++){
    const x=i*bw,cx=x+bw/2,last=i===n-1;
    if(fac[i]>0){
      svg+='<rect x="'+(x+8)+'" y="'+yF(fac[i])+'" width="'+(bw-16)+'" height="'+(base-yF(fac[i]))+'" rx="4" fill="'+(last?AZUL:VERDE_CL)+'"><title>'+lab[i]+' — $ '+fmtK(fac[i])+' · '+fmtK(kg[i])+' kg'+(kg[i]?' · $ '+fmtK(fac[i]/kg[i])+'/kg':'')+'</title></rect>';
      svg+='<text x="'+cx+'" y="'+(yF(fac[i])-5)+'" text-anchor="middle" font-size="10" font-weight="600" fill="#2b2b2b">'+(fac[i]/1e6).toLocaleString('es-AR',{maximumFractionDigits:1})+'M</text>';
    }
    if(kg[i]>0)pts.push([cx,yK(kg[i])]);
    svg+='<text x="'+cx+'" y="'+(base+14)+'" text-anchor="middle" font-size="10" fill="#5f6b66">'+lab[i]+'</text>';
    svg+='<text x="'+cx+'" y="'+(base+27)+'" text-anchor="middle" font-size="9" fill="#1d3557">'+(kg[i]?fmtK(kg[i])+' kg':'')+'</text>';
  }
  if(pts.length>1)svg+='<polyline points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="#1d3557" stroke-width="2"/>';
  pts.forEach(p=>{svg+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="#1d3557"/>';});
  svg+='</svg>';
  el.innerHTML='<div style="display:flex;gap:16px;font-size:11px;color:var(--gris-dark);margin-bottom:6px"><span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+VERDE_CL+';vertical-align:-1px"></span> Pesos</span><span><span style="display:inline-block;width:14px;height:2px;background:#1d3557;vertical-align:3px"></span> Kilos</span></div>'+svg;

  // Crecimiento real: pesos vs kilos vs precio por kilo
  const r=document.getElementById('ventas-kg-resumen');if(!r)return;
  const pc=(a,b)=>b?Math.round((a-b)/b*100):null;
  const fp=v=>v===null?'—':'<span style="color:'+(v>=0?'var(--verde)':'#c0392b')+';font-weight:600">'+(v>=0?'+':'')+v+'%</span>';
  const linea=(tit,f,k,f0,k0)=>'<div style="padding:8px 0;border-top:1px solid var(--gris-med);font-size:13px"><span style="color:var(--gris-dark)">'+tit+'</span>&nbsp;&nbsp;Pesos '+fp(pc(f,f0))+' · Kilos '+fp(pc(k,k0))+' · Precio por kilo '+fp(k&&k0?pc(f/k,f0/k0):null)+'</div>';
  const NOM=['','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const hoy=new Date(),keyHoy=hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0');
  const K=KEYS_LIVE;let html='';
  const iA=K.indexOf(keyHoy);
  const iC=iA>=0?iA-1:K.length-1; // último mes cerrado
  if(iC>=1)html+=linea(NOM[+K[iC].split('-')[1]]+' vs '+NOM[+K[iC-1].split('-')[1]],fac[iC],kg[iC],fac[iC-1],kg[iC-1]);
  const B=diarioData.byMesDia;
  if(iA>=1&&B&&B[keyHoy]){
    const dHoy=hoy.getDate(),sum=m=>{let f=0,k=0;Object.keys(B[m]||{}).forEach(d=>{if(+d<=dHoy){f+=B[m][d].fac||0;k+=B[m][d].kg||0;}});return{f,k};};
    const a=sum(keyHoy),b=sum(K[iA-1]);
    if(a.f>0)html+=linea(NOM[+keyHoy.split('-')[1]]+' vs '+NOM[+K[iA-1].split('-')[1]]+', al día '+dHoy,a.f,a.k,b.f,b.k);
  }
  r.innerHTML=html?'<div style="margin-top:10px">'+html+'</div>':'';
}

function renderPeq(id,data,color){
  const el=document.getElementById(id);if(!el)return;
  if(!Object.keys(data).length){el.innerHTML='<div style="padding:20px;color:var(--gris-dark);font-size:13px">Cargando...</div>';return;}
  const max=Math.max(...Object.values(data));
  el.innerHTML=Object.entries(data).map(([k,v])=>{
    const pct=Math.round(v/max*100);
    return`<div class="bar-small"><span style="min-width:120px;color:var(--gris-dark);text-align:right">${k}</span><div style="flex:1;background:var(--gris);border-radius:4px;height:20px;overflow:hidden"><div style="width:${pct}%;background:${color};height:100%;border-radius:4px;display:flex;align-items:center;padding-left:8px;font-size:11px;font-weight:600;color:#fff">${fmt(v)}</div></div></div>`;
  }).join('');
}

const OBJETIVO_2026={'2026-02':11111007,'2026-03':12777658,'2026-04':14694306,'2026-05':16898452,'2026-06':19433220,'2026-07':22348203,'2026-08':25700434,'2026-09':29555499,'2026-10':33988824,'2026-11':39087147,'2026-12':44950219};
const MESES_ABR_2026=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function renderObjetivoReal(id,real,obj,labels){
  const el=document.getElementById(id);if(!el)return;
  const w=760,h=260,padL=44,padR=16,padT=16,padB=28,n=labels.length;
  const vals=[...real,...obj].filter(v=>v!=null);
  const maxV=Math.max(...vals,1);
  const x=i=>padL+i*(w-padL-padR)/(n-1);
  const y=v=>padT+(h-padT-padB)*(1-v/maxV);
  function pathFor(arr){let d='',started=false;arr.forEach((v,i)=>{if(v==null){started=false;return;}const px=x(i),py=y(v);d+=(started?' L':'M')+px+','+py;started=true;});return d;}
  const realPath=pathFor(real),objPath=pathFor(obj);
  const areaIdx=[];real.forEach((v,i)=>{if(v!=null&&obj[i]!=null)areaIdx.push(i);});
  let areaPath='';
  if(areaIdx.length){areaPath='M'+areaIdx.map(i=>x(i)+','+y(real[i])).join(' L')+' L'+areaIdx.slice().reverse().map(i=>x(i)+','+y(obj[i])).join(' L')+' Z';}
  const realCircles=real.map((v,i)=>{
    if(v==null)return'';
    let tip='Real: '+fmt(v);
    if(obj[i]){const pct=Math.round((v/obj[i]-1)*100);tip+=' ('+(pct>=0?'+':'')+pct+'% sobre objetivo)';}
    return`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="var(--azul-med)"><title>${labels[i]} — ${tip}</title></circle>`;
  }).join('');
  const objCircles=obj.map((v,i)=>v==null?'':`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="var(--gris-dark)"><title>${labels[i]} — Objetivo: ${fmt(v)}</title></circle>`).join('');
  const xLabels=labels.map((l,i)=>`<text x="${x(i)}" y="${h-8}" text-anchor="middle" font-size="10" fill="var(--gris-dark)">${l}</text>`).join('');
  el.innerHTML=`<div style="display:flex;gap:16px;margin-bottom:8px;font-size:11px;color:var(--gris-dark)"><span><svg width="10" height="10" style="vertical-align:middle"><rect width="10" height="10" fill="var(--azul-med)"/></svg> Real</span><span><svg width="10" height="10" style="vertical-align:middle"><rect width="10" height="10" fill="var(--gris-dark)"/></svg> Objetivo</span></div>
<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;overflow:visible">
<path d="${areaPath}" fill="var(--azul-claro)" opacity="0.25"></path>
<path d="${objPath}" fill="none" stroke="var(--gris-dark)" stroke-width="2" stroke-dasharray="4 4"></path>
<path d="${realPath}" fill="none" stroke="var(--azul-med)" stroke-width="2.5"></path>
${objCircles}
${realCircles}
${xLabels}
</svg>`;
}

