/* CORTEX Académie — client autonome, activation Supabase après configuration. */
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js?v=1';

const domain=/^[a-z0-9._%+-]+@ac-paris\.fr$/i;
const $=id=>document.getElementById(id);
const tabs=[...document.querySelectorAll('[data-tab]')];
let supabase=null;
let mode='login';
let busy=false;
const redirectUrl=location.origin+location.pathname;

function status(text,error=false){
 const el=$('status');el.textContent=text;el.hidden=!text;el.classList.toggle('error',error);
}
function academicEmail(value){
 return typeof value==='string'&&domain.test(value.trim());
}
function strongPassword(value){
 return typeof value==='string'&&value.length>=14&&value.length<=128&&
  /[A-Z]/.test(value)&&/[a-z]/.test(value)&&/[0-9]/.test(value)&&
  /[^A-Za-z0-9]/.test(value);
}
function selectMode(next){
 mode=next;status('');
 const recovering=next==='update';
 $('form-title').textContent=next==='login'?'Bon retour dans CORTEX.':next==='signup'?'Créer votre compte académique.':recovering?'Choisissez un nouveau mot de passe.':'Récupérer votre accès.';
 $('form-subtitle').textContent=next==='signup'?'Votre messagerie académique sera vérifiée par e-mail avant toute connexion.':next==='reset'?'Nous enverrons un lien de réinitialisation à votre adresse académique.':recovering?'Choisissez un nouveau mot de passe personnel et robuste.':'Connectez-vous avec votre adresse académique personnelle.';
 $('password-field').hidden=next==='reset';
 $('confirm-field').hidden=!['signup','update'].includes(next);
 $('requirements').hidden=!['signup','update'].includes(next);
 $('email').closest('.field').hidden=recovering;
 $('password').required=next!=='reset';
 $('confirm-password').required=['signup','update'].includes(next);
 $('password').autocomplete=next==='login'?'current-password':'new-password';
 $('submit').innerHTML=next==='signup'?'Créer mon compte <span>↗</span>':next==='reset'?'Recevoir un lien <span>↗</span>':recovering?'Enregistrer mon nouveau mot de passe <span>↗</span>':'Se connecter <span>↗</span>';
 for(const tab of tabs){tab.classList.toggle('selected',tab.dataset.tab===next);tab.setAttribute('aria-selected',String(tab.dataset.tab===next));}
 $('auth-view').hidden=false;$('account-view').hidden=true;
}
function isConfigured(){
 return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL)&&
  /^(sb_publishable_[a-zA-Z0-9_-]+|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)$/.test(SUPABASE_PUBLISHABLE_KEY);
}
async function init(){
 if(!isConfigured()){
  $('setup-notice').hidden=false;
  status('La nouvelle version est prête, mais aucun projet Supabase n’est encore connecté. Les inscriptions et les connexions sont temporairement désactivées.',true);
  $('submit').disabled=true;
  return;
 }
 try{
  // Version figée pour éviter les mises à jour automatiques de dépendances.
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm');
  supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
  $('setup-notice').hidden=true;
  supabase.auth.onAuthStateChange((event)=>{
   if(event==='PASSWORD_RECOVERY')queueMicrotask(()=>selectMode('update'));
  });
  const {data:{user},error}=await supabase.auth.getUser();
  if(error&&!['Auth session missing!','Auth session missing'].includes(error.message||''))status('Vérification de session : '+error.message,true);
  if(user)await showUser(user);
 }catch(err){
  $('submit').disabled=true;
  status('Chargement du service d’authentification impossible. '+(err?.message||'Réessayez plus tard.'),true);
 }
}
async function showUser(user){
 if(!academicEmail(user.email)||!user.email_confirmed_at){
  await supabase?.auth.signOut();
  status('Une adresse @ac-paris.fr confirmée est obligatoire.',true);
  selectMode('login');
  return;
 }
 $('account-email').textContent=user.email;
 $('auth-view').hidden=true;$('account-view').hidden=false;
 status('');
 await loadTeacherData(user.id);
}
function safeAuthMessage(error){
 const msg=String(error?.message||'La demande a échoué.');
 if(/rate limit|over_email_send_rate_limit/i.test(msg))return 'Trop de demandes. Réessayez plus tard.';
 if(/email_address_not_authorized/i.test(msg))return 'Envoi impossible : l’administrateur doit configurer un serveur SMTP externe avant les inscriptions.';
 if(/invalid login credentials/i.test(msg))return 'Adresse ou mot de passe incorrect.';
 if(/already registered/i.test(msg))return 'Cette adresse semble déjà inscrite. Essayez « Connexion ».';
 return msg;
}

let teacherId=null;
let myClasses=[];
let myExams=[];
const el=(tag,cls,txt)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(txt!==undefined)node.textContent=String(txt);
 return node;
};
function safeError(err){
 return String(err?.message||'La requête a échoué.').replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/ig,'[identifiant]').slice(0,240);
}
async function loadTeacherData(id){
 teacherId=id;
 try{
  const [cls,ex]=await Promise.all([
   supabase.from('cortex_teacher_classes').select('id,code,display_name,archived,created_at').eq('teacher_id',id).order('created_at',{ascending:false}),
   supabase.from('cortex_teacher_assessments').select('id,title,class_id,published,created_at,content').eq('teacher_id',id).order('created_at',{ascending:false})
  ]);
  if(cls.error)throw cls.error;if(ex.error)throw ex.error;
  myClasses=cls.data||[];myExams=ex.data||[];
  drawTeacherData();
 }catch(err){status('Impossible de charger les données du professeur : '+safeError(err),true);}
}
function drawTeacherData(){
 $('class-list').replaceChildren();$('exam-list').replaceChildren();
 $('classes-count').textContent=myClasses.length+' classe(s)';
 $('exams-count').textContent=myExams.length+' contrôle(s)';
 if(!myClasses.length)$('class-list').append(el('p','empty','Aucune classe enregistrée.'));
 for(const c of myClasses){
  const row=el('div','prof-item'),detail=el('div','prof-item-main');
  detail.append(el('strong','',c.display_name),el('small','',c.code));
  const action=el('button','prof-delete','Supprimer');action.type='button';
  action.addEventListener('click',()=>removeClass(c));
  row.append(detail,action);$('class-list').append(row);
 }
 $('exam-class').replaceChildren();
 const blank=el('option','','Sans classe');blank.value='';$('exam-class').append(blank);
 for(const c of myClasses){
  const option=el('option','',c.display_name+' · '+c.code);option.value=c.id;$('exam-class').append(option);
 }
 if(!myExams.length)$('exam-list').append(el('p','empty','Aucune évaluation enregistrée.'));
 for(const exam of myExams){
  const row=el('div','prof-item'),detail=el('div','prof-item-main');
  const cl=myClasses.find(c=>c.id===exam.class_id);
  detail.append(el('strong','',exam.title),el('small','',cl?.display_name||'Sans classe'));
  const action=el('button','prof-delete','Supprimer');action.type='button';action.addEventListener('click',()=>removeExam(exam));
  row.append(detail,action);$('exam-list').append(row);
 }
}
function requireTeacher(){
 if(!supabase||!teacherId)throw Error('Session académique absente. Reconnectez-vous.');
 return teacherId;
}
async function removeClass(c){
 if(!confirm('Supprimer la classe '+c.display_name+' ? Les contrôles qui lui sont liés seront conservés sans classe.'))return;
 try{
  const id=requireTeacher();
  const {error}=await supabase.from('cortex_teacher_classes').delete().eq('id',c.id).eq('teacher_id',id);
  if(error)throw error;
  await loadTeacherData(id);
  status('Classe supprimée.');
 }catch(err){status(safeError(err),true);}
}
async function removeExam(exam){
 if(!confirm('Supprimer définitivement le contrôle « '+exam.title+' » ?'))return;
 try{
  const id=requireTeacher();
  const {error}=await supabase.from('cortex_teacher_assessments').delete().eq('id',exam.id).eq('teacher_id',id);
  if(error)throw error;
  await loadTeacherData(id);
  status('Contrôle supprimé.');
 }catch(err){status(safeError(err),true);}
}
$('class-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const button=event.submitter;
 if(button)button.disabled=true;
 try{
  const id=requireTeacher();
  const code=$('class-code').value.trim().toUpperCase(),display_name=$('class-name').value.trim();
  if(!/^[A-Z0-9 -]{2,40}$/.test(code)||display_name.length<2)throw Error('Renseignez un code de classe et un nom valides.');
  const {error}=await supabase.from('cortex_teacher_classes').insert({teacher_id:id,code,display_name});
  if(error)throw error;
  $('class-form').reset();await loadTeacherData(id);
  status('Classe enregistrée dans Supabase.');
 }catch(err){status(safeError(err),true);}
 finally{if(button)button.disabled=false;}
});
$('exam-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.submitter;if(button)button.disabled=true;
 try{
  const id=requireTeacher(),title=$('exam-title').value.trim();
  if(!title||title.length>180)throw Error('Le titre du contrôle est obligatoire.');
  const class_id=$('exam-class').value||null;
  const description=$('exam-description').value.trim();
  const {error}=await supabase.from('cortex_teacher_assessments').insert({teacher_id:id,title,class_id,content:{description,questions:[]},published:false});
  if(error)throw error;
  $('exam-form').reset();await loadTeacherData(id);
  status('Contrôle enregistré dans Supabase.');
 }catch(err){status(safeError(err),true);}
 finally{if(button)button.disabled=false;}
});

$('auth-form').addEventListener('submit',async ev=>{
 ev.preventDefault();if(busy||!supabase){status('Supabase n’est pas encore configuré.',true);return;}
 const email=$('email').value.trim().toLowerCase();
 const password=$('password').value,confirmation=$('confirm-password').value;
 if(mode!=='update'&&!academicEmail(email)){status('Utilisez exclusivement une adresse personnelle @ac-paris.fr.',true);return;}
 if(['signup','update'].includes(mode)&&(!strongPassword(password)||password!==confirmation)){
  status('Choisissez au moins 14 caractères avec majuscule, minuscule, chiffre et symbole, puis confirmez le même mot de passe.',true);return;
 }
 busy=true;$('submit').disabled=true;status('');
 try{
  if(mode==='signup'){
   const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:redirectUrl}});
   if(error)throw error;
   status('Si cette inscription est autorisée, un e-mail de confirmation sera envoyé à votre adresse académique. Vérifiez votre messagerie et ses courriers indésirables.');
  }else if(mode==='login'){
   const {data,error}=await supabase.auth.signInWithPassword({email,password});
   if(error)throw error;
   if(data?.user)await showUser(data.user);
  }else if(mode==='reset'){
   const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl});
   if(error)throw error;
   status('Si un compte existe pour cette adresse, un e-mail de réinitialisation sera envoyé.');
  }else if(mode==='update'){
   const {error}=await supabase.auth.updateUser({password});
   if(error)throw error;
   status('Mot de passe mis à jour. Vous pouvez maintenant utiliser votre nouveau mot de passe.');
   const {data:{user}}=await supabase.auth.getUser();
   if(user)await showUser(user);
  }
 }catch(error){status(safeAuthMessage(error),true);}
 finally{busy=false;$('submit').disabled=false;}
});
for(const tab of tabs)tab.addEventListener('click',()=>selectMode(tab.dataset.tab));
for(const button of document.querySelectorAll('[data-show]'))button.addEventListener('click',()=>{
 const input=$(button.dataset.show);input.type=input.type==='password'?'text':'password';
 button.textContent=input.type==='password'?'Afficher':'Masquer';
});
$('logout').addEventListener('click',async()=>{
 if(!supabase)return;await supabase.auth.signOut();teacherId=null;myClasses=[];myExams=[];selectMode('login');status('Vous êtes déconnecté.');
});
selectMode('login');
await init();
