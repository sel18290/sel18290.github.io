/* CORTEX DEMO — Albert : personnage d'aide, signalements, estimation et révisions.
   Tous les échanges Albert du carnet utilisent des données fictives fixes côté Supabase.
   Le navigateur ne transmet aucune réponse ni note d'élève. */
(function(){
 'use strict';
 const GUIDE='cortex-albert-guide',GRADE='cortex-albert-demo',PENDING='exemple-attente-albert';
 const $=(id)=>document.getElementById(id);
 const short=(s,n)=>String(s||'').slice(0,n);
 const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={analysis:null,estimate:null,estimateLoading:false,tipsLoading:false,corrected:new Map(),correctedBusy:new Set()};
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
 launcher.title='Albert IA · Aide et signalement de bug';launcher.setAttribute('aria-label','Albert IA : je peux t’aider. Clique pour obtenir de l’aide ou signaler un bug.');
 launcher.innerHTML='<span class="cortex-albert-invite" id="cortex-albert-invite" aria-hidden="true"><strong>Je peux t’aider !</strong><small>Clique ici ✦</small></span><span class="cortex-albert-buddy" aria-hidden="true"><span class="buddy-antenna"></span><span class="buddy-head"><i></i><i></i></span><span class="buddy-body"></span><span class="buddy-arms"></span><span class="buddy-feet"></span></span><span class="buddy-name">Albert IA</span>';
 document.body.append(launcher);
 const quick=el('button','✦ Albert IA','cortex-albert-quick');
 quick.id='cortex-albert-quick';quick.type='button';
 quick.title='Albert IA · Aide pour les élèves et professeurs';
 quick.setAttribute('aria-label','Ouvrir Albert, mode élève ou professeur');
 document.body.append(quick);
 const dialog=el('dialog',undefined,'cortex-albert-dialog');
 dialog.id='cortex-albert-dialog';
 const main=el('div',undefined,'cortex-albert-dialog-content');
 const hologram=el('div',undefined,'cortex-albert-hologram');
 hologram.setAttribute('aria-hidden','true');
 hologram.innerHTML='<span class="holo-orbit holo-orbit-one"></span><span class="holo-orbit holo-orbit-two"></span><span class="holo-core"><i></i></span><span class="holo-particle p1">✧</span><span class="holo-particle p2">✦</span><span class="holo-scan"></span>';
 const header=el('div',undefined,'cortex-albert-dialog-header');
 const head=el('div');head.append(el('div','ALBERT · STATION NOCTIS','cortex-albert-kicker'),el('h2','Comment puis-je t’aider ?'));
 const close=el('button','✕','cortex-albert-close');close.type='button';close.setAttribute('aria-label','Fermer Albert');
 close.addEventListener('click',()=>dialog.close());header.append(head,close);
 const roles=el('div',undefined,'cortex-albert-roles');
 roles.setAttribute('role','group');roles.setAttribute('aria-label','Choisir le mode Albert');
 const studentRole=el('button','🎓 Mode élève','cortex-albert-role');
 const teacherRole=el('button','▣ Mode professeur','cortex-albert-role');
 studentRole.type='button';teacherRole.type='button';
 roles.append(studentRole,teacherRole);
 const roleInfo=el('p',undefined,'cortex-albert-role-info');
 const tabs=el('div',undefined,'cortex-albert-tabs');
 const helpTab=el('button','✦ Comprendre le site'),reportTab=el('button','⚑ Signaler un bug');
 helpTab.type='button';reportTab.type='button';tabs.append(helpTab,reportTab);
 const help=el('section',undefined,'cortex-albert-panel'),bug=el('section',undefined,'cortex-albert-panel');
 const roleHint=el('p',undefined,'cortex-albert-muted');
 help.append(roleHint);
 const chips=el('div',undefined,'cortex-albert-examples');
 const prompts={
  eleve:['Comment faire un contrôle et voir le temps restant ?','Comment voir ma copie corrigée et ma note ?',
   'Comment chercher une PFMP et suivre une entreprise ?','Comment préparer mon CV et ma lettre avec Albert ?',
   'Comment prendre en photo une réponse manuscrite ?'],
  professeur:['Comment créer et publier un contrôle ?','Comment importer un PDF avec ses images ?',
   'Comment retrouver et corriger les copies ?','Comment consulter les alertes anti-triche ?',
   'Comment créer des PIN et publier le QR code ?']
 };
 help.append(chips);
 const question=el('textarea');question.maxLength=500;question.rows=3;question.placeholder='Ex. Comment publier seulement pour le groupe 2 ?';
 question.setAttribute('aria-label','Ta question à Albert');
 const ask=el('button','Demander à Albert','cortex-albert-send');ask.type='button';
 const answer=el('div',undefined,'cortex-albert-answer');answer.setAttribute('role','status');answer.setAttribute('aria-live','polite');
 const shortcut=el('button','Ouvrir mon espace ↗','cortex-albert-open-space');shortcut.type='button';
 help.append(question,ask,shortcut,answer);
 bug.append(el('p','Décris le problème et l’écran concerné. Le signalement sera enregistré pour l’administrateur dans Supabase, sans publication publique.','cortex-albert-muted'));
 const issue=el('textarea');issue.rows=5;issue.maxLength=1500;issue.placeholder='Ex. Dans Mes contrôles, le bouton Tester ne lance pas le chronomètre…';
 issue.setAttribute('aria-label','Description du bug');
 const safety=el('p','Ne joins aucun nom d’élève, numéro, copie réelle ou secret.','cortex-albert-warning');
 const send=el('button','Transmettre le bug à l’administrateur','cortex-albert-send');send.type='button';
 const reportStatus=el('div',undefined,'cortex-albert-answer');reportStatus.setAttribute('role','status');reportStatus.setAttribute('aria-live','polite');
 bug.append(issue,safety,send,reportStatus);
 main.append(header,roles,roleInfo,hologram,tabs,help,bug);dialog.append(main);document.body.append(dialog);
 let role='eleve';
 function chooseRole(next){
  role=next==='professeur'?'professeur':'eleve';
  studentRole.setAttribute('aria-pressed',String(role==='eleve'));
  teacherRole.setAttribute('aria-pressed',String(role==='professeur'));
  roleInfo.textContent=role==='eleve'
   ? 'Contrôles, notes, copies corrigées, révisions et recherche de PFMP.'
   : 'Classes, sujets, import PDF, QR codes, suivi des copies et correction.';
  roleHint.textContent=role==='eleve'
   ? 'Albert te guide dans CORTEX avec des mots simples, sans accéder à ta copie réelle.'
   : 'Albert t’accompagne dans la démonstration, sans accéder aux données des élèves réels.';
  question.placeholder=role==='eleve'
   ? 'Ex. Comment voir ma correction ou trouver une PFMP ?'
   : 'Ex. Comment transformer un PDF en contrôle avec ses documents ?';
  shortcut.textContent=role==='eleve'?'Ouvrir l’espace élève ↗':'Ouvrir l’espace professeur ↗';
  chips.replaceChildren();
  for(const q of prompts[role]){
   const b=el('button',q);b.type='button';
   b.addEventListener('click',()=>{question.value=q;question.focus()});
   chips.append(b);
  }
  answer.replaceChildren();
 }
 studentRole.onclick=()=>chooseRole('eleve');
 teacherRole.onclick=()=>chooseRole('professeur');
 shortcut.onclick=()=>{
  dialog.close();
  const action=role==='eleve'?'student':'teacher';
  const target=document.querySelector('[data-action="'+action+'"]');
  if(target)target.click();
  else location.hash=role==='eleve'?'#eleve':'#prof';
 };
 function tab(mode){
  help.hidden=mode!=='help';bug.hidden=mode!=='bug';
  helpTab.setAttribute('aria-selected',String(mode==='help'));
  reportTab.setAttribute('aria-selected',String(mode==='bug'));
 }
 tab('help');helpTab.onclick=()=>tab('help');reportTab.onclick=()=>tab('bug');
 function openAssistant(){
  tab('help');
  chooseRole(/eleve|student|carnet/i.test(location.hash||'')?'eleve':'professeur');
  dialog.showModal();
 }
 launcher.onclick=openAssistant;quick.onclick=openAssistant;
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 ask.onclick=async()=>{
  const message=question.value.trim();
  if(message.length<5){answer.textContent='Écris une question de cinq caractères minimum.';return;}
  ask.disabled=true;answer.replaceChildren();
  const busy=waitForAlbert('Albert prépare sa réponse','Analyse de ta question et recherche des étapes dans CORTEX.');
  try{const data=await endpoint(GUIDE,{action:role==='eleve'?'student_help':'teacher_help',screen:screen(),message});renderGuide(data,answer)}
  catch(e){answer.textContent='⚠ '+String(e.message||e)}
  finally{busy.close();ask.disabled=false}
 };
 send.onclick=async()=>{
  const description=issue.value.trim();
  if(description.length<20){reportStatus.textContent='Décris le problème en 20 caractères minimum.';return;}
  send.disabled=true;reportStatus.textContent='Transmission du signalement…';
  try{
   const data=await endpoint(GUIDE,{action:'report_bug',description,screen:screen(),interface:role});
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
   const out=await endpoint(GRADE,{action:'demo_estimate_only',copy_id:'ex-pdf-demo'});
   if(out.mode!=='demo'||out.copyId!=='ex-pdf-demo'||!Number.isFinite(Number(out.grade))||
      Object.prototype.hasOwnProperty.call(out,'questions'))
    throw Error('Estimation incomplète ou présence de détails non autorisés.');
   // Copie en cours de correction : uniquement une note indicative, SANS commentaires.
   state.estimate={score:Math.round(Number(out.grade)*100)/100};
   if($('cortex-estimate-result'))renderEstimate($('cortex-estimate-result'));
  }catch(e){if($('cortex-estimate-result'))$('cortex-estimate-result').textContent='⚠ '+String(e.message||e)}
  finally{busy.close();state.estimateLoading=false;if(button)button.disabled=false}
 }
 function renderEstimate(holder){
  holder.replaceChildren();
  holder.append(el('div','≈ '+state.estimate.score+' / 20','cortex-estimate-grade'));
  holder.append(el('small','Estimation provisoire, sans appréciation ni remarques tant que la correction du professeur n’est pas publiée. Elle n’entre pas dans la moyenne.','cortex-estimate-disclaimer'));
 }
 function sectionCards(holder,title,items,kind){
  const section=el('section',undefined,'cortex-analysis-zone zone-'+kind);
  const head=el('div',undefined,'cortex-analysis-zone-header');
  head.append(el('span',kind==='strengths'?'✦':kind==='difficulties'?'◇':'↗','cortex-analysis-zone-symbol'),el('h3',title));
  section.append(head);
  for(const [i,item] of items.entries()){
   const card=el('article',undefined,'cortex-analysis-item');
   const order=el('span',String(i+1).padStart(2,'0'),'cortex-analysis-item-index');
   const detail=el('div',undefined,'cortex-analysis-item-body');
   detail.append(el('strong',item.title),el('p',item.detail));
   card.append(order,detail);section.append(card);
  }
  holder.append(section);
 }
 function renderAnalysis(holder){
  const data=state.analysis;if(!data)return;
  holder.replaceChildren();
  const head=el('div',undefined,'cortex-analysis-hud');
  const orb=el('div',undefined,'cortex-analysis-orb');
  orb.append(el('strong',String(data.reviewedCount),'cortex-analysis-number'),el('span','copies lues'));
  const info=el('div',undefined,'cortex-analysis-hud-info');
  info.append(el('span','LECTURE INTÉGRALE · CARNET FICTIF','cortex-albert-kicker'),
    el('h3','Albert a analysé ton parcours.'),
    el('p',data.overview));
  head.append(orb,info);holder.append(head);
  const trend=el('section',undefined,'cortex-analysis-trend');
  trend.append(el('span','↗ ÉVOLUTION CONSTATÉE','cortex-albert-kicker'),
   el('strong',data.progress.title),el('p',data.progress.detail));
  holder.append(trend);
  sectionCards(holder,'Ce que tu réussis',data.strengths,'strengths');
  sectionCards(holder,'Difficultés à travailler',data.difficulties,'difficulties');
  sectionCards(holder,'Plan d’action recommandé',data.recommendations,'recommendations');
  holder.append(el('p','Bilan généré par Albert sur 13 contrôles entièrement fictifs déjà corrigés. Les copies en attente sont exclues et aucune note du professeur n’est modifiée.','cortex-albert-muted'));
 }
 async function tips(){
  if(state.tipsLoading)return;
  const holder=$('cortex-albert-tips-slot');if(!holder)return;
  if(state.analysis){renderAnalysis(holder);return}
  state.tipsLoading=true;holder.textContent='Albert analyse les contrôles fictifs déjà corrigés…';
  const btn=document.querySelector('[data-action="portal-albert-tips"]');if(btn)btn.disabled=true;
  const busy=waitForAlbert('Analyse complète du carnet','Albert étudie les 13 contrôles corrigés, leurs barèmes et les retours du professeur. Les copies en attente sont exclues.');
  try{
   const res=await endpoint(GUIDE,{action:'student_tips'});
   if(!res.analysis||res.analysis.reviewedCount!==13||!Array.isArray(res.analysis.recommendations)||res.analysis.recommendations.length!==3)
    throw Error('Albert n’a pas livré un bilan complet et vérifiable.');
   state.analysis=res.analysis;
   if($('cortex-albert-tips-slot'))renderAnalysis($('cortex-albert-tips-slot'));
  }catch(e){
   if($('cortex-albert-tips-slot'))$('cortex-albert-tips-slot').textContent='⚠ '+String(e.message||e);
  }finally{busy.close();state.tipsLoading=false;if(btn)btn.disabled=false}
 }
 function renderCorrected(holder,copyId){
  const info=state.corrected.get(copyId);
  if(!holder||!info)return;
  holder.replaceChildren();
  const hero=el('div',undefined,'cortex-corrected-hud');
  hero.append(el('div','✦','cortex-corrected-symbol'));
  const headline=el('div');
  headline.append(el('span','ALBERT · LECTURE DE LA COPIE CORRIGÉE','cortex-albert-kicker'),
   el('strong','Comprendre ta correction'),el('p',info.intro));
  hero.append(headline);holder.append(hero);
  sectionCards(holder,'Points maîtrisés',info.strengths,'strengths');
  sectionCards(holder,'Points à renforcer',info.improvements,'difficulties');
  sectionCards(holder,'Comment progresser',info.actions,'recommendations');
  holder.append(el('small','Albert commente une copie fictive déjà corrigée. Il respecte la note et les appréciations du professeur, sans les modifier.','cortex-estimate-disclaimer'));
 }
 const validPublished=id=>/^exemple-copie-(?:[0-9]|1[01])$/.test(id)||id==='exemple-corrige-sommeil';
 async function corrected(id){
  if(!validPublished(id))return; // Interdit pour toute copie en attente.
  const slots=[...document.querySelectorAll('[data-albert-copy]')].filter(x=>x.getAttribute('data-albert-copy')===id);
  if(!slots.length)return;
  if(state.corrected.has(id)){slots.forEach(slot=>renderCorrected(slot,id));return}
  if(state.correctedBusy.has(id))return;
  state.correctedBusy.add(id);
  slots.forEach(slot=>slot.textContent='Albert consulte cette correction fictive déjà publiée…');
  const buttons=[...document.querySelectorAll('[data-action="portal-albert-corrected"]')].filter(b=>b.dataset.id===id);
  buttons.forEach(b=>b.disabled=true);
  const busy=waitForAlbert('Lecture de ta copie corrigée','Albert compare les réponses fictives, les points attribués et les annotations du professeur. Ta note officielle restera inchangée.');
  try{
   const res=await endpoint(GUIDE,{action:'corrected_feedback',copy_id:id});
   if(!res.feedback||!Array.isArray(res.feedback.strengths)||res.feedback.strengths.length!==2||
      !Array.isArray(res.feedback.actions)||res.feedback.actions.length!==2)throw Error('Analyse de copie incomplète.');
   state.corrected.set(id,res.feedback);
   slots.forEach(slot=>renderCorrected(slot,id));
  }catch(e){slots.forEach(slot=>slot.textContent='⚠ '+String(e.message||e))}
  finally{busy.close();state.correctedBusy.delete(id);buttons.forEach(b=>b.disabled=false)}
 }
 function hydrate(){
  for(const x of document.querySelectorAll('[data-albert-copy]')){
   const id=x.getAttribute('data-albert-copy');if(state.corrected.has(id))renderCorrected(x,id);
  }
  if(state.analysis&&$('cortex-albert-tips-slot'))renderAnalysis($('cortex-albert-tips-slot'));
  if(state.estimate&&$('cortex-estimate-result'))renderEstimate($('cortex-estimate-result'));
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
  if(action==='portal-albert-corrected'){
   event.preventDefault();event.stopImmediatePropagation();corrected(String(button.dataset.id||''));
  }
 },true);
 window.CORTEX_ALBERT_TOOLS={pendingId:PENDING,get estimate(){return state.estimate},
  get analysis(){return state.analysis},get corrected(){return state.corrected},hydrate,renderEstimate,renderAnalysis,renderCorrected};
})();
