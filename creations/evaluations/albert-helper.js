/* CORTEX DEMO — Albert : personnage d'aide, signalements, estimation et révisions.
   Tous les échanges Albert du carnet utilisent des données fictives fixes côté Supabase.
   Le navigateur ne transmet aucune réponse ni note d'élève. */
(function(){
 'use strict';
 const GUIDE='cortex-albert-guide',GRADE='cortex-albert-demo',PENDING='exemple-attente-albert';
 const $=(id)=>document.getElementById(id);
 const short=(s,n)=>String(s||'').slice(0,n);
 const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={tips:null,estimate:null,estimateLoading:false,tipsLoading:false};
 async function endpoint(slug,data){
  const {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}=await import('../evaluations-academie/config.js?v=1');
  const response=await fetch(SUPABASE_URL+'/functions/v1/'+slug,{
   method:'POST',cache:'no-store',
   headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY},
   body:JSON.stringify(data)});
  const json=await response.json().catch(()=>null);
  if(!response.ok||!json?.ok)throw Error(json?.error||'Service Albert indisponible (HTTP '+response.status+').');
  return json;
 }
 function screen(){
  const hash=decodeURIComponent(location.hash||'').toLowerCase();
  if(hash.includes('carnet')||hash.includes('espace'))return 'carnet';
  if(hash.includes('student')||hash.includes('eleve'))return 'eleve';
  if(hash.includes('controles'))return 'mes-controles';
  if(hash.includes('creer'))return 'creer';
  if(hash.includes('import'))return 'import';
  if(hash.includes('copie'))return 'copies';
  if(hash.includes('classes'))return 'classes';
  if(hash.includes('qr'))return 'qr';
  if(hash.includes('publication'))return 'publication';
  if(hash.includes('prof'))return 'tableau-prof';
  return 'accueil';
 }
 const el=(tag,text,cls)=>{
  const e=document.createElement(tag);if(cls)e.className=cls;
  if(text!==undefined)e.textContent=String(text);return e;
 };
 // Fenêtre de travail identique pour le guide, l'estimation et les conseils.
 // La barre est indéterminée : on ne prétend pas connaître le % de progression d'Albert.
 function waitForAlbert(title,detail){
  const d=el('dialog',undefined,'cortex-albert-wait');
  d.setAttribute('aria-label','Analyse Albert en cours');
  const card=el('div',undefined,'cortex-albert-wait-card');
  const symbol=el('div','✦','cortex-albert-wait-symbol');
  const badge=el('div','ALBERT IA · ANALYSE EN COURS','cortex-albert-wait-badge');
  const heading=el('h2',title);
  const explanation=el('p',detail,'cortex-albert-wait-detail');
  const bar=el('div',undefined,'cortex-albert-wait-track');
  const fill=el('div',undefined,'cortex-albert-wait-fill');bar.append(fill);
  bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','Albert traite la demande');
  const foot=el('div',undefined,'cortex-albert-wait-footer');
  const elapsed=el('span','Connexion au serveur Albert…');
  const hide=el('button','Masquer la fenêtre');hide.type='button';
  hide.addEventListener('click',()=>{if(d.open)d.close()});
  foot.append(elapsed,hide);
  card.append(symbol,badge,heading,explanation,bar,foot);d.append(card);document.body.append(d);
  d.showModal();
  const started=Date.now();
  const tick=setInterval(()=>{
   const seconds=Math.floor((Date.now()-started)/1000);
   elapsed.textContent=seconds<3?'Connexion au serveur Albert…':
    seconds<15?'Albert analyse la demande · '+seconds+' s':
    'Albert rédige sa réponse · '+seconds+' s (le traitement peut être long)';
  },1000);
  return {close:()=>{clearInterval(tick);if(d.open)d.close();d.remove()}};
 }
 function renderGuide(data,target){
  target.replaceChildren();
  const title=el('div','✦ Réponse d’Albert','cortex-albert-result-heading');target.append(title);
  if(Array.isArray(data.guide?.steps)&&data.guide.steps.length){
   const guide=data.guide;
   if(guide.intro)target.append(el('p',guide.intro,'cortex-albert-result-intro'));
   const list=el('ol',undefined,'cortex-albert-steps');
   for(const [i,step] of guide.steps.entries()){
    const item=el('li',undefined,'cortex-albert-step');
    const number=el('span',String(i+1).padStart(2,'0'),'cortex-albert-step-number');
    const body=el('div',undefined,'cortex-albert-step-body');
    body.append(el('strong',step.title),el('p',step.description));
    item.append(number,body);list.append(item);
   }
   target.append(list);
   if(guide.note)target.append(el('p','À retenir : '+guide.note,'cortex-albert-note'));
   return;
  }
  // Compatibilité : ancien modèle pouvant renvoyer du Markdown littéral.
  // Texte et gras sont rendus par des nœuds DOM, jamais avec innerHTML utilisateur.
  const raw=String(data.answer||'Albert n’a pas fourni de réponse exploitable.').trim();
  const chunks=raw.split(/\n{2,}/).flatMap(p=>p.split(/\n(?=\s*(?:[-•]|\d+[.)]))/)).filter(Boolean);
  for(const chunk of chunks){
   const paragraph=el('p',undefined,'cortex-albert-result-paragraph');
   const parts=chunk.split(/(\*\*[^*]+\*\*)/g);
   for(const part of parts){
    if(!part)continue;
    if(part.startsWith('**')&&part.endsWith('**'))paragraph.append(el('strong',part.slice(2,-2)));
    else paragraph.append(document.createTextNode(part.replace(/(?:^|\s)\*{1}(?=\S)/g,' ')));
   }
   target.append(paragraph);
  }
 }
 // Aide professorale flottante à l'extrême gauche du ciel Noctis.
 const launcher=el('button',undefined,'cortex-albert-person');
 launcher.id='cortex-albert-person';launcher.type='button';
 launcher.title='Albert IA · Aide et signalement de bug';launcher.setAttribute('aria-label','Ouvrir Albert, aide du site et signalement de bug');
 launcher.innerHTML='<span class="cortex-albert-buddy" aria-hidden="true"><span class="buddy-antenna"></span><span class="buddy-head"><i></i><i></i></span><span class="buddy-body"></span><span class="buddy-arms"></span><span class="buddy-feet"></span></span><span class="buddy-name">Albert IA</span>';
 document.body.append(launcher);
 const dialog=el('dialog',undefined,'cortex-albert-dialog');
 dialog.id='cortex-albert-dialog';
 const main=el('div',undefined,'cortex-albert-dialog-content');
 const header=el('div',undefined,'cortex-albert-dialog-header');
 const head=el('div');head.append(el('div','ALBERT · STATION NOCTIS','cortex-albert-kicker'),el('h2','Comment puis-je t’aider ?'));
 const close=el('button','✕','cortex-albert-close');close.type='button';close.setAttribute('aria-label','Fermer Albert');
 close.addEventListener('click',()=>dialog.close());header.append(head,close);
 const tabs=el('div',undefined,'cortex-albert-tabs');
 const helpTab=el('button','✦ Comprendre le site'),reportTab=el('button','⚑ Signaler un bug');
 helpTab.type='button';reportTab.type='button';tabs.append(helpTab,reportTab);
 const help=el('section',undefined,'cortex-albert-panel'),bug=el('section',undefined,'cortex-albert-panel');
 help.append(el('p','Je suis Albert, ton guide dans la démonstration CORTEX. Tu peux me poser une question sur les fonctions de l’espace professeur.','cortex-albert-muted'));
 const chips=el('div',undefined,'cortex-albert-examples');
 for(const q of ['Comment créer et publier un contrôle ?','Comment associer une capture à une question ?','Comment tester le contrôle comme un élève ?']){
  const b=el('button',q);b.type='button';b.addEventListener('click',()=>{question.value=q;question.focus()});chips.append(b);
 }
 help.append(chips);
 const question=el('textarea');question.maxLength=500;question.rows=3;question.placeholder='Ex. Comment publier seulement pour le groupe 2 ?';
 question.setAttribute('aria-label','Ta question à Albert');
 const ask=el('button','Demander à Albert','cortex-albert-send');ask.type='button';
 const answer=el('div',undefined,'cortex-albert-answer');answer.setAttribute('role','status');answer.setAttribute('aria-live','polite');
 help.append(question,ask,answer);
 bug.append(el('p','Décris le problème et l’écran concerné. Le signalement sera enregistré pour l’administrateur dans Supabase, sans publication publique.','cortex-albert-muted'));
 const issue=el('textarea');issue.rows=5;issue.maxLength=1500;issue.placeholder='Ex. Dans Mes contrôles, le bouton Tester ne lance pas le chronomètre…';
 issue.setAttribute('aria-label','Description du bug');
 const safety=el('p','Ne joins aucun nom d’élève, numéro, copie réelle ou secret.','cortex-albert-warning');
 const send=el('button','Transmettre le bug à l’administrateur','cortex-albert-send');send.type='button';
 const reportStatus=el('div',undefined,'cortex-albert-answer');reportStatus.setAttribute('role','status');reportStatus.setAttribute('aria-live','polite');
 bug.append(issue,safety,send,reportStatus);
 main.append(header,tabs,help,bug);dialog.append(main);document.body.append(dialog);
 function tab(mode){
  help.hidden=mode!=='help';bug.hidden=mode!=='bug';
  helpTab.setAttribute('aria-selected',String(mode==='help'));
  reportTab.setAttribute('aria-selected',String(mode==='bug'));
 }
 tab('help');helpTab.onclick=()=>tab('help');reportTab.onclick=()=>tab('bug');
 launcher.onclick=()=>{tab('help');dialog.showModal()};
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 ask.onclick=async()=>{
  const message=question.value.trim();
  if(message.length<5){answer.textContent='Écris une question de cinq caractères minimum.';return;}
  ask.disabled=true;answer.replaceChildren();
  const busy=waitForAlbert('Albert prépare sa réponse','Analyse de ta question et recherche des étapes dans CORTEX.');
  try{const data=await endpoint(GUIDE,{action:'teacher_help',screen:screen(),message});renderGuide(data,answer)}
  catch(e){answer.textContent='⚠ '+String(e.message||e)}
  finally{busy.close();ask.disabled=false}
 };
 send.onclick=async()=>{
  const description=issue.value.trim();
  if(description.length<20){reportStatus.textContent='Décris le problème en 20 caractères minimum.';return;}
  send.disabled=true;reportStatus.textContent='Transmission du signalement…';
  try{
   const isStudent=location.hash.includes('eleve')||location.hash.includes('student');
   const data=await endpoint(GUIDE,{action:'report_bug',description,screen:screen(),interface:isStudent?'eleve':screen()==='accueil'?'autre':'professeur'});
   reportStatus.textContent='✓ Bug enregistré sous la référence '+data.reference+'. L’administrateur peut le consulter dans Supabase.';
   issue.value='';
  }catch(e){reportStatus.textContent='⚠ '+String(e.message||e)}finally{send.disabled=false}
 };
 // Une note estimée par Albert ne peut jamais être une note officielle.
 async function estimate(){
  if(state.estimateLoading)return;
  const holder=$('cortex-estimate-result');if(!holder)return;
  if(state.estimate){renderEstimate(holder);return}
  state.estimateLoading=true;holder.textContent='Albert prépare une estimation sur la copie PSE fictive…';
  const button=document.querySelector('[data-action="portal-albert-estimate"]');if(button)button.disabled=true;
  const busy=waitForAlbert('Estimation de la note en cours','Analyse de 20 réponses fictives, calcul indicatif et préparation de trois conseils. Aucune note officielle n’est modifiée.');
  try{
   // Le serveur utilise un contrôle et 20 réponses FIXES : aucune donnée du carnet n'est envoyée.
   const out=await endpoint(GRADE,{action:'demo_draft',copy_id:'ex-pdf-demo'});
   if(out.mode!=='demo'||out.copyId!=='ex-pdf-demo'||!Array.isArray(out.questions)||out.questions.length!==20||!Number.isFinite(Number(out.grade)))
    throw Error('Correction fictive incomplète : estimation impossible.');
   const sorted=[...out.questions].sort((a,b)=>(Number(a.points)/Math.max(0.5,Number(a.max)))-(Number(b.points)/Math.max(0.5,Number(b.max))));
   const weakest=sorted[0],strongest=sorted[sorted.length-1];
   const oneLine=value=>{
    const phrase=String(value||'').split(/(?<=[.!?])\s+/)[0].replace(/\s+/g,' ').trim();
    return phrase.length>145?phrase.slice(0,142).trimEnd()+'…':phrase;
   };
   const good=oneLine(strongest.commentaire||strongest.attendu||'Certains acquis apparaissent dans la copie.');
   const weak=oneLine(weakest.commentaire||'Une notion demande encore de la précision.');
   const advice=oneLine(weakest.conseil||'Relis le document et justifie chaque étape.');
   state.estimate={score:Math.round(Number(out.grade)*100)/100,lines:['Point fort : '+good,'À revoir : '+weak,'Pour progresser : '+advice]};
   if($('cortex-estimate-result'))renderEstimate($('cortex-estimate-result'));
  }catch(e){if($('cortex-estimate-result'))$('cortex-estimate-result').textContent='⚠ '+String(e.message||e)}
  finally{busy.close();state.estimateLoading=false;if(button)button.disabled=false}
 }
 function renderEstimate(holder){
  holder.replaceChildren();
  holder.append(el('div','≈ '+state.estimate.score+' / 20','cortex-estimate-grade'));
  for(const line of state.estimate.lines)holder.append(el('p',line,'cortex-estimate-line'));
  holder.append(el('small','Estimation IA non officielle : elle ne modifie ni la copie ni la moyenne. Seule la correction du professeur fera foi.','cortex-estimate-disclaimer'));
 }
 async function tips(){
  if(state.tipsLoading)return;
  const holder=$('cortex-albert-tips-slot');if(!holder)return;
  if(state.tips){renderTips(holder);return;}
  state.tipsLoading=true;holder.textContent='Albert prépare trois aides de révision fictives…';
  const btn=document.querySelector('[data-action="portal-albert-tips"]');if(btn)btn.disabled=true;
  const busy=waitForAlbert('Albert élabore tes aides','Préparation de trois conseils pédagogiques à partir du profil fictif du carnet. Aucun résultat réel n’est envoyé.');
  try{
   const res=await endpoint(GUIDE,{action:'student_tips'});
   if(!Array.isArray(res.tips)||res.tips.length!==3)throw Error('Les trois conseils attendus ne sont pas disponibles.');
   state.tips=res.tips;
   if($('cortex-albert-tips-slot'))renderTips($('cortex-albert-tips-slot'));
  }catch(e){if($('cortex-albert-tips-slot'))$('cortex-albert-tips-slot').textContent='⚠ '+String(e.message||e)}
  finally{busy.close();state.tipsLoading=false;if(btn)btn.disabled=false}
 }
 function renderTips(holder){
  holder.replaceChildren();
  for(let i=0;i<state.tips.length;i++){
   const tip=state.tips[i],article=el('article',undefined,'portal-revision cortex-albert-tip');
   article.append(el('div',String(i+1).padStart(2,'0'),'portal-revision-num'));
   const body=el('div');body.append(el('span',tip.topic||'PSE','portal-kicker'),el('strong',tip.title),el('p',tip.advice));
   article.append(body);holder.append(article);
  }
  holder.append(el('p','Conseils proposés par Albert à partir de données fictives. Ils ne remplacent pas les explications du professeur.','cortex-albert-muted'));
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-action]');
  if(!button)return;
  const action=button.dataset.action;
  if(action==='portal-albert-estimate'){
   if(button.dataset.id!==PENDING)return;
   event.preventDefault();event.stopImmediatePropagation();estimate();
  }
  if(action==='portal-albert-tips'){
   event.preventDefault();event.stopImmediatePropagation();tips();
  }
 },true);
 window.CORTEX_ALBERT_TOOLS={pendingId:PENDING,get estimate(){return state.estimate},get tips(){return state.tips},renderEstimate,renderTips};
})();
