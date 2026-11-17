// VEXORIAN RP · V5 · paneles CREATOR, ADMIN (limitado) y VIP. Todas las acciones pasan por funciones del servidor que verifican el rol y registran la operación.
const ADM={tab:"players",sel:null,q:"",online:false,timer:null};
function refreshAdminButton(){
  const g=id=>document.getElementById(id);
  const p=g("creator-bar");if(p)p.style.display=ME.creator?"flex":"none";
  const a=g("btn-panel");if(a){a.style.display=isStaff()?"inline-block":"none";a.textContent=ME.creator?"🛠️ Panel":"🛡️ Admin"}
  const v=g("btn-vip");if(v)v.style.display=isVIP()?"inline-block":"none";
}
function openAdmin(){
  if(!isStaff()){toast("Acceso denegado.");return}
  ADM.mode=ME.creator?"creator":"staff";
  if(PH.open)togglePhone();document.getElementById("admin").style.display="grid";paused=true;
  document.getElementById("admin-title").textContent=ME.creator?"🛠️ Panel CREATOR":"🛡️ Panel ADMIN";
  document.querySelectorAll("#admin .atab").forEach(b=>{b.style.display=ME.creator||b.dataset.t==="players"?"inline-block":"none"});
  adminTab(ME.creator?ADM.tab:"players");
}
function closeAdmin(){document.getElementById("admin").style.display="none";if(!panelOpen&&!MAPUI.open)paused=false}
function adminTab(t){
  if(ADM.mode==="staff")t="players";
  ADM.tab=t;document.querySelectorAll("#admin .atab").forEach(b=>b.classList.toggle("on",b.dataset.t===t));
  const box=document.getElementById("admin-body");box.innerHTML='<div class="muted">Cargando…</div>';
  ({players:admPlayers,economy:admEconomy,world:admWorld,houses:admHouses,log:admLog})[t](box);
}
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtT=s=>s?new Date(s).toLocaleString("es",{hour12:false,day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"—";
async function admCall(name,args,okMsg){
  try{const r=await rpc(name,args);if(okMsg)toast(okMsg);return r}catch(e){toast(e.message);sfxError();return undefined}
}
async function admPlayers(box){
  box.innerHTML="";
  const bar=document.createElement("div");bar.className="abar";
  bar.innerHTML=`<input id="adm-q" placeholder="Buscar por nombre…" value="${esc(ADM.q)}"><label class="chk"><input type="checkbox" id="adm-on" ${ADM.online?"checked":""}> Solo conectados</label><button id="adm-go">Buscar</button>`;
  box.appendChild(bar);
  const list=document.createElement("div");list.className="alist";box.appendChild(list);
  const det=document.createElement("div");det.className="adet";box.appendChild(det);
  const load=async()=>{
    ADM.q=bar.querySelector("#adm-q").value;ADM.online=bar.querySelector("#adm-on").checked;
    const rows=await admCall("admin_list_players",{p_q:ADM.q,p_online_only:ADM.online,p_limit:80});if(!rows)return;
    ADM.rows=rows;list.innerHTML="";
    rows.forEach(p=>{
      const r=document.createElement("div");r.className="arow"+(ADM.sel===p.id?" on":"");
      r.innerHTML=`<span class="dot ${p.online?"":"off"}"></span><b>${esc(p.username)}</b><em class="pid">#${p.pid}</em><em>${p.roles.map(x=>`<i class="rl ${x}">${x}</i>`).join("")}${p.banned?'<i class="rl BAN">BAN</i>':""}</em><small>${money(p.money)}</small>`;
      r.onclick=()=>{ADM.sel=p.id;list.querySelectorAll(".arow").forEach(x=>x.classList.remove("on"));r.classList.add("on");showDetail(p.id,det)};
      list.appendChild(r);
    });
    if(!rows.length)list.innerHTML='<div class="muted">Sin resultados.</div>';
    if(ADM.sel)showDetail(ADM.sel,det);
  };
  bar.querySelector("#adm-go").onclick=load;bar.querySelector("#adm-q").addEventListener("keydown",e=>{if(e.key==="Enter")load();e.stopPropagation()});
  await load();
}
async function staffDetail(id,det){
  const p=(ADM.rows||[]).find(x=>x.id===id);if(!p){det.innerHTML="";return}
  const lim=await admCall("admin_my_limits");
  const isS=p.roles.some(r=>r==="ADMIN"||r==="CREATOR"),mine=id===ME.id;
  det.innerHTML=`<h3>${esc(p.username)} <em class="pid">#${p.pid}</em> ${p.roles.map(x=>`<i class="rl ${x}">${x}</i>`).join("")}</h3>
  <div class="grid2"><div><small>Dinero</small><b>${money(p.money)}</b></div><div><small>Nivel</small><b>${p.level}</b></div>
  <div><small>Tu límite diario</small><b>${lim?money(lim.remaining)+" / "+money(lim.daily_limit):"—"}</b></div><div><small>Estado</small><b>${p.online?"en línea":"desconectado"}</b></div></div>
  <h3>Entregar dinero</h3><div class="abar"><input id="s-amt" type="number" min="1" placeholder="Cantidad"><button id="s-money">Entregar</button></div>
  <h3>Entregar objeto</h3><div class="abar"><select id="s-key">${(ME.catalog.items||[]).filter(i=>["food","drink","med","tech","ingredient"].includes(i.kind)).map(i=>`<option value="${i.item_key}">${i.icon} ${esc(i.name)}</option>`).join("")}</select><input id="s-qty" type="number" min="1" max="20" value="1" style="width:80px"><button id="s-item">Entregar</button></div>
  <div class="abtns"></div><p class="muted">Un ADMIN no puede retirar dinero ni objetos, entregar objetos de gear, asignar roles ni usar funciones del CREATOR.</p>`;
  det.querySelectorAll("input").forEach(i=>i.addEventListener("keydown",e=>e.stopPropagation()));
  det.querySelector("#s-money").onclick=async()=>{const a=parseInt(det.querySelector("#s-amt").value,10);
    const r=await admCall("admin_money",{p_id:id,p_delta:a,p_reason:"Entrega ADMIN"},"Dinero entregado");if(r)staffDetail(id,det)};
  det.querySelector("#s-item").onclick=async()=>{const r=await admCall("admin_item",{p_id:id,p_key:det.querySelector("#s-key").value,p_delta:parseInt(det.querySelector("#s-qty").value,10)},"Objeto entregado")};
  if(!mine&&!isS){const b=document.createElement("button");b.className="secondary";b.textContent="Expulsar";
    b.onclick=async()=>{if(confirm("¿Expulsar a "+p.username+"?")&&await admCall("admin_kick",{p_id:id,p_reason:"Expulsado por un ADMIN"},"Jugador expulsado"))staffDetail(id,det)};
    det.querySelector(".abtns").appendChild(b)}
}
async function showDetail(id,det){
  if(ADM.mode==="staff")return staffDetail(id,det);
  const d=await admCall("admin_player_detail",{p_id:id});if(!d){return}
  const inv=Object.entries(d.inv||{}).map(([k,v])=>`${(catItem(k)||{icon:"📦"}).icon} ${k}×${v}`).join(" · ")||"vacío";
  det.innerHTML=`<h3>${esc(d.username)} <em class="pid">#${d.player_id==null?"":d.player_id}</em> ${d.roles.map(x=>`<i class="rl ${x}">${x}</i>`).join("")}${d.banned?'<i class="rl BAN">BANEADO</i>':""}</h3>
  <div class="grid2"><div><small>Dinero</small><b>${money(d.money)}</b></div><div><small>Nivel / XP</small><b>${d.level} · ${d.exp}</b></div>
  <div><small>Vida</small><b>${Math.round(d.state.hp)}%${d.state.hospital?" 🏥":""}</b></div><div><small>Ubicación</small><b>${esc(d.state.scene)} (${Math.round(d.state.x)}, ${Math.round(d.state.y)})</b></div>
  <div><small>Última conexión</small><b>${fmtT(d.last_seen)}</b></div><div><small>Creado</small><b>${fmtT(d.created_at)}</b></div></div>
  <p class="muted">Inventario: ${esc(inv)}<br>Vehículos: ${d.vehicles.map(v=>esc(v.model)+" "+esc(v.plate)).join(", ")||"ninguno"} · Propiedades: ${d.properties.map(esc).join(", ")||"ninguna"}</p>
  <div class="abtns"></div>`;
  const bt=det.querySelector(".abtns"),mine=id===ME.id;
  const add=(t,fn,cls)=>{const b=document.createElement("button");b.textContent=t;if(cls)b.className=cls;b.onclick=fn;bt.appendChild(b)};
  ["XTX","ADMIN","VIP"].forEach(role=>{const has=d.roles.includes(role);
    add(has?"Retirar "+role:"Asignar "+role,async()=>{if(await admCall("admin_set_role",{p_id:id,p_role:role,p_grant:!has},has?"Rol "+role+" retirado":"Rol "+role+" asignado"))adminTab("players")},has?"secondary":"")});
  if(!mine&&!d.roles.includes("CREATOR")){
    add("Expulsar",async()=>{if(confirm("¿Expulsar a "+d.username+"?")&&await admCall("admin_kick",{p_id:id,p_reason:"Expulsado por el CREATOR"},"Jugador expulsado"))adminTab("players")},"secondary");
    if(d.banned)add("Desbanear",async()=>{if(await admCall("admin_unban",{p_id:id},"Jugador desbaneado"))adminTab("players")});
    else add("Banear",async()=>{const r=prompt("Motivo del baneo:","Incumplimiento de normas");if(r===null)return;const h=prompt("Horas de baneo (vacío = permanente):","");
      if(await admCall("admin_ban",{p_id:id,p_reason:r,p_hours:h?parseInt(h,10):null},"Jugador baneado"))adminTab("players")},"danger");
  }
  add("Curar al máximo",async()=>{if(await admCall("admin_heal",{p_id:id},"Jugador curado"))showDetail(id,det)},"secondary");
  add("Cambiar nivel",async()=>{const v=prompt("Nuevo nivel (1-100) para "+d.username+":",d.level);if(v===null)return;if(await admCall("admin_set_level",{p_id:id,p_level:parseInt(v,10)},"Nivel actualizado"))showDetail(id,det)},"secondary");
  add("Dar vehículo",async()=>{const m=prompt("Modelo a entregar (clave del catálogo):",(ME.catalog.vehicles||[]).map(v=>v.veh_key).join(" / "));if(!m)return;await admCall("admin_give_vehicle",{p_id:id,p_model:m.trim()},"Vehículo entregado")},"secondary");
  add("Dar casa",async()=>{const k=prompt("Clave de la casa (casa_01 … casa_48):","casa_");if(!k)return;await admCall("admin_give_property",{p_id:id,p_key:k.trim()},"Casa asignada")},"secondary");
  add("Ver compras",async()=>{const rows=await admCall("admin_purchases",{p_id:id,p_limit:40});if(!rows)return;
    det.querySelector("p").innerHTML="<b>Compras recientes</b><br>"+(rows.map(r=>`${fmtT(r.created_at)} · ${esc(r.kind)} ${esc(r.item_key||"")} ×${r.qty} · ${money(r.total)}`).join("<br>")||"Sin compras.")},"secondary");
}
async function admEconomy(box){
  const ov=await admCall("admin_overview");if(!ov)return;
  box.innerHTML=`<div class="grid2"><div><small>Jugadores</small><b>${ov.players}</b></div><div><small>Conectados</small><b>${ov.online}</b></div><div><small>Baneados</small><b>${ov.banned}</b></div><div><small>Dinero en circulación</small><b>${money(ov.money)}</b></div></div>
  <h3>Dinero</h3><div class="abar"><input id="e-user" placeholder="Nombre exacto del jugador"><input id="e-amt" type="number" placeholder="Cantidad (+ o −)"><input id="e-why" placeholder="Motivo"><button id="e-money">Aplicar</button></div>
  <h3>Objetos</h3><div class="abar"><input id="i-user" placeholder="Nombre exacto del jugador"><select id="i-key">${(ME.catalog.items||[]).map(i=>`<option value="${i.item_key}">${i.icon} ${esc(i.name)}</option>`).join("")}</select><input id="i-qty" type="number" value="1"><button id="i-give">Entregar / retirar</button></div>
  <p class="muted">Usa cantidad negativa para retirar. Cada operación queda registrada en el historial.</p>`;
  const find=async n=>{const r=await admCall("admin_list_players",{p_q:n,p_online_only:false,p_limit:5});const m=r&&r.find(p=>p.username.toLowerCase()===n.trim().toLowerCase());if(!m)toast("Jugador no encontrado (escribe el nombre exacto).");return m};
  box.querySelector("#e-money").onclick=async()=>{const p=await find(box.querySelector("#e-user").value);if(!p)return;const amt=parseInt(box.querySelector("#e-amt").value,10);
    const r=await admCall("admin_money",{p_id:p.id,p_delta:amt,p_reason:box.querySelector("#e-why").value},"Saldo actualizado");if(r&&p.id===ME.id)player.money=r.money};
  box.querySelector("#i-give").onclick=async()=>{const p=await find(box.querySelector("#i-user").value);if(!p)return;
    const r=await admCall("admin_item",{p_id:p.id,p_key:box.querySelector("#i-key").value,p_delta:parseInt(box.querySelector("#i-qty").value,10)},"Inventario actualizado");if(r&&p.id===ME.id){player.inv=r.inv;syncInvFlags()}};
  box.querySelectorAll("input").forEach(i=>i.addEventListener("keydown",e=>e.stopPropagation()));
}
async function admWorld(box){
  const ov=await admCall("admin_overview");if(!ov)return;const w=ov.world;
  const zn={almacen:"Almacén",supermercado:"Supermercado",concesionario:"Concesionario",moda:"Tienda de ropa",hospital:"Hospital",transporte:"Central de transporte",xtx:"Base XTX"};
  box.innerHTML=`<h3>Clima</h3><div class="abtns" id="w-weather">${[["clear","☀️ Despejado"],["cloudy","☁️ Nublado"],["rain","🌧️ Lluvia"],["storm","⛈️ Tormenta"]].map(([k,t])=>`<button data-k="${k}" class="${w.weather===k?"":"secondary"}">${t}</button>`).join("")}</div>
  <h3>Hora del mundo</h3><div class="abar"><label class="chk"><input type="checkbox" id="w-fix" ${w.time_mode==="fixed"?"checked":""}> Hora fija</label><input type="range" id="w-hour" min="0" max="23.5" step="0.5" value="${w.fixed_hour}"><b id="w-hv">${Math.floor(w.fixed_hour)}:${w.fixed_hour%1?"30":"00"}</b><button id="w-set">Aplicar</button></div>
  <div class="abtns"><button class="secondary" data-h="7">🌅 Amanecer</button><button class="secondary" data-h="12">☀️ Mediodía</button><button class="secondary" data-h="19">🌇 Atardecer</button><button class="secondary" data-h="23">🌙 Noche</button><button class="secondary" id="w-real">⏱ Hora real</button></div>
  <h3>Zonas del mapa</h3><div class="zones">${Object.entries(zn).map(([k,n])=>`<label class="zrow"><span>${n}</span><input type="checkbox" data-z="${k}" ${w.zones[k]!==false?"checked":""}></label>`).join("")}</div>
  <p class="muted">Una zona desactivada rechaza compras y accesos de los jugadores (el CREATOR siempre puede entrar).</p>`;
  const apply=async(weather,mode,hour)=>{const r=await admCall("admin_set_world",{p_weather:weather,p_time_mode:mode,p_hour:hour},"Mundo actualizado");if(r)applyWorld(r);adminTab("world")};
  const cur=()=>({weather:ME.world.weather,fix:box.querySelector("#w-fix").checked,hour:parseFloat(box.querySelector("#w-hour").value)});
  box.querySelectorAll("#w-weather button").forEach(b=>b.onclick=()=>{const c=cur();apply(b.dataset.k,c.fix?"fixed":"real",c.hour)});
  box.querySelector("#w-hour").oninput=e=>{const v=parseFloat(e.target.value);box.querySelector("#w-hv").textContent=Math.floor(v)+":"+(v%1?"30":"00")};
  box.querySelector("#w-set").onclick=()=>{const c=cur();apply(c.weather,c.fix?"fixed":"real",c.hour)};
  box.querySelectorAll("[data-h]").forEach(b=>b.onclick=()=>apply(ME.world.weather,"fixed",parseFloat(b.dataset.h)));
  box.querySelector("#w-real").onclick=()=>apply(ME.world.weather,"real",12);
  box.querySelectorAll("[data-z]").forEach(i=>i.onchange=async()=>{const r=await admCall("admin_set_zone",{p_key:i.dataset.z,p_enabled:i.checked},"Zona actualizada");if(r)applyWorld(r)});
}
async function admLog(box){
  const rows=await admCall("admin_log_list",{p_limit:100});if(!rows)return;
  const L={level_set:"Cambió nivel",heal:"Curó jugador",vehicle_give:"Entregó vehículo",property_give:"Asignó casa",property_release:"Liberó casa",view_profile:"Consultó perfil",role_grant:"Asignó rol",role_revoke:"Retiró rol",kick:"Expulsó",ban:"Baneó",unban:"Desbaneó",money_add:"Añadió dinero",money_remove:"Quitó dinero",item_give:"Entregó objeto",item_take:"Retiró objeto",world_set:"Cambió el mundo",zone_set:"Cambió una zona",power:"Poder"};
  box.innerHTML='<div class="alog">'+(rows.map(r=>`<div><small>${fmtT(r.created_at)}</small> <b>${esc(L[r.action]||r.action)}</b> ${r.target?"→ "+esc(r.target):""} <em>${esc(r.details?JSON.stringify(r.details):"")}</em></div>`).join("")||'<div class="muted">Sin registros.</div>')+"</div>";
}
// ----- Poderes del CREATOR (solo se activan si el servidor confirmó el rol) -----
async function creatorPower(p){
  if(!ME.creator){toast("Acceso denegado.");return}
  if(p==="fly")PW.fly=!PW.fly;else if(p==="speed")PW.speed=!PW.speed;
  else if(p==="invisible"){
    PW.invisible=!PW.invisible;ME.invisible=PW.invisible;setHidden(PW.invisible);
  }
  try{await rpc("admin_set_power",{p_power:p,p_on:p==="fly"?PW.fly:p==="speed"?PW.speed:PW.invisible})}catch(e){toast(e.message)}
  updateCreatorBar();toast({fly:"Vuelo",speed:"Super velocidad",invisible:"Invisibilidad"}[p]+": "+(PW[p]?"activado":"desactivado"));
}
function updateCreatorBar(){["fly","speed","invisible"].forEach(p=>{const b=document.getElementById("cb-"+p);if(b)b.classList.toggle("on",!!PW[p])})}
async function quickWeather(w){const r=await admCall("admin_set_world",{p_weather:w,p_time_mode:ME.world.time_mode,p_hour:ME.world.fixed_hour},"Clima: "+w);if(r)applyWorld(r)}

// ---------- Panel VIP ----------
function openVip(){
  if(!isVIP()){toast("Solo los jugadores VIP pueden usar este panel.");return}
  openPanel("💎 Panel VIP","Activa o desactiva tus poderes",box=>{
    const rows=[["pay2x","💰","Pago doble (x2)","Duplica lo que ganas en todos los trabajos (se calcula en el servidor, una sola vez por pago)."],
      ["speed","⚡","Velocidad VIP","Caminas y corres un 20 % más rápido."],["needs","🍽️","Metabolismo lento","Tu hambre y tu sed bajan a la mitad de velocidad."]];
    rows.forEach(([k,ic,n,d])=>{
      const r=document.createElement("div");r.className="shop-row";
      r.innerHTML=`<i>${ic}</i><div class="grow"><b>${n}</b><small>${d}</small></div>`;
      const sw=document.createElement("input");sw.type="checkbox";sw.checked=!!ME.vip[k];sw.className="swt";
      sw.onchange=async()=>{sw.disabled=true;try{ME.vip=await rpc("vip_set",{p_power:k,p_on:sw.checked});sfxClick();toast(n+": "+(ME.vip[k]?"activado":"desactivado"))}catch(e){toast(e.message);sw.checked=!sw.checked}sw.disabled=false};
      r.appendChild(sw);box.appendChild(r);
    });
  });
}

async function admHouses(box){
  const rows=await admCall("admin_list_properties");if(!rows)return;
  const owned=rows.filter(r=>r.owner_id).length;
  box.innerHTML=`<div class="grid2"><div><small>Casas</small><b>${rows.length}</b></div><div><small>Con dueño</small><b>${owned}</b></div></div><div class="alist" style="max-height:none;margin-top:12px"></div>`;
  const list=box.querySelector(".alist");
  rows.forEach(r=>{
    const d=document.createElement("div");d.className="arow";
    d.innerHTML=`<b>${esc(r.name)}</b><em style="margin-left:8px;font-style:normal;color:#9fb1a5">${esc(r.key)}</em><em>${r.owner_id?`${esc(r.owner)} <i class="pid">#${r.owner_pid}</i>${r.guests?" · "+r.guests+" invitados":""}`:"libre"}</em><small>${money(r.price)}</small>`;
    if(r.owner_id){const b=document.createElement("button");b.textContent="Liberar";b.className="secondary";b.style.cssText="width:auto;margin:0 0 0 8px;padding:5px 10px";
      b.onclick=async e=>{e.stopPropagation();if(confirm("¿Liberar "+r.name+" de "+r.owner+"?")&&await admCall("admin_release_property",{p_key:r.key},"Casa liberada"))admHouses(box)};d.appendChild(b)}
    list.appendChild(d);
  });
}
