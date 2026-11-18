/* CORTEX Évaluations — codes individuels locaux (démo hors serveur)
   Attention : accès professeur public + stockage navigateur = aucune authentification réelle. */
window.CORTEX_ACCESS=(function(){
'use strict';
const DEFAULT_COUNT=30;
const MAX_COUNT=60;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function count(a){
 const n=Number(a?.codeCount);
 return Number.isInteger(n)&&n>=1&&n<=MAX_COUNT?n:DEFAULT_COUNT;
}
function codes(a){
 if(!a.accessCodes||typeof a.accessCodes!=='object'||Array.isArray(a.accessCodes))a.accessCodes={};
 return a.accessCodes;
}
function normalizeNumber(raw,a){
 const s=String(raw??'').trim();
 if(!/^\d{1,3}$/.test(s))return '';
 const n=Number(s);
 return n>=1&&n<=count(a)?String(n):'';
}
function verify(a,raw,code){
 if(!a)return false;
 const number=normalizeNumber(raw,a);
 const secret=String(code??'').trim();
 return !!number&&/^\d{6}$/.test(secret)&&codes(a)[number]===secret;
}
function create(a,raw,replace=false){
 const number=normalizeNumber(raw,a);
 if(!number)throw Error('Numéro hors de la liste de classe.');
 const entries=codes(a);
 if(entries[number]&&!replace)return entries[number];
 if(!window.crypto?.getRandomValues)throw Error('Navigateur non compatible avec la génération de codes.');
 const used=new Set(Object.values(entries));
 for(let tries=0;tries<100;tries++){
  const buffer=new Uint32Array(1);
  window.crypto.getRandomValues(buffer);
  const candidate=String(100000+(buffer[0]%900000));
  if(!used.has(candidate)){
   entries[number]=candidate;
   return candidate;
  }
 }
 throw Error('Impossible de générer un code unique.');
}
function generateMissing(a){
 let added=0;
 for(let n=1;n<=count(a);n++){
  if(!codes(a)[String(n)]){create(a,n);added++;}
 }
 return added;
}
function regenerateAll(a){
 const previous={...codes(a)};
 try{
  const next={};
  a.accessCodes=next;
  for(let n=1;n<=count(a);n++){
   const old=previous[String(n)];
   let fresh=create(a,n);
   for(let i=0;fresh===old&&i<10;i++)fresh=create(a,n,true);
   if(fresh===old)throw Error('Code identique à l’ancien ; réessaie.');
  }
 }catch(err){a.accessCodes=previous;throw err;}
 return count(a);
}
function setCount(a,value){
 const n=Number(value);
 if(!Number.isInteger(n)||n<1||n>MAX_COUNT)throw Error('Choisis entre 1 et '+MAX_COUNT+' numéros.');
 const highest=Math.max(0,...Object.keys(codes(a)).map(Number).filter(Number.isFinite));
 if(n<highest)throw Error('Des codes existent au-delà du n° '+n+'. Augmente plutôt la limite.');
 a.codeCount=n;
}
function filled(a){return Object.keys(codes(a)).filter(k=>Number(k)>=1&&Number(k)<=count(a)&&/^\d{6}$/.test(codes(a)[k])).length;}
function listText(a,separator='\t'){
 const rows=['N°'+separator+'Code'];
 for(let n=1;n<=count(a);n++)rows.push(n+separator+(codes(a)[String(n)]||'—'));
 return rows.join('\n');
}
function csv(a){
 const rows=['Numero;Code'];
 for(let n=1;n<=count(a);n++)rows.push(n+';'+(codes(a)[String(n)]||''));
 return '\ufeff'+rows.join('\r\n');
}
function render(state,a,exam){
 const total=count(a),ready=filled(a),label=state.classes.find(x=>x.id===a.classId)?.name||'Classe';
 const group=a.groupId?(state.classes.find(x=>x.id===a.classId)?.groups||[]).find(x=>x.id===a.groupId)?.name||'Groupe':'Classe entière';
 let rows='';
 for(let n=1;n<=total;n++){
  const value=codes(a)[String(n)]||'';
  rows+='<tr><td><strong>N° '+n+'</strong></td><td><span class="access-secret">'+(value?esc(value):'<span class="muted">Non généré</span>')+'</span></td>'+
   '<td><button type="button" class="btn '+(value?'ghost':'secondary')+' small" data-action="'+(value?'access-ask-one':'access-create-one')+'" data-id="'+esc(a.id)+'" data-number="'+n+'">'+(value?'Régénérer':'Générer')+'</button></td></tr>';
 }
 return '<div class="access-manager">'+
  '<p class="muted small"><strong>'+esc(label)+' · '+esc(group)+'</strong> · '+esc(exam?.title||'Contrôle')+'</p>'+
  '<div class="access-head"><div><strong>'+ready+' / '+total+' codes prêts</strong><p class="muted small">Chaque numéro de liste a son propre code à 6 chiffres, distinct pour ce contrôle. Les codes existants ne changent pas lors d’une génération complémentaire.</p></div>'+
  '<div class="access-limit"><label for="access-count">Nombre de numéros</label><div class="access-limit-input"><input id="access-count" type="number" inputmode="numeric" min="1" max="'+MAX_COUNT+'" value="'+total+'"><button class="btn secondary small" data-action="access-set-count" data-id="'+esc(a.id)+'">Appliquer</button></div></div></div>'+
  '<div class="access-toolbar">'+
  '<button class="btn" data-action="access-generate-missing" data-id="'+esc(a.id)+'">✦ Générer les codes manquants</button>'+
  '<button class="btn secondary" data-action="access-csv" data-id="'+esc(a.id)+'" '+(!ready?'disabled':'')+'>↓ Télécharger CSV</button>'+
  '<button class="btn ghost" data-action="access-copy" data-id="'+esc(a.id)+'" '+(!ready?'disabled':'')+'>Copier la liste</button>'+
  '</div><div class="access-scroll"><table class="access-table"><thead><tr><th>Numéro</th><th>Code personnel</th><th>Action</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<div class="access-bottom"><button class="btn danger small" data-action="access-ask-all" data-id="'+esc(a.id)+'" '+(!ready?'disabled':'')+'>Régénérer tous les codes</button>'+
  '<p class="class-qr-warning"><strong>Version de démonstration :</strong> les codes sont conservés uniquement dans ce navigateur et l’espace professeur reste public. Ils ne protègent pas des données d’élèves réelles et ne se synchronisent pas sur les téléphones. La sécurité effective nécessitera Supabase et une authentification des professeurs.</p></div></div>';
}
return {count,codes,verify,create,generateMissing,regenerateAll,setCount,filled,listText,csv,render,normalizeNumber};
})();
