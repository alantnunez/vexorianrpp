// VEXORIAN RP · V5 · personajes no jugables (se conservan Marco, Luis, Rosa y los demás; se añade personal médico y tienda)
const npcs=[
  {name:"Marco",role:"Encargado",scene:"in",x:INTERIOR.marco.x,y:INTERIOR.marco.y,still:true,skin:"#c58c63",hair:"#2b1d15",shirt:"#d98a2b",pants:"#33384a",tag:"#ffd36b",lines:[]},
  {name:"Luis",role:"Mozo",scene:"in",x:380,y:186,rx:210,ry:6,skin:"#e3b48a",hair:"#1f1a17",shirt:"#4f8a5b",pants:"#3a3f52",lines:["Hoy hay mucho movimiento. ¡Ánimo!","Los estantes de la fila C son los más pesados.","Si vas rápido, Marco te paga un extra."]},
  {name:"Rosa",role:"Cajera",scene:"shop",x:SHOP.cashier.x,y:SHOP.cashier.y,still:true,skin:"#d9a58a",hair:"#3a1f1a",shirt:"#e0503f",pants:"#2e3a4d",tag:"#ffb3a8",lines:[]},
  {name:"Sofía",role:"Ciudadana",scene:"out",x:1040,y:700,rx:130,ry:10,skin:"#d9a58a",hair:"#5a2d2d",shirt:"#8c6ca8",pants:"#2e3a4d",lines:["Qué bonito está el barrio hoy.","Dicen que el almacén paga mejor de noche.","El hospital nuevo está en el centro, junto al parque."]},
  {name:"Diego",role:"Gasolinero",scene:"out",x:3640,y:955,rx:90,ry:6,skin:"#b98862",hair:"#222",shirt:"#2d6a4f",pants:"#343a44",lines:["Llena el tanque junto a los surtidores. El litro está a precio justo.","Los autos personales gastan gasolina; los de trabajo no."]},
  {name:"Carlos",role:"Taxista",scene:"out",x:330,y:700,rx:110,ry:8,skin:"#c9976d",hair:"#3a2a1c",shirt:"#c7a94d",pants:"#303644",lines:["Si necesitas un auto, hay uno en la calle.","Pulsa F cerca de un vehículo para subirte."]},
  {name:"Pedro",role:"Despachador",scene:"out",x:1000,y:380,rx:36,ry:6,skin:"#d19c74",hair:"#1b1b1b",shirt:"#e0803a",pants:"#232c3b",tag:"#ffd0a0",lines:["La Central de transporte abre desde el nivel 5. ¡Sube de nivel en el almacén!","Entra por la puerta de la central para pedir un viaje."]},
  {name:"Dante",role:"Vigía XTX",scene:"out",x:3720,y:2340,rx:40,ry:10,skin:"#b98862",hair:"#111",shirt:"#8e44ad",pants:"#1d1a22",tag:"#d6a6ff",lines:["¿Quieres entrar? Necesitas el rol y el código de XTX.","Aquí solo entran los de la banda."]},
  {name:"Iván",role:"Vendedor",scene:"out",x:1030,y:932,rx:60,ry:6,skin:"#d9a98a",hair:"#2a2a2a",shirt:"#2f6fb5",pants:"#2b3350",tag:"#9fd0ff",lines:["Pulsa E en la puerta del concesionario para ver los autos.","Todos nuestros autos vienen con el tanque lleno."]},
  {name:"Dra. Elena",role:"Recepción",scene:"hosp",x:HOSP.reception.x,y:126,still:true,skin:"#d9a58a",hair:"#3a1f1a",shirt:"#f4f7f8",pants:"#9fd0e0",tag:"#cdeaff",lines:["Bienvenido al Hospital Central. Aquí te recuperamos al 100%.","Si te desmayas, te traeremos a una camilla."]},
  {name:"Dr. Ramón",role:"Médico",scene:"hosp",x:350,y:270,rx:200,ry:4,skin:"#c58c63",hair:"#2b1d15",shirt:"#f4f7f8",pants:"#9fd0e0",tag:"#cdeaff",lines:["Tranquilo, descansa hasta recuperarte.","Hidrátate y come bien."]},
  {name:"Enf. Marta",role:"Enfermera",scene:"hosp",x:250,y:272,rx:150,ry:4,skin:"#e3b48a",hair:"#5a2d2d",shirt:"#7fd0c0",pants:"#7fd0c0",tag:"#bff5e8",lines:["Las visitas son bienvenidas.","¿Te sientes mejor?"]},
  {name:"Enf. Julia",role:"Enfermera",scene:"hosp",x:610,y:250,rx:40,ry:90,skin:"#d19c74",hair:"#1b1b1b",shirt:"#7fd0c0",pants:"#7fd0c0",tag:"#bff5e8",lines:["Siga el pasillo verde para salir."]},
  {name:"Lucía",role:"Dependienta",scene:"cloth",x:CLOTH.clerk.x,y:CLOTH.clerk.y,still:true,skin:"#d9a58a",hair:"#3a1f1a",shirt:"#f0c84a",pants:"#3a1a30",tag:"#ffe49a",lines:["¡Bienvenido a Moda Urbana! Usa el probador para cambiar de color."]}
];
npcs.forEach(n=>{n.hx=n.x;n.hy=n.y;n.tx=n.x;n.ty=n.y;n.wait=Math.random()*90;n.anim=Math.random()*6;n.moving=false;n.face="d";n.hp=n.maxhp=60;n.down=false;n.dt=0});

function updateNPCs(dt){
  npcs.forEach(n=>{
    if(n.scene!==player.scene)return;
    if(n.scene==="out"&&(Math.abs(n.x-player.x)>1000||Math.abs(n.y-player.y)>800))return; // lejos: sin procesar
    if(n.down){n.dt-=dt;if(n.dt<=0){n.down=false;n.hp=n.maxhp;n.x=n.hx;n.y=n.hy;n.tx=n.x;n.ty=n.y}return}
    if(n.still){n.moving=false;return}
    if(n.wait>0){n.wait-=dt;n.moving=false;return}
    const dx=n.tx-n.x,dy=n.ty-n.y,d=Math.hypot(dx,dy);
    if(d<3){n.wait=60+Math.random()*180;n.tx=n.hx+(Math.random()-.5)*2*(n.rx||90);n.ty=n.hy+(Math.random()-.5)*2*(n.ry||60);n.moving=false;return}
    const sp=.55*dt,mx=dx/d*sp,my=dy/d*sp;
    if(Math.abs(dx)>Math.abs(dy))n.face=dx<0?"l":"r";else n.face=dy<0?"u":"d";
    let moved=false;
    if(!footBlocked(n.scene,n.x+mx,n.y)){n.x+=mx;moved=true}
    if(!footBlocked(n.scene,n.x,n.y+my)){n.y+=my;moved=true}
    if(!moved){n.tx=n.x;n.ty=n.y;n.wait=30}
    n.moving=moved;n.anim+=.12*dt;
  });
}
function npcTalk(n){if(!n.lines.length)return;toast(n.name+": "+n.lines[Math.random()*n.lines.length|0])}
function npcHit(n,dmg){
  if(n.down||n.scene==="hosp"||n.scene==="cloth")return;
  n.hp-=dmg;floatText(n.x,n.y-26,"-"+dmg,"#ff6b6b");
  if(n.hp<=0){n.down=true;n.dt=900;n.moving=false}
}
