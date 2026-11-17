// VEXORIAN RP · V5 · mundo (datos del mapa 4200 × 3200, colisiones). El dibujo está en art.js
const SW=34; // ancho de acera
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function mk(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c}
function shade(hex,a){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=a<0?0:255,p=Math.abs(a);r=Math.round((f-r)*p+r);g=Math.round((f-g)*p+g);b=Math.round((f-b)*p+b);return`rgb(${r},${g},${b})`}

const WORLD={width:MAP_W,height:MAP_H,roads:[],buildings:[],trees:[],lamps:[],solids:[],labels:[],roadNames:[],props:[],fires:[]};

// ---------- Calles y avenidas ----------
const H_Y=[450,1000,1550,2100,2650],H_H=[180,160,160,160,180],V_X=[650,1250,1850,2550,3250,3850];
H_Y.forEach((y,i)=>WORLD.roads.push({x:0,y,w:y===2650?3430:4200,h:H_H[i]}));
V_X.forEach(x=>WORLD.roads.push({x,y:0,w:180,h:x===3850?2260:3200}));
WORLD.hRoads=WORLD.roads.filter(r=>r.w>r.h);
WORLD.vRoads=WORLD.roads.filter(r=>r.h>r.w);
WORLD.inter=[];
WORLD.hRoads.forEach(h=>WORLD.vRoads.forEach(v=>{
  if(v.x>=h.x&&v.x+v.w<=h.x+h.w&&h.y>=v.y&&h.y+h.h<=v.y+v.h)WORLD.inter.push({x:v.x,y:h.y,w:v.w,h:h.h});
}));
WORLD.roadNames=[["AV. PRINCIPAL",2100,540],["AV. DEL COMERCIO",1000,1080],["AV. CENTRAL",2100,1630],["AV. SUR",2100,2180],["CALLE DEL LAGO",1600,2740],
  ["CALLE 1",740,1300,1],["CALLE 2",1340,1300,1],["CALLE 3",1940,1300,1],["CALLE 4",2640,1300,1],["CALLE 5",3340,1300,1],["CALLE 6",3940,1300,1]];

// ---------- Edificios (V5: solo lugares con función real) ----------
const B=(x,y,w,h,name,color,accent,type,o)=>{
  const b=Object.assign({x,y,w,h,name,color,accent,type:type||"decor",door:{x:x+w/2,y:y+h}},o||{});
  WORLD.buildings.push(b);return b;
};
const NOSOLID=["park","parking","lot","yard","sports","gas"];
const PARK=(x,y,w,h,name,o)=>B(x,y,w,h,name,"#527b55","#fff","park",Object.assign({poi:"🌳"},o||{}));
// Trabajos
const WH=B(110,100,260,230,"ALMACÉN","#a96f4d","#f0b84a","warehouse",{poi:"📦",zone:"almacen",district:"Industrial"});
B(420,130,170,200,"PARQUEO ALMACÉN","#3d4447","#fff","parking");
const DEPOT=B(880,90,320,240,"CENTRAL DE TRANSPORTE","#6d7a86","#e0803a","depot",{poi:"🚚",zone:"transporte",district:"Industrial"});
// Comercio y servicios
const SHOPB=B(100,760,300,140,"SUPERMERCADO 24/7","#d0a34e","#3cb878","shop",{poi:"🛒",zone:"supermercado"});
B(440,770,150,130,"PARQUEO SUPERMERCADO","#3d4447","#fff","parking");
const DEALB=B(900,760,260,140,"CONCESIONARIO","#668b70","#e0e0e0","dealer",{poi:"🚗",zone:"concesionario"});
const CLOTHB=B(2080,760,200,140,"MODA URBANA","#a05a8a","#f0c84a","clothes",{poi:"👕",zone:"moda"});
B(2300,760,200,140,"PARQUEO MODA URBANA","#3d4447","#fff","parking");
const GAS1=B(3480,690,330,250,"GASOLINERA ESTE","#2d6a4f","#f0c84a","gas",{poi:"⛽"});
const GAS2=B(1480,2310,330,270,"GASOLINERA CENTRO","#2d6a4f","#f0c84a","gas",{poi:"⛽"});
const HOSPB=B(2090,1200,380,290,"HOSPITAL CENTRAL","#d9dfe3","#d93b3b","hospital",{poi:"🏥",zone:"hospital"});
B(1480,1760,330,290,"ESTACIONAMIENTO CENTRAL","#3d4447","#fff","parking",{poi:"🅿️"});
// Parques y plazas (espacios públicos con bancas donde sentarse)
PARK(1480,100,330,230,"PLAZA NORTE",{fountain:true});
PARK(2120,100,380,230,"PLAZA DEL TRABAJO");
PARK(2800,90,380,250,"PARQUE NORTE");
PARK(3480,90,300,240,"PARQUE ESTE");
PARK(1480,760,330,140,"PLAZA DEL COMERCIO");
PARK(2780,700,420,240,"PARQUE COMERCIAL",{fountain:true});
PARK(100,1210,500,170,"PARQUE ESCOLAR");
PARK(880,1200,330,300,"PARQUE CENTRAL",{fountain:true});
PARK(1480,1200,330,300,"PARQUE LAS ARTES");
PARK(2080,1790,420,260,"PARQUE DEL MERCADO",{fountain:true});
PARK(3480,1760,330,290,"PARQUE DEPORTIVO");
PARK(30,2310,570,290,"PARQUE OESTE");
PARK(880,2340,330,230,"PARQUE DEL RÍO");
PARK(30,2880,580,290,"PARQUE DEL LAGO",{lake:true});
PARK(880,2880,330,290,"JARDÍN BOTÁNICO");
PARK(1480,2880,330,290,"PARQUE SUR",{fountain:true});

// Barrios residenciales: TODAS las casas son comprables y tienen interior.
// Claves estables: casa_01..12 (V4) en las primeras 3 casas de cuatro barrios; el resto casa_13..48 por orden de creación.
let extraKey=13;
const padKey=n=>"casa_"+String(n).padStart(2,"0");
function houseGrid(x0,y0,cols,rows,w,h,dx,dy,dist,saleBase){
  const R=rng(x0*31+y0*17),pal=["#d9c7a3","#c9d6c1","#d5b8a0","#b8c6d9","#e0d2b4","#c7b5d0"],roofs=["#a8483a","#7a5a3e","#4f6a8a","#6b4f6b","#8a5a3a"];
  let n=0;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const key=saleBase&&n<3?padKey(saleBase+n):padKey(extraKey++);
    B(x0+c*dx,y0+r*dy,w,h,"CASA",pal[R()*pal.length|0],roofs[R()*roofs.length|0],"house",{district:dist,sale:key,solidHouse:true});n++;
  }
}
houseGrid(2790,1215,3,2,120,90,145,170,"Villas del Este",7);
houseGrid(3480,1215,3,2,98,90,118,170,"Las Palmas",1);
houseGrid(40,1775,4,2,120,90,150,150,"San Miguel",4);
houseGrid(880,1775,2,2,140,90,170,150,"San Miguel II",0);
houseGrid(2790,1775,3,2,120,90,145,150,"Las Palmas II",0);
houseGrid(2080,2320,3,2,125,90,150,150,"Villa Sur",10);
houseGrid(2780,2320,3,2,125,90,150,150,"Villa Sur II",0);
houseGrid(2080,2900,3,1,125,100,150,150,"Residencial Sur",0);
houseGrid(2780,2900,3,1,125,100,150,150,"Residencial Sur II",0);

// Bancas públicas (se puede uno sentar): mismas posiciones que dibuja drawPark
WORLD.benches=[];
WORLD.buildings.filter(b=>b.type==="park").forEach(b=>{
  const cy=b.y+b.h/2;
  [[b.x+36,cy-24],[b.x+b.w-70,cy-24],[b.x+36,cy+14],[b.x+b.w-70,cy+14]].forEach(p=>WORLD.benches.push({x:p[0]+17,y:p[1]+3,face:"d"}));
});
// Puntos del trabajo de transportista (los mismos que guarda el servidor en transport_points)
const TP_POINTS={depot:{name:"Central de transporte",x:1040,y:392},super:{name:"Supermercado 24/7",x:250,y:935},almacen:{name:"Almacén",x:240,y:392},
  gas_este:{name:"Gasolinera Este",x:3600,y:952},gas_centro:{name:"Gasolinera Centro",x:1645,y:2602}};
const WORK_VAN_SPAWN={x:1130,y:398,a:0};
WORLD.hospital=HOSPB;WORLD.warehouse=WH;WORLD.shopb=SHOPB;WORLD.dealer=DEALB;WORLD.clothes=CLOTHB;WORLD.depot=DEPOT;WORLD.gas=[GAS1,GAS2];
const DEALER_SLOTS=[[920,945,0],[990,945,0],[1060,945,0],[1130,945,0]];

// ---------- Base XTX (SE del mapa) ----------
const XTX={x:3480,y:2390,w:670,h:680,gate:{x:3790,y:2390,w:40,h:12}};
XTX.walls=[{x:3480,y:2390,w:310,h:12},{x:3830,y:2390,w:320,h:12},{x:3480,y:2390,w:12,h:680},{x:4138,y:2390,w:12,h:680},{x:3480,y:3058,w:670,h:12}];
XTX.armoryB={x:3520,y:2440,w:200,h:100};          // Armería
XTX.vestB={x:3760,y:2440,w:110,h:40};             // Estación de chalecos
XTX.storeB={x:3930,y:2440,w:180,h:100};           // Almacén XTX
XTX.armory={x:3620,y:2562};XTX.vest={x:3815,y:2504};XTX.store={x:4020,y:2562};
XTX.objs=[
  {x:3540,y:2680,w:36,h:90},{x:3630,y:2700,w:120,h:70},{x:3800,y:2680,w:36,h:90},   // zona de reunión
  {x:3920,y:2690,w:150,h:20},{x:3920,y:2760,w:150,h:20},                            // bancas
  {x:3640,y:2890,w:70,h:16},{x:3860,y:2890,w:70,h:16},                              // sacos del polígono
  {x:3592,y:2630,w:24,h:24}                                                        // barril de fuego
];
XTX.dummies=[{x:3680,y:3000},{x:3780,y:3000},{x:3880,y:3000},{x:3980,y:3000},{x:4080,y:3000}];
XTX.parking=[[3520,2900,60,150],[3590,2900,0,0]];
WORLD.fires=[{x:3604,y:2642}];
WORLD.xtx=XTX;
const GATE=[XTX.gate];
let gateOpen=false;

// ---------- Árboles ----------
(function(){
  const R=rng(7),out=[];let tries=0;
  const zonesNoTree=WORLD.buildings.filter(b=>b.type==="park"||b.type==="parking"||b.type==="lot"||b.type==="yard"||b.type==="sports"||b.type==="gas");
  while(out.length<170&&tries<20000){tries++;
    const x=30+R()*(WORLD.width-60),y=30+R()*(WORLD.height-60);
    if(WORLD.roads.some(r=>x>r.x-SW-28&&x<r.x+r.w+SW+28&&y>r.y-SW-28&&y<r.y+r.h+SW+28))continue;
    if(WORLD.buildings.some(b=>x>b.x-36&&x<b.x+b.w+36&&y>b.y-44&&y<b.y+b.h+54))continue;
    if(x>XTX.x-60&&x<XTX.x+XTX.w+60&&y>XTX.y-80&&y<XTX.y+XTX.h+60)continue;
    if(out.some(t=>Math.hypot(t.x-x,t.y-y)<70))continue;
    out.push({x:Math.round(x),y:Math.round(y),s:.85+R()*.4});
  }
  // cinturón verde del extremo este
  for(let y=50;y<WORLD.height-30;y+=74){
    const x=4110+(R()-.5)*30;
    if(WORLD.roads.some(r=>x>r.x-SW-28&&x<r.x+r.w+SW+28&&y>r.y-SW-28&&y<r.y+r.h+SW+28))continue;
    if(y>XTX.y-60&&y<XTX.y+XTX.h+60&&x<XTX.x+XTX.w+40)continue;
    out.push({x:Math.round(x),y:Math.round(y),s:.9+R()*.3});
  }
  // árboles de los parques
  zonesNoTree.filter(b=>b.type==="park").forEach(b=>{
    const P=rng(b.x+b.y);
    for(let i=0;i<Math.max(5,b.w*b.h/9000|0);i++){
      const x=b.x+24+P()*(b.w-48),y=b.y+24+P()*(b.h-60);
      const cx=b.x+b.w/2,cy=b.y+b.h/2;
      if(Math.abs(x-cx)<30||Math.abs(y-cy)<30)continue;           // caminos
      if(b.lake&&Math.hypot((x-cx)/(b.w*.3),(y-cy)/(b.h*.26))<1.2)continue; // estanque
      if(b.fountain&&Math.hypot(x-cx,y-cy)<45)continue;
      out.push({x:Math.round(x),y:Math.round(y),s:.8+P()*.3});
    }
  });
  WORLD.trees=out;
})();

// ---------- Farolas ----------
(function(){
  const onV=x=>WORLD.vRoads.some(v=>x>v.x-45&&x<v.x+v.w+45),onH=y=>WORLD.hRoads.some(r=>y>r.y-45&&y<r.y+r.h+45);
  WORLD.hRoads.forEach(r=>{for(let x=120;x<r.x+r.w-60;x+=270){
    if(!onV(x))WORLD.lamps.push({x,y:r.y-SW/2});
    if(!onV(x+135)&&x+135<r.x+r.w-60)WORLD.lamps.push({x:x+135,y:r.y+r.h+SW/2});
  }});
  WORLD.vRoads.forEach(r=>{for(let y=120;y<r.y+r.h-60;y+=270){
    if(!onH(y))WORLD.lamps.push({x:r.x-SW/2,y});
    if(!onH(y+135)&&y+135<r.y+r.h-60)WORLD.lamps.push({x:r.x+r.w+SW/2,y:y+135});
  }});
  [[3770,2370],[3850,2370],[3500,2410],[4125,2410],[3500,3045],[4125,3045],[3810,2640],[3810,2960]].forEach(p=>WORLD.lamps.push({x:p[0],y:p[1],xtx:true}));
})();

// ---------- Sólidos y rejilla de colisión ----------
(function(){
  const S=WORLD.solids;
  WORLD.buildings.forEach(b=>{
    if(!NOSOLID.includes(b.type))S.push({x:b.x,y:b.y,w:b.w,h:b.h});
    if(b.type==="gas"){ // tienda, columnas del techo y surtidores
      S.push({x:b.x+20,y:b.y+20,w:110,h:80});
      [[20,130],[300,130],[20,190],[300,190]].forEach(p=>S.push({x:b.x+p[0]-4,y:b.y+p[1]-4,w:8,h:8}));
      [70,150,230].forEach(px=>S.push({x:b.x+px,y:b.y+150,w:16,h:30}));
      b.door={x:b.x+75,y:b.y+100};
      b.pumps=[70,150,230].map(px=>({x:b.x+px+8,y:b.y+196}));
    }
    if(b.type==="park"&&b.fountain)S.push({x:b.x+b.w/2-22,y:b.y+b.h/2-22,w:44,h:44});
    if(b.type==="park"&&b.lake){const cx=b.x+b.w/2,cy=b.y+b.h/2;S.push({x:cx-b.w*.24,y:cy-b.h*.17,w:b.w*.48,h:b.h*.34})}
    if(b.type==="yard"){
      b.cont=[];const R=rng(b.x+b.y);
      for(let r=0;r<4;r++)for(let c=0;c<3;c++){
        if(R()<.12)continue;
        const cx=b.x+18+c*88,cy=b.y+18+r*68,col=["#c0392b","#2e86c1","#d4ac0d","#27ae60","#7d3c98","#ba4a00"][R()*6|0];
        b.cont.push({x:cx,y:cy,w:76,h:30,col});S.push({x:cx,y:cy,w:76,h:30});
      }
    }
    if(b.type==="sports"){S.push({x:b.x+30,y:b.y+b.h-24,w:80,h:12});S.push({x:b.x+b.w-110,y:b.y+b.h-24,w:80,h:12})}
  });
  WORLD.trees.forEach(t=>S.push({x:t.x-4,y:t.y+5,w:8,h:8}));
  XTX.walls.forEach(w=>S.push(w));XTX.objs.forEach(o=>S.push(o));
  S.push(XTX.armoryB,XTX.vestB,XTX.storeB);
  // rejilla espacial
  const G=160,grid=new Map();
  WORLD.GRID=G;WORLD.grid=grid;
  S.forEach(s=>{for(let gx=Math.floor(s.x/G);gx<=Math.floor((s.x+s.w)/G);gx++)for(let gy=Math.floor(s.y/G);gy<=Math.floor((s.y+s.h)/G);gy++){
    const k=gx+","+gy;let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(s)}});
})();

// Ventanas (para las luces nocturnas)
WORLD.buildings.forEach(b=>{
  b.win=[];const {x,y,w,h}=b,cx=x+w/2;
  if(b.type==="house"){b.win.push({x:x+16,y:y+34,w:22,h:20},{x:x+w-38,y:y+34,w:22,h:20});return}
  if(["park","parking","lot","yard","sports","gas"].includes(b.type))return;
  const rows=h>=180?[62,112]:[62];
  rows.forEach(ry=>{for(let wx=x+22;wx+28<=x+w-18;wx+=52){
    if(ry+26>h-60&&wx+28>cx-30&&wx<cx+30)continue;
    b.win.push({x:wx,y:y+ry,w:28,h:26});
  }});
});

// ---------- Interiores ----------
const INTERIOR={ // almacén
  width:900,height:560,floor:{x:30,y:90,w:840,h:445},shelves:[],solids:[],
  dock:{x:705,y:250,r:52},exit:{x:450,y:515},marco:{x:95,y:418}
};
["A","B","C"].forEach((L,ri)=>[0,1,2].forEach(ci=>{
  const s={id:L+(ci+1),x:90+ci*200,y:115+ri*105,w:150,h:46};s.pick={x:s.x+s.w/2,y:s.y+s.h+14};INTERIOR.shelves.push(s);
}));
INTERIOR.solids=[...INTERIOR.shelves.map(s=>({x:s.x,y:s.y,w:s.w,h:s.h})),
  {x:40,y:445,w:110,h:46},{x:730,y:110,w:60,h:280},{x:800,y:110,w:70,h:280},{x:700,y:430,w:150,h:76}];
const SHOP={
  width:800,height:520,floor:{x:30,y:90,w:740,h:400},exit:{x:400,y:455},counter:{x:135,y:428},cashier:{x:135,y:362},
  solids:[{x:50,y:92,w:700,h:36},{x:100,y:190,w:150,h:34},{x:320,y:190,w:150,h:34},{x:540,y:190,w:150,h:34},{x:100,y:290,w:150,h:34},{x:320,y:290,w:150,h:34},{x:540,y:290,w:150,h:34},{x:60,y:380,w:150,h:36}]
};
const HOSP={ // hospital
  width:960,height:600,floor:{x:30,y:90,w:900,h:480},exit:{x:480,y:545},desk:{x:700,y:150,w:210,h:50},reception:{x:805,y:225},
  beds:[],solids:[]
};
for(let i=0;i<8;i++){const x=70+(i%4)*120,y=i<4?120:340;HOSP.beds.push({x,y,w:56,h:100,cx:x+28,cy:y+52,out:{x:x+28,y:y+100+18}})}
HOSP.solids=[...HOSP.beds.map(b=>({x:b.x,y:b.y,w:b.w,h:b.h})),HOSP.desk,{x:700,y:330,w:200,h:34},{x:700,y:400,w:200,h:34},{x:50,y:92,w:100,h:30},{x:860,y:480,w:60,h:70}];
const CLOTH={
  width:760,height:480,floor:{x:30,y:90,w:700,h:360},exit:{x:380,y:415},mirror:{x:190,y:320},counter:{x:600,y:330},clerk:{x:600,y:290},
  solids:[{x:50,y:92,w:660,h:34},{x:60,y:170,w:120,h:30},{x:60,y:240,w:120,h:30},{x:420,y:170,w:120,h:30},{x:420,y:240,w:120,h:30},{x:540,y:310,w:130,h:34},{x:260,y:150,w:70,h:100}]
};
const HOME={ // casa (interior reutilizable)
  width:760,height:520,floor:{x:30,y:90,w:700,h:380},exit:{x:380,y:455},panel:{x:455,y:452},stove:{x:595,y:152},bed:{x:635,y:362,stand:{x:635,y:452}},
  seats:[{x:97,y:224,face:"u",stand:{x:97,y:268}},{x:150,y:224,face:"u",stand:{x:150,y:268}},{x:260,y:230,face:"l",stand:{x:260,y:274}},
         {x:359,y:386,face:"u",stand:{x:359,y:428}},{x:414,y:386,face:"u",stand:{x:414,y:428}}],
  solids:[{x:80,y:98,w:110,h:26},{x:70,y:200,w:130,h:46},{x:235,y:205,w:50,h:50},{x:110,y:294,w:80,h:30},{x:330,y:300,w:110,h:60},
          {x:480,y:96,w:230,h:40},{x:590,y:300,w:90,h:130},{x:690,y:300,w:34,h:34},{x:50,y:420,w:30,h:30},{x:690,y:420,w:30,h:30}]
};
const SCENES={in:INTERIOR,shop:SHOP,hosp:HOSP,cloth:CLOTH,home:HOME};

function hitList(list,x,y,hw,hh){for(const s of list)if(x+hw>s.x&&x-hw<s.x+s.w&&y+hh>s.y&&y-hh<s.y+s.h)return true;return false}
function hitWorld(x,y,hw,hh){
  const G=WORLD.GRID,x0=Math.floor((x-hw)/G),x1=Math.floor((x+hw)/G),y0=Math.floor((y-hh)/G),y1=Math.floor((y+hh)/G);
  for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){
    const a=WORLD.grid.get(gx+","+gy);if(a&&hitList(a,x,y,hw,hh))return true;
  }
  return false;
}
function blockedAt(scene,x,y,hw,hh){
  if(scene!=="out"){
    const I=SCENES[scene],f=I.floor;
    if(x-hw<f.x||x+hw>f.x+f.w||y-hh<f.y||y+hh>f.y+f.h)return true;
    return hitList(I.solids,x,y,hw,hh);
  }
  if(x-hw<8||x+hw>WORLD.width-8||y-hh<8||y+hh>WORLD.height-8)return true;
  if(hitWorld(x,y,hw,hh))return true;
  return !gateOpen&&hitList(GATE,x,y,hw,hh);
}
function footBlocked(scene,x,y){return blockedAt(scene,x,y+9,6,4)}
// Solo quedan las bancas realmente alcanzables (sin árboles, estanques ni fuentes encima)
WORLD.benches=WORLD.benches.filter(b=>!footBlocked("out",b.x,b.y+8)&&!footBlocked("out",b.x,b.y+24)&&!footBlocked("out",b.x-30,b.y+8)||false);
