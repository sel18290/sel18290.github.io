/* CORTEX PDF · capture fidèle des documents pédagogiques côté navigateur.
   Capture HTML localement; conserve les tableaux/graphiques CSS quand le navigateur le permet. */
window.CORTEX_PDF_SOURCE=(function(){
'use strict';
const STYLE_PROPS=[
 'display','position','box-sizing','width','height','min-width','max-width','min-height',
 'padding','padding-top','padding-right','padding-bottom','padding-left',
 'margin','margin-top','margin-right','margin-bottom','margin-left',
 'color','background','background-color','background-image','background-size',
 'background-position','border','border-top','border-right','border-bottom','border-left',
 'border-radius','border-collapse','border-spacing','box-shadow',
 'font','font-family','font-size','font-weight','font-style','line-height',
 'letter-spacing','text-align','text-decoration','text-transform','white-space',
 'word-break','overflow-wrap','vertical-align','opacity',
 'grid-template-columns','grid-template-rows','grid-column','grid-row',
 'gap','column-gap','row-gap','align-items','justify-content','align-self',
 'flex','flex-direction','flex-wrap','flex-grow','flex-shrink','flex-basis',
 'text-indent','list-style-type','transform'
];
function nodeFor(html){
 const node=document.createElement('div');
 node.className='pdf-document-snapshot';
 Object.assign(node.style,{
  position:'fixed',left:'0',top:'0',width:'794px',padding:'13px',
  boxSizing:'border-box',background:'#ffffff',color:'#232323',
  zIndex:'-100',pointerEvents:'none'
 });
 node.innerHTML=html;
 document.body.appendChild(node);
 return node;
}
function safeCanvas(canvas,kind){
 if(!canvas||canvas.width<10||canvas.height<10)throw Error('Capture du document vide');
 // Le moteur PDF local a besoin d'un canvas exportable en JPEG.
 canvas.toDataURL('image/jpeg',0.65);
 canvas.cortexPdfMethod=kind;
 return canvas;
}
function inlineComputed(source){
 if(source.nodeType===Node.TEXT_NODE)return document.createTextNode(source.textContent||'');
 if(source.nodeType!==Node.ELEMENT_NODE)return document.createDocumentFragment();
 const clone=source.cloneNode(false);
 const computed=getComputedStyle(source);
 const styles=STYLE_PROPS.map(key=>key+':'+computed.getPropertyValue(key)).join(';');
 clone.setAttribute('style',styles);
 if(source.hasAttribute('style')){
  // Le style calculé prend déjà en compte les déclarations de l'élément.
 }
 if(source.tagName==='CANVAS'){
  const img=document.createElement('img');
  try{img.src=source.toDataURL('image/png');}catch(e){return document.createTextNode('[Illustration]');}
  img.width=source.width;img.height=source.height;return img;
 }
 for(const child of source.childNodes)clone.appendChild(inlineComputed(child));
 return clone;
}
async function viaSvg(node){
 const width=Math.ceil(node.getBoundingClientRect().width);
 const height=Math.ceil(node.getBoundingClientRect().height);
 if(width<10||height<10||height>15000)throw Error('Dimensions non prises en charge');
 const clone=inlineComputed(node);
 clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
 clone.style.position='relative';
 clone.style.left='0';clone.style.top='0';
 clone.style.zIndex='auto';clone.style.pointerEvents='none';
 const markup=new XMLSerializer().serializeToString(clone);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+
  '" viewBox="0 0 '+width+' '+height+'"><foreignObject x="0" y="0" width="100%" height="100%">'+
  markup+'</foreignObject></svg>';
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const image=await new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);
   img.onerror=()=>reject(Error('Capture SVG indisponible dans ce navigateur'));
   img.src=url;
  });
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(width*1.4);canvas.height=Math.round(height*1.4);
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return safeCanvas(canvas,'html-layout');
 }finally{URL.revokeObjectURL(url);}
}

/* Repli local indépendant des CDN : dessine les blocs CSS et le texte
   aux coordonnées réellement calculées par le navigateur. */
function viaDomPaint(node){
 const bounds=node.getBoundingClientRect(),scale=1.6;
 const width=Math.ceil(bounds.width),height=Math.ceil(bounds.height);
 if(width<10||height<10||height>16000)throw Error('Document trop grand à capturer');
 const canvas=document.createElement('canvas');
 canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);
 const ctx=canvas.getContext('2d',{willReadFrequently:false});
 if(!ctx)throw Error('Canvas non disponible');
 ctx.scale(scale,scale);
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
 const offsetX=bounds.left,offsetY=bounds.top;
 const range=document.createRange();
 function opaqueColor(color){
  return color&&color!=='transparent'&&!/^rgba?\(\s*0(?:,\s*0){2},?\s*0\s*\)$/.test(color)&&
   !/^rgba\(.*,\s*0(?:\.0+)?\s*\)$/.test(color);
 }
 function block(element){
  const computed=getComputedStyle(element);
  if(computed.display==='none'||computed.visibility==='hidden'||computed.opacity==='0')return;
  const b=element.getBoundingClientRect();
  const x=b.left-offsetX,y=b.top-offsetY;
  if(b.width<=0||b.height<=0)return;
  if(x>width||y>height||x+b.width<0||y+b.height<0)return;
  ctx.save();
  const radius=Math.min(parseFloat(computed.borderRadius)||0,b.width/2,b.height/2);
  if(opaqueColor(computed.backgroundColor)){
   ctx.fillStyle=computed.backgroundColor;
   ctx.beginPath();
   if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,b.width,b.height,radius);
   else ctx.rect(x,y,b.width,b.height);
   ctx.fill();
  }
  const sides=[
   ['top',x,y,x+b.width,y],['bottom',x,y+b.height,x+b.width,y+b.height],
   ['left',x,y,x,y+b.height],['right',x+b.width,y,x+b.width,y+b.height]
  ];
  for(const [side,x1,y1,x2,y2] of sides){
   const weight=parseFloat(computed.getPropertyValue('border-'+side+'-width'))||0;
   const color=computed.getPropertyValue('border-'+side+'-color');
   const style=computed.getPropertyValue('border-'+side+'-style');
   if(weight>0&&style!=='none'&&opaqueColor(color)){
    ctx.strokeStyle=color;ctx.lineWidth=weight;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
   }
  }
  if(element.tagName==='IMG'&&element.complete&&element.naturalWidth){
   try{ctx.drawImage(element,x,y,b.width,b.height);}catch(e){}
  }else if(element.tagName==='CANVAS'){
   try{ctx.drawImage(element,x,y,b.width,b.height);}catch(e){}
  }
  ctx.restore();
  for(const child of element.childNodes)visit(child);
 }
 function paintText(textNode){
  if(!textNode.textContent?.trim())return;
  const parent=textNode.parentElement;
  if(!parent)return;
  const computed=getComputedStyle(parent);
  if(computed.visibility==='hidden'||computed.opacity==='0')return;
  const fs=parseFloat(computed.fontSize)||13;
  ctx.save();
  ctx.font=[computed.fontStyle,computed.fontWeight,fs+'px',computed.fontFamily].join(' ');
  ctx.fillStyle=computed.color||'#29313a';
  ctx.textBaseline='alphabetic';
  const content=textNode.textContent;
  for(const match of content.matchAll(/\S+/g)){
   const word=match[0],idx=match.index;
   range.setStart(textNode,idx);
   range.setEnd(textNode,idx+word.length);
   const rects=range.getClientRects();
   if(!rects.length)continue;
   const rect=rects[0];
   if(!rect.width||!rect.height)continue;
   const x=rect.left-offsetX;
   const y=rect.bottom-offsetY-Math.max(1,(rect.height-fs)/2);
   if(x>-100&&x<width+100&&y>-100&&y<height+100)
    ctx.fillText(word,x,y);
  }
  ctx.restore();
 }
 function visit(element){
  if(element.nodeType===Node.TEXT_NODE)return paintText(element);
  if(element.nodeType===Node.ELEMENT_NODE)return block(element);
 }
 visit(node);
 range.detach?.();
 return safeCanvas(canvas,'dom-paint');
}

let html2canvasLoading=null;
async function ensureHtml2canvas(){
 if(typeof window.html2canvas==='function')return window.html2canvas;
 if(html2canvasLoading)return html2canvasLoading;
 html2canvasLoading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  script.async=true;
  const timeout=setTimeout(()=>{script.remove();reject(Error('Capture HTML indisponible (délai réseau)'));},10000);
  script.onload=()=>{clearTimeout(timeout);typeof window.html2canvas==='function'?
   resolve(window.html2canvas):reject(Error('Moteur de capture HTML non chargé'));};
  script.onerror=()=>{clearTimeout(timeout);script.remove();reject(Error('Moteur de capture inaccessible'));};
  document.head.appendChild(script);
 }).catch(err=>{html2canvasLoading=null;throw err;});
 return html2canvasLoading;
}
async function viaHtml2Canvas(node,loader){
 const fn=loader?await ensureHtml2canvas():window.html2canvas;
 if(typeof fn!=='function')throw Error('html2canvas indisponible');
 const canvas=await fn(node,{
  backgroundColor:'#ffffff',scale:1.45,logging:false,useCORS:false,
  scrollX:0,scrollY:0,windowWidth:Math.max(1024,window.innerWidth)
 });
 return safeCanvas(canvas,'html-capture');
}
function readableFallback(node){
 const blocks=[];
 function walk(el){
  if(el.nodeType===Node.TEXT_NODE){
   const txt=(el.textContent||'').replace(/\s+/g,' ').trim();
   if(txt)blocks.push({text:txt});return;
  }
  if(el.nodeType!==Node.ELEMENT_NODE||['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName))return;
  if(el.tagName==='BR'){blocks.push({break:true});return;}
  if(el.tagName==='IMG'){blocks.push({text:'[Illustration]'});return;}
  if(el.tagName==='TABLE'){
   el.querySelectorAll('tr').forEach(row=>{
    blocks.push({text:Array.from(row.querySelectorAll('th,td')).map(td=>
     (td.innerText||td.textContent||'').replace(/\s+/g,' ').trim()).join('  |  ')});
   });
   blocks.push({break:true});return;
  }
  if(['P','LI','H1','H2','H3','H4','BLOCKQUOTE'].includes(el.tagName)){
   const txt=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
   if(txt)blocks.push({text:txt,heading:/^H[1-4]$/.test(el.tagName)});
   blocks.push({break:true});return;
  }
  for(const child of el.childNodes)walk(child);
  if(['SECTION','ARTICLE','DIV'].includes(el.tagName))blocks.push({break:true});
 }
 walk(node);
 const canvas=document.createElement('canvas');
 canvas.width=1100;const probe=canvas.getContext('2d');
 const lines=[];
 for(const block of blocks){
  if(block.break){if(lines.length&&!lines.at(-1).gap)lines.push({gap:true});continue;}
  probe.font=block.heading?'bold 27px Arial':'22px Arial';
  let line='';
  for(const word of block.text.split(/\s+/)){
   const candidate=line?line+' '+word:word;
   if(probe.measureText(candidate).width>1010&&line){
    lines.push({text:line,heading:block.heading});line=word;
   }else line=candidate;
  }
  if(line)lines.push({text:line,heading:block.heading});
 }
 canvas.height=Math.max(130,Math.min(29000,85+lines.reduce((n,x)=>n+(x.gap?15:34),0)));
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 let y=48;
 for(const line of lines){
  if(line.gap){y+=15;continue;}
  if(y>canvas.height-12)break;
  ctx.font=line.heading?'bold 27px Arial':'22px Arial';
  ctx.fillStyle='#263b44';ctx.fillText(line.text,40,y);y+=34;
 }
 return safeCanvas(canvas,'text-transcription');
}
async function captureHtml(source){
 const node=nodeFor(source);
 try{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  // Si la librairie est déjà disponible, elle conserve aussi les styles ::before.
  if(typeof window.html2canvas==='function'){
   try{return await viaHtml2Canvas(node,false);}catch(e){console.warn('CORTEX PDF : capture HTML locale',e);}
  }
  // Rendu navigateur sans dépendance externe : vraies positions des textes et des blocs.
  try{return viaDomPaint(node);}catch(e){console.warn('CORTEX PDF : dessin DOM',e);}
  // Autres moteurs si le canvas natif n'a pas pu reproduire le document.
  try{return await viaSvg(node);}catch(e){console.warn('CORTEX PDF : capture DOM SVG',e);}
  try{return await viaHtml2Canvas(node,true);}catch(e){console.warn('CORTEX PDF : chargement capture HTML',e);}
  return readableFallback(node);
 }finally{node.remove();}
}
return {captureHtml};
})();