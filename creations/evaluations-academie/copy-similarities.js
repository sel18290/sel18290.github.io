/* CORTEX : repérage local de ressemblances entre copies d'un MÊME contrôle.
 * Sans IA ni transfert de réponses : traitement en mémoire côté professeur.
 * Indices pédagogiques seulement, jamais décision automatisée de fraude.
 */
function normalize(raw){
 return String(raw||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[\u2019']/g,' ').replace(/[^a-z0-9\s]/g,' ')
  .replace(/\s+/g,' ').trim().slice(0,9000);
}
function shingles(text){
 const tokens=text.split(' ').filter(Boolean);
 const out=new Set();
 for(let i=0;i+2<tokens.length;i++)out.add(tokens.slice(i,i+3).join(' '));
 return out;
}
function similarity(a,b){
 if(a.size===0||b.size===0)return {score:0,shared:0};
 let intersection=0;
 const [shorter,longer]=a.size<=b.size?[a,b]:[b,a];
 for(const item of shorter)if(longer.has(item))intersection++;
 const jaccard=intersection/(a.size+b.size-intersection);
 const containment=intersection/Math.min(a.size,b.size);
 return {score:jaccard*.7+containment*.3,shared:intersection};
}
function readable(answer){
 if(typeof answer!=='string')return '';
 const text=answer.trim();
 if(/^[\[{]/.test(text))return ''; // Tableaux, listes structurées, QCM.
 const cleaned=normalize(text);
 return cleaned.length>=75&&cleaned.split(' ').length>=13?cleaned:'';
}
export function compareCopyTexts(assessment,copies){
 const id=String(assessment?.id||'');
 const questions=new Map(
  (Array.isArray(assessment?.content?.questions)?assessment.content.questions:[])
   .filter(q=>['text','short'].includes(q.type)).map(q=>[String(q.id),String(q.prompt||'Question')])
 );
 if(!id||!questions.size)return {pairs:[],tested:0,eligible:0};
 const relevant=(Array.isArray(copies)?copies:[]).filter(copy=>copy.assessment_id===id);
 const entries=[];
 for(const copy of relevant){
  const answers=copy.answers&&typeof copy.answers==='object'&&!Array.isArray(copy.answers)?copy.answers:{};
  const normalized=new Map();
  for(const [qid,title] of questions){
   const text=readable(answers[qid]);
   if(text)normalized.set(qid,{title,shingles:shingles(text),text});
  }
  entries.push({number:Number(copy.student_number),answers:normalized});
 }
 const detected=[];
 let tested=0;
 for(let i=0;i<entries.length;i++){
  const a=entries[i];
  if(!Number.isInteger(a.number))continue;
  for(let j=i+1;j<entries.length;j++){
   const b=entries[j];
   if(!Number.isInteger(b.number)||a.number===b.number)continue;
   const matches=[];
   for(const [qid,av] of a.answers){
    const bv=b.answers.get(qid);
    if(!bv)continue;
    tested++;
    const {score,shared}=similarity(av.shingles,bv.shingles);
    // Ne pas signaler des consignes ou une simple définition très courte.
    if(shared<8||score<.69)continue;
    matches.push({
     questionId:qid,
     title:av.title.slice(0,160),
     score:Math.round(score*100),
     level:score>=.87?'forte':'à examiner'
    });
   }
   if(matches.length){
    matches.sort((x,y)=>y.score-x.score);
    detected.push({a:a.number,b:b.number,
     score:Math.max(...matches.map(x=>x.score)),
     questions:matches});
   }
  }
 }
 detected.sort((a,b)=>b.score-a.score||b.questions.length-a.questions.length||a.a-b.a);
 return {pairs:detected.slice(0,60),tested,eligible:entries.filter(x=>x.answers.size).length};
}
