/* CORTEX Académie — comptes élèves persistants par classe, gérés par le professeur. */
import {api} from './coursework.js?v=2.12';
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
 // Les nouvelles inscriptions actualisent les effectifs sans refermer les
 // groupes que le professeur est en train de consulter.
 const openRosters=new Set([...target.querySelectorAll('details.cw-group-roster[open]')].map(x=>x.dataset.classId));
 target.replaceChildren();
 const classes=B()?.classes?.()||[];
 if(!classes.length){target.append(E('p','empty','Créez d’abord une classe dans « Mes classes ».'));return}
 for(const cl of classes){
  const record=access.find(a=>a.class_id===cl.id);
  const card=E('article','cw-class-card'),head=E('div','cw-card-head'),title=E('div');
  const registrationOpen=!!record?.registration_open_until&&new Date(record.registration_open_until)>new Date();
  title.append(E('strong','',cl.code+' · '+cl.display_name),E('small','','Comme dans le Test : l’élève choisit son PIN personnel lors de sa première connexion. Les PIN personnels restent masqués.'));
  head.append(title);
  if(registrationOpen||record)head.append(E('span','cw-pill '+(registrationOpen?'cw-open':''),registrationOpen?'Création de PIN ouverte':'Connexion possible · créations fermées'));
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
  const prepared=enrollments.filter(x=>x.class_id===cl.id);
  const assigned=prepared.filter(x=>!!x.activated_at);
  const group1=assigned.filter(x=>x.demi_groupe===1),group2=assigned.filter(x=>x.demi_groupe===2);
  const stats=E('div','cw-group-stats');
  stats.append(E('span','cw-group-stat-label','Comptes créés : '+assigned.length),
   E('span','cw-group-stat-one','Groupe 1 · '+group1.length),
   E('span','cw-group-stat-two','Groupe 2 · '+group2.length));
  card.append(stats);
  const details=E('details','cw-group-roster');
  details.dataset.classId=cl.id;
  details.open=openRosters.has(cl.id);
  const size=record?.roster_size||30;
  details.append(E('summary','','Tableau des PIN · '+assigned.length+' / '+size+' comptes créés'));
  const scroll=E('div','cw-pin-table-scroll');
  const table=E('table','cw-pin-table');
  table.setAttribute('aria-label','Comptes élèves et PIN de '+cl.code);
  const header=table.createTHead().insertRow(),rows=table.createTBody();
  for(const column of ['N°','Compte','PIN','Demi-groupe','Actions']){
   const cell=E('th','',column);cell.scope='col';header.append(cell);
  }
  const byNumber=new Map(prepared.map(row=>[row.student_number,row]));
  for(let n=1;n<=size;n++){
   const student=byNumber.get(n),active=!!student?.activated_at;
   const row=rows.insertRow();
   const number=E('th','',n);number.scope='row';row.append(number);
   const account=row.insertCell();
   account.append(E('span','cw-pill'+(active?' cw-open':''),active?'Créé':'Libre'));
   if(active)account.append(E('small','',new Date(student.activated_at).toLocaleDateString('fr-FR')));
   const pin=row.insertCell();
   pin.textContent=active?'••••••':'—';
   if(active)pin.setAttribute('aria-label','PIN personnel masqué');
   const group=row.insertCell();
   const actions=row.insertCell();
   if(!active){group.textContent=student?.demi_groupe||'—';continue}
   const select=E('select','cw-group-select');
   select.setAttribute('aria-label','Demi-groupe du n°'+n+' en '+cl.code);
   for(const [value,label] of [['0','Non renseigné'],['1','Groupe 1'],['2','Groupe 2']]){
    const option=E('option','',label);option.value=value;option.selected=Number(value)===(student.demi_groupe||0);select.append(option);
   }
   select.addEventListener('change',async()=>{
    select.disabled=true;
    try{
     await api('teacher_class_set_group',{class_id:cl.id,student_number:n,demi_groupe:Number(select.value)},null,true);
     notice('Demi-groupe mis à jour pour le n°'+n+' en '+cl.code+'.');
     await refresh();
    }catch(err){notice(err.message,true);select.value=String(student.demi_groupe||0)}
    finally{select.disabled=false}
   });
   group.append(select);
   const buttons=E('div','cw-pin-table-actions');
   buttons.append(button('Réinitialiser le PIN','cw-secondary',()=>confirmPinAction(false)),
    button('Libérer le numéro','cw-secondary',()=>confirmPinAction(true)));
   const prompt=E('div','cw-pin-confirm');prompt.hidden=true;
   const promptText=E('p');prompt.append(promptText);
   actions.append(buttons,prompt);
   function confirmPinAction(remove){
    buttons.hidden=true;
    prompt.hidden=false;
    promptText.textContent=remove?'Libérer le n°'+n+' ? Le PIN et le demi-groupe seront retirés. Les copies restent dans l’espace professeur.':
     'Réinitialiser le PIN du n°'+n+' ? L’élève devra en choisir un nouveau.';
    const confirm=button('Confirmer','cw-accent',async()=>{
     await api(remove?'teacher_class_remove_assignment':'teacher_class_reset_pin',{class_id:cl.id,student_number:n},null,true);
     if(!remove&&!(registrationOpen&&pinInvitations.has(cl.id))){
      try{
       const opened=await api('teacher_pin_enrollment',{class_id:cl.id,roster_size:size,enabled:true},null,true);
       pinInvitations.set(cl.id,{portal:opened.portal_code,token:opened.registration_token});
      }catch(err){
       await refresh();
       notice('PIN réinitialisé. Ouvre la création des PIN pour transmettre un lien à l’élève.',true);
       return;
      }
     }
     notice(remove?'Le n°'+n+' est libre en '+cl.code+'.':'Le n°'+n+' peut choisir un nouveau PIN avec le lien d’inscription de '+cl.code+'.');
     await refresh();
    });
    const cancel=button('Annuler','cw-secondary',()=>{prompt.hidden=true;buttons.hidden=false});
    prompt.replaceChildren(promptText,confirm,cancel);
    confirm.focus();
   }
  }
  scroll.append(table);details.append(scroll);card.append(details);
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
