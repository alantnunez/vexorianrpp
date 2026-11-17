// VEXORIAN RP · V5 · interiores (almacén, supermercado, hospital, tienda de ropa). Se hornean al entrar por primera vez.
function drawShelf(c,s,R){
  c.fillStyle="rgba(0,0,0,.28)";c.fillRect(s.x+6,s.y+8,s.w,s.h);
  c.fillStyle="#323b44";c.fillRect(s.x,s.y,s.w,s.h);
  c.fillStyle="#4a5560";c.fillRect(s.x,s.y,s.w,8);
  for(let bx=s.x+6;bx<s.x+s.w-26;bx+=28)boxPx(c,bx+R()*3,s.y+9,20+R()*4,13,R);
  c.fillStyle="#e07b2e";c.fillRect(s.x,s.y+23,s.w,4);
  for(let bx=s.x+6;bx<s.x+s.w-26;bx+=28)boxPx(c,bx+R()*3,s.y+28,20+R()*4,13,R);
  c.fillStyle="#e07b2e";c.fillRect(s.x,s.y,4,s.h);c.fillRect(s.x+s.w-4,s.y,4,s.h);c.fillRect(s.x+s.w/2-2,s.y,4,s.h);c.fillRect(s.x,s.y+s.h-4,s.w,4);
  c.fillStyle="#f2f2ee";c.fillRect(s.x+s.w/2-13,s.y+s.h-1,26,12);c.fillStyle="#1b2124";c.fillRect(s.x+s.w/2-13,s.y+s.h+9,26,2);
  c.font="bold 9px sans-serif";c.textAlign="center";c.fillText(s.id,s.x+s.w/2,s.y+s.h+9);
}
function wallBricks(c,x,y,w,h,col){
  c.fillStyle=col;c.fillRect(x,y,w,h);c.fillStyle="rgba(0,0,0,.14)";
  for(let yy=y,k=0;yy<y+h;yy+=8,k++){c.fillRect(x,yy,w,1);for(let xx=x+(k%2?8:0);xx<x+w;xx+=16)c.fillRect(xx,yy,1,8)}
}

function bakeInterior(){
  const I=INTERIOR,R=rng(9),cv=mk(I.width,I.height),c=cv.getContext("2d"),f=I.floor;
  c.fillStyle="#0e1311";c.fillRect(0,0,I.width,I.height);
  for(let j=0;j*40<f.h;j++)for(let i=0;i*40<f.w;i++){
    const x=f.x+i*40,y=f.y+j*40;c.fillStyle=(i+j)%2?"#7b827e":"#848b87";c.fillRect(x,y,Math.min(40,f.x+f.w-x),Math.min(40,f.y+f.h-y));
  }
  c.fillStyle="#6b726e";for(let x=f.x;x<f.x+f.w;x+=40)c.fillRect(x,f.y,1,f.h);for(let y=f.y;y<f.y+f.h;y+=40)c.fillRect(f.x,y,f.w,1);
  for(let i=0;i<260;i++){c.fillStyle=R()<.5?"rgba(0,0,0,.08)":"rgba(255,255,255,.06)";c.fillRect(f.x+R()*f.w|0,f.y+R()*f.h|0,3,2)}
  wallBricks(c,0,0,I.width,f.y,"#7a4b38");
  wallBricks(c,0,f.y,f.x,I.height-f.y,"#6c4333");wallBricks(c,f.x+f.w,f.y,I.width-f.x-f.w,I.height-f.y,"#6c4333");
  wallBricks(c,0,f.y+f.h,I.width,I.height-f.y-f.h,"#6c4333");
  c.fillStyle="#3a2a24";c.fillRect(0,f.y-8,I.width,8);
  c.fillStyle="rgba(0,0,0,.28)";c.fillRect(f.x,f.y,f.w,12);
  for(let i=0;i<6;i++){const x=60+i*135;c.fillStyle="#2a2f33";c.fillRect(x-2,12,74,34);c.fillStyle="#8fc4d8";c.fillRect(x,14,70,30);c.fillStyle="#b9e0ea";c.fillRect(x+4,17,16,8);c.fillStyle="#2a2f33";c.fillRect(x+34,14,2,30)}
  c.fillStyle="#12171a";c.fillRect(I.width/2-163,50,326,28);c.fillStyle="#1d2529";c.fillRect(I.width/2-160,52,320,24);
  c.fillStyle="#f0b84a";c.fillRect(I.width/2-160,52,5,24);c.fillRect(I.width/2+155,52,5,24);
  c.font="bold 12px sans-serif";c.textAlign="center";c.fillStyle="#f5f7f6";c.fillText("ALMACÉN · CENTRO DE DISTRIBUCIÓN",I.width/2,68);
  c.fillStyle="#2f3532";c.fillRect(410,505,80,26);c.fillStyle="#3b4440";for(let x=414;x<486;x+=8)c.fillRect(x,508,4,20);
  c.fillStyle="#e0b43c";c.fillRect(414,529,72,31);c.fillStyle="#1a1d1f";for(let x=414;x<486;x+=12)c.fillRect(x,529,6,31);
  c.fillStyle="#2b3033";c.fillRect(420,535,60,25);c.fillStyle="#6fa5b8";c.fillRect(424,538,25,20);c.fillRect(451,538,25,20);
  c.fillStyle="#1d7a46";c.fillRect(352,538,50,16);c.font="bold 9px sans-serif";c.fillStyle="#fff";c.fillText("SALIDA",377,550);
  c.strokeStyle="#e0b43c";c.lineWidth=3;c.setLineDash([10,8]);c.strokeRect(676,96,198,318);c.setLineDash([]);
  c.save();c.translate(690,250);c.rotate(-Math.PI/2);c.font="bold 11px sans-serif";c.fillStyle="rgba(224,180,60,.8)";c.fillText("ZONA DE CARGA",0,0);c.restore();
  c.fillStyle="rgba(0,0,0,.3)";c.fillRect(736,118,60,280);
  c.fillStyle="#59636b";c.fillRect(730,110,60,280);c.fillStyle="#262b2f";c.fillRect(735,110,50,280);
  c.fillStyle="#2f353a";for(let y=116;y<390;y+=14)c.fillRect(735,y,50,2);
  c.fillStyle="#7a858d";c.fillRect(730,106,60,6);c.fillRect(730,388,60,6);
  for(let y=110;y<390;y+=20){c.fillStyle="#e0b43c";c.fillRect(790,y,10,10);c.fillStyle="#1a1d1f";c.fillRect(790,y+10,10,10)}
  c.fillStyle="rgba(0,0,0,.3)";c.fillRect(806,118,70,280);
  c.fillStyle="#8a918e";c.fillRect(800,110,70,280);c.fillStyle="#d7dad8";c.fillRect(803,113,64,274);
  c.fillStyle="#b7bcb9";for(let y=128;y<386;y+=18)c.fillRect(803,y,64,2);
  c.fillStyle="#c0392b";c.fillRect(803,113,64,8);
  c.fillStyle="#15191b";[135,330].forEach(y=>{c.fillRect(796,y,5,26);c.fillRect(869,y,5,26)});
  c.save();c.translate(842,250);c.rotate(-Math.PI/2);c.font="bold 12px sans-serif";c.fillStyle="#4a5560";c.fillText("TRANSPORTES MS",0,0);c.restore();
  INTERIOR.shelves.forEach(s=>drawShelf(c,s,R));
  c.fillStyle="rgba(0,0,0,.28)";c.fillRect(46,453,110,46);
  c.fillStyle="#5a4330";c.fillRect(40,445,110,46);c.fillStyle="#8b6a4a";c.fillRect(40,445,110,41);c.fillStyle="#a07f5c";c.fillRect(40,445,110,3);
  c.fillStyle="#171b1e";c.fillRect(60,451,24,16);c.fillStyle="#4fa3d9";c.fillRect(62,453,20,11);c.fillStyle="#171b1e";c.fillRect(69,467,6,3);
  c.fillStyle="#2d3338";c.fillRect(62,472,20,6);
  c.fillStyle="#f2f2ee";c.fillRect(112,453,16,13);c.fillStyle="#9aa";c.fillRect(114,456,12,1);c.fillRect(114,459,9,1);
  c.fillStyle="#d9534f";c.fillRect(134,456,7,7);c.fillStyle="#fff";c.fillRect(135,457,5,2);
  c.fillStyle="rgba(0,0,0,.25)";c.fillRect(706,438,150,76);
  c.fillStyle="#9a7a4e";c.fillRect(700,488,150,18);c.fillStyle="#7a5e3a";for(let x=700;x<850;x+=30)c.fillRect(x,498,14,8);
  for(let r=0;r<2;r++)for(let k=0;k<5;k++)boxPx(c,704+k*29,434+r*27,26,24,R);
  return cv;
}

function bakeShop(){
  const I=SHOP,R=rng(21),cv=mk(I.width,I.height),c=cv.getContext("2d"),f=I.floor;
  const COL=["#e0503f","#f0b84a","#4aa3d9","#3cb878","#c06fd0","#f08a4a"];
  c.fillStyle="#0e1311";c.fillRect(0,0,I.width,I.height);
  for(let j=0;j*40<f.h;j++)for(let i=0;i*40<f.w;i++){const x=f.x+i*40,y=f.y+j*40;c.fillStyle=(i+j)%2?"#d3d6ca":"#c4c8bb";c.fillRect(x,y,Math.min(40,f.x+f.w-x),Math.min(40,f.y+f.h-y))}
  c.fillStyle="rgba(0,0,0,.07)";for(let x=f.x;x<f.x+f.w;x+=40)c.fillRect(x,f.y,1,f.h);for(let y=f.y;y<f.y+f.h;y+=40)c.fillRect(f.x,y,f.w,1);
  wallBricks(c,0,0,I.width,f.y,"#c7b58a");wallBricks(c,0,f.y,f.x,I.height-f.y,"#b5a478");wallBricks(c,f.x+f.w,f.y,I.width-f.x-f.w,I.height-f.y,"#b5a478");wallBricks(c,0,f.y+f.h,I.width,I.height-f.y-f.h,"#b5a478");
  c.fillStyle="#6a5a3a";c.fillRect(0,f.y-8,I.width,8);
  c.fillStyle="#12171a";c.fillRect(I.width/2-153,20,306,40);c.fillStyle="#1d7a46";c.fillRect(I.width/2-150,23,300,34);
  c.font="bold 18px sans-serif";c.textAlign="center";c.fillStyle="#fff";c.fillText("SUPERMERCADO 24/7",I.width/2,47);
  // neveras
  const fr=I.solids[0];c.fillStyle="rgba(0,0,0,.25)";c.fillRect(fr.x+6,fr.y+8,fr.w,fr.h);
  for(let x=fr.x;x<fr.x+fr.w;x+=70){c.fillStyle="#cfd8dc";c.fillRect(x,fr.y,70,fr.h);c.fillStyle="#8fc7e3";c.fillRect(x+3,fr.y+3,64,fr.h-6);for(let k=0;k<7;k++){c.fillStyle=COL[R()*6|0];c.fillRect(x+6+k*9,fr.y+8,6,fr.h-16)}c.fillStyle="rgba(255,255,255,.25)";c.fillRect(x+3,fr.y+3,10,fr.h-6)}
  // góndolas
  I.solids.slice(1,7).forEach(s=>{
    c.fillStyle="rgba(0,0,0,.25)";c.fillRect(s.x+6,s.y+8,s.w,s.h);
    c.fillStyle="#dfe0da";c.fillRect(s.x,s.y,s.w,s.h);c.fillStyle="#9aa0a0";c.fillRect(s.x,s.y+s.h-6,s.w,6);
    for(let x=s.x+4;x<s.x+s.w-14;x+=16){c.fillStyle=COL[R()*6|0];c.fillRect(x,s.y+4,12,10);c.fillStyle=COL[R()*6|0];c.fillRect(x,s.y+17,12,10)}
  });
  // mostrador
  const k=I.solids[7];c.fillStyle="rgba(0,0,0,.25)";c.fillRect(k.x+6,k.y+8,k.w,k.h);
  c.fillStyle="#5a4330";c.fillRect(k.x,k.y,k.w,k.h);c.fillStyle="#c9a27a";c.fillRect(k.x,k.y,k.w,k.h-8);
  c.fillStyle="#171b1e";c.fillRect(k.x+14,k.y+6,26,18);c.fillStyle="#4fd68a";c.fillRect(k.x+17,k.y+9,20,8);
  c.fillStyle="#222";c.fillRect(k.x+100,k.y+8,14,22);c.fillStyle="#4fa3d9";c.fillRect(k.x+102,k.y+10,10,16);
  c.fillStyle="#d9534f";c.fillRect(k.x+124,k.y+10,16,12);
  // salida
  c.fillStyle="#2f3532";c.fillRect(360,455,80,34);c.fillStyle="#3b4440";for(let x=364;x<436;x+=8)c.fillRect(x,458,4,28);
  c.fillStyle="#2b3033";c.fillRect(360,490,80,30);c.fillStyle="#6fa5b8";c.fillRect(364,493,34,24);c.fillRect(402,493,34,24);
  c.fillStyle="#1d7a46";c.fillRect(300,498,50,16);c.font="bold 9px sans-serif";c.fillStyle="#fff";c.fillText("SALIDA",325,510);
  return cv;
}


function bakeHosp(){
  const I=HOSP,R=rng(33),cv=mk(I.width,I.height),c=cv.getContext("2d"),f=I.floor;
  c.fillStyle="#0e1311";c.fillRect(0,0,I.width,I.height);
  for(let j=0;j*40<f.h;j++)for(let i=0;i*40<f.w;i++){const x=f.x+i*40,y=f.y+j*40;c.fillStyle=(i+j)%2?"#dfe8e6":"#d3dedb";c.fillRect(x,y,Math.min(40,f.x+f.w-x),Math.min(40,f.y+f.h-y))}
  c.fillStyle="rgba(0,0,0,.06)";for(let x=f.x;x<f.x+f.w;x+=40)c.fillRect(x,f.y,1,f.h);for(let y=f.y;y<f.y+f.h;y+=40)c.fillRect(f.x,y,f.w,1);
  wallBricks(c,0,0,I.width,f.y,"#9fb4b8");wallBricks(c,0,f.y,f.x,I.height-f.y,"#8ea4a8");wallBricks(c,f.x+f.w,f.y,I.width-f.x-f.w,I.height-f.y,"#8ea4a8");wallBricks(c,0,f.y+f.h,I.width,I.height-f.y-f.h,"#8ea4a8");
  c.fillStyle="#6f8a90";c.fillRect(0,f.y-8,I.width,8);
  c.fillStyle="#12171a";c.fillRect(I.width/2-170,22,340,40);c.fillStyle="#d93b3b";c.fillRect(I.width/2-167,25,334,34);
  c.font="bold 18px sans-serif";c.textAlign="center";c.fillStyle="#fff";c.fillText("HOSPITAL CENTRAL",I.width/2,49);
  c.fillStyle="#fff";c.fillRect(I.width/2-210,26,32,32);c.fillStyle="#d93b3b";c.fillRect(I.width/2-198,29,8,26);c.fillRect(I.width/2-207,38,26,8);
  // franja verde de suelo hacia la salida y ventanas
  c.fillStyle="rgba(60,184,120,.35)";c.fillRect(470,330,20,215);
  for(let i=0;i<6;i++){const x=60+i*150;c.fillStyle="#2a2f33";c.fillRect(x-2,66,74,22);c.fillStyle="#8fc4d8";c.fillRect(x,68,70,18)}
  // camillas
  I.beds.forEach((b,i)=>{
    c.fillStyle="rgba(0,0,0,.25)";c.fillRect(b.x+6,b.y+8,b.w,b.h);
    c.fillStyle="#8a949a";c.fillRect(b.x-2,b.y-2,b.w+4,b.h+4);c.fillStyle="#e8eef0";c.fillRect(b.x,b.y,b.w,b.h);
    c.fillStyle="#cfd8dc";c.fillRect(b.x+6,b.y+6,b.w-12,22);c.fillStyle="#fff";c.fillRect(b.x+8,b.y+8,b.w-16,18);
    c.fillStyle="#6a7a82";c.fillRect(b.x,b.y+b.h-6,b.w,6);
    c.fillStyle="#2a2f33";c.fillRect(b.x-6,b.y+b.h-4,6,8);c.fillRect(b.x+b.w,b.y+b.h-4,6,8);
    c.font="bold 9px sans-serif";c.fillStyle="#6a7a82";c.fillText(String(i+1),b.x+b.w/2,b.y+b.h+12);
    // monitor
    const mx=i%4===3?b.x+b.w+14:b.x-24;c.fillStyle="#222";c.fillRect(mx,b.y+4,16,22);c.fillStyle="#0e2a1a";c.fillRect(mx+2,b.y+6,12,12);c.fillStyle="#4fd68a";c.fillRect(mx+3,b.y+12,3,1);c.fillRect(mx+6,b.y+9,2,4);c.fillRect(mx+8,b.y+13,5,1);
  });
  // cortinas
  c.strokeStyle="rgba(70,140,170,.55)";c.lineWidth=4;c.setLineDash([10,6]);
  c.beginPath();c.moveTo(f.x,300);c.lineTo(670,300);c.stroke();c.setLineDash([]);
  // recepción
  const d=I.desk;c.fillStyle="rgba(0,0,0,.25)";c.fillRect(d.x+6,d.y+8,d.w,d.h);
  c.fillStyle="#5a6a70";c.fillRect(d.x,d.y,d.w,d.h);c.fillStyle="#c8d4d6";c.fillRect(d.x,d.y,d.w,d.h-8);c.fillStyle="#d93b3b";c.fillRect(d.x,d.y+d.h-8,d.w,8);
  c.fillStyle="#171b1e";c.fillRect(d.x+20,d.y+8,26,18);c.fillStyle="#4fa3d9";c.fillRect(d.x+22,d.y+10,22,12);c.fillStyle="#fff";c.fillRect(d.x+120,d.y+10,18,12);
  c.font="bold 11px sans-serif";c.fillStyle="#6a7a82";c.fillText("RECEPCIÓN",d.x+d.w/2,d.y+d.h+14);
  // sala de espera
  [330,400].forEach(y=>{c.fillStyle="rgba(0,0,0,.25)";c.fillRect(706,y+6,200,34);c.fillStyle="#3a6a8a";c.fillRect(700,y,200,34);c.fillStyle="#4a86ae";c.fillRect(704,y+4,192,18);c.fillStyle="#2a4a62";for(let x=700;x<900;x+=50)c.fillRect(x,y,2,34)});
  c.font="bold 11px sans-serif";c.fillStyle="#6a7a82";c.fillText("SALA DE ESPERA",800,320);
  // armario médico y plantas
  c.fillStyle="#cfd8dc";c.fillRect(50,92,100,30);c.fillStyle="#8fc7e3";c.fillRect(54,96,40,22);c.fillRect(100,96,40,22);c.fillStyle="#d93b3b";c.fillRect(94,96,6,22);
  [[880,500],[70,520],[900,120],[300,520]].forEach(p=>{c.fillStyle="#6b4a32";c.fillRect(p[0]-8,p[1]+4,16,14);c.fillStyle="#3f8a4a";c.beginPath();c.arc(p[0],p[1],11,0,7);c.fill();c.fillStyle="#6bb35c";c.beginPath();c.arc(p[0]-3,p[1]-3,6,0,7);c.fill()});
  // dispensador, camilla de transporte
  c.fillStyle="#222";c.fillRect(870,484,40,50);c.fillStyle="#2f7fae";c.fillRect(873,487,34,30);c.fillStyle="#e07b2e";c.fillRect(876,522,28,8);
  // salida
  c.fillStyle="#2f3532";c.fillRect(440,548,80,24);c.fillStyle="#6fa5b8";c.fillRect(444,551,32,18);c.fillRect(484,551,32,18);
  c.fillStyle="#1d7a46";c.fillRect(380,552,50,16);c.font="bold 9px sans-serif";c.fillStyle="#fff";c.fillText("SALIDA",405,564);
  c.fillStyle="rgba(255,255,255,.55)";c.fillRect(12,f.y,6,f.h);
  return cv;
}
function bakeCloth(){
  const I=CLOTH,R=rng(51),cv=mk(I.width,I.height),c=cv.getContext("2d"),f=I.floor;
  c.fillStyle="#0e1311";c.fillRect(0,0,I.width,I.height);
  for(let j=0;j*40<f.h;j++)for(let i=0;i*40<f.w;i++){const x=f.x+i*40,y=f.y+j*40;c.fillStyle=(i+j)%2?"#c9b08a":"#bfa57e";c.fillRect(x,y,Math.min(40,f.x+f.w-x),Math.min(40,f.y+f.h-y))}
  wallBricks(c,0,0,I.width,f.y,"#a05a8a");wallBricks(c,0,f.y,f.x,I.height-f.y,"#8a4a76");wallBricks(c,f.x+f.w,f.y,I.width-f.x-f.w,I.height-f.y,"#8a4a76");wallBricks(c,0,f.y+f.h,I.width,I.height-f.y-f.h,"#8a4a76");
  c.fillStyle="#5a2a4a";c.fillRect(0,f.y-8,I.width,8);
  c.fillStyle="#12171a";c.fillRect(I.width/2-153,20,306,40);c.fillStyle="#f0c84a";c.fillRect(I.width/2-150,23,300,34);
  c.font="bold 18px sans-serif";c.textAlign="center";c.fillStyle="#3a1a30";c.fillText("MODA URBANA",I.width/2,47);
  const COL=["#2f6fb5","#c0392b","#27ae60","#f1c40f","#8e44ad","#ecf0f1","#222","#e67e22"];
  [[60,170],[60,240],[420,170],[420,240]].forEach(p=>{
    c.fillStyle="rgba(0,0,0,.25)";c.fillRect(p[0]+5,p[1]+7,120,30);c.fillStyle="#7a5a3a";c.fillRect(p[0],p[1],120,30);c.fillStyle="#a07f5c";c.fillRect(p[0],p[1],120,5);
    for(let i=0;i<7;i++){c.fillStyle=COL[R()*8|0];c.fillRect(p[0]+6+i*16,p[1]+8,12,18)}
  });
  c.fillStyle="rgba(0,0,0,.25)";c.fillRect(546,317,130,34);c.fillStyle="#5a4330";c.fillRect(540,310,130,34);c.fillStyle="#c9a27a";c.fillRect(540,310,130,28);c.fillStyle="#171b1e";c.fillRect(556,314,26,18);c.fillStyle="#4fd68a";c.fillRect(559,317,20,8);
  // probador y espejo
  c.fillStyle="rgba(0,0,0,.25)";c.fillRect(266,156,70,100);c.fillStyle="#3a1a30";c.fillRect(260,150,70,100);c.fillStyle="#8fc4d8";c.fillRect(268,158,54,84);c.fillStyle="#d9f0f7";c.fillRect(272,162,10,40);
  c.font="bold 10px sans-serif";c.fillStyle="#3a1a30";c.fillText("PROBADOR",295,270);
  c.fillStyle="rgba(240,200,74,.4)";c.beginPath();c.arc(I.mirror.x,I.mirror.y,26,0,7);c.fill();c.strokeStyle="#f0c84a";c.lineWidth=2;c.stroke();
  c.fillStyle="#2f3532";c.fillRect(340,418,80,24);c.fillStyle="#6fa5b8";c.fillRect(344,421,32,18);c.fillRect(384,421,32,18);
  c.fillStyle="#1d7a46";c.fillRect(280,420,50,16);c.font="bold 9px sans-serif";c.fillStyle="#fff";c.fillText("SALIDA",305,432);
  return cv;
}
function bakeHome(){
  const I=HOME,R=rng(77),cv=mk(I.width,I.height),c=cv.getContext("2d"),f=I.floor;
  c.fillStyle="#0e1311";c.fillRect(0,0,I.width,I.height);
  for(let j=0;j*20<f.h;j++)for(let i=0;i*60<f.w;i++){const x=f.x+i*60+((j%2)*30)-30,y=f.y+j*20;c.fillStyle=(i+j)%3?"#b58a5a":"#a97f50";c.fillRect(Math.max(f.x,x),y,Math.min(58,f.x+f.w-Math.max(f.x,x)),19)}
  c.fillStyle="rgba(0,0,0,.08)";for(let y=f.y;y<f.y+f.h;y+=20)c.fillRect(f.x,y,f.w,1);
  wallBricks(c,0,0,I.width,f.y,"#cfc2a8");wallBricks(c,0,f.y,f.x,I.height-f.y,"#bfb298");wallBricks(c,f.x+f.w,f.y,I.width-f.x-f.w,I.height-f.y,"#bfb298");wallBricks(c,0,f.y+f.h,I.width,I.height-f.y-f.h,"#bfb298");
  c.fillStyle="#8a7a60";c.fillRect(0,f.y-8,I.width,8);
  for(let i=0;i<4;i++){const x=120+i*160;c.fillStyle="#2a2f33";c.fillRect(x-2,24,74,40);c.fillStyle="#8fc4d8";c.fillRect(x,26,70,36);c.fillStyle="#d9f0f7";c.fillRect(x+4,30,18,12);c.fillStyle="#6a5848";c.fillRect(x+34,26,2,36)}
  // alfombra y sala
  c.fillStyle="#7a3a3a";c.fillRect(66,180,180,150);c.fillStyle="#9a5050";c.fillRect(72,186,168,138);c.strokeStyle="#d8b48a";c.lineWidth=2;c.strokeRect(80,194,152,122);
  const shade=(r)=>{c.fillStyle="rgba(0,0,0,.25)";c.fillRect(r.x+5,r.y+7,r.w,r.h)};
  I.solids.forEach(shade);
  // TV y mueble
  c.fillStyle="#3a2a20";c.fillRect(80,98,110,26);c.fillStyle="#8b6a4a";c.fillRect(80,98,110,6);c.fillStyle="#101417";c.fillRect(96,92,78,22);c.fillStyle="#2f6fb5";c.fillRect(99,95,72,16);c.fillStyle="#9fd0ff";c.fillRect(103,98,24,6);
  // sofá
  c.fillStyle="#3a2342";c.fillRect(70,200,130,46);c.fillStyle="#6c3a8a";c.fillRect(74,204,122,32);c.fillStyle="#8e50b0";c.fillRect(78,208,52,22);c.fillRect(138,208,52,22);c.fillStyle="#4a2860";c.fillRect(70,200,10,46);c.fillRect(190,200,10,46);
  // sillón
  c.fillStyle="#3a2342";c.fillRect(235,205,50,50);c.fillStyle="#6c3a8a";c.fillRect(240,210,40,40);c.fillStyle="#8e50b0";c.fillRect(244,216,30,30);c.fillStyle="#4a2860";c.fillRect(235,205,8,50);
  // mesa de centro
  c.fillStyle="#5a4330";c.fillRect(110,294,80,30);c.fillStyle="#9b7650";c.fillRect(112,296,76,24);c.fillStyle="#e8e4d4";c.fillRect(126,302,16,10);c.fillStyle="#d93b3b";c.fillRect(160,303,12,8);
  // comedor
  c.fillStyle="#5a4330";c.fillRect(330,300,110,60);c.fillStyle="#a07f5c";c.fillRect(333,303,104,50);c.fillStyle="#e8e4d4";c.fillRect(350,318,24,16);c.fillRect(398,318,24,16);
  [[345,372],[400,372]].forEach(p=>{c.fillStyle="#3a2a20";c.fillRect(p[0],p[1],28,28);c.fillStyle="#8b6a4a";c.fillRect(p[0]+3,p[1]+3,22,22)});
  // cocina
  c.fillStyle="#cfd6d8";c.fillRect(480,96,230,40);c.fillStyle="#8a949a";c.fillRect(480,96,230,6);
  c.fillStyle="#2a2f33";c.fillRect(560,100,70,32);for(let i=0;i<4;i++){c.fillStyle="#555b60";c.beginPath();c.arc(576+(i%2)*28,110+(i>>1)*14,8,0,7);c.fill();c.fillStyle="#1b1f22";c.beginPath();c.arc(576+(i%2)*28,110+(i>>1)*14,5,0,7);c.fill()}
  c.fillStyle="#e8efe8";c.fillRect(650,98,50,36);c.fillStyle="#9aa3a8";c.fillRect(674,100,2,32);c.fillStyle="#6a747a";c.fillRect(666,110,3,8);
  c.fillStyle="#7db3c8";c.fillRect(500,106,40,20);
  c.font="bold 10px sans-serif";c.textAlign="center";c.fillStyle="#6a5848";c.fillText("COCINA",595,164);
  // dormitorio
  c.fillStyle="#3a2a20";c.fillRect(590,300,90,130);c.fillStyle="#e8eef0";c.fillRect(594,304,82,122);c.fillStyle="#fff";c.fillRect(600,310,70,24);c.fillStyle="#cfd8dc";c.fillRect(600,340,70,82);c.fillStyle="#2f6fb5";c.fillRect(594,350,82,76);c.fillStyle="rgba(255,255,255,.25)";c.fillRect(594,350,82,6);
  c.fillStyle="#5a4330";c.fillRect(690,300,34,34);c.fillStyle="#f0c84a";c.fillRect(700,306,14,12);c.fillStyle="#fff3b0";c.fillRect(704,302,6,6);
  c.font="bold 10px sans-serif";c.fillStyle="#6a5848";c.fillText("DORMITORIO",635,292);
  // plantas
  [[65,435],[705,435]].forEach(p=>{c.fillStyle="#6b4a32";c.fillRect(p[0]-8,p[1]+4,16,14);c.fillStyle="#3f8a4a";c.beginPath();c.arc(p[0],p[1],12,0,7);c.fill();c.fillStyle="#6bb35c";c.beginPath();c.arc(p[0]-3,p[1]-3,6,0,7);c.fill()});
  // puerta e intercomunicador
  c.fillStyle="#2f3532";c.fillRect(340,458,80,22);c.fillStyle="#6b4a32";c.fillRect(344,460,72,18);c.fillStyle="#d8c36a";c.fillRect(408,468,3,4);
  c.fillStyle="#1d1f24";c.fillRect(440,444,30,18);c.fillStyle="#4fd68a";c.fillRect(444,448,10,6);c.fillStyle="#d8c36a";c.fillRect(458,448,8,6);
  c.font="bold 9px sans-serif";c.fillStyle="#6a5848";c.fillText("INVITADOS",455,478);
  return cv;
}
const INT_IMG={};
function getInteriorImg(scene){
  if(!INT_IMG[scene])INT_IMG[scene]=scene==="shop"?bakeShop():scene==="hosp"?bakeHosp():scene==="cloth"?bakeCloth():scene==="home"?bakeHome():bakeInterior();
  return INT_IMG[scene];
}
