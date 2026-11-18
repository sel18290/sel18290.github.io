/* CORTEX ACADÉMIE — atelier PDF/Word réel : source, questions, extraits privés. */
import {api} from './coursework.js?v=1.9';
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
   let m=line.match(marker),num,rest,numberOnly=false;
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
    if(!likely(prompt)||/\b(?:puis|et|de|du|des|sur|pour|[àa])\s*$/i.test(prompt)||/[,:;]\s*$/.test(prompt)){
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
 state.id=null;state.assets=[];state.selected=null;state.wordHtml='';state.published=false;state.sourceCount=1;
 for(const inputId of ['ri-title','ri-class','ri-description'])by(inputId).disabled=false;
 by('ri-save').disabled=false;
 by('ri-editor').hidden=true;by('ri-file').value='';
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
  const item=node('article','ri-question');
  const header=node('div','ri-q-header');
  header.append(node('strong','','QUESTION '+(i+1)),node('small','',q.assetIds?.length?q.assetIds.length+' capture(s)':'Aucune capture associée'));
  const remove=node('button','ri-action subtle','Supprimer');remove.type='button';remove.disabled=state.published||state.questions.length<2;
  remove.onclick=()=>{state.questions.splice(i,1);renderQuestions();};
  header.append(remove);item.append(header);
  const ta=node('textarea','ri-question-text');ta.value=q.prompt;ta.rows=2;ta.maxLength=1200;
  ta.placeholder='Énoncé de la question';ta.disabled=state.published;ta.setAttribute('aria-label','Énoncé de la question '+(i+1));
  ta.oninput=()=>{q.prompt=ta.value;};
  item.append(ta);
  const metadata=node('div','ri-q-meta');
  const type=node('select','ri-select');
  [['text','Réponse rédigée'],['choice','QCM']].forEach(([v,label])=>{
   const op=node('option','',label);op.value=v;type.append(op);
  });
  type.value=q.type||'text';type.disabled=state.published;
  type.onchange=()=>{q.type=type.value;if(q.type==='choice'&&(!q.choices||q.choices.length<2))q.choices=['',''];renderQuestions();};
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
  item.append(metadata);
  if(q.type==='choice'){
   const choices=node('textarea','ri-question-text');choices.rows=4;choices.value=(q.choices||[]).join('\n');
   choices.placeholder='Une proposition par ligne (2 à 6 propositions)';
   choices.disabled=state.published;choices.setAttribute('aria-label','Propositions du QCM '+(i+1));
   choices.oninput=()=>{q.choices=choices.value.split('\n');};
   const good=node('select','ri-select');good.disabled=state.published;
   for(let c=0;c<6;c++){const op=node('option','','Bonne réponse : '+(c+1));op.value=String(c);good.append(op);}
   good.value=String(q.correct||0);good.onchange=()=>{q.correct=Number(good.value);};
   item.append(node('small','','Choix du QCM, un par ligne, puis sélectionne la bonne réponse.'),choices,good);
  }
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
 const box=by('ri-assets');box.replaceChildren();
 if(!state.assets.length){box.append(node('p','ri-subtle','Les captures associées apparaîtront ici, accessibles aux élèves sur leur appareil.'));return;}
 for(const a of state.assets){
  const line=node('div','ri-asset-row');
  const img=node('img','ri-asset-thumb');if(a.url){img.src=a.url;img.alt='Capture du document '+a.name;}else img.alt='Capture indisponible';
  const info=node('div','ri-asset-desc');
  info.append(node('strong','',a.name),node('small','','Q'+(state.questions.findIndex(q=>q.id===a.questionId)+1)+' · page '+a.page));
  line.append(img,info);
  const remove=node('button','ri-action subtle','Retirer');remove.type='button';remove.disabled=state.published;
  remove.onclick=()=>operation(async()=>{
   await api('teacher_asset_delete',{assessment_id:state.id,asset_id:a.id},null,true);
   state.assets=state.assets.filter(x=>x.id!==a.id);
   for(const q of state.questions)q.assetIds=(q.assetIds||[]).filter(x=>x!==a.id);
   renderQuestions();await bridge().refresh();msg('Capture supprimée du stockage privé.');
  });
  line.append(remove);box.append(line);
 }
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
  if(state.published||!state.id||e.button!==0)return;
  origin=relativePosition(e);state.selected=null;wrap.setPointerCapture(e.pointerId);
  e.preventDefault();
 };
 wrap.onpointermove=e=>{
  if(!origin)return;
  const end=relativePosition(e);
  state.selected={x:Math.min(origin.x,end.x),y:Math.min(origin.y,end.y),
   w:Math.abs(origin.x-end.x),h:Math.abs(origin.y-end.y)};
  showSelection();
 };
 wrap.onpointerup=e=>{
  if(!origin)return;
  const end=relativePosition(e);state.selected={x:Math.min(origin.x,end.x),y:Math.min(origin.y,end.y),
   w:Math.abs(origin.x-end.x),h:Math.abs(origin.y-end.y)};
  origin=null;if(state.selected.w<0.015||state.selected.h<0.015)state.selected=null;
  showSelection();
 };
 wrap.onpointercancel=()=>{origin=null;state.selected=null;showSelection();};
}
async function paint(){
 const canvas=by('ri-canvas'),wrap=by('ri-source-page'),plain=by('ri-text-preview');
 const previous=state.page;
 by('ri-current-page').textContent='Page '+state.page+' / '+state.sourceCount;
 by('ri-prev').disabled=state.page===1;by('ri-next').disabled=state.page===state.sourceCount;
 plain.textContent=state.pages[state.page-1]||'Aucun texte reconnu. Les schémas restent disponibles dans le document original.';
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
 wrap.style.touchAction=state.id&&!state.published?'none':'auto';
 by('ri-capture').disabled=!state.id||state.published;
 by('ri-full-page').disabled=!state.id||state.published;
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
async function cropAndUpload(full=false){
 if(!state.id)throw Error('Enregistre d’abord le contrôle pour stocker la capture.');
 if(state.published)throw Error('Le contrôle publié ne peut pas être modifié.');
 const source=await originalCanvas();
 const area=full?{x:0,y:0,w:1,h:1}:state.selected;
 if(!area)throw Error('Encadre une zone du document avec la souris ou le doigt, ou capture la page entière.');
 const sx=Math.floor(area.x*source.width),sy=Math.floor(area.y*source.height);
 const sw=Math.min(source.width-sx,Math.ceil(area.w*source.width));
 const sh=Math.min(source.height-sy,Math.ceil(area.h*source.height));
 if(sw<15||sh<15)throw Error('Sélection trop petite.');
 const max=1700,scale=Math.min(1,max/Math.max(sw,sh));
 const canvas=node('canvas');canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
 canvas.getContext('2d').drawImage(source,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Capture impossible.')),'image/jpeg',0.87));
 const qid=by('ri-target-question').value;if(!qid)throw Error('Choisis une question pour cette capture.');
 const name='Document_page_'+state.page+'_question_'+(state.questions.findIndex(q=>q.id===qid)+1)+'.jpg';
 const upload=new File([blob],name,{type:'image/jpeg'});
 msg('Envoi sécurisé de la capture documentaire…');
 const result=await api('teacher_asset_upload',{assessment_id:state.id,question_id:qid,page:state.page},upload,true);
 state.assets.push(result.asset);
 const q=state.questions.find(q=>q.id===qid);if(q)q.assetIds=[...(q.assetIds||[]),result.asset.id];
 state.selected=null;showSelection();renderQuestions();await bridge().refresh();
 msg('Capture associée à la question et enregistrée dans Supabase. Elle sera visible par les élèves.');
}
function validatedQuestions(){
 if(state.questions.length<1||state.questions.length>40)throw Error('Le contrôle doit comporter 1 à 40 questions.');
 return state.questions.map((q,i)=>{
  const prompt=q.prompt.trim(),points=Number(q.points),page=Number(q.page||1);
  if(!prompt||prompt.length>1200||!Number.isFinite(points)||points<0||points>20||!Number.isInteger(page)||page<1||page>state.sourceCount)throw Error('Vérifie l’énoncé, le barème et la page de référence de la question '+(i+1)+'.');
  const out={id:q.id,prompt,points,page,type:q.type||'text',assetIds:q.assetIds||[]};
  if(out.type==='choice'){
   const choices=(q.choices||[]).map(c=>String(c).trim()).filter(Boolean);
   if(choices.length<2||choices.length>6||choices.some(c=>c.length>280)||!Number.isInteger(Number(q.correct))||Number(q.correct)<0||Number(q.correct)>=choices.length)throw Error('Question '+(i+1)+' : indique 2 à 6 choix et une réponse correcte.');
   out.choices=choices;out.correct=Number(q.correct);
  }
  return out;
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
 msg('Contrôle enregistré avec son document original. Sélectionne une question et capture les extraits que les élèves devront consulter.');
 by('ri-save').textContent='Enregistrer les modifications';
 await bridge().refresh();await paint();
 renderQuestions();
}
async function initial(file){
 await operation(async()=>{
  clearEditor();await inspect(file);
  state.questions=extractQuestions(state.pages);
  if(!state.questions.length)state.questions=[emptyQuestion()];
  by('ri-title').value=titleGuess(file.name);
  by('ri-description').value='Lire attentivement les documents et justifier les réponses à partir des sources fournies.';
  populateClasses();
  by('ri-editor').hidden=false;by('ri-save').textContent='Enregistrer le contrôle et son document';
  await paint();renderQuestions();
  msg('Original chargé : '+state.sourceCount+' page(s), '+state.questions.length+' question(s) détectée(s). Vérifie les énoncés et les barèmes avant enregistrement.');
 });
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
  await paint();renderQuestions();
  msg(state.published?'Contrôle publié : consultation uniquement. Les documents et réponses des élèves sont préservés.':'Atelier chargé. Tu peux modifier les questions et associer des captures au contrôle.');
  location.hash='#acad-import-workspace';document.body.dataset.acadView='import';
  by('acad-import-workspace').scrollIntoView({block:'start',behavior:'smooth'});
 }catch(e){msg(e?.message||'Ouverture impossible.',true);}
 finally{state.busy=false;}
}
by('ri-file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(f){by('ri-upload-chooser').hidden=false;await initial(f);}});
by('ri-prev').addEventListener('click',()=>selectPage(-1));
by('ri-next').addEventListener('click',()=>selectPage(1));
by('ri-add-question').addEventListener('click',()=>{
 if(state.questions.length>=40){msg('Maximum 40 questions.',true);return;}
 state.questions.push(emptyQuestion(state.page));renderQuestions();
});
by('ri-new').addEventListener('click',()=>{clearEditor();by('ri-upload-chooser').hidden=false;by('ri-title').disabled=false;by('ri-class').disabled=false;by('ri-description').disabled=false;});
by('ri-save').addEventListener('click',()=>operation(save));
by('ri-capture').addEventListener('click',()=>operation(()=>cropAndUpload(false)));
by('ri-full-page').addEventListener('click',()=>operation(()=>cropAndUpload(true)));
attachSelection();
window.CORTEX_REAL_IMPORT={openExisting};
window.addEventListener('cortex:academy-data-ready',()=>{if(!state.id&&state.file)populateClasses(by('ri-class').value);});
window.addEventListener('cortex:academy-logout',()=>{clearEditor();by('ri-upload-chooser').hidden=false;});
