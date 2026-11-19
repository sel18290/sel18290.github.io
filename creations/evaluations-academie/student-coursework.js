/* CORTEX Académie — parcours élève permanent par classe et contrôle par QR code.
   Un seul PIN par numéro dans sa classe, session temporaire côté serveur. */
import { api } from './coursework.js?v=2.5';
import { renderReceiptAi,renderDashboardAi } from './student-ai.js?v=1.0';
import { mobileExam,installMobileExam } from './student-iphone-exam.js?v=1.2';

const params=new URLSearchParams(location.search);
const qr=params.get('join'),classPrefill=params.get('classe'),registrationToken=params.get('inscription')||'';
const globalPortal=params.get('espace')==='eleve'||!!classPrefill||!!registrationToken;
if(qr||globalPortal){
 const $=id=>document.getElementById(id);
 const E=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
 const one=(sel,root=document)=>root.querySelector(sel);
 const mode=qr?'qr':'class';
 const storageKey='cortex-academie-eleve:'+mode+':'+(qr||classPrefill||'general');
 let token=null,current=null,currentId=null,classData=null,classList=[],busy=false,hiddenSince=0;
 let countdownInterval=null;
 const isPhoneExam=mobileExam();
 let mobileController=null;
 function releaseMobileEditor(){if(mobileController){mobileController.destroy();mobileController=null;}}
 document.body.classList.add('cw-student-active');
 const main=E('main','cw-student-portal');main.id='cw-student-portal';
 main.innerHTML='<div class="cw-student-frame">'+
  '<div class="cw-student-brand">CORTEX <span>ACADÉMIE · ESPACE ÉLÈVE</span></div>'+
  '<div class="cw-student-hero"><span>STATION NOCTIS · ESPACE ÉLÈVE</span><h1>'+(qr?'Rejoindre mon contrôle.':'Bienvenue dans mon CORTEX.')+'</h1>'+
  '<p>'+(qr?'Le QR code t’a envoyé vers le contrôle attribué à ta classe.':'Choisis ta classe, indique ton numéro sur la liste et confirme ton PIN pour retrouver tes contrôles et corrections.')+'</p></div>'+
  '<div id="cw-student-status" role="status" aria-live="polite" class="cw-status" hidden></div>'+
  '<section id="cw-student-login" class="cw-pin-entry">'+
  '<div class="cw-pin-paths" role="group" aria-label="Choisir sa connexion">'+
  '<button id="cw-back-to-login" type="button" class="cw-pin-path is-selected" aria-pressed="true">◈ J’ai déjà mon PIN</button>'+
  '<button id="cw-show-activation" type="button" class="cw-pin-path" aria-pressed="false">✦ Je crée mon PIN</button></div>'+
  '<div class="cw-pin-intro"><strong>Un numéro, un PIN, tous mes contrôles.</strong><p>Comme dans la démonstration : choisis ton numéro sur la liste et utilise le même PIN à six chiffres pour toutes les évaluations de ta classe.</p></div>'+
  '<form id="cw-student-login-form" class="cw-student-login-form">'+
  (qr?'':'<label for="cw-student-class">Ma classe<select id="cw-student-class" required><option value="">Chargement des classes…</option></select></label>')+
  '<label for="cw-student-number">Mon numéro sur la liste<input id="cw-student-number" type="number" min="1" max="60" inputmode="numeric" autocomplete="off" placeholder="Ex. 12" required></label>'+
  '<label for="cw-student-pin">Mon PIN à 6 chiffres<div class="cw-pin-input-wrap"><input id="cw-student-pin" type="password" minlength="6" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="off" placeholder="●●●●●●" required><button type="button" class="cw-pin-eye" aria-label="Afficher ou masquer le PIN" aria-controls="cw-student-pin">Afficher</button></div></label>'+
  '<button type="submit" class="cw-student-submit">'+(qr?'Ouvrir mon contrôle →':'Accéder à mon espace →')+'</button></form>'+
  '<form id="cw-student-activation-form" class="cw-student-login-form cw-activation-form" hidden>'+
  '<div class="cw-activation-heading"><span>PREMIÈRE CONNEXION · STATION NOCTIS</span><h2>Je choisis mon PIN.</h2><p>'+(qr?'Tu es bien arrivé par le QR de ton contrôle. Ton professeur doit ouvrir la création des PIN pendant 30 minutes depuis ce même contrôle.':'Ouvre le lien temporaire transmis par ton professeur pendant les 30 minutes d’inscription.')+' Choisis ton numéro, crée ton PIN et confirme-le. Aucun code individuel à demander.</p></div>'+
  (qr?'':'<label for="cw-activation-class">Ma classe<select id="cw-activation-class" required><option value="">Choisir ma classe…</option></select></label>')+
  '<label for="cw-activation-number">Mon numéro sur la liste<input id="cw-activation-number" type="number" min="1" max="60" inputmode="numeric" autocomplete="off" placeholder="Ex. 12" required></label>'+
  '<label for="cw-activation-new-pin">Je choisis mon PIN à 6 chiffres<div class="cw-pin-input-wrap"><input id="cw-activation-new-pin" type="password" minlength="6" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="new-password" required placeholder="Choisis 6 chiffres"><button type="button" class="cw-pin-eye" aria-label="Afficher ou masquer le PIN" aria-controls="cw-activation-new-pin">Afficher</button></div></label>'+
  '<label for="cw-activation-confirm-pin">Je confirme mon PIN<input id="cw-activation-confirm-pin" type="password" minlength="6" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="new-password" required placeholder="Répète les 6 chiffres"></label>'+
  '<details class="cw-pin-group-choice"><summary>Mon demi-groupe (facultatif)</summary><label for="cw-activation-group">Mon groupe<select id="cw-activation-group"><option value="0" selected>Classe entière</option><option value="1">Demi-groupe 1</option><option value="2">Demi-groupe 2</option></select></label><small>Ton professeur pourra modifier ton groupe ensuite.</small></details>'+
  '<p class="cw-pin-privacy">🔒 Ton professeur ne voit pas ton PIN. Ne le partage avec personne.</p>'+
  '<button type="submit" class="cw-student-submit">✓ Créer mon PIN et entrer →</button></form>'+
  '<p class="cw-student-help">PIN oublié ? Ton professeur peut le réinitialiser. Tu choisiras ensuite un nouveau PIN pendant la prochaine ouverture des inscriptions.</p></section>'+
  '<section id="cw-student-work" hidden></section>'+
  '<footer>Accès personnel sécurisé · Ne communique jamais ton PIN · Les notes apparaissent seulement après publication par ton professeur.</footer></div>';
 document.body.insertBefore(main,document.querySelector('.layout'));
 function message(text,error=false){const el=$('cw-student-status');el.textContent=text||'';el.hidden=!text;el.classList.toggle('error',!!error)}
 function showWork(){ $('cw-student-login').hidden=true;$('cw-student-work').hidden=false }
 function reset(){releaseMobileEditor();if(countdownInterval){clearInterval(countdownInterval);countdownInterval=null;}token=null;current=null;currentId=null;classData=null;sessionStorage.removeItem(storageKey);$('cw-student-work').hidden=true;$('cw-student-login').hidden=false}
 function button(text,cls,handler){
  const b=E('button',cls,text);b.type='button';
  b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;try{await handler()}catch(err){message(err.message||String(err),true)}finally{b.disabled=false}});
  return b;
 }
 async function getClasses(){
  if(mode!=='class')return;
  try{
   const list=await api('student_classes');
   classList=list.classes||[];
   const select=$('cw-student-class');select.replaceChildren();
   const blank=E('option','','Choisir ma classe');blank.value='';select.append(blank);
   for(const cl of classList){
    const stateText=cl.registration_open?' · Création de PIN ouverte':cl.ready?' · Accès prêt':' · À préparer';
    const opt=E('option','',cl.label+' · '+cl.display_name+stateText);opt.value=cl.code;select.append(opt);
   }
   const activationSelect=$('cw-activation-class');
   if(activationSelect){
    activationSelect.replaceChildren();
    const empty=E('option','','Choisir ma classe');empty.value='';activationSelect.append(empty);
    for(const cl of classList){const status=cl.registration_open?' · PIN ouverts':cl.ready?' · Accès prêt':' · À préparer';const option=E('option','',cl.label+' · '+cl.display_name+status);option.value=cl.code;activationSelect.append(option)}
   }
   if(classPrefill&&classList.some(x=>x.code===classPrefill)){select.value=classPrefill;if(activationSelect)activationSelect.value=classPrefill}
   if(!classList.length)message('Aucune classe n’est enregistrée. Contacte ton professeur.',true);
   else if(!classList.some(cl=>cl.ready))message('Les classes sont disponibles. Demande au professeur d’ouvrir la création des PIN.',true);
   else if(classPrefill&&!classList.some(x=>x.code===classPrefill))message('Ce lien de classe est indisponible. Choisis une classe dans la liste.',true);
   else if(classPrefill&&classList.some(x=>x.code===classPrefill&&!x.ready))message('Cette classe existe, mais le professeur doit d’abord préparer les accès.',true);
  }catch(err){message('Chargement des classes impossible : '+String(err.message||err),true)}
 }
 async function loadClass(){
  releaseMobileEditor();
  classData=await api('student_class_list',{session:token});
  current=null;currentId=null;
  showWork();message('');renderClass();
 }
 async function loadExam(id){
  releaseMobileEditor();
  current=await api('student_get',{session:token,assessment_id:id||undefined});
  currentId=current.assessment.id;showWork();message('');
  renderExam();
 }
 function renderClass(){
  if(countdownInterval){clearInterval(countdownInterval);countdownInterval=null;}
  const work=$('cw-student-work');work.replaceChildren();
  if(!classData)return;
  const header=E('div','cw-student-dashboard-head');
  const groupText=classData.demi_groupe===1||classData.demi_groupe===2?' · Demi-groupe '+classData.demi_groupe:' · Classe entière';
  header.append(E('small','','MON ESPACE · '+classData.class.code+groupText),
   E('h2','','Mes évaluations'),
   E('p','','Élève n°'+classData.student_number+' · '+classData.class.name));
  const controls=E('div','cw-student-dashboard-tools');
  controls.append(button('Actualiser mes résultats ↻','cw-secondary',loadClass),
   button('Changer de compte','cw-outline',async()=>{reset();await getClasses()}));
  header.append(controls);work.append(header);
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
    card.append(button(assessment.submitted_at?'Voir ma copie et ma correction →':'Démarrer ce contrôle →','cw-accent',()=>loadExam(assessment.id)));
   }
   cards.append(card);
  }
  const stats=E('div','cw-student-stats');
  stats.append(E('span','','Contrôles : '+assessments.length),E('span','','Copies remises : '+submitted),E('span','','Corrigés : '+graded));
  if(graded)stats.append(E('span','','Moyenne des notes publiées : '+(total/graded).toFixed(1).replace('.',',')+' / 20'));
  work.append(stats,cards);
  renderDashboardAi(work,{session:token,assessments});
 }
 function renderExam(){
  releaseMobileEditor();
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
  if(exam.duration)subject.append(E('p','cw-student-rules','Durée indicative : '+exam.duration+' minutes.'));
  if(current.subject){
   const file=E('a','cw-student-document','📄 Consulter le document : '+current.subject.name);
   file.href=current.subject.url;file.target='_blank';file.rel='noopener';subject.append(file);
   subject.append(button('Renouveler le lien du document','cw-outline',()=>loadExam(currentId)));
  }
  work.append(subject);
  if(submitted){
   const receipt=E('section','cw-student-receipt');
   receipt.append(E('h3','','✓ Copie reçue par le professeur'),E('p','','Remise le '+new Date(submitted.submitted_at).toLocaleString('fr-FR')));
   if(submitted.file_name)receipt.append(E('p','','Document remis : '+submitted.file_name));
   if(submitted.graded){
    receipt.append(E('h3','cw-receipt-grade','Ma note : '+submitted.grade+' / 20'),E('p','',submitted.feedback||'Aucun commentaire.'));
   }else receipt.append(E('p','','Ta note et tes conseils seront visibles après publication par le professeur.'));
   receipt.append(button('Actualiser ma correction ↻','cw-primary',()=>loadExam(currentId)));
   renderReceiptAi(receipt,{session:token,assessmentId:currentId,submission:submitted});
   work.append(receipt);return;
  }
  // Chronomètre démarré explicitement par l'élève, conservé dans cette session.
  // Indication côté navigateur : l'application ne prétend pas faire appliquer
  // une échéance par le serveur en l'absence de contrôle serveur.
  if(countdownInterval){clearInterval(countdownInterval);countdownInterval=null;}
  const timerKey='cortex-student-timer:'+mode+':'+(qr||classPrefill||'general')+':'+currentId+':'+current.student_number;
  const durationMs=Math.max(5,Math.min(240,Number(exam.duration)||60))*60000;
  const localStarted=Number(sessionStorage.getItem(timerKey)||0);
  if(!localStarted){
   const launch=E('section','cw-student-timer-start');
   launch.append(E('strong','','⏱ Prêt à commencer ?'),E('p','','Le chronomètre de '+(Number(exam.duration)||60)+' minutes démarre quand tu cliques sur « Démarrer le contrôle ».'));
   launch.append(button('▶ Démarrer le contrôle et le chrono','cw-student-submit',()=>{
    sessionStorage.setItem(timerKey,String(Date.now()));renderExam();
   }));
   work.append(launch);return;
  }
  const timerBox=E('div','cw-student-timer-bar');
  const timerText=E('strong','cw-student-timer-value');
  timerText.setAttribute('role','timer');
  timerBox.append(E('span','','⏱ Temps restant'),timerText);
  const refreshTimer=()=>{
   const remain=Math.max(0,durationMs-(Date.now()-localStarted));
   const secs=Math.ceil(remain/1000);
   timerText.textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
   timerText.classList.toggle('cw-student-timer-warning',remain<=300000);
   if(!remain){clearInterval(countdownInterval);countdownInterval=null;message('Temps indicatif écoulé. Remets ta copie maintenant.',true)}
  };
  refreshTimer();if(!countdownInterval)countdownInterval=setInterval(refreshTimer,1000);
  work.append(timerBox);
  if(settings.enabled){
   const rules=[settings.blockPaste?'Collage limité':null,settings.blockCopy?'Copie du sujet limitée':null,settings.trackVisibility?'Sorties de page signalées':null,settings.watermarkCapture?'Filigrane de dissuasion':null].filter(Boolean);
   work.append(E('p','cw-student-rules','Mode intégrité du contrôle : '+rules.join(' · ')+'. Un signalement n’est pas une preuve automatique de fraude.'));
  }
  const form=E('form','cw-answer-form');
  const questions=exam.questions?.length?exam.questions:[{id:'general',prompt:'Ma réponse / mon travail'}];
  if(isPhoneExam)mobileController=installMobileExam({form,questions,exam,current});
  else{
  for(let i=0;i<questions.length;i++){
   const q=questions[i],label=E('div','cw-answer-question');
   label.append(E('strong','',(i+1)+'. '+q.prompt));
   if(q.page&&current.subject)label.append(E('small','cw-doc-ref','Document original · page '+q.page));
   const related=(exam.assets||[]).filter(a=>(q.assetIds||[]).includes(a.id)&&a.url);
   if(related.length){
    const sourceBox=E('div','cw-student-source-snippets');
    sourceBox.append(E('strong','','Documents fournis pour cette question'));
    for(const asset of related){
     const figure=E('figure','cw-student-source-figure'),img=E('img');
     img.src=asset.url;img.alt='Extrait pédagogique : '+asset.name;img.loading='eager';
     figure.append(img,E('figcaption','',asset.name));sourceBox.append(figure);
    }
    label.append(sourceBox);
   }
   // Documents visuels du contrôle IST de 1AGORA2 : restitution des éléments
   // graphiques historiques et des encadrés, sans injecter de HTML depuis la base.
   const istVisual=window.CORTEX_IST_VISUALS?.render?.(q);
   if(istVisual)label.append(istVisual);
   else if(q.doc)label.append(E('div','cw-student-question-doc',q.doc));
   const answerArea=E('div','cw-question-response');
   answerArea.innerHTML=window.CORTEX_QUESTION_TYPES.studentFields(q,'');
   label.append(answerArea);form.append(label);
  }
  }
  const upload=E('label','cw-student-attachment'),file=E('input');file.type='file';file.accept='.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp';
  upload.append(E('strong','','Joindre ma copie (facultatif)'),file,E('small','','PDF, Word, TXT ou image, 8 Mo maximum. Tu peux envoyer une réponse écrite et/ou un fichier.'));
  form.append(upload);
  const submit=E('button','cw-student-submit','Remettre définitivement mon contrôle →');submit.type='submit';form.append(submit);
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(busy)return;
   const confirmation=mobileController?
    'Tu as répondu à '+mobileController.answeredCount()+' question(s) sur '+questions.length+'. Confirmer la remise définitive de ta copie ? Tu ne pourras plus la modifier.':
    'Confirmer la remise définitive de ton contrôle ? Tu ne pourras plus modifier cette copie.';
   if(!confirm(confirmation))return;
   busy=true;submit.disabled=true;message('Envoi de ta copie en cours…');
   try{
    const answers=mobileController?mobileController.getAnswers():(()=>{
     const wrappers=new Map([...form.querySelectorAll('[data-cortex-q]')].map(w=>[w.dataset.cortexQ,w]));
     return Object.fromEntries(questions.map(q=>[q.id,wrappers.has(q.id)?window.CORTEX_QUESTION_TYPES.readAnswer(wrappers.get(q.id),q):'']));
    })();
    await api('student_submit',{session:token,assessment_id:currentId,answers:JSON.stringify(answers)},file.files?.[0]||null);
    mobileController?.clearDraft();
    await loadExam(currentId);message('Copie bien reçue par le professeur.');
   }catch(err){message(err.message||'Impossible de remettre la copie.',true)}
   finally{busy=false;submit.disabled=false}
  });
  work.append(form);
  if(settings.enabled&&settings.watermarkCapture){
   const mark=E('div','cw-student-watermark');mark.setAttribute('aria-hidden','true');
   for(let i=0;i<6;i++)mark.append(E('span','','CORTEX · N°'+current.student_number+' · AIDE IA INTERDITE'));
   work.append(mark);
  }
 }
 const loginForm=$('cw-student-login-form'),activationForm=$('cw-student-activation-form');
 const loginTab=$('cw-back-to-login'),createTab=$('cw-show-activation');
 const toggleActivation=activated=>{
  activationForm.hidden=!activated;loginForm.hidden=activated;
  loginTab.classList.toggle('is-selected',!activated);createTab.classList.toggle('is-selected',activated);
  loginTab.setAttribute('aria-pressed',String(!activated));createTab.setAttribute('aria-pressed',String(activated));
  if(activated){
   if(mode==='class')$('cw-activation-class').value=$('cw-student-class')?.value||'';
   if($('cw-student-number').value)$('cw-activation-number').value=$('cw-student-number').value;
   $('cw-activation-number').focus();
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
  event.preventDefault();if(busy)return;
  const submit=event.currentTarget.querySelector('[type="submit"]');
  const number=Number($('cw-activation-number').value);
  const pin=$('cw-activation-new-pin').value;
  const confirmPin=$('cw-activation-confirm-pin').value;
  if(!/^\d{6}$/.test(pin)||pin!==confirmPin){
   message('Ton PIN doit contenir 6 chiffres et être identique dans les deux champs.',true);return;
  }
  const group=Number($('cw-activation-group').value||0);
  busy=true;submit.disabled=true;
  try{
   const classCode=mode==='class'?$('cw-activation-class').value:'';
   await api('student_pin_setup',{class_code:classCode,join_code:qr||'',student_number:number,
    demi_groupe:group,pin,confirm_pin:confirmPin,registration_token:registrationToken});
   const result=mode==='qr'
    ?await api('student_login',{code:qr,student_number:number,pin})
    :await api('student_class_login',{class_code:classCode,student_number:number,pin});
   $('cw-activation-new-pin').value='';$('cw-activation-confirm-pin').value='';
   token=result.session;sessionStorage.setItem(storageKey,token);
   if(registrationToken){
    const cleanUrl=new URL(location.href);cleanUrl.searchParams.delete('inscription');
    history.replaceState(null,'',cleanUrl.pathname+cleanUrl.search+cleanUrl.hash);
   }
   if(mode==='qr')await loadExam();else await loadClass();
   message('PIN créé ! Tu retrouveras ton espace avec ton numéro et ce même PIN.');
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
    ?await api('student_login',{code:qr,student_number:n,pin})
    :await api('student_class_login',{class_code:$('cw-student-class').value,student_number:n,pin});
   token=result.session;sessionStorage.setItem(storageKey,token);$('cw-student-pin').value='';
   if(mode==='qr')await loadExam();else await loadClass();
  }catch(err){message(err.message||'Identification impossible. Tu n’as pas encore de PIN ? Clique sur « Je crée mon PIN ».',true)}
  finally{busy=false;submit.disabled=false}
 });
 if(registrationToken)toggleActivation(true);
 const restored=sessionStorage.getItem(storageKey);
 if(mode==='class')getClasses();
 if(restored){
  token=restored;
  (mode==='qr'?loadExam():loadClass()).catch(err=>{reset();message('Merci de confirmer de nouveau ton PIN. '+String(err.message||''),true)});
 }
 function track(kind,duration_ms=0){
  if(!token||!currentId)return;
  api('student_event',{session:token,assessment_id:currentId,kind,duration_ms}).catch(()=>{});
 }
 document.addEventListener('paste',event=>{
  const cfg=current?.assessment?.antiCheat;
  if(!current||current.submission||!cfg?.enabled||!cfg.blockPaste||!event.target.closest?.('#cw-student-work textarea'))return;
  event.preventDefault();track('paste_blocked');if(cfg.warnStudent)message('Le collage est désactivé pour ce contrôle.',true);
 });
 document.addEventListener('copy',event=>{
  const cfg=current?.assessment?.antiCheat;
  if(!current||current.submission||!cfg?.enabled||!cfg.blockCopy||!event.target.closest?.('#cw-student-work'))return;
  event.preventDefault();track('copy_blocked');if(cfg.warnStudent)message('La copie du sujet est limitée.',true);
 });
 document.addEventListener('visibilitychange',()=>{
  const cfg=current?.assessment?.antiCheat;
  if(!current||current.submission||!cfg?.enabled||!cfg.trackVisibility)return;
  if(document.hidden)hiddenSince=Date.now();
  else if(hiddenSince){const ms=Date.now()-hiddenSince;hiddenSince=0;if(ms>=2000)track('tab_hidden',ms)}
 });
}
