/* CORTEX · Pièces documentaires IST A6 (1AGORA2).
 * Restitution graphique des informations figurant dans le PDF source de six pages.
 * Les courbes historiques sont tracées à partir des repères visibles dans le PDF,
 * sans prétendre constituer une extraction de données exactes.
 * Les documents fournis par l'auteur restent du texte lisible et accessible.
 */
(()=>{
'use strict';
const graphics={
 'ist-a6-q05':'chlamydia','ist-a6-q06':'chlamydia',
 'ist-a6-q08':'symptoms','ist-a6-q09':'symptoms','ist-a6-q10':'symptoms','ist-a6-q11':'symptoms',
 'ist-a6-q12':'vih','ist-a6-q13':'vih','ist-a6-q14':'vih','ist-a6-q15':'vih','ist-a6-q16':'vih'
};
const el=(tag,cl,value)=>{
 const n=document.createElement(tag);
 if(cl)n.className=cl;
 if(value!==undefined)n.textContent=value;
 return n;
};
const svgNS='http://www.w3.org/2000/svg';
function svgEl(tag,attrs,text){
 const n=document.createElementNS(svgNS,tag);
 for(const [k,v] of Object.entries(attrs||{}))n.setAttribute(k,String(v));
 if(text!==undefined)n.textContent=String(text);
 return n;
}
function chart(){
 const root=el('figure','ist-graphic ist-chart');
 root.append(el('div','ist-figure-banner','CHLAMYDIOSES : PAS D’AUGMENTATION EN 2016 (À CONFIRMER SUR LES ANNÉES À VENIR)'));
 root.append(el('div','ist-figure-subtitle','Document 2 · Diagnostics de Chlamydia · France · 2000–2016'));
 const graph=svgEl('svg',{viewBox:'0 0 740 420',role:'img',
  'aria-label':'Graphique historique : diagnostics de Chlamydia de 2000 à 2016, en hausse. Courbe verte des femmes environ 1 300 à 9 000, courbe bleue des hommes environ 700 à 5 200. Les deux courbes ne progressent pas en 2016.',
  preserveAspectRatio:'xMidYMid meet'});
 graph.append(svgEl('rect',{x:0,y:0,width:740,height:420,rx:9,fill:'#fff'}));
 const x0=78, x1=523, y0=330, y1=42, y=v=>y0-(v/12000)*(y0-y1), x=i=>x0+(i/16)*(x1-x0);
 for(let val=0;val<=12000;val+=2000){
  const yy=y(val);
  graph.append(svgEl('line',{x1:x0,y1:yy,x2:x1,y2:yy,stroke:val?'#e4eaf1':'#9faebb','stroke-width':1}));
  graph.append(svgEl('text',{x:x0-12,y:yy+5,'text-anchor':'end',fill:'#294054','font-size':13},String(val)));
 }
 graph.append(svgEl('line',{x1:x0,y1:y1,x2:x0,y2:y0,stroke:'#6b7b8b','stroke-width':1.6}));
 for(let i=0;i<=16;i+=2){
  graph.append(svgEl('text',{x:x(i),y:y0+20,'text-anchor':'middle',fill:'#294054','font-size':12},String(2000+i)));
 }
 graph.append(svgEl('text',{x:23,y:188,transform:'rotate(-90 23 188)','text-anchor':'middle',fill:'#162b42','font-size':14,'font-weight':700},'Nombre d’infections à Chlamydia'));
 const female=[1250,1000,1350,1800,2150,2350,3000,4300,5500,7100,8800,8850,9000,9350,9730,9900,9150];
 const male=[850,650,800,1000,1200,1500,1760,2150,2500,2950,3600,4300,4750,5050,5350,5320,5200];
 const line=(values,color)=>graph.append(svgEl('polyline',{points:values.map((n,i)=>x(i)+','+y(n)).join(' '),
  fill:'none',stroke:color,'stroke-width':4,'stroke-linejoin':'round','stroke-linecap':'round'}));
 line(female,'#34935a');line(male,'#315ffe');
 graph.append(svgEl('line',{x1:570,y1:115,x2:610,y2:115,stroke:'#34935a','stroke-width':4}));
 graph.append(svgEl('text',{x:619,y:112,fill:'#183b2c','font-size':13,'font-weight':700},'Femmes,'));
 graph.append(svgEl('text',{x:619,y:128,fill:'#183b2c','font-size':12},'tous laboratoires'));
 graph.append(svgEl('line',{x1:570,y1:205,x2:610,y2:205,stroke:'#315ffe','stroke-width':4}));
 graph.append(svgEl('text',{x:619,y:202,fill:'#233e83','font-size':13,'font-weight':700},'Hommes,'));
 graph.append(svgEl('text',{x:619,y:218,fill:'#233e83','font-size':12},'tous laboratoires'));
 graph.append(svgEl('text',{x:80,y:387,fill:'#597080','font-size':12},'Graphique redessiné d’après le document historique du PDF initial.'));
 root.append(graph);
 root.append(el('figcaption','ist-graphic-caption','Données historiques, non actuelles. Tracé redessiné pour la lisibilité ; les valeurs des courbes sont approximatives.'));
 return root;
}
function symptoms(){
 const root=el('figure','ist-graphic ist-symptoms');
 root.append(el('div','ist-symptoms-title','Tableau 2. Signes cliniques de l’infection à Chlamydia trachomatis'));
 const groups=[
  ['Homme',[
   'Asymptomatique (jusqu’à 50 %)',
   'Écoulement urétral et/ou dysurie (environ 50 %)',
   'Épididymites et autres complications locales (environ 2 %)'
  ]],
  ['Femme',[
   'Asymptomatique (70–80 %)',
   'Cervicite avec un col friable, écoulement mucopurulent, saignement lors des contacts sexuels',
   'Complications importantes : bartholinite, annexite, endométrite, salpingite, lésions tubaires, grossesse extra-utérine, douleurs pelviennes aiguës ou chroniques, stérilité'
  ]]
 ];
 for(const [name,items] of groups){
  const sec=el('section','ist-symptoms-group');
  sec.append(el('h4','',name));
  const ul=el('ul');
  for(const item of items)ul.append(el('li','',item));
  sec.append(ul);root.append(sec);
 }
 root.append(el('figcaption','ist-graphic-caption','Document 3 · Reconstitution mise en couleur du tableau présent dans le PDF original. Une IST peut être asymptomatique.'));
 return root;
}
function hiv(){
 const root=el('figure','ist-graphic ist-hiv');
 root.append(el('div','ist-vih-title','Trois chiffres à connaître sur le VIH'));
 const cards=[
  ['6 000','Personnes ayant découvert leur séropositivité en France en 2015'],
  ['1 600','Nouveaux cas de sida diagnostiqués en France en 2015'],
  ['150 000','Nombre estimé de personnes vivant avec le VIH en France, dont environ 30 000 non diagnostiquées']
 ];
 for(const [value,label] of cards){
  const row=el('div','ist-hiv-row');
  row.append(el('strong','ist-hiv-count',value),el('p','',label));root.append(row);
 }
 root.append(el('div','ist-hiv-world','Dans le monde à cette époque : environ 36,7 millions de personnes vivant avec le VIH.'));
 root.append(el('figcaption','ist-graphic-caption','Document 4 · Reconstitution des chiffres historiques du PDF. Ces données sont anciennes, et ne constituent pas des chiffres actuels.'));
 return root;
}
function render(q){
 if(!q||!/^ist-a6-q(?:0[1-9]|1[0-9]|2[01])$/.test(String(q.id||'')))return null;
 const root=el('section','ist-source-area');
 const what=graphics[q.id];
 if(what){
  root.append(what==='chlamydia'?chart():what==='symptoms'?symptoms():hiv());
 }
 const content=String(q.doc||'').trim();
 if(content){
  const box=el('div','ist-doc-text');
  const blocks=content.split(/\n\n+/).filter(Boolean);
  for(const block of blocks){
   const lines=block.split('\n');
   const header=lines.shift();
   const section=el('section','ist-doc-part');
   if(/^(?:Document\s*\d+|Situation du quotidien)/i.test(header)){
    const sep=header.indexOf('—');
    section.append(el('h4','ist-doc-heading',header));
   }else{
    section.append(el('p','ist-doc-paragraph',header));
   }
   if(lines.length)section.append(el('p','ist-doc-paragraph',lines.join('\n')));
   box.append(section);
  }
  root.append(box);
 }
 return root;
}
window.CORTEX_IST_VISUALS={render};
})();
