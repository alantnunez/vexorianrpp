// VEXORIAN RP · V5 · teléfono: mensajes privados (solo remitente y destinatario), contactos y jugadores
const PH={open:false,tab:"msgs",peer:null,peerName:"",peerPid:null,q:"",results:[]};
const hhmm=t=>new Date(t).toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit",hour12:false});
const dayLbl=t=>{const d=new Date(t),n=new Date();return d.toDateString()===n.toDateString()?"Hoy":d.toLocaleDateString("es",{day:"2-digit",month:"short"})};
function togglePhone(){
  if(!started||player.dead||HOSPS.locked)return;
  if(!player.hasPhone){toast("Necesitas un teléfono. Cómpralo en el supermercado.");return}
  PH.open=!PH.open;NET.dmOpen=PH.open;document.getElementById("phone").style.display=PH.open?"flex":"none";
  if(PH.open){PH.peer=null;phoneRender();dmPollLoop()}else dmPollLoop();
}
function phoneRefresh(){if(PH.open)phoneRender(true)}
function phoneTab(t){PH.tab=t;PH.peer=null;phoneRender()}
function convos(){
  const m=new Map();
  NET.dms.forEach(x=>{const c=m.get(x.peer)||{peer:x.peer,name:x.peerName,last:x,unread:0};c.last=x;c.name=x.peerName||c.name;if(x.peerPid!=null)c.pid=x.peerPid;if(!x.mine&&!x.read)c.unread++;m.set(x.peer,c)});
  return [...m.values()].sort((a,b)=>b.last.at-a.last.at);
}
function isOnline(id){return [...NET.others.values()].some(o=>o.id===id)||(NET.contacts.find(c=>c.id===id)||{}).online}
function phoneRender(keep){
  const body=document.getElementById("ph-body"),top=document.getElementById("ph-title"),send=document.getElementById("ph-send"),back=document.getElementById("ph-back");
  document.querySelectorAll("#ph-tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===PH.tab&&!PH.peer));
  const prevScroll=body.scrollTop;
  body.innerHTML="";back.style.display=PH.peer?"inline-block":"none";send.style.display=PH.peer?"flex":"none";
  if(PH.peer){
    top.innerHTML=`<span class="dot ${isOnline(PH.peer)?"":"off"}"></span> ${esc(PH.peerName)}${PH.peerPid!=null?` <em class="pid">#${PH.peerPid}</em>`:""}<small>${isOnline(PH.peer)?"en línea":"desconectado"}</small>`;
    const msgs=NET.dms.filter(m=>m.peer===PH.peer).sort((a,b)=>a.at-b.at);let lastDay="";
    msgs.forEach(m=>{
      const dl=dayLbl(m.at);if(dl!==lastDay){lastDay=dl;const s=document.createElement("div");s.className="day";s.textContent=dl;body.appendChild(s)}
      const d=document.createElement("div");d.className="msg "+(m.mine?"me":"them")+(m.pending?" pend":"");
      d.innerHTML=`<span></span><time>${hhmm(m.at)}${m.mine?(m.pending?" · enviando":" ✓"):""}</time>`;d.firstChild.textContent=m.msg;body.appendChild(d);
    });
    if(!msgs.length)body.innerHTML='<div class="ph-empty">Aún no hay mensajes.<br>¡Saluda a '+esc(PH.peerName)+'!</div>';
    body.scrollTop=body.scrollHeight;dmMarkRead(PH.peer);return;
  }
  top.textContent={msgs:"Mensajes",ctc:"Contactos",ply:"Jugadores"}[PH.tab];
  if(PH.tab==="msgs"){
    const cs=convos();
    cs.forEach(c=>{
      const r=document.createElement("div");r.className="ph-row click conv";
      r.innerHTML=`<span class="av">${esc(c.name.slice(0,1).toUpperCase())}</span><div class="grow"><b>${esc(c.name)}${c.pid!=null?` <em class="pid">#${c.pid}</em>`:""} <span class="dot ${isOnline(c.peer)?"":"off"}"></span></b><small></small></div><div class="rt"><time>${hhmm(c.last.at)}</time>${c.unread?`<span class="badge">${c.unread}</span>`:""}</div>`;
      r.querySelector("small").textContent=(c.last.mine?"Tú: ":"")+c.last.msg;
      r.onclick=()=>{PH.peer=c.peer;PH.peerName=c.name;PH.peerPid=c.pid;phoneRender()};body.appendChild(r);
    });
    if(!cs.length)body.innerHTML='<div class="ph-empty">No tienes conversaciones.<br>Abre <b>Jugadores</b> o <b>Contactos</b> para escribir a alguien.</div>';
  }else if(PH.tab==="ctc"){
    NET.contacts.forEach(c=>{
      const r=document.createElement("div");r.className="ph-row";
      r.innerHTML=`<span class="av">${esc(c.username.slice(0,1).toUpperCase())}</span><div class="grow"><b>${esc(c.username)}${c.pid!=null?` <em class="pid">#${c.pid}</em>`:""}</b><small>${isOnline(c.id)?"en línea":"desconectado"}</small></div>`;
      const m=document.createElement("button");m.textContent="💬";m.onclick=()=>{PH.peer=c.id;PH.peerName=c.username;PH.peerPid=c.pid;phoneRender()};
      const x=document.createElement("button");x.textContent="✕";x.className="secondary";x.onclick=async()=>{try{await rpc("remove_contact",{p_friend:c.id});NET.contacts=await rpc("get_contacts");phoneRender()}catch(e){toast(e.message)}};
      r.append(m,x);body.appendChild(r);
    });
    if(!NET.contacts.length)body.innerHTML='<div class="ph-empty">Sin contactos todavía.</div>';
  }else{
    const s=document.createElement("input");s.className="ph-search";s.placeholder="Buscar jugador por nombre…";s.value=PH.q;s.addEventListener("keydown",e=>e.stopPropagation());
    let tm;s.oninput=()=>{PH.q=s.value;clearTimeout(tm);tm=setTimeout(async()=>{try{PH.results=PH.q.length>=2?await rpc("search_players",{p_q:PH.q}):[]}catch{PH.results=[]}fill()},300)};
    const lst=document.createElement("div");body.append(s,lst);
    const fill=()=>{
      lst.innerHTML="";
      const arr=PH.q.length>=2?PH.results:[...NET.others.values()].filter(o=>!NET.hidden).map(o=>({id:o.id,username:o.name,online:true}));
      arr.forEach(p=>{
        const r=document.createElement("div");r.className="ph-row";
        r.innerHTML=`<span class="av">${esc(p.username.slice(0,1).toUpperCase())}</span><div class="grow"><b>${esc(p.username)}${p.pid!=null?` <em class="pid">#${p.pid}</em>`:""} <span class="dot ${p.online?"":"off"}"></span></b></div>`;
        const m=document.createElement("button");m.textContent="💬";m.onclick=()=>{PH.peer=p.id;PH.peerName=p.username;PH.peerPid=p.pid;phoneRender()};
        const a=document.createElement("button");a.textContent="＋";a.className="secondary";a.onclick=async()=>{try{await rpc("add_contact",{p_friend:p.id});NET.contacts=await rpc("get_contacts");toast(p.username+" agregado a contactos")}catch(e){toast(e.message)}};
        r.append(m,a);lst.appendChild(r);
      });
      if(!arr.length)lst.innerHTML='<div class="ph-empty">'+(PH.q.length>=2?"Sin resultados.":"No hay otros jugadores conectados.<br>Escribe un nombre para buscar.")+"</div>";
    };fill();
  }
  if(keep)body.scrollTop=prevScroll;
}
function phoneSendNow(){
  const i=document.getElementById("ph-input");const v=i.value;if(!v.trim()||!PH.peer)return;i.value="";sendDm(PH.peer,PH.peerName,v);sfxClick();
}
window.addEventListener("load",()=>{
  const i=document.getElementById("ph-input");if(!i)return;
  i.addEventListener("keydown",e=>{e.stopPropagation();if(e.key==="Enter")phoneSendNow();if(e.key==="Escape"){i.blur();togglePhone()}});
  document.getElementById("ph-sendbtn").onclick=phoneSendNow;
  document.getElementById("ph-back").onclick=()=>{PH.peer=null;phoneRender()};
  document.getElementById("ph-close").onclick=togglePhone;
  document.querySelectorAll("#ph-tabs button").forEach(b=>b.onclick=()=>phoneTab(b.dataset.t));
});
