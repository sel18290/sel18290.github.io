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
 if(!window.CORTEX_PDF_SOURCE?.captureHtml)
  throw new Error('Moteur de capture des documents absent. Recharge CORTEX.');
 const canvas=await window.CORTEX_PDF_SOURCE.captureHtml(source);
 cache.set(key,canvas);
 return canvas;
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
 paragraph(pdf,ctx,'Documents utilisés par l’élève (si présents), questions, réponses et corrections.',{fontSize:9,color:[93,105,118],after:7});
}
function documentPlainText(html){
 const element=document.createElement('div');
 element.innerHTML=String(html||'');
 element.querySelectorAll('script,style,noscript').forEach(node=>node.remove());
 return (element.innerText||element.textContent||'').trim();
}
function documentWarning(pdf,ctx,message){
 ctx.warnings.push(message);
 paragraph(pdf,ctx,'DOCUMENT : '+message,{
  fontSize:9,color:[152,74,69],after:4
 });
}
async function appendSources(pdf,ctx,copy,exam,q,seen){
 const sectionIndex=Number(q.section||0);
 const pageNumber=Number(q.page||1);
 if(exam.pdfSource){
  const sourceKey='sample-section:'+sectionIndex;
  if(!seen.has(sourceKey)){
   seen.add(sourceKey);
   const title='DOCUMENT(S) FOURNI(S) À L’ÉLÈVE · PARTIE '+(sectionIndex+1);
   try{
    const canvas=await sourceCanvas(exam,q);
    if(canvas){
     if(canvas.cortexPdfMethod==='text-transcription')
      documentWarning(pdf,ctx,'Mise en page originale partiellement indisponible (transcription structurée).');
     picture(pdf,ctx,canvas,title);
    }else{
     const source=window.CORTEX_DOCS?.sections?.[sectionIndex]?.document;
     if(source){
      paragraph(pdf,ctx,title,{bold:true,color:[30,101,104]});
      paragraph(pdf,ctx,documentPlainText(source),{fontSize:9.5});
      documentWarning(pdf,ctx,'Le document a été retranscrit, sans ses graphiques originaux.');
     }else documentWarning(pdf,ctx,'Partie '+(sectionIndex+1)+' non retrouvée.');
    }
   }catch(error){
    const source=window.CORTEX_DOCS?.sections?.[sectionIndex]?.document;
    if(source){
     paragraph(pdf,ctx,title,{bold:true,color:[30,101,104]});
     paragraph(pdf,ctx,documentPlainText(source),{fontSize:9.5});
    }
    documentWarning(pdf,ctx,'Capture du document de la partie '+(sectionIndex+1)+' impossible : '+(error.message||error));
   }
  }
 }else if(exam.sourceId){
  const sourceKey='import-page:'+pageNumber;
  if(!seen.has(sourceKey)){
   seen.add(sourceKey);
   const title='DOCUMENT ORIGINAL FOURNI À L’ÉLÈVE · PAGE '+pageNumber+
    (exam.sourceName?' · '+exam.sourceName:'');
   try{
    const canvas=await sourceCanvas(exam,q);
    if(canvas)picture(pdf,ctx,canvas,title);
    else{
     const transcript=exam.sourcePages?.[pageNumber-1]||'';
     paragraph(pdf,ctx,title,{bold:true,color:[30,101,104]});
     if(transcript)paragraph(pdf,ctx,transcript,{fontSize:9.5});
     documentWarning(pdf,ctx,transcript?
      'Original PDF/Word indisponible sur cet appareil : texte extrait affiché à la place.' :
      'Original PDF/Word absent de ce navigateur. Réimporte le document depuis le navigateur qui le conserve.');
    }
   }catch(error){
    const transcript=exam.sourcePages?.[pageNumber-1]||'';
    if(transcript)paragraph(pdf,ctx,transcript,{fontSize:9.5});
    documentWarning(pdf,ctx,'Impossible de récupérer la page '+pageNumber+' du document original : '+(error.message||error));
   }
  }
 }else{
  const docs=[
   {key:'manual-shared',name:'DOCUMENT COMMUN À L’ÉVALUATION',value:exam.doc},
   {key:'manual-question:'+q.id,name:'DOCUMENT ASSOCIÉ À LA QUESTION '+(q.number||''),value:q.doc}
  ];
  for(const doc of docs){
   if(!String(doc.value||'').trim()||seen.has(doc.key))continue;
   seen.add(doc.key);
   try{
    if(/<\/?[a-z][\s\S]*>/i.test(doc.value)){
     const canvas=await screenshotHtml(doc.value,'manual:'+exam.id+':'+doc.key);
     picture(pdf,ctx,canvas,doc.name);
    }else{
     paragraph(pdf,ctx,doc.name,{bold:true,color:[30,101,104]});
     paragraph(pdf,ctx,doc.value,{fontSize:9.5});
    }
   }catch(error){
    paragraph(pdf,ctx,doc.name,{bold:true,color:[30,101,104]});
    paragraph(pdf,ctx,documentPlainText(doc.value),{fontSize:9.5});
    documentWarning(pdf,ctx,'Mise en page de '+doc.name+' impossible : '+(error.message||error));
   }
  }
 }
 for(const imageId of q.assetIds||[]){
  const assetKey='asset:'+imageId;
  if(seen.has(assetKey))continue;
  seen.add(assetKey);
  const meta=exam.assets?.find(a=>a.id===imageId);
  try{
   const canvas=await canvasForAsset(imageId);
   if(canvas)picture(pdf,ctx,canvas,'DOCUMENT ASSOCIÉ · '+(meta?.name||'Capture du contrôle'));
   else documentWarning(pdf,ctx,'Image liée à la question non retrouvée : '+(meta?.name||imageId));
  }catch(error){
   documentWarning(pdf,ctx,'Impossible d’intégrer '+(meta?.name||'une capture')+' : '+(error.message||error));
  }
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
 const ctx={layout:getLayout(pdf),y:24,warnings:[]};
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
 return {filename:name,count:good.length,pages:total,warnings:ctx.warnings};
}
return {exportCopies,summarize,answerFor,downloadName};
})();
