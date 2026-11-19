/* CORTEX Académie — copies réelles, classement par classe > contrôle > élève.
 * Aucune donnée élève du serveur n'est copiée dans le stockage navigateur.
 * Une copie détaillée n'est construite qu'à son ouverture.
 */
const el=(tag,className,text)=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
const sortFR=new Intl.Collator('fr',{numeric:true,sensitivity:'base'});
export const copyEntryKey=copy=>String(copy.assessment_id)+':'+String(copy.student_number);

function statusOf(copy){
 if(copy.released_at)return {text:'Publiée',cls:'is-published'};
 if(copy.graded_at||copy.grade!==null&&copy.grade!==undefined)return {text:'Corrigée',cls:'is-graded'};
 return {text:'À corriger',cls:'is-pending'};
}
function countLabel(count){return count+' copie'+(count>1?'s':'')}
function summaryStats(copies){
 const pending=copies.filter(c=>statusOf(c).cls==='is-pending').length;
 const corrected=copies.length-pending;
 return {pending,corrected,description:countLabel(copies.length)+(pending?' · '+pending+' à corriger':' · toutes corrigées')};
}
function classNameFor(id,classes){
 const found=classes.find(c=>c.id===id);
 return id?(found?.code||found?.display_name||'Classe non retrouvée'):'Sans classe';
}
function describeControl(exam){
 const scope=exam?.content?.publish_scope;
 return scope==='g1'?' · Groupe 1':scope==='g2'?' · Groupe 2':'';
}
function groupCopies(copies,exams,classes){
 const indexed=new Map(exams.map(e=>[e.id,e])),groups=new Map();
 for(const copy of copies){
  const exam=indexed.get(copy.assessment_id);
  const classId=exam?.class_id||null;
  const key=classId||'unassigned';
  if(!groups.has(key))groups.set(key,{key,name:classNameFor(classId,classes),controls:new Map(),copies:[]});
  const group=groups.get(key),examId=copy.assessment_id;
  if(!group.controls.has(examId))group.controls.set(examId,{id:examId,exam,copies:[]});
  group.controls.get(examId).copies.push(copy);
  group.copies.push(copy);
 }
 return [...groups.values()].sort((a,b)=>{
  if(a.key==='unassigned')return 1;
  if(b.key==='unassigned')return -1;
  return sortFR.compare(a.name,b.name);
 }).map(group=>({
  ...group,controls:[...group.controls.values()].sort((a,b)=>
   sortFR.compare(a.exam?.title||'Contrôle introuvable',b.exam?.title||'Contrôle introuvable'))
 }));
}
function createSummary(title,description,tag,stats){
 const line=el('summary','cw-group-summary');
 const text=el('span','cw-group-summary-main'),name=el('strong','',title),sub=el('small','',description);
 text.append(name,sub);
 const trailing=el('span','cw-group-summary-side');
 if(stats?.pending)trailing.append(el('span','cw-group-pending',stats.pending+' à corriger'));
 trailing.append(el('span','cw-group-chevron','▾'));
 line.append(text,trailing);
 if(tag)line.dataset.kind=tag;
 return line;
}
export function renderCopyOrganizer({target,copies,exams,classes,renderCopy,openClasses,openControls,openCopies,defaultExpand=false}){
 const groups=groupCopies(copies,exams,classes);
 const count=copies.length;
 const heading=el('div','cw-copy-organizer-heading');
 heading.append(el('strong','',groups.length+' classe'+(groups.length>1?'s':'')+' · '+countLabel(count)),
  el('small','','Ouvre une classe, puis un contrôle et enfin la copie de l’élève.'));
 target.append(heading);
 if(!groups.length){
  target.append(el('p','empty','Aucune copie remise pour le moment.'));
  return;
 }
 // Une classe unique peut être dépliée immédiatement ; chaque copie demeure
 // fermée par défaut pour ne pas afficher des dizaines de questions sur mobile.
 for(const group of groups){
  const cStats=summaryStats(group.copies),classPanel=el('details','cw-copy-class');
  classPanel.dataset.classKey=group.key;
  classPanel.open=openClasses.has(group.key)||(defaultExpand&&groups.length===1);
  classPanel.append(createSummary(group.name,cStats.description,'class',cStats));
  const controlList=el('div','cw-copy-control-list');
  for(const control of group.controls){
   const eStats=summaryStats(control.copies),controlPanel=el('details','cw-copy-control');
   controlPanel.dataset.assessmentId=control.id;
   controlPanel.open=openControls.has(control.id)||(defaultExpand&&groups.length===1&&group.controls.length===1);
   const label=control.exam?.title||'Contrôle indisponible';
   const controlSummary=createSummary(label,eStats.description+describeControl(control.exam),'control',eStats);
   controlPanel.append(controlSummary);
   const entries=el('div','cw-copy-entry-list');
   const sorted=control.copies.slice().sort((a,b)=>Number(a.student_number)-Number(b.student_number));
   for(const copy of sorted){
    const key=copyEntryKey(copy),status=statusOf(copy),panel=el('details','cw-copy-entry');
    panel.dataset.copyKey=key;
    panel.open=openCopies.has(key);
    const summary=el('summary','cw-copy-entry-summary');
    const primary=el('span','cw-copy-entry-name');
    primary.append(el('strong','','Élève n°'+copy.student_number),
     el('small','',copy.submitted_at?'Reçue le '+new Date(copy.submitted_at).toLocaleString('fr-FR'):'Copie reçue'));
    summary.append(primary,el('span','cw-copy-entry-state '+status.cls,status.text),el('span','cw-group-chevron','▾'));
    panel.append(summary);
    let loaded=false;
    const load=()=>{
     if(loaded||!panel.open)return;
     const card=renderCopy(copy,control.exam);
     if(card){panel.append(card);loaded=true;}
    };
    if(panel.open)load();
    panel.addEventListener('toggle',()=>{
     if(panel.open){openCopies.add(key);load();}
     else openCopies.delete(key);
    });
    entries.append(panel);
   }
   controlPanel.append(entries);
   controlPanel.addEventListener('toggle',()=>{
    if(controlPanel.open)openControls.add(control.id);
    else openControls.delete(control.id);
   });
   controlList.append(controlPanel);
  }
  classPanel.append(controlList);
  classPanel.addEventListener('toggle',()=>{
   if(classPanel.open)openClasses.add(group.key);
   else openClasses.delete(group.key);
  });
  target.append(classPanel);
 }
}
