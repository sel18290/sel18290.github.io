import {resynchronize} from '../resync.js';
// Preserve the N03 arrival sequence before handing the restored perception to the 3D scene.
export function createLaboratory({prepare,sound,voice,getName}){
 let active=false;
 async function enter(){
  if(active)return;active=true;prepare();
  await resynchronize(sound,matchMedia('(prefers-reduced-motion:reduce)').matches,2);
  const dialog=document.createElement('dialog');dialog.className='fusion-reconfiguration';
  const heading=document.createElement('h2');heading.textContent='ORBI-7 / LIAISON CORTEX';
  const text=document.createElement('p'),next=document.createElement('button');
  dialog.append(heading,text,next);document.body.append(dialog);dialog.showModal();
  let line=0;
  const lines=[
   `${getName()?getName()+'… ':''}Attends ! Quelque chose vient de changer dans CORTEX !`,
   'Les deux fragments que nous avons récupérés viennent de restaurer une partie du système.',
   'Jusqu’à présent, je ne pouvais restituer que des scènes stabilisées.',
   'Mais maintenant… je perçois tellement plus ! CORTEX nous ouvre de nouvelles possibilités !',
   'Pour accéder à cette nouvelle perception, nous devons recalibrer ton terminal.'
  ];
  function render(){text.textContent=lines[line];next.textContent=line===4?'Recalibrer mon terminal →':'Continuer →';voice.say('curious')}
  render();
  next.onclick=async()=>{
   voice.stop();
   if(line<4){line++;render();return}
   next.disabled=true;next.hidden=true;
   heading.textContent='CORTEX — RESTAURATION SENSORIELLE';
   text.textContent='FRAGMENTS NOCTIS : 2/9 · MODULE RESTAURÉ : PERCEPTION DE PROFONDEUR';
   const meter=document.createElement('progress');meter.max=100;meter.value=0;dialog.append(meter);
   const start=performance.now();
   await new Promise(resolve=>{const timer=setInterval(()=>{meter.value=Math.min(100,(performance.now()-start)/24);if(meter.value===100){clearInterval(timer);resolve()}},40)});
   text.textContent=`${getName()?getName()+', les':'Les'} données de ce laboratoire ont été perturbées. Cet analyseur devait nous permettre de comprendre les différentes phases de ton sommeil. Tu dois comprendre comment ton cerveau fonctionne pendant le sommeil.`;
   heading.textContent='ORBI-7 — PERCEPTION DE PROFONDEUR ACTIVÉE';
   next.hidden=false;next.disabled=false;next.textContent='Continuer →';
   next.onclick=()=>{voice.stop();dialog.close();dialog.remove();parent.postMessage({type:'fusion:passage'},location.origin)};
   voice.say('curious');next.focus();
  };
  dialog.addEventListener('cancel',e=>e.preventDefault());
 }
 return {enter,replayEntrance:enter,exit(){active=false},canResume(){return false}};
}
