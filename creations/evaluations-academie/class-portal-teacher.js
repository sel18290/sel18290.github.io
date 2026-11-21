/* Gestion des comptes et sessions de la classe sélectionnée. */
import {api} from './coursework.js?v=2.15-similarities-pdf';
import {downloadCopyPdf} from './class-copy-pdf.js?v=1.0';

const $=id=>document.getElementById(id);
const bridge=()=>window.CORTEX_ACADEMY_BRIDGE;
const root=$('cw-class-cards');
const classLinks=new Map();
const individualLinks=new Map();
const summaries=new Map();
const paris=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',dateStyle:'short',timeStyle:'short'});
const parisSession=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',dateStyle:'short',timeStyle:'medium'});
const when=value=>value?paris.format(new Date(value)):'—';
const sessionTime=value=>value?parisSession.format(new Date(value)):'—';
const scopedView=()=>document.body.dataset.acadView==='pins'&&!document.hidden&&!!bridge()?.teacher?.();
const classList=()=>(bridge()?.classes?.()||[]).filter(cl=>!cl.archived)
 .sort((a,b)=>String(a.code).localeCompare(String(b.code),'fr',{numeric:true}));
const numberValue=()=>Number(search.value)||null;
let scope={id:''},tab='accounts',activeDialog=null,actionPending=false;
let lastRows='',classSignature='';

function el(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
}
function button(label,cls,action){
 const node=el('button',cls,label);
 node.type='button';
 node.addEventListener('click',action);
 return node;
}
function notice(text,error=false){
 const area=$('cw-class-status');
 area.textContent=text||'';
 area.hidden=!text;
 area.classList.toggle('error',error);
}
function labeled(text,control){
 const label=el('label','cpa-field');
 label.append(el('span','',text),control);
 return label;
}
function options(select,items,chosen=''){
 select.replaceChildren(...items.map(([id,label])=>new Option(label,id)));
 if(items.some(([id])=>id===chosen))select.value=chosen;
}
function joinUrl(portal,token=null,individual=false){
 const url=new URL(location.pathname,location.origin);
 url.searchParams.set('classe',portal);
 if(token){
  if(individual)url.hash='inscription='+token;
  else url.searchParams.set('inscription',token);
 }
 return url.toString();
}
function linkBox(label,url,status){
 const box=el('div','cpa-link-box');
 const field=el('input');
 field.readOnly=true;field.type='url';field.value=url;
 field.spellcheck=false;field.setAttribute('aria-label',label);
 const actions=el('div','cpa-actions');
 actions.append(button('Copier le lien','cpa-button cpa-primary',async()=>{
  try{await navigator.clipboard.writeText(url);status('Lien copié.');}
  catch{field.focus();field.select();status('Lien sélectionné pour le copier.');}
 }));
 box.append(labeled(label,field),actions);
 return box;
}

const toolbar=el('div','cpa-toolbar');
const classes=el('select');
const refreshButton=button('Actualiser','cpa-button',()=>{void refresh();});
const classButton=button('Inscriptions et liens','cpa-button cpa-primary',showClassLinks);
const toolbarActions=el('div','cpa-actions');
toolbarActions.append(refreshButton,classButton);
toolbar.append(labeled('Classe',classes),toolbarActions);
const counts=el('div','cpa-stats');
const figures=['Comptes actifs','Liens en attente','Connexions ouvertes'].map(label=>{
 const metric=el('div','cpa-stat');
 const value=el('strong','','—');
 metric.append(value,el('span','',label));
 counts.append(metric);
 return value;
});
const tabs=el('div','cpa-tabs');
tabs.setAttribute('role','group');
tabs.setAttribute('aria-label','Gestion des accès élèves');
const accountsTab=button('Comptes et PIN','cpa-button',showAllAccounts);
const sessionsTab=button('Sessions','cpa-button',()=>chooseTab('sessions'));
tabs.append(accountsTab,sessionsTab);
const sessionHelp=el('p','cpa-session-help',
 'Une connexion reste utilisable jusqu’à son expiration. Un élève peut en avoir plusieurs, par exemple via le portail et le QR d’un contrôle.');
const filters=el('div','cpa-filters');
const search=el('input');
search.type='search';search.inputMode='numeric';search.maxLength=2;search.placeholder='Ex. 12';
const accountState=el('select');
options(accountState,[['all','Tous'],['active','Actifs'],['waiting','PIN à créer'],['locked','Bloqués'],['free','Libres']]);
const accountFilter=labeled('État du compte',accountState);
const sessionState=el('select');
options(sessionState,[['active','Ouvertes'],['all','Toutes'],['expired','Expirées']]);
const sessionFilter=labeled('État de la connexion',sessionState);
filters.append(labeled('Numéro sur la liste',search),accountFilter,sessionFilter);
const allAccounts=button('← Tous les élèves','cpa-button cpa-back',showAllAccounts);
const results=el('div','cpa-results');
const pagination=el('div','cpa-actions cpa-pages');
const prev=button('Page précédente','cpa-button',()=>movePage(-1));
const next=button('Page suivante','cpa-button',()=>movePage(1));
const pageLabel=el('span');
pagination.append(prev,pageLabel,next);
root.replaceChildren(toolbar,counts,tabs,sessionHelp,filters,allAccounts,results,pagination);

function resetFilters(){
 search.value='';
 accountState.value='all';
 sessionState.value='active';
}
function showAllAccounts(){
 resetFilters();
 chooseTab('accounts');
 accountsTab.focus({preventScroll:true});
}

function activeClass(){return classList().find(cl=>cl.id===scope.id);}
function syncClasses(){
 const choices=classList().map(cl=>[cl.id,cl.code+' · '+cl.display_name]);
 const signature=JSON.stringify(choices);
 const selected=choices.some(([id])=>id===scope.id)?scope.id:choices[0]?.[0]||'';
 if(signature!==classSignature){
  options(classes,choices.length?choices:[['','Aucune classe']],selected);
  classSignature=signature;
 }
 if(selected!==scope.id){
  scope={id:selected,page:0};
  resetFilters();
 }
 classes.disabled=!selected;
 if(selected)classes.value=selected;
}
function accountRows(){
 const records=scope.overview?.accounts||[];
 const byNumber=new Map(records.map(row=>[row.student_number,row]));
 const important=records.filter(row=>row.activated_at||row.invitation_issued_at||row.active_sessions);
 const size=Math.max(scope.overview?.access?.roster_size||30,...important.map(row=>row.student_number),
  ...(scope.copySummaries?.keys()||[]));
 return Array.from({length:size},(_,i)=>{
  const number=i+1;
  return {student_number:number,...byNumber.get(number),copySummary:scope.copySummaries?.get(number)};
 });
}
function activeLock(row){return Date.parse(row.locked_until)>Date.now();}
function pendingInvite(row){return Date.parse(row.invitation_expires_at)>Date.now();}
function accountStatus(row){
 if(row.activated_at)return activeLock(row)?['Bloqué','warn']:['Actif','ok'];
 if(row.invitation_issued_at){
  if(!pendingInvite(row))return ['Lien expiré','warn'];
  return [row.invitation_purpose==='reset'?'Nouveau PIN à créer':'Inscription en attente','wait'];
 }
 return ['Libre',''];
}
function badge([label,type]){
 return el('span','cpa-badge'+(type?' cpa-'+type:''),label);
}
function studentLabel(n){return 'N° '+n;}
const quantity=(n,singular,plural)=>n+' '+(n===1?singular:plural);
function keyForSessions(){return [scope.id,numberValue(),sessionState.value,scope.page].join(':');}
function chooseTab(value,student=null){
 tab=value;
 if(student!==null)search.value=String(student);
 scope.page=0;
 render();
 if(tab==='sessions')void loadSessions();
}
function movePage(direction){
 scope.page=Math.max(0,scope.page+direction);
 render();
 void loadSessions();
}
function showSessions(number){
 activeDialog?.close();
 sessionState.value=accountRows().find(row=>row.student_number===number)?.active_sessions?'active':'all';
 chooseTab('sessions',number);
 sessionsTab.focus();
}
function render(){
 const ready=!!scope.id;
 const rows=scope.overview?accountRows():[];
 const active=rows.filter(row=>row.activated_at).length;
 const pending=rows.filter(pendingInvite).length;
 [active,pending,scope.overview?.active_sessions||0].forEach((value,i)=>{
  figures[i].textContent=scope.overview?value:'—';
 });
 refreshButton.disabled=!ready;
 classButton.disabled=!ready||!scope.overview;
 tabs.hidden=!ready;filters.hidden=!ready;counts.hidden=!ready;
 allAccounts.hidden=!ready||(tab==='accounts'&&!search.value&&accountState.value==='all');
 sessionHelp.hidden=!ready||tab!=='sessions';
 accountFilter.hidden=tab!=='accounts';
 sessionFilter.hidden=tab!=='sessions';
 accountsTab.setAttribute('aria-pressed',String(tab==='accounts'));
 sessionsTab.setAttribute('aria-pressed',String(tab==='sessions'));
 pagination.hidden=true;
 let view='', data=[];
 if(!ready)view='Aucune classe disponible. Tu peux en ajouter dans « Mes classes ».';
 else if(tab==='accounts'){
  if(!scope.overview)view=scope.overviewError?'Impossible de charger les comptes. Utilise « Actualiser ».':'Chargement des comptes…';
  else{
   const selected=accountState.value;
   data=rows.filter(row=>{
    if(numberValue()&&row.student_number!==numberValue())return false;
    if(selected==='active')return !!row.activated_at;
    if(selected==='waiting')return !row.activated_at&&!!row.invitation_issued_at;
    if(selected==='locked')return activeLock(row);
    if(selected==='free')return !row.activated_at&&!row.invitation_issued_at;
    return true;
   });
   if(!data.length)view='Aucun numéro pour ces filtres.';
  }
 }else{
  const sessionPage=scope.sessionPage?.key===keyForSessions()?scope.sessionPage:null;
  if(!sessionPage)view=scope.sessionError?'Impossible de charger les sessions. Utilise « Actualiser ».':'Chargement des sessions…';
  else{
   data=sessionPage.rows;
   if(!data.length)view='Aucune connexion pour ces filtres.';
   pagination.hidden=!scope.page&&!sessionPage.hasMore;
   prev.disabled=!scope.page;
   next.disabled=!sessionPage.hasMore;
   pageLabel.textContent='Page '+(scope.page+1);
  }
 }
 const signature=JSON.stringify([scope.id,tab,view,!!scope.copySummaries,data,
  data.map(row=>tab==='accounts'?accountStatus(row):row.active)]);
 if(signature===lastRows)return;
 lastRows=signature;
 results.replaceChildren(view?el('p','cpa-empty',view):makeTable(data,tab));
}

function makeTable(data,kind){
 const table=el('table','cpa-table'+(kind==='accounts'?' cpa-account-table':''));
 table.setAttribute('aria-label',kind==='accounts'?'Comptes élèves de la classe':'Sessions élèves de la classe');
 table.setAttribute('role','table');
 const body=table.createTBody();
 const header=table.createTHead().insertRow();
 const labels=kind==='accounts'?['N°','Compte et PIN','Demi-groupe','Connexions','Copies','Actions']:
  ['N°','Accès','Ouverte le','Expiration','Actions'];
 for(const label of labels){
  const cell=el('th','',label);cell.scope='col';header.append(cell);
 }
 for(const dataRow of data){
  const row=body.insertRow();row.setAttribute('role','row');
  const heading=el('th','',studentLabel(dataRow.student_number));
  heading.scope='row';row.append(heading);
  const cells=labels.slice(1).map(label=>{
   const cell=row.insertCell();cell.dataset.label=label;cell.setAttribute('role','cell');return cell;
  });
  if(kind==='accounts'){
   const [account,group,sessions,copies,actions]=cells;
   account.append(badge(accountStatus(dataRow)));
   if(dataRow.activated_at)account.append(el('small','','PIN créé le '+when(dataRow.activated_at)));
   else if(dataRow.invitation_expires_at)account.append(el('small','',(pendingInvite(dataRow)?'Jusqu’au ':'Expiré le ')+when(dataRow.invitation_expires_at)));
   group.textContent=dataRow.demi_groupe?'Groupe '+dataRow.demi_groupe:'—';
   const connections=Number(dataRow.active_sessions||0);
   if(connections)sessions.append(button(quantity(connections,'connexion ouverte','connexions ouvertes'),
    'cpa-inline',()=>showSessions(dataRow.student_number)));
   else{
    sessions.append(el('small','','Aucune connexion ouverte'));
    if(dataRow.last_session_at)sessions.append(button('Voir l’historique','cpa-inline',()=>showSessions(dataRow.student_number)));
   }
   if(dataRow.last_session_at)sessions.append(el('small','','Dernière ouverture le '+when(dataRow.last_session_at)));
   appendCopySummary(copies,dataRow);
   const manage=button('Gérer','cpa-button cpa-small',()=>showAccount(dataRow,manage));
   manage.setAttribute('aria-label','Gérer le n° '+dataRow.student_number);
   actions.append(manage);
  }else{
   const [access,created,expiry,actions]=cells;
   access.append(el('strong','',dataRow.kind==='qr'?'QR du contrôle':'Portail de classe'));
   if(dataRow.exam_title)access.append(el('small','',dataRow.exam_title));
   access.append(badge(dataRow.active?['Ouverte','ok']:['Expirée','']));
   created.textContent=sessionTime(dataRow.created_at);
   expiry.textContent=sessionTime(dataRow.expires_at);
   if(dataRow.active){
    const close=button('Fermer','cpa-button cpa-small',()=>showSession(dataRow,close));
    close.setAttribute('aria-label','Fermer la session du n° '+dataRow.student_number+' ouverte le '+sessionTime(dataRow.created_at));
    actions.append(close);
   }else actions.textContent='—';
  }
 }
 return table;
}

function appendCopySummary(cell,row){
 const summary=row.copySummary;
 if(!scope.copySummaries)cell.append(el('small','','État des copies indisponible'));
 else if(!summary){cell.append(el('small','','Aucune copie ni brouillon'));return;}
 else{
  if(summary.submitted)cell.append(el('strong','cpa-copy-count',quantity(summary.submitted,'copie remise','copies remises')));
  if(summary.drafts)cell.append(el('strong','cpa-copy-count',quantity(summary.drafts,'brouillon sauvegardé','brouillons sauvegardés')));
  if(summary.previous)cell.append(el('small','',quantity(summary.previous,'travail antérieur','travaux antérieurs')));
 }
 const link=button('Voir les copies','cpa-inline cpa-copy-link',event=>showCopies(row.student_number,event.currentTarget));
 link.setAttribute('aria-label','Voir les copies du n° '+row.student_number);
 cell.append(link);
}

function copyStatus(copy){return copy.kind==='draft'?'Brouillon sauvegardé':'Copie remise';}
function copyDate(copy){
 const label=copy.kind==='draft'?'Contrôle commencé le ':copy.auto_submitted?'Remise automatique le ':'Remise le ';
 return label+when(copy.recorded_at);
}
function copyAnswers(copy){
 const answers=copy.answers||{};
 const questions=Array.isArray(copy.questions)?copy.questions.filter(q=>q?.id):[];
 const known=new Set(questions.map(q=>q.id));
 return [...questions,...Object.keys(answers).filter(id=>!known.has(id)).map(id=>({id}))].map((q,i)=>{
  const value=Object.hasOwn(answers,q.id)?answers[q.id]:null;
  const raw=typeof value==='string'?value:value==null?'':JSON.stringify(value);
  const display=raw.trim()?window.CORTEX_QUESTION_TYPES?.summary(q,raw):'';
  const answer=(display&&display!=='Sans réponse'?display:raw.trim()?raw:'Sans réponse');
  return {prompt:(i+1)+'. '+(q.prompt||q.id),answer};
 });
}
function copyHeading(copy){
 const heading=el('div','cpa-copy-heading');
 const state=badge([copyStatus(copy),copy.kind==='draft'?'wait':'ok']);
 heading.append(el('h4','',copy.title),state,el('p','cpa-copy-date',copyDate(copy)));
 return heading;
}
function showCopies(number,trigger){
 const cl=activeClass(),teacher=bridge()?.teacher?.();
 if(!cl||!teacher)return;
 const panel=openDialog('Copies · '+cl.code+' · '+studentLabel(number),trigger);
 panel.dialog.classList.add('cpa-copy-dialog');
 const params={class_id:cl.id,student_number:number};
 let view=0;
 const current=request=>view===request&&panel.dialog.open&&bridge()?.teacher?.()===teacher&&scope.id===cl.id;

 async function showList(){
  const request=++view;
  panel.body.replaceChildren();
  panel.status('Recherche des copies…');
  try{
   const {copies}=await api('teacher_pin_copies',params,null,true);
   if(!current(request))return;
   panel.status('');
   if(!copies.length){panel.body.append(el('p','','Aucune copie remise ni brouillon sauvegardé pour ce numéro.'));return;}
   const list=el('div','cpa-copy-list');
   let previous=false;
   for(const copy of copies){
    if(copy.previous_assignment&&!previous){
     list.append(el('h4','cpa-copy-history','Anciennes attributions du numéro'));
     previous=true;
    }
    const card=el('article','cpa-copy-item');
    const open=button(copy.kind==='draft'?'Ouvrir le brouillon':'Ouvrir la copie','cpa-button cpa-primary',()=>{void showCopy(copy);});
    card.append(copyHeading(copy),open);
    list.append(card);
   }
   panel.body.append(list);
   list.querySelector('button')?.focus({preventScroll:true});
  }catch(error){
   if(!current(request))return;
   panel.status(error.message,true);
   panel.body.append(button('Réessayer','cpa-button',()=>{void showList();}));
  }
 }

 async function showCopy(item){
  const request=++view;
  const back=button('← Retour aux copies','cpa-button cpa-back',()=>{void showList();});
  panel.body.replaceChildren(back);
  back.focus();
  panel.status('Ouverture…');
  const selection={...params,assessment_id:item.assessment_id};
  try{
   const {copy}=await api('teacher_pin_copy',selection,null,true);
   if(!current(request))return;
   panel.status('');
   const heading=copyHeading(copy),answers=copyAnswers(copy),actions=el('div','cpa-actions');
   if(copy.previous_assignment)heading.append(badge(['Ancienne attribution du numéro','warn']));
   const pdf=button('Télécharger le PDF','cpa-button cpa-primary',()=>{
    try{
     downloadCopyPdf({classCode:cl.code,number,title:copy.title,status:copyStatus(copy),date:copyDate(copy),
      draft:copy.kind==='draft',previous:copy.previous_assignment,attachment:copy.file_name,answers});
     panel.status('');
    }catch{panel.status('Impossible de générer le PDF.',true);}
   });
   actions.append(pdf);
   if(copy.has_attachment){
    const attachment=button('Télécharger la pièce jointe','cpa-button',async()=>{
     attachment.disabled=true;
     try{
      const {url}=await api('teacher_pin_copy',{...selection,download_attachment:true},null,true);
      if(!current(request))return;
      const link=el('a');
      link.href=url;
      link.referrerPolicy='no-referrer';
      panel.body.append(link);
      link.click();
      link.remove();
      panel.status('');
     }catch(error){if(current(request))panel.status(error.message,true);}
     finally{attachment.disabled=false;}
    });
    actions.append(attachment);
    if(copy.file_name)heading.append(el('small','cpa-copy-date',copy.file_name));
   }
   const responses=el('div','cpa-copy-responses');
   for(const {prompt,answer} of answers){
    const entry=el('section','cpa-copy-answer');
    entry.append(el('h5','',prompt),el('p','',answer));
    responses.append(entry);
   }
   if(!answers.length)responses.append(el('p','','Aucune réponse saisie dans le contrôle.'));
   panel.body.append(heading,actions,responses);
  }catch(error){if(current(request))panel.status(error.message,true);}
 }
 void showList();
}

function publishSummaries(){
 window.dispatchEvent(new CustomEvent('cortex:academy-roster-ready',{detail:{summaries:[...summaries.values()]}}));
}
function summarize(id,rows){
 const active=rows.filter(row=>row.activated_at);
 summaries.set(id,{classId:id,activated:active.length,group1:active.filter(row=>row.demi_groupe===1).length,
  group2:active.filter(row=>row.demi_groupe===2).length,whole:active.filter(row=>!row.demi_groupe).length});
}
async function loadAccounts(){
 const current=scope,teacher=bridge()?.teacher?.();
 if(!current.id||!teacher)return;
 if(current.accountRequest)return current.accountRequest;
 current.accountRequest=api('teacher_pin_admin',{class_id:current.id},null,true).then(data=>{
  if(current!==scope||bridge()?.teacher?.()!==teacher)return;
  current.overview=data;current.overviewError=false;
  current.copySummaries=Array.isArray(data.copy_summaries)?new Map(data.copy_summaries.map(row=>[row.student_number,row])):null;
  summarize(current.id,data.accounts||[]);
  publishSummaries();
  render();
 }).catch(error=>{
  if(current!==scope||bridge()?.teacher?.()!==teacher)return;
  current.overviewError=true;
  notice(error.message,true);
  render();
 }).finally(()=>{current.accountRequest=null;});
 return current.accountRequest;
}
async function loadSessions(){
 if(tab!=='sessions'||!scope.id)return;
 const current=scope,teacher=bridge()?.teacher?.(),key=keyForSessions();
 if(!teacher)return;
 if(current.sessionRequest?.key===key)return current.sessionRequest.promise;
 const request={key},params={class_id:current.id,student_number:numberValue(),session_state:sessionState.value,offset:current.page*30};
 current.sessionRequest=request;
 current.sessionError=false;
 request.promise=api('teacher_pin_sessions',params,null,true).then(data=>{
  if(current!==scope||request!==current.sessionRequest||key!==keyForSessions()||bridge()?.teacher?.()!==teacher)return;
  current.sessionPage={key,rows:data.rows||[],hasMore:data.has_more};
  render();
 }).catch(error=>{
  if(current!==scope||request!==current.sessionRequest||key!==keyForSessions()||bridge()?.teacher?.()!==teacher)return;
  current.sessionError=true;notice(error.message,true);render();
 }).finally(()=>{if(current.sessionRequest===request)current.sessionRequest=null;});
 return request.promise;
}
async function refresh(){
 if(!scopedView())return;
 syncClasses();
 render();
 await Promise.all([loadAccounts(),loadSessions()]);
}
function selectClass(id){
 if(!classList().some(cl=>cl.id===id)||scope.id===id)return;
 scope={id,page:0};
 classes.value=id;
 resetFilters();
 notice('');
 render();
 void refresh();
}

function openDialog(title,trigger=document.activeElement){
 activeDialog?.close();
 const dialog=el('dialog','cpa-dialog');
 dialog.setAttribute('aria-label',title);
 const heading=el('div','cpa-dialog-head');
 heading.append(el('h3','',title),button('Fermer','cpa-button',()=>dialog.close()));
 const body=el('div','cpa-dialog-body');
 const statusNode=el('p','cpa-dialog-status');
 statusNode.setAttribute('role','status');
 statusNode.hidden=true;
 function status(value,error=false){
  statusNode.textContent=value||'';statusNode.hidden=!value;statusNode.classList.toggle('error',error);
 }
 dialog.append(heading,statusNode,body);
 root.append(dialog);
 activeDialog=dialog;
 dialog.addEventListener('cancel',event=>{if(actionPending)event.preventDefault();});
 dialog.addEventListener('close',()=>{
  dialog.remove();
  if(activeDialog!==dialog)return;
  activeDialog=null;
  if(trigger?.isConnected)trigger.focus();else classes.focus();
 });
 dialog.showModal();
 return {dialog,body,status};
}
async function perform(dialog,work){
 if(actionPending)return;
 actionPending=true;
 const teacher=bridge()?.teacher?.();
 const controls=[...dialog.dialog.querySelectorAll('button:enabled,select:enabled,input:enabled')];
 controls.forEach(control=>{control.disabled=true;});
 dialog.status('');
 try{
  await work(()=>dialog.dialog.open&&!!teacher&&teacher===bridge()?.teacher?.());
 }catch(error){if(dialog.dialog.open)dialog.status(error.message||'Action indisponible.',true);}
 finally{controls.forEach(control=>{control.disabled=false;});actionPending=false;}
}
function confirmAction(dialog,text,label,action){
 dialog.body.querySelector('.cpa-confirm')?.remove();
 const check=el('div','cpa-confirm');
 const buttons=el('div','cpa-actions');
 const accept=button(label,'cpa-button cpa-danger',action);
 const cancel=button('Annuler','cpa-button',()=>{check.remove();});
 buttons.append(cancel,accept);
 check.append(el('p','',text),buttons);
 dialog.body.append(check);
 cancel.focus();
}
async function accountAction(dialog,classId,row,operation,sessionId=null){
 await perform(dialog,async(isCurrent)=>{
  const size=Math.max(scope.overview?.access?.roster_size||30,row.student_number);
  const response=await api('teacher_pin_action',{
   class_id:classId,student_number:row.student_number,operation,session_id:sessionId,
   activated_at:row.activated_at||null,invitation_issued_at:row.invitation_issued_at||null,roster_size:size
  },null,true);
  if(!isCurrent())return;
  if(operation==='issue'){
   individualLinks.set(classId+':'+row.student_number,{url:joinUrl(response.portal_code,response.registration_token,true),
    issued:response.invitation_issued_at});
   dialog.body.replaceChildren(el('p','','Lien à usage unique pour ce numéro, valide jusqu’au '+when(response.invitation_expires_at)+'.'),
    linkBox('Lien individuel',individualLinks.get(classId+':'+row.student_number).url,dialog.status));
   dialog.status(row.activated_at?'PIN réinitialisé. Transmets le lien à l’élève.':'Transmets le lien à l’élève pour qu’il choisisse son PIN.');
  }else{
   if(operation==='release')individualLinks.delete(classId+':'+row.student_number);
   notice(operation==='release'?studentLabel(row.student_number)+' est libre.':
    operation==='unlock'?'Tentatives réinitialisées pour '+studentLabel(row.student_number)+'.':
    response.closed?response.closed+' session(s) fermée(s).':'Cette session est déjà fermée.');
   dialog.dialog.close();
  }
  if(scope.id===classId){
   if(scope.accountRequest)await scope.accountRequest;
   if(scope.sessionRequest)await scope.sessionRequest.promise;
   await refresh();
  }
 });
}
function showAccount(row,trigger){
 const cl=activeClass();if(!cl)return;
 const dialog=openDialog(cl.code+' · '+studentLabel(row.student_number),trigger);
 dialog.body.append(badge(accountStatus(row)));
 if(row.activated_at)dialog.body.append(el('p','','PIN personnel défini le '+when(row.activated_at)+'.'));
 else dialog.body.append(el('p','','L’élève choisit son PIN à six chiffres à partir d’un lien d’inscription.'));
 if(activeLock(row))dialog.body.append(el('p','','Blocage des tentatives jusqu’au '+when(row.locked_until)+'.'));
 const cached=individualLinks.get(cl.id+':'+row.student_number);
 if(pendingInvite(row)&&cached?.issued===row.invitation_issued_at){
  dialog.body.append(linkBox('Lien individuel valable jusqu’au '+when(row.invitation_expires_at),cached.url,dialog.status));
 }
 if(row.activated_at){
  const group=el('select');
  options(group,[['0','Non renseigné'],['1','Groupe 1'],['2','Groupe 2']],String(row.demi_groupe||0));
  const editor=el('div','cpa-group-edit');
  editor.append(labeled('Demi-groupe',group),button('Enregistrer le groupe','cpa-button',()=>perform(dialog,async(isCurrent)=>{
   await api('teacher_class_set_group',{class_id:cl.id,student_number:row.student_number,demi_groupe:Number(group.value)},null,true);
   if(isCurrent()){dialog.status('Demi-groupe enregistré.');await refresh();}
  })));
  dialog.body.append(editor);
 }
 const actions=el('div','cpa-actions');
 const issueLabel=row.activated_at?'Réinitialiser le PIN':row.invitation_issued_at?'Générer un nouveau lien':'Créer un accès';
 actions.append(button(issueLabel,'cpa-button cpa-primary',()=>{
  const issue=()=>accountAction(dialog,cl.id,row,'issue');
  if(row.activated_at)confirmAction(dialog,'Le PIN actuel et les sessions seront révoqués. L’élève choisira un nouveau PIN avec le lien individuel.','Réinitialiser et créer le lien',issue);
  else if(pendingInvite(row))confirmAction(dialog,'Le lien individuel actuel sera remplacé.','Créer le nouveau lien',issue);
  else void issue();
 }));
 if(activeLock(row))actions.append(button('Débloquer le numéro','cpa-button',()=>accountAction(dialog,cl.id,row,'unlock')));
 if(row.active_sessions||row.last_session_at)actions.append(button('Voir les connexions','cpa-button',()=>showSessions(row.student_number)));
 if(row.copySummary||!scope.copySummaries)actions.append(button('Voir les copies','cpa-button',()=>showCopies(row.student_number,trigger)));
 if(row.active_sessions)actions.append(button('Fermer toutes ses sessions','cpa-button',()=>confirmAction(dialog,
  'Ce numéro devra se reconnecter avec son PIN.','Fermer les sessions',()=>accountAction(dialog,cl.id,row,'disconnect'))));
 if(row.activated_at||row.invitation_issued_at)actions.append(button(row.activated_at?'Supprimer le compte':'Libérer le numéro','cpa-button cpa-danger',()=>confirmAction(dialog,
  'Le numéro redevient libre et ses sessions se ferment. Les copies rendues restent dans l’espace professeur.',
  row.activated_at?'Confirmer la suppression':'Confirmer la libération',()=>accountAction(dialog,cl.id,row,'release'))));
 dialog.body.append(actions);
}
function showSession(row,trigger){
 const cl=activeClass();if(!cl)return;
 const dialog=openDialog(cl.code+' · '+studentLabel(row.student_number),trigger);
 dialog.body.append(el('p','',(row.exam_title||'Portail de classe')+' · Session créée le '+when(row.created_at)));
 confirmAction(dialog,'L’élève devra se reconnecter sur cet accès.','Fermer cette session',
  ()=>accountAction(dialog,cl.id,row,'disconnect',row.session_id));
}
function showClassLinks(){
 const cl=activeClass(),record=scope.overview?.access;
 if(!cl||!scope.overview)return;
 const dialog=openDialog('Inscriptions et liens · '+cl.code);
 const minimum=record?.roster_size||1;
 const size=el('input');
 size.type='number';size.inputMode='numeric';size.required=true;size.min=String(minimum);size.max='60';size.value=String(record?.roster_size||30);
 const registrationOpen=Date.parse(record?.registration_open_until)>Date.now();
 if(registrationOpen)dialog.body.append(el('p','','Inscriptions de classe ouvertes jusqu’au '+when(record.registration_open_until)+'.'));
 const actions=el('div','cpa-actions');
 function updateEnrollment(enabled){
  return perform(dialog,async(isCurrent)=>{
   if(enabled&&!size.checkValidity())throw Error('Choisis un effectif de '+minimum+' à 60 numéros.');
   const result=await api('teacher_pin_enrollment',{class_id:cl.id,roster_size:Number(size.value),enabled},null,true);
   if(!isCurrent())return;
   if(enabled)classLinks.set(cl.id,{url:joinUrl(result.portal_code,result.registration_token),expires:result.registration_open_until});
   else classLinks.delete(cl.id);
   if(scope.accountRequest)await scope.accountRequest;
   await loadAccounts();
   dialog.dialog.close();
   showClassLinks();
  });
 }
 actions.append(button(registrationOpen?'Renouveler le lien de classe':'Ouvrir les inscriptions · 30 min','cpa-button cpa-primary',()=>updateEnrollment(true)));
 if(registrationOpen)actions.append(button('Fermer les inscriptions','cpa-button',()=>updateEnrollment(false)));
 dialog.body.append(labeled('Nombre de numéros',size),actions);
 const invitation=classLinks.get(cl.id);
 if(registrationOpen&&Date.parse(invitation?.expires)===Date.parse(record.registration_open_until))
  dialog.body.append(linkBox('Lien d’inscription de la classe',invitation.url,dialog.status));
 if(record?.portal_code)dialog.body.append(linkBox('Lien permanent pour se connecter',joinUrl(record.portal_code),dialog.status));
}
classes.addEventListener('change',()=>selectClass(classes.value));
search.addEventListener('input',()=>{
 search.value=search.value.replace(/[^0-9]/g,'').slice(0,2);
 scope.page=0;render();if(tab==='sessions')void loadSessions();
});
accountState.addEventListener('change',render);
sessionState.addEventListener('change',()=>{scope.page=0;render();void loadSessions();});
document.addEventListener('click',event=>{
 const link=event.target.closest('[data-pin-class]');
 if(link)selectClass(link.dataset.pinClass);
},true);
window.addEventListener('cortex:academy-data-ready',refresh);
window.addEventListener('cortex:academy-view',event=>{if(event.detail==='pins')void refresh();});
window.addEventListener('hashchange',()=>{if(location.hash==='#cw-persistent-classes')void refresh();});
window.addEventListener('cortex:academy-live-snapshot',event=>{
 const enrollment=event.detail?.enrollments||[];
 summaries.clear();
 for(const cl of classList())summarize(cl.id,enrollment.filter(row=>row.class_id===cl.id));
 if(scope.overview)summarize(scope.id,scope.overview.accounts||[]);
 publishSummaries();
});
window.addEventListener('cortex:academy-logout',()=>{
 activeDialog?.close();classLinks.clear();individualLinks.clear();summaries.clear();
 scope={id:''};tab='accounts';classSignature='';lastRows='';resetFilters();
 classes.replaceChildren();notice('');render();
});
document.addEventListener('visibilitychange',()=>{if(!activeDialog)void refresh();});
setInterval(()=>{if(!activeDialog&&!actionPending)void refresh();},30000);
queueMicrotask(refresh);
