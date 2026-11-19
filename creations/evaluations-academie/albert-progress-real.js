/* CORTEX Académie — fenêtre de traitement Albert, commune aux copies réelles.
 * Même identité visuelle que l'analyse du mode Test. Progression honnête :
 * état + temps écoulé, aucun pourcentage inventé.
 */
const element=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
export function openAlbertProgress({
 title='Albert IA analyse ta demande',
 description='Albert travaille sur les documents et les réponses enregistrés.',
 initial='Connexion sécurisée à Albert…'
}={}){
 const previous=document.querySelector('dialog.cortex-albert-progress.cortex-real-albert');
 if(previous?.open)previous.close();
 const dialog=element('dialog','cortex-albert-progress cortex-real-albert');
 dialog.setAttribute('aria-label',title);
 dialog.setAttribute('aria-modal','true');
 const inside=element('div','cai-progress-inner');
 const heading=element('h2','','✦ '+title);
 const info=element('p','cai-sub',description);
 const animation=element('div','cai-animation');
 animation.setAttribute('aria-hidden','true');
 for(let i=0;i<3;i++)animation.append(element('span'));
 const track=element('div','cai-track cai-indeterminate');
 track.setAttribute('role','progressbar');
 track.setAttribute('aria-label','Analyse Albert en cours');
 track.setAttribute('aria-valuetext','Analyse en cours, durée indéterminée');
 const bar=element('div','cai-bar');
 track.append(bar);
 const status=element('p','cai-status',initial);
 status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 const counter=element('p','cai-count','Demande transmise au service sécurisé…');
 const footer=element('div','cai-footer');
 const stop=element('button','cai-cancel','Annuler la demande');
 const close=element('button','cai-done','Fermer');
 stop.type='button';close.type='button';close.hidden=true;
 const controller=new AbortController();
 let finished=false,removed=false;
 const started=Date.now();
 const interval=setInterval(()=>{
  if(finished||removed)return;
  const seconds=Math.max(0,Math.floor((Date.now()-started)/1000));
  counter.textContent='Albert travaille · '+seconds+' s écoulées';
 },1000);
 const cleanup=()=>{
  clearInterval(interval);
  if(removed)return;
  removed=true;
  if(!finished&&!controller.signal.aborted)controller.abort();
  dialog.remove();
 };
 const closeDialog=()=>{if(dialog.open)dialog.close();else cleanup()};
 stop.addEventListener('click',()=>{controller.abort();closeDialog()});
 close.addEventListener('click',closeDialog);
 dialog.addEventListener('close',cleanup,{once:true});
 dialog.addEventListener('cancel',()=>{
  if(!finished&&!controller.signal.aborted)controller.abort();
 });
 footer.append(stop,close);
 inside.append(heading,info,animation,track,status,counter,footer);
 dialog.append(inside);document.body.append(dialog);
 try{dialog.showModal()}catch{dialog.setAttribute('open','')}
 function finish(ok,message,label){
  if(removed||controller.signal.aborted)return;
  finished=true;clearInterval(interval);
  status.textContent=(ok?'✓ ':'⚠ ')+String(message||'Analyse terminée.');
  counter.textContent=ok?'Terminé · vérifie les résultats avant toute validation':'Aucun résultat enregistré automatiquement';
  animation.classList.add(ok?'cai-finished':'cai-error');
  track.classList.remove('cai-indeterminate');
  track.removeAttribute('aria-valuetext');
  if(ok){bar.style.width='100%';track.setAttribute('aria-valuenow','100')}
  else{bar.style.width='0%';track.removeAttribute('aria-valuenow')}
  stop.hidden=true;close.hidden=false;close.textContent=label||(ok?'Voir le résultat':'Fermer');
  close.focus({preventScroll:true});
 }
 return {
  signal:controller.signal,
  update(message){if(!finished&&!removed&&!controller.signal.aborted)status.textContent=String(message)},
  success(message,label){finish(true,message,label)},
  failure(message,label){finish(false,message,label)},
  close:closeDialog,
  get cancelled(){return controller.signal.aborted}
 };
}
