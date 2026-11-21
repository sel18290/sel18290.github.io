/* CORTEX · Filigrane dans les fenêtres modales des évaluations.
   Les <dialog> natifs occupent la top layer, au-dessus des calques ordinaires :
   une copie du filigrane doit vivre à l'intérieur de chaque dialogue actif. */
(()=>{
 'use strict';
 const query='.integrity-watermark:not(.cortex-watermark-dialog),.cw-student-watermark:not(.cortex-watermark-dialog):not(.cw-watermark-dialog)';
 const modalMark='.cortex-watermark-dialog,.cw-watermark-dialog';
 let scheduled=false;
 function synchronize(){
  scheduled=false;
  const original=document.querySelector(query);
  for(const dialog of document.querySelectorAll('dialog[open]')){
   const copy=dialog.querySelector(':scope > '+modalMark.replaceAll(',',',:scope > '));
   if(!original){
    // Aucun contrôle protégé actif : ne pas laisser un filigrane périmé.
    for(const old of dialog.querySelectorAll(':scope > .cortex-watermark-dialog'))old.remove();
    continue;
   }
   if(copy)continue;
   const mark=original.cloneNode(true);
   mark.removeAttribute('id');
   mark.classList.add('cortex-watermark-dialog');
   mark.setAttribute('aria-hidden','true');
   dialog.append(mark);
  }
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(synchronize);
 }
 // Le rendu des contrôles et les fenêtres sources sont créés dynamiquement.
 const observer=new MutationObserver(schedule);
 observer.observe(document.documentElement,{
  childList:true,subtree:true,attributes:true,attributeFilter:['open']
 });
 schedule();
 window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();
