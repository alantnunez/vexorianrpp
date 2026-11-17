// VEXORIAN RP · V5 · mapa interactivo de la ciudad completa (tecla M)
const MAPUI={open:false,cv:null,c:null,img:null,z:.25,ox:0,oy:0,drag:null,pts:new Map(),pinch:0,showPlayers:true,legend:[]};
function buildMapImage(){
  const S=.25,cv=mk(Math.ceil(MAP_W*S),Math.ceil(MAP_H*S)),c=cv.getContext("2d");
  c.scale(S,S);c.fillStyle="#7fae6a";c.fillRect(0,0,MAP_W,MAP_H);
  WORLD.roads.forEach(r=>{c.fillStyle="#d9d6cc";c.fillRect(r.x-SW,r.y-SW,r.w+SW*2,r.h+SW*2)});
  WORLD.roads.forEach(r=>{c.fillStyle="#5d646a";c.fillRect(r.x,r.y,r.w,r.h)});
  WORLD.inter.forEach(n=>{c.fillStyle="#5d646a";c.fillRect(n.x-2,n.y-2,n.w+4,n.h+4)});
  WORLD.roads.forEach(r=>{c.fillStyle="#e3c04a";if(r.w>r.h)c.fillRect(r.x,r.y+r.h/2-1.5,r.w,3);else c.fillRect(r.x+r.w/2-1.5,r.y,3,r.h)});
  WORLD.trees.forEach(t=>{c.fillStyle="#4f8a56";c.beginPath();c.arc(t.x,t.y,14,0,7);c.fill()});
  const colr={park:"#6fb45c",parking:"#8a9094",gas:"#6b8f7a",house:"#e6d8bd",hospital:"#f1f4f5",depot:"#b9c2c9"};
  WORLD.buildings.forEach(b=>{
    c.fillStyle=colr[b.type]||shade(b.color,.35);c.fillRect(b.x,b.y,b.w,b.h);
    if(b.type==="house"){c.fillStyle=b.accent;c.fillRect(b.x,b.y,b.w,26)}
    c.strokeStyle="rgba(0,0,0,.25)";c.lineWidth=3;c.strokeRect(b.x,b.y,b.w,b.h);
    if(b.type==="hospital"){c.fillStyle="#d93b3b";c.fillRect(b.x+b.w/2-12,b.y+b.h/2-40,24,80);c.fillRect(b.x+b.w/2-40,b.y+b.h/2-12,80,24)}
    if(b.type==="park"&&b.lake){c.fillStyle="#5aa8d6";c.beginPath();c.ellipse(b.x+b.w/2,b.y+b.h/2,b.w*.27,b.h*.2,0,0,7);c.fill()}
  });
  MAPUI.img=cv;
  MAPUI.legend=WORLD.buildings.filter(b=>b.poi&&["almacen","supermercado","concesionario","hospital","transporte","moda"].includes(b.zone)).map(b=>({n:b.name,i:b.poi,x:b.x+b.w/2,y:b.y+b.h/2}));
  WORLD.gas.forEach(b=>MAPUI.legend.push({n:b.name,i:"⛽",x:b.x+b.w/2,y:b.y+b.h/2}));
}
const DISTRICTS=[["DISTRITO DE TRABAJO",760,60],["PLAZAS DEL NORTE",2600,60],["ZONA COMERCIAL",1700,700],["COMERCIAL OESTE",250,700],["DISTRITO CENTRAL",1700,1150],["BARRIO SAN MIGUEL",620,1720],["LAS PALMAS",3640,1150],["VILLAS DEL ESTE",3000,1160],["PARQUE DEPORTIVO",3640,1720],["VILLA SUR",2300,2290],["PARQUES DEL SUR",900,2860],["RESIDENCIAL SUR",2650,2860]];
function mapFit(){const w=MAPUI.cv.width,h=MAPUI.cv.height;MAPUI.z=Math.min(w/MAP_W,h/MAP_H)*.96;MAPUI.ox=(w-MAP_W*MAPUI.z)/2;MAPUI.oy=(h-MAP_H*MAPUI.z)/2}
function mapCenterOn(x,y){MAPUI.ox=MAPUI.cv.width/2-x*MAPUI.z;MAPUI.oy=MAPUI.cv.height/2-y*MAPUI.z}
function mapZoom(f,px,py){
  const z0=MAPUI.z,z1=Math.max(.1,Math.min(1.4,z0*f));px=px??MAPUI.cv.width/2;py=py??MAPUI.cv.height/2;
  MAPUI.ox=px-(px-MAPUI.ox)*(z1/z0);MAPUI.oy=py-(py-MAPUI.oy)*(z1/z0);MAPUI.z=z1;
}
function openMap(){
  if(!started||HOSPS.locked||player.dead)return;
  const o=document.getElementById("mapui");o.style.display="block";MAPUI.open=true;paused=true;
  if(!MAPUI.img)buildMapImage();
  const cv=MAPUI.cv=document.getElementById("map-cv");MAPUI.c=cv.getContext("2d");
  const r=cv.getBoundingClientRect();cv.width=Math.max(300,r.width|0);cv.height=Math.max(300,r.height|0);
  if(player.scene==="out")mapZoomToPlayer();else mapFit();
  buildLegend();drawMap();
}
function mapZoomToPlayer(){MAPUI.z=Math.min(.5,Math.max(.22,Math.min(MAPUI.cv.width/MAP_W,MAPUI.cv.height/MAP_H)*2));mapCenterOn(player.x,player.y)}
function closeMap(){document.getElementById("mapui").style.display="none";MAPUI.open=false;if(!panelOpen)paused=false}
function buildLegend(){
  const l=document.getElementById("map-legend");l.innerHTML="";
  const items=MAPUI.legend.slice();if(isXTX())items.push({n:"Base XTX",i:"🟣",x:XTX.x+XTX.w/2,y:XTX.y+XTX.h/2});
  items.forEach(it=>{const b=document.createElement("button");b.className="lg";b.innerHTML=`<span>${it.i}</span> ${it.n}`;b.onclick=()=>{MAPUI.z=Math.max(MAPUI.z,.4);mapCenterOn(it.x,it.y);drawMap()};l.appendChild(b)});
}
function mapPlayerPos(){
  if(player.scene==="out")return{x:player.x,y:player.y};
  const t={in:"warehouse",shop:"shop",hosp:"hospital",cloth:"clothes"}[player.scene],b=WORLD.buildings.find(q=>q.type===t);
  return b?{x:b.x+b.w/2,y:b.y+b.h/2}:{x:player.x,y:player.y};
}
function drawMap(){
  if(!MAPUI.open)return;
  const c=MAPUI.c,cv=MAPUI.cv,z=MAPUI.z;c.setTransform(1,0,0,1,0,0);c.fillStyle="#2a3a46";c.fillRect(0,0,cv.width,cv.height);
  c.save();c.translate(MAPUI.ox,MAPUI.oy);c.scale(z,z);c.imageSmoothingEnabled=true;c.drawImage(MAPUI.img,0,0,MAP_W,MAP_H);
  c.lineWidth=6;c.strokeStyle="#1d2a33";c.strokeRect(0,0,MAP_W,MAP_H);
  if(isXTX()){c.fillStyle="rgba(142,68,173,.55)";c.fillRect(XTX.x,XTX.y,XTX.w,XTX.h);c.strokeStyle="#8e44ad";c.lineWidth=8;c.strokeRect(XTX.x,XTX.y,XTX.w,XTX.h);
    c.fillStyle="#fff";c.font="bold 90px sans-serif";c.textAlign="center";c.fillText("XTX",XTX.x+XTX.w/2,XTX.y+XTX.h/2+30)}
  ME.properties.filter(p=>p.mine).forEach(p=>{const b=WORLD.buildings.find(x=>x.sale===p.key);if(b){c.fillStyle="#ffd04a";c.beginPath();c.arc(b.x+b.w/2,b.y+b.h/2,24,0,7);c.fill();c.fillStyle="#000";c.font="bold 36px sans-serif";c.textAlign="center";c.fillText("★",b.x+b.w/2,b.y+b.h/2+12)}});
  c.restore();
  // etiquetas (tamaño constante en pantalla)
  const sx=x=>MAPUI.ox+x*z,sy=y=>MAPUI.oy+y*z;
  c.textAlign="center";c.lineJoin="round";
  const label=(t,x,y,size,col)=>{c.font="800 "+size+"px 'DM Sans',sans-serif";c.lineWidth=4;c.strokeStyle="rgba(15,22,28,.85)";c.strokeText(t,x,y);c.fillStyle=col;c.fillText(t,x,y)};
  if(z>=.12)DISTRICTS.forEach(d=>label(d[0],sx(d[1]),sy(d[2]),z<.3?10:12,"#fff"));
  if(z>=.25)WORLD.roadNames.forEach(r=>label(r[0],sx(r[1]),sy(r[2]),9,"#ffe9a0"));
  WORLD.buildings.forEach(b=>{if(!b.poi)return;const x=sx(b.x+b.w/2),y=sy(b.y+b.h/2);if(x<-30||y<-30||x>cv.width+30||y>cv.height+30)return;
    if(b.type==="house")return;
    c.font="18px sans-serif";c.fillStyle="#fff";c.beginPath();c.arc(x,y,13,0,7);c.fillStyle="rgba(20,30,38,.85)";c.fill();c.fillStyle="#fff";c.fillText(b.poi,x,y+6);
    if(z>=.32)label(b.name,x,y+28,10,"#fff");
  });
  if(MAPUI.showPlayers)NET.others.forEach(o=>{if(o.scene!=="out")return;c.fillStyle="#4ac3ff";c.beginPath();c.arc(sx(o.x),sy(o.y),5,0,7);c.fill();c.strokeStyle="#fff";c.lineWidth=2;c.stroke();if(z>=.3)label(o.name,sx(o.x),sy(o.y)-9,9,"#bfe9ff")});
  // jugador
  const pp=mapPlayerPos(),px=sx(pp.x),py=sy(pp.y);
  const t=Date.now()/400,r=9+Math.sin(t)*2;
  c.fillStyle="rgba(181,237,103,.25)";c.beginPath();c.arc(px,py,r+8,0,7);c.fill();
  c.fillStyle="#b5ed67";c.beginPath();c.arc(px,py,8,0,7);c.fill();c.strokeStyle="#142018";c.lineWidth=3;c.stroke();
  label("Tú",px,py-16,11,"#d9ff9e");
  document.getElementById("map-zoom").textContent=Math.round(z*400)+"%";
}
function mapLoop(){if(MAPUI.open){drawMap()}requestAnimationFrame(mapLoop)}
(function initMapInput(){
  const cvq=()=>document.getElementById("map-cv");
  window.addEventListener("load",()=>{
    const cv=cvq();if(!cv)return;
    cv.addEventListener("wheel",e=>{e.preventDefault();const r=cv.getBoundingClientRect();mapZoom(e.deltaY<0?1.15:1/1.15,(e.clientX-r.left)*(cv.width/r.width),(e.clientY-r.top)*(cv.height/r.height))},{passive:false});
    cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);MAPUI.pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(MAPUI.pts.size===2){const[a,b]=[...MAPUI.pts.values()];MAPUI.pinch=Math.hypot(a.x-b.x,a.y-b.y)}});
    cv.addEventListener("pointermove",e=>{
      const p=MAPUI.pts.get(e.pointerId);if(!p)return;
      const r=cv.getBoundingClientRect(),k=cv.width/r.width;
      if(MAPUI.pts.size===1){MAPUI.ox+=(e.clientX-p.x)*k;MAPUI.oy+=(e.clientY-p.y)*k}
      p.x=e.clientX;p.y=e.clientY;
      if(MAPUI.pts.size===2){const[a,b]=[...MAPUI.pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(MAPUI.pinch)mapZoom(d/MAPUI.pinch,((a.x+b.x)/2-r.left)*k,((a.y+b.y)/2-r.top)*k);MAPUI.pinch=d}
    });
    const up=e=>{MAPUI.pts.delete(e.pointerId);if(MAPUI.pts.size<2)MAPUI.pinch=0};
    cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
    document.getElementById("map-in").onclick=()=>mapZoom(1.3);document.getElementById("map-out").onclick=()=>mapZoom(1/1.3);
    document.getElementById("map-me").onclick=()=>{if(player.scene==="out")mapZoomToPlayer();else mapFit()};
    document.getElementById("map-fit").onclick=mapFit;document.getElementById("map-close").onclick=closeMap;
    document.getElementById("map-pl").onchange=e=>{MAPUI.showPlayers=e.target.checked};
    window.addEventListener("resize",()=>{if(MAPUI.open){const r=cv.getBoundingClientRect();cv.width=Math.max(300,r.width|0);cv.height=Math.max(300,r.height|0)}});
    mapLoop();
  });
})();
