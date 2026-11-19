/* CORTEX Académie — comptes élèves persistants par classe, gérés par le professeur. */
import {api} from './coursework.js?v=2.0';
const $=id=>document.getElementById(id);
const E=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const B=()=>window.CORTEX_ACADEMY_BRIDGE;
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
  head.append(title,E('span','cw-pill '+(registrationOpen?'cw-open':''),registrationOpen?'PIN ouverts · 30 min':record?'Connexion prête':'À préparer'));
  card.append(head);
  const controls=E('div','cw-publish-row'),selector=E('select','cw-roster-size');
  selector.setAttribute('aria-label','Effectif pour la classe '+cl.code);
  for(const n of [15,20,25,30,35,40,45,50,55,60]){
   const option=E('option','',n+' numéros');option.value=String(n);option.selected=n===(record?.roster_size||30);selector.append(option);
  }
  controls.append(E('label','','Effectif'),selector,button(registrationOpen?'↻ Prolonger de 30 min':'✦ Ouvrir la création des PIN · 30 min','cw-accent',async()=>{
   const response=await api('teacher_pin_enrollment',{class_id:cl.id,roster_size:Number(selector.value),enabled:true},null,true);
   const endTime=new Date(response.registration_open_until).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
   notice('Création des PIN ouverte pour '+cl.code+' jusqu’à '+endTime+'. Les élèves entrent leur numéro et choisissent eux-mêmes leur PIN. Surveille la première inscription en classe.');
   await refresh();
  }));
  if(registrationOpen){
   controls.append(button('Fermer maintenant','cw-secondary',async()=>{
    await api('teacher_pin_enrollment',{class_id:cl.id,roster_size:Number(selector.value),enabled:false},null,true);
    notice('Création des PIN fermée pour '+cl.code+'. Les élèves déjà inscrits peuvent toujours se connecter.');
    await refresh();
   }));
  }
  card.append(controls);
  const assigned=enrollments.filter(x=>x.class_id===cl.id&&!!x.activated_at);
  const group1=assigned.filter(x=>x.demi_groupe===1),group2=assigned.filter(x=>x.demi_groupe===2),
   whole=assigned.filter(x=>!x.demi_groupe);
  const stats=E('div','cw-group-stats');
  stats.append(E('span','cw-group-stat-label','Élèves inscrits : '+assigned.length),
   E('span','cw-group-stat-one','Groupe 1 · '+group1.length),
   E('span','cw-group-stat-two','Groupe 2 · '+group2.length));
  if(whole.length)stats.append(E('span','cw-group-stat-whole','Classe entière · '+whole.length));
  card.append(stats);
  if(assigned.length){
   const details=E('details','cw-group-roster'),summary=E('summary','','Voir les élèves inscrits par demi-groupe ('+assigned.length+')');
   const list=E('div','cw-group-roster-list');
   for(const row of assigned.sort((a,b)=>(a.demi_groupe||0)-(b.demi_groupe||0)||a.student_number-b.student_number)){
    const line=E('div','cw-group-roster-line'),name=E('strong','','Élève n°'+row.student_number),
     label=E('label','','Demi-groupe'),selector=E('select','cw-group-select');
    selector.setAttribute('aria-label','Demi-groupe de l’élève numéro '+row.student_number+' en '+cl.code);
    for(const [value,text] of [['1','Groupe 1'],['2','Groupe 2'],['0','Classe entière']]){
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
    'Clique sur « Ouvrir la création des PIN » : la classe est préparée automatiquement.'));
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
window.addEventListener('cortex:academy-logout',()=>{access=[];enrollments=[];$('cw-class-cards')?.replaceChildren()});
queueMicrotask(()=>{if(B()?.teacher?.())refresh()});
