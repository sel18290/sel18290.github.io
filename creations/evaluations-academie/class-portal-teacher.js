/* CORTEX Académie — comptes élèves persistants par classe, gérés par le professeur. */
import {api} from './coursework.js?v=1.8';
const $=id=>document.getElementById(id);
const E=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const B=()=>window.CORTEX_ACADEMY_BRIDGE;
const cache=new Map();
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
function downloadPins(pins,cl){
 const rows=['Numéro;PIN'].concat(pins.map(p=>p.number+';'+p.pin));
 const blob=new Blob(['\ufeff'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=E('a');
 link.href=url;link.download='CORTEX_CLASSE_'+String(cl).replace(/[^a-zA-Z0-9_-]/g,'_')+'_PIN.csv';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
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
  title.append(E('strong','',cl.code+' · '+cl.display_name),E('small','','Chaque élève reçoit un PIN provisoire une seule fois, puis choisit son PIN personnel pour tous les contrôles.'));
  head.append(title,E('span','cw-pill '+(record?'cw-open':''),record?'Accès préparé':'À préparer'));
  card.append(head);
  const controls=E('div','cw-publish-row'),selector=E('select','cw-roster-size');
  selector.setAttribute('aria-label','Effectif pour la classe '+cl.code);
  for(const n of [15,20,25,30,35,40,45,50,55,60]){
   const option=E('option','',n+' numéros');option.value=String(n);option.selected=n===(record?.roster_size||30);selector.append(option);
  }
  controls.append(E('label','','Effectif'),selector,button(record?'Compléter les numéros':'Créer les accès de cette classe','cw-accent',async()=>{
   const response=await api('teacher_class_prepare',{class_id:cl.id,roster_size:Number(selector.value)},null,true);
   if(response.freshPins?.length)cache.set(cl.id,response.freshPins);
   notice(response.freshPins?.length?'Accès créés. Téléchargez les PIN provisoires : chaque élève doit activer son espace avec ce code puis choisir son PIN personnel.':'Accès existants conservés : aucun PIN personnel n’a été modifié.');
   await refresh();
  }));
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
    'Aucune première inscription pour le moment : les élèves apparaîtront automatiquement ici dès leur activation.':
    'Créez les PIN provisoires ci-dessus pour que les élèves puissent s’inscrire.'));
  }
  if(record?.portal_code){
   const share=E('div','cw-class-share'),url=permanentUrl(record.portal_code);
   const line=E('p','cw-explainer','Accès permanent : choisir « '+cl.code+' », entrer son numéro sur la liste, puis son PIN personnel. Identification de cette classe : '+record.portal_code.slice(-4).toUpperCase()+'.');
   const field=E('input','cw-join-url');field.value=url;field.readOnly=true;field.setAttribute('aria-label','Lien permanent pour '+cl.code);
   const controls=E('div','cw-share-buttons');
   controls.append(button('Copier le lien de classe','cw-secondary',async()=>{
    try{await navigator.clipboard.writeText(url);notice('Lien permanent copié pour '+cl.code+'.')}
    catch{field.select();field.focus();notice('Lien sélectionné : copiez-le manuellement.')}
   }));
   const visit=E('a','cw-secondary','Tester le lien élève ↗');visit.href=url;visit.target='_blank';visit.rel='noopener';controls.append(visit);
   share.append(line,field,controls);
   const newPins=cache.get(cl.id);
   if(newPins?.length){
    const panel=E('div','cw-pin-notice'),grid=E('div','cw-pin-table');
    panel.append(E('strong','','PIN provisoires : à remettre individuellement aux élèves'));
    newPins.forEach(p=>grid.append(E('span','','Élève n°'+p.number+' · '+p.pin)));
    panel.append(grid,button('Télécharger les PIN (CSV)','cw-accent',()=>downloadPins(newPins,cl.code)));share.append(panel);
   }
   const reset=E('div','cw-reset-row'),number=E('input');
   number.type='number';number.min='1';number.max=String(record.roster_size);number.placeholder='N° élève';number.setAttribute('aria-label','Numéro de l’élève dont il faut renouveler le PIN');
   reset.append(number,button('Renouveler son PIN','cw-secondary',async()=>{
    const result=await api('teacher_class_reset_pin',{class_id:cl.id,student_number:Number(number.value)},null,true);
    const list=cache.get(cl.id)||[];cache.set(cl.id,list.filter(x=>x.number!==result.number).concat([result]).sort((a,b)=>a.number-b.number));
    notice('Nouveau PIN provisoire créé pour '+cl.code+', élève n°'+result.number+'. L’élève doit réactiver son accès ; les anciennes sessions sont désactivées.');
    render();
   }));share.append(reset);
   card.append(share);
  }
  target.append(card);
 }
}
window.addEventListener('cortex:academy-data-ready',refresh);
window.addEventListener('cortex:academy-class-updated',refresh);
window.addEventListener('cortex:class-pins',event=>{const id=event.detail?.classId,pins=event.detail?.pins||[];if(!id||!pins.length)return;const old=cache.get(id)||[];cache.set(id,old.filter(x=>!pins.some(p=>p.number===x.number)).concat(pins).sort((x,y)=>x.number-y.number));render()});
window.addEventListener('cortex:academy-logout',()=>{access=[];enrollments=[];cache.clear();$('cw-class-cards')?.replaceChildren()});
queueMicrotask(()=>{if(B()?.teacher?.())refresh()});
