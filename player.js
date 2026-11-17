// VEXORIAN RP · V5 · jugador
const player={x:240,y:356,scene:"out",speed:2,face:"d",anim:0,moving:false,running:false,name:"Jugador",energy:100,money:500,carry:false,driving:null,
  skin:"#e0ac7e",hair:"#3f2a1e",shirt:"#2f6fb5",pants:"#2b3350",tag:"#ffffff",
  hp:100,hunger:100,thirst:100,armor:0,gang:"",weapon:false,armed:false,aim:0,ammo:12,reserve:0,inv:{},hasPhone:false,
  hurt:0,flash:0,safe:0,dead:false,bubble:"",bubbleT:0,stepPh:0,lying:false,sit:false,pose:null,furn:null,home:null,homeOwner:""};
// Poderes del CREATOR (solo se activan si el servidor confirmó el rol)
const PW={fly:false,speed:false,invisible:false};
const keys={};
const GHOSTS=[]; // animación suave al subir o bajar de vehículos

window.addEventListener("keydown",e=>{
  const t=e.target&&e.target.tagName;if(t==="INPUT"||t==="SELECT"||t==="TEXTAREA")return;
  const k=e.key.toLowerCase();keys[k]=true;
  if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k))e.preventDefault();
});
window.addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false});
window.addEventListener("blur",()=>{for(const k in keys)keys[k]=false});

function tryMove(o,mx,my){
  if(!footBlocked(o.scene,o.x+mx,o.y))o.x+=mx;
  if(!footBlocked(o.scene,o.x,o.y+my))o.y+=my;
}
function vitalsLow(){return player.hunger<20||player.thirst<20}
function canControl(){return !player.dead&&!HOSPS.locked&&!player.pose}
const ROLE_COL={CREATOR:"#ffd04a",ADMIN:"#ff6b6b",VIP:"#5fe3ff",XTX:"#d6a6ff"};

function updatePlayer(dt){
  if(player.pose){player.moving=false;player.running=false;if(player.pose==="lie"&&player.energy<100)player.energy=Math.min(100,player.energy+.06*dt);return}
  if(!canControl()){player.moving=false;player.running=false;return}
  const tk=typeof touchInput!=="undefined"?touchInput:{dx:0,dy:0,run:false};
  let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+tk.dx;
  let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+tk.dy;
  const mag=Math.hypot(dx,dy);if(mag>1){dx/=mag;dy/=mag}
  player.moving=mag>.12;
  const fly=PW.fly&&ME.creator,boost=PW.speed&&ME.creator;
  const running=(!!keys.shift||tk.run)&&(player.energy>2||boost)&&player.moving;player.running=running;
  if(player.moving){
    if(Math.abs(dx)>=Math.abs(dy)&&Math.abs(dx)>.2)player.face=dx<0?"l":"r";else if(Math.abs(dy)>.2)player.face=dy<0?"u":"d";
    const tired=(player.energy<10?.85:1)*(vitalsLow()?.92:1);
    const sp=player.speed*tired*(vipOn("speed")?1.2:1)*(running?1.6:1)*(boost?(running?3.2:2):1)*(fly?1.6:1)*dt;
    if(fly){player.x=Math.max(10,Math.min(WORLD.width-10,player.x+dx*sp));player.y=Math.max(10,Math.min(WORLD.height-10,player.y+dy*sp))}
    else tryMove(player,dx*sp,dy*sp);
    player.anim+=(running?.34:.22)*dt;
    player.stepPh+=(running?.34:.22)*dt;if(player.stepPh>Math.PI){player.stepPh-=Math.PI;if(!fly&&typeof sfxStep==="function")sfxStep(running)}
    if(running&&Math.random()<.35*dt)spawnP(player.x+(Math.random()-.5)*8,player.y+14,{vx:(Math.random()-.5)*.3,vy:-.15,m:22,s:2,c:"#d2caa8",al:.5});
  }
  if(player.armed){const a=player.aim;player.face=Math.abs(Math.cos(a))>=Math.abs(Math.sin(a))?(Math.cos(a)<0?"l":"r"):(Math.sin(a)<0?"u":"d")}
  const low=vitalsLow()?.4:1;
  if(running&&!boost)player.energy=Math.max(0,player.energy-.03*dt);
  else if(player.carry&&player.moving)player.energy=Math.max(0,player.energy-.006*dt);
  else player.energy=Math.min(100,player.energy+(player.moving?.003:.012)*low*dt);
  if(player.hurt>0)player.hurt-=dt;
  if(player.flash>0)player.flash-=dt;
  if(player.safe>0)player.safe-=dt;
}

function tag(txt,x,y,col){
  ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.lineWidth=3;ctx.lineJoin="round";
  ctx.strokeStyle="rgba(0,0,0,.8)";ctx.strokeText(txt,x,y);ctx.fillStyle=col||"#fff";ctx.fillText(txt,x,y);
}
function bubble(c,txt,x,y){
  if(txt.length>42)txt=txt.slice(0,41)+"…";
  c.font="bold 8px sans-serif";c.textAlign="center";
  const w=Math.ceil(c.measureText(txt).width)+10;
  c.fillStyle="#0b0f0d";c.fillRect(x-w/2-1,y-11,w+2,15);
  c.fillStyle="#fff";c.fillRect(x-w/2,y-10,w,13);c.fillRect(x-2,y+3,4,3);
  c.fillStyle="#111";c.fillText(txt,x,y);
}
function drawLying(c,o){
  const x=Math.round(o.x),y=Math.round(o.y);
  if(CFG.shadows>0){c.fillStyle="rgba(0,0,0,.2)";c.fillRect(x-14,y-26,28,66)}
  c.fillStyle="#9fd1e6";c.fillRect(x-13,y-14,26,52);c.fillStyle="#bfe3f2";c.fillRect(x-13,y-14,26,6);
  c.fillStyle="rgba(0,0,0,.12)";for(let k=0;k<4;k++)c.fillRect(x-13,y-4+k*9,26,1);
  c.fillStyle=o.shirt;c.fillRect(x-11,y-20,22,8);
  c.fillStyle="#fff";c.fillRect(x-9,y-34,18,16);
  c.fillStyle=o.skin;c.fillRect(x-5,y-32,10,10);c.fillStyle=o.hair;c.fillRect(x-5,y-33,10,4);
  c.fillStyle="#222";c.fillRect(x-3,y-27,2,1);c.fillRect(x+1,y-27,2,1);
  c.fillStyle=o.skin;c.fillRect(x-17,y-8,4,10);c.fillRect(x+13,y-8,4,10);
}
function roleColor(r){return ROLE_COL[r||""]||"#ffffff"}
function labelFor(name,pid){return pid!=null&&pid>=0?name+" #"+pid:name}
function drawSitting(c,o){
  const x=Math.round(o.x),y=Math.round(o.y),face=o.face||"d";
  if(CFG.shadows>0){c.fillStyle="rgba(0,0,0,.22)";c.fillRect(x-8,y+12,16,4)}
  if(face==="l"){c.fillStyle=o.pants;c.fillRect(x-14,y+4,11,5);c.fillStyle="#1c1c1c";c.fillRect(x-16,y+3,3,6)}
  else if(face==="r"){c.fillStyle=o.pants;c.fillRect(x+3,y+4,11,5);c.fillStyle="#1c1c1c";c.fillRect(x+13,y+3,3,6)}
  else if(face==="d"){c.fillStyle=o.pants;c.fillRect(x-5,y+6,10,7);c.fillStyle="#1c1c1c";c.fillRect(x-5,y+12,4,3);c.fillRect(x+1,y+12,4,3)}
  c.fillStyle=o.shirt;c.fillRect(x-6,y-5,12,12);
  if(o.armor>0){c.fillStyle="#3a3f4a";c.fillRect(x-5,y-4,10,10)}
  c.fillStyle=o.shirt;c.fillRect(x-9,y-3,3,8);c.fillRect(x+6,y-3,3,8);c.fillStyle=o.skin;c.fillRect(x-9,y+4,3,2);c.fillRect(x+6,y+4,3,2);
  c.fillStyle=o.skin;c.fillRect(x-5,y-15,10,10);c.fillStyle=o.hair;
  if(face==="u")c.fillRect(x-5,y-16,10,11);else{c.fillRect(x-5,y-16,10,4);c.fillRect(x-5,y-16,2,7);c.fillRect(x+3,y-16,2,7)}
  c.fillStyle="#222";if(face==="d"){c.fillRect(x-3,y-11,2,2);c.fillRect(x+1,y-11,2,2)}else if(face==="l")c.fillRect(x-4,y-11,2,2);else if(face==="r")c.fillRect(x+2,y-11,2,2);
}
function drawPerson(c,o,label,lcol){
  if(o.sit){drawSitting(c,o);if(label)tag(label,Math.round(o.x),Math.round(o.y)-26,lcol||o.tag);if(o.bubbleT>0&&o.bubble)bubble(c,o.bubble,Math.round(o.x),Math.round(o.y)-34);return}
  if(o.lying){drawLying(c,o);if(label)tag(label,Math.round(o.x),Math.round(o.y)-44,lcol||o.tag);return}
  const x=Math.round(o.x),y=Math.round(o.y),mv=o.moving,sw=mv?Math.round(Math.sin(o.anim||0)*2):0,face=o.face||"d";
  if(CFG.shadows>0){c.fillStyle="rgba(0,0,0,.28)";c.fillRect(x-7,y+14,14,4);c.fillRect(x-5,y+13,10,6)}
  if(o.down){
    c.fillStyle=o.pants;c.fillRect(x+7,y+4,9,8);c.fillStyle=o.shirt;c.fillRect(x-8,y+3,16,10);
    c.fillStyle=o.skin;c.fillRect(x-16,y+3,9,9);c.fillStyle=o.hair;c.fillRect(x-16,y+3,9,3);c.fillStyle="#c0392b";c.fillRect(x-2,y+8,6,3);
    return;
  }
  const lL=7-(sw>0?1:0),lR=7-(sw<0?1:0);
  c.fillStyle=o.pants;c.fillRect(x-5,y+6,4,lL);c.fillRect(x+1,y+6,4,lR);
  c.fillStyle="#1c1c1c";c.fillRect(x-5,y+4+lL,4,2);c.fillRect(x+1,y+4+lR,4,2);
  c.fillStyle=o.shirt;c.fillRect(x-6,y-6,12,13);
  if(o.armor>0){c.fillStyle="#3a3f4a";c.fillRect(x-5,y-5,10,11);c.fillStyle="#8e44ad";c.fillRect(x-1,y-5,2,11)}
  c.fillStyle="rgba(0,0,0,.16)";c.fillRect(x+3,y-6,3,13);
  c.fillStyle="#1f1f1f";c.fillRect(x-6,y+5,12,2);
  if(o.carry){c.fillStyle=o.shirt;c.fillRect(x-9,y-4,3,7);c.fillRect(x+6,y-4,3,7)}
  else{
    c.fillStyle=o.shirt;c.fillRect(x-9,y-5-sw,3,8);c.fillRect(x+6,y-5+sw,3,8);
    c.fillStyle=o.skin;c.fillRect(x-9,y+2-sw,3,2);c.fillRect(x+6,y+2+sw,3,2);
  }
  c.fillStyle=o.skin;c.fillRect(x-5,y-16,10,10);
  c.fillStyle=o.hair;
  if(face==="u")c.fillRect(x-5,y-17,10,11);
  else{c.fillRect(x-5,y-17,10,4);c.fillRect(x-5,y-17,2,7);c.fillRect(x+3,y-17,2,7)}
  if(face==="d"){c.fillStyle="#222";c.fillRect(x-3,y-12,2,2);c.fillRect(x+1,y-12,2,2)}
  else if(face==="l"){c.fillStyle="#222";c.fillRect(x-4,y-12,2,2)}
  else if(face==="r"){c.fillStyle="#222";c.fillRect(x+2,y-12,2,2)}
  if(o.carry){
    c.fillStyle="#7d5429";c.fillRect(x-9,y-7,18,14);c.fillStyle="#c28d54";c.fillRect(x-8,y-6,16,12);
    c.fillStyle="#d9a96c";c.fillRect(x-8,y-6,16,3);c.fillStyle="#e8cc9a";c.fillRect(x-1,y-6,2,12);
    c.fillStyle=o.skin;c.fillRect(x-9,y+1,3,3);c.fillRect(x+6,y+1,3,3);
  }
  if(o.armed){
    const a=o.aim||0;
    c.save();c.translate(x,y-1);c.rotate(a);
    c.fillStyle="#1b1b1b";c.fillRect(4,-1,11,3);c.fillStyle="#3d3d3d";c.fillRect(4,-1,11,1);c.fillStyle="#2a2a2a";c.fillRect(5,2,3,4);
    if(o.flash>0){c.fillStyle="#ffe27a";c.fillRect(15,-2,5,5)}
    c.restore();
    c.fillStyle=o.skin;c.fillRect(x+Math.round(Math.cos(a)*6)-1,y-2+Math.round(Math.sin(a)*6),3,3);
  }
  {const mx=o.maxhp||100;if(o.hp!=null&&o.hp<mx&&o.hp>0&&!o.noHpBar){c.fillStyle="#000";c.fillRect(x-11,y-27,22,4);c.fillStyle="#ff5d6c";c.fillRect(x-10,y-26,Math.max(0,20*o.hp/mx),2)}}
  if(label)tag(label,x,y-30,lcol||o.tag);
  if(o.bubbleT>0&&o.bubble)bubble(c,o.bubble,x,y-38);
}
// Fantasma de transición vehículo ↔ peatón
function addGhost(x0,y0,x1,y1,dir,o){GHOSTS.push({x0,y0,x1,y1,dir,t:0,dur:16,o:{skin:o.skin||"#e0ac7e",hair:o.hair||"#3f2a1e",shirt:o.shirt||"#888",pants:o.pants||"#2b3350",face:"d",moving:false,anim:0}})}
function updateGhosts(dt){for(let i=GHOSTS.length-1;i>=0;i--){GHOSTS[i].t+=dt;if(GHOSTS[i].t>=GHOSTS[i].dur)GHOSTS.splice(i,1)}}
function drawGhosts(c){
  GHOSTS.forEach(g=>{
    const k=Math.min(1,g.t/g.dur),e=k*k*(3-2*k),a=g.dir==="in"?1-e:e;
    c.globalAlpha=Math.max(0,Math.min(1,a));
    drawPerson(c,Object.assign({},g.o,{x:g.x0+(g.x1-g.x0)*e,y:g.y0+(g.y1-g.y0)*e,moving:true,anim:g.t*.3}),null);
  });
  c.globalAlpha=1;
}
