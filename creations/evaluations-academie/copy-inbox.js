/* CORTEX Académie — classement réel : Classe → Contrôle → Copie.
 * Les réponses, formulaires et documents ne sont rendus que sur demande.
 * Les brouillons prof restent en mémoire lors des actualisations automatiques.
 */
import {openAlbertProgress} from './albert-progress-real.js?v=1.0';
const el=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
const view={
 classFilter:'',statusFilter:'all',query:'',
 openedClasses:new Set(),openedCopies:new Set(),
 localEdits:new Map(),aiDrafts:new Map(),context:null
};
const locale=(a,b)=>String(a||'').localeCompare(String(b||''),'fr',{numeric:true,sensitivity:'base'});
const kind=copy=>copy.released_at?'released':copy.grade!==null&&copy.grade!==undefined?'graded':'pending';
const statusText=copy=>kind(copy)==='released'?'Correction publiée':kind(copy)==='graded'?'Corrigée':'À corriger';
const dateText=s=>{
 const d=new Date(s||'');
 return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'Date indisponible';
};
const keyFor=copy=>copy.assessment_id+':'+copy.student_number;
const noteFor=copy=>Number.isFinite(Number(copy.grade))&&copy.grade!==null&&copy.grade!==undefined?
 Number(copy.grade).toLocaleString('fr-FR',{maximumFractionDigits:2})+' / 20':null;
function ensureLayout(root){
 let toolbar=root.querySelector('.cw-copy-toolbar'),groups=root.querySelector('.cw-copy-groups');
 if(toolbar&&groups)return {toolbar,groups};
 toolbar=el('div','cw-copy-toolbar');toolbar.setAttribute('role','search');toolbar.setAttribute('aria-label','Filtrer les copies reçues');
 function selectControl(id,label,options){
  const wrapper=el('label','cw-copy-control');
  wrapper.append(el('span','',label));
  const select=el('select');select.id=id;
  for(const [value,name] of options){const option=el('option','',name);option.value=value;select.append(option)}
  wrapper.append(select);toolbar.append(wrapper);return select;
 }
 const byClass=selectControl('cw-copy-by-class','Classe',[['','Toutes les classes']]);
 const byStatus=selectControl('cw-copy-by-status','Correction',[
  ['all','Tous les états'],['pending','À corriger'],['graded','Corrigées, non publiées'],['released','Publiées']]);
 const searchControl=el('label','cw-copy-control cw-copy-search');
 searchControl.append(el('span','','Rechercher un contrôle ou un élève'));
 const search=el('input');search.id='cw-copy-search';search.type='search';
 search.autocomplete='off';search.placeholder='Titre du contrôle, n° élève…';
 search.setAttribute('aria-label','Rechercher dans les copies reçues');
 searchControl.append(search);toolbar.append(searchControl);
 const summary=el('p','cw-copy-filter-summary');summary.setAttribute('role','status');
 const hint=el('p','cw-copy-filter-hint','Sélectionne une classe, puis ouvre la copie de l’élève que tu souhaites corriger.');
 groups=el('div','cw-copy-groups');root.replaceChildren(toolbar,summary,hint,groups);
 byClass.addEventListener('change',()=>{view.classFilter=byClass.value;rerender()});
 byStatus.addEventListener('change',()=>{view.statusFilter=byStatus.value;rerender()});
 search.addEventListener('input',()=>{view.query=search.value.trim();rerender()});
 return {toolbar,groups,summary};
}
function filteredData(exams,classes,copies){
 const examsById=new Map(exams.map(e=>[e.id,e]));
 const classesById=new Map(classes.map(c=>[c.id,c]));
 const groups=new Map();
 for(const copy of copies){
  const exam=examsById.get(copy.assessment_id);
  const id=exam?.class_id||'unassigned';
  const school=classesById.get(id);
  const groupName=school?.code||'Sans classe';
  const label=school?.display_name||'Contrôles sans classe';
  if(!groups.has(id))groups.set(id,{id,name:groupName,label,copies:[]});
  groups.get(id).copies.push({copy,exam});
 }
 const all=[...groups.values()].sort((a,b)=>
  a.id==='unassigned'?1:b.id==='unassigned'?-1:locale(a.name,b.name));
 const shown=[];
 for(const group of all){
  if(view.classFilter&&group.id!==view.classFilter)continue;
  const matches=group.copies.filter(({copy,exam})=>{
   if(view.statusFilter!=='all'&&kind(copy)!==view.statusFilter)return false;
   const query=view.query.toLocaleLowerCase('fr');
   if(!query)return true;
   const haystack=[group.name,group.label,exam?.title||'Contrôle non retrouvé',
    String(copy.student_number),'élève '+copy.student_number,
    'n°'+copy.student_number].join(' ').toLocaleLowerCase('fr');
   return haystack.includes(query);
  });
  if(matches.length)shown.push({...group,copies:matches});
 }
 return {all,shown};
}
function counter(items){
 const pending=items.filter(({copy})=>kind(copy)==='pending').length;
 const graded=items.filter(({copy})=>kind(copy)==='graded').length;
 const published=items.filter(({copy})=>kind(copy)==='released').length;
 return {pending,graded,published};
}
function renderAiDetail(form,copy,ai,teacherNote){
 form.querySelector('.cw-ai-draft-notice')?.remove();
 form.querySelector('.cw-ai-detail')?.remove();
 if(!ai)return;
 const notice=el('div','cw-ai-draft-notice',
  '✦ Proposition d’Albert · Note provisoire '+Number(ai.grade).toLocaleString('fr-FR')+' / 20. Vérifie chaque question avant de valider.');
 const details=el('details','cw-ai-detail');
 details.append(el('summary','','Voir les '+(ai.questions?.length||0)+' questions corrigées par Albert'));
 for(const question of ai.questions||[]){
  const line=el('section','cw-ai-question');
  line.append(el('strong','','Question '+(question.numero||question.id)+' · '+question.points+' / '+question.max+' pt'));
  if(question.attendu)line.append(el('p','','Réponse attendue : '+question.attendu));
  line.append(el('p','','Commentaire : '+(question.commentaire||'À vérifier.')));
  if(question.conseil)line.append(el('p','','Conseil : '+question.conseil));
  if(question.document)line.append(el('small','','Document exploité : '+question.document));
  details.append(line);
 }
 form.prepend(notice,details);
}
function createGradeForm({copy,exam,callbacks}){
 const {api,requestAiDraft,formatDraftFeedback,message,reload}=callbacks;
 const recordKey=keyFor(copy),saved=view.localEdits.get(recordKey),draft=view.aiDrafts.get(recordKey);
 const form=el('form','cw-grade-form');
 const gradeLabel=el('label','cw-grade-field');
 gradeLabel.append(el('strong','','Note proposée ou officielle (sur 20)'));
 const grade=el('input');grade.type='number';grade.min='0';grade.max='20';
 grade.step='0.01';grade.inputMode='decimal';grade.required=true;
 grade.value=saved?.grade??(copy.grade??'');
 grade.setAttribute('aria-label','Note sur 20');
 gradeLabel.append(grade);
 const feedbackLabel=el('label','cw-grade-field');
 feedbackLabel.append(el('strong','','Appréciation / correction'));
 const feedback=el('textarea');feedback.rows=4;feedback.maxLength=4000;
 feedback.placeholder='Conseils et correction vérifiés par le professeur';
 feedback.value=saved?.feedback??(copy.feedback||'');
 feedbackLabel.append(feedback);
 const releaseLabel=el('label','cw-release-label'),release=el('input');
 release.type='checkbox';release.checked=saved?.release??!!copy.released_at;
 releaseLabel.append(release,el('span','','Publier la note et la correction pour l’élève'));
 const saveDraft=()=>view.localEdits.set(recordKey,{
  grade:grade.value,feedback:feedback.value,release:release.checked
 });
 for(const element of [grade,feedback,release]){
  element.addEventListener('change',saveDraft);
  element.addEventListener('input',saveDraft);
 }
 const ai=el('button','cw-ai-button','✦ Corriger avec Albert IA');ai.type='button';
 ai.addEventListener('click',async()=>{
  if(ai.disabled)return;
  if(!window.confirm('Albert va analyser cette copie réelle et ses documents pour préparer un brouillon. Aucune note ne sera enregistrée ni publiée sans ta validation. Continuer ?'))return;
  const progress=openAlbertProgress({
   title:'Correction de la copie avec Albert',
   description:(exam?.title||'Contrôle')+' · Élève n°'+copy.student_number+
    ' · Albert analyse les réponses et les documents pour proposer un brouillon.',
   initial:'Connexion à Albert et analyse des questions en cours…'
  });
  ai.disabled=true;
  try{
   const result=await requestAiDraft(copy.assessment_id,copy.student_number,{signal:progress.signal});
   if(progress.cancelled)return;
   if(!Number.isFinite(Number(result.grade))||!Array.isArray(result.questions))
    throw Error('Albert a renvoyé une correction incomplète.');
   grade.value=String(result.grade);
   feedback.value=formatDraftFeedback(result);
   release.checked=false;
   view.aiDrafts.set(recordKey,result);
   saveDraft();
   renderAiDetail(form,copy,result);
   progress.success(
    result.questions.length+' questions analysées. La correction est prête à vérifier.',
    'Voir le brouillon de correction'
   );
   message('Brouillon Albert chargé pour l’élève n°'+copy.student_number+
    '. Vérifie et enregistre manuellement la note.');
  }catch(error){
   if(progress.cancelled)return;
   progress.failure(error?.message||'Albert n’a pas pu corriger la copie.','Fermer et réessayer');
  }finally{ai.disabled=false}
 });
 form.append(ai,gradeLabel,feedbackLabel,releaseLabel);
 const submit=el('button','cw-accent','Enregistrer ma correction');
 submit.type='submit';form.append(submit);
 if(draft)renderAiDetail(form,copy,draft);
 form.addEventListener('submit',async ev=>{
  ev.preventDefault();
  if(submit.disabled||!form.reportValidity())return;
  submit.disabled=true;submit.textContent='Enregistrement sécurisé…';
  try{
   await api('teacher_grade',{
    assessment_id:copy.assessment_id,student_number:copy.student_number,
    grade:Number(grade.value),feedback:feedback.value,release:release.checked
   },null,true);
   view.localEdits.delete(recordKey);
   view.aiDrafts.delete(recordKey);
   message('Correction de l’élève n°'+copy.student_number+
    (release.checked?' enregistrée et publiée.':' enregistrée sans publication.'));
   submit.blur();
   await reload();
  }catch(error){message(error?.message||'La correction n’a pas été enregistrée.',true)}
  finally{submit.disabled=false;submit.textContent='Enregistrer ma correction'}
 });
 return form;
}
function renderCopyBody(panel,{copy,exam,callbacks}){
 if(panel.dataset.loaded==='true')return;
 panel.dataset.loaded='true';
 const body=el('div','cw-copy-body');
 const questions=new Map((exam?.content?.questions||[]).map(q=>[q.id,q]));
 const entries=Object.entries(copy.answers||{});
 const answers=el('details','cw-copy-answers');
 answers.append(el('summary','','Consulter les réponses enregistrées ('+entries.length+' question(s))'));
 const rows=el('div','cw-copy-answers-list');
 let filled=false;
 const populate=()=>{
  if(filled)return;
  filled=true;
  if(!entries.length){rows.append(el('p','empty','Aucune réponse textuelle enregistrée.'));return}
  for(const [qid,answer] of entries){
   const question=questions.get(qid);
   const section=el('section','cw-answer');
   const summary=question&&window.CORTEX_QUESTION_TYPES?.summary?
    window.CORTEX_QUESTION_TYPES.summary(question,answer):String(answer??'');
   section.append(el('strong','',question?.prompt||qid),el('p','',summary));
   rows.append(section);
  }
 };
 answers.addEventListener('toggle',()=>{if(answers.open)populate()});
 answers.append(rows);body.append(answers);
 if(copy.file_name){
  const attach=el('button','cw-secondary','📎 Ouvrir la copie jointe · '+copy.file_name);
  attach.type='button';
  attach.addEventListener('click',async()=>{
   attach.disabled=true;
   try{await callbacks.openFile(copy.assessment_id,'submission',copy.student_number)}
   catch(error){callbacks.message(error?.message||'Document indisponible.',true)}
   finally{attach.disabled=false}
  });
  body.append(attach);
 }
 body.append(createGradeForm({copy,exam,callbacks}));
 panel.append(body);
}
function renderClass(group,ctx){
 const {inbox,callbacks}=ctx;
 const details=el('details','cw-copy-class');
 details.dataset.classId=group.id;
 details.open=view.openedClasses.has(group.id);
 const count=counter(group.copies);
 const heading=el('summary','cw-copy-class-summary');
 const title=el('span','cw-copy-class-label');
 title.append(el('strong','',group.name),el('small','',group.label));
 const badges=el('span','cw-copy-class-counts');
 badges.append(el('span','cw-copy-quantity',group.copies.length+' copie'+(group.copies.length>1?'s':'')));
 if(count.pending)badges.append(el('span','cw-copy-pending-count',count.pending+' à corriger'));
 heading.append(title,badges);details.append(heading);
 const inner=el('div','cw-copy-class-body');
 const byExam=new Map();
 for(const {copy,exam} of group.copies){
  const id=copy.assessment_id;
  if(!byExam.has(id))byExam.set(id,{exam,items:[]});
  byExam.get(id).items.push(copy);
 }
 for(const {exam,items} of [...byExam.values()].sort((a,b)=>locale(a.exam?.title,b.exam?.title))){
  const section=el('section','cw-copy-exam-group');
  const top=el('div','cw-copy-exam-title');
  top.append(el('strong','',exam?.title||'Contrôle non retrouvé'),
   el('small','',items.length+' copie'+(items.length>1?'s':'')+' reçue'+(items.length>1?'s':'')));
  section.append(top);
  const sorted=items.slice().sort((a,b)=>Number(a.student_number)-Number(b.student_number));
  for(const copy of sorted){
   const recordKey=keyFor(copy),panel=el('details','cw-copy cw-copy-compact');
   panel.dataset.copyKey=recordKey;
   const summary=el('summary','cw-copy-summary');
   const student=el('span','cw-copy-student');
   student.append(el('strong','','Élève n°'+copy.student_number),
    el('small','','Remise le '+dateText(copy.submitted_at)));
   const side=el('span','cw-copy-summary-side');
   const status=kind(copy);
   side.append(el('span','cw-copy-state '+status,statusText(copy)));
   const note=noteFor(copy);
   if(note)side.append(el('span','cw-copy-note',note));
   summary.append(student,side);panel.append(summary);
   panel.open=view.openedCopies.has(recordKey);
   panel.addEventListener('toggle',()=>{
    if(panel.open){
     view.openedCopies.add(recordKey);
     renderCopyBody(panel,{copy,exam,callbacks});
    }else view.openedCopies.delete(recordKey);
   });
   if(panel.open)renderCopyBody(panel,{copy,exam,callbacks});
   section.append(panel);
  }
  inner.append(section);
 }
 details.append(inner);
 details.addEventListener('toggle',()=>{
  if(details.open)view.openedClasses.add(group.id);
  else view.openedClasses.delete(group.id);
 });
 return details;
}
function rerender(){
 if(view.context)renderCopyInbox(view.context);
}
export function renderCopyInbox(context){
 const {inbox,copies,exams,classes,callbacks}=context;
 if(!inbox)return;
 view.context=context;
 // Un rafraîchissement automatique ne doit jamais détruire un champ en
 // cours de saisie sur iPhone (perte du clavier, du focus et du scroll).
 const focused=document.activeElement;
 if(focused?.closest?.('#cw-copy-list .cw-grade-form')&&
    /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName))return;
 const {toolbar,groups,summary}=ensureLayout(inbox);
 const {all,shown}=filteredData(exams,classes,copies);
 const byClass=toolbar.querySelector('#cw-copy-by-class');
 const oldList=[...byClass.options].map(x=>x.value+'|'+x.textContent).join(';');
 const newList=[['','Toutes les classes'],...all.map(g=>[g.id,g.name+' · '+g.copies.length+' copie(s)'])];
 if(oldList!==newList.map(x=>x.join('|')).join(';')){
  byClass.replaceChildren();
  for(const [value,label] of newList){const option=el('option','',label);option.value=value;byClass.append(option)}
 }
 if(view.classFilter&&!all.some(g=>g.id===view.classFilter))view.classFilter='';
 byClass.value=view.classFilter;
 toolbar.querySelector('#cw-copy-by-status').value=view.statusFilter;
 const input=toolbar.querySelector('#cw-copy-search');
 if(input.value!==view.query)input.value=view.query;
 const total=copies.length,visible=shown.reduce((n,g)=>n+g.copies.length,0);
 const overall=document.getElementById('cw-copy-count');
 if(overall)overall.textContent=total+' copie'+(total>1?'s':'');
 summary.textContent=visible+' copie'+(visible>1?'s':'')+' affichée'+(visible>1?'s':'')+
  ' · '+shown.length+' classe'+(shown.length>1?'s':'')+' · sélectionne une classe pour ouvrir les corrections.';
 groups.replaceChildren();
 if(!total){groups.append(el('p','empty','Aucune copie reçue pour le moment.'));return}
 if(!shown.length){groups.append(el('p','empty','Aucune copie ne correspond aux filtres choisis.'));return}
 for(const group of shown)groups.append(renderClass(group,{inbox,callbacks}));
}
export function clearCopyInbox(){
 view.classFilter='';view.statusFilter='all';view.query='';
 view.openedClasses.clear();view.openedCopies.clear();
 view.localEdits.clear();view.aiDrafts.clear();view.context=null;
}
