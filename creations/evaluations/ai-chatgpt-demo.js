/* CORTEX : copie fictive -> ChatGPT ; aucune donnée envoyée automatiquement. */
(function(){
'use strict';
const STORE='cortex-evaluations-demo-2026-v3';
const style=document.createElement('style');
style.textContent=[
'#cortex-chatgpt-modal{box-sizing:border-box;background:#07182d;color:#edf6ff;border:1px solid #91b2ed;border-radius:18px;padding:20px;width:min(690px,calc(100vw - 24px));max-height:90dvh;overflow:auto;box-shadow:0 25px 70px #000b}',
'#cortex-chatgpt-modal::backdrop{background:rgba(0,4,17,.85);backdrop-filter:blur(5px)}',
'#cortex-chatgpt-modal textarea{box-sizing:border-box;width:100%;min-height:180px;max-height:38dvh;background:#0e2744;color:#fff;padding:12px;border:1px solid #789cca;border-radius:11px;font-size:13px}',
'#cortex-chatgpt-modal .ai-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;justify-content:flex-end}',
'#cortex-chatgpt-modal .ai-actions button{border:1px solid #91b2ed;border-radius:10px;padding:12px 15px;cursor:pointer}',
'#cortex-chatgpt-modal .ai-actions button:disabled{opacity:.4;cursor:not-allowed}',
'#cortex-chatgpt-modal .ai-open{background:#dbe8ff;color:#09244e;font-weight:750}',
'#cortex-chatgpt-modal .ai-close{background:transparent;color:#fff}',
'#cortex-chatgpt-modal label{display:flex;gap:9px;margin-top:12px;line-height:1.4}'
].join('\n');
document.head.append(style);
function createPrompt(id){
 let state;try{state=JSON.parse(localStorage.getItem(STORE)||'{}')}catch{throw Error('Sauvegarde de démonstration inaccessible.')}
 const copy=(state.attempts||[]).find(a=>String(a.id)===String(id));
 const exam=(state.exams||[]).find(e=>e.id===copy?.examId);
 if(!copy||!exam)throw Error('Copie de démonstration introuvable.');
 const questions=(exam.questions||[]).map((q,i)=>{
  let value=String(copy.answers?.[q.id]??'');
  if(q.type==='choice'&&Array.isArray(q.choices)){
   const idx=Number(value);
   if(Number.isInteger(idx)&&q.choices[idx])value=String(q.choices[idx]);
  }
  const corriged=q.type==='choice'&&Array.isArray(q.choices)&&Number.isInteger(Number(q.correct))?'\nRéponse du QCM attendue : '+String(q.choices[Number(q.correct)]||'?'):'';
  return String(i+1)+'. '+String(q.prompt||'')+' ('+String(q.points||0)+' point(s))'+corriged+'\nRéponse fictive : '+(value||'[aucune réponse]');
 }).join('\n\n');
 return 'Tu aides un professeur à corriger un contrôle fictif de PSE (lycée professionnel).\n'+
 'Pour chaque question, propose des points sur le maximum prévu, une justification et une piste de progrès. Calcule la note totale ramenée sur 20 et une appréciation pédagogique.\n'+
 'Reste nuancé et indique si les documents sources ou le corrigé manquent. Ces propositions seront vérifiées et validées par le professeur.\n'+
 'Aucune donnée réelle d’élève ne figure dans cette demande.\n\n'+
 'Titre : '+String(exam.title||'PSE')+'\nConsignes : '+String(exam.description||'non précisées')+
 '\n\nQUESTIONS ET RÉPONSES FICTIVES :\n'+questions+
 '\n\nSi un document PDF de référence manque, demande-moi de le joindre avant de conclure.';
}
function showDialog(id){
 const prompt=createPrompt(id);
 document.getElementById('cortex-chatgpt-modal')?.remove();
 const dialog=document.createElement('dialog');dialog.id='cortex-chatgpt-modal';
 const h=document.createElement('h2');h.textContent='✦ Corriger avec ChatGPT · Démonstration';
 const p=document.createElement('p');p.textContent='Prépare une demande pour ChatGPT avec cette copie fictive. Le transfert dans ChatGPT est manuel ; aucune note n’est inscrite automatiquement dans CORTEX.';
 const area=document.createElement('textarea');area.value=prompt;area.readOnly=true;area.setAttribute('aria-label','Texte de la demande ChatGPT');
 const label=document.createElement('label');
 const check=document.createElement('input');check.type='checkbox';
 label.append(check,document.createTextNode('Je confirme que les réponses sont fictives et qu’aucune donnée personnelle d’élève n’est transmise.'));
 const actions=document.createElement('div');actions.className='ai-actions';
 const close=document.createElement('button');close.type='button';close.className='ai-close';close.textContent='Fermer';
 close.onclick=()=>dialog.close();
 const open=document.createElement('button');open.type='button';open.className='ai-open';open.textContent='Copier et ouvrir ChatGPT';open.disabled=true;
 check.onchange=()=>{open.disabled=!check.checked};
 open.onclick=()=>{
  const tab=window.open('https://chatgpt.com/','_blank','noopener,noreferrer');
  function fallback(){area.focus();area.select();try{document.execCommand('copy')}catch{}}
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(area.value).catch(fallback);else fallback();
  open.textContent=tab?'✓ ChatGPT ouvert · collez le texte':'✓ Texte prêt · ouvrez ChatGPT';
 };
 actions.append(close,open);dialog.append(h,p,area,label,actions);
 document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}
document.addEventListener('click',event=>{
 const b=event.target.closest?.('[data-action="ai-chatgpt-copy"]');
 if(!b)return;
 event.preventDefault();event.stopImmediatePropagation();
 try{showDialog(b.dataset.id)}catch(err){window.alert(err?.message||'Copie indisponible.')}
},true);
})();
