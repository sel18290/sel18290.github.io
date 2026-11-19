/* CORTEX Académie — comptes élèves persistants par classe, gérés par le professeur. */
import {api} from './coursework.js?v=2.11';
const $=id=>document.getElementById(id);
const E=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const B=()=>window.CORTEX_ACADEMY_BRIDGE;
const pinInvitations=new Map();
const pinJoinUrl=(portal,token)=>location.origin+location.pathname+'?classe='+encodeURIComponent(portal)+'&inscription='+encodeURIComponent(token);
let access=[],enrollments=[],busy=false,pending=false;
function notice(msg,error=false){const e=$('cw-class-status');if(!e)return;e.hidden=!msg;e.textContent=msg;e.classList.toggle('error',error)}
function permanentUrl(code){return location.origin+location.pathname+'?classe='+encodeURIComponent(code)}
async function refresh(){if(!B()?.teacher?.())return;if(busy){pending=true;return}busy=true;try{const result=await api('teacher_list',{},null,true);access=result.classAccess||[];
  enrollments=result.enrollments||[];
  render();
  window.dispatchEvent(new CustomEvent('cortex:academy-roster-ready',{detail:{
   summaries:(B()?.classes?.()||[]).map(c=>{
    const students=enrollments.filter(e=>e.class_id===c.id&&e.activated_at);
    return {classId:c.id,activated:students.length,group1:students.filter(e=>e.demi_groupe===1).length,
      group2:students.filter(e=>e.demi_groupe===2).length,
      whole:students.filter(e=>!e.demi_groupe).length};
   })
  }}))}catch(err){notice(err.message||'Impossible de charger les classes.',true)}finally{busy=false;if(pending){pending=false;queueMicrotask(refresh)}}}
function button(label,className,fn){
 const el=E('button',className,label);el.type='button';
 el.addEventListener('click',async()=>{el.disabled=true;try{await fn()}catch(err){notice(err.message||'Erreur serveur.',true)}finally{el.disabled=false}});
 return el;
}
function render(){
 const target=$('cw-class-cards');if(!target)return;
 target.replaceChildren();
 const classes=B()?.classes?.()||[];
 if(!classes.length){target.append(E('p','empty','Créez d’abord une classe dans « Mes classes ».'));return}
 for(const cl of classes){
  const record=access.find(a=>a.class_id===cl.id);
  const card=E('article','cw-class-card'),head=E('div','cw-card-head'),title=E('div');
  const registrationOpen=!!record?.registration_open_until&&new Date(record.registration_open_until)>new Date();
  title.append(E('strong','',cl.code+' · '+cl.display_name),E('small','','Comme dans le Test : l’élève choisit son PIN personnel lors de sa première connexion. Tu n’as aucun PIN à distribuer.'));
  head.append(title);
  if(registrationOpen||record)head.append(E('span','cw-pill '+(registrationOpen?'cw-open':''),registrationOpen?'PIN ouverts · 30 min':'Accès actif'));
  card.append(head);
  const controls=E('div','cw-publish-row'),selector=E('select','cw-roster-size');
  selector.setAttribute('aria-label','Effectif pour la classe '+cl.code);
  for(const n of [15,20,25,30,35,40,45,50,55,60]){
   const option=E('option','',n+' numéros');option.value=String(n);option.selected=n===(record?.roster_size||30);selector.append(option);
  }
  controls.append(E('label','','Effectif'),selector,button(registrationOpen?'↻ Prolonger de 30 min':'✦ Ouvrir la création des PIN · 30 min','cw-accent',async()=>{
   const response=await api('teacher_pin_enrollment',{class_id:cl.id,roster_size:Number(selector.value),enabled:true},null,true);
   pinInvitations.set(cl.id,{portal:response.portal_code,token:response.registration_token});
   const endTime=new Date(response.registration_open_until).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
   notice('Création des PIN ouverte pour '+cl.code+' jusqu’à '+endTime+'. Les élèves entrent leur numéro et choisissent eux-mêmes leur PIN. Surveille la première inscription en classe.');
   await refresh();
  }));
  if(registrationOpen){
   controls.append(button('Fermer maintenant','cw-secondary',async()=>{
    await api('teacher_pin_enrollment',{class_id:cl.id,roster_size:Number(selector.value),enabled:false},null,true);
    pinInvitations.delete(cl.id);
    notice('Création des PIN fermée pour '+cl.code+'. Les élèves déjà inscrits peuvent toujours se connecter.');
    await refresh();
   }));
  }
  card.append(controls);
  if(registrationOpen){
   const info=E('section','cw-pin-invite');
   const deadline=new Date(record.registration_open_until).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
   info.append(E('strong','','✦ Création de PIN ouverte jusqu’à '+deadline),
     E('p','','Partage le lien temporaire : chaque élève choisit sa classe, son demi-groupe 1 ou 2 et son numéro, puis crée son PIN. Les nouvelles inscriptions seront classées ci-dessous automatiquement.'));
   const invitation=pinInvitations.get(cl.id);
   if(invitation?.token){
    const url=pinJoinUrl(invitation.portal,invitation.token);
    const field=E('input','cw-join-url');field.value=url;field.readOnly=true;
    field.setAttribute('aria-label','Lien temporaire de création de PIN pour '+cl.code);
    info.append(field);
    const actions=E('div','cw-share-buttons');
    actions.append(button('Copier le lien d’inscription','cw-accent',async()=>{
     try{await navigator.clipboard.writeText(url);notice('Lien temporaire copié. Affiche-le aux élèves uniquement pendant la séance.')}
     catch{field.focus();field.select();notice('Lien sélectionné : copie-le manuellement.')}
    }));
    const visit=E('a','cw-secondary','Ouvrir la page élève ↗');visit.href=url;visit.target='_blank';visit.rel='noopener';actions.append(visit);info.append(actions);
   }else info.append(E('p','cw-pin-invite-tip','Pour afficher un nouveau lien temporaire, clique sur « Prolonger de 30 min ». Le précédent lien sera remplacé.'));
   card.append(info);
  }
  const assigned=enrollments.filter(x=>x.class_id===cl.id&&!!x.activated_at);
  const group1=assigned.filter(x=>x.demi_groupe===1),group2=assigned.filter(x=>x.demi_groupe===2),
   whole=assigned.filter(x=>!x.demi_groupe);
  const stats=E('div','cw-group-stats');
  stats.append(E('span','cw-group-stat-label','Élèves inscrits : '+assigned.length),
   E('span','cw-group-stat-one','Groupe 1 · '+group1.length),
   E('span','cw-group-stat-two','Groupe 2 · '+group2.length));
  if(whole.length)stats.append(E('span','cw-group-stat-whole','Groupe non renseigné · '+whole.length));
  card.append(stats);
  if(assigned.length){
   const details=E('details','cw-group-roster'),summary=E('summary','','Voir les élèves inscrits par demi-groupe ('+assigned.length+')');
   const list=E('div','cw-group-roster-list');
   const orderGroup=g=>g===1?0:g===2?1:2;
   const sorted=assigned.slice().sort((a,b)=>orderGroup(a.demi_groupe)-orderGroup(b.demi_groupe)||a.student_number-b.student_number);
   let previousGroup='';
   for(const row of sorted){
    const group=row.demi_groupe===1?'one':row.demi_groupe===2?'two':'legacy';
    if(group!==previousGroup){
     const heading=group==='one'?'Demi-groupe 1 · '+group1.length+' élève(s)':
      group==='two'?'Demi-groupe 2 · '+group2.length+' élève(s)':
      'Groupe non renseigné · '+whole.length+' ancien(s) PIN';
     list.append(E('h5','cw-group-roster-heading cw-group-roster-'+group,heading));
     previousGroup=group;
    }
    const line=E('div','cw-group-roster-line'),name=E('strong','','Élève n°'+row.student_number),
     label=E('label','','Demi-groupe'),selector=E('select','cw-group-select');
    selector.setAttribute('aria-label','Demi-groupe de l’élève numéro '+row.student_number+' en '+cl.code);
    for(const [value,text] of [['1','Groupe 1'],['2','Groupe 2'],['0','Non renseigné']]){
     const opt=E('option','',text);opt.value=value;opt.selected=Number(value)===(row.demi_groupe||0);selector.append(opt);
    }
    selector.addEventListener('change',async()=>{
     selector.disabled=true;
     try{
      const chosen=Number(selector.value);
      await api('teacher_class_set_group',{class_id:cl.id,student_number:row.student_number,demi_groupe:chosen},null,true);
      notice('Élève n°'+row.student_number+' affecté à '+(chosen?'demi-groupe '+chosen:'classe entière')+' dans '+cl.code+'.');
      await refresh();
     }catch(err){notice(err.message||'Modification impossible.',true);selector.value=String(row.demi_groupe||0)}
     finally{selector.disabled=false}
    });
    label.append(selector);line.append(name,label);list.append(line);
   }
   details.append(summary,list);card.append(details);
  }else{
   card.append(E('p','cw-group-help',record?.portal_code?
    'Aucun PIN choisi pour le moment. Ouvre la création pendant 30 minutes pour que les élèves s’inscrivent avec leur numéro.':
    'Aucun élève inscrit. Clique sur « Ouvrir la création des PIN » pour démarrer les inscriptions.'));
  }
  if(record?.portal_code){
   const share=E('div','cw-class-share'),url=permanentUrl(record.portal_code);
   const line=E('p','cw-explainer','Lien de la classe : l’élève saisit son numéro, puis son PIN. À la première visite, clique sur « Je crée mon PIN » lorsque tu as ouvert la création. Code de classe : '+record.portal_code.slice(-4).toUpperCase()+'.');
   const field=E('input','cw-join-url');field.value=url;field.readOnly=true;field.setAttribute('aria-label','Lien permanent pour '+cl.code);
   const controls=E('div','cw-share-buttons');
   controls.append(button('Copier le lien de classe','cw-secondary',async()=>{
    try{await navigator.clipboard.writeText(url);notice('Lien permanent copié pour '+cl.code+'.')}
    catch{field.select();field.focus();notice('Lien sélectionné : copiez-le manuellement.')}
   }));
   const visit=E('a','cw-secondary','Tester le lien élève ↗');visit.href=url;visit.target='_blank';visit.rel='noopener';controls.append(visit);
   share.append(line,field,controls);
   const reset=E('div','cw-reset-row'),number=E('input');
   number.type='number';number.min='1';number.max=String(record.roster_size);number.placeholder='N° élève';number.setAttribute('aria-label','Numéro de l’élève dont il faut renouveler le PIN');
   reset.append(number,button('Réinitialiser le PIN de cet élève','cw-secondary',async()=>{
    const n=Number(number.value);
    if(!Number.isInteger(n)||n<1||n>record.roster_size)throw Error('Indique un numéro d’élève valide.');
    if(!confirm('Réinitialiser le PIN du n°'+n+' en '+cl.code+' ? Les anciennes connexions seront invalidées ; les copies et les notes restent conservées.'))return;
    const result=await api('teacher_class_reset_pin',{class_id:cl.id,student_number:n},null,true);
    const opened=await api('teacher_pin_enrollment',{class_id:cl.id,roster_size:record.roster_size,enabled:true},null,true);
    pinInvitations.set(cl.id,{portal:opened.portal_code,token:opened.registration_token});
    const endTime=new Date(opened.registration_open_until).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    notice('PIN du n°'+result.number+' réinitialisé sans effacer ses copies. Il peut en choisir un nouveau jusqu’à '+endTime+'.');
    await refresh();
   }));share.append(reset);
   card.append(share);
  }
  target.append(card);
 }
}
window.addEventListener('cortex:academy-data-ready',refresh);
window.addEventListener('cortex:academy-class-updated',refresh);
window.addEventListener('cortex:academy-logout',()=>{access=[];enrollments=[];pinInvitations.clear();$('cw-class-cards')?.replaceChildren()});
// Forcer une lecture serveur quand le professeur ouvre « PIN élèves » :
 // ne jamais dépendre d'un état vide ou d'un événement déjà passé.
 window.addEventListener('hashchange',()=>{
  if(location.hash==='#cw-persistent-classes'&&B()?.teacher?.())refresh();
 });
 queueMicrotask(()=>{if(B()?.teacher?.())refresh()});
