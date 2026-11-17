// ── Precios: buscador rápido sobre precios.json (generado desde wc426.xlsx) ──
let PRECIOS=null,PR_ESP='Todos',PR_COSTOS=null;
function prB64(t){return Uint8Array.from(atob(t),c=>c.charCodeAt(0));}
async function prDescifrar(clave){
  const x=PRECIOS.x;const enc=new TextEncoder();
  const base=await crypto.subtle.importKey('raw',enc.encode(clave),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:prB64(x.s),iterations:x.n,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:prB64(x.i)},key,prB64(x.c));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function prDesbloquear(clave){
  const inp=document.getElementById('pr-clave');clave=clave||inp.value;
  if(!clave||!PRECIOS||!PRECIOS.x)return;
  try{PR_COSTOS=await prDescifrar(clave);
    try{sessionStorage.setItem('wk_pr_clave',clave);}catch(e){}
    document.getElementById('pr-lock').innerHTML='<span class="pr-imp">Impuestos s/venta <input id="pr-imp" type="number" step="0.5" min="0" value="'+prImp()+'" oninput="prSetImp(this.value)">%</span><button class="pr-chip on" onclick="prBloquear()">Ocultar costos</button>';prRender();
  }catch(e){document.getElementById('pr-err').textContent='Clave incorrecta';inp.select();}
}
function prImp(){let v=5;try{const s=localStorage.getItem('wk_pr_imp');if(s!==null&&s!=='')v=parseFloat(s);}catch(e){}return isNaN(v)?5:v;}
function prSetImp(v){try{localStorage.setItem('wk_pr_imp',v);}catch(e){}prRender();}
function prBloquear(){PR_COSTOS=null;try{sessionStorage.removeItem('wk_pr_clave');}catch(e){}
  document.getElementById('pr-lock').innerHTML='<input id="pr-clave" type="password" placeholder="Clave de costos" onkeydown="if(event.key===\'Enter\')prDesbloquear()"><button class="pr-chip" onclick="prDesbloquear()">Ver costos</button><span class="err" id="pr-err"></span>';prRender();}
const PR_SIN={cachorro:['cachorro','puppy','junior','kitten'],puppy:['puppy','cachorro'],adulto:['adult'],adult:['adult'],gato:['gato','cat'],cat:['cat','gato'],perro:['perro','dog'],dog:['dog','perro'],rc:['royal canin'],pp:['pro plan'],chico:['mini','small','pequeñ','toy'],pequeño:['mini','small','pequeñ'],grande:['large','maxi','grande','giant'],mediano:['medium','mediano'],castrado:['castrado','sterilized'],light:['light','weight','reduced','fit','satiety']};
function prN(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
function prKg(k){return (k%1?String(k).replace('.',','):String(k))+' kg';}
function prArs(n){return '$ '+Math.round(n).toLocaleString('es-AR');}
async function prInit(){
  const q=document.getElementById('pr-q');
  if(!PRECIOS){
    try{const r=await fetch('precios.json?v='+Date.now());PRECIOS=await r.json();
      PRECIOS.items.forEach(x=>{x.h=prN([x.m,x.l,x.p,x.e,x.s,x.k+'kg',x.k+' kg',String(x.k).replace('.',',')+'kg'].join(' '));});
    }catch(e){document.getElementById('pr-meta').textContent='No se pudo cargar la lista de precios';return;}
  }
  prRender();setTimeout(()=>q.focus(),30);
  if(!PR_COSTOS){let c=null;try{c=sessionStorage.getItem('wk_pr_clave');}catch(e){}if(c)prDesbloquear(c);}
}
function prEsp(b){PR_ESP=b.dataset.e;document.querySelectorAll('.pr-chip').forEach(x=>x.classList.toggle('on',x===b));prRender();}
function prTok(t,h){const alts=PR_SIN[t]?PR_SIN[t].map(prN):[t];if(/^\d+([.,]\d+)?$/.test(t)){const k=t.replace(',','.');return h.includes(k+'kg')||h.includes(t);}return alts.some(a=>h.includes(a));}
function prRender(){
  if(!PRECIOS)return;
  const toks=prN(document.getElementById('pr-q').value).replace(/\s*kg\b/g,'').split(/\s+/).filter(Boolean);
  const hits=PRECIOS.items.filter(x=>(PR_ESP==='Todos'||x.e===PR_ESP)&&toks.every(t=>prTok(t,x.h)));
  const g=new Map();hits.forEach(x=>{const key=x.m+'|'+x.p+'|'+x.e;if(!g.has(key))g.set(key,[]);g.get(key).push(x);});
  const v=new Date(PRECIOS.vigente+'T12:00').toLocaleDateString('es-AR');
  document.getElementById('pr-meta').textContent=hits.length+' presentaciones · lista vigente desde '+v;
  const out=[];let n=0;
  for(const arr of g.values()){
    if(++n>80){out.push('<div class="pr-vacio">Hay más resultados: afiná la búsqueda.</div>');break;}
    arr.sort((a,b)=>a.k-b.k);const f=arr[0];
    out.push('<div class="pr-group"><div class="pr-name">'+f.m+' '+f.p+'</div><div class="pr-sub">'+f.e+(f.l?' · '+f.l:'')+'</div>'+
      arr.map(x=>{const co=PR_COSTOS?PR_COSTOS[x.s+'|'+x.k.toFixed(1)]:null;let cc='';if(PR_COSTOS){if(co){const imp=prImp()/100,neto=x.t-co-x.t*imp;cc='<span class="pr-pr cost"><small>Costo</small>'+prArs(co)+'</span><span class="pr-pr"><small>Rentabilidad</small>'+Math.round((x.t/co-1)*100)+'%</span><span class="pr-pr neto"><small>Margen neto</small>'+prArs(neto)+' · '+Math.round(neto/x.t*100)+'%</span>';}else{cc='<span class="pr-pr cost"><small>Costo</small>—</span><span></span><span></span>';}}return '<div class="pr-row'+(PR_COSTOS?' wc':'')+'"><span class="pr-kg">'+prKg(x.k)+'</span><span class="pr-pr t"><small>Transferencia</small>'+prArs(x.t)+'</span><span class="pr-pr"><small>Tarjeta</small>'+prArs(x.c)+'</span>'+cc+'<span class="pr-sku" title="'+x.s+'">'+x.s+'</span><button class="pr-copy" onclick="prCopy(this,\''+x.s+'\','+x.k+')">Copiar</button></div>';}).join('')+'</div>');
  }
  document.getElementById('pr-res').innerHTML=out.join('')||'<div class="pr-vacio">No encontré nada con esa búsqueda.</div>';
}
function prCopy(b,sku,k){
  const x=PRECIOS.items.find(i=>i.s===sku&&i.k===k);
  const txt=x.m+' '+x.p+' '+prKg(x.k)+': '+prArs(x.t)+' por transferencia / '+prArs(x.c)+' con tarjeta de crédito';
  navigator.clipboard.writeText(txt).then(()=>{b.textContent='Copiado';b.classList.add('ok');setTimeout(()=>{b.textContent='Copiar';b.classList.remove('ok');},1400);});
}

