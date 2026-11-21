/* CORTEX Orientation V4 — voie métier, coexiste avec la voie formation V3.
 * Données de projet et résultat de conseil conservés dans le localStorage
 * par le module parent. Seul métier + bac + intérêts prédéfinis sont
 * transmis à Albert après action explicite de l'élève.
 */
(function(){
'use strict';
const URL_ALBERT='https://jhtmaoeazmjigfruandl.supabase.co/functions/v1/cortex-orientation-advice';
const ONISEP='https://www.onisep.fr/';
const PARCOURSUP='https://dossier.parcoursup.fr/Candidat/carte';
const JOBS=[
 {label:'Accueil & voyages',symbol:'⌖',names:['Réceptionniste en hôtel','Agent d’accueil','Conseiller voyages','Agent d’escale','Chargé de relation client','Chargé de communication','Organisateur d’événements']},
 {label:'Commerce & relation client',symbol:'◈',names:['Responsable de magasin','Chef de rayon','Conseiller commercial','Conseiller bancaire','Agent immobilier','Responsable e-commerce','Chargé de marketing','Créateur d’entreprise']},
 {label:'Gestion & administration',symbol:'▤',names:['Assistant de direction','Assistant de gestion PME','Assistant ressources humaines','Gestionnaire de paie','Assistant comptable','Secrétaire médicale','Agent administratif territorial','Chargé de recrutement']},
 {label:'Explorer un autre domaine',symbol:'✧',names:['Développeur informatique','Designer graphique','Infirmier ou infirmière','Éducateur spécialisé','Psychologue','Avocat ou avocate','Architecte']}
];
// Educational starting points shown when the Albert service is unavailable.
const CAREER_GUIDE=[
 {
  names:['responsable de magasin','chef de rayon'],
  summary:'Tu suis les ventes, organises le travail de l’équipe et veilles à la disponibilité des produits.',
  fields:[
   ['BTS Management commercial opérationnel','Apprends à animer un espace de vente, suivre les stocks et encadrer une équipe.'],
   ['BUT Techniques de commercialisation','Explore la vente, le marketing et la gestion de projets commerciaux.']
  ],
  next:'Compare les fiches du BTS MCO et du BUT TC. Repère les cours de gestion commerciale et les périodes en entreprise.',
  check:'Regarde quelles premières responsabilités tu pourras prendre en rayon avant d’encadrer une équipe.'
 },
 {
  names:['receptionniste','receptionniste en hotel'],
  summary:'Tu accueilles les visiteurs, réponds à leurs demandes et les orientes. En hôtel, tu gères aussi les réservations et le suivi des séjours.',
  fields:[
   ['Certificat de spécialisation Accueil-réception','Entraîne-toi à la réception dans un établissement d’hébergement.'],
   ['BTS Tourisme','Élargis tes compétences vers l’information et la relation avec les clientèles touristiques.']
  ],
  next:'Regarde la place de l’anglais et des autres langues dans les deux formations.',
  check:'Renseigne-toi sur les horaires et les missions de réception.',
  source:'https://www.onisep.fr/ressources/univers-metier/metiers/receptionniste'
 },
 {
  names:['assistant de gestion pme','assistant de gestion','assistante de gestion pme'],
  summary:'Tu suis les dossiers administratifs, les échanges avec les clients et les fournisseurs et l’organisation quotidienne d’une PME.',
  fields:[
   ['BTS Gestion de la PME','Apprends à suivre les clients, les fournisseurs et les dossiers d’une petite entreprise.'],
   ['BTS Comptabilité et gestion','Explore les chiffres de l’entreprise et le suivi des opérations comptables.']
  ],
  next:'Sur les fiches, compare la place de la comptabilité et de la gestion des dossiers.',
  check:'Identifie une tâche de PFMP où tu as organisé ou suivi un dossier.',
  source:'https://www.onisep.fr/ressources/univers-metier/metiers/assistant-assistante-de-gestion-en-pme'
 },
 {
  names:['assistant comptable','assistante comptable','comptable'],
  summary:'Tu enregistres les opérations, vérifies les pièces et participes au suivi financier d’une organisation.',
  fields:[
   ['BTS Comptabilité et gestion','Apprends à enregistrer et contrôler les opérations comptables.'],
   ['BUT Gestion des entreprises et des administrations','Explore la finance et la gestion dans un cursus de trois ans.']
  ],
  next:'Repère sur chaque fiche les enseignements de comptabilité et les attendus en mathématiques.',
  check:'Compare les logiciels utilisés et la place des travaux pratiques.',
  source:'https://www.onisep.fr/ressources/univers-formation/formations/post-bac/bts-comptabilite-et-gestion'
 },
 {
  names:['infirmier','infirmiere','infirmier ou infirmiere'],
  summary:'Tu participes aux soins et accompagnes les patients au sein d’une équipe de santé.',
  fields:[["Diplôme d’État d’infirmier",'Ce diplôme est obligatoire pour exercer. Il se prépare en trois ans en institut de formation en soins infirmiers (IFSI).']],
  next:'Cherche « IFSI » sur Parcoursup, puis lis les attendus et le déroulement des stages.',
  check:'Renseigne-toi sur les sciences de la santé, les stages cliniques et le rythme des études.',
  source:'https://www.onisep.fr/formation/comment-devenir-infirmier-ou-infirmiere'
 }
];
const INTERESTS=[
 ['relation-client','Contact avec les gens'],['tourisme','Tourisme'],['commerce','Commerce'],['vente','Vente'],
 ['communication','Communication'],['langues','Langues'],['administration','Administration'],
 ['organisation','Organisation'],['informatique','Informatique'],['comptabilite','Comptabilité'],
 ['finance','Finance'],['entrepreneuriat','Entreprendre'],['service-public','Service public'],
 ['evenementiel','Événementiel'],['social','Aider les autres']
];
const LEVELS={
 proche:{label:'Dans la continuité de ton bac',style:'direct'},
 passerelle:{label:'Une passerelle à préparer',style:'bridge'},
 long:{label:'Des études dans un autre domaine',style:'long'}
};
const str=x=>String(x??'');
const esc=x=>str(x).replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
const norm=x=>str(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function mount(host,api){
 if(!host)return {refresh(){},dispose(){}};
 let disposed=false,busy=false,request=null,search='',activeCategory=0;
 const $=id=>host.querySelector('#'+id);
 const p=()=>api.profile();
 const job=()=>str(p().career||'').trim();
 const persist=()=>api.save();
 const outcome=()=>p().career_result;
 const validOutcome=()=>{const o=outcome();return o&&norm(o.career)===norm(job())&&o.bac===p().bac_origin&&JSON.stringify(o.interests||[])===JSON.stringify(p().interests||[])?o.data:null};
 function tell(message,error=false){
  const el=$('co-career-message');if(el){el.textContent=message;el.classList.toggle('is-error',!!error);}
 }
 function safeString(input,max=250){return str(input).slice(0,max)}
 function jobStep(){
  return '<div class="co-v4-form"><div class="co-section-top"><h2>Quel métier t’intéresse ?</h2><p>Albert te montre les étapes possibles depuis ton bac pro.</p></div>'+
   '<label class="co-v4-job-label" for="co-v4-job">Métier recherché</label>'+
   '<div class="co-v4-job-input"><input id="co-v4-job" type="text" maxlength="90" autocomplete="off" placeholder="Ex. agent d’accueil, comptable, infirmier" value="'+esc(p().career||'')+'"></div>'+
   '<details class="co-optional co-v4-job-picker"><summary>Voir des idées de métiers</summary><div class="co-v4-categories">'+JOBS.map((g,i)=>
    '<button type="button" data-v4-category="'+i+'" class="'+(i===activeCategory?'active':'')+'" aria-pressed="'+(i===activeCategory)+'">'+esc(g.label)+'</button>').join('')+'</div>'+
   '<div id="co-v4-samples">'+jobSamples()+'</div></details>'+
   '<details class="co-optional co-v4-interests"><summary>Affiner selon mes centres d’intérêt</summary>'+
    '<p>Choisis jusqu’à cinq domaines.</p>'+
    '<div class="co-v4-interests-tags">'+INTERESTS.map(([key,label])=>'<button type="button" data-v4-interest="'+key+'" aria-pressed="'+p().interests.includes(key)+'" class="'+(p().interests.includes(key)?'active':'')+'">'+esc(label)+'</button>').join('')+'</div></details>'+
   '<div class="co-v4-submit"><button type="button" id="co-v4-analyse" class="co-v4-primary" data-v4-analyse'+(busy||job().length<3?' disabled':'')+'>'+buttonLabel()+'</button>'+
   '<p>Relance Albert autant de fois que tu veux : CORTEX ne fixe aucun quota de demandes. Le service Albert peut avoir ses propres limites. Il reçoit le métier, ta filière et tes centres d’intérêt choisis. <a href="'+ONISEP+'metier" target="_blank" rel="noopener noreferrer">Consulter Onisep</a></p></div></div>';
 }
 const buttonLabel=()=>{
  if(busy)return 'Albert prépare ton parcours…';
  const data=validOutcome();
  if(!data)return 'Voir les parcours avec Albert';
  return data.provider==='guide'?'Réessayer avec Albert':'Actualiser le parcours';
 };
 function jobSamples(){
  const list=JOBS[activeCategory]||JOBS[0];
  const text=norm(search),names=text?JOBS.flatMap(group=>group.names).filter(n=>norm(n).includes(text)):list.names;
  return '<div class="co-v4-job-chips">'+(names.length?names.map(n=>'<button type="button" data-v4-job="'+esc(n)+'" class="'+(norm(n)===norm(job())?'active':'')+'">'+esc(n)+'</button>').join(''):'<p class="co-v4-nojob">Tu peux écrire librement ce métier dans le champ ci-dessus.</p>')+'</div>';
 }
 function guideFor(jobName){
  const keyword=norm(jobName).replace(/[’'-]/g,' ').replace(/\s+/g,' ');
  const guide=CAREER_GUIDE.find(entry=>entry.names.includes(keyword));
  if(!guide)return null;
  const [course]=guide.fields[0],fit=api.courseFit(course);
  const level={direct:'proche',bridge:'passerelle',prepare:'long'}[fit?.family]||'long';
  return {
   provider:'guide',career:jobName,summary:guide.summary,source:guide.source,
   assessment:{level,why:fit?.why||'Ce projet demande une formation dans les soins.',to_check:[guide.check]},
   routes:guide.fields.map(([course,why])=>({title:course,course,why})),
   next_actions:[guide.next]
  };
 }
 function recommendation(){
  const data=validOutcome();
  if(!data)return '';
  const lev=LEVELS[data.assessment?.level]||LEVELS.passerelle;
  const routes=Array.isArray(data.routes)?data.routes.filter(route=>route&&typeof route==='object').slice(0,3):[];
  const first=Array.isArray(data.next_actions)?data.next_actions.find(x=>typeof x==='string'&&x.trim()):'';
  return '<div class="co-v4-report">'+
   '<header class="co-v4-report-hero"><span>'+(data.provider==='guide'?'REPÈRES DU GUIDE CORTEX':'CONSEIL D’ALBERT')+'</span><h3>'+esc(safeString(data.career||job(),110))+'</h3>'+
   '<p>'+esc(safeString(data.summary,420))+'</p></header>'+
   '<section class="co-v4-verdict co-v4-'+lev.style+'"><div class="co-v4-verdict-header"><div><h4>'+lev.label+'</h4></div></div>'+
   '<p>'+esc(safeString(data.assessment?.why,550))+'</p>'+
   (first?'<div class="co-v4-first-action"><strong>Commence par cette étape</strong><p>'+esc(safeString(first,230))+'</p></div>':'')+
   '<details class="co-optional"><summary>Ce que ton bac t’apporte et les points à vérifier</summary>'+
   '<div class="co-v4-check-lists">'+(data.assessment?.strengths?.length?'<div><strong>Tes bases</strong><ul>'+list(data.assessment.strengths,3,160)+'</ul></div>':'')+
   '<div><strong>À vérifier</strong><ul>'+list(data.assessment?.to_check,4,220)+'</ul></div></div></details></section>'+
   (routes.length?'<div class="co-v4-routes-header"><h4>Les chemins de formation</h4></div>'+
   '<div class="co-v4-route-list">'+routes.map((route,index)=>routeHTML(route,index)).join('')+'</div>':'')+
   (data.warning?'<p class="co-v4-warning">'+esc(safeString(data.warning,300))+'</p>':'')+
   '<div class="co-v4-actions"><div class="co-v4-links"><a href="'+esc(CAREER_GUIDE.find(g=>g.source&&g.source===data.source)?.source||ONISEP+'metier')+'" target="_blank" rel="noopener noreferrer">Vérifier sur Onisep</a>'+
   '<a href="'+PARCOURSUP+'" target="_blank" rel="noopener noreferrer">Carte Parcoursup</a></div>'+
   '<p>Vérifie les conditions d’accès sur la fiche officielle de chaque formation.</p></div></div>';
 }
 function list(input,n,len,tag='li'){
  return (Array.isArray(input)?input:[]).slice(0,n).map(v=>'<'+tag+'>'+esc(safeString(v,len))+'</'+tag+'>').join('');
 }
 function equivalentCourse(course){
  const raw=norm(course).replace(/[’‘]/g,"'").replace(/\s*[-–]\s*/g,' ').replace(/\s*\([^)]*\)\s*$/,'');
  const courses=api.courses();
  let match=courses.find(c=>norm(c).replace(/[’‘]/g,"'").replace(/\s*[-–]\s*/g,' ')===raw);
  if(match)return match;
  const alts=[
   ['bts mco','BTS Management commercial opérationnel'],
   ['bts ndrc','BTS Négociation et digitalisation de la relation client'],
   ['bts sam',"BTS Support à l'action managériale"],
   ['bts gpme','BTS Gestion de la PME'],
   ['bts cg','BTS Comptabilité et gestion'],
   ['bts sio','BTS Services informatiques aux organisations'],
   ['bts ci','BTS Commerce international'],
   ['but tc','BUT Techniques de commercialisation'],
   ['but gea','BUT Gestion des entreprises et des administrations']
  ];
  const alias=alts.find(([short,long])=>raw===short||raw===norm(long));
  return alias?alias[1]:null;
 }
 function routeHTML(route,i){
  const course=safeString(route.course,160),known=equivalentCourse(course);
  const saved=known&&p().wishes.some(w=>!w.code&&norm(w.title)===norm(known));
  return '<article class="co-v4-route"><h5>'+esc(safeString(route.title||course,110))+'</h5>'+
   (course&&course!==route.title?'<p class="co-v4-course">'+esc(course)+'</p>':'')+
   '<p class="co-v4-route-why">'+esc(safeString(route.why,330))+'</p>'+
   '<div class="co-v4-route-buttons">'+(known?'<button type="button" data-v4-explore="'+esc(known)+'">Voir les établissements</button>'+
    (saved?'<span class="co-kept">Dans mes choix</span>':'<button type="button" data-v4-save-course="'+esc(known)+'">Garder</button>'):
    '<a href="'+PARCOURSUP+'" target="_blank" rel="noopener noreferrer">Chercher le diplôme sur Parcoursup</a>')+'</div>'+
   (route.steps?.length||route.action?'<details class="co-optional"'+(i===0?' open':'')+'><summary>Voir les étapes</summary>'+
   '<ol class="co-v4-milestones">'+(Array.isArray(route.steps)?route.steps.filter(Boolean).slice(0,4):[]).map(x=>
   '<li><strong>'+esc(safeString(x.title,90))+'</strong><span>'+esc(safeString(x.detail,320))+'</span></li>').join('')+'</ol>'+
   (route.action?'<p class="co-v4-route-first"><b>Première action</b> '+esc(safeString(route.action,250))+'</p>':'')+'</details>':'')+'</article>';
 }
 function render(){
  if(disposed||!host.isConnected)return;
  host.innerHTML='<section class="co-pane co-career-form">'+jobStep()+
   '<p class="co-v4-local-note" id="co-career-message" role="status" aria-live="polite"></p></section>'+
   '<section class="co-v4-output" id="co-v4-report" aria-label="Parcours vers le métier choisi" tabindex="-1">'+recommendation()+'</section>';
 }
 function updateParts(){
  if(disposed)return;
  const el=$('co-v4-samples');if(el)el.innerHTML=jobSamples();
  const btn=$('co-v4-analyse');if(btn){btn.disabled=busy||job().length<3;btn.textContent=buttonLabel();}
 }
 function clearResult(){const box=$('co-v4-report');if(box)box.innerHTML=recommendation();}
 function setJob(value){
  const input=safeString(value,90);
  search='';p().career=input;persist();
  const field=$('co-v4-job');if(field)field.value=input;
  updateParts();clearResult();
 }
 function toggleInterest(v){
  const interests=p().interests;
  if(interests.includes(v))p().interests=interests.filter(x=>x!==v);
  else if(interests.length<5)p().interests=[...interests,v];
  else{tell('Cinq centres d’intérêt maximum.',true);return}
  persist();api.syncInterests?.();
  const chip=host.querySelector('[data-v4-interest="'+v+'"]'),on=p().interests.includes(v);
  chip.setAttribute('aria-pressed',String(on));chip.classList.toggle('active',on);
  updateParts();clearResult();
 }
 async function analyse(){
  if(busy||job().length<3)return;
  const target=job();
  if(target.length>90||/[\n\r<>{}[\]@\\/]|(?:https?:|www\.)/i.test(target)||/\d{4,}/.test(target)){
   tell('Indique seulement le nom d’un métier, sans coordonnées ni informations personnelles.',true);return;
  }
  busy=true;request=new AbortController();const own=request;
  const timeout=setTimeout(()=>own.abort(),50000);
  updateParts();
  tell('Albert étudie les formations possibles pour ce métier…');
  const body={action:'career_path',career:target,filiere:p().bac_origin,interests:p().interests.slice(0,5)};
  const stillCurrent=()=>norm(job())===norm(target)&&p().bac_origin===body.filiere&&JSON.stringify(p().interests)===JSON.stringify(body.interests);
  const storeResult=(data,focus=true)=>{
   p().career_result={career:target,bac:body.filiere,interests:body.interests,data,date:new Date().toISOString()};
   persist();clearResult();
   const report=$('co-v4-report');
   if(focus&&!report.closest('[hidden]')){report.focus({preventScroll:true});report.scrollIntoView({block:'start'});}
  };
  if(!validOutcome()){
   const fallback=guideFor(target);
   if(fallback){
    storeResult(fallback,false);
    tell('Tu peux lire les repères du guide CORTEX pendant qu’Albert prépare ton conseil.');
   }
  }
  try{
   const response=await fetch(URL_ALBERT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:own.signal});
   const json=await response.json().catch(()=>({}));
   if(!response.ok||!json.ok||!Array.isArray(json.routes)||!Object.hasOwn(LEVELS,json.assessment?.level))throw Error('Conseil indisponible');
   if(disposed)return;
   if(!stillCurrent()){tell('Ton projet a changé. Lance une analyse avec tes nouveaux choix.');return;}
   storeResult({
    career:safeString(json.career,110),summary:safeString(json.summary,420),
    assessment:json.assessment,routes:json.routes,next_actions:json.next_actions,warning:safeString(json.warning,300)
   });
   tell('Ton parcours est prêt.');
  }catch{
   if(disposed)return;
   if(!stillCurrent()){tell('Ton projet a changé. Lance une analyse avec tes nouveaux choix.');return;}
   if(validOutcome()?.provider==='guide')tell('Albert est indisponible. Les repères du guide CORTEX restent affichés.');
   else tell('Albert est temporairement indisponible. Tu peux réessayer ou consulter Onisep.',true);
  }finally{
   clearTimeout(timeout);
   if(!disposed){busy=false;updateParts();}
  }
 }
 function onClick(event){
  const node=event.target;
  const jobChip=node.closest('[data-v4-job]');
  if(jobChip){setJob(jobChip.dataset.v4Job);return;}
  const catChip=node.closest('[data-v4-category]');
  if(catChip){search='';activeCategory=Number(catChip.dataset.v4Category)||0;
   host.querySelectorAll('[data-v4-category]').forEach(n=>{const on=Number(n.dataset.v4Category)===activeCategory;n.classList.toggle('active',on);n.setAttribute('aria-pressed',String(on));});
   const list=$('co-v4-samples');if(list)list.innerHTML=jobSamples();return;
  }
  const interest=node.closest('[data-v4-interest]');
  if(interest){toggleInterest(interest.dataset.v4Interest);return;}
  if(node.closest('[data-v4-analyse]')){analyse();return;}
  const explore=node.closest('[data-v4-explore]');
  if(explore){api.openCourse(explore.dataset.v4Explore);return;}
  const save=node.closest('[data-v4-save-course]');
  if(save){api.saveCourse(save.dataset.v4SaveCourse);if(p().wishes.some(w=>!w.code&&w.title===save.dataset.v4SaveCourse)){const state=document.createElement('span');state.className='co-kept';state.textContent='Dans mes choix';save.replaceWith(state);}}
 }
 function onInput(event){
  const t=event.target;
  if(t.id==='co-v4-job'){
   const v=t.value.slice(0,90);
   if(p().career!==v){p().career=v;persist();clearResult();}
   search=v;updateParts();
  }
 }
 host.addEventListener('click',onClick);host.addEventListener('input',onInput);
 host.addEventListener('keydown',event=>{if(event.target?.id==='co-v4-job'&&event.key==='Enter'){event.preventDefault();analyse();}});
 render();
 return{
  refresh(){if(disposed)return;render()},
  dispose(){disposed=true;request?.abort();host.replaceChildren()}
 };
}
window.CORTEX_ORIENTATION_CAREERS={mount,version:'5.0'};
})();