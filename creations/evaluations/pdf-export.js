window.CORTEX_PDF=(function pdfModule(){
'use strict';
const clean=v=>String(v??'').replace(/[\u200B-\u200F\uFEFF]/g,'').replace(/[^\S\r\n]+/g,' ').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[\u2022]/g,'-').replace(/[\u2192]/g,'->').replace(/\u2264/g,'<=').replace(/\u2265/g,'>=').replace(/\u2248/g,'environ ').replace(/[\u{1F300}-\u{1FAFF}]/gu,'');
const fmt=x=>Number.isFinite(Number(x))?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(Number(x)):'—';
const date=t=>t?new Date(t).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const fileSafe=name=>String(name||'Copies').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/_+/g,'_').slice(0,75);
const firstNonBlank=(...values)=>values.find(v=>String(v??'').trim())||'';
function answerFor(q,at){
 const raw=String(at.answers?.[q.id]??'');
 if(!raw.trim())return 'Non répondue.';
 if(q.type==='choice'){
  const i=Number(raw),chosen=Number.isInteger(i)?q.choices?.[i]:null;
  return chosen?`${i+1}. ${chosen}`:raw;
 }
 if(q.number===6){
  const p=raw.split(' | '),labels=['Battements du cœur','Alternance veille / sommeil','Cycle menstruel'];
  return labels.map((name,i)=>`${name} : ${p[i]?.trim()||'—'}`).join('\n');
 }
 if(q.number===10){
  const p=raw.split(' | ');return `Récupération physique : ${p[0]?.trim()||'—'}\nRêves fréquents : ${p[1]?.trim()||'—'}`;
 }
 return raw;
}
function summarize(copy,exam){
 const n=exam?.questions?.length||0;
 return {id:copy?.id,studentNumber:copy?.studentNumber||null,studentName:copy?.name||'Élève',
   className:copy?.className||'Sans classe',groupName:copy?.groupName||'Classe entière',
   examTitle:exam?.title||'Contrôle',questions:n,
   answered:exam?.questions?.filter(q=>String(copy?.answers?.[q.id]??'').trim()).length||0,
   grade:copy?.grade??null,date:copy?.submittedAt||null};
}
async function loadJsPDF(){
 if(window.CORTEX_LOCAL_PDF)return window.CORTEX_LOCAL_PDF;
 throw new Error('Le moteur PDF local est manquant. Recharge la page avec Ctrl+F5.');
}
const cache=new Map();
async function screenshotHtml(source,key){
 if(cache.has(key))return cache.get(key);
 // Aucun chargement réseau requis : html2canvas est facultatif si déjà présent.
 const node=document.createElement('div');
 node.className='pdf-document-snapshot';
 Object.assign(node.style,{position:'fixed',left:'-12000px',top:'0',width:'760px',background:'#fff',color:'#252525',padding:'10px',zIndex:'-1'});
 node.innerHTML=source;
 document.body.appendChild(node);
 try{
  let canvas;
  if(window.html2canvas){
    try{canvas=await window.html2canvas(node,{backgroundColor:'#ffffff',scale:1.15,logging:false,useCORS:false});}
    catch(error){canvas=null;}
  }
  if(!canvas){
    // Repli 100 % local : transcription lisible du document, sans dépendance CDN.
    const text=(node.innerText||node.textContent||'').replace(/\s+/g,' ').trim();
    canvas=document.createElement('canvas');
    canvas.width=1100;
    const context=canvas.getContext('2d');
    context.font='22px Arial';
    const words=text.split(/\s+/),lines=[],limit=1000;
    let line='';
    for(const word of words){
      const next=line?line+' '+word:word;
      if(context.measureText(next).width>limit&&line){lines.push(line);line=word;}else line=next;
    }
    if(line)lines.push(line);
    canvas.height=Math.max(120,Math.min(25000,lines.length*32+90));
    context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
    context.fillStyle='#153948';context.font='bold 23px Arial';context.fillText('DOCUMENT DE RÉFÉRENCE',38,41);
    context.fillStyle='#283d49';context.font='22px Arial';
    lines.forEach((txt,i)=>{if(i*32+88<canvas.height)context.fillText(txt,38,i*32+88);});
  }
  cache.set(key,canvas);return canvas;
 }finally{node.remove();}
}
async function sourceCanvas(exam,q,kind){
 const suffix=kind|| (exam.pdfSource?'sample':exam.sourceType||'manual');
 const key=exam.id+':'+suffix+':'+(exam.pdfSource?q.section:q.page||1);
 if(cache.has(key))return cache.get(key);
 if(exam.pdfSource){
  const section=window.CORTEX_DOCS?.sections?.[q.section];
  if(section?.document)return await screenshotHtml(section.document,key);
 }
 if(exam.sourceId&&['pdf','docx'].includes(exam.sourceType)){
  const target=document.createElement('div'),stageId='pdf-export-source-'+Math.random().toString(36).slice(2,10);
  target.id=stageId;Object.assign(target.style,{position:'fixed',left:'-12000px',top:'0',width:'800px',zIndex:'-1'});
  document.body.appendChild(target);
  try{
   if(exam.sourceType==='pdf')await window.CORTEX_DOCS?.renderPdfOriginal?.(exam.sourceId,q.page||1,stageId);
   else await window.CORTEX_VISUAL?.showWordSource?.(exam.sourceId,stageId);
   const canvas=target.querySelector('canvas');
   if(canvas){cache.set(key,canvas);return canvas;}
  }finally{target.remove();}
 }
 return null;
}
async function canvasForAsset(id){
 const key='asset:'+id;
 if(cache.has(key))return cache.get(key);
 const blob=await window.CORTEX_VISUAL?.getImage?.(id);
 if(!blob)return null;
 let image;
 if(typeof createImageBitmap==='function'){
  image=await createImageBitmap(blob);
 }else{
  image=await new Promise((resolve,reject)=>{
   const el=new Image(),url=URL.createObjectURL(blob);
   el.onload=()=>{URL.revokeObjectURL(url);resolve(el)};
   el.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Image de document illisible.'))};
   el.src=url;
  });
 }
 const canvas=document.createElement('canvas');
 canvas.width=image.width||image.naturalWidth;canvas.height=image.height||image.naturalHeight;
 canvas.getContext('2d').drawImage(image,0,0);image.close?.();
 cache.set(key,canvas);return canvas;
}
function getLayout(pdf){
 const width=pdf.internal.pageSize.getWidth(),height=pdf.internal.pageSize.getHeight();
 return {width,height,left:17,right:17,top:24,bottom:22,content:width-34};
}
function header(pdf,ctx,heading='COPIE D\'ÉVALUATION'){
 const L=getLayout(pdf);
 pdf.setFillColor(20,48,64);pdf.rect(0,0,L.width,15,'F');
 pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(9);
 pdf.text('CORTEX  /  '+clean(heading),L.left,9.7);
 pdf.setTextColor(33,46,57);
 return L;
}
function newPage(pdf,ctx,heading){pdf.addPage();ctx.y=header(pdf,ctx,heading).top;}
function paragraph(pdf,ctx,value,opts={}){
 const L=ctx.layout,margin=opts.margin??0;
 const width=L.content-margin,fontsize=opts.fontSize||10,line=opts.lineHeight||5.15;
 const raw=clean(value).replace(/\r\n/g,'\n');
 pdf.setFont('helvetica',opts.bold?'bold':'normal');pdf.setFontSize(fontsize);
 pdf.setTextColor(...(opts.color||[36,48,59]));
 const parts=raw.split('\n');
 for(const part of parts){
  const lines=part?pdf.splitTextToSize(part,width):[''];
  for(const txt of lines){
   if(ctx.y+line>L.height-L.bottom){newPage(pdf,ctx,'SUITE DE LA COPIE');pdf.setFont('helvetica',opts.bold?'bold':'normal');pdf.setFontSize(fontsize);pdf.setTextColor(...(opts.color||[36,48,59]));}
   if(txt)pdf.text(txt,L.left+margin,ctx.y);ctx.y+=line;
  }
 }
 ctx.y+=(opts.after??3);
}
function rule(pdf,ctx){if(ctx.y+3>ctx.layout.height-ctx.layout.bottom)newPage(pdf,ctx,'SUITE DE LA COPIE');pdf.setDrawColor(218,229,231);pdf.line(ctx.layout.left,ctx.y,ctx.layout.width-ctx.layout.right,ctx.y);ctx.y+=6;}
function picture(pdf,ctx,canvas,title){
 if(!canvas?.width||!canvas?.height)return;
 const L=ctx.layout,pxPerMm=canvas.width/L.content;
 let from=0;const safety=4;
 if(title){paragraph(pdf,ctx,title,{bold:true,fontSize:9,color:[30,101,104],after:2});}
 while(from<canvas.height){
  if(ctx.y+24>L.height-L.bottom)newPage(pdf,ctx,'DOCUMENT ASSOCIÉ');
  const available=L.height-L.bottom-ctx.y-safety;
  const pixels=Math.max(1,Math.floor(available*pxPerMm));
  const sliceH=Math.min(canvas.height-from,pixels);
  const temp=document.createElement('canvas');temp.width=canvas.width;temp.height=sliceH;
  const context=temp.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,sliceH);
  context.drawImage(canvas,0,from,canvas.width,sliceH,0,0,canvas.width,sliceH);
  const mmHeight=sliceH/pxPerMm;
  pdf.addImage(temp.toDataURL('image/jpeg',0.77),'JPEG',L.left,ctx.y,L.content,mmHeight,undefined,'FAST');
  ctx.y+=mmHeight+4;from+=sliceH;
  if(from<canvas.height)newPage(pdf,ctx,'DOCUMENT ASSOCIÉ · SUITE');
 }
 ctx.y+=3;
}
function cover(pdf,ctx,copy,exam){
 const L=ctx.layout;
 paragraph(pdf,ctx,'COPIE D\'ÉVALUATION',{fontSize:18,bold:true,color:[22,92,96],after:5});
 paragraph(pdf,ctx,exam.title,{fontSize:15,bold:true,after:9});
 const summary=summarize(copy,exam);
 const lines=[
  `Classe : ${summary.className}  /  ${summary.groupName}`,
  `Numéro d'élève : ${summary.studentNumber||'Non renseigné (copie démo ancienne)'}`,
  `Identifiant affiché : ${summary.studentName}`,
  `Remise : ${date(summary.date)}`,
  `Réponses : ${summary.answered} / ${summary.questions}`,
  `Durée prévue : ${copy.durationMinutes||exam.duration||60} minutes`,
  `Note : ${summary.grade!=null?fmt(summary.grade)+' / 20':'Non validée'}`];
 for(const line of lines)paragraph(pdf,ctx,line,{fontSize:11,lineHeight:6.5,after:1});
 ctx.y+=7;rule(pdf,ctx);
 paragraph(pdf,ctx,'Énoncés, documents remis aux élèves, réponses et corrections disponibles.',{fontSize:9,color:[93,105,118],after:7});
}
async function appendSources(pdf,ctx,copy,exam,q,seen){
 const sourceKey=exam.pdfSource?'s'+q.section:exam.sourceId?'p'+(q.page||1):q.doc?'q'+q.id:exam.doc?'main':'';
 if(sourceKey&&!seen.has(sourceKey)){
  seen.add(sourceKey);
  try{
   const canvas=await sourceCanvas(exam,q);
   if(canvas)picture(pdf,ctx,canvas,exam.pdfSource?'DOCUMENT(S) · PARTIE '+(Number(q.section||0)+1):
    'DOCUMENT ORIGINAL · PAGE '+(q.page||1));
   else if(!exam.sourceId&& (q.doc||exam.doc)){
    paragraph(pdf,ctx,'DOCUMENT DE RÉFÉRENCE',{bold:true,color:[29,107,109]});
    paragraph(pdf,ctx,firstNonBlank(q.doc,exam.doc),{fontSize:9.5});
   }else if(exam.sourceId){
    paragraph(pdf,ctx,'Document original non disponible sur cet appareil.',{fontSize:9,color:[149,78,78]});
   }
  }catch(err){
   paragraph(pdf,ctx,'Aperçu du document non disponible : '+(err?.message||'erreur'),{fontSize:9,color:[148,75,75]});
  }
 }
 for(const imageId of q.assetIds||[]){
  const meta=exam.assets?.find(a=>a.id===imageId);
  try{
   const canvas=await canvasForAsset(imageId);
   if(canvas)picture(pdf,ctx,canvas,'DOCUMENT ASSOCIÉ · '+(meta?.name||'Capture du contrôle'));
   else paragraph(pdf,ctx,'Capture associée non retrouvée sur cet appareil : '+(meta?.name||'Image'),{fontSize:9,color:[149,78,78]});
  }catch(err){paragraph(pdf,ctx,'Capture non lisible : '+String(err.message||err),{fontSize:9,color:[149,78,78]});}
 }
}
async function appendCopy(pdf,ctx,copy,exam,position){
 if(position>0)newPage(pdf,ctx,'COPIE SUIVANTE');
 cover(pdf,ctx,copy,exam);
 const seen=new Set();
 for(let i=0;i<exam.questions.length;i++){
  const q=exam.questions[i],mark=copy.marks?.[q.id];
  if(i>0)rule(pdf,ctx);
  await appendSources(pdf,ctx,copy,exam,q,seen);
  if(ctx.y+23>ctx.layout.height-ctx.layout.bottom)newPage(pdf,ctx,'QUESTION '+(q.number||i+1));
  paragraph(pdf,ctx,`QUESTION ${q.number||i+1} / ${exam.questions.length}   -   ${fmt(q.points)} point(s)`,{bold:true,fontSize:11,color:[22,99,105],after:3});
  paragraph(pdf,ctx,q.prompt,{fontSize:10.5,bold:true,after:5});
  paragraph(pdf,ctx,'RÉPONSE DE L\'ÉLÈVE',{fontSize:9,bold:true,color:[97,111,117],after:2});
  paragraph(pdf,ctx,answerFor(q,copy),{fontSize:10,after:6});
  if(mark&&Number.isFinite(Number(mark.points))){
   paragraph(pdf,ctx,`Points attribués : ${fmt(mark.points)} / ${fmt(q.points)}`,{fontSize:9,bold:true,color:[20,116,89],after:2});
  }else paragraph(pdf,ctx,`Question non corrigée - barème : ${fmt(q.points)} point(s)`,{fontSize:9,color:[115,117,124],after:2});
  if(mark?.comment)paragraph(pdf,ctx,'Commentaire : '+mark.comment,{fontSize:9,after:4});
 }
 rule(pdf,ctx);
 paragraph(pdf,ctx,'APPRÉCIATION GÉNÉRALE',{fontSize:10,bold:true,color:[19,99,107]});
 paragraph(pdf,ctx,copy.feedback||'Aucune appréciation générale enregistrée.',{fontSize:10});
 paragraph(pdf,ctx,'Fin de la copie - '+clean(copy.name||'Élève'),{fontSize:9,color:[115,123,133]});
}
function downloadName(copies,scope){
 const stamp=new Date().toISOString().slice(0,10);
 if(copies.length===1){
  const a=copies[0];
  return fileSafe('Copie_'+(a.className||'Classe')+'_'+(a.groupName||'Groupe')+'_N'+(a.studentNumber||'demo')+'_'+stamp)+'.pdf';
 }
 return fileSafe('Lot_copies_'+(scope||'Toutes_classes')+'_'+stamp)+'.pdf';
}
async function exportCopies(copies,getExam,opts={}){
 if(!Array.isArray(copies)||!copies.length)throw Error('Aucune copie remise à exporter.');
 const ctor=await loadJsPDF(),pdf=new ctor({orientation:'portrait',unit:'mm',format:'a4',compress:true});
 const ctx={layout:getLayout(pdf),y:24};
 header(pdf,ctx,copies.length>1?'LOT DE COPIES':'COPIE INDIVIDUELLE');
 const good=copies.filter(a=>getExam(a.examId));
 if(!good.length)throw Error('Contrôles introuvables pour les copies sélectionnées.');
 if(good.length>1){
  paragraph(pdf,ctx,'LOT DE COPIES - CORTEX',{fontSize:20,bold:true,color:[19,94,104],after:8});
  paragraph(pdf,ctx,'Export local du '+date(Date.now()),{fontSize:11});
  paragraph(pdf,ctx,good.length+' copies remises, regroupées dans un seul document PDF.',{fontSize:11,after:9});
  rule(pdf,ctx);
  for(const a of good){
   const e=getExam(a.examId);
   paragraph(pdf,ctx,`${a.className||'Sans classe'} / ${a.groupName||'Classe entière'}  -  N° ${a.studentNumber||'—'}  -  ${a.name||'Élève'}  -  ${e.title}  -  ${a.grade==null?'À corriger':fmt(a.grade)+'/20'}`,{fontSize:9,after:2});
  }
  newPage(pdf,ctx,'DÉTAIL DES COPIES');
 }
 cache.clear();
 for(let i=0;i<good.length;i++){
  const a=good[i],exam=getExam(a.examId);
  opts.onProgress?.(i+1,good.length,a);
  await appendCopy(pdf,ctx,a,exam,i===0?0:i);
 }
 const total=pdf.internal.getNumberOfPages();
 for(let p=1;p<=total;p++){
  pdf.setPage(p);const L=getLayout(pdf);
  pdf.setDrawColor(215,226,228);pdf.line(L.left,L.height-15,L.width-L.right,L.height-15);
  pdf.setTextColor(113,124,132);pdf.setFont('helvetica','normal');pdf.setFontSize(8);
  pdf.text('CORTEX - Export local de démonstration',L.left,L.height-10);
  pdf.text(`Page ${p} / ${total}`,L.width-L.right,L.height-10,{align:'right'});
 }
 const name=downloadName(good,opts.scope);
 pdf.save(name);
 cache.clear();
 return {filename:name,count:good.length,pages:total};
}
return {exportCopies,summarize,answerFor,downloadName};
})();
