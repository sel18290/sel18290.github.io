/* CORTEX · Navigation rapide, sans modification du moteur d'évaluations. */
(function cortexQuickNav(){
 'use strict';
 const commands=[
  ['home','⌂','Accueil','Découvrir CORTEX et les espaces','#accueil','Navigation'],
  ['dashboard','▦','Vue d’ensemble','Tableau de bord professeur','#professeur/dashboard','Professeur'],
  ['classes','▣','Mes classes','Organiser les classes et demi-groupes','#professeur/classes','Professeur'],
  ['pins','⌑','PIN élèves','Numéros sur la liste et PIN individuels','#professeur/codes','Professeur'],
  ['controls','▤','Mes contrôles','Bibliothèque et QR codes','#professeur/controles','Évaluations'],
  ['copies','✎','Copies & notes','Consulter, noter et exporter','#professeur/copies','Évaluations'],
  ['monitor','◷','Suivi des épreuves','Surveillance pédagogique locale','#professeur/suivi','Évaluations'],
  ['integrity','◈','Anti-triche','Activer les outils de prévention','#professeur/integrite','Évaluations'],
  ['analytics','▥','Analyses','Indicateurs et moyennes','#professeur/analyses','Évaluations'],
  ['import','⇪','Importer PDF / Word','Associer un document source','#professeur/import','Création'],
  ['create','＋','Créer un contrôle','Questions, documents et barème','#professeur/creer','Création'],
  ['student','✧','Espace élève','Découvrir la passation','#eleve/accueil','Navigation'],
  ['tour','✦','Visite guidée','Parcours interactif en 13 étapes','#visite','Navigation']
 ];
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 let panel=null,input=null,list=null,activeIndex=0,visible=[],previousFocus=null;
 const launcher=document.getElementById('ct-command-launch');
 function create(tag,className,text){
  const n=document.createElement(tag);
  if(className)n.className=className;
  if(text!==undefined)n.textContent=text;
  return n;
 }
 function isOpen(){return !!panel}
 function selected(){
  const buttons=list?.querySelectorAll('button[data-command]')||[];
  buttons.forEach((b,i)=>{
   const on=i===activeIndex;
   b.setAttribute('aria-selected',String(on));
   b.classList.toggle('is-selected',on);
   if(on)input.setAttribute('aria-activedescendant',b.id);
  });
  const current=buttons[activeIndex];
  if(current)current.scrollIntoView({block:'nearest',behavior:'auto'});
 }
 function render(){
  if(!panel)return;
  const q=normalize(input.value);
  const parts=q.split(/\s+/).filter(Boolean);
  visible=commands.filter(c=>parts.every(word=>normalize(c[2]+' '+c[3]+' '+c[5]).includes(word)));
  activeIndex=Math.max(0,Math.min(activeIndex,visible.length-1));
  list.replaceChildren();
  if(!visible.length){
   const empty=create('div','ct-command-empty','Aucune rubrique trouvée. Essayez « copies », « classe » ou « contrôle ».');
   list.append(empty);
   input.removeAttribute('aria-activedescendant');
   return;
  }
  let lastGroup='';
  for(const [i,c] of visible.entries()){
   if(c[5]!==lastGroup){const group=create('div','ct-command-group',c[5].toUpperCase());list.append(group);lastGroup=c[5]}
   const button=create('button','ct-command-option');
   button.type='button';button.dataset.command=c[0];button.id='ct-command-result-'+i;
   button.setAttribute('role','option');
   const ico=create('span','ct-command-icon',c[1]);
   ico.setAttribute('aria-hidden','true');
   const body=create('span','ct-command-text');
   body.append(create('strong','',c[2]),create('small','',c[3]));
   const arrow=create('span','ct-command-arrow','↗');arrow.setAttribute('aria-hidden','true');
   button.append(ico,body,arrow);list.append(button);
  }
  selected();
 }
 function close(){
  if(!panel)return;
  panel.remove();panel=null;input=null;list=null;visible=[];
  document.body.classList.remove('ct-command-open');
  launcher?.setAttribute('aria-expanded','false');
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  else launcher?.focus({preventScroll:true});
  previousFocus=null;
 }
 function go(id){
  const command=commands.find(c=>c[0]===id);if(!command)return;
  close();
  if(command[0]==='tour'){window.CORTEX_TOUR?.start?.();return}
  if(location.hash!==command[4])location.hash=command[4];
  else window.scrollTo({top:0,behavior:'smooth'});
 }
 function open(){
  if(panel){input?.focus();return}
  previousFocus=document.activeElement;
  panel=create('div','ct-command-backdrop');panel.id='ct-command-backdrop';
  const dialog=create('section','ct-command-dialog');
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-labelledby','ct-command-title');
  const head=create('div','ct-command-heading');
  const meta=create('div','ct-command-heading-copy');
  meta.append(create('span','ct-command-kicker','CORTEX · NAVIGATION'),create('h2','', 'Aller directement à…'));
  meta.querySelector('h2').id='ct-command-title';
  const dismiss=create('button','ct-command-close','×');dismiss.type='button';dismiss.dataset.dismiss='true';dismiss.setAttribute('aria-label','Fermer la navigation rapide');
  head.append(meta,dismiss);
  const inputWrap=create('div','ct-command-input-wrap');
  const glass=create('span','ct-command-search-icon','⌕');glass.setAttribute('aria-hidden','true');
  input=create('input','ct-command-input');input.id='ct-command-input';input.type='search';input.setAttribute('aria-label','Rechercher une rubrique');input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls','ct-command-results');input.setAttribute('aria-expanded','true');
  input.placeholder='Une classe, un contrôle, les copies…';
  input.autocomplete='off';input.spellcheck=false;
  const key=create('span','ct-command-key','ESC');
  inputWrap.append(glass,input,key);
  list=create('div','ct-command-results');list.id='ct-command-results';list.setAttribute('role','listbox');list.setAttribute('aria-label','Rubriques accessibles');
  const foot=create('div','ct-command-footer');
  foot.append(create('span','','↑ ↓ Choisir'),create('span','','↵ Ouvrir'),create('span','','Échap Fermer'));
  dialog.append(head,inputWrap,list,foot);panel.append(dialog);document.body.append(panel);
  document.body.classList.add('ct-command-open');
  launcher?.setAttribute('aria-expanded','true');
  activeIndex=0;render();input.focus({preventScroll:true});
 }
 launcher?.addEventListener('click',()=>isOpen()?close():open());
 document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='k'){
   event.preventDefault();isOpen()?close():open();return;
  }
  if(!panel)return;
  if(event.key==='Escape'){event.preventDefault();close();return}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();if(!visible.length)return;
   activeIndex=(activeIndex+(event.key==='ArrowDown'?1:-1)+visible.length)%visible.length;selected();return;
  }
  if(event.key==='Enter'&&document.activeElement===input){
   event.preventDefault();if(visible[activeIndex])go(visible[activeIndex][0]);return;
  }
  if(event.key==='Tab'){
   const focusable=[panel.querySelector('.ct-command-close'),input,...panel.querySelectorAll('button[data-command]')].filter(Boolean);
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
   else if(!panel.contains(document.activeElement)){event.preventDefault();input.focus()}
  }
 });
 document.addEventListener('input',event=>{if(panel&&event.target===input){activeIndex=0;render()}});
 document.addEventListener('click',event=>{
  if(!panel)return;
  if(event.target===panel||event.target.closest('[data-dismiss]')){close();return}
  const item=event.target.closest('[data-command]');
  if(item&&panel.contains(item))go(item.dataset.command);
 });
 window.addEventListener('hashchange',()=>{if(panel)close()});
 window.CORTEX_QUICK_NAV={open,close,commands:commands.length};
})();
