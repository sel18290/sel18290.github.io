/* CORTEX Orientation beta : outil de suivi enseignant, statistiques officielles historiques. */
(function(){
'use strict';
const root=document.getElementById('cortex-orientation');
if(!root)return;
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=x=>String(x||'').replace(/[^a-zA-Z0-9_-]/g,'');
const bridge=()=>window.CORTEX_ACADEMY_BRIDGE;
const sources={
 parcoursup:'https://www.parcoursup.gouv.fr/',
 donnees:'https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-parcoursup/',
 aides:'https://messervices.etudiant.gouv.fr/',
 dse:'https://www.etudiant.gouv.fr/fr/bourse-et-logement-constituez-votre-dossier-social-etudiant-dse-409',
 mobilite:'https://www.parcoursup.gouv.fr/preparer-sa-vie-etudiante/l-aide-la-mobilite-parcoursup-1667',
 visale:'https://www.actionlogement.fr/la-garantie-visale',
 reussite:'https://www.parcoursup.gouv.fr/faq/thematiques/formations-disponibles/formations-sur-parcoursup'
};
const base='https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-parcoursup/records';
const pathways=[
 ['accueil','Bac pro Métiers de l’accueil'],
 ['mcv','Bac pro Métiers du commerce et de la vente'],
 ['agora','Bac pro AGOrA (gestion-administration)'],
 ['autre','Autre bac professionnel'],
 ['technologique','Bac technologique'],
 ['general','Bac général']
];
const alternatives={
 accueil:['BTS Tourisme','BTS Support à l’action managériale','BTS Management commercial opérationnel','BTS Négociation et digitalisation de la relation client','BTS Communication','BTS Gestion de la PME'],
 mcv:['BTS Management commercial opérationnel','BTS Négociation et digitalisation de la relation client','BTS Commerce international','BTS Communication','BTS Banque','BTS Assurance'],
 agora:['BTS Gestion de la PME','BTS Support à l’action managériale','BTS Comptabilité et gestion','BTS Assurance','BTS Banque','BTS Services informatiques aux organisations'],
 autre:['BTS','BUT','Licence','Certificat de spécialisation'],
 technologique:['BTS','BUT','Licence'],
 general:['Licence','BUT','BTS']
};
let cache=[],results=[],busy=false,currentClass='',currentStudent=1,searchToken=0,initialized=false;
const classSelect=()=> $('co-class');
const msg=(s,isError=false)=>{const e=$('co-message');if(!e)return;e.textContent=s;e.classList.toggle('co-error',!!isError);};
const hasAccess=()=>!!bridge()?.teacher?.()&&!!bridge()?.client?.();
const current=()=>cache.find(p=>p.class_id===currentClass&&p.student_number===currentStudent);
const defaultBac=()=>{const name=String((bridge()?.classes?.()||[]).find(c=>c.id===currentClass)?.display_name||'').toLowerCase();return /accueil|^(tma|1ma|2ma)(\b|\d)/.test(name)?'accueil':/mcv|vente|commerce/.test(name)?'mcv':/agora|gestion|(^|\W)ga(\W|$)/.test(name)?'agora':'autre';};
function getData(){
 return {
  teacher_id:bridge().teacher(),class_id:currentClass,student_number:currentStudent,
  bac_origin:$('co-bac').value,pathway:$('co-pathway').value.trim().slice(0,150),
  city:$('co-city').value.trim().slice(0,100),goal:$('co-goal').value.trim().slice(0,180),
  interests:$('co-interests').value.trim().slice(0,400),mobility:$('co-mobility').value,
  apprenticeship:$('co-apprenticeship').checked,
  wishes:(current()?.wishes||[]).slice(0,30)
 };
}
function renderBase(){
 root.innerHTML=
  '<div class="co-intro"><div><span class="co-eyebrow">MES ÉLÈVES / ACCOMPAGNEMENT POST-BAC</span><h1>Orientation <em>βêta</em></h1>'+
  '<p>Du premier projet aux pistes alternatives, un espace pour préparer les entretiens et comparer les formations accessibles après le bac.</p></div>'+
  '<div class="co-year"><strong>2025</strong><small>Dernière base statistique intégrée · Données Parcoursup historiques, hors apprentissage</small></div></div>'+
  '<div class="co-layout"><section class="co-panel co-profile"><h2>01 · Projet de l’élève</h2>'+
  '<div class="co-fields"><label>Classe<select id="co-class"></select></label><label>Élève (n° de liste)<select id="co-student"></select></label>'+
  '<label>Filière d’origine<select id="co-bac">'+pathways.map(p=>'<option value="'+p[0]+'">'+esc(p[1])+'</option>').join('')+'</select></label>'+
  '<label>Spécialité / parcours<input id="co-pathway" maxlength="150" placeholder="Ex. Métiers de l’accueil"></label>'+
  '<label>Formation souhaitée<input id="co-goal" maxlength="180" placeholder="Ex. BTS Tourisme, BTS MCO…"></label>'+
  '<label>Ville recherchée<input id="co-city" maxlength="100" value="Paris" placeholder="Paris, Lyon, Lille…"></label>'+
  '<label>Mobilité<select id="co-mobility"><option value="ville">Dans cette ville</option><option value="region">Élargir à d’autres villes</option><option value="france">Dans toute la France</option></select></label>'+
  '<label>Centres d’intérêt / contraintes pédagogiques<input id="co-interests" maxlength="400" placeholder="Commerce, relations clients, gestion…"></label></div>'+
  '<label class="co-check"><input type="checkbox" id="co-apprenticeship"> L’élève souhaite aussi envisager l’apprentissage</label>'+
  '<div class="co-actions"><button type="button" class="co-btn" id="co-save">Enregistrer le projet</button><button type="button" class="co-btn co-primary" id="co-search">Explorer les formations officielles ↗</button></div>'+
  '<p id="co-message" class="co-message" role="status" aria-live="polite">Les projets enregistrés restent accessibles au professeur dans son espace authentifié.</p>'+
  '<div class="co-privacy">Aucune note scolaire, donnée de santé ou revenu familial n’est demandé. Les projets sont protégés par l’accès professeur. Le numéro d’élève n’est pas une identité publique.</div></section>'+
  '<section class="co-panel co-comparison"><h2>02 · Pistes Parcoursup</h2><p class="co-subtext">Comparez l’accès historique de 2025 selon le type de bac. Ces taux ne sont <strong>pas</strong> des probabilités individuelles d’admission.</p>'+
  '<div id="co-wishes"></div><div id="co-alternatives"></div></section></div>'+
  '<section class="co-panel co-discovery"><div class="co-title-row"><h2>03 · Comparer les formations</h2><a href="'+sources.donnees+'" target="_blank" rel="noopener noreferrer">Source ministérielle ↗</a></div>'+
  '<p class="co-subtext">Taux d’accès global, part de candidats appelables selon le bac, établissement et ville. Les données concernent les candidatures de 2025 (hors apprentissage).</p><div id="co-results"><div class="co-empty">Saisissez un projet puis lancez une recherche. Les fiches officielles préciseront les critères, les débouchés et les taux de réussite et d’insertion publiés.</div></div></section>'+
  '<section class="co-panel co-guidance"><div class="co-title-row"><h2>04 · Réussite, emploi et financement</h2><span class="co-beta">Conseiller, comparer, vérifier</span></div>'+
  '<div class="co-guidance-grid"><article><h3>Réussite dans la formation</h3><p>Consultez le taux de réussite au diplôme et les dispositifs d’accompagnement quand ils sont publiés sur la fiche formation. Ne pas déduire la réussite du seul taux d’admission.</p><a href="'+sources.reussite+'" target="_blank" rel="noopener noreferrer">Comprendre les indicateurs ↗</a></article>'+
  '<article><h3>Insertion professionnelle</h3><p>Consultez les résultats d’insertion publiés pour la formation ou le diplôme sur Parcoursup. L’indicateur doit préciser sa population et sa période de mesure ; si absent, aucune valeur n’est inventée.</p><a href="'+sources.parcoursup+'" target="_blank" rel="noopener noreferrer">Fiches Parcoursup ↗</a></article>'+
  '<article><h3>Bourse CROUS et logement</h3><p>Simulateur de bourse, Dossier social étudiant (DSE), logement CROUS et autres aides selon la situation familiale, à vérifier sur les services officiels.</p><a href="'+sources.aides+'" target="_blank" rel="noopener noreferrer">Simuler une bourse / DSE ↗</a></article>'+
  '<article><h3>Mobilité et garanties</h3><p>Aide à la mobilité Parcoursup selon les conditions de l’année, garantie Visale et aides au logement. Vérifier les droits au moment de la demande.</p><a href="'+sources.mobilite+'" target="_blank" rel="noopener noreferrer">Aide à la mobilité ↗</a> <a href="'+sources.visale+'" target="_blank" rel="noopener noreferrer">Visale ↗</a></article></div>'+
  '<p class="co-disclaimer">βêta · Outil d’aide à l’orientation, pas un classement des élèves. Aucun vœu n’est transmis à Parcoursup. Les admissions, la réussite et l’emploi dépendent de facteurs que les statistiques de 2025 ne peuvent pas prédire individuellement.</p></section>';
 $('co-class').addEventListener('change',()=>chooseClass($('co-class').value));
 $('co-student').addEventListener('change',()=>{currentStudent=Number($('co-student').value)||1;applyProfile();});
 $('co-save').addEventListener('click',()=>save());
 $('co-search').addEventListener('click',()=>search());
 root.addEventListener('click',async ev=>{
  const employment=ev.target.closest('[data-co-employment]');
  if(employment){await employmentLookup(Number(employment.dataset.coEmployment),employment);return;}
  const add=ev.target.closest('[data-co-add]');
  if(add){const i=Number(add.dataset.coAdd),rec=results[i];if(!rec)return;await saveWish(rec);return;}
  const remove=ev.target.closest('[data-co-remove]');
  if(remove){const i=Number(remove.dataset.coRemove);await removeWish(i);return;}
  const alt=ev.target.closest('[data-co-alt]');
  if(alt){$('co-goal').value=alt.dataset.coAlt;await search();}
 });
 initialized=true;
}
function refreshClasses(){
 if(!initialized)renderBase();
 const classes=(bridge()?.classes?.()||[]).filter(c=>!c.archived);
 const selector=classSelect(),prev=currentClass;
 selector.replaceChildren();
 if(!classes.length){selector.add(new Option('Créez une classe pour commencer',''));currentClass='';msg('Aucune classe disponible. Créez une classe dans « Mes classes ».',true);return;}
 for(const cl of classes)selector.add(new Option(cl.display_name||cl.code||'Classe',cl.id));
 currentClass=classes.some(c=>c.id===prev)?prev:classes[0].id;
 selector.value=currentClass;
 chooseClass(currentClass);
}
async function chooseClass(id){
 currentClass=uid(id);cache=[];
 const cl=(bridge()?.classes?.()||[]).find(c=>c.id===currentClass);
 const student=$('co-student');student.replaceChildren();
 for(let n=1;n<=60;n++)student.add(new Option('N° '+n,String(n)));
 currentStudent=1;student.value='1';
 // La liste des numéros n'implique pas qu'un compte PIN ait été créé.
 $('co-pathway').value=cl?.display_name||'';
 $('co-bac').value=defaultBac();
 if(!hasAccess()){msg('Connectez-vous en tant qu’enseignant.',true);applyProfile();return;}
 try{
  const {data,error}=await bridge().client().from('cortex_orientation_profiles').select('*')
   .eq('teacher_id',bridge().teacher()).eq('class_id',currentClass).order('student_number');
  if(error)throw error;
  if(id!==currentClass)return;
  cache=Array.isArray(data)?data:[];
  applyProfile();
  msg(cache.length+' dossier(s) d’orientation sauvegardé(s) pour cette classe.');
 }catch(error){applyProfile();msg('Impossible de charger les dossiers : '+String(error.message||error),true);}
}
function applyProfile(){
 const p=current();
 $('co-bac').value=p?.bac_origin||defaultBac();
 $('co-pathway').value=p?.pathway||(bridge()?.classes?.()||[]).find(c=>c.id===currentClass)?.display_name||'';
 $('co-city').value=p?.city||'Paris';
 $('co-goal').value=p?.goal||'';
 $('co-interests').value=p?.interests||'';
 $('co-mobility').value=p?.mobility||'ville';
 $('co-apprenticeship').checked=!!p?.apprenticeship;
 results=[];
 $('co-results').innerHTML='<div class="co-empty">Recherchez les formations pour ce projet.</div>';
 showWishes();
}
function showWishes(){
 const wishes=current()?.wishes||[];
 $('co-wishes').innerHTML=wishes.length?'<div class="co-wishes-list">'+wishes.map((w,i)=>
  '<article><div><strong>'+esc(w.title||'Formation')+'</strong><small>'+esc(w.city||'')+' · '+esc(w.school||'')+'</small></div>'+
  '<div class="co-actions"><a href="'+esc(link(w.url))+'" target="_blank" rel="noopener noreferrer">Fiche ↗</a><button type="button" data-co-remove="'+i+'" aria-label="Supprimer la piste">Retirer</button></div></article>').join('')+'</div>':
  '<div class="co-empty">Aucune piste conservée. Ajoutez les résultats intéressants pour les comparer lors du prochain entretien.</div>';
 const a=alternatives[$('co-bac').value]||alternatives.autre;
 $('co-alternatives').innerHTML=
  '<div class="co-alternatives"><h3>'+(wishes.length<=1?'Élargir les choix : pistes complémentaires':'Explorer d’autres pistes')+'</h3>'+
  '<p>Suggestions cohérentes avec le type de bac, à vérifier avec l’élève et sur les fiches des établissements.</p>'+
  '<div class="co-chips">'+a.filter(x=>!wishes.some(w=>(w.title||'').toLowerCase().includes(x.toLowerCase()))).map(x=>
  '<button type="button" data-co-alt="'+esc(x)+'">'+esc(x)+' ↗</button>').join('')+'</div></div>';
}
async function save(customWishes){
 if(!hasAccess()||!currentClass){msg('Sélectionnez une classe et connectez-vous.',true);return false;}
 const payload=getData();
 if(Array.isArray(customWishes))payload.wishes=customWishes.slice(0,30);
 // Ne pas enregistrer de dossier d'élève contenant uniquement une référence de classe.
 if(!payload.goal&&!payload.wishes.length){msg('Indiquez la poursuite d’études souhaitée ou enregistrez une piste.',true);return false;}
 try{
  const {data,error}=await bridge().client().from('cortex_orientation_profiles')
    .upsert(payload,{onConflict:'class_id,student_number'}).select('*').single();
  if(error)throw error;
  cache=cache.filter(p=>!(p.class_id===currentClass&&p.student_number===currentStudent));
  cache.push(data);
  showWishes();
  msg('Projet du n° '+currentStudent+' enregistré dans Supabase · '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+'.');
  return true;
 }catch(error){msg('Enregistrement impossible : '+String(error.message||error),true);return false;}
}
function link(input){
 const s=String(input||'');
 try{const u=new URL(s);return u.protocol==='https:'&&(/(^|\.)parcoursup\.(?:gouv\.fr|fr)$/.test(u.hostname))?u.href:sources.parcoursup;}catch{return sources.parcoursup;}
}
async function saveWish(rec){
 const wishes=(current()?.wishes||[]).slice();
 const w={title:rec.lib_for_voe_ins||'',school:rec.g_ea_lib_vx||'',city:rec.ville_etab||'',url:link(rec.lien_form_psup),code:String(rec.cod_aff_form||'')};
 if(wishes.some(x=>x.code&&w.code&&x.code===w.code)){msg('Cette piste est déjà enregistrée.');return;}
 if(wishes.length>=30){msg('30 pistes maximum par élève. Retirez une ancienne piste.',true);return;}
 wishes.push(w);
 if(!await save(wishes))return;
}
async function removeWish(i){
 const wishes=(current()?.wishes||[]).slice();wishes.splice(i,1);if(!wishes.length&&!$('co-goal').value.trim()){msg('Renseignez un projet avant de retirer la dernière piste.',true);return;}await save(wishes);
}
function num(v){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.').replace('%',''));return Number.isFinite(n)?n:null;}
function percent(v){const n=num(v);return n===null||n<0||n>100?'—':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(n)+' %';}
function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function score(rec,goal,city,bac){
 const str=normalize([rec.lib_for_voe_ins,rec.fil_lib_voe_acc,rec.detail_forma2].join(' '));
 const parts=normalize(goal).split(/[\s,;:/\-]+/).filter(x=>x.length>=3&& !['pour','avec','dans','formation','parcours'].includes(x));
 const match=parts.reduce((s,p)=>s+(str.includes(p)?2:0),0);
 const sameCity=normalize(rec.ville_etab)===normalize(city)?5:0;
 const bacRate=num(bac==='general'?rec.part_acces_gen:bac==='technologique'?rec.part_acces_tec:rec.part_acces_pro);
 return match+sameCity+(bacRate===null?0:Math.min(2,bacRate/50));
}
function displayResults(data,goal,city){
 results=data.slice().sort((a,b)=>score(b,goal,city,$('co-bac').value)-score(a,goal,city,$('co-bac').value)).slice(0,30);
 const bac=$('co-bac').value;
 const k=bac==='general'?'part_acces_gen':bac==='technologique'?'part_acces_tec':'part_acces_pro';
 const label=bac==='general'?'Bac général':bac==='technologique'?'Bac technologique':'Bac professionnel';
 if(!results.length){$('co-results').innerHTML='<p class="co-empty">Aucune formation correspondante dans cette recherche. Élargissez la ville ou modifiez les mots-clés. <a href="'+sources.parcoursup+'" target="_blank" rel="noopener noreferrer">Explorer la carte Parcoursup ↗</a></p>';return;}
 $('co-results').innerHTML='<div class="co-results-count">'+results.length+' formations trouvées · session 2025 · résultats triés par correspondance avec le projet</div>'+
  '<div class="co-results-list">'+results.map((r,i)=>
  '<article class="co-result"><div class="co-result-top"><div><span class="co-type">'+esc(r.fili||'Formation')+'</span><h3>'+esc(r.lib_for_voe_ins||'Formation')+'</h3><p>'+esc(r.g_ea_lib_vx||'Établissement')+' · '+esc(r.ville_etab||'Ville non renseignée')+'</p></div>'+
  '<a class="co-form-link" href="'+esc(link(r.lien_form_psup))+'" target="_blank" rel="noopener noreferrer">Fiche officielle ↗</a></div>'+
  '<div class="co-metrics"><div><small>Taux d’accès global 2025</small><strong>'+percent(r.taux_acces_ens)+'</strong></div>'+
  '<div><small>Part appelable · '+esc(label)+'</small><strong>'+percent(r[k])+'</strong></div>'+
  '<div><small>Admis issus d’un bac pro</small><strong>'+percent(r.pct_bp)+'</strong></div>'+
  '<div><small>Réussite / insertion</small><strong class="co-unavailable">À vérifier sur la fiche</strong></div></div>'+
  '<div class="co-employment" id="co-employment-'+i+'"><button type="button" class="co-employment-btn" data-co-employment="'+i+'">Consulter l’insertion InserJeunes ↗</button></div>'+ 
  '<div class="co-result-bottom"><span>Statistiques observées en 2025, pas une probabilité personnelle. Apprentissage non inclus.</span>'+
  '<button type="button" data-co-add="'+i+'" class="co-btn co-add">+ Garder cette piste</button></div></article>'
  ).join('')+'</div>';
}

async function employmentLookup(i,button){
 const rec=results[i];if(!rec)return;
 const target=$('co-employment-'+i);
 const code=String(rec.cod_uai||'').trim().toUpperCase();
 const title=normalize(rec.lib_for_voe_ins||'');
 const url='https://www.inserjeunes.education.gouv.fr/diffusion/etablissement?id_uai='+encodeURIComponent(code);
 const nav='<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Voir cet établissement sur InserJeunes ↗</a>';
 if(!/^[0-9]{7}[A-Z]$/.test(code)||!(/\bbts\b/.test(title))){
  target.innerHTML='<p>Indicateurs d’insertion détaillés non raccordés automatiquement pour cette formation. <a href="https://www.inserjeunes.education.gouv.fr/diffusion/accueil" target="_blank" rel="noopener noreferrer">Consulter InserJeunes ↗</a></p>';
  return;
 }
 button.disabled=true;button.textContent='Consultation InserJeunes…';
 try{
  const urlApi=new URL('https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-inserjeunes-lycee_pro-formation-fine/records');
  urlApi.searchParams.set('where','uai = '+JSON.stringify(code)+' AND type_diplome = "BTS"');
  urlApi.searchParams.set('limit','100');
  const res=await fetch(urlApi.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(16000)});
  if(!res.ok)throw Error('Service InserJeunes indisponible.');
  const body=await res.json();
  const stop=new Set(['bts','des','les','dans','pour','avec','sur','parcours','option','professionnel','management','metiers']);
  const words=title.split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!stop.has(w));
  const eligible=(body.results||[]).map(x=>{
   const label=normalize(x.libelle_formation||'');
   const overlap=words.filter(w=>label.includes(w)).length;
   const match=words.length?(overlap/words.length):0;
   return {item:x,match};
  }).filter(x=>x.match>=.66&&x.match>0).sort((a,b)=>{
   const year=x=>String(x.item.annee||'');
   return year(b).localeCompare(year(a));
  });
  const entry=eligible.find(x=>num(x.item.taux_emploi_6_mois)!==null)?.item;
  if(!entry){
   target.innerHTML='<p>Pas de taux à six mois suffisamment fiable pour cette formation dans la base publique InserJeunes. '+nav+'</p>';
   return;
  }
  target.innerHTML='<div class="co-employment-metrics"><div><small>Emploi salarié à 6 mois, parmi les sortants</small><strong>'+percent(entry.taux_emploi_6_mois)+'</strong></div>'+
   '<div><small>Emploi à 12 mois</small><strong>'+percent(entry.taux_emploi_12_mois)+'</strong></div>'+
   '<div><small>Poursuite d’études</small><strong>'+percent(entry.taux_poursuite_etudes)+'</strong></div></div>'+
   '<p>Source InserJeunes · '+esc(entry.annee||'période non précisée')+' · '+esc(entry.libelle_formation||'BTS')+'. Le taux d’emploi porte sur les sortants ne poursuivant pas leurs études, pas sur tous les candidats. '+nav+'</p>';
 }catch(error){target.innerHTML='<p>Statistiques InserJeunes momentanément indisponibles. '+nav+'</p>';}
}
async function queryDataset(goal,city,local){
 const u=new URL(base);
 u.searchParams.set('limit','100');
 u.searchParams.set('where','session=2025'+(local&&city?' AND search(ville_etab, '+JSON.stringify(city)+')':''));
 u.searchParams.set('q',goal);
 // Deux domaines officiels équivalents peuvent être utilisés en cas d'indisponibilité.
 const response=await fetch(u.toString(),{method:'GET',headers:{Accept:'application/json'},signal:AbortSignal.timeout(17000)});
 if(!response.ok)throw Error('Service public indisponible (HTTP '+response.status+')');
 const json=await response.json();
 if(!Array.isArray(json.results))throw Error('Format des données officielles inattendu.');
 return json.results;
}
async function search(){
 if(busy)return;
 const goal=$('co-goal').value.trim(),city=$('co-city').value.trim();
 if(goal.length<3){msg('Indiquez au moins trois caractères dans la formation recherchée.',true);$('co-goal').focus();return;}
 busy=true;const n=++searchToken;const button=$('co-search');button.disabled=true;button.textContent='Recherche des données officielles…';
 $('co-results').innerHTML='<div class="co-empty">Consultation des données ministérielles Parcoursup 2025…</div>';
 try{
  const local=$('co-mobility').value==='ville';
  let data=await queryDataset(goal,city,local);
  if(data.length===0&&/^bts\s+/i.test(goal))data=await queryDataset(goal.replace(/^bts\s+/i,''),city,local);
  if(data.length===0&&local)data=await queryDataset(goal,city,false);
  if(n!==searchToken)return;
  displayResults(data,goal,city);
  msg(data.length+' formation(s) issues des données officielles. Les fiches Parcoursup restent la référence pour le projet individuel.');
 }catch(error){
  $('co-results').innerHTML='<div class="co-empty">La recherche automatisée n’a pas répondu. Les données officielles restent disponibles : <a href="'+sources.donnees+'" target="_blank" rel="noopener noreferrer">base Parcoursup 2025 ↗</a> ou <a href="'+sources.parcoursup+'" target="_blank" rel="noopener noreferrer">carte Parcoursup ↗</a>.</div>';
  msg('Recherche indisponible : '+String(error?.message||error)+'. Aucun taux n’a été inventé.',true);
 }finally{busy=false;button.disabled=false;button.textContent='Explorer les formations officielles ↗';}
}
function boot(){
 if(!document.body.classList.contains('academy-authenticated')||document.body.dataset.acadView!=='orientation')return;
 if(!hasAccess())return;
 const ids=(bridge().classes?.()||[]).filter(c=>!c.archived).map(c=>c.id).join(',');
 const previous=Array.from(classSelect()?.options||[]).map(o=>o.value).join(',');
 if(!initialized||ids!==previous)refreshClasses();
}
window.addEventListener('cortex:academy-view',e=>{if(e.detail==='orientation')boot();});
window.addEventListener('cortex:academy-data-ready',boot);
window.addEventListener('cortex:academy-logout',()=>{cache=[];results=[];currentClass='';initialized=false;root.replaceChildren();});
window.addEventListener('hashchange',()=>{if(location.hash==='#acad-orientation')setTimeout(boot,100);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();