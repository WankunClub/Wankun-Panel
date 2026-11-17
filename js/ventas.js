// ── Cargar ventas LIVE desde Sheets ─────────────────────────────────────────
async function cargarVentasLive(){
  try{
    const rows=await fetchCSV('Ventas');
    const porMes={},porMesKg={},zonas={},marcas={};
    let total=0,totalKg=0,totalPedidos=0;
    const hoy=new Date();
    const mesLimite=new Date(hoy.getFullYear(),hoy.getMonth()+1,1); // primer día del mes siguiente

    rows.forEach(r=>{
      const f=parseFecha(r['FECHA']||r['Fecha']||'');
      const fac=parseFac(getCol(r,'Facturación','Facturacion',' Facturación','Facturaci\u00f3n')||0);
      const kg=parseFloat((r['kg']||0).toString().replace(',','.'))||0;
      if(!f||isNaN(f)||!fac)return;
      if(f>=mesLimite)return; // ignorar meses futuros (no días futuros del mes actual)
      total+=fac;
      totalKg+=kg;
      totalPedidos++;
      const key=f.getFullYear()+'-'+(f.getMonth()+1).toString().padStart(2,'0');
      porMes[key]=(porMes[key]||0)+fac;
      porMesKg[key]=(porMesKg[key]||0)+kg;
      const zona=r['Barrio/Localidad']||r['Localidad']||'';
      const marca=normMarca(r['Marca']||r['marca']||'');
      const zonaN=capWords(normLoc(zona));
      if(zonaN)zonas[zonaN]=(zonas[zonaN]||0)+fac;
      if(marca!=='Sin marca')marcas[marca]=(marcas[marca]||0)+fac;
    });

    const keys=Object.keys(porMes).sort();
    if(keys.length<2)return;

    const labels=keys.map(k=>{
      const[y,m]=k.split('-');
      return new Date(parseInt(y),parseInt(m)-1,1).toLocaleDateString('es-AR',{month:'short'}).replace('.','');
    });
    const facs=keys.map(k=>porMes[k]);

    MESES_LIVE=labels;
    FAC_LIVE=facs;
    KEYS_LIVE=keys;KG_LIVE=keys.map(k=>porMesKg[k]||0);
    ZONAS_DATA=Object.fromEntries(Object.entries(zonas).sort((a,b)=>b[1]-a[1]).slice(0,8));
    MARCAS_DATA=Object.fromEntries(Object.entries(marcas).sort((a,b)=>b[1]-a[1]).slice(0,8));

    // ── Métricas inicio ──────────────────────────────────────────────────────
    document.getElementById('m-total').textContent='$'+(total/1e6).toFixed(1)+'M';

    // Mes actual desde el Sheets (puede ser junio u otro)
    const facMesActual=porMes[MES_ACTUAL_KEY]||0;
    document.getElementById('m-mayo').textContent=facMesActual>0?'$'+(facMesActual/1e6).toFixed(1)+'M':'$0';

    // Delta vs mes anterior
    const keysMes=keys;
    const idxActual=keysMes.indexOf(MES_ACTUAL_KEY);
    if(idxActual>0){
      const facAnterior=porMes[keysMes[idxActual-1]]||0;
      const kgAnterior=porMesKg[keysMes[idxActual-1]]||0;
      const kgActual=porMesKg[MES_ACTUAL_KEY]||0;
      const mesAntNom=new Date(parseInt(keysMes[idxActual-1].split('-')[0]),parseInt(keysMes[idxActual-1].split('-')[1])-1,1).toLocaleDateString('es-AR',{month:'long'});
      let deltaTxt='';
      if(facAnterior>0){
        const pctFac=((facMesActual-facAnterior)/facAnterior*100).toFixed(1);
        deltaTxt+=(pctFac>0?'+':'')+pctFac+'% $ vs '+mesAntNom;
      }
      if(kgAnterior>0){
        const pctKg=((kgActual-kgAnterior)/kgAnterior*100).toFixed(1);
        deltaTxt+=(deltaTxt?' · ':'')+(pctKg>0?'+':'')+pctKg+'% kg';
      }
      document.getElementById('m-mes-delta').textContent=deltaTxt||'sin datos del mes anterior';
      const elKg=document.getElementById('m-kg-mes');
      if(elKg)elKg.textContent=kgActual.toLocaleString('es-AR')+' kg';
    } else {
      document.getElementById('m-mes-delta').textContent='primer mes registrado';
      const elKg=document.getElementById('m-kg-mes');
      if(elKg)elKg.textContent=(porMesKg[MES_ACTUAL_KEY]||0).toLocaleString('es-AR')+' kg';
    }

    // Ticket promedio
    if(totalPedidos>0){
      document.getElementById('m-ticket').textContent='$'+Math.round(total/totalPedidos/1000)+'K';
    }

    // ── Métricas ventas ──────────────────────────────────────────────────────
    // Mejor mes
    const maxFac=Math.max(...facs);
    const idxMejor=facs.indexOf(maxFac);
    document.getElementById('v-mejor-mes').textContent=labels[idxMejor]||'—';
    document.getElementById('v-mejor-fac').textContent='$'+(maxFac/1e6).toFixed(1)+'M';

    // Crecimiento sep → mes actual
    if(facs.length>=2){
      const primero=facs[0];
      const ultimo=facs[facs.length-1]||facs[facs.length-2];
      if(primero>0){
        const crec=Math.round((ultimo-primero)/primero*100);
        document.getElementById('v-crec').textContent='+'+(crec>0?crec:0)+'%';
      }
    }

    // Kg totales
    document.getElementById('v-kg').textContent=totalKg>0?totalKg.toLocaleString('es-AR',{maximumFractionDigits:0}):'—';

    // Rango en label total
    document.getElementById('m-total-rango').textContent='Sep 2025 - '+MESES_LARGO[MES_ACTUAL_IDX]+' '+ANIO_ACTUAL;

    renderBarras('bar-inicio',facs,labels);
    renderMensualKg();
    const real2026=[],obj2026=[];
    for(let m=1;m<=12;m++){const key='2026-'+String(m).padStart(2,'0');real2026.push(porMes[key]||null);obj2026.push(OBJETIVO_2026[key]||null);}
    renderObjetivoReal('objetivo-real-chart',real2026,obj2026,MESES_ABR_2026);
    renderPeq('zonas-bars',ZONAS_DATA,VERDE);
    renderPeq('marcas-bars',MARCAS_DATA,AZUL);
    buildTopProductos(rows);
    buildGraficoDiario(rows);
    seriesSetDirecto(rows);
  }catch(e){console.log('Error ventas live:',e);}
}

// Render inicial con datos de respaldo (muestra barras mientras carga)
renderBarras('bar-inicio');

setTimeout(cargarVentasLive,300);

// ── SERIES HISTÓRICAS: día / semana / mes · canal / marca / zona · kg / $ ──────
// Directo = hoja Ventas (kg y $ reales). Mercado Libre = hoja Flex meli (sin $; kg estimado por la referencia).
let SER_DIR=[],SER_ML=[],SER_ML_OK=false,SER_ML_CARGANDO=false;
const SER_COLORES=['#2d6a4f','#457b9d','#f2c14e','#c0392b','#8b5cf6','#e76f51','#1d3557','#74c69d'];
function serKeyDia(f){return f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0');}
function serLunes(f){const d=new Date(f.getFullYear(),f.getMonth(),f.getDate());const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return d;}
function seriesSetDirecto(rows){
  const hoy=new Date();hoy.setHours(23,59,59,999);
  SER_DIR=[];
  rows.forEach(r=>{
    const f=parseFecha(r['FECHA']||r['Fecha']||'');if(!f||isNaN(f)||f>hoy)return;
    const fac=parseFac(getCol(r,'Facturación','Facturacion',' Facturación')||0);
    const kg=parseFloat((r['kg']||0).toString().replace(',','.'))||0;
    if(!fac&&!kg)return;
    const loc=r['Barrio/Localidad']||r['Localidad']||'';
    SER_DIR.push({f,kg,fac,canal:'Directo',marca:normMarca(r['Marca']||r['marca']||''),zona:zonaGrupo(loc),loc:capWords(normLoc(loc))||'Sin dato',tel:getCol(r,'TELEFONO','Telefono')||'',nombre:(r['CLIENTE']||r['Cliente']||'').trim(),prod:(r['producto']||r['Producto']||'').trim()});
  });
  seriesRender();
  try{baseRender();}catch(e){console.log('Base:',e);}
  try{cliRender();}catch(e){console.log('Clientes:',e);}
  seriesCargarML();
}
function serKgML(ref){
  const r=(ref||'').toString().toLowerCase();
  if(/pro ?plan|\bpp\b/.test(r))return 7.5;
  if(/maxi|med|giant|rcmax/.test(r))return 15;
  if(/mini/.test(r))return 3;
  return 10; // línea veterinaria Royal Canin (diabetic, hypo, renal, urinary, gastro, hepatic…)
}
async function seriesCargarML(){
  if(SER_ML_OK||SER_ML_CARGANDO)return;SER_ML_CARGANDO=true;
  try{
    const fRows=await fetchCSV('Flex meli');
    const hoy=new Date();hoy.setHours(23,59,59,999);
    SER_ML=[];
    fRows.forEach(r=>{
      const f=parseFecha(getCol(r,'Fecha compra','Fecha')||'');if(!f||isNaN(f)||f>hoy||f.getFullYear()<2025)return;
      const ref=getCol(r,'REFERNCIA','REFERENCIA')||'';
      const loc=getCol(r,'LOCALIDAD')||'';
      SER_ML.push({f,kg:serKgML(ref),fac:null,canal:'Mercado Libre',marca:/pro ?plan|\bpp\b/i.test(ref)?'Pro Plan':'Royal Canin',zona:zonaGrupo(loc),loc:capWords(normLoc(loc))||'Sin dato'});
    });
    SER_ML_OK=true;
  }catch(e){console.log('Series ML:',e);}
  SER_ML_CARGANDO=false;
  seriesRender();
}
function serPeriodos(per){
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const out=[];
  if(per==='dia'){
    for(let i=89;i>=0;i--){const d=new Date(hoy);d.setDate(d.getDate()-i);out.push({k:serKeyDia(d),lab:d.getDate()+'/'+(d.getMonth()+1),nolab:vdNoLaborable(d.getFullYear(),d.getMonth()+1,d.getDate())});}
  }else if(per==='semana'){
    const l=serLunes(hoy);
    for(let i=51;i>=0;i--){const d=new Date(l);d.setDate(d.getDate()-7*i);out.push({k:serKeyDia(d),lab:d.getDate()+'/'+(d.getMonth()+1)});}
  }else{
    const ini=new Date(2025,8,1);
    for(let d=new Date(ini);d<=hoy;d=new Date(d.getFullYear(),d.getMonth()+1,1))out.push({k:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),lab:MESES_NOM_ES[d.getMonth()]+(d.getMonth()===0||out.length===0?' '+String(d.getFullYear()).slice(2):'')});
  }
  return out;
}
function serKeyDe(f,per){return per==='dia'?serKeyDia(f):per==='semana'?serKeyDia(serLunes(f)):f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0');}
function serFilas(med){
  // En pesos solo hay datos del canal directo
  const c=(document.getElementById('ser-canal')||{}).value||'todos';
  const base=med==='fac'?SER_DIR:SER_DIR.concat(SER_ML);
  return c==='todos'?base:base.filter(r=>r.canal===c);
}
function serMedia(arr){return arr.reduce((a,b)=>a+b,0)/arr.length;}
function serDesvio(arr){const m=serMedia(arr);return Math.sqrt(arr.reduce((a,b)=>a+(b-m)*(b-m),0)/(arr.length-1||1));}
function serFmt(v,med){return med==='kg'?Math.round(v).toLocaleString('es-AR')+' kg':(Math.abs(v)>=1e6?'$ '+(v/1e6).toLocaleString('es-AR',{maximumFractionDigits:1})+'M':'$ '+Math.round(v).toLocaleString('es-AR'));}
function seriesRender(){
  const el=document.getElementById('ser-chart');if(!el)return;
  if(!SER_DIR.length){return;}
  const med=document.getElementById('ser-medida').value,per=document.getElementById('ser-periodo').value,dim=document.getElementById('ser-dim').value;
  const P=serPeriodos(per),idx={};P.forEach((p,i)=>idx[p.k]=i);
  const filas=serFilas(med);
  const grupos={};
  filas.forEach(r=>{
    const i=idx[serKeyDe(r.f,per)];if(i===undefined)return;
    const g=dim==='total'?'Total':r[dim];
    if(!grupos[g])grupos[g]=new Array(P.length).fill(0);
    grupos[g][i]+=med==='kg'?r.kg:(r.fac||0);
  });
  // Top 6 + "Otras"
  let nombres=Object.keys(grupos).sort((a,b)=>grupos[b].reduce((x,y)=>x+y,0)-grupos[a].reduce((x,y)=>x+y,0));
  if(nombres.length>7){
    const otras=new Array(P.length).fill(0);
    nombres.slice(6).forEach(n=>grupos[n].forEach((v,i)=>otras[i]+=v));
    nombres=nombres.slice(0,6);grupos['Otras']=otras;nombres.push('Otras');
  }
  const series=nombres.map((n,i)=>({name:n,vals:grupos[n],color:n==='Otras'?'#adb5bd':SER_COLORES[i%SER_COLORES.length]}));
  // Banda de control (promedio ± 3 desvíos) sobre el total, excluyendo el período en curso
  const total=new Array(P.length).fill(0);series.forEach(s=>s.vals.forEach((v,i)=>total[i]+=v));
  const base=total.slice(0,-1).map((v,i)=>({v,nolab:P[i].nolab})).filter(x=>per==='dia'?!x.nolab&&x.v>0:x.v>0).slice(per==='mes'?-18:per==='semana'?-52:-90).map(x=>x.v);
  let band=null;
  if(base.length>=4){const m=serMedia(base),sd=serDesvio(base);band={m,sd,hi:m+3*sd,lo:Math.max(0,m-3*sd),n:base.length};}
  const nota=document.getElementById('ser-nota');
  let txt='Último punto = período en curso (incompleto). ';
  if(band)txt+='Banda gris: promedio de '+band.n+(per==='mes'?' meses':per==='semana'?' semanas':' días hábiles')+' cerrados ± 3 desvíos ('+serFmt(band.lo,med)+' a '+serFmt(band.hi,med)+'). Punto rojo = fuera de la banda. ';
  txt+=med==='fac'?'En pesos solo entra el canal directo: la hoja Flex meli no tiene montos.':(SER_ML_OK?'Mercado Libre en kg es estimado según la referencia (Maxi/Medium 15 kg, línea veterinaria 10 kg, Pro Plan 7,5 kg).':'Cargando Mercado Libre…');
  if(nota)nota.textContent=txt;
  el.innerHTML=serChartSVG(P,series,dim==='total'?band:null,med,per)+(dim!=='total'&&band?'<div style="font-size:11px;color:var(--gris-dark);margin-top:4px">La banda de control se ve en "Abrir por: Total".</div>':'');
  seriesComparativo(med,dim);
}
function serChartSVG(P,series,band,med,per){
  const n=P.length,W=900,H=280,pl=58,pr=12,pt=14,pb=30;
  let maxV=Math.max(1,...series.map(s=>Math.max(...s.vals)));
  if(band)maxV=Math.max(maxV,band.hi);
  const x=i=>pl+(n===1?0:i*(W-pl-pr)/(n-1)),y=v=>pt+(H-pt-pb)*(1-v/maxV);
  let svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block" font-family="DM Sans,sans-serif">';
  for(let t=0;t<=4;t++){const v=maxV*t/4;svg+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#e9ecef"/><text x="'+(pl-6)+'" y="'+(y(v)+3)+'" text-anchor="end" font-size="10" fill="#6c757d">'+(med==='kg'?Math.round(v).toLocaleString('es-AR'):(v/1e6).toLocaleString('es-AR',{maximumFractionDigits:1})+'M')+'</text>';}
  if(band){
    svg+='<rect x="'+pl+'" y="'+y(band.hi)+'" width="'+(W-pl-pr)+'" height="'+(y(band.lo)-y(band.hi))+'" fill="#adb5bd" opacity="0.18"/>';
    svg+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(band.m)+'" y2="'+y(band.m)+'" stroke="#6c757d" stroke-dasharray="5 4"/>';
    svg+='<text x="'+(W-pr)+'" y="'+(y(band.m)-4)+'" text-anchor="end" font-size="10" fill="#6c757d">promedio '+serFmt(band.m,med)+'</text>';
  }
  const paso=Math.ceil(n/16);
  P.forEach((p,i)=>{if(i%paso===0||i===n-1)svg+='<text x="'+x(i)+'" y="'+(H-10)+'" text-anchor="middle" font-size="10" fill="#6c757d">'+p.lab+'</text>';});
  series.forEach(s=>{
    const pts=s.vals.map((v,i)=>x(i)+','+y(v));
    const full=pts.slice(0,-1).join(' '),tail=pts.slice(-2).join(' ');
    svg+='<polyline points="'+full+'" fill="none" stroke="'+s.color+'" stroke-width="2"/>';
    svg+='<polyline points="'+tail+'" fill="none" stroke="'+s.color+'" stroke-width="2" stroke-dasharray="3 3"/>';
    const r=n>60?2:3;
    s.vals.forEach((v,i)=>{
      const fuera=band&&i<n-1&&!(per==='dia'&&P[i].nolab&&v===0)&&(v>band.hi||v<band.lo);
      svg+='<circle cx="'+x(i)+'" cy="'+y(v)+'" r="'+(fuera?r+2:r)+'" fill="'+(fuera?'#c0392b':s.color)+'"><title>'+P[i].lab+' — '+s.name+': '+serFmt(v,med)+(i===n-1?' (en curso)':'')+(fuera?' · fuera de la banda':'')+'</title></circle>';
    });
  });
  svg+='</svg>';
  const ley=series.length>1?'<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--gris-dark);margin-bottom:6px">'+series.map(s=>'<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+s.color+';vertical-align:-1px"></span> '+s.name+'</span>').join('')+'</div>':'';
  return ley+svg;
}
// Mes en curso vs mes anterior, al mismo día: ¿quién explica la diferencia?
function seriesComparativo(med,dim){
  const el=document.getElementById('ser-comp');if(!el)return;
  const d=dim==='total'?'marca':dim;
  const hoy=new Date(),dia=hoy.getDate();
  const ka=hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0');
  const pr=new Date(hoy.getFullYear(),hoy.getMonth()-1,1),kp=pr.getFullYear()+'-'+String(pr.getMonth()+1).padStart(2,'0');
  const acc={};
  serFilas(med).forEach(r=>{
    if(r.f.getDate()>dia)return;
    const k=r.f.getFullYear()+'-'+String(r.f.getMonth()+1).padStart(2,'0');
    if(k!==ka&&k!==kp)return;
    const g=r[d]||'Sin dato';if(!acc[g])acc[g]={a:0,p:0,fa:0,ka:0,fp:0,kp:0};
    const v=med==='kg'?r.kg:(r.fac||0);
    if(k===ka)acc[g].a+=v;else acc[g].p+=v;
    if(r.fac){if(k===ka){acc[g].fa+=r.fac;acc[g].ka+=r.kg;}else{acc[g].fp+=r.fac;acc[g].kp+=r.kg;}}
  });
  const filas=Object.entries(acc).map(([g,o])=>({g,a:o.a,p:o.p,dif:o.a-o.p,pk:(o.ka&&o.kp)?Math.round(((o.fa/o.ka)/(o.fp/o.kp)-1)*100):null})).filter(f=>f.a||f.p);
  const T=Object.values(acc).reduce((s,o)=>({fa:s.fa+o.fa,ka:s.ka+o.ka,fp:s.fp+o.fp,kp:s.kp+o.kp}),{fa:0,ka:0,fp:0,kp:0});
  const pkT=(T.ka&&T.kp)?Math.round(((T.fa/T.ka)/(T.fp/T.kp)-1)*100):null;
  const pkF=v=>v===null?'—':'<span style="color:var(--gris-dark);font-weight:600">'+(v>=0?'+':'')+v+'%</span>';
  const tA=filas.reduce((s,f)=>s+f.a,0),tP=filas.reduce((s,f)=>s+f.p,0),tD=tA-tP;
  filas.sort((x,y)=>x.dif-y.dif);
  const NOM=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const pc=(a,b)=>b?Math.round((a-b)/b*100):null;
  const col=v=>v===null?'—':'<span style="color:'+(v>=0?'var(--verde)':'#c0392b')+';font-weight:600">'+(v>=0?'+':'')+v+'%</span>';
  const gc='grid-template-columns:1.4fr 1fr 1fr 1fr 70px 1fr 1fr';
  let h='<div class="card-title" style="font-size:14px;margin-bottom:4px">'+capWords(NOM[hoy.getMonth()])+' vs '+NOM[pr.getMonth()]+', del 1 al '+dia+' — por '+({marca:'marca',canal:'canal',zona:'zona',loc:'localidad'}[d])+'</div>';
  h+='<div style="font-size:11px;color:var(--gris-dark);margin-bottom:8px">"Peso en la variación": qué parte de la diferencia total explica cada fila. "Precio por kg": cuánto cambió lo cobrado por kilo (solo canal directo). Ordenado de mayor caída a mayor suba.</div>';
  h+='<div class="table-wrap"><div class="table-head" style="'+gc+'"><span>'+({marca:'Marca',canal:'Canal',zona:'Zona',loc:'Localidad'}[d])+'</span><span>'+capWords(NOM[pr.getMonth()])+'</span><span>'+capWords(NOM[hoy.getMonth()])+'</span><span>Diferencia</span><span>%</span><span>Peso en la variación</span><span>Precio por kg</span></div><div class="table-body" style="max-height:360px">';
  filas.slice(0,25).forEach(f=>{
    const peso=tD?Math.round(f.dif/tD*100):null;
    h+='<div class="table-row" style="'+gc+'"><span style="font-weight:500">'+f.g+'</span><span>'+serFmt(f.p,med)+'</span><span>'+serFmt(f.a,med)+'</span><span style="color:'+(f.dif>=0?'var(--verde)':'#c0392b')+';font-weight:600">'+(f.dif>=0?'+':'')+serFmt(f.dif,med)+'</span><span>'+col(pc(f.a,f.p))+'</span><span>'+(peso===null?'—':peso+'%')+'</span><span>'+pkF(f.pk)+'</span></div>';
  });
  h+='<div class="table-row" style="'+gc+';font-weight:700;background:var(--gris)"><span>Total</span><span>'+serFmt(tP,med)+'</span><span>'+serFmt(tA,med)+'</span><span>'+(tD>=0?'+':'')+serFmt(tD,med)+'</span><span>'+col(pc(tA,tP))+'</span><span>100%</span><span>'+pkF(pkT)+'</span></div>';
  h+='</div></div>';
  el.innerHTML=h;
}

// ── LÍNEA BASE (método Adri): promedio de 12–18 meses ± 3 desvíos, con tendencia ──
// Se mide por día de venta para poder comparar el mes en curso (incompleto) con los cerrados.
function baseMeses(med){
  const m={};
  SER_DIR.forEach(r=>{const k=r.f.getFullYear()+'-'+String(r.f.getMonth()+1).padStart(2,'0');if(!m[k])m[k]={v:0,dias:new Set()};m[k].v+=med==='kg'?r.kg:r.fac;m[k].dias.add(r.f.getDate());});
  return Object.keys(m).sort().map(k=>({k,v:m[k].v,dias:m[k].dias.size,pd:m[k].v/m[k].dias.size}));
}
function baseRender(){
  const el=document.getElementById('base-chart');if(!el||!SER_DIR.length)return;
  const med=document.getElementById('base-medida').value;
  const hoy=new Date(),kHoy=hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0');
  const M=baseMeses(med);
  const cerr=M.filter(x=>x.k!==kHoy&&x.dias>=15).slice(-18);   // meses cerrados completos, máx. 18
  const act=M.find(x=>x.k===kHoy);
  if(cerr.length<4){el.innerHTML='';return;}
  const n=cerr.length,ys=cerr.map(x=>x.pd),xs=ys.map((_,i)=>i);
  const mx=serMedia(xs),my=serMedia(ys);
  let b=0,d=0;xs.forEach((x,i)=>{b+=(x-mx)*(ys[i]-my);d+=(x-mx)*(x-mx);});b=b/d;const a=my-b*mx;
  const res=ys.map((y,i)=>y-(a+b*i));const sd=Math.sqrt(res.reduce((s,r)=>s+r*r,0)/(n-2));
  const sdPlano=serDesvio(ys);
  const esp=i=>a+b*i;
  const fv=v=>med==='kg'?Math.round(v).toLocaleString('es-AR')+' kg':'$ '+Math.round(v/1000).toLocaleString('es-AR')+'K';
  const pts=cerr.map((x,i)=>({lab:MESES_NOM_ES[+x.k.split('-')[1]-1]+' '+x.k.slice(2,4),v:x.pd,e:esp(i),dias:x.dias}));
  if(act)pts.push({lab:MESES_NOM_ES[+act.k.split('-')[1]-1]+' '+act.k.slice(2,4),v:act.pd,e:esp(n),dias:act.dias,curso:true});
  // Veredicto
  const ver=document.getElementById('base-veredicto');
  if(act&&ver){
    const p=pts[pts.length-1],z=(p.v-p.e)/sd,lo=p.e-3*sd,hi=p.e+3*sd;
    const fuera=p.v<lo||p.v>hi;
    const col=fuera?'#c0392b':Math.abs(z)>=1.5?'#b7791f':'var(--verde)';
    const txt=fuera?(p.v<lo?'ATÍPICO hacia abajo: hay que buscar la causa.':'ATÍPICO hacia arriba: ver qué lo explicó.'):(Math.abs(z)>=1.5?'Dentro de lo normal, pero en la parte '+(z<0?'baja':'alta')+' de la banda: vigilar.':'Dentro de lo normal: fluctuación esperable.');
    ver.innerHTML='<div style="padding:12px 14px;border-radius:8px;background:var(--gris);border-left:4px solid '+col+';font-size:13px;line-height:1.6"><b>'+MESES_LARGO[hoy.getMonth()]+' (al día '+hoy.getDate()+', '+p.dias+' días con venta):</b> '+fv(p.v)+' por día. Esperado según la tendencia: '+fv(p.e)+' · banda normal '+fv(Math.max(0,lo))+' a '+fv(hi)+'.<br><span style="color:'+col+';font-weight:700">'+txt+'</span> <span style="color:var(--gris-dark)">('+(z>=0?'+':'')+z.toFixed(1)+' desvíos)</span></div>';
  }
  // Gráfico
  const W=900,H=250,pl=58,pr=12,pt=14,pb=30,N=pts.length;
  const maxV=Math.max(...pts.map(p=>Math.max(p.v,p.e+3*sd)))*1.02;
  const x=i=>pl+i*(W-pl-pr)/(N-1),y=v=>pt+(H-pt-pb)*(1-Math.max(0,v)/maxV);
  let svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block" font-family="DM Sans,sans-serif">';
  for(let t=0;t<=4;t++){const v=maxV*t/4;svg+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#e9ecef"/><text x="'+(pl-6)+'" y="'+(y(v)+3)+'" text-anchor="end" font-size="10" fill="#6c757d">'+(med==='kg'?Math.round(v):Math.round(v/1000)+'K')+'</text>';}
  const up=pts.map((p,i)=>x(i)+','+y(p.e+3*sd)).join(' '),dn=pts.map((p,i)=>x(i)+','+y(p.e-3*sd)).reverse().join(' ');
  svg+='<polygon points="'+up+' '+dn+'" fill="#74c69d" opacity="0.18"/>';
  svg+='<polyline points="'+pts.map((p,i)=>x(i)+','+y(p.e+3*sd)).join(' ')+'" fill="none" stroke="#74c69d" stroke-width="1"/>';
  svg+='<polyline points="'+pts.map((p,i)=>x(i)+','+y(p.e-3*sd)).join(' ')+'" fill="none" stroke="#74c69d" stroke-width="1"/>';
  svg+='<polyline points="'+pts.map((p,i)=>x(i)+','+y(p.e)).join(' ')+'" fill="none" stroke="#6c757d" stroke-dasharray="5 4"/>';
  svg+='<polyline points="'+pts.map((p,i)=>x(i)+','+y(p.v)).join(' ')+'" fill="none" stroke="#1d3557" stroke-width="2.5"/>';
  pts.forEach((p,i)=>{
    const fuera=p.v>p.e+3*sd||p.v<p.e-3*sd;
    svg+='<circle cx="'+x(i)+'" cy="'+y(p.v)+'" r="'+(fuera?6:4)+'" fill="'+(fuera?'#c0392b':p.curso?'#fff':'#1d3557')+'" stroke="'+(fuera?'#c0392b':'#1d3557')+'" stroke-width="2"><title>'+p.lab+(p.curso?' (en curso)':'')+' — '+fv(p.v)+' por día · esperado '+fv(p.e)+' · banda '+fv(Math.max(0,p.e-3*sd))+' a '+fv(p.e+3*sd)+'</title></circle>';
    svg+='<text x="'+x(i)+'" y="'+(H-10)+'" text-anchor="middle" font-size="10" fill="#6c757d">'+p.lab+'</text>';
  });
  svg+='</svg>';
  el.innerHTML='<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--gris-dark);margin-bottom:6px"><span><span style="display:inline-block;width:14px;height:3px;background:#1d3557;vertical-align:3px"></span> Real por día de venta</span><span><span style="display:inline-block;width:14px;border-top:2px dashed #6c757d;vertical-align:3px"></span> Esperado (tendencia)</span><span><span style="display:inline-block;width:10px;height:10px;background:#74c69d;opacity:.4;vertical-align:-1px"></span> Banda normal ± 3 desvíos</span><span>Punto blanco = mes en curso</span></div>'+svg;
  const nota=document.getElementById('base-nota');
  if(nota)nota.innerHTML='Base: '+n+' meses cerrados (los últimos, hasta 18). Se mide <b>por día de venta</b> para poder comparar el mes en curso con los cerrados. Como el negocio viene creciendo, el promedio se calcula sobre la línea de tendencia (crece '+fv(b)+' por día cada mes) y los desvíos se miden contra esa línea. Con promedio plano, sin tendencia, la banda daría '+fv(Math.max(0,my-3*sdPlano))+' a '+fv(my+3*sdPlano)+', tan ancha que nada sale de ella. Regla de Adri: si varios meses seguidos quedan fuera de la banda, el comportamiento cambió y hay que recalcular. Solo canal directo.';
}

// ── CLIENTES: a quién le tocaba volver este mes y si volvió ─────────────────
// Estado de clientes: "baja" (perrito fallecido / dejó definitivamente) sale de las listas y de la tasa; "precio" queda marcado.
// Los fijos van en el código (se ven en todos los dispositivos); los que marques con los botones se guardan en este dispositivo.
const CLI_ESTADO_FIJO={'t1132467277':{e:'baja',nota:'Falleció la perrita (nov 2026)'},'t1166045240':{e:'precio',nota:'Se queja por el precio (nov 2026)'}};
function cliEstLeer(){try{return JSON.parse(localStorage.getItem('wankun_cli_estado')||'{}');}catch(e){return{};}}
function cliEst(k){const l=cliEstLeer();return l[k]!==undefined?l[k]:(CLI_ESTADO_FIJO[k]||null);}
function cliMarcar(k,e){const l=cliEstLeer();const act=cliEst(k);l[k]=(act&&act.e===e)?{e:'',nota:''}:{e,nota:''};try{localStorage.setItem('wankun_cli_estado',JSON.stringify(l));}catch(x){}cliRender();}
function cliKey(r){const t=rsNormTel(r.tel);return t.length>=8?'t'+t:'n'+(r.nombre||'').trim().toLowerCase();}
function cliHistorial(){
  const h={};
  SER_DIR.forEach(r=>{const k=cliKey(r);if(!h[k])h[k]=[];h[k].push(r);});
  Object.values(h).forEach(a=>a.sort((x,y)=>x.f-y.f));
  return h;
}
function cliDia0(f){return new Date(f.getFullYear(),f.getMonth(),f.getDate());}
// Para el mes que arranca en "corte" y se mira hasta "fin": a quién le tocaba volver y quién volvió
function cliTasa(H,corte,fin){
  const DIA=86400000,out=[];
  Object.keys(H).forEach(k=>{
    const prev=H[k].filter(r=>r.f<corte);if(!prev.length)return;
    const fechas=[...new Set(prev.map(r=>cliDia0(r.f).getTime()))].sort((a,b)=>a-b);
    const ints=[];for(let i=1;i<fechas.length;i++){const d=Math.round((fechas[i]-fechas[i-1])/DIA);if(d>=7)ints.push(d);}
    const ciclo=ints.length?mediana(ints):30;
    const ult=fechas[fechas.length-1],prox=ult+ciclo*DIA;
    if((corte-ult)/DIA>120)return;
    const est=cliEst(k);if(est&&est.e==='baja')return;      // dado de baja: no cuenta                          // ya inactivo hace rato: va por Inactivos
    if(prox<corte.getTime()-10*DIA||prox>fin.getTime()-5*DIA)return; // no le tocaba en esta ventana (5 días de tolerancia)
    const volvio=H[k].some(r=>r.f>=corte&&r.f<=fin);
    const u=prev[prev.length-1];
    out.push({k,volvio,ciclo,ult:new Date(ult),prox:new Date(prox),nombre:u.nombre,tel:u.tel,zona:u.zona,loc:u.loc,marca:u.marca,prod:u.prod,kg:prev.filter(r=>cliDia0(r.f).getTime()===ult).reduce((s,r)=>s+r.kg,0),compras:fechas.length});
  });
  return out;
}
function cliRender(){
  const el=document.getElementById('cli-resumen');if(!el||!SER_DIR.length)return;
  const H=cliHistorial(),hoy=new Date(),dia=hoy.getDate();
  // Primera compra de cada cliente para separar nuevos de recurrentes
  const primera={};Object.keys(H).forEach(k=>primera[k]=cliDia0(H[k][0].f).getTime());
  const filas=[];
  for(let i=3;i>=0;i--){
    const corte=new Date(hoy.getFullYear(),hoy.getMonth()-i,1);
    const fin=new Date(corte.getFullYear(),corte.getMonth(),dia,23,59,59);
    const t=cliTasa(H,corte,fin);
    const comp={};SER_DIR.forEach(r=>{if(r.f>=corte&&r.f<=fin){const k=cliKey(r);if(!comp[k])comp[k]={kg:0,nuevo:cliDia0(r.f).getTime()===primera[k]};comp[k].kg+=r.kg;}});
    const cs=Object.values(comp),nu=cs.filter(c=>c.nuevo),re=cs.filter(c=>!c.nuevo);
    filas.push({lab:MESES_LARGO[corte.getMonth()],tocaba:t.length,volvieron:t.filter(x=>x.volvio).length,nuevos:nu.length,kgNu:nu.reduce((s,c)=>s+c.kg,0),rec:re.length,kgRe:re.reduce((s,c)=>s+c.kg,0),lista:t});
  }
  const gc='grid-template-columns:1fr 1fr 1fr 1fr 1fr';
  let h='<div style="font-size:11px;color:var(--gris-dark);margin-bottom:8px">Cada mes medido del 1 al '+dia+' para que sea comparable. "Les tocaba volver": clientes activos (última compra hace menos de 120 días) cuya próxima compra, según su ciclo habitual, caía en esa ventana (con 5 días de margen).</div>';
  h+='<div class="table-wrap"><div class="table-head" style="'+gc+'"><span>Mes (1 al '+dia+')</span><span>Les tocaba volver</span><span>Volvieron</span><span>Clientes nuevos</span><span>Recurrentes que compraron</span></div><div class="table-body">';
  filas.forEach((f,i)=>{
    const tasa=f.tocaba?Math.round(f.volvieron/f.tocaba*100):0;
    h+='<div class="table-row" style="'+gc+(i===filas.length-1?';font-weight:700;background:var(--gris)':'')+'"><span>'+f.lab+'</span><span>'+f.tocaba+'</span><span>'+f.volvieron+' <span style="color:var(--gris-dark);font-weight:600">('+tasa+'%)</span></span><span>'+f.nuevos+' · '+Math.round(f.kgNu).toLocaleString('es-AR')+' kg</span><span>'+f.rec+' · '+Math.round(f.kgRe).toLocaleString('es-AR')+' kg</span></div>';
  });
  h+='</div></div>';
  el.innerHTML=h;
  // Lista accionable: les tocaba este mes y todavía no volvieron
  const pend=filas[filas.length-1].lista.filter(x=>!x.volvio).sort((a,b)=>a.prox-b.prox);
  const bajas=Object.keys(H).filter(k=>{const e=cliEst(k);return e&&e.e==='baja';}).map(k=>{const u=H[k][H[k].length-1];const e=cliEst(k);return '<a href="#" title="Click para reactivar" style="color:var(--azul-med)" onclick="cliMarcar(\''+k.replace(/'/g,"\\'")+'\',\'baja\');return false">'+u.nombre+'</a>'+(e.nota?' ('+e.nota+')':'');});
  const porZona={},porMarca={};pend.forEach(p=>{porZona[p.zona]=(porZona[p.zona]||0)+1;porMarca[p.marca]=(porMarca[p.marca]||0)+1;});
  const resumen=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+v).join(' · ');
  const gl='grid-template-columns:1.2fr 1fr 1.4fr 70px 70px 60px 50px 110px';
  const DIA=86400000,hoy0=cliDia0(hoy);
  let l='<div class="card-title" style="font-size:14px;margin-bottom:4px">Les tocaba volver en '+MESES_LARGO[hoy.getMonth()].toLowerCase()+' y todavía no compraron: '+pend.length+' clientes · '+Math.round(pend.reduce((s,p)=>s+p.kg,0)).toLocaleString('es-AR')+' kg en su última compra</div>';
  l+='<div style="font-size:11px;color:var(--gris-dark);margin-bottom:8px">Por zona: '+resumen(porZona)+'<br>Por marca: '+resumen(porMarca)+(bajas.length?'<br>Dados de baja (no cuentan, click en el nombre para reactivar): '+bajas.join(' · '):'')+'<br>"Baja" saca al cliente de la lista y de la tasa (perrito fallecido o dejó definitivamente). "Precio" lo deja marcado. Lo que marques con los botones se guarda en este dispositivo.</div>';
  l+='<div class="table-wrap"><div class="table-head" style="'+gl+'"><span>Cliente</span><span>Zona</span><span>Última compra</span><span>Ciclo</span><span>Atraso</span><span>Compras</span><span>WA</span><span>Marcar</span></div><div class="table-body" style="max-height:420px">';
  pend.forEach(p=>{
    const atraso=Math.round((hoy0-p.prox)/DIA);
    const fd=p.ult.getDate()+'/'+(p.ult.getMonth()+1);
    const est=cliEst(p.k),eAct=est&&est.e;
    const bt=(e,t)=>'<button class="btn'+(eAct===e?' btn-primary':'')+'" style="padding:2px 6px;font-size:11px" onclick="cliMarcar(\''+p.k.replace(/'/g,"\\'")+'\',\''+e+'\')">'+t+'</button>';
    const tagPrecio=eAct==='precio'?' <span style="font-size:10px;background:#fde68a;color:#92400e;padding:1px 6px;border-radius:8px">precio</span>':'';
    const wa=p.tel?'<a class="wa-link" href="'+avWaLinkAyer(p.tel,p.nombre)+'" target="_blank">WA</a>':'<span style="font-size:11px;color:var(--gris-dark)">Sin tel</span>';
    l+='<div class="table-row" style="'+gl+'"><span style="font-weight:500">'+(p.nombre||'--')+tagPrecio+'</span><span style="font-size:12px">'+p.loc+' <span class="'+(p.zona==='Local 15 km'?'local-tag':'fuera-tag')+'">'+p.zona+'</span></span><span style="font-size:12px">'+fd+' · '+[p.marca==='Sin marca'?'':p.marca,p.prod].filter(Boolean).join(' ')+'</span><span style="font-size:12px">'+p.ciclo+' días</span><span style="font-size:12px;color:'+(atraso>10?'#c0392b':'var(--texto)')+'">'+(atraso>=0?atraso+' días':'—')+'</span><span style="font-size:12px;text-align:center">'+p.compras+'</span>'+wa+'<span style="display:flex;gap:4px">'+bt('baja','Baja')+bt('precio','Precio')+'</span></div>';
  });
  l+='</div></div>';
  document.getElementById('cli-lista').innerHTML=l;
}

// ── GRAFICO DIARIO ────────────────────────────────────────────────────────────
let diarioData={};

function buildGraficoDiario(rows){
  const byMesDia={};
  rows.forEach(function(r){
    const f=parseFecha(r['FECHA']||r['Fecha']||'');
    if(!f)return;
    const mes=f.getFullYear()+'-'+(f.getMonth()+1).toString().padStart(2,'0');
    const dia=f.getDate();
    const kg=parseFloat((r['kg']||0).toString().replace(',','.'))||0;
    const fac=parseFac(getCol(r,'Facturación','Facturacion',' Facturación')||0);
    if(!byMesDia[mes])byMesDia[mes]={};
    if(!byMesDia[mes][dia])byMesDia[mes][dia]={kg:0,fac:0,ventas:0,_g:[]};
    byMesDia[mes][dia].kg+=kg;
    byMesDia[mes][dia].fac+=fac;
    if(!(fac>0||kg>0))return;
    // Una "venta" = un cliente en un día, aunque lleve 2 o más alimentos.
    // Cliente por teléfono (columna TELEFONO o, si el encabezado no coincide, columna K) y nombre de respaldo.
    let tel=(getCol(r,'TELEFONO','Telefono','Teléfono','Celular')||'').toString().replace(/\D/g,'');
    if(tel.length<8){const k=(Object.values(r)[10]||'').toString().replace(/\D/g,'');tel=k.length>=8&&k.length<=13?k:'';}
    const nom=(r['CLIENTE']||r['Cliente']||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
    const gs=byMesDia[mes][dia]._g;
    const g=(tel||nom)?gs.find(x=>(tel&&x.tels.includes(tel))||(nom&&x.noms.includes(nom))):null;
    if(g){if(tel&&!g.tels.includes(tel))g.tels.push(tel);if(nom&&!g.noms.includes(nom))g.noms.push(nom);}
    else{gs.push({tels:tel?[tel]:[],noms:nom?[nom]:[]});byMesDia[mes][dia].ventas++;}
  });
  const meses=Object.keys(byMesDia).sort().slice(-3);
  diarioData={meses,byMesDia};
  renderMensualKg();
  renderComparativoTabla(byMesDia);
  initVentaDiaria();
}

// ── VENTA DIARIA (canal directo, hoja Ventas) ───────────────────────────────
function initVentaDiaria(){
  const sel=document.getElementById('diaria-mes-sel');
  if(!sel||!diarioData.byMesDia)return;
  const hoy=new Date();
  const mesActual=hoy.getFullYear()+'-'+(hoy.getMonth()+1).toString().padStart(2,'0');
  const NOM=['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const keys=Object.keys(diarioData.byMesDia).filter(k=>k<=mesActual&&k>='2023-01').sort().reverse();
  const prev=sel.value;
  sel.innerHTML=keys.map(k=>{const[y,m]=k.split('-');return'<option value="'+k+'">'+NOM[parseInt(m)]+' '+y+'</option>';}).join('');
  sel.value=keys.includes(prev)?prev:(keys.includes(mesActual)?mesActual:(keys[0]||''));
  renderVentaDiaria();
}

function renderVentaDiaria(){
  const el=document.getElementById('venta-diaria-tabla');
  const sel=document.getElementById('diaria-mes-sel');
  if(!el||!sel||!diarioData.byMesDia)return;
  const mes=sel.value;
  renderVentaDiariaAnalisis(mes);
  const dias=diarioData.byMesDia[mes]||{};
  const[y,mo]=mes.split('-').map(Number);
  const DOW=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const orden=(document.getElementById('diaria-orden-sel')||{}).value||'fecha';
  const lista=Object.keys(dias).map(Number).filter(d=>dias[d].fac>0||dias[d].kg>0).sort((a,b)=>orden==='fac'?dias[b].fac-dias[a].fac:orden==='kg'?dias[b].kg-dias[a].kg:orden==='ventas'?(dias[b].ventas||0)-(dias[a].ventas||0):b-a);
  if(!lista.length){el.innerHTML='<div style="padding:16px;text-align:center;color:var(--gris-dark);font-size:13px">Sin ventas cargadas en este mes</div>';return;}
  const fmt$=v=>'$ '+Math.round(v).toLocaleString('es-AR');
  const fmtKg=v=>v.toLocaleString('es-AR',{maximumFractionDigits:1});
  const th='padding:8px 14px;font-size:11px;font-weight:600;color:var(--gris-dark);text-transform:uppercase;border-bottom:2px solid var(--gris-med)';
  let totF=0,totK=0,totV=0;
  const tk=(f,v)=>v?fmt$(f/v):'—';
  let html='<table style="width:100%;border-collapse:collapse;font-size:13px">';
  html+='<thead><tr style="background:var(--gris)"><th style="'+th+';text-align:left">Día</th><th style="'+th+';text-align:right">Facturación</th><th style="'+th+';text-align:right">Kg</th><th style="'+th+';text-align:right">Ventas</th><th style="'+th+';text-align:right">Ticket prom.</th></tr></thead><tbody>';
  lista.forEach(d=>{
    const v=dias[d];totF+=v.fac;totK+=v.kg;totV+=v.ventas||0;
    html+='<tr style="border-bottom:1px solid var(--gris-med)"><td style="padding:9px 14px">'+DOW[new Date(y,mo-1,d).getDay()]+' '+d+'/'+mo+'</td><td style="padding:9px 14px;text-align:right">'+fmt$(v.fac)+'</td><td style="padding:9px 14px;text-align:right">'+fmtKg(v.kg)+'</td><td style="padding:9px 14px;text-align:right">'+(v.ventas||0)+'</td><td style="padding:9px 14px;text-align:right">'+tk(v.fac,v.ventas)+'</td></tr>';
  });
  html+='<tr style="background:var(--verde-bg);font-weight:700;color:var(--verde)"><td style="padding:10px 14px">Total mes</td><td style="padding:10px 14px;text-align:right">'+fmt$(totF)+'</td><td style="padding:10px 14px;text-align:right">'+fmtKg(totK)+'</td><td style="padding:10px 14px;text-align:right">'+totV+'</td><td style="padding:10px 14px;text-align:right">'+tk(totF,totV)+'</td></tr>';
  const n=lista.length;
  html+='<tr style="background:var(--gris);font-weight:600"><td style="padding:10px 14px">Promedio por día de venta <span style="font-weight:400;color:var(--gris-dark);font-size:12px">('+n+' días)</span></td><td style="padding:10px 14px;text-align:right">'+fmt$(totF/n)+'</td><td style="padding:10px 14px;text-align:right">'+fmtKg(totK/n)+'</td><td style="padding:10px 14px;text-align:right">'+(totV/n).toLocaleString('es-AR',{maximumFractionDigits:1})+'</td><td style="padding:10px 14px;text-align:right">'+tk(totF,totV)+'</td></tr>';
  html+='</tbody></table>';
  el.innerHTML=html;
}

// ── ANÁLISIS VENTA DIARIA: proyección, promedios, días de la semana, gráfico ──
const FERIADOS_AR={
  '2025-01-01':1,'2025-03-03':1,'2025-03-04':1,'2025-03-24':1,'2025-04-02':1,'2025-04-18':1,'2025-05-01':1,'2025-05-02':1,'2025-05-25':1,'2025-06-16':1,'2025-06-20':1,'2025-07-09':1,'2025-08-15':1,'2025-08-17':1,'2025-10-12':1,'2025-11-21':1,'2025-11-24':1,'2025-12-08':1,'2025-12-25':1,
  '2026-01-01':1,'2026-02-16':1,'2026-02-17':1,'2026-03-23':1,'2026-03-24':1,'2026-04-02':1,'2026-04-03':1,'2026-05-01':1,'2026-05-25':1,'2026-06-15':1,'2026-06-20':1,'2026-07-09':1,'2026-07-10':1,'2026-08-17':1,'2026-10-12':1,'2026-11-23':1,'2026-12-07':1,'2026-12-08':1,'2026-12-25':1
};
function vdKey(y,m,d){return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function vdNoLaborable(y,m,d){return new Date(y,m-1,d).getDay()===0||!!FERIADOS_AR[vdKey(y,m,d)];}
function vdMesPrev(mes,n){const[y,m]=mes.split('-').map(Number);const dt=new Date(y,m-1-n,1);return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');}
function vdTot(dias){let f=0,k=0,n=0,v=0;Object.keys(dias||{}).forEach(d=>{const x=dias[d];if(x.fac>0||x.kg>0){f+=x.fac;k+=x.kg;n++;v+=x.ventas||0;}});return{f,k,n,v};}
function vdM(v){return'$ '+(v/1e6).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})+'M';}
function vdPct(a,b){if(!b)return'';const p=Math.round((a-b)/b*100);return'<span style="color:'+(p>=0?'var(--verde)':'#c0392b')+';font-weight:600">'+(p>=0?'+':'')+p+'%</span>';}

function renderVentaDiariaAnalisis(mes){
  const el=document.getElementById('venta-diaria-analisis');
  if(!el||!diarioData.byMesDia)return;
  const B=diarioData.byMesDia;
  const dias=B[mes]||{};
  const[y,mo]=mes.split('-').map(Number);
  const ult=new Date(y,mo,0).getDate();
  const hoy=new Date();
  const esActual=hoy.getFullYear()===y&&hoy.getMonth()+1===mo;
  const DOW=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const DOW_L=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const ver=(document.getElementById('diaria-ver-sel')||{}).value||'fac';
  const fmtKg=v=>Math.round(v).toLocaleString('es-AR')+' kg';

  // Promedio por día de la semana: 3 meses previos al mes elegido
  const ventana=[vdMesPrev(mes,3),vdMesPrev(mes,2),vdMesPrev(mes,1)].filter(k=>B[k]);
  const dw={};
  ventana.forEach(k=>{const[yy,mm]=k.split('-').map(Number);Object.keys(B[k]).forEach(d=>{const v=B[k][d];if(!(v.fac>0||v.kg>0))return;const w=new Date(yy,mm-1,+d).getDay();dw[w]=dw[w]||{n:0,f:0,k:0,v:0};dw[w].n++;dw[w].f+=v.fac;dw[w].k+=v.kg;dw[w].v+=v.ventas||0;});});
  const prom={};Object.keys(dw).forEach(w=>{prom[w]={f:dw[w].f/dw[w].n,k:dw[w].k/dw[w].n,n:dw[w].n,v:dw[w].v/dw[w].n};});
  const NOMC=['','ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const ventanaTxt=ventana.length?(NOMC[+ventana[0].split('-')[1]]+'–'+NOMC[+ventana[ventana.length-1].split('-')[1]]):'sin historial';

  // Totales y proyección
  const t=vdTot(dias);
  const tPrev=vdTot(B[vdMesPrev(mes,1)]);
  let proyF=0,proyK=0,faltan=0;const proyDia={};
  if(esActual){
    for(let d=hoy.getDate();d<=ult;d++){
      if(vdNoLaborable(y,mo,d))continue;
      if(d===hoy.getDate()&&dias[d]&&dias[d].fac>0)continue;
      const p=prom[new Date(y,mo-1,d).getDay()];if(!p)continue;
      proyF+=p.f;proyK+=p.k;faltan++;proyDia[d]=p;
    }
  }
  const cierreF=t.f+proyF,cierreK=t.k+proyK;
  const promF=t.n?t.f/t.n:0,promK=t.n?t.k/t.n:0;
  const promPrevF=tPrev.n?tPrev.f/tPrev.n:0;
  let mejor=null;Object.keys(dias).forEach(d=>{if(dias[d].fac>0&&(!mejor||dias[d].fac>dias[mejor].fac))mejor=+d;});

  const tile=(lbl,val,sub)=>'<div style="background:var(--gris);border-radius:10px;padding:12px 14px"><div style="font-size:11px;color:var(--gris-dark);text-transform:uppercase;letter-spacing:.4px">'+lbl+'</div><div style="font-size:20px;font-weight:700;margin:4px 0 2px">'+val+'</div><div style="font-size:12px;color:var(--gris-dark)">'+sub+'</div></div>';
  let html='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:18px">';
  html+=tile('Vendido'+(esActual?' a hoy':''),vdM(t.f),fmtKg(t.k)+' · '+t.v+' ventas en '+t.n+' días');
  const tk=t.v?t.f/t.v:0,tkPrev=tPrev.v?tPrev.f/tPrev.v:0;
  if(esActual)html+=tile('Proyección cierre',vdM(cierreF),fmtKg(cierreK)+' · '+vdPct(cierreF,tPrev.f)+' vs mes ant.<br>faltan '+faltan+' días de venta');
  else html+=tile('Cierre vs mes anterior',vdPct(t.f,tPrev.f)||'—','mes anterior: '+vdM(tPrev.f));
  html+=tile('Promedio por día de venta',vdM(promF),fmtKg(promK)+' · '+(vdPct(promF,promPrevF)||'')+' vs mes ant.');
  html+=tile('Ticket promedio',tk?'$ '+Math.round(tk).toLocaleString('es-AR'):'—',(t.n?(t.v/t.n).toLocaleString('es-AR',{maximumFractionDigits:1})+' ventas por día · ':'')+(vdPct(tk,tkPrev)||'')+' vs mes ant.');
  html+=tile('Mejor día',mejor?DOW[new Date(y,mo-1,mejor).getDay()]+' '+mejor+'/'+mo:'—',mejor?vdM(dias[mejor].fac)+' · '+fmtKg(dias[mejor].kg)+' · '+(dias[mejor].ventas||0)+' ventas':'');
  html+='</div>';

  // Gráfico de barras del mes
  const val=d=>dias[d]?(ver==='kg'?dias[d].kg:dias[d].fac):0;
  const valP=d=>proyDia[d]?(ver==='kg'?proyDia[d].k:proyDia[d].f):0;
  const promV=ver==='kg'?promK:promF;
  let maxV=promV;for(let d=1;d<=ult;d++)maxV=Math.max(maxV,val(d),valP(d));maxV=maxV||1;
  const bw=26,H=190,top=22,base=H-26,W=ult*bw+10;
  const yv=v=>base-(v/maxV)*(base-top);
  const lbl=v=>ver==='kg'?Math.round(v)+' kg':(v/1e6).toLocaleString('es-AR',{maximumFractionDigits:2})+'M';
  let svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block" font-family="DM Sans,sans-serif">';
  for(let d=1;d<=ult;d++){
    const x=5+(d-1)*bw;const v=val(d);const nl=vdNoLaborable(y,mo,d);
    const wd=DOW[new Date(y,mo-1,d).getDay()];
    if(v>0){
      const c=v>=promV?VERDE:'#e0a526';
      svg+='<rect x="'+(x+3)+'" y="'+yv(v)+'" width="'+(bw-6)+'" height="'+(base-yv(v))+'" rx="3" fill="'+c+'"><title>'+wd+' '+d+'/'+mo+' — '+vdM(dias[d].fac)+' · '+fmtKg(dias[d].kg)+' · '+(dias[d].ventas||0)+' ventas</title></rect>';
    }else if(valP(d)>0){
      svg+='<rect x="'+(x+3)+'" y="'+yv(valP(d))+'" width="'+(bw-6)+'" height="'+(base-yv(valP(d)))+'" rx="3" fill="none" stroke="#9aa5a0" stroke-dasharray="3 2"><title>'+wd+' '+d+'/'+mo+' — proyectado '+lbl(valP(d))+'</title></rect>';
    }else if(nl){
      svg+='<text x="'+(x+bw/2)+'" y="'+(base-5)+'" text-anchor="middle" font-size="9" fill="#9aa5a0">'+(new Date(y,mo-1,d).getDay()===0?'D':'F')+'</text>';
    }
    svg+='<text x="'+(x+bw/2)+'" y="'+(base+13)+'" text-anchor="middle" font-size="10" fill="'+(nl?'#b5bdb9':'#5f6b66')+'">'+d+'</text>';
    svg+='<text x="'+(x+bw/2)+'" y="'+(base+23)+'" text-anchor="middle" font-size="7.5" fill="#9aa5a0">'+wd.charAt(0)+'</text>';
  }
  if(promV>0){svg+='<line x1="5" x2="'+(W-5)+'" y1="'+yv(promV)+'" y2="'+yv(promV)+'" stroke="#1d3557" stroke-width="1" stroke-dasharray="5 4"/>';
    svg+='<text x="'+(W-6)+'" y="'+(yv(promV)-4)+'" text-anchor="end" font-size="10" fill="#1d3557" font-weight="600">Promedio '+lbl(promV)+'</text>';}
  svg+='</svg>';
  html+='<div style="font-size:13px;font-weight:600;margin-bottom:6px">Ventas por día del mes <span style="font-weight:400;color:var(--gris-dark);font-size:12px">— '+(ver==='kg'?'kg':'pesos')+'</span></div>';
  html+=svg;
  html+='<div style="display:flex;flex-wrap:wrap;gap:14px;font-size:11px;color:var(--gris-dark);margin:6px 0 18px">'+
    '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+VERDE+';vertical-align:-1px"></span> Sobre el promedio</span>'+
    '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#e0a526;vertical-align:-1px"></span> Bajo el promedio</span>'+
    (esActual?'<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;border:1px dashed #9aa5a0;vertical-align:-1px"></span> Proyectado</span>':'')+
    '<span>D domingo · F feriado</span></div>';

  // Tramos del mes
  const tr=[[1,10,'Del 1 al 10'],[11,20,'Del 11 al 20'],[21,ult,'Del 21 al '+ult]].map(([a,b,n])=>{let f=0,k=0,c=0,v=0;for(let d=a;d<=b;d++){if(dias[d]&&dias[d].fac>0){f+=dias[d].fac;k+=dias[d].kg;c++;v+=dias[d].ventas||0;}}return{n,f,k,c,v,curso:esActual&&hoy.getDate()>=a&&hoy.getDate()<b};});
  const maxTr=Math.max(...tr.map(x=>x.c?x.f/x.c:0));
  html+='<div style="font-size:13px;font-weight:600;margin-bottom:8px">Momentos del mes <span style="font-weight:400;color:var(--gris-dark);font-size:12px">— promedio por día de venta en cada tramo</span></div>';
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:18px">';
  tr.forEach(x=>{const p=x.c?x.f/x.c:0;const top1=p>0&&p===maxTr;
    html+='<div style="border:1px solid '+(top1?'var(--verde-claro)':'var(--gris-med)')+';background:'+(top1?'var(--verde-bg)':'#fff')+';border-radius:10px;padding:10px 14px">'+
      '<div style="font-size:12px;color:var(--gris-dark)">'+x.n+(x.curso?' (en curso)':'')+'</div>'+
      '<div style="font-size:17px;font-weight:700;margin:3px 0">'+(x.c?vdM(p)+' /día':'—')+'</div>'+
      '<div style="font-size:12px;color:var(--gris-dark)">'+vdM(x.f)+' · '+fmtKg(x.k)+' · '+x.v+' ventas · '+x.c+' días</div></div>';});
  html+='</div>';

  // Ranking días de la semana
  const ws=Object.keys(prom).map(Number).sort((a,b)=>prom[b].f-prom[a].f);
  if(ws.length){
    const maxF=prom[ws[0]].f;
    html+='<div style="font-size:13px;font-weight:600;margin-bottom:8px">Demanda por día de la semana <span style="font-weight:400;color:var(--gris-dark);font-size:12px">— promedio '+ventanaTxt+'</span></div>';
    html+='<div style="margin-bottom:18px">';
    ws.forEach((w,i)=>{const p=prom[w];const tag=i===0?'<span class="tag-ok" style="font-size:10px;padding:2px 8px;border-radius:20px;margin-left:6px">Mayor demanda</span>':(i===ws.length-1?'<span class="tag-bad" style="font-size:10px;padding:2px 8px;border-radius:20px;margin-left:6px">Menor demanda</span>':'');
      html+='<div style="display:grid;grid-template-columns:150px 1fr 90px 70px 90px;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--gris-med);font-size:13px">'+
        '<span>'+DOW_L[w]+tag+'</span>'+
        '<div style="background:var(--gris);border-radius:4px;height:14px;overflow:hidden"><div style="width:'+Math.round(p.f/maxF*100)+'%;height:100%;background:'+(i===0?VERDE:i===ws.length-1?'#e0a526':VERDE_CL)+'"></div></div>'+
        '<span style="text-align:right;font-weight:600">'+vdM(p.f)+'</span>'+
        '<span style="text-align:right;color:var(--gris-dark)">'+fmtKg(p.k)+'</span>'+
        '<span style="text-align:right;color:var(--gris-dark)">'+p.v.toLocaleString('es-AR',{maximumFractionDigits:1})+' ventas</span></div>';});
    html+='</div>';
  }
  html+='<div style="font-size:13px;font-weight:600;margin-bottom:4px">Detalle por día</div>';
  el.innerHTML=html;
}

function renderComparativoTabla(byMesDia){
  const el=document.getElementById('comparativo-tabla');
  if(!el)return;
  const hoy=new Date();
  const diaHoy=hoy.getDate();
  const meses=Object.keys(byMesDia).sort().slice(-3);
  const MESES_NOM=['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Calcular acumulado hasta diaHoy para cada mes
  const datos=meses.map(function(m){
    let facAcum=0,kgAcum=0;
    for(var d=1;d<=diaHoy;d++){
      if(byMesDia[m]&&byMesDia[m][d]){
        facAcum+=byMesDia[m][d].fac;
        kgAcum+=byMesDia[m][d].kg;
      }
    }
    const[y,mo]=m.split('-');
    return{mes:MESES_NOM[parseInt(mo)]+' '+y,fac:facAcum,kg:kgAcum,key:m};
  });

  const mesActual=hoy.getFullYear()+'-'+(hoy.getMonth()+1).toString().padStart(2,'0');
  
  let html='<div style="margin-top:8px">';
  html+='<div style="font-size:12px;color:var(--gris-dark);margin-bottom:12px">Acumulado al día <strong>'+diaHoy+'</strong> de cada mes</div>';
  
  // Tabla
  html+='<table style="width:100%;border-collapse:collapse;font-size:13px">';
  html+='<thead><tr style="background:var(--gris)">';
  html+='<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--gris-dark);text-transform:uppercase;border-bottom:2px solid var(--gris-med)">Métrica</th>';
  datos.forEach(function(d){
    const isActual=d.key===mesActual;
    html+='<th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:600;color:'+(isActual?'var(--verde)':'var(--gris-dark)')+';text-transform:uppercase;border-bottom:2px solid var(--gris-med)">'+(isActual?'★ ':'')+d.mes+'</th>';
  });
  html+='</tr></thead><tbody>';

  // Fila facturación
  html+='<tr style="border-bottom:1px solid var(--gris-med)">';
  html+='<td style="padding:14px;font-weight:600">Facturación</td>';
  datos.forEach(function(d,i){
    const isActual=d.key===mesActual;
    const prev=i>0?datos[i-1].fac:null;
    const diff=prev&&prev>0?Math.round((d.fac-prev)/prev*100):null;
    const diffStr=diff!==null?(' <span style="font-size:11px;color:'+(diff>=0?'var(--verde)':'#c0392b')+'">'+(diff>=0?'+':'')+diff+'%</span>'):'';
    html+='<td style="padding:14px;text-align:right;font-weight:'+(isActual?'700':'500')+';color:'+(isActual?'var(--verde)':'var(--texto)')+'">$'+(d.fac/1e6).toFixed(2)+'M'+diffStr+'</td>';
  });
  html+='</tr>';

  // Fila kg
  html+='<tr>';
  html+='<td style="padding:14px;font-weight:600">Kg vendidos</td>';
  datos.forEach(function(d,i){
    const isActual=d.key===mesActual;
    const prev=i>0?datos[i-1].kg:null;
    const diff=prev&&prev>0?Math.round((d.kg-prev)/prev*100):null;
    const diffStr=diff!==null?(' <span style="font-size:11px;color:'+(diff>=0?'var(--verde)':'#c0392b')+'">'+(diff>=0?'+':'')+diff+'%</span>'):'';
    html+='<td style="padding:14px;text-align:right;font-weight:'+(isActual?'700':'500')+';color:'+(isActual?'var(--verde)':'var(--texto)')+'">'+d.kg.toLocaleString('es-AR')+'kg'+diffStr+'</td>';
  });
  html+='</tr>';

  html+='</tbody></table></div>';
  el.innerHTML=html;
}

function renderGraficoDiario(){
  if(!diarioData.meses)return;
  const {meses,byMesDia}=diarioData;
  const COLORES=['#C9A84C','#1565C0','#2e7d32'];
  const W=900,H=160,PAD_L=50,PAD_R=10,PAD_T=10,PAD_B=30;
  const DIAS=31;

  ['fac','kg'].forEach(function(modo){
    let maxVal=0;
    meses.forEach(function(m){
      for(var d=1;d<=31;d++){
        const v=(byMesDia[m]&&byMesDia[m][d])?byMesDia[m][d][modo]:0;
        if(v>maxVal)maxVal=v;
      }
    });
    if(!maxVal)return;

    let html='<div style="font-size:11px;color:#888;margin-bottom:8px">'+
      meses.map(function(m,i){
        const[y,mo]=m.split('-');
        return'<span style="display:inline-flex;align-items:center;margin-right:16px"><svg width="24" height="3" style="margin-right:4px"><line x1="0" y1="1.5" x2="24" y2="1.5" stroke="'+COLORES[i]+'" stroke-width="2.5"/></svg>'+MESES_NOM_ES[parseInt(mo)-1]+' '+y+'</span>';
      }).join('')+'</div>';

    html+='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;overflow:visible" xmlns="http://www.w3.org/2000/svg">';

    const nLines=4;
    for(var li=0;li<=nLines;li++){
      const y=PAD_T+(H-PAD_T-PAD_B)*li/nLines;
      const val=maxVal*(1-li/nLines);
      const label=modo==='fac'?('$'+Math.round(val/1000)+'K'):(Math.round(val)+'kg');
      html+='<line x1="'+PAD_L+'" y1="'+y+'" x2="'+(W-PAD_R)+'" y2="'+y+'" stroke="#e5e7eb" stroke-width="1"/>';
      html+='<text x="'+(PAD_L-4)+'" y="'+(y+4)+'" text-anchor="end" font-size="9" fill="#aaa">'+label+'</text>';
    }

    for(var dia=1;dia<=DIAS;dia++){
      const x=PAD_L+(dia-1)*(W-PAD_L-PAD_R)/(DIAS-1);
      if(dia===1||dia%5===0||dia===31){
        html+='<text x="'+x+'" y="'+(H-PAD_B+14)+'" text-anchor="middle" font-size="9" fill="#aaa">'+dia+'</text>';
      }
    }

    meses.forEach(function(m,mi){
      const puntos=[];
      for(var dia=1;dia<=DIAS;dia++){
        const v=(byMesDia[m]&&byMesDia[m][dia])?byMesDia[m][dia][modo]:0;
        const x=PAD_L+(dia-1)*(W-PAD_L-PAD_R)/(DIAS-1);
        const y=PAD_T+(H-PAD_T-PAD_B)*(1-v/maxVal);
        puntos.push({x,y,v,dia});
      }
      const d=puntos.map(function(p,i){return(i===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ');
      html+='<path d="'+d+'" fill="none" stroke="'+COLORES[mi]+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
      puntos.forEach(function(p){
        if(p.v>0){
          const label=modo==='fac'?('$'+Math.round(p.v/1000)+'K'):(p.v+'kg');
          html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="white" stroke="'+COLORES[mi]+'" stroke-width="2"><title>'+MESES_NOM_ES[parseInt(m.split('-')[1])-1]+' '+p.dia+': '+label+'</title></circle>';
        }
      });
    });

    html+='</svg>';
    document.getElementById('grafico-diario-'+modo).innerHTML=html;
  });
}

// ── TOP PRODUCTOS ─────────────────────────────────────────────────────────────
let prodData={};
function buildTopProductos(vRows){
  // Normalizar nombre para agrupar: minusc, sin tildes, colapsar espacios, aliases
  function normProd(s){
    var n=(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9+]/g,' ').replace(/\s+/g,' ').trim();
    var W={'adulto':'adult','adu':'adult','cachorro':'puppy','peque':'small','mediano':'medium','med ':'medium ','grande':'large','maxi ':'maxi ','mini ':'mini ','perro':'perro','gato':'gato','cordero':'cordero','castrado':'castrado'};
    Object.keys(W).forEach(function(k){n=n.replace(new RegExp('\\b'+k+'\\b','g'),W[k]);});
    return n;
  }
  function toTitleCase(s){return(s||'').split(' ').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase();}).join(' ');}

  var byMesProd={};
  var prodRowsArr=[];

  vRows.forEach(function(r){
    var fecha=parseFecha(r['FECHA']||r['Fecha']||'');
    if(!fecha)return;
    var mes=fecha.getFullYear()+'-'+(fecha.getMonth()+1).toString().padStart(2,'0');
    var fechaStr=fecha.getFullYear()+'-'+(fecha.getMonth()+1).toString().padStart(2,'0')+'-'+fecha.getDate().toString().padStart(2,'0');
    var marca=normMarca(r['Marca']||'');if(marca==='Sin marca')marca='';
    var prod=(r['producto']||'').trim();
    var kg=parseFloat((r['kg']||0).toString().replace(',','.'))||0;
    var fac=parseFac(getCol(r,'Facturación','Facturacion',' Facturación')||0);
    if(!marca&&!prod)return;

    // Key normalizado para agrupar sin duplicados
    var normKey=normProd(marca)+'||'+normProd(prod);
    // Nombre display: title case
    var displayNombre=toTitleCase(marca)+(marca&&prod?' - ':'')+toTitleCase(prod);

    if(!byMesProd[mes])byMesProd[mes]={};
    if(!byMesProd[mes][normKey])byMesProd[mes][normKey]={nombre:displayNombre,normKey:normKey,ventas:0,kg:0,fac:0};
    else{
      // Preferir el nombre más corto/limpio como display
      if(displayNombre.length<byMesProd[mes][normKey].nombre.length)byMesProd[mes][normKey].nombre=displayNombre;
    }
    byMesProd[mes][normKey].ventas++;
    byMesProd[mes][normKey].kg+=kg;
    byMesProd[mes][normKey].fac+=fac;

    prodRowsArr.push({fecha:fechaStr,mes:mes,marca:marca,prod:prod,normKey:normKey,displayNombre:displayNombre,kg:kg,fac:fac});
  });

  prodData=byMesProd;
  window.prodRows=prodRowsArr;

  var sel=document.getElementById('prod-mes-sel');
  var meses=Object.keys(byMesProd).sort().reverse();
  sel.innerHTML='<option value="todos">Todos los meses</option>'+meses.map(function(m){
    var parts=m.split('-');
    var nom=MESES_NOM_ES[parseInt(parts[1])-1]+' '+parts[0];
    return'<option value="'+m+'">'+nom+'</option>';
  }).join('');
  renderTopProductos();
}
function renderTopProductos(){
  var sel=document.getElementById('prod-mes-sel').value;
  var desde=(document.getElementById('prod-desde')||{}).value||'';
  var hasta=(document.getElementById('prod-hasta')||{}).value||'';
  var usarRango=desde||hasta;
  // Agrupar venta por venta: si matchea un SKU se agrupa por SKU (unifica Hypo / Hypoallergenic / Hypoallergenic Canine), si no por nombre normalizado
  var matchCache={};
  function skuDe(r){
    if(typeof skMatchProduct==='undefined')return null;
    var ck=r.normKey+'|'+r.kg;
    if(!(ck in matchCache)){var res=skMatchProduct(r.marca,r.prod,r.kg);matchCache[ck]=res?res.product:null;}
    return matchCache[ck];
  }
  function tc(s){return(s||'').toLowerCase().split(' ').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join(' ');}
  var agg={};
  (window.prodRows||[]).forEach(function(r){
    if(usarRango){if(desde&&r.fecha<desde)return;if(hasta&&r.fecha>hasta)return;}
    else if(sel!=='todos'&&r.mes!==sel)return;
    var sp=skuDe(r);
    var key=sp?'sku:'+sp.sku:'n:'+r.normKey;
    if(!agg[key]){
      var nom=r.displayNombre;
      if(sp){var mk=r.marca?tc(r.marca):'';var pn=tc(sp.nombre);nom=(mk&&pn.toLowerCase().indexOf(mk.toLowerCase())!==0?mk+' - ':'')+pn+' '+String(sp.kg).replace('.',',')+'kg';}
      agg[key]={nombre:nom,normKey:key,sku:sp?sp.sku:null,ventas:0,kg:0,fac:0};
    }
    agg[key].ventas++;agg[key].kg+=r.kg;agg[key].fac+=r.fac;
  });
  const lista=Object.values(agg).sort(function(a,b){return b.fac-a.fac;}).slice(0,50);
  const tb=document.getElementById('top-productos');
  if(!lista.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark)">Sin datos</div>';return;}
  // Calcular stock actual desde skMovs
  var stockMap={};
  if(typeof skMovs!=='undefined'){
    skMovs.forEach(function(mv){
      if(!stockMap[mv.sku])stockMap[mv.sku]=0;
      if(mv.type==='ing')stockMap[mv.sku]+=mv.qty;
      else stockMap[mv.sku]-=mv.qty;
    });
  }
  var listaFinal=lista;
  tb.innerHTML=listaFinal.map(function(p,i){
    const bg=i%2===0?'var(--gris)':'transparent';
    var skuStr=p.sku?'<span style="font-family:monospace;font-size:10px;color:var(--azul-med)">'+p.sku+'</span>':'<span style="font-size:11px;color:var(--gris-dark)">—</span>';
    var stockActual=p.sku&&stockMap[p.sku]!==undefined?stockMap[p.sku]:null;
    var stockStr=stockActual!==null?'<span style="font-weight:600;color:'+(stockActual>2?'var(--verde)':stockActual>0?'#d97706':'#c0392b')+'">'+stockActual+'</span>':'<span style="color:var(--gris-dark)">—</span>';
    var reponer=stockActual!==null?p.ventas-stockActual:null;
    var reponerStr=reponer!==null&&reponer>0?'<span style="font-weight:700;color:#c0392b">+'+reponer+'</span>':'<span style="color:var(--verde)">✓</span>';
    return'<div class="table-row" style="grid-template-columns:2fr 110px 70px 70px 100px 80px 80px;background:'+bg+'"><span style="font-size:12px;font-weight:'+(i<3?'700':'500')+'" title="'+p.nombre+'">'+p.nombre+'</span><span>'+skuStr+'</span><span style="text-align:center;font-size:12px">'+p.ventas+'</span><span style="text-align:center;font-size:12px">'+p.kg.toLocaleString('es-AR')+'kg</span><span style="text-align:right;font-size:12px;font-weight:600">$'+Math.round(p.fac/1000).toLocaleString('es-AR')+'K</span><span style="text-align:center">'+stockStr+'</span><span style="text-align:center">'+reponerStr+'</span></div>';
  }).join('');
}

