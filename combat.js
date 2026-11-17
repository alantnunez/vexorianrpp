// VEXORIAN RP · V5 · combate. El arma y la munición de reserva vienen del servidor; el daño entre jugadores lo aplica la víctima.
const bullets=[],dummyState=XTX.dummies.map(()=>({hit:0,hits:0}));
let shootCd=0;
const mouse={x:0,y:0,wx:0,wy:0,down:false};
const BULLET_DMG=18;

function toggleGun(){
  if(!canControl()||player.driving)return;
  if(!player.weapon){toast("No tienes arma. La armería XTX está en la base (rol XTX).");return}
  if(player.scene!=="out"){toast("No puedes sacar el arma aquí dentro.");return}
  player.armed=!player.armed;refreshHotbar();sfxClick();
}
function spawnBullet(x,y,a,owner,remote){
  const sp=9;bullets.push({x:x+Math.cos(a)*16,y:y-1+Math.sin(a)*16,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:70,owner,remote:!!remote,scene:remote?player.scene:player.scene});
  if(bullets.length>60)bullets.shift();
}
function shoot(){
  if(shootCd>0||!player.armed||!canControl()||player.driving||player.scene!=="out")return;
  if(player.ammo<=0){sfxEmpty();shootCd=14;toast(player.reserve>0?"Cargador vacío: pulsa R para recargar.":"Sin munición. Pide más en la armería XTX.");return}
  shootCd=13;player.ammo--;player.flash=3;
  const a=player.aim;spawnBullet(player.x,player.y,a,ME.id,false);
  sfxShot(0,true);onlineShot(player.x,player.y,a);refreshHotbar();
  if(CFG.particles>0){spawnP(player.x+Math.cos(a)*18,player.y-1+Math.sin(a)*18,{vx:Math.cos(a)*.3,vy:Math.sin(a)*.3,m:7,s:4,c:"#ffe27a",al:.9});
    spawnP(player.x,player.y-2,{vx:-Math.sin(a)*1.2,vy:-.6,m:20,s:2,c:"#d8b94a",al:.9})}
}
function hurtPlayer(dmg,by){
  if(player.dead||HOSPS.active||player.safe>0||player.scene!=="out")return;
  if(player.armor>0){const ab=Math.min(player.armor,dmg*.7);player.armor-=ab;dmg-=ab*.8}
  player.hp-=dmg;player.hurt=14;player.flash=0;sfxHit();
  floatText(player.x,player.y-26,"-"+Math.round(dmg),"#ff6b6b");refreshHotbar();
  if(player.hp<=0){player.hp=0;playerDied(by)}
}
function updateBullets(dt){
  if(shootCd>0)shootCd-=dt;
  if(mouse.down&&player.armed)shoot();
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];let dead=false;
    if(b.scene!==player.scene){bullets.splice(i,1);continue}
    const steps=Math.ceil(9*dt/4);
    for(let s=0;s<steps&&!dead;s++){
      b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;
      if(blockedAt(player.scene,b.x,b.y,1,1)){dead=true;if(CFG.particles>0)for(let k=0;k<3;k++)spawnP(b.x,b.y,{vx:(Math.random()-.5)*1.5,vy:(Math.random()-.5)*1.5,m:10,s:2,c:"#ffd04a",al:.9});break}
      if(!b.remote){
        for(const n of npcs){if(n.scene===player.scene&&!n.down&&Math.abs(n.x-b.x)<9&&Math.abs(n.y-4-b.y)<14){npcHit(n,BULLET_DMG);dead=true;break}}
        if(!dead&&player.scene==="out"){XTX.dummies.forEach((d,k)=>{if(!dead&&Math.abs(d.x-b.x)<11&&Math.abs(d.y-14-b.y)<16){dummyState[k].hit=14;dummyState[k].hits++;dead=true;sfxHit();floatText(d.x,d.y-34,"+"+dummyState[k].hits,"#ffd04a")}})}
      }else if(!player.dead&&!HOSPS.active&&Math.abs(b.x-player.x)<10&&Math.abs(b.y-(player.y-2))<15){
        const o=NET.others.get(b.owner);hurtPlayer(BULLET_DMG,o?o.name:"alguien");dead=true;
      }
    }
    b.life-=dt;if(dead||b.life<=0)bullets.splice(i,1);
  }
  dummyState.forEach(d=>{if(d.hit>0)d.hit-=dt});
}
function drawBullets(c){
  bullets.forEach(b=>{c.fillStyle="rgba(255,226,122,.35)";c.fillRect(Math.round(b.x-b.vx*.9)-1,Math.round(b.y-b.vy*.9)-1,3,3);c.fillStyle="#fff6c8";c.fillRect(Math.round(b.x)-1,Math.round(b.y)-1,3,3)});
}
function drawDummies(c){
  XTX.dummies.forEach((d,i)=>{
    const st=dummyState[i],w=st.hit>0?Math.sin(st.hit)*2:0,x=Math.round(d.x+w),y=Math.round(d.y);
    if(CFG.shadows>0){c.fillStyle="rgba(0,0,0,.25)";c.fillRect(x-8,y+13,16,4)}
    c.fillStyle="#5a4330";c.fillRect(x-2,y-4,4,20);c.fillStyle="#2a2f33";c.fillRect(x-7,y+15,14,3);
    c.fillStyle="#e8e4d4";c.beginPath();c.arc(x,y-12,12,0,7);c.fill();
    c.fillStyle="#d93b3b";c.beginPath();c.arc(x,y-12,8,0,7);c.fill();c.fillStyle="#e8e4d4";c.beginPath();c.arc(x,y-12,4.5,0,7);c.fill();c.fillStyle="#d93b3b";c.beginPath();c.arc(x,y-12,1.8,0,7);c.fill();
  });
}
