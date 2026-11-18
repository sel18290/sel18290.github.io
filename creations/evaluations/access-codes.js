/* CORTEX — PIN élève à 6 chiffres, prototype local sans serveur.
   Un PIN est défini par classe + numéro de liste et réutilisé sur les contrôles.
   L’espace professeur est public : aucun usage avec de vraies données scolaires. */
window.CORTEX_ACCESS=(function(){
'use strict';
const DEFAULT_COUNT=30, MAX_COUNT=60, ITERATIONS=150000;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function count(cl){
 const n=Number(cl?.studentCount);
 return Number.isInteger(n)&&n>=1&&n<=MAX_COUNT?n:DEFAULT_COUNT;
}
function normalizeNumber(raw,cl){
 const value=String(raw??'').trim();
 if(!/^\d{1,3}$/.test(value))return '';
 const number=Number(value);
 return Number.isInteger(number)&&number>=1&&number<=count(cl)?String(number):'';
}
function registry(state){
 if(!state.studentPins||typeof state.studentPins!=='object'||Array.isArray(state.studentPins))state.studentPins={};
 return state.studentPins;
}
function records(state,cl){
 const all=registry(state),id=cl?.id;
 if(!id)throw Error('Classe introuvable.');
 if(!all[id]||typeof all[id]!=='object'||Array.isArray(all[id]))all[id]={};
 return all[id];
}
function record(state,cl,raw){
 const number=normalizeNumber(raw,cl);
 return number?records(state,cl)[number]||null:null;
}
function validPin(pin){
 if(!/^\d{6}$/.test(String(pin)))throw Error('Le PIN doit contenir exactement 6 chiffres.');
 if(/^(\d)\1{5}$/.test(pin)||['123456','654321','012345','987654'].includes(pin))throw Error('Choisis un PIN moins facile à deviner.');
 return pin;
}
function hex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
function fromHex(value){
 if(typeof value!=='string'||value.length!==32||!/^[0-9a-f]+$/.test(value))throw Error('PIN enregistré invalide.');
 return Uint8Array.from(value.match(/.{2}/g),x=>parseInt(x,16));
}
function randomSalt(){
 if(!window.crypto?.getRandomValues||!window.crypto?.subtle)throw Error('Le navigateur doit utiliser HTTPS et prendre en charge Web Crypto.');
 const data=new Uint8Array(16);window.crypto.getRandomValues(data);
 return hex(data);
}
async function derive(pin,salt){
 if(!window.crypto?.subtle||typeof TextEncoder==='undefined')throw Error('Le navigateur ne prend pas en charge Web Crypto.');
 const encoded=new TextEncoder().encode(pin);
 const key=await window.crypto.subtle.importKey('raw',encoded,'PBKDF2',false,['deriveBits']);
 const bits=await window.crypto.subtle.deriveBits({name:'PBKDF2',salt:fromHex(salt),iterations:ITERATIONS,hash:'SHA-256'},key,256);
 return hex(new Uint8Array(bits));
}
async function enroll(state,cl,raw,pin,confirmation){
 const number=normalizeNumber(raw,cl);
 if(!number)throw Error('Numéro absent de cette classe.');
 if(record(state,cl,number))throw Error('Un PIN existe déjà pour ce numéro. Saisis-le ou demande au professeur de le réinitialiser.');
 validPin(pin);
 if(pin!==confirmation)throw Error('Les deux PIN ne sont pas identiques.');
 const salt=randomSalt(),hash=await derive(pin,salt);
 // Vérifier encore après le calcul asynchrone avant d'enregistrer.
 if(record(state,cl,number))throw Error('Ce numéro vient d’être enregistré. Saisis son PIN.');
 records(state,cl)[number]={salt,hash,createdAt:Date.now(),failed:0,lockedUntil:0};
 return {number,created:true};
}
async function verify(state,cl,raw,pin){
 const number=normalizeNumber(raw,cl),info=record(state,cl,number);
 if(!number||!info)throw Error('Aucun PIN n’est encore créé pour ce numéro.');
 if(!/^\d{6}$/.test(String(pin)))throw Error('Saisis ton PIN à 6 chiffres.');
 if(info.lockedUntil && Date.now()<info.lockedUntil)throw Error('Trop de tentatives. Réessaie dans quelques minutes ou contacte le professeur.');
 const calculated=await derive(pin,info.salt);
 if(calculated!==info.hash){
  info.failed=(info.failed||0)+1;
  if(info.failed>=5){info.lockedUntil=Date.now()+5*60*1000;info.failed=0;}
  throw Error(info.lockedUntil&&Date.now()<info.lockedUntil?'Trop d’essais : accès suspendu pour 5 minutes.':'PIN incorrect. Réessaie.');
 }
 info.failed=0;info.lockedUntil=0;
 return {number,created:false};
}
function reset(state,cl,raw){
 const number=normalizeNumber(raw,cl);
 if(!number)throw Error('Numéro incorrect.');
 const map=records(state,cl);
 if(!map[number])throw Error('Aucun PIN à réinitialiser.');
 delete map[number];
 return number;
}
function setCount(state,cl,newCount){
 const n=Number(newCount);
 if(!Number.isInteger(n)||n<1||n>MAX_COUNT)throw Error('Choisis entre 1 et '+MAX_COUNT+' élèves.');
 const registered=Math.max(0,...Object.keys(records(state,cl)).map(Number).filter(Number.isFinite));
 const existingCopies=Math.max(0,...(state.attempts||[]).filter(at=>at.classId===cl.id).map(at=>Number(at.studentNumber)||0));
 if(n<registered||n<existingCopies)throw Error('Un PIN ou une copie existe au-delà de ce numéro.');
 cl.studentCount=n;
}
function filled(state,cl){
 return Object.keys(records(state,cl)).filter(k=>Number(k)>=1&&Number(k)<=count(cl)&&!!record(state,cl,k)).length;
}
function render(state,cl){
 const total=count(cl),ready=filled(state,cl),map=records(state,cl);
 let rows='';
 for(let n=1;n<=total;n++){
  const reg=!!map[String(n)];
  rows+='<tr><td><strong>N° '+n+'</strong></td><td><span class="access-state '+(reg?'active':'')+'">'+(reg?'✓ PIN créé':'En attente')+'</span></td>'+
   '<td>'+(reg?'<button type="button" class="btn ghost small" data-action="access-ask-reset" data-id="'+esc(cl.id)+'" data-number="'+n+'">Réinitialiser</button>':'<span class="muted small">Création par l’élève</span>')+'</td></tr>';
 }
 return '<div class="access-manager">'+
  '<p class="muted small"><strong>'+esc(cl.name)+'</strong> · Le même PIN sert pour les évaluations de cette classe.</p>'+
  '<div class="access-head"><div><strong>'+ready+' / '+total+' PIN créés</strong><p class="muted small">À sa première connexion, l’élève indique son numéro de liste, choisit un PIN de 6 chiffres et le confirme. Tu peux réinitialiser un PIN oublié, sans connaître le code.</p></div>'+
  '<div class="access-limit"><label for="access-count">Nombre de numéros</label><div class="access-limit-input"><input id="access-count" type="number" inputmode="numeric" min="1" max="'+MAX_COUNT+'" value="'+total+'"><button class="btn secondary small" data-action="access-set-count" data-id="'+esc(cl.id)+'">Appliquer</button></div></div></div>'+
  '<div class="access-toolbar"><span class="access-counter">'+ready+' comptes élèves initialisés</span><span class="muted small">Le professeur ne voit jamais les PIN.</span></div>'+
  '<div class="access-scroll"><table class="access-table"><thead><tr><th>Numéro</th><th>PIN</th><th>Action professeur</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<div class="access-bottom"><p class="class-qr-warning"><strong>Démo locale uniquement :</strong> les PIN sont enregistrés sous forme de dérivés chiffrés dans ce navigateur, pas sur un serveur. Ils ne sont pas partagés entre appareils. Le premier utilisateur à choisir un numéro peut y créer un PIN : pour de vraies évaluations, il faudra une authentification et une base Supabase protégée.</p></div></div>';
}
return {count,normalizeNumber,record,enroll,verify,reset,setCount,filled,render};
})();
