/* CORTEX Académie — tableau de bord exactement dans la navigation de la démo,
   rempli UNIQUEMENT avec les tables Supabase du compte connecté. */
const $=id=>document.getElementById(id);
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n};
const bridge=()=>window.CORTEX_ACADEMY_BRIDGE;
const state={access:[],copies:[],classAccess:[],gotSnapshot:false};
const viewLink=(view,label,cls='btn ghost small')=>{
 const a=el('a',cls,label);a.href='#'+({overview:'prof-overview',classes:'prof-classes',pins:'cw-persistent-classes',assessments:'prof-assessments',creer:'exam-form',import:'acad-import-workspace',copies:'cw-copies-head',suivi:'acad-live-monitoring',analyses:'acad-live-analytics',integrity:'acad-integrity'}[view]||'prof-overview');a.dataset.acadView=view;return a;
};
function updateText(id,value){if($(id))$(id).textContent=String(value)}
function getClassName(id){return bridge()?.classes?.()?.find(c=>c.id===id)?.code||'Classe non renseignée'}
function formatScore(value){return Number(value).toFixed(1).replace('.',',')}
function teacherExamList(){return bridge()?.exams?.()||[]}
function renderTeacherDashboard(){
 if(!bridge()?.teacher?.())return;
 const exams=teacherExamList(),classes=bridge()?.classes?.()||[];
 const root=$('acad-live-class-strip');
 if(root){
  root.replaceChildren(viewLink('classes','▣ Mes classes','btn secondary small'));
  for(const cl of classes.filter(c=>!c.archived).sort((a,b)=>String(a.code).localeCompare(String(b.code),'fr'))){
   const link=viewLink('classes',cl.code);link.title='Voir la classe '+cl.display_name;root.append(link);
  }
  if(!classes.length)root.append(el('span','chip','Aucune classe · Ajouter ma première classe'));
 }
 updateText('acad-overview-classes',classes.filter(c=>!c.archived).length);
 updateText('acad-overview-exams',exams.length);
 const recent=$('acad-live-recent-exams');
 if(recent){
  recent.replaceChildren();
  if(!exams.length)recent.append(el('div','empty','Aucun contrôle. Utilise « ＋ Nouveau contrôle » pour commencer.'));
  for(const exam of exams.slice(0,5)){
   const card=el('div','list-row'),icon=viewLink('assessments','▤','item-icon'),content=el('div','grow'),title=el('div','item-title',exam.title),details=el('div','item-meta',getClassName(exam.class_id)+' · '+(exam.content?.questions||[]).length+' questions');
   content.append(title,details);
   const access=state.access.find(a=>a.assessment_id===exam.id);
   const live=!!(access?.active&&exam.published);
   card.append(icon,content,el('span','live-status'+(live?'':' draft'),live?'Publié':'Brouillon'));
   card.append(viewLink('assessments','Ouvrir →','btn ghost small'));
   recent.append(card);
  }
 }
 renderLiveMetrics();
}
function renderLiveMetrics(){
 if(!bridge()?.teacher?.())return;
 const exams=teacherExamList();
 const copies=state.copies;
 const corrected=copies.filter(c=>c.grade!==null&&c.grade!==undefined&&Number.isFinite(Number(c.grade))&&Number(c.grade)>=0&&Number(c.grade)<=20);
 const pending=copies.filter(c=>c.grade===null||c.grade===undefined);
 const opened=state.access.filter(a=>a.active&&exams.some(e=>e.id===a.assessment_id&&e.published));
 updateText('acad-overview-copies',state.gotSnapshot?copies.length:'—');
 updateText('acad-overview-graded',state.gotSnapshot?corrected.length:'—');
 updateText('acad-overview-pins',state.gotSnapshot?state.classAccess.length:'—');
 updateText('acad-monitor-open',state.gotSnapshot?opened.length:'—');
 updateText('acad-monitor-submitted',state.gotSnapshot?copies.length:'—');
 updateText('acad-monitor-pending',state.gotSnapshot?pending.length:'—');
 updateText('acad-analysis-corrected',state.gotSnapshot?corrected.length:'—');
 updateText('acad-analysis-average',state.gotSnapshot?(corrected.length?formatScore(corrected.reduce((n,c)=>n+Number(c.grade),0)/corrected.length):'—'):'—');
 updateText('acad-analysis-rate',state.gotSnapshot?(copies.length?Math.round(100*corrected.length/copies.length)+' %':'—'):'—');
 const mon=$('acad-live-monitor-rows'),analysis=$('acad-live-analysis-rows');
 if(mon){
  mon.replaceChildren();
  if(!state.gotSnapshot)mon.append(el('div','empty','Chargement des données réelles…'));
  else if(!exams.length)mon.append(el('div','empty','Aucun contrôle publié pour le moment.'));
  for(const exam of state.gotSnapshot?exams:[]){
   const a=state.access.find(x=>x.assessment_id===exam.id),sub=copies.filter(c=>c.assessment_id===exam.id);
   const card=el('div','list-row'),ico=el('span','item-icon','◷'),content=el('div','grow');
   content.append(el('div','item-title',exam.title),el('div','item-meta',getClassName(exam.class_id)+' · '+sub.length+' copie(s) · '+sub.filter(c=>c.grade!=null).length+' corrigée(s)'));
   card.append(ico,content,el('span','live-status'+(a?.active&&exam.published?'':' draft'),a?.active&&exam.published?'Ouvert':'Fermé'));
   mon.append(card);
  }
 }
 if(analysis){
  analysis.replaceChildren();
  if(!state.gotSnapshot)analysis.append(el('div','empty','Chargement des notes…'));
  else if(!corrected.length)analysis.append(el('div','empty','Aucune note validée. Les analyses apparaîtront à réception des copies corrigées.'));
  for(const exam of state.gotSnapshot?exams:[]){
   const related=corrected.filter(c=>c.assessment_id===exam.id);
   if(!related.length)continue;
   const score=related.reduce((total,copy)=>total+Number(copy.grade),0)/related.length;
   const line=el('div','list-row'),content=el('div','grow');
   content.append(el('div','item-title',exam.title),el('div','item-meta',getClassName(exam.class_id)+' · '+related.length+' copie(s) notée(s)'));
   line.append(el('span','item-icon','▥'),content,el('span','live-status',formatScore(score)+' /20'));
   analysis.append(line);
  }
 }
}
window.addEventListener('cortex:academy-data-ready',renderTeacherDashboard);
window.addEventListener('cortex:academy-live-snapshot',event=>{
 const detail=event.detail||{};
 state.access=Array.isArray(detail.access)?detail.access:[];
 state.copies=Array.isArray(detail.copies)?detail.copies:[];
 state.classAccess=Array.isArray(detail.classAccess)?detail.classAccess:[];
 state.gotSnapshot=true;
 renderTeacherDashboard();
});
window.addEventListener('cortex:academy-logout',()=>{
 state.access=[];state.copies=[];state.classAccess=[];state.gotSnapshot=false;
 $('acad-live-recent-exams')?.replaceChildren();
 $('acad-live-class-strip')?.replaceChildren();
});
$('acad-live-monitor-refresh')?.addEventListener('click',()=>{
 $('cw-refresh')?.click();
 bridge()?.refresh?.();
});
queueMicrotask(()=>{if(bridge()?.teacher?.())renderTeacherDashboard()});
