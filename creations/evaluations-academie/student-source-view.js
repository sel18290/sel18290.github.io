/* Lecture des captures originales dans le contrôle, sur ordinateur et téléphone. */
function element(tag, className, text) {
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text)node.textContent=text;
 return node;
}

export function sourceFigure(asset) {
 const title=asset.name||'Document du contrôle';
 const figure=element('figure','cw-student-source-figure');
 const image=element('img');
 image.src=asset.url;
 image.alt='Extrait pédagogique : '+title;
 image.loading='lazy';
 image.decoding='async';
 const caption=element('figcaption','','');
 caption.append(element('span','',title));
 const open=element('button','cw-source-open','Agrandir');
 open.type='button';
 open.setAttribute('aria-label','Agrandir '+title);
 open.addEventListener('click',()=>openSource(figure,asset.url,title));
 caption.append(open);
 figure.append(image,caption);
 return figure;
}

function openSource(figure, url, title) {
 const dialog=element('dialog','cw-source-dialog');
 dialog.setAttribute('aria-label',title);
 const head=element('header','cw-source-dialog-head');
 head.append(element('strong','',title));
 const tools=element('div','cw-source-dialog-tools');
 const zoom=element('button','cw-source-open','Zoom +');
 zoom.type='button';
 let scale=1;
 const reset=element('button','cw-source-open','Taille initiale');
 reset.type='button';
 const close=element('button','cw-source-open','Fermer');
 close.type='button';
 close.addEventListener('click',()=>dialog.close());
 tools.append(zoom,reset,close);
 head.append(tools);
 const view=element('div','cw-source-scroll');
 const image=element('img');
 image.alt=title;
 image.src=url;
 image.addEventListener('error',()=>{
  view.replaceChildren(element('p','','Cette capture est inaccessible. Ouvre le sujet original depuis le contrôle.'));
  zoom.disabled=true;
  reset.disabled=true;
 },{once:true});
 view.append(image);
 const apply=()=>{
  image.style.width=scale*100+'%';
  zoom.disabled=scale>=2.5;
  reset.disabled=scale===1;
 };
 zoom.addEventListener('click',()=>{scale=Math.min(2.5,scale+.5);apply();});
 reset.addEventListener('click',()=>{scale=1;apply();view.scrollTo(0,0);});
 apply();
 dialog.append(head,view);
 // Les dialogues natifs passent au-dessus des calques ordinaires :
 // dupliquer le filigrane actif dans la visionneuse des documents.
 const activeWatermark=document.querySelector('.cw-student-watermark:not(.cw-watermark-dialog)');
 if(activeWatermark){
  const copy=activeWatermark.cloneNode(true);
  copy.classList.add('cw-watermark-dialog');
  copy.removeAttribute('id');
  copy.setAttribute('aria-hidden','true');
  dialog.append(copy);
 }
 figure.append(dialog);
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 dialog.showModal();
}
