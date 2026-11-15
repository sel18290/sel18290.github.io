// Identité originale ORBI-7 : brèves phrases FM, pas de voix humaine ni d'échantillons.
export class OrbiVoice {
 constructor(sound){this.sound=sound;this.notes=[];this.variant=0;}
 stop(){const c=this.sound.ctx;for(const n of this.notes){try{n.gain.gain.cancelScheduledValues(c.currentTime);n.gain.gain.setTargetAtTime(0,c.currentTime,.008);n.osc.stop(c.currentTime+.035);n.mod.stop(c.currentTime+.035);}catch{}}this.notes=[];}
 say(mood='curious'){
  this.stop();const s=this.sound;if(!s.enabled||!s.ready||document.hidden)return;
  const patterns={greeting:[[520,690],[700,900],[870,800]],question:[[460,520],[570,850],[720,1060]],hint:[[610,490],[470,650],[620,720]],wrong:[[520,430],[410,620]],correct:[[520,650],[650,780],[780,1040]],praise:[[520,780],[780,1040],[1040,1170],[880,1040]],curious:[[550,710],[720,530],[540,680]]};
  const pattern=patterns[mood]||patterns.curious,c=s.ctx,variation=this.variant++%3;
  const shift=[1,.94,1.06][variation];
  pattern.forEach(([from,to],i)=>{
   const t=c.currentTime+i*.15,d=.16+(i%2)*.05,o=c.createOscillator(),m=c.createOscillator(),mg=c.createGain(),g=c.createGain(),pan=c.createStereoPanner();
   o.type=variation===1?'triangle':'sine';o.frequency.setValueAtTime(from*shift,t);o.frequency.exponentialRampToValueAtTime(to*shift,t+d);
   m.frequency.value=22+variation*9;mg.gain.value=12+(i%2)*14;m.connect(mg).connect(o.frequency);
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.045,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);
   pan.pan.value=.23;o.connect(g).connect(pan).connect(s.master);o.start(t);m.start(t);o.stop(t+d+.02);m.stop(t+d+.02);
   const note={osc:o,mod:m,gain:g};this.notes.push(note);
   o.onended=()=>{o.disconnect();m.disconnect();mg.disconnect();g.disconnect();pan.disconnect();this.notes=this.notes.filter(n=>n!==note);};
  });
 }
}
