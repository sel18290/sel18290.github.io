/* CORTEX Académie — parcours examen iPhone.
 * Une seule question et ses documents montés à la fois. Le formulaire
 * parent assure la sauvegarde du brouillon sur mobile et sur ordinateur.
 */
import { sourceFigure } from './student-source-view.js?v=1.0';
const E=(tag,cls,text)=>{
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(text!==undefined)element.textContent=String(text);
 return element;
};
const hasAnswer=value=>{
 const raw=String(value??'').trim();
 if(!raw||raw==='[]')return false;
 if(raw.startsWith('['))try{
  const list=JSON.parse(raw);
  return Array.isArray(list)?list.some(x=>String(x??'').trim()!==''):true;
 }catch{}
 return true;
};
export const mobileExam=()=>window.matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1100px)').matches;

export function installMobileExam({form,questions,exam,current,initialAnswers,onNavigate,canNavigate}){
 const answers=Object.assign(Object.create(null),initialAnswers);
 form.classList.add('cw-answer-form-paged');
 let active=0,destroyed=false,photoQuestions=new Set();
 const cards=[],steps=[],previous=[],next=[];
 const pager=E('nav','cw-mobile-pager');
 pager.setAttribute('aria-label','Navigation dans les questions du contrôle');
 const heading=E('div','cw-mobile-pager-heading');
 const position=E('strong','cw-mobile-pager-position');
 const countLabel=E('span','cw-mobile-answer-count');
 heading.append(position,countLabel);
 const pickLabel=E('label','cw-mobile-pager-select-label','Aller directement à la question');
 const selector=E('select','cw-mobile-pager-select');
 selector.setAttribute('aria-label','Choisir une question du contrôle');
 questions.forEach((q,i)=>{
  const option=E('option','','Question '+(i+1));option.value=String(i);selector.append(option);
 });
 pickLabel.append(selector);
 const strip=E('div','cw-mobile-question-strip');
 strip.setAttribute('role','group');
 strip.setAttribute('aria-label','Numéros des questions : fais glisser la rangée vers la gauche ou la droite');
 for(let i=0;i<questions.length;i++){
  const chip=E('button','cw-mobile-question-chip',i+1);
  chip.type='button';
  chip.addEventListener('click',()=>show(i));
  steps.push(chip);strip.append(chip);
 }
 const hint=E('small','cw-mobile-question-hint','Fais glisser les numéros ou touche « Suivante ». Balaye l’énoncé latéralement pour changer de question.');
 pager.append(heading,pickLabel,strip,hint);form.append(pager);
 function renderCard(i){
  const q=questions[i],card=cards[i];
  if(!card||card.dataset.loaded==='true')return;
  card.replaceChildren();
  const question=E('strong','',(i+1)+'. '+q.prompt);
  question.tabIndex=-1;
  card.append(question);
  if(q.page&&current.subject)card.append(E('small','cw-doc-ref','Document original · page '+q.page));
  const related=(exam.assets||[]).filter(a=>(q.assetIds||[]).includes(a.id)&&a.url);
  if(related.length){
   const source=E('div','cw-student-source-snippets');
   source.append(E('strong','','Documents fournis pour cette question'));
   for(const asset of related)source.append(sourceFigure(asset));
   card.append(source);
  }
  // Les graphiques éventuels ne sont construits que pour la question active.
  const ist=window.CORTEX_IST_VISUALS?.render?.(q);
  if(ist)card.append(ist);
  else if(q.doc)card.append(E('div','cw-student-question-doc',q.doc));
  const response=E('div','cw-question-response');
  response.innerHTML=window.CORTEX_QUESTION_TYPES.studentFields(q,answers[q.id]??'');
  card.append(response);card.dataset.loaded='true';
 }
 function readVisible(){
  const q=questions[active],wrapper=cards[active]?.querySelector('[data-cortex-q]');
  if(q&&wrapper)answers[q.id]=String(window.CORTEX_QUESTION_TYPES.readAnswer(wrapper,q)??'');
 }
 function answered(q){return hasAnswer(answers[q.id])||photoQuestions.has(q.id)}
 function answeredCount(){return questions.filter(answered).length}
 function refresh(){
  const n=answeredCount();
  position.textContent='Question '+(active+1)+' / '+questions.length;
  countLabel.textContent=n+' / '+questions.length+' répondues';
  selector.value=String(active);
  for(let i=0;i<steps.length;i++){
   const done=answered(questions[i]),current=i===active;
   const chip=steps[i];
   chip.classList.toggle('is-current',current);
   chip.classList.toggle('is-answered',done);
   chip.setAttribute('aria-current',current?'step':'false');
   chip.setAttribute('aria-label','Question '+(i+1)+(done?', réponse enregistrée':', sans réponse'));
   chip.textContent=(i+1)+(done?' ✓':'');
   selector.options[i].textContent='Question '+(i+1)+(done?' · répondue':'');
  }
  previous.forEach(b=>b.disabled=active===0);
  next.forEach(b=>b.disabled=active===questions.length-1);
 }
 function show(i){
  if(destroyed||!Number.isInteger(i)||i<0||i>=questions.length)return;
  if(canNavigate&&!canNavigate()){selector.value=String(active);return;}
  readVisible();
  if(i!==active){
   const old=cards[active];old.hidden=true;
   // Démonter l'ancienne question libère les SVG, les images et le tableau :
   // les réponses déjà saisies sont conservées indépendamment.
   old.replaceChildren();old.dataset.loaded='false';
   active=i;
   renderCard(i);cards[i].hidden=false;
  }
  const focused=document.activeElement;
  if(focused&&focused!==document.body&&/^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName))focused.blur();
  refresh();
  onNavigate();
  const chip=steps[i];
  const left=chip.offsetLeft-strip.offsetLeft-(strip.clientWidth-chip.offsetWidth)/2;
  strip.scrollTo({left:Math.max(0,left),behavior:'auto'});
  requestAnimationFrame(()=>{
   if(destroyed)return;
   cards[i].querySelector('strong')?.focus({preventScroll:true});
   cards[i].scrollIntoView({block:'start',behavior:'auto'});
  });
 }
 function arrow(text,change){
  const b=E('button','cw-mobile-pager-arrow',text);b.type='button';
  b.addEventListener('click',()=>show(active+change));
  (change<0?previous:next).push(b);
  return b;
 }
 const footer=E('div','cw-mobile-question-actions');
 footer.append(arrow('← Précédente',-1),arrow('Suivante →',1));
 questions.forEach((q,i)=>{
  const card=E('section','cw-answer-question');
  card.id='cw-student-question-'+(i+1);
  if(i!==0)card.hidden=true;
  cards.push(card);form.append(card);
 });
 renderCard(0);
 form.append(footer);
 selector.addEventListener('change',()=>show(Number(selector.value)));
 const updateCount=()=>{readVisible();refresh()};
 form.addEventListener('input',updateCount,{passive:true});
 form.addEventListener('change',updateCount,{passive:true});
 // La zone de texte et les tableaux gardent leur défilement natif iOS.
 // Les gestes latéraux sur l'énoncé seulement permettent précédent/suivant.
 let finger=null;
 form.addEventListener('touchstart',e=>{
  finger=null;
  if(!e.target.closest?.('.cw-answer-question')||
     e.target.closest?.('input,textarea,select,button,a,.cq-table-scroller,.ist-graphic,.cw-student-source-figure'))return;
  const t=e.touches.length===1?e.touches[0]:null;
  if(t&&t.clientX>24&&t.clientX<innerWidth-24)finger={x:t.clientX,y:t.clientY};
 },{passive:true});
 form.addEventListener('touchcancel',()=>{finger=null;},{passive:true});
 form.addEventListener('touchend',e=>{
  if(!finger)return;
  const start=finger;finger=null;
  const t=e.changedTouches[0];if(!t)return;
  const dx=t.clientX-start.x,dy=t.clientY-start.y;
  if(Math.abs(dx)>75&&Math.abs(dx)>Math.abs(dy)*1.65)
   show(Math.max(0,Math.min(questions.length-1,active+(dx<0?1:-1))));
 },{passive:true});
 refresh();
 return {
  setPhotoQuestions(ids){photoQuestions=new Set(ids);refresh()},
  getAnswers(){
   readVisible();
   return Object.fromEntries(questions.map(q=>[q.id,String(answers[q.id]??'')]));
  },
  destroy(){destroyed=true}
 };
}
