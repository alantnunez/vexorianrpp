// VEXORIAN RP · V5 · vehículos y tráfico (tráfico reducido y simulado solo cerca del jugador)
const cars=[ // autos públicos (cualquiera puede subir)
  {x:480,y:490,a:0,v:0,color:"#c94f45",name:"Sedán rojo",type:"sedan"},
  {x:1000,y:1075,a:Math.PI,v:0,color:"#e0b93a",name:"Taxi",type:"taxi"},
  {x:260,y:652,a:Math.PI,v:0,color:"#3d6fb5",name:"Pickup azul",type:"sedan"},
  {x:3500,y:2180,a:0,v:0,color:"#6b3fa0",name:"Auto morado",type:"sedan"}
];
// Carriles generados desde las calles (0=este, 1=sur, 2=oeste, 3=norte)
const LANES=[];
WORLD.hRoads.forEach(r=>{LANES.push({dir:0,y:r.y+r.h*.75,min:r.x,max:r.x+r.w});LANES.push({dir:2,y:r.y+r.h*.25,min:r.x,max:r.x+r.w})});
WORLD.vRoads.forEach(r=>{LANES.push({dir:1,x:r.x+r.w*.25,min:r.y,max:r.y+r.h});LANES.push({dir:3,x:r.x+r.w*.75,min:r.y,max:r.y+r.h})});
const AI_COUNT=7,AI_RANGE=1300;
const aiCars=[];
(function(){
  const R=rng(3),col=["#d9d9d9","#2f3a4a","#7c3f58","#3d8a64","#caa53b","#b2493d","#4a76b8","#5b5f66"],pick=[0,3,5,8,11,14,18];
  for(let i=0;i<AI_COUNT;i++){
    const l=LANES[pick[i]%LANES.length],hz=l.y!==undefined,along=l.min+80+R()*(l.max-l.min-160);
    aiCars.push({x:hz?along:l.x,y:hz?l.y:along,dir:l.dir,lane:l,a:l.dir*Math.PI/2,v:0,max:1.2+R()*.8,stuck:0,braking:false,ai:true,color:col[i%col.length],name:"Auto",type:"sedan"});
  }
})();

function updateAI(dt){
  if(player.scene!=="out")return;
  const near=o=>Math.abs(o.x-player.x)<AI_RANGE+300&&Math.abs(o.y-player.y)<AI_RANGE+300;
  const obs=[];
  cars.forEach(c=>{if(near(c))obs.push(c)});aiCars.forEach(c=>{if(near(c))obs.push(c)});
  npcs.forEach(n=>{if(n.scene==="out"&&near(n))obs.push(n)});
  if(!player.driving)obs.push(player);
  aiCars.forEach(c=>{
    if(Math.abs(c.x-player.x)>AI_RANGE||Math.abs(c.y-player.y)>AI_RANGE)return; // fuera de rango: congelado
    const a=c.dir*Math.PI/2,ux=Math.cos(a),uy=Math.sin(a);let block=false;c.a=a;
    for(const o of obs){
      if(o===c)continue;
      const rx=o.x-c.x,ry=o.y-c.y,ah=rx*ux+ry*uy;
      if(ah<8||ah>64)continue;
      if(Math.abs(-rx*uy+ry*ux)<19){block=true;break}
    }
    if(block&&c.stuck<240){c.v=Math.max(0,c.v-.22*dt);c.stuck+=dt;c.braking=true}
    else{c.v=Math.min(c.max,c.v+.05*dt);c.braking=false;if(!block)c.stuck=0;else{c.stuck+=dt;if(c.stuck>420)c.stuck=0}}
    c.x+=ux*c.v*dt;c.y+=uy*c.v*dt;
    const l=c.lane;
    if(l.x!==undefined){if(c.y>l.max)c.y=l.min;if(c.y<l.min)c.y=l.max}else{if(c.x>l.max)c.x=l.min;if(c.x<l.min)c.x=l.max}
  });
}

function carBlocked(c,x,y){
  const co=Math.cos(c.a),si=Math.sin(c.a);
  for(const p of [[18,-9],[18,9],[-18,-9],[-18,9],[0,0]])if(blockedAt("out",x+p[0]*co-p[1]*si,y+p[0]*si+p[1]*co,1,1))return true;
  return false;
}
function driveCar(dt){
  const c=player.driving,spd=c.spd||1,ox=c.x,oy=c.y,noFuel=c.owned&&!c.work&&c.fuel<=0;
  const tk=typeof touchInput!=="undefined"?touchInput:{dx:0,dy:0};
  const up=keys.w||keys.arrowup||tk.dy<-.4,dn=keys.s||keys.arrowdown||tk.dy>.4,lf=keys.a||keys.arrowleft||tk.dx<-.4,rt=keys.d||keys.arrowright||tk.dx>.4;
  if(up&&noFuel){c.v*=Math.pow(.985,dt);if(frameN%200===0)toast("Sin combustible. Llena el tanque en una gasolinera (⛽).")}
  else if(up)c.v+=.14*dt*spd;else if(dn)c.v-=(c.v>0?.28:.1)*dt;else c.v*=Math.pow(.985,dt);
  if(keys[" "]||touchInput.brake)c.v*=Math.pow(.88,dt);
  c.v=Math.max(-2.2,Math.min(5.2*spd,c.v));
  c.braking=!!((dn&&c.v>.3)||keys[" "]);
  const steer=(rt?1:0)-(lf?1:0);
  c.a+=steer*.048*dt*Math.min(1,Math.abs(c.v)/1.8)*(c.v<0?-1:1);
  const co=Math.cos(c.a),si=Math.sin(c.a),nx=c.x+co*c.v*dt,ny=c.y+si*c.v*dt;
  if(carBlocked(c,nx,ny)&&!(PW.fly&&ME.creator)){
    if(Math.abs(c.v)>2.2){for(let i=0;i<6;i++)spawnP(c.x+co*20,c.y+si*20,{vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,m:14,s:2,c:"#ffd04a",al:.9});sfxHit()}
    c.v*=-.25;
  }else{c.x=nx;c.y=ny}
  aiCars.forEach(o=>{
    const d=Math.hypot(o.x-c.x,o.y-c.y);
    if(d<30){const k=(30-d)/30;c.x-=(o.x-c.x)/(d||1)*k*3;c.y-=(o.y-c.y)/(d||1)*k*3;c.v*=.8}
  });
  if(c.owned&&!c.work){ // los autos personales gastan combustible; los de trabajo no
    c.fuel=Math.max(0,(c.fuel==null?100:c.fuel)-Math.hypot(c.x-ox,c.y-oy)/200);
    if((c.fsT=(c.fsT||0)+dt)>1200){c.fsT=0;fuelSync(c)}
  }
  player.x=c.x;player.y=c.y;player.moving=false;
  if(up&&!noFuel&&Math.random()<.5*dt)spawnP(c.x-co*22,c.y-si*22,{vx:-co*.3+(Math.random()-.5)*.3,vy:-si*.3-.15+(Math.random()-.5)*.3,m:28,s:3,c:"#b9bdbb",grow:1,al:.35});
}
function toggleCar(){
  if(!canControl())return;
  if(player.scene!=="out"){toast("No puedes conducir aquí dentro.");return}
  if(player.driving){
    const c=player.driving;
    const spots=[1,-1].map(s=>({x:c.x+Math.cos(c.a+s*Math.PI/2)*30,y:c.y+Math.sin(c.a+s*Math.PI/2)*30}));
    const spot=spots.find(p=>!footBlocked("out",p.x,p.y));
    if(!spot){toast("No hay espacio para bajar aquí.");return}
    addGhost(c.x,c.y,spot.x,spot.y,"out",player);
    player.x=spot.x;player.y=spot.y;c.v=0;player.driving=null;sfxDoor(false);
    if(c.owned&&c.id){fuelSync(c)}
    if(c.owned&&c.id)rpc("park_vehicle",{p_id:c.id,p_x:c.x,p_y:c.y,p_a:c.a}).catch(()=>{});
    toast("Has salido del vehículo");return;
  }
  if(player.carry){toast("Primero deja el paquete.");return}
  player.armed=false;
  let best=null,bd=60;
  cars.forEach(c=>{const d=Math.hypot(c.x-player.x,c.y-player.y);if(d<bd){bd=d;best=c}});
  if(best){
    addGhost(player.x,player.y,best.x,best.y,"in",player);
    player.driving=best;best.v=0;sfxDoor(true);toast(best.name+": W/S acelerar · A/D girar · Espacio frenar");
  }else toast("Acércate a un vehículo y pulsa F.");
}
function drawCar(c,x0){
  const x=Math.round(c.x),y=Math.round(c.y);
  if(CFG.shadows>0){x0.fillStyle="rgba(0,0,0,.28)";x0.beginPath();x0.ellipse(x+3,y+6,22,12,c.a,0,7);x0.fill()}
  drawCarShape(x0,x,y,c.a,c.color,c.type,c.braking);
}
// ----- Vehículos propios (guardados en la cuenta) -----
function addOwnedCar(v,idx){
  const slot=DEALER_SLOTS[idx%DEALER_SLOTS.length],model=(ME.catalog.vehicles||[]).find(m=>m.veh_key===v.model)||{name:"Auto",speed:1};
  cars.push({fuel:v.fuel==null?100:v.fuel,x:v.x!=null?v.x:slot[0],y:v.y!=null?v.y:slot[1],a:v.a!=null?v.a:slot[2],v:0,color:v.color,name:model.name+" ("+v.plate+")",type:"sedan",owned:true,id:v.id,spd:model.speed||1});
}
function loadOwnedCars(){for(let i=cars.length-1;i>=0;i--)if(cars[i].owned)cars.splice(i,1);(ME.vehicles||[]).forEach((v,i)=>addOwnedCar(v,i))}

function fuelSync(c){if(c.owned&&c.id)rpc("vehicle_fuel_sync",{p_id:c.id,p_fuel:Math.round(c.fuel*10)/10}).catch(()=>{})}
// ----- Vehículo de trabajo (transportista): no consume combustible ni dinero personal -----
let WORKVAN=null;
function spawnWorkVan(){
  removeWorkVan();
  WORKVAN={x:WORK_VAN_SPAWN.x,y:WORK_VAN_SPAWN.y,a:WORK_VAN_SPAWN.a,v:0,color:"#e0803a",name:"Furgoneta de trabajo",type:"sedan",work:true,spd:.95};
  cars.push(WORKVAN);
}
function removeWorkVan(){
  if(!WORKVAN)return;
  if(player.driving===WORKVAN){player.x=WORKVAN.x+Math.cos(WORKVAN.a+Math.PI/2)*30;player.y=WORKVAN.y+Math.sin(WORKVAN.a+Math.PI/2)*30;player.driving=null}
  const i=cars.indexOf(WORKVAN);if(i>=0)cars.splice(i,1);WORKVAN=null;
}
