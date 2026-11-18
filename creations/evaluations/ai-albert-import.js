/* CORTEX — préparation d'un atelier documentaire avec Albert IA.
   Seul le texte extrait est transmis après accord explicite.
   L'original PDF/Word et les captures restent dans le navigateur. */
window.CORTEX_ALBERT_IMPORT=(function(){
 'use strict';
 async function analyze(pages,options={}){
  if(!Array.isArray(pages)||!pages.length||pages.length>35)throw Error('Albert accepte 35 pages textuelles maximum.');
  const perPage=Math.max(300,Math.min(2500,Math.floor(30000/pages.length)));
  const texts=pages.map(p=>String(p||'').slice(0,perPage));
  const pagesTruncated=pages.filter(p=>String(p||'').length>perPage).length;
  if(texts.reduce((a,p)=>a+p.length,0)<70)throw Error('Document probablement scanné : pas assez de texte détecté pour Albert. Ouvre l’atelier classique.');
  const {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}=await import('../evaluations-academie/config.js?v=1');
  const mode=options.mode==='academy'?'academy':'demo';
  const headers={'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY};
  if(mode==='academy'){
   if(!options.accessToken)throw Error('Connexion professeur obligatoire pour cet espace.');
   headers.Authorization='Bearer '+options.accessToken;
  }
  const response=await fetch(SUPABASE_URL+'/functions/v1/cortex-albert-import-demo',{
   method:'POST',cache:'no-store',headers,
   body:JSON.stringify({action:'analyze_subject',mode,pages:texts})
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result?.ok)throw Error(result?.error||'Albert n’a pas pu analyser le sujet.');
  if(!Array.isArray(result.questions)||!result.questions.length)throw Error('Aucune question fiable détectée.');
  result.warnings=Array.isArray(result.warnings)?result.warnings:[];
  if(pagesTruncated)result.warnings.push('Le texte de '+pagesTruncated+' page(s) a été abrégé pour l’IA : vérifie les éléments manquants dans le document original.');
  return result;
 }
 function buildQuestions(result,local){
  const docs=result.documents||[],pageCount=Math.max(1,result.pages||local?.pages?.length||1);
  return (result.questions||[]).slice(0,40).map((q,i)=>{
   const refs=(q.documentIds||[]).map(id=>docs.find(d=>d.id===id)).filter(Boolean);
   const page=Math.min(pageCount,Math.max(1,Math.trunc(Number(q.page)||1)));
   const excerpt=refs.map(d=>(d.title||'Document')+' (page '+d.page+') : '+(d.excerpt||'')).join('\n\n').slice(0,4000);
   return {
    id:'ai-q-'+Date.now()+'-'+i,number:i+1,
    detectedNo:String(q.number||i+1),prompt:String(q.prompt||'').slice(0,1200),
    type:'text',points:Number.isFinite(Number(q.points))&&Number(q.points)>0?Number(q.points):1,
    pointsToVerify:q.points==null,page,assetIds:[],
    doc:excerpt,docRefs:refs.map(d=>d.id),aiSuggested:true
   };
  }).filter(q=>q.prompt.trim());
 }
 async function capturePages(exam,file,onStatus){
  if(exam.sourceType!=='pdf'||!exam.questions?.length)return {added:0,skipped:0};
  if(!window.pdfjsLib)return {added:0,skipped:0};
  const pageSet=new Set();
  for(const q of exam.questions){
   const refs=(exam.detectedDocuments||[]).filter(d=>(q.docRefs||[]).includes(d.id));
   const pages=refs.length?refs.map(d=>d.page):[q.page];
   for(const p of pages)if(Number.isInteger(p)&&p>0&&p<=exam.sourcePageCount)pageSet.add(p);
  }
  const selected=[...pageSet].sort((a,b)=>a-b).slice(0,12),skipped=Math.max(0,pageSet.size-12);
  if(!selected.length)return {added:0,skipped};
  let doc;
  try{doc=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise}
  catch{return {added:0,skipped:pageSet.size}};
  const assetByPage=new Map();
  for(const pageNo of selected){
   try{
    if(onStatus)onStatus('Création de la capture originale de la page '+pageNo+'…');
    const p=await doc.getPage(pageNo),v=p.getViewport({scale:1.05}),canvas=document.createElement('canvas');
    const factor=Math.min(1,1450/Math.max(v.width,v.height));
    const viewport=p.getViewport({scale:1.05*factor});
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.78));
    canvas.width=0;canvas.height=0;
    if(!blob)continue;
    const id='albert-page-'+Date.now()+'-'+pageNo+'-'+Math.floor(Math.random()*100000);
    await window.CORTEX_VISUAL.saveImage(blob,id);
    exam.assets.push({id,name:'Document original · page '+pageNo,page:pageNo,createdAt:Date.now(),aiSuggested:true});
    assetByPage.set(pageNo,id);
   }catch(error){console.warn('Capture locale Albert :',error)}
  }
  for(const q of exam.questions){
   const refs=(exam.detectedDocuments||[]).filter(d=>(q.docRefs||[]).includes(d.id));
   const pages=refs.length?refs.map(d=>d.page):[q.page];
   q.assetIds=[...new Set(pages.map(p=>assetByPage.get(p)).filter(Boolean))];
  }
  try{await doc.destroy()}catch{}
  return {added:assetByPage.size,skipped:skipped+selected.length-assetByPage.size};
 }
 return {analyze,buildQuestions,capturePages};
})();