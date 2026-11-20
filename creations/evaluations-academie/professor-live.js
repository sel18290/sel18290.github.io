/* CORTEX Académie — tableau de bord exactement dans la navigation de la démo,
   rempli UNIQUEMENT avec les tables Supabase du compte connecté. */
import {api} from './coursework.js?v=2.14-handwriting';

const $=id=>document.getElementById(id);
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n};
const bridge=()=>window.CORTEX_ACADEMY_BRIDGE;
const state={access:[],copies:[],classAccess:[],gotSnapshot:false};
const live=window.CORTEX_EXAM_LIVE.createPanel();
const journal=window.CORTEX_EXAM_MONITOR.mount($('acad-live-journal'),{
 perExam:true,live,onExamChange:changeJournalExam,onViewChange:refreshMonitoring
});
let journalScope={examId:'',rows:new Map(),checkpoint:null,request:null};
const viewLink=(view,label,cls='btn ghost small')=>{
 const a=el('a',cls,label);a.href='#'+({overview:'prof-overview',classes:'prof-classes',pins:'cw-persistent-classes',assessments:'prof-assessments',creer:'exam-form',import:'acad-import-workspace',copies:'cw-copies-head',suivi:'acad-live-monitoring',analyses:'acad-live-analytics',integrity:'acad-integrity'}[view]||'prof-overview');a.dataset.acadView=view;return a;
};
function updateText(id,value){if($(id))$(id).textContent=String(value)}
function getClassName(id){return bridge()?.classes?.()?.find(c=>c.id===id)?.code||'Classe non renseignée'}
function formatScore(value){return Number(value).toFixed(1).replace('.',',')}
function teacherExamList(){return bridge()?.exams?.()||[]}
function changeJournalExam(examId){
 $('acad-monitor-settings').dataset.integrityExam=examId;
 journalScope={examId,rows:new Map(),checkpoint:null,request:null};
 refreshMonitoring();
}
function tracksLive(exam){return exam?.content?.antiCheat?.enabled===true&&exam.content.antiCheat.trackLive===true}
function syncJournalExams(){
 const exams=teacherExamList().filter(exam=>exam.published);
 const open=new Set(state.access.filter(access=>access.active).map(access=>access.assessment_id));
 const preferred=journal.examId()||exams.find(exam=>open.has(exam.id))?.id;
 journal.setExams(exams.map(exam=>({
  id:exam.id,title:exam.title,classId:exam.class_id,className:getClassName(exam.class_id),
  tracksExits:exam.content?.antiCheat?.enabled===true&&exam.content.antiCheat.trackVisibility===true,
  tracksLive:tracksLive(exam)
 })),preferred);
}
function refreshMonitoring(){
 if(journal.isLive())return refreshPresence();
 return refreshJournal();
}
function refreshPresence(){
 const scope=journalScope,teacher=bridge()?.teacher?.();
 if(!teacher||!scope.examId||document.hidden||document.body.dataset.acadView!=='suivi')return;
 if(!tracksLive(teacherExamList().find(exam=>exam.id===scope.examId)))return;
 if(scope.presenceRequest)return scope.presenceRequest;
 const stillCurrent=()=>scope===journalScope&&teacher===bridge()?.teacher?.();
 scope.presenceRequest=api('teacher_monitor',{assessment_id:scope.examId},null,true).then(snapshot=>{
  if(stillCurrent())live.setSnapshot(snapshot);
 }).catch(()=>{
  if(stillCurrent())live.setError();
 }).finally(()=>{scope.presenceRequest=null;});
 return scope.presenceRequest;
}
function refreshJournal(){
 const scope=journalScope,teacher=bridge()?.teacher?.(),client=bridge()?.client?.();
 if(!teacher||!client||!scope.examId||document.hidden||document.body.dataset.acadView!=='suivi')return;
 if(scope.request)return scope.request;
 const stillCurrent=()=>scope===journalScope&&teacher===bridge()?.teacher?.();
 scope.request=(async()=>{
  const combined=new Map(scope.rows);
  let checkpoint=scope.checkpoint;
  const pageSize=250;
  // Reprendre aussi les insertions proches du dernier relevé qui ont pu être validées en décalé.
  const since=checkpoint?new Date(Date.parse(checkpoint)-30000).toISOString():null;
  try{
   for(let offset=0;;offset+=pageSize){
    let query=client.from('cortex_integrity_events')
     .select('id,class_id,roster_number,kind,occurred_at,inserted_at,duration_ms')
     .eq('teacher_id',teacher).eq('assessment_id',scope.examId)
     .order('inserted_at').order('id').range(offset,offset+pageSize-1);
    if(since)query=query.gte('inserted_at',since);
    const {data,error}=await query;
    if(!stillCurrent())return;
    if(error)throw error;
    for(const row of data||[]){
     combined.set(row.id,row);
     if(!checkpoint||Date.parse(row.inserted_at)>Date.parse(checkpoint))checkpoint=row.inserted_at;
    }
    if(!data||data.length<pageSize)break;
   }
   scope.rows=combined;scope.checkpoint=checkpoint;
   const exam=teacherExamList().find(item=>item.id===scope.examId);
   journal.setEvents([...combined.values()].map(row=>({
    examId:scope.examId,classId:exam?.class_id,className:getClassName(row.class_id||exam?.class_id),
    studentNumber:row.roster_number,kind:row.kind,at:Date.parse(row.occurred_at),durationMs:row.duration_ms
   })),Date.now());
  }catch{
   if(stillCurrent())journal.setError();
  }finally{scope.request=null;}
 })();
 return scope.request;
}
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
 syncJournalExams();
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
  else if(!exams.some(exam=>exam.published))mon.append(el('div','empty','Aucun contrôle publié pour le moment.'));
  for(const exam of state.gotSnapshot?exams.filter(item=>item.published):[]){
   const a=state.access.find(x=>x.assessment_id===exam.id),sub=copies.filter(c=>c.assessment_id===exam.id);
   const card=el('div','list-row'),ico=el('span','item-icon','◷'),content=el('div','grow');
   content.append(el('div','item-title',exam.title),el('div','item-meta',getClassName(exam.class_id)+' · '+sub.length+' copie(s) · '+sub.filter(c=>c.grade!=null).length+' corrigée(s)'));
   const link=viewLink('suivi','Voir le journal');
   link.dataset.journalExam=exam.id;
   card.append(ico,content,el('span','live-status'+(a?.active?'':' draft'),a?.active?'Ouvert':'Fermé'),link);
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
 journal.reset();
 live.reset();
 journalScope={examId:'',rows:new Map(),checkpoint:null,request:null};
 $('acad-live-recent-exams')?.replaceChildren();
 $('acad-live-class-strip')?.replaceChildren();
});
$('acad-live-monitor-refresh')?.addEventListener('click',()=>{
 $('cw-refresh')?.click();
 refreshMonitoring();
});
document.addEventListener('click',event=>{
 const link=event.target.closest('a[data-journal-exam]');
 if(link&&bridge()?.teacher?.()){
  journal.showJournal();
  journal.selectExam(link.dataset.journalExam);
 }
},true);
window.addEventListener('cortex:academy-view',event=>{
 if(event.detail!=='suivi')return;
 syncJournalExams();
 refreshMonitoring();
});
document.addEventListener('visibilitychange',refreshMonitoring);
window.addEventListener('online',refreshMonitoring);
setInterval(refreshMonitoring,15000);
queueMicrotask(()=>{if(bridge()?.teacher?.())renderTeacherDashboard()});
