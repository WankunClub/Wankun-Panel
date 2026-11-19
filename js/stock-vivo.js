// ── STOCK VIVO (lee la pestaña Stock del Sheet Ventas) ───────────────────────
const SKV_URL='https://docs.google.com/spreadsheets/d/12hLk00E3eT9ORZyrk-gHw7dQgUhGJhA1iSbLn5genVI/gviz/tq?tqx=out:csv&gid=900014&range=A2:N400';
var skvRows=[],skvSort='marca',skvAt=null;

function skvNum(s){if(s==null)return 0;s=String(s).replace(/[$\s]/g,'');if(!s)return 0;if(s.indexOf(',')>=0)s=s.replace(/\./g,'').replace(',','.');else if(/\.\d{3}(\D|$)/.test(s))s=s.replace(/\./g,'');var n=parseFloat(s);return isNaN(n)?0:n;}
function skvParse(text){
  var out=[];text.split('\n').forEach(function(line){
    if(!line.trim())return;var v=[],cur='',q=false;
    for(var i=0;i<line.length;i++){var c=line[i];if(c==='"'){q=!q;}else if(c===','&&!q){v.push(cur);cur='';}else cur+=c;}
    v.push(cur);if(!v[0]||v[0]==='SKU')return;
    out.push({sku:v[0],marca:v[1],prod:v[2],kg:v[3],conteo:skvNum(v[4]),ing:skvNum(v[5]),vta:skvNum(v[6]),ml:skvNum(v[7]),aj:skvNum(v[8]),st:skvNum(v[9]),costo:skvNum(v[10]),vcosto:skvNum(v[11]),precio:skvNum(v[12]),vventa:skvNum(v[13])});
  });return out;
}
function skvMoney(n){return '$'+Math.round(n).toLocaleString('es-AR');}

async function skvLoad(){
  var st=document.getElementById('skv-status');if(st)st.textContent='Leyendo el Sheet...';
  try{var r=await fetch(SKV_URL+'&t='+Date.now());if(!r.ok)throw new Error('HTTP '+r.status);
    skvRows=skvParse(await r.text());skvAt=new Date();skvRender();
    if(st)st.textContent='Actualizado '+skvAt.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})+' · fuente: Sheet Ventas, pestaña Stock';
  }catch(e){if(st)st.textContent='No pude leer el Sheet ('+e.message+'). Probá de nuevo.';}
}

function skvMovido(r){return r.conteo||r.ing||r.vta||r.ml||r.aj;}
function skvRevisar(r){return r.st<0||(r.st>0&&!r.costo);}

function skvRender(){
  var rows=skvRows;
  var q=((document.getElementById('skv-filtro')||{}).value||'').toLowerCase();
  var est=((document.getElementById('skv-estado')||{}).value)||'';
  var marca=((document.getElementById('skv-marca')||{}).value)||'';
  // métricas
  var con=rows.filter(function(r){return r.st>0;});
  var agot=rows.filter(function(r){return r.st<=0&&skvMovido(r);});
  var bolsas=con.reduce(function(a,r){return a+r.st;},0);
  var vc=rows.reduce(function(a,r){return a+r.vcosto;},0),vv=rows.reduce(function(a,r){return a+r.vventa;},0);
  var set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  set('skv-m-bolsas',bolsas);set('skv-m-con',con.length);set('skv-m-agot',agot.length);
  set('skv-m-costo',skvMoney(vc));set('skv-m-revisar',rows.filter(skvRevisar).length);set('skv-m-costoiva',skvMoney(vc*1.21));set('skv-m-venta',skvMoney(vv));
  // marcas
  var ms=document.getElementById('skv-marca');
  if(ms&&ms.options.length<=1){Array.from(new Set(rows.map(function(r){return r.marca;}))).sort().forEach(function(m){var o=document.createElement('option');o.value=m;o.textContent=m;ms.appendChild(o);});}
  var f=rows.filter(function(r){
    if(marca&&r.marca!==marca)return false;
    if(q&&(r.prod+' '+r.sku+' '+r.marca).toLowerCase().indexOf(q)<0)return false;
    if(est==='con'&&r.st<=0)return false;
    if(est==='agot'&&!(r.st<=0&&skvMovido(r)))return false;
    if(est==='revisar'&&!skvRevisar(r))return false;
    if(est==='bajo'&&!(r.st>0&&r.st<=3))return false;
    if(est===''&&!(r.st!==0||skvMovido(r)))return false;
    return true;});
  var s=skvSort;
  f.sort(function(a,b){if(s==='stock')return b.st-a.st;if(s==='valor')return b.vcosto-a.vcosto;return (a.marca+a.prod+a.kg).localeCompare(b.marca+b.prod+b.kg);});
  var cols='2.2fr 1.3fr 50px 55px 55px 55px 55px 55px 60px 95px 110px 95px 110px';
  var h=f.map(function(r){
    var c=r.st<=0?'#c0392b':(r.st<=3?'#b7791f':'#1e7e34');
    return '<div class="table-row" style="grid-template-columns:'+cols+'">'+
      '<span><b style="font-weight:500">'+r.prod+'</b> <span style="color:#999;font-size:11px">'+r.marca+'</span></span>'+
      '<span style="font-family:monospace;font-size:11px;color:#888">'+r.sku+'</span><span>'+r.kg+'</span>'+
      '<span>'+r.conteo+'</span><span>'+r.ing+'</span><span>'+r.vta+'</span><span>'+r.ml+'</span><span>'+r.aj+'</span>'+
      '<span style="font-weight:700;color:'+c+'">'+r.st+'</span>'+
      (r.st>0&&!r.costo?'<span style="color:#c0392b;font-weight:600">SIN COSTO</span>':'<span>'+(r.costo?skvMoney(r.costo):'—')+'</span>')+
      '<span>'+(r.vcosto?skvMoney(r.vcosto):'—')+'</span>'+
      '<span>'+(r.precio?skvMoney(r.precio):'—')+'</span>'+
      '<span>'+(r.vventa?skvMoney(r.vventa):'—')+'</span></div>';}).join('');
  var t=document.getElementById('skv-tabla');if(t)t.innerHTML=h||'<div style="padding:20px;color:#999;font-size:13px">Sin resultados</div>';
  set('skv-count',f.length+' productos');
}
function skvOrden(s){skvSort=s;skvRender();}
