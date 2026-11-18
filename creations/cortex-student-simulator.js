/* CORTEX — simulateur professeur non publiant.
 * Même moteur de champs que l'élève, vrai chronomètre à partir de Démarrer,
 * aucune soumission, aucune note, aucun élève fictif persisté.
 */
window.CORTEX_STUDENT_SIMULATOR=(function(){
 'use strict';
 const Q=()=>window.CORTEX_QUESTION_TYPES;
 const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const create=(tag,cls='',txt)=>{const el=document.createElement(tag);el.className=cls;if(txt!==undefined)el.textContent=String(txt);return el;};
 const printClock=s=>{const n=Math.max(0,Math.ceil(s/1000));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
 const scopeName=x=>x==='g1'?'Groupe 1':x==='g2'?'Groupe 2':'Classe entière';
 let current=null;
 function open({exam,classe='Sans classe',scope='all',assets=[],subject=null}={}){
  if(!exam||!Array.isArray(exam.questions)||!exam.questions.length)throw Error('Ce contrôle ne contient aucune question à tester.');
  if(current)current.close();
  const d=create('dialog','cortex-sim-dialog');d.setAttribute('aria-label','Simulation du contrôle côté élève');
  const header=create('header','cortex-sim-header');
  const title=create('div');title.append(create('small','','CORTEX · APERÇU ÉLÈVE · AUCUNE DONNÉE ENVOYÉE'),create('h2','',exam.title||'Contrôle'));
  const exit=create('button','cortex-sim-exit','✕ Quitter le test');exit.type='button';header.append(title,exit);
  const body=create('div','cortex-sim-body'),footer=create('div','cortex-sim-footer');
  const end=()=>{d.close();};
  let index=0,startedAt=null,ended=false,timer=null,answers={},extraFile=null;
  const duration=Math.max(5,Math.min(240,Number(exam.duration)||60));
  const questions=exam.questions,assetMap=new Map(assets.filter(a=>a?.id).map(a=>[a.id,a]));
  const read=()=>{
   if(!startedAt||ended)return;
   const q=questions[index],wrapper=body.querySelector('[data-cortex-q]');
   if(wrapper)answers[q.id]=Q().readAnswer(wrapper,q);
  };
  const remain=()=>duration*60000-(startedAt?Date.now()-startedAt:0);
  function frame(){
   body.replaceChildren();footer.replaceChildren();
   if(!startedAt){
    body.append(create('p','cortex-sim-notice','Tu entres dans le contrôle comme un élève, sans QR code, PIN ni publication. Le chronomètre démarrera uniquement quand tu cliqueras sur « Démarrer le contrôle ».'));
    const overview=create('section','cortex-sim-overview');
    overview.append(create('strong','',classe+' · '+scopeName(scope)),create('p','',questions.length+' questions · '+duration+' minutes · '+questions.reduce((n,q)=>n+(Number(q.points)||0),0)+' points'));
    if(exam.description)overview.append(create('p','',exam.description));
    body.append(overview);
    const button=create('button','cortex-sim-main','▶ Démarrer le contrôle et le chrono');
    button.onclick=()=>{startedAt=Date.now();timer=setInterval(tick,250);frame();};footer.append(button);
    return;
   }
   const time=remain();if(time<=0){finish(true);return;}
   if(ended){body.append(create('h3','','Simulation terminée'),create('p','','Les réponses de cet essai n’ont été envoyées à personne et aucune copie réelle n’a été créée.'));return;}
   const status=create('div','cortex-sim-status'),clock=create('strong','cortex-sim-clock',printClock(time));
   clock.id='cortex-sim-clock';clock.setAttribute('role','timer');
   status.append(create('span','','QUESTION '+(index+1)+' / '+questions.length),clock);body.append(status);
   const q=questions[index],article=create('article','cortex-sim-question');
   article.append(create('div','cortex-sim-progress',questions.filter(x=>String(answers[x.id]||'').trim()).length+' réponse(s) sur '+questions.length),
    create('h3','',q.prompt||'Question '+(index+1)),create('small','',''+(Number(q.points)||0)+' point(s)'));
   const refs=(q.assetIds||[]).map(id=>assetMap.get(id)).filter(a=>a?.url);
   if(refs.length){
    const images=create('div','cortex-sim-docs');images.append(create('strong','','Documents fournis pour cette question'));
    for(const a of refs){const figure=create('figure'),img=create('img');img.src=a.url;img.alt='Document pédagogique : '+(a.name||'Capture');img.loading='eager';figure.append(img,create('figcaption','',a.name||'Document'));images.append(figure);}
    article.append(images);
   }
   if(q.doc)article.append(create('div','cortex-sim-doc-text',q.doc));
   if(q.page&&subject?.url){const link=create('a','cortex-sim-subject','▤ Consulter le sujet original · page '+q.page);link.href=subject.url;link.target='_blank';link.rel='noopener noreferrer';article.append(link);}
   const fields=create('div','cortex-sim-fields');
   fields.innerHTML=Q().studentFields(q,answers[q.id]||'');
   article.append(fields);
   const fileLabel=create('label','cortex-sim-file','Joindre un fichier (optionnel, simulation uniquement)');const file=create('input');file.type='file';file.accept='.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt';file.onchange=()=>{extraFile=file.files?.[0]?.name||null;};fileLabel.append(file);
   if(extraFile)fileLabel.append(create('small','','Fichier sélectionné précédemment : '+extraFile));
   article.append(fileLabel);body.append(article);
   const prev=create('button','cortex-sim-secondary','← Précédente');prev.disabled=index===0;prev.onclick=()=>{read();index--;frame();};
   const next=create('button','cortex-sim-main',index===questions.length-1?'Relire mes réponses →':'Suivante →');
   next.onclick=()=>{read();if(index<questions.length-1){index++;frame();}else review();};footer.append(prev,next);
  }
  function tick(){
   if(!startedAt||ended)return;
   if(remain()<=0){finish(true);return;}
   const clock=d.querySelector('#cortex-sim-clock');if(clock){clock.textContent=printClock(remain());clock.classList.toggle('cortex-sim-urgent',remain()<=300000);}
  }
  function review(){
   read();body.replaceChildren();footer.replaceChildren();
   body.append(create('h3','','Relire ma copie'),create('p','','Tu peux revenir sur les réponses avant la remise fictive.'));
   const ul=create('div','cortex-sim-review');
   for(let i=0;i<questions.length;i++){const b=create('button','cortex-sim-review-row','Question '+(i+1)+' · '+(String(answers[questions[i].id]||'').trim()?'Réponse saisie':'Sans réponse'));b.onclick=()=>{index=i;frame();};ul.append(b)}
   body.append(ul);
   const back=create('button','cortex-sim-secondary','← Retour aux questions');back.onclick=frame;
   const send=create('button','cortex-sim-main','✓ Simuler la remise de ma copie');send.onclick=()=>finish(false);
   footer.append(back,send);
  }
  function finish(timeout){
   if(ended)return;
   read();ended=true;clearInterval(timer);timer=null;
   body.replaceChildren();footer.replaceChildren();
   body.append(create('h3','',timeout?'⏱ Temps écoulé':'✓ Remise simulée'),
    create('p','','Tu as répondu à '+questions.filter(q=>String(answers[q.id]||'').trim()).length+' question(s) sur '+questions.length+'. Aucune réponse, note ou copie n’a été enregistrée sur le serveur ni envoyée au professeur.'));
   const again=create('button','cortex-sim-secondary','↻ Recommencer');again.onclick=()=>{index=0;startedAt=null;ended=false;answers={};extraFile=null;frame();};
   const back=create('button','cortex-sim-main','Retour à Mes contrôles');back.onclick=end;footer.append(again,back);
  }
  const close=()=>{clearInterval(timer);timer=null;current=null;d.remove();};
  exit.onclick=()=>{if(startedAt&&!ended&&!confirm('Quitter la simulation ? Les réponses fictives de cet essai seront perdues.'))return;end();};
  d.addEventListener('close',close,{once:true});
  d.append(header,body,footer);document.body.append(d);d.showModal();current={close:end};frame();
  return d;
 }
 return {open};
})();