
/* CORTEX Académie : dépôt et réception réels via Supabase Edge Functions. */
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js?v=1';
import {requestAiDraft,formatDraftFeedback,testAlbertConnection} from './ai-correction.js?v=3';
import {renderCopyOrganizer,resetCopyOrganizerFilters} from './copy-organizer.js?v=1.3';
import {openTeacherAlbertProgress} from './teacher-albert-progress.js?v=1.0';
import {openAlbertProgress} from './albert-progress-real.js?v=1.0';
const ENDPOINT=SUPABASE_URL+'/functions/v1/cortex-coursework';
const get=id=>document.getElementById(id);
const make=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const bridge=()=>window.CORTEX_ACADEMY_BRIDGE;
const types='.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp';
export async function api(action,payload={},file=null,teacher=false){
 const headers={apikey:SUPABASE_PUBLISHABLE_KEY};
 if(teacher){
  const client=bridge()?.client?.();
  if(!client)throw Error('Connectez-vous avec votre compte académique.');
  const {data,error}=await client.auth.getSession();
  if(error||!data?.session?.access_token)throw Error('Session professeur expirée. Reconnectez-vous.');
  headers.Authorization='Bearer '+data.session.access_token;
 }
 let body;
 if(file){
  const form=new FormData();
  form.set('action',action);
  for(const [key,value] of Object.entries(payload))form.set(key,typeof value==='string'?value:JSON.stringify(value));
  form.set('file',file,file.name);body=form;
 }else{headers['Content-Type']='application/json';body=JSON.stringify({action,...payload})}
 let response;
 try{response=await fetch(ENDPOINT,{method:'POST',headers,body,cache:'no-store'})}
 catch{throw Error('Le service des évaluations est inaccessible.')}
 const out=await response.json().catch(()=>null);
 if(!response.ok||!out?.ok)throw Error(out?.error||'Action refusée par le serveur.');
 return out;
}
const state={access:[],copies:[],pins:new Map(),loading:false,aiBusy:0};
const openCopyClasses=new Set(),openCopyControls=new Set(),openStudentCopies=new Set();
let copyOrganizerInitialized=false;
const joinUrl=code=>location.origin+location.pathname+'?join='+encodeURIComponent(code);
function message(text,error=false){const e=get('cw-status');if(!e)return;e.hidden=!text;e.textContent=text;e.classList.toggle('error',error)}
async function reload(success=false){
 if(state.loading||!bridge()?.teacher?.())return;
 state.loading=true;
 try{
  const data=await api('teacher_list',{},null,true);
  state.access=data.access||[];state.copies=data.submissions||[];
  window.dispatchEvent(new CustomEvent('cortex:academy-live-snapshot',{detail:{access:state.access,copies:state.copies,classAccess:data.classAccess||[]}}));
  window.dispatchEvent(new CustomEvent('cortex:academy-coursework-stats',{detail:{copies:state.copies.length,pinClasses:(data.classAccess||[]).length}}));
  display();
  window.dispatchEvent(new Event('cortex:academy-class-updated'));
  if(success)message('Données actualisées.');
 }catch(err){message(String(err.message||err),true)}
 finally{state.loading=false}
}
function createButton(label,cls,callback){
 const b=make('button',cls,label);b.type='button';
 b.addEventListener('click',async()=>{b.disabled=true;try{await callback()}catch(err){message(String(err?.message||err),true)}finally{b.disabled=false}});
 return b;
}
function downloadPins(data,title){
 const rows=['Numéro;PIN'].concat(data.map(x=>String(x.number)+';'+x.pin));
 const blob=new Blob(['\ufeff'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=make('a');
 a.href=url;a.download='CORTEX_PIN_'+title.replace(/[^a-z0-9_-]/gi,'_')+'.csv';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function openFile(assessment,kind,student){
 const tab=window.open('about:blank','_blank');
 try{
  const answer=await api('teacher_file',{assessment_id:assessment,kind,student_number:student||0},null,true);
  if(tab)tab.location.href=answer.url;
  else{
   const link=make('a','','Ouvrir le fichier privé');link.href=answer.url;link.target='_blank';link.rel='noopener';
   get('cw-status').replaceChildren(link);get('cw-status').hidden=false;
  }
 }catch(err){tab?.close();throw err}
}
function drawQr(node,code){
 node.replaceChildren();
 if(typeof window.QRCode==='function'){
  try{new window.QRCode(node,{text:joinUrl(code),width:160,height:160,colorDark:'#111c2d',colorLight:'#fff'});return}
  catch{}
 }
 node.append(make('small','','QR indisponible : partagez le lien ci-dessous.'));
}
function display(){
 const boxes=get('cw-assessment-cards'),inbox=get('cw-copy-list');
 if(!boxes||!inbox||!bridge()?.teacher?.())return;
 boxes.replaceChildren();inbox.replaceChildren();
 const exams=bridge().exams?.()||[];
 if(!exams.length)boxes.append(make('p','empty','Créez d’abord un contrôle dans la rubrique Mes évaluations.'));
 for(const exam of exams){
  const access=state.access.find(a=>a.assessment_id===exam.id);
  const card=make('article','cw-assessment'),top=make('div','cw-card-head');
  card.dataset.examId=exam.id;
  const title=make('div');const classroom=bridge()?.classes?.()?.find(c=>c.id===exam.class_id);
  const publishScope=exam.content?.publish_scope||'all';
  const scopeName=publishScope==='g1'?'Groupe 1':publishScope==='g2'?'Groupe 2':'Classe entière';
  title.append(make('strong','',exam.title),make('small','','Classe : '+(classroom?.code||'Sans classe')+' · '+scopeName),
   make('small','',access?.active?'Les élèves concernés peuvent accéder au contrôle':'Contrôle en préparation'));
  top.append(title,make('span','cw-pill '+(access?.active?'cw-open':''),access?.active?'● Ouvert':'○ Non ouvert'));card.append(top);
  const fileArea=make('div','cw-upload-row'),input=make('input','cw-subject-input');
  input.type='file';input.accept=types;input.setAttribute('aria-label','Sujet PDF ou Word');
  fileArea.append(input,createButton('Déposer le sujet','cw-primary',async()=>{
   const file=input.files?.[0];if(!file)throw Error('Sélectionnez d’abord un document PDF ou Word.');
   await api('teacher_upload',{assessment_id:exam.id},file,true);
   message('Document déposé dans le stockage privé.');await reload();
  }));
  card.append(fileArea);
  if(access?.subject_name){
   const sub=make('div','cw-subject-row');
   sub.append(make('span','','📎 '+access.subject_name),createButton('Voir le document ↗','cw-secondary',()=>openFile(exam.id,'subject')),
     createButton('✦ Ouvrir dans l’atelier documentaire','cw-primary',()=>{
      if(!window.CORTEX_REAL_IMPORT?.openExisting)throw Error('Atelier documentaire indisponible : rechargez la page.');
      return window.CORTEX_REAL_IMPORT.openExisting(exam.id);
     }));
   card.append(sub);
  }
  const publish=make('div','cw-publish-row'),select=make('select','cw-roster-size'),group=make('select','cw-publish-scope');
  for(const n of [15,20,25,30,35,40,45,50,55,60]){
   const opt=make('option','',n+' élèves');opt.value=String(n);opt.selected=n===(access?.roster_size||30);select.append(opt);
  }
  select.setAttribute('aria-label','Nombre de numéros élèves');
  for(const [value,label] of [['all','Classe entière'],['g1','Groupe 1'],['g2','Groupe 2']]){
   const option=make('option','',label);option.value=value;option.selected=value===publishScope;group.append(option);
  }
  group.disabled=!exam.class_id;group.setAttribute('aria-label','Publier pour la classe ou le demi-groupe');
  publish.append(make('label','','Effectif'),select,make('label','','Publication'),group,
   createButton(access?.active?'Actualiser la publication':'Publier le contrôle','cw-accent',async()=>{
   const out=await api('teacher_publish',{assessment_id:exam.id,roster_size:Number(select.value),publish_scope:group.value},null,true);
   if(out.freshPins?.length&&!out.class_id)state.pins.set(exam.id,out.freshPins);
   message(exam.class_id?'Contrôle publié pour '+(group.value==='all'?'la classe entière':group.value==='g1'?'le demi-groupe 1':'le demi-groupe 2')+'. Pour la première connexion, ouvre la création des PIN pendant 30 minutes dans « PIN élèves ».':
    out.freshPins?.length?'Contrôle publié. Télécharge les codes individuels affichés.':'Contrôle publié avec les accès existants.');
   await reload();
  }));card.append(publish);
  if(access?.join_code){
   const share=make('section','cw-share');
   share.append(make('h4','','Lien d’accès et QR code élèves'));
   const qr=make('div','cw-qr');drawQr(qr,access.join_code);share.append(qr);
   const linkText=make('input','cw-join-url');linkText.value=joinUrl(access.join_code);linkText.readOnly=true;linkText.setAttribute('aria-label','Lien élève');share.append(linkText);
   const buttons=make('div','cw-share-buttons');
   buttons.append(createButton('Copier le lien','cw-secondary',async()=>{
    try{await navigator.clipboard.writeText(joinUrl(access.join_code));message('Lien copié.')}
    catch{linkText.focus();linkText.select();message('Sélectionnez et copiez le lien affiché.',true)}
   }));
   const visit=make('a','cw-secondary','Tester l’accès élève ↗');visit.href=joinUrl(access.join_code);visit.target='_blank';visit.rel='noopener';buttons.append(visit);share.append(buttons);
   const fresh=state.pins.get(exam.id);
   if(fresh?.length&&!exam.class_id){
    const pinBox=make('div','cw-pin-notice');
    pinBox.append(make('strong','','PIN provisoires élèves à distribuer individuellement'));
    const table=make('div','cw-pin-table');
    for(const x of fresh)table.append(make('span','','N° '+x.number+' · PIN '+x.pin));
    pinBox.append(table,createButton('Télécharger les PIN en CSV','cw-accent',()=>downloadPins(fresh,exam.title)));share.append(pinBox);
   }
   if(exam.class_id){
    share.append(make('p','cw-pin-class-hint','Le QR permet de se connecter avec son PIN. Pour créer un premier PIN depuis CE MÊME QR, ouvre les inscriptions pendant 30 minutes.'));
    share.append(createButton('✦ Ouvrir la création des PIN par ce QR · 30 min','cw-accent',async()=>{
     const result=await api('teacher_pin_enrollment',{class_id:exam.class_id,roster_size:Number(select.value),enabled:true},null,true);
     const deadline=new Date(result.registration_open_until).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
     message('Création des PIN autorisée jusqu’à '+deadline+'. Les élèves scannent le QR code affiché ici, choisissent leur numéro et créent leur PIN. Aucun autre lien nécessaire.');
     await reload();
    }));
    share.append(createButton('Gérer les PIN de la classe ↗','cw-secondary',()=>{
     const anchor=get('cw-persistent-classes');if(anchor){location.hash='#cw-persistent-classes';anchor.scrollIntoView({behavior:'smooth',block:'start'});}
    }));
   }else{
   const reset=make('div','cw-reset-row'),number=make('input');
   number.type='number';number.min='1';number.max=String(access.roster_size);number.placeholder='N° élève';
   number.setAttribute('aria-label','Numéro élève pour nouveau PIN');
   reset.append(number,createButton('Nouveau PIN pour cet élève','cw-secondary',async()=>{
    const out=await api('teacher_reset_pin',{assessment_id:exam.id,student_number:Number(number.value)},null,true);
    const prev=state.pins.get(exam.id)||[];
    state.pins.set(exam.id,prev.filter(x=>x.number!==out.number).concat([{number:out.number,pin:out.pin}]).sort((a,b)=>a.number-b.number));
    if(out.class_id)window.dispatchEvent(new CustomEvent('cortex:class-pins',{detail:{classId:out.class_id,pins:[{number:out.number,pin:out.pin}]}}));
    message('PIN régénéré pour le numéro '+out.number+'.');
    display();
   }));
   share.append(reset);
   }
   share.append(createButton(access.active?'Fermer l’accès élève':'Rouvrir l’accès','cw-outline',async()=>{
    await api('teacher_close',{assessment_id:exam.id,active:!access.active},null,true);await reload();
   }));
   card.append(share);
  }
  boxes.append(card);
 }
 get('cw-copy-count').textContent=state.copies.length+' copie(s)';
 renderCopyOrganizer({
  target:inbox,copies:state.copies,exams,classes:bridge()?.classes?.()||[],
  renderCopy:renderCopyCard,
  openClasses:openCopyClasses,openControls:openCopyControls,openCopies:openStudentCopies,
  defaultExpand:!copyOrganizerInitialized
 });
 copyOrganizerInitialized=true;
}
function renderCopyCard(copy,exam){
  const card=make('article','cw-copy'),head=make('div','cw-copy-top');
  head.append(make('strong','','Correction · élève n°'+copy.student_number),
    make('span','cw-pill '+(copy.released_at?'cw-open':''),copy.released_at?'Correction publiée':copy.graded_at?'Corrigé':'À corriger'));
  card.append(head,make('small','','Reçu le '+new Date(copy.submitted_at).toLocaleString('fr-FR')));
  const answers=make('details','cw-copy-answers');
  answers.append(make('summary','','▤ Consulter les réponses · '+Object.keys(copy.answers||{}).length+' question(s)'));
  const answerList=make('div','cw-copy-answer-list');answers.append(answerList);
  let answersLoaded=false;
  answers.addEventListener('toggle',()=>{
   if(!answers.open||answersLoaded)return;
   const questions=new Map((exam?.content?.questions||[]).map(q=>[q.id,q]));
   for(const [qid,answer] of Object.entries(copy.answers||{})){
    const question=questions.get(qid),line=make('div','cw-answer');
    const prompt=question?.prompt||qid;
    const readable=question&&window.CORTEX_QUESTION_TYPES?.summary?
     window.CORTEX_QUESTION_TYPES.summary(question,answer):String(answer??'');
    line.append(make('strong','',prompt),make('p','',readable));
    answerList.append(line);
   }
   answersLoaded=true;
  });
  card.append(answers);
  if(copy.file_name)card.append(createButton('📎 Ouvrir la copie jointe : '+copy.file_name,'cw-secondary',()=>openFile(copy.assessment_id,'submission',copy.student_number)));
  const form=make('form','cw-grade-form'),grade=make('input');
  grade.type='number';grade.min='0';grade.max='20';grade.step='0.01';grade.required=true;grade.placeholder='Note sur 20';grade.value=copy.grade??'';
  grade.setAttribute('aria-label','Note sur 20');
  const feedback=make('textarea');feedback.rows=3;feedback.maxLength=4000;feedback.placeholder='Conseils et correction';feedback.value=copy.feedback||'';
  feedback.setAttribute('aria-label','Commentaire professeur');
  const label=make('label','cw-release-label'),release=make('input');release.type='checkbox';release.checked=!!copy.released_at;
  label.append(release,make('span','','Publier la note et la correction pour l’élève'));
  const submit=make('button','cw-accent','Enregistrer la correction');submit.type='submit';
  const aiButton=createButton('✦ Corriger avec Albert IA','cw-ai-button',async()=>{
   if(!window.confirm('Albert va analyser cette copie et ses documents pour proposer une correction. Aucune note ne sera enregistrée ou publiée automatiquement. Continuer ?'))return;
   const progress=openTeacherAlbertProgress({
    studentNumber:copy.student_number,assessmentTitle:exam?.title||'Contrôle',
    questionCount:(exam?.content?.questions||[]).length,
    onReveal:()=>{
     const detail=form.querySelector('.cw-ai-detail');
     if(detail){detail.open=true;detail.scrollIntoView({block:'start',behavior:'smooth'});}
     else form.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
   });
   state.aiBusy++;
   try{
    progress.update('Albert examine les réponses et les documents associés, puis prépare un brouillon question par question…');
    const draft=await requestAiDraft(copy.assessment_id,copy.student_number);
    grade.value=String(draft.grade);
    feedback.value=formatDraftFeedback(draft);
    release.checked=false;
    form.querySelector('.cw-ai-draft-notice')?.remove();
    form.querySelector('.cw-ai-detail')?.remove();
    const notice=make('div','cw-ai-draft-notice','✦ Proposition Albert non enregistrée : vérifie les réponses, les documents et les points avant validation.');
    const details=make('details','cw-ai-detail');
    details.append(make('summary','','Albert IA · Corrections des '+draft.questions.length+' questions'));
    for(const q of draft.questions){
     const line=make('details','cw-ai-question');
     line.append(make('summary','','Question '+(q.numero||q.id)+' · '+q.points+' / '+q.max+' point(s)'));
     if(q.attendu)line.append(make('p','','Réponse attendue : '+q.attendu));
     line.append(make('p','','Commentaire : '+(q.commentaire||'À vérifier.')));
     if(q.conseil)line.append(make('p','','Conseil : '+q.conseil));
     if(q.document)line.append(make('small','','Document utilisé : '+q.document));
     details.append(line);
    }
    form.prepend(notice,details);
    progress.success(draft);
    message('Brouillon Albert prêt pour l’élève n°'+copy.student_number+'. La note reste à valider manuellement.');
   }catch(error){
    progress.failure(error);
    throw error;
   }finally{state.aiBusy=Math.max(0,state.aiBusy-1);}
  });
  form.append(aiButton,grade,feedback,label,submit);
  form.addEventListener('submit',async ev=>{
   ev.preventDefault();submit.disabled=true;
   try{
    await api('teacher_grade',{assessment_id:copy.assessment_id,student_number:copy.student_number,grade:Number(grade.value),feedback:feedback.value,release:release.checked},null,true);
    message('Correction enregistrée '+(release.checked?'et publiée à l’élève.':'sans publication.'));
    await reload();
   }catch(err){message(String(err.message||err),true)}finally{submit.disabled=false}
  });
  card.append(form);
  return card;
}
get('cw-refresh')?.addEventListener('click',()=>reload(true));

get('cw-ai-test')?.addEventListener('click',async event=>{
 const button=event.currentTarget,status=get('cw-ai-test-status');
 if(button.disabled)return;
 const progress=openAlbertProgress({
  title:'Vérification d’Albert IA',
  description:'Test du service Albert sans envoyer de copie ni de données élève.',
  initial:'Connexion au modèle Albert depuis le service sécurisé…'
 });
 button.disabled=true;
 if(status)status.textContent='Albert vérifie le service…';
 try{
  const out=await testAlbertConnection({signal:progress.signal});
  if(progress.cancelled)return;
  const text=String(out.message||'Albert API opérationnel.');
  if(status)status.textContent='✓ '+text;
  progress.success(text,'Fermer le test');
 }catch(error){
  if(progress.cancelled)return;
  const text=String(error?.message||'Test Albert échoué.');
  if(status)status.textContent='✕ '+text;
  progress.failure(text,'Fermer le test');
 }finally{button.disabled=false}
});

window.CORTEX_ACADEMY_COURSEWORK={
 access:()=>state.access.slice(),
 publish:async(examId,scope,rosterSize=30)=>{
  const out=await api('teacher_publish',{assessment_id:examId,roster_size:rosterSize,publish_scope:scope},null,true);
  if(out.freshPins?.length){
   state.pins.set(examId,out.freshPins);
   if(out.class_id)window.dispatchEvent(new CustomEvent('cortex:class-pins',{detail:{classId:out.class_id,pins:out.freshPins}}));
  }
  await reload();return out;
 },
 close:async examId=>{const out=await api('teacher_close',{assessment_id:examId,active:false},null,true);await reload();return out;},
 goToQR:examId=>{
  location.hash='#cw-assessment-cards';
  const card=[...document.querySelectorAll('#cw-assessment-cards [data-exam-id]')].find(n=>n.dataset.examId===examId);
  card?.scrollIntoView({block:'start',behavior:'smooth'});
 },
 freshPins:examId=>state.pins.get(examId)||[]
};
window.addEventListener('cortex:academy-data-ready',()=>reload());
queueMicrotask(()=>{if(bridge()?.teacher?.())reload()});
window.addEventListener('cortex:academy-logout',()=>{
 state.access=[];state.copies=[];state.pins.clear();
 openCopyClasses.clear();openCopyControls.clear();openStudentCopies.clear();resetCopyOrganizerFilters();
 copyOrganizerInitialized=false;
 window.dispatchEvent(new CustomEvent('cortex:academy-coursework-stats',{detail:{copies:0,pinClasses:0}}));
 get('cw-assessment-cards')?.replaceChildren();
 get('cw-copy-list')?.replaceChildren();
});
// Ne pas interrompre la relecture d'une copie ni une analyse Albert.
setInterval(()=>{if(bridge()?.teacher?.()&&!document.hidden&&!state.aiBusy&&!openStudentCopies.size)reload()},40000);
