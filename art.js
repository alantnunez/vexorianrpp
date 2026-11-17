// VEXORIAN RP · V5 · dibujo del mundo por teselas (tiles) horneadas bajo demanda.
// En vez de 3 lienzos de 4200×3200 (≈160 MB) se hornean teselas de 512×512 solo cerca de la cámara y se descartan las lejanas.
const TILE=512,TW=Math.ceil(MAP_W/TILE),TH=Math.ceil(MAP_H/TILE);
const ELEMS=[],tileElems=new Map(),tiles=new Map();
let tileTick=0;

function drawCarShape(c,x,y,a,color,type,braking){
  c.save();c.translate(Math.round(x),Math.round(y));c.rotate(a);
  c.fillStyle="#15191b";[[-17,-11],[8,-11],[-17,8],[8,8]].forEach(w=>c.fillRect(w[0],w[1],8,3));
  c.fillStyle=shade(color,-.4);c.fillRect(-20,-10,40,20);
  c.fillStyle=color;c.fillRect(-19,-9,38,17);
  c.fillStyle="rgba(255,255,255,.2)";c.fillRect(10,-8,8,3);
  c.fillStyle=shade(color,-.15);c.fillRect(-10,-8,19,16);
  c.fillStyle="#9fcfe0";c.fillRect(8,-7,4,14);c.fillRect(-12,-7,3,14);
  c.fillStyle=shade(color,.14);c.fillRect(-8,-7,15,14);
  if(type==="taxi"){c.fillStyle="#fff7c8";c.fillRect(-3,-3,6,6);c.fillStyle="#222";c.fillRect(-1,-1,2,2)}
  c.fillStyle="#fff3b0";c.fillRect(18,-8,2,4);c.fillRect(18,4,2,4);
  c.fillStyle=braking?"#ff3b2b":"#a02020";c.fillRect(-20,-8,2,4);c.fillRect(-20,4,2,4);
  c.restore();
}
function boxPx(c,x,y,w,h,R){
  const cols=["#c28d54","#b98049","#cf9c62"];x=Math.round(x);y=Math.round(y);
  c.fillStyle="#7d5429";c.fillRect(x-1,y-1,w+2,h+2);
  c.fillStyle=cols[(R?R()*3:0)|0];c.fillRect(x,y,w,h);
  c.fillStyle="rgba(255,255,255,.22)";c.fillRect(x,y,w,3);
  c.fillStyle="#e8cc9a";c.fillRect(x+w/2-1,y,2,h);
  c.fillStyle="rgba(0,0,0,.18)";c.fillRect(x,y+h-3,w,3);
}
function box2(c,x,y,w,h,main,top){c.fillStyle="#1d1a22";c.fillRect(x-1,y-1,w+2,h+2);c.fillStyle=main;c.fillRect(x,y,w,h);if(top){c.fillStyle=top;c.fillRect(x,y,w,3)}}

// ---------- Edificios ----------
function pathStub(c,b){
  const {x,y,w,h}=b,cx=x+w/2;
  const rd=WORLD.hRoads.filter(r=>r.y>=y+h).sort((a,b2)=>a.y-b2.y)[0];
  let ph=16;if(rd){const d=rd.y-SW-(y+h)+2;if(d>0&&d<=130)ph=d}
  if(b.type==="house"){c.fillStyle="#a3a9a6";c.fillRect(cx-9,y+h,18,Math.min(ph,22))}
  else{c.fillStyle="#a3a9a6";c.fillRect(cx-26,y+h,52,ph);c.fillStyle="#8f9593";for(let yy=y+h;yy<y+h+ph;yy+=17)c.fillRect(cx-26,yy,52,1)}
}
function drawBuilding(c,S,b,R){
  const {x,y,w,h}=b,cx=x+w/2,sc=S();
  sc.fillStyle="rgba(8,12,10,.38)";sc.fillRect(x+12,y+14,w,h);sc.clearRect(x-3,y-3,w+6,h+6);
  pathStub(c,b);
  c.fillStyle="#1b221e";c.fillRect(x-3,y-3,w+6,h+6);
  c.fillStyle=shade(b.color,-.38);c.fillRect(x,y,w,26);
  c.fillStyle=shade(b.color,-.2);c.fillRect(x,y+22,w,4);
  c.fillStyle="rgba(255,255,255,.14)";c.fillRect(x+3,y+3,w-6,2);
  {const n=Math.max(2,w/110|0);for(let i=0;i<n;i++){const ax=x+14+((w-60)/n)*i+R()*10;c.fillStyle="#9aa3a0";c.fillRect(ax,y+6,18,12);c.fillStyle="#6d7673";c.fillRect(ax+3,y+9,12,6);c.fillStyle="#2a302d";c.fillRect(ax+6,y+11,6,2)}}
  c.fillStyle=b.color;c.fillRect(x,y+26,w,h-26);
  c.fillStyle="rgba(0,0,0,.10)";
  for(let yy=y+30,k=0;yy<y+h;yy+=8,k++){c.fillRect(x,yy,w,1);for(let xx=x+(k%2?8:0);xx<x+w;xx+=16)c.fillRect(xx,yy,1,8)}
  c.fillStyle="rgba(255,255,255,.08)";c.fillRect(x,y+26,w,3);
  c.fillStyle="rgba(0,0,0,.2)";c.fillRect(x,y+h-6,w,6);
  const sw=Math.min(w-30,b.name.length*8+26),sx=cx-sw/2,sy=y+32;
  c.fillStyle="#12171a";c.fillRect(sx-1,sy-1,sw+2,22);c.fillStyle="#1d2529";c.fillRect(sx,sy,sw,20);
  c.fillStyle=b.accent;c.fillRect(sx,sy,4,20);c.fillRect(sx+sw-4,sy,4,20);
  c.font="bold 11px sans-serif";c.textAlign="center";c.fillStyle="#f5f7f6";c.fillText(b.name,cx,sy+14);
  b.win.forEach(win=>{
    const wx=win.x,wy=win.y;
    c.fillStyle="#c9c6bb";c.fillRect(wx-3,wy+26,34,3);c.fillStyle="#252b2e";c.fillRect(wx-2,wy-2,32,30);
    c.fillStyle="#7db3c8";c.fillRect(wx,wy,28,26);c.fillStyle="#b5dce6";c.fillRect(wx+2,wy+2,8,10);c.fillRect(wx+4,wy+14,5,4);
    c.fillStyle="#252b2e";c.fillRect(wx+13,wy,2,26);c.fillRect(wx,wy+12,28,2);
  });
  const dx=cx-20,dy=y+h-42;
  c.fillStyle="#1d2326";c.fillRect(dx-3,dy-3,46,45);c.fillStyle="#3a2f2a";c.fillRect(dx,dy,40,42);
  c.fillStyle="#6fa5b8";c.fillRect(dx+3,dy+3,15,28);c.fillRect(dx+22,dy+3,15,28);
  c.fillStyle="#a9d6e0";c.fillRect(dx+5,dy+5,4,10);c.fillRect(dx+24,dy+5,4,10);
  c.fillStyle="#d8c36a";c.fillRect(dx+17,dy+22,2,5);c.fillRect(dx+21,dy+22,2,5);
  for(let i=0;i<7;i++){c.fillStyle=i%2?"#f1f1ec":b.accent;c.fillRect(dx-8+i*8,dy-12,8,10)}
  c.fillStyle="rgba(0,0,0,.28)";c.fillRect(dx-8,dy-2,56,3);
  c.fillStyle="#4d3f34";c.fillRect(dx-2,y+h+2,44,8);c.fillStyle="#6a5848";c.fillRect(dx,y+h+4,40,2);
  if(b.type==="hospital"){
    c.fillStyle="#fff";c.fillRect(x+w-64,y+34,38,38);c.fillStyle="#d93b3b";c.fillRect(x+w-52,y+38,14,30);c.fillRect(x+w-64+6,y+47,26,12);
    c.fillStyle="#d93b3b";c.fillRect(cx-44,y+h-62,88,12);c.font="bold 9px sans-serif";c.fillStyle="#fff";c.fillText("URGENCIAS 24H",cx,y+h-53);
    c.fillStyle="#fff";c.fillRect(x+30,y+34,38,38);c.fillStyle="#d93b3b";c.fillRect(x+42,y+38,14,30);c.fillRect(x+36,y+47,26,12);
  }else if(b.type==="depot"){
    c.fillStyle="#0f1315";c.fillRect(x+20,y+h-70,w-40,52);c.fillStyle="#2a2f33";for(let i=0;i<4;i++)c.fillRect(x+30+i*70,y+h-66,60,44);
    c.fillStyle="#e0803a";[0,1,2,3].forEach(i=>{c.fillRect(x+30+i*70,y+h-66,60,4)});
    c.fillStyle="#f5f7f6";c.fillRect(x+w-70,y+34,44,22);c.fillStyle="#e0803a";c.fillRect(x+w-26,y+40,16,12);c.fillStyle="#222";c.fillRect(x+w-64,y+54,8,6);c.fillRect(x+w-40,y+54,8,6);
  }else if(b.type==="factory"){
    [[w-44,6],[w-84,6]].forEach(p=>{c.fillStyle="#2a2f33";c.beginPath();c.arc(x+p[0],y+p[1]+8,13,0,7);c.fill();c.fillStyle="#6c747a";c.beginPath();c.arc(x+p[0],y+p[1]+8,9,0,7);c.fill();c.fillStyle="#1b1f22";c.beginPath();c.arc(x+p[0],y+p[1]+8,5,0,7);c.fill()});
  }else if(b.type==="dealer"){
    c.fillStyle="#0f1315";c.fillRect(x+16,y+h-36,60,26);c.fillRect(x+w-76,y+h-36,60,26);
    drawCarShape(c,x+46,y+h-23,0,"#c94f45","sedan");drawCarShape(c,x+w-46,y+h-23,0,"#e0b93a","sedan");
  }else if(b.type==="clothes"){
    [[x+20,"#2f6fb5"],[x+w-32,"#c0392b"]].forEach(p=>{c.fillStyle="#222";c.fillRect(p[0],y+h-32,12,22);c.fillStyle=p[1];c.fillRect(p[0]-3,y+h-32,18,12)});
  }
}
function drawHouse(c,S,b,R){
  const {x,y,w,h}=b,cx=x+w/2,sc=S();
  sc.fillStyle="rgba(8,12,10,.36)";sc.fillRect(x+9,y+11,w,h);sc.clearRect(x-2,y-2,w+4,h+4);
  pathStub(c,b);
  c.fillStyle="#1b221e";c.fillRect(x-2,y-2,w+4,h+4);
  c.fillStyle=b.accent;c.fillRect(x,y,w,26);
  c.fillStyle="rgba(0,0,0,.2)";for(let yy=y+4;yy<y+26;yy+=5)c.fillRect(x,yy,w,1);
  c.fillStyle="rgba(255,255,255,.18)";c.fillRect(x,y,w,3);c.fillStyle="rgba(0,0,0,.3)";c.fillRect(x,y+22,w,4);
  c.fillStyle="#6a5a4a";c.fillRect(x+w-28,y+4,12,12);c.fillStyle="#3a3028";c.fillRect(x+w-26,y+6,8,8);
  c.fillStyle=b.color;c.fillRect(x,y+26,w,h-26);
  c.fillStyle="rgba(0,0,0,.08)";for(let yy=y+30;yy<y+h;yy+=7)c.fillRect(x,yy,w,1);
  c.fillStyle="rgba(0,0,0,.18)";c.fillRect(x,y+h-5,w,5);
  b.win.forEach(win=>{c.fillStyle="#252b2e";c.fillRect(win.x-2,win.y-2,win.w+4,win.h+4);c.fillStyle="#7db3c8";c.fillRect(win.x,win.y,win.w,win.h);c.fillStyle="#b5dce6";c.fillRect(win.x+2,win.y+2,7,8);c.fillStyle="#252b2e";c.fillRect(win.x+win.w/2-1,win.y,2,win.h)});
  c.fillStyle="#1d2326";c.fillRect(cx-9,y+h-33,18,33);c.fillStyle="#6b4a32";c.fillRect(cx-7,y+h-31,14,31);c.fillStyle="#d8c36a";c.fillRect(cx+3,y+h-16,2,3);
  c.fillStyle="#6a5848";c.fillRect(cx-12,y+h,24,5);
}
function drawPark(c,S,b,R){
  const {x,y,w,h}=b,cx=x+w/2,cy=y+h/2;
  c.fillStyle="#6fa45a";c.fillRect(x,y,w,h);
  for(let i=0;i<Math.min(260,w*h/300|0);i++){c.fillStyle=R()<.5?"#5e9249":"#85b96d";c.fillRect(x+R()*w|0,y+R()*h|0,2,3)}
  c.fillStyle="#2f6b3c";c.fillRect(x-3,y-3,w+6,4);c.fillRect(x-3,y+h-1,w+6,4);c.fillRect(x-3,y-3,4,h+6);c.fillRect(x+w-1,y-3,4,h+6);
  c.fillStyle="#c9bb9c";c.fillRect(x,cy-9,w,18);c.fillRect(cx-9,y,18,h);
  c.fillStyle="#b3a687";for(let xx=x;xx<x+w;xx+=14)c.fillRect(xx,cy-9,1,18);
  [[x+36,cy-24],[x+w-70,cy-24],[x+36,cy+14],[x+w-70,cy+14]].forEach(p=>{c.fillStyle="#5a4330";c.fillRect(p[0],p[1],34,8);c.fillStyle="#8b6a4a";c.fillRect(p[0],p[1],34,5)});
  const FL=["#ff8fb1","#ffd84a","#fff","#c6a3ff"];
  for(let i=0;i<Math.min(60,w*h/2500|0);i++){c.fillStyle=FL[i%4];c.fillRect(x+16+R()*(w-32)|0,y+8+R()*(h-16)|0,2,2)}
  c.fillStyle="#c9bb9c";c.fillRect(cx-9,cy-9,18,18);
  if(b.lake){
    const rx=w*.27,ry=h*.2;
    c.fillStyle="#3a5f3c";c.beginPath();c.ellipse(cx,cy,rx+6,ry+6,0,0,7);c.fill();
    c.fillStyle="#2f7fae";c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,7);c.fill();
    c.fillStyle="#4aa0cc";c.beginPath();c.ellipse(cx-4,cy-3,rx*.8,ry*.75,0,0,7);c.fill();
    c.fillStyle="#9fd7ee";c.beginPath();c.ellipse(cx-rx*.3,cy-ry*.3,rx*.25,ry*.12,0,0,7);c.fill();
    c.fillStyle="#3f8a4a";[[.5,.2],[-.4,-.3],[.1,.45]].forEach(p=>{c.beginPath();c.arc(cx+rx*p[0],cy+ry*p[1],5,0,7);c.fill()});
  }else if(b.fountain){
    c.fillStyle="#6d7673";c.beginPath();c.arc(cx,cy,23,0,7);c.fill();c.fillStyle="#8a9390";c.beginPath();c.arc(cx,cy,20,0,7);c.fill();
    c.fillStyle="#4aa0cc";c.beginPath();c.arc(cx,cy,16,0,7);c.fill();c.fillStyle="#9fd7ee";c.beginPath();c.arc(cx,cy,8,0,7);c.fill();c.fillStyle="#e8f7ff";c.fillRect(cx-1,cy-1,3,3);
  }
  c.font="bold 10px sans-serif";c.textAlign="center";c.fillStyle="#1d3a26";c.fillText(b.name,cx,y+h+16);
}
function drawParking(c,S,b,R){
  const {x,y,w,h}=b;
  c.fillStyle="#1b1f21";c.fillRect(x-2,y-2,w+4,h+4);c.fillStyle="#40474a";c.fillRect(x,y,w,h);
  for(let i=0;i<w*h/60|0;i++){c.fillStyle=R()<.5?"#4a5154":"#383e41";c.fillRect(x+R()*w|0,y+R()*h|0,2,1)}
  const cols=["#d9d9d9","#2f3a4a","#7c3f58","#3d8a64","#caa53b","#b2493d","#4a76b8","#5b5f66"];
  c.fillStyle="#d8dcd8";
  if(w>=h){
    const sw=34,n=Math.max(1,Math.floor((w-6)/sw)),ox=x+(w-n*sw)/2,bh=Math.min(54,(h-14)/2);
    for(let i=0;i<=n;i++){c.fillRect(ox+i*sw,y+4,2,bh);c.fillRect(ox+i*sw,y+h-4-bh,2,bh)}
    for(let i=0;i<n;i++){
      if(R()<.55)drawCarShape(c,ox+i*sw+sw/2,y+4+bh/2,Math.PI/2,cols[R()*cols.length|0],"sedan");
      if(R()<.55)drawCarShape(c,ox+i*sw+sw/2,y+h-4-bh/2,-Math.PI/2,cols[R()*cols.length|0],"sedan");
    }
  }else{
    const sh=34,n=Math.max(1,Math.floor((h-6)/sh)),oy=y+(h-n*sh)/2,bw=Math.min(54,(w-14)/2);
    for(let i=0;i<=n;i++){c.fillRect(x+4,oy+i*sh,bw,2);c.fillRect(x+w-4-bw,oy+i*sh,bw,2)}
    for(let i=0;i<n;i++){
      if(R()<.55)drawCarShape(c,x+4+bw/2,oy+i*sh+sh/2,0,cols[R()*cols.length|0],"sedan");
      if(R()<.55)drawCarShape(c,x+w-4-bw/2,oy+i*sh+sh/2,Math.PI,cols[R()*cols.length|0],"sedan");
    }
  }
  c.fillStyle="#2b5fb0";c.fillRect(x+w/2-9,y+h/2-9,18,18);c.fillStyle="#fff";c.font="bold 13px sans-serif";c.textAlign="center";c.fillText("P",x+w/2,y+h/2+5);
}
function drawYard(c,S,b,R){
  const {x,y,w,h}=b,sc=S();
  c.fillStyle="#1b1f21";c.fillRect(x-3,y-3,w+6,h+6);c.fillStyle="#7a7468";c.fillRect(x,y,w,h);
  for(let i=0;i<w*h/40|0;i++){c.fillStyle=R()<.5?"#8a8478":"#6a645a";c.fillRect(x+R()*w|0,y+R()*h|0,2,2)}
  c.strokeStyle="#9aa0a4";c.lineWidth=2;c.strokeRect(x+1,y+1,w-2,h-2);
  (b.cont||[]).forEach(k=>{
    sc.fillStyle="rgba(8,12,10,.36)";sc.fillRect(k.x+6,k.y+8,k.w,k.h);sc.clearRect(k.x-1,k.y-1,k.w+2,k.h+2);
    c.fillStyle=shade(k.col,-.35);c.fillRect(k.x-1,k.y-1,k.w+2,k.h+2);c.fillStyle=k.col;c.fillRect(k.x,k.y,k.w,k.h);
    c.fillStyle="rgba(0,0,0,.2)";for(let i=4;i<k.w;i+=6)c.fillRect(k.x+i,k.y,2,k.h);c.fillStyle="rgba(255,255,255,.2)";c.fillRect(k.x,k.y,k.w,3);
  });
  c.font="bold 10px sans-serif";c.textAlign="center";c.fillStyle="#f5e9c8";c.fillText(b.name,x+w/2,y+h+16);
}
function drawLot(c,S,b,R){
  const {x,y,w,h}=b;
  c.fillStyle="#b79a6a";c.fillRect(x,y,w,h);
  for(let i=0;i<w*h/30|0;i++){c.fillStyle=R()<.5?"#a88a5c":"#c6aa7a";c.fillRect(x+R()*w|0,y+R()*h|0,2,2)}
  for(let i=0;i<w;i+=16){c.fillStyle=(i/16)%2?"#f0b84a":"#1a1d1f";c.fillRect(x+i,y,16,6);c.fillRect(x+i,y+h-6,16,6)}
  for(let i=0;i<h;i+=16){c.fillStyle=(i/16)%2?"#f0b84a":"#1a1d1f";c.fillRect(x,y+i,6,16);c.fillRect(x+w-6,y+i,6,16)}
  c.fillStyle="#8a6a3a";c.fillRect(x+40,y+30,50,30);c.fillStyle="#caa56a";c.fillRect(x+44,y+26,40,10);
  c.fillStyle="#e07b2e";[[x+120,y+30],[x+150,y+60],[x+260,y+40]].forEach(p=>{c.beginPath();c.moveTo(p[0],p[1]-12);c.lineTo(p[0]+8,p[1]+4);c.lineTo(p[0]-8,p[1]+4);c.fill()});
  c.fillStyle="#d8a32a";c.fillRect(x+w-100,y+20,6,60);c.fillRect(x+w-100,y+20,70,5);c.fillStyle="#555";c.fillRect(x+w-34,y+20,2,40);
  c.fillStyle="#1d2529";c.fillRect(x+w/2-70,y+h/2-9,140,18);c.fillStyle="#f0b84a";c.font="bold 9px sans-serif";c.textAlign="center";c.fillText("PRÓXIMAMENTE · OBRA",x+w/2,y+h/2+3);
}
function drawSports(c,S,b,R){
  const {x,y,w,h}=b,cx=x+w/2;
  c.fillStyle="#2f6b3c";c.fillRect(x-3,y-3,w+6,h+6);c.fillStyle="#4f8a56";c.fillRect(x,y,w,h);
  for(let yy=y;yy<y+h;yy+=24){c.fillStyle="rgba(255,255,255,.05)";c.fillRect(x,yy,w,12)}
  const cy=y+(h-30)/2;c.strokeStyle="#f1f1ec";c.lineWidth=2;c.strokeRect(x+20,y+20,w-40,h-70);
  c.beginPath();c.moveTo(cx,y+20);c.lineTo(cx,y+h-50);c.stroke();c.beginPath();c.arc(cx,cy,30,0,7);c.stroke();
  c.strokeRect(x+20,cy-40,40,80);c.strokeRect(x+w-60,cy-40,40,80);
  c.fillStyle="#5a4330";c.fillRect(x+30,y+h-24,80,12);c.fillRect(x+w-110,y+h-24,80,12);c.fillStyle="#8b6a4a";c.fillRect(x+30,y+h-24,80,7);c.fillRect(x+w-110,y+h-24,80,7);
  c.font="bold 10px sans-serif";c.textAlign="center";c.fillStyle="#ecf5ec";c.fillText(b.name,cx,y+14);
}
function drawGas(c,S,T,b,R){
  const {x,y,w,h}=b,sc=S();
  c.fillStyle="#1b1f21";c.fillRect(x-2,y-2,w+4,h+4);c.fillStyle="#464d50";c.fillRect(x,y,w,h);
  for(let i=0;i<w*h/50|0;i++){c.fillStyle=R()<.5?"#50575a":"#3c4245";c.fillRect(x+R()*w|0,y+R()*h|0,2,1)}
  c.fillStyle="#d8c36a";for(let i=0;i<w;i+=30)c.fillRect(x+i,y+h-8,16,3);
  sc.fillStyle="rgba(8,12,10,.38)";sc.fillRect(x+30,y+30,110,80);sc.clearRect(x+17,y+17,116,86);
  c.fillStyle="#1b221e";c.fillRect(x+17,y+17,116,86);c.fillStyle="#2d6a4f";c.fillRect(x+20,y+20,110,24);c.fillStyle="#e8efe8";c.fillRect(x+20,y+44,110,56);
  c.fillStyle="#7db3c8";c.fillRect(x+30,y+54,40,26);c.fillRect(x+80,y+54,40,26);c.fillStyle="#3a2f2a";c.fillRect(x+66,y+70,18,30);
  c.font="bold 9px sans-serif";c.textAlign="center";c.fillStyle="#fff";c.fillText("TIENDA 24H",x+75,y+36);
  [70,150,230].forEach(px=>{c.fillStyle="#1d2326";c.fillRect(x+px-1,y+149,18,32);c.fillStyle="#d93b3b";c.fillRect(x+px,y+150,16,30);c.fillStyle="#e8efe8";c.fillRect(x+px+3,y+154,10,8);c.fillStyle="#222";c.fillRect(x+px+12,y+168,3,10)});
  c.fillStyle="#555";c.fillRect(x+w-24,y+16,4,60);c.fillStyle="#2d6a4f";c.fillRect(x+w-44,y+10,44,20);c.fillStyle="#f0c84a";c.font="bold 9px sans-serif";c.fillText("$ 2.5",x+w-22,y+24);
  const tc=T();
  tc.fillStyle="rgba(8,12,10,.18)";tc.fillRect(x+30,y+142,290,70);
  tc.fillStyle="rgba(240,240,236,.62)";tc.fillRect(x+20,y+130,290,70);
  tc.fillStyle="#2d6a4f";tc.fillRect(x+20,y+130,290,10);tc.fillStyle="#f0c84a";tc.fillRect(x+20,y+140,290,3);
  tc.fillStyle="#9aa0a4";[[20,130],[300,130],[20,190],[300,190]].forEach(p=>tc.fillRect(x+p[0]-4,y+p[1]-4,8,8));
  tc.font="bold 10px sans-serif";tc.textAlign="center";tc.fillStyle="#15291f";tc.fillText("GASOLINERA",x+165,y+168);
}

// ---------- Base XTX ----------
function drawCompound(c,S,T,R){
  const X=XTX,sc=S();
  c.fillStyle="#4a4d52";c.fillRect(X.x,X.y,X.w,X.h);
  for(let i=0;i<1400;i++){c.fillStyle=R()<.5?"rgba(0,0,0,.12)":"rgba(255,255,255,.07)";c.fillRect(X.x+R()*X.w|0,X.y+R()*X.h|0,3,2)}
  c.fillStyle="rgba(0,0,0,.16)";for(let x=X.x;x<X.x+X.w;x+=40)c.fillRect(x,X.y,1,X.h);for(let y=X.y;y<X.y+X.h;y+=40)c.fillRect(X.x,y,X.w,1);
  // pasillo central y emblema
  c.fillStyle="#3b3f46";c.fillRect(X.gate.x-10,X.y,60,X.h/2);c.fillStyle="#d8b93c";for(let y=X.y+14;y<X.y+X.h/2;y+=30)c.fillRect(X.gate.x+19,y,2,16);
  c.save();c.font="bold 96px sans-serif";c.textAlign="center";c.fillStyle="rgba(142,68,173,.42)";c.fillText("XTX",X.x+X.w/2,X.y+X.h/2+120);c.lineWidth=4;c.strokeStyle="rgba(0,0,0,.35)";c.strokeText("XTX",X.x+X.w/2,X.y+X.h/2+120);c.restore();
  c.strokeStyle="rgba(142,68,173,.5)";c.lineWidth=3;c.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6;c.lineTo(X.x+X.w/2+Math.cos(a)*150,X.y+X.h/2+40+Math.sin(a)*150)}c.closePath();c.stroke();
  // camino y franjas de peligro en el portón
  c.fillStyle="#a3a9a6";c.fillRect(X.gate.x,2294,X.gate.w,X.y-2294+2);c.fillStyle="#8f9593";for(let y=2294;y<X.y;y+=17)c.fillRect(X.gate.x,y,X.gate.w,1);
  for(let i=0;i<X.gate.w+40;i+=10){c.fillStyle=(i/10)%2?"#f0b84a":"#1a1d1f";c.fillRect(X.gate.x-20+i,X.y+16,10,8)}
  // zonas con nombre
  const zone=(x,y,w,h,t,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);c.strokeStyle="rgba(255,255,255,.18)";c.lineWidth=2;c.setLineDash([8,6]);c.strokeRect(x,y,w,h);c.setLineDash([]);c.font="bold 11px sans-serif";c.textAlign="center";c.fillStyle="rgba(255,255,255,.55)";c.fillText(t,x+w/2,y+h-8)};
  zone(3520,2610,420,210,"ZONA DE REUNIÓN","rgba(80,50,110,.25)");
  zone(3600,2860,520,190,"ZONA DE ENTRENAMIENTO","rgba(30,30,30,.22)");
  zone(3500,2860,80,190,"PARQUEO","rgba(20,20,20,.25)");
  c.fillStyle="#cfd3d0";for(let i=0;i<3;i++)c.fillRect(3503,2872+i*60,74,2);
  drawCarShape(c,3540,2930,Math.PI/2,"#6b3fa0","sedan");
  // carriles del polígono
  c.fillStyle="rgba(255,255,255,.12)";[3740,3840,3940,4040].forEach(x=>c.fillRect(x+4,2910,2,80));
  c.fillStyle="#d8b93c";c.fillRect(3620,2906,330,3);
  // sombras
  const solidsX=[...X.walls,...X.objs,X.armoryB,X.vestB,X.storeB];solidsX.forEach(w=>{sc.fillStyle="rgba(8,12,10,.38)";sc.fillRect(w.x+6,w.y+8,w.w,w.h)});solidsX.forEach(w=>sc.clearRect(w.x-1,w.y-1,w.w+2,w.h+2));
  // muros con neón
  X.walls.forEach(w=>{c.fillStyle="#1d1a22";c.fillRect(w.x-1,w.y-1,w.w+2,w.h+2);c.fillStyle="#3a3340";c.fillRect(w.x,w.y,w.w,w.h);c.fillStyle="#8e44ad";c.fillRect(w.x,w.y,w.w,3);
    c.fillStyle="rgba(0,0,0,.25)";if(w.w>w.h)for(let x=w.x;x<w.x+w.w;x+=24)c.fillRect(x,w.y,1,w.h);else for(let y=w.y;y<w.y+w.h;y+=24)c.fillRect(w.x,y,w.w,1)});
  c.font="bold 9px sans-serif";c.textAlign="center";c.fillStyle="#c58be0";
  for(let x=3540;x<4130;x+=100)if(x<3780||x>3840)c.fillText("XTX",x,2400);
  [[3774,2376],[3846,2376]].forEach(p=>{c.fillStyle="#2a1f35";c.fillRect(p[0]-16,p[1]-12,32,16);c.fillStyle="#8e44ad";c.fillRect(p[0]-16,p[1]-12,32,2);c.font="bold 11px sans-serif";c.fillStyle="#e6c8f5";c.fillText("XTX",p[0],p[1])});
  // edificios: armería, chalecos, almacén
  const bld=(b,main,label,icon)=>{
    box2(c,b.x,b.y,b.w,b.h,main,"#8e44ad");c.fillStyle="rgba(0,0,0,.2)";c.fillRect(b.x,b.y+b.h-8,b.w,8);
    c.fillStyle="#12171a";c.fillRect(b.x+b.w/2-52,b.y+8,104,16);c.fillStyle="#8e44ad";c.fillRect(b.x+b.w/2-52,b.y+8,3,16);
    c.font="bold 10px sans-serif";c.textAlign="center";c.fillStyle="#f0e0fa";c.fillText(label,b.x+b.w/2,b.y+20);
  };
  bld(X.armoryB,"#2f2a38","ARMERÍA");bld(X.vestB,"#2f2a38","CHALECOS");bld(X.storeB,"#2a2f38","ALMACÉN XTX");
  // armería: ventanilla, mostrador y armas
  let a=X.armoryB;c.fillStyle="#0b0d10";c.fillRect(a.x+30,a.y+40,140,30);c.fillStyle="#4a4f5a";c.fillRect(a.x+34,a.y+44,132,22);
  c.fillStyle="#1b1b1b";[0,1,2,3,4].forEach(i=>{c.fillRect(a.x+42+i*26,a.y+49,18,4);c.fillRect(a.x+42+i*26,a.y+52,4,8)});
  c.fillStyle="#5a4330";c.fillRect(a.x+20,a.y+a.h-4,160,18);c.fillStyle="#8b6a4a";c.fillRect(a.x+20,a.y+a.h-4,160,13);
  c.fillStyle="#1b1b1b";[[a.x+40,a.y+a.h+1],[a.x+70,a.y+a.h+2]].forEach(p=>{c.fillRect(p[0],p[1],14,4);c.fillRect(p[0],p[1]+3,4,6)});
  c.fillStyle="#3a6b3a";c.fillRect(a.x+130,a.y+a.h+1,16,10);c.fillStyle="#d8c36a";c.fillRect(a.x+132,a.y+a.h+3,12,2);
  // chalecos: percheros
  a=X.vestB;for(let i=0;i<4;i++){c.fillStyle="#2a2f33";c.fillRect(a.x+14+i*24,a.y+a.h-2,4,8);c.fillStyle="#222";c.fillRect(a.x+8+i*24,a.y+a.h+4,16,20);c.fillStyle="#3a3f4a";c.fillRect(a.x+10+i*24,a.y+a.h+6,12,16);c.fillStyle="#8e44ad";c.fillRect(a.x+14+i*24,a.y+a.h+10,4,6)}
  // almacén: cajas, barriles
  a=X.storeB;c.fillStyle="#0b0d10";c.fillRect(a.x+60,a.y+a.h-26,60,26);c.fillStyle="#4a4f5a";c.fillRect(a.x+62,a.y+a.h-24,56,22);
  boxPx(c,a.x+8,a.y+a.h+6,22,18,R);boxPx(c,a.x+34,a.y+a.h+6,22,18,R);boxPx(c,a.x+130,a.y+a.h+6,22,18,R);boxPx(c,a.x+152,a.y+a.h+10,22,18,R);
  // zona de reunión
  let o=X.objs[0];c.fillStyle="#3b1f4a";c.fillRect(o.x,o.y,o.w,o.h);c.fillStyle="#6c3a8a";c.fillRect(o.x+3,o.y+3,o.w-12,o.h-6);c.fillStyle="#4a2860";c.fillRect(o.x,o.y,6,o.h);
  o=X.objs[2];c.fillStyle="#3b1f4a";c.fillRect(o.x,o.y,o.w,o.h);c.fillStyle="#6c3a8a";c.fillRect(o.x+9,o.y+3,o.w-12,o.h-6);c.fillStyle="#4a2860";c.fillRect(o.x+o.w-6,o.y,6,o.h);
  o=X.objs[1];c.fillStyle="#5a4330";c.fillRect(o.x,o.y,o.w,o.h);c.fillStyle="#8b6a4a";c.fillRect(o.x,o.y,o.w,o.h-6);c.fillStyle="#d8c9a0";c.fillRect(o.x+14,o.y+10,92,40);c.fillStyle="#8e44ad";c.fillRect(o.x+18,o.y+14,10,10);c.fillRect(o.x+60,o.y+30,10,10);c.fillStyle="#1b1b1b";c.fillRect(o.x+90,o.y+24,10,4);
  [X.objs[3],X.objs[4]].forEach(b=>{c.fillStyle="#5a4330";c.fillRect(b.x,b.y,b.w,b.h);c.fillStyle="#8b6a4a";c.fillRect(b.x,b.y,b.w,b.h-6)});
  [X.objs[5],X.objs[6]].forEach(b=>{c.fillStyle="#6b5a3a";c.fillRect(b.x,b.y,b.w,b.h);c.fillStyle="#8a7648";c.fillRect(b.x,b.y,b.w,5);c.fillStyle="#4a3d28";for(let x=b.x+8;x<b.x+b.w;x+=14)c.fillRect(x,b.y,2,b.h)});
  o=X.objs[7];c.fillStyle="#3a1f1a";c.beginPath();c.arc(o.x+12,o.y+12,13,0,7);c.fill();c.fillStyle="#7a3a2a";c.beginPath();c.arc(o.x+12,o.y+12,10,0,7);c.fill();c.fillStyle="#1a1a1a";c.beginPath();c.arc(o.x+12,o.y+12,7,0,7);c.fill();
  // banderas / pendones morados
  [[3500,2420],[4118,2420],[3500,3030],[4118,3030]].forEach(p=>{c.fillStyle="#222";c.fillRect(p[0],p[1],3,26);c.fillStyle="#8e44ad";c.fillRect(p[0]+3,p[1]+2,16,12);c.fillStyle="#e6c8f5";c.fillRect(p[0]+7,p[1]+6,8,4)});
  // letrero de la puerta
  c.fillStyle="#12171a";c.fillRect(X.gate.x-40,X.y-34,120,18);c.fillStyle="#8e44ad";c.fillRect(X.gate.x-40,X.y-34,3,18);c.font="bold 10px sans-serif";c.textAlign="center";c.fillStyle="#e6c8f5";c.fillText("TERRITORIO XTX",X.gate.x+20,X.y-21);
}

// ---------- Árboles ----------
function canopy(c,x,y,s){
  c.fillStyle="#244d33";c.beginPath();c.arc(x,y,21*s,0,7);c.fill();
  c.fillStyle="#2f6b3c";c.beginPath();c.arc(x-2,y-3,17*s,0,7);c.fill();
  c.fillStyle="#3f8a4a";c.beginPath();c.arc(x-5,y-7,11*s,0,7);c.fill();
  c.fillStyle="#6bb35c";c.beginPath();c.arc(x-8,y-11,5*s,0,7);c.fill();
  c.fillStyle="#2a5c38";c.fillRect(x+6*s,y+3*s,3,3);c.fillRect(x-10*s,y+6*s,3,3);c.fillRect(x+2*s,y-12*s,3,3);
}

// ---------- Registro de elementos dibujables ----------
function E(z,x,y,w,h,fn,seed){ELEMS.push({z,x,y,w,h,fn,seed:seed|0,i:ELEMS.length})}
(function buildElems(){
  WORLD.roads.forEach((r,i)=>{
    E(0,r.x-SW-2,r.y-SW-2,r.w+SW*2+4,r.h+SW*2+4,(c,S,T,R,b)=>{
      c.fillStyle="#6c7270";c.fillRect(r.x-SW-2,r.y-SW-2,r.w+SW*2+4,r.h+SW*2+4);
      c.fillStyle="#a3a9a6";c.fillRect(r.x-SW,r.y-SW,r.w+SW*2,r.h+SW*2);
    },i);
    E(0.1,r.x-SW,r.y-SW,r.w+SW*2,r.h+SW*2,(c,S,T,R,b)=>{
      c.fillStyle="#8f9593";const x0=r.x-SW,y0=r.y-SW,w=r.w+SW*2,h=r.h+SW*2;
      for(let x=x0+Math.ceil((Math.max(b.x0,x0)-x0)/17)*17;x<Math.min(x0+w,b.x1);x+=17)c.fillRect(x,y0,1,h);
      for(let y=y0+Math.ceil((Math.max(b.y0,y0)-y0)/17)*17;y<Math.min(y0+h,b.y1);y+=17)c.fillRect(x0,y,w,1);
    },i);
  });
  const asphalt=(r)=>(c,S,T,R,b)=>{
    c.fillStyle="#3a4143";c.fillRect(r.x,r.y,r.w,r.h);
    const ix0=Math.max(r.x,b.x0),iy0=Math.max(r.y,b.y0),ix1=Math.min(r.x+r.w,b.x1),iy1=Math.min(r.y+r.h,b.y1);
    if(ix1<=ix0||iy1<=iy0)return;const n=(ix1-ix0)*(iy1-iy0)/45|0;
    for(let k=0;k<n;k++){c.fillStyle=R()<.5?"#454d4f":"#31383a";c.fillRect(ix0+R()*(ix1-ix0)|0,iy0+R()*(iy1-iy0)|0,2,1)}
  };
  WORLD.roads.forEach((r,i)=>{
    E(1,r.x,r.y,r.w,r.h,(c,S,T,R,b)=>{
      asphalt(r)(c,S,T,R,b);const hz=r.w>r.h;
      c.fillStyle="#d8b93c";
      if(hz){c.fillRect(r.x,r.y+r.h/2-3,r.w,2);c.fillRect(r.x,r.y+r.h/2+1,r.w,2)}else{c.fillRect(r.x+r.w/2-3,r.y,2,r.h);c.fillRect(r.x+r.w/2+1,r.y,2,r.h)}
      c.fillStyle="#cfd3d0";
      if(hz){c.fillRect(r.x,r.y+6,r.w,2);c.fillRect(r.x,r.y+r.h-8,r.w,2)}else{c.fillRect(r.x+6,r.y,2,r.h);c.fillRect(r.x+r.w-8,r.y,2,r.h)}
    },i);
  });
  WORLD.inter.forEach((n,i)=>{
    E(2,n.x-52,n.y-52,n.w+104,n.h+104,(c,S,T,R,b)=>{
      asphalt(n)(c,S,T,R,b);c.fillStyle="#e6e8e4";
      for(let y=n.y+8;y<n.y+n.h-10;y+=14){c.fillRect(n.x-50,y,34,7);c.fillRect(n.x+n.w+16,y,34,7)}
      for(let x=n.x+8;x<n.x+n.w-10;x+=14){c.fillRect(x,n.y-50,7,34);c.fillRect(x,n.y+n.h+16,7,34)}
    },i+99);
  });
  WORLD.buildings.forEach((b,i)=>{
    const z=["park","parking","lot","yard","sports"].includes(b.type)?3:5;
    E(z,b.x-12,b.y-14,b.w+32,b.h+150,(c,S,T,R)=>{
      if(b.type==="park")drawPark(c,S,b,R);else if(b.type==="parking")drawParking(c,S,b,R);else if(b.type==="yard")drawYard(c,S,b,R);
      else if(b.type==="lot")drawLot(c,S,b,R);else if(b.type==="sports")drawSports(c,S,b,R);else if(b.type==="gas")drawGas(c,S,T,b,R);
      else if(b.type==="house")drawHouse(c,S,b,R);else drawBuilding(c,S,b,R);
    },i*7+3);
  });
  E(4,XTX.x-6,2280,XTX.w+20,XTX.h+130,(c,S,T,R)=>drawCompound(c,S,T,R),4242);
  WORLD.lamps.forEach((l,i)=>E(7,l.x-4,l.y-4,24,24,(c,S)=>{
    const sc=S();sc.strokeStyle="rgba(8,12,10,.3)";sc.lineWidth=2;sc.beginPath();sc.moveTo(l.x,l.y);sc.lineTo(l.x+11,l.y+15);sc.stroke();
    c.fillStyle="#232a2d";c.fillRect(l.x-3,l.y-3,7,7);c.fillStyle=l.xtx?"#c58be0":"#d9d4a8";c.fillRect(l.x-1,l.y-1,3,3);
  },i));
  WORLD.trees.forEach((t,i)=>E(8,t.x-34,t.y-44,68,70,(c,S,T)=>{
    c.fillStyle="#5a4330";c.fillRect(t.x-3,t.y+4,7,12);c.fillStyle="#74583f";c.fillRect(t.x-3,t.y+4,3,12);
    const sc=S();sc.fillStyle="rgba(8,12,10,.3)";sc.beginPath();sc.ellipse(t.x+10,t.y+12,20*t.s,10*t.s,0,0,7);sc.fill();
    canopy(T(),t.x,t.y-4,t.s);
  },i));
  ELEMS.sort((a,b)=>a.z-b.z||a.i-b.i);
  ELEMS.forEach(e=>{
    for(let tx=Math.max(0,Math.floor(e.x/TILE));tx<=Math.min(TW-1,Math.floor((e.x+e.w)/TILE));tx++)
      for(let ty=Math.max(0,Math.floor(e.y/TILE));ty<=Math.min(TH-1,Math.floor((e.y+e.h)/TILE));ty++){
        const k=ty*TW+tx;let a=tileElems.get(k);if(!a)tileElems.set(k,a=[]);a.push(e);
      }
  });
})();

function bakeTile(tx,ty){
  const x0=tx*TILE,y0=ty*TILE,w=Math.min(TILE,MAP_W-x0),h=Math.min(TILE,MAP_H-y0);
  const t={base:mk(w,h),shadow:null,top:null,used:tileTick,x0,y0};
  const c=t.base.getContext("2d");let sc=null,tc=null;
  const S=()=>{if(!sc){t.shadow=mk(w,h);sc=t.shadow.getContext("2d");sc.translate(-x0,-y0)}return sc};
  const T=()=>{if(!tc){t.top=mk(w,h);tc=t.top.getContext("2d");tc.translate(-x0,-y0)}return tc};
  c.translate(-x0,-y0);
  const G=["#5b8a4c","#5f8f50","#578646","#628f52"],R0=rng(tx*9973+ty*7919+1);
  for(let y=y0;y<y0+h;y+=10)for(let x=x0;x<x0+w;x+=10){c.fillStyle=G[R0()*4|0];c.fillRect(x,y,10,10)}
  for(let i=0;i<150;i++){const x=x0+R0()*w|0,y=y0+R0()*h|0;c.fillStyle=R0()<.5?"#4b7a3e":"#76a65f";c.fillRect(x,y,2,3);c.fillRect(x+3,y+1,1,2)}
  const FL=["#ffffff","#ffd84a","#ff8fb1","#c6a3ff"];
  for(let i=0;i<16;i++){const x=x0+R0()*w|0,y=y0+R0()*h|0;c.fillStyle="#3f7a3a";c.fillRect(x,y+2,1,2);c.fillStyle=FL[R0()*4|0];c.fillRect(x,y,2,2)}
  const bnd={x0,y0,x1:x0+w,y1:y0+h};
  (tileElems.get(ty*TW+tx)||[]).forEach(e=>e.fn(c,S,T,rng(e.seed*131+tx*17+ty*3+e.i),bnd));
  return t;
}
function getTile(tx,ty){
  const k=ty*TW+tx;let t=tiles.get(k);
  if(!t){t=bakeTile(tx,ty);tiles.set(k,t)}
  t.used=tileTick;return t;
}
// Dibuja las teselas visibles de una capa ("base"|"shadow"|"top"). ctx ya está trasladado por -cam.
function drawTiles(layer,cx,cy,vw,vh,budget){
  const tx0=Math.max(0,Math.floor(cx/TILE)),tx1=Math.min(TW-1,Math.floor((cx+vw)/TILE)),ty0=Math.max(0,Math.floor(cy/TILE)),ty1=Math.min(TH-1,Math.floor((cy+vh)/TILE));
  for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){
    const k=ty*TW+tx;let t=tiles.get(k);
    if(!t){ctx.fillStyle="#5b8a4c";ctx.fillRect(tx*TILE,ty*TILE,TILE,TILE);if(layer!=="base")continue;t=getTile(tx,ty)}
    t.used=tileTick;const img=t[layer];if(img)ctx.drawImage(img,t.x0,t.y0);
  }
}
function tileHousekeeping(cx,cy,vw,vh){
  tileTick++;
  // precarga 1 tesela vecina por fotograma
  const tx0=Math.max(0,Math.floor((cx-TILE)/TILE)),tx1=Math.min(TW-1,Math.floor((cx+vw+TILE)/TILE)),ty0=Math.max(0,Math.floor((cy-TILE)/TILE)),ty1=Math.min(TH-1,Math.floor((cy+vh+TILE)/TILE));
  outer:for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++)if(!tiles.has(ty*TW+tx)){getTile(tx,ty);break outer}
  const vis=(Math.ceil(vw/TILE)+2)*(Math.ceil(vh/TILE)+2),max=Math.max(24,vis+6);
  if(tiles.size>max){let oldK=null,oldU=1e12;tiles.forEach((t,k)=>{if(t.used<oldU){oldU=t.used;oldK=k}});if(oldK!==null&&oldU<tileTick-30)tiles.delete(oldK)}
}
