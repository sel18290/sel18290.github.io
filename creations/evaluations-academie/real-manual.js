/* Espace réel : éditeur pédagogique question par question, inspiré de la démonstration. */
const $=id=>document.getElementById(id);
const QT=()=>window.CORTEX_QUESTION_TYPES;
const h=x=>QT().h(x);
const state={questions:[],index:0,editingId:null};
const newId=()=> 'q-'+crypto.randomUUID().slice(0,24);
const blank=()=>({id:newId(),prompt:'',points:1,type:'text',doc:''});
function current(){return state.questions[state.index];}
function setHint(value){const el=$('manual-save-hint');if(el)el.textContent=String(value||'');}
function total(){return state.questions.reduce((v,q)=>v+Number(q.points||0),0);}
function paint(){
 const q=current();if(!q)return;
 const num=state.index+1,t=QT(),root=$('manual-question-editor');
 $('real-manual-amount').textContent=state.questions.length+' question(s)';
 $('real-manual-total').textContent=total().toLocaleString('fr-FR',{maximumFractionDigits:2})+' / 20 points conseillés';
 $('real-manual-current').textContent='Question '+num+' / '+state.questions.length;
 const list=$('manual-question-tabs');list.replaceChildren();
 state.questions.forEach((item,i)=>{
  const b=document.createElement('button');b.type='button';b.className='real-manual-tab'+(state.index===i?' selected':'');
  b.textContent=(i+1)+'. '+(item.prompt||'Nouvelle question')+' · '+Number(item.points||0)+' pt';
  b.setAttribute('aria-current',state.index===i?'step':'false');
  b.addEventListener('click',()=>{state.index=i;paint();});
  list.append(b);
 });
 const typeOpts=t.TYPES.map(item=>'<option value="'+h(item[0])+'" '+(t.type(q)===item[0]?'selected':'')+'>'+h(item[1])+'</option>').join('');
 root.innerHTML=
  '<div class="real-manual-item-head"><strong>QUESTION '+num+'</strong><span>'+h(Number(q.points||0))+' point(s)</span></div>'+
  '<label>Énoncé de la question<textarea data-manual-field="prompt" rows="4" maxlength="1200" placeholder="Rédige une consigne claire…">'+h(q.prompt||'')+'</textarea></label>'+
  '<div class="real-manual-qgrid"><label>Type de réponse<select data-manual-field="type">'+typeOpts+'</select></label>'+
  '<label>Barème (points)<input data-manual-field="points" type="number" min="0" max="20" step="0.25" value="'+h(q.points)+'"></label></div>'+
  t.editorExtra(q,state.index,'manual')+
  '<label>Document propre à cette question (facultatif)<textarea data-manual-field="doc" rows="4" maxlength="5000" placeholder="Source, tableau documentaire à interpréter, données…">'+h(q.doc||'')+'</textarea></label>'+
  '<div class="real-manual-actions"><button type="button" data-manual-action="move-up" '+(state.index===0?'disabled':'')+'>↑ Monter</button>'+
  '<button type="button" data-manual-action="move-down" '+(state.index===state.questions.length-1?'disabled':'')+'>↓ Descendre</button>'+
  '<button type="button" data-manual-action="duplicate">Dupliquer</button>'+
  '<button type="button" data-manual-action="delete" '+(state.questions.length===1?'disabled':'')+'>Supprimer</button></div>';
 $('manual-prev').disabled=state.index===0;
 $('manual-next').disabled=state.index===state.questions.length-1;
 preview();
}
function preview(){
 const common=$('exam-common-doc')?.value||'',specific=current()?.doc||'',node=$('manual-source-preview');
 node.replaceChildren();
 const title=document.createElement('strong');title.textContent=specific?'Document spécifique à la question':common?'Document commun au contrôle':'Aucun document renseigné';
 const p=document.createElement('p');
 p.textContent=specific||common||'Tu peux ajouter le texte d’un document commun au-dessus, ou un document spécifique dans la question.';
 node.append(title,p);
}
function runAction(action){
 const q=current(),i=state.index;
 if(action==='delete'){if(state.questions.length<2)return;state.questions.splice(i,1);state.index=Math.min(i,state.questions.length-1);}
 else if(action==='duplicate'){if(state.questions.length>=40){setHint('Limite : 40 questions.');return;}state.questions.splice(i+1,0,{...structuredClone(q),id:newId()});state.index=i+1;}
 else if(action==='move-up'&&i>0){[state.questions[i-1],state.questions[i]]=[state.questions[i],state.questions[i-1]];state.index--;}
 else if(action==='move-down'&&i<state.questions.length-1){[state.questions[i+1],state.questions[i]]=[state.questions[i],state.questions[i+1]];state.index++;}
 paint();
}
function updateField(target,rerender){
 const q=current(),field=target.dataset.manualField;
 if(!q||!field)return;
 if(field==='points')q.points=Number(target.value);
 else if(field==='prompt'||field==='doc')q[field]=target.value;
 else QT().applyField(q,field,target.value);
 if(field==='type'||rerender)paint();
 else{
  $('real-manual-total').textContent=total().toLocaleString('fr-FR',{maximumFractionDigits:2})+' / 20 points conseillés';
  if(field==='doc')preview();
 }
}
function reset(){
 state.questions=[blank()];state.index=0;state.editingId=null;
 setHint('Nouveau contrôle. Prépare les questions, puis enregistre un brouillon.');
 paint();
}
function edit(exam){
 if(!exam)return;
 const isPublished=!!exam.published;
 state.editingId=isPublished?null:exam.id;
 state.questions=(Array.isArray(exam.content?.questions)?structuredClone(exam.content.questions):[]).map(q=>QT().initialize(q,q.type||'text'));
 if(!state.questions.length)state.questions=[blank()];
 state.index=0;
 $('exam-title').value=(exam.title||'')+(isPublished?' (nouvelle version)':'');
 $('exam-class').value=exam.class_id||'';
 $('exam-description').value=exam.content?.description||'';
 $('exam-level').value=exam.content?.level||'Bac professionnel';
 $('exam-chapter').value=exam.content?.chapter||'';
 $('exam-duration').value=Number(exam.content?.duration||60);
 $('exam-common-doc').value=exam.content?.doc||'';
 const anti=exam.content?.antiCheat||{};
 const cfg={enabled:'exam-integrity-on',blockPaste:'exam-integrity-paste',blockCopy:'exam-integrity-copy',
 trackVisibility:'exam-integrity-tabs',warnStudent:'exam-integrity-warn',watermarkCapture:'exam-integrity-watermark'};
 for(const [key,id] of Object.entries(cfg))if(typeof anti[key]==='boolean')$(id).checked=anti[key];
 setHint(isPublished?'Le contrôle publié est préservé : création d’une nouvelle version en brouillon.':'Modification du contrôle existant en brouillon.');
 paint();
 location.hash='#exam-form';
 document.body.dataset.acadView='creer';
 $('prof-assessments')?.scrollIntoView({behavior:'smooth',block:'start'});
}
$('manual-add')?.addEventListener('click',()=>{
 if(state.questions.length>=40){setHint('Limite : 40 questions par contrôle.');return;}
 state.questions.splice(state.index+1,0,blank());state.index++;paint();
});
$('manual-prev')?.addEventListener('click',()=>{if(state.index>0){state.index--;paint();}});
$('manual-next')?.addEventListener('click',()=>{if(state.index<state.questions.length-1){state.index++;paint();}});
$('manual-question-editor')?.addEventListener('click',event=>{const el=event.target.closest('[data-manual-action]');if(el)runAction(el.dataset.manualAction);});
$('manual-question-editor')?.addEventListener('input',event=>{
 const t=event.target;if(t.dataset.manualField)updateField(t,false);
});
$('manual-question-editor')?.addEventListener('change',event=>{
 const t=event.target;
 if(t.dataset.manualField&&['type','correct','choices','tableRows','tableColumns','blanks','matchingLeft','matchingRight','correctIndices'].includes(t.dataset.manualField))updateField(t,t.dataset.manualField==='type');
});
$('exam-common-doc')?.addEventListener('input',preview);
function validated(){
 if(state.questions.length<1||state.questions.length>40)throw Error('Le contrôle doit contenir 1 à 40 questions.');
 return state.questions.map((q,i)=>{try{return QT().validate(q)}catch(e){throw Error('Question '+(i+1)+' : '+e.message)}});
}
window.CORTEX_MANUAL_EDITOR={questions:validated,edit,reset,editingId:()=>state.editingId,afterSave:()=>{$('exam-form').reset();reset();}};
reset();