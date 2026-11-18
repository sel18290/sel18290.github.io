
/* CORTEX Académie : dépôt et réception réels via Supabase Edge Functions. */
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js?v=1';
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
const state={access:[],copies:[],pins:new Map(),loading:false};
const joinUrl=code=>location.origin+location.pathname+'?join='+encodeURIComponent(code);
function message(text,error=false){const e=get('cw-status');if(!e)return;e.hidden=!text;e.textContent=text;e.classList.toggle('error',error)}
async function reload(success=false){
 if(state.loading||!bridge()?.teacher?.())return;
 state.loading=true;
 try{
  const data=await api('teacher_list',{},null,true);
  state.access=data.access||[];state.copies=data.submissions||[];
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
  const title=make('div');title.append(make('strong','',exam.title),make('small','',access?.active?'Les élèves peuvent accéder au contrôle':'Contrôle en préparation'));
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
   sub.append(make('span','','📎 '+access.subject_name),createButton('Voir le document ↗','cw-secondary',()=>openFile(exam.id,'subject')));
   card.append(sub);
  }
  const publish=make('div','cw-publish-row'),select=make('select','cw-roster-size');
  for(const n of [15,20,25,30,35,40,45,50,55,60]){
   const opt=make('option','',n+' élèves');opt.value=String(n);opt.selected=n===(access?.roster_size||30);select.append(opt);
  }
  select.setAttribute('aria-label','Nombre de numéros élèves');
  publish.append(make('label','','Effectif'),select,createButton(access?.active?'Actualiser les accès':'Publier et créer les PIN','cw-accent',async()=>{
   const out=await api('teacher_publish',{assessment_id:exam.id,roster_size:Number(select.value)},null,true);
   if(out.freshPins?.length){state.pins.set(exam.id,out.freshPins);if(out.class_id)window.dispatchEvent(new CustomEvent('cortex:class-pins',{detail:{classId:out.class_id,pins:out.freshPins}}));}
   message(out.freshPins?.length?'Contrôle ouvert. Téléchargez les PIN affichés : ils ne seront plus récupérables après rechargement.':'Contrôle ouvert avec les PIN existants.');
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
   if(fresh?.length){
    const pinBox=make('div','cw-pin-notice');
    pinBox.append(make('strong','','PIN provisoires élèves à distribuer individuellement'));
    const table=make('div','cw-pin-table');
    for(const x of fresh)table.append(make('span','','N° '+x.number+' · PIN '+x.pin));
    pinBox.append(table,createButton('Télécharger les PIN en CSV','cw-accent',()=>downloadPins(fresh,exam.title)));share.append(pinBox);
   }
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
   share.append(reset,createButton(access.active?'Fermer l’accès élève':'Rouvrir l’accès','cw-outline',async()=>{
    await api('teacher_close',{assessment_id:exam.id,active:!access.active},null,true);await reload();
   }));
   card.append(share);
  }
  boxes.append(card);
 }
 get('cw-copy-count').textContent=state.copies.length+' copie(s)';
 if(!state.copies.length)inbox.append(make('p','empty','Aucune copie remise pour le moment.'));
 for(const copy of state.copies){
  const exam=exams.find(e=>e.id===copy.assessment_id);
  const card=make('article','cw-copy'),head=make('div','cw-copy-top');
  head.append(make('strong','',(exam?.title||'Contrôle')+' · Élève n°'+copy.student_number),
    make('span','cw-pill '+(copy.released_at?'cw-open':''),copy.released_at?'Correction publiée':copy.graded_at?'Corrigé':'À corriger'));
  card.append(head,make('small','','Reçu le '+new Date(copy.submitted_at).toLocaleString('fr-FR')));
  for(const [id,answer] of Object.entries(copy.answers||{})){
   const p=make('div','cw-answer');p.append(make('strong','',id),make('p','',answer));card.append(p);
  }
  if(copy.file_name)card.append(createButton('📎 Ouvrir la copie jointe : '+copy.file_name,'cw-secondary',()=>openFile(copy.assessment_id,'submission',copy.student_number)));
  const form=make('form','cw-grade-form'),grade=make('input');
  grade.type='number';grade.min='0';grade.max='20';grade.step='0.25';grade.required=true;grade.placeholder='Note sur 20';grade.value=copy.grade??'';
  grade.setAttribute('aria-label','Note sur 20');
  const feedback=make('textarea');feedback.rows=3;feedback.maxLength=4000;feedback.placeholder='Conseils et correction';feedback.value=copy.feedback||'';
  feedback.setAttribute('aria-label','Commentaire professeur');
  const label=make('label','cw-release-label'),release=make('input');release.type='checkbox';release.checked=!!copy.released_at;
  label.append(release,make('span','','Publier la note et la correction pour l’élève'));
  const submit=make('button','cw-accent','Enregistrer la correction');submit.type='submit';
  form.append(grade,feedback,label,submit);
  form.addEventListener('submit',async ev=>{
   ev.preventDefault();submit.disabled=true;
   try{
    await api('teacher_grade',{assessment_id:copy.assessment_id,student_number:copy.student_number,grade:Number(grade.value),feedback:feedback.value,release:release.checked},null,true);
    message('Correction enregistrée '+(release.checked?'et publiée à l’élève.':'sans publication.'));
    await reload();
   }catch(err){message(String(err.message||err),true)}finally{submit.disabled=false}
  });
  card.append(form);inbox.append(card);
 }
}
get('cw-refresh')?.addEventListener('click',()=>reload(true));
window.addEventListener('cortex:academy-data-ready',()=>reload());
queueMicrotask(()=>{if(bridge()?.teacher?.())reload()});
window.addEventListener('cortex:academy-logout',()=>{
 state.access=[];state.copies=[];state.pins.clear();
 window.dispatchEvent(new CustomEvent('cortex:academy-coursework-stats',{detail:{copies:0,pinClasses:0}}));
 get('cw-assessment-cards')?.replaceChildren();
 get('cw-copy-list')?.replaceChildren();
});
setInterval(()=>{if(bridge()?.teacher?.()&&!document.hidden)reload()},40000);
