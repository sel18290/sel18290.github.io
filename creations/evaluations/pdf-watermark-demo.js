/* CORTEX démonstration : ajouter le marquage DANS un PDF original importé.
 * Fichier local uniquement, sans transfert. Éléments de démonstration :
 * l'original reste toujours accessible via le stockage local/devtools.
 */
window.CORTEX_DEMO_PDF_WATERMARK=(function(){
 'use strict';
 let loading=null;
 function loadLib(){
  if(window.PDFLib)return Promise.resolve(window.PDFLib);
  if(!loading)loading=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
   script.onload=()=>window.PDFLib?resolve(window.PDFLib):reject(Error('Bibliothèque PDF indisponible.'));
   script.onerror=()=>reject(Error('Impossible de charger le module PDF. Vérifie la connexion.'));
   document.head.append(script);
  }).catch(e=>{loading=null;throw e});
  return loading;
 }
 const ascii=value=>String(value||'CLASSE').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9_-]/gi,'_').toUpperCase().slice(0,26);
 async function download(exam,attempt){
  if(!exam?.sourceId||exam.sourceType!=='pdf'||!attempt)throw Error('Ce contrôle ne possède pas de PDF original importé.');
  const config=window.CORTEX_INTEGRITY?.config(exam);
  if(config?.enabled!==true||config?.watermarkCapture!==true)
   throw Error('Active le mode intégrité et le filigrane de ce contrôle.');
  const file=await window.CORTEX_DOCS.readFile(exam.sourceId);
  if(!file?.blob||file.blob.size>8388608)throw Error('Document local introuvable ou trop volumineux.');
  const {PDFDocument,StandardFonts,degrees,rgb}=await loadLib();
  let pdf;
  try{pdf=await PDFDocument.load(await file.blob.arrayBuffer(),{updateMetadata:false})}
  catch{throw Error('Ce PDF ne peut pas être marqué. Utilise un PDF non chiffré.');}
  const cls=ascii(attempt.className||'CLASSE'),number=String(attempt.studentNumber||'DEMO').slice(0,5);
  const tag='CORTEX  '+cls+'  ELEVE N '+number;
  const font=await pdf.embedFont(StandardFonts.HelveticaBold);
  for(const page of pdf.getPages()){
   const {width,height}=page.getSize(),size=Math.max(9,Math.min(14,width/40)),step=Math.max(155,width/3);
   for(let y=-40;y<height+100;y+=110){
    for(let x=-120;x<width+100;x+=step)
     page.drawText(tag,{x,y,size,font,rotate:degrees(24),color:rgb(.5,.12,.19),opacity:.23});
   }
   page.drawRectangle({x:0,y:0,width,height:27,color:rgb(.94,.97,.99),opacity:.94});
   page.drawText('CORTEX | '+cls+' | ELEVE N '+number,{
    x:15,y:9,size:Math.min(10,size),font,color:rgb(.13,.33,.48)});
  }
  const data=await pdf.save({useObjectStreams:true});
  const blob=new Blob([data],{type:'application/pdf'});
  const link=document.createElement('a');
  const url=URL.createObjectURL(blob);
  link.href=url;
  link.download='CORTEX_Sujet_'+cls+'_N'+number+'.pdf';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),45000);
  return link.download;
 }
 return {download};
})();
