window.CORTEX_VISUAL=(function visualModule(){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let loaded={},docCache=new Map(),imgUrls=new Map(),cropGeneration=0;
const DB='cortex-visual-documents-v1';
function script(url){
 if(loaded[url])return loaded[url];
 return loaded[url]=new Promise((resolve,reject)=>{
  const el=document.createElement('script');el.src=url;el.async=true;
  el.onload=()=>resolve();el.onerror=()=>{delete loaded[url];reject(new Error('Lecteur indisponible : vérifie la connexion internet.'));};
  document.head.appendChild(el);
 });
}
async function database(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>req.result.createObjectStore('images');
  req.onerror=()=>reject(req.error);
  req.onsuccess=()=>resolve(req.result);
 });
}
async function transact(mode,callback){
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('images',mode),store=tx.objectStore('images');
  let output;
  try{output=callback(store);}catch(e){db.close();reject(e);return;}
  tx.oncomplete=()=>{db.close();resolve(output)};
  tx.onerror=()=>{db.close();reject(tx.error||new Error('Stockage indisponible'))};
 });
}
async function saveImage(blob,id){if(!blob||!blob.type.startsWith('image/'))throw Error('Image invalide');await transact('readwrite',s=>s.put(blob,id));}
async function getImage(id){
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('images','readonly'),req=tx.objectStore('images').get(id);
  req.onsuccess=()=>{db.close();resolve(req.result||null)};
  req.onerror=()=>{db.close();reject(req.error)};
 });
}
async function removeImage(id){
 if(imgUrls.has(id)){URL.revokeObjectURL(imgUrls.get(id));imgUrls.delete(id);}
 await transact('readwrite',s=>s.delete(id));
}
async function imageUrl(id){
 if(imgUrls.has(id))return imgUrls.get(id);
 const blob=await getImage(id);if(!blob)return null;
 const url=URL.createObjectURL(blob);imgUrls.set(id,url);return url;
}
function renderAssets(exam,question,context='student'){
 const list=(question?.assetIds||[]).map(id=>(exam.assets||[]).find(a=>a.id===id)).filter(Boolean);
 if(!list.length)return '';
 return `<section class="visual-student-docs ${context==='student'?'student':''}"><div class="visual-doc-label">DOCUMENT${list.length>1?'S':''} ASSOCIÉ${list.length>1?'S':''} · ${list.length} EXTRAIT${list.length>1?'S':''}</div>
 ${list.map((a,i)=>`<figure class="visual-student-figure"><img data-visual-id="${esc(a.id)}" alt="${esc(a.name||'Extrait documentaire')}"><figcaption>Document ${i+1} — ${esc(a.name||'Capture du document')}</figcaption></figure>`).join('')}</section>`;
}
async function hydrate(root=document){
 if(!root?.querySelectorAll)return;
 const images=Array.from(root.querySelectorAll('img[data-visual-id]'));
 await Promise.all(images.map(async img=>{
  const url=await imageUrl(img.dataset.visualId);
  if(url&&img.isConnected)img.src=url;
  else if(img.isConnected)img.alt+=' — image indisponible sur cet appareil';
 }));
}
function workspace(exam,page,selectedId){
 const selected=exam.questions.find(q=>q.id===selectedId)||exam.questions[0];
 const entries=exam.assets||[];
 return `<div class="visual-workspace">
  <header class="visual-workspace-head"><div><div class="eyebrow">CORTEX · DOCUMENT ORIGINAL</div><h1>Capture tes documents.<br><em>Construis ton contrôle.</em></h1>
   <p>${esc(exam.sourceName||'Document importé')} · ${esc(exam.sourceType==='pdf'?'PDF':'Word')} · Aucun texte analysé, aucune question inventée.</p></div>
   <div class="btn-row"><button class="btn ghost" data-action="go-exams">Mes contrôles</button>
   <button class="btn" data-action="visual-edit-questions">Modifier les questions →</button></div></header>
  <div class="visual-steps"><span><b>1</b> Parcours l’original</span><span><b>2</b> Sélectionne une zone</span><span><b>3</b> Glisse la capture vers « Documents élève »</span></div>
  <div class="visual-columns">
   <section class="panel visual-origin"><div class="panel-head"><div><span class="review-overline">DOCUMENT SOURCE</span><h2>Original : ${esc(exam.sourceName||'Document')}</h2></div>
    <div class="btn-row">${exam.sourceType==='pdf'?`<button class="btn ghost small" data-action="visual-page-prev" ${page<=1?'disabled':''}>←</button><span class="chip">${page} / ${exam.sourcePageCount||1}</span><button class="btn ghost small" data-action="visual-page-next" ${page>=(exam.sourcePageCount||1)?'disabled':''}>→</button>`:''}
    <button class="btn ghost small" data-action="visual-download-original">Télécharger</button></div></div>
    <p class="visual-hint">Place ton doigt ou ta souris sur la page, maintiens et encadre le passage à capturer. Relâche pour créer l’image.</p>
    <div id="visual-original-stage" class="visual-page-stage" aria-label="Original à capturer"><p class="muted">Ouverture du document original…</p></div>
    <div class="visual-source-controls"><button class="btn ghost small" data-action="visual-capture-full">Capturer la page entière</button><button class="btn ghost small" data-action="visual-copy-original">Copier la page en image</button></div>
   </section>
   <section class="panel visual-bank"><div class="panel-head"><div><span class="review-overline">ONGLET DOCUMENTS</span><h2>Documents élève</h2></div><span class="chip teal">${entries.length} capture(s)</span></div>
    <div class="field"><label for="visual-target-question">Question destinataire</label>
     <select id="visual-target-question" data-visual-question>${exam.questions.map((q,i)=>`<option value="${esc(q.id)}" ${selected?.id===q.id?'selected':''}>Question ${q.number||i+1} · ${esc(q.prompt||'À renseigner')}</option>`).join('')}</select></div>
    <div class="visual-dropzone" data-visual-dropzone tabindex="0" role="group" aria-label="Déposer une capture pour l'associer à la question sélectionnée">
      <span aria-hidden="true">⇩</span><strong>Glisse une capture ici</strong>
      <small>Ou sélectionne « Ajouter à cette question » sous la capture. Fonctionne aussi sur téléphone.</small>
    </div>
    <div class="visual-bank-list">${entries.length?entries.map(asset=>`<div class="visual-asset-row" data-asset-row="${esc(asset.id)}">
     <img data-visual-id="${esc(asset.id)}" draggable="true" data-visual-drag="${esc(asset.id)}" alt="Capture ${esc(asset.name)}">
     <div><strong>${esc(asset.name)}</strong><small>${asset.page?'Page '+asset.page+' · ':''}${exam.questions.filter(q=>(q.assetIds||[]).includes(asset.id)).length} question(s) associée(s)</small>
      <div class="btn-row"><button class="btn small" data-action="visual-attach" data-id="${esc(asset.id)}">Ajouter à la question</button>
      <button class="btn ghost small" data-action="visual-copy-asset" data-id="${esc(asset.id)}">Copier</button>
      <button class="btn ghost small" data-action="visual-download-asset" data-id="${esc(asset.id)}">Télécharger</button>
      <button class="btn danger small" data-action="visual-delete-asset" data-id="${esc(asset.id)}" aria-label="Supprimer la capture ${esc(asset.name)}">×</button></div></div></div>`).join(''):'<div class="visual-empty">Tes captures apparaîtront ici. Aucun document n’a encore été ajouté à une question.</div>'}</div>
    <div class="visual-bank-footer"><label for="visual-image-file" class="btn secondary small">＋ Importer une image</label>
      <input type="file" id="visual-image-file" accept="image/png,image/jpeg,image/webp" data-visual-upload hidden>
      <button class="btn ghost small" data-action="visual-paste-image">Coller une capture</button></div>
    <div class="visual-attached"><h3>Visible par l’élève · ${esc(selected?.prompt||'Question sélectionnée')}</h3>
     ${renderAssets(exam,selected,'editor')||'<p class="muted small">Ajoute une ou plusieurs captures à cette question.</p>'}
     ${(selected?.assetIds||[]).map(id=>`<button type="button" class="btn ghost small" data-action="visual-detach" data-id="${esc(id)}">Retirer ${esc((exam.assets||[]).find(a=>a.id===id)?.name||'la capture')}</button>`).join('')}</div>
   </section>
  </div>
  <p class="visual-warning">Démonstration locale : les images et le document original sont conservés sur cet appareil uniquement. Ils ne sont pas encore disponibles sur les téléphones des autres élèves.</p>
 </div>`;
}
async function inspect(file){
 if(!file)throw Error('Sélectionne un fichier PDF ou Word (.docx).');
 if(file.size>18*1024*1024)throw Error('Document trop lourd pour cette démo (18 Mo maximum).');
 const ext=(file.name.split('.').pop()||'').toLowerCase();
 if(!['pdf','docx'].includes(ext))throw Error('Le module accepte PDF et Word (.docx). Convertis les anciens .doc en .docx.');
 if(ext==='pdf'){
  await script('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  if(pdf.numPages>50)throw Error('Cette démo accepte 50 pages au maximum.');
  return {kind:'pdf',pages:pdf.numPages};
 }
 await script('https://unpkg.com/mammoth@1.10.0/mammoth.browser.min.js');
 return {kind:'docx',pages:1};
}
async function sanitizeWord(blob,stage){
 const raw=await window.mammoth.convertToHtml({arrayBuffer:await blob.arrayBuffer()});
 const parsed=new DOMParser().parseFromString(raw.value||'','text/html');
 const allowed=new Set(['DIV','P','SPAN','STRONG','B','I','EM','BR','H1','H2','H3','H4','TABLE','TBODY','THEAD','TR','TH','TD','UL','OL','LI','BLOCKQUOTE','IMG','HR','SUP','SUB']);
 function clean(node){
  if(node.nodeType===3)return document.createTextNode(node.textContent||'');
  if(node.nodeType!==1)return document.createDocumentFragment();
  if(['SCRIPT','STYLE','IFRAME','FORM','OBJECT'].includes(node.tagName))return document.createDocumentFragment();
  const el=document.createElement(allowed.has(node.tagName)?node.tagName.toLowerCase():'span');
  if(node.tagName==='IMG'){
   const source=node.getAttribute('src')||'';
   if(!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(source)||source.length>3500000)return document.createDocumentFragment();
   el.src=source;el.alt=node.getAttribute('alt')||'Image du document';return el;
  }
  if(['TH','TD'].includes(node.tagName)){
   const c=Number(node.getAttribute('colspan')||1);if(c>1&&c<=20)el.colSpan=c;
  }
  node.childNodes.forEach(child=>el.appendChild(clean(child)));return el;
 }
 stage.replaceChildren();
 const body=document.createElement('div');body.className='visual-word-body';
 parsed.body.childNodes.forEach(child=>body.appendChild(clean(child)));
 stage.appendChild(body);
 await script('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
 await Promise.all(Array.from(body.querySelectorAll('img')).map(im=>im.decode?.().catch(()=>{})||Promise.resolve()));
 const canvas=await window.html2canvas(body,{backgroundColor:'#ffffff',scale:1.5,useCORS:false,logging:false});
 stage.replaceChildren(canvas);return canvas;
}
async function showOriginal(exam,page,onCapture){
 const target=document.getElementById('visual-original-stage');if(!target||!exam?.sourceId)return;
 const generation=++cropGeneration;
 target.textContent='Chargement de la page originale…';
 try{
  const file=await window.CORTEX_DOCS.readFile(exam.sourceId);
  if(!file)throw Error('Le document source a été effacé de cet appareil.');
  let canvas;
  if(file.kind==='pdf'){
    await script('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    let pdf=docCache.get(exam.sourceId);
    if(!pdf){pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.blob.arrayBuffer())}).promise;docCache.set(exam.sourceId,pdf);}
    const p=await pdf.getPage(Math.max(1,Math.min(pdf.numPages,page)));
    const viewport=p.getViewport({scale:1.5});
    canvas=document.createElement('canvas');
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await p.render({canvasContext:canvas.getContext('2d',{willReadFrequently:true}),viewport}).promise;
  }else{
    await script('https://unpkg.com/mammoth@1.10.0/mammoth.browser.min.js');
    const tmp=document.createElement('div');tmp.className='visual-word-temp';
    target.replaceChildren(tmp);
    canvas=await sanitizeWord(file.blob,tmp);
  }
  if(generation!==cropGeneration||!target.isConnected)return;
  canvas.className='visual-page-canvas';
  const area=document.createElement('div');area.className='visual-crop-area';
  const selection=document.createElement('div');selection.className='visual-crop-selection';selection.hidden=true;
  area.append(canvas,selection);target.replaceChildren(area);
  bindCrop(area,canvas,selection,async blob=>onCapture(blob,page));
 }catch(err){if(target.isConnected&&generation===cropGeneration)target.textContent='Document non affiché : '+err.message;}
}
function cropBlob(canvas,rect){
 return new Promise((resolve,reject)=>{
  const c=document.createElement('canvas');c.width=Math.round(rect.width);c.height=Math.round(rect.height);
  if(c.width<10||c.height<10){reject(Error('Zone trop petite.'));return;}
  c.getContext('2d').drawImage(canvas,rect.x,rect.y,rect.width,rect.height,0,0,c.width,c.height);
  c.toBlob(blob=>blob?resolve(blob):reject(Error('Capture impossible.')),'image/png');
 });
}
function fullBlob(){
 const canvas=document.querySelector('#visual-original-stage canvas');
 if(!canvas)throw Error('La page n’est pas encore chargée.');
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Capture impossible.')),'image/png'));
}
function bindCrop(area,canvas,selection,onCapture){
 let pointer=null;
 function pos(e){
  const r=canvas.getBoundingClientRect();
  return {x:Math.max(0,Math.min(r.width,e.clientX-r.left)),y:Math.max(0,Math.min(r.height,e.clientY-r.top)),width:r.width,height:r.height};
 }
 function draw(a,b){
  const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
  Object.assign(selection.style,{left:x+'px',top:y+'px',width:Math.abs(a.x-b.x)+'px',height:Math.abs(a.y-b.y)+'px'});
 }
 area.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.pointerType==='mouse')return;
  e.preventDefault();const pt=pos(e);pointer={id:e.pointerId,start:pt};
  selection.hidden=false;draw(pt,pt);area.setPointerCapture?.(e.pointerId);
 });
 area.addEventListener('pointermove',e=>{if(pointer?.id===e.pointerId)draw(pointer.start,pos(e));});
 area.addEventListener('pointercancel',()=>{pointer=null;selection.hidden=true;});
 area.addEventListener('pointerup',async e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  const start=pointer.start,end=pos(e);pointer=null;selection.hidden=true;
  const bounds=canvas.getBoundingClientRect();
  if(Math.abs(start.x-end.x)<12||Math.abs(start.y-end.y)<12)return;
  const scaleX=canvas.width/bounds.width,scaleY=canvas.height/bounds.height;
  const rect={x:Math.floor(Math.min(start.x,end.x)*scaleX),y:Math.floor(Math.min(start.y,end.y)*scaleY),
    width:Math.min(canvas.width,Math.ceil(Math.abs(start.x-end.x)*scaleX)),height:Math.min(canvas.height,Math.ceil(Math.abs(start.y-end.y)*scaleY))};
  try{await onCapture(await cropBlob(canvas,rect));}catch(err){console.warn('CORTEX capture:',err);}
 });
}
function importHome(){
 return `<div class="visual-import-start panel"><div class="eyebrow">CORTEX · IMPORTATION VISUELLE</div>
  <h1>Ton document, <em>sans transformation.</em></h1>
  <p class="muted">Importe un PDF ou un Word. Son contenu original s’affiche, puis tu encadres les tableaux, graphiques, schémas ou paragraphes que tu veux montrer aux élèves.</p>
  <div class="visual-import-drop"><label for="visual-doc-file" class="visual-import-icon">⇪</label>
    <h2>Déposer un contrôle PDF ou Word</h2><p>PDF ou .docx · Maximum 18 Mo · Aucun texte analysé</p>
    <input id="visual-doc-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
    <button class="btn" data-action="visual-import-file">Ouvrir l’original →</button></div>
  <div id="visual-import-status" role="status" class="muted small"></div>
  <p class="small muted">Le fichier et les extraits sont sauvegardés sur cet appareil. Cette démo GitHub ne publie pas encore les documents pour les élèves sur leurs téléphones.</p>
 </div>`;
}
async function imageOfElement(element){
 if(!element)throw Error('Aucun document visible à capturer.');
 if(element.tagName==='CANVAS')return await new Promise((resolve,reject)=>element.toBlob(b=>b?resolve(b):reject(Error('Échec de capture')),'image/png'));
 await script('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
 const canvas=await window.html2canvas(element,{backgroundColor:'#fff',scale:1.4,logging:false,useCORS:false});
 return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Échec de capture')),'image/png'));
}
function download(blob,name){
 const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;
 link.download=String(name||'document.png').replace(/[\\/:*?"<>|]/g,'_');link.style.display='none';document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),20000);
}
async function copy(blob){
 if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error('Copie d’image indisponible dans ce navigateur. Utilise « Télécharger ».');
 await navigator.clipboard.write([new ClipboardItem({'image/png':blob.type==='image/png'?blob:await pngFromBlob(blob)})]);
}
async function pngFromBlob(blob){
 const image=await createImageBitmap(blob),c=document.createElement('canvas');
 c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);
 return await new Promise((resolve,reject)=>c.toBlob(x=>x?resolve(x):reject(Error('Conversion impossible')),'image/png'));
}
async function paste(){
 if(!navigator.clipboard?.read)throw Error('Collage par bouton indisponible ici. Utilise Ctrl+V ou « Importer une image ».');
 const items=await navigator.clipboard.read();
 for(const item of items)for(const mime of item.types){
  if(mime.startsWith('image/'))return await item.getType(mime);
 }
 throw Error('Aucune image dans le presse-papiers.');
}
return {inspect,workspace,importHome,showOriginal,fullBlob,saveImage,getImage,removeImage,imageUrl,renderAssets,hydrate,imageOfElement,download,copy,paste};
})();
