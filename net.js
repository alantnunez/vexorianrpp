// VEXORIAN RP · V5 · online: movimiento con interpolación (Supabase Realtime Broadcast), chat global,
// mensajes privados (RPC + RLS), latido de sesión y guardado.
const NET={info:{},on:false,ch:null,others:new Map(),roles:{},rolesQ:new Set(),rolesT:0,seq:0,lastSendAt:0,last:null,peers:1,hidden:false,
  timers:[],dms:[],lastDm:0,contacts:[],dmOpen:false,unread:0,hbBusy:false,err:"",curMs:NETC.sendMin,chatT:0};

function netStatus(){
  const el=document.getElementById("net");if(!el)return;
  if(NET.on){el.textContent="● En línea · "+NET.peers+(NET.peers===1?" jugador":" jugadores");el.className="net ok"}
  else{el.textContent=NET.err||"Conectando…";el.className="net"}
}
async function netStart(){
  const c=sbInit();
  NET.ch=c.channel("minisa-city-v4",{config:{broadcast:{self:false,ack:false},presence:{key:ME.id}}});
  NET.ch.on("broadcast",{event:"p"},m=>onPkt(m.payload))
    .on("broadcast",{event:"c"},m=>{const p=m.payload||{};if(p.i&&p.i!==ME.id&&typeof p.m==="string")addChat(p.i,String(p.n||"?").slice(0,16),p.m.slice(0,120))})
    .on("broadcast",{event:"s"},m=>onShotPkt(m.payload))
    .on("broadcast",{event:"k"},m=>{if(m.payload&&typeof m.payload.m==="string")addChat(null,"",m.payload.m.slice(0,100),true)})
    .on("presence",{event:"sync"},onPresence)
    .subscribe(st=>{
      if(st==="SUBSCRIBED"){NET.on=true;NET.err="";if(!NET.hidden)NET.ch.track({id:ME.id,name:ME.username}).catch(()=>{})}
      else if(st==="CHANNEL_ERROR"||st==="TIMED_OUT"||st==="CLOSED"){NET.on=false;NET.err="Reconectando…"}
      netStatus();
    });
  NET.timers.push(setInterval(netTick,40));
  NET.timers.push(setInterval(heartbeat,NETC.heartbeatMs));
  NET.timers.push(setInterval(()=>saveGame(true),NETC.saveMs));
  dmInit();
  heartbeat();
}
function netStop(){
  NET.timers.forEach(clearInterval);NET.timers=[];
  if(NET.dmTimer)clearTimeout(NET.dmTimer);
  try{if(NET.ch){if(!NET.hidden)sendRaw("p",{i:ME.id,gone:1,t:Date.now()});sbInit().removeChannel(NET.ch)}}catch{}
  NET.ch=null;NET.on=false;NET.others.clear();
}
function sendRaw(ev,payload){if(NET.ch&&NET.on)NET.ch.send({type:"broadcast",event:ev,payload}).catch(()=>{})}
function setHidden(on){
  if(NET.hidden===on)return;NET.hidden=on;
  if(on){sendRaw("p",{i:ME.id,gone:1,t:Date.now()});try{NET.ch&&NET.ch.untrack()}catch{}}
  else{try{NET.ch&&NET.ch.track({id:ME.id,name:ME.username})}catch{}NET.last=null}
}
function onPresence(){
  if(!NET.ch)return;
  const st=NET.ch.presenceState(),ids=new Set(Object.keys(st));
  NET.peers=Math.max(1,ids.size+(ids.has(ME.id)||NET.hidden?0:1));
  const now=Date.now();
  NET.others.forEach((o,id)=>{if(!ids.has(id)&&now-o.seen>2500)NET.others.delete(id)});
  netStatus();
}

// ---------- Envío de posición (adaptativo) ----------
function sceneKey(){return player.scene==="home"?"home:"+(player.home||""):player.scene}
function curState(){
  const c=player.driving;
  return{x:Math.round(c?c.x:player.x),y:Math.round(c?c.y:player.y),f:player.face,sc:sceneKey(),m:(c?Math.abs(c.v)>.3:player.moving)?1:0,r:player.running?1:0,
    v:c?1:0,a:c?+c.a.toFixed(2):0,c:c?c.color:"",hp:Math.round(player.hp),sh:player.shirt,pa:player.pants,ar:player.armed?1:0,ai:+(player.aim||0).toFixed(2),
    ly:player.lying?1:0,st:player.sit?1:0,am:player.armor>0?1:0};
}
function netTick(){
  if(!NET.on||!started||NET.hidden||paused&&false)return;
  const now=Date.now(),ms=Math.min(NETC.sendMax,NETC.sendMin+30*Math.max(0,NET.peers-2));NET.curMs=ms;
  const s=curState(),l=NET.last;
  const changed=!l||Math.abs(s.x-l.x)>0||Math.abs(s.y-l.y)>0||s.f!==l.f||s.sc!==l.sc||s.m!==l.m||s.v!==l.v||s.ar!==l.ar||s.ly!==l.ly||s.st!==l.st||s.am!==l.am||s.sh!==l.sh||s.pa!==l.pa||Math.abs(s.a-l.a)>.02||Math.abs(s.ai-l.ai)>.05||s.hp!==l.hp;
  if(now-NET.lastSendAt<(changed?ms:NETC.idleMs))return;
  NET.lastSendAt=now;NET.last=s;
  sendRaw("p",Object.assign({i:ME.id,n:ME.username,t:now,q:++NET.seq},s));
}
// ---------- Recepción e interpolación ----------
function onPkt(p){
  if(!p||!p.i||p.i===ME.id)return;
  if(p.gone){NET.others.delete(p.i);return}
  if(typeof p.x!=="number"||typeof p.y!=="number"||typeof p.t!=="number")return;
  let o=NET.others.get(p.i);
  if(!o){
    o={id:p.i,name:String(p.n||"?").slice(0,16),snaps:[],off:null,x:p.x,y:p.y,a:p.a||0,face:p.f||"d",anim:0,skin:"#d9a98a",hair:"#2a2a2a",shirt:"#888",pants:"#2b3350",
      scene:p.sc||"out",veh:!!p.v,vc:p.c||"#888",bubble:"",bubbleT:0,seen:0,lastT:0,moving:false,armed:false,aim:0,lying:false,armor:0,hp:100,gang:"",tag:"#ffffff",px:p.x,py:p.y};
    o.hair=["#2a2a2a","#3f2a1e","#5a2d2d","#111"][(p.i.charCodeAt(0)+p.i.charCodeAt(1))%4];
    o.skin=["#e0ac7e","#c58c63","#d9a58a","#b98862"][(p.i.charCodeAt(2)+p.i.charCodeAt(3))%4];
    NET.others.set(p.i,o);queueRoles(p.i);
  }
  if(p.t<=o.lastT)return;o.lastT=p.t;o.seen=Date.now();
  const off=Date.now()-p.t;o.off=o.off==null?off:(off<o.off?off:o.off+(off-o.off)*.02);
  o.name=String(p.n||o.name).slice(0,16);
  const sn={ts:p.t+o.off,x:p.x,y:p.y,a:p.a||0,f:p.f||"d",sc:p.sc||"out",m:p.m,r:p.r,v:p.v,c:p.c,hp:p.hp,sh:p.sh,pa:p.pa,ar:p.ar,ai:p.ai||0,ly:p.ly,st:p.st,am:p.am};
  const s=o.snaps;s.push(sn);if(s.length>1&&s[s.length-1].ts<s[s.length-2].ts)s.sort((a,b)=>a.ts-b.ts);if(s.length>24)s.shift();
}
function lerpAng(a,b,k){let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return a+d*k}
function updateOthers(dt){
  const now=Date.now(),rt=now-NETC.interp-Math.max(0,NET.curMs-NETC.sendMin)*.8;
  NET.others.forEach((o,id)=>{
    if(now-o.seen>NETC.staleMs){NET.others.delete(id);return}
    const s=o.snaps;if(!s.length)return;
    while(s.length>2&&s[1].ts<rt-600)s.shift();
    let a=s[0],b=null;for(let i=0;i<s.length;i++){if(s[i].ts<=rt)a=s[i];else{b=s[i];break}}
    let x=a.x,y=a.y,ang=a.a;
    if(b&&b.sc===a.sc&&b.ts>a.ts){const k=(rt-a.ts)/(b.ts-a.ts);x=a.x+(b.x-a.x)*k;y=a.y+(b.y-a.y)*k;ang=lerpAng(a.a,b.a,k)}
    else if(!b){ // sin datos nuevos: extrapola un poco con la última velocidad
      const pv=s.length>1?s[s.length-2]:null;
      if(pv&&pv.sc===a.sc&&a.m&&a.ts>pv.ts){const vx=(a.x-pv.x)/(a.ts-pv.ts),vy=(a.y-pv.y)/(a.ts-pv.ts),ex=Math.min(220,Math.max(0,rt-a.ts));x=a.x+vx*ex;y=a.y+vy*ex}
    }
    const st=(b&&rt-a.ts>(b.ts-a.ts)/2)?b:a;
    const jump=Math.hypot(x-o.x,y-o.y);
    if(o.scene!==st.sc||jump>420||(!!st.v)!==o.veh&&false){o.px=x;o.py=y;o.x=x;o.y=y}
    const dist=Math.hypot(x-o.x,y-o.y);
    // transición suave al subir/bajar de vehículo
    if(!!st.v!==o.veh){
      if(st.v)addGhost(o.px,o.py,x,y,"in",o);else addGhost(o.x,o.y,x,y,"out",o);
    }
    o.veh=!!st.v;
    if(!o.veh){o.px=x;o.py=y}
    o.x=x;o.y=y;o.a=ang;o.face=st.f;o.scene=st.sc;o.vc=st.c||o.vc;
    o.moving=dist>.12*Math.max(.5,dt)||false;
    if(o.moving)o.anim+=dist*.11;
    o.shirt=st.sh||o.shirt;o.pants=st.pa||o.pants;o.armed=!!st.ar;o.aim=st.ai;o.lying=!!st.ly;o.sit=!!st.st;o.armor=st.am?1:0;o.hp=st.hp;
    const inf=NET.info[id];if(inf){o.pid=inf.pid;o.role=inf.role}
    if(o.bubbleT>0)o.bubbleT-=dt;
  });
}
function queueRoles(id){
  if(id in NET.info)return;NET.info[id]=null;NET.rolesQ.add(id);
  clearTimeout(NET.rolesT);
  NET.rolesT=setTimeout(async()=>{
    const ids=[...NET.rolesQ];NET.rolesQ.clear();if(!ids.length)return;
    try{const m=await rpc("public_info",{p_ids:ids});ids.forEach(i=>{NET.info[i]=(m&&m[i])||{pid:null,role:""};restyleChat(i)})}catch{ids.forEach(i=>{delete NET.info[i]})}
  },500);
}
function infoOf(id){return id===ME.id?{pid:ME.pid,role:topRole()}:(NET.info[id]||null)}
// ---------- Chat global ----------
const chatHist=[];
function chatLine(d,id,name,msg){
  d.innerHTML="";const inf=infoOf(id);
  if(inf&&inf.role){const r=document.createElement("i");r.className="rl "+inf.role;r.textContent=inf.role;d.appendChild(r)}
  const b=document.createElement("b");b.textContent=name+(inf&&inf.pid!=null?" #"+inf.pid:"")+": ";b.style.color=roleColor(inf&&inf.role);d.appendChild(b);
  d.appendChild(document.createTextNode(msg));
}
function restyleChat(id){document.querySelectorAll('[data-uid="'+id+'"]').forEach(d=>chatLine(d,id,d.dataset.name,d.dataset.msg))}
function addChat(id,name,msg,sys){
  const box=document.getElementById("chat-log");if(!box)return;
  chatHist.push({id,name,msg,sys:!!sys,t:Date.now()});if(chatHist.length>80)chatHist.shift();
  const d=document.createElement("div");d.className="cl"+(sys?" sys":"");
  if(sys)d.textContent=msg;
  else{d.dataset.uid=id;d.dataset.name=name;d.dataset.msg=msg;if(id!==ME.id)queueRoles(id);chatLine(d,id,name,msg)}
  box.appendChild(d);while(box.children.length>7)box.removeChild(box.firstChild);
  setTimeout(()=>{if(d.parentNode)d.remove()},14000);
  if(id){const o=NET.others.get(id);if(o){o.bubble=msg;o.bubbleT=240}}
  const h=document.getElementById("chat-hist");if(h&&h.style.display==="block")renderChatHist();
}
function renderChatHist(){
  const h=document.getElementById("chat-hist-list");if(!h)return;h.innerHTML="";
  chatHist.forEach(m=>{const d=document.createElement("div");d.className="cl"+(m.sys?" sys":"");
    const t=document.createElement("small");t.textContent=new Date(m.t).toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit",hour12:false})+" ";d.appendChild(t);
    if(m.sys)d.appendChild(document.createTextNode(m.msg));else{const s=document.createElement("span");chatLine(s,m.id,m.name,m.msg);d.appendChild(s)}
    h.appendChild(d)});
  h.scrollTop=h.scrollHeight;
}
function toggleChatHist(){const h=document.getElementById("chat-hist");const on=h.style.display!=="block";h.style.display=on?"block":"none";if(on)renderChatHist()}
function sendChat(msg){
  msg=msg.trim().slice(0,120);if(!msg)return;
  const now=Date.now();if(now-NET.chatT<700){toast("Más despacio…");return}NET.chatT=now;
  player.bubble=msg;player.bubbleT=240;addChat(ME.id,ME.username,msg);
  sendRaw("c",{i:ME.id,n:ME.username,m:msg});
}
function sendSys(msg){addChat(null,"",msg,true);sendRaw("k",{m:msg})}
function onlineShot(x,y,a){sendRaw("s",{i:ME.id,x:Math.round(x),y:Math.round(y),a:+a.toFixed(3),sc:player.scene})}
function onShotPkt(p){
  if(!p||p.i===ME.id||p.sc!==sceneKey()||typeof p.x!=="number")return;
  const d=Math.hypot(p.x-player.x,p.y-player.y);
  if(d<900)sfxShot(d,false);
  spawnBullet(p.x,p.y,p.a,p.i,true);
}
// ---------- Mensajes privados ----------
function dmNorm(r){return{id:r.id,from:r.from_id,to:r.to_id,msg:r.msg,at:new Date(r.created_at).getTime(),read:!!r.read_at,mine:r.from_id===ME.id,peer:r.from_id===ME.id?r.to_id:r.from_id,peerName:r.peer_name,peerPid:r.peer_pid,peerRole:r.peer_role}}
async function dmInit(){
  try{
    const rows=await rpc("get_dms",{p_since:0});NET.dms=rows.map(dmNorm);NET.lastDm=rows.length?rows[rows.length-1].id:0;
    NET.contacts=await rpc("get_contacts");dmUnread();
  }catch(e){}
  dmPollLoop();
}
function dmPollLoop(){
  clearTimeout(NET.dmTimer);
  NET.dmTimer=setTimeout(async()=>{
    if(!started)return;
    try{
      const rows=await rpc("get_dms",{p_since:NET.lastDm});
      if(rows.length){
        const fresh=rows.map(dmNorm);let incoming=0;
        fresh.forEach(m=>{NET.lastDm=Math.max(NET.lastDm,m.id);if(!NET.dms.some(x=>x.id===m.id)){
          const pi=NET.dms.findIndex(x=>x.pending&&x.mine&&x.msg===m.msg&&x.peer===m.peer);
          if(pi>=0)NET.dms[pi]=m;else{NET.dms.push(m);if(!m.mine)incoming++}}});
        dmUnread();if(incoming){sfxMsg();toast("📩 Nuevo mensaje privado")}
        if(typeof phoneRefresh==="function")phoneRefresh();
      }
    }catch{}
    dmPollLoop();
  },NET.dmOpen?NETC.dmPollOpen:NETC.dmPoll);
}
function dmUnread(){
  NET.unread=NET.dms.filter(m=>!m.mine&&!m.read).length;
  const b=document.getElementById("ph-dot");if(b){b.textContent=NET.unread;b.style.display=NET.unread?"flex":"none"}
}
async function sendDm(peer,peerName,msg){
  msg=msg.trim().slice(0,300);if(!msg)return;
  const tmp={id:-Date.now(),from:ME.id,to:peer,msg,at:Date.now(),read:false,mine:true,peer,peerName,pending:true};
  NET.dms.push(tmp);if(typeof phoneRefresh==="function")phoneRefresh();
  try{const r=await rpc("send_dm",{p_to:peer,p_msg:msg});tmp.id=r.id;tmp.pending=false;NET.lastDm=Math.max(NET.lastDm,r.id)}
  catch(e){NET.dms=NET.dms.filter(m=>m!==tmp);toast("No se envió: "+e.message);sfxError()}
  if(typeof phoneRefresh==="function")phoneRefresh();
}
async function dmMarkRead(peer){
  let ch=false;NET.dms.forEach(m=>{if(m.peer===peer&&!m.mine&&!m.read){m.read=true;ch=true}});
  if(ch){dmUnread();try{await rpc("mark_dms_read",{p_peer:peer})}catch{}}
}
// ---------- Latido de sesión: baneos, expulsiones, dinero, roles y mundo ----------
async function heartbeat(){
  if(NET.hbBusy||!started)return;NET.hbBusy=true;
  try{
    const r=await rpc("heartbeat",{p_session:ME.session});
    if(r.banned){forceLogout("Tu cuenta ha sido suspendida por la administración.");return}
    if(r.replaced){forceLogout("Tu cuenta se abrió en otro dispositivo o pestaña.");return}
    if(r.kicked_ms&&r.kicked_ms>ME.loginMs){forceLogout("Has sido expulsado por la administración.");return}
    ME.serverOffset=r.server_ms-Date.now();
    if(typeof r.money==="number")player.money=r.money;
    ME.roles=r.roles||[];ME.creator=!!r.creator;ME.xtxAccess=!!r.xtx_access;ME.role=r.role||"";
    if(r.vip)ME.vip=r.vip;if(typeof r.level==="number")ME.level=r.level;if(typeof r.exp==="number")ME.exp=r.exp;if(r.player_id!=null)ME.pid=r.player_id;
    if(r.properties)ME.properties=r.properties;if(r.guest_of)ME.guestOf=r.guest_of;
    if(player.scene==="home"&&r.home_key!==player.home&&typeof forceLeaveHome==="function")forceLeaveHome("Se retiró tu acceso a esta casa.");
    if(r.inv){player.inv=r.inv;syncInvFlags()}
    applyWorld(r.world);
    if(ME.creator&&r.invisible!==ME.invisible){ME.invisible=r.invisible;PW.invisible=r.invisible;setHidden(r.invisible)}
    if(!ME.creator&&(PW.fly||PW.speed||PW.invisible)){PW.fly=PW.speed=PW.invisible=false;setHidden(false)}
    if(typeof refreshAdminButton==="function")refreshAdminButton();
  }catch(e){NET.err="Sin conexión";if(/Sesión no válida/.test(e.message)){forceLogout("Tu sesión expiró. Inicia sesión de nuevo.")}}
  finally{NET.hbBusy=false}
}
