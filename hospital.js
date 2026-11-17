// VEXORIAN RP · V5 · hospital y muerte. La recuperación se calcula con la hora del SERVIDOR y se guarda en la base de datos:
// recargar la página no permite saltarse el proceso.
const HOSPS={active:false,locked:false,bed:0,startedMs:0,startHp:5,rate:1.4,done:false,releasing:false,pct:0};

function hospHpNow(){return Math.min(100,HOSPS.startHp+HOSPS.rate*Math.max(0,(serverNow()-HOSPS.startedMs))/1000)}
async function playerDied(by){
  if(player.dead||HOSPS.active)return;
  player.dead=true;player.armed=false;player.carry=false;job.active=false;job.order=null;mouse.down=false;
  if(player.pose){player.pose=null;player.sit=false;player.lying=false;player.furn=null;document.getElementById("pose-ui").style.display="none"}
  if(player.scene==="home"){player.home=null;rpc("leave_house").catch(()=>{})}
  if(typeof TJ!=="undefined"&&TJ.run){rpc("transport_cancel").catch(()=>{});tjClear()}
  if(player.driving){player.driving.v=0;player.driving=null}
  sendSys("💀 "+ME.username+(by?" fue abatido por "+by:" ha caído"));
  const d=document.getElementById("death");d.style.display="grid";document.getElementById("death-msg").textContent="Has caído… trasladándote al hospital";
  for(let i=0;i<14;i++)spawnP(player.x+(Math.random()-.5)*14,player.y+(Math.random()-.5)*10,{vx:(Math.random()-.5)*1.5,vy:-Math.random()*1.5,m:30,s:3,c:"#c0392b",al:.8});
  updateMission();
  let r=null,tries=0;
  while(!r&&tries<6){
    try{r=await rpc("report_death",{p_by:by||null})}catch(e){tries++;await new Promise(res=>setTimeout(res,1200))}
  }
  if(!r){r={bed:0,started_ms:serverNow(),start_hp:5,rate:1.4,loss:0}}
  if(typeof r.money==="number")player.money=r.money;
  beginHospital(r);
  if(r.loss)toast("El hospital te cobró "+money(r.loss)+" por la atención.");
  setTimeout(()=>{document.getElementById("death").style.display="none"},500);
}
function beginHospital(r){
  HOSPS.active=true;HOSPS.locked=true;HOSPS.done=false;HOSPS.releasing=false;
  HOSPS.bed=r.bed||0;HOSPS.startedMs=r.started_ms;HOSPS.startHp=r.start_hp;HOSPS.rate=r.rate||1.4;
  const b=HOSP.beds[HOSPS.bed]||HOSP.beds[0];
  player.dead=false;player.driving=null;player.armed=false;player.carry=false;player.scene="hosp";player.lying=true;player.x=b.cx;player.y=b.cy;player.face="d";
  player.hp=hospHpNow();closeAllUI();
  document.getElementById("hosp-ui").style.display="block";
  updateHospitalUI();
}
function updateHospital(dt){
  if(!HOSPS.active)return;
  const hp=hospHpNow();player.hp=Math.min(100,hp);HOSPS.pct=Math.floor(hp);
  if(hp>=100&&!HOSPS.done){HOSPS.done=true;toast("Estás recuperado al 100%. Pulsa E para levantarte.");sfxMsg()}
  updateHospitalUI();
}
function updateHospitalUI(){
  const f=document.getElementById("hosp-fill"),p=document.getElementById("hosp-pct"),m=document.getElementById("hosp-msg"),b=document.getElementById("hosp-btn");if(!f)return;
  f.style.width=Math.min(100,HOSPS.pct||Math.floor(player.hp))+"%";p.textContent=Math.min(100,Math.floor(player.hp))+"%";
  m.textContent=HOSPS.done?"Recuperación completa":"Recuperándote en la camilla "+(HOSPS.bed+1)+"…";
  b.style.display=HOSPS.done?"block":"none";
}
async function leaveBed(){
  if(!HOSPS.active||!HOSPS.done||HOSPS.releasing)return;
  HOSPS.releasing=true;
  try{
    await rpc("hospital_release");
    const b=HOSP.beds[HOSPS.bed]||HOSP.beds[0];
    HOSPS.active=false;HOSPS.locked=false;player.lying=false;player.hp=100;player.safe=240;player.x=b.out.x;player.y=b.out.y;
    document.getElementById("hosp-ui").style.display="none";toast("Ya puedes volver a la ciudad. ¡Cuídate!");sfxDoor(true);saveGame(true);
  }catch(e){toast(e.message);HOSPS.done=false;HOSPS.startedMs-=2000}
  HOSPS.releasing=false;
}
