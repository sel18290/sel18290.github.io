// Optional host for standalone games; never instantiated by legacy NOCTIS.
export class BrowserAudioHost {
 constructor(){this.enabled=false;this.volume=.3;}
 async enable(value){this.enabled=value;if(!this.ctx&&value){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);}if(this.ctx){this.master.gain.value=value?this.volume:0;if(value)await this.ctx.resume();}}
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));if(this.master)this.master.gain.value=this.enabled?this.volume:0;}
 tone(frequency,duration=.4,delay=0){if(!this.enabled||!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.value=frequency;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.03,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(this.master);o.start(t);o.stop(t+duration);o.onended=()=>{o.disconnect();g.disconnect();};return o;}
 dispose(){return this.ctx?.close();}
}
