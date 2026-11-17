// VEXORIAN RP · V5 · interfaz: inicio de sesión/registro, menús, controles táctiles y arranque
let toastT=0;
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),3600)}
const $=id=>document.getElementById(id);

// ---------- Pantallas de acceso ----------
function showScreen(name){
  ["scr-login","scr-register","scr-recover","scr-newpass","scr-start","scr-loading"].forEach(s=>$(s).style.display=s==="scr-"+name?"block":"none");
  $("auth").style.display="grid";
  document.querySelectorAll("#auth .pass-msg").forEach(m=>m.textContent="");
}
function setMsg(id,txt,ok){const m=$(id);m.textContent=txt||"";m.className="pass-msg"+(ok?" ok":"")}
function busy(btn,on,txt){btn.disabled=on;if(txt!==undefined){if(on)btn.dataset.t=btn.textContent;btn.textContent=on?txt:(btn.dataset.t||btn.textContent)}}
function showRecovery(){showScreen("newpass")}

async function afterLogin(){
  showScreen("loading");
  try{
    const me=await loadMe();
    if(me.banned){await authSignOut();showScreen("login");setMsg("login-msg","Tu cuenta está suspendida"+(me.reason?": "+me.reason:"")+".");return}
    window.__me=me;
    $("st-name").textContent=ME.username;$("st-id").textContent="#"+ME.pid;
    $("st-roles").innerHTML=(ME.creator?'<i class="rl CREATOR">CREATOR</i>':"")+ME.roles.filter(r=>r!=="CREATOR").map(r=>`<i class="rl ${r}">${r}</i>`).join("");
    $("st-money").textContent=money(me.money);$("st-lvl").textContent=me.level;
    showScreen("start");
  }catch(e){showScreen("login");setMsg("login-msg",e.message)}
}
function wireAuth(){
  document.querySelectorAll("[data-go]").forEach(a=>a.onclick=e=>{e.preventDefault();showScreen(a.dataset.go)});
  $("f-login").onsubmit=async e=>{
    e.preventDefault();const b=e.target.querySelector("button[type=submit]");busy(b,true,"Entrando…");setMsg("login-msg","");
    try{await authSignIn($("l-email").value.trim(),$("l-pass").value);await afterLogin()}catch(err){setMsg("login-msg",err.message)}
    busy(b,false);
  };
  $("f-register").onsubmit=async e=>{
    e.preventDefault();const b=e.target.querySelector("button[type=submit]");setMsg("reg-msg","");
    if($("r-pass").value!==$("r-pass2").value){setMsg("reg-msg","Las contraseñas no coinciden.");return}
    busy(b,true,"Creando cuenta…");
    try{
      const d=await authSignUp($("r-user").value.trim(),$("r-email").value.trim(),$("r-pass").value);
      if(d.session)await afterLogin();
      else{setMsg("reg-msg","Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.",true)}
    }catch(err){setMsg("reg-msg",err.message)}
    busy(b,false);
  };
  $("f-recover").onsubmit=async e=>{
    e.preventDefault();const b=e.target.querySelector("button[type=submit]");busy(b,true,"Enviando…");
    try{await authRecover($("rc-email").value.trim());setMsg("rec-msg","Si el correo existe, recibirás un enlace para restablecer tu contraseña.",true)}catch(err){setMsg("rec-msg",err.message)}
    busy(b,false);
  };
  $("f-newpass").onsubmit=async e=>{
    e.preventDefault();if($("np-pass").value!==$("np-pass2").value){setMsg("np-msg","Las contraseñas no coinciden.");return}
    try{await authNewPassword($("np-pass").value);setMsg("np-msg","Contraseña actualizada.",true);history.replaceState(null,"",location.pathname);setTimeout(afterLogin,700)}catch(err){setMsg("np-msg",err.message)}
  };
  $("st-play").onclick=()=>startGame();
  $("st-switch").onclick=async()=>{await authSignOut();showScreen("login")};
}

// ---------- Arranque del mundo ----------
function freeSpot(scene,x,y){
  if(!footBlocked(scene,x,y))return{x,y};
  for(let r=16;r<400;r+=16)for(let a=0;a<6.28;a+=.5){const nx=x+Math.cos(a)*r,ny=y+Math.sin(a)*r;if(!footBlocked(scene,nx,ny))return{x:nx,y:ny}}
  return{x:240,y:356};
}
async function startGame(){
  const me=window.__me;if(!me)return;
  audioInit();showScreen("loading");
  try{
    ME.session=(window.crypto&&crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&3|8)).toString(16)}));
    await rpc("claim_session",{p_session:ME.session});
  }catch(e){showScreen("start");toast(e.message);return}
  const st=me.state;
  Object.assign(player,{pid:ME.pid,role:topRole(),name:ME.username,hp:st.hp,hunger:st.hunger,thirst:st.thirst,energy:st.energy,money:me.money,shirt:me.shirt,pants:me.pants,inv:me.inv||{},
    ammo:me.equipment.ammo_loaded,armor:me.equipment.armor||0,dead:false,lying:false,driving:null,armed:false,carry:false});
  ME.level=me.level;ME.exp=me.exp;ME.pid=me.player_id;ME.shirt=me.shirt;ME.pants=me.pants;
  const sc=["out","in","shop","hosp","cloth"].includes(st.scene)?st.scene:"out";
  player.scene=sc;const sp=freeSpot(sc,st.x,st.y);player.x=sp.x;player.y=sp.y;
  loadOwnedCars();syncInvFlags();applyWorld(me.world);buildMapImage();onSettings();
  if(me.hospital){beginHospital({bed:me.hospital.bed,started_ms:me.hospital.started_ms,start_hp:me.hospital.start_hp,rate:me.hospital.rate})}
  else if(sc==="hosp"&&!zoneOpen("hospital")){player.scene="out";const b=WORLD.hospital;player.x=b.door.x;player.y=b.door.y+26}
  started=true;$("auth").style.display="none";$("hud").style.display="block";
  netStart();tjRestore();refreshAdminButton();updateCreatorBar();updateMission();updateHUD();netStatus();
  if(ME.invisible&&ME.creator){PW.invisible=true;setHidden(true);updateCreatorBar()}
  toast("Bienvenido, "+ME.username+(me.hospital?" · sigues en recuperación":""));
}
async function doLogout(){
  try{await saveGame(true)}catch{}
  started=false;netStop();audioEngine(false,0);await authSignOut();location.reload();
}
function forceLogout(msg){
  started=false;netStop();audioEngine(false,0);try{sessionStorage.setItem("minisa-msg",msg)}catch{}
  authSignOut().finally(()=>location.reload());
}

// ---------- Menús y botones ----------
function wireMenus(){
  $("btn-pause").onclick=togglePauseMenu;$("p-resume").onclick=togglePauseMenu;
  $("p-save").onclick=()=>saveGame(false);
  $("p-settings").onclick=()=>{buildSettings();$("settings").style.display="flex"};
  $("set-close").onclick=()=>$("settings").style.display="none";$("set-reset").onclick=resetSettings;
  $("p-logout").onclick=doLogout;
  $("btn-map").onclick=openMap;$("btn-phone").onclick=togglePhone;
  $("btn-admin").onclick=openAdmin;$("btn-panel").onclick=openAdmin;$("btn-vip").onclick=openVip;$("pose-ui").onclick=standUp;
  $("chat-hist-btn").onclick=toggleChatHist;$("chat-hist-close").onclick=toggleChatHist;$("admin-close").onclick=closeAdmin;
  document.querySelectorAll("#admin .atab").forEach(b=>b.onclick=()=>adminTab(b.dataset.t));
  $("panel-close").onclick=closePanel;
  $("hosp-btn").onclick=leaveBed;
  $("btn-sound").onclick=()=>{audioInit();audioSetMuted(!AUD.muted);$("btn-sound").textContent=AUD.muted?"🔇":"🔊"};
  $("btn-sound").textContent=AUD.muted?"🔇":"🔊";
  $("vol").value=Math.round(AUD.vol*100);$("vol").oninput=e=>{audioInit();audioSetVol(e.target.value/100)};
  ["fly","speed","invisible"].forEach(p=>$("cb-"+p).onclick=()=>creatorPower(p));
  $("cb-admin").onclick=openAdmin;
  $("cb-rain").onclick=()=>quickWeather(ME.world.weather==="rain"?"clear":"rain");
  $("cb-storm").onclick=()=>quickWeather(ME.world.weather==="storm"?"clear":"storm");
  const ci=$("chat-input");
  ci.addEventListener("keydown",e=>{e.stopPropagation();if(e.key==="Enter"){const v=ci.value;ci.value="";ci.blur();if(v.trim())sendChat(v)}if(e.key==="Escape")ci.blur()});
  document.addEventListener("click",()=>{if(started)audioInit()},{once:false});
  document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("button")&&AUD.ctx)sfxClick()});
  window.addEventListener("beforeunload",flushSave);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)flushSave()});
}
// ---------- Controles táctiles ----------
function wireTouch(){
  const isTouch=matchMedia("(pointer:coarse)").matches||"ontouchstart" in window;if(!isTouch)return;
  const root=$("touch");root.style.display="block";document.body.classList.add("touch");
  const joy=$("joy"),knob=$("joy-knob");let cx=0,cy=0,id=null;
  const move=t=>{let dx=t.clientX-cx,dy=t.clientY-cy;const m=Math.hypot(dx,dy),R=48;if(m>R){dx=dx/m*R;dy=dy/m*R}knob.style.transform=`translate(${dx}px,${dy}px)`;touchInput.dx=dx/R;touchInput.dy=dy/R};
  joy.addEventListener("touchstart",e=>{e.preventDefault();const t=e.changedTouches[0];id=t.identifier;touchInput.joyId=id;const r=joy.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;move(t)},{passive:false});
  joy.addEventListener("touchmove",e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===id)move(t)},{passive:false});
  const end=e=>{for(const t of e.changedTouches)if(t.identifier===id){id=null;touchInput.joyId=null;touchInput.dx=touchInput.dy=0;knob.style.transform=""}};
  joy.addEventListener("touchend",end);joy.addEventListener("touchcancel",end);
  const act={e:()=>{if(HOSPS.locked){leaveBed();return}const a=getInteract();if(a)a.f()},f:toggleCar,g:toggleGun,r:reloadGun,map:openMap,ph:togglePhone,chat:()=>$("chat-input").focus()};
  root.querySelectorAll("[data-a]").forEach(b=>{
    b.addEventListener("touchstart",e=>{e.preventDefault();audioInit();const a=b.dataset.a;if(a==="run"){touchInput.run=!touchInput.run;b.classList.toggle("on",touchInput.run)}else if(a==="brake")touchInput.brake=true;else if(act[a])act[a]()},{passive:false});
    b.addEventListener("touchend",()=>{if(b.dataset.a==="brake")touchInput.brake=false});
  });
}

// ---------- Boot ----------
async function boot(){
  wireAuth();wireMenus();wireTouch();buildSettings();onSettings();
  const m=(()=>{try{const x=sessionStorage.getItem("minisa-msg");sessionStorage.removeItem("minisa-msg");return x}catch{return null}})();
  showScreen("login");if(m)setMsg("login-msg",m);
  try{
    sbInit();
    if(/type=recovery/.test(location.hash)){showScreen("newpass");return}
    const {data}=await sbInit().auth.getSession();
    if(data&&data.session){ME.token=data.session.access_token;await afterLogin()}
  }catch(e){setMsg("login-msg",e.message)}
}
boot();
