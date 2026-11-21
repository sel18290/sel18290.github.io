/* CORTEX · Visionneuse PDF pédagogique, pages rasterisées pendant les contrôles protégés.
 * Le rendu canvas supprime la sélection native du texte du lecteur PDF.
 * Ce n'est pas une mesure de confidentialité : un élève équipé d'un navigateur
 * peut toujours capturer l'écran ou récupérer une ressource réseau autorisée.
 */
const PDFJS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let loader;
function loadPdfJs(){
 if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
 if(!loader)loader=new Promise((resolve,reject)=>{
  const tag=document.createElement('script');
  tag.src=PDFJS_URL;
  tag.async=true;
  tag.onload=()=>window.pdfjsLib?resolve(window.pdfjsLib):reject(Error('Lecteur PDF non disponible.'));
  tag.onerror=()=>reject(Error('Impossible de charger le lecteur PDF. Vérifie la connexion.'));
  document.head.append(tag);
 }).catch(error=>{loader=null;throw error});
 return loader;
}
const element=(tag,cls,text)=>{
 const out=document.createElement(tag);if(cls)out.className=cls;
 if(text!==undefined)out.textContent=String(text);
 return out;
};
export function openProtectedPdf({url,name='Sujet du contrôle',protectedMode=false}){
 const dialog=element('dialog','cw-protected-subject-dialog cw-protected-pdf');
 dialog.setAttribute('aria-label','Lire le document : '+name);
 const head=element('header','cw-protected-subject-header');
 const title=element('strong','',name);
 const controls=element('div','cw-protected-pdf-actions');
 const prev=element('button','','← Page précédente');
 const pageNumber=element('span','cw-protected-pdf-number','Page —');
 pageNumber.setAttribute('aria-live','polite');
 const next=element('button','','Page suivante →');
 const zoomOut=element('button','','−');
 zoomOut.setAttribute('aria-label','Réduire le document');
 const zoomIn=element('button','','+');
 zoomIn.setAttribute('aria-label','Agrandir le document');
 const close=element('button','','Fermer');
 for(const button of [prev,next,zoomOut,zoomIn,close])button.type='button';
 controls.append(prev,pageNumber,next,zoomOut,zoomIn,close);
 head.append(title,controls);
 const viewport=element('div','cw-protected-pdf-scroll');
 const status=element('p','cw-protected-pdf-status','Chargement du document…');
 status.setAttribute('role','status');
 const canvas=element('canvas','cw-protected-pdf-canvas');
 canvas.setAttribute('role','img');
 canvas.setAttribute('aria-label','Image de la page du PDF, sans sélection de texte');
 canvas.draggable=false;
 if(protectedMode){
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('dragstart',e=>e.preventDefault());
  canvas.addEventListener('selectstart',e=>e.preventDefault());
 }
 viewport.append(status,canvas);
 const note=element('p','cw-protected-subject-note',protectedMode
  ? 'Mode anti-copie actif : document consultable, mais surlignage et copie de texte désactivés. La capture d’écran reste possible.'
  : 'Document affiché dans CORTEX. Utilise les flèches pour changer de page et les boutons + / − pour zoomer.');
 const footer=element('div','cw-protected-pdf-footer');
 footer.append(note);
 if(!protectedMode){
  const original=element('a','','Ouvrir dans le lecteur PDF');
  original.href=url;
  original.target='_blank';original.rel='noopener noreferrer';
  original.title='Ouvrir le PDF original dans un autre onglet';
  footer.append(original);
 }
 dialog.append(head,viewport,footer);
 document.body.append(dialog);
 let closed=false,pdf=null,page=1,scale=1,sequence=0,task=null;
 prev.disabled=true;next.disabled=true;zoomOut.disabled=true;zoomIn.disabled=true;
 function updateButtons(){
  prev.disabled=!pdf||page<=1;
  next.disabled=!pdf||page>=pdf.numPages;
  zoomOut.disabled=!pdf||scale<=.8;
  zoomIn.disabled=!pdf||scale>=2.2;
  pageNumber.textContent=pdf?'Page '+page+' / '+pdf.numPages:'Page —';
 }
 async function render(){
  if(!pdf||closed)return;
  const id=++sequence;
  if(task){try{task.cancel()}catch{};task=null}
  status.hidden=false;status.textContent='Affichage de la page '+page+'…';
  canvas.hidden=true;
  updateButtons();
  try{
   const current=await pdf.getPage(page);
   if(closed||id!==sequence)return;
   const view=current.getViewport({scale:1});
   const width=Math.max(290,Math.min(1080,viewport.clientWidth-24||750));
   const pixelRatio=Math.min(2,window.devicePixelRatio||1);
   const displayScale=Math.min(2.2,Math.max(.5,(width/view.width)*scale));
   const point=current.getViewport({scale:displayScale*pixelRatio});
   const context=canvas.getContext('2d',{alpha:false});
   if(!context)throw Error('Canvas indisponible.');
   canvas.width=Math.ceil(point.width);
   canvas.height=Math.ceil(point.height);
   canvas.style.width=Math.ceil(point.width/pixelRatio)+'px';
   canvas.style.height=Math.ceil(point.height/pixelRatio)+'px';
   task=current.render({canvasContext:context,viewport:point});
   await task.promise;
   if(!closed&&id===sequence){
    canvas.hidden=false;status.hidden=true;
    viewport.scrollTop=0;viewport.scrollLeft=0;
   }
  }catch(error){
   if(closed||id!==sequence)return;
   if(error?.name==='RenderingCancelledException')return;
   status.textContent='Impossible d’afficher cette page. Réessaie avec les boutons de navigation.';
  }finally{if(id===sequence)task=null}
 }
 prev.onclick=()=>{page=Math.max(1,page-1);void render()};
 next.onclick=()=>{page=Math.min(pdf?.numPages||1,page+1);void render()};
 zoomOut.onclick=()=>{scale=Math.max(.8,Number((scale-.2).toFixed(1)));void render()};
 zoomIn.onclick=()=>{scale=Math.min(2.2,Number((scale+.2).toFixed(1)));void render()};
 close.onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{
  closed=true;sequence++;
  try{task?.cancel()}catch{}
  try{pdf?.destroy()}catch{}
  dialog.remove();
 },{once:true});
 dialog.showModal();
 (async()=>{
  try{
   const lib=await loadPdfJs();
   if(closed)return;
   lib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
   // Ne crée aucune textLayer : il n'y a rien à surligner dans le lecteur.
   // Les URL sont éphémères, obtenues après vérification du PIN côté serveur.
   const loadingTask=lib.getDocument({url,withCredentials:false});
   const loaded=await loadingTask.promise;
   if(closed){loaded.destroy();return}
   pdf=loaded;updateButtons();await render();
  }catch(error){
   if(closed)return;
   status.hidden=false;
   status.textContent=protectedMode
    ? 'Ce PDF ne peut pas être affiché en mode anti-copie. Préviens ton professeur ou réessaie après avoir vérifié ta connexion.'
    : 'Ce PDF ne peut pas être affiché ici. Tu peux utiliser le lien du lecteur PDF original.';
  }
 })();
 return dialog;
}
