/* CORTEX Académie — comptes élèves persistants par classe, gérés par le professeur. */
import {api} from './coursework.js?v=1.2';
const $=id=>document.getElementById(id);
const E=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const B=()=>window.CORTEX_ACADEMY_BRIDGE;
const cache=new Map();
let access=[],busy=false,pending=false;
function notice(msg,error=false){const e=$('cw-class-status');if(!e)return;e.hidden=!msg;e.textContent=msg;e.classList.toggle('error',error)}
function permanentUrl(code){return location.origin+location.pathname+'?classe='+encodeURIComponent(code)}
async function refresh(){if(!B()?.teacher?.())return;if(busy){pending=true;return}busy=true;try{const result=await api('teacher_list',{},null,true);access=result.classAccess||[];render()}catch(err){notice(err.message||'Impossible de charger les classes.',true)}finally{busy=false;if(pending){pending=false;queueMicrotask(refresh)}}}
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
  title.append(E('strong','',cl.code+' · '+cl.display_name),E('small','','Numéros et PIN valables pour tous les contrôles de cette classe.'));
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
   notice(response.freshPins?.length?'Accès créés. Téléchargez les nouveaux PIN maintenant.':'PIN déjà préparés : aucun code existant n’a été modifié.');
   await refresh();
  }));
  card.append(controls);
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
    panel.append(E('strong','','Nouveaux PIN : conservez cette liste'));
    newPins.forEach(p=>grid.append(E('span','','Élève n°'+p.number+' · '+p.pin)));
    panel.append(grid,button('Télécharger les PIN (CSV)','cw-accent',()=>downloadPins(newPins,cl.code)));share.append(panel);
   }
   const reset=E('div','cw-reset-row'),number=E('input');
   number.type='number';number.min='1';number.max=String(record.roster_size);number.placeholder='N° élève';number.setAttribute('aria-label','Numéro de l’élève dont il faut renouveler le PIN');
   reset.append(number,button('Renouveler son PIN','cw-secondary',async()=>{
    const result=await api('teacher_class_reset_pin',{class_id:cl.id,student_number:Number(number.value)},null,true);
    const list=cache.get(cl.id)||[];cache.set(cl.id,list.filter(x=>x.number!==result.number).concat([result]).sort((a,b)=>a.number-b.number));
    notice('Nouveau PIN créé pour '+cl.code+', élève n°'+result.number+'. Les anciennes sessions sont désactivées.');
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
window.addEventListener('cortex:academy-logout',()=>{access=[];cache.clear();$('cw-class-cards')?.replaceChildren()});
queueMicrotask(()=>{if(B()?.teacher?.())refresh()});
