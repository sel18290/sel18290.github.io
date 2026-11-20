import '../evaluations/pdf-local.js?v=1.1';

export function downloadCopyPdf({classCode,number,title,status,date,draft,previous,attachment,answers}){
 const pdf=new window.CORTEX_LOCAL_PDF();
 const margin=16,width=178;
 let y=20;
 function paragraph(value,{size=11,bold=false,color=[37,46,63],after=4}={}){
  pdf.setFont('helvetica',bold?'bold':'normal').setFontSize(size).setTextColor(...color);
  const step=size*.47;
  for(const line of pdf.splitTextToSize(value,width)){
   if(y+step>277){pdf.addPage();y=20;}
   pdf.text(line,margin,y);
   y+=step;
  }
  y+=after;
 }
 paragraph(status,{size:15,bold:true,color:[21,78,112]});
 paragraph(title,{size:14,bold:true});
 paragraph(classCode+' · N° '+number+' · '+date);
 if(previous)paragraph('Ancienne attribution du numéro',{bold:true});
 if(attachment)paragraph('Pièce jointe à télécharger séparément · '+attachment);
 for(const {prompt,answer} of answers){
  if(y>250){pdf.addPage();y=20;}
  paragraph(prompt,{bold:true,after:1});
  paragraph(answer,{after:6});
 }
 const pages=pdf.internal.getNumberOfPages();
 for(let page=1;page<=pages;page++){
  pdf.setPage(page).setFont('helvetica','normal').setFontSize(9).setTextColor(95,107,124);
  pdf.text('CORTEX Académie · '+classCode+' · N° '+number,margin,287);
  pdf.text(page+' / '+pages,210-margin,287,{align:'right'});
 }
 const safe=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w-]+/g,'_').slice(0,62);
 pdf.save((draft?'Brouillon_':'Copie_')+safe(classCode)+'_N'+number+'_'+safe(title)+'.pdf');
}
