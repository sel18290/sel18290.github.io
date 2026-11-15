// Signature originale partagée. Aucun échantillon, aucune variation aléatoire.
// Même contour de 360 ms pour toutes les utilisations ; seul le niveau varie.
export function playUnknownSignal(sound,{level=.6,delay=0}={}){
 if(!sound.enabled||!sound.ready||!sound.ctx||sound.ctx.state!=='running'||document.hidden)return ()=>{};
 const c=sound.ctx,t=c.currentTime+Math.max(0,delay),duration=.36;
 const bus=c.createGain(),low=c.createOscillator(),metal=c.createOscillator();
 const mod=c.createOscillator(),depth=c.createGain(),noise=c.createBufferSource();
 const filter=c.createBiquadFilter(),hiss=c.createGain(),body=c.createGain(),ring=c.createGain();
 const nodes=[bus,low,metal,mod,depth,noise,filter,hiss,body,ring];
 bus.gain.value=Math.max(0,Math.min(1,level));bus.connect(sound.master);
 function envelope(g,amp,end=duration){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(amp,t+.012);g.gain.exponentialRampToValueAtTime(.00001,t+end-.008);g.gain.linearRampToValueAtTime(0,t+end);}
 low.type='triangle';low.frequency.setValueAtTime(172,t);low.frequency.exponentialRampToValueAtTime(64,t+.29);envelope(body,.055);
 metal.type='sine';metal.frequency.setValueAtTime(461,t);metal.frequency.exponentialRampToValueAtTime(178,t+.31);envelope(ring,.014);
 mod.frequency.setValueAtTime(24,t);mod.frequency.linearRampToValueAtTime(11,t+.3);depth.gain.value=5;
 mod.connect(depth).connect(low.frequency);low.connect(body).connect(bus);metal.connect(ring).connect(bus);
 const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
 let seed=7319;for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*((Math.floor(i/(c.sampleRate*.018))%3)?1:.22);}
 noise.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(1450,t);filter.frequency.exponentialRampToValueAtTime(620,t+.3);filter.Q.value=1.7;envelope(hiss,.011,.30);noise.connect(filter).connect(hiss).connect(bus);
 let disposed=false;const sources=[low,metal,mod,noise];
 function dispose(){if(disposed)return;disposed=true;for(const node of nodes)try{node.disconnect();}catch{}}
 noise.onended=dispose;
 for(const source of sources){source.start(t);source.stop(t+duration);}
 return ()=>{if(disposed)return;for(const source of sources)try{source.stop();}catch{}dispose();};
}
