/* CORTEX Orientation V4 — voie métier, coexiste avec la voie formation V3.
 * Données de projet et résultat de conseil conservés dans le localStorage
 * par le module parent. Seul métier + bac + intérêts prédéfinis sont
 * transmis à Albert après action explicite de l'élève.
 */
(function(){
'use strict';
const URL_ALBERT='https://jhtmaoeazmjigfruandl.supabase.co/functions/v1/cortex-orientation-advice';
const ONISEP='https://www.onisep.fr/';
const PARCOURSUP='https://www.parcoursup.gouv.fr/';
const BACS=[
 {key:'accueil',name:"Métiers de l’accueil",sub:'Relation avec les publics, information, orientation'},
 {key:'commerce',name:'Commerce · option A',sub:'Vente, conseil, animation de l’espace commercial'},
 {key:'agora',name:'AGOrA · gestion-administration',sub:'Gestion de dossiers, organisation, communication'}
];
const JOBS=[
 {label:'Accueil & voyages',symbol:'⌖',names:['Réceptionniste en hôtel','Agent d’accueil','Conseiller voyages','Agent d’escale','Chargé de relation client','Chargé de communication','Organisateur d’événements']},
 {label:'Commerce & relation client',symbol:'◈',names:['Responsable de magasin','Chef de rayon','Conseiller commercial','Conseiller bancaire','Agent immobilier','Responsable e-commerce','Chargé de marketing','Créateur d’entreprise']},
 {label:'Gestion & administration',symbol:'▤',names:['Assistant de direction','Assistant de gestion PME','Assistant ressources humaines','Gestionnaire de paie','Assistant comptable','Secrétaire médicale','Agent administratif territorial','Chargé de recrutement']},
 {label:'Explorer un autre domaine',symbol:'✧',names:['Développeur informatique','Designer graphique','Infirmier ou infirmière','Éducateur spécialisé','Psychologue','Avocat ou avocate','Architecte']}
];
const INTERESTS=[
 ['relation-client','Contact avec les gens'],['tourisme','Tourisme'],['commerce','Commerce'],['vente','Vente'],
 ['communication','Communication'],['langues','Langues'],['administration','Administration'],
 ['organisation','Organisation'],['informatique','Informatique'],['comptabilite','Comptabilité'],
 ['finance','Finance'],['entrepreneuriat','Entreprendre'],['service-public','Service public'],
 ['evenementiel','Événementiel'],['social','Aider les autres']
];
const LEVELS={
 proche:{label:'Parcours dans la continuité',why:'Ton bac fournit déjà plusieurs bases utiles, mais cela ne garantit ni une place en formation ni un emploi.',symbol:'✓',style:'direct'},
 passerelle:{label:'Passerelle à construire',why:'Tu peux utiliser certaines compétences, puis ajouter des connaissances ou une qualification.',symbol:'↗',style:'bridge'},
 long:{label:'Parcours plus long ou réorientation',why:'Tu peux viser cet objectif, mais il faudra généralement suivre d’autres étapes de formation.',symbol:'⌁',style:'long'}
};
const str=x=>String(x??'');
const esc=x=>str(x).replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
const norm=x=>str(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function mount(host,api){
 if(!host)return {refresh(){},dispose(){}};
 let disposed=false,busy=false,request=null,search='',showSuggestions=true,activeCategory=0;
 const $=id=>host.querySelector('#'+id);
 const p=()=>api.profile();
 const job=()=>str(p().career||'').trim();
 const persist=()=>api.save();
 const levelOf=()=>p().career_result?.data?.assessment?.level;
 const outcome=()=>p().career_result;
 const validOutcome=()=>{const o=outcome();return o&&norm(o.career)===norm(job())&&o.bac===p().bac_origin&&JSON.stringify(o.interests||[])===JSON.stringify(p().interests||[])?o.data:null};
 function tell(message,error=false){
  const el=$('co-career-message');if(el){el.textContent=message;el.classList.toggle('is-error',!!error);}
 }
 function safeString(input,max=250){return str(input).slice(0,max)}
 function currentBacLabel(){return BACS.find(x=>x.key===p().bac_origin)?.name||BACS[0].name;}
 function intro(){
  return '<div class="co-v4-mast"><span>EXPLORATEUR DES MÉTIERS · ALBERT</span>'+
   '<h2>Quel métier <em>veux-tu faire ?</em></h2>'+
   '<p>On part de ton envie. Albert explique comment y arriver depuis ton bac pro, avec plusieurs chemins possibles et les étapes à prévoir.</p></div>';
 }
 function jobStep(){
  return '<div class="co-v4-form">'+
   '<div class="co-v4-step-heading"><span class="co-v4-step-num">01</span><div><h3>Dis-nous ce que tu aimerais devenir.</h3><p>Choisis un métier proposé ou écris le tien. Aucune idée n’est ridicule et tu peux changer ensuite.</p></div></div>'+
   '<label class="co-v4-job-label" for="co-v4-job">Le métier qui m’intéresse</label>'+
   '<div class="co-v4-job-input"><input id="co-v4-job" type="text" maxlength="90" autocomplete="off" placeholder="Ex. responsable de magasin, infirmier, développeur…" value="'+esc(p().career||'')+'">'+
   '<button type="button" data-v4-focus-job>⌕</button></div>'+
   '<div class="co-v4-job-picker"><div class="co-v4-categories">'+JOBS.map((g,i)=>
    '<button type="button" data-v4-category="'+i+'" class="'+(i===activeCategory?'active':'')+'" aria-pressed="'+(i===activeCategory)+'">'+g.symbol+' '+esc(g.label)+'</button>').join('')+'</div>'+
   '<div id="co-v4-samples">'+jobSamples()+'</div></div>'+
   '<div class="co-v4-step-heading co-v4-second"><span class="co-v4-step-num">02</span><div><h3>Quel est ton bac professionnel ?</h3><p>Albert partira des compétences de ta filière actuelle, sans utiliser tes notes.</p></div></div>'+
   '<div class="co-v4-bacs" role="group" aria-label="Mon bac professionnel">'+BACS.map(b=>
    '<button type="button" data-v4-bac="'+b.key+'" aria-pressed="'+(b.key===p().bac_origin)+'" class="'+(b.key===p().bac_origin?'active':'')+'"><strong>'+esc(b.name)+'</strong><small>'+esc(b.sub)+'</small><span>'+(b.key===p().bac_origin?'✓':'')+'</span></button>').join('')+'</div>'+
   '<details class="co-v4-interests"><summary>Ajouter mes centres d’intérêt <span>(facultatif)</span></summary>'+
    '<p>Si tu le souhaites, choisis au maximum cinq domaines pour affiner l’analyse.</p>'+
    '<div class="co-v4-interests-tags">'+INTERESTS.map(([key,label])=>'<button type="button" data-v4-interest="'+key+'" aria-pressed="'+p().interests.includes(key)+'" class="'+(p().interests.includes(key)?'active':'')+'">'+esc(label)+(p().interests.includes(key)?' ✓':'')+'</button>').join('')+'</div></details>'+
   '<div class="co-v4-submit"><button type="button" id="co-v4-analyse" class="co-v4-primary" data-v4-analyse'+(busy||job().length<3?' disabled':'')+'>'+ (busy?'✦ Albert étudie ton parcours…':'✦ Albert, montre-moi les chemins possibles')+'</button>'+
   '<p>Albert reçoit uniquement le nom du métier, ta filière et tes centres d’intérêt choisis. Ton dossier reste enregistré sur cet appareil.</p></div>'+
   '</div>';
 }
 function jobSamples(){
  const list=JOBS[activeCategory]||JOBS[0];
  const text=norm(search),names=list.names.filter(n=>!text||norm(n).includes(text));
  return '<div class="co-v4-job-chips">'+(names.length?names.map(n=>'<button type="button" data-v4-job="'+esc(n)+'" class="'+(norm(n)===norm(job())?'active':'')+'">'+esc(n)+'</button>').join(''):'<p class="co-v4-nojob">Tu peux écrire librement ce métier dans le champ ci-dessus.</p>')+'</div>';
 }
 function recommendation(){
  const data=validOutcome(),hasOld=!!outcome();
  if(!data){
   return '<div class="co-v4-placeholder"><div class="co-v4-placeholder-mark">✦</div><strong>'+ (job()?'Ton métier est défini.':'Ton futur commence par une idée.')+'</strong>'+
    '<p>'+ (job()?'Demande à Albert d’expliquer les parcours possibles pour devenir '+esc(job())+'.':'Choisis le métier de ton choix et ton bac pro. Tu découvriras ensuite plusieurs chemins possibles.')+'</p>'+
    (hasOld?'<p class="co-v4-stale">Ton précédent conseil ne correspond plus au métier ou au bac sélectionné. Aucun brouillon n’a été effacé.</p>':'')+
    '<div class="co-v4-promise"><span>1</span> Un métier et ses missions <span>2</span> Les chemins de formation <span>3</span> Ce que tu peux faire dès maintenant</div>'+ '<a class="co-v4-first-onisep" href="'+ONISEP+'" target="_blank" rel="noopener noreferrer">Découvrir les métiers sur Onisep ↗</a>'+
   '</div>';
  }
  const lev=LEVELS[data.assessment?.level]||LEVELS.passerelle;
  return '<div class="co-v4-report">'+
   '<header class="co-v4-report-hero"><span>✦ ANALYSE ALBERT · PROJET DE MÉTIER</span><h3>'+esc(safeString(data.career,110))+'</h3>'+
   '<p>'+esc(safeString(data.summary,420))+'</p></header>'+
   '<section class="co-v4-verdict co-v4-'+lev.style+'"><div class="co-v4-verdict-header"><span class="co-v4-verdict-symbol">'+lev.symbol+'</span><div><small>TYPE DE CHEMIN À PRÉVOIR</small><h4>'+lev.label+'</h4></div></div>'+
   '<p>'+esc(safeString(data.assessment?.why,550))+'</p>'+
   '<p class="co-v4-level-note">'+lev.why+'</p>'+
   '<div class="co-v4-check-lists"><div><strong>Ce que ton bac peut t’apporter</strong><ul>'+list(data.assessment?.strengths,3,160)+'</ul></div>'+
   '<div><strong>Ce qu’il faudra vérifier</strong><ul>'+list(data.assessment?.to_check,4,220)+'</ul></div></div></section>'+
   '<div class="co-v4-routes-header"><h4>Plusieurs chemins possibles</h4><p>Il n’y a pas un unique parcours : compare les étapes et les diplômes exigés.</p></div>'+
   '<div class="co-v4-route-list">'+(Array.isArray(data.routes)?data.routes.slice(0,3):[]).map((route,i)=>routeHTML(route,i)).join('')+'</div>'+
   '<div class="co-v4-actions"><div><h4>Par quoi commencer ?</h4><ol>'+list(data.next_actions,4,230,'li')+'</ol></div>'+
   '<div class="co-v4-links"><a href="'+ONISEP+'" target="_blank" rel="noopener noreferrer">Vérifier le métier sur Onisep ↗</a>'+
   '<a href="'+PARCOURSUP+'" target="_blank" rel="noopener noreferrer">Voir les formations Parcoursup ↗</a></div></div>'+
   (data.warning?'<p class="co-v4-warning">À confirmer : '+esc(safeString(data.warning,300))+'</p>':'')+
   '<p class="co-v4-disclaimer">L’analyse décrit des parcours de formation, pas ta valeur ni tes chances personnelles d’admission. Vérifie les conditions d’accès aux diplômes auprès des établissements et de ton professeur principal.</p>'+
  '</div>';
 }
 function list(input,n,len,tag='li'){
  return (Array.isArray(input)?input:[]).slice(0,n).map(v=>'<'+tag+'>'+esc(safeString(v,len))+'</'+tag+'>').join('');
 }
 function equivalentCourse(course){
  const raw=norm(course);
  const courses=api.courses();
  let match=courses.find(c=>norm(c)===raw);
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
  return '<article class="co-v4-route"><div class="co-v4-route-top"><span>CHEMIN '+String(i+1).padStart(2,'0')+'</span><strong>'+esc(safeString(route.title,110))+'</strong></div>'+
   '<p class="co-v4-course"><b>Formation repère :</b> '+esc(course||'À vérifier sur les sources officielles')+'</p>'+
   '<p class="co-v4-route-why">'+esc(safeString(route.why,330))+'</p>'+
   '<ol class="co-v4-milestones">'+(Array.isArray(route.steps)?route.steps.slice(0,4):[]).map(x=>
    '<li><strong>'+esc(safeString(x.title,90))+'</strong><span>'+esc(safeString(x.detail,320))+'</span></li>').join('')+'</ol>'+
   '<div class="co-v4-route-first"><b>Première action :</b> '+esc(safeString(route.action,250))+'</div>'+
   '<div class="co-v4-route-buttons">'+(known?'<button type="button" data-v4-explore="'+esc(known)+'">Explorer cette formation</button>'+
    '<button type="button" data-v4-save-course="'+esc(known)+'">+ Garder dans mes choix</button>':'<a href="'+ONISEP+'" target="_blank" rel="noopener noreferrer">Vérifier le diplôme sur Onisep ↗</a>')+'</div></article>';
 }
 function render(){
  if(disposed||!host.isConnected)return;
  host.innerHTML=intro()+'<div class="co-v4-layout"><section class="co-v4-card">'+jobStep()+'</section>'+
   '<section class="co-v4-output" id="co-v4-report" aria-label="Conseil Albert sur mon métier">'+recommendation()+'</section></div>'+
   '<p class="co-v4-local-note" id="co-career-message" role="status" aria-live="polite">Le projet est conservé uniquement dans ton navigateur. Un conseil est demandé à Albert sur action volontaire.</p>';
 }
 function updateParts(){
  if(disposed)return;
  const el=$('co-v4-samples');if(el)el.innerHTML=jobSamples();
  const btn=$('co-v4-analyse');if(btn)btn.disabled=busy||job().length<3;
 }
 function clearResult(){const box=$('co-v4-report');if(box)box.innerHTML=recommendation();}
 function setJob(value){
  const input=safeString(value,90);
  search='';p().career=input;persist();
  const field=$('co-v4-job');if(field)field.value=input;
  updateParts();clearResult();
 }
 function setBac(value){
  if(!BACS.some(b=>b.key===value)||value===p().bac_origin)return;
  api.changeBac(value);render();
  tell('Bac mis à jour. Tu peux maintenant demander un conseil adapté à cette filière.');
 }
 function toggleInterest(v){
  const interests=p().interests;
  if(interests.includes(v))p().interests=interests.filter(x=>x!==v);
  else if(interests.length<5)p().interests=[...interests,v];
  else{tell('Cinq centres d’intérêt maximum.',true);return}
  persist();
  const details=host.querySelector('.co-v4-interests');const isOpen=!!details?.open;
  render();if(isOpen){const newDetails=host.querySelector('.co-v4-interests');if(newDetails)newDetails.open=true;}
 }
 async function analyse(){
  if(busy||job().length<3)return;
  const target=job();
  if(target.length>90||/[\n\r<>{}[\]@\\/]|(?:https?:|www\.)/i.test(target)||/\d{4,}/.test(target)){
   tell('Indique seulement le nom d’un métier, sans coordonnées ni informations personnelles.',true);return;
  }
  busy=true;request?.abort();request=new AbortController();const own=request;
  const btn=$('co-v4-analyse');if(btn){btn.disabled=true;btn.textContent='✦ Albert prépare tes chemins…';}
  tell('Albert analyse les compétences de ton bac et les formations possibles pour ce métier…');
  try{
   const body={action:'career_path',career:target,filiere:p().bac_origin,interests:p().interests.slice(0,5)};
   const response=await fetch(URL_ALBERT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:own.signal});
   const json=await response.json().catch(()=>({}));
   if(!response.ok||!json.ok)throw Error(json.error||'Albert ne peut pas analyser ce métier actuellement.');
   if(disposed||own.signal.aborted)return;
   if(norm(job())!==norm(target)||p().bac_origin!==body.filiere||JSON.stringify(p().interests)!==JSON.stringify(body.interests)){tell('Tu as modifié ton projet : demande une nouvelle analyse pour ce choix.');return}
   const plan={career:target,bac:body.filiere,interests:body.interests.slice(),data:{
    career:safeString(json.career,110),summary:safeString(json.summary,420),
    assessment:json.assessment,routes:json.routes,next_actions:json.next_actions,warning:safeString(json.warning,300)
   },date:new Date().toISOString()};
   p().career_result=plan;persist();clearResult();
   tell('Parcours élaboré par Albert et sauvegardé localement. Vérifie ensuite les conditions officielles.');
  }catch(e){if(own.signal.aborted)return;tell(e?.message||'Le conseil d’Albert est indisponible. Tu peux toujours consulter Onisep.',true);}
  finally{if(!disposed){busy=false;const b=$('co-v4-analyse');if(b){b.disabled=job().length<3;b.textContent='✦ Actualiser mon parcours avec Albert';}}}
 }
 function onClick(event){
  const node=event.target;
  const jobChip=node.closest('[data-v4-job]');
  if(jobChip){setJob(jobChip.dataset.v4Job);return;}
  const bacChip=node.closest('[data-v4-bac]');
  if(bacChip){setBac(bacChip.dataset.v4Bac);return;}
  const catChip=node.closest('[data-v4-category]');
  if(catChip){search='';activeCategory=Number(catChip.dataset.v4Category)||0;
   host.querySelectorAll('[data-v4-category]').forEach(n=>{const on=Number(n.dataset.v4Category)===activeCategory;n.classList.toggle('active',on);n.setAttribute('aria-pressed',String(on));});
   const list=$('co-v4-samples');if(list)list.innerHTML=jobSamples();return;
  }
  const interest=node.closest('[data-v4-interest]');
  if(interest){toggleInterest(interest.dataset.v4Interest);return;}
  if(node.closest('[data-v4-analyse]')){analyse();return;}
  if(node.closest('[data-v4-focus-job]')){$('co-v4-job')?.focus();return;}
  const explore=node.closest('[data-v4-explore]');
  if(explore){api.openCourse(explore.dataset.v4Explore);return;}
  const save=node.closest('[data-v4-save-course]');
  if(save){api.saveCourse(save.dataset.v4SaveCourse);tell('Formation ajoutée à « Mes choix » si elle n’y figurait pas déjà.');return;}
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
window.CORTEX_ORIENTATION_CAREERS={mount,version:'4.0'};
})();