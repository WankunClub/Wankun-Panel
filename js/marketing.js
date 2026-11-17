// ── MARKETING ─────────────────────────────────────────────────────────────────
const MKT_SYS='Sos el agente de marketing de Wankun Club, pet shop de alimento premium en Pilar, Buenos Aires. Dueno: Nacho. Facturacion historica $106.8M. Objetivo mensual +15%. Zona: radio 15 km. Canales: Instagram (161 seguidores), WhatsApp, Google Maps. Respondés en espanol rioplatense, sos directo y practico.';
let mktHist=[];
async function mktSend(){
  const inp=document.getElementById('mkt-input'),txt=inp.value.trim();if(!txt)return;
  inp.value='';inp.style.height='40px';
  mktAdd('user',txt);mktTyping(true);
  mktHist.push({role:'user',content:txt});
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:MKT_SYS,messages:mktHist})});
    const data=await res.json();
    const reply=data.content?.[0]?.text||'Error de conexion.';
    mktHist.push({role:'assistant',content:reply});
    mktTyping(false);mktAdd('agent',reply);
  }catch(e){mktTyping(false);mktAdd('agent','Error de conexion.');}
}
function mktAdd(role,text){
  const msgs=document.getElementById('mkt-msgs');
  const div=document.createElement('div');div.className='msg '+role;
  const av=document.createElement('div');av.className='msg-av';av.textContent=role==='agent'?'WC':'N';
  const bubble=document.createElement('div');bubble.className='msg-bubble';
  bubble.innerHTML=text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  div.appendChild(av);div.appendChild(bubble);msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight;
}
function mktTyping(show){
  document.getElementById('mkt-typing')&&document.getElementById('mkt-typing').remove();
  if(!show)return;
  const msgs=document.getElementById('mkt-msgs');
  const div=document.createElement('div');div.className='msg agent';div.id='mkt-typing';
  div.innerHTML='<div class="msg-av">WC</div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
  msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight;
}
function mktQuick(t){document.getElementById('mkt-input').value=t;mktSend();}
function mktKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();mktSend();}}
function mktResize(el){el.style.height='40px';el.style.height=Math.min(el.scrollHeight,120)+'px';}

