/* CORTEX — Albert Atlas : analyse visuelle de vrais documents PDF/Word,
 * par petites unités, progression réelle et diagnostic détaillé.
 * Le secret d'Albert reste exclusivement dans Supabase. */
window.CORTEX_ALBERT_IMPORT=(function(){
 'use strict';
 const ENDPOINT='cortex-albert-import-demo',BATCH=2;
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
 const trim=s=>String(s||'').replace(/\s+/g,' ').trim();
 const refKey=s=>trim(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/\b(?:docs?|documents?)\b/g,'document').replace(/[.:\s]+/g,' ').trim();
 const printedReferences=text=>[...String(text||'').matchAll(/\b(?:documents?|doc\.?|annexes?|figures?|tableaux?|graphiques?|schémas?|ressources?)\s*(?:n[°ºo]\s*)?(\d{1,3}[a-z]?|[A-Z](?![a-z]))\b/gi)].map(match=>match[0]);
 const visualScope=/\b(?:d['’]apr[èe]s|[àa] partir|[àa] l['’]aide|en observant|dans)\b.{0,90}\b(?:document|annexe|figure|sch[ée]ma|graphique|image|tableau)/i;
 const qType=q=>{
  const type=['text','short','number','choice','multi','table','fill'].includes(q.type)?q.type:'text';
  if(['choice','multi'].includes(type)&&(!Array.isArray(q.choices)||q.choices.length<2))return 'text';
  if(type==='table'&&(!q.tableRows?.length||!q.tableColumns?.length))return 'text';
  if(type==='fill'&&(!q.blanks?.length))return 'text';
  return type;
 };

 function progress(title='Analyse avec Albert IA'){
  const dialog=document.createElement('dialog');
  dialog.className='cortex-albert-progress';
  dialog.setAttribute('aria-label',title);
  const inner=document.createElement('div');
  inner.className='cai-progress-inner';
  const heading=document.createElement('h2');heading.textContent='✦ '+title;
  const info=document.createElement('p');info.className='cai-sub';
  info.textContent='Albert examine les pages originales et prépare les documents et questions de l’atelier.';
  const visual=document.createElement('div');visual.className='cai-animation';
  visual.innerHTML='<span></span><span></span><span></span>';
  const track=document.createElement('div');track.className='cai-track';
  track.setAttribute('role','progressbar');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow','0');
  const bar=document.createElement('div');bar.className='cai-bar';track.append(bar);
  const status=document.createElement('p');status.className='cai-status';status.textContent='Initialisation du document…';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const count=document.createElement('p');count.className='cai-count';count.textContent='Analyse en cours';
  const footer=document.createElement('div');footer.className='cai-footer';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Annuler l’analyse';cancel.className='cai-cancel';
  const done=document.createElement('button');done.type='button';done.textContent='Fermer';done.className='cai-done';done.hidden=true;
  const controller=new AbortController();let active=true;
  cancel.onclick=()=>{
   if(active){controller.abort();status.textContent='Analyse interrompue. Le document peut être repris dans l’atelier classique.';count.textContent='Interrompue';}
   cancel.hidden=true;done.hidden=false;active=false;
  };
  done.onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{if(active)controller.abort();dialog.remove();},{once:true});
  footer.append(cancel,done);
  inner.append(heading,info,visual,track,status,count,footer);
  dialog.append(inner);document.body.append(dialog);
  dialog.showModal();
  const update=(text,completed=0,total=0)=>{
   status.textContent=String(text||'Analyse en cours…');
   if(total>0){
    const percent=Math.max(0,Math.min(100,Math.round(completed/total*100)));
    bar.style.width=percent+'%';track.setAttribute('aria-valuenow',String(percent));
    count.textContent=completed+' / '+total+' page(s) analysée(s)';
   }else count.textContent='Préparation en cours';
  };
  const success=message=>{
   active=false;update(message,1,1);visual.classList.add('cai-finished');
   cancel.hidden=true;done.hidden=false;done.textContent='Voir mon atelier';
  };
  const failure=message=>{
   active=false;status.textContent='⚠ '+String(message||'Albert n’a pas pu terminer.');
   count.textContent='Le document original reste disponible dans l’atelier classique.';
   visual.classList.add('cai-error');cancel.hidden=true;done.hidden=false;
   done.textContent='Voir l’atelier et les détails';
  };
  return {update,success,failure,signal:controller.signal,close:()=>dialog.close(),element:dialog};
 }

 async function pdfRenderer(file){
  if(!window.pdfjsLib)throw Error('Lecteur PDF non disponible pour l’analyse visuelle. Vérifie ta connexion puis réessaie.');
  const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  return {
   pages:pdf.numPages,
   async jpeg(pageNumber,signal){
    if(signal?.aborted)throw Error('Analyse annulée.');
    const page=await pdf.getPage(pageNumber);
    const natural=page.getViewport({scale:1});
    const scale=Math.min(2.25,1500/Math.max(natural.width,natural.height));
    const viewport=page.getViewport({scale});
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.floor(viewport.width));canvas.height=Math.max(1,Math.floor(viewport.height));
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    let data=canvas.toDataURL('image/jpeg',0.82);
    if(data.length>670000)data=canvas.toDataURL('image/jpeg',0.64);
    if(data.length>680000)data=canvas.toDataURL('image/jpeg',0.48);
    canvas.width=0;canvas.height=0;
    if(data.length>680000)throw Error('La page '+pageNumber+' est trop riche pour l’analyse IA ; réduis sa résolution.');
    return data;
   },
   async crop(pageNumber,bbox,signal){
    if(signal?.aborted)throw Error('Analyse annulée.');
    const page=await pdf.getPage(pageNumber),base=page.getViewport({scale:1});
    const vp=page.getViewport({scale:Math.min(3,2200/Math.max(base.width,base.height))});
    const original=document.createElement('canvas');
    original.width=Math.ceil(vp.width);original.height=Math.ceil(vp.height);
    await page.render({canvasContext:original.getContext('2d'),viewport:vp}).promise;
    // La marge garde unités, légendes et sources près des bords indiqués par le modèle.
    const b=Array.isArray(bbox)&&bbox.length===4?bbox.map((v,i)=>i<2?Math.max(0,v-42):Math.min(1000,v+42)):[0,0,1000,1000];
    const sx=Math.max(0,Math.round(original.width*b[0]/1000)),sy=Math.max(0,Math.round(original.height*b[1]/1000));
    const width=Math.max(1,Math.min(original.width-sx,Math.round(original.width*(b[2]-b[0])/1000)));
    const height=Math.max(1,Math.min(original.height-sy,Math.round(original.height*(b[3]-b[1])/1000)));
    const canvas=document.createElement('canvas'),factor=Math.min(1,2000/Math.max(width,height));
    canvas.width=Math.max(1,Math.floor(width*factor));canvas.height=Math.max(1,Math.floor(height*factor));
    canvas.getContext('2d').drawImage(original,sx,sy,width,height,0,0,canvas.width,canvas.height);
    let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob||blob.size>1250000)blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.88));
    canvas.width=0;canvas.height=0;original.width=0;original.height=0;
    if(!blob)throw Error('Capture impossible');
    return blob;
   },
   close:()=>pdf.destroy().catch(()=>{})
  };
 }

 async function wordRenderer(file){
  if(!window.mammoth)throw Error('Lecteur Word non disponible.');
  const result=await window.mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});
  const clean=document.createElement('div');
  clean.innerHTML=result.value||'';
  clean.querySelectorAll('script,style,iframe,object,form,embed').forEach(x=>x.remove());
  clean.querySelectorAll('*').forEach(el=>{
   for(const a of [...el.attributes]){
    if(/^on/i.test(a.name)||['href','src','srcset','style'].includes(a.name)&&
     !(a.name==='src'&&/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(a.value)&&a.value.length<1500000))
      el.removeAttribute(a.name);
   }
  });
  const stage=document.createElement('div');
  stage.className='cai-word-render';
  stage.style.cssText='position:fixed;left:0;top:0;width:750px;background:#fff;color:#222;padding:24px;font:15px/1.5 Arial;z-index:-1;pointer-events:none;';
  stage.append(clean);document.body.append(stage);
  try{
   if(!window.html2canvas){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     script.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
     script.onload=resolve;script.onerror=()=>reject(Error('Lecteur de mise en page Word indisponible.'));
     document.head.append(script);
    });
   }
   const full=await window.html2canvas(stage,{backgroundColor:'#fff',scale:1,
    width:790,height:Math.min(2200,Math.ceil(stage.scrollHeight)),useCORS:false,logging:false});
   const target=document.createElement('canvas'),scale=Math.min(1,1300/Math.max(full.width,full.height));
   target.width=Math.max(1,Math.round(full.width*scale));
   target.height=Math.max(1,Math.round(full.height*scale));
   target.getContext('2d').drawImage(full,0,0,target.width,target.height);
   const data=target.toDataURL('image/jpeg',0.6);
   const blob=await new Promise(resolve=>target.toBlob(resolve,'image/jpeg',0.75));
   full.width=0;full.height=0;target.width=0;target.height=0;
   if(data.length>680000)throw Error('Aperçu Word trop volumineux');
   return {
    pages:1,
    jpeg:async()=>data,
    crop:async()=>blob,
    close:async()=>{}
   };
  }finally{stage.remove()}
 }

 async function analyze(pages,options={}){
  if(!Array.isArray(pages)||!pages.length||pages.length>35)throw Error('Le sujet doit comporter entre 1 et 35 pages.');
  if(!options.file)throw Error('Le document original est indispensable à l’analyse visuelle Albert.');
  const ui=options.progress;
  const status=(message,done,total)=>{ui?.update?.(message,done,total);options.onProgress?.(message,done,total);};
  const signal=options.signal||ui?.signal;
  const extension=options.file.name?.split('.').pop()?.toLowerCase();
  status('Préparation des images originales et du texte…',0,pages.length);
  const renderer=extension==='pdf'?await pdfRenderer(options.file):await wordRenderer(options.file);
  const {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}=await import('../evaluations-academie/config.js?v=1');
  const mode=options.mode==='academy'?'academy':'demo';
  if(mode==='academy'&&!options.accessToken)throw Error('Session professeur indisponible.');
  const headers={'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY};
  if(mode==='academy')headers.Authorization='Bearer '+options.accessToken;
  const documents=[],questions=[],warnings=[];
  const tasks=[];
  for(let start=0;start<pages.length;start+=BATCH)
   tasks.push({start,end:Math.min(pages.length,start+BATCH)});
  let completed=0;
  try{
   while(tasks.length){
    if(signal?.aborted)throw Error('Analyse annulée.');
    const {start,end}=tasks.shift(),selected=pages.slice(start,end),prepared=[];
    for(let j=0;j<selected.length;j++){
     const pageNo=start+j+1;
     status('Préparation visuelle de la page '+pageNo+' / '+pages.length+'…',completed,pages.length);
     const image=await renderer.jpeg(extension==='pdf'?pageNo:1,signal);
     const text=String(selected[j]||'').slice(0,3400);
     prepared.push({page:pageNo,text,image});
     if(String(selected[j]||'').length>3400)warnings.push('Page '+pageNo+' : texte extrait abrégé ; image complète transmise.');
    }
    status('Albert examine les graphiques et documents (pages '+(start+1)+' à '+end+')…',completed,pages.length);
    let output=null,analysisError=null;
    try{
     for(let attempt=0;attempt<2;attempt++){
      if(signal?.aborted)throw Error('Analyse annulée.');
      const response=await fetch(SUPABASE_URL+'/functions/v1/'+ENDPOINT,{
       method:'POST',cache:'no-store',headers,
       body:JSON.stringify({action:'analyze_subject',mode,pages:prepared}),signal
      });
      const result=await response.json().catch(()=>null);
      if(response.status===429&&attempt===0){
       status('Quota de fréquence Albert : reprise après le délai de sécurité…',completed,pages.length);
       await wait(mode==='demo'?22000:4000);
       continue;
      }
      if(!response.ok||!result?.ok){
       const code=String(result?.code||'HTTP_'+response.status),ref=result?.requestId?' [réf. '+result.requestId+']':'';
       throw Error((result?.error||'Erreur de communication Albert')+' ('+code+')'+ref);
      }
      output=result;break;
     }
     if(!output)throw Error('Aucune réponse exploitable du serveur.');
    }catch(err){analysisError=err}
    if(analysisError){
     if(prepared.length>1&&/ALBERT_TIMEOUT|MODEL_FORMAT|ALBERT_HTTP_5\d\d|UPSTREAM_JSON/.test(String(analysisError?.message||''))){
      status('Analyse de deux pages trop lourde. Albert réessaie chaque page séparément…',completed,pages.length);
      tasks.unshift({start:start+1,end});
      tasks.unshift({start,end:start+1});
      continue;
     }
     throw analysisError;
    }
    const documentMap=new Map();
    for(const d of output.documents||[]){
     const localId='p'+(d.page||start+1)+'-'+String(d.id||id()).slice(0,20);
     documentMap.set(String(d.id),localId);
     documents.push({...d,id:localId});
    }
    for(const q of output.questions||[]){
     questions.push({...q,
      documentIds:(q.documentIds||[]).map(did=>documentMap.get(String(did))).filter(Boolean)});
    }
    warnings.push(...(output.warnings||[]));
    completed+=prepared.length;
    status('Pages '+(start+1)+' à '+end+' terminées · '+questions.length+' question(s) trouvée(s).',
      completed,pages.length);
   }
  }finally{await renderer.close?.()}
   if(!questions.length)throw Error('Albert a examiné le document mais n’a reconnu aucune question. Vérifie que le sujet comporte des consignes.');
  const unique=new Set();
  const deduplicated=questions.filter(q=>{
    const prompt=trim(q.prompt).toLowerCase();
    const key=[q.page,q.number,prompt].join(':');
    if(!prompt||unique.has(key))return false;
   unique.add(key);return true;
  }).slice(0,40);
   const uniqueDocs=[...new Map(documents.map(d=>[d.id,d])).values()].slice(0,80);
   const labelled=new Map();
   for(const doc of uniqueDocs){
    const label=refKey(doc.label||printedReferences(doc.title)[0]);
    if(label)labelled.set(label,[...(labelled.get(label)||[]),doc]);
   }
   for(const q of deduplicated){
    const refs=new Set(q.documentIds||[]);
    const labels=[...new Set([...(q.documentLabels||[]),...printedReferences(q.prompt)].map(refKey).filter(Boolean))];
    let unresolved=false;
    for(const label of labels){
     const candidates=labelled.get(label)||[];
     if(candidates.some(d=>refs.has(d.id)))continue;
     const onPage=candidates.filter(d=>d.page===q.page);
     if(candidates.length===1)refs.add(candidates[0].id);
     else if(onPage.length===1)refs.add(onPage[0].id);
     else unresolved=true;
    }
    q.documentIds=[...refs];
    q.requiresDocument=q.requiresDocument===true||labels.length>0||refs.size>0||visualScope.test(q.prompt);
    q.sourceToVerify=unresolved||q.requiresDocument&&!refs.size;
    if(q.sourceToVerify)warnings.push('Vérifie les documents de la question '+(q.number||'de la page '+q.page)+'.');
   }
  return {ok:true,status:'draft',provider:'Albert API',vision:true,pages:pages.length,
   documents:uniqueDocs,questions:deduplicated,warnings};
 }

 function buildQuestions(result,local){
  const docs=result.documents||[],pageCount=Math.max(1,result.pages||local?.pages?.length||1);
  return (result.questions||[]).slice(0,40).map((q,i)=>{
   const refs=(q.documentIds||[]).map(ref=>docs.find(d=>d.id===ref)).filter(Boolean);
   const page=Math.min(pageCount,Math.max(1,Math.trunc(Number(q.page)||1)));
   const excerpt=refs.map(d=>[d.label,d.title,'page '+d.page].filter(Boolean).join(' · ')+'\n'+(d.excerpt||'')).join('\n\n').slice(0,5000);
   const type=qType(q);
   const p=q.points===null||q.points===undefined||q.points===''?null:Number(q.points);
   const points=p!==null&&Number.isFinite(p)&&p>=0&&p<=20?p:1;
   return {
    id:'ai-q-'+id()+'-'+i,number:i+1,
    detectedNo:String(q.number||i+1),prompt:String(q.prompt||'').slice(0,1200),
    type,points,pointsToVerify:p===null,correctToVerify:['choice','multi'].includes(type),page,assetIds:[],
    doc:excerpt,analysisDoc:excerpt,docRefs:refs.map(d=>d.id),aiSuggested:true,
    requiresDocument:q.requiresDocument===true,sourceToVerify:q.sourceToVerify===true,
    choices:Array.isArray(q.choices)?q.choices.slice(0,8):[],
    correct:0,correctIndices:[],blanks:Array.isArray(q.blanks)?q.blanks.slice(0,10):[],
    tableRows:Array.isArray(q.tableRows)?q.tableRows.slice(0,8):[],
    tableColumns:Array.isArray(q.tableColumns)?q.tableColumns.slice(0,6):[]
   };
  }).filter(q=>q.prompt.trim());
 }

 async function makeCaptures(file,result,questions,options={}){
  const docs=result.documents||[],max=options.max||50,signal=options.signal;
  const relevant=new Map();
  for(let i=0;i<questions.length;i++){
   const q=questions[i],refs=docs.filter(d=>(q.docRefs||[]).includes(d.id));
   const targets=refs.length?refs:q.requiresDocument||!options.onlyReferenced
    ?[{id:'page-'+q.page,title:'Page originale '+q.page,page:q.page,bbox:null}]:[];
   for(const doc of targets){
    if(!relevant.has(doc.id))relevant.set(doc.id,{doc,questionIndices:[]});
    relevant.get(doc.id).questionIndices.push(i);
   }
  }
  const selected=[...relevant.values()].slice(0,max),skipped=relevant.size-selected.length;
  const rend=(file.name||'').toLowerCase().endsWith('.pdf')?await pdfRenderer(file):await wordRenderer(file);
  const out=[];
  try{
   for(let i=0;i<selected.length;i++){
    if(signal?.aborted)break;
    const {doc,questionIndices}=selected[i];
    try{
     options.onProgress?.('Association de la capture '+(i+1)+' / '+selected.length+'…');
     const pageNo=Math.min(rend.pages,Math.max(1,Number(doc.page)||1));
     const blob=await rend.crop(pageNo,doc.bbox,signal);
     if(blob)out.push({blob,page:pageNo,questionIndices,name:trim(doc.label||doc.title||'Document')+' · page '+pageNo});
    }catch(e){console.warn('Capture Albert non disponible',e)}
   }
  }finally{await rend.close?.()}
  return {captures:out,skipped:skipped+selected.length-out.length};
 }
 return {analyze,buildQuestions,makeCaptures,progress};
})();
