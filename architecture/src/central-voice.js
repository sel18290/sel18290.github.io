export const CENTRAL_LINES=Object.freeze([
 'Alerte.',
 'Anomalie détectée.',
 'Sujet non autorisé dans le secteur N6.',
 'Procédure de réalimentation engagée.'
]);
export const CENTRAL_DIALOGUE=CENTRAL_LINES.join(' ');
export function frenchVoice(voices=[]){
 return voices.filter(v=>/^fr(?:[-_]|$)/i.test(v.lang)).sort((a,b)=>{
  const score=v=>Number(!!v.localService)*10+Number(/^fr[-_]FR$/i.test(v.lang))*2+Number(!!v.default);
  return score(b)-score(a);
 })[0]||null;
}

// Browser speech cannot be routed through Web Audio. Cold prosody is supplied by
// the speech engine; separate filtered electronic tones frame the communication.
export function robotSpeech({speech=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext,onCaption=()=>{},onState=()=>{},schedule=setTimeout,unschedule=clearTimeout}={}){
 let context=null,requested=false,started=false,owned=false,disposed=false,index=0,token=0,timer=null,state='ready',currentUtterance=null;
 const nodes=new Set();
 const report=value=>{state=value;onState(value);};
 const clearTimer=()=>{if(timer!==null){unschedule(timer);timer=null;}};
 function tone(end=false){
  if(!context||context.state!=='running')return;
  try{
   const oscillator=context.createOscillator(),filter=context.createBiquadFilter(),gain=context.createGain();
   oscillator.type='square';oscillator.frequency.setValueAtTime(end?740:1180,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(end?540:940,context.currentTime+.09);
   filter.type='bandpass';filter.frequency.value=1150;filter.Q.value=1.8;
   gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.exponentialRampToValueAtTime(.018,context.currentTime+.012);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.12);
   oscillator.connect(filter);filter.connect(gain);gain.connect(context.destination);nodes.add(oscillator);
   oscillator.onended=()=>{nodes.delete(oscillator);oscillator.disconnect();filter.disconnect();gain.disconnect();};oscillator.start();oscillator.stop(context.currentTime+.13);
  }catch{} // Optional framing must never stop narration or gameplay.
 }
 function failure(error){
  clearTimer();owned=false;currentUtterance=null;token++;
  if(!started&&['not-allowed','audio-busy','synthesis-unavailable','voice-unavailable','language-unavailable'].includes(error)){onCaption(CENTRAL_DIALOGUE);report('blocked');}
  else{onCaption(CENTRAL_DIALOGUE);report('unavailable');}
 }
 function next(){
  if(disposed)return;
  if(index>=CENTRAL_LINES.length){owned=false;onCaption('');report('finished');return;}
  const current=++token,utterance=new Utterance(CENTRAL_LINES[index]);currentUtterance=utterance;
  let voices=[];try{voices=speech.getVoices?.()||[];}catch{}
  utterance.lang='fr-FR';utterance.voice=frenchVoice(voices);utterance.pitch=.55;utterance.rate=.84;utterance.volume=.85;
  utterance.onstart=()=>{if(disposed||current!==token||currentUtterance!==utterance)return;started=true;report('speaking');onCaption(CENTRAL_LINES[index]);tone();};
  utterance.onend=()=>{if(disposed||current!==token)return;clearTimer();currentUtterance=null;tone(true);onCaption('');index++;next();};
  utterance.onerror=e=>{if(disposed||current!==token)return;failure(e.error||'synthesis-failed');};
  owned=true;clearTimer();timer=schedule(()=>{if(disposed||current!==token)return;token++;owned=false;speech.cancel();onCaption(CENTRAL_DIALOGUE);report('unavailable');},45000);
  try{speech.speak(utterance);}catch{failure('synthesis-unavailable');}
 }
 return {
  get state(){return state;},get started(){return started;},
  unlock(){
   if(disposed)return;
   try{if(AudioContext&&!context)context=new AudioContext();context?.resume()?.catch(()=>{});}catch{}
   // Query on a user gesture so asynchronous platform voice discovery can begin.
   try{speech?.getVoices?.();}catch{}
  },
  play(){
   if(disposed||requested)return;requested=true;report('queued');
   if(!speech||!Utterance){onCaption(CENTRAL_DIALOGUE);report('unavailable');return;}
   next();
  },
  retry(){if(disposed||state!=='blocked'||started)return;report('queued');index=0;next();},
  cancel(){
   token++;currentUtterance=null;clearTimer();if(owned){owned=false;speech?.cancel();}for(const node of nodes){try{node.stop();}catch{}}nodes.clear();onCaption('');
   if(requested)report('cancelled');
  },
  dispose(){if(disposed)return;this.cancel();disposed=true;context?.close()?.catch(()=>{});context=null;}
 };
}
