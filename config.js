// VEXORIAN RP · V5 · configuración pública.
// La clave "publishable" es pública por diseño: la seguridad real está en las políticas RLS y en las funciones del servidor.
// NUNCA pongas aquí claves secret/service_role, contraseñas ni códigos de acceso.
const ENV={
  URL:"https://tgzghptoocfxvmvztaja.supabase.co",
  KEY:"sb_publishable_uu1AJXfC7OJ0CW_L77CXaw_zr76kfm4",
  VERSION:"4.0.0"
};
const MAP_W=4200,MAP_H=3200;
// Sincronización online (ajusta aquí si Supabase se satura)
const NETC={sendMin:100,sendMax:250,idleMs:1500,interp:160,heartbeatMs:6000,saveMs:20000,dmPoll:3000,dmPollOpen:1200,staleMs:5000};
// Entrada táctil compartida (joystick virtual). Se rellena en ui.js
const touchInput={dx:0,dy:0,run:false,brake:false,active:false};
