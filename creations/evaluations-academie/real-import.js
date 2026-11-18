/* CORTEX ACADÉMIE — atelier PDF/Word réel : source, questions, extraits privés. */
import {api} from './coursework.js?v=2.0';
const by=id=>document.getElementById(id);
const bridge=()=>window.CORTEX_ACADEMY_BRIDGE;
const state={file:null,pdf:null,kind:'',name:'',pages:[],page:1,questions:[],id:null,assets:[],selected:null,
 published:false,busy:false,wordHtml:'',sourceCount:1};
const scripts={};
const script=url=>scripts[url]||(scripts[url]=new Promise((resolve,reject)=>{
 const s=document.createElement('script');s.src=url;s.async=true;s.onload=resolve;
 s.onerror=()=>{delete scripts[url];reject(Error('Lecteur documentaire indisponible. Vérifie ta connexion.'));};
 document.head.appendChild(s);
}));
function node(tag,cls,content){
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(content!==undefined)n.textContent=String(content);return n;
}
function msg(text,error=false){const el=by('ri-status');el.textContent=String(text||'');el.classList.toggle('error',error);}
function checkReady(){
 if(!bridge()?.teacher?.())throw Error('Connecte-toi à ton espace professeur.');
 if(state.busy)throw Error('Une opération est déjà en cours.');
}
async function operation(task){
 try{checkReady();state.busy=true;by('ri-save').disabled=true;await task();}
 catch(e){msg(e?.message||'Impossible de terminer cette opération.',true);}
 finally{state.busy=false;by('ri-save').disabled=state.published;}
}
function titleGuess(name){return String(name||'Contrôle').replace(/\.(pdf|docx)$/i,'').replace(/[_-]+/g,' ').trim().slice(0,180);}
function qId(){return 'q-'+crypto.randomUUID().slice(0,22);}
function emptyQuestion(page=1){return {id:qId(),prompt:'',type:'text',points:1,page,assetIds:[],choices:[],correct:0};}
/* Détection prudente de questions : numéro + consigne, pas les tableaux numérotés. */
function extractQuestions(pages){
 const out=[],seen=new Set(),max=40;
 const normalize=t=>String(t||'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
 const marker=/^(?:(?:question|q)\s*\.?\s*)?(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:[).:\-\u2013\u2014]|\s+[).:\-\u2013\u2014])\s*(.*)$/i;
 const lone=/^(?:(?:question|q)\s*\.?\s*)?(\d{1,2})\s*[).:\-\u2013\u2014]?\s*$/i;
 const stop=/^(?:documents?\s*(?:n[°ºo.]?\s*)?\d+|partie\s*\d+|sources?\s*:|bibliographie|annexe|bar[èe]me|comp[ée]tence|objectif|dur[ée]e|consignes?\s*g[ée]n[ée]rales?|page\s+\d+|chapitre\s+\d+|nom\s*:|pr[ée]nom\s*:|classe\s*:|date\s*:|correction\s*:)/i;
 const action=/^(?:[àa]\s*(?:partir|l['’]aide)|en\s+(?:utilisant|vous\s+aidant)|selon|dans\s+le\s+document|d['’]apr[èe]s|quelle?s?\b|quels?\b|comment\b|pourquoi\b|combien\b|que\b|qui\b|o[uù]\b|citer\b|relever\b|indiquer\b|nommer\b|identifier\b|pr[ée]ciser\b|expliquer\b|justifier\b|d[ée]crire\b|calculer\b|compl[ée]ter\b|proposer\b|choisir\b|classer\b|associer\b|cocher\b|tracer\b|d[ée]terminer\b|formuler\b|pr[ée]senter\b|analyser\b|comparer\b|d[ée]finir\b|donner\b|entourer\b|souligner\b|r[ée]diger\b|mettre\b|exprimer\b|[ée]num[ée]rer\b|transformer\b|caract[ée]riser\b|rep[ée]rer\b|[ée]tablir\b|lister\b)/i;
 const likely=t=>t.length>=10&&(action.test(t)||/[?？]\s*$/.test(t)||/\b(?:citer|relever|indiquer|calculer|expliquer|identifier|compl[ée]ter|proposer|justifier|comparer|d[ée]finir|pourquoi|comment)\b/i.test(t.slice(0,110)));
 const pointsFrom=t=>{
  const m=t.match(/(?:\(|\[|\b)(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:pts?|points?)\b\s*[)\]]?\s*$/i);
  if(!m)return null;
  const x=Number(m[1].replace(',','.'));return x>0&&x<=20?x:null;
 };
 const removePoints=t=>normalize(t.replace(/\s*(?:\(|\[)?\d{1,2}(?:[.,]\d{1,2})?\s*(?:pts?|points?)(?:\)|\])?\s*$/i,''));
 for(let pi=0;pi<pages.length&&out.length<max;pi++){
  const lines=String(pages[pi]||'').split(/\r?\n/).map(normalize).filter(Boolean);
  for(let i=0;i<lines.length&&out.length<max;i++){
   let line=lines[i];if(stop.test(line))continue;
   let m=line.match(marker)||line.match(/^(?:Question|Q)\s*(\d{1,2}(?:[.,]\d{1,2})?)\s+(.+)$/i),num,rest,numberOnly=false;
   if(m){num=m[1];rest=m[2];}
   else if(lone.test(line)){num=line.match(lone)[1];rest='';numberOnly=true;}
   else continue;
   if(!num||Number(num.split(/[.,]/)[0])>40)continue;
   if(!rest){
    const next=lines[i+1]||'';
    if(!next||stop.test(next)||marker.test(next)||!likely(next))continue;
    rest=next;i++;numberOnly=true;
   }
   if(stop.test(rest))continue;
   let prompt=rest,rawParts=[rest],added=0;
   while(i+1<lines.length&&added<3){
    const next=lines[i+1];
    if(marker.test(next)||stop.test(next)||lone.test(next)||/^\s*(?:\d+\s*(?:pts?|points?)|total\s*[:=]|document\s*[:=])/i.test(next))break;
    if(prompt.length+next.length>800||next.length>220)break;
    if(/[?!]\s*$/.test(prompt))break;
    if(/[.]\s*$/.test(prompt)&&likely(prompt))break;
    if((!/[.?!]\s*$/.test(prompt)&&next.length<140&&!/^\s*(?:\d+\s*(?:pts?|points?)|[A-ZÀ-Ý][A-ZÀ-Ý ]{6,})\s*$/.test(next))||!likely(prompt)||/\b(?:puis|et|de|du|des|sur|pour|[àa])\s*$/i.test(prompt)||/[,:;]\s*$/.test(prompt)){
     rawParts.push(next);prompt+=' '+next;i++;added++;
    }else break;
   }
   prompt=removePoints(prompt);if(!likely(prompt)||prompt.length>1200)continue;
   const normalized=prompt.toLocaleLowerCase('fr').replace(/\s+/g,' ');
   if(seen.has(normalized))continue;seen.add(normalized);
   const raw=rawParts.join(' ');
   out.push({...emptyQuestion(pi+1),prompt,points:pointsFrom(raw)||1,detectedNo:num,detected:true});
  }
 }
 return out;
}
async function readPdf(file){
 await script('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
 if(!window.pdfjsLib)throw Error('Lecture PDF indisponible.');
 window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 if(pdf.numPages>35)throw Error('Ce mode accepte 35 pages par contrôle au maximum.');
 const pages=[];
 for(let i=1;i<=pdf.numPages;i++){
  msg('Analyse du PDF, page '+i+' sur '+pdf.numPages+'…');
  const page=await pdf.getPage(i),items=(await page.getTextContent()).items.filter(x=>typeof x.str==='string'&&x.str.trim());
  const lines=[];
  for(const item of items){
   const y=item.transform?.[5]||0,x=item.transform?.[4]||0;
   let line=lines.find(z=>Math.abs(z.y-y)<3);
   if(!line){line={y,parts:[]};lines.push(line);}
   line.parts.push({x,value:item.str});
  }
  lines.sort((a,b)=>b.y-a.y);
  pages.push(lines.map(l=>l.parts.sort((a,b)=>a.x-b.x).map(x=>x.value).join(' ')).join('\n'));
 }
 return {pdf,pages,wordHtml:''};
}
async function readWord(file){
 await script('https://unpkg.com/mammoth@1.10.0/mammoth.browser.min.js');
 if(!window.mammoth)throw Error('Lecture Word indisponible.');
 const buf=await file.arrayBuffer();
 const [raw,html]=await Promise.all([window.mammoth.extractRawText({arrayBuffer:buf.slice(0)}),
 window.mammoth.convertToHtml({arrayBuffer:buf.slice(0)})]);
 const doc=document.createElement('div');doc.innerHTML=html.value||'';
 doc.querySelectorAll('script,style,iframe,object,form,embed').forEach(x=>x.remove());
 doc.querySelectorAll('*').forEach(n=>{
  for(const a of [...n.attributes]){
   if(/^on/i.test(a.name)||['href','src','srcset','style'].includes(a.name)&&!(a.name==='src'&&/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(a.value)&&a.value.length<2500000))n.removeAttribute(a.name);
  }
 });
 return {pdf:null,pages:[raw.value||''],wordHtml:doc.innerHTML};
}
async function inspect(file){
 if(!file)throw Error('Choisis un fichier PDF ou Word (.docx).');
 if(file.size<1||file.size>8*1024*1024)throw Error('Le contrôle doit faire entre 1 octet et 8 Mo.');
 const kind=(file.name.split('.').pop()||'').toLowerCase();
 if(!['pdf','docx'].includes(kind))throw Error('Formats acceptés : PDF et Word .docx.');
 msg('Lecture du document original…');
 const read=kind==='pdf'?await readPdf(file):await readWord(file);
 state.file=file;state.pdf=read.pdf;state.pages=read.pages;state.wordHtml=read.wordHtml;state.kind=kind;
 state.name=file.name;state.page=1;state.sourceCount=read.pages.length;state.selected=null;
 return read;
}
function clearEditor(){
 state.file=null;state.pdf=null;state.kind='';state.name='';state.pages=[];state.page=1;state.questions=[];
 for(const asset of state.assets)if(asset.previewUrl)URL.revokeObjectURL(asset.previewUrl);
 state.id=null;state.assets=[];state.selected=null;state.wordHtml='';state.published=false;state.sourceCount=1;
 for(const inputId of ['ri-title','ri-class','ri-description'])by(inputId).disabled=false;
 by('ri-save').disabled=false;
 by('ri-editor').hidden=true;by('ri-file').value='';
 by('ri-ai-documents')?.replaceChildren();if(by('ri-ai-documents'))by('ri-ai-documents').hidden=true;
 by('ri-title').value='';by('ri-description').value='';
 by('ri-canvas').replaceChildren();by('ri-assets').replaceChildren();msg('');
}
function populateClasses(selected){
 const select=by('ri-class');select.replaceChildren();
 const option=node('option','','Sans classe');option.value='';select.append(option);
 for(const c of bridge()?.classes?.()||[]){
  const op=node('option','',c.display_name+' · '+c.code);op.value=c.id;select.append(op);
 }
 select.value=selected||'';
}
function renderQuestions(){
 const rows=by('ri-questions');rows.replaceChildren();
 const target=by('ri-target-question'),before=target.value;target.replaceChildren();
 state.questions.forEach((q,i)=>{
  const item=node('article','ri-question ri-question-drop');
  item.dataset.questionId=q.id;
  item.addEventListener('dragover',ev=>{
   if(state.published||!Array.from(ev.dataTransfer?.types||[]).includes('application/x-cortex-capture'))return;
   ev.preventDefault();ev.dataTransfer.dropEffect='copy';item.classList.add('ri-drop-active');
  });
  item.addEventListener('dragleave',ev=>{if(!item.contains(ev.relatedTarget))item.classList.remove('ri-drop-active');});
  item.addEventListener('drop',ev=>{
   ev.preventDefault();item.classList.remove('ri-drop-active');
   const id=ev.dataTransfer?.getData('application/x-cortex-capture')||ev.dataTransfer?.getData('text/plain');
   if(id)operation(()=>attachCapture(id,q.id));
  });
  const header=node('div','ri-q-header');
  const linked=(q.assetIds||[]).length+state.assets.filter(a=>a.pending&&a.questionId===q.id).length;
  header.append(node('strong','','QUESTION '+(i+1)),node('small','',linked?linked+' document(s) associé(s)':'Glisse une capture ici ⇩'));
  const remove=node('button','ri-action subtle','Supprimer');remove.type='button';remove.disabled=state.published||state.questions.length<2;
  remove.onclick=()=>{state.questions.splice(i,1);renderQuestions();};
  header.append(remove);item.append(header);
  const ta=node('textarea','ri-question-text');ta.value=q.prompt;ta.rows=2;ta.maxLength=1200;
  ta.placeholder='Énoncé de la question';ta.disabled=state.published;ta.setAttribute('aria-label','Énoncé de la question '+(i+1));
  ta.oninput=()=>{q.prompt=ta.value;};
  item.append(ta);
  const docLabel=node('label','ri-linked-document-label');
  docLabel.append(node('strong','','Document associé à la question (modifiable)'));
  const docArea=node('textarea','ri-question-text ri-linked-document');
  docArea.value=String(q.doc||'');docArea.rows=3;docArea.maxLength=5000;
  docArea.placeholder='Extrait documentaire ou référence à fournir aux élèves (facultatif).';
  docArea.disabled=state.published;
  docArea.oninput=()=>{q.doc=docArea.value;};
  docLabel.append(docArea);item.append(docLabel);
  const metadata=node('div','ri-q-meta');
  const type=node('select','ri-select');
  const types=window.CORTEX_QUESTION_TYPES;
  types.TYPES.forEach(([key,label])=>{
   const option=node('option','',label);option.value=key;type.append(option);
  });
  type.value=types.type(q);type.disabled=state.published;
  type.onchange=()=>{types.initialize(q,type.value);renderQuestions();};
  const pts=node('input','ri-number');pts.type='number';pts.min='0';pts.max='20';pts.step='0.25';pts.value=q.points;
  pts.disabled=state.published;pts.setAttribute('aria-label','Barème question '+(i+1));
  pts.oninput=()=>{q.points=Number(pts.value);updateTotal();};
  const page=node('select','ri-select');page.disabled=state.published;
  for(let pn=1;pn<=Math.max(1,state.sourceCount);pn++){
   const op=node('option','','Document page '+pn);op.value=String(pn);page.append(op);
  }
  page.value=String(q.page||1);
  page.onchange=()=>{q.page=Number(page.value);state.page=q.page;paint().catch(e=>msg(e.message,true));};
  metadata.append(node('label','','Type de réponse'),type,node('label','','Points'),pts,node('label','','Source'),page);
  if(q.pointsToVerify)metadata.append(node('small','ri-subtle','⚠ Barème provisoire : 1 pt par défaut. À vérifier.'));
  item.append(metadata);
  const drop=node('div','ri-question-dropzone','⇩ Glisse un extrait ici, ou sélectionne cette question dans la banque documentaire.');
  drop.setAttribute('aria-label','Déposer un extrait sur la question '+(i+1));
  if(state.published)drop.hidden=true;
  item.append(drop);
  const attached=state.assets.filter(a=>(q.assetIds||[]).includes(a.id)||(a.pending&&a.questionId===q.id));
  if(attached.length){
   const dock=node('div','ri-question-docs');
   for(const a of attached){
    const fig=node('figure','ri-question-doc'),pic=node('img');
    pic.src=a.previewUrl||a.url||'';pic.alt=a.name;
    fig.append(pic,node('figcaption','',a.name));dock.append(fig);
   }
   item.append(dock);
  }
  const extra=node('div','ri-question-extra');
  extra.innerHTML=types.editorExtra(q,i,'import');
  if(state.published)extra.querySelectorAll('textarea,input,select').forEach(x=>x.disabled=true);
  extra.addEventListener('input',event=>{
   const key=event.target.dataset.riField;
   if(key)types.applyField(q,key,event.target.value);
  });
  extra.addEventListener('change',event=>{
   const key=event.target.dataset.riField;
   if(key)types.applyField(q,key,event.target.value);
  });
  item.append(extra);
  rows.append(item);
  const op=node('option','','Q'+(i+1)+' · '+(q.prompt||'Question à renseigner').slice(0,55));
  op.value=q.id;target.append(op);
 });
 target.value=state.questions.some(q=>q.id===before)?before:(state.questions[0]?.id||'');
 by('ri-add-question').disabled=state.published;
 updateTotal();
 renderAssets();
}
function updateTotal(){
 const total=state.questions.reduce((s,q)=>s+(Number(q.points)||0),0);
 by('ri-total').textContent=state.questions.length+' question(s) · '+total.toLocaleString('fr-FR',{maximumFractionDigits:2})+' points';
}
function renderAssets(){
 const bank=by('ri-assets');bank.replaceChildren();
 if(by('ri-bank-count'))by('ri-bank-count').textContent=state.assets.length+' capture(s)';
 if(!state.assets.length){
  bank.append(node('p','ri-subtle','Encadre un passage sur le document : sa capture apparaît ici, prête à être glissée sur une question.'));
  return;
 }
 for(const a of state.assets){
  const row=node('div','ri-asset-row ri-asset-drag');row.draggable=!state.published;
  row.addEventListener('dragstart',e=>{
   if(state.published){e.preventDefault();return;}
   e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('application/x-cortex-capture',a.id);
   e.dataTransfer.setData('text/plain',a.id);row.classList.add('ri-dragging');
  });
  row.addEventListener('dragend',()=>row.classList.remove('ri-dragging'));
  const img=node('img','ri-asset-thumb');img.src=a.previewUrl||a.url||'';
  img.alt='Capture : '+a.name;img.draggable=false;
  const info=node('div','ri-asset-desc'),qIndex=state.questions.findIndex(q=>q.id===a.questionId||(q.assetIds||[]).includes(a.id));
  info.append(node('strong','',a.name),node('small','',`Page ${a.page||1} · ${qIndex>=0?'Question '+(qIndex+1):'À associer'} · ${a.pending?'Capture locale':'Enregistrée'}`));
  const actions=node('div','ri-asset-buttons');
  const add=node('button','ri-action subtle','＋ Ajouter à la question');
  add.type='button';add.disabled=state.published;
  add.onclick=()=>operation(()=>attachCapture(a.id,by('ri-target-question').value));
  const remove=node('button','ri-action subtle','Supprimer');remove.type='button';remove.disabled=state.published;
  remove.onclick=()=>operation(async()=>{
   if(a.pending){
    if(a.previewUrl)URL.revokeObjectURL(a.previewUrl);
    state.assets=state.assets.filter(item=>item.id!==a.id);
    msg('Capture locale supprimée.');
   }else{
    await api('teacher_asset_delete',{assessment_id:state.id,asset_id:a.id},null,true);
    state.assets=state.assets.filter(item=>item.id!==a.id);
    for(const q of state.questions)q.assetIds=(q.assetIds||[]).filter(id=>id!==a.id);
    await bridge()?.refresh?.();msg('Capture supprimée du stockage privé.');
   }
   renderQuestions();
  });
  actions.append(add,remove);row.append(img,info,actions);bank.append(row);
 }
}
async function attachCapture(id,questionId){
 if(state.published)throw Error('Contrôle publié : modification impossible.');
 const a=state.assets.find(x=>x.id===id),q=state.questions.find(x=>x.id===questionId);
 if(!a||!q)throw Error('Capture ou question introuvable.');
 if(a.pending){
  if(!state.id){a.questionId=q.id;renderQuestions();msg('Capture affectée. Enregistre le contrôle pour la synchroniser.');return;}
  const known=bridge()?.exams?.()?.find(e=>e.id===state.id);
  if(known&&!known.content?.questions?.some(item=>item.id===q.id)){
   // Une nouvelle question doit d'abord exister en base pour recevoir une capture.
   await save();
  }
  const file=new File([a.blob],a.name,{type:a.blob.type||'image/jpeg'});
  const result=await api('teacher_asset_upload',{assessment_id:state.id,question_id:q.id,page:a.page},file,true);
  if(a.previewUrl)URL.revokeObjectURL(a.previewUrl);
  state.assets[state.assets.indexOf(a)]={...result.asset,pending:false};
  q.assetIds=[...new Set([...(q.assetIds||[]),result.asset.id])];
  await bridge()?.refresh?.();renderQuestions();
  msg('Capture associée et enregistrée dans Supabase pour la question '+(state.questions.indexOf(q)+1)+'.');
  return;
 }
 if((q.assetIds||[]).includes(a.id)){msg('Capture déjà liée à cette question.');return;}
 q.assetIds=[...(q.assetIds||[]),a.id];
 try{await save();renderQuestions();msg('Capture associée à la question '+(state.questions.indexOf(q)+1)+'.');}
 catch(error){q.assetIds=q.assetIds.filter(x=>x!==a.id);renderQuestions();throw error;}
}
function selectPage(dir){
 state.page=Math.max(1,Math.min(state.sourceCount,state.page+dir));paint().catch(e=>msg(e.message,true));
}
function showSelection(){
 const sel=by('ri-selection'),r=state.selected;
 if(!r){sel.hidden=true;return;}
 sel.hidden=false;sel.style.left=(100*r.x)+'%';sel.style.top=(100*r.y)+'%';
 sel.style.width=(100*r.w)+'%';sel.style.height=(100*r.h)+'%';
}
function relativePosition(ev){
 const r=by('ri-source-page').getBoundingClientRect();
 return {x:Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width)),
 y:Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height))};
}
function attachSelection(){
 const wrap=by('ri-source-page');let origin=null;
 wrap.onpointerdown=e=>{
  if(state.published||state.busy||(e.pointerType==='mouse'&&e.button!==0))return;
  origin={point:relativePosition(e),pointerId:e.pointerId};
  state.selected=null;showSelection();wrap.setPointerCapture?.(e.pointerId);e.preventDefault();
 };
 wrap.onpointermove=e=>{
  if(!origin||origin.pointerId!==e.pointerId)return;
  const end=relativePosition(e),start=origin.point;
  state.selected={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),
   w:Math.abs(start.x-end.x),h:Math.abs(start.y-end.y)};showSelection();
 };
 wrap.onpointerup=e=>{
  if(!origin||origin.pointerId!==e.pointerId)return;
  const start=origin.point,end=relativePosition(e);origin=null;
  state.selected={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),
   w:Math.abs(start.x-end.x),h:Math.abs(start.y-end.y)};
  if(state.selected.w<0.018||state.selected.h<0.018){state.selected=null;showSelection();return;}
  operation(()=>captureToBank(false));
 };
 wrap.onpointercancel=()=>{origin=null;state.selected=null;showSelection();};
}
async function paint(){
 const canvas=by('ri-canvas'),wrap=by('ri-source-page'),plain=by('ri-text-preview');
 const previous=state.page;
 by('ri-current-page').textContent='Page '+state.page+' / '+state.sourceCount;
 by('ri-prev').disabled=state.page===1;by('ri-next').disabled=state.page===state.sourceCount;
 plain.value=state.pages[state.page-1]||'Aucun texte reconnu. Les schémas restent disponibles dans le document original.';
 canvas.replaceChildren();state.selected=null;showSelection();
 if(!state.file)return;
 if(state.kind==='pdf'&&state.pdf){
  const page=await state.pdf.getPage(state.page);
  if(previous!==state.page)return;
  const basic=page.getViewport({scale:1});
  const targetScale=Math.min(2.1,Math.max(1.25,(window.devicePixelRatio||1)*0.85));
  const vp=page.getViewport({scale:targetScale});
  const c=node('canvas','ri-pdf-page');
  c.width=Math.round(vp.width);c.height=Math.round(vp.height);
  c.style.aspectRatio=basic.width+' / '+basic.height;
  c.style.width='100%';c.style.height='auto';
  canvas.append(c);
  await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
 }else{
  const doc=node('div','ri-word-page');doc.innerHTML=state.wordHtml;
  canvas.append(doc);
 }
 wrap.style.touchAction=!state.published?'none':'auto';
 
 by('ri-full-page').disabled=state.published;
}
async function originalCanvas(){
 if(state.kind==='pdf'){
  const result=by('ri-canvas').querySelector('canvas');
  if(!result)throw Error('Cette page PDF n’est pas prête.');
  return result;
 }
 await script('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
 if(!window.html2canvas)throw Error('Capture Word indisponible.');
 const target=by('ri-canvas').querySelector('.ri-word-page');
 if(!target)throw Error('Le document Word n’est pas prêt.');
 return await window.html2canvas(target,{backgroundColor:'#fff',scale:1.5,useCORS:false,logging:false});
}
function addBankBlob(blob,name,page){
 if(state.assets.length>=60)throw Error('Limite de 60 captures par contrôle.');
 if(!['image/png','image/jpeg','image/webp'].includes(blob.type))throw Error('Format de capture non pris en charge.');
 if(blob.size>8*1024*1024)throw Error('Capture trop lourde (8 Mo maximum).');
 const image={id:'local-'+crypto.randomUUID(),name:name.slice(0,120),page,questionId:null,
  previewUrl:URL.createObjectURL(blob),blob,pending:true};
 state.assets.push(image);state.selected=null;showSelection();renderQuestions();
 msg('Capture créée. Glisse-la sur une question, ou sélectionne la question puis clique sur « Ajouter ».');
 by('ri-assets').scrollIntoView({block:'nearest',behavior:'smooth'});
}
async function captureToBank(full=false){
 if(state.published)throw Error('Ce contrôle publié est en lecture seule.');
 const source=await originalCanvas(),r=full?{x:0,y:0,w:1,h:1}:state.selected;
 if(!r)throw Error('Encadre un passage avec le doigt ou la souris pour le capturer.');
 const sx=Math.floor(r.x*source.width),sy=Math.floor(r.y*source.height);
 const sw=Math.min(source.width-sx,Math.ceil(r.w*source.width));
 const sh=Math.min(source.height-sy,Math.ceil(r.h*source.height));
 if(sw<15||sh<15)throw Error('Zone sélectionnée trop petite.');
 const scale=Math.min(1,1700/Math.max(sw,sh));
 const canvas=node('canvas');
 canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
 canvas.getContext('2d').drawImage(source,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Capture impossible.')),'image/jpeg',0.88));
 addBankBlob(blob,'Extrait_page_'+state.page+'_'+(state.assets.length+1)+'.jpg',state.page);
}
async function importImage(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choisis une image PNG, JPEG ou WebP.');
 addBankBlob(file,file.name||'Capture importée',state.page);
}
async function pasteImage(){
 if(!navigator.clipboard?.read)throw Error('Le collage d’image n’est pas autorisé par ce navigateur. Utilise « Importer une image ».');
 const items=await navigator.clipboard.read();
 for(const item of items)for(const type of item.types){
  if(type.startsWith('image/')){
   const blob=await item.getType(type);
   return importImage(new File([blob],'Capture_collee.'+(blob.type==='image/jpeg'?'jpg':blob.type.split('/')[1]),{type:blob.type}));
  }
 }
 throw Error('Aucune image trouvée dans le presse-papiers.');
}
function validatedQuestions(){
 if(state.questions.length<1||state.questions.length>40)throw Error('Le contrôle doit comporter 1 à 40 questions.');
 return state.questions.map((q,i)=>{
  const page=Number(q.page||1);
  if(!Number.isInteger(page)||page<1||page>state.sourceCount)throw Error('Page source incorrecte pour la question '+(i+1)+'.');
  try{return window.CORTEX_QUESTION_TYPES.validate(q);}
  catch(error){throw Error('Question '+(i+1)+' : '+error.message);}
 });
}
async function save(){
 const teacher=bridge()?.teacher?.(),client=bridge()?.client?.();
 if(!teacher||!client)throw Error('Compte professeur indisponible.');
 const title=by('ri-title').value.trim(),description=by('ri-description').value.trim(),class_id=by('ri-class').value||null;
 if(!title||title.length>180||description.length>12000)throw Error('Renseigne un titre et des consignes valides.');
 const questions=validatedQuestions();
 if(state.published)throw Error('Ce contrôle est publié et ne peut plus être modifié dans cet atelier.');
 const sourcePages=state.pages.slice(0,35).map(s=>String(s||'').slice(0,400));
 const payload={title,description,class_id,questions,sourceType:state.kind,sourceName:state.name,sourcePageCount:state.sourceCount,sourcePages};
 msg('Enregistrement du contrôle et de son document…');
 if(!state.id){
  if(!state.file)throw Error('Choisis d’abord un PDF ou Word.');
  const antiCheat={enabled:false,blockPaste:true,blockCopy:true,trackVisibility:true,warnStudent:true,watermarkCapture:true};
  const {data,error}=await client.from('cortex_teacher_assessments').insert({
   teacher_id:teacher,title,class_id,published:false,
   content:{description,questions,sourceType:state.kind,sourceName:state.name,sourcePageCount:state.sourceCount,sourcePages,assets:[],antiCheat}
  }).select('id').single();
  if(error||!data)throw Error(error?.message||'Création du contrôle refusée.');
  state.id=data.id;
  try{await api('teacher_upload',{assessment_id:state.id},state.file,true);}
  catch(err){
   await client.from('cortex_teacher_assessments').delete().eq('id',state.id).eq('teacher_id',teacher);
   state.id=null;throw err;
  }
 }else await api('teacher_document_update',{assessment_id:state.id,...payload},null,true);
 // Les captures préparées avant l'enregistrement sont synchronisées après la création du sujet.
 const pending=state.assets.filter(a=>a.pending&&state.questions.some(q=>q.id===a.questionId));
 const failures=[];
 for(const a of pending){
  try{
   const file=new File([a.blob],a.name,{type:a.blob.type||'image/jpeg'});
   const result=await api('teacher_asset_upload',
    {assessment_id:state.id,question_id:a.questionId,page:a.page},file,true);
   if(a.previewUrl)URL.revokeObjectURL(a.previewUrl);
   state.assets[state.assets.indexOf(a)]={...result.asset,pending:false};
   const q=state.questions.find(q=>q.id===a.questionId);
   if(q)q.assetIds=[...new Set([...(q.assetIds||[]),result.asset.id])];
  }catch(error){failures.push(a.name+' : '+(error?.message||'échec'));}
 }
 const unlinked=state.assets.filter(a=>a.pending&&!a.questionId).length;
 msg(failures.length?
  'Contrôle enregistré. Certaines captures ne sont pas synchronisées : '+failures.join(' ; '):
  'Contrôle enregistré et '+(pending.length)+' capture(s) synchronisée(s).'+
   (unlinked?' '+unlinked+' capture(s) restent à associer à une question.':''));
 by('ri-save').textContent='Enregistrer les modifications';
 await bridge().refresh();await paint();
 renderQuestions();
}
function displayAiDocuments(docs){
 const holder=by('ri-ai-documents');if(!holder)return;
 holder.replaceChildren();
 if(!Array.isArray(docs)||!docs.length){holder.hidden=true;return;}
 holder.hidden=false;
 holder.append(node('strong','','✦ Albert IA · '+docs.length+' document(s) repéré(s)'));
 holder.append(node('p','ri-subtle','Titres et pages suggérés. Ouvre l’original pour vérifier chaque association.'));
 for(const d of docs){
  const button=node('button','ri-action secondary',String(d.title||'Document')+' · page '+Number(d.page||1)+' →');
  button.type='button';
  button.onclick=()=>{
   state.page=Math.max(1,Math.min(state.sourceCount,Number(d.page)||1));
   paint().catch(err=>msg(err?.message||'Page indisponible.',true));
  };
  holder.append(button);
 }
}
async function initial(file,options={}){
 const useAlbert=options.ai===true;
 if(useAlbert&&!window.confirm(
  '✦ ALBERT IA — LECTURE DES PAGES ORIGINALES\n\n'+
  'Les images des pages PDF/Word et le texte extrait seront envoyés à Albert via Supabase. Tableaux, graphiques et schémas pourront être analysés. Le document original restera local avant l’enregistrement.\n\n'+
  'N’envoie pas de données personnelles d’élèves sans autorisation et base légale adaptées. Les propositions devront être vérifiées.\n\nContinuer ?'
 ))return;
 const progress=useAlbert?window.CORTEX_ALBERT_IMPORT.progress('Construire l’atelier avec Albert IA'):null;
 await operation(async()=>{
  clearEditor();
  progress?.update('Ouverture et lecture des pages originales…');
  await inspect(file);
  const localQuestions=extractQuestions(state.pages);
  let aiDraft=null,aiError=null;
  if(useAlbert){
   try{
    const client=bridge()?.client?.();
    const {data,error}=await client.auth.getSession();
    if(error||!data?.session?.access_token)throw Error('Session professeur expirée. Reconnecte-toi.');
    if(progress.signal.aborted)throw Error('Analyse annulée.');
    aiDraft=await window.CORTEX_ALBERT_IMPORT.analyze(state.pages,{
      file,mode:'academy',accessToken:data.session.access_token,
      progress,signal:progress.signal
    });
   }catch(err){aiError=err;console.warn('Albert Académie:',String(err));}
  }
  const questions=aiDraft?window.CORTEX_ALBERT_IMPORT.buildQuestions(aiDraft,{pages:state.pages}):localQuestions;
  state.questions=questions.length?questions:[emptyQuestion()];
  by('ri-title').value=titleGuess(file.name);
  by('ri-description').value='Lire attentivement les documents et justifier les réponses à partir des sources fournies.';
  populateClasses();
  by('ri-upload-chooser').hidden=true;
  by('ri-editor').hidden=false;by('ri-save').textContent='Enregistrer le contrôle et son document';
  displayAiDocuments(aiDraft?.documents||[]);
  if(aiDraft){
   try{
    progress.update('Albert a répondu : génération des extraits originaux à associer…',
      state.sourceCount,state.sourceCount);
    const made=await window.CORTEX_ALBERT_IMPORT.makeCaptures(file,aiDraft,state.questions,{
      max:16,signal:progress.signal,
      onProgress:txt=>progress.update(txt,state.sourceCount,state.sourceCount)
    });
    for(const capture of made.captures){
     const question=state.questions[capture.questionIndex];if(!question)continue;
     if(state.assets.length>=60)break;
     state.assets.push({
      id:'local-albert-'+crypto.randomUUID(),name:capture.name.slice(0,120),
      page:capture.page,questionId:question.id,
      previewUrl:URL.createObjectURL(capture.blob),blob:capture.blob,pending:true
     });
    }
    if(made.skipped)msg(made.skipped+' capture(s) à vérifier manuellement.');
   }catch(err){
    msg('Les questions ont été préparées, mais certaines captures devront être associées manuellement : '+String(err?.message||err),true);
   }
  }
  await paint();renderQuestions();
  updateDetectionHint(state.questions.length);
  if(aiDraft){
   const message='Albert : '+state.questions.length+' question(s), '+(aiDraft.documents||[]).length+
    ' document(s) et '+state.assets.length+' capture(s) préparés. Tu peux tout corriger avant d’enregistrer.';
   msg(message+(aiDraft.warnings?.length?' À vérifier : '+aiDraft.warnings.join(' ; '):''));
   progress.success(message);
  }else if(useAlbert){
   const message='Analyse Albert interrompue ou refusée : '+String(aiError?.message||'Erreur de service')+
    '. Le document original et la détection locale des questions sont disponibles dans l’atelier classique.';
   msg(message,true);progress.failure(message);
  }else msg('Atelier classique : document de '+state.sourceCount+' page(s) chargé, '+
   state.questions.length+' question(s) proposées. Vérifie les barèmes avant enregistrement.');
 });
 if(progress&&progress.element.querySelector('.cai-done')?.hidden)
  progress.failure(by('ri-status')?.textContent||'La préparation du document a échoué.');
}
async function openExisting(id){
 try{
  checkReady();state.busy=true;clearEditor();
  const exam=(bridge()?.exams?.()||[]).find(e=>e.id===id);
  if(!exam)throw Error('Contrôle introuvable dans ton compte.');
  const doc=await api('teacher_file',{assessment_id:id,kind:'subject'},null,true);
  if(!doc?.url)throw Error('Le document source est introuvable.');
  msg('Récupération du document privé du contrôle…');
  const response=await fetch(doc.url,{cache:'no-store'});
  if(!response.ok)throw Error('Impossible de récupérer le PDF/Word original.');
  const file=new File([await response.blob()],doc.name||exam.content?.sourceName||'Document.pdf',{
   type:response.headers.get('content-type')||'application/pdf'
  });
  await inspect(file);
  state.id=id;state.published=!!exam.published;
  const questions=Array.isArray(exam.content?.questions)?exam.content.questions:[];
  state.questions=questions.map(q=>({...q,assetIds:Array.isArray(q.assetIds)?q.assetIds:[],choices:Array.isArray(q.choices)?q.choices:[],correct:Number(q.correct||0),page:Number(q.page||1),type:q.type||'text'}));
  if(!state.questions.length)state.questions=[emptyQuestion()];
  by('ri-title').value=exam.title||titleGuess(file.name);
  by('ri-description').value=exam.content?.description||'';
  populateClasses(exam.class_id);
  by('ri-editor').hidden=false;
  by('ri-save').textContent='Enregistrer les modifications';by('ri-save').disabled=state.published;
  by('ri-title').disabled=state.published;by('ri-class').disabled=state.published;by('ri-description').disabled=state.published;
  by('ri-upload-chooser').hidden=true;
  const assets=await api('teacher_asset_list',{assessment_id:id},null,true);
  state.assets=assets.assets||[];
  await paint();renderQuestions();updateDetectionHint(state.questions.length);
  msg(state.published?'Contrôle publié : consultation uniquement. Les documents et réponses des élèves sont préservés.':'Atelier chargé. Tu peux modifier les questions et associer des captures au contrôle.');
  location.hash='#acad-import-workspace';document.body.dataset.acadView='import';
  by('acad-import-workspace').scrollIntoView({block:'start',behavior:'smooth'});
 }catch(e){msg(e?.message||'Ouverture impossible.',true);}
 finally{state.busy=false;}
}
by('ri-file').addEventListener('change',event=>{
 const file=event.target.files?.[0];if(file)msg('Document sélectionné : '+file.name+'. Choisis « Atelier classique » ou « Préparer avec Albert IA ».');
});
by('ri-open-classic').addEventListener('click',()=>{const file=by('ri-file').files?.[0];if(!file)return msg('Choisis un PDF ou Word.',true);initial(file);});
by('ri-open-albert').addEventListener('click',()=>{const file=by('ri-file').files?.[0];if(!file)return msg('Choisis un PDF ou Word.',true);initial(file,{ai:true});});
by('ri-clear-selection').addEventListener('click',()=>{by('ri-file').value='';msg('Choisis un autre document.');by('ri-file').click();});
by('ri-change-file').addEventListener('click',()=>{
 if(!window.confirm('Changer de document ? Les modifications non enregistrées dans cet atelier seront abandonnées. Le contrôle déjà sauvegardé dans Supabase restera intact.'))return;
 clearEditor();by('ri-upload-chooser').hidden=false;
 by('ri-file').click();
});
by('ri-prev').addEventListener('click',()=>selectPage(-1));
by('ri-next').addEventListener('click',()=>selectPage(1));
by('ri-add-question').addEventListener('click',()=>{
 if(state.questions.length>=40){msg('Maximum 40 questions.',true);return;}
 state.questions.push(emptyQuestion(state.page));renderQuestions();
});
by('ri-new').addEventListener('click',()=>{clearEditor();by('ri-upload-chooser').hidden=false;by('ri-title').disabled=false;by('ri-class').disabled=false;by('ri-description').disabled=false;});
by('ri-save').addEventListener('click',()=>operation(save));

by('ri-full-page').addEventListener('click',()=>operation(()=>captureToBank(true)));
by('ri-image-file').addEventListener('change',e=>{
 const file=e.target.files?.[0];if(file)operation(()=>importImage(file));e.target.value='';
});
by('ri-paste-image').addEventListener('click',()=>operation(pasteImage));
by('ri-from-selection').addEventListener('click',()=>{
 if(state.published){msg('Un contrôle publié est en lecture seule.',true);return;}
 if(state.questions.length>=40){msg('Limite de 40 questions.',true);return;}
 const area=by('ri-text-preview'),start=area.selectionStart,end=area.selectionEnd;
 if(start===end){msg('Sélectionne le texte de la question dans la transcription avant de cliquer sur « Créer ».',true);return;}
 let prompt=area.value.slice(start,end).replace(/\s+/g,' ').trim();
 prompt=prompt.replace(/^(?:(?:Question|Q)\s*)?\d{1,2}(?:[.,]\d+)?\s*[).:\-–—]?\s*/i,'').trim();
 if(prompt.length<5||prompt.length>1200){msg('Sélectionne uniquement l’énoncé de la question (5 à 1200 caractères).',true);return;}
 state.questions.push({...emptyQuestion(state.page),prompt});
 renderQuestions();
 const last=by('ri-questions')?.lastElementChild;
 last?.scrollIntoView({block:'nearest',behavior:'smooth'});
 msg('Question ajoutée depuis la page '+state.page+'. Vérifie son énoncé et son barème.');
});
by('ri-redetect').addEventListener('click',()=>{
 if(state.published||!state.file){msg('Aucun document modifiable chargé.',true);return;}
 if(state.assets.some(a=>a.questionId||(!a.pending))) {
  msg('Pour protéger les associations documentaires existantes, la réanalyse est bloquée après liaison des captures. Modifie les questions directement.',true);
  return;
 }
 if(!confirm('Relancer l’analyse ? Les questions actuellement saisies seront remplacées par les questions détectées dans le document.'))return;
 const questions=extractQuestions(state.pages);
 state.questions=questions.length?questions:[emptyQuestion()];
 renderQuestions();
 updateDetectionHint(questions.length);
 msg(questions.length+' question(s) proposées après nouvelle analyse. Vérifie les énoncés et les points.');
});
function updateDetectionHint(count){
 const hint=by('ri-detection-hint');
 if(hint)hint.textContent=count?'✓ '+count+' question(s) reconnue(s) automatiquement · à vérifier':
  'Aucune question reconnue : ajoute les questions manuellement ci-dessous.';
}
attachSelection();
window.CORTEX_REAL_IMPORT={openExisting};
window.addEventListener('cortex:academy-data-ready',()=>{if(!state.id&&state.file)populateClasses(by('ri-class').value);});
window.addEventListener('cortex:academy-logout',()=>{clearEditor();by('ri-upload-chooser').hidden=false;});
