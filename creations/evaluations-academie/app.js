/* CORTEX Académie — client autonome, activation Supabase après configuration. */
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js?v=1';
import { api as cortexCourseworkApi } from './coursework.js?v=2.8';

const domain=/^[a-z0-9._%+-]+@ac-paris\.fr$/i;
const $=id=>document.getElementById(id);
const tabs=[...document.querySelectorAll('[data-tab]')];
let supabase=null;
let mode='login';
let busy=false;
let recoveringPassword=false;
const redirectUrl=location.origin+location.pathname;
const acadRoutes={
 overview:'prof-overview',classes:'prof-classes',pins:'cw-persistent-classes',
 assessments:'prof-assessments',copies:'cw-copies-head',suivi:'acad-live-monitoring',
 integrity:'acad-integrity',analyses:'acad-live-analytics',
 import:'acad-import-workspace',creer:'exam-form',qr:'cw-assessment-cards'
};
function currentAcadView(){
 const hash=decodeURIComponent(String(location.hash||'').replace(/^#/,''));
 const found=Object.entries(acadRoutes).find(([,id])=>id===hash);
 if(found)return found[0];
 if(hash==='acad-live-workflow')return 'qr';
 return 'overview';
}
function showAcadSection(view){
 const key=Object.prototype.hasOwnProperty.call(acadRoutes,view)?view:'overview';
 document.body.dataset.acadView=key;
 for(const link of document.querySelectorAll('.academie-prof-nav [data-acad-view]')){
  const active=link.dataset.acadView===key;
  link.classList.toggle('is-active',active);
  link.classList.toggle('active',active);
  if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 }
 const overview=$('prof-overview');if(overview)overview.hidden=key!=='overview';
}
document.addEventListener('click',event=>{
 const link=event.target.closest('a[data-acad-view]');
 if(!link||!document.body.classList.contains('academy-authenticated'))return;
 const view=link.dataset.acadView;
 if(!Object.prototype.hasOwnProperty.call(acadRoutes,view))return;
 event.preventDefault();
 showAcadSection(view);
 if(location.hash!==('#'+acadRoutes[view]))location.hash='#'+acadRoutes[view];
 requestAnimationFrame(()=>{
  const id=view==='overview'?'prof-overview':(['pins','qr','copies'].includes(view)?'acad-live-workflow':acadRoutes[view]);
  document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
 });
});
window.addEventListener('hashchange',()=>{if(document.body.classList.contains('academy-authenticated'))showAcadSection(currentAcadView())});
window.addEventListener('cortex:academy-coursework-stats',event=>{
 const d=event.detail||{};
 if($('acad-overview-copies'))$('acad-overview-copies').textContent=String(Number(d.copies)||0);
 if($('acad-overview-pins'))$('acad-overview-pins').textContent=String(Number(d.pinClasses)||0);
});


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
 document.body.classList.remove('academy-authenticated');
 delete document.body.dataset.acadView;
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
   if(event==='PASSWORD_RECOVERY'){
    recoveringPassword=true;
    queueMicrotask(()=>selectMode('update'));
   }else if(event==='SIGNED_OUT'){
    teacherId=null;myClasses=[];myExams=[];
    window.dispatchEvent(new Event('cortex:academy-logout'));
    if(!$('account-view').hidden)queueMicrotask(()=>selectMode('login'));
   }
  });
  const {data:{user},error}=await supabase.auth.getUser();
  if(error&&!['Auth session missing!','Auth session missing'].includes(error.message||''))status('Vérification de session : '+error.message,true);
  if(user&&!recoveringPassword)await showUser(user);
 }catch(err){
  $('submit').disabled=true;
  status('Chargement du service d’authentification impossible. '+(err?.message||'Réessayez plus tard.'),true);
 }
}
async function showUser(user){
 if(!academicEmail(user.email)||!user.email_confirmed_at){
  await supabase?.auth.signOut();
  selectMode('login');
  status('Une adresse @ac-paris.fr confirmée est obligatoire.',true);
  return;
 }
 $('account-email').textContent=user.email;
 $('auth-view').hidden=true;$('account-view').hidden=false;
 document.body.classList.add('academy-authenticated');
 showAcadSection(currentAcadView());
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
let myIncidents=[];
let rosterSummaries=new Map();
const summaryText=id=>{const d=rosterSummaries.get(id);return d?`${d.activated} élève(s) inscrits · G1 : ${d.group1} · G2 : ${d.group2}${d.whole?' · Classe entière : '+d.whole:''}`:'Élèves inscrits : consultez « PIN élèves »';};
window.addEventListener('cortex:academy-roster-ready',event=>{
 rosterSummaries=new Map((event.detail?.summaries||[]).map(x=>[x.classId,x]));
 for(const c of myClasses){const node=$('class-group-'+c.id);if(node)node.textContent=summaryText(c.id)}
});
window.CORTEX_ACADEMY_BRIDGE={client:()=>supabase,teacher:()=>teacherId,exams:()=>myExams,classes:()=>myClasses,refresh:()=>teacherId?loadTeacherData(teacherId):Promise.resolve()};
let selectedIntegrityExamId='';
const antiDefault={enabled:false,blockPaste:true,blockCopy:true,trackVisibility:true,warnStudent:true,watermarkCapture:true};
function antiConfig(exam){const raw=exam?.content?.antiCheat||{};return {...antiDefault,...Object.fromEntries(Object.entries(raw).filter(([k,v])=>k in antiDefault&&typeof v==='boolean'))};}
function antiCreateConfig(){return {enabled:$('exam-integrity-on').checked,blockPaste:$('exam-integrity-paste').checked,blockCopy:$('exam-integrity-copy').checked,trackVisibility:$('exam-integrity-tabs').checked,warnStudent:$('exam-integrity-warn').checked,watermarkCapture:$('exam-integrity-watermark').checked};}
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
  const [cls,ex,incident]=await Promise.all([
   supabase.from('cortex_teacher_classes').select('id,code,display_name,archived,created_at').eq('teacher_id',id).order('created_at',{ascending:false}),
   supabase.from('cortex_teacher_assessments').select('id,title,class_id,published,created_at,content').eq('teacher_id',id).order('created_at',{ascending:false}),
   supabase.from('cortex_integrity_events').select('id,assessment_id,roster_number,kind,occurred_at,duration_ms').eq('teacher_id',id).order('occurred_at',{ascending:false}).limit(100)
  ]);
  if(cls.error)throw cls.error;if(ex.error)throw ex.error;if(incident.error)throw incident.error;
  myClasses=cls.data||[];myExams=ex.data||[];myIncidents=incident.data||[];
  drawTeacherData();
 }catch(err){status('Impossible de charger les données du professeur : '+safeError(err),true);}
}
async function saveAntiCheat(exam,key,checked,checkbox){
 const id=requireTeacher(),previous=exam.content||{},current=antiConfig(exam);
 const next={...current,[key]:checked};
 checkbox.disabled=true;
 try{
  const {error}=await supabase.from('cortex_teacher_assessments')
    .update({content:{...previous,antiCheat:next}})
    .eq('id',exam.id).eq('teacher_id',id);
  if(error)throw error;
  exam.content={...previous,antiCheat:next};
  const chip=document.getElementById('anti-status-'+exam.id);
  if(chip)chip.textContent=next.enabled?'Mode intégrité activé':'Mode désactivé';
  drawAcademyTools();
  status('Paramètre enregistré pour « '+exam.title+' ». Il s’appliquera aux contrôles accessibles aux élèves.');
 }catch(err){
  checkbox.checked=!checked;status(safeError(err),true);
 }finally{checkbox.disabled=false;}
}

const directTools=[
 {key:'blockPaste',icon:'⇩',name:'Blocage du collage',detail:'Empêche les collages dans les champs de réponse.',limit:'Un texte saisi à la main reste possible.'},
 {key:'blockCopy',icon:'▤',name:'Copie du sujet',detail:'Limite copier / couper dans la page du contrôle.',limit:'N’empêche ni photos ni captures.'},
 {key:'trackVisibility',icon:'◷',name:'Sorties de page',detail:'Signale une page masquée plus de deux secondes.',limit:'Appels et notifications peuvent produire de faux positifs.'},
 {key:'warnStudent',icon:'!',name:'Avertir les élèves',detail:'Affiche un message lorsqu’une action est refusée.',limit:'Aucune sanction automatique.'},
 {key:'watermarkCapture',icon:'▧',name:'Filigrane anti-partage / IA',detail:'Affiche classe, numéro et message « aide IA interdite ».',limit:'N’empêche pas les captures ; une IA peut ignorer le texte.'}
];
function drawAcademyTools(){
 const selector=$('acad-tools-exam'),panel=$('acad-tools-panel');
 if(!selector||!panel)return;
 selector.replaceChildren();panel.replaceChildren();
 if(!myExams.length){
  selector.disabled=true;const blank=el('option','','Aucun contrôle');blank.value='';selector.append(blank);
  panel.append(el('p','empty','Crée d’abord une évaluation pour configurer ses protections.'));
  return;
 }
 selector.disabled=false;
 if(!myExams.some(e=>e.id===selectedIntegrityExamId))selectedIntegrityExamId=myExams[0].id;
 for(const e of myExams){const opt=el('option','',e.title);opt.value=e.id;selector.append(opt);}
 selector.value=selectedIntegrityExamId;
 const exam=myExams.find(e=>e.id===selectedIntegrityExamId),cfg=antiConfig(exam);
 function makeButton(key,value){
  const on=!!value,button=el('button','acad-action-toggle'+(on?' is-on':''),on?'Désactiver':'Activer');
  button.type='button';button.setAttribute('aria-pressed',String(on));
  button.addEventListener('click',()=>saveAntiCheat(exam,key,!antiConfig(exam)[key],button));
  return button;
 }
 const master=el('div','acad-tool-master');
 const masterText=el('div','');
 masterText.append(el('strong','','Mode anti-triche général'),el('p','',cfg.enabled?'Activé : les protections configurées s’appliquent aux contrôles ouverts.':'Éteint : les protections sont configurables mais inactives côté élève.'));
 master.append(masterText,makeButton('enabled',cfg.enabled));panel.append(master);
 const grid=el('div','acad-tools-grid');
 for(const tool of directTools){
  const on=cfg[tool.key],active=cfg.enabled&&on;
  const item=el('article','acad-tool-card'+(active?' is-active':''));
  const icon=el('span','acad-tool-icon',tool.icon),body=el('div','acad-tool-text');
  body.append(el('strong','',tool.name),el('p','',tool.detail),el('small','',tool.limit));
  const foot=el('div','acad-tool-actions');
  const current=el('span','acad-tool-state'+(active?' is-active':''),active?'Actif':on?'Prêt (mode éteint)':'Désactivé');
  foot.append(current,makeButton(tool.key,on));item.append(icon,body,foot);grid.append(item);
 }
 panel.append(grid);
}

function drawTeacherData(){
 $('class-list').replaceChildren();$('exam-list').replaceChildren();
 $('classes-count').textContent=myClasses.length+' classe(s)';
 $('exams-count').textContent=myExams.length+' contrôle(s)';
 if($('acad-overview-classes'))$('acad-overview-classes').textContent=String(myClasses.length);
 if($('acad-overview-exams'))$('acad-overview-exams').textContent=String(myExams.length);
 if(!myClasses.length)$('class-list').append(el('p','empty','Aucune classe enregistrée.'));
 $('class-list').classList.add('class-grid');
 for(const c of myClasses){
  const card=el('article','class-card');
  const note=el('span','class-card-note',c.display_name);
  const groupSummary=el('span','class-card-note',summaryText(c.id));groupSummary.id='class-group-'+c.id;
  const counts=el('span','class-card-bottom');
  counts.append(el('span','',myExams.filter(e=>e.class_id===c.id).length+' contrôle(s)'),el('span','','Numéros et demi-groupes dans « PIN élèves »'));
  const actions=el('div','acad-class-tile-actions');
  const access=el('a','btn secondary small','Gérer les PIN →');access.href='#cw-persistent-classes';access.dataset.acadView='pins';
  const deleteButton=el('button','btn ghost small','Supprimer');deleteButton.type='button';deleteButton.addEventListener('click',()=>removeClass(c));
  actions.append(access,deleteButton);
  card.append(el('span','class-card-upper','CLASSE · PSE'),el('strong','',c.code),note,groupSummary,counts,actions);
  $('class-list').append(card);
 }
 $('exam-class').replaceChildren();
 const blank=el('option','','Sans classe');blank.value='';$('exam-class').append(blank);
 for(const c of myClasses){
  const option=el('option','',c.display_name+' · '+c.code);option.value=c.id;$('exam-class').append(option);
 }
 drawRealExamTiles();
  const list=$('integrity-server-events');list.replaceChildren();
  $('integrity-count').textContent=myIncidents.length+' événement(s)';
  if(!myIncidents.length)list.append(el('p','empty','Aucun événement signalé par les élèves pour le moment.'));
  for(const event of myIncidents){
    const card=el('div','prof-item'),desc=el('div','prof-item-main');
    const names={paste_blocked:'Collage bloqué',copy_blocked:'Copie limitée',tab_hidden:'Page masquée'};
    const exam=myExams.find(x=>x.id===event.assessment_id),date=new Date(event.occurred_at);
    desc.append(el('strong','',names[event.kind]||'Événement'),el('small','',(exam?.title||'Contrôle')+' · N° '+event.roster_number+' · '+(Number.isNaN(date.getTime())?'Date indisponible':date.toLocaleString('fr-FR'))));
    if(event.kind==='tab_hidden'&&event.duration_ms)desc.append(el('small','','Durée : '+Math.round(event.duration_ms/1000)+' s'));
    card.append(desc);list.append(card);
  }
  drawAcademyTools();
  window.dispatchEvent(new CustomEvent('cortex:academy-data-ready'));
}

let examTileClass='',examTileGroup='',examTileSearch='';
const classTitle=e=>myClasses.find(c=>c.id===e.class_id)?.code||'Sans classe';
const groupTitle=e=>e.content?.publish_scope==='g1'?'Groupe 1':e.content?.publish_scope==='g2'?'Groupe 2':'Classe entière';
function tileButton(name,cls,handler){
 const b=el('button',cls,name);b.type='button';
 b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;
  try{await handler()}catch(e){status('Contrôle : '+safeError(e),true)}
  finally{b.disabled=false}
 });return b;
}
async function duplicateRealExam(exam){
 const content=structuredClone(exam.content||{});
 if((content.assets||[]).length||content.sourceType){
  if(!confirm('Dupliquer ? Les questions et réglages seront copiés, mais les images et fichiers privés devront être ajoutés dans la nouvelle version.'))return;
 }
 content.assets=[];content.publish_scope='all';
 for(const key of ['sourceType','sourceName','sourcePages','sourcePageCount'])delete content[key];
 for(const q of content.questions||[]){q.id='q-'+crypto.randomUUID();q.assetIds=[];}
 const {error}=await supabase.from('cortex_teacher_assessments').insert({
  teacher_id:requireTeacher(),title:exam.title+' (copie)',class_id:exam.class_id,published:false,content
 });
 if(error)throw error;
 await loadTeacherData(requireTeacher());status('Contrôle dupliqué en brouillon.');
}
async function teacherStudentSimulation(exam){
 if(!window.CORTEX_STUDENT_SIMULATOR){status('Simulateur indisponible. Recharge la page.',true);return;}
 let assets=[],subject=null;
 try{
  const r=await cortexCourseworkApi('teacher_asset_list',{assessment_id:exam.id},null,true);
  assets=(r.assets||[]).filter(a=>a.url);
 }catch(err){console.warn('Documents du test :',err)}
 try{
  const r=await cortexCourseworkApi('teacher_file',{assessment_id:exam.id,kind:'subject'},null,true);
  if(r?.url)subject=r;
 }catch{}
 try{
  window.CORTEX_STUDENT_SIMULATOR.open({
   exam:{title:exam.title,description:exam.content?.description||'',duration:exam.content?.duration||60,
         questions:exam.content?.questions||[]},
   classe:classTitle(exam),scope:exam.content?.publish_scope||'all',assets,subject,layout:'all'
  });
 }catch(error){status('Simulation impossible : '+safeError(error),true)}
}
function publicationDialog(exam){
 if(!exam.class_id){status('Affecte une classe au contrôle avant publication.',true);return;}
 const d=el('dialog','cortex-publish-dialog'),form=el('form','cortex-publish-body');
 form.append(el('h3','','Publier · '+exam.title),el('p','cortex-publish-class-line','▣ '+classTitle(exam)+' · Choisis les destinataires du contrôle.'),el('p','','La diffusion est vérifiée par le serveur pour chaque élève.'));
 const cls=el('label','','Classe : '+classTitle(exam)),scopeLabel=el('label','','Destinataires');
 const scope=el('select','');
 for(const [id,label] of [['all','Classe entière'],['g1','Groupe 1 uniquement'],['g2','Groupe 2 uniquement']]){
  const op=el('option','',label);op.value=id;scope.append(op);
 }
 scope.value=exam.content?.publish_scope||'all';scopeLabel.append(scope);
 const rosterLabel=el('label','','Effectif de la classe'),size=el('input','');
 size.type='number';size.min='1';size.max='60';
 const currentAccess=window.CORTEX_ACADEMY_COURSEWORK?.access?.()?.find(a=>a.assessment_id===exam.id);
 size.value=String(currentAccess?.roster_size||30);size.required=true;rosterLabel.append(size);
 const help=el('p','cortex-publish-help','Configuration enregistrée : '+groupTitle(exam)+'. Tu peux confirmer ce choix ou le modifier ici avant publication. Les groupes sont définis dans « PIN élèves ».');
 const actions=el('div','cortex-publish-actions');
 const cancel=el('button','btn secondary','Annuler');cancel.type='button';cancel.onclick=()=>d.close();
 const publish=el('button','btn','Confirmer la publication');publish.type='submit';
 actions.append(cancel,publish);
 form.append(cls,scopeLabel,rosterLabel,help,actions);d.append(form);document.body.append(d);
 d.addEventListener('close',()=>d.remove(),{once:true});
 form.addEventListener('submit',async e=>{
  e.preventDefault();const count=Number(size.value);
  if(!Number.isInteger(count)||count<1||count>60){size.reportValidity();return}
  publish.disabled=true;publish.textContent='Publication en cours…';
  try{
   const worker=window.CORTEX_ACADEMY_COURSEWORK;
   if(!worker)throw Error('Service publication indisponible. Recharge la page.');
   const out=await worker.publish(exam.id,scope.value,count);
   d.close();await loadTeacherData(requireTeacher());
   status('Publié pour '+(scope.value==='all'?'la classe entière':scope.value==='g1'?'le groupe 1':'le groupe 2')+
    ' · '+classTitle(exam)+(out.freshPins?.length?' · PIN provisoires dans « QR codes »':''));
  }catch(err){help.textContent=safeError(err);help.classList.add('error');publish.disabled=false;publish.textContent='Réessayer'}
 });
 d.showModal();
}
function drawRealExamTiles(){
 const root=$('exam-list');if(!root)return;root.replaceChildren();
 const filters=el('div','cortex-tiles-filter'),help=el('div','cortex-tiles-organize');
 help.append(el('strong','','ORGANISER PAR CLASSE'),el('p','','Retrouve les contrôles et les groupes sélectionnés.'));
 const cls=el('select',''),groups=el('select',''),search=el('input','');
 cls.setAttribute('aria-label','Filtrer par classe');
 let op=el('option','','Toutes les classes');op.value='';cls.append(op);
 for(const c of myClasses.filter(c=>!c.archived)){op=el('option','',c.code||c.display_name);op.value=c.id;cls.append(op)}
 cls.value=examTileClass;
 groups.setAttribute('aria-label','Filtrer par groupe');
 for(const [value,name] of [['','Tous les groupes'],['all','Classe entière'],['g1','Groupe 1'],['g2','Groupe 2']]){
  op=el('option','',name);op.value=value;groups.append(op);
 }
 groups.value=examTileGroup;filters.append(help,cls,groups);
 const bar=el('div','cortex-tiles-toolbar'),total=el('span','',''),tiles=el('div','tile-grid cortex-live-tile-grid');
 search.type='search';search.placeholder='Rechercher un contrôle…';search.value=examTileSearch;
 search.setAttribute('aria-label','Rechercher un contrôle');bar.append(total,search);
 const access=window.CORTEX_ACADEMY_COURSEWORK?.access?.()||[];
 for(const exam of myExams){
  const open=exam.published&&access.find(x=>x.assessment_id===exam.id)?.active!==false;
  const scope=exam.content?.publish_scope||'all';
  const card=el('article','card tile cortex-live-tile');
  card.dataset.classId=exam.class_id||'';card.dataset.scope=scope;
  card.dataset.search=(exam.title+' '+classTitle(exam)+' '+(exam.content?.chapter||'')).toLowerCase();
  const head=el('div','tile-stats');
  head.append(el('span','status '+(open?'ok':'warn'),open?'Publié · Accès QR':'Brouillon'),
   el('span','cortex-class-tag','CLASSE : '+classTitle(exam)),el('span','small muted',groupTitle(exam)));
  const detail=el('div','');
  const qs=exam.content?.questions||[];
  detail.append(el('h3','',exam.title),el('div','cortex-exam-class-heading','▣ '+classTitle(exam)+' · '+groupTitle(exam)),el('p','',
   (exam.content?.level||'Bac professionnel')+' · '+qs.length+' questions · '+
   qs.reduce((n,q)=>n+(Number(q.points)||0),0)+' points · '+(exam.content?.duration||60)+' min'));
  const foot=el('div','tile-foot'),row1=el('div','btn-row'),row2=el('div','btn-row');
  row1.append(tileButton('Modifier','btn ghost small',()=>window.CORTEX_MANUAL_EDITOR.edit(exam)),
   tileButton('Dupliquer','btn ghost small',()=>duplicateRealExam(exam)));
  row2.append(tileButton(open?'Modifier la publication':'Publier','table-action',()=>publicationDialog(exam)));
  if(['pdf','docx'].includes(exam.content?.sourceType))
   row2.append(tileButton('Découper ↗','table-action',()=>window.CORTEX_REAL_IMPORT.openExisting(exam.id)));
  row2.append(tileButton('▣ QR codes','table-action',()=>window.CORTEX_ACADEMY_COURSEWORK?.goToQR(exam.id)),
   tileButton('Tester ↗','table-action',()=>teacherStudentSimulation(exam)),
   tileButton('◈ Anti-triche','table-action',()=>{
    selectedIntegrityExamId=exam.id;location.hash='#acad-integrity';drawAcademyTools();
   }),
   tileButton('Supprimer','btn-delete-exam',()=>removeExam(exam)));
  foot.append(row1,row2);card.append(head,detail,foot);tiles.append(card);
 }
 const filter=()=>{
  examTileClass=cls.value;examTileGroup=groups.value;examTileSearch=search.value;
  let visible=0;
  for(const tile of tiles.children){
   const match=(!cls.value||tile.dataset.classId===cls.value)&&
    (!groups.value||tile.dataset.scope===groups.value)&&
    tile.dataset.search.includes(search.value.toLowerCase());
   tile.hidden=!match;if(match)visible++;
  }
  total.textContent=visible+' contrôle(s)'+(cls.value?' pour la classe':'');
 };
 cls.addEventListener('change',filter);groups.addEventListener('change',filter);search.addEventListener('input',filter);
 root.append(filters,bar,tiles);if(!myExams.length)root.append(el('p','empty','Aucun contrôle enregistré.'));
 filter();
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
$('acad-tools-exam').addEventListener('change',()=>{selectedIntegrityExamId=$('acad-tools-exam').value;drawAcademyTools();});
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
  const editor=window.CORTEX_MANUAL_EDITOR;
  if(!editor)throw Error('Atelier de conception indisponible. Recharge cette page.');
  const questions=editor.questions();
  const duration=Number($('exam-duration').value||60);
  if(!Number.isFinite(duration)||duration<5||duration>240)throw Error('Durée comprise entre 5 et 240 minutes.');
  const content={description,questions,doc:'', // Ancien champ commun désactivé : les documents sont propres à chaque question.
   level:$('exam-level').value.trim().slice(0,100),chapter:$('exam-chapter').value.trim().slice(0,180),
   duration,publish_scope:['all','g1','g2'].includes($('exam-publish-scope')?.value)?$('exam-publish-scope').value:'all',antiCheat:antiCreateConfig()};
  const editingId=editor.editingId();
  let error,savedId=editingId;
  if(editingId){
   const original=myExams.find(e=>e.id===editingId);
   if(!original||original.published)throw Error('Impossible de modifier un contrôle déjà publié. Duplique-le.');
   const response=await supabase.from('cortex_teacher_assessments').update({
    title,class_id,content:{...(original.content||{}),...content,
     assets:(original.content?.assets||[]).filter(asset=>!editor.removedAssetIds().includes(asset.id))}
   }).eq('id',editingId).eq('teacher_id',id);
   error=response.error;
  }else{
   const response=await supabase.from('cortex_teacher_assessments')
    .insert({teacher_id:id,title,class_id,content,published:false}).select('id').single();
   error=response.error;savedId=response.data?.id;
  }
  if(error||!savedId)throw error||Error('Enregistrement impossible.');
  editor.markSaved(savedId);
  try{await editor.uploadSource(savedId);await editor.uploadAssets(savedId);}
  catch(fileError){
   await loadTeacherData(id);
   throw Error('Le contrôle a été enregistré, mais certains documents ou captures n’ont pas été joints : '+(fileError?.message||'erreur de téléversement')+'. Tu peux réessayer sans recréer le contrôle.');
  }
  editor.afterSave();await loadTeacherData(id);
  status('Contrôle et documents enregistrés dans Supabase.');
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
   status('Vérifiez votre messagerie académique. Après avoir ouvert le lien, revenez sur CORTEX et essayez « Connexion ». Si le lien vous envoie vers localhost, votre adresse peut tout de même avoir été confirmée : utilisez la rubrique d’aide juste sous le formulaire.');
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
   recoveringPassword=false;
   status('Mot de passe mis à jour. Vous pouvez maintenant utiliser votre nouveau mot de passe.');
   const {data:{user}}=await supabase.auth.getUser();
   if(user)await showUser(user);
  }
 }catch(error){status(safeAuthMessage(error),true);}
 finally{busy=false;$('submit').disabled=false;}
});
// Confirmation alternative : le site ne dépend pas des Redirect URLs Supabase.
// L'utilisateur copie le lien reçu sans cliquer dessus et le vérifie directement en HTTPS.
function confirmationToken(link){
 const url=new URL(String(link||'').trim());
 const expected=new URL(SUPABASE_URL);
 if(url.protocol!=='https:'||url.origin!==expected.origin||url.pathname!=='/auth/v1/verify')
  throw new Error('Ce n’est pas un lien de confirmation de notre projet CORTEX. Copiez l’adresse exacte du lien reçu.');
 const type=url.searchParams.get('type');
 if(type!=='signup'&&type!=='email')
  throw new Error('Le lien reçu n’est pas un lien de confirmation d’inscription.');
 const hash=url.searchParams.get('token_hash')||url.searchParams.get('token');
 if(!hash||!/^[a-zA-Z0-9_-]{32,256}$/.test(hash))
  throw new Error('Le lien de confirmation est incomplet. Demandez un nouveau message.');
 return hash;
}
$('auth-confirm-link-form').addEventListener('submit',async event=>{
 event.preventDefault();
 if(busy||!supabase){status('La connexion au service d’authentification n’est pas prête.',true);return}
 const submit=$('auth-confirm-link-submit');
 busy=true;submit.disabled=true;
 try{
  const token_hash=confirmationToken($('auth-confirm-link').value);
  const {data,error}=await supabase.auth.verifyOtp({token_hash,type:'email'});
  if(error)throw error;
  $('auth-confirm-link').value='';
  if(data?.user){
   status('Votre adresse académique est confirmée.');
   await showUser(data.user);
  }else{
   selectMode('login');
   status('Adresse confirmée. Connectez-vous avec votre mot de passe.');
  }
 }catch(error){
  $('auth-confirm-link').value='';
  const text=String(error?.message||'');
  status(/expired|invalid|otp/i.test(text)
   ? 'Ce lien a expiré ou a déjà servi. Essayez « Connexion » : votre compte peut déjà être confirmé. Sinon, demandez un nouveau lien avant de le copier, sans cliquer dessus.'
   : safeAuthMessage(error),true);
 }finally{busy=false;submit.disabled=false}
});
$('auth-resend').addEventListener('click',async()=>{
 const email=$('email').value.trim().toLowerCase();
 if(!academicEmail(email)){status('Indiquez d’abord votre adresse @ac-paris.fr dans le champ « Adresse académique ».',true);$('email').focus();return}
 if(busy||!supabase)return;
 busy=true;$('auth-resend').disabled=true;
 try{
  const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:redirectUrl}});
  if(error)throw error;
  status('Si votre adresse n’est pas déjà confirmée, un nouveau message vient d’être demandé. Avant de cliquer sur son lien, copiez son adresse dans le champ de confirmation ci-dessus.');
 }catch(error){status(safeAuthMessage(error),true)}
 finally{busy=false;$('auth-resend').disabled=false}
});

for(const tab of tabs)tab.addEventListener('click',()=>selectMode(tab.dataset.tab));
for(const button of document.querySelectorAll('[data-show]'))button.addEventListener('click',()=>{
 const input=$(button.dataset.show);input.type=input.type==='password'?'text':'password';
 button.textContent=input.type==='password'?'Afficher':'Masquer';
});
$('logout').addEventListener('click',async()=>{
 if(!supabase)return;await supabase.auth.signOut();teacherId=null;myClasses=[];myExams=[];myIncidents=[];rosterSummaries.clear();selectedIntegrityExamId='';selectMode('login');status('Vous êtes déconnecté.');
});
selectMode('login');
await init();
