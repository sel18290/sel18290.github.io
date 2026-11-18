/* CORTEX Démonstration — Albert API, uniquement la copie de référence fictive.
   La clé Albert reste dans les secrets de Supabase. Le navigateur ne transmet
   aucun texte de copie : seulement action + identifiant de démonstration. */
(function(){
 'use strict';
 const ROOT_ID='cortex-albert-demo-dialog',COPY_ID='ex-pdf-demo';
 const style=document.createElement('style');
 style.textContent=[
  '#'+ROOT_ID+'{box-sizing:border-box;background:#07182d;color:#edf6ff;border:1px solid #91b2ed;border-radius:18px;padding:20px;width:min(850px,calc(100vw - 20px));max-height:92dvh;overflow:auto;box-shadow:0 30px 90px #000b}',
  '#'+ROOT_ID+'::backdrop{background:#000b;backdrop-filter:blur(7px)}',
  '#'+ROOT_ID+' .alb-toolbar{display:flex;gap:9px;justify-content:flex-end;flex-wrap:wrap;position:sticky;top:-20px;background:#07182d;padding:8px 0;z-index:1}',
  '#'+ROOT_ID+' button{background:#dce9ff;color:#112650;border:1px solid #779ce2;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}',
  '#'+ROOT_ID+' button.alb-alt{background:#0c2a4e;color:#fff}',
  '#'+ROOT_ID+' button:disabled{opacity:.55;cursor:wait}',
  '#'+ROOT_ID+' .alb-notice{background:#133659;border-left:3px solid #8fb9ff;border-radius:8px;padding:12px;margin:14px 0;line-height:1.55}',
  '#'+ROOT_ID+' .alb-status{font-weight:650;margin:12px 0;white-space:pre-wrap}',
  '#'+ROOT_ID+' .alb-overall{font-size:1.35rem;font-weight:800;margin:14px 0}',
  '#'+ROOT_ID+' .alb-copy-summary{color:#cfdef4;font-size:.9rem}',
  '#'+ROOT_ID+' details{border:1px solid #5578a8;border-radius:12px;margin:9px 0;padding:11px;background:#0b2440}',
  '#'+ROOT_ID+' summary{font-weight:750;cursor:pointer;line-height:1.55}',
  '#'+ROOT_ID+' .alb-answer{white-space:pre-wrap;overflow-wrap:anywhere;background:#071a31;border-radius:8px;padding:8px 11px}',
  '#'+ROOT_ID+' p{line-height:1.55;margin:10px 0;overflow-wrap:anywhere}',
  '#'+ROOT_ID+' a{color:#b7d5ff;text-decoration:underline}',
  '@media(max-width:640px){#'+ROOT_ID+'{padding:14px}#'+ROOT_ID+' .alb-toolbar{top:-14px;flex-direction:column}#'+ROOT_ID+' button{width:100%}}'
 ].join('\n');
 document.head.append(style);
 const add=(tag,text,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el};
 let currentResult=null;
 function show(){
  document.getElementById(ROOT_ID)?.remove();
  const dialog=add('dialog');dialog.id=ROOT_ID;
  dialog.setAttribute('aria-label','Tester la correction Albert IA sur la copie fictive');
  const toolbar=add('div',undefined,'alb-toolbar');
  const close=add('button','Fermer','alb-alt');close.type='button';close.addEventListener('click',()=>dialog.close());
  const retry=add('button','✦ Lancer Albert IA');retry.type='button';
  toolbar.append(close,retry);
  const title=add('h2','✦ Albert IA · Correction de la copie test');
  const notice=add('div','Test public, sans connexion : correction du contrôle fictif PSE Sommeil (20 questions). Les réponses et les documents de référence sont déjà fournis côté serveur. Aucune vraie copie ni note officielle n’est transmise. Pour protéger le service, le nombre de tests est limité.','alb-notice');
  const status=add('p','', 'alb-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const results=add('div');results.id='alb-demo-results';
  dialog.append(toolbar,title,notice,status,results);
  document.body.append(dialog);
  dialog.addEventListener('close',()=>{dialog.remove();currentResult=null},{once:true});
  dialog.showModal();
  async function run(){
   currentResult=null;results.replaceChildren();retry.disabled=true;
   retry.textContent='Albert corrige la copie…';
   status.textContent='Albert analyse la copie fictive depuis Supabase…';
   try{
    // Seul l'identifiant d'une copie fictive prédéfinie est envoyé.
    // Supabase détient le secret Albert et limite les appels anonymes.
    const {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}=await import('../evaluations-academie/config.js?v=1');
    const response=await fetch(SUPABASE_URL+'/functions/v1/cortex-albert-demo',{
     method:'POST',cache:'no-store',
     headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY},
     body:JSON.stringify({action:'demo_draft',copy_id:COPY_ID})
    });
    const out=await response.json().catch(()=>null);
    if(!response.ok||!out?.ok)throw new Error(out?.error||'Correction Albert indisponible (HTTP '+response.status+').');
    if(!Array.isArray(out.questions)||out.questions.length!==20||out.copyId!==COPY_ID)
      throw new Error('Albert n’a pas renvoyé les 20 questions de la copie test.');
    currentResult=out;
    status.textContent='✓ Albert a corrigé les 20 réponses fictives. Résultat : '+out.grade+' / 20 — brouillon à vérifier.';
    renderResult(out);
   }catch(error){
    status.textContent='✕ '+String(error?.message||error);
   }finally{retry.disabled=false;retry.textContent='↻ Relancer le test Albert';}
  }
  function renderResult(out){
   const total=add('div','Note proposée : '+out.grade+' / 20','alb-overall');
   const info=add('p','Brouillon IA non publié. Tu peux vérifier chaque réponse puis reporter les points dans la copie fictive.','alb-copy-summary');
   const apply=add('button','✓ Reporter les corrections dans la démo');
   apply.type='button';apply.addEventListener('click',()=>{
    if(!currentResult)return;
    if(!window.confirm('Reporter les points et commentaires dans la copie fictive locale ? Rien ne sera envoyé à l’espace réel.'))return;
    const evt=new CustomEvent('cortex:demo-albert-apply',{detail:currentResult});
    window.dispatchEvent(evt);
    if(!evt.detail.applied){status.textContent='Les corrections ne sont pas reportées : la copie locale ne correspond plus à la copie fictive de référence.';return;}
    status.textContent='Corrections reportées dans la copie fictive locale, sans publication.';
    dialog.close();
   });
   results.append(total,info,apply);
   for(const q of out.questions){
    const panel=add('details');
    const heading=add('summary','Question '+q.numero+' — '+q.points+' / '+q.max+' pt · '+q.question);
    const answer=add('p','Réponse de la copie test : '+(q.reponse||'[aucune réponse]'),'alb-answer');
    const expected=add('p','Réponse attendue : '+(q.attendu||'À vérifier.'));
    const feedback=add('p','Commentaire individuel : '+(q.commentaire||'—'));
    const advice=add('p','Conseil pour progresser : '+(q.conseil||'—'));
    const source=add('p','Document utilisé : '+(q.document||'À vérifier.'),'alb-copy-summary');
    panel.append(heading,answer,expected,feedback,advice,source);
    results.append(panel);
   }
   results.append(add('p',out.warning||'Vérification du professeur obligatoire.','alb-notice'));
  }
  retry.addEventListener('click',run);
  run();
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-action="ai-albert-demo"]');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(button.dataset.id!==COPY_ID)return;
  show();
 },true);
})();
