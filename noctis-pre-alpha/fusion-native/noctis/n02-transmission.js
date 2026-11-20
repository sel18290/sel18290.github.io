import { playUnknownSignal } from './audio/unknown-signal.js';
export const transmissionKey='noctis.n02.transmission.v1';
let played=false;
export function resetTransmission(){played=false;try{localStorage.removeItem(transmissionKey);}catch{}}
export function interceptTransmission(sound,reduced=false,force=false){
 if(played&&!force)return Promise.resolve();try{if(localStorage.getItem(transmissionKey)&&!force)return Promise.resolve();localStorage.setItem(transmissionKey,'seen');}catch{}played=true;
 return new Promise(resolve=>{
 const previous=document.activeElement,d=document.createElement('dialog');d.className='n02-interception';d.setAttribute('aria-label','Transmission inconnue');d.innerHTML='<div class="intercept-noise" aria-hidden="true"></div><div class="intercept-frame"><small>CORTEX // LIAISON INTERROMPUE</small><h2 aria-live="polite">TRANSMISSION INCONNUE</h2><div class="intercept-lines" aria-hidden="true"></div></div>';
 document.body.append(d);d.showModal();let stop=()=>{},timers=[];let finished=false;
 function finish(){if(finished)return;finished=true;timers.forEach(clearTimeout);stop();document.removeEventListener('visibilitychange',visibility);d.close();d.remove();if(previous?.isConnected)previous.focus({preventScroll:true});resolve();}
 function visibility(){if(document.hidden)stop();}document.addEventListener('visibilitychange',visibility);
 d.addEventListener('cancel',e=>{e.preventDefault();finish();});
 const later=(fn,t)=>timers.push(setTimeout(fn,t));
 later(()=>{stop=playUnknownSignal(sound,{level:.55});d.querySelector('h2').textContent='SIGNAL NON IDENTIFIÉ';},900);
 later(()=>{stop();stop=playUnknownSignal(sound,{level:.8});d.classList.add('intercept-warning');d.querySelector('h2').textContent='ARRÊTEZ !';},1800);
 later(()=>{d.classList.remove('intercept-warning');d.querySelector('h2').textContent='';d.classList.add('intercept-cut');},3800);
 later(finish,4300);if(reduced)d.classList.add('intercept-reduced');
 });
}
