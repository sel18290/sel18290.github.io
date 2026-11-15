import { playUnknownSignal } from './unknown-signal.js';
// N02 routing uses the existing master, mute/volume and object event paths.
export function installN02Audio(sound,voice){
 const inRoom=()=>document.body.classList.contains('room-two')&&!document.body.classList.contains('room-three');
 const original=sound.effect.bind(sound);
 sound.effect=function(kind){if(!inRoom())return original(kind);if(!sound.enabled||!sound.ready||document.hidden)return;
 const t=(f,d,a,delay=0,end=f)=>sound.tone(f,d,0,a,'sine',delay,end);
 if(kind==='clock'){t(1318,.16,.025);t(1975,.22,.012,.08);return;}
 if(kind==='correct'){[523.25,659.25,783.99].forEach((f,i)=>t(f,.45,.025,i*.11));return;}
 if(kind==='fragment'){original(kind);t(1320,1,.012,.65);return;}
 if(kind==='computer'){original(kind);t(1760,.3,.009,.18,1320);return;}
 return original(kind);
 };
 let last=document.body.dataset.lightingState,stopSignal=()=>{};
 const observer=new MutationObserver(()=>{const now=document.body.dataset.lightingState;if(inRoom()&&now!==last){if(now==='reverted'){stopSignal();stopSignal=playUnknownSignal(sound,{level:.3});}else if(now==='preview'||now==='repaired'){sound.tone(440,.55,0,.015,'sine',0,660);}}last=now;if(!inRoom()||document.hidden)stopSignal();});observer.observe(document.body,{attributes:true,attributeFilter:['class','data-lighting-state']});
 const onVisibility=()=>{if(document.hidden)stopSignal();};document.addEventListener('visibilitychange',onVisibility);
 window.addEventListener('pagehide',()=>{observer.disconnect();stopSignal();document.removeEventListener('visibilitychange',onVisibility);},{once:true});
}
