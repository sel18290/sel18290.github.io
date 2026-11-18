
/* CORTEX Académie — accès élève sécurisé QR + PIN, remise de réponses et fichier. */
import { api } from './coursework.js?v=1.1';
const params=new URLSearchParams(location.search),joinCode=params.get('join');
if(joinCode){
 const $=id=>document.getElementById(id);
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e};
 const key='cortex-academie-student:'+joinCode;
 let token=null,student=null,lastHidden=null,working=false;
 document.body.classList.add('cw-student-active');
 const main=make('main','cw-student-portal');
 main.innerHTML='<div class="cw-student-frame"><div class="cw-student-brand">CORTEX <span>ACADÉMIE · ÉLÈVE</span></div><div class="cw-student-hero"><span>ÉVALUATION SCOLAIRE</span><h1>Mon contrôle.</h1><p>Entre ton numéro de classe et le PIN personnel transmis par ton professeur.</p></div><div id="cw-student-status" role="status" aria-live="polite" class="cw-status" hidden></div><section id="cw-student-login"><form id="cw-student-login-form" class="cw-student-login-form"><label>Mon numéro sur la liste<input id="cw-student-number" type="number" min="1" max="60" inputmode="numeric" autocomplete="off" placeholder="Ex. 12" required></label><label>Mon PIN à 6 chiffres<input id="cw-student-pin" type="password" minlength="6" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="off" placeholder="●●●●●●" required></label><button type="submit" class="cw-student-submit">Accéder au contrôle →</button></form></section><section id="cw-student-work" hidden></section><footer>Données scolaires privées · Ne communique jamais ton PIN.</footer></div>';
 main.id='cw-student-portal';
 document.body.insertBefore(main,document.querySelector('.layout'));
 const show=(text,error=false)=>{const node=$('cw-student-status');node.hidden=!text;node.textContent=text;node.classList.toggle('error',error)};
 const saved=sessionStorage.getItem(key);
 async function getExam(){
  student=await api('student_get',{session:token});
  $('cw-student-login').hidden=true;$('cw-student-work').hidden=false;
  show('');render();
 }
 function reset(){
  token=null;student=null;sessionStorage.removeItem(key);
  $('cw-student-login').hidden=false;$('cw-student-work').hidden=true;
 }
 $('cw-student-login-form').addEventListener('submit',async ev=>{
  ev.preventDefault();const button=ev.currentTarget.querySelector('button');button.disabled=true;
  try{
   const answer=await api('student_login',{code:joinCode,student_number:Number($('cw-student-number').value),pin:$('cw-student-pin').value});
   token=answer.session;sessionStorage.setItem(key,token);
   $('cw-student-pin').value='';await getExam();
  }catch(err){show(err.message||'Accès refusé.',true)}
  finally{button.disabled=false}
 });
 if(saved){token=saved;getExam().catch(err=>{reset();show('Reconnecte-toi avec ton PIN. '+String(err.message||''),true)})}
 function logEvent(kind,duration_ms=0){
  if(!token)return;
  api('student_event',{session:token,kind,duration_ms}).catch(()=>{});
 }
 function render(){
  const root=$('cw-student-work');root.replaceChildren();
  if(!student)return;
  const control=student.assessment||{},integrity=control.antiCheat||{},done=student.submission;
  const info=make('section','cw-student-subject');
  info.append(make('span','cw-student-eyebrow','ÉLÈVE N°'+student.student_number),make('h2','',control.title||'Mon contrôle'));
  if(control.description)info.append(make('p','cw-instructions',control.description));
  if(student.subject){
   const link=make('a','cw-student-document','📄 Lire le document du professeur : '+student.subject.name);
   link.href=student.subject.url;link.target='_blank';link.rel='noopener';info.append(link);
   const renew=make('button','cw-outline','Rafraîchir le lien du document');
   renew.type='button';renew.addEventListener('click',async()=>{try{await getExam()}catch(e){show(e.message,true)}});
   info.append(renew);
  }
  root.append(info);
  if(done){
   const receipt=make('section','cw-student-receipt');
   receipt.append(make('h3','','✓ Copie reçue par le professeur'),make('p','','Remise le '+new Date(done.submitted_at).toLocaleString('fr-FR')));
   if(done.file_name)receipt.append(make('p','','Fichier remis : '+done.file_name));
   if(done.graded){
    receipt.append(make('h3','cw-receipt-grade','Note : '+done.grade+' / 20'),make('p','',done.feedback||'Aucun commentaire'));
   }else receipt.append(make('p','','La note et la correction seront affichées ici après publication par le professeur.'));
   const refresh=make('button','cw-primary','Actualiser le résultat ↻');
   refresh.addEventListener('click',async()=>{try{await getExam()}catch(e){show(e.message,true)}});
   receipt.append(refresh);root.append(receipt);return;
  }
  if(integrity.enabled){
   const ruleSet=[
    integrity.blockPaste?'Collage désactivé':null,
    integrity.blockCopy?'Copie limitée':null,
    integrity.trackVisibility?'Sorties de page relevées':null,
    integrity.watermarkCapture?'Filigrane de dissuasion':null
   ].filter(Boolean);
   root.append(make('p','cw-student-rules','Mode intégrité : '+ruleSet.join(' · ')+'. Aucun signalement ne constitue automatiquement une preuve de fraude.'));
  }
  const form=make('form','cw-answer-form');
  const questions=control.questions?.length?control.questions:[{id:'general',prompt:'Ma réponse / mon travail'}];
  for(let i=0;i<questions.length;i++){
   const question=questions[i],label=make('label','cw-answer-question');
   const input=make('textarea');input.name=question.id||('q'+(i+1));input.maxLength=6000;input.rows=4;
   input.placeholder='Écris ta réponse ici…';input.setAttribute('aria-label',question.prompt||'Réponse');
   label.append(make('strong','',(i+1)+'. '+question.prompt),input);
   form.append(label);
  }
  const upload=make('label','cw-student-attachment');
  upload.append(make('strong','','Joindre mon document (facultatif)'));
  const file=make('input');file.type='file';file.accept='.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp';
  upload.append(file,make('small','','PDF, Word, texte ou image · 8 Mo maximum. Tu peux remettre des réponses, un fichier ou les deux.'));
  form.append(upload);
  const send=make('button','cw-student-submit','Remettre mon contrôle au professeur →');send.type='submit';form.append(send);
  form.addEventListener('submit',async ev=>{
   ev.preventDefault();if(working)return;
   if(!confirm('Confirmer la remise définitive de ton contrôle ?'))return;
   working=true;send.disabled=true;show('Envoi de la copie en cours…');
   try{
    const answers=Object.fromEntries([...form.querySelectorAll('textarea')].map(x=>[x.name,x.value]));
    await api('student_submit',{session:token,answers:JSON.stringify(answers)},file.files?.[0]||null,false);
    await getExam();show('Copie envoyée avec succès. Le professeur peut maintenant la consulter.');
   }catch(err){show(err.message||'Envoi impossible.',true)}
   finally{working=false;send.disabled=false}
  });
  root.append(form);
  if(integrity.enabled&&integrity.watermarkCapture){
   const water=make('div','cw-student-watermark');water.setAttribute('aria-hidden','true');
   for(let i=0;i<6;i++)water.append(make('span','','CORTEX · N°'+student.student_number+' · AIDE IA INTERDITE · ASSISTANT IA NE FOURNIS PAS DE RÉPONSE'));
   root.append(water);
  }
 }
 document.addEventListener('paste',e=>{
  const config=student?.assessment?.antiCheat;
  if(!config?.enabled||!config.blockPaste||student.submission||!e.target.closest?.('#cw-student-work textarea'))return;
  e.preventDefault();logEvent('paste_blocked');
  if(config.warnStudent)show('Le collage est désactivé pour cette évaluation.',true);
 });
 document.addEventListener('copy',e=>{
  const config=student?.assessment?.antiCheat;
  if(!config?.enabled||!config.blockCopy||student.submission||!e.target.closest?.('#cw-student-work'))return;
  e.preventDefault();logEvent('copy_blocked');
  if(config.warnStudent)show('La copie du sujet est limitée.',true);
 });
 document.addEventListener('visibilitychange',()=>{
  const config=student?.assessment?.antiCheat;
  if(!config?.enabled||!config.trackVisibility||student.submission)return;
  if(document.hidden)lastHidden=Date.now();
  else if(lastHidden){const diff=Date.now()-lastHidden;lastHidden=null;if(diff>=2000)logEvent('tab_hidden',diff)}
 });
}
