// VEXORIAN RP · V5 · ajustes: SOLO gráficos y rendimiento
const SETTINGS_KEY="minisa-rp-settings-v4";
const DEFAULTS={perf:false,preset:"alto",pixel:2,fps:60,shadows:2,lighting:2,particles:2,autoperf:true,night:75,vignette:true,clock24:true,showFps:false};
const PRESETS={
  bajo:{pixel:3,fps:30,shadows:0,lighting:1,particles:0},
  medio:{pixel:2,fps:60,shadows:1,lighting:1,particles:1},
  alto:{pixel:2,fps:60,shadows:2,lighting:2,particles:2},
  ultra:{pixel:1,fps:0,shadows:2,lighting:2,particles:2}
};
const GFX_KEYS=["pixel","fps","shadows","lighting","particles"];
let CFG=Object.assign({},DEFAULTS);
try{Object.assign(CFG,JSON.parse(localStorage.getItem(SETTINGS_KEY))||{})}catch{}

const SCHEMA=[
  {h:"GRÁFICOS"},
  {k:"preset",t:"select",l:"Calidad gráfica",o:[["bajo","Baja"],["medio","Media"],["alto","Alta"],["ultra","Ultra"],["custom","Personalizada"]]},
  {k:"pixel",t:"select",n:1,l:"Escala de píxeles",o:[[1,"1× · nítido"],[2,"2× · equilibrado"],[3,"3× · retro"],[4,"4× · muy retro"]]},
  {k:"shadows",t:"select",n:1,l:"Calidad de sombras",o:[[0,"Desactivadas"],[1,"Básicas"],[2,"Completas"]]},
  {k:"lighting",t:"select",n:1,l:"Calidad de iluminación",o:[[0,"Sin iluminación"],[1,"Día y noche"],[2,"Día/noche + luces dinámicas"]]},
  {k:"particles",t:"select",n:1,l:"Partículas",o:[[0,"Desactivadas"],[1,"Reducidas"],[2,"Completas"]]},
  {k:"night",t:"range",l:"Oscuridad de la noche",min:0,max:100},
  {h:"RENDIMIENTO"},
  {k:"fps",t:"select",n:1,l:"Límite de FPS",o:[[30,"30"],[60,"60"],[0,"Sin límite"]]},
  {k:"perf",t:"switch",l:"Modo rendimiento (máximos FPS)"},
  {k:"autoperf",t:"switch",l:"Optimización automática"},
  {k:"showFps",t:"switch",l:"Mostrar FPS (F3)"},
  {h:"PANTALLA"},
  {k:"vignette",t:"switch",l:"Viñeta"},
  {k:"clock24",t:"switch",l:"Reloj de 24 horas"}
];
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(CFG))}catch{}}
function applySettings(){if(typeof onSettings==="function")onSettings()}
function resetSettings(){CFG=Object.assign({},DEFAULTS);saveSettings();buildSettings();applySettings()}
function buildSettings(){
  const box=document.getElementById("settings-body");box.innerHTML="";
  SCHEMA.forEach(s=>{
    if(s.h){const h=document.createElement("div");h.className="set-h";h.textContent=s.h;box.appendChild(h);return}
    const row=document.createElement("label");row.className="set-row";
    const name=document.createElement("span");name.textContent=s.l;row.appendChild(name);
    let el;
    if(s.t==="select"){el=document.createElement("select");s.o.forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;el.appendChild(o)});el.value=CFG[s.k]}
    else if(s.t==="range"){el=document.createElement("input");el.type="range";el.min=s.min;el.max=s.max;el.value=CFG[s.k]}
    else{el=document.createElement("input");el.type="checkbox";el.checked=!!CFG[s.k]}
    el.addEventListener("input",()=>{
      let v;if(s.t==="switch")v=el.checked;else if(s.t==="range")v=Number(el.value);else v=s.n?Number(el.value):el.value;
      CFG[s.k]=v;
      if(s.k==="perf"){
        if(v){CFG._prev=GFX_KEYS.reduce((o,k)=>(o[k]=CFG[k],o),{preset:CFG.preset});Object.assign(CFG,{pixel:3,fps:30,shadows:0,lighting:1,particles:0,preset:"custom"})}
        else if(CFG._prev){Object.assign(CFG,CFG._prev);delete CFG._prev}
        saveSettings();applySettings();buildSettings();return;
      }
      if(s.k==="preset"&&v!=="custom"){Object.assign(CFG,PRESETS[v]);buildSettings()}
      else if(GFX_KEYS.includes(s.k)&&CFG.preset!=="custom"){CFG.preset="custom";buildSettings()}
      saveSettings();applySettings();
    });
    row.appendChild(el);box.appendChild(row);
  });
}
