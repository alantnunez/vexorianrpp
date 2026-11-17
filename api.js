// VEXORIAN RP · V5 · cuentas y llamadas al servidor (Supabase Auth + RPC). El servidor valida todo lo importante.
let sb=null;
function sbInit(){
  if(sb)return sb;
  if(!window.supabase||!window.supabase.createClient)throw new Error("No se pudo cargar la librería de Supabase. Revisa tu conexión a internet.");
  sb=window.supabase.createClient(ENV.URL,ENV.KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"minisa-rp-auth"},
    realtime:{params:{eventsPerSecond:20}}
  });
  sb.auth.onAuthStateChange((ev,ses)=>{ME.token=ses?ses.access_token:null;if(ev==="PASSWORD_RECOVERY"&&typeof showRecovery==="function")showRecovery()});
  return sb;
}
const ME={token:null,pid:0,role:"",vip:{pay2x:true,speed:false,needs:false},guestOf:[],cook:null,recipes:[],points:[],level:1,exp:0,id:null,username:"",roles:[],creator:false,session:null,loginMs:0,serverOffset:0,xtxAccess:false,catalog:{items:[],vehicles:[],properties:[]},properties:[],vehicles:[],invisible:false,world:{weather:"clear",time_mode:"real",fixed_hour:12,zones:{}}};
const isXTX=()=>ME.creator||ME.roles.includes("XTX");
const isAdminRole=()=>ME.roles.includes("ADMIN");
const isStaff=()=>ME.creator||isAdminRole();
const isVIP=()=>ME.creator||ME.roles.includes("VIP");
const vipOn=k=>isVIP()&&!!ME.vip[k];
const topRole=()=>ME.creator?"CREATOR":isAdminRole()?"ADMIN":isVIP()?"VIP":ME.roles.includes("XTX")?"XTX":"";
const serverNow=()=>Date.now()+ME.serverOffset;

function friendlyError(e){
  const m=String((e&&e.message)||e||"");
  const map=[["Invalid login credentials","Correo o contraseña incorrectos."],["Email not confirmed","Confirma tu correo antes de entrar (revisa tu bandeja de entrada)."],
    ["User already registered","Ese correo ya está registrado."],["Password should be at least","La contraseña debe tener al menos 8 caracteres."],
    ["Database error saving new user","No se pudo crear la cuenta. El nombre de usuario puede estar en uso o reservado."],
    ["rate limit","Demasiados intentos. Espera un momento e inténtalo de nuevo."],["Failed to fetch","Sin conexión con el servidor."],
    ["NetworkError","Sin conexión con el servidor."],["Unable to validate email","Correo electrónico no válido."],["banned","Tu cuenta está suspendida."]];
  for(const [k,v] of map)if(m.toLowerCase().includes(k.toLowerCase()))return v;
  return m||"Error desconocido.";
}
async function rpc(name,args){
  const {data,error}=await sbInit().rpc(name,args||{});
  if(error){const err=new Error(friendlyError(error));err.raw=error;throw err}
  return data;
}

// ----- Autenticación -----
async function authSignUp(username,email,password){
  const c=sbInit();
  if(!/^[A-Za-z0-9_]{3,16}$/.test(username))throw new Error("El usuario debe tener 3–16 caracteres: letras, números o guion bajo.");
  if(password.length<8)throw new Error("La contraseña debe tener al menos 8 caracteres.");
  const ok=await rpc0("username_available",{p_name:username});
  if(ok===false)throw new Error("Ese nombre de usuario no está disponible.");
  const {data,error}=await c.auth.signUp({email,password,options:{data:{username},emailRedirectTo:location.origin+location.pathname}});
  if(error)throw new Error(friendlyError(error));
  return data; // data.session === null => requiere confirmar correo
}
async function rpc0(name,args){ // llamadas permitidas sin sesión
  const {data,error}=await sbInit().rpc(name,args||{});
  if(error)return null;return data;
}
async function authSignIn(email,password){
  const {data,error}=await sbInit().auth.signInWithPassword({email,password});
  if(error)throw new Error(friendlyError(error));return data;
}
async function authRecover(email){
  const {error}=await sbInit().auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  if(error)throw new Error(friendlyError(error));
}
async function authNewPassword(pw){
  if(pw.length<8)throw new Error("La contraseña debe tener al menos 8 caracteres.");
  const {error}=await sbInit().auth.updateUser({password:pw});
  if(error)throw new Error(friendlyError(error));
}
async function authSignOut(){try{await sbInit().auth.signOut()}catch{}}

// ----- Carga del perfil -----
async function loadMe(){
  const d=await rpc("get_me");
  if(d.banned)return d;
  ME.id=d.id;ME.username=d.username;ME.roles=d.roles||[];ME.creator=!!d.creator;ME.serverOffset=d.server_ms-Date.now();ME.loginMs=d.server_ms;
  ME.catalog=d.catalog||ME.catalog;ME.properties=d.properties||[];ME.vehicles=d.vehicles||[];ME.world=d.world||ME.world;ME.invisible=!!(d.state&&d.state.invisible);
  ME.xtxAccess=!!(d.state&&d.state.xtx_access);
  ME.pid=d.player_id;ME.role=d.role||"";ME.vip=d.vip||ME.vip;ME.guestOf=d.guest_of||[];ME.cook=d.cook;ME.level=d.level;ME.exp=d.exp;
  ME.recipes=(d.catalog&&d.catalog.recipes)||[];ME.points=(d.catalog&&d.catalog.points)||[];
  return d;
}

// ----- Guardado automático -----
function savePayload(){
  let px=player.x,py=player.y,sc=player.scene;
  if(sc==="home"){const b=WORLD.buildings.find(q=>q.sale===player.home);if(b){px=b.door.x;py=b.door.y+26}sc="out"}   // al recargar apareces frente a la puerta
  return{x:Math.round(px),y:Math.round(py),scene:sc,hp:Math.round(player.hp*10)/10,hunger:Math.round(player.hunger*10)/10,
    thirst:Math.round(player.thirst*10)/10,energy:Math.round(player.energy*10)/10,ammo:player.ammo,armor:player.armor};
}
let lastSaveOk=0;
async function saveGame(silent){
  if(!started||!ME.id||player.dead||HOSPS.active)return;
  try{await rpc("sync_state",{p:savePayload()});lastSaveOk=Date.now();if(!silent)toast("Partida guardada correctamente")}
  catch(e){if(!silent)toast("No se pudo guardar: "+e.message)}
}
// Guardado al cerrar la pestaña (fetch con keepalive y el token de la sesión)
function flushSave(){
  try{
    if(!started||!ME.id||!ME.token||player.dead||HOSPS.active)return;
    fetch(ENV.URL+"/rest/v1/rpc/sync_state",{method:"POST",keepalive:true,headers:{"Content-Type":"application/json",apikey:ENV.KEY,Authorization:"Bearer "+ME.token},body:JSON.stringify({p:savePayload()})}).catch(()=>{});
  }catch{}
}
