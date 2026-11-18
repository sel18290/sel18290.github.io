/* Espace réel : éditeur pédagogique question par question, inspiré de la démonstration. */
import {api} from './coursework.js?v=2.0';
const $=id=>document.getElementById(id);
const QT=()=>window.CORTEX_QUESTION_TYPES;
const h=x=>QT().h(x);
const state={questions:[],index:0,editingId:null,sourceFile:null,pdf:null,docPage:1,docCount:0,sourceWordText:'',assets:[],removedIds:new Set()};
const newId=()=> 'q-'+crypto.randomUUID().slice(0,24);
const blank=()=>({id:newId(),prompt:'',points:1,type:'text',doc:''});
function current(){return state.questions[state.index];}
function setHint(value){const el=$('manual-save-hint');if(el)el.textContent=String(value||'');}
function total(){return state.questions.reduce((v,q)=>v+Number(q.points||0),0);}

const scripts={};
function loadScript(url){return scripts[url]||(scripts[url]=new Promise((res,rej)=>{
 const tag=document.createElement('script');tag.src=url;tag.async=true;tag.onload=res;
 tag.onerror=()=>{delete scripts[url];rej(Error('Lecteur documentaire indisponible. Vérifie ta connexion.'))};
 document.head.append(tag);
}));}
async function renderOriginal(){
 const stage=$('manual-original-render'),bar=$('manual-doc-pages');stage.replaceChildren();
 if(!state.sourceFile){stage.hidden=true;bar.hidden=true;return;}
 stage.hidden=false;
 if(state.pdf){
  bar.hidden=false;
  $('manual-doc-counter').textContent='Page '+state.docPage+' / '+state.docCount;
  $('manual-doc-prev').disabled=state.docPage<=1;
  $('manual-doc-next').disabled=state.docPage>=state.docCount;
  const page=await state.pdf.getPage(state.docPage),scale=Math.min(1.7,Math.max(1.1,window.devicePixelRatio||1));
  const vp=page.getViewport({scale});
  const cv=document.createElement('canvas');
  cv.width=vp.width;cv.height=vp.height;cv.style.width='100%';cv.style.height='auto';
  stage.append(cv);await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
 }else{
  bar.hidden=true;
  const text=document.createElement('div');text.className='real-manual-word';
  text.textContent=state.sourceWordText||'Texte non reconnu dans le document Word. Le fichier original est tout de même conservé.';
  stage.append(text);
 }
}
async function previewFile(file){
 if(file.size<1||file.size>8*1024*1024)throw Error('Document limité à 8 Mo.');
 const suffix=file.name.split('.').pop().toLowerCase();
 if(!['pdf','docx'].includes(suffix))throw Error('Format PDF ou Word (.docx) requis.');
 state.sourceFile=file;state.pdf=null;state.docPage=1;state.docCount=1;state.sourceWordText='';
 const preview=$('manual-original-render');preview.hidden=false;
 preview.textContent='Préparation de la prévisualisation…';
 if(suffix==='pdf'){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  state.pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  state.docCount=state.pdf.numPages;
 }else{
  await loadScript('https://unpkg.com/mammoth@1.10.0/mammoth.browser.min.js');
  const result=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
  state.sourceWordText=result.value||'';
 }
 await renderOriginal();
 setHint('Document prêt : '+file.name+'. Il sera téléversé dans le stockage privé en enregistrant le contrôle.');
}
async function uploadSource(id){
 if(!state.sourceFile)return;
 if(!id)throw Error('Contrôle non enregistré pour le dépôt du document.');
 await api('teacher_upload',{assessment_id:id},state.sourceFile,true);
 state.sourceFile=null;
}

async function uploadAssets(id){
 if(!id)throw Error('Contrôle non enregistré.');
 const pending=state.assets.filter(a=>a.pending);
 for(const asset of pending){
  const question=state.questions.find(q=>q.id===asset.questionId);
  if(!question)throw Error('Une capture ne possède plus de question destinataire. Supprime-la puis réessaie.');
  const file=new File([asset.blob],asset.name,{type:asset.blob.type});
  const result=await api('teacher_asset_upload',{
   assessment_id:id,question_id:question.id,page:1
  },file,true);
  question.assetIds=[...new Set([...(question.assetIds||[]),result.asset.id])];
  if(asset.previewUrl)URL.revokeObjectURL(asset.previewUrl);
  Object.assign(asset,{id:result.asset.id,name:result.asset.name,url:result.asset.url,pending:false,previewUrl:null,blob:null});
 }
}
function releaseAssets(){
 for(const a of state.assets)if(a.previewUrl)URL.revokeObjectURL(a.previewUrl);
 state.assets=[];state.removedIds.clear();
}
function addCapture(blob,name){
 if(!blob||!['image/png','image/jpeg','image/webp'].includes(blob.type))
  throw Error('La capture doit être au format PNG, JPEG ou WebP.');
 if(blob.size<1||blob.size>8*1024*1024)throw Error('Capture de 8 Mo maximum.');
 if(state.assets.length>=60)throw Error('Limite de 60 captures atteinte pour ce contrôle.');
 const q=current();if(!q)throw Error('Sélectionne d’abord une question.');
 const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';
 state.assets.push({id:'pending-'+newId(),questionId:q.id,
  name:(name||'Capture_question_'+(state.index+1)+'.'+ext).slice(0,120),
  page:1,pending:true,blob,previewUrl:URL.createObjectURL(blob)});
 paint();
 setHint('✓ Capture liée à la question '+(state.index+1)+'. Enregistre le contrôle pour la rendre disponible aux élèves.');
}
async function pasteCaptureFromClipboard(){
 if(!navigator.clipboard?.read)throw Error('Lecture du presse-papiers indisponible. Clique dans la zone documentaire et utilise Ctrl+V, ou choisis une image.');
 const items=await navigator.clipboard.read();
 for(const item of items){
  const type=item.types.find(t=>['image/png','image/jpeg','image/webp'].includes(t));
  if(!type)continue;
  addCapture(await item.getType(type));
  return;
 }
 throw Error('Aucune image dans le presse-papiers. Fais une capture d’écran puis réessaie.');
}
function pasteCaptureEvent(event){
 const item=[...(event.clipboardData?.items||[])].find(x=>x.kind==='file'&&/^image\/(png|jpeg|webp)$/.test(x.type));
 if(!item)return;
 event.preventDefault();
 try{const file=item.getAsFile();if(file)addCapture(file);}
 catch(error){setHint('Capture non collée : '+(error?.message||error));}
}
async function removeCapture(id){
 const asset=state.assets.find(a=>a.id===id);
 if(!asset)return;
 if(!asset.pending){
  if(!state.editingId){setHint('Enregistre la nouvelle version avant de modifier les anciennes captures.');return;}
  await api('teacher_asset_delete',{assessment_id:state.editingId,asset_id:id},null,true);
  state.removedIds.add(id);
  for(const q of state.questions)q.assetIds=(q.assetIds||[]).filter(x=>x!==id);
 }else if(asset.previewUrl)URL.revokeObjectURL(asset.previewUrl);
 state.assets=state.assets.filter(a=>a!==asset);
 paint();
 setHint('Capture retirée de la question.');
}
async function loadExistingAssets(id){
 try{
  const data=await api('teacher_asset_list',{assessment_id:id},null,true);
  if(state.editingId!==id)return;
  state.assets=(data.assets||[]).filter(a=>a.id&&a.url).map(a=>({...a,pending:false}));
  preview();
 }catch(err){if(state.editingId===id)setHint('Captures existantes non disponibles : '+(err?.message||err));}
}

function paint(){
 const q=current();if(!q)return;
 const num=state.index+1,t=QT(),root=$('manual-question-editor');
 $('real-manual-amount').textContent=state.questions.length+' question(s)';
 $('real-manual-total').textContent=total().toLocaleString('fr-FR',{maximumFractionDigits:2})+' / 20 points conseillés';
 $('real-manual-current').textContent='Question '+num+' / '+state.questions.length;
 const list=$('manual-question-tabs');list.replaceChildren();
 state.questions.forEach((item,i)=>{
  const b=document.createElement('button');b.type='button';b.className='real-manual-tab'+(state.index===i?' selected':'');
  b.textContent=(i+1)+'. '+(item.prompt||'Nouvelle question')+' · '+Number(item.points||0)+' pt';
  b.setAttribute('aria-current',state.index===i?'step':'false');
  b.addEventListener('click',()=>{state.index=i;paint();});
  list.append(b);
 });
 const typeOpts=t.TYPES.map(item=>'<option value="'+h(item[0])+'" '+(t.type(q)===item[0]?'selected':'')+'>'+h(item[1])+'</option>').join('');
 root.innerHTML=
  '<div class="real-manual-item-head"><strong>QUESTION '+num+'</strong><span>'+h(Number(q.points||0))+' point(s)</span></div>'+
  '<label>Énoncé de la question<textarea data-manual-field="prompt" rows="4" maxlength="1200" placeholder="Rédige une consigne claire…">'+h(q.prompt||'')+'</textarea></label>'+
  '<div class="real-manual-qgrid"><label>Type de réponse<select data-manual-field="type">'+typeOpts+'</select></label>'+
  '<label>Barème (points)<input data-manual-field="points" type="number" min="0" max="20" step="0.25" value="'+h(q.points)+'"></label></div>'+
  t.editorExtra(q,state.index,'manual')+

  '<div class="real-manual-actions"><button type="button" data-manual-action="move-up" '+(state.index===0?'disabled':'')+'>↑ Monter</button>'+
  '<button type="button" data-manual-action="move-down" '+(state.index===state.questions.length-1?'disabled':'')+'>↓ Descendre</button>'+
  '<button type="button" data-manual-action="duplicate">Dupliquer</button>'+
  '<button type="button" data-manual-action="delete" '+(state.questions.length===1?'disabled':'')+'>Supprimer</button></div>';
 $('manual-prev').disabled=state.index===0;
 $('manual-next').disabled=state.index===state.questions.length-1;
 $('manual-question-doc').value=String(q.doc||'');
 preview();
}
function preview(){
 const q=current(),node=$('manual-source-preview');
 node.replaceChildren();
 const items=state.assets.filter(a=>a.questionId===q?.id||(q?.assetIds||[]).includes(a.id));
 if(items.length){
  const gallery=document.createElement('div');gallery.className='real-manual-capture-gallery';
  for(const asset of items){
   const figure=document.createElement('figure');figure.className='real-manual-capture';
   const img=document.createElement('img');img.src=asset.previewUrl||asset.url||'';
   img.alt='Capture documentaire : '+asset.name;img.loading='lazy';
   const legend=document.createElement('figcaption');legend.textContent=asset.name+(asset.pending?' · à enregistrer':' · enregistrée');
   const remove=document.createElement('button');remove.type='button';remove.className='real-manual-remove-capture';
   remove.textContent='Retirer';remove.setAttribute('aria-label','Retirer '+asset.name);
   remove.addEventListener('click',()=>removeCapture(asset.id).catch(error=>setHint('Suppression impossible : '+(error?.message||error))));
   figure.append(img,legend,remove);gallery.append(figure);
  }
  node.append(gallery);
 }
 if(!items.length){
  const p=document.createElement('p');p.className='cortex-unified-empty';
  p.textContent='Aucune image associée. Fais une capture d’écran ou choisis une image.';
  node.append(p);
 }
}
function runAction(action){
 const q=current(),i=state.index;
 if(action==='delete'){if(state.questions.length<2)return;
  if((q.assetIds||[]).length||state.assets.some(a=>a.questionId===q.id&&!a.pending)){setHint('Retire d’abord les captures enregistrées de cette question.');return;}
  for(const a of state.assets.filter(a=>a.questionId===q.id)){if(a.previewUrl)URL.revokeObjectURL(a.previewUrl);}
  state.assets=state.assets.filter(a=>a.questionId!==q.id);
  state.questions.splice(i,1);state.index=Math.min(i,state.questions.length-1);
 }
 else if(action==='duplicate'){if(state.questions.length>=40){setHint('Limite : 40 questions.');return;}state.questions.splice(i+1,0,{...structuredClone(q),id:newId()});state.index=i+1;}
 else if(action==='move-up'&&i>0){[state.questions[i-1],state.questions[i]]=[state.questions[i],state.questions[i-1]];state.index--;}
 else if(action==='move-down'&&i<state.questions.length-1){[state.questions[i+1],state.questions[i]]=[state.questions[i],state.questions[i+1]];state.index++;}
 paint();
}
function updateField(target,rerender){
 const q=current(),field=target.dataset.manualField;
 if(!q||!field)return;
 if(field==='points')q.points=Number(target.value);
 else if(field==='prompt'||field==='doc')q[field]=target.value;
 else QT().applyField(q,field,target.value);
 if(field==='type'||rerender)paint();
 else{
  $('real-manual-total').textContent=total().toLocaleString('fr-FR',{maximumFractionDigits:2})+' / 20 points conseillés';
  if(field==='doc')preview();
 }
}
function reset(){
 releaseAssets();state.questions=[blank()];state.index=0;state.editingId=null;state.sourceFile=null;state.pdf=null;state.docPage=1;state.docCount=0;state.sourceWordText='';
 $('manual-source-file').value='';$('manual-original-render').hidden=true;$('manual-original-render').replaceChildren();$('manual-doc-pages').hidden=true;
 setHint('Nouveau contrôle. Prépare les questions, puis enregistre un brouillon.');
 paint();
}
function edit(exam){
 if(!exam)return;
 releaseAssets();state.sourceFile=null;state.pdf=null;state.docPage=1;state.docCount=0;state.sourceWordText='';
 $('manual-source-file').value='';$('manual-original-render').replaceChildren();$('manual-original-render').hidden=true;$('manual-doc-pages').hidden=true;
 const isPublished=!!exam.published;
 state.editingId=isPublished?null:exam.id;
 state.questions=(Array.isArray(exam.content?.questions)?structuredClone(exam.content.questions):[]).map(q=>QT().initialize(q,q.type||'text'));
 if(isPublished)for(const question of state.questions)question.assetIds=[]; // Les captures de l'ancien contrôle publié ne sont pas copiées.
 if(!state.questions.length)state.questions=[blank()];
 state.index=0;
 $('exam-title').value=(exam.title||'')+(isPublished?' (nouvelle version)':'');
 $('exam-class').value=exam.class_id||'';
 $('exam-description').value=exam.content?.description||'';
 // Migration non destructive : anciens textes communs copiés vers les questions qui n'ont aucun document.
 const oldCommon=String(exam.content?.doc||'').trim();
 if(oldCommon)for(const q of state.questions)if(!String(q.doc||'').trim())q.doc=oldCommon.slice(0,5000);
 $('exam-level').value=exam.content?.level||'Bac professionnel';
 $('exam-chapter').value=exam.content?.chapter||'';
 $('exam-duration').value=Number(exam.content?.duration||60);
 const anti=exam.content?.antiCheat||{};
 const cfg={enabled:'exam-integrity-on',blockPaste:'exam-integrity-paste',blockCopy:'exam-integrity-copy',
 trackVisibility:'exam-integrity-tabs',warnStudent:'exam-integrity-warn',watermarkCapture:'exam-integrity-watermark'};
 for(const [key,id] of Object.entries(cfg))if(typeof anti[key]==='boolean')$(id).checked=anti[key];
 setHint(isPublished?'Le contrôle publié est préservé : création d’une nouvelle version en brouillon. Joins à nouveau son PDF/Word d’origine si nécessaire.':'Modification du contrôle existant en brouillon.');
 paint();
 location.hash='#exam-form';
 document.body.dataset.acadView='creer';
 $('prof-assessments')?.scrollIntoView({behavior:'smooth',block:'start'});
 if(!isPublished)loadExistingAssets(exam.id);
}
$('manual-add')?.addEventListener('click',()=>{
 if(state.questions.length>=40){setHint('Limite : 40 questions par contrôle.');return;}
 state.questions.splice(state.index+1,0,blank());state.index++;paint();
});
$('manual-prev')?.addEventListener('click',()=>{if(state.index>0){state.index--;paint();}});
$('manual-next')?.addEventListener('click',()=>{if(state.index<state.questions.length-1){state.index++;paint();}});
$('manual-question-editor')?.addEventListener('click',event=>{const el=event.target.closest('[data-manual-action]');if(el)runAction(el.dataset.manualAction);});
$('manual-question-editor')?.addEventListener('input',event=>{
 const t=event.target;if(t.dataset.manualField)updateField(t,false);
});
$('manual-question-editor')?.addEventListener('change',event=>{
 const t=event.target;
 if(t.dataset.manualField&&['type','correct','choices','tableRows','tableColumns','blanks','matchingLeft','matchingRight','correctIndices'].includes(t.dataset.manualField))updateField(t,t.dataset.manualField==='type');
});
function validated(){
 if(state.questions.length<1||state.questions.length>40)throw Error('Le contrôle doit contenir 1 à 40 questions.');
 return state.questions.map((q,i)=>{try{return QT().validate(q)}catch(e){throw Error('Question '+(i+1)+' : '+e.message)}});
}
$('manual-source-file').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{await previewFile(file)}catch(error){state.sourceFile=null;$('manual-original-render').textContent='';setHint('Document non chargé : '+error.message);}
});
$('manual-paste-image').addEventListener('click',async()=>{
 try{await pasteCaptureFromClipboard();}
 catch(error){setHint('Collage impossible : '+(error?.message||error));}
});
$('manual-capture-file').addEventListener('change',event=>{
 const image=event.target.files?.[0];event.target.value='';
 if(!image)return;
 try{addCapture(image,image.name);}catch(error){setHint('Image non ajoutée : '+(error?.message||error));}
});
$('manual-question-doc').addEventListener('input',event=>updateField(event.target,false));
document.querySelector('.real-manual-document').addEventListener('paste',pasteCaptureEvent);
$('manual-doc-prev').addEventListener('click',()=>{state.docPage=Math.max(1,state.docPage-1);renderOriginal().catch(error=>setHint(error.message));});
$('manual-doc-next').addEventListener('click',()=>{state.docPage=Math.min(state.docCount,state.docPage+1);renderOriginal().catch(error=>setHint(error.message));});
window.CORTEX_MANUAL_EDITOR={questions:validated,edit,reset,editingId:()=>state.editingId,
 markSaved:id=>{state.editingId=id;},uploadSource,uploadAssets,
 removedAssetIds:()=>[...state.removedIds],
 afterSave:()=>{$('exam-form').reset();reset();}};
reset();