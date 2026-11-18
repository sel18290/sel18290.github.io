/* CORTEX Académie — parcours élève permanent par classe et contrôle par QR code.
   Un seul PIN par numéro dans sa classe, session temporaire côté serveur. */
import { api } from './coursework.js?v=1.1';

const params=new URLSearchParams(location.search);
const qr=params.get('join'),classPrefill=params.get('classe');
const globalPortal=params.get('espace')==='eleve'||!!classPrefill;
if(qr||globalPortal){
 const $=id=>document.getElementById(id);
 const E=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
 const one=(sel,root=document)=>root.querySelector(sel);
 const mode=qr?'qr':'class';
 const storageKey='cortex-academie-eleve:'+mode+':'+(qr||classPrefill||'general');
 let token=null,current=null,currentId=null,classData=null,classList=[],busy=false,hiddenSince=0;
 document.body.classList.add('cw-student-active');
 const main=E('main','cw-student-portal');main.id='cw-student-portal';
 main.innerHTML='<div class="cw-student-frame">'+
  '<div class="cw-student-brand">CORTEX <span>ACADÉMIE · ESPACE ÉLÈVE</span></div>'+
  '<div class="cw-student-hero"><span>MON PARCOURS SCOLAIRE</span><h1>'+(qr?'Rejoindre mon contrôle.':'Bienvenue dans mon CORTEX.')+'</h1>'+
  '<p>'+(qr?'Le QR code t’a envoyé vers le contrôle attribué à ta classe.':'Choisis ta classe, indique ton numéro sur la liste et confirme ton PIN pour retrouver tes contrôles et corrections.')+'</p></div>'+
  '<div id="cw-student-status" role="status" aria-live="polite" class="cw-status" hidden></div>'+
  '<section id="cw-student-login"><form id="cw-student-login-form" class="cw-student-login-form">'+
  (qr?'':'<label for="cw-student-class">Ma classe<select id="cw-student-class" required><option value="">Chargement des classes…</option></select></label>')+
  '<label for="cw-student-number">Mon numéro sur la liste<input id="cw-student-number" type="number" min="1" max="60" inputmode="numeric" autocomplete="off" placeholder="Ex. 12" required></label>'+
  '<label for="cw-student-pin">Mon PIN personnel à 6 chiffres<input id="cw-student-pin" type="password" minlength="6" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="off" placeholder="●●●●●●" required></label>'+
  '<button type="submit" class="cw-student-submit">'+(qr?'Ouvrir mon contrôle →':'Accéder à mon espace →')+'</button></form>'+
  '<p class="cw-student-help">Tu gardes le même PIN pour les contrôles de cette classe. En cas d’oubli, demande un nouveau PIN à ton professeur.</p></section>'+
  '<section id="cw-student-work" hidden></section>'+
  '<footer>Accès personnel sécurisé · Ne communique jamais ton PIN · Les notes apparaissent seulement après publication par ton professeur.</footer></div>';
 document.body.insertBefore(main,document.querySelector('.layout'));
 function message(text,error=false){const el=$('cw-student-status');el.textContent=text||'';el.hidden=!text;el.classList.toggle('error',!!error)}
 function showWork(){ $('cw-student-login').hidden=true;$('cw-student-work').hidden=false }
 function reset(){token=null;current=null;currentId=null;classData=null;sessionStorage.removeItem(storageKey);$('cw-student-work').hidden=true;$('cw-student-login').hidden=false}
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
    const opt=E('option','',cl.label+' · '+cl.display_name+' · '+cl.suffix);opt.value=cl.code;select.append(opt);
   }
   if(classPrefill&&classList.some(x=>x.code===classPrefill))select.value=classPrefill;
   if(!classList.length)message('Aucune classe n’est encore ouverte. Votre professeur doit préparer les accès élèves.',true);
   else if(classPrefill&&!classList.some(x=>x.code===classPrefill))message('Ce lien de classe est indisponible. Choisis une classe dans la liste.',true);
  }catch(err){message('Chargement des classes impossible : '+String(err.message||err),true)}
 }
 async function loadClass(){
  classData=await api('student_class_list',{session:token});
  current=null;currentId=null;
  showWork();message('');renderClass();
 }
 async function loadExam(id){
  current=await api('student_get',{session:token,assessment_id:id||undefined});
  currentId=current.assessment.id;showWork();message('');
  renderExam();
 }
 function renderClass(){
  const work=$('cw-student-work');work.replaceChildren();
  if(!classData)return;
  const header=E('div','cw-student-dashboard-head');
  header.append(E('small','','MON ESPACE · '+classData.class.code),
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
 }
 function renderExam(){
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
   work.append(receipt);return;
  }
  if(settings.enabled){
   const rules=[settings.blockPaste?'Collage limité':null,settings.blockCopy?'Copie du sujet limitée':null,settings.trackVisibility?'Sorties de page signalées':null,settings.watermarkCapture?'Filigrane de dissuasion':null].filter(Boolean);
   work.append(E('p','cw-student-rules','Mode intégrité du contrôle : '+rules.join(' · ')+'. Un signalement n’est pas une preuve automatique de fraude.'));
  }
  const form=E('form','cw-answer-form');
  const questions=exam.questions?.length?exam.questions:[{id:'general',prompt:'Ma réponse / mon travail'}];
  for(let i=0;i<questions.length;i++){
   const q=questions[i],label=E('label','cw-answer-question'),input=E('textarea');
   input.name=q.id||'q'+(i+1);input.maxLength=6000;input.rows=4;
   input.placeholder='Rédige ta réponse ici…';input.setAttribute('aria-label',q.prompt||'Réponse');
   label.append(E('strong','',(i+1)+'. '+q.prompt),input);form.append(label);
  }
  const upload=E('label','cw-student-attachment'),file=E('input');file.type='file';file.accept='.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp';
  upload.append(E('strong','','Joindre ma copie (facultatif)'),file,E('small','','PDF, Word, TXT ou image, 8 Mo maximum. Tu peux envoyer une réponse écrite et/ou un fichier.'));
  form.append(upload);
  const submit=E('button','cw-student-submit','Remettre définitivement mon contrôle →');submit.type='submit';form.append(submit);
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(busy)return;
   if(!confirm('Confirmer la remise définitive de ton contrôle ? Tu ne pourras plus modifier cette copie.'))return;
   busy=true;submit.disabled=true;message('Envoi de ta copie en cours…');
   try{
    const answers=Object.fromEntries([...form.querySelectorAll('textarea')].map(a=>[a.name,a.value]));
    await api('student_submit',{session:token,assessment_id:currentId,answers:JSON.stringify(answers)},file.files?.[0]||null);
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
 $('cw-student-login-form').addEventListener('submit',async event=>{
  event.preventDefault();const submit=one('button',event.currentTarget);submit.disabled=true;
  try{
   const n=Number($('cw-student-number').value),pin=$('cw-student-pin').value;
   const result=mode==='qr'
    ?await api('student_login',{code:qr,student_number:n,pin})
    :await api('student_class_login',{class_code:$('cw-student-class').value,student_number:n,pin});
   token=result.session;sessionStorage.setItem(storageKey,token);$('cw-student-pin').value='';
   if(mode==='qr')await loadExam();
   else await loadClass();
  }catch(err){message(err.message||'Identification impossible.',true)}
  finally{submit.disabled=false}
 });
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
