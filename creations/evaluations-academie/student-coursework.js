/* CORTEX Académie — parcours élève permanent par classe et contrôle par QR code.
   Un seul PIN par numéro dans sa classe, session temporaire côté serveur. */
import { api } from './coursework.js?v=2.14-handwriting';
import { renderReceiptAi,renderDashboardAi } from './student-ai.js?v=1.4';
import { mobileExam,installMobileExam } from './student-iphone-exam.js?v=1.7-watermark';
import { createStudentDraft,recoverAnswers } from './student-draft.js?v=1';
import { sourceFigure } from './student-source-view.js?v=1.1-watermark';
import { createHandwritingManager } from './student-handwriting.js?v=1.3';

const params=new URLSearchParams(location.search);
const qr=params.get('join'),classPrefill=params.get('classe');
const registrationToken=params.get('inscription')||new URLSearchParams(location.hash.slice(1)).get('inscription')||'';
const globalPortal=params.get('espace')==='eleve'||!!classPrefill||!!registrationToken;
if(qr||globalPortal){
 await window.CORTEX_REAL_ENTRY.ready;
 const enter=(action,payload={})=>api(action,{...payload,entry_ticket:window.CORTEX_REAL_ENTRY.token()});
 const $=id=>document.getElementById(id);
 const E=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
 const one=(sel,root=document)=>root.querySelector(sel);
 const mode=qr?'qr':'class';
 const storageKey='cortex-academie-eleve:'+mode+':'+(qr||classPrefill||'general');
 let token=null,current=null,currentId=null,classData=null,classList=[],busy=false;
 let validatedLink=null,linkReady=!registrationToken;
 let countdownInterval=null;
 let stageWorkspace=null,openStagesAfterLogin=params.get('rubrique')==='stages';
 const isPhoneExam=mobileExam();
 let mobileController=null, draftEditor=null, clearDraftListeners=null, photoManager=null, examWatermark=null;
 const integrity=window.CORTEX_EXAM_INTEGRITY;
 const guard=integrity.create({storageKey:storageKey+':sortie',onEvent:queueEvent,onNotice:showIntegrityNotice});
 const presence=window.CORTEX_EXAM_LIVE.createReporter(({session,assessmentId},signal)=>
  api('student_presence',{session,assessment_id:assessmentId,...signal}));
 const eventQueueKey=storageKey+':journal';
 let pendingEvents=[];
 try{
  const saved=JSON.parse(sessionStorage.getItem(eventQueueKey)||'[]');
  if(Array.isArray(saved))pendingEvents=saved;
 }catch{}
 let sendingEvents=false,eventRetry=null,noticeTimeout=null;
 function releaseEditor(){
  examWatermark?.remove();examWatermark=null;
  photoManager?.dispose();photoManager=null;
  draftEditor?.dispose();draftEditor=null;
  clearDraftListeners?.();clearDraftListeners=null;
  if(mobileController){mobileController.destroy();mobileController=null;}
 }
 document.body.classList.add('cw-student-active');
 const main=E('main','cw-student-portal');main.id='cw-student-portal';
 main.innerHTML='<div class="cw-student-frame">'+
  '<div class="cw-student-brand">CORTEX <span>ACADÉMIE · ESPACE ÉLÈVE</span></div>'+
  '<div class="cw-student-hero"><span>ESPACE ÉLÈVE</span><h1>'+(qr?'Rejoindre mon contrôle':'Ton espace élève')+'</h1>'+
  '<p>'+(qr?'Le QR code t’a envoyé vers le contrôle attribué à ta classe.':'Choisis ta classe, indique ton numéro sur la liste et confirme ton PIN pour retrouver tes contrôles et corrections.')+'</p></div>'+
  '<div id="cw-student-link-target" class="cw-pin-intro" role="status" aria-live="polite" hidden></div>'+
  '<div id="cw-student-status" role="status" aria-live="polite" class="cw-status" hidden></div>'+
  '<section id="cw-student-login" class="cw-pin-entry">'+
  '<a class="cw-student-home" href="./">Retour à CORTEX Académie</a>'+
  '<div class="cw-pin-paths" role="group" aria-label="Choisir sa connexion">'+
  '<button id="cw-back-to-login" type="button" class="cw-pin-path is-selected" aria-pressed="true">J’ai déjà mon PIN</button>'+
  '<button id="cw-show-activation" type="button" class="cw-pin-path" aria-pressed="false">Je crée mon PIN</button></div>'+
  '<div class="cw-pin-intro"><p>Utilise le même PIN à six chiffres pour les évaluations de ta classe.</p></div>'+
  '<form id="cw-student-login-form" class="cw-student-login-form">'+
  (qr?'':'<label for="cw-student-class">Ma classe<select id="cw-student-class" required><option value="">Chargement des classes…</option></select></label>')+
  '<label for="cw-student-number">Mon numéro sur la liste<input id="cw-student-number" type="number" min="1" max="60" inputmode="numeric" autocomplete="off" placeholder="Ex. 12" required></label>'+
  '<label for="cw-student-pin">Mon PIN à 6 chiffres<div class="cw-pin-input-wrap"><input id="cw-student-pin" type="password" minlength="6" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="off" placeholder="●●●●●●" required><button type="button" class="cw-pin-eye" aria-label="Afficher ou masquer le PIN" aria-controls="cw-student-pin">Afficher</button></div></label>'+
  '<button type="submit" class="cw-student-submit">'+(qr?'Ouvrir mon contrôle':'Accéder à mon espace')+'</button></form>'+
  '<form id="cw-student-activation-form" class="cw-student-login-form cw-activation-form" hidden>'+
  '<div class="cw-activation-heading"><span>PREMIÈRE CONNEXION</span><h2>Choisir mon PIN</h2><p>'+(qr?'Tu es bien arrivé par le QR de ton contrôle. Ton professeur doit ouvrir la création des PIN pendant 30 minutes depuis ce même contrôle.':'Ouvre le lien temporaire transmis par ton professeur pendant les 30 minutes d’inscription.')+' Choisis ton numéro, crée ton PIN et confirme-le. Aucun code individuel à demander.</p></div>'+
  (qr?'':'<label for="cw-activation-class">Ma classe<select id="cw-activation-class" required><option value="">Choisir ma classe…</option></select></label>')+
  '<label for="cw-activation-number">Mon numéro sur la liste<input id="cw-activation-number" type="number" min="1" max="60" inputmode="numeric" autocomplete="off" placeholder="Ex. 12" required></label>'+
  '<label for="cw-activation-new-pin">Je choisis mon PIN à 6 chiffres<div class="cw-pin-input-wrap"><input id="cw-activation-new-pin" type="password" minlength="6" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="new-password" required placeholder="Choisis 6 chiffres"><button type="button" class="cw-pin-eye" aria-label="Afficher ou masquer le PIN" aria-controls="cw-activation-new-pin">Afficher</button></div></label>'+
  '<label for="cw-activation-confirm-pin">Je confirme mon PIN<input id="cw-activation-confirm-pin" type="password" minlength="6" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="new-password" required placeholder="Répète les 6 chiffres"></label>'+
  '<label for="cw-activation-group" class="cw-pin-group-choice">Mon demi-groupe <span class="cw-pin-group-required">(obligatoire)</span><select id="cw-activation-group" name="demi_groupe" required><option value="" selected disabled>Choisir mon demi-groupe…</option><option value="1">Demi-groupe 1</option><option value="2">Demi-groupe 2</option></select><small>Choisis le groupe indiqué par ton professeur. Il apparaîtra directement dans « PIN élèves ».</small></label>'+
  '<p class="cw-pin-privacy">🔒 Ton professeur ne voit pas ton PIN. Ne le partage avec personne.</p>'+
  '<button type="submit" class="cw-student-submit">Créer mon PIN et entrer</button></form>'+
  '<p class="cw-student-help">PIN oublié ? Demande à ton professeur un lien individuel pour choisir un nouveau PIN.</p></section>'+
  '<section id="cw-student-work" hidden></section>'+
  '<footer>Accès personnel sécurisé · Ne communique jamais ton PIN · Les notes apparaissent seulement après publication par ton professeur.</footer></div>';
 document.body.insertBefore(main,document.querySelector('.layout'));
 const integrityNotice=E('div','ce-student-notice');
 integrityNotice.setAttribute('role','status');
 integrityNotice.hidden=true;
 main.append(integrityNotice);
 function showIntegrityNotice(text){
  integrityNotice.textContent=text;
  integrityNotice.hidden=false;
  clearTimeout(noticeTimeout);
  noticeTimeout=setTimeout(()=>{integrityNotice.hidden=true;},4500);
 }
 function message(text,error=false){const el=$('cw-student-status');el.textContent=text||'';el.hidden=!text;el.classList.toggle('error',!!error)}
 function showWork(){ $('cw-student-login').hidden=true;$('cw-student-work').hidden=false;main.classList.add('is-identified') }
 function closeStageView(){
  stageWorkspace?.dispose();
  stageWorkspace=null;
  main.classList.remove('cs-stage-academy-active');
 }
 function reset(){
  closeStageView();releaseEditor();stopIntegrity();
  clearTimeout(eventRetry);
  pendingEvents=[];
  saveEventQueue();
  if(countdownInterval){clearInterval(countdownInterval);countdownInterval=null;}
  token=null;current=null;currentId=null;classData=null;sessionStorage.removeItem(storageKey);
  $('cw-student-work').hidden=true;$('cw-student-login').hidden=false;main.classList.remove('is-identified');
 }
 function stopIntegrity(){
  examWatermark?.remove();examWatermark=null;
  guard.setActive();
  presence.setActive();
  integrityNotice.hidden=true;
 }
 function button(text,cls,handler){
  const b=E('button',cls,text);b.type='button';
  b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;try{await handler()}catch(err){message(err.message||String(err),true)}finally{b.disabled=false}});
  return b;
 }
 function applyLinkedClass(){
  const portal=validatedLink?.portal_code||classPrefill;
  if(mode!=='class'||!portal||(!validatedLink&&!classList.some(cl=>cl.code===portal)))return;
  for(const id of ['cw-student-class','cw-activation-class']){
   const field=$(id);
   if(validatedLink&&![...field.options].some(option=>option.value===portal))
    field.add(new Option(validatedLink.class_code+' · '+validatedLink.class_name,portal));
   field.value=portal;
   field.disabled=true;
  }
 }
 async function getClasses(){
  if(mode!=='class')return;
  try{
   const list=await enter('student_classes');
   // Un lien de classe fixe le destinataire : impossible de sélectionner
   // accidentellement 1AGORA2 avec une invitation destinée à 1AGORA1.
   const allClasses=list.classes||[];
   classList=classPrefill?allClasses.filter(cl=>cl.code===classPrefill):allClasses;
   const select=$('cw-student-class');select.replaceChildren();
   const blank=E('option','','Choisir ma classe');blank.value='';select.append(blank);
   for(const cl of classList){
    const stateText=cl.registration_open?' · Création de PIN ouverte':cl.ready?' · Accès prêt':'';
    const opt=E('option','',cl.label+' · '+cl.display_name+stateText);opt.value=cl.code;select.append(opt);
   }
   const activationSelect=$('cw-activation-class');
   if(activationSelect){
    activationSelect.replaceChildren();
    const empty=E('option','','Choisir ma classe');empty.value='';activationSelect.append(empty);
    for(const cl of classList){const status=cl.registration_open?' · PIN ouverts':cl.ready?' · Accès prêt':'';const option=E('option','',cl.label+' · '+cl.display_name+status);option.value=cl.code;activationSelect.append(option)}
   }
   applyLinkedClass();
   if(classPrefill&&classList.some(x=>x.code===classPrefill)){
    const matching=classList[0];
    if(!registrationToken){
     const banner=$('cw-student-link-target');banner.hidden=false;
     banner.textContent='ACCÈS À '+matching.label+' · '+matching.display_name+'. Ce lien ne donne pas accès aux autres classes.';
    }
   }
   if(registrationToken)return;
   if(!classList.length)message(classPrefill?'Lien de classe invalide : demande au professeur le bon lien.':'Aucune classe n’est enregistrée. Contacte ton professeur.',true);
   else if(!classList.some(cl=>cl.ready))message('Les classes sont disponibles. Demande au professeur d’ouvrir la création des PIN.',true);
   else if(classPrefill&&classList.some(x=>!x.ready))message('Cette classe existe mais ses accès ne sont pas préparés. Contacte ton professeur.',true);
  }catch(err){message('Chargement des classes impossible : '+String(err.message||err),true)}
 }
 async function loadClass(){
  releaseEditor();
  classData=await api('student_class_list',{session:token});
  stopIntegrity();
  current=null;currentId=null;
  showWork();message('');
  if(openStagesAfterLogin){
   openStagesAfterLogin=false;
   renderStageView();
  }else renderClass();
 }
 async function loadExam(id){
  current=await api('student_get',{session:token,assessment_id:id||undefined});
  currentId=current.assessment.id;showWork();message('');
  renderExam();
  flushEvents();
 }
 function studentTabs(active){
  const nav=E('nav','cs-stage-student-tabs');
  nav.setAttribute('aria-label','Rubriques de mon espace élève');
  const controls=button('▤ Mes évaluations','cs-stage-tab'+(active==='controls'?' is-active':''),()=>renderClass());
  const stages=button('🎓 Recherche de PFMP','cs-stage-tab'+(active==='stages'?' is-active':''),renderStageView);
  controls.setAttribute('aria-current',active==='controls'?'page':'false');
  stages.setAttribute('aria-current',active==='stages'?'page':'false');
  nav.append(controls,stages);
  return nav;
 }
 function renderStageView(){
  if(stageWorkspace)return;
  stopIntegrity();
  releaseEditor();
  if(countdownInterval){clearInterval(countdownInterval);countdownInterval=null;}
  showWork();message('');
  const work=$('cw-student-work');work.replaceChildren();
  work.append(studentTabs('stages'));
  const stageHost=E('div','cs-stage-host');work.append(stageHost);
  if(!window.CORTEX_STAGE?.mount){
   work.append(E('p','cw-student-empty','Recherche de PFMP indisponible. Recharge la page.'));
   return;
  }
  main.classList.add('cs-stage-academy-active');
  stageWorkspace=window.CORTEX_STAGE.mount(stageHost,{
   className:classData?.class?.code||'',
   storageScope:classData?.class?.code&&classData?.student_number?classData.class.code+':'+classData.student_number:'',
   session:token,demo:false,
   back:()=>{if(mode==='class')renderClass();else renderExam()}
  });
  stageHost.querySelector('h1')?.focus();
 }
 function renderClass(){
  closeStageView();
  stopIntegrity();
  if(countdownInterval){clearInterval(countdownInterval);countdownInterval=null;}
  const work=$('cw-student-work');work.replaceChildren();
  if(!classData)return;
  work.append(studentTabs('controls'));
  const header=E('div','cw-student-dashboard-head');
  const groupText=classData.demi_groupe===1||classData.demi_groupe===2?' · Demi-groupe '+classData.demi_groupe:' · Classe entière';
  header.append(E('small','','MON ESPACE · '+classData.class.code+groupText),
   E('h2','','Mes évaluations'),
   E('p','','Élève n°'+classData.student_number+' · '+classData.class.name));
  const controls=E('div','cw-student-dashboard-tools');
  controls.append(button('Actualiser mes résultats','cw-secondary',loadClass),
   button('Changer de compte','cw-outline',async()=>{reset();await getClasses()}));
  header.append(controls);work.append(header);
  const stageCard=E('section','cw-student-stage-link');
  const stageIntro=E('div');
  stageIntro.append(E('h3','','Préparer ma PFMP'),
   E('p','','Trouve un lieu de stage, prépare tes messages et suis tes candidatures.'));
  stageCard.append(stageIntro,button('Recherche de PFMP','cw-secondary',renderStageView));
  const cards=E('div','cw-student-assessment-list'),assessments=classData.assessments||[];
  if(!assessments.length){
   cards.append(E('div','cw-student-empty','Aucun contrôle n’est encore ouvert pour ta classe. Les prochaines évaluations apparaîtront ici.'));
  }
  let graded=0,submitted=0,total=0;
  for(const assessment of assessments){
   const card=E('article','cw-student-assessment'),header=E('div','cw-card-head');
   const text=E('div');
   text.append(E('strong','',assessment.title),E('small','',assessment.submitted_at?'Copie remise le '+new Date(assessment.submitted_at).toLocaleDateString('fr-FR'):assessment.available?'Contrôle disponible':'Contrôle fermé'));
   const state=assessment.released?'Correction publiée':assessment.submitted_at?'En attente de correction':assessment.available?'À faire':'Terminé';
   header.append(text,E('span','cw-pill '+(assessment.released?'cw-open':''),state));
   card.append(header);
   if(assessment.released){
    card.append(E('strong','cw-student-result','Ma note : '+assessment.grade+' / 20'));
    if(assessment.feedback)card.append(E('p','cw-student-feedback',assessment.feedback));
    graded++;total+=Number(assessment.grade)||0;
   }
   if(assessment.submitted_at)submitted++;
   if(assessment.available||assessment.submitted_at){
    card.append(button(assessment.submitted_at?(assessment.released?'Voir ma copie corrigée →':'Voir ma copie remise →'):'Démarrer ce contrôle →','cw-accent',()=>loadExam(assessment.id)));
   }
   cards.append(card);
  }
  const stats=E('div','cw-student-stats');
  stats.append(E('span','','Contrôles : '+assessments.length),E('span','','Copies remises : '+submitted),E('span','','Corrigés : '+graded));
  if(graded)stats.append(E('span','','Moyenne des notes publiées : '+(total/graded).toFixed(1).replace('.',',')+' / 20'));
  if(assessments.some(a=>a.available&&!a.submitted_at)){
   const accessGuide=E('p','cw-student-help','Ton contrôle est disponible ci-dessous. Appuie sur « Démarrer ce contrôle » pour commencer.');
   work.append(accessGuide);
  }
  work.append(stats,cards,stageCard);
  renderDashboardAi(work,{session:token,assessments});
 }
 // Relire sa véritable copie après remise, sans divulguer de corrigé avant
 // la publication. Tous les formats de réponses sont restitués comme saisis.
 function showSubmittedAnswers(receipt,exam,submission){
  const questions=Array.isArray(exam.questions)?exam.questions:[];
  const answers=submission?.answers&&typeof submission.answers==='object'?submission.answers:{};
  const handwritten=new Set((String(submission?.file_name||'').match(/^CORTEX_Manuscrit_Q([0-9-]+)_/)||[])[1]?.split('-').map(Number)||[]);
  const supplied=questions.filter(q=>{
   const val=answers[q.id];
   return (typeof val==='string'&&val.trim().length>0)||handwritten.has(questions.indexOf(q)+1);
  }).length;
  const details=E('details','cw-student-my-answers');
  const summary=E('summary','cw-student-my-answers-toggle',
   '📋 Voir les réponses de ma copie ('+supplied+' / '+questions.length+' questions renseignées)');
  const info=E('p','cw-student-my-answers-info',
   'Ces réponses sont celles enregistrées lors de ta remise. Elles ne constituent pas un corrigé officiel.');
  const list=E('div','cw-student-my-answers-list');
  let populated=false;
  const populate=()=>{
   if(populated)return;
   populated=true;
   if(!questions.length){
    list.append(E('p','cw-student-empty','Aucune question structurée n’est associée à ce contrôle.'));
    return;
   }
   for(const [i,q] of questions.entries()){
    const raw=typeof answers[q.id]==='string'?answers[q.id]:'';
    const hasHandwriting=handwritten.has(i+1);
    const item=E('section','cw-student-my-answer'+(!raw.trim()&&!hasHandwriting?' is-empty':''));
    item.append(E('strong','',(i+1)+'. '+q.prompt),
     E('small','','Barème de la question : '+Number(q.points||0)+' point(s)'));
    let human=raw;
    try{human=window.CORTEX_QUESTION_TYPES?.summary?.(q,raw)||raw}
    catch{human=raw}
    item.append(E('p','cw-student-my-answer-value',raw.trim()?human:hasHandwriting?'✎ Réponse manuscrite : voir la photo dans le PDF joint.':'Aucune réponse remise.'));
    list.append(item);
   }
  };
  details.append(summary,info,list);
  details.addEventListener('toggle',()=>{if(details.open)populate()});
  receipt.append(details);
  if(submission?.file_name){
   if(submission.file_url){
    const file=E('a','cw-student-file-download',
     '📎 Ouvrir la copie jointe : '+submission.file_name);
    file.href=submission.file_url;file.target='_blank';file.rel='noopener noreferrer';
    receipt.append(file);
   }else{
    receipt.append(E('p','cw-student-my-answers-info',
     'Fichier joint enregistré : '+submission.file_name+'. Si son lien a expiré, clique sur « Actualiser ma correction ».'));
   }
  }
 }
 // Récupération ciblée du brouillon n°12 du contrôle IST ouvert avant
 // le reclassement 1AGORA2 -> 1AGORA1, sur CE navigateur uniquement.
 // Aucune copie n'est devinée ni extraite d'un appareil distant.
 function findLegacyAgora12Draft(exam){
  if(current?.student_number!==12||
     exam?.id!=='f2632ea7-8ed2-47db-9bb9-528d63f4412a')return null;
  const sourceId='00c7a0cf-da1d-4bd7-b34b-93b7ae1d3938';
  const prefix='cortex-student-draft:v2:'+sourceId+':12:';
  const exact='cortex-student-draft:v1:'+sourceId+':12';
  const possible=[];
  try{
   for(let i=0;i<sessionStorage.length;i++){
    const key=sessionStorage.key(i);
    if(key!==exact&&!key?.startsWith(prefix))continue;
    const stored=JSON.parse(sessionStorage.getItem(key)||'null');
    if(!stored||typeof stored.answers!=='object'||Array.isArray(stored.answers))continue;
    const validIds=new Set((exam.questions||[]).map(q=>q.id));
    const answers={};
    let total=0;
    for(const [id,value] of Object.entries(stored.answers)){
     if(!validIds.has(id)||typeof value!=='string'||value.length>18000)continue;
     total+=value.length;
     if(total>65000)break;
     answers[id]=value;
    }
    const filled=Object.values(answers).filter(x=>x.trim()&&x!=='[]').length;
    const when=Number(stored.updated)||Date.parse(key.slice(prefix.length));
    if(!filled||!Number.isFinite(when)||
       when<Date.parse('2026-11-20T08:00:00Z')||
       when>Date.parse('2026-11-21T02:00:00Z'))continue;
    possible.push({key,answers,filled,when});
   }
  }catch{}
  possible.sort((a,b)=>b.filled-a.filled||b.when-a.when);
  return possible[0]||null;
 }
 function renderExam(){
  closeStageView();
  releaseEditor();
  if(countdownInterval){clearInterval(countdownInterval);countdownInterval=null;}
  const work=$('cw-student-work');work.replaceChildren();
  if(!current)return;
  const exam=current.assessment,settings=exam.antiCheat||{},submitted=current.submission;
  if(mode==='class')work.append(button('← Revenir à mes évaluations','cw-return',loadClass));
  else{
   const portal=E('a','cw-return','Mon espace élève ↗');portal.href=location.origin+location.pathname+'?espace=eleve';work.append(portal);
  }
  const subject=E('section','cw-student-subject');
  subject.append(E('span','cw-student-eyebrow','ÉLÈVE N°'+current.student_number),E('h2','',exam.title));
  if(exam.description)subject.append(E('p','cw-instructions',exam.description));
  if(exam.doc)subject.append(E('div','cw-student-common-doc',exam.doc));
  if(exam.duration)subject.append(E('p','cw-student-rules','Durée : '+exam.duration+' minutes.'));
  if(current.subject){
   const subjectName=String(current.subject.name||'Document du contrôle');
   subject.append(button('📄 Consulter le document dans CORTEX : '+subjectName,
    'cw-student-document cw-protected-subject-open',()=>{
     // La visionneuse intégrée conserve le filigrane ; un onglet PDF externe
     // échappe au contrôle de la page et peut afficher le document sans marque.
     const modal=E('dialog','cw-protected-subject-dialog');
     modal.setAttribute('aria-label','Document de l’évaluation : '+subjectName);
     const head=E('header','cw-protected-subject-header');
     head.append(E('strong','',subjectName));
     const original=E('a','','Ouvrir l’original si nécessaire');
     original.href=current.subject.url;
     original.target='_blank';original.rel='noopener noreferrer';
     original.title='Le document externe peut être affiché sans filigrane.';
     const close=E('button','','Fermer');
     close.type='button';
     close.addEventListener('click',()=>modal.close());
     head.append(original,close);
     const viewer=E('iframe','cw-protected-subject-viewer');
     viewer.src=current.subject.url;
     viewer.title='Document pédagogique : '+subjectName;
     viewer.referrerPolicy='no-referrer';
     const note=E('p','cw-protected-subject-note',
      'Le filigrane reste visible dans cette visionneuse. Les lecteurs externes ou téléchargements ne permettent pas de garantir le marquage.');
     modal.append(head,viewer,note);
     document.body.append(modal);
     modal.addEventListener('close',()=>modal.remove(),{once:true});
     modal.showModal();
    }));
   subject.append(button('Renouveler le lien du document','cw-outline',()=>loadExam(currentId)));
  }
  work.append(subject);
  // La sauvegarde historique n'a pas été envoyée au serveur : elle peut
  // encore être disponible dans l'onglet de l'élève, même après changement de classe.
  if(!submitted&&exam.id==='f2632ea7-8ed2-47db-9bb9-528d63f4412a'
     &&Number(current.student_number)===12){
   const recovery=E('section','cw-student-timer-start');
   recovery.append(E('strong','','Récupérer ma copie du 20 novembre · élève n°12'));
   const recoveryText=E('p','',
    'Recherche d’un brouillon sur cet appareil, dans l’onglet où tu as répondu entre 9 h et 12 h. Aucune copie ne sera remise sans ton accord.');
   recovery.append(recoveryText);
   const recovered=findLegacyAgora12Draft(exam);
   if(recovered){
    recovery.append(E('p','','✓ '+recovered.filled+' réponse(s) anciennes retrouvées sur cet appareil.'));
    recovery.append(button('↻ Restaurer mes réponses dans 1AGORA1','cw-student-submit',async()=>{
     const oldSession=token,previous=current,examId=exam.id;
     let attempt=previous.attempt;
     if(!attempt){
      const started=await api('student_start',{session:oldSession,assessment_id:examId});
      if(current!==previous||token!==oldSession||currentId!==examId)return;
      if(started.status==='submitted'){await loadExam(examId);return}
      if(started.status!=='open')throw Error('Le contrôle ne peut plus être rouvert pour récupérer la copie.');
      attempt=started;current.attempt=started;current.server_now=started.server_now;
     }
     const answers={...recovered.answers};
     for(const [id,value] of Object.entries(attempt.answers||{}))
      if(typeof value==='string'&&value.trim())answers[id]=value;
     const newKey='cortex-student-draft:v2:'+examId+':12:'+attempt.started_at;
     try{
      sessionStorage.setItem(newKey,JSON.stringify({
       revision:attempt.revision,pending:true,answers,
       base:attempt.answers||{},sending:null
      }));
     }catch{throw Error('Stockage local indisponible. N’efface pas l’onglet contenant tes anciennes réponses.')}
     renderExam();
     draftEditor?.update(true);
     message('Réponses retrouvées. Vérifie chaque question, puis clique sur « Remettre définitivement ».');
    }));
   }else{
    recovery.append(E('p','','Aucune ancienne copie détectée dans cet onglet. Essaie le navigateur et l’onglet utilisés le jour du contrôle ; ne vide pas leur historique ni leurs données.'));
   }
   work.append(recovery);
  }
  if(submitted){
   stopIntegrity();
   const receipt=E('section','cw-student-receipt');
   receipt.append(E('h3','','✓ Copie reçue par le professeur'),E('p','',(submitted.auto_submitted?'Remise automatiquement à la fin du chrono le ':'Remise le ')+new Date(submitted.submitted_at).toLocaleString('fr-FR')));
   showSubmittedAnswers(receipt,exam,submitted);
   if(submitted.graded){
    receipt.append(E('h3','cw-receipt-grade','Ma note : '+submitted.grade+' / 20'),E('p','',submitted.feedback||'Aucun commentaire.'));
   }else receipt.append(E('p','','Ta note et tes conseils seront visibles après publication par le professeur.'));
   receipt.append(button('Actualiser ma correction ↻','cw-primary',()=>loadExam(currentId)));
   renderReceiptAi(receipt,{session:token,assessmentId:currentId,submission:submitted});
   work.append(receipt);return;
  }
  const timerKey='cortex-student-timer:'+mode+':'+(qr||classPrefill||'general')+':'+currentId+':'+current.student_number;
  const integrityRules=integrity.describe(settings);
  if(integrityRules)work.append(E('p','cw-student-rules',integrityRules));
  const attempt=current.attempt;
  if(!attempt){
   stopIntegrity();
   const launch=E('section','cw-student-timer-start');
   launch.append(E('strong','','⏱ Prêt à commencer ?'),
    E('p','','Le serveur conserve ton brouillon et remet ta copie à la fin du chrono, même si tu quittes la page.'),
    E('p','cw-handwriting-banner','✎ Écriture manuscrite : tu peux photographier ta réponse directement sous chaque question. Les photos seront regroupées dans un PDF joint à ta copie.'));
   launch.append(button('▶ Démarrer le contrôle et le chrono','cw-student-submit',async()=>{
    const id=currentId,launchSession=token;
    const result=await api('student_start',{session:launchSession,assessment_id:id});
    if(token!==launchSession||currentId!==id)return;
    if(result.status==='submitted'){await loadExam(id);return}
    if(result.status!=='open')throw Error('Ce contrôle ne peut pas être démarré.');
    current.attempt=result;
    current.server_now=result.server_now;
    renderExam();
   }));
   work.append(launch);return;
  }
  const view=current;
  const localStarted=Date.parse(attempt.started_at);
  const deadline=Date.parse(attempt.deadline_at)-(current.server_now-Date.now());
  const currentSession=token;
  const storage=sessionStorage;
  const legacyKey='cortex-student-draft:v1:'+currentId+':'+current.student_number;
  if(current.reassigned_number)try{storage.removeItem(legacyKey)}catch{}
  const draftKey='cortex-student-draft:v2:'+currentId+':'+current.student_number+':'+attempt.started_at;
  const initialAnswers=recoverAnswers({attempt,key:draftKey,legacyKey,storage});
  const timerBox=E('div','cw-student-timer-bar');
  const timerText=E('strong','cw-student-timer-value');
  timerText.setAttribute('role','timer');
  timerBox.append(E('span','','⏱ Temps restant'),timerText);
  let mobileChronoValue=null,mobileChronoTab=null,mobileChronoNotice=null;
  let expiryNotified=false, receiptRetry=null;
  const refreshTimer=()=>{
   const remain=Math.max(0,deadline-Date.now());
   const secs=Math.ceil(remain/1000);
   const time=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
   timerText.textContent=time;
   timerText.classList.toggle('cw-student-timer-warning',remain<=300000);
   if(mobileChronoValue)mobileChronoValue.textContent=time;
   if(mobileChronoTab){
    mobileChronoTab.classList.toggle('is-urgent',remain>0&&remain<=300000);
    mobileChronoTab.classList.toggle('is-expired',remain===0);
   }
   if(mobileChronoNotice){
    mobileChronoNotice.textContent=remain===0?'Temps écoulé. Ta copie est remise automatiquement.':
     remain<=300000?'Attention : il reste moins de 5 minutes.':
     'Le chronomètre continue pendant que tu réponds aux questions.';
   }
   if(!remain&&!expiryNotified){
    expiryNotified=true;
    if(countdownInterval){clearInterval(countdownInterval);countdownInterval=null;}
    form.inert=true;
    stopIntegrity();
    message('Temps écoulé. Le serveur remet ta dernière sauvegarde.');
    void showReceipt();
   }
  };
  if(isPhoneExam){
   // Un onglet fixe, consultable depuis n'importe quelle question sans
   // démonter le formulaire ni interrompre le chronomètre.
   const dock=E('aside','cw-mobile-chrono-dock');
   const tab=E('button','cw-mobile-chrono-tab','⏱ Chrono');
   tab.type='button';
   tab.setAttribute('aria-controls','cw-mobile-chrono-panel');
   tab.setAttribute('aria-expanded','false');
   tab.setAttribute('aria-label','Afficher le temps restant du contrôle');
   const panel=E('section','cw-mobile-chrono-panel');
   panel.id='cw-mobile-chrono-panel';
   panel.hidden=true;
   panel.setAttribute('role','region');
   panel.setAttribute('aria-label','Temps restant du contrôle');
   const title=E('span','cw-mobile-chrono-title','⏱ Temps restant');
   mobileChronoValue=E('strong','cw-mobile-chrono-time');
   mobileChronoValue.setAttribute('role','timer');
   mobileChronoNotice=E('p','cw-mobile-chrono-notice');
   panel.append(title,mobileChronoValue,mobileChronoNotice);
   tab.addEventListener('click',()=>{
    const opening=panel.hidden;
    panel.hidden=!opening;
    tab.setAttribute('aria-expanded',String(opening));
    tab.setAttribute('aria-label',opening?'Masquer le chronomètre':'Afficher le temps restant du contrôle');
    if(opening)refreshTimer();
   });
   mobileChronoTab=tab;
   dock.append(tab,panel);
   work.append(dock);
  }
  work.append(timerBox);
  const form=E('form','cw-answer-form');
  const examGuard={key:timerKey,startedAt:localStarted,root:work,settings,
    subjectSelector:'.cw-student-subject, .cw-answer-question',
    assessmentId:currentId,studentNumber:current.student_number};
  function startIntegrity(){
   guard.setActive(examGuard);
   if(settings.enabled===true&&settings.trackLive===true){
    presence.setActive({key:draftKey,session:currentSession,assessmentId:exam.id,deadline});
   }else presence.setActive();
  }
  const questions=exam.questions?.length?exam.questions:[{id:'general',prompt:'Ma réponse / mon travail'}];
  if(isPhoneExam)mobileController=installMobileExam({form,questions,exam,current,initialAnswers,onNavigate:()=>draftEditor?.update(true),canNavigate:()=>!photoManager?.busy});
  else{
  for(let i=0;i<questions.length;i++){
   const q=questions[i],label=E('div','cw-answer-question');
   label.id='cw-student-question-'+(i+1);
   label.append(E('strong','',(i+1)+'. '+q.prompt));
   if(q.page&&current.subject)label.append(E('small','cw-doc-ref','Document original · page '+q.page));
   const related=(exam.assets||[]).filter(a=>(q.assetIds||[]).includes(a.id)&&a.url);
   if(related.length){
    const sourceBox=E('div','cw-student-source-snippets');
    sourceBox.append(E('strong','','Documents fournis pour cette question'));
    for(const asset of related)sourceBox.append(sourceFigure(asset));
    label.append(sourceBox);
   }
   // Documents visuels du contrôle IST de 1AGORA2 : restitution des éléments
   // graphiques historiques et des encadrés, sans injecter de HTML depuis la base.
   const istVisual=window.CORTEX_IST_VISUALS?.render?.(q);
   if(istVisual)label.append(istVisual);
   else if(q.doc)label.append(E('div','cw-student-question-doc',q.doc));
   const answerArea=E('div','cw-question-response');
   answerArea.innerHTML=window.CORTEX_QUESTION_TYPES.studentFields(q,initialAnswers[q.id]??'');
   label.append(answerArea);form.append(label);
  }
  }
  const upload=E('label','cw-student-attachment'),file=E('input');file.type='file';file.accept='.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp';
  upload.append(E('strong','','Joindre ma copie (facultatif)'),file,E('small','','PDF, Word, TXT ou image, 8 Mo maximum.'));
  const attachmentName=E('small');
  const removeAttachment=E('button','cw-outline','Retirer le fichier');
  removeAttachment.type='button';
  const draftStatus=E('p','cw-draft-status','Tes réponses sont sauvegardées pendant le contrôle.');
  draftStatus.setAttribute('role','status');
  form.append(upload,attachmentName,removeAttachment,draftStatus);
  upload.append(E('small','','Les photos manuscrites sont ajoutées sous chaque question et ne peuvent pas être combinées avec une autre pièce jointe.'));
  function updateAttachment(name){
   attachmentName.textContent=name?'Fichier sauvegardé : '+name:'';
   removeAttachment.hidden=!name;
  }
  updateAttachment(attempt.file_name);
  // La boîte native confirm() est peu fiable dans certains webviews/iPhone.
  // Une étape de validation visible empêche le faux « bouton qui ne fait rien ».
  // Les réponses et le brouillon restent conservés jusqu'à réception serveur.
  form.noValidate=true;
  const submit=E('button','cw-student-submit','Remettre définitivement mon contrôle →');
  submit.type='button';
  const confirmBox=E('section','cw-submit-confirmation');
  confirmBox.hidden=true;
  confirmBox.setAttribute('role','group');
  confirmBox.setAttribute('aria-label','Confirmation définitive de la copie');
  const confirmTitle=E('strong','','Dernière vérification avant remise');
  const confirmDetails=E('p','','');
  const confirmActions=E('div','cw-submit-actions');
  const confirmSend=E('button','cw-student-submit','Oui, envoyer définitivement ma copie');
  confirmSend.type='button';
  const cancelSend=E('button','cw-outline','Annuler — garder ma copie');
  cancelSend.type='button';
  confirmActions.append(confirmSend,cancelSend);
  confirmBox.append(confirmTitle,confirmDetails,confirmActions);
  const submissionStatus=E('p','cw-submit-local-status');
  submissionStatus.setAttribute('role','status');
  submissionStatus.setAttribute('aria-live','polite');
  submissionStatus.hidden=true;
  form.append(submit,confirmBox,submissionStatus);
  function submissionMessage(value,error=false){
   submissionStatus.textContent=value||'';
   submissionStatus.hidden=!value;
   submissionStatus.classList.toggle('error',!!error);
   if(value)submissionStatus.scrollIntoView({block:'nearest',behavior:'auto'});
  }
  function collectAnswers(){
   if(mobileController)return mobileController.getAnswers();
   const wrappers=new Map([...form.querySelectorAll('[data-cortex-q]')]
    .map(w=>[w.dataset.cortexQ,w]));
   return Object.fromEntries(questions.map(q=>[q.id,
    String(wrappers.has(q.id)?window.CORTEX_QUESTION_TYPES.readAnswer(wrappers.get(q.id),q):'')]));
  }
  async function showReceipt(){
   if(current!==view||token!==currentSession)return;
   try{
    const receipt=await api('student_get',{session:currentSession,assessment_id:exam.id});
    if(current!==view||token!==currentSession)return;
    if(receipt.submission){
     await photoManager?.forget();
     draftEditor?.finish();
     current=receipt;
     renderExam();
     message('✓ Copie bien reçue par le professeur.');
     return;
    }
   }catch{
    if(current!==view||token!==currentSession)return;
    message('Le reçu est indisponible. La vérification reprendra automatiquement.',true);
   }
   clearTimeout(receiptRetry);
   receiptRetry=setTimeout(showReceipt,5000);
  }
  const editor=createStudentDraft({
   attempt,key:draftKey,legacyKey,storage,initialAnswers,collect:collectAnswers,
   request:(action,payload,attachment)=>api(action,{session:currentSession,assessment_id:exam.id,...payload},attachment),
   onStatus:(text,error=false)=>{
    draftStatus.textContent=text;draftStatus.classList.toggle('error',error);
   },
   onReceipt:()=>{void showReceipt()},
   onAttachment:updateAttachment
  });
  draftEditor=editor;
  const saveNow=()=>editor.update(true);
  const onVisibility=()=>{if(document.visibilityState==='hidden')saveNow();else refreshTimer()};
  form.addEventListener('input',()=>editor.update());
  form.addEventListener('change',event=>{if(event.target!==file)saveNow()});
  form.addEventListener('focusout',event=>{
   const question=event.target.closest('.cw-answer-question');
   if(question&&!question.contains(event.relatedTarget))saveNow();
  });
  file.addEventListener('change',()=>{
   const chosen=file.files?.[0];
   if(!chosen)return;
   if(photoManager?.busy||photoManager?.count()){
    file.value='';submissionMessage('Des photos manuscrites sont déjà présentes. Retire-les avant de joindre un autre fichier.',true);return;
   }
   if(chosen.size>8*1024*1024){file.value='';submissionMessage('Le fichier dépasse 8 Mo.',true);return}
   editor.attach(chosen);
  });
  removeAttachment.addEventListener('click',()=>{file.value='';editor.attach(null)});
  window.addEventListener('pagehide',saveNow);
  window.addEventListener('online',saveNow);
  document.addEventListener('visibilitychange',onVisibility);
  clearDraftListeners=()=>{
   window.removeEventListener('pagehide',saveNow);
   window.removeEventListener('online',saveNow);
   document.removeEventListener('visibilitychange',onVisibility);
   clearTimeout(receiptRetry);
  };
  async function openConfirmation(){
   if(busy)return;
   if(photoManager?.busy){submissionMessage('Attends l’enregistrement de ta photo avant de remettre ta copie.');return;}
   try{
    await photoManager?.flush();
    if(photoManager?.count()&&!String(editor.attachment).startsWith('CORTEX_Manuscrit_')){
     submissionMessage('Le PDF de tes photos est encore en préparation. Vérifie la sauvegarde, puis réessaie.',true);return;
    }
    const answers=collectAnswers(),attached=editor.attachment;
    const completed=Object.values(answers).filter(v=>String(v??'').trim()).length;
    if(!completed&&!attached){
     submissionMessage('Aucune réponse à envoyer. Réponds à au moins une question ou joins un fichier.',true);
     return;
    }
    submissionMessage('');
    confirmDetails.textContent='Tu as saisi '+completed+' réponse(s) sur '+questions.length+' questions'+
     (photoManager?.count()?' et joint '+photoManager.count()+' photo(s) manuscrite(s) par question.':attached?' et joint un fichier.':'.')+
     ' Après envoi, tu ne pourras plus modifier ta copie. Confirmer ?';
    submit.hidden=true;
    confirmBox.hidden=false;
    confirmBox.scrollIntoView({block:'center',behavior:'auto'});
    confirmSend.focus({preventScroll:true});
   }catch(error){
    submissionMessage('Impossible de préparer la remise : '+String(error?.message||error),true);
   }
  }
  submit.addEventListener('click',openConfirmation);
  form.addEventListener('submit',event=>{event.preventDefault();openConfirmation()});
  cancelSend.addEventListener('click',()=>{
   if(busy)return;
   confirmBox.hidden=true;submit.hidden=false;
   submissionMessage('Remise annulée. Tes réponses sont conservées.');
  });
  confirmSend.addEventListener('click',async()=>{
   if(busy)return;
   busy=true;
   confirmSend.disabled=true;cancelSend.disabled=true;submit.disabled=true;
   confirmBox.hidden=true;submit.hidden=false;
   submit.textContent='Enregistrement de la copie en cours…';
   submissionMessage('Envoi sécurisé en cours. Ne ferme pas cette page.');
   let sent=false;
   const examId=currentId;
   try{
    await photoManager?.flush();
    const answers=collectAnswers();
    if(!Object.values(answers).some(v=>String(v??'').trim())&&!editor.attachment)
     throw Error('La copie est vide : réponds à une question avant de l’envoyer.');
    // Arrêter la surveillance uniquement lorsque l'envoi commence, pas au clic initial.
    stopIntegrity();
    await editor.submit();
    await photoManager?.forget();
    sent=true;
    submissionMessage('✓ Copie bien enregistrée. Ouverture du reçu…');
    try{
     await loadExam(examId);
     message('✓ Copie bien reçue par le professeur.');
    }catch(refreshError){
     submissionMessage('✓ Ta copie est enregistrée, mais le reçu n’a pas pu se recharger. Actualise la page puis reconnecte-toi pour le consulter.');
     message('La copie a été enregistrée. Recharge ton espace pour voir le reçu.');
    }
   }catch(error){
    if(!expiryNotified)startIntegrity();
    const detail=String(error?.message||error||'Erreur inconnue');
    submissionMessage('Envoi impossible : '+detail+' Tes réponses sont conservées. Tu peux réessayer.',true);
   }finally{
    busy=false;
    confirmSend.disabled=false;cancelSend.disabled=false;
    if(!sent){
     submit.disabled=false;
     submit.textContent='Réessayer de remettre ma copie →';
    }else{
     submit.disabled=true;
     submit.textContent='✓ Copie enregistrée';
    }
   }
  });
  work.append(form);
  const handwritingNote=E('aside','cw-handwriting-banner');
  handwritingNote.append(E('strong','','✎ Photographier une réponse écrite à la main'),
    E('p','','Sous chaque question, prends une photo de ta réponse sur papier (caméra ou fichier image). Les photos sont réunies dans un PDF joint à la copie et consultable par ton professeur. Tu peux aussi saisir du texte.'));
  form.prepend(handwritingNote);
  photoManager=createHandwritingManager({
   form,questions,key:draftKey+':handwriting',
   restoreAttachment:!editor.attachment||String(editor.attachment).startsWith('CORTEX_Manuscrit_'),
   onAttach:pdf=>editor.attach(pdf),
   onRemove:()=>editor.attach(null),
   onChange:ids=>mobileController?.setPhotoQuestions(ids),
   onStatus:(text,error=false)=>{draftStatus.textContent=text;draftStatus.classList.toggle('error',error)},
   canAdd:()=>!editor.attachment||(String(editor.attachment).startsWith('CORTEX_Manuscrit_')&&photoManager?.count()>0),
   onCameraOpen:()=>{guard.setActive();presence.setActive()},
   onCameraClose:()=>{if(!expiryNotified&&Date.now()<deadline)startIntegrity()}
  });
  if(settings.enabled&&settings.watermarkCapture){
   const mark=E('div','cw-student-watermark');
   mark.setAttribute('aria-hidden','true');
   const classCode=String(classData?.class?.code||validatedLink?.class_code||current.assessment?.class_code||current.class_code||'CLASSE').slice(0,22);
   const candidate='CORTEX · '+classCode+' · N°'+String(current.student_number||'—').slice(0,4);
   const warning='CONTRÔLE EN COURS · AIDE IA INTERDITE';
   // 48 marques réparties sur le viewport : plus de grands rectangles sans trace.
   // Un marquage répété dissuade et permet d'identifier une copie partagée,
   // mais ne bloque ni une capture du système ni une photo externe.
   for(let i=0;i<48;i++)mark.append(E('span','',i%4===0?warning:candidate+' · AIDE IA INTERDITE'));
   // Le calque est monté directement sur <body> pour éviter les zones découpées
   // par un conteneur à overflow:hidden ou un ancêtre positionné/transformé.
   document.body.append(mark);examWatermark=mark;
  }
  startIntegrity();
  refreshTimer();
  if(!expiryNotified){
   countdownInterval=setInterval(refreshTimer,1000);
   editor.update();
  }
 }
 const loginForm=$('cw-student-login-form'),activationForm=$('cw-student-activation-form');
 const loginTab=$('cw-back-to-login'),createTab=$('cw-show-activation');
 const toggleActivation=activated=>{
  activationForm.hidden=!activated;loginForm.hidden=activated;
  loginTab.classList.toggle('is-selected',!activated);createTab.classList.toggle('is-selected',activated);
  loginTab.setAttribute('aria-pressed',String(!activated));createTab.setAttribute('aria-pressed',String(activated));
  if(activated){
   if(mode==='class'&&!validatedLink)$('cw-activation-class').value=$('cw-student-class')?.value||'';
   if(!validatedLink?.student_number&&$('cw-student-number').value)$('cw-activation-number').value=$('cw-student-number').value;
   if(!registrationToken)$('cw-activation-number').focus();
  }else{
   if(mode==='class')$('cw-student-class').value=$('cw-activation-class')?.value||'';
   if($('cw-activation-number').value)$('cw-student-number').value=$('cw-activation-number').value;
   $('cw-student-number').focus();
  }
  message('');
 };
 createTab.addEventListener('click',()=>toggleActivation(true));
 loginTab.addEventListener('click',()=>toggleActivation(false));
 for(const reveal of document.querySelectorAll('.cw-pin-eye')){
  reveal.addEventListener('click',()=>{
   const input=$(reveal.getAttribute('aria-controls'));if(!input)return;
   const show=input.type==='password';input.type=show?'text':'password';
   reveal.textContent=show?'Masquer':'Afficher';
   reveal.setAttribute('aria-label',show?'Masquer le PIN':'Afficher le PIN');
  });
 }
 activationForm.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!linkReady)return;
  const submit=event.currentTarget.querySelector('[type="submit"]');
  const number=Number($('cw-activation-number').value);
  const pin=$('cw-activation-new-pin').value;
  const confirmPin=$('cw-activation-confirm-pin').value;
  if(!/^\d{6}$/.test(pin)||pin!==confirmPin){
   message('Ton PIN doit contenir 6 chiffres et être identique dans les deux champs.',true);return;
  }
  const group=Number($('cw-activation-group').value);
  if(![1,2].includes(group)){
   message('Choisis ton demi-groupe 1 ou 2 avant de créer ton PIN.',true);
   $('cw-activation-group').focus();return;
  }
  busy=true;submit.disabled=true;
  try{
   const classCode=mode==='class'?(validatedLink?.portal_code||$('cw-activation-class').value):'';
   await enter('student_pin_setup',{class_code:classCode,join_code:qr||'',student_number:number,
    demi_groupe:group,pin,confirm_pin:confirmPin,registration_token:registrationToken});
   const result=mode==='qr'
    ?await enter('student_login',{code:qr,student_number:number,pin})
    :await enter('student_class_login',{class_code:classCode,student_number:number,pin});
   $('cw-activation-new-pin').value='';$('cw-activation-confirm-pin').value='';
   token=result.session;sessionStorage.setItem(storageKey,token);
   if(registrationToken){
    const cleanUrl=new URL(location.href);cleanUrl.searchParams.delete('inscription');
    if(new URLSearchParams(cleanUrl.hash.slice(1)).has('inscription'))cleanUrl.hash='';
    history.replaceState(null,'',cleanUrl.pathname+cleanUrl.search+cleanUrl.hash);
   }
   if(mode==='qr')await loadExam();else await loadClass();
   message('PIN créé ! Tu es inscrit en demi-groupe '+group+'. Tu retrouveras ton espace avec ton numéro et ce même PIN.');
  }catch(err){
   message(err.message||'Création de PIN impossible. Vérifie que le professeur a ouvert les inscriptions.',true);
  }finally{busy=false;submit.disabled=false}
 });
 loginForm.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const submit=one('button[type="submit"]',event.currentTarget);busy=true;submit.disabled=true;
  try{
   const n=Number($('cw-student-number').value),pin=$('cw-student-pin').value;
   const result=mode==='qr'
    ?await enter('student_login',{code:qr,student_number:n,pin})
    :await enter('student_class_login',{class_code:$('cw-student-class').value,student_number:n,pin});
   token=result.session;sessionStorage.setItem(storageKey,token);$('cw-student-pin').value='';
   if(mode==='qr')await loadExam();else await loadClass();
  }catch(err){message(err.message||'Identification impossible. Tu n’as pas encore de PIN ? Clique sur « Je crée mon PIN ».',true)}
  finally{busy=false;submit.disabled=false}
 });
 const activationSubmit=activationForm.querySelector('[type="submit"]');
 if(registrationToken){toggleActivation(true);activationSubmit.disabled=true;}
 // Présentation explicite de la classe portée par le QR ou l'invitation.
 // La réponse du serveur valide le code opaque et empêche les confusions entre classes.
 if(qr||registrationToken){
  enter('student_link_info',{join_code:qr||'',registration_token:registrationToken}).then(info=>{
   const banner=$('cw-student-link-target');
   banner.hidden=false;
   if(registrationToken&&classPrefill&&info.portal_code!==classPrefill){
    banner.textContent='Invitation de classe incohérente.';
    message('Lien incohérent : la classe sélectionnée ne correspond pas à l’invitation. Demande un nouveau lien au professeur.',true);
    activationSubmit.disabled=true;
    return;
   }
   validatedLink=info;
   linkReady=!!info.registration_open;
   applyLinkedClass();
   banner.textContent=info.class_code+' · '+info.class_name+
    (info.student_number?' · Lien individuel pour le n° '+info.student_number:' · Classe du '+(qr?'QR code':'lien'));
   if(info.student_number){
    for(const id of ['cw-activation-number','cw-student-number']){
     $(id).value=String(info.student_number);
     $(id).readOnly=true;
    }
    if([1,2].includes(info.demi_groupe)){
     $('cw-activation-group').value=String(info.demi_groupe);
     $('cw-activation-group').disabled=true;
    }
    const heading=activationForm.querySelector('.cw-activation-heading');
    heading.querySelector('h2').textContent=info.invitation_purpose==='reset'?'Je choisis un nouveau PIN.':'Je crée mon PIN.';
    heading.querySelector('p').textContent='Choisis six chiffres et confirme ton PIN pour accéder à ton espace élève.';
   }
   if(!linkReady)banner.textContent+=' · Création des PIN fermée';
   activationSubmit.disabled=!linkReady;
  }).catch(err=>{
   message('Impossible de vérifier la classe du lien : '+String(err.message||err),true);
   activationSubmit.disabled=true;
  });
 }
 const restored=sessionStorage.getItem(storageKey);
 if(mode==='class')getClasses();
 // Sur téléphone ou ordinateur partagé, ouvrir une invitation doit TOUJOURS
 // permettre de créer un nouvel accès, sans restaurer la session d'un autre élève.
 if(registrationToken&&restored)sessionStorage.removeItem(storageKey);
 if(restored&&!registrationToken){
  token=restored;
  (mode==='qr'?loadExam():loadClass()).catch(err=>{reset();message('Merci de confirmer de nouveau ton PIN. '+String(err.message||''),true)});
 }
 function saveEventQueue(){
  try{
   if(pendingEvents.length)sessionStorage.setItem(eventQueueKey,JSON.stringify(pendingEvents));
   else sessionStorage.removeItem(eventQueueKey);
  }catch{}
 }
 function queueEvent(event,{assessmentId,studentNumber}){
  const report={...event,assessmentId,studentNumber,id:integrity.eventId()};
  pendingEvents=[...pendingEvents,report].slice(-60);
  saveEventQueue();
  flushEvents();
 }
 async function flushEvents(){
  if(sendingEvents||!token||!currentId||navigator.onLine===false||document.hidden)return;
  clearTimeout(eventRetry);
  const session=token,assessment=currentId,number=current?.student_number;
  const now=Date.now();
  pendingEvents=pendingEvents.filter(event=>event?.at<=now&&now-event.at<=integrity.MAX_EVENT_AGE_MS);
  saveEventQueue();
  sendingEvents=true;
  try{
   while(token===session&&currentId===assessment&&!document.hidden){
    const event=pendingEvents.find(item=>item.assessmentId===assessment&&item.studentNumber===number);
    if(!event)break;
    await api('student_event',{session,assessment_id:assessment,event_id:event.id,kind:event.kind,
     duration_ms:event.durationMs,age_ms:Math.max(0,Date.now()-event.at)});
    pendingEvents=pendingEvents.filter(item=>item.id!==event.id);
    saveEventQueue();
   }
  }catch{
   // Les réponses restent utilisables pendant une coupure et les événements sont renvoyés au retour.
   eventRetry=setTimeout(flushEvents,10000);
  }finally{
   sendingEvents=false;
   if(currentId!==assessment||token!==session)flushEvents();
  }
 }
 window.addEventListener('online',flushEvents);
 window.addEventListener('pageshow',flushEvents);
 document.addEventListener('visibilitychange',flushEvents);
}
