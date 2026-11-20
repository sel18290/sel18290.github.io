/* CORTEX - photographies de réponses manuscrites, une collection par contrôle.
   Toutes les photos restent dans le navigateur/stockage privé existant, jamais dans GitHub.
   Le serveur reçoit un PDF ordonné par question via student_save/student_submit. */
const DB_NAME='cortex-student-handwritten-v1';
const MAX_PHOTOS=24, MAX_PER_QUESTION=4, MAX_PDF=8*1024*1024;
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node};
function openDb(){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(Error('Stockage local indisponible'));return}
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>req.result.createObjectStore('drafts',{keyPath:'id'});
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Stockage local inaccessible'));
 });
}
async function store(key,method,record){
 const db=await openDb();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('drafts',method==='get'?'readonly':'readwrite');
  const rq=tx.objectStore('drafts')[method](method==='get'||method==='delete'?key:record);
  rq.onsuccess=()=>resolve(rq.result);
  rq.onerror=()=>reject(rq.error);
 })}finally{db.close()}
}
async function compressImage(file){
 if(!file||!file.type.startsWith('image/')||file.type==='image/svg+xml'||file.size>12*1024*1024)
  throw Error('Choisis une photo JPG, PNG, HEIC ou WebP de moins de 12 Mo.');
 let bitmap=null,url=null,img=null;
 try{
  if('createImageBitmap' in window){try{bitmap=await createImageBitmap(file)}catch{}}
  if(!bitmap){
   url=URL.createObjectURL(file);img=new Image();img.src=url;
   if(img.decode)await img.decode();
   else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
  }
  const w=bitmap?.width||img?.naturalWidth||0,h=bitmap?.height||img?.naturalHeight||0;
  if(!w||!h)throw Error('Image illisible. Essaie une photo JPG.');
  const scale=Math.min(1,1600/Math.max(w,h));
  const width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Traitement image indisponible.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
  ctx.drawImage(bitmap||img,0,0,width,height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.78));
  canvas.width=canvas.height=0;
  if(!blob||!blob.size)throw Error('Compression de la photo impossible.');
  return {blob,width,height,created:Date.now()};
 }finally{bitmap?.close?.();if(url)URL.revokeObjectURL(url)}
}
function pdfText(value){return String(value).replace(/[^\x20-\x7e]/g,' ').replace(/[()\\]/g,'\\$&').slice(0,100)}
async function createPdf(items,questions){
 const enc=new TextEncoder(),chunks=[],offsets=[0];let position=0;
 const add=bytes=>{const data=typeof bytes==='string'?enc.encode(bytes):bytes;chunks.push(data);position+=data.length};
 const put=(id,body)=>{offsets[id]=position;add(id+' 0 obj\n');for(const part of body)add(part);add('\nendobj\n')};
 const ordered=items.slice().sort((a,b)=>{
  const ai=questions.findIndex(q=>q.id===a.questionId),bi=questions.findIndex(q=>q.id===b.questionId);
  return ai-bi||a.created-b.created;
 });
 const pages=ordered.map((_,i)=>(6+i*3)+' 0 R').join(' ');
 add('%PDF-1.4\n% CORTEX handwritten assessment\n');
 put(1,['<< /Type /Catalog /Pages 2 0 R >>']);
 put(2,['<< /Type /Pages /Kids [ '+pages+' ] /Count '+ordered.length+' >>']);
 put(3,['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']);
 for(let i=0;i<ordered.length;i++){
  const it=ordered[i],number=questions.findIndex(q=>q.id===it.questionId)+1;
  const siblings=ordered.filter(x=>x.questionId===it.questionId);
  const photoNumber=siblings.indexOf(it)+1;
  const im=4+i*3,stream=5+i*3,page=6+i*3;
  const data=new Uint8Array(await it.blob.arrayBuffer());
  const fit=Math.min(535/it.width,735/it.height);
  const w=(it.width*fit).toFixed(3),h=(it.height*fit).toFixed(3);
  const x=((595-Number(w))/2).toFixed(3),y=(35+(735-Number(h))/2).toFixed(3);
  const body='q '+w+' 0 0 '+h+' '+x+' '+y+' cm /Im0 Do Q\n'+
   'BT /F1 13 Tf 30 806 Td ('+pdfText('CORTEX - Question '+number+' - Photo '+photoNumber+'/'+siblings.length)+') Tj ET\n'+
   'BT /F1 9 Tf 30 20 Td (Copie manuscrite - page '+(i+1)+'/'+ordered.length+') Tj ET\n';
  put(im,['<< /Type /XObject /Subtype /Image /Width '+it.width+' /Height '+it.height+
   ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+data.length+
   ' >>\nstream\n',data,'\nendstream']);
  put(stream,['<< /Length '+enc.encode(body).length+' >>\nstream\n',body,'endstream']);
  put(page,['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> /XObject << /Im0 '+im+
   ' 0 R >> >> /Contents '+stream+' 0 R >>']);
 }
 const total=3+ordered.length*3,at=position;
 add('xref\n0 '+(total+1)+'\n0000000000 65535 f \n');
 for(let i=1;i<=total;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 add('trailer\n<< /Size '+(total+1)+' /Root 1 0 R >>\nstartxref\n'+at+'\n%%EOF\n');
 return new Blob(chunks,{type:'application/pdf'});
}
export function createHandwritingManager({form,questions,key,onAttach,onRemove,onStatus,canAdd,onCameraOpen,onCameraClose}){
 let photos=[],closed=false,changing=Promise.resolve(),version=0;
 let observer=null;const urls=new Set();let cameraOpen=false;
 const count=()=>photos.length;
 const cleanUrls=()=>{for(const url of urls)URL.revokeObjectURL(url);urls.clear()};
 function suspend(){if(cameraOpen)return;cameraOpen=true;onCameraOpen?.()}
 function resume(){if(!cameraOpen)return;cameraOpen=false;onCameraClose?.()}
 const onFocus=()=>{if(cameraOpen&&document.visibilityState==='visible')setTimeout(resume,150)};
 window.addEventListener('focus',onFocus);
 function render(){
  cleanUrls();
  for(const [i,q] of questions.entries()){
   const card=form.querySelector('#cw-student-question-'+(i+1))||
    form.querySelectorAll('.cw-answer-question')[i];
   if(!card)continue;
   let panel=card.querySelector('.cw-handwriting');
   if(!panel){
    panel=el('section','cw-handwriting');
    panel.setAttribute('aria-label','Photographier une réponse manuscrite');
    card.append(panel);
   }
   panel.replaceChildren();
   const title=el('strong','cw-handwriting-title','✎ Réponse manuscrite · question '+(i+1));
   const hint=el('p','cw-handwriting-hint','Écris sur papier puis prends une photo nette. Jusqu’à '+MAX_PER_QUESTION+' photos pour cette question.');
   const actions=el('div','cw-handwriting-actions');
   function chooser(label,capture){
    const wrapper=el('label','cw-handwriting-choose');
    wrapper.append(el('span','',label));
    const input=el('input');input.type='file';input.accept='image/*';
    if(capture)input.setAttribute('capture','environment');
    input.setAttribute('aria-label',label+' pour la question '+(i+1));
    input.addEventListener('click',suspend);
    input.addEventListener('change',async()=>{
     resume();
     const file=input.files?.[0];input.value='';
     if(!file)return;
     try{await addPhoto(q.id,file)}catch(error){onStatus?.(String(error.message||error),true)}
    });
    wrapper.append(input);return wrapper;
   }
   actions.append(chooser('📷 Prendre une photo',true),chooser('＋ Ajouter une image',false));
   const own=photos.filter(p=>p.questionId===q.id);
   const list=el('div','cw-handwriting-previews');
   for(const it of own){
    const figure=el('figure','cw-handwriting-preview'),img=el('img');
    const src=URL.createObjectURL(it.blob);urls.add(src);img.src=src;img.alt='Photo de réponse manuscrite pour la question '+(i+1);
    const remove=el('button','cw-handwriting-remove','Retirer ✕');remove.type='button';
    remove.setAttribute('aria-label','Retirer cette photo manuscrite');
    remove.addEventListener('click',()=>{void removePhoto(it)});
    figure.append(img,remove);list.append(figure);
   }
   const status=el('small','cw-handwriting-count',own.length?own.length+' photo(s) pour cette question':'Aucune photo ajoutée');
   panel.append(title,hint,actions,list,status);
  }
 }
 async function persist(){
  try{await store(key,'put',{id:key,updated:Date.now(),photos})}
  catch{onStatus?.('Le navigateur ne conserve pas les photos hors de cette page. Vérifie la sauvegarde serveur avant de quitter.',true)}
 }
 function updatePdf(){
  const requested=++version, snapshot=photos.slice();
  changing=changing.catch(()=>{}).then(async()=>{
   if(closed||requested!==version)return;
   if(!snapshot.length){onRemove?.();return}
   const pdf=await createPdf(snapshot,questions);
   if(pdf.size>MAX_PDF)throw Error('Les photos dépassent 8 Mo après compression. Retire certaines images.');
   if(closed||requested!==version)return;
   const qs=[...new Set(snapshot.map(p=>questions.findIndex(q=>q.id===p.questionId)+1))].sort((a,b)=>a-b);
   const name='CORTEX_Manuscrit_Q'+qs.join('-')+'_'+snapshot.length+'photos.pdf';
   onAttach?.(new File([pdf],name,{type:'application/pdf'}));
   onStatus?.(snapshot.length+' photo(s) manuscrite(s) préparée(s) pour la sauvegarde sur le serveur.');
  }).catch(error=>onStatus?.('PDF manuscrit non préparé : '+String(error.message||error),true));
  return changing;
 }
 async function addPhoto(questionId,file){
  await ready;
  if(closed)return;
  if(!canAdd?.())throw Error('Une autre pièce jointe est présente : retire-la avant de photographier tes réponses.');
  if(count()>=MAX_PHOTOS)throw Error('Limite de '+MAX_PHOTOS+' photos par contrôle atteinte.');
  if(photos.filter(p=>p.questionId===questionId).length>=MAX_PER_QUESTION)
   throw Error('Quatre photos maximum par question.');
  const item=await compressImage(file);
  photos.push({...item,questionId,id:'photo-'+Date.now()+'-'+Math.random().toString(36).slice(2)});
  await persist();render();await updatePdf();
 }
 async function removePhoto(item){
  photos=photos.filter(p=>p.id!==item.id);
  await persist();render();await updatePdf();
 }
 const record=awaitPromise(store(key,'get',key));
 function awaitPromise(promise){return promise.catch(()=>null)}
 const ready=record.then(row=>{
  if(closed)return;
  photos=Array.isArray(row?.photos)?row.photos.filter(p=>questions.some(q=>q.id===p.questionId)&&p.blob instanceof Blob):[];
  render();
 });
 observer=new MutationObserver(()=>{if(!closed){
  const cards=form.querySelectorAll('.cw-answer-question');
  for(const card of cards)if(!card.querySelector('.cw-handwriting')){render();break}
 }});
 observer.observe(form,{childList:true,subtree:true});
 render();
 return {
  ready,
  count,
  get busy(){return cameraOpen},
  async flush(){await ready;await changing},
  async forget(){try{await store(key,'delete')}catch{}},
  dispose(){closed=true;observer?.disconnect();window.removeEventListener('focus',onFocus);cleanUrls();resume()}
 };
}
