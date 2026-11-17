// VEXORIAN RP · V5 · audio procedural (WebAudio, sin archivos). Se activa con el primer clic (política del navegador).
const AUD={ctx:null,master:null,comp:null,noise:null,brown:null,muted:false,vol:.7,ambNode:null,ambKey:"",eng:null,rain:null,nextEvt:0,nextBeep:0,nextThunder:0};
try{const m=localStorage.getItem("minisa-rp-audio");if(m){const o=JSON.parse(m);AUD.muted=!!o.muted;AUD.vol=Number.isFinite(o.vol)?o.vol:.7}}catch{}
function audioSave(){try{localStorage.setItem("minisa-rp-audio",JSON.stringify({muted:AUD.muted,vol:AUD.vol}))}catch{}}

function audioInit(){
  if(AUD.ctx){if(AUD.ctx.state==="suspended")AUD.ctx.resume();return true}
  try{
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
    const ctx=AUD.ctx=new C();
    AUD.master=ctx.createGain();AUD.master.gain.value=AUD.muted?0:AUD.vol;
    AUD.comp=ctx.createDynamicsCompressor();AUD.comp.threshold.value=-14;AUD.comp.ratio.value=6;AUD.comp.attack.value=.003;AUD.comp.release.value=.2;
    AUD.master.connect(AUD.comp);AUD.comp.connect(ctx.destination);
    const n=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AUD.noise=n;
    const b=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),e=b.getChannelData(0);let l=0;for(let i=0;i<e.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;e[i]=l*3.5}AUD.brown=b;
    return true;
  }catch{return false}
}
function audioSetMuted(m){AUD.muted=m;if(AUD.master)AUD.master.gain.setTargetAtTime(m?0:AUD.vol,AUD.ctx.currentTime,.05);audioSave()}
function audioSetVol(v){AUD.vol=v;if(AUD.master&&!AUD.muted)AUD.master.gain.setTargetAtTime(v,AUD.ctx.currentTime,.05);audioSave()}
const rnd=(a,b)=>a+Math.random()*(b-a);

function nz(buf,dur,filter,f,q,g,t0,dest){ // ráfaga de ruido filtrada
  const c=AUD.ctx,s=c.createBufferSource(),fl=c.createBiquadFilter(),gn=c.createGain();
  s.buffer=buf;s.loop=true;fl.type=filter;fl.frequency.value=f;fl.Q.value=q||1;
  gn.gain.setValueAtTime(g,t0);gn.gain.exponentialRampToValueAtTime(.0008,t0+dur);
  s.connect(fl);fl.connect(gn);gn.connect(dest||AUD.master);s.start(t0,Math.random());s.stop(t0+dur+.05);return{fl,gn};
}
function tone(type,f0,f1,dur,g,t0,dest){
  const c=AUD.ctx,o=c.createOscillator(),gn=c.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t0);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t0+dur);
  gn.gain.setValueAtTime(g,t0);gn.gain.exponentialRampToValueAtTime(.0008,t0+dur);
  o.connect(gn);gn.connect(dest||AUD.master);o.start(t0);o.stop(t0+dur+.05);
}

// Disparo: chasquido + cuerpo + golpe grave + cola con eco. Varía cada vez. dist en píxeles (0 = propio).
function sfxShot(dist,own){
  if(!AUD.ctx||AUD.muted)return;
  const c=AUD.ctx,t=c.currentTime,att=Math.max(0,1-(dist||0)/760);if(att<=.02)return;
  const g=att*(own?1:.8)*rnd(.85,1.05),p=rnd(.9,1.12),lp=c.createBiquadFilter();
  lp.type="lowpass";lp.frequency.value=(dist?1800+att*6000:9000);
  const bus=c.createGain();bus.gain.value=g;lp.connect(bus);bus.connect(AUD.master);
  // eco / sala
  const dl=c.createDelay(.5),fb=c.createGain(),eg=c.createGain();dl.delayTime.value=rnd(.09,.13);fb.gain.value=.3;eg.gain.value=.22;
  const df=c.createBiquadFilter();df.type="lowpass";df.frequency.value=1600;
  bus.connect(dl);dl.connect(df);df.connect(fb);fb.connect(dl);df.connect(eg);eg.connect(AUD.master);
  nz(AUD.noise,.05,"highpass",2400*p,.7,.9,t,lp);              // chasquido
  nz(AUD.noise,.22,"bandpass",900*p,.6,.8,t,lp);               // cuerpo
  nz(AUD.brown,.45,"lowpass",420*p,.5,1.2,t,lp);               // cola grave
  tone("sine",190*p,38,.16,1.1,t,lp);                          // golpe
  tone("triangle",1100*p,260,.05,.25,t,lp);
  setTimeout(()=>{try{dl.disconnect();fb.disconnect()}catch{}},900);
}
function sfxHit(){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;nz(AUD.noise,.09,"lowpass",900,.7,.5,t);tone("sine",140,60,.12,.5,t)}
function sfxEmpty(){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;tone("square",1800,1500,.03,.08,t);tone("square",900,700,.04,.06,t+.04)}
function sfxReload(){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;nz(AUD.noise,.04,"bandpass",2500,3,.35,t);tone("square",420,300,.05,.12,t);nz(AUD.noise,.05,"bandpass",1800,3,.4,t+.45);tone("square",260,200,.06,.12,t+.45)}
function sfxPickup(){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;tone("sine",660,0,.09,.16,t);tone("sine",990,0,.12,.16,t+.07)}
function sfxBuy(){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;tone("triangle",1320,0,.07,.14,t);tone("triangle",1760,0,.16,.14,t+.06)}
function sfxClick(){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;tone("sine",1500,1100,.035,.07,t)}
function sfxError(){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;tone("sawtooth",190,130,.16,.1,t)}
function sfxMsg(){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;tone("sine",880,0,.1,.12,t);tone("sine",1175,0,.16,.12,t+.1)}
function sfxDoor(open){
  if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;
  nz(AUD.noise,.08,"lowpass",700,.8,.4,t);tone("sine",open?150:110,60,.14,.5,t+(open?0:.05));
  if(open)nz(AUD.noise,.25,"bandpass",1800,2,.07,t+.02);else nz(AUD.noise,.06,"bandpass",2200,3,.15,t+.1);
}
function sfxStep(run){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;nz(AUD.noise,.05,"lowpass",rnd(500,800),.8,run?.07:.045,t)}
function sfxThunder(){
  if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;
  nz(AUD.brown,2.6,"lowpass",rnd(160,260),.5,1.1,t+rnd(.1,.5));nz(AUD.noise,.5,"lowpass",600,.6,.3,t);
}
function sfxHonk(){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime,g=AUD.ctx.createGain();g.gain.value=.05;g.connect(AUD.master);tone("square",rnd(380,430),0,.28,.5,t,g);tone("square",rnd(480,520),0,.28,.5,t,g)}
function sfxBird(){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime,f=rnd(2200,3400);for(let i=0;i<3;i++)tone("sine",f,f*rnd(1.2,1.5),.08,.025,t+i*.11)}
function sfxCricket(){if(!AUD.ctx||AUD.muted)return;const t=AUD.ctx.currentTime;for(let i=0;i<5;i++)tone("sine",4300,4400,.025,.012,t+i*.045)}
function sfxBeep(){if(!AUD.ctx||AUD.muted)return;tone("sine",1000,0,.12,.08,AUD.ctx.currentTime)}

// Motor del vehículo propio
function audioEngine(on,v){
  if(!AUD.ctx)return;
  const c=AUD.ctx;
  if(on&&!AUD.eng){
    const o=c.createOscillator(),o2=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();
    o.type="sawtooth";o2.type="square";f.type="lowpass";f.frequency.value=420;g.gain.value=0;
    o.connect(f);o2.connect(f);f.connect(g);g.connect(AUD.master);o.start();o2.start();AUD.eng={o,o2,f,g};
  }
  if(!on&&AUD.eng){const e=AUD.eng;AUD.eng=null;e.g.gain.setTargetAtTime(0,c.currentTime,.1);setTimeout(()=>{try{e.o.stop();e.o2.stop()}catch{}},400);return}
  if(on&&AUD.eng){
    const a=Math.min(1,Math.abs(v)/5),t=c.currentTime,e=AUD.eng;
    e.o.frequency.setTargetAtTime(48+a*95,t,.08);e.o2.frequency.setTargetAtTime(24+a*48,t,.08);
    e.f.frequency.setTargetAtTime(300+a*900,t,.1);e.g.gain.setTargetAtTime(.05+a*.07,t,.1);
  }
}

// Ambiente según escena, hora y clima
function ambientKey(scene,hour,weather){return scene==="out"?"out":scene}
function audioAmbient(scene,hour,weather,nowMs){
  if(!AUD.ctx||AUD.muted)return;
  const c=AUD.ctx,key=scene+"|"+(weather==="rain"||weather==="storm"?"r":"");
  if(key!==AUD.ambKey){
    AUD.ambKey=key;
    if(AUD.ambNode){const o=AUD.ambNode;o.g.gain.setTargetAtTime(0,c.currentTime,.4);setTimeout(()=>{try{o.s.stop();o.s2&&o.s2.stop()}catch{}},1500)}
    const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
    s.buffer=AUD.brown;s.loop=true;f.type="lowpass";g.gain.value=0;
    const cfg={out:[380,.09],in:[260,.06],shop:[520,.05],hosp:[640,.045],cloth:[500,.035]}[scene]||[400,.05];
    f.frequency.value=cfg[0];s.connect(f);f.connect(g);g.connect(AUD.master);s.start();g.gain.setTargetAtTime(cfg[1],c.currentTime,.6);
    AUD.ambNode={s,g};
    if(AUD.rain){try{AUD.rain.s.stop()}catch{}AUD.rain=null}
    if(scene==="out"&&(weather==="rain"||weather==="storm")){
      const r=c.createBufferSource(),rf=c.createBiquadFilter(),rg=c.createGain();r.buffer=AUD.noise;r.loop=true;rf.type="highpass";rf.frequency.value=1800;rg.gain.value=0;
      r.connect(rf);rf.connect(rg);rg.connect(AUD.master);r.start();rg.gain.setTargetAtTime(weather==="storm"?.07:.045,c.currentTime,.8);AUD.rain={s:r,g:rg};
    }
  }
  if(nowMs<AUD.nextEvt)return;
  if(scene==="out"){
    const night=hour>=20||hour<6;
    AUD.nextEvt=nowMs+rnd(4000,11000);
    const r=Math.random();
    if(night){if(r<.6)sfxCricket();else if(r<.7)sfxHonk()}
    else{if(r<.55)sfxBird();else if(r<.7)sfxHonk()}
  }else if(scene==="hosp"){
    AUD.nextEvt=nowMs+1800;sfxBeep();
  }else AUD.nextEvt=nowMs+9000;
  if(scene==="out"&&weather==="storm"&&nowMs>AUD.nextThunder){AUD.nextThunder=nowMs+rnd(7000,16000);setTimeout(sfxThunder,rnd(200,900))}
}
