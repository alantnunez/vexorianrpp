// VEXORIAN RP · V5 · bucle principal, cámara, render, iluminación, clima e interacciones
let started=false,paused=false,pauseMenu=false;
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const lightCv=document.createElement("canvas"),lctx=lightCv.getContext("2d");
let vw=640,vh=360,scale=2;
const cam={x:0,y:0};
const particles=[],floats=[];
let frameN=0,fpsAcc=0,fpsCount=0,fpsNow=60,lastT=performance.now(),perfT=0,rain=[],flash=0;
const glow=(()=>{const c=mk(128,128),g=c.getContext("2d"),r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,"rgba(255,255,255,1)");r.addColorStop(.45,"rgba(255,255,255,.45)");r.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=r;g.fillRect(0,0,128,128);return c})();
const SCENE_BLD={in:"warehouse",shop:"shop",hosp:"hospital",cloth:"clothes"};

function onSettings(){
  scale=CFG.pixel;vw=Math.ceil(window.innerWidth/scale);vh=Math.ceil(window.innerHeight/scale);
  canvas.width=vw;canvas.height=vh;lightCv.width=vw;lightCv.height=vh;ctx.imageSmoothingEnabled=false;
  const f=document.getElementById("fps");if(f)f.style.display=CFG.showFps?"block":"none";
  const v=document.getElementById("vig");if(v)v.style.display=CFG.vignette?"block":"none";
  if(!CFG.particles)particles.length=0;
}
window.addEventListener("resize",onSettings);

function spawnP(x,y,o){const cap=CFG.particles===0?0:CFG.particles===1?40:120;if(particles.length>=cap)return;particles.push(Object.assign({x,y,vx:0,vy:0,m:20,s:2,c:"#fff",al:1,t:0,grow:0},o))}
function floatText(x,y,txt,col){floats.push({x,y,txt,col,t:0})}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.s+=p.grow*.04*dt;if(p.t>=p.m)particles.splice(i,1)}
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.t+=dt;f.y-=.35*dt;if(f.t>55)floats.splice(i,1)}
}
function applyWorld(w){if(w)ME.world=w}
function gameHour(){
  if(ME.world.time_mode==="fixed")return ME.world.fixed_hour;
  const d=new Date();return d.getHours()+d.getMinutes()/60;
}
function nightK(h){if(h>=7&&h<=18)return 0;if(h>=20||h<5)return 1;if(h>18)return(h-18)/2;return(7-h)/2}

// ---------- Escenas ----------
function enterScene(scene){
  if(scene==="hosp"&&!zoneOpen("hospital")){toast("El hospital está cerrado por la administración.");return}
  if(scene==="in"&&!zoneOpen("almacen")){toast("El almacén está cerrado por la administración.");return}
  if(scene==="shop"&&!zoneOpen("supermercado")){toast("El supermercado está cerrado por la administración.");return}
  if(scene==="cloth"&&!zoneOpen("moda")){toast("La tienda está cerrada por la administración.");return}
  const I=SCENES[scene];player.armed=false;player.scene=scene;player.x=I.exit.x;player.y=I.exit.y-30;player.face="u";sfxDoor(true);
}
function exitScene(){
  const b=WORLD.buildings.find(q=>q.type===SCENE_BLD[player.scene]);
  player.scene="out";if(b){player.x=b.door.x;player.y=b.door.y+26}player.face="d";sfxDoor(false);
}
function closeAllUI(){
  if(panelOpen)closePanel();if(PH.open)togglePhone();if(MAPUI.open)closeMap();closeAdmin();
  document.getElementById("pause").style.display="none";document.getElementById("settings").style.display="none";pauseMenu=false;paused=false;
}

// ---------- Interacción ----------
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by)}
function getInteract(){
  if(player.dead||HOSPS.locked)return null;
  if(player.pose)return{t:player.pose==="sit"?"E · Levantarte":"E · Levantarte de la cama",f:standUp};
  if(player.driving){
    if(nearTpTarget())return{t:TJ.status==="active"?"E · Cargar mercancía":"E · Entregar mercancía",f:tjAction};
    const g0=nearPump();if(g0&&player.driving.owned)return{t:"E · Gasolinera: llenar tanque",f:()=>openFuel(g0)};
    return null;
  }
  const px=player.x,py=player.y;
  if(player.scene==="out"){
    for(const b of WORLD.buildings){
      if(Math.abs(px-b.door.x)>70||Math.abs(py-b.door.y)>70)continue;
      if(dist(px,py,b.door.x,b.door.y+10)>52)continue;
      if(b.type==="warehouse")return{t:"E · Entrar al almacén",f:()=>enterScene("in")};
      if(b.type==="shop")return{t:"E · Entrar al supermercado",f:()=>enterScene("shop")};
      if(b.type==="hospital")return{t:"E · Entrar al hospital",f:()=>enterScene("hosp")};
      if(b.type==="clothes")return{t:"E · Entrar a Moda Urbana",f:()=>enterScene("cloth")};
      if(b.type==="dealer")return{t:"E · Ver autos del concesionario",f:openDealer};
      if(b.type==="depot")return{t:"E · Central de transporte",f:openTransport};
      if(b.type==="house"){
        const st=propState(b),gs=ME.guestOf.find(g=>g.key===b.sale);let t;
        if(!st)t="E · Casa en venta";else if(st.mine)t="E · Entrar a tu casa";else if(gs)t="E · Entrar (invitado de "+st.owner+")";else t="E · Casa de "+st.owner+" (privada)";
        return{t,f:()=>houseAction(b)};
      }
      if(["park","parking","lot","yard","sports"].includes(b.type))continue;
      return{t:b.name+" · cerrado",f:()=>toast(b.name+": cerrado por ahora. Abrirá en una próxima actualización.")};
    }
    if(xtxNearGate()&&!gateOpen)return{t:"E · Portón XTX",f:openKeypad};
    if(dist(px,py,XTX.armory.x,XTX.armory.y)<44)return{t:"E · Armería XTX",f:()=>{if(!isXTX()){toast("Solo miembros XTX.");return}openArmory()}};
    if(dist(px,py,XTX.vest.x,XTX.vest.y)<44)return{t:"E · Estación de chalecos",f:()=>{if(!isXTX()){toast("Solo miembros XTX.");return}openVests()}};
    if(dist(px,py,XTX.store.x,XTX.store.y)<44)return{t:"E · Almacén XTX",f:()=>toast("Almacén XTX: suministros de la banda.")};
    const g1=nearPump();if(g1)return{t:"E · Gasolinera: llenar tanque",f:()=>openFuel(g1)};
    for(const bn of WORLD.benches)if(Math.abs(px-bn.x)<30&&Math.abs(py-bn.y)<30)return{t:"E · Sentarte en la banca",f:()=>sitAt({x:bn.x,y:bn.y,face:"d",stand:{x:bn.x,y:bn.y+24}})};
  }else{
    const I=SCENES[player.scene];
    if(player.scene==="home"){
      if(dist(px,py,HOME.exit.x,HOME.exit.y)<56)return{t:"E · Salir de la casa",f:exitHome};
      for(const s of HOME.seats)if(dist(px,py,s.x,s.y+(s.face==="u"?24:0))<34||dist(px,py,s.x,s.y)<30)return{t:"E · Sentarte",f:()=>sitAt(s)};
      if(dist(px,py,HOME.bed.stand.x,HOME.bed.stand.y)<46||dist(px,py,HOME.bed.x,HOME.bed.y)<60)return{t:"E · Acostarte",f:lieDown};
      if(dist(px,py,HOME.stove.x,HOME.stove.y)<46)return{t:"E · Cocinar",f:openCooking};
      if(player.homeIsOwner&&dist(px,py,HOME.panel.x,HOME.panel.y)<40)return{t:"E · Invitados de la casa",f:openGuests};
    }else if(dist(px,py,I.exit.x,I.exit.y)<56)return{t:"E · Salir",f:exitScene};
    if(player.scene==="in"){
      const m=npcs.find(n=>n.name==="Marco");
      if(dist(px,py,m.x,m.y)<54)return{t:job.active?"E · Terminar turno":"E · Empezar turno",f:()=>job.active?endShift():startShift()};
      if(job.active&&job.order&&!player.carry){const s=INTERIOR.shelves.find(q=>q.id===job.order.shelf);if(dist(px,py,s.pick.x,s.pick.y)<44)return{t:"E · Recoger caja",f:pickBox}}
      if(player.carry&&dist(px,py,INTERIOR.dock.x,INTERIOR.dock.y+70)<80)return{t:"E · Entregar caja",f:deliverBox};
    }
    if(player.scene==="shop"&&dist(px,py,SHOP.counter.x,SHOP.counter.y)<60)return{t:"E · Comprar en el mostrador",f:openShop};
    if(player.scene==="cloth"&&dist(px,py,CLOTH.mirror.x,CLOTH.mirror.y)<56)return{t:"E · Usar el probador",f:openClothes};
  }
  let best=null,bd=40;
  npcs.forEach(n=>{if(n.scene===player.scene&&!n.down&&n.lines.length){const d=dist(px,py,n.x,n.y);if(d<bd){bd=d;best=n}}});
  if(best)return{t:"E · Hablar con "+best.name,f:()=>npcTalk(best)};
  return null;
}
function useSlot(i){const s=useSlots()[i];if(s)useItem(s.item_key)}

// ---------- Teclado y ratón ----------
window.addEventListener("keydown",e=>{
  if(!started)return;const t=e.target&&e.target.tagName;
  if(t==="INPUT"||t==="SELECT"||t==="TEXTAREA"){if(e.key==="Escape")e.target.blur();return}
  const k=e.key.toLowerCase();
  if(k==="escape"){
    if(panelOpen){closePanel();return}if(MAPUI.open){closeMap();return}if(PH.open){togglePhone();return}
    if(document.getElementById("admin").style.display==="grid"){closeAdmin();return}
    if(document.getElementById("settings").style.display==="flex"){document.getElementById("settings").style.display="none";return}
    togglePauseMenu();return;
  }
  if(paused||pauseMenu)return;
  if(k==="f3"){e.preventDefault();CFG.showFps=!CFG.showFps;saveSettings();onSettings();return}
  if(k==="m"){openMap();return}
  if(k==="p"){togglePhone();return}
  if(k==="enter"){e.preventDefault();document.getElementById("chat-input").focus();return}
  if(player.pose){if(k==="e"||k===" ")standUp();return}
  if(HOSPS.locked){if(k==="e")leaveBed();return}
  if(k==="e"){const a=getInteract();if(a)a.f();return}
  if(k==="f"){toggleCar();return}
  if(k==="g"){toggleGun();return}
  if(k==="r"){reloadGun();return}
  if(k>="1"&&k<="9"){useSlot(+k-1);return}
  if(ME.creator){if(k==="f6"){e.preventDefault();creatorPower("fly")}if(k==="f7"){e.preventDefault();creatorPower("speed")}if(k==="f8"){e.preventDefault();creatorPower("invisible")}if(k==="f9"){e.preventDefault();openAdmin()}}
});
function setMouse(e){const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*vw;mouse.y=(e.clientY-r.top)/r.height*vh;mouse.wx=cam.x+mouse.x;mouse.wy=cam.y+mouse.y;player.aim=Math.atan2(mouse.wy-(player.y-1),mouse.wx-player.x)}
canvas.addEventListener("mousemove",e=>{if(started&&player.armed)setMouse(e)});
canvas.addEventListener("mousedown",e=>{if(e.button!==0||!started||paused||!player.armed)return;setMouse(e);mouse.down=true;audioInit();shoot()});
window.addEventListener("mouseup",()=>{mouse.down=false});
canvas.addEventListener("touchstart",e=>{if(!started||paused||!player.armed||touchInput.joyId!=null&&e.touches.length<1)return;const t=e.changedTouches[e.changedTouches.length-1];if(t.clientX<window.innerWidth*.4)return;setMouse(t);shoot()},{passive:true});
function togglePauseMenu(){
  pauseMenu=!pauseMenu;paused=pauseMenu;document.getElementById("pause").style.display=pauseMenu?"grid":"none";
  if(pauseMenu){document.getElementById("pause-user").textContent=ME.username+(ME.creator?" · CREATOR":isXTX()?" · XTX":"")}
}

// ---------- Actualización ----------
function updateVitals(dt){
  if(HOSPS.active||player.dead)return;
  const nk=vipOn("needs")?.5:1;player.hunger=Math.max(0,player.hunger-.0016*nk*dt);player.thirst=Math.max(0,player.thirst-.0024*nk*dt);
  if(player.hunger<=0||player.thirst<=0){player.hp-=.012*dt;if(player.hp<=0){player.hp=0;playerDied(player.hunger<=0?"el hambre":"la sed")}}
  else if(player.hunger>40&&player.thirst>40&&player.hp<100)player.hp=Math.min(100,player.hp+.004*dt);
}
function updateWorld(dt){
  if(player.driving)driveCar(dt);else updatePlayer(dt);
  audioEngine(!!player.driving,player.driving?player.driving.v:0);
  if(player.scene==="out"){
    gateOpen=ME.xtxAccess&&isXTX()&&xtxNearGate()&&!player.driving;
    player.armed=player.armed&&!player.driving;
  }
  updateVitals(dt);updateNPCs(dt);updateAI(dt);updateBullets(dt);updateParticles(dt);updateGhosts(dt);
  if(player.bubbleT>0)player.bubbleT-=dt;
  npcs.forEach(n=>{if(n.bubbleT>0)n.bubbleT-=dt});
}
function updateCamera(){
  let w,h;if(player.scene==="out"){w=WORLD.width;h=WORLD.height}else{const I=SCENES[player.scene];w=I.width;h=I.height}
  let tx=player.x-vw/2,ty=player.y-vh/2;
  tx=w<=vw?(w-vw)/2:Math.max(0,Math.min(w-vw,tx));ty=h<=vh?(h-vh)/2:Math.max(0,Math.min(h-vh,ty));
  cam.x=Math.round(tx);cam.y=Math.round(ty);
}

// ---------- Render ----------
const onScreen=(x,y,m)=>x>cam.x-(m||50)&&x<cam.x+vw+(m||50)&&y>cam.y-(m||50)&&y<cam.y+vh+(m||50);
function drawGate(c){
  const g=XTX.gate,x=g.x,y=g.y-2;
  if(gateOpen){c.fillStyle="#2a2f33";c.fillRect(x-6,y-6,6,22);c.fillRect(x+g.w,y-6,6,22);c.fillStyle="#3ee08a";c.fillRect(x-5,y-4,4,3);c.fillRect(x+g.w+1,y-4,4,3);return}
  c.fillStyle="#1d1a22";c.fillRect(x-1,y-1,g.w+2,16);c.fillStyle="#4a4d58";c.fillRect(x,y,g.w,14);c.fillStyle="#8e44ad";c.fillRect(x,y,g.w,3);
  c.fillStyle="#222";for(let i=4;i<g.w;i+=8)c.fillRect(x+i,y+3,2,11);
  c.fillStyle=(frameN>>5)%2?"#ff4d4d":"#7a1f1f";c.fillRect(x+g.w/2-2,y+5,4,4);
}
function drawMarkers(c){
  WORLD.buildings.forEach(b=>{
    if(!b.sale||!onScreen(b.x+b.w/2,b.y+b.h/2,160))return;
    const st=propState(b),sx=Math.round(b.x+b.w-18),sy=Math.round(b.y+b.h+4);
    c.fillStyle="#5a4330";c.fillRect(sx,sy,2,12);c.fillStyle=st?"#c0392b":"#2fa05a";c.fillRect(sx-10,sy-4,22,10);c.fillStyle="#fff";c.font="bold 6px sans-serif";c.textAlign="center";c.fillText(st?"VENDIDA":"SE VENDE",sx+1,sy+3);
    if(player.scene==="out"&&dist(player.x,player.y,b.door.x,b.door.y)<150){const cat=(ME.catalog.properties||[]).find(p=>p.property_key===b.sale);tag(st?(st.mine?"Tu casa ⭐":"Casa de "+st.owner+" #"+st.owner_pid):(cat?cat.name+" · "+money(cat.price):"En venta"),Math.round(b.door.x),Math.round(b.y-6),st&&st.mine?"#ffd04a":"#fff")}
  });
  WORLD.fires.forEach(f=>{
    if(!onScreen(f.x,f.y))return;
    const t=frameN*.3;c.fillStyle="#ff9a2e";c.fillRect(Math.round(f.x-4+Math.sin(t)*1),Math.round(f.y-8-Math.sin(t*1.3)*2),8,8);c.fillStyle="#ffd84a";c.fillRect(Math.round(f.x-2),Math.round(f.y-6),4,5);
  });
}
function drawTpMarker(c){
  const t=tpTarget();if(!t||!onScreen(t.x,t.y,80))return;
  const k=frameN*.12,r=18+Math.sin(k)*3;
  c.strokeStyle="#ffd04a";c.lineWidth=3;c.beginPath();c.arc(t.x,t.y,r,0,7);c.stroke();
  c.fillStyle="rgba(255,208,74,.22)";c.beginPath();c.arc(t.x,t.y,r,0,7);c.fill();
  tag(TJ.status==="active"?"ZONA DE CARGA":"ENTREGA · "+t.name.toUpperCase(),Math.round(t.x),Math.round(t.y-r-6),"#ffd04a");
}
function renderOut(){
  ctx.fillStyle="#5b8a4c";ctx.fillRect(0,0,vw,vh);
  ctx.save();ctx.translate(-cam.x,-cam.y);
  tileHousekeeping(cam.x,cam.y,vw,vh);
  drawTiles("base",cam.x,cam.y,vw,vh);
  if(CFG.shadows>0)drawTiles("shadow",cam.x,cam.y,vw,vh);
  drawMarkers(ctx);drawGate(ctx);drawTpMarker(ctx);
  const ents=[];
  const carE=c=>{if(onScreen(c.x,c.y,60))ents.push({y:c.y,d:()=>drawCar(c,ctx)})};
  cars.forEach(carE);aiCars.forEach(carE);
  npcs.forEach(n=>{if(n.scene==="out"&&onScreen(n.x,n.y))ents.push({y:n.y,d:()=>drawPerson(ctx,n,n.name+(n.role?" · "+n.role:""))})});
  XTX.dummies.forEach((d,i)=>{if(onScreen(d.x,d.y))ents.push({y:d.y,d:()=>drawDummies1(i)})});
  NET.others.forEach(o=>{
    if(o.scene!=="out"||!onScreen(o.x,o.y,60))return;
    if(o.veh)ents.push({y:o.y,d:()=>{drawCar({x:o.x,y:o.y,a:o.a,color:o.vc,type:"sedan",braking:false},ctx);tag(labelFor(o.name,o.pid),Math.round(o.x),Math.round(o.y)-24,roleColor(o.role))}});
    else ents.push({y:o.y,d:()=>drawPerson(ctx,o,labelFor(o.name,o.pid),roleColor(o.role))});
  });
  if(!player.driving)ents.push({y:player.y,d:()=>{if(NET.hidden)ctx.globalAlpha=.4;drawPerson(ctx,player,NET.hidden?null:labelFor(ME.username,ME.pid),roleColor(topRole()));ctx.globalAlpha=1}});
  ents.sort((a,b)=>a.y-b.y).forEach(e=>e.d());
  drawGhosts(ctx);drawBullets(ctx);
  particles.forEach(p=>{if(!onScreen(p.x,p.y))return;ctx.globalAlpha=p.al*(1-p.t/p.m);ctx.fillStyle=p.c;ctx.fillRect(Math.round(p.x),Math.round(p.y),Math.ceil(p.s),Math.ceil(p.s))});ctx.globalAlpha=1;
  drawTiles("top",cam.x,cam.y,vw,vh);
  floats.forEach(f=>{ctx.globalAlpha=Math.max(0,1-f.t/55);tag(f.txt,Math.round(f.x),Math.round(f.y),f.col)});ctx.globalAlpha=1;
  if(player.driving&&NET.hidden){}
  ctx.restore();
  drawLighting();drawWeather();
}
function drawDummies1(i){const d=XTX.dummies[i],st=dummyState[i],w=st.hit>0?Math.sin(st.hit)*2:0,x=Math.round(d.x+w),y=Math.round(d.y);
  if(CFG.shadows>0){ctx.fillStyle="rgba(0,0,0,.25)";ctx.fillRect(x-8,y+13,16,4)}
  ctx.fillStyle="#5a4330";ctx.fillRect(x-2,y-4,4,20);ctx.fillStyle="#2a2f33";ctx.fillRect(x-7,y+15,14,3);
  ctx.fillStyle="#e8e4d4";ctx.beginPath();ctx.arc(x,y-12,12,0,7);ctx.fill();ctx.fillStyle="#d93b3b";ctx.beginPath();ctx.arc(x,y-12,8,0,7);ctx.fill();
  ctx.fillStyle="#e8e4d4";ctx.beginPath();ctx.arc(x,y-12,4.5,0,7);ctx.fill();ctx.fillStyle="#d93b3b";ctx.beginPath();ctx.arc(x,y-12,1.8,0,7);ctx.fill()}
function renderIn(){
  const I=SCENES[player.scene];
  ctx.fillStyle="#0e1311";ctx.fillRect(0,0,vw,vh);
  ctx.save();ctx.translate(-cam.x,-cam.y);ctx.drawImage(getInteriorImg(player.scene),0,0);
  if(player.scene==="in"&&job.active){
    const t=Math.sin(frameN*.1)*2+16;ctx.strokeStyle="#b5ed67";ctx.lineWidth=2;ctx.beginPath();
    if(job.order&&!player.carry){const s=INTERIOR.shelves.find(q=>q.id===job.order.shelf);ctx.arc(s.pick.x,s.pick.y,t,0,7)}else if(player.carry)ctx.arc(INTERIOR.dock.x,INTERIOR.dock.y+60,t+14,0,7);
    ctx.stroke();
  }
  if(player.scene==="hosp"){ // pacientes en las camillas
  }
  const ents=[];
  npcs.forEach(n=>{if(n.scene===player.scene)ents.push({y:n.y,d:()=>drawPerson(ctx,n,n.name+(n.role?" · "+n.role:""))})});
  NET.others.forEach(o=>{if(o.scene===sceneKey())ents.push({y:o.lying?o.y-40:o.y,d:()=>drawPerson(ctx,o,labelFor(o.name,o.pid),roleColor(o.role))})});
  ents.push({y:player.lying?player.y-40:player.y,d:()=>{if(NET.hidden)ctx.globalAlpha=.4;drawPerson(ctx,player,NET.hidden?null:labelFor(ME.username,ME.pid),roleColor(topRole()));ctx.globalAlpha=1}});
  ents.sort((a,b)=>a.y-b.y).forEach(e=>e.d());
  drawGhosts(ctx);
  particles.forEach(p=>{ctx.globalAlpha=p.al*(1-p.t/p.m);ctx.fillStyle=p.c;ctx.fillRect(Math.round(p.x),Math.round(p.y),Math.ceil(p.s),Math.ceil(p.s))});ctx.globalAlpha=1;
  floats.forEach(f=>{ctx.globalAlpha=Math.max(0,1-f.t/55);tag(f.txt,Math.round(f.x),Math.round(f.y),f.col)});ctx.globalAlpha=1;
  ctx.restore();
}
function darkness(){
  const h=gameHour(),w=ME.world.weather,wd=w==="storm"?.38:w==="rain"?.24:w==="cloudy"?.12:0;
  return Math.max(nightK(h)*(CFG.night/100)*.8,wd);
}
function drawLighting(){
  if(CFG.lighting<1)return;const dk=darkness();if(dk<.03)return;
  lctx.globalCompositeOperation="source-over";lctx.clearRect(0,0,vw,vh);lctx.fillStyle=`rgba(6,10,30,${dk})`;lctx.fillRect(0,0,vw,vh);
  const night=nightK(gameHour())>.35;
  if(CFG.lighting>=2&&night){
    lctx.globalCompositeOperation="destination-out";
    const L=(x,y,r,a)=>{const sx=x-cam.x,sy=y-cam.y;if(sx<-r||sy<-r||sx>vw+r||sy>vh+r)return;lctx.globalAlpha=a;lctx.drawImage(glow,sx-r,sy-r,r*2,r*2)};
    WORLD.lamps.forEach(l=>L(l.x,l.y,l.xtx?60:54,.95));
    WORLD.buildings.forEach(b=>{if(b.win.length&&onScreen(b.x+b.w/2,b.y+b.h/2,260))b.win.forEach(w=>L(w.x+w.w/2,w.y+w.h/2+4,30,.55));if(b.type==="gas"&&onScreen(b.x+160,b.y+160,260))L(b.x+165,b.y+165,150,.9)});
    WORLD.fires.forEach(f=>L(f.x,f.y,90,.95));
    const carL=c=>{if(!onScreen(c.x,c.y,160))return;L(c.x+Math.cos(c.a)*40,c.y+Math.sin(c.a)*40,56,.8)};
    aiCars.forEach(carL);if(player.driving)carL(player.driving);
    L(player.x,player.y,46,.6);lctx.globalAlpha=1;
  }
  ctx.drawImage(lightCv,0,0);
  if(CFG.lighting>=2&&night){ // resplandor cálido / morado
    ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.16;
    WORLD.lamps.forEach(l=>{const sx=l.x-cam.x,sy=l.y-cam.y;if(sx<-40||sy<-40||sx>vw+40||sy>vh+40)return;ctx.drawImage(glow,sx-28,sy-28,56,56)});
    ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
  }
}
function drawWeather(){
  const w=ME.world.weather;if(w!=="rain"&&w!=="storm")return;
  const n=CFG.particles>=2?(w==="storm"?150:100):55;
  while(rain.length<n)rain.push({x:Math.random()*vw,y:Math.random()*vh,s:5+Math.random()*4});
  if(rain.length>n)rain.length=n;
  ctx.strokeStyle=w==="storm"?"rgba(190,210,235,.55)":"rgba(190,210,235,.4)";ctx.lineWidth=1;ctx.beginPath();
  rain.forEach(r=>{ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-2,r.y+7);r.y+=r.s*(paused?0:1);r.x-=.7*(paused?0:1);if(r.y>vh){r.y=-8;r.x=Math.random()*vw+10}if(r.x<0)r.x=vw});
  ctx.stroke();
  if(w==="storm"){
    if(flash>0){ctx.fillStyle=`rgba(235,240,255,${flash*.5})`;ctx.fillRect(0,0,vw,vh);flash-=.05}
    else if(Math.random()<.0012&&!paused){flash=1}
  }
}
function drawMinimap(){
  const mm=document.getElementById("mm"),c=mm.getContext("2d"),W=mm.width,H=mm.height;
  c.fillStyle="#1a2530";c.fillRect(0,0,W,H);
  if(player.scene!=="out"){c.fillStyle="#cfd8dc";c.font="bold 11px sans-serif";c.textAlign="center";c.fillText("Interior",W/2,H/2+4);return}
  if(!MAPUI.img)return;
  const S=.25,sx=player.x*S-W/2,sy=player.y*S-H/2;c.drawImage(MAPUI.img,sx,sy,W,H,0,0,W,H);
  if(isXTX()){c.fillStyle="rgba(142,68,173,.6)";c.fillRect(XTX.x*S-sx,XTX.y*S-sy,XTX.w*S,XTX.h*S)}
  NET.others.forEach(o=>{if(o.scene!=="out")return;c.fillStyle="#4ac3ff";c.fillRect(o.x*S-sx-2,o.y*S-sy-2,4,4)});
  c.fillStyle="#b5ed67";c.fillRect(W/2-3,H/2-3,6,6);c.strokeStyle="#142018";c.lineWidth=1;c.strokeRect(W/2-3,H/2-3,6,6);
}
let hudT=0;
function updateHUD(){
  const set=(id,v)=>{const e=document.getElementById(id);if(e&&e.textContent!==v)e.textContent=v};
  set("hud-money",money(player.money));set("hud-id","#"+(ME.pid==null?"?":ME.pid));set("hud-level",String(ME.level||1));
  const h=gameHour(),hh=Math.floor(h),mm=Math.floor((h-hh)*60);
  set("hud-clock",CFG.clock24?String(hh).padStart(2,"0")+":"+String(mm).padStart(2,"0"):((hh%12)||12)+":"+String(mm).padStart(2,"0")+(hh>=12?" PM":" AM"));
  const wi={clear:"☀️",cloudy:"☁️",rain:"🌧️",storm:"⛈️"}[ME.world.weather]||"";set("hud-weather",wi);
  const bar=(id,v)=>{const e=document.getElementById(id);if(e){e.style.width=Math.max(0,Math.min(100,v))+"%";e.parentNode.parentNode.classList.toggle("low",v<20)}};
  bar("b-hp",player.hp);bar("b-food",player.hunger);bar("b-water",player.thirst);bar("b-nrg",player.energy);
  set("v-hp",Math.round(player.hp)+"");set("v-food",Math.round(player.hunger)+"");set("v-water",Math.round(player.thirst)+"");set("v-nrg",Math.round(player.energy)+"");
  const tg=[];if(player.hunger<20)tg.push("HAMBRE");if(player.thirst<20)tg.push("SED");if(player.energy<10)tg.push("CANSADO");if(player.armor>0)tg.push("🦺");if(PW.fly&&ME.creator)tg.push("VUELO");if(NET.hidden)tg.push("INVISIBLE");set("tags",tg.join(" · "));
  const pr=document.getElementById("prompt");
  if(HOSPS.locked){pr.textContent=HOSPS.done?"E · Levantarte":"";pr.style.display=HOSPS.done?"block":"none"}
  else{const a=getInteract();let txt=a?a.t:"";if(!a&&!player.driving&&player.scene==="out"&&cars.some(c=>dist(c.x,c.y,player.x,player.y)<60))txt="F · Subir al vehículo";if(player.driving)txt="F · Bajar del vehículo";
    pr.textContent=txt;pr.style.display=txt?"block":"none"}
  const fu=document.getElementById("fuel"),dc=player.driving;
  if(fu){if(dc&&dc.owned&&!dc.work){fu.style.display="block";document.getElementById("fuel-fill").style.width=Math.max(0,dc.fuel)+"%";document.getElementById("fuel-pct").textContent="⛽ "+Math.round(dc.fuel)+"%";fu.classList.toggle("low",dc.fuel<15)}
    else if(dc&&dc.work){fu.style.display="block";document.getElementById("fuel-fill").style.width="100%";document.getElementById("fuel-pct").textContent="🚚 Vehículo de trabajo · sin gasto";fu.classList.remove("low")}else fu.style.display="none"}
  const hv=document.getElementById("hurt");if(hv)hv.style.opacity=player.hurt>0?Math.min(.5,player.hurt/28):0;
}
function frame(now){
  requestAnimationFrame(frame);
  const el=now-lastT,cap=CFG.fps?1000/CFG.fps-2:0;if(el<cap)return;
  lastT=now;const dt=Math.min(3,el/16.667);frameN++;
  fpsAcc+=el;fpsCount++;if(fpsAcc>=500){fpsNow=Math.round(fpsCount*1000/fpsAcc);fpsAcc=0;fpsCount=0;if(CFG.showFps)document.getElementById("fps").textContent=fpsNow+" FPS";autoPerf()}
  if(!started)return;
  if(!paused)updateWorld(dt);else{updateGhosts(dt);updateParticles(dt)}
  updateHospital(dt);updateOthers(dt);
  if(!MAPUI.open){updateCamera();if(player.scene==="out")renderOut();else renderIn()}
  if((hudT+=dt)>=6){hudT=0;updateHUD();drawMinimap();audioAmbient(player.scene,gameHour(),ME.world.weather,performance.now())}
}
// Optimización automática: baja un nivel si el rendimiento es bajo de forma sostenida
function autoPerf(){
  if(!CFG.autoperf||!started||paused){perfT=0;return}
  if(fpsNow<(CFG.fps&&CFG.fps<60?CFG.fps*.75:38)){perfT+=.5}else perfT=Math.max(0,perfT-.25);
  if(perfT>=4){
    perfT=0;let msg="";
    if(CFG.particles>0){CFG.particles=0;msg="partículas desactivadas"}
    else if(CFG.lighting>1){CFG.lighting=1;msg="iluminación simplificada"}
    else if(CFG.shadows>0){CFG.shadows=0;msg="sombras desactivadas"}
    else if(CFG.pixel<3){CFG.pixel++;msg="escala de píxeles "+CFG.pixel+"×"}
    if(msg){CFG.preset="custom";onSettings();toast("Optimización automática: "+msg)}
  }
}
requestAnimationFrame(frame);
