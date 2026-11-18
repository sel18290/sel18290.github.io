/* CORTEX : formats de question partages entre demonstration et espace reel. */
window.CORTEX_QUESTION_TYPES=(function(){
'use strict';
const TYPES=[['text','✎ Réponse rédigée'],['short','▤ Réponse courte'],['choice','◉ QCM : réponse unique'],['multi','☑ QCM : réponses multiples'],['boolean','◐ Vrai / Faux'],['number','№ Réponse numérique'],['table','▦ Tableau à compléter'],['matching','⇄ Associer deux colonnes'],['fill','⋯ Champs à compléter']];
const names=Object.fromEntries(TYPES);
const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=x=>Array.isArray(x)?x:typeof x==='string'?x.split(/[;\n]/).map(x=>x.trim()).filter(Boolean):[];
const split=x=>String(x||'').split(/[\r\n;]+/).map(x=>x.trim()).filter(Boolean);
const parsed=x=>{try{const v=JSON.parse(String(x||''));return Array.isArray(v)?v:[]}catch{return []}};
const type=q=>names[q?.type]?q.type:'text';
function initialize(q,t){q.type=names[t]?t:'text';const d={};
 if(['choice','multi'].includes(q.type)){d.choices=['Proposition A','Proposition B','Proposition C'];d.correct=0;d.correctIndices=[0];}
 if(q.type==='table'){d.tableRows=['Ligne 1','Ligne 2'];d.tableColumns=['Colonne 1','Colonne 2'];}
 if(q.type==='matching')d.pairs=[{left:'Élément A',right:'Définition A'},{left:'Élément B',right:'Définition B'}];
 if(q.type==='fill')d.blanks=['Champ 1','Champ 2'];
 if(q.type==='number')d.unit='';
 for(const [k,v] of Object.entries(d))if(q[k]===undefined||q[k]===null)q[k]=v;
 return q;
}
function editorExtra(q,i,mode='demo'){
 const prop=k=>mode==='demo'?'data-question="'+i+'" data-qfield="'+k+'"':mode==='import'?'data-ri-question="'+i+'" data-ri-field="'+k+'"':'data-manual-field="'+k+'"';
 const field=(name,key,val)=>'<label class="cq-extra-field"><small>'+h(name)+'</small><textarea rows="3" '+prop(key)+'>'+h(val)+'</textarea></label>';
 const t=type(q);let out='';
 if(t==='choice'||t==='multi'){
  const options=arr(q.choices);
  out=field('Propositions, une par ligne','choices',options.join('\n'));
  if(t==='choice')out+='<label class="cq-extra-field"><small>Bonne réponse (professeur seulement)</small><select '+prop('correct')+'>'+
   options.map((x,j)=>'<option value="'+j+'" '+(Number(q.correct||0)===j?'selected':'')+'>'+(j+1)+'. '+h(x)+'</option>').join('')+'</select></label>';
  else out+=field('Numéros corrects, ex. 1, 3 (facultatif)','correctIndices',arr(q.correctIndices).map(x=>Number(x)+1).join(', '));
 }else if(t==='number')out='<label class="cq-extra-field"><small>Unité (facultative)</small><input maxlength="30" '+prop('unit')+' value="'+h(q.unit||'')+'"></label>';
 else if(t==='table')out=field('Intitulés des lignes','tableRows',arr(q.tableRows).join('\n'))+field('Intitulés des colonnes à compléter','tableColumns',arr(q.tableColumns).join('\n'));
 else if(t==='matching')out=field('Colonne de gauche (une ligne par élément)','matchingLeft',arr(q.pairs).map(x=>x.left||'').join('\n'))+
  field('Colonne de droite, correspondant ligne par ligne','matchingRight',arr(q.pairs).map(x=>x.right||'').join('\n'));
 else if(t==='fill')out=field('Noms des champs à compléter','blanks',arr(q.blanks).join('\n'));
 return out?'<div class="cq-extra-config">'+out+'</div>':'';
}
function applyField(q,key,value){
 if(key==='type'){initialize(q,value);return;}
 if(['choices','tableRows','tableColumns','blanks'].includes(key)){q[key]=split(value);return;}
 if(key==='correctIndices'){q.correctIndices=String(value||'').split(/[;,\s]+/).map(x=>Number(x)-1).filter(x=>Number.isInteger(x)&&x>=0&&x<8);return;}
 if(key==='correct'){q.correct=Number(value)||0;return;}
 if(key==='unit'){q.unit=String(value).slice(0,30);return;}
 if(['matchingLeft','matchingRight'].includes(key)){
  const left=key==='matchingLeft'?split(value):arr(q.pairs).map(x=>x.left);
  const right=key==='matchingRight'?split(value):arr(q.pairs).map(x=>x.right);
  q.pairs=Array.from({length:Math.max(left.length,right.length)},(_,i)=>({left:left[i]||'',right:right[i]||''}));return;
 }
 q[key]=value;
}
function validate(q){
 const t=type(q),prompt=String(q.prompt||'').trim(),points=Number(q.points);
 if(prompt.length<2||prompt.length>1200)throw Error('Énoncé requis (2 à 1 200 caractères).');
 if(!Number.isFinite(points)||points<0||points>20)throw Error('Barème incorrect : entre 0 et 20.');
 const x={id:String(q.id||''),prompt,points,type:t};
 if(q.page)x.page=Math.max(1,Math.min(50,Math.floor(Number(q.page)||1)));
 if(q.doc)x.doc=String(q.doc).slice(0,5000);
 if(Array.isArray(q.assetIds))x.assetIds=q.assetIds.slice(0,30);
 if(t==='choice'||t==='multi'){
  x.choices=arr(q.choices).map(v=>String(v).trim());
  if(x.choices.length<2||x.choices.length>8||x.choices.some(s=>!s||s.length>280))throw Error('QCM : renseigne entre 2 et 8 propositions.');
  if(t==='choice'){x.correct=Number(q.correct||0);if(!Number.isInteger(x.correct)||x.correct<0||x.correct>=x.choices.length)throw Error('Choisis la bonne réponse.');}
  else x.correctIndices=[...new Set(arr(q.correctIndices).map(Number).filter(i=>Number.isInteger(i)&&i>=0&&i<x.choices.length))];
 }
 if(t==='table'){
  x.tableRows=arr(q.tableRows).map(String);x.tableColumns=arr(q.tableColumns).map(String);
  if(!x.tableRows.length||!x.tableColumns.length||x.tableRows.length>8||x.tableColumns.length>6||
    x.tableRows.concat(x.tableColumns).some(t=>!t||t.length>100))throw Error('Tableau : 1 à 8 lignes, 1 à 6 colonnes avec des titres.');
 }
 if(t==='matching'){
  x.pairs=arr(q.pairs).map(p=>({left:String(p.left||'').trim(),right:String(p.right||'').trim()}));
  if(x.pairs.length<2||x.pairs.length>8||x.pairs.some(p=>!p.left||!p.right||p.left.length>200||p.right.length>200))throw Error('Association : 2 à 8 paires complètes.');
 }
 if(t==='fill'){
  x.blanks=arr(q.blanks).map(String);
  if(!x.blanks.length||x.blanks.length>10||x.blanks.some(s=>!s||s.length>120))throw Error('Champs à compléter : 1 à 10 étiquettes.');
 }
 if(t==='number')x.unit=String(q.unit||'').slice(0,30);
 return x;
}
function studentFields(q,answer){
 const t=type(q),id=h(q.id),raw=String(answer||''),data=parsed(raw);
 let content='';
 if(t==='text')content='<textarea data-cq-input="text" rows="5" maxlength="6000" placeholder="Rédige ta réponse…">'+h(raw)+'</textarea>';
 else if(t==='short'||t==='number')content='<div class="cq-number-answer"><input type="text" data-cq-input="text" maxlength="'+(t==='short'?1000:60)+'" value="'+h(raw)+'" placeholder="'+(t==='short'?'Ta réponse':'Valeur')+'" '+(t==='number'?'inputmode="decimal"':'')+'>'+(t==='number'&&q.unit?'<span>'+h(q.unit)+'</span>':'')+'</div>';
 else if(t==='choice'||t==='multi'||t==='boolean'){
  const options=t==='boolean'?['Vrai','Faux']:arr(q.choices),selected=t==='multi'?data.map(String):[raw];
  content='<div class="cq-answer-choices">'+options.map((opt,i)=>'<label class="cq-answer-option"><input type="'+(t==='multi'?'checkbox':'radio')+'" name="cq-'+id+'" value="'+i+'" data-cq-input="'+i+'" '+(selected.includes(String(i))?'checked':'')+'><span>'+h(opt)+'</span></label>').join('')+'</div>';
 }else if(t==='table'){
  const rows=arr(q.tableRows),cols=arr(q.tableColumns);
  content='<div class="cq-table-scroller"><table class="cq-answer-table"><thead><tr><th>Élément</th>'+cols.map(col=>'<th>'+h(col)+'</th>').join('')+'</tr></thead><tbody>'+rows.map((row,i)=>'<tr><th>'+h(row)+'</th>'+cols.map((col,j)=>'<td><input data-cq-input="'+i+'-'+j+'" value="'+h(data[i*cols.length+j]||'')+'" aria-label="'+h(row+' / '+col)+'" maxlength="280"></td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 }else if(t==='matching'){
  const pairs=arr(q.pairs),rights=arr(q.rightItems).length?arr(q.rightItems):pairs.map(x=>x.right).sort((a,b)=>String(a).localeCompare(String(b),'fr'));
  content='<div class="cq-match-grid">'+pairs.map((p,i)=>'<label class="cq-match-line"><span>'+h(p.left)+'</span><select data-cq-input="'+i+'"><option value="">Choisir une correspondance</option>'+rights.map(right=>'<option value="'+h(right)+'" '+(data[i]===right?'selected':'')+'>'+h(right)+'</option>').join('')+'</select></label>').join('')+'</div>';
 }else if(t==='fill')content='<div class="cq-fill-grid">'+arr(q.blanks).map((s,i)=>'<label class="cq-answer-label"><span>'+h(s)+'</span><input type="text" data-cq-input="'+i+'" value="'+h(data[i]||'')+'" maxlength="280"></label>').join('')+'</div>';
 return '<div class="cq-student-answer" data-cortex-q="'+id+'" data-cortex-type="'+t+'">'+content+'</div>';
}
function readAnswer(root,q){
 const fields=[...root.querySelectorAll('[data-cq-input]')],t=type(q);
 if(['text','short','number'].includes(t))return fields[0]?.value||'';
 if(t==='choice'||t==='boolean')return fields.find(x=>x.checked)?.value||'';
 if(t==='multi')return JSON.stringify(fields.filter(x=>x.checked).map(x=>x.value));
 if(['table','matching','fill'].includes(t))return JSON.stringify(fields.map(x=>x.value));
 return '';
}
function summary(q,answer){
 const t=type(q),val=String(answer||''),data=parsed(val);
 if(t==='choice')return arr(q.choices)[Number(val)]||'Sans réponse';
 if(t==='boolean')return val==='0'?'Vrai':val==='1'?'Faux':'Sans réponse';
 if(t==='multi')return data.map(i=>arr(q.choices)[Number(i)]||'').filter(Boolean).join(' ; ')||'Sans réponse';
 if(t==='table'){const cols=arr(q.tableColumns);return arr(q.tableRows).map((row,i)=>row+' : '+cols.map((col,j)=>col+' = '+(data[i*cols.length+j]||'—')).join(' ; ')).join('\n');}
 if(t==='matching')return arr(q.pairs).map((p,i)=>p.left+' → '+(data[i]||'—')).join('\n');
 if(t==='fill')return arr(q.blanks).map((x,i)=>x+' : '+(data[i]||'—')).join('\n');
 return val||'Sans réponse';
}
return {TYPES,names,type,initialize,editorExtra,applyField,validate,studentFields,readAnswer,summary,h};
})();