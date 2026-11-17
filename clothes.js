// VEXORIAN RP · V5 · tienda de ropa: vista previa, colores de camiseta y pantalón; el cambio se compra y se guarda en la cuenta
const CLOTH_COLORS=["#2f6fb5","#c0392b","#27ae60","#f1c40f","#8e44ad","#ecf0f1","#222222","#e67e22","#16a085","#e84393","#7f8c8d","#6d4c41","#1abc9c","#2c3e80","#a93226","#154360"];
function openClothes(){
  if(!zoneOpen("moda")){toast("La tienda está cerrada por la administración.");return}
  const sel={shirt:player.shirt,pants:player.pants,face:"d"};
  openPanel("Probador · Moda Urbana","Cambiar color cuesta $40 por prenda",box=>{
    box.appendChild(moneyEl());
    const wrap=document.createElement("div");wrap.className="cl-wrap";
    const cv=document.createElement("canvas");cv.width=170;cv.height=230;cv.className="cl-prev";
    const c=cv.getContext("2d");
    const draw=()=>{
      c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,170,230);c.fillStyle="#d9c9b0";c.fillRect(0,0,170,230);c.fillStyle="#c9b08a";c.fillRect(0,175,170,55);
      c.fillStyle="rgba(255,255,255,.35)";c.fillRect(14,12,34,150);
      c.imageSmoothingEnabled=false;c.setTransform(7,0,0,7,0,0);
      drawPerson(c,{x:12,y:20,skin:player.skin,hair:player.hair,shirt:sel.shirt,pants:sel.pants,face:sel.face,moving:false,anim:0,armor:player.armor,tag:"#fff"},null);
      c.setTransform(1,0,0,1,0,0);
    };
    const info=document.createElement("div");info.className="cl-info";
    const mkRow=(label,key)=>{
      const h=document.createElement("div");h.className="set-h";h.textContent=label;info.appendChild(h);
      const g=document.createElement("div");g.className="swatches";
      CLOTH_COLORS.forEach(col=>{const b=document.createElement("button");b.className="sw";b.style.background=col;b.setAttribute("aria-label",col);
        b.onclick=()=>{sel[key]=col;sfxClick();upd()};g.appendChild(b)});
      const pk=document.createElement("input");pk.type="color";pk.value=sel[key];pk.className="sw-pick";pk.title="Color personalizado";
      pk.oninput=()=>{sel[key]=pk.value;upd()};g.appendChild(pk);info.appendChild(g);return pk;
    };
    const p1=mkRow("CAMISETA","shirt"),p2=mkRow("PANTALONES","pants");
    const price=document.createElement("div");price.className="shop-money";
    const rot=document.createElement("button");rot.className="secondary";rot.textContent="↻ Girar personaje";
    rot.onclick=()=>{sel.face=({d:"l",l:"u",u:"r",r:"d"})[sel.face];draw()};
    const buy=document.createElement("button");buy.textContent="Confirmar compra";
    const upd=()=>{
      const cost=(sel.shirt.toLowerCase()!==player.shirt.toLowerCase()?40:0)+(sel.pants.toLowerCase()!==player.pants.toLowerCase()?40:0);
      price.textContent=cost?"Total: "+money(cost):"Sin cambios";buy.disabled=!cost||cost>player.money;
      if(cost>player.money)price.textContent+=" · te falta dinero";
      try{p1.value=sel.shirt;p2.value=sel.pants}catch{}draw();
    };
    buy.onclick=async()=>{
      buy.disabled=true;
      try{const r=await rpc("buy_clothes",{p_shirt:sel.shirt,p_pants:sel.pants});player.shirt=r.shirt;player.pants=r.pants;player.money=r.money;ME.shirt=r.shirt;ME.pants=r.pants;
        sfxBuy();toast("¡Te queda genial! Cambio guardado en tu cuenta por "+money(r.cost));closePanel()}
      catch(e){toast(e.message);sfxError();upd()}
    };
    info.append(price,rot,buy);wrap.append(cv,info);box.appendChild(wrap);upd();
  });
}
