(function demoModule(){
'use strict';
const KEY='cortex-evaluations-demo-2026-v3';
function makeSeed(){
  const example=window.CORTEX_DOCS?.demoExam;
  return {exams:example?[JSON.parse(JSON.stringify(example))]:[],
    attempts:example?[{
    id:'ex-pdf-demo',examId:'sommeil-pdf-a2',name:'Élève Démo · Copie PDF',status:'submitted',
    startedAt:Date.now()-5300000,submittedAt:Date.now()-1500000,grade:null,feedback:'',
    interruptions:1,answers:{
      pdfq1:'Il manque 4 heures de sommeil chaque nuit : 8 − 4 = 4 h.',
      pdfq2:'Il joue en ligne jusqu’à 1 h 30 et boit une boisson énergisante vers 21 h.',
      pdfq3:'Il se concentre mal en classe et se dispute avec ses amis.',
      pdfq4:'Comment Dylan pourrait-il retrouver un sommeil suffisant ?',
      pdfq5:'Un rythme biologique est un phénomène naturel qui se répète. Sa fréquence est le nombre de répétitions dans un temps donné.',
      pdfq6:'Ultradien | Circadien | Infradien',
      pdfq7:'L’entraînement du mardi dépend d’un horaire de vie, pas d’un phénomène physiologique.',
      pdfq8:'Environ 90 minutes.',
      pdfq9:'7 h 30 = 450 minutes. 450 / 90 = 5 cycles.',
      pdfq10:'lent profond | paradoxal',
      pdfq11:'Le sommeil aide le cerveau à mémoriser les connaissances apprises pendant la journée.',
      pdfq12:'Fatigue et irritabilité.',
      pdfq13:'Il se dispute avec ses amis et ne va plus au football.',
      pdfq14:'Un risque accru d’AVC et une baisse de mobilité des spermatozoïdes chez les adultes étudiés.',
      pdfq15:'La somnolence peut faire commettre une erreur ou provoquer un accident au travail.',
      pdfq16:'La mélatonine favorise l’endormissement ; la lumière d’un écran peut retarder sa production.',
      pdfq17:'Il passe d’horaires de vacances très tardifs à des horaires de cours matinaux.',
      pdfq18:'Camille dort difficilement à cause de la lumière et voit moins ses proches.',
      pdfq19:'Un repos compensateur ; le C2P peut donner des points pour une formation.',
      pdfq20:'Arrêter les écrans avant de se coucher et garder des horaires réguliers.'
    }
  }]:[],
    events:example?[{id:'event-pdf-demo',attemptId:'ex-pdf-demo',kind:'simulation',at:Date.now()-3600000,durationMs:26000}]:[],
    activeAttemptId:null};
}
function load(){
try{
 const v=JSON.parse(localStorage.getItem(KEY));
 if(v&&Array.isArray(v.exams)&&Array.isArray(v.attempts)&&Array.isArray(v.events)){
  const sample=v.events.find(event=>event.id==='event-pdf-demo'&&event.kind==='visibility');
  if(sample)Object.assign(sample,{kind:'simulation',durationMs:26000});
  return v;
 }
}catch(e){}
return makeSeed();
}
let state=window.CORTEX_CLASSES.init(load()),view='home',tab='dashboard',currentQuestion=0,editor=null,search='',toastTimer=null,chosenCode='SOMMEILPDF',pendingImport=null,importNewExamId=null,previewFileUrl=null,reviewAttemptId=null,reviewIndex=0,editorIndex=0,editorDocTab='documents',importExamId=null,visualPage=1,visualQuestionId=null,selectedClassId='2mrc1',teacherClassFilter='',teacherGroupFilter='',studentAssignmentId=null,studentQrToken=null,studentRollNumber='',studentSession=null,studentPinBusy=false,portalSession=null,portalPreviewState=null,portalLoginBusy=false,portalPeriod='s1',portalYear=null,portalCopyId=null,currentQrAssignmentId=null,integritySetupId='';
let stageWorkspace=null;
let handwriting=null;
const handwritingModule=()=>import('../evaluations-academie/student-handwriting.js?v=1.3');
const photoKey=attempt=>'demo-cortex:'+attempt.id;
const hasPhoto=(attempt,question)=>attempt.photoQuestions?.includes(question.id)===true;
const answeredQuestion=(attempt,question)=>Boolean(String(attempt.answers[question.id]??'').trim())||hasPhoto(attempt,question);
function photoReview(attempt,question){
 return hasPhoto(attempt,question)?'<button type="button" class="btn secondary small" data-action="demo-photo-pdf" data-id="'+esc(attempt.id)+'" data-question="'+esc(question.id)+'">Ouvrir la réponse manuscrite (PDF)</button>':'';
}
let monitorExamId='';
const guard=window.CORTEX_EXAM_INTEGRITY.create({
 storageKey:KEY+':sortie',onEvent:recordIntegrityEvent,onNotice:showToast
});
const PSE_DEMO_ASSIGNMENT='demo-pse-sans-compte-60',PSE_DEMO_TOKEN='DEMO-PSE-60-MINUTES',PSE_DEMO_CLASS='2mrc1',PSE_PREVIEW_STORAGE='cortex-pse-preview-session-1';
function persistPsePreview(){
 try{
  if(studentSession?.demoPreview)sessionStorage.setItem(PSE_PREVIEW_STORAGE,JSON.stringify({assignmentId:studentSession.assignmentId,number:studentSession.number,at:Date.now()}));
  else sessionStorage.removeItem(PSE_PREVIEW_STORAGE);
 }catch{}
}
function restorePsePreview(){
 try{
  const v=JSON.parse(sessionStorage.getItem(PSE_PREVIEW_STORAGE)||'null');
  if(v?.assignmentId!==PSE_DEMO_ASSIGNMENT||v.number!=='12'||Date.now()-Number(v.at)>3*60*60*1000)return;
  const a=state.assignments.find(x=>x.id===PSE_DEMO_ASSIGNMENT&&x.examId==='sommeil-pdf-a2'&&x.token===PSE_DEMO_TOKEN&&x.classId===PSE_DEMO_CLASS&&x.active);
  if(!a)return;
  studentSession={demoPreview:true,assignmentId:a.id,classId:a.classId,number:'12'};
  studentAssignmentId=a.id;studentQrToken=a.token;studentRollNumber='12';
 }catch{}
}
restorePsePreview();
const root=document.getElementById('app'),toast=document.getElementById('toast'),modal=document.getElementById('modal');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=v=>esc(v);
const sum=exam=>exam.questions.reduce((a,q)=>a+Number(q.points||0),0);
const date=ms=>new Date(ms).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const examBy=id=>state.exams.find(e=>e.id===id);
const attemptBy=id=>state.attempts.find(a=>a.id===id);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){showToast('Stockage local indisponible : les changements ne sont pas conservés.')}};
const btn=(label,action,kind='secondary',extra='')=>`<button type="button" class="btn ${kind} ${extra}" data-action="${action}">${label}</button>`;
const pill=(label,cls='')=>`<span class="status ${cls}">${esc(label)}</span>`;
const short=(v,n=85)=>esc(String(v||'').length>n?String(v).slice(0,n)+'…':v);
function showToast(msg){toast.textContent=msg;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);}
function nav(next,t){const route=next==='home'?'accueil':next==='teacher'?'professeur/'+(t||'dashboard'):'eleve/'+(t||'accueil');location.hash='#'+route;routePage();}
function routePage(){
const bits=decodeURIComponent(location.hash.slice(1)||'accueil').split('/');
view=bits[0]==='professeur'?'teacher':bits[0]==='eleve'?'student':'home';
tab=bits[1]|| (view==='teacher'?'dashboard':'accueil');
if(view==='teacher'&&tab==='corriger')reviewAttemptId=bits[2]||reviewAttemptId;
if(view==='student'&&(tab==='rejoindre'||tab==='pin'||tab==='pret')){
 const nextAssignment=bits[2]||null,nextToken=bits[3]||null;
 if(studentAssignmentId!==nextAssignment||studentQrToken!==nextToken){studentRollNumber='';studentSession=null;}
 studentAssignmentId=nextAssignment;studentQrToken=nextToken;
 // Un QR public de la démo doit aussi fonctionner dans un navigateur vierge.
 if(tab==='rejoindre' && bits.length>=7 && window.CORTEX_CLASSES.hydrateQrDemo(state,bits.slice(2,7)))save();
}
if(view==='student'&&(tab==='espace'||tab==='correction')&&!portalAuthorized()){portalSession=null;tab='accueil';}
if(view==='student'&&(tab==='examen'||tab==='termine')){
  const ongoing=attemptBy(state.activeAttemptId),assignment=state.assignments.find(a=>a.id===ongoing?.assignmentId);
  if(!ongoing||!authorized(assignment,ongoing.studentNumber)){
   if(assignment){studentAssignmentId=assignment.id;studentQrToken=assignment.token;studentRollNumber='';tab='rejoindre';}
   else tab='accueil';
  }
}
if(view!=='student'){studentSession=null;portalSession=null;persistPsePreview();}
if(view==='student'&&tab==='accueil'){studentAssignmentId=null;studentQrToken=null;studentRollNumber='';studentSession=null;persistPsePreview();}
render();
}
function header(){
document.querySelectorAll('.top-link').forEach(el=>{
 const active=el.dataset.action===view;
 el.classList.toggle('active',active);
 if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
});
}
function render(){
header();
const stages=view==='student'&&tab==='stages';
if(stages&&stageWorkspace&&document.getElementById('cortex-demo-stages'))return;
stageWorkspace?.dispose();
stageWorkspace=null;
handwriting?.dispose();
handwriting=null;
if(view==='teacher')root.innerHTML=teacherShell();
else if(view==='student')root.innerHTML=studentShell();
else root.innerHTML=home();
const monitoredAttempt=view==='student'&&tab==='examen'?activeAttempt():null;
const examGuard=monitoredAttempt?.status==='progress'&&authorizedAttempt(monitoredAttempt)?{
 key:monitoredAttempt.id,startedAt:monitoredAttempt.startedAt,root,subjectSelector:'.exam-question',
 settings:window.CORTEX_INTEGRITY.config(examBy(monitoredAttempt.examId))
}:null;
guard.setActive(examGuard);
if(examGuard){
 const exam=examBy(monitoredAttempt.examId);
 const card=root.querySelector('.exam-question');
 const question=exam.questions[currentQuestion];
 if(card&&question){
  const panel=document.createElement('div');
  panel.id='cw-student-question-'+(currentQuestion+1);
  panel.className='cw-answer-question';
  const status=document.createElement('p');
  status.className='cw-handwriting-hint';
  status.setAttribute('role','status');
  card.querySelector('.exam-nav').before(panel,status);
  handwritingModule().then(({createHandwritingManager})=>{
   if(!panel.isConnected)return;
   handwriting=createHandwritingManager({
    form:card,questions:exam.questions,key:photoKey(monitoredAttempt),
    onCameraOpen:()=>guard.setActive(),
    onCameraClose:()=>{if(panel.isConnected)guard.setActive(examGuard)},
    onStatus:(text,error)=>{if(panel.isConnected){status.textContent=text;status.classList.toggle('is-error',Boolean(error));}},
    onChange:ids=>{
     monitoredAttempt.photoQuestions=[...new Set(ids)];save();
     const total=exam.questions.filter(q=>answeredQuestion(monitoredAttempt,q)).length;
     root.querySelector('.exam-top strong').textContent='Ta progression : '+total+' / '+exam.questions.length+' réponses';
     root.querySelector('.exam-progress span').style.width=total/exam.questions.length*100+'%';
     root.querySelectorAll('.question-dot').forEach((dot,i)=>dot.classList.toggle('answered',answeredQuestion(monitoredAttempt,exam.questions[i])));
     status.textContent='Photos enregistrées sur cet appareil.';
    }
   });
  }).catch(()=>{if(panel.isConnected)status.textContent='Le chargement de l’outil photo a échoué. Actualise la page.';});
 }
}
if(view==='teacher'&&tab==='suivi')mountDemoMonitor();
if(view==='student'&&window.CORTEX_ALBERT_TOOLS?.hydrate)window.CORTEX_ALBERT_TOOLS.hydrate();
if(stages){
 const area=document.getElementById('cortex-demo-stages');
 const activePortal=portalAuthorized()?portalSession:null;
 stageWorkspace=window.CORTEX_STAGE?.mount(area,{
  demo:true,
  className:activePortal?state.classes.find(c=>c.id===activePortal.classId)?.name||'':'',
  storageScope:activePortal&&!activePortal.demo?activePortal.classId+':'+activePortal.number:'',
  back:()=>nav('student',portalAuthorized()?'espace':'accueil')
 });
 area.querySelector('h1')?.focus();
}
document.title=(stages?'Recherche de PFMP':view==='teacher'?'Espace professeur':view==='student'?'Espace élève':'Accueil')+' · CORTEX Évaluations';
if(view==='teacher'&&tab==='creer'&&editor){
 window.CORTEX_DEMO_REAL_WORKSHOP.mount(editor,state.classes,editorIndex,async()=>{
  action({dataset:{action:'save-exam'}});
 });
}
if(view==='teacher'&&tab==='import'){
 const ve=examBy(importExamId);
 if(ve?.sourceId)Promise.resolve().then(()=>window.CORTEX_VISUAL.showOriginal(ve,visualPage,visualRecordCapture));
}
if(window.CORTEX_VISUAL)Promise.resolve().then(()=>window.CORTEX_VISUAL.hydrate(root));
if(view==='teacher'&&tab==='qr'&&window.CORTEX_CLASSES){
 const ass=state.assignments.find(a=>a.id===currentQrAssignmentId);
 if(ass)Promise.resolve().then(()=>window.CORTEX_CLASSES.drawQr(window.CORTEX_CLASSES.qrLink(ass),'class-qr-image').catch(e=>showToast(e.message)));
}
if(view==='teacher'&&tab==='creer'&&editor?.sourceId&&editor.sourceType==='docx'){
 Promise.resolve().then(()=>window.CORTEX_VISUAL.showWordSource(editor.sourceId,'editor-word-canvas'));
}
if(view==='teacher'&&tab==='corriger'){
 const at=attemptBy(reviewAttemptId),e=examBy(at?.examId);
 if(e?.sourceId&&e.sourceType==='docx'&&!(e.questions[reviewIndex]?.assetIds||[]).length)
  Promise.resolve().then(()=>window.CORTEX_VISUAL.showWordSource(e.sourceId,'review-word-canvas'));
}
if(view==='student'&&tab==='examen'){
 const at=activeAttempt(),e=examBy(at?.examId);
 if(e?.sourceId&&e.sourceType==='docx'&&!(e.questions[currentQuestion]?.assetIds||[]).length)
  Promise.resolve().then(()=>window.CORTEX_VISUAL.showWordSource(e.sourceId,'import-word-canvas'));
}
if(view==='teacher'&&tab==='creer'&&editorDocTab==='source'&&editor?.sourceId&&editor.sourceType==='pdf'){
  const selected=editor.questions[editorIndex],page=selected?.page||1;
  Promise.resolve().then(()=>window.CORTEX_DOCS.renderPdfOriginal(editor.sourceId,page,'editor-source-canvas'));
}
if(view==='teacher'&&tab==='corriger'){
 const at=attemptBy(reviewAttemptId),e=examBy(at?.examId);
 if(e?.sourceId&&e.sourceType==='pdf'){
  const page=e.questions[reviewIndex]?.page||1;
  Promise.resolve().then(()=>window.CORTEX_DOCS.renderPdfOriginal(e.sourceId,page,'review-source-canvas'));
 }
}
if(view==='student'&&tab==='examen'){
 const a=activeAttempt(),e=examBy(a?.examId);
 if(e?.sourceId&&e.sourceType==='pdf'){
  const pageNo=e.questions[currentQuestion]?.page||1;
  Promise.resolve().then(()=>window.CORTEX_DOCS.renderPdfOriginal(e.sourceId,pageNo,'import-original-canvas'));
 }
}
}
function home(){
return `<div class="home cortex-focus-home">
 <section class="cortex-focus-hero" aria-labelledby="cortex-focus-title">
  <div class="cortex-focus-copy">
   <span class="cortex-focus-kicker">CORTEX · STATION NOCTIS</span>
   <h1 id="cortex-focus-title" class="cortex-home-new-headline">Moins de tâches répétitives.<br><em>Plus de temps pour apprendre.</em></h1>
   <p>Une plateforme pédagogique augmentée par l’IA pour créer des évaluations numériques à partir de PDF, obtenir un retour rapide après les contrôles, faciliter les corrections et accompagner chaque élève dans sa recherche de PFMP.</p>
   <div class="cortex-focus-actions">
    ${btn('Je suis élève <span aria-hidden="true">↗</span>','student','')}
    ${btn('Je suis professeur <span aria-hidden="true">↗</span>','teacher','secondary')}
   </div>
   <small class="cortex-focus-meta">Démonstration libre · Sans inscription · Données fictives</small>
  </div>
  <div class="cortex-focus-visual" aria-hidden="true">
   <div class="cortex-focus-halo"></div>
   <div class="cortex-focus-panel">
    <div class="cortex-focus-panel-top"><span>CORTEX / ÉVALUATION</span><span class="cortex-focus-dots"><i></i><i></i><i></i></span></div>
    <div class="cortex-focus-sheet">
     <span class="cortex-focus-sheet-tag">QUESTION 04 / 20</span>
     <strong>Comprendre.<br>Répondre.<br>Progresser.</strong>
     <div class="cortex-focus-lines"><i></i><i></i><i></i></div>
     <div class="cortex-focus-progress"><i></i></div>
    </div>
    <div class="cortex-focus-panel-bottom"><span>SESSION NOCTIS</span><b>● EN COURS</b></div>
   </div>
   <div class="cortex-focus-orbit-note"><small>Parcours</small><strong>Élève + prof</strong></div>
  </div>
 </section>
 <section class="cortex-home-strengths" aria-labelledby="cortex-home-strengths-title">
  <div class="cortex-home-strengths-head">
   <div><span class="cortex-home-strengths-kicker">SIX ATOUTS POUR APPRENDRE ET ENSEIGNER</span>
   <h2 id="cortex-home-strengths-title">Moins d’attente. <em>Plus d’accompagnement.</em></h2></div>
   <p>CORTEX relie la préparation des évaluations, les réponses des élèves et les retours pédagogiques, dans un même espace.</p>
  </div>
  <div class="cortex-home-strengths-grid">
   <article class="cortex-home-strength"><span class="cortex-home-strength-num">01 · ÉLÈVE</span><h3>Une estimation dès la fin du contrôle</h3><p>L’IA propose rapidement une note indicative et des conseils personnalisés. L’enseignant reste responsable de la correction et de la note définitive.</p></article>
   <article class="cortex-home-strength"><span class="cortex-home-strength-num">02 · ENSEIGNANT</span><h3>Du PDF au contrôle numérique</h3><p>Importe un sujet et transforme-le avec l’aide de l’IA en questions numériques, en conservant les documents à vérifier avant publication.</p></article>
   <article class="cortex-home-strength"><span class="cortex-home-strength-num">03 · ENSEIGNANT</span><h3>Une correction assistée par IA</h3><p>Obtiens des propositions de notation et des commentaires question par question pour corriger plus vite, tout en gardant le dernier mot.</p></article>
   <article class="cortex-home-strength"><span class="cortex-home-strength-num">04 · ÉLÈVE</span><h3>Le manuscrit rejoint le numérique</h3><p>Quand l’évaluation le permet, photographie tes réponses écrites à la main : elles rejoignent la copie numérique et facilitent la correction.</p></article>
   <article class="cortex-home-strength"><span class="cortex-home-strength-num">05 · ÉVALUATION</span><h3>Un suivi anti-triche intégré</h3><p>Chronomètre, suivi des sorties d’écran et journal des événements selon les réglages. Une alerte invite à vérifier : elle ne prouve pas une triche.</p></article>
   <article class="cortex-home-strength"><span class="cortex-home-strength-num">06 · PFMP</span><h3>La recherche de PFMP simplifiée</h3><p>Recherche des lieux adaptés à ta filière et à ta zone, suis les entreprises choisies et prépare CV, lettre et prise de contact avec Albert.</p></article>
  </div>
 </section>
 <div class="cortex-focus-trust"><span class="cortex-focus-trust-mark" aria-hidden="true">◈</span><strong>L’IA accompagne, l’humain décide.</strong><span>Estimation indicative, vérification des documents et validation des corrections par l’enseignant.</span><span class="cortex-focus-separator" aria-hidden="true"></span><small>Visite libre · Données fictives</small></div>
 <section class="cortex-focus-vista" aria-labelledby="cortex-focus-vista-title">
  <div class="cortex-focus-vista-copy">
   <span class="cortex-focus-vista-kicker"><span class="cortex-focus-vista-led" aria-hidden="true"></span> STATION NOCTIS · LE PARCOURS</span>
   <h2 id="cortex-focus-vista-title">Du document<br><em>au progrès de l’élève.</em></h2>
   <p>Import du sujet, réponses numériques ou manuscrites, puis retour pédagogique plus rapide.</p>
  </div>
  <div class="cortex-focus-vista-terminal" aria-label="Parcours de démonstration en trois étapes">
   <div class="cortex-focus-vista-terminal-top"><span>CORTEX / FLUX PÉDAGOGIQUE</span><span aria-hidden="true">● SIGNAL ACTIF</span></div>
   <div class="cortex-focus-vista-step"><span class="cortex-focus-vista-number">01</span><span class="cortex-focus-vista-step-icon" aria-hidden="true">▤</span><strong>Préparer</strong><span class="cortex-focus-vista-step-line" aria-hidden="true"></span><small>Importer un PDF ou créer un sujet</small></div>
   <div class="cortex-focus-vista-step"><span class="cortex-focus-vista-number">02</span><span class="cortex-focus-vista-step-icon" aria-hidden="true">✎</span><strong>Évaluer</strong><span class="cortex-focus-vista-step-line" aria-hidden="true"></span><small>Copie numérique ou manuscrite</small></div>
   <div class="cortex-focus-vista-step"><span class="cortex-focus-vista-number">03</span><span class="cortex-focus-vista-step-icon" aria-hidden="true">✧</span><strong>Progresser</strong><span class="cortex-focus-vista-step-line" aria-hidden="true"></span><small>Conseils puis correction validée</small></div>
  </div>
 </section>
</div>`;
}

const teacherMenu=[['dashboard','▦','Vue d’ensemble'],['classes','▣','Mes classes'],['codes','⌑','PIN élèves'],['controles','▤','Mes contrôles'],['copies','✎','Copies & notes'],['suivi','◷','Suivi des épreuves'],['integrite','◈','Anti-triche'],['analyses','▥','Analyses'],['import','⇪','Importer PDF / Word'],['creer','＋','Créer un contrôle']];
function teacherReviewFull(){
 const at=attemptBy(reviewAttemptId),e=examBy(at?.examId);
 return window.CORTEX_REVIEW.render({attempt:at,exam:e,index:reviewIndex,photo:at&&e?.questions[reviewIndex]?photoReview(at,e.questions[reviewIndex]):''})+(at?'<section class="panel" style="margin:18px auto;max-width:1100px;padding:18px"><h3>Journal de l’épreuve</h3>'+window.CORTEX_INTEGRITY.attemptEvents(state.events,at,e)+'</section>':'');
}
function teacherShell(){
if(tab==='corriger')return teacherReviewFull();
const body=tab==='classes'?window.CORTEX_CLASSES.overview(state,selectedClassId):tab==='codes'?teacherCodes():tab==='controles'?teacherExams():tab==='copies'?teacherCopies():tab==='suivi'?teacherMonitoring():tab==='integrite'?window.CORTEX_INTEGRITY.summary(state,integritySetupId):tab==='analyses'?teacherAnalytics():tab==='import'?teacherImport():tab==='creer'?teacherEditor():teacherDashboard();
return `<div class="workspace"><aside class="sidebar"><div class="side-title"><strong>Espace professeur</strong><span>Station Noctis · Démonstration</span></div><nav class="side-menu" aria-label="Navigation professeur">${teacherMenu.map(([id,ico,label])=>`<button type="button" class="side-item ${tab===id?'active':''}" data-action="teacher-tab" data-tab="${id}" ${tab===id?'aria-current="page"':''}><span class="side-icon">${ico}</span>${label}</button>`).join('')}</nav><div class="side-bottom">Données fictives, modifiables dans ce navigateur uniquement.<br><br><a href="./ancienne-interface-v04.html">Ancienne interface sauvegardée ↗</a></div></aside><div class="workspace-main">${body}</div></div>`;
}
function teacherImport(){const exam=examBy(importExamId);return exam?.sourceId?window.CORTEX_VISUAL.workspace(exam,visualPage,visualQuestionId):window.CORTEX_VISUAL.importHome();}
function pageHead(title,desc,actions=''){return `<div class="page-head"><div><p class="eyebrow">Station Noctis · Espace professeur</p><h1>${title}</h1><p>${desc}</p></div><div class="btn-row">${actions}</div></div>`;}
function examPreviewCard(e) {
  const first=e.questions?.[0],summary=e.pdfSource?
    '<div class="exam-preview-pdf"><b>DOCUMENT 1 · Une semaine dans la vie de Dylan</b><p>Dylan dort <strong>4 h</strong> les jours de cours, <strong>12 h</strong> le week-end. Repère conseillé : <strong>8 à 10 h</strong>.</p></div>':
    '<div class="exam-preview-pdf"><b>Document associé</b><p>'+esc((first?.doc||e.doc||e.sourcePages?.[0]||'Ouvrir pour voir le contenu').slice(0,180))+'</p></div>';
  const items=(e.questions||[]).slice(0,3).map((q,i)=>'<span>Q'+(q.number||i+1)+' · '+esc(q.prompt.slice(0,108))+'</span>').join('');
  return '<span class="exam-preview-caption">APERÇU DU CONTRÔLE</span><h3>'+esc(e.title)+'</h3>'+
    '<div class="exam-preview-meta"><span>'+esc(e.level)+'</span><span>· '+e.questions.length+' questions</span><span>· '+Number(e.duration)+' min</span></div>'+
    summary+'<div class="exam-preview-questions">'+items+'</div>';
}
function examPreviewModal(e){
  const first=e.questions?.[0],section=e.pdfSource?window.CORTEX_DOCS?.sections?.[first?.section||0]:null;
  const source=section?section.document:
    '<div class="review-generic-doc">'+esc(first?.doc||e.doc||e.sourcePages?.[0]||'Aucun document textuel à prévisualiser.')+'</div>';
  modalShow('Aperçu du contrôle', '<p class="muted small">'+esc(e.title)+' · '+esc(e.level)+' · '+e.questions.length+
    ' questions · '+Number(e.duration)+' minutes · '+sum(e)+' points</p>'+
    '<div class="exam-preview-modal-doc">'+source+'</div>'+
    '<h3>Questions du contrôle</h3><div class="exam-preview-modal-list">'+e.questions.map((q,i)=>
    '<div><strong>Q'+esc(q.number||i+1)+' · '+q.points+' pt</strong><br>'+esc(q.prompt)+'</div>').join('')+'</div>',
    '<button class="btn" data-action="preview-try-exam" data-id="'+esc(e.id)+'">Tester comme élève →</button>'+
    btn('Fermer','close-modal','ghost'));
}
function teacherDashboard(){
  const submitted=state.attempts.filter(a=>a.status==='submitted'),corrected=submitted.filter(a=>a.grade!=null),live=state.attempts.filter(a=>a.status==='progress');
  const rows=state.exams.length?state.exams.slice(0,4).map(e=>'<div class="list-row">'+
    '<div class="exam-preview-wrap"><button type="button" class="item-icon exam-preview-trigger" data-action="dashboard-preview" data-id="'+esc(e.id)+
    '" aria-label="Prévisualiser '+esc(e.title)+'" title="Survoler pour prévisualiser, cliquer pour ouvrir">▤</button>'+
    '<div class="exam-preview-popup" role="tooltip">'+examPreviewCard(e)+'</div></div>'+
    '<div class="grow"><div class="item-title">'+esc(e.title)+'</div><div class="item-meta">'+esc(e.level)+' · '+
    e.questions.length+' questions · '+e.duration+' min</div></div>'+
    pill(e.open?'Publié':'Brouillon',e.open?'ok':'warn')+
    '<button class="table-action" data-action="try-exam" data-id="'+esc(e.id)+'">Tester</button></div>').join(''):
    '<div class="empty">Aucun contrôle dans la démo. Tu peux en créer un ou restaurer l’exemple.</div>';
  const sample=state.exams.find(x=>x.id==='sommeil-pdf-a2');
  return pageHead('Tableau de bord','Ton espace d’évaluation, simplifié autour du contrôle PSE de référence.',
    btn('⇪ Importer PDF / Word','go-import','secondary')+btn('＋ Nouveau contrôle','create',''))+
  '<div class="class-quick-strip"><button class="btn secondary small" data-action="class-open-manager">▣ Mes classes</button>'+state.classes.filter(c=>!c.archived).map(c=>'<button class="btn ghost small" data-action="class-open" data-id="'+esc(c.id)+'">'+esc(c.name)+'</button>').join('')+'</div>'+
  '<div class="stats"><div class="stat"><div class="stat-label">Contrôles disponibles</div><div class="stat-value">'+state.exams.length+
  '</div><div class="stat-foot">Bibliothèque de démonstration</div></div>'+
  '<div class="stat"><div class="stat-label">Copies remises</div><div class="stat-value">'+submitted.length+
  '</div><div class="stat-foot">Conservées sur cet appareil</div></div>'+
  '<div class="stat"><div class="stat-label">Notes validées</div><div class="stat-value">'+corrected.length+
  '</div><div class="stat-foot">Sur '+submitted.length+' copies</div></div>'+
  '<div class="stat"><div class="stat-label">Épreuves en cours</div><div class="stat-value">'+live.length+
  '</div><div class="stat-foot">Démonstration locale</div></div></div>'+
  '<div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Contrôles récents</h2>'+
  '<p>Survole l’icône ▤ pour voir un aperçu. Clique dessus pour le contrôle complet.</p></div>'+
  btn('Tout voir →','go-exams','ghost small')+'</div>'+rows+'</section>'+
  '<section class="panel"><div class="panel-head"><h2>Ton contrôle de référence</h2>'+pill('Démo','live')+'</div>'+
  '<p class="muted small">Seul ton contrôle sur le sommeil et sa copie fictive sont inclus au départ. Les autres contrôles peuvent toujours être créés ou importés.</p>'+
  '<div class="inline-note"><strong>Parcours conseillé</strong><br>1. Prévisualise le document avec l’icône ▤.<br>'+
  '2. Essaie le contrôle côté élève avec le grand minuteur.<br>3. Corrige la copie fictive côté professeur.</div>'+
  '<div class="btn-row" style="margin-top:18px">'+
  (sample?'<button class="btn secondary full" data-action="try-exam" data-id="'+esc(sample.id)+'">Tester le contrôle PSE →</button>':
  btn('Restaurer la démo de référence','reset-demo','secondary full'))+
  '</div></section></div>';
}
function examClassHeading(exam){
 const linked=state.assignments.filter(a=>a.examId===exam.id&&a.active);
 const names=[...new Set(linked.map(a=>window.CORTEX_CLASSES.classLabel(state,a.classId)).filter(Boolean))];
 return names.join(' · ')||window.CORTEX_CLASSES.classLabel(state,exam.classId,'Sans classe');
}
async function openTeacherSimulator(exam){
 if(!exam)return;
 try{
  const assets=[];
  for(const asset of exam.assets||[]){
   let url=null;
   try{url=await window.CORTEX_VISUAL?.imageUrl?.(asset.id)}catch{}
   if(url)assets.push({...asset,url});
  }
  window.CORTEX_STUDENT_SIMULATOR.open({
   exam:{...exam,description:exam.description||'',duration:exam.duration||60},
   classe:window.CORTEX_CLASSES.classLabel(state,exam.classId||'','Sans classe'),
   scope:exam.publishScope||'all',assets,layout:'all'
  });
 }catch(err){showToast('Simulation indisponible : '+(err?.message||err));}
}
function teacherExams(){
const visibleExams=state.exams.filter(e=>!teacherClassFilter||window.CORTEX_CLASSES.assignedTo(state,e.id,teacherClassFilter,teacherGroupFilter)||(e.classId===teacherClassFilter&&!teacherGroupFilter));
return pageHead('Mes contrôles','Retrouve tes évaluations, duplique-les et passe en aperçu élève.',btn('⇪ Importer PDF / Word','go-import','secondary')+btn('＋ Créer un contrôle','create',''))+
`<div>${window.CORTEX_CLASSES.filterBar(state,teacherClassFilter,teacherGroupFilter)}</div><div class="toolbar"><span class="muted small">${visibleExams.length} contrôle(s) ${teacherClassFilter?'affecté(s) à la classe':'dans la démo'}</span><input class="search-field" type="search" placeholder="Rechercher un contrôle…" aria-label="Rechercher un contrôle" data-search-exams value="${esc(search)}"></div>
<div class="tile-grid" id="exam-tiles">${visibleExams.map(e=>`<article class="card tile" data-search="${esc((e.title+' '+e.level).toLowerCase())}"><div class="tile-stats">${pill(e.open?'Publié · Accès QR':'Brouillon',e.open?'ok':'warn')}<span class="small muted">CLASSE : ${esc(examClassHeading(e))}</span><span class="small muted">${esc(e.publishScope==="g1"?"Groupe 1":e.publishScope==="g2"?"Groupe 2":"Classe entière")}</span></div><div><h3>${esc(e.title)}</h3><div class="cortex-exam-class-heading">▣ ${esc(examClassHeading(e))} · ${esc(e.publishScope==='g1'?'Groupe 1':e.publishScope==='g2'?'Groupe 2':'Classe entière')}</div><p>${esc(e.level)} · ${e.questions.length} questions · ${sum(e)} points · ${e.duration} min</p></div><div class="tile-foot"><div class="btn-row">${btn('Modifier','edit-exam','ghost small').replace('data-action','data-id="'+e.id+'" data-action')}${btn('Dupliquer','duplicate-exam','ghost small').replace('data-action','data-id="'+e.id+'" data-action')}</div><div class="btn-row"><button class="table-action" data-action="publish-exam" data-id="${esc(e.id)}">${e.open?'Modifier la publication':'Publier'}</button>${e.open?`<button class="table-action" data-action="toggle-exam" data-id="${esc(e.id)}">Fermer</button>`:''}${e.sourceId?`<button class="table-action" data-action="visual-open-existing" data-id="${esc(e.id)}">Découper ↗</button>`:''}<button class="table-action" data-action="class-qr-list" data-id="${esc(e.id)}">▣ QR codes</button><button class="table-action" data-action="try-exam" data-id="${e.id}">Tester ↗</button><button type="button" class="table-action" data-action="integrity-settings" data-id="${esc(e.id)}">◈ Anti-triche</button><button type="button" class="btn-delete-exam" data-action="ask-delete-exam" data-id="${esc(e.id)}" aria-label="Supprimer le contrôle ${esc(e.title)}">Supprimer</button></div></div></article>`).join('')}${visibleExams.length===0?'<div class="empty">Aucun contrôle pour cette sélection. Affecte-en un depuis « Mes classes » ou efface le filtre.</div>':''}</div>`;
}
function editorFor(id){
 const e=examBy(id);
 const exam=e?JSON.parse(JSON.stringify(e)):{
  id:'demo-'+Date.now(),title:'',level:'Seconde Bac Pro',chapter:'PSE · Nouveau chapitre',
  duration:45,code:'DEMO'+Math.floor(Math.random()*9000+1000),open:false,doc:'',
  questions:[{id:'q-'+Date.now(),type:'text',prompt:'',points:4,doc:''}]
 };
 // Préserve les anciens sujets : convertit le document commun en documents par question.
 const previous=String(exam.doc||'').trim();
 if(previous)for(const q of exam.questions||[])if(!String(q.doc||'').trim())q.doc=previous.slice(0,5000);
 exam.doc='';
 return exam;
}
function teacherEditor(){
  if(!editor)editor=editorFor(null);
  editorIndex=Math.max(0,Math.min(editorIndex,editor.questions.length-1));
  // Atelier de création : formulaire identique à celui de l'espace réel.
  // Seul le moteur de persistance diffère (navigateur local en démonstration).
  return window.CORTEX_DEMO_REAL_WORKSHOP.render();
}

function teacherCodes(){
 const seenNames=new Set();
 const all=state.classes.filter(cl=>{
  if(cl.archived)return false;
  const key=String(cl.name||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(seenNames.has(key))return false;
  seenNames.add(key);return true;
 });
 const visible=all.filter(cl=>!teacherClassFilter||cl.id===teacherClassFilter);
 const A=window.CORTEX_ACCESS;
 const cards=visible.map(cl=>'<article class="access-card"><div><span class="access-counter">'+A.filled(state,cl)+' / '+A.count(cl)+' PIN créés</span>'+
  '<h3>'+esc(cl.name)+'</h3><p>Un PIN personnel par numéro de liste, réutilisable pour les contrôles de la classe.</p></div>'+
  '<div class="btn-row"><button type="button" class="btn" data-action="access-manage" data-id="'+esc(cl.id)+'">Voir / réinitialiser les PIN →</button><button type="button" class="btn secondary" data-action="portal-class-code" data-id="'+esc(cl.id)+'">Code de classe ◈</button></div></article>').join('');
 return pageHead('PIN des élèves','Les élèves créent eux-mêmes leur PIN à 6 chiffres à la première connexion. Le professeur ne peut pas voir les PIN.',btn('Mes classes →','class-open-manager','secondary'))+
  '<div class="access-page">'+window.CORTEX_CLASSES.filterBar(state,teacherClassFilter,teacherGroupFilter)+
  '<div class="access-intro"><strong>Numéro de liste + PIN choisi par l’élève</strong><p>Première connexion : création et confirmation du PIN. Connexions suivantes : saisie du même PIN. Un oubli ? Réinitialise le PIN du numéro correspondant, sans effacer les copies.</p></div>'+
  '<div class="access-grid">'+(cards||'<div class="empty">Aucune classe active. Crée une classe dans « Mes classes ».</div>')+'</div></div>';
}
function teacherCopies(){
 const submitted=state.attempts.filter(a=>a.status==='submitted'&&window.CORTEX_CLASSES.copyMatch(a,teacherClassFilter,teacherGroupFilter))
 .sort((a,b)=>String(a.className||window.CORTEX_CLASSES.classLabel(state,a.classId)).localeCompare(String(b.className||window.CORTEX_CLASSES.classLabel(state,b.classId)),'fr')||
 String(a.groupName||'').localeCompare(String(b.groupName||''),'fr')||((b.submittedAt||0)-(a.submittedAt||0)));
 const showDemo=!teacherClassFilter||teacherClassFilter==='2mrc1';
 const pdfBatch='<button type="button" class="btn" data-action="pdf-download-batch" '+(submitted.length?'':'disabled')+
   '>↓ Télécharger le lot en PDF ('+submitted.length+' copie'+(submitted.length>1?'s':'')+')</button>';
 return pageHead('Copies & notes','Copies classées par classe et demi-groupe. Ouvre une copie pour corriger chaque question.',
 (showDemo&&attemptBy('ex-pdf-demo')?btn('Corriger la copie PDF de démonstration','review-pdf-sample',''):'')+
 pdfBatch+btn('Mes classes','class-open-manager','secondary'))+
 `${window.CORTEX_CLASSES.filterBar(state,teacherClassFilter,teacherGroupFilter)}
 <div id="pdf-export-status" role="status" aria-live="polite" class="pdf-export-status" hidden></div>
 <div class="panel"><div class="panel-head"><div><h2>Copies reçues <span class="chip blue">${submitted.length}</span></h2>
 <p>Conserve le contexte classe et demi-groupe même après un archivage.</p></div>
 ${btn('Réinitialiser la démo','reset-demo','ghost small')}</div>
 <div class="table-wrap"><table><thead><tr><th>Élève fictif</th><th>Classe / groupe</th><th>Contrôle</th><th>Remise</th><th>Note</th><th>Visible dans Mon CORTEX</th><th>Action</th></tr></thead>
 <tbody>${submitted.map(a=>`<tr><td><strong>${esc(a.name)}</strong>${a.studentNumber?`<div class="small muted">Numéro d'élève : ${esc(a.studentNumber)}</div>`:''}</td>
 <td><span class="class-copy-badge">${esc(a.className||window.CORTEX_CLASSES.classLabel(state,a.classId,'Sans classe'))}</span>
 <div class="small muted">${esc(a.groupName||window.CORTEX_CLASSES.groupLabel(state,a.classId,a.groupId,'Groupe archivé'))}</div></td>
 <td>${esc(examBy(a.examId)?.title||'Contrôle')}</td><td>${date(a.submittedAt)}</td>
 <td>${a.grade==null?pill('À corriger','warn'):`<strong>${esc(a.grade)} / 20</strong>`}</td>
 <td>${a.publishedToStudent===true?pill('Publiée','ok'):pill('Non publiée','warn')}<div class="small" style="margin-top:6px"><button type="button" class="btn ghost small" data-action="teacher-toggle-publish" data-id="${esc(a.id)}" ${a.grade==null?'disabled':''}>${a.publishedToStudent===true?'Masquer':'Publier'}</button></div></td>
 <td><div class="btn-row"><button class="table-action" data-action="review-copy" data-id="${esc(a.id)}">Corriger ↗</button><button type="button" class="btn secondary small" data-action="pdf-download-copy" data-id="${esc(a.id)}">↓ PDF</button><button type="button" class="btn ghost small" data-action="integrity-attempt" data-id="${esc(a.id)}">◈ Incidents (${window.CORTEX_INTEGRITY.stats(state.events,a).total})</button></div></td></tr>`).join('')}</tbody></table></div>
 ${submitted.length===0?'<p class="empty">Aucune copie pour cette sélection. Vérifie le filtre ou fais un essai depuis un QR code.</p>':''}</div>`;
}
function teacherMonitoring(){
 const metrics=[
  ['Copies en cours',state.attempts.filter(a=>a.status==='progress').length],
  ['Copies remises',state.attempts.filter(a=>a.status==='submitted').length],
  ['Contrôles publiés',state.exams.filter(e=>e.open).length]
 ];
 return pageHead('Suivi des épreuves','Retrouve les copies et les événements des contrôles de démonstration.',btn('Réglages anti-triche','integrity-open','secondary'))+
  '<div class="stats">'+metrics.map(([label,value])=>'<div class="stat"><div class="stat-label">'+label+'</div><div class="stat-value">'+value+'</div></div>').join('')+
  '</div><section id="demo-live-journal" aria-label="Journal des épreuves"></section>';
}
function mountDemoMonitor(){
 const monitor=window.CORTEX_EXAM_MONITOR;
 const live=window.CORTEX_EXAM_LIVE.createPanel({demo:true});
 const journal=monitor.mount(document.getElementById('demo-live-journal'),{
  demo:true,live,onExamChange:id=>{monitorExamId=id;}
 });
 const classesByExam=new Map();
 for(const assignment of [...state.assignments,...state.attempts]){
  if(!assignment.classId)continue;
  if(!classesByExam.has(assignment.examId))classesByExam.set(assignment.examId,new Map());
  classesByExam.get(assignment.examId).set(assignment.classId,
   window.CORTEX_CLASSES.classLabel(state,assignment.classId,assignment.className||'Classe archivée'));
 }
 journal.setExams(state.exams.map(exam=>({id:exam.id,title:exam.title,classes:[...(classesByExam.get(exam.id)||[])]})),monitorExamId);
 const events=state.events.flatMap(event=>{
  const attempt=attemptBy(event.attemptId);
  return attempt?[monitor.fromDemo(event,attempt)]:[];
 });
 const sample=examBy('sommeil-pdf-a2');
 const now=Date.now();
 const at=seconds=>new Date(now-seconds*1000).toISOString();
 const entries=[];
 if(sample){
  const classes=classesByExam.get(sample.id);
  const classId=classes?.keys().next().value||'2mrc1';
  const examId=sample.id;
  for(const row of [
   {student_number:4,state:'visible',answered:14,seen_at:at(5)},
   {student_number:9,state:'hidden',answered:6,state_since:at(22),seen_at:at(22)},
   {student_number:12,state:'submitted',submitted_at:at(45),auto_submitted:true},
   {student_number:16,state:'stale',answered:8,seen_at:at(62)},
   {student_number:21,state:'visible',answered:10,seen_at:at(7),parallel:true}
  ])entries.push({...row,examId,classId,title:sample.title,question_count:sample.questions.length});
  events.push({examId,classId,className:classes?.get(classId),studentNumber:21,kind:'parallel_access',simulated:true,at:now-7000});
 }
 journal.setEvents(events);
 live.setSnapshot({observed_at:at(0),enabled:true,entries});
}
function teacherAnalytics(){
const done=state.attempts.filter(a=>a.status==='submitted'&&window.CORTEX_CLASSES.copyMatch(a,teacherClassFilter,teacherGroupFilter)),graded=done.filter(a=>a.grade!=null),avg=graded.length?(graded.reduce((n,a)=>n+Number(a.grade),0)/graded.length).toFixed(1):'—';const bins=[0,0,0,0];graded.forEach(a=>bins[Math.min(3,Math.floor(a.grade/5))]++);
return pageHead('Analyses pédagogiques','Un aperçu des résultats pour cibler la remédiation.',btn('Voir les copies →','go-copies','secondary'))+window.CORTEX_CLASSES.filterBar(state,teacherClassFilter,teacherGroupFilter)+
`<div class="stats"><div class="stat"><div class="stat-label">Moyenne validée</div><div class="stat-value">${avg}${avg!=='—'?'<span class="small">/20</span>':''}</div><div class="stat-foot">Exemple de classe</div></div><div class="stat"><div class="stat-label">Copies notées</div><div class="stat-value">${graded.length}</div><div class="stat-foot">Sur ${done.length} copies</div></div><div class="stat"><div class="stat-label">En attente de correction</div><div class="stat-value">${done.length-graded.length}</div><div class="stat-foot">À valider</div></div><div class="stat"><div class="stat-label">Contrôles publiés</div><div class="stat-value">${state.exams.filter(e=>e.open&&(!teacherClassFilter||window.CORTEX_CLASSES.assignedTo(state,e.id,teacherClassFilter,teacherGroupFilter))).length}</div><div class="stat-foot">Évaluations accessibles</div></div></div>
<div class="two-col"><section class="panel"><div class="panel-head"><h2>Répartition des notes</h2>${pill('Notes validées','live')}</div><div class="bars">${bins.map((n,i)=>`<div class="bar-row"><span>${i*5}–${i===3?'20':i*5+4} / 20</span><div class="bar-bg"><span style="width:${graded.length?(n/graded.length*100):0}%"></span></div><b>${n}</b></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>Idées de remédiation</h2></div><p class="small muted">Exemples de suggestions pédagogiques, non générées par une IA dans cette démonstration.</p><div class="preview-list"><div class="summary-answer"><strong>Sommeil</strong><p>Revoir les conséquences du manque de sommeil avec une carte mentale.</p></div><div class="summary-answer"><strong>Réponses rédigées</strong><p>Entraîner les élèves à justifier avec une notion scientifique et un exemple.</p></div></div></section></div>`;
}
function portalData(){return portalSession?.demo&&portalPreviewState?portalPreviewState:state;}
function studentPseDiscovery(){
 const exam=examBy('sommeil-pdf-a2')||window.CORTEX_DOCS?.demoExam;
 return '<section class="pse-discovery">'+
  '<div class="pse-discovery-header"><span class="pse-discovery-kicker">STATION NOCTIS · SECONDE PROFESSIONNELLE</span>'+
  '<h1>Ton contrôle de PSE.<br><em>60 minutes pour comprendre le sommeil.</em></h1>'+
  '<p>Découvre le contrôle de référence dans les mêmes conditions qu’un élève : les documents, 20 questions et un compte à rebours.</p>'+
  '<div class="pse-discovery-facts"><span>◷ <strong>60 minutes</strong></span><span>▤ <strong>20 questions</strong></span><span>✧ <strong>Sans compte</strong></span></div></div>'+
  '<div class="pse-discovery-entry"><div><h2>Entrer dans le contrôle</h2><p>Il s’agit de données fictives, enregistrées sur cet appareil uniquement. Le chronomètre ne commence qu’après avoir appuyé sur <strong>« Démarrer le contrôle »</strong>.</p>'+
  '<p class="pse-discovery-subject">'+esc(exam?.title||'Le sommeil, un rythme essentiel — PSE')+'</p></div>'+
  '<button type="button" class="btn pse-discovery-start" data-action="demo-pse-entry">Entrer sans connexion <span aria-hidden="true">↗</span></button>'+
  '<button type="button" class="btn secondary pse-discovery-back" data-action="student">← Retour à l’espace élève</button></div></section>';
}
function prepareDemoPse(start=false){
 let exam=examBy('sommeil-pdf-a2');
 if(!exam&&window.CORTEX_DOCS?.demoExam){
   exam=JSON.parse(JSON.stringify(window.CORTEX_DOCS.demoExam));state.exams.unshift(exam);
 }
 const cl=window.CORTEX_CLASSES.byId(state,PSE_DEMO_CLASS);
 if(!exam||!cl){showToast('Contrôle PSE de référence introuvable. Restaure la démonstration depuis le professeur.');return;}
 exam.open=true;cl.archived=false;
 let ass=state.assignments.find(x=>x.id===PSE_DEMO_ASSIGNMENT);
 if(ass)Object.assign(ass,{examId:exam.id,classId:cl.id,token:PSE_DEMO_TOKEN,groupId:null,active:true});
 else{ass={id:PSE_DEMO_ASSIGNMENT,examId:exam.id,classId:cl.id,groupId:null,token:PSE_DEMO_TOKEN,active:true,createdAt:Date.now()};state.assignments.push(ass)}
 studentAssignmentId=ass.id;studentQrToken=ass.token;studentRollNumber='12';
 studentSession={demoPreview:true,assignmentId:ass.id,classId:ass.classId,number:'12'};
 currentQuestion=0;save();persistPsePreview();
 if(start){
  const previous=state.attempts.find(at=>at.assignmentId===ass.id&&at.studentNumber==='12'&&at.status==='progress'&&Date.now()-at.startedAt<Number(at.durationMinutes||60)*60000);
  if(previous){state.activeAttemptId=previous.id;save();nav('student','examen');return;}
  tab='pret';
  startExam();
 }else nav('student','pret/'+encodeURIComponent(ass.id)+'/'+encodeURIComponent(ass.token));
}
function studentShell(){
 if(tab==='stages')return '<div class="student-shell"><section id="cortex-demo-stages"></section></div>';
 if(tab==='decouverte')return studentPseDiscovery();
 if(tab==='accueil')return window.CORTEX_PORTAL.studentLogin(state);
 if(tab==='espace'){
  if(!portalAuthorized())return window.CORTEX_PORTAL.studentLogin(state);
  return window.CORTEX_PORTAL.dashboard(portalData(),portalSession,{period:portalPeriod,year:portalYear,preview:portalSession.demo===true});
 }
 if(tab==='correction'){
  if(!portalAuthorized())return window.CORTEX_PORTAL.studentLogin(state);
  return window.CORTEX_PORTAL.correction(portalData(),portalSession,portalCopyId);
 }
 return '<div class="student-shell">'+(tab==='examen'?window.CORTEX_INTEGRITY.notice(examBy(activeAttempt()?.examId))+window.CORTEX_INTEGRITY.watermark(examBy(activeAttempt()?.examId),activeAttempt())+studentExam():tab==='termine'?studentDone():studentWelcome())+'</div>';
}

function portalAuthorized(){
 if(!portalSession||Date.now()>portalSession.expiresAt)return false;
 if(portalSession.demo===true)return !!portalPreviewState?.classes?.some(c=>c.id===portalSession.classId)&&portalSession.number==='12';
 const cl=window.CORTEX_CLASSES.byId(state,portalSession.classId),A=window.CORTEX_ACCESS,P=window.CORTEX_PORTAL;
 if(!cl||cl.archived||A.normalizeNumber(portalSession.number,cl)!==portalSession.number)return false;
 const record=A.record(state,cl,portalSession.number);
 return !!record&&record.hash===portalSession.hash&&P.getClassCode(state,cl)===portalSession.classCode;
}
function portalTouch(){if(portalAuthorized())portalSession.expiresAt=Date.now()+20*60*1000;}
async function portalLogin(){
 if(portalLoginBusy)return;
 const id=document.getElementById('portal-class')?.value,cl=window.CORTEX_CLASSES.byId(state,id),
   selectedLevel=document.getElementById('portal-level')?.value,number=window.CORTEX_ACCESS.normalizeNumber(document.getElementById('portal-number')?.value,cl),
   classCode=String(document.getElementById('portal-classcode')?.value||'').trim().toUpperCase().replace(/\s+/g,''),
   pin=String(document.getElementById('portal-pin')?.value||'');
 const P=window.CORTEX_PORTAL,A=window.CORTEX_ACCESS;
 if(!cl||cl.archived||!number||selectedLevel!==P.level(cl.name)||!/^\d{6}$/.test(pin)){
  showToast('Vérifie ton niveau, ta classe, ton numéro de liste et ton PIN.');return;
 }
 const expected=P.getClassCode(state,cl);
 if(!expected||classCode!==expected){showToast('Identifiants incorrects. Vérifie le code communiqué par ton professeur.');return;}
 const button=document.querySelector('[data-action="portal-login"]');
 portalLoginBusy=true;
 if(button){button.disabled=true;button.textContent='Connexion en cours…';}
 try{
  await A.verify(state,cl,number,pin);save();
  const record=A.record(state,cl,number);
  if(!record||view!=='student'||tab!=='accueil')return;
  portalSession={classId:cl.id,number,hash:record.hash,classCode:expected,expiresAt:Date.now()+20*60*1000};
  portalPeriod='s1';portalYear=P.keyYear(Date.now());portalCopyId=null;
  nav('student','espace');showToast('Bienvenue dans ton espace CORTEX.');
 }catch(err){
  save();showToast(err?.message||'Impossible de se connecter.');
  if(button?.isConnected){button.disabled=false;button.innerHTML='Accéder à mon espace ↗';}
 }finally{portalLoginBusy=false;}
}
function portalAction(kind,el){
 const P=window.CORTEX_PORTAL,id=el.dataset.id;
 if(kind==='portal-login'){portalLogin();return;}
 if(kind==='portal-demo'){
  portalPreviewState=P.previewData(makeSeed());const cl=portalPreviewState.classes[0];
  portalSession={demo:true,classId:cl.id,number:'12',expiresAt:Date.now()+20*60*1000};
  portalPeriod='s1';portalYear=P.keyYear(Date.now())-1;portalCopyId=null;
  nav('student','espace');return;
 }
 if(kind==='portal-toggle-pin'){
  const input=document.getElementById('portal-pin');if(!input)return;
  input.type=input.type==='password'?'text':'password';
  el.textContent=input.type==='password'?'Afficher':'Masquer';input.focus();return;
 }
 if(kind==='portal-open'){portalSession=null;portalPreviewState=null;portalCopyId=null;nav('student','accueil');return;}
 if(kind==='portal-logout'){portalSession=null;portalPreviewState=null;portalCopyId=null;nav('student','accueil');showToast('Déconnexion effectuée.');return;}
 if(kind==='portal-class-code'||kind==='portal-create-class-code'||kind==='portal-copy-class-code'||kind==='portal-ask-rotate-code'||kind==='portal-confirm-rotate-code'){
  const cl=window.CORTEX_CLASSES.byId(state,id);if(!cl||cl.archived){showToast('Classe introuvable.');return;}
  if(kind==='portal-create-class-code'){
   try{P.makeCode(state,cl);save();}catch(err){showToast(err.message);return;}
  }
  if(kind==='portal-copy-class-code'){
   const code=P.getClassCode(state,cl);
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).then(()=>showToast('Code de classe copié.')).catch(()=>showToast('Sélectionne le code affiché.'));
   else showToast('Sélectionne le code affiché pour le copier.');
   return;
  }
  if(kind==='portal-ask-rotate-code'){
   modalShow('Renouveler le code de classe ?','<p>Le précédent code de '+esc(cl.name)+' ne permettra plus d’accéder à Mon CORTEX. Les PIN et copies restent conservés.</p>',
    '<button class="btn danger" data-action="portal-confirm-rotate-code" data-id="'+esc(cl.id)+'">Confirmer</button>'+
    '<button class="btn secondary" data-action="portal-class-code" data-id="'+esc(cl.id)+'">Annuler</button>');return;
  }
  if(kind==='portal-confirm-rotate-code'){
   try{P.makeCode(state,cl,true);save();}catch(err){showToast(err.message);return;}
  }
  modalShow('Code de classe · '+esc(cl.name),P.classPanel(state,cl),btn('Fermer','close-modal','ghost'));
  return;
 }
 if(!portalAuthorized()){portalSession=null;nav('student','accueil');showToast('Session expirée. Reconnecte-toi.');return;}
 portalTouch();
 if(kind==='portal-period'){portalPeriod=el.dataset.period==='s2'?'s2':'s1';render();return;}
 if(kind==='portal-back'){portalCopyId=null;nav('student','espace');return;}
 if(kind==='portal-copy'){
  if(!P.candidate(portalData(),portalSession.classId,portalSession.number,id)){showToast('Cette correction n’est pas disponible.');return;}
  portalCopyId=id;nav('student','correction');return;
 }
 if(kind==='portal-original'){
  const at=P.candidate(portalData(),portalSession.classId,portalSession.number,id);
  const exam=portalData().exams.find(e=>e.id===at?.examId);
  if(!at||!exam?.sourceId){showToast('Document original indisponible.');return;}
  openSavedOriginal(exam.sourceId);return;
 }
 if(kind==='portal-revision'){
  const data=portalData(),at=P.candidate(data,portalSession.classId,portalSession.number,el.dataset.attempt),q=data.exams.find(e=>e.id===at?.examId)?.questions.find(x=>x.id===el.dataset.question);
  if(!at||!q||typeof at.marks?.[q.id]?.points!=='number'){showToast('Question indisponible.');return;}
  data.studentReviewFlags ||= {};
  const cl=(data.studentReviewFlags[portalSession.classId]||={});
  const student=(cl[portalSession.number]||={});
  const questions=(student[at.id]||={});
  questions[q.id]=!questions[q.id];if(!portalSession.demo)save();render();return;
 }
 if(kind==='portal-show-results'||kind==='portal-show-revision'){
  document.getElementById(kind==='portal-show-results'?'portal-results':'portal-revisions')?.scrollIntoView({behavior:'smooth',block:'start'});return;
 }
 if(kind==='portal-print'){window.print?.();return;}
 if(kind==='portal-export'){
  const csv=P.exportCsv(portalData(),portalSession);
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;
  link.download='CORTEX-bilan-'+portalSession.classId+'-'+portalSession.number+'.csv';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  showToast('Bilan téléchargé.');return;
 }
}

function studentWelcome(){
 const a=state.assignments.find(x=>x.id===studentAssignmentId);
 const valid=a&&a.active&&a.token===studentQrToken&&!window.CORTEX_CLASSES.byId(state,a.classId)?.archived&&(!a.groupId||!window.CORTEX_CLASSES.group(state,a.classId,a.groupId)?.archived);
 const e=valid?examBy(a.examId):null;
 return window.CORTEX_CLASSES.landing(state,valid?a:null,e,!valid||!e,{step:tab==='pret'?'ready':tab==='pin'?'pin':'identify',number:studentRollNumber,authorized:!!(valid&&authorized(a,studentRollNumber))});
}
function activeAttempt(){return attemptBy(state.activeAttemptId);}
function authorized(a,number){
 if(!a||!studentSession)return false;
 const cl=window.CORTEX_CLASSES.byId(state,a.classId),normalized=window.CORTEX_ACCESS.normalizeNumber(number,cl);
 if(!cl||!normalized||studentSession.assignmentId!==a.id||studentSession.classId!==cl.id||studentSession.number!==normalized)return false;
 if(studentSession.demoPreview){
  return a.id===PSE_DEMO_ASSIGNMENT&&a.examId==='sommeil-pdf-a2'&&a.token===PSE_DEMO_TOKEN&&a.classId===PSE_DEMO_CLASS&&a.active&&normalized==='12';
 }
 const record=window.CORTEX_ACCESS.record(state,cl,normalized);
 return !!record&&record.hash===studentSession.hash;
}
function authorizedAttempt(a){
 const assignment=state.assignments.find(x=>x.id===a?.assignmentId&&x.active);
 return !!a&&authorized(assignment,a.studentNumber);
}
function studentDocuments(e,q,a,answered){
 const attached=window.CORTEX_VISUAL?.renderAssets(e,q,'student')||'';
 const answerField=window.CORTEX_QUESTION_TYPES.studentFields(q,a.answers[q.id]);
 const form='<div class="doc-question-response"><div class="question-number">QUESTION '+(currentQuestion+1)+' / '+e.questions.length+' · '+q.points+' PT</div><h2>'+esc(q.prompt)+'</h2>'+answerField+'</div>';
 if(e.pdfSource){
  const original=window.CORTEX_DOCS.renderSample(e,q,currentQuestion,String(a.answers[q.id]||''),answered);
  return attached?original.replace('<div class="doc-question-response">',attached+'<div class="doc-question-response">'):original;
 }
 const source=e.sourceId?'<div class="doc-ribbon"><span class="chip blue">Document importé</span><button type="button" class="btn ghost small" data-action="show-exam-original" data-id="'+esc(e.id)+'">Ouvrir le fichier original ↗</button></div>':'';
 const fallback=e.sourceId&&!attached?(e.sourceType==='pdf'?'<div id="import-original-canvas" class="import-original-canvas"><p class="small muted">Chargement du PDF original…</p></div>':
 '<div id="import-word-canvas" class="import-original-canvas"><p class="small muted">Chargement du document Word…</p></div>'):'';
 const manual=e.doc&&!e.sourceId?'<div class="question-doc">'+esc(q.doc||e.doc)+'</div>':'';
 return '<div class="doc-exam-ribbon"><span>'+esc(e.chapter||'Contrôle')+'</span><span>'+sum(e)+' POINTS</span></div>'+source+
 (attached||fallback||manual)+'<p class="small muted">Les documents ci-dessus sont ceux associés à cette question.</p>'+form;
}
function renderDocumentStudent(e,q,a,answered,remaining){
 const sample=!!e.pdfSource;
 const body=studentDocuments(e,q,a,answered);
  return '<div class="page-head"><div><p class="eyebrow">CORTEX · Contrôle documentaire</p><h1>'+esc(e.title)+'</h1><p>'+esc(e.level)+' · '+esc(a.className||examClassHeading(e))+' · '+e.questions.length+' questions · '+sum(e)+' points</p></div><div class="btn-row">'+
  pill((a.interruptions||0)+' interruption(s)',(a.interruptions||0)?'warn':'ok')+'</div></div>'+window.CORTEX_CLOCK.render(e,a)+
  '<div class="exam-top"><div><strong>Ta progression : '+answered+' / '+e.questions.length+' réponses</strong><div class="small muted">Réponses conservées sur cet appareil, sans serveur</div></div><div class="btn-row"><span class="chip teal" id="save-hint">✓ Sauvegarde locale</span>'+
  '<button class="btn ghost small" data-action="review-exam">Relire ma copie</button></div></div>'+
  '<div class="exam-progress"><span style="width:'+(answered/e.questions.length*100)+'%"></span></div>'+
  '<div class="student-exam"><section class="panel exam-question">'+body+
  '<div class="exam-nav"><button class="btn ghost" data-action="question-prev" '+(currentQuestion===0?'disabled':'')+'>← Précédent</button>'+
  (currentQuestion===e.questions.length-1?btn('Relire et terminer →','review-exam',''):btn('Question suivante →','question-next',''))+'</div></section>'+
  '<aside class="panel sidebar-note"><div class="panel-head"><h2>Navigation</h2>'+pill(Math.round(answered/e.questions.length*100)+' %','ok')+'</div>'+
  (sample?'<p class="small muted">6 parties · 8 documents · 20 questions</p>':'<p class="small muted">Document importé depuis ton navigateur</p>')+
  '<div class="question-dots">'+e.questions.map((other,i)=>'<button class="question-dot '+(i===currentQuestion?'current ':'')+
  (answeredQuestion(a,other)?'answered':'')+'" data-action="question-jump" data-index="'+i+'" title="Question '+(i+1)+'">'+(i+1)+'</button>').join('')+'</div>'+
  '<hr class="divider"><p class="small muted">Les réponses peuvent être modifiées avant la remise. Une sortie de page ne prouve pas une fraude.</p>'+
  btn('Simuler une interruption','simulate-interruption','ghost small full')+'</aside></div>';
}
async function processImport(file,options={}){
 if(!file){showToast('Sélectionne un fichier PDF ou Word.');return;}
 const useAlbert=options.ai===true;
 if(useAlbert&&!window.confirm(
  '✦ ALBERT IA — ANALYSE VISUELLE DU SUJET\n\n'+
  'Albert recevra des images des pages originales (tableaux, courbes, schémas inclus) et le texte extrait, via le serveur Supabase. Le PDF/Word original reste sur ton appareil.\n\n'+
  'Les documents et questions proposés sont à vérifier avant utilisation. N’envoie aucune donnée personnelle d’élève sans cadre et autorisation adaptés.\n\nContinuer ?'
 ))return;
 const status=document.getElementById('visual-import-status');
 const progress=useAlbert?window.CORTEX_ALBERT_IMPORT.progress('Préparer l’atelier avec Albert IA'):null;
 let parsed=null,aiDraft=null,aiError=null;
 try{
  progress?.update('Ouverture du document original…',0,1);
  if(status)status.textContent='Ouverture du document original…';
  const data=await window.CORTEX_VISUAL.inspect(file);
  if(useAlbert){
   try{
    if(progress.signal.aborted)throw Error('Analyse annulée.');
    progress.update('Extraction des textes et préparation des pages visuelles…',0,data.pages);
    parsed=await window.CORTEX_DOCS.parseFile(file,t=>progress.update(t,0,data.pages));
    aiDraft=await window.CORTEX_ALBERT_IMPORT.analyze(parsed.pages,{
      file,mode:'demo',progress,signal:progress.signal
    });
    progress.update('Albert a répondu. Construction des questions et association des documents…',parsed.pages.length,parsed.pages.length);
   }catch(err){aiError=err;console.warn('Albert import:',String(err));}
  }
  const sourceId='original-'+Date.now()+'-'+Math.floor(Math.random()*100000);
  await window.CORTEX_DOCS.storeFile({blob:file,kind:data.kind,filename:file.name,sourceId});
  const sourceQuestions=aiDraft?window.CORTEX_ALBERT_IMPORT.buildQuestions(aiDraft,parsed):
   (useAlbert&&parsed?.questions?.length?parsed.questions.slice(0,40).map((q,i)=>({
    ...q,id:'detected-'+Date.now()+'-'+i,number:i+1,assetIds:[],doc:'',points:Number(q.points)||1
   })):[]);
  const questions=sourceQuestions.length?sourceQuestions:
   [{id:'question-'+Date.now(),prompt:'',type:'text',points:1,page:1,assetIds:[]}];
  const exam={id:'import-'+Date.now()+'-'+Math.floor(Math.random()*10000),
   title:file.name.replace(/\.(pdf|docx)$/i,''),level:'Seconde Bac Pro',chapter:'PSE · Contrôle importé',
   duration:60,code:'DOC'+Math.floor(100000+Math.random()*900000),
   open:false,doc:'',sourceId,sourceType:data.kind,sourceName:file.name,
   sourcePages:parsed?.pages?.map(p=>String(p||'').slice(0,2500))||[],sourcePageCount:data.pages,
   assets:[],questions,
   aiPrepared:!!aiDraft,detectedDocuments:aiDraft?.documents||[],
   aiWarnings:aiDraft?.warnings||[],
   aiError:useAlbert&&!aiDraft?String(aiError?.message||'Analyse Albert indisponible.'):''};
  if(aiDraft){
   try{
    progress.update('Création des captures des documents détectés…',parsed.pages.length,parsed.pages.length);
    const made=await window.CORTEX_ALBERT_IMPORT.makeCaptures(file,aiDraft,questions,{
      max:50,onlyReferenced:true,signal:progress.signal,onProgress:txt=>progress.update(txt,parsed.pages.length,parsed.pages.length)
    });
    for(const image of made.captures){
     const captureId='albert-capture-'+Date.now()+'-'+Math.floor(Math.random()*1e8);
     await window.CORTEX_VISUAL.saveImage(image.blob,captureId);
     exam.assets.push({id:captureId,name:image.name.slice(0,90),page:image.page,createdAt:Date.now(),aiSuggested:true});
     for(const index of image.questionIndices){
      const q=exam.questions[index];
      if(q){q.assetIds.push(captureId);q.doc='';}
     }
    }
    if(made.skipped)exam.aiWarnings.push(made.skipped+' association(s) documentaire(s) restant à vérifier ou capturer manuellement.');
   }catch(err){
    exam.aiWarnings.push('Association automatique des captures incomplète : '+String(err?.message||err).slice(0,120));
   }
  }
  state.exams.unshift(exam);importExamId=exam.id;importNewExamId=exam.id;
  visualPage=1;visualQuestionId=exam.questions[0].id;save();render();
  if(aiDraft){
   progress.success('Atelier préparé : '+exam.questions.length+' question(s), '+exam.detectedDocuments.length+' document(s) et '+exam.assets.length+' capture(s).');
   showToast('Albert : proposition d’atelier prête à vérifier.');
  }else if(useAlbert){
   progress.failure(String(aiError?.message||'Analyse indisponible.'));
   showToast('Albert : échec identifié. Atelier classique prêt avec le document original.');
  }else showToast('Document original chargé. Crée les questions et captures de l’atelier classique.');
 }catch(error){
  if(status)status.textContent='Impossible d’ouvrir le document : '+String(error?.message||error);
  progress?.failure(String(error?.message||error));
  showToast(error?.message||'Importation impossible.');
 }
}
async function visualRecordCapture(blob,page){
 const exam=examBy(importExamId);
 if(!exam)return;
 try{
  const id='capture-'+Date.now()+'-'+Math.floor(Math.random()*100000);
  await window.CORTEX_VISUAL.saveImage(blob,id);
  exam.assets||=[];
  exam.assets.push({id,name:'Extrait '+(exam.assets.length+1),page:page||1,createdAt:Date.now()});
  save();showToast('Capture créée. Glisse-la vers Documents élève ou clique sur Ajouter.');render();
 }catch(err){showToast('Impossible de conserver la capture : '+err.message);}
}
function visualTarget(){
 const exam=view==='teacher'&&tab==='import'?examBy(importExamId):editor;
 const q=tab==='import'?exam?.questions.find(q=>q.id===visualQuestionId)||exam?.questions[0]:editor?.questions[editorIndex];
 return {exam,q};
}
function visualLink(id){
 const {exam,q}=visualTarget();
 if(!exam||!q||!exam.assets?.some(a=>a.id===id)){showToast('Capture indisponible.');return;}
 q.assetIds||=[];
 if(!q.assetIds.includes(id))q.assetIds.push(id);
 if(tab==='import')save();
 render();showToast('Capture ajoutée aux documents de la question.');
}
function visualUnlink(id){
 const {q}=visualTarget();if(!q)return;
 q.assetIds=(q.assetIds||[]).filter(x=>x!==id);
 if(tab==='import')save();
 render();
}
async function visualFile(file){
 if(!file)return;
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>6*1024*1024){showToast('Image PNG, JPG ou WebP de 6 Mo maximum.');return;}
 const {exam,q}=visualTarget();
 if(!exam||!q){showToast('Ouvre d’abord un contrôle et une question.');return;}
 try{
  const id='image-'+Date.now()+'-'+Math.floor(Math.random()*100000);
  await window.CORTEX_VISUAL.saveImage(file,id);
  exam.assets||=[];
  exam.assets.push({id,name:(file.name||'Capture collée').slice(0,70),page:null,createdAt:Date.now()});
  q.assetIds||[];q.assetIds.push(id);
  if(tab==='import')save();
  render();showToast('Image ajoutée aux documents de la question.');
 }catch(error){showToast('Enregistrement impossible : '+error.message);}
}
async function visualCopy(id){
 try{
  await window.CORTEX_VISUAL.copy(window.CORTEX_VISUAL.getImage(id));
  showToast('Image copiée dans le presse-papiers.');
 }catch(error){showToast(error.message);}
}
async function visualDownload(id){
 try{
  const {exam}=visualTarget(),asset=exam?.assets?.find(a=>a.id===id);
  const blob=await window.CORTEX_VISUAL.getImage(id);
  if(!blob)throw Error('Capture introuvable.');
  window.CORTEX_VISUAL.download(blob,(asset?.name||'document')+'.'+(blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg'));
 }catch(error){showToast(error.message);}
}
async function visualCopySource(download){
 try{
  const el=document.getElementById('visual-source-preview');
  const canvas=el?.querySelector('canvas');
  const source=canvas||el?.querySelector('.source-document')||el;
  const blobPromise=window.CORTEX_VISUAL.imageOfElement(source);
  if(download)window.CORTEX_VISUAL.download(await blobPromise,'document-question-'+(editorIndex+1)+'.png');
  else{await window.CORTEX_VISUAL.copy(blobPromise);showToast('Document copié en image.');}
 }catch(error){showToast('Copie impossible : '+error.message);}
}
function openOriginalFromBlob(blob,kind){
  if(previewFileUrl)URL.revokeObjectURL(previewFileUrl);
  previewFileUrl=URL.createObjectURL(blob);
  const link='<p class="small muted">Le fichier s’ouvre depuis ton appareil, sans transfert au serveur.</p>'+
    '<p><a class="btn secondary" target="_blank" rel="noopener" href="'+previewFileUrl+'">Ouvrir le fichier dans un nouvel onglet</a></p>';
  modalShow('Document original',link+(kind==='pdf'?'<iframe title="PDF original" class="pdf-original-frame" src="'+previewFileUrl+'"></iframe>':'<p>Pour un document Word, utilise le bouton ci-dessus. Les aperçus DOCX dépendent du navigateur.</p>'),btn('Fermer','close-modal','ghost'));
}
async function openSavedOriginal(sourceId){
  try {
    const file=await window.CORTEX_DOCS.readFile(sourceId);
    if(!file){showToast('Fichier original introuvable sur cet appareil.');return;}
    openOriginalFromBlob(file.blob,file.kind);
  }catch(error){showToast('Impossible de charger le document : '+error.message);}
}

function studentExam(){
const a=activeAttempt();
if(!a||a.status!=='progress'){tab='accueil';return studentWelcome();}
const e=examBy(a.examId),q=e.questions[currentQuestion]||e.questions[0];if(!q)return '<p>Ce contrôle ne contient pas de questions.</p>';
const answered=e.questions.filter(q=>answeredQuestion(a,q)).length;
const elapsed=Math.max(0,Math.floor((Date.now()-a.startedAt)/60000));const remaining=Math.max(0,e.duration-elapsed);
const ans=String(a.answers[q.id]??'');
if(e.pdfSource || e.sourceId) return renderDocumentStudent(e,q,a,answered,remaining);
return `<div class="page-head"><div><p class="eyebrow">CORTEX · Contrôle en cours</p><h1>${esc(e.title)}</h1><p>${esc(e.level)} · CLASSE : ${esc(a.className||examClassHeading(e))} · ${e.questions.length} questions · ${sum(e)} points</p></div><div class="btn-row">${pill((a.interruptions||0)+' interruption(s)',(a.interruptions||0)?'warn':'ok')}</div></div>
${window.CORTEX_CLOCK.render(e,a)}
<div class="exam-top"><div><strong>Ta progression : ${answered} / ${e.questions.length} réponses</strong><div class="small muted">Brouillon conservé uniquement sur cet appareil</div></div><div class="btn-row"><span class="chip teal" id="save-hint">✓ Sauvegarde locale</span><button class="btn ghost small" data-action="review-exam">Relire ma copie</button></div></div><div class="exam-progress" aria-label="${answered} réponses sur ${e.questions.length}"><span style="width:${answered/e.questions.length*100}%"></span></div>
<div class="student-exam"><section class="panel exam-question"><div class="question-number">QUESTION ${currentQuestion+1} / ${e.questions.length} · ${q.points} POINTS</div><h2>${esc(q.prompt)}</h2>${(q.doc||e.doc)?`<div class="question-doc"><strong>DOCUMENT SCIENTIFIQUE</strong><br>${esc(q.doc||e.doc)}</div>`:''}
${window.CORTEX_VISUAL?.renderAssets(e,q,'student')||''}
${window.CORTEX_QUESTION_TYPES.studentFields(q,ans)}
<div class="exam-nav"><button class="btn ghost" data-action="question-prev" ${currentQuestion===0?'disabled':''}>← Précédent</button>${currentQuestion===e.questions.length-1?btn('Relire et terminer →','review-exam',''):btn('Question suivante →','question-next','')}</div></section>
<aside class="panel sidebar-note"><div class="panel-head"><h2>Mes questions</h2>${pill( Math.round(answered/e.questions.length*100)+' %','ok')}</div><div class="question-dots">${e.questions.map((other,i)=>`<button class="question-dot ${i===currentQuestion?'current':''} ${answeredQuestion(a,other)?'answered':''}" title="Question ${i+1}" aria-label="Aller à la question ${i+1}" data-action="question-jump" data-index="${i}">${i+1}</button>`).join('')}</div><hr class="divider"><p class="small muted">Le passage à une autre application peut être détecté comme une interruption. Ce signal n'est jamais une preuve de triche.</p><button class="btn ghost small full" data-action="simulate-interruption">Simuler une interruption</button><p class="tiny muted" style="margin-top:13px">Fonction de démonstration. Elle n'identifie pas l'application ouverte.</p></aside></div>`;
}
function studentDone(){
const a=activeAttempt(),e=examBy(a?.examId);
return `<div class="panel student-done"><div class="done-icon">✓</div><p class="eyebrow" style="justify-content:center">Évaluation terminée</p><h1 style="font-size:38px">Copie remise !</h1><p class="lead">Ton contrôle « ${esc(e?.title||'Évaluation')} » a été ajouté au tableau de bord de démonstration.</p><p class="muted small">Aucune copie réelle n'a été envoyée. Pour voir tes réponses, repasse en profil professeur sur ce même navigateur.</p><div class="btn-row" style="justify-content:center;margin-top:28px">${btn('Accéder à Mon CORTEX ↗','portal-open','')}${btn('Retour à l’accueil','home','secondary')}</div></div>`;
}
function setAnswer(key,value){
const a=activeAttempt();if(!a||a.status!=='progress'||!authorizedAttempt(a))return;a.answers[key]=value;save();
const el=document.getElementById('save-hint');if(el)el.textContent='✓ Enregistré sur cet appareil';
}
function startExam(){
 const assignment=state.assignments.find(a=>a.id===studentAssignmentId&&a.token===studentQrToken&&a.active);
 const e=examBy(assignment?.examId);
 const cl=window.CORTEX_CLASSES.byId(state,assignment?.classId);
 const gr=assignment?.groupId?window.CORTEX_CLASSES.group(state,assignment.classId,assignment.groupId):null;
 if(!assignment||!e?.open||!cl||cl.archived||(assignment.groupId&&(!gr||gr.archived))){
   showToast('Accès QR invalide ou contrôle non publié. Demande un nouveau QR au professeur.');return;
 }
 const number=window.CORTEX_ACCESS.normalizeNumber(studentRollNumber,cl);
 if(tab!=='pret'||!number||!authorized(assignment,number)){
  showToast('PIN non validé. Recommence la connexion.');return;
 }
 studentRollNumber=number;
 const previous=state.attempts.find(at=>at.assignmentId===assignment.id&&at.studentNumber===number);
 if(previous?.status==='submitted'&&!studentSession?.demoPreview){showToast('Une copie a déjà été rendue pour ce numéro et ce contrôle. Contacte le professeur.');return;}
 if(previous?.status==='progress'&&!studentSession?.demoPreview){
  state.activeAttemptId=previous.id;currentQuestion=0;save();nav('student','examen');return;
 }
 const name='Élève n° '+number;
 const at={id:'attempt-'+Date.now()+'-'+Math.floor(Math.random()*99999),examId:e.id,assignmentId:assignment.id,
  classId:cl.id,className:cl.name,groupId:assignment.groupId||null,groupName:gr?.name||'Classe entière',
  name,studentNumber:studentRollNumber,status:'progress',startedAt:Date.now(),durationMinutes:Number(e.duration)||60,submittedAt:null,
  answers:{},grade:null,feedback:'',interruptions:0};
 state.attempts.push(at);state.activeAttemptId=at.id;currentQuestion=0;save();nav('student','examen');
}
function recordIntegrityEvent(event,{key}){
 const attempt=attemptBy(key);
 if(!attempt||attempt.status!=='progress'||!authorizedAttempt(attempt))return;
 state.events.push({...event,id:window.CORTEX_EXAM_INTEGRITY.eventId(),attemptId:key});
 if(event.kind==='tab_hidden'||event.kind==='simulation')attempt.interruptions=(attempt.interruptions||0)+1;
 save();
}
function modalShow(title,content,footer=''){
modal.innerHTML=`<div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-top"><h2 id="modal-title">${title}</h2><button type="button" class="icon-btn" aria-label="Fermer" data-action="close-modal">✕</button></div>${content}${footer?`<div class="btn-row" style="margin-top:19px">${footer}</div>`:''}</div>`;
modal.querySelector('[data-action="close-modal"]')?.focus();
}
function closeModal(){modal.innerHTML='';}
function previewCopy(id){
const a=attemptBy(id),e=examBy(a?.examId);if(!a||!e)return;
modalShow('Copie · '+esc(a.name),`<p class="muted small">${esc(e.title)} · ${a.interruptions||0} interruption(s) enregistrée(s) · Toutes les notes sont fictives.</p><div class="preview-list">${e.questions.map((q,i)=>`<div class="summary-answer"><strong>${i+1}. ${esc(q.prompt)} (${q.points} pt)</strong><p>${esc(window.CORTEX_QUESTION_TYPES.summary(q,a.answers[q.id]))}</p></div>`).join('')}</div><hr class="divider"><div class="field"><label for="manual-grade">Note proposée par le professeur, sur 20</label><input id="manual-grade" type="number" min="0" max="20" step=".5" value="${a.grade??''}" placeholder="Ex. 14.5"></div><div class="field"><label for="manual-feedback">Commentaire pédagogique</label><textarea id="manual-feedback" rows="3">${esc(a.feedback)}</textarea></div>`,
`<button class="btn" data-action="save-grade" data-id="${esc(a.id)}">Enregistrer la note</button>${btn('Fermer','close-modal','ghost')}`);
}
function reviewExam(){
const a=activeAttempt(),e=examBy(a?.examId);if(!a||!e)return;
if(handwriting?.busy){showToast('Attends la fin de l’enregistrement de ta photo.');return;}
const empty=e.questions.filter(q=>!answeredQuestion(a,q)).length;
modalShow('Relire ma copie',`<p>${e.questions.length-empty} réponses sur ${e.questions.length}. ${empty?'<strong>'+empty+' question(s) sans réponse.</strong>':'Toutes les questions ont une réponse.'}</p><div class="preview-list">${e.questions.map((q,i)=>`<div class="summary-answer"><strong>Question ${i+1}</strong><p>${hasPhoto(a,q)&&!String(a.answers[q.id]??'').trim()?'Réponse manuscrite jointe':esc(window.CORTEX_QUESTION_TYPES.summary(q,a.answers[q.id]))}</p>${photoReview(a,q)}</div>`).join('')}</div><p class="small muted">Cette remise reste une simulation enregistrée dans ton navigateur.</p>`,
`<button class="btn" data-action="confirm-submit">Rendre ma copie →</button>${btn('Continuer à répondre','close-modal','ghost')}`);
}
function notifyAbout(){
modalShow('Comment fonctionne cette démonstration ?',`<p>Tu peux explorer librement les profils <strong>Professeur</strong> et <strong>Élève</strong>, sans créer de compte.</p><div class="preview-list"><div class="summary-answer"><strong>Ce qui fonctionne</strong><p>Création de contrôles fictifs, passage d'un contrôle, sauvegarde dans ce navigateur, copie remise, correction manuelle et journal d'interruptions local.</p></div><div class="summary-answer"><strong>Ce qui n'est pas activé</strong><p>Comptes réels, traitement de PDF, stockage serveur, suivi de classe à distance et correction IA par RTX 3060. Rien n'est envoyé sur internet depuis les formulaires.</p></div></div><p class="small muted">Évite d'utiliser de vraies données scolaires : cette page est publique.</p>`,btn('Compris','close-modal',''));
}
function setReviewPoints(value){
 const at=attemptBy(reviewAttemptId),e=examBy(at?.examId),q=e?.questions[reviewIndex];
 if(!at||!q)return;
 at.marks ||= {};
 at.marks[q.id] ||= {};
 if(value===''||value===null){delete at.marks[q.id].points;}
 else {
   const n=Number(value),max=Number(q.points);
   if(!Number.isFinite(n)||n<0||n>max){showToast('Choisis une valeur entre 0 et '+max+' point(s).');return;}
   at.marks[q.id].points=Math.round(n*100)/100;
 }
 at.publishedToStudent=false;at.reviewedAt=null;
 save();render();
}
function classAction(action,id,el){
 const C=window.CORTEX_CLASSES;
 const cl=()=>C.byId(state,id);
 const close=()=>{closeModal();render();};
 if(action==='class-open-manager'){nav('teacher','classes');return true;}
 if(action==='class-open'||action==='class-go'){
  const key=action==='class-go'?teacherClassFilter:id;
  if(key&&C.byId(state,key)){selectedClassId=key;nav('teacher','classes');}
  else nav('teacher','classes');
  return true;
 }
 if(action==='class-add'){
  const name=C.codeName(document.getElementById('new-class-name')?.value);
  if(!name||name.length>32){showToast('Saisis un nom de classe valide.');return true;}
  const found=state.classes.find(c=>c.name.toUpperCase()===name);
  if(found){
   if(!found.archived){showToast('Cette classe existe déjà.');return true;}
   found.archived=false;selectedClassId=found.id;
  }else{
   const id='classe-'+C.id();state.classes.push({id,name,groups:[],archived:false});selectedClassId=id;
  }
  save();render();showToast('Classe ajoutée.');return true;
 }
 if(action==='class-ask-delete'){
  const item=cl();if(!item)return true;
  modalShow('Supprimer la classe',`<p>Archiver <strong>${esc(item.name)}</strong> ?</p>
  <div class="danger-confirmation"><strong>La classe ne sera plus proposée dans les menus ni les QR codes.</strong>
  <p>Les contrôles, copies et corrections déjà enregistrés seront conservés, avec le nom de la classe.</p></div>`,
  `<button class="btn danger" data-action="class-confirm-delete" data-id="${esc(item.id)}">Confirmer l’archivage</button>`+btn('Annuler','close-modal','ghost'));
  return true;
 }
 if(action==='class-confirm-delete'){
  const item=cl();if(!item)return true;
  item.archived=true;
  state.assignments.forEach(a=>{if(a.classId===id)a.active=false;});
  if(selectedClassId===id)selectedClassId=state.classes.find(c=>!c.archived)?.id||null;
  if(teacherClassFilter===id){teacherClassFilter='';teacherGroupFilter='';}
  save();close();showToast('Classe archivée ; copies conservées.');return true;
 }
 if(action==='class-split'){
  const item=cl();if(!item)return true;
  for(const [key,name] of [['g1','Demi-groupe 1'],['g2','Demi-groupe 2']]){
   const existing=item.groups.find(g=>g.id===key||g.name===name);
   if(existing)existing.archived=false;
   else item.groups.push({id:key,name,archived:false});
  }
  state.assignments.forEach(a=>{if(a.classId===id&&a.groupId==null)a.active=false;});
  save();render();showToast('Deux demi-groupes créés. Affecte un contrôle à chacun pour générer ses QR codes.');return true;
 }
 if(action==='class-merge'){
  const item=cl();if(!item)return true;
  modalShow('Revenir à la classe entière',`<p>Les groupes de <strong>${esc(item.name)}</strong> seront archivés. Les copies existantes restent conservées.</p>
  <div class="danger-confirmation">Les QR codes des anciens demi-groupes deviendront inactifs. Il faudra affecter le contrôle à la classe entière.</div>`,
  `<button class="btn danger" data-action="class-confirm-merge" data-id="${esc(id)}">Archiver les demi-groupes</button>`+btn('Annuler','close-modal','ghost'));
  return true;
 }
 if(action==='class-confirm-merge'){
  const item=cl();if(!item)return true;
  item.groups.forEach(g=>g.archived=true);
  state.assignments.forEach(a=>{if(a.classId===id&&a.groupId)a.active=false;});
  teacherGroupFilter='';save();close();showToast('Classe entière rétablie ; historique conservé.');return true;
 }
 if(action==='class-group-add'){
  const item=cl(),name=(document.getElementById('class-new-group')?.value||'').trim().slice(0,32);
  if(!item||!name){showToast('Donne un nom au demi-groupe.');return true;}
  const existing=item.groups.find(g=>g.name.toLowerCase()===name.toLowerCase());
  if(existing&&!existing.archived){showToast('Ce demi-groupe existe déjà.');return true;}
  if(existing)existing.archived=false;else item.groups.push({id:'g-'+C.id(),name,archived:false});
  state.assignments.forEach(a=>{if(a.classId===id&&a.groupId==null)a.active=false;});
  save();render();showToast('Demi-groupe ajouté.');return true;
 }
 if(action==='class-ask-delete-group'){
  const item=cl(),g=C.group(state,id,el.dataset.group);if(!item||!g)return true;
  modalShow('Supprimer le demi-groupe',`<p>Archiver <strong>${esc(g.name)}</strong> dans ${esc(item.name)} ?</p>
   <div class="danger-confirmation">Les anciens QR codes du groupe seront désactivés. Les copies et les corrections seront conservées.</div>`,
   `<button class="btn danger" data-action="class-confirm-delete-group" data-id="${esc(id)}" data-group="${esc(g.id)}">Archiver ce groupe</button>`+btn('Annuler','close-modal','ghost'));
  return true;
 }
 if(action==='class-confirm-delete-group'){
  const g=C.group(state,id,el.dataset.group);if(!g)return true;g.archived=true;
  state.assignments.forEach(a=>{if(a.classId===id&&a.groupId===g.id)a.active=false;});
  if(teacherGroupFilter===g.id)teacherGroupFilter='';
  save();close();showToast('Demi-groupe archivé ; copies conservées.');return true;
 }
 if(action==='class-assign'){
  const item=cl(),examId=document.getElementById('class-assign-exam')?.value||'';
  const groupId=document.getElementById('class-assign-group')?.value||null;
  const exam=examBy(examId);
  if(!item||item.archived||!exam){showToast('Choisis un contrôle et une classe valides.');return true;}
  const hasGroups=item.groups.some(g=>!g.archived);
  if(hasGroups&&(!groupId||!item.groups.some(g=>g.id===groupId&&!g.archived))){
   showToast('Choisis un demi-groupe actif.');return true;
  }
  const existing=state.assignments.find(a=>a.examId===examId&&a.classId===id&&(a.groupId||null)===groupId);
  if(existing){existing.active=true;save();showToast('Accès QR réactivé.');currentQrAssignmentId=existing.id;openClassQR(existing.id);return true;}
  const random=Array.from({length:4},()=>Math.random().toString(36).slice(2,9)).join('');
  const token='QR-'+random;
  const assignment={id:'acces-'+C.id(),examId,classId:id,groupId,token,active:true,createdAt:Date.now()};
  state.assignments.push(assignment);save();currentQrAssignmentId=assignment.id;openClassQR(assignment.id);
  return true;
 }
 if(action==='class-unassign'){
  const a=state.assignments.find(x=>x.id===id);if(!a)return true;
  modalShow('Retirer l’accès QR',`<p>Retirer l’affectation <strong>${esc(C.assignmentLabel(state,a))}</strong> ? Les copies existantes ne seront pas supprimées.</p>`,
   `<button class="btn danger" data-action="class-confirm-unassign" data-id="${esc(id)}">Désactiver ce QR</button>`+btn('Annuler','close-modal','ghost'));
  return true;
 }
 if(action==='class-confirm-unassign'){
  const a=state.assignments.find(x=>x.id===id);if(a){a.active=false;save();}
  close();showToast('QR désactivé, copies conservées.');return true;
 }
 if(action==='class-open-qr'){openClassQR(id);return true;}
 if(action==='class-qr-list'){
  const exam=examBy(id);
  if(exam)modalShow('QR codes du contrôle',C.qrChoices(state,exam),btn('Fermer','close-modal','ghost'));
  return true;
 }
 if(action==='class-assignment-copies'){
  const a=state.assignments.find(x=>x.id===id);
  if(a){teacherClassFilter=a.classId;teacherGroupFilter=a.groupId||'';nav('teacher','copies');}
  return true;
 }
 if(action==='class-show-copies'||action==='class-group-copies'){
  teacherClassFilter=id;teacherGroupFilter=action==='class-group-copies'?el.dataset.group||'':'';
  nav('teacher','copies');return true;
 }
 if(action==='class-qr-copy'||action==='class-qr-download'||action==='class-qr-simulate'){
  const a=state.assignments.find(x=>x.id===id&&x.active);if(!a){showToast('Accès QR indisponible.');return true;}
  const url=C.qrLink(a);
  if(action==='class-qr-simulate'){closeModal();location.hash='#eleve/rejoindre/'+encodeURIComponent(a.id)+'/'+encodeURIComponent(a.token);routePage();return true;}
  if(action==='class-qr-copy'){
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url).then(()=>showToast('Lien QR copié.')).catch(()=>showToast('Copie bloquée : sélectionne le lien affiché.'));
   else showToast('Sélectionne le lien pour le copier.');
   return true;
  }
  const target=document.getElementById('class-qr-image'),canvas=target?.querySelector('canvas'),image=target?.querySelector('img');
  const href=canvas?.toDataURL?.('image/png')||image?.src;
  if(!href){showToast('QR non prêt : réessaie dans un instant.');return true;}
  const link=document.createElement('a');link.download='CORTEX-'+C.classLabel(state,a.classId)+(a.groupId?'-'+C.groupLabel(state,a.classId,a.groupId):'')+'-QR.png';
  link.href=href;document.body.appendChild(link);link.click();link.remove();return true;
 }
 if(action==='class-student-number'){
  const input=document.getElementById('student-number');
  const assignment=state.assignments.find(a=>a.id===studentAssignmentId&&a.token===studentQrToken&&a.active);
  const cl=window.CORTEX_CLASSES.byId(state,assignment?.classId);
  if(!assignment||!cl||!examBy(assignment.examId)?.open){showToast('Ce contrôle n’est pas accessible.');return true;}
  const number=window.CORTEX_ACCESS.normalizeNumber(input?.value,cl);
  if(!number){input?.focus?.();showToast('Choisis ton numéro de liste entre 1 et '+window.CORTEX_ACCESS.count(cl)+'.');return true;}
  studentRollNumber=number;studentSession=null;
  nav('student','pin/'+encodeURIComponent(studentAssignmentId)+'/'+encodeURIComponent(studentQrToken));return true;
 }
 if(action==='class-student-pin'){submitStudentPin();return true;}
 if(action==='class-student-edit-number'){
  studentRollNumber='';studentSession=null;
  nav('student','rejoindre/'+encodeURIComponent(studentAssignmentId)+'/'+encodeURIComponent(studentQrToken));return true;
 }
 if(action==='class-student-start'){startExam();return true;}
 return false;
}
async function submitStudentPin(){
 if(studentPinBusy)return;
 const assignment=state.assignments.find(a=>a.id===studentAssignmentId&&a.token===studentQrToken&&a.active);
 const cl=window.CORTEX_CLASSES.byId(state,assignment?.classId);
 const number=window.CORTEX_ACCESS.normalizeNumber(studentRollNumber,cl);
 if(tab!=='pin'||!assignment||!cl||!number||!examBy(assignment.examId)?.open){showToast('Recommence depuis le QR code de ton contrôle.');return;}
 const pin=String(document.getElementById('student-pin')?.value||'');
 const confirmation=String(document.getElementById('student-pin-confirm')?.value||'');
 const status=window.CORTEX_ACCESS.record(state,cl,number);
 const button=document.querySelector('[data-action="class-student-pin"]');
 studentPinBusy=true;
 if(button){button.disabled=true;button.textContent='Vérification du PIN…';}
 try{
  if(status)await window.CORTEX_ACCESS.verify(state,cl,number,pin);
  else await window.CORTEX_ACCESS.enroll(state,cl,number,pin,confirmation);
  save();
  if(studentAssignmentId!==assignment.id||studentRollNumber!==number||view!=='student')return;
  const current=window.CORTEX_ACCESS.record(state,cl,number);
  if(!current)throw Error('PIN réinitialisé. Recommence la connexion.');
  studentSession={assignmentId:assignment.id,classId:cl.id,number,hash:current.hash};
  nav('student','pret/'+encodeURIComponent(assignment.id)+'/'+encodeURIComponent(assignment.token));
  showToast(status?'PIN accepté.':'PIN créé. Conserve-le pour tes prochains contrôles.');
 }catch(err){
  save();showToast(err?.message||'Impossible de valider le PIN.');
  if(button?.isConnected){button.disabled=false;button.textContent=status?'Valider mon PIN →':'Créer mon PIN et continuer →';}
 }finally{studentPinBusy=false;}
}
function openClassQR(id){
 const a=state.assignments.find(x=>x.id===id&&x.active),exam=examBy(a?.examId);
 if(!a||!exam){showToast('Affectation QR introuvable.');return;}
 currentQrAssignmentId=id;
 const url=window.CORTEX_CLASSES.qrLink(a);
 modalShow('QR code de la classe',window.CORTEX_CLASSES.qrModal(state,a,exam,url),btn('Fermer','close-modal','ghost'));
 Promise.resolve().then(()=>window.CORTEX_CLASSES.drawQr(url,'class-qr-image')).catch(err=>showToast(err.message));
}
function pinClass(id){
 const assignment=state.assignments.find(x=>x.id===id);
 return window.CORTEX_CLASSES.byId(state,assignment?.classId||id);
}
function openAccessCodes(id){
 const cl=pinClass(id);
 if(!cl||cl.archived){showToast('Classe introuvable.');return;}
 modalShow('PIN des élèves · '+esc(cl.name),window.CORTEX_ACCESS.render(state,cl),'<button class="btn secondary" data-action="portal-class-code" data-id="'+esc(cl.id)+'">Gérer le code de classe</button>'+btn('Fermer','close-modal','ghost'));
}
function handleAccessAction(kind,id,el){
 const cl=pinClass(id),A=window.CORTEX_ACCESS;
 if(!cl||cl.archived){showToast('Classe introuvable.');return;}
 if(kind==='access-manage'){openAccessCodes(cl.id);return;}
 try{
  if(kind==='access-set-count'){
   A.setCount(state,cl,document.getElementById('access-count')?.value);
   save();openAccessCodes(cl.id);showToast('Effectif de la classe mis à jour.');return;
  }
  if(kind==='access-ask-reset'){
   const number=A.normalizeNumber(el.dataset.number,cl);
   if(!number||!A.record(state,cl,number))throw Error('Ce numéro n’a pas encore de PIN.');
   modalShow('Réinitialiser le PIN · N° '+esc(number),
    '<p>Le PIN du numéro '+esc(number)+' sera effacé pour <strong>'+esc(cl.name)+'</strong>. L’élève pourra choisir un nouveau PIN lors de sa prochaine connexion.</p>'+
    '<p class="class-qr-warning">Les copies et notes ne seront pas supprimées. L’ancien PIN ne fonctionnera plus.</p>',
    '<button type="button" class="btn danger" data-action="access-confirm-reset" data-id="'+esc(cl.id)+'" data-number="'+esc(number)+'">Réinitialiser ce PIN</button>'+
    '<button type="button" class="btn secondary" data-action="access-manage" data-id="'+esc(cl.id)+'">Annuler</button>');
   return;
  }
  if(kind==='access-confirm-reset'){
   const number=A.reset(state,cl,el.dataset.number);save();openAccessCodes(cl.id);
   showToast('PIN du n° '+number+' réinitialisé. Sa copie est conservée.');return;
  }
 }catch(err){showToast(err?.message||'Opération impossible.');}
}
let pdfExportBusy=false;
async function downloadPDFCopies(copies,scopeLabel=''){
 if(pdfExportBusy){showToast('Un export PDF est déjà en cours.');return;}
 if(!copies.length){showToast('Aucune copie remise dans cette sélection.');return;}
 if(!window.CORTEX_PDF){showToast('Module PDF indisponible. Recharge la page.');return;}
 pdfExportBusy=true;
 const status=document.getElementById('pdf-export-status');
 if(status){status.hidden=false;status.textContent='Préparation du PDF de '+copies.length+' copie(s)…';}
 try{
  const result=await window.CORTEX_PDF.exportCopies(copies,examBy,{
   scope:scopeLabel||teacherClassFilter||'Toutes_classes',
   onProgress:(index,total,at)=>{
    if(status)status.textContent='Création du PDF : '+index+' / '+total+' copie(s) - '+(at.className||'Classe');
   }
  });
  const warnings=Array.isArray(result.warnings)?result.warnings:[];
  if(warnings.length){
   if(status)status.textContent='PDF créé ('+result.pages+' pages), mais '+warnings.length+' document(s) ou aperçu(s) n’ont pas pu être restitués à l’identique. Consulte les avertissements dans le PDF.';
   showToast('PDF téléchargé avec '+warnings.length+' alerte(s) sur les documents sources.');
  }else{
   if(status)status.textContent='PDF généré avec les documents disponibles : '+result.filename+' ('+result.pages+' pages).';
   showToast('PDF prêt avec les documents : '+result.count+' copie(s).');
  }
 }catch(error){
  if(status)status.textContent='Export PDF impossible : '+(error?.message||error);
  showToast('Export PDF : '+(error?.message||'échec de génération'));
 }finally{pdfExportBusy=false;}
}

function action(el){
const a=el.dataset.action,id=el.dataset.id;
if(a==='demo-photo-pdf'){
 const attempt=attemptBy(id),exam=examBy(attempt?.examId);
 if(attempt&&exam)handwritingModule().then(m=>m.downloadHandwriting(photoKey(attempt),exam.questions,el.dataset.question)).catch(error=>showToast(error.message));
 return;
}
if(handwriting?.busy&&['question-next','question-prev','question-jump','confirm-submit'].includes(a)){
 showToast('Attends la fin de l’enregistrement de ta photo.');return;
}
if(a==='pdf-download-copy'){
 const at=attemptBy(id);
 if(!at||at.status!=='submitted'){showToast('Copie non remise ou introuvable.');return;}
 downloadPDFCopies([at],(at.className||'Classe')+'_'+(at.groupName||'Groupe'));return;
}
if(a==='pdf-download-batch'){
 const list=state.attempts.filter(at=>at.status==='submitted'&&window.CORTEX_CLASSES.copyMatch(at,teacherClassFilter,teacherGroupFilter))
   .sort((x,y)=>String(x.className||'').localeCompare(String(y.className||''),'fr')||String(x.groupName||'').localeCompare(String(y.groupName||''),'fr')||String(x.studentNumber||'').localeCompare(String(y.studentNumber||''),'fr',{numeric:true}));
 downloadPDFCopies(list,(teacherClassFilter?window.CORTEX_CLASSES.classLabel(state,teacherClassFilter):'Toutes_classes')+(teacherGroupFilter?'_'+window.CORTEX_CLASSES.groupLabel(state,teacherClassFilter,teacherGroupFilter):''));return;
}
if(a.startsWith('portal-')){portalAction(a,el);return;}
if(a.startsWith('access-')){handleAccessAction(a,id,el);return;}
if(a.startsWith('class-')&&classAction(a,id,el))return;
if(a==='demo-pse-open'){nav('student','decouverte');return;}
if(a==='demo-pse-entry'){prepareDemoPse();return;}
if(a==='home'){nav('home');return;}
if(a==='teacher'){nav('teacher');return;}
if(a==='student'){nav('student');return;}
if(a==='student-stages'){nav('student','stages');return;}
if(a==='about'){notifyAbout();return;}
if(a==='integrity-scroll-controls'){document.getElementById('integrity-controls')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
if(a==='integrity-scroll-journal'){monitorExamId=id||'';nav('teacher','suivi');return;}
if(a==='integrity-open'){nav('teacher','integrite');return;}
if(a==='integrity-quick-toggle'){
 const ex=examBy(id),key=el.dataset.tool,I=window.CORTEX_INTEGRITY;
 if(!ex||!Object.prototype.hasOwnProperty.call(I.defaults(),key))return;
 integritySetupId=ex.id;
 I.update(ex,key,!I.config(ex)[key]);save();render();
 showToast('Réglage '+(I.config(ex)[key]?'activé':'désactivé')+' pour « '+ex.title+' ».');return;
}
if(a==='integrity-settings'){const ex=examBy(id);if(ex)modalShow('Protection du contrôle',window.CORTEX_INTEGRITY.settings(ex),btn('Fermer','close-modal','ghost'));return;}
if(a==='integrity-attempt'){const at=attemptBy(id);if(at)modalShow('Événements · '+esc(at.name),window.CORTEX_INTEGRITY.attemptEvents(state.events,at,examBy(at.examId)),btn('Fermer','close-modal','ghost'));return;}
if(a==='teacher-tab'){if(el.dataset.tab==='creer'){editor=editorFor(null);editorIndex=0;}nav('teacher',el.dataset.tab);return;}
if(a==='create'){editor=editorFor(null);editorIndex=0;editorDocTab='documents';nav('teacher','creer');return;}
if(a==='go-import'){importExamId=null;visualPage=1;visualQuestionId=null;nav('teacher','import');return;}
if(a==='choose-pdf'){showToast('L’élève doit scanner le QR code généré par le professeur.');return;}
if(a==='try-pdf-demo'){const e=examBy('sommeil-pdf-a2');if(e)modalShow('QR du contrôle',window.CORTEX_CLASSES.qrChoices(state,e),btn('Fermer','close-modal','ghost'));return;}
if(a==='visual-import-file'){processImport(document.getElementById('visual-doc-file')?.files?.[0]);return;}
if(a==='visual-import-albert'){processImport(document.getElementById('visual-doc-file')?.files?.[0],{ai:true});return;}
if(a==='visual-clear-selection'){
 const input=document.getElementById('visual-doc-file');if(input){input.value='';input.click();}
 const status=document.getElementById('visual-import-status');if(status)status.textContent='Sélectionne le bon document puis choisis ton mode.';
 return;
}
if(a==='visual-jump-page'){
 const exam=examBy(importExamId);if(!exam)return;
 visualPage=Math.max(1,Math.min(Number(exam.sourcePageCount)||1,Number(el.dataset.page)||1));
 render();return;
}
if(a==='visual-replace-document'){
 const ex=examBy(importExamId);
 if(ex&&ex.id===importNewExamId&&!state.attempts.some(at=>at.examId===ex.id)){
  if(!window.confirm('Revenir au choix du document ? Le contrôle importé par erreur sera supprimé de cette démonstration locale.'))return;
  state.exams=state.exams.filter(item=>item.id!==ex.id);
  window.CORTEX_DOCS.deleteFile(ex.sourceId).catch(()=>{});
  for(const asset of ex.assets||[])window.CORTEX_VISUAL.removeImage(asset.id).catch(()=>{});
  save();
 }
 importExamId=null;importNewExamId=null;visualPage=1;visualQuestionId=null;
 nav('teacher','import');return;
}
if(a==='import-doc-file'){processImport(document.getElementById('cortex-import-file')?.files?.[0]);return;}
if(a==='visual-open-existing'){
 const exam=examBy(id);if(!exam?.sourceId)return;
 importExamId=id;visualPage=1;visualQuestionId=exam.questions?.[0]?.id||null;nav('teacher','import');return;
}
if(a==='visual-return-import'){
 if(!editor?.sourceId)return;
 const existing=state.exams.findIndex(x=>x.id===editor.id);
 const content=JSON.parse(JSON.stringify(editor));delete content.isNew;
 if(existing>=0)state.exams[existing]=content;else state.exams.unshift(content);
 save();importExamId=editor.id;visualPage=1;visualQuestionId=editor.questions[editorIndex]?.id||null;
 nav('teacher','import');return;
}
if(a==='visual-edit-questions'){
 const ex=examBy(importExamId);if(!ex)return;
 editor=editorFor(ex.id);editor.isNew=false;editorIndex=Math.max(0,ex.questions.findIndex(q=>q.id===visualQuestionId));
 editorDocTab='documents';nav('teacher','creer');return;
}
if(a==='visual-page-prev'||a==='visual-page-next'){
 const ex=examBy(importExamId);if(!ex)return;
 visualPage=Math.max(1,Math.min(ex.sourcePageCount||1,visualPage+(a==='visual-page-next'?1:-1)));
 render();return;
}
if(a==='visual-capture-full'){window.CORTEX_VISUAL.fullBlob().then(b=>visualRecordCapture(b,visualPage)).catch(err=>showToast(err.message));return;}
if(a==='visual-download-original'){
 const ex=examBy(importExamId);if(!ex)return;
 window.CORTEX_DOCS.readFile(ex.sourceId).then(f=>{if(f)window.CORTEX_VISUAL.download(f.blob,ex.sourceName||'controle.pdf')}).catch(err=>showToast(err.message));return;
}
if(a==='visual-copy-original'){
 window.CORTEX_VISUAL.copy(window.CORTEX_VISUAL.fullBlob()).then(()=>showToast('Page copiée en image.')).catch(err=>showToast(err.message));return;
}
if(a==='visual-attach'){visualLink(id);return;}
if(a==='visual-detach'){visualUnlink(id);return;}
if(a==='visual-copy-asset'){visualCopy(id);return;}
if(a==='visual-download-asset'){visualDownload(id);return;}
if(a==='visual-delete-asset'){
 const ex=examBy(importExamId);if(!ex)return;
 ex.assets=(ex.assets||[]).filter(x=>x.id!==id);ex.questions.forEach(q=>q.assetIds=(q.assetIds||[]).filter(x=>x!==id));save();render();
 if(!state.exams.some(e=>e.assets?.some(x=>x.id===id)))window.CORTEX_VISUAL.removeImage(id).catch(()=>{});
 showToast('Capture supprimée des documents.');return;
}
if(a==='visual-paste-image'){
 window.CORTEX_VISUAL.paste().then(blob=>visualFile(new File([blob],'Capture collée.png',{type:blob.type||'image/png'}))).catch(err=>showToast(err.message));
 return;
}
if(a==='visual-copy-source'){visualCopySource(false);return;}
if(a==='visual-download-source'){visualCopySource(true);return;}
if(a==='editor-doc-tab'){editorDocTab=el.dataset.tab==='documents'?'documents':'source';render();return;}
if(a==='show-exam-original'){const e=examBy(id);if(e?.sourceId)openSavedOriginal(e.sourceId);return;}
if(a==='dashboard-preview'){const exam=examBy(id);if(exam)examPreviewModal(exam);return;}
if(a==='preview-try-exam'){
 const exam=examBy(id);if(!exam)return;
 closeModal();openTeacherSimulator(exam);return;
}
if(a==='ask-delete-exam'){
 const exam=examBy(id);if(!exam)return;
 const related=state.attempts.filter(x=>x.examId===id);
 modalShow('Confirmer la suppression', '<p>Tu t’apprêtes à supprimer le contrôle suivant de cette démonstration :</p>'+
   '<div class="danger-confirmation"><strong>'+esc(exam.title)+'</strong>'+
   '<span class="danger-number">'+exam.questions.length+' questions</span>'+
   '<ul><li>Suppression du contrôle et de ses documents associés.</li>'+
   '<li>Suppression de '+related.length+' copie(s), notes et interruptions liées.</li>'+
   '<li>Action irréversible dans cette version de démonstration.</li></ul></div>'+
   '<p class="muted small">La suppression ne concerne que les données de ce navigateur, pas ton dépôt GitHub.</p>',
   '<button type="button" class="btn danger" data-action="confirm-delete-exam" data-id="'+esc(id)+'">Supprimer définitivement</button>'+
   btn('Annuler','close-modal','ghost'));
 return;
}
if(a==='confirm-delete-exam'){
 const exam=examBy(id);if(!exam){closeModal();return;}
 const deletedAttempts=new Set(state.attempts.filter(x=>x.examId===id).map(x=>x.id));
 state.exams=state.exams.filter(x=>x.id!==id);
 state.attempts=state.attempts.filter(x=>x.examId!==id);
 state.assignments.forEach(a=>{if(a.examId===id)a.active=false;});
 state.events=state.events.filter(x=>!deletedAttempts.has(x.attemptId));
 if(deletedAttempts.has(state.activeAttemptId))state.activeAttemptId=null;
 if(editor?.id===id){editor=null;editorIndex=0;}
 if(reviewAttemptId && deletedAttempts.has(reviewAttemptId))reviewAttemptId=null;
 if(chosenCode===exam.code)chosenCode=state.exams.find(x=>x.open)?.code||'';
 save();closeModal();render();
 if(exam.sourceId && !state.exams.some(x=>x.sourceId===exam.sourceId) && window.CORTEX_DOCS?.deleteFile)window.CORTEX_DOCS.deleteFile(exam.sourceId).catch(()=>{});
 for(const asset of exam.assets||[]){
   if(!state.exams.some(other=>other.assets?.some(x=>x.id===asset.id)))
    window.CORTEX_VISUAL?.removeImage(asset.id).catch(()=>{});
 }
 showToast('Contrôle et copies associées supprimés de cette démo.');
 return;
}
if(a==='go-exams'){nav('teacher','controles');return;}
if(a==='editor-select'){
  const idx=Number(el.dataset.index);
  if(editor&&Number.isInteger(idx)&&idx>=0&&idx<editor.questions.length){editorIndex=idx;render();}
  return;
}
if(a==='editor-prev'||a==='editor-next'){
  if(!editor)return;
  editorIndex=Math.max(0,Math.min(editor.questions.length-1,editorIndex+(a==='editor-next'?1:-1)));
  render();return;
}
if(a==='editor-add-question'){
  if(!editor)return;
  const prev=editor.questions[editorIndex],n=Math.max(0,...editor.questions.map(q=>Number(q.number||0)))+1;
  const q={id:'q-'+Date.now()+'-'+Math.floor(Math.random()*10000),type:'text',prompt:'',points:1};
  if(editor.pdfSource){q.section=Number(prev?.section||0);q.number=n;}
  if(editor.sourceId){q.page=Number(prev?.page||1);}
  editor.questions.splice(editorIndex+1,0,q);editorIndex++;render();return;
}
if(a==='editor-delete'){
  if(!editor||editor.questions.length<=1)return;
  editor.questions.splice(editorIndex,1);
  editorIndex=Math.min(editorIndex,editor.questions.length-1);render();return;
}
if(a==='editor-duplicate'){
  if(!editor)return;
  const src=editor.questions[editorIndex],q=JSON.parse(JSON.stringify(src));
  q.id='q-'+Date.now()+'-'+Math.floor(Math.random()*10000);
  if(editor.pdfSource)q.number=Math.max(0,...editor.questions.map(x=>Number(x.number||0)))+1;
  q.prompt=q.prompt+' (variante)';
  editor.questions.splice(editorIndex+1,0,q);editorIndex++;render();return;
}
if(a==='editor-move-up'||a==='editor-move-down'){
  if(!editor)return;
  const to=editorIndex+(a==='editor-move-up'?-1:1);
  if(to<0||to>=editor.questions.length)return;
  const [q]=editor.questions.splice(editorIndex,1);editor.questions.splice(to,0,q);
  editorIndex=to;render();return;
}
if(a==='editor-original'){if(editor?.sourceId)openSavedOriginal(editor.sourceId);return;}
if(a==='go-copies'){nav('teacher','copies');return;}
if(a==='edit-exam'){editor=editorFor(id);editor.isNew=false;editorIndex=0;editorDocTab='source';nav('teacher','creer');return;}
if(a==='duplicate-exam'){
  const exam=examBy(id);if(!exam)return;
  const validClasses=state.classes.filter(c=>!c.archived);
  if(!validClasses.length){showToast('Crée d’abord une classe pour y dupliquer ce contrôle.');return;}
  const selected=validClasses.find(c=>c.id!==exam.classId)?.id||validClasses[0].id;
  modalShow('Dupliquer vers une autre classe · '+esc(exam.title),
   '<p class="muted small">Le sujet, les barèmes, les tableaux, les images et les documents seront conservés. Les copies et les PIN des élèves ne seront pas transférés.</p>'+
   '<div class="field"><label for="demo-duplicate-class">Classe de destination</label>'+
   '<select id="demo-duplicate-class" required>'+
    validClasses.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===selected?'selected':'')+'>'+esc(c.name)+'</option>').join('')+
   '</select></div>'+
   '<div class="field"><label for="demo-duplicate-title">Titre de la nouvelle évaluation</label>'+
    '<input id="demo-duplicate-title" type="text" maxlength="180" required value="'+esc(exam.title)+'"></div>'+
   '<p class="muted small">Le nouveau contrôle sera un brouillon indépendant. Tu pourras le vérifier avant de le publier et de créer son QR code.</p>',
   '<button type="button" class="btn" data-action="confirm-duplicate-exam" data-id="'+esc(exam.id)+'">Dupliquer pour cette classe</button>'+
   btn('Annuler','close-modal','ghost'));
  return;
 }
 if(a==='confirm-duplicate-exam'){
  const origin=examBy(id),classId=document.getElementById('demo-duplicate-class')?.value,
   destination=window.CORTEX_CLASSES.byId(state,classId),
   title=String(document.getElementById('demo-duplicate-title')?.value||'').trim();
  if(!origin||!destination||destination.archived){showToast('Choisis une classe de destination valide.');return;}
  if(!title||title.length>180){showToast('Indique un titre valide.');return;}
  const copy=JSON.parse(JSON.stringify(origin));
  copy.id='copy-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
  copy.title=title;copy.classId=destination.id;copy.publishScope='all';
  copy.code='DEMO'+Math.floor(1000+Math.random()*9000);
  copy.open=false;
  // Ne copie jamais d’affectations, de copies ni de notes.
  // Les références aux fichiers locaux sont partagées en lecture ; les
  // suppressions existantes conservent un fichier encore référencé.
  state.exams.unshift(copy);
  teacherClassFilter=destination.id;teacherGroupFilter='';
  save();closeModal();render();
  showToast('Contrôle dupliqué pour '+destination.name+' · '+copy.questions.length+' questions, documents conservés. Brouillon non publié.');
  return;
 }
if(a==='publish-exam'){
 const exam=examBy(id);if(!exam)return;
 const validClasses=state.classes.filter(cl=>!cl.archived);
 if(!validClasses.length){showToast('Crée une classe avant de publier.');return;}
 const selected=validClasses.some(c=>c.id===exam.classId)?exam.classId:
  validClasses.some(c=>c.id===teacherClassFilter)?teacherClassFilter:validClasses[0].id;
 const group=exam.publishScope||'all';
 modalShow('Publier · '+esc(exam.title)+' · '+esc(examClassHeading(exam)),
  '<div class="field"><label for="publish-demo-class">Classe destinataire</label><select id="publish-demo-class">'+
  validClasses.map(cl=>'<option value="'+esc(cl.id)+'" '+(cl.id===selected?'selected':'')+'>'+esc(cl.name)+'</option>').join('')+
  '</select></div><div class="field"><label for="publish-demo-scope">Publication</label><select id="publish-demo-scope">'+
  [['all','Classe entière'],['g1','Groupe 1 uniquement'],['g2','Groupe 2 uniquement']].map(pair=>
   '<option value="'+pair[0]+'" '+(group===pair[0]?'selected':'')+'>'+pair[1]+'</option>').join('')+
  '</select></div><p class="small muted">Un QR code est généré pour cette classe et ce groupe. La démonstration reste locale et ne remplace pas la validation sécurisée de l’espace réel.</p>',
  '<button type="button" class="btn" data-action="confirm-publish-exam" data-id="'+esc(exam.id)+'">Publier et créer le QR</button>'+btn('Annuler','close-modal','ghost'));
 return;
}
if(a==='confirm-publish-exam'){
 const exam=examBy(id),classId=document.getElementById('publish-demo-class')?.value;
 const cl=window.CORTEX_CLASSES.byId(state,classId),scope=document.getElementById('publish-demo-scope')?.value;
 if(!exam||!cl||cl.archived||!['all','g1','g2'].includes(scope)){
  showToast('Choisis une classe et un groupe valides.');return;
 }
 if(scope!=='all'){
  cl.groups||=[];
  let group=cl.groups.find(g=>g.id===scope);
  if(group)group.archived=false;
  else cl.groups.push({id:scope,name:scope==='g1'?'Demi-groupe 1':'Demi-groupe 2',archived:false});
 }
 for(const assignment of state.assignments)if(assignment.examId===exam.id)assignment.active=false;
 const token='QR-'+Array.from({length:4},()=>Math.random().toString(36).slice(2,9)).join('');
 const assignment={id:'acces-'+Date.now()+'-'+Math.floor(Math.random()*999999),
  examId:exam.id,classId:cl.id,groupId:scope==='all'?null:scope,token,active:true,createdAt:Date.now()};
 state.assignments.push(assignment);exam.open=true;exam.classId=cl.id;exam.publishScope=scope;
 save();closeModal();render();openClassQR(assignment.id);
 showToast('Publié pour '+cl.name+(scope==='all'?' · classe entière':' · groupe '+scope.slice(1))+'.');
 return;
}
if(a==='toggle-exam'){const e=examBy(id);if(e){e.open=false;save();render();}return;}
if(a==='try-exam'||a==='try-sleep'){const e=examBy(id||'sommeil-pdf-a2');if(!e)return;openTeacherSimulator(e);return;}
if(a==='add-question'){if(!editor)return;editor.questions.push({id:'q-'+Date.now(),type:'text',prompt:'',points:4});render();return;}
if(a==='remove-question'){if(editor&&editor.questions.length>1){editor.questions.splice(Number(el.dataset.index),1);render();}else showToast('Conserve au moins une question.');return;}
if(a==='save-exam'){
if(!editor)return;
if(!editor.title.trim()){showToast('Donne un titre à ton contrôle.');return;}
if(!editor.questions.every(q=>q.prompt.trim())){showToast('Complète les énoncés des questions.');return;}
if(!editor.questions.every(q=>Number(q.points)>=0.25&&Number(q.points)<=20)){
 showToast('Chaque question doit avoir entre 0,25 et 20 points.');return;
}
try{for(const q of editor.questions)if(!editor.pdfSource)window.CORTEX_QUESTION_TYPES.validate(q);}catch(error){showToast(error.message||'Question invalide.');return;}
const existing=state.exams.findIndex(e=>e.id===editor.id);
const clean=JSON.parse(JSON.stringify(editor));delete clean.isNew;
if(existing>=0)state.exams[existing]=clean;else state.exams.unshift(clean);
save();editor=null;showToast('Contrôle enregistré dans cette démo.');nav('teacher','controles');return;}
if(a==='close-modal'){closeModal();return;}
if(a==='review-pdf-sample'){if(!attemptBy('ex-pdf-demo')){showToast('La copie exemple n’est plus disponible.');return;}reviewAttemptId='ex-pdf-demo';reviewIndex=0;nav('teacher','corriger/ex-pdf-demo');return;}
if(a==='review-copy'){
 const at=attemptBy(id);
 if(!at||at.status!=='submitted'){showToast('Copie indisponible.');return;}
 reviewAttemptId=id;reviewIndex=0;nav('teacher','corriger/'+encodeURIComponent(id));return;
}
if(a==='review-back'){nav('teacher','copies');return;}
if(a==='review-select'){
 const at=attemptBy(reviewAttemptId),e=examBy(at?.examId);
 if(!e)return;
 const i=Number(el.dataset.index);if(!Number.isInteger(i)||i<0||i>=e.questions.length)return;
 reviewIndex=i;render();return;
}
if(a==='review-prev'||a==='review-next'){
 const at=attemptBy(reviewAttemptId),e=examBy(at?.examId);if(!e)return;
 reviewIndex=Math.min(e.questions.length-1,Math.max(0,reviewIndex+(a==='review-next'?1:-1)));render();return;
}
if(a==='review-mark'){setReviewPoints(el.dataset.value);return;}
if(a==='review-clear'){setReviewPoints('');return;}
if(a==='review-validate'){
 const at=attemptBy(reviewAttemptId),e=examBy(at?.examId);if(!at||!e)return;
 const totals=window.CORTEX_REVIEW.totals(at,e);
 if(!totals.ready){showToast('Corrige toutes les questions avant de valider la note.');return;}
 at.grade=totals.grade;at.reviewedAt=Date.now();at.publishedToStudent=true;save();
 showToast('Correction validée et publiée à l’élève : '+totals.grade+'/20');render();return;
}
if(a==='review-original'){
 const at=attemptBy(reviewAttemptId),e=examBy(at?.examId);
 if(e?.sourceId)openSavedOriginal(e.sourceId);return;
}
if(a==='teacher-toggle-publish'){
 const at=attemptBy(id);
 if(!at||at.status!=='submitted'||at.grade==null){showToast('Il faut d’abord attribuer une note pour publier.');return;}
 at.publishedToStudent=at.publishedToStudent!==true;
 if(at.publishedToStudent&&!at.reviewedAt)at.reviewedAt=Date.now();
 save();render();showToast(at.publishedToStudent?'Correction publiée dans Mon CORTEX.':'Correction masquée à l’élève.');return;
}
if(a==='save-grade'){const at=attemptBy(id);const grade=Number(document.getElementById('manual-grade')?.value);const original=document.getElementById('manual-grade')?.value;if(!at||original===''||!Number.isFinite(grade)||grade<0||grade>20){showToast('Saisis une note entre 0 et 20.');return;}at.grade=grade;at.feedback=document.getElementById('manual-feedback')?.value||'';at.reviewedAt=Date.now();at.publishedToStudent=true;save();closeModal();showToast('Note et appréciation publiées dans Mon CORTEX.');render();return;}
if(a==='choose-sleep'){chosenCode='SOMMEILPDF';render();return;}
if(a==='choose-code'){chosenCode=el.dataset.code;render();return;}
if(a==='start-exam'){startExam();return;}
if(a==='question-prev'){currentQuestion=Math.max(0,currentQuestion-1);render();return;}
if(a==='question-next'){const e=examBy(activeAttempt()?.examId);currentQuestion=Math.min((e?.questions.length||1)-1,currentQuestion+1);render();return;}
if(a==='question-jump'){currentQuestion=Number(el.dataset.index)||0;render();return;}
if(a==='simulate-interruption'){
 const at=activeAttempt();if(!at||!authorizedAttempt(at))return;
 recordIntegrityEvent({kind:'simulation',at:Date.now(),durationMs:12000},{key:at.id});
 showToast('Sortie d’écran fictive enregistrée · 12 s.');render();return;
}
if(a==='review-exam'){reviewExam();return;}
if(a==='confirm-submit'){const at=activeAttempt();if(!at||!authorizedAttempt(at))return;guard.setActive();at.status='submitted';at.submittedAt=Date.now();save();closeModal();nav('student','termine');return;}
if(a==='reset-demo'){modalShow('Réinitialiser la démonstration ?',`<p>Les contrôles ajoutés et les copies fictives créées dans ce navigateur seront effacés. Aucun serveur n'est concerné.</p>`,btn('Tout réinitialiser','confirm-reset','danger')+btn('Annuler','close-modal','ghost'));return;}
if(a==='confirm-reset'){studentSession=null;persistPsePreview();portalSession=null;portalPreviewState=null;studentRollNumber='';state=window.CORTEX_CLASSES.init(makeSeed());teacherClassFilter='';teacherGroupFilter='';selectedClassId='2mrc1';chosenCode='SOMMEILPDF';save();closeModal();editor=null;currentQuestion=0;showToast('Démonstration réinitialisée.');render();return;}
}
/* Accepte uniquement un brouillon de la copie fictive fixe, en mémoire locale. */
window.addEventListener('cortex:demo-albert-apply',event=>{
 const draft=event.detail||{},attempt=attemptBy('ex-pdf-demo');
 const exam=examBy(attempt?.examId);
 if(draft?.copyId!=='ex-pdf-demo'||!attempt||exam?.id!=='sommeil-pdf-a2'||
    !Array.isArray(draft.questions)||draft.questions.length!==20||exam.questions.length!==20){
   showToast('La copie de démonstration de référence est introuvable.');return;
 }
 const marks={...(attempt.marks||{})};
 for(const question of exam.questions){
  const matches=draft.questions.filter(m=>m?.id===question.id);
  const m=matches[0],actual=String(attempt.answers?.[question.id]??'');
  if(matches.length!==1||!m||actual!==String(m.reponse??'')||
     !Number.isFinite(m.points)||m.points<0||m.points>Number(question.points)||
     Number(m.max)!==Number(question.points)){
   showToast('La copie fictive a été modifiée : les points Albert ne peuvent pas être appliqués.');return;
  }
  marks[question.id]={points:m.points,comment:[
   'Réponse attendue : '+String(m.attendu||'—'),
   '',
   String(m.commentaire||'—').replace(/^\s*Commentaire(?:\s+Albert)?\s*:\s*/i,'').trim(),
   '',
   'Conseil : '+String(m.conseil||'—'),
   'Source : '+String(m.document||'—')
  ].join('\n')};
 }
 attempt.marks=marks;
 attempt.feedback=String(draft.feedback||'Proposition Albert IA — à contrôler.');
 attempt.grade=null;
 attempt.reviewedAt=null;
 attempt.publishedToStudent=false;
 save();render();
 draft.applied=true;
 showToast('Albert : 20 commentaires et notes proposés, encore à valider dans la démo.');
});
document.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&['portal-number','portal-classcode','portal-pin'].includes(e.target?.id)){
  e.preventDefault();const trigger=document.querySelector('[data-action="portal-login"]');if(trigger&&!trigger.disabled)action(trigger);return;
 }
 if(e.key==='Enter'&&['student-number','student-pin','student-pin-confirm'].includes(e.target?.id)){
  e.preventDefault();
  const trigger=document.querySelector('[data-action="class-student-number"], [data-action="class-student-pin"]');
  if(trigger&&!trigger.disabled)action(trigger);
 }
});
document.addEventListener('click',e=>{
const el=e.target.closest('[data-action]');if(el){e.preventDefault();action(el);}
});
document.addEventListener('input',e=>{
const t=e.target;
if(t.hasAttribute('data-editor')&&editor){editor[t.dataset.editor]=t.dataset.editor==='duration'?Number(t.value):t.value;}
if(t.hasAttribute('data-question')&&editor){
 const q=editor.questions[Number(t.dataset.question)];if(!q)return;
 const name=t.dataset.qfield;
 if(['choices','tableRows','tableColumns','blanks','matchingLeft','matchingRight','correctIndices','unit'].includes(name))window.CORTEX_QUESTION_TYPES.applyField(q,name,t.value);
 else q[name]=['points','correct','section','page'].includes(name)?Number(t.value):t.value;
}
if(t.hasAttribute('data-answer')&&t.tagName==='TEXTAREA')setAnswer(t.dataset.answer,t.value);
 const cq=t.closest?.('[data-cortex-q]');if(cq){const exam=examBy(activeAttempt()?.examId),question=exam?.questions.find(q=>q.id===cq.dataset.cortexQ);if(question)setAnswer(question.id,window.CORTEX_QUESTION_TYPES.readAnswer(cq,question));}
if(t.hasAttribute('data-import-q')&&pendingImport){const q=pendingImport.questions[Number(t.dataset.importQ)];if(q)q.prompt=t.value;}
if(t.hasAttribute('data-doc-fill')){
  const at=activeAttempt(),id=t.dataset.docFill;if(at){const parts=String(at.answers[id]||'').split(' | ');parts[Number(t.dataset.subkey)]=t.value;setAnswer(id,parts.join(' | '));}
}
if(t.hasAttribute('data-review-comment')){
 const at=attemptBy(reviewAttemptId),e=examBy(at?.examId),q=e?.questions[reviewIndex];
 if(at&&q){at.marks ||= {};at.marks[q.id] ||= {};at.marks[q.id].comment=t.value;at.publishedToStudent=false;save();}
}
if(t.hasAttribute('data-review-general')){
 const at=attemptBy(reviewAttemptId);if(at){at.feedback=t.value;at.publishedToStudent=false;save();}
}
if(t.hasAttribute('data-search-exams')){search=t.value.toLowerCase();document.querySelectorAll('#exam-tiles [data-search]').forEach(card=>card.hidden=!card.dataset.search.toLowerCase().includes(search));}
});
document.addEventListener('change',e=>{
const t=e.target;
if(t.hasAttribute('data-integrity-toggle')){
 const ex=examBy(t.dataset.exam);if(ex){window.CORTEX_INTEGRITY.update(ex,t.dataset.integrityToggle,!!t.checked);save();modalShow('Protection du contrôle',window.CORTEX_INTEGRITY.settings(ex),btn('Fermer','close-modal','ghost'));showToast('Réglages enregistrés.');}return;
}
if(t.id==='integrity-setup-exam'){integritySetupId=t.value||'';render();return;}
if(t.id==='portal-level'){
 const opts=document.querySelectorAll('#portal-class option[data-level]');
 for(const option of opts){const allowed=!t.value||option.dataset.level===t.value;option.hidden=!allowed;option.disabled=!allowed;}
 const cls=document.getElementById('portal-class');if(cls)cls.value='';return;
}
if(t.id==='portal-year'){
 if(!portalAuthorized()){portalSession=null;nav('student','accueil');return;}
 portalYear=Number(t.value)||window.CORTEX_PORTAL.keyYear(Date.now());portalTouch();render();return;
}
if(t.hasAttribute('data-class-filter')){
 teacherClassFilter=t.value||'';teacherGroupFilter='';render();return;
}
if(t.hasAttribute('data-group-filter')){
 teacherGroupFilter=t.value||'';render();return;
}
if(t.hasAttribute('data-question')&&editor){
 const q=editor.questions[Number(t.dataset.question)],name=t.dataset.qfield;
 if(!q)return;
 if(name==='type'){
   window.CORTEX_QUESTION_TYPES.initialize(q,t.value);
   render();return;
 }
 if(name==='section'||name==='page'){q[name]=Number(t.value);render();return;}
 if(name==='points'){q.points=Number(t.value);render();return;}
 if(['choices','tableRows','tableColumns','blanks','matchingLeft','matchingRight','correctIndices','unit'].includes(name)){window.CORTEX_QUESTION_TYPES.applyField(q,name,t.value);if(name==='choices'){q.correct=Math.min(Number(q.correct||0),Math.max(q.choices.length-1,0));render();}return;}
 if(name==='correct'){q.correct=Number(t.value);return;}
}
if(t.hasAttribute('data-answer')&&t.type==='radio'){setAnswer(t.dataset.answer,t.value);render();}
 const cq=t.closest?.('[data-cortex-q]');if(cq){const exam=examBy(activeAttempt()?.examId),question=exam?.questions.find(q=>q.id===cq.dataset.cortexQ);if(question)setAnswer(question.id,window.CORTEX_QUESTION_TYPES.readAnswer(cq,question));}
if(t.id==='review-points'){setReviewPoints(t.value);return;}
if(t.hasAttribute('data-doc-sub')){const at=activeAttempt(),id=t.dataset.docSub;if(at){const parts=String(at.answers[id]||'').split(' | ');parts[Number(t.dataset.subkey)]=t.value;setAnswer(id,parts.join(' | '));}}

if(t.hasAttribute('data-visual-question')){
 visualQuestionId=t.value;render();return;
}
if(t.hasAttribute('data-visual-upload')&&t.files?.[0]){
 visualFile(t.files[0]);return;
}
if(t.hasAttribute('data-demo-file')&&t.files?.[0]) {
  const file=t.files[0];
  nav('teacher','import');
  // Après changement de page, l'ancien input ne vit plus : garder le fichier capturé
  processImport(file);
}
});
document.addEventListener('dragstart',e=>{
 const img=e.target?.closest?.('[data-visual-drag]');
 if(!img||!e.dataTransfer)return;
 e.dataTransfer.setData('application/x-cortex-doc-id',img.dataset.visualDrag);
 e.dataTransfer.effectAllowed='copy';
});
document.addEventListener('dragover',e=>{
 const zone=e.target?.closest?.('[data-visual-dropzone]');
 if(!zone)return;
 e.preventDefault();e.dataTransfer.dropEffect='copy';zone.classList.add('drag-over');
});
document.addEventListener('dragleave',e=>{
 const zone=e.target?.closest?.('[data-visual-dropzone]');
 if(zone&&!zone.contains(e.relatedTarget))zone.classList.remove('drag-over');
});
document.addEventListener('drop',e=>{
 if(view==='student')return;
 const zone=e.target?.closest?.('[data-visual-dropzone]');
 if(!zone)return;
 e.preventDefault();zone.classList.remove('drag-over');
 const id=e.dataTransfer?.getData('application/x-cortex-doc-id');
 if(id){visualLink(id);return;}
 const file=Array.from(e.dataTransfer?.files||[]).find(f=>/^image\//.test(f.type));
 if(file)visualFile(file);
});
document.addEventListener('paste',e=>{
 if(view!=='teacher'||!['import','creer'].includes(tab))return;
 const image=Array.from(e.clipboardData?.items||[]).find(x=>x.type.startsWith('image/'));
 if(!image)return;
 const file=image.getAsFile();if(!file)return;
 e.preventDefault();visualFile(file);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.children.length)closeModal();});
window.addEventListener('hashchange',routePage);
document.addEventListener('cortex:tour-student-exam',()=>{
 const attempt=activeAttempt();
 if(view==='student'&&tab==='examen'&&attempt?.assignmentId===PSE_DEMO_ASSIGNMENT&&authorizedAttempt(attempt))return;
 prepareDemoPse(true);
});
if(typeof window.setInterval==='function'){
  window.setInterval(()=>{
    if(view!=='student'||tab!=='examen')return;
    const at=activeAttempt();
    if(at?.status==='progress')window.CORTEX_CLOCK?.update(document,at,examBy(at.examId));
  },1000);
}
// Préparer la copie de démonstration dès le premier chargement.
save();
routePage();
})();
