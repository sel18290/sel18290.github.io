/* CORTEX · Atelier de motivation Parcoursup.
   Trois étapes inspirées du PFMP, sauvegarde dans le profil local Orientation.
   Relecture Albert : un passage volontaire, jamais la lettre entière. */
(function(){
'use strict';
const API='https://jhtmaoeazmjigfruandl.supabase.co/functions/v1/cortex-orientation-advice';
const parts=[
 ['motivation','Pourquoi cette formation ?',"Ce que tu veux apprendre et ce qui t'attire dans la formation."],
 ['competences',"Ce que tu as déjà appris","Une compétence observée en cours, en projet ou en PFMP : explique ce que tu as réellement fait."],
 ['formation','Ce que tu sais du programme','Un enseignement ou une particularité vérifiée sur la fiche Parcoursup.'],
 ['avenir','Ce que tu aimerais faire ensuite','Ton objectif professionnel ou les domaines que tu aimerais explorer.']
];
const examples={
 accueil:['Je souhaite mieux apprendre à accompagner les voyageurs et les visiteurs.','Lors de mises en situation, j’ai accueilli et orienté des usagers.','Les cours sur le tourisme et les langues étrangères m’intéressent.','Je souhaite exercer un métier en contact avec le public.'],
 commerce:['Je souhaite apprendre à gérer un espace commercial et à développer la relation client.','J’ai participé à la mise en valeur de produits et préparé une situation de vente.','Les enseignements de management et de gestion du rayon m’intéressent.','J’aimerais évoluer vers le commerce ou la gestion d’une équipe.'],
 agora:['Je souhaite apprendre à organiser l’activité administrative d’une entreprise.','En cours, j’ai réalisé du suivi de dossiers et de la communication professionnelle.','L’organisation et les logiciels de gestion présentés par ce BTS m’intéressent.','J’aimerais exercer un métier dans les services administratifs.']
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trim=v=>String(v??'').trim();
const piimatch=v=>/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(v)||/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/.test(v);
const val=()=>({sections:{motivation:'',competences:'',formation:'',avenir:''},target:'',final:'',limit:1500});
function mount(host,opts){
 if(!host)return {refresh(){},dispose(){}};
 let course='',wishId='',step=0,signal=null,busy=false,suggestion=null,disposed=false;
 const $=id=>host.querySelector('#'+id),profile=()=>opts.profile(),bac=()=>profile().bac_origin;
 const courses=()=>opts.courses(),defaultCourse=()=>courses().includes(profile().goal)?profile().goal:opts.defaultCourses()[0]||courses()[0];
 const filtered=()=>profile().wishes.filter(w=>w.pathway===course||w.title===course);
 const key=()=>[bac(),course,wishId||'general'].join('::');
 const get=()=>{
  const p=profile();if(!p.letters||typeof p.letters!=='object')p.letters={};
  if(!p.letters[key()])p.letters[key()]=val();
  return p.letters[key()];
 };
 const save=()=>{get().updatedAt=new Date().toISOString();opts.save()};
 const msg=(s,bad=false)=>{const e=$('co-letter-status');if(e){e.textContent=s;e.classList.toggle('is-error',bad)}};
 const progress=()=>parts.filter(([k])=>trim(get().sections[k])).length;
 const savedSchool=()=>{
  const w=filtered().find(w=>(w.code||w.title+'#'+w.school)===wishId);
  return w?.school||'';
 };
 const generate=()=>{
  const d=get(),items=['Actuellement en baccalauréat professionnel '+opts.bacLabel(bac())+', je souhaite intégrer la formation '+course+'.'];
  for(const [k] of parts)if(trim(d.sections[k]))items.push(trim(d.sections[k]));
  items.push("Je vous remercie de l’attention portée à ma candidature.");
  return items.join('\n\n');
 };
 function target(){
  const d=get(),list=filtered();
  return '<div class="co-letter-section-title"><span>ÉTAPE 01</span><h3>Choisir la formation</h3><p>Comme pour ton atelier PFMP, prépare une version adaptée à chaque formation et, si besoin, à chaque établissement.</p></div>'+
   '<div class="co-letter-formgrid"><label>Bac professionnel<input disabled value="'+esc(opts.bacLabel(bac()))+'"></label>'+
   '<label>Formation souhaitée<select id="co-letter-course">'+opts.courseOptions(course,'Choisir une formation')+'</select></label>'+
   '<label>Établissement ou vœu enregistré<select id="co-letter-wish"><option value="">Brouillon général</option>'+
   list.map(w=>{const id=w.code||w.title+'#'+w.school;return '<option value="'+esc(id)+'"'+(id===wishId?' selected':'')+'>'+esc(w.school||w.title)+(w.city?' · '+esc(w.city):'')+'</option>';}).join('')+'</select></label>'+
   '<label>Établissement ciblé (facultatif)<input id="co-letter-school" maxlength="160" placeholder="Seulement si tu as vérifié son nom" value="'+esc(d.target||savedSchool())+'"></label></div>'+
   '<aside class="co-letter-read-first"><strong>Avant de rédiger</strong><p>Vérifie si cette formation demande une lettre sur Parcoursup et consulte les attendus de la fiche. N’invente pas une visite ou une expérience.</p>'+
   '<a href="https://www.parcoursup.gouv.fr/" target="_blank" rel="noopener noreferrer">Lire les fiches Parcoursup ↗</a></aside>'+
   '<div class="co-letter-actions"><button type="button" class="co-letter-primary" data-letter-step="1">Passer à la rédaction →</button></div>';
 }
 function writing(){
  const d=get(),ex=examples[bac()]||examples.accueil;
  return '<div class="co-letter-section-title"><span>ÉTAPE 02</span><h3>Construire mes arguments</h3><p>Réponds avec tes propres mots. Les phrases d’exemple ne seront pas copiées automatiquement.</p></div>'+
   '<div class="co-letter-meter"><strong id="co-letter-progress">'+progress()+' / 4 rubriques remplies</strong><progress id="co-letter-progressbar" max="4" value="'+progress()+'"></progress></div>'+
   '<div class="co-letter-editor"><div class="co-letter-fields">'+parts.map(([k,label,help],i)=>
    '<article class="co-letter-field"><div class="co-letter-field-top"><b>'+String(i+1).padStart(2,'0')+'</b><strong>'+esc(label)+'</strong>'+
    '<span data-letter-status="'+k+'">'+(trim(d.sections[k])?'✓ Renseigné':'À compléter')+'</span></div><p>'+esc(help)+'</p>'+
    '<textarea id="co-letter-'+k+'" data-letter-field="'+k+'" rows="3" maxlength="1400" placeholder="'+esc(ex[i])+'">'+esc(d.sections[k])+'</textarea>'+
    '<button type="button" class="co-letter-ai-trigger" data-letter-ask="'+k+'">✦ Améliorer cette rubrique avec Albert</button></article>'
   ).join('')+'</div>'+
   '<aside class="co-letter-assist"><div><span>MON BAC PRO</span><strong>'+esc(opts.bacLabel(bac()))+'</strong><p>Une expérience réelle, même modeste, vaut mieux qu’une compétence inventée.</p></div>'+
   '<div><span>MA FORMATION</span><strong>'+esc(course)+'</strong><p>Lis les enseignements et les attendus pour expliquer pourquoi tu souhaites y entrer.</p></div>'+
   '<div><strong>✧ Albert, sur demande</strong><p>Albert ne voit qu’un passage précis, après ton accord. N’envoie pas de coordonnées ni de nom de personne.</p></div></aside></div>'+
   '<div id="co-letter-ai-result" aria-live="polite"></div>'+
   '<div class="co-letter-actions"><button type="button" class="co-letter-secondary" data-letter-step="0">← Changer de formation</button>'+
   '<button type="button" class="co-letter-primary" data-letter-step="2"'+(!progress()?' disabled':'')+'>Relire ma lettre →</button></div>';
 }
 function review(){
  const d=get(),body=d.final||generate(),length=body.length,limit=d.limit||1500;
  return '<div class="co-letter-section-title"><span>ÉTAPE 03</span><h3>Relire, corriger et exporter</h3>'+
  '<p>La lettre n’est demandée que par certaines formations. La limite habituelle est de 1 500 caractères, espaces compris. Vérifie ta fiche officielle.</p></div>'+
  '<div class="co-letter-reviewtop"><label>Limite indiquée sur la fiche<select id="co-letter-limit"><option value="1500"'+(limit===1500?' selected':'')+'>1 500 caractères · règle habituelle</option>'+
  '<option value="4500"'+(limit===4500?' selected':'')+'>4 500 caractères · exception vérifiée</option></select></label>'+
  '<div id="co-letter-counter" class="co-letter-counter'+(length>limit?' is-over':'')+'"><span>Caractères, espaces compris</span><strong id="co-letter-count">'+length+' / '+limit+'</strong></div></div>'+
  '<div class="co-letter-paper"><div class="co-letter-paper-head"><span>APERÇU MODIFIABLE · PARCOURSUP</span><span>'+esc(course)+'</span></div>'+
  '<textarea id="co-letter-final" rows="14" maxlength="5000">'+esc(body)+'</textarea></div>'+
  '<p class="co-letter-warning" id="co-letter-warning">'+(length>limit?'La lettre dépasse la limite : raccourcis ton texte.':'Vérifie que chaque expérience citée est vraie et que ce texte est vraiment le tien.')+'</p>'+
  '<div class="co-letter-actions"><button type="button" class="co-letter-secondary" data-letter-step="1">← Modifier mes arguments</button>'+
  '<button type="button" class="co-letter-secondary" data-letter-copy'+(length>limit?' disabled':'')+'>Copier</button>'+
  '<button type="button" class="co-letter-secondary" data-letter-export>↓ Exporter TXT</button>'+
  '<button type="button" class="co-letter-primary" data-letter-print'+(length>limit?' disabled':'')+'>Imprimer / PDF</button></div>'+
  '<div class="co-letter-privacy">Tous tes brouillons sont sauvegardés sur cet appareil et inclus dans l’export de ton projet Orientation. Aucun vœu ou dossier personnel n’est envoyé au serveur CORTEX.</div>';
 }
 function render(){
  if(disposed||!host.isConnected)return;
  signal?.abort();signal=null;busy=false;suggestion=null;
  if(!courses().includes(course))course=defaultCourse();
  if(!filtered().some(w=>(w.code||w.title+'#'+w.school)===wishId))wishId='';
  if(!course)return;
  host.innerHTML='<div class="co-letter-workshop"><div class="co-letter-mast"><div><span>✦ CORTEX / ATELIER D’ÉCRITURE</span><h2>Ta motivation, <em>tes mots.</em></h2>'+
   '<p>Un atelier inspiré de PFMP, adapté à ta filière et à chaque formation choisie.</p></div><div class="co-letter-local">⌁ SAUVEGARDE LOCALE</div></div>'+
   '<nav class="co-letter-steps" aria-label="Étapes du projet de formation motivé">'+[
    ['01','Ma formation'],['02','Mes arguments'],['03','Ma lettre']
   ].map(([n,label],i)=>'<button type="button" data-letter-step="'+i+'" aria-current="'+(step===i?'step':'false')+'" class="'+(step===i?'active':'')+'"><small>'+n+'</small><strong>'+label+'</strong></button>').join('')+'</nav>'+
   '<p id="co-letter-status" class="co-letter-status" role="status" aria-live="polite">Brouillon enregistré localement dans ton navigateur.</p>'+
   '<section class="co-letter-sheet">'+(step===0?target():step===1?writing():review())+'</section>'+
   '<p class="co-letter-footer">La lettre ne remplace pas ta candidature officielle et n’est jamais transmise automatiquement à Parcoursup.</p></div>';
 }
 function update(){
  const a=$('co-letter-final'),n=$('co-letter-count'),c=$('co-letter-counter'),w=$('co-letter-warning');
  if(!a)return;
  const len=a.value.length,limit=get().limit,over=len>limit;
  if(n)n.textContent=len+' / '+limit;
  if(c)c.classList.toggle('is-over',over);
  if(w)w.textContent=over?'Tu dépasses le nombre de caractères de '+(len-limit)+'. Réduis le texte avant de le copier.':'Relis attentivement : n’invente aucune expérience et personnalise ton projet.';
  for(const sel of ['[data-letter-copy]','[data-letter-print]']){const b=host.querySelector(sel);if(b)b.disabled=over}
 }
 async function albert(field){
  if(busy)return;
  const raw=trim(get().sections[field]);
  if(raw.length<12||raw.length>900){msg('Saisis un passage personnel de 12 à 900 caractères.',true);return}
  if(piimatch(raw)){msg('Retire les coordonnées personnelles avant de consulter Albert.',true);return}
  if(!window.confirm('Le passage sélectionné ('+raw.length+' caractères) sera transmis à Albert, avec ta filière et la formation visée. Le reste de ton dossier reste local. Continuer ?'))return;
  busy=true;signal?.abort();signal=new AbortController();
  const b=host.querySelector('[data-letter-ask="'+field+'"]');if(b)b.disabled=true;
  const area=$('co-letter-ai-result');if(area)area.innerHTML='<p class="co-letter-ai-wait">✦ Albert relit un seul passage…</p>';
  try{
   const res=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'revise_letter',filiere:bac(),goal:course,interests:profile().interests.slice(0,5),section:field,text:raw}),signal:signal.signal});
   const data=await res.json().catch(()=>({}));
   if(!res.ok||!data.ok)throw Error(data.error||'Albert indisponible.');
   if(trim(get().sections[field])!==raw){msg('Le passage a changé. Recommence la relecture si nécessaire.');return}
   suggestion={field,original:raw,improved:trim(data.improved)};
   if(area)area.innerHTML='<div class="co-letter-suggestion"><span>✦ PROPOSITION ALBERT · À VÉRIFIER</span>'+
    '<p>'+esc(data.advice||'Vérifie que cette reformulation correspond à ton expérience réelle.')+'</p><blockquote>'+esc(suggestion.improved)+'</blockquote>'+
    '<div><button class="co-letter-primary" type="button" data-letter-accept>Accepter</button><button class="co-letter-secondary" type="button" data-letter-reject>Garder mon texte</button></div></div>';
   msg('Albert propose une reformulation. À toi de choisir.');
  }catch(e){if(!signal?.signal.aborted){msg(e.message||'Relecture indisponible.',true);if(area)area.innerHTML='';}}
  finally{busy=false;if(b)b.disabled=false}
 }
 function exportText(){
  const d=get(),text=d.final||generate(),blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  const uri=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=uri;a.download='lettre-parcoursup-'+course.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').slice(0,30)+'.txt';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),1500);
  msg('Lettre exportée sur cet appareil.');
 }
 async function copyText(){
  const a=$('co-letter-final');if(!a)return;
  if(a.value.length>get().limit){msg('Dépassement de la limite. Réduis le texte.',true);return}
  try{await navigator.clipboard.writeText(a.value);msg('Lettre copiée. Vérifie la version que tu colles sur Parcoursup.')}
  catch{a.select();msg('Texte sélectionné : utilise la commande Copier.')}
 }
 function printText(){
  const a=$('co-letter-final');if(!a)return;
  if(a.value.length>get().limit){msg('Le texte est trop long pour la limite choisie.',true);return}
  const f=document.createElement('iframe');f.title='Impression de la lettre de motivation Parcoursup';
  f.style.cssText='position:fixed;left:-10000px;width:1px;height:1px;border:0';document.body.append(f);
  const d=f.contentDocument,style=d.createElement('style');style.textContent='@page{size:A4;margin:20mm}body{color:#173047;font:12pt/1.6 Arial,sans-serif}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}h1{font-size:18pt;border-bottom:2px solid #44848a;padding-bottom:12px}';
  d.head.append(style);
  const h=d.createElement('h1');h.textContent='Projet de formation motivé';const t=d.createElement('pre');t.textContent=a.value;d.body.append(h,t);
  f.contentWindow.addEventListener('afterprint',()=>f.remove(),{once:true});f.contentWindow.focus();f.contentWindow.print();
  msg('Aperçu d’impression ouvert.');
 }
 host.addEventListener('click',e=>{
  const btn=e.target.closest('button');if(!btn)return;
  if(btn.hasAttribute('data-letter-step')){
   const next=Number(btn.dataset.letterStep);
   if(next===2&&!progress()){msg('Complète au moins une rubrique.',true);return}
   step=next;render();host.querySelector('.co-letter-mast')?.scrollIntoView?.({behavior:'smooth',block:'start'});return;
  }
  if(btn.dataset.letterAsk){albert(btn.dataset.letterAsk);return}
  if(btn.hasAttribute('data-letter-accept')&&suggestion){
   if(trim(get().sections[suggestion.field])!==suggestion.original){msg('Ce texte a changé. Redemande une reformulation.',true);return}
   get().sections[suggestion.field]=suggestion.improved;get().final='';save();render();msg('Proposition choisie et sauvegardée localement.');return;
  }
  if(btn.hasAttribute('data-letter-reject')){suggestion=null;const a=$('co-letter-ai-result');if(a)a.innerHTML='';msg('Texte conservé.');return}
  if(btn.hasAttribute('data-letter-copy')){copyText();return}
  if(btn.hasAttribute('data-letter-export')){exportText();return}
  if(btn.hasAttribute('data-letter-print')){printText();return}
 });
 host.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.letterField){
   const field=t.dataset.letterField,d=get();d.sections[field]=t.value.slice(0,1400);d.final='';save();
   const n=progress();const status=host.querySelector('[data-letter-status="'+field+'"]');if(status)status.textContent=trim(t.value)?'✓ Renseigné':'À compléter';
   if($('co-letter-progress'))$('co-letter-progress').textContent=n+' / 4 rubriques remplies';
   if($('co-letter-progressbar'))$('co-letter-progressbar').value=n;
   const next=host.querySelector('[data-letter-step="2"]');if(next)next.disabled=!n;
   const box=$('co-letter-ai-result');if(box)box.innerHTML='';suggestion=null;return;
  }
  if(t.id==='co-letter-school'){get().target=t.value.slice(0,160);save();return}
  if(t.id==='co-letter-final'){get().final=t.value;save();update()}
 });
 host.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='co-letter-course'){if(courses().includes(t.value)){course=t.value;wishId='';step=0;render()}return}
  if(t.id==='co-letter-wish'){wishId=t.value;step=0;render();return}
  if(t.id==='co-letter-limit'){
   if(t.value==='4500'&&!window.confirm('La majorité des formations exigent 1 500 caractères. Tu dois avoir vérifié qu’une exception permet 4 500 sur la fiche Parcoursup. Confirmer ?'))t.value='1500';
   get().limit=t.value==='4500'?4500:1500;save();update();
  }
 });
 course=defaultCourse();render();
 return {refresh(){
  if(disposed)return;
  if(!courses().includes(course)||step===0&&profile().goal&&profile().goal!==course){course=defaultCourse();wishId=''}
  render();
 },dispose(){disposed=true;signal?.abort();host.replaceChildren()}};
}
window.CORTEX_ORIENTATION_LETTER={mount,version:'1.0'};
})();