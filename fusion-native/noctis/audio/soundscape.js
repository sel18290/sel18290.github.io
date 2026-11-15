// Sons originaux procéduraux : aucun fichier distant, aucune voix.
export class Soundscape {
 constructor(){this.enabled=false;this.volume=.45;this.ready=false;this.fx=[];this.ambientNodes=[];this.wakeNodes=[];try{const s=JSON.parse(localStorage.getItem('noctis.audio.v1'));if(s){this.enabled=!!s.enabled;this.volume=Math.max(0,Math.min(1,Number(s.volume)||0));}}catch{}}
 save(){try{localStorage.setItem('noctis.audio.v1',JSON.stringify({enabled:this.enabled,volume:this.volume}));}catch{}}
 async enable(value){this.enabled=value;this.save();if(!value){this.level();return false;}try{if(!this.ctx)this.setup();this.ready=this.ctx.state==='running';this.level();await Promise.race([this.ctx.resume(),new Promise((_,reject)=>setTimeout(()=>reject(new Error("audio timeout")),1500))]);this.ready=this.ctx.state==='running';this.level();this.duck(this.ducked);return this.ready;}catch{this.enabled=false;this.ready=false;this.save();return false;}}
 setup(){this.ctx=new (window.AudioContext||window.webkitAudioContext)();const c=this.ctx;this.master=c.createGain();this.master.gain.value=0;this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-15;this.limiter.ratio.value=5;this.master.connect(this.limiter).connect(c.destination);this.amb=c.createGain();this.amb.gain.value=0;this.amb.connect(this.master);this.alarmBus=c.createGain();this.alarmBus.connect(this.master);this.noise=c.createBuffer(1,c.sampleRate*12,c.sampleRate);const a=this.noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*.6;const fade=c.sampleRate;for(let i=0;i<fade;i++){const mix=i/fade;a[i]=a[i]*mix+a[a.length-fade+i]*(1-mix);}this.startAmbient();}
 level(){if(!this.ctx)return;const t=this.ctx.currentTime;this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(this.enabled?this.volume:0,t,.08);}
 setVolume(v){this.volume=Math.max(0,Math.min(1,v));this.level();this.save();}
 node(source,dest){source.connect(dest);return source;}
 tone(freq,duration=.2,pan=0,amp=.1,type='sine',delay=0,end=freq,bus=this.master){if(!this.enabled||!this.ready)return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(amp,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);p.pan.value=pan;o.connect(g).connect(p).connect(bus);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};return o;}
 texture(duration,pan,frequency,amp=.1,delay=0){if(!this.enabled||!this.ready)return;const c=this.ctx,t=c.currentTime+delay,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),p=c.createStereoPanner();s.buffer=this.noise;f.type='bandpass';f.frequency.value=frequency;f.Q.value=.7;p.pan.value=pan;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(amp,t+duration*.25);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f).connect(g).connect(p).connect(this.master);const echo=c.createDelay(.5),wet=c.createGain();echo.delayTime.value=.09;wet.gain.value=.12;p.connect(echo).connect(wet).connect(this.master);s.start(t,Math.random()*5);s.stop(t+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();p.disconnect();setTimeout(()=>{echo.disconnect();wet.disconnect();},350);};return s;}
 sweep(duration,pan,from,to,amp=.1,delay=0){
 if(!this.enabled||!this.ready)return;
 const c=this.ctx,t=c.currentTime+delay,source=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain(),p=c.createStereoPanner();
 source.buffer=this.noise;filter.type='bandpass';filter.Q.value=2.2;filter.frequency.setValueAtTime(from,t);filter.frequency.exponentialRampToValueAtTime(to,t+duration);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(amp,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+duration);p.pan.value=pan;
 source.connect(filter).connect(g).connect(p).connect(this.master);source.start(t,2);source.stop(t+duration+.02);
 source.onended=()=>{source.disconnect();filter.disconnect();g.disconnect();p.disconnect();};return source;
 }
 startAmbient(){if(this.ambientNodes.length)return;const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;s.loop=true;f.type='lowpass';f.frequency.value=420;g.gain.value=.12;s.connect(f).connect(g).connect(this.amb);s.start();this.ambientNodes.push(s);for(const freq of [52,78.08,103.9]){const o=c.createOscillator(),v=c.createGain();o.frequency.value=freq;v.gain.value=.012;o.connect(v).connect(this.amb);o.start();this.ambientNodes.push(o);}const l=c.createOscillator(),lg=c.createGain();l.frequency.value=.067;lg.gain.value=45;l.connect(lg).connect(f.frequency);l.start();this.ambientNodes.push(l);this.pulseTimer=setInterval(()=>{if(this.enabled&&this.ctx.state==='running'&&!this.ducked)this.tone(180,1.3,.15,.012,'sine',0,210);},17000);}
 duck(active){this.ducked=active;if(this.ctx)this.amb.gain.setTargetAtTime(this.waking?0:(active?.22:.65),this.ctx.currentTime,.45);}
 wake(){
 // Réveil mécanique original à deux cloches : trille métallique classique, 2 s.
 if(!this.enabled||!this.ready)return;this.stopWake();this.waking=true;
 const c=this.ctx,t=c.currentTime;
 this.alarmBus.gain.cancelScheduledValues(t);this.alarmBus.gain.setValueAtTime(1,t);
 this.alarmBus.gain.setValueAtTime(1,t+1.97);this.alarmBus.gain.linearRampToValueAtTime(0,t+2);
 this.amb.gain.setTargetAtTime(0,t,.03);this.wakeNodes=[];
 for(let k=0;k<32;k++){
  const delay=k*.06,base=k%2?1568:1319;
  for(const [ratio,amp] of [[1,.065],[2.76,.022],[4.08,.009]]){
   const n=this.tone(base*ratio,.075,k%2?.12:-.12,amp,'sine',delay,base*ratio*.997,this.alarmBus);
   if(n)this.wakeNodes.push(n);
  }
 }
 }
 stopWake(){this.waking=false;const old=this.wakeNodes;this.wakeNodes=[];for(const n of old){if(n.stop)try{n.stop(this.ctx.currentTime+.08);}catch{}}if(this.ctx){this.alarmBus.gain.setTargetAtTime(0,this.ctx.currentTime,.08);setTimeout(()=>{for(const n of old)n.disconnect();},130);this.duck(this.ducked);}}
 effect(name){if(!this.enabled||!this.ready||document.hidden)return;const v=1+(Math.random()-.5)*.04;const tone=(f,d,p,a,ty='sine',de=0,en=f)=>this.tone(f*v,d,p,a,ty,de,en);switch(name){case'clock':tone(1100,.12,-.35,.07);tone(1650,.18,-.35,.035,'sine',.09);break;case'bed':this.texture(.65,0,900,.3);this.texture(.45,-.1,240,.18,.2);break;case'computer':
// Contact, alimentation, balayage holographique, accord de disponibilité.
tone(160,.10,-.3,.055,'triangle',0,240);
this.sweep(.68,-.3,280,4200,.18,.035);
tone(140,.55,-.28,.045,'triangle',.04,700);
tone(1100,.48,-.2,.026,'sine',.10,2400);
tone(880,.27,-.25,.045,'sine',.55);tone(1320,.32,-.2,.025,'sine',.62);
break;case'close':tone(750,.1,-.15,.035,'sine',0,420);break;case'servo':this.texture(.55,.25,480,.07);tone(95,.4,.25,.025,'triangle',0,150);break;case'speak':tone(520,.13,.25,.04);tone(780,.17,.25,.025,'sine',.1);break;case'end':tone(440,.12,.25,.025,'sine',0,350);break;case'wrong':tone(240,.22,0,.05,'sine',0,200);break;case'correct':tone(440,.4,0,.05);tone(660,.4,0,.04,'sine',.12);tone(880,.45,0,.03,'sine',.24);break;case'locked':
// Le pêne tente sa course puis frappe une butée, suivi d'un refus grave.
this.sweep(.18,.38,350,1050,.2);
this.texture(.065,.4,2300,.32,.14);
for(const hz of [173,461,727])tone(hz,.22,.38,.025,'triangle',.15,hz*.92);
this.texture(.08,.4,1100,.15,.28);
tone(92,.25,.35,.09,'triangle',.33,78);tone(138,.24,.35,.035,'sine',.33,117);
tone(92,.22,.35,.06,'triangle',.64,78);
break;case'unlock':this.effect('correct');this.texture(.55,.4,650,.16,.15);break;case'open':this.texture(1.8,.35,550,.25);this.texture(1.5,.25,2200,.11,.25);tone(75,1.8,.35,.055,'triangle',0,130);this.texture(3,0,320,.1,.8);break;case'noctis':case'fragment':tone(330,.8,0,.045);tone(495,.8,.1,.035,'sine',.18);tone(name==='fragment'?990:660,1,0,.035,'sine',.4);break;}}
 async visibility(){if(!this.ctx)return;if(document.hidden){this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.04);clearTimeout(this.suspendTimer);this.suspendTimer=setTimeout(()=>{if(document.hidden)this.ctx.suspend().catch(()=>{});},180);}else{clearTimeout(this.suspendTimer);if(this.enabled)try{await this.ctx.resume();this.level();}catch{}}}
}
