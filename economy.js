// VEXORIAN RP · V5 · economía. Dinero, inventario, compras y pagos los valida el servidor (RPC); aquí solo se muestran.
const job={active:false,order:null,boxes:0,earned:0};
const money=n=>"$"+Math.round(n).toLocaleString("es");
const catItem=k=>(ME.catalog.items||[]).find(i=>i.item_key===k);

function syncInvFlags(){
  player.hasPhone=!!player.inv.phone;player.weapon=!!player.inv.pistol;player.reserve=player.inv.ammo||0;
  if(!player.weapon)player.armed=false;
  refreshHotbar();
}
function useSlots(){return (ME.catalog.items||[]).filter(i=>["food","drink","med"].includes(i.kind)&&(player.inv[i.item_key]||0)>0).slice(0,9)}
function refreshHotbar(){
  const bar=document.getElementById("hotbar");if(!bar)return;bar.innerHTML="";
  useSlots().forEach((it,i)=>{
    const b=document.createElement("button");b.className="slot";b.title=it.name;
    b.innerHTML=`<small>${i+1}</small>${it.icon}<b>${player.inv[it.item_key]}</b>`;
    b.onclick=()=>useItem(it.item_key);bar.appendChild(b);
  });
  const w=document.getElementById("weapon");
  if(w){if(player.weapon){w.style.display="block";w.textContent=(player.armed?"🔫 ":"🔫 (G) ")+player.ammo+" / "+player.reserve+(player.armor>0?"  🦺 "+Math.round(player.armor):"")}else if(player.armor>0){w.style.display="block";w.textContent="🦺 "+Math.round(player.armor)}else w.style.display="none"}
}
async function useItem(key){
  if(!canControl())return;
  try{
    const r=await rpc("use_item",{p_key:key});
    player.hunger=Math.min(100,player.hunger+r.hunger);player.thirst=Math.min(100,player.thirst+r.thirst);
    player.energy=Math.min(100,player.energy+r.energy);player.hp=Math.min(100,player.hp+r.hp);
    player.inv[key]=r.qty;if(!r.qty)delete player.inv[key];syncInvFlags();sfxPickup();
    const it=catItem(key);floatText(player.x,player.y-28,it?it.icon:"✔","#b5ed67");
  }catch(e){toast(e.message);sfxError()}
}
async function reloadGun(){
  if(!player.weapon||player.ammo>=12)return;
  try{const r=await rpc("reload_gun");player.ammo=r.loaded;player.reserve=r.reserve;player.inv.ammo=r.reserve;sfxReload();refreshHotbar();
    if(r.loaded===0)toast("Sin munición. Pide más en la armería XTX.")}catch(e){toast(e.message)}
}

// ---------- Trabajo del almacén ----------
function updateMission(){
  const t0=document.getElementById("m-title"),x0=document.getElementById("m-text"),m0=document.getElementById("mission");
  if(typeof TJ!=="undefined"&&TJ.run&&t0){
    const d=TP_POINTS[TJ.run.to];
    if(TJ.status==="active"){t0.textContent="Transportista: carga la mercancía";x0.textContent="Sube a la furgoneta de trabajo (F), ve a la zona de carga de la Central y pulsa E."}
    else{t0.textContent="Transportista: entrega en "+d.name;x0.textContent="Conduce hasta el punto marcado y pulsa E. Recompensa: "+money(TJ.run.reward)}
    m0.classList.remove("hide");return;
  }
  const t=document.getElementById("m-title"),x=document.getElementById("m-text"),m=document.getElementById("mission");if(!t)return;
  if(!job.active){t.textContent="Empleo en el almacén";x.textContent="Habla con Marco para empezar tu turno. Cada entrega sube tu nivel.";m.classList.remove("hide");return}
  if(!job.order){t.textContent="Turno activo";x.textContent="Esperando pedido…"}
  else if(!player.carry){t.textContent="Pedido: caja del estante "+job.order.shelf;x.textContent="Recoge la caja del estante "+job.order.shelf+" (E) y llévala al muelle de carga."}
  else{t.textContent="Entrega la caja";x.textContent="Llévala al muelle de carga (E) para cobrar. ¡Rápido paga más!"}
  m.classList.remove("hide");
}
async function startShift(){
  try{await rpc("job_start_shift");job.active=true;job.boxes=0;job.earned=0;await newOrder();toast("Marco: ¡Turno iniciado! Mueve esas cajas.")}catch(e){toast(e.message)}
}
async function newOrder(){
  const s=INTERIOR.shelves[Math.random()*INTERIOR.shelves.length|0];
  try{await rpc("job_new_order");job.order={shelf:s.id,t:Date.now()};updateMission()}catch(e){toast(e.message)}
}
async function endShift(){
  try{const r=await rpc("job_end_shift");player.money=r.money;job.active=false;job.order=null;player.carry=false;updateMission();
    toast(`Turno terminado · ${r.boxes} cajas · ganaste ${money(r.earned)}${r.bonus?" (bono "+money(r.bonus)+")":""}`)}catch(e){toast(e.message)}
}
async function deliverBox(){
  try{
    const r=await rpc("job_deliver");player.carry=false;player.money=r.money;ME.level=r.level;job.boxes++;job.earned+=r.pay;
    sfxBuy();floatText(player.x,player.y-30,"+"+money(r.pay),"#b5ed67");
    toast(`Entrega correcta: +${money(r.pay)}${r.notes&&r.notes.length?" ("+r.notes.join(", ")+")":""} · Nivel ${r.level}`);
    await newOrder();
  }catch(e){toast(e.message);sfxError();if(/pedido/i.test(e.message)){player.carry=false;await newOrder()}}
}
function pickBox(){player.carry=true;sfxPickup();toast("Caja recogida. Llévala al muelle.");updateMission()}

// ---------- Panel genérico ----------
function openPanel(title,sub,build){
  if(PH.open)togglePhone();const o=document.getElementById("panel");document.getElementById("panel-title").textContent=title;document.getElementById("panel-sub").textContent=sub||"";
  const box=document.getElementById("panel-body");box.innerHTML="";build(box);o.style.display="grid";paused=true;panelOpen=true;
}
function closePanel(){document.getElementById("panel").style.display="none";panelOpen=false;paused=false;if(typeof onPanelClose==="function")onPanelClose();onPanelClose=null}
let panelOpen=false,onPanelClose=null;
function rowEl(icon,name,sub,btnText,fn,disabled){
  const r=document.createElement("div");r.className="shop-row";
  r.innerHTML=`<i>${icon}</i><div class="grow"><b></b><small></small></div>`;
  r.querySelector("b").textContent=name;r.querySelector("small").textContent=sub||"";
  if(btnText){const b=document.createElement("button");b.textContent=btnText;b.disabled=!!disabled;b.onclick=()=>fn(b);r.appendChild(b)}
  return r;
}
function moneyEl(){const d=document.createElement("div");d.className="shop-money";d.id="panel-money";d.textContent="Tu dinero: "+money(player.money);return d}
function setPanelMoney(){const e=document.getElementById("panel-money");if(e)e.textContent="Tu dinero: "+money(player.money)}
function effectText(i){const p=[];if(i.hunger)p.push((i.hunger>0?"+":"")+i.hunger+" comida");if(i.thirst)p.push((i.thirst>0?"+":"")+i.thirst+" sed");if(i.hp)p.push("+"+i.hp+" vida");if(i.energy)p.push("+"+i.energy+" energía");return p.join(" · ")||(i.kind==="tech"?"Permite usar el teléfono":"")}
function zoneOpen(z){return ME.creator||ME.world.zones[z]!==false}

function openShop(){
  if(!zoneOpen("supermercado")){toast("El supermercado está cerrado por la administración.");return}
  openPanel("Supermercado 24/7","Rosa te atiende",box=>{
    box.appendChild(moneyEl());
    (ME.catalog.items||[]).filter(i=>i.buyable).forEach(it=>{
      const have=player.inv[it.item_key]||0;
      box.appendChild(rowEl(it.icon,it.name,effectText(it)+(have?` · tienes ${have}`:""),money(it.price),async b=>{
        b.disabled=true;
        try{const r=await rpc("buy_item",{p_key:it.item_key,p_qty:1});player.money=r.money;player.inv[it.item_key]=r.qty;syncInvFlags();sfxBuy();setPanelMoney();
          b.parentNode.querySelector("small").textContent=effectText(it)+` · tienes ${r.qty}`;if(it.unique_item)b.textContent="Ya lo tienes";else b.disabled=false}
        catch(e){toast(e.message);sfxError();b.disabled=false}
      },it.unique_item&&have>0));
    });
  });
}
function openDealer(){
  if(!zoneOpen("concesionario")){toast("El concesionario está cerrado.");return}
  openPanel("Concesionario","Iván: todos los autos incluyen tanque lleno",box=>{
    box.appendChild(moneyEl());
    const mine=cars.filter(c=>c.owned).length;
    (ME.catalog.vehicles||[]).filter(v=>v.available!==false).forEach(v=>{
      box.appendChild(rowEl("🚗",v.name,"Consume combustible · se guarda en tu cuenta · tanque lleno",money(v.price),async b=>{
        b.disabled=true;
        try{const r=await rpc("buy_vehicle",{p_key:v.veh_key});player.money=r.money;ME.vehicles.push({id:r.id,model:r.model,color:r.color,plate:r.plate,fuel:100});
          addOwnedCar({id:r.id,model:r.model,color:r.color,plate:r.plate,fuel:100},ME.vehicles.length-1);sfxBuy();setPanelMoney();toast("¡Comprado! Tu "+v.name+" te espera frente al concesionario.");closePanel()}
        catch(e){toast(e.message);sfxError();b.disabled=false}
      }));
    });
    const n=document.createElement("small");n.className="muted";n.textContent=`Tienes ${mine} de 4 vehículos posibles. Pulsa F cerca de ellos para conducir.`;box.appendChild(n);
  });
}
function propState(b){return ME.properties.find(p=>p.key===b.sale)}
function openProperty(b){
  const cat=(ME.catalog.properties||[]).find(p=>p.property_key===b.sale),st=propState(b);
  if(!cat)return;
  if(st){toast(st.mine?"Esta es tu casa. ¡Bienvenido!":"Casa de "+st.owner+".");return}
  openPanel(cat.name,"Propiedad en venta",box=>{
    box.appendChild(moneyEl());
    box.appendChild(rowEl("🏠",cat.name,"Barrio "+b.district+" · queda registrada a tu nombre",money(cat.price),async btn=>{
      btn.disabled=true;
      try{const r=await rpc("buy_property",{p_key:b.sale});player.money=r.money;ME.properties.push({key:b.sale,owner:ME.username,mine:true});sfxBuy();toast("¡Ahora eres propietario de "+cat.name+"!");closePanel()}
      catch(e){toast(e.message);sfxError();btn.disabled=false}
    }));
  });
}

// ---------- XTX: portón, armería y chalecos (el servidor valida rol + código) ----------
function xtxNearGate(){return Math.hypot(player.x-(XTX.gate.x+XTX.gate.w/2),player.y-(XTX.gate.y+8))<110}
function openKeypad(){
  openPanel("Portón XTX","Zona privada · requiere rol XTX y código",box=>{
    const inp=document.createElement("input");inp.type="password";inp.maxLength=12;inp.placeholder="Código de acceso";inp.autocomplete="off";inp.inputMode="numeric";
    const msg=document.createElement("div");msg.className="pass-msg";
    const go=document.createElement("button");go.textContent="Entrar";
    const run=async()=>{
      go.disabled=true;msg.textContent="";
      try{const r=await rpc("xtx_enter",{p_code:inp.value});
        if(r.ok){ME.xtxAccess=true;sfxDoor(true);toast("Acceso concedido. Bienvenido a la base.");closePanel()}
        else{msg.textContent=r.msg||"Acceso denegado.";sfxError()}}
      catch(e){msg.textContent=e.message}
      go.disabled=false;inp.value="";
    };
    go.onclick=run;inp.addEventListener("keydown",e=>{if(e.key==="Enter")run();e.stopPropagation()});
    box.append(inp,msg,go);setTimeout(()=>inp.focus(),50);
  });
}
async function xtxClaim(kind,btn){
  if(btn)btn.disabled=true;
  try{
    const r=await rpc("xtx_claim",{p_kind:kind});
    player.inv=r.inv;if(r.equipment){player.ammo=r.equipment.ammo_loaded}syncInvFlags();sfxPickup();toast(r.msg);
  }catch(e){toast(e.message);sfxError()}
  if(btn)btn.disabled=false;
}
function openArmory(){
  openPanel("Armería XTX","Solo miembros autorizados",box=>{
    box.appendChild(rowEl("🔫","Pistola","Una por miembro. Incluye 24 balas de reserva.","Recoger",b=>xtxClaim("pistol",b)));
    box.appendChild(rowEl("🔸","Munición","+24 balas (máx. 120 en reserva)","Recoger",b=>xtxClaim("ammo",b)));
    box.appendChild(rowEl("🎒","Equipo XTX","Equipo de la banda","Recoger",b=>xtxClaim("kit",b)));
  });
}
function openVests(){
  openPanel("Estación de chalecos","Chalecos antibalas XTX",box=>{
    box.appendChild(rowEl("🦺","Recoger chaleco","Un chaleco por miembro","Recoger",b=>xtxClaim("vest",b)));
    box.appendChild(rowEl("🛡️","Equipar chaleco","Te da 100 puntos de armadura","Equipar",async b=>{
      b.disabled=true;
      try{const r=await rpc("equip_vest");player.armor=r.armor;player.inv=r.inv;syncInvFlags();sfxPickup();toast("Chaleco equipado: armadura al 100%.")}
      catch(e){toast(e.message);sfxError()}b.disabled=false;
    }));
  });
}

// =====================================================================
// V5 · Casas: entrar, invitados, muebles y cocina
// =====================================================================
function fadeTo(fn){
  return new Promise(res=>{
    const f=document.getElementById("fade");f.classList.add("on");
    setTimeout(()=>{try{fn()}finally{f.classList.remove("on");setTimeout(res,260)}},260);
  });
}
function houseAction(b){
  const st=propState(b);
  if(!st)return openProperty(b);
  if(st.mine||ME.guestOf.some(g=>g.key===b.sale))return enterHome(b);
  toast("Propiedad privada de "+st.owner+" #"+st.owner_pid+". No tienes autorización para entrar.");sfxError();
}
async function enterHome(b){
  if(player.pose||player.driving)return;
  try{
    const r=await rpc("enter_house",{p_key:b.sale});
    await fadeTo(()=>{player.home=b.sale;player.homeOwner=r.owner;player.homeIsOwner=!!r.is_owner;player.armed=false;player.scene="home";player.x=HOME.exit.x;player.y=HOME.exit.y-30;player.face="u";sfxDoor(true)});
    toast(r.is_owner?"Bienvenido a tu casa":"Estás en la casa de "+r.owner+" #"+r.owner_pid);
  }catch(e){toast(e.message);sfxError()}
}
async function exitHome(){
  if(player.pose)standUp();
  const b=WORLD.buildings.find(q=>q.sale===player.home);
  await fadeTo(()=>{player.scene="out";player.home=null;if(b){player.x=b.door.x;player.y=b.door.y+26}player.face="d";sfxDoor(false)});
  rpc("leave_house").catch(()=>{});
}
function forceLeaveHome(msg){
  if(player.pose)standUp();
  const b=WORLD.buildings.find(q=>q.sale===player.home);
  player.scene="out";player.home=null;if(b){player.x=b.door.x;player.y=b.door.y+26}
  if(panelOpen)closePanel();toast(msg);
}
function standUp(){
  if(!player.pose)return;
  const f=player.furn;player.pose=null;player.sit=false;player.lying=false;player.furn=null;
  if(f&&f.stand){const sp=freeSpot(player.scene,f.stand.x,f.stand.y);player.x=sp.x;player.y=sp.y}
  document.getElementById("pose-ui").style.display="none";sfxClick();
}
function setPose(pose,x,y,face,stand){
  if(player.pose||player.driving||player.carry||player.dead||HOSPS.locked)return;
  player.pose=pose;player.sit=pose==="sit";player.lying=pose==="lie";player.x=x;player.y=y;player.face=face||"d";player.armed=false;player.running=false;player.furn={stand};
  const u=document.getElementById("pose-ui");u.style.display="block";u.textContent=pose==="sit"?"Levantarte (E)":"Levantarte de la cama (E)";sfxClick();
}
const sitAt=s=>setPose("sit",s.x,s.y,s.face,s.stand);
const lieDown=()=>setPose("lie",HOME.bed.x,HOME.bed.y,"d",HOME.bed.stand);

// ---------- Invitados (solo el propietario) ----------
function openGuests(){
  if(!player.homeIsOwner){toast("Solo el propietario puede invitar personas.");return}
  const key=player.home;
  openPanel("Invitados de tu casa","Ellos pueden entrar, pero no comprar, vender ni quitarte la propiedad",box=>{
    const list=document.createElement("div"),res=document.createElement("div");
    const q=document.createElement("input");q.placeholder="Buscar jugador por nombre o ID…";q.addEventListener("keydown",e=>e.stopPropagation());
    const draw=g=>{
      list.innerHTML="";const h=document.createElement("div");h.className="set-h";h.textContent="CON ACCESO ("+g.length+"/8)";list.appendChild(h);
      g.forEach(x=>list.appendChild(rowEl("👤",x.username+" #"+x.pid,"Puede entrar a tu casa","Retirar acceso",async b=>{
        b.disabled=true;try{draw(await rpc("revoke_guest",{p_key:key,p_guest:x.id}));toast("Acceso retirado a "+x.username)}catch(e){toast(e.message);b.disabled=false}})));
      if(!g.length){const n=document.createElement("small");n.className="muted";n.textContent="Aún no has invitado a nadie.";list.appendChild(n)}
    };
    let tm;q.oninput=()=>{clearTimeout(tm);tm=setTimeout(async()=>{
      res.innerHTML="";if(q.value.trim().length<1)return;
      try{const rows=await rpc("search_players",{p_q:q.value.trim()});
        rows.forEach(p=>res.appendChild(rowEl("🔎",p.username+" #"+p.pid,p.online?"en línea":"desconectado","Invitar",async b=>{
          b.disabled=true;try{draw(await rpc("invite_guest",{p_key:key,p_guest:p.id}));toast(p.username+" ya puede entrar a tu casa");q.value="";res.innerHTML=""}catch(e){toast(e.message);b.disabled=false}})));
        if(!rows.length)res.innerHTML='<small class="muted">Sin resultados.</small>'}catch(e){toast(e.message)}
    },300)};
    box.append(q,res,list);
    rpc("list_guests",{p_key:key}).then(draw).catch(e=>toast(e.message));
  });
}
// ---------- Cocina ----------
function cookItemName(k){const i=catItem(k);return i?i.icon+" "+i.name:k}
function openCooking(){
  if(!player.home){toast("Solo puedes cocinar dentro de una casa.");return}
  let tmr=null;
  openPanel("Cocina","Prepara comida con ingredientes del supermercado",box=>{
    const render=()=>{
      box.innerHTML="";
      const cook=ME.cook,now=serverNow();
      if(cook){
        const rc=ME.recipes.find(r=>r.recipe_key===cook.recipe)||{name:cook.recipe,icon:"🍳"};
        const left=Math.max(0,Math.ceil((cook.ready_ms-now)/1000)),ready=left<=0;
        const card=document.createElement("div");card.className="cook-card";
        card.innerHTML=`<b>${rc.icon} ${esc(rc.name)}</b><small>${ready?"¡Listo!":"Cocinando… "+left+" s"}</small>`;
        if(ready){const b=document.createElement("button");b.textContent="Recoger comida";b.onclick=async()=>{b.disabled=true;
          try{const r=await rpc("cook_collect");ME.cook=null;player.inv=r.inv;syncInvFlags();sfxPickup();toast("Recibiste "+r.icon+" "+r.name+" en tu inventario");render()}catch(e){toast(e.message);b.disabled=false}};card.appendChild(b)}
        box.appendChild(card);
      }
      ME.recipes.forEach(rc=>{
        const need=Object.entries(rc.ingredients),ok=need.every(([k,v])=>(player.inv[k]||0)>=v);
        const sub=need.map(([k,v])=>cookItemName(k)+" "+(player.inv[k]||0)+"/"+v).join(" · ")+" · "+rc.seconds+" s";
        box.appendChild(rowEl(rc.icon,rc.name,sub,cook?"Ocupado":"Cocinar",async b=>{
          b.disabled=true;
          try{const r=await rpc("cook_start",{p_recipe:rc.recipe_key});ME.cook={recipe:r.recipe,ready_ms:r.ready_ms};player.inv=r.inv;syncInvFlags();sfxClick();toast("Cocinando "+rc.name+"…");render()}
          catch(e){toast(e.message);sfxError();b.disabled=false}
        },!ok||!!cook));
      });
      const n=document.createElement("small");n.className="muted";n.textContent="Los ingredientes se compran en el supermercado. La comida cocinada recupera hambre al consumirla (teclas 1-9).";box.appendChild(n);
    };
    render();tmr=setInterval(()=>{if(ME.cook&&Math.ceil((ME.cook.ready_ms-serverNow())/1000)>=-1)render()},1000);
  });
  onPanelClose=()=>clearInterval(tmr);
}

// =====================================================================
// V5 · Transportista (nivel 5): del punto A (Central) al punto B con vehículo de trabajo
// =====================================================================
const TJ={run:null,status:"",busy:false};
function tpTarget(){
  if(!TJ.run)return null;
  const k=TJ.status==="picked"?TJ.run.to:"depot";return Object.assign({key:k},TP_POINTS[k]);
}
async function tjRestore(){
  try{
    const s=await rpc("transport_status");
    if(s.run){TJ.run={to:s.run.to,reward:s.run.reward};TJ.status=s.run.status;spawnWorkVan();updateMission()}
  }catch{}
}
function estReward(key){const a=TP_POINTS.depot,b=TP_POINTS[key];return Math.round(80+Math.hypot(a.x-b.x,a.y-b.y)/9)*(vipOn("pay2x")?2:1)}
async function openTransport(){
  if(!zoneOpen("transporte")){toast("La central de transporte está cerrada por la administración.");return}
  let s;try{s=await rpc("transport_status")}catch(e){toast(e.message);return}
  ME.level=s.level;
  openPanel("Central de transporte","Trabajo de transportista · vehículo de trabajo incluido",box=>{
    if(!s.unlocked){
      const c=document.createElement("div");c.className="cook-card";
      c.innerHTML=`<b>🔒 Disponible desde el nivel ${s.required}</b><small>Tu nivel actual es ${s.level}. Sube de nivel trabajando en el almacén.</small><div class="hbar"><i style="width:${Math.min(100,(s.level-1)/(s.required-1)*100)}%"></i></div>`;
      box.appendChild(c);return;
    }
    const info=document.createElement("small");info.className="muted";info.textContent=`Entregas completadas: ${s.completed}${vipOn("pay2x")?" · Pago VIP x2 activo":""}. La furgoneta no gasta tu gasolina ni tu dinero.`;box.appendChild(info);
    if(s.run){
      const c=document.createElement("div");c.className="cook-card";
      const dest=TP_POINTS[s.run.to]||{name:s.run.to};
      c.innerHTML=`<b>🚚 Entrega en curso → ${esc(dest.name)}</b><small>${s.run.status==="active"?"Ve a la zona de carga y pulsa E dentro de la furgoneta.":"Lleva la mercancía al destino y pulsa E."} Recompensa: ${money(s.run.reward)}</small>`;
      const b=document.createElement("button");b.className="danger";b.textContent="Cancelar entrega (sin pago)";
      b.onclick=async()=>{b.disabled=true;try{await rpc("transport_cancel");tjClear();toast("Entrega cancelada. No se cobra ni se paga nada.");closePanel()}catch(e){toast(e.message);b.disabled=false}};
      c.appendChild(b);box.appendChild(c);
      if(!WORKVAN){TJ.run={to:s.run.to,reward:s.run.reward};TJ.status=s.run.status;spawnWorkVan()}
      return;
    }
    Object.entries(TP_POINTS).filter(([k])=>k!=="depot").forEach(([k,p])=>{
      box.appendChild(rowEl("📍",p.name,"Recompensa estimada "+money(estReward(k)),"Aceptar",async b=>{
        b.disabled=true;
        try{const r=await rpc("transport_start",{p_to:k});TJ.run={to:k,reward:r.reward};TJ.status="active";spawnWorkVan();sfxClick();updateMission();closePanel();
          toast("Viaje aceptado: sube a la furgoneta (F), carga en la Central y entrega en "+p.name)}
        catch(e){toast(e.message);sfxError();b.disabled=false}
      }));
    });
  });
}
function tjClear(){TJ.run=null;TJ.status="";removeWorkVan();updateMission()}
async function tjAction(){
  if(TJ.busy||!TJ.run)return;TJ.busy=true;
  try{
    if(TJ.status==="active"){await rpc("transport_pickup");TJ.status="picked";sfxPickup();toast("Mercancía cargada. Llévala a "+TP_POINTS[TJ.run.to].name+".");updateMission()}
    else{
      const r=await rpc("transport_deliver");player.money=r.money;ME.level=r.level;sfxBuy();floatText(player.x,player.y-30,"+"+money(r.reward),"#b5ed67");
      toast("Entrega completada: +"+money(r.reward)+(r.mult>1?" (VIP x"+r.mult+")":"")+" · Nivel "+r.level);tjClear();
    }
  }catch(e){toast(e.message);sfxError()}
  TJ.busy=false;
}
function nearTpTarget(){
  if(!TJ.run||!player.driving||!player.driving.work)return false;
  const t=tpTarget();return t&&dist(player.x,player.y,t.x,t.y)<70;
}

// =====================================================================
// V5 · Combustible (gasolineras)
// =====================================================================
function nearPump(){
  const o=player.driving||player;
  for(const g of WORLD.gas)for(const p of g.pumps)if(dist(o.x,o.y,p.x,p.y)<95)return g;
  return null;
}
function openFuel(g){
  openPanel(g.name,"Llena el tanque de tus vehículos personales",box=>{
    box.appendChild(moneyEl());
    const mine=cars.filter(c=>c.owned);
    if(!mine.length){const n=document.createElement("small");n.className="muted";n.textContent="No tienes vehículos personales. Compra uno en el concesionario.";box.appendChild(n)}
    mine.forEach(c=>{
      const cost=Math.max(1,Math.ceil((100-c.fuel)*.5)),near=dist(c.x,c.y,player.x,player.y)<260;
      box.appendChild(rowEl("🚗",c.name,"Combustible "+Math.round(c.fuel)+"% · llenar cuesta "+money(cost)+(near?"":" · acerca el vehículo"),"Llenar",async b=>{
        b.disabled=true;
        try{const r=await rpc("refuel_vehicle",{p_id:c.id});c.fuel=r.fuel;player.money=r.money;sfxBuy();toast("Tanque lleno por "+money(r.cost));setPanelMoney();openFuel(g)}
        catch(e){toast(e.message);sfxError();b.disabled=false}
      },!near||c.fuel>=99));
    });
    const n=document.createElement("small");n.className="muted";n.textContent="Los vehículos de trabajo no gastan combustible ni dinero personal.";box.appendChild(n);
  });
}
