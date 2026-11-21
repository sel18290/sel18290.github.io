/* CORTEX Orientation 2.0 — Démonstration / trois filières bac pro.
 * Dossier, choix et préférences : localStorage exclusivement.
 * Albert ne reçoit que des options pédagogiques prédéfinies après un clic explicite.
 * L'API publique Parcoursup reçoit des requêtes de formation/commune (pas le dossier).
 */
(function(){
'use strict';
const KEY='cortex:demo:orientation:local:v1';
const SOURCE='https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-parcoursup/';
const DATA='https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-parcoursup/records';
const ALBERT='https://jhtmaoeazmjigfruandl.supabase.co/functions/v1/cortex-orientation-advice';
const SOURCES={
 parcoursup:'https://www.parcoursup.gouv.fr/',
 carte:'https://dossier.parcoursup.fr/Candidat/carte',
 data:SOURCE,
 dse:'https://www.etudiant.gouv.fr/fr/bourse-et-logement-constituez-votre-dossier-social-etudiant-dse-409',
 simulateur:'https://www.lescrous.fr/nos-services/simulateur-de-bourse/',
 services:'https://messervices.etudiant.gouv.fr/',
 mobilite:'https://www.parcoursup.gouv.fr/preparer-sa-vie-etudiante/l-aide-la-mobilite-parcoursup-1667',
 logement:'https://trouverunlogement.lescrous.fr/',
 visale:'https://www.actionlogement.fr/la-garantie-visale',
 inser:'https://www.inserjeunes.education.gouv.fr/diffusion/accueil',
 fiches:'https://www.parcoursup.gouv.fr/faq/thematiques/formations-disponibles/formations-sur-parcoursup'
};
const COURSES=[
'BTS Tourisme',"BTS Support à l'action managériale",'BTS Management commercial opérationnel',
'BTS Négociation et digitalisation de la relation client','BTS Communication',
'BTS Gestion de la PME','BTS Commerce international','BTS Banque','BTS Assurance',
'BTS Comptabilité et gestion','BTS Services informatiques aux organisations',
'BUT Techniques de commercialisation','BUT Gestion des entreprises et des administrations',
'BUT Information-communication','Licence AES','Certificat de spécialisation Accueil dans les transports',
'Certificat de spécialisation Accueil-réception','BTS Professions immobilières'
];
const FILIERES={
 accueil:{
 label:"Métiers de l'accueil",short:'Accueil',
 explain:'Recevoir, informer, orienter et accompagner les publics.',
 icon:'✧',
 themes:['relation-client','tourisme','langues','evenementiel','service-public'],
 courses:[0,1,4,2,16,15,5,17,13]
 },
 commerce:{
 label:'Commerce et vente · option A',short:'Commerce A',
 explain:'Animer et gérer un espace commercial, conseiller les clients et développer les ventes.',
 icon:'◈',
 themes:['commerce','vente','relation-client','entrepreneuriat','communication'],
 courses:[2,3,6,4,7,8,11,17,5]
 },
 agora:{
 label:'Gestion-administration · AGOrA',short:'AGOrA',
 explain:'Organiser, gérer des dossiers et accompagner l’activité d’une organisation.',
 icon:'▦',
 themes:['administration','organisation','comptabilite','informatique','service-public'],
 courses:[5,1,9,8,7,10,12,14,17]
 }
};

/* Ce classement décrit la proximité pédagogique, jamais les chances d'admission.
 * Toute formation est classée dans les 3 familles, pour chacune des 3 filières.
 * Aucun parcours n'est interdit : les attendus locaux sont à consulter sur Parcoursup.
 */
const FAMILIES={
 direct:{
  title:'Dans la continuité de ton bac',
  short:'Proche de ton bac',
  subtitle:'Les activités de ces formations prolongent directement plusieurs compétences de ta filière.',
  caution:"Une poursuite cohérente ne signifie pas que l’admission est assurée.",
  dictionary:"Un cursus dont plusieurs compétences prolongent celles travaillées dans ton bac pro. Cette indication concerne le contenu de la formation, pas tes chances d’admission."
 },
 bridge:{
  title:'Passerelles à explorer',
  short:'Passerelle possible',
  subtitle:'Tu possèdes des bases utiles, mais tu découvriras aussi de nouveaux apprentissages.',
  caution:"Lis les attendus et prépare les compétences qui te manquent avant de candidater.",
  dictionary:"Une formation que tu peux envisager en utilisant une partie de tes compétences actuelles, tout en apprenant de nouvelles matières. C’est une possibilité à explorer, pas un refus."
 },
 prepare:{
  title:'Nouvelle direction à préparer',
  short:'Transition à préparer',
  subtitle:'Ton projet peut évoluer : certaines formations sont plus éloignées de ton enseignement actuel.',
  caution:"Ce n’est pas interdit ! Il faut surtout regarder les attendus, le rythme et l’accompagnement possible.",
  dictionary:"Une formation dont les méthodes ou matières s’éloignent davantage de ton bac. Tu peux la demander : prévois de vérifier son contenu et tes besoins d’accompagnement. Ce n’est pas un jugement sur ton niveau."
 }
};
const FITS={
 accueil:{direct:[0,1,15,16],bridge:[4,2,3,5,17,7,8,6],prepare:[9,10,11,12,13,14]},
 commerce:{direct:[2,3,4,6],bridge:[0,5,7,8,17,1,15,16],prepare:[9,10,11,12,13,14]},
 agora:{direct:[5,1,9,8],bridge:[7,4,17,0,2,3,6,16],prepare:[10,11,12,13,14,15]}
};
const COURSE_DETAILS=[
 {about:'Accueil des visiteurs, voyages, information et relation clientèle touristique.',focus:'La pratique des langues étrangères et la connaissance des destinations.',tags:['tourisme','relation-client','langues']},
 {about:'Organisation de réunions, gestion des agendas et accompagnement de responsables.',focus:'La rédaction, les outils bureautiques et souvent les langues étrangères.',tags:['administration','organisation','langues']},
 {about:'Gestion d’un magasin ou rayon, animation commerciale et management d’équipe.',focus:'La gestion commerciale, les chiffres de vente et l’organisation du travail.',tags:['commerce','vente','relation-client','entrepreneuriat']},
 {about:'Prospection, négociation commerciale et relation client à distance ou en ligne.',focus:'La prospection, la négociation, l’aisance orale et les outils numériques.',tags:['vente','relation-client','communication']},
 {about:'Conception de messages, campagnes et projets de communication.',focus:'L’expression écrite, les outils de création et la conduite de projet.',tags:['communication','evenementiel','organisation']},
 {about:'Suivi administratif d’une petite ou moyenne entreprise, clients et fournisseurs.',focus:'La comptabilité appliquée, l’organisation et les logiciels de gestion.',tags:['administration','organisation','entrepreneuriat']},
 {about:'Achats, ventes et suivi de marchandises dans les échanges internationaux.',focus:'Les langues étrangères, le commerce international et la logistique.',tags:['commerce','langues','vente']},
 {about:'Accueil des clients, opérations bancaires et conseil sur les services.',focus:'Les calculs, les règles bancaires et le conseil client.',tags:['finance','relation-client','commerce']},
 {about:'Conseil et gestion de contrats d’assurance, suivi des dossiers et des clients.',focus:'La lecture de contrats, les règles du secteur et le suivi administratif.',tags:['finance','administration','relation-client']},
 {about:'Enregistrement des opérations comptables, contrôle et gestion de l’activité.',focus:'La rigueur, les calculs, les outils comptables et l’analyse financière.',tags:['comptabilite','finance','administration']},
 {about:'Développement de logiciels ou administration et sécurisation des réseaux.',focus:'Les bases informatiques, la logique, les projets techniques et l’autonomie.',tags:['informatique','organisation']},
 {about:'Études de marché, marketing, vente et projets commerciaux en IUT.',focus:'Les enseignements théoriques, les méthodes universitaires et les projets.',tags:['commerce','vente','communication']},
 {about:'Gestion, finance, ressources humaines et pilotage d’organisations en IUT.',focus:'Les mathématiques appliquées, l’analyse et le rythme universitaire.',tags:['administration','comptabilite','organisation']},
 {about:'Communication, contenus, médias et méthodologie de projet en IUT.',focus:'La culture générale, l’analyse, la rédaction et le travail autonome.',tags:['communication','evenementiel','langues']},
 {about:'Administration économique et sociale : droit, économie, gestion et société.',focus:'La lecture de textes, l’argumentation, le travail personnel et les matières théoriques.',tags:['administration','service-public','social']},
 {about:'Accueil et service des voyageurs dans les transports.',focus:'Les langues, la mobilité et les conditions propres au métier visé.',tags:['tourisme','langues','relation-client']},
 {about:'Techniques de réception, accueil et hébergement dans un établissement touristique.',focus:'Les langues, les contraintes horaires et les missions réelles de réception.',tags:['tourisme','relation-client','langues']},
 {about:'Gestion, location et commercialisation de biens immobiliers.',focus:'Les notions juridiques, la gestion et la négociation commerciale.',tags:['commerce','administration','vente']}
];
const DIRECT_REASONS={
 accueil:{
  0:'L’accueil du public, l’information et la relation client rejoignent tes compétences.',
  1:'Les échanges professionnels et l’organisation sont utiles pour assister une équipe.',
  15:'L’accueil et l’orientation des voyageurs prolongent tes mises en situation.',
  16:'La réception et l’information du public sont proches de tes activités.'
 },
 commerce:{
  2:'L’animation d’un espace commercial et le conseil client prolongent ton option A.',
  3:'Les compétences de vente et de relation client offrent une base pour apprendre la négociation.',
  4:'La promotion de produits et la relation client donnent des repères pour la communication.',
  6:'La vente et le commerce donnent une première base, à compléter notamment en langues.'
 },
 agora:{
  5:'La gestion des dossiers et le suivi administratif sont au cœur de ta filière.',
  1:'L’organisation et la communication professionnelle préparent à assister des équipes.',
  9:'La gestion administrative est une base, à compléter avec les méthodes comptables.',
  8:'Le suivi de dossiers et la relation avec les usagers sont utiles en assurance.'
 }
};
function familyFor(bac,course){
 const index=COURSES.indexOf(course),set=FITS[bac]||FITS.accueil;
 if(set.direct.includes(index))return 'direct';
 if(set.bridge.includes(index))return 'bridge';
 return 'prepare';
}
function aboutCourse(course,bac=profile.bac_origin){
 const index=COURSES.indexOf(course);
 const family=familyFor(bac,course),detail=COURSE_DETAILS[index]||{about:'Consulte la fiche de cette formation.',focus:'Les attendus publiés sur Parcoursup.',tags:[]};
 const matched=(detail.tags||[]).filter(tag=>profile.interests.includes(tag)).map(tag=>INTERESTS[tag]);
 const why=family==='direct'?(DIRECT_REASONS[bac]?.[index]||'Ce parcours prolonge plusieurs compétences de ta filière.'):
  family==='bridge'?'Tu peux y transférer certaines compétences de '+FILIERES[bac].short+'. Il faudra aussi découvrir de nouvelles matières.':
  'Le contenu ou le rythme s’éloigne davantage de ton bac '+FILIERES[bac].short+'. Cela ne t’empêche pas de candidater.';
 return {family,detail,why,matched};
}

const INTERESTS={
 'relation-client':'Écouter et aider','tourisme':'Voyages et tourisme',
 'commerce':'Commerce','vente':'Vente et conseil','communication':'Communication',
 'langues':'Langues étrangères','administration':'Administration',
 'organisation':'Organiser des projets','informatique':'Informatique',
 'comptabilite':'Comptabilité','finance':'Banque et finance',
 'entrepreneuriat':'Créer mon activité','service-public':'Service public',
 'evenementiel':'Événements','social':'Aider les autres'
};
const DEFINITIONS={
 voeu:['Un vœu Parcoursup',"C’est une formation que tu demandes sur Parcoursup. Un vœu est une demande, pas une admission."],
 sousvoeu:['Un sous-vœu',"Pour certaines formations comme les BTS, un vœu peut regrouper plusieurs établissements. Chacun constitue un sous-vœu soumis aux règles de Parcoursup."],
 bts:['BTS',"Brevet de technicien supérieur : diplôme de niveau bac + 2, généralement préparé en lycée. Les BTS constituent une poursuite d’études importante après un bac professionnel."],
 but:['BUT',"Bachelor universitaire de technologie : diplôme de niveau bac + 3 en IUT. Il est souvent plus exigeant sur le plan théorique ; consulte les attendus et les dispositifs d’accompagnement."],
 licence:['Licence',"Formation universitaire généralement de 3 ans. Le travail est plus autonome. Pour un bac professionnel, il est important d’évaluer ses besoins d’accompagnement."],
 admission:['Taux d’accès',"C’est la proportion de candidats ayant confirmé un vœu qui étaient en position de recevoir une proposition durant la phase principale, selon les données 2025. Ce n’est PAS ta chance personnelle d’être admis, ni le pourcentage qui s’est inscrit."],
 bacpro:['Part de bacheliers professionnels parmi les candidats susceptibles de recevoir une proposition',"Sur 100 candidats susceptibles de recevoir une proposition, cet indicateur indique combien étaient en terminale professionnelle. Ce n’est PAS la probabilité qu’un élève de bac pro soit accepté."],
 admispro:['Admis issus du bac pro',"Pourcentage des personnes ayant accepté leur proposition et venant d’un bac professionnel. Ce n’est pas la chance d’admission d’un candidat de ta filière."],
 selectivite:['Formation sélective',"L’établissement examine les candidatures selon ses critères (bulletins, motivation, compétences, etc.). Une formation sélective ne garantit pas une place, même avec un bon dossier."],
 apprentissage:['Apprentissage',"Tu alternes entre un établissement de formation et une entreprise avec un contrat de travail. Les statistiques Parcoursup 2025 utilisées ici n’incluent pas ces formations."],
 reussite:['Taux de réussite',"Part des étudiants qui réussissent un diplôme ou une année selon une population et une période précises. Il faut consulter la fiche de la formation ; le taux d’accès n’est pas le taux de réussite."],
 insertion:['Insertion professionnelle',"Indicateur sur l’accès à l’emploi après une formation, mesuré à une date donnée. Le taux d’emploi à six mois ne concerne pas forcément tous les diplômés."],
 bourse:['Bourse sur critères sociaux',"Aide financière destinée à certains étudiants selon la situation familiale et d’autres critères. Seul le simulateur officiel permet une estimation ; le dossier doit être déposé via le DSE."],
 crous:['CROUS',"Centre régional des œuvres universitaires et scolaires : aide pour les bourses, le logement et la restauration étudiante."],
 dse:['DSE',"Dossier social étudiant : dossier de demande de bourse et, selon les règles, de logement universitaire."],
 attendus:['Attendus',"Compétences et connaissances jugées utiles pour réussir une formation. Tu peux les lire sur chaque fiche Parcoursup."],
 mobilite:['Mobilité',"Jusqu’où tu es prêt à aller pour étudier : ta ville, les villes proches ou toute la France. Élargir la zone peut aider à découvrir d’autres établissements."],
 classement:['Pourquoi ces trois catégories ?',"Ce classement pédagogique indique seulement si le programme prolonge directement ton bac, s'il constitue une passerelle, ou s'il comporte davantage de nouvelles matières. Toutes les formations de la liste peuvent être explorées. Les règles d'admission dépendent de chaque établissement et de ton dossier."],
 passerelle:['Passerelle possible',"Des compétences acquises au lycée peuvent t'aider, mais tu devras aussi découvrir de nouvelles matières. Une passerelle n'est ni une interdiction ni une promesse d'admission."],
 transition:['Nouvelle direction à préparer',"Une formation plus éloignée de ton bac peut être envisageable. Lis attentivement les attendus, renseigne-toi sur le niveau de travail demandé et demande conseil à ton professeur principal."],
 btspriorite:['Pourquoi les BTS occupent une place importante ?',"Les bacheliers professionnels bénéficient de places priorisées dans les BTS selon les règles de Parcoursup. Cela n'assure pas une admission individuelle. En BUT, les places priorisées concernent particulièrement les bacheliers technologiques."],
 parcours:['Parcours alternatif',"Une autre formation qui correspond à des compétences ou centres d’intérêt proches de ton projet. Ce n’est pas nécessairement un second choix moins bon."],
 diversite:['Diversifier ses vœux',"Construire plusieurs pistes cohérentes, dans différents établissements ou formations, pour ne pas dépendre d’une seule possibilité. Vérifie les règles de regroupement des vœux."],
 historique:['Données 2025',"Les chiffres présentés décrivent la session Parcoursup 2025, hors apprentissage. Ils ne prédisent pas la sélection des dossiers en 2027."],
 fiabilite:['Indicateur indisponible',"Un tiret ou « À consulter » signifie que le chiffre n’a pas été retrouvé de manière fiable. Nous ne le remplaçons pas par une estimation inventée."]
};
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const pct=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.').replace('%',''));return Number.isFinite(n)&&n>=0&&n<=100?n:null;};
const formatPct=v=>{const n=pct(v);return n===null?'Non publié':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(n)+' %';};
const sourceUrl=v=>{try{const u=new URL(String(v));return u.protocol==='https:'&&/(\.|^)parcoursup\.(gouv\.fr|fr)$/.test(u.hostname)?u.href:SOURCES.carte;}catch{return SOURCES.carte;}};
const safeCareer=value=>{
 const job=clean(value);
 return job.length<=90&&!/[^\p{L}\p{M}0-9 '’().,‐‑–-]|\d{4,}|www\./iu.test(job)?job:'';
};
const dflt=()=>({bac_origin:'accueil',goal:'',city:'Paris',mobility:'ville',apprenticeship:false,interests:[],wishes:[],tasks:[],notes:'',letters:{},entry_mode:'metier',career:'',career_result:null,wish_plan:null});
let root=null,profile=dflt(),tab='projet',records=[],aiBusy=false,autoTimer=0,tabData=null,aiResult=null,showAllSuggestions=false,letterStudio=null,careerStudio=null,searchState='idle',searchTotal=0,searchPage=1,searchRequest=null,aiRequest=null,compared=new Set();
let wishMain='',wishRequest=null,wishMessage='',searchCareer='';
const PAGE_SIZE=12;
const $=id=>root?.querySelector('#'+id);
const help=(id)=>'<button type="button" class="co-help" data-co-define="'+esc(id)+'" aria-label="Comprendre : '+esc(DEFINITIONS[id]?.[0]||id)+'" title="Explication en mots simples">?</button>';
const anchor=(url,text)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(text)+'</a>';
function readWish(w){
 const title=clean(w?.title).slice(0,160);
 const pathway=COURSES.includes(w?.pathway)?w.pathway:
  COURSES.find(c=>norm(title).replace(/^(bts|but)\s*[-–]\s*/,'$1 ').includes(norm(c)))||'';
 return {
  title,pathway,school:clean(w?.school).slice(0,150),city:clean(w?.city).slice(0,80),
  url:sourceUrl(w?.url),year:Number(w?.year)===2025?2025:null,code:clean(w?.code).slice(0,110),
  region:clean(w?.region).slice(0,100),career:safeCareer(w?.career),
  taux:pct(w?.taux),part:pct(w?.part),pctbp:pct(w?.pctbp)
 };
}
function readWishPlan(plan,wishes){
 if(!plan||!['albert','guide'].includes(plan.provider)||typeof plan.context!=='string'||plan.context.length>600||
    !wishes.some(w=>w.code===plan.main&&completeWish(w))||
    !Array.isArray(plan.suggestions)||plan.suggestions.length!==4)return null;
 const suggestions=plan.suggestions.map(item=>{
  const course=item?.course,why=clean(item?.why).slice(0,190);
  const choice=item?.choice?readWish(item.choice):null;
  return {course,why,choice:completeWish(choice)&&choice.pathway===course?choice:null};
 });
 if(new Set(suggestions.map(x=>x.course)).size!==4||
    suggestions.some(x=>!COURSES.includes(x.course)||!x.why))return null;
 return {main:plan.main,context:plan.context,provider:plan.provider,suggestions};
}
function read(){
 try{
 const raw=localStorage.getItem(KEY);if(!raw||raw.length>450000)return dflt();
 const x=JSON.parse(raw);if(!x||typeof x!=='object'||Array.isArray(x))return dflt();
 const old=x.bac_origin==='mcv'?'commerce':x.bac_origin;
 const p={...dflt(),...x,bac_origin:old};
 if(!Object.hasOwn(FILIERES,p.bac_origin))p.bac_origin='accueil';
 const oldGoal=clean(p.goal).slice(0,180);
 const names={
  'bts mco':COURSES[2],'mco':COURSES[2],
  'bts ndrc':COURSES[3],'ndrc':COURSES[3],
  'bts sam':COURSES[1],'sam':COURSES[1],
  'bts gpme':COURSES[5],'gpme':COURSES[5],
  'bts cg':COURSES[9],'bts sio':COURSES[10],
  'bts ci':COURSES[6],'bts tourisme':COURSES[0]
 };
 p.goal=COURSES.includes(oldGoal)?oldGoal:COURSES.find(c=>norm(c)===norm(oldGoal))||names[norm(oldGoal)]||'';
 p.city=typeof p.city==='string'?clean(p.city).slice(0,100):'Paris';
 p.mobility=['ville','region','france'].includes(p.mobility)?p.mobility:'ville';
 // Migrer les anciens champs d'intérêt libres en mots-clés locaux ; ne jamais les envoyer à Albert.
 p.interests=Array.isArray(x.interests)?x.interests.filter(v=>Object.hasOwn(INTERESTS,v)).slice(0,5):[];
 p.apprenticeship=!!p.apprenticeship;
 p.wishes=Array.isArray(x.wishes)?x.wishes.slice(0,30).map(readWish).filter(w=>w.title):[];
 p.wish_plan=readWishPlan(x.wish_plan,p.wishes);
 p.tasks=Array.isArray(x.tasks)?x.tasks.filter(v=>['fiches','parler','bourse','alternance','comparaison'].includes(v)):[];
 p.letters={};
 if(x.letters&&typeof x.letters==='object'&&!Array.isArray(x.letters)){
  for(const [k,d] of Object.entries(x.letters).slice(0,45)){
   if(k.length>330||!d||typeof d!=='object'||Array.isArray(d))continue;
   const section={};
   for(const field of ['motivation','competences','formation','avenir'])section[field]=String(d.sections?.[field]||'').slice(0,1400);
   p.letters[k]={target:String(d.target||'').slice(0,160),sections:section,
    final:String(d.final||'').slice(0,5000),limit:d.limit===4500?4500:1500};
  }
 }
 p.entry_mode=['metier','formation'].includes(x.entry_mode)?x.entry_mode:(p.goal?'formation':'metier');
 p.career=String(x.career||'').slice(0,90);
 p.career_result=null;
 if(x.career_result&&typeof x.career_result==='object'&&!Array.isArray(x.career_result)){
  try{
   const a=x.career_result;
   if(typeof a.career==='string'&&typeof a.bac==='string'&&a.data&&typeof a.data==='object'&&
      JSON.stringify(a).length<26000&&['proche','passerelle','long'].includes(a.data?.assessment?.level)){
    p.career_result={career:a.career.slice(0,90),bac:a.bac,interests:Array.isArray(a.interests)?a.interests.filter(v=>Object.hasOwn(INTERESTS,v)).slice(0,5):[],data:a.data,date:String(a.date||'').slice(0,35)};
   }
  }catch{}
 }
 p.notes=clean(p.notes).slice(0,1200);
 const previousInterests=typeof x.interests==='string'?clean(x.interests).slice(0,360):'';
 if(previousInterests&&!norm(p.notes).includes(norm(previousInterests)))p.notes=('Mes anciens centres d’intérêt : '+previousInterests+'\n'+p.notes).slice(0,1200);
 if(oldGoal&&!p.goal&&!norm(p.notes).includes(norm(oldGoal)))p.notes=('Ancien projet : '+oldGoal+'\n'+p.notes).slice(0,1200);
 return p;
 }catch{return dflt();}
}
function persist(silent=false){
 try{
  localStorage.setItem(KEY,JSON.stringify(profile));
  if(!silent)status('Projet enregistré dans ce navigateur. Aucune synchronisation serveur.',false);
  updateCounters();
  return true;
 }catch{status('Sauvegarde locale bloquée ou saturée. Exporte ton projet pour le conserver.',true);return false;}
}
function schedule(){clearTimeout(autoTimer);autoTimer=setTimeout(()=>{autoTimer=0;persist(true);},370);}
function status(text,bad=false){const el=$('co-message');if(!el)return;el.textContent=text;el.classList.toggle('co-error',bad);}
function updateCounters(){
 const count=profile.wishes.length;
 if($('co-count-wishes'))$('co-count-wishes').textContent=String(count);
 if($('co-count-tasks'))$('co-count-tasks').textContent=String(profile.tasks.length);
}
function changeBac(bac){
 if(!Object.hasOwn(FILIERES,bac)||bac===profile.bac_origin)return;
 cancelWishRequest();
 profile.bac_origin=bac;aiResult=null;showAllSuggestions=false;persist(true);
 renderSectors();renderInterests();renderSuggestions();renderAlbert();renderSearch();renderWishes();
 careerStudio?.refresh();
}
function exploreCourse(course,career=''){
 resetSearch();
 tabData=course;searchCareer=safeCareer(career);
 openTab('explorer',true);
}
function renderEntry(){
 $('co-bac').value=profile.bac_origin;
 const mode=profile.entry_mode==='formation'?'formation':'metier';
 root.querySelectorAll('[data-co-entry]').forEach(el=>{
  const active=el.dataset.coEntry===mode;
  el.classList.toggle('active',active);
  el.setAttribute('aria-pressed',String(active));
 });
 const metier=$('co-v4-metier-panel'),formation=$('co-v4-formation-panel');
 if(metier)metier.hidden=mode!=='metier';
 if(formation)formation.hidden=mode!=='formation';
 if(mode==='metier'){
  const host=$('co-v4-metier-root'),mod=window.CORTEX_ORIENTATION_CAREERS;
  if(!host)return;
  if(!mod?.mount){
   host.innerHTML='<div class="co-pane"><h2>Voie métier momentanément indisponible</h2><p>Actualise la page ou utilise la voie « Je pars d’une formation ».</p></div>';return;
  }
  if(!careerStudio)careerStudio=mod.mount(host,{
   profile:()=>profile,save:()=>persist(true),courses:()=>COURSES.slice(),
   courseFit:course=>COURSES.includes(course)?aboutCourse(course):null,
   syncInterests:()=>{
    cancelWishRequest();aiResult=null;
    renderInterests();renderGoalInfo();renderSuggestions();renderAlbert();
   },
   openCourse:course=>{
    if(!COURSES.includes(course))return;
    exploreCourse(course,profile.career);
   },
   saveCourse:course=>{
    if(COURSES.includes(course))keepCourse(course,null,profile.career);
   }
  });
  else careerStudio.refresh();
 }
}

function openTab(next,focus=false){
 status('');
 tab=['projet','explorer','pistes','lettre','aides'].includes(next)?next:'projet';
 root.querySelectorAll('.co-step-navigation [data-co-tab]').forEach(el=>{
  const on=el.dataset.coTab===tab;el.classList.toggle('active',on);if(on)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
 });
 root.querySelectorAll('[data-co-panel]').forEach(el=>{el.hidden=el.dataset.coPanel!==tab;});
 if(tab==='projet'){renderSectors();renderInterests();renderSuggestions();renderAlbert();renderEntry();}
 if(tab==='pistes'){renderWishes();}
 if(tab==='lettre'){renderLetter();}
 if(tab==='aides'){renderAid();}
 if(tab==='explorer'){renderSearch();}
 const panel=root.querySelector('[data-co-panel="'+tab+'"]');
 panel?.scrollIntoView({block:'start'});
 if(focus)panel?.focus({preventScroll:true});
}
function courseOptions(selected=profile.goal,placeholder='Je découvre encore mes possibilités'){
 const groups=FITS[profile.bac_origin]||FITS.accueil;
 return '<option value="">'+esc(placeholder)+'</option>'+
  Object.entries(FAMILIES).map(([family,info])=>
   '<optgroup label="'+esc(info.title)+'">'+groups[family].map(index=>{
    const course=COURSES[index];
    return '<option value="'+esc(course)+'"'+(selected===course?' selected':'')+'>'+esc(course)+'</option>';
   }).join('')+'</optgroup>'
  ).join('');
}
function renderGoalInfo(){
 const box=$('co-goal-info');if(!box)return;
 const course=profile.goal;
 if(!course){
  box.innerHTML='';
  return;
 }
 const {family,detail,why,matched}=aboutCourse(course),info=FAMILIES[family];
 const level=course.startsWith('BTS')?'BTS · BAC + 2':course.startsWith('BUT')?'BUT · BAC + 3':course.startsWith('Licence')?'LICENCE · BAC + 3':'CERTIFICAT DE SPÉCIALISATION';
 box.innerHTML='<article class="co-goal-detail co-group-'+family+'"><div class="co-goal-detail-top"><span class="co-classification">'+esc(info.short)+'</span><span class="co-course-type">'+esc(level)+'</span></div>'+
  '<strong>'+esc(course)+'</strong>'+
  '<p><b>Le lien avec ton bac</b> '+esc(why)+' '+help(family==='direct'?'classement':family==='bridge'?'passerelle':'transition')+'</p>'+
  '<p><b>Ce que tu apprendras</b> '+esc(detail.about)+'</p>'+
  '<p><b>À vérifier sur la fiche</b> '+esc(detail.focus)+'</p>'+
  (matched.length?'<p class="co-match"><b>Un lien avec tes centres d’intérêt :</b> '+matched.map(esc).join(' · ')+'</p>':'')+
  '<div class="co-goal-detail-actions"><button type="button" class="co-btn co-small co-soft" data-co-explore-course="'+esc(course)+'">Chercher des établissements →</button>'+
  '<button type="button" class="co-btn co-small" data-co-keep-course="'+esc(course)+'">+ Ajouter à mes choix</button></div></article>';
}
function titleBar(){
 return '<header class="co-head co-orientation-hero"><div class="co-headline">'+
 '<button class="co-btn co-ghost" type="button" data-action="student-orientation-back">Retour à mon espace</button>'+
 '<h1>Orientation <em>après le bac</em></h1>'+
 '<p>Explore un métier ou une formation, puis garde les pistes qui t’intéressent.</p>'+
 '<small>Ton projet et tes brouillons sont enregistrés sur cet appareil.</small></div></header>';
}
function layout(){
 root.innerHTML=
 titleBar()+
 '<nav class="co-step-navigation" aria-label="Mon orientation">'+
 [['projet','Mon projet'],['explorer','Établissements'],['pistes','Mes choix'],['lettre','Ma lettre'],['aides','Mes aides']].map(([id,label])=>
 '<button type="button" data-co-tab="'+id+'">'+label+(id==='pistes'?'<b id="co-count-wishes">0</b>':'')+'</button>').join('')+'</nav>'+
 '<p class="co-sticky-message" role="status" id="co-message" aria-live="polite"></p>'+
 '<div class="co-stage-panels">'+
 '<section data-co-panel="projet" class="co-page" aria-label="Mon projet" tabindex="-1">'+
 '<div class="co-v4-entry"><div class="co-entry-top"><div class="co-v4-entry-heading"><h2>Par quoi veux-tu commencer ?</h2></div>'+
 '<label class="co-bac-field" for="co-bac">Mon bac pro<select id="co-bac">'+Object.entries(FILIERES).map(([id,info])=>'<option value="'+id+'">'+esc(info.label)+'</option>').join('')+'</select></label></div>'+
 '<div class="co-v4-entry-choice" role="group" aria-label="Choisir mon point de départ">'+
 '<button type="button" data-co-entry="metier" aria-pressed="false" aria-controls="co-v4-metier-panel"><span class="co-v4-entry-icon" aria-hidden="true">✦</span><span><strong>Je pars d’un métier</strong><small>Quelles études pour exercer ce métier ?</small></span></button>'+
 '<button type="button" data-co-entry="formation" aria-pressed="false" aria-controls="co-v4-formation-panel"><span class="co-v4-entry-icon" aria-hidden="true">▤</span><span><strong>Je pars d’une formation</strong><small>Quelles études après mon bac pro ?</small></span></button>'+
 '</div></div>'+
 '<div id="co-v4-metier-panel" class="co-v4-path" hidden><div id="co-v4-metier-root"></div></div>'+
 '<div id="co-v4-formation-panel" class="co-v4-path" hidden>'+
 '<section class="co-pane co-formation-start"><div class="co-section-top"><h2>Quelle formation t’intéresse ?</h2><p>Tu peux choisir une formation précise ou découvrir des idées plus bas.</p></div>'+
 '<div class="co-profile-form"><label for="co-goal">Formation (facultatif) '+help('classement')+'</label>'+
 '<select id="co-goal">'+courseOptions()+'</select><div id="co-goal-info" aria-live="polite"></div></div>'+
 '<details class="co-optional"><summary>Affiner selon mes centres d’intérêt</summary><p>Choisis jusqu’à cinq domaines.</p><div class="co-interest-tags" id="co-interests"></div></details>'+
 '<div class="co-ai-actions"><button type="button" class="co-btn co-primary" id="co-albert-button">Demander conseil à Albert</button>'+
 '<small>Albert utilise la filière, la formation, les centres d’intérêt choisis et la zone d’études (ville, région ou France).</small></div>'+
 '<div class="co-ai-content" id="co-albert" aria-live="polite"></div></section>'+
 '<section class="co-pane co-suggestions-pane"><div class="co-section-top"><h2>Des idées après ton bac pro</h2><p>Les catégories décrivent le lien entre les programmes et ton bac. '+help('classement')+'</p></div><div id="co-alternatives"></div></section>'+
 '</div></section>'+
 '<section data-co-panel="explorer" class="co-page" aria-label="Établissements" tabindex="-1" hidden><div class="co-pane co-explorer-pane"><div class="co-section-top"><h2>Trouver un établissement</h2>'+
 '<p>Consulte les chiffres de 2025, puis ouvre la fiche Parcoursup pour voir les attendus et les critères de candidature.</p></div>'+
 '<form id="co-explore-form"><div class="co-search-fields">'+
 '<div><label for="co-search-course">Formation recherchée</label><select id="co-search-course" required></select></div>'+
 '<div><label for="co-mobility">Zone de recherche</label><select id="co-mobility"><option value="ville">Dans cette ville</option><option value="region">Dans sa région</option><option value="france">Toute la France</option></select></div>'+
 '<div id="co-city-field"><label for="co-city">Ville</label><input id="co-city" maxlength="100" placeholder="Ex. Paris" autocomplete="address-level2" required></div></div>'+
 '<div class="co-search-actions"><button type="submit" class="co-btn co-primary" id="co-search">Rechercher</button>'+anchor(SOURCES.carte,'Ouvrir la carte Parcoursup')+'</div></form>'+
 '<div id="co-explore-description"></div>'+
 '<div id="co-results" aria-live="polite"></div>'+
 '<div class="co-source-note">Session 2025, hors apprentissage. '+anchor(SOURCES.data,'Données ouvertes du ministère')+' · '+anchor(SOURCES.fiches,'Comprendre les chiffres')+'</div></div></section>'+
 '<section data-co-panel="pistes" class="co-page" aria-label="Mes choix" tabindex="-1" hidden><div class="co-pane co-wishes-pane"><div class="co-section-top"><span class="co-step">MES POSSIBILITÉS</span><h2>Construis plusieurs pistes.</h2>'+
 '<p>Un seul choix peut être un bon début. Tu peux aussi garder des formations proches pour comparer leurs établissements et leurs critères.</p></div>'+
 '<div class="co-plan-stats"><span>Formations gardées <strong id="co-pistes-count">0</strong></span><span>Étapes terminées <strong id="co-count-tasks">0</strong></span><span>Stockage <strong>Mon appareil</strong></span></div>'+
 '<section id="co-wish-plan" class="co-wish-plan" aria-labelledby="co-wish-plan-title"></section>'+
 '<div id="co-wishes"></div><div class="co-planning"><h3>Ma petite feuille de route</h3><div id="co-tasks"></div></div>'+
 '<details class="co-optional co-project-storage"><summary>Notes et sauvegarde du projet</summary><label for="co-notes">Mes notes personnelles</label><textarea id="co-notes" maxlength="1200" rows="3"></textarea>'+
 '<div class="co-export-tools"><button type="button" class="co-btn co-soft" data-co-export>↓ Exporter mon projet</button><label class="co-btn co-soft" for="co-import-file">↑ Importer un projet</label><input type="file" accept=".json,application/json" id="co-import-file" hidden>'+
 '<button type="button" class="co-btn co-danger" data-co-clear>Effacer sur cet appareil</button></div></details></div></section>'+
 '<section data-co-panel="lettre" class="co-page" aria-label="Ma lettre" tabindex="-1" hidden><div id="co-letter-mount" class="co-letter-container"></div></section>'+
 '<section data-co-panel="aides" class="co-page" aria-label="Mes aides" tabindex="-1" hidden><div class="co-pane co-aid-pane"><div class="co-section-top"><span class="co-step">VIE ÉTUDIANTE</span><h2>Les aides à connaître avant de choisir.</h2>'+
 '<p>Tu peux étudier plus loin que prévu si tu repères les aides possibles. Les montants et les droits dépendent de ta situation : utilise les outils officiels.</p></div>'+
 '<div id="co-aides-list"></div></div></section></div>'+
 '<dialog id="co-dialog" class="co-definition" aria-labelledby="co-dialog-title"><form method="dialog"><button type="submit" class="co-dialog-close" aria-label="Fermer l’explication">×</button></form>'+
 '<span class="co-def-kicker">LE PETIT DICO CORTEX</span><h2 id="co-dialog-title"></h2><p id="co-dialog-text"></p><div class="co-def-footer"><button type="button" class="co-btn co-primary" data-co-close>J’ai compris ✓</button></div></dialog>';
 root.addEventListener('click',click);
 root.addEventListener('input',input);
 root.addEventListener('change',change);
 $('co-explore-form').addEventListener('submit',search);
}
function renderSectors(){
 const sel=$('co-goal');if(sel)sel.innerHTML=courseOptions();renderGoalInfo();
}
function renderInterests(){
 const wrap=$('co-interests');if(!wrap)return;
 const defaultInterests=FILIERES[profile.bac_origin].themes;
 const keys=Object.keys(INTERESTS);
 wrap.innerHTML=keys.map(k=>'<button type="button" class="co-interest'+(profile.interests.includes(k)?' active':'')+'" data-co-interest="'+esc(k)+'" aria-pressed="'+profile.interests.includes(k)+'">'+
 (defaultInterests.includes(k)?'<span class="co-interest-star">✦</span> ':'')+esc(INTERESTS[k])+(profile.interests.includes(k)?' ✓':'')+'</button>').join('');
}
function renderSuggestions(){
 const wrap=$('co-alternatives');if(!wrap)return;
 const chosen=new Set(profile.wishes.filter(w=>!w.code).map(w=>norm(w.title)));
 const caps={direct:2,bridge:1,prepare:1};
 const groups=FITS[profile.bac_origin]||FITS.accueil;
 const sorter=(a,b)=>{
  const n=i=>COURSE_DETAILS[i].tags.filter(t=>profile.interests.includes(t)).length;
  return n(b)-n(a);
 };
 const show=(family)=>{
  const indices=groups[family].filter(i=>COURSES[i]!==profile.goal).sort(sorter);
  const visible=showAllSuggestions?indices:indices.slice(0,caps[family]);
  const info=FAMILIES[family];
  return '<section class="co-family-section co-family-'+family+'"><div class="co-family-heading"><div><span class="co-family-indicator">'+esc(info.short)+'</span>'+
   '<h3>'+esc(info.title)+' '+help(family==='direct'?'classement':family==='bridge'?'passerelle':'transition')+'</h3></div></div>'+
   '<div class="co-suggestion-grid">'+visible.map(index=>{
    const course=COURSES[index];
    const {detail,why,matched}=aboutCourse(course);
    const saved=chosen.has(norm(course));
    return '<article class="co-suggestion co-suggestion-'+family+'"><div><span class="co-course-type">'+esc(course.startsWith('BTS')?'BTS · BAC + 2':course.startsWith('BUT')?'BUT · BAC + 3':course.startsWith('Licence')?'LICENCE · BAC + 3':'CERTIFICAT DE SPÉCIALISATION')+'</span>'+
     '<h3>'+esc(course)+'</h3>'+
     '<p class="co-suggestion-about">'+esc(detail.about)+'</p>'+
     '<p class="co-suggestion-why"><b>Le lien avec ton bac :</b> '+esc(why)+'</p>'+
     (matched.length?'<p class="co-suggestion-match">✦ Correspond à : '+matched.map(esc).join(', ')+'</p>':'')+
     '<details class="co-suggestion-details"><summary>Les points à vérifier</summary><p>'+esc(detail.focus)+'</p></details></div>'+
     '<div class="co-sug-actions">'+(saved?'<span class="co-kept">✓ Déjà dans mes choix</span>':'<button type="button" class="co-btn co-small" data-co-keep-course="'+esc(course)+'">+ Garder</button>')+
     '<button type="button" class="co-btn co-small co-soft" data-co-explore-course="'+esc(course)+'">Établissements ↗</button></div></article>';
   }).join('')+'</div></section>';
 };
 wrap.innerHTML=Object.keys(FAMILIES).map(show).join('')+
  '<div class="co-suggestion-footer"><button type="button" class="co-btn co-soft" data-co-show-all aria-expanded="'+showAllSuggestions+'">'+
  (showAllSuggestions?'Afficher la sélection courte':'Voir toutes les formations du guide')+'</button>'+help('btspriorite')+'</div>';
}
function renderAlbert(){
 const box=$('co-albert');if(!box)return;
 if(!aiResult){box.innerHTML='';return;}
 const suggestions=aiResult.suggestions.filter(x=>COURSES.includes(x?.course)).slice(0,3);
 const next=Array.isArray(aiResult.plan)?aiResult.plan.slice(0,3):[];
 const questions=Array.isArray(aiResult.questions)?aiResult.questions.slice(0,3):[];
 const saved=course=>profile.wishes.some(w=>!w.code&&w.title===course);
 box.innerHTML='<section class="co-albert-answer"><h3>Les pistes d’Albert</h3><p>'+esc(aiResult.intro||'Voici quelques formations à explorer.')+'</p>'+
 '<div class="co-ai-suggestions">'+suggestions.map(x=>
 '<article><div><strong>'+esc(x.course)+'</strong><p>'+esc(x.why)+'</p>'+(x.preparation?'<small><b>À préparer</b> '+esc(x.preparation)+'</small>':'')+'</div>'+
 '<div class="co-sug-actions"><button type="button" class="co-btn co-soft co-small" data-co-explore-course="'+esc(x.course)+'">Établissements</button>'+
 (saved(x.course)?'<span class="co-kept">Dans mes choix</span>':'<button type="button" class="co-btn co-small" data-co-keep-course="'+esc(x.course)+'">Garder</button>')+'</div></article>').join('')+'</div>'+
 (next.length?'<h4>Prochaines étapes</h4><ol>'+next.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>':'')+
 (questions.length?'<details class="co-optional"><summary>Questions à poser au lycée</summary><ul>'+questions.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>':'')+
 '</section>';
}
function adviceContext(){
 return {filiere:profile.bac_origin,goal:profile.goal,interests:profile.interests.slice(0,5),mobility:profile.mobility};
}
async function askAlbert(){
 if(aiBusy)return;
 const btn=$('co-albert-button'),controller=new AbortController(),request=adviceContext();
 const timeout=setTimeout(()=>controller.abort(),45000);
 aiRequest=controller;aiBusy=true;btn.disabled=true;btn.textContent='Albert prépare tes pistes…';
 try{
  const response=await fetch(ALBERT,{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify(request),signal:controller.signal});
  const body=await response.json().catch(()=>({}));
  if(aiRequest!==controller)return;
  if(JSON.stringify(request)!==JSON.stringify(adviceContext()))return;
  if(!response.ok||!body.ok||!Array.isArray(body.suggestions))throw Error('Albert est temporairement indisponible.');
  aiResult=body;renderAlbert();status('Les pistes d’Albert sont prêtes.');
 }catch{
  if(aiRequest===controller){
   $('co-albert').innerHTML='<p class="co-albert-error" role="status">Albert est temporairement indisponible. Tu peux explorer les idées du guide ci-dessous.</p>';
  }
 }finally{
  clearTimeout(timeout);
  if(aiRequest===controller){aiRequest=null;aiBusy=false;btn.disabled=false;btn.textContent='Demander conseil à Albert';}
 }
}
function wishForRecord(course,rec,career){
 return readWish({
  title:rec.lib_for_voe_ins||course,school:rec.g_ea_lib_vx,
  city:clean(rec.ville_etab).replace(/\s+/g,' '),region:rec.region_etab_aff,career,
  url:rec.lien_form_psup,code:rec.cod_aff_form,pathway:course,
  year:2025,taux:rec.taux_acces_ens,part:rec.part_acces_pro,pctbp:rec.pct_bp
 });
}
function keepCourse(course,rec,career=''){
 if(!COURSES.includes(course))return false;
 return keepWish(rec?wishForRecord(course,rec,career):readWish({title:course,pathway:course,career}));
}
function keepWish(item){
 if(profile.wishes.some(w=>item.code?w.code===item.code:!w.code&&norm(w.title)===norm(item.title))){
  status('Cette piste est déjà dans tes choix.');return false;
 }
 if(profile.wishes.length>=30){status('Tu peux conserver jusqu’à 30 pistes : retire-en une avant de continuer.',true);return false;}
 profile.wishes.push(item);persist(true);renderSuggestions();renderAlbert();renderWishes();
 status('Piste ajoutée : '+item.title+'. Tu peux la retrouver dans « Mes choix ».');
 return true;
}
function completeWish(w){
 return Boolean(w?.code&&w.school&&COURSES.includes(w.pathway));
}
function mainWish(){
 return profile.wishes.find(w=>w.code===wishMain&&completeWish(w))||profile.wishes.find(completeWish);
}
function wishContext(w){
 return JSON.stringify([w.code,w.pathway,w.career,profile.bac_origin,profile.interests,profile.mobility]);
}
function currentWishPlan(){
 const main=mainWish(),plan=profile.wish_plan;
 return main&&plan?.context===wishContext(main)?plan:null;
}
function cancelWishRequest(){
 wishRequest?.abort();wishRequest=null;wishMessage='';
}
function renderWishPlan(){
 const box=$('co-wish-plan');
 if(!box)return;
 const complete=profile.wishes.filter(completeWish),main=mainWish(),plan=currentWishPlan();
 const title='<h3 id="co-wish-plan-title">Mes vœux Parcoursup</h3>';
 if(!main){
  box.innerHTML=title+'<p>Garde une formation avec un établissement. Albert pourra te proposer quatre autres vœux à partir de ce choix.</p>'+
   '<button type="button" class="co-btn co-soft" data-co-tab="explorer">Trouver un établissement</button>';
  return;
 }
 const busy=Boolean(wishRequest);
 const items=plan?.suggestions||[];
 box.innerHTML=title+
  (complete.length>1?'<label class="co-wish-main" for="co-wish-main">Vœu de départ<select id="co-wish-main"'+(busy?' disabled':'')+'>'+
  complete.map(w=>'<option value="'+esc(w.code)+'"'+(w.code===main.code?' selected':'')+'>'+esc(w.pathway+' · '+w.school)+'</option>').join('')+'</select></label>':
  '<p class="co-wish-main">Vœu de départ <strong>'+esc(main.pathway)+' · '+esc(main.school)+'</strong></p>')+
  (main.career?'<p class="co-wish-job">Métier visé <strong>'+esc(main.career)+'</strong></p>':'')+
  '<div class="co-wish-plan-actions"><button type="button" class="co-btn co-primary" data-co-build-wishes'+(busy?' disabled':'')+'>'+
  (busy?'Albert prépare tes vœux…':plan?.provider==='guide'?'Réessayer avec Albert':plan?'Actualiser avec Albert':'Proposer 4 vœux avec Albert')+'</button>'+
  '<small>Quatre formations différentes. Plusieurs lycées pour un même BTS peuvent compter comme des sous-vœux. '+help('sousvoeu')+'</small></div>'+
  '<p class="co-wish-message" role="status">'+esc(wishMessage)+'</p>'+
  (items.length?'<div class="co-wish-plan-results"><h4 tabindex="-1">'+(plan.provider==='albert'?'Les 4 propositions d’Albert':'4 pistes du guide CORTEX')+'</h4>'+
  '<div class="co-wish-proposals">'+items.map((item,index)=>{
   const {course,why,choice}=item;
   const kept=choice&&profile.wishes.some(w=>w.code===choice.code);
   return '<article class="co-wish-proposal"><h5>'+esc(course)+'</h5>'+
    (choice?'<p class="co-wish-school">'+esc(choice.school+(choice.city?' · '+choice.city:''))+'</p>':
     '<p class="co-wish-school">Établissement à vérifier dans ta zone</p>')+
    '<p>'+esc(why)+'</p><div class="co-wish-proposal-actions">'+
    (choice&&choice.url!==SOURCES.carte?anchor(choice.url,'Fiche Parcoursup'):anchor(SOURCES.carte,'Carte Parcoursup'))+
    (kept?'<span class="co-kept">Dans mes choix</span>':
     choice?'<button type="button" class="co-btn co-small co-soft" data-co-keep-proposal="'+index+'">Garder ce vœu</button>':
      '<button type="button" class="co-btn co-small co-soft" data-co-explore-course="'+esc(course)+'" data-co-career="'+esc(main.career)+'">Chercher un établissement</button>')+
    '</div></article>';
  }).join('')+'</div><p class="co-wish-plan-source">Établissements repérés dans les données 2025. Vérifie les fiches pour la session en cours. Les vœux se saisissent sur Parcoursup.</p></div>':'')+
  '<details class="co-wish-privacy"><summary>Qu’est-ce qu’Albert reçoit ?</summary><p>Il utilise ton bac, ta formation de départ, le métier associé s’il y en a un, les centres d’intérêt et la zone générale de recherche. La recherche des établissements utilise les données publiques de Parcoursup.</p></details>';
}
function wishCandidates(main){
 const baseTags=COURSE_DETAILS[COURSES.indexOf(main.pathway)].tags;
 const saved=new Set(profile.wishes.filter(completeWish).map(w=>w.pathway));
 const fitWeight={direct:4,bridge:2,prepare:0};
 return COURSES.map((course,index)=>{
  const tags=COURSE_DETAILS[index].tags;
  const shared=tags.filter(tag=>baseTags.includes(tag)).length;
  const matched=tags.filter(tag=>profile.interests.includes(tag)).length;
  return {course,score:shared*5+matched*3+fitWeight[familyFor(profile.bac_origin,course)]};
 }).filter(x=>!saved.has(x.course)).sort((a,b)=>b.score-a.score).slice(0,9).map(x=>x.course);
}
async function albertWishAdvice(main,candidates,signal){
 const response=await fetch(ALBERT,{method:'POST',headers:{'content-type':'application/json'},signal,
  body:JSON.stringify({action:'wish_alternatives',filiere:profile.bac_origin,goal:main.pathway,
   career:main.career||'',interests:profile.interests.slice(0,5),mobility:profile.mobility,candidates})});
 const body=await response.json();
 const proposals=body.suggestions;
 if(!response.ok||!body.ok||body.provider!=='Albert'||!Array.isArray(proposals)||proposals.length!==4||
    new Set(proposals.map(x=>x?.course)).size!==4||
    proposals.some(x=>!candidates.includes(x?.course)||typeof x.why!=='string'||!x.why.trim())){
  throw Error('Suggestions indisponibles');
 }
 return proposals.map(x=>({course:x.course,why:x.why.trim().slice(0,190)}));
}
async function wishZones(main,mobility,signal){
 if(mobility==='france')return [''];
 const city=main.city.replace(/ \d+(?:er|e) arrondissement$/i,'');
 const lookup=scope=>resolveZone(city,scope,signal).catch(()=>null);
 const region=main.region?' AND region_etab_aff='+quoted(main.region):lookup('region');
 if(mobility==='region')return [await region];
 const zones=await Promise.all([lookup('ville'),region]);
 return zones.filter(zone=>zone!==null);
}
async function coursesInZone(courses,zone,signal){
 if(zone===null)return [];
 const {results}=await fetchRecords({
  select:'fili,fil_lib_voe_acc',group_by:'fili,fil_lib_voe_acc',
  where:'session=2025 AND ('+courses.map(courseQuery).map(q=>'('+q.conditions+')').join(' OR ')+')'+zone,limit:100
 },signal);
 return courses.filter(course=>{
  const {types,label,partial}=courseQuery(course);
  return results.some(row=>types.includes(row.fili)&&(partial?clean(row.fil_lib_voe_acc).startsWith(label):row.fil_lib_voe_acc===label));
 });
}
async function wishAvailability(main,candidates,mobility,signal){
 const zones=await wishZones(main,mobility,signal);
 const availability=await Promise.all(zones.map(async zone=>({
  zone,courses:await coursesInZone(candidates,zone,signal).catch(()=>[])
 })));
 const located=candidates.filter(course=>availability.some(entry=>entry.courses.includes(course)));
 return {candidates:located.length>=4?located:candidates,zones,availability};
}
async function wishEstablishment(course,career,locations,signal){
 const known=locations.availability.filter(entry=>entry.courses.includes(course)).map(entry=>entry.zone);
 for(const zone of new Set([...known,...locations.zones])){
  if(zone===null||signal.aborted)continue;
  const data=await fetchCourseRecords(course,zone,3,0,signal).catch(()=>null);
  const choice=data?.results.map(r=>wishForRecord(course,r,career)).find(completeWish);
  if(choice)return choice;
 }
 return null;
}
async function buildWishPlan(){
 const main=mainWish();
 if(!main||wishRequest)return;
 const candidates=wishCandidates(main);
 if(candidates.length<4){
  wishMessage='Tu as déjà gardé la plupart des formations du guide. Consulte la carte Parcoursup pour élargir tes choix.';
  renderWishPlan();$('co-wish-plan').querySelector('[data-co-build-wishes]')?.focus();return;
 }
 wishMain=main.code;
 const controller=new AbortController(),context=wishContext(main);
 const mobility=profile.mobility;
 wishRequest=controller;wishMessage='';renderWishPlan();
 const zoneSignal=AbortSignal.any([controller.signal,AbortSignal.timeout(16000)]);
 const locations=await wishAvailability(main,candidates,mobility,zoneSignal)
  .catch(()=>({candidates,zones:[],availability:[]}));
 if(wishRequest!==controller)return;
 const albertSignal=AbortSignal.any([controller.signal,AbortSignal.timeout(35000)]);
 let provider='albert',proposals;
 try{
  proposals=await albertWishAdvice(main,locations.candidates,albertSignal);
 }catch{
  provider='guide';
  proposals=locations.candidates.slice(0,4).map(course=>({course,why:aboutCourse(course).detail.about}));
 }
 if(wishRequest!==controller)return;
 const schoolSignal=AbortSignal.any([controller.signal,AbortSignal.timeout(22000)]);
 const suggestions=await Promise.all(proposals.map(async p=>({...p,
  choice:await wishEstablishment(p.course,main.career,locations,schoolSignal).catch(()=>null)
 })));
 if(wishRequest!==controller)return;
 wishRequest=null;
 if(!mainWish()||wishContext(mainWish())!==context){
  wishMessage='Ton projet a changé. Relance la recherche pour tes nouveaux choix.';
  renderWishPlan();return;
 }
 profile.wish_plan={main:main.code,context,provider,suggestions};
 wishMessage=provider==='guide'?'Albert est indisponible. Voici quatre pistes du guide liées à ton projet.':'';
 persist(true);renderWishPlan();
 const heading=$('co-wish-plan').querySelector('.co-wish-plan-results h4');
 if(tab==='pistes')heading?.focus();
}
function renderWishes(){
 const wrap=$('co-wishes');if(!wrap)return;
 renderWishPlan();
 $('co-pistes-count').textContent=String(profile.wishes.length);
 const saved=profile.wishes;
 const callout=saved.length===0?'Tu peux garder une formation ou un établissement pour y revenir.':'Ouvre les fiches pour vérifier les enseignements, les attendus et les trajets.';
 wrap.innerHTML=(profile.career?'<div class="co-v4-wish-career"><div><span>MON MÉTIER OBJECTIF</span><strong>'+esc(profile.career)+'</strong><small>'+
  (profile.career_result?.career&&norm(profile.career_result.career)===norm(profile.career)?'Parcours enregistré dans ce navigateur.':'Métier à analyser avec Albert.')+
  '</small></div><button type="button" class="co-btn co-soft" data-co-career-return>Revoir mon parcours métier →</button></div>':'')+
  '<div class="co-wish-guidance">'+esc(callout)+' '+help('diversite')+
  '<p class="co-wish-caution">Ce carnet sert à préparer tes choix. Il ne crée aucun vœu sur Parcoursup et ne transmet aucune candidature. '+help('voeu')+'</p></div>'+
 (saved.length?'<div class="co-wish-list">'+saved.map((w,i)=>
 '<article class="co-wish-card"><div class="co-wish-index">'+String(i+1).padStart(2,'0')+'</div><div><strong>'+esc(w.title)+'</strong>'+
 '<small>'+esc(w.school||'Établissement à préciser')+(w.city?' · '+esc(w.city):'')+'</small>'+
  ((COURSES.includes(w.pathway)||COURSES.includes(w.title))?'<span class="co-wish-classification">'+esc(FAMILIES[familyFor(profile.bac_origin,w.pathway||w.title)].short)+'</span>':'')+
 (w.year===2025&&pct(w.taux)!==null?'<span class="co-wish-stat">Taux d’accès 2025 '+help('admission')+' '+formatPct(w.taux)+'</span>':'')+
 (saved.length>=2?'<label class="co-compare-check"><input type="checkbox" data-co-compare="'+i+'"'+(compared.has(w)?' checked':'')+'> Comparer cette piste</label>':'')+'</div>'+
 '<div class="co-wish-actions">'+(w.code?anchor(sourceUrl(w.url),'Fiche Parcoursup'):
  (w.pathway?'<button type="button" data-co-explore-course="'+esc(w.pathway)+'" data-co-career="'+esc(w.career)+'">Trouver un établissement</button>':anchor(SOURCES.carte,'Carte Parcoursup')))+
  ((w.pathway&&COURSES.includes(w.pathway))?'<button type="button" data-co-letter-wish="'+i+'">✍ Préparer ma lettre</button>':'')+
  '<button type="button" data-co-remove="'+i+'">Retirer</button></div></article>').join('')+'</div>':
 '<div class="co-empty-state"><h3>Aucune piste sauvegardée</h3><button type="button" class="co-btn co-primary" data-co-tab="projet">Découvrir des formations</button></div>')+
 '<div id="co-comparison" aria-live="polite"></div>';
 renderComparison();
 const tasks=[
 ['fiches','Lire les attendus de deux formations', 'attendus'],
 ['comparaison','Comparer au moins trois pistes','diversite'],
 ['parler','En parler à mon professeur principal ou au PsyEN','voeu'],
 ['bourse','Vérifier les bourses et le logement','bourse'],
 ['alternance','Regarder si l’apprentissage m’intéresse','apprentissage']
 ];
 $('co-tasks').innerHTML=tasks.map(([id,text,def])=>'<label class="co-task"><input type="checkbox" data-co-task="'+id+'"'+(profile.tasks.includes(id)?' checked':'')+'><span>'+esc(text)+'</span></label>').join('');
}
function renderComparison(){
 const box=$('co-comparison');
 if(!box)return;
 const choices=profile.wishes.filter(w=>compared.has(w));
 if(choices.length<2){
  box.innerHTML=choices.length?'<p class="co-compare-hint">Coche une deuxième piste pour les comparer.</p>':'';
  return;
 }
 const cols=[
  ['Établissement',w=>w.code?[w.school,w.city].filter(Boolean).join(' · '):'À choisir'],
  ['Lien avec ton bac',w=>w.pathway?FAMILIES[familyFor(profile.bac_origin,w.pathway)].short:'À vérifier'],
  ['Ce que tu apprendras',w=>w.pathway?aboutCourse(w.pathway).detail.about:'Voir la fiche'],
  ['Taux d’accès 2025',w=>w.year===2025?formatPct(w.taux):'—']
 ];
 box.innerHTML='<section class="co-compare"><h3>Comparer mes pistes</h3><div class="co-compare-scroll" tabindex="0" aria-label="Tableau comparatif">'+
  '<table><thead><tr><th scope="col">Repère</th>'+choices.map(w=>'<th scope="col">'+esc(w.pathway||w.title)+'</th>').join('')+'</tr></thead>'+
  '<tbody>'+cols.map(([label,format])=>'<tr><th scope="row">'+label+(label==='Taux d’accès 2025'?' '+help('admission'):'')+'</th>'+
   choices.map(w=>'<td>'+esc(format(w))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></section>';
}
function renderLetter(){
 const host=$('co-letter-mount');if(!host)return;
 const workshop=window.CORTEX_ORIENTATION_LETTER;
 if(!workshop?.mount){
  host.innerHTML='<div class="co-pane"><h2>Atelier de motivation indisponible</h2><p>Actualise cette page pour charger le module de rédaction Parcoursup.</p></div>';return;
 }
 if(!letterStudio)letterStudio=workshop.mount(host,{
  profile:()=>profile,
  courses:()=>COURSES.slice(),
  defaultCourses:()=>FITS[profile.bac_origin].direct.map(i=>COURSES[i]),
  bacLabel:id=>({
   accueil:"Métiers de l’accueil",
   commerce:"Métiers du commerce et de la vente option A (animation et gestion de l’espace commercial)",
   agora:"Assistance à la gestion des organisations et de leurs activités (AGOrA)"
  }[id]||"Métiers de l’accueil"),
  courseOptions:(selected,placeholder)=>courseOptions(selected,placeholder),
  courseGuidance:course=>aboutCourse(course),
  save:()=>persist(true)
 });
 else letterStudio.refresh();
}
function renderAid(){
 const wrap=$('co-aides-list');if(!wrap)return;
 const cards=[
 ['01','Bourse étudiante', 'Une aide financière peut être possible selon la situation du foyer. Tu n’as pas besoin de saisir tes revenus ici.', 'bourse',SOURCES.simulateur,'Simulateur de bourse officiel'],
 ['02','Dossier social étudiant', 'La demande de bourse et une partie des démarches de logement passent par le DSE. Regarde les dates de l’année.', 'dse',SOURCES.dse,'Comprendre le DSE'],
 ['03','Logement étudiant', 'Les résidences CROUS sont une piste. Compare aussi les temps de trajet entre ton domicile et tes formations.', 'crous',SOURCES.logement,'Chercher un logement CROUS'],
 ['04','Mobilité et déménagement', 'Selon ta situation, tu peux avoir accès à une aide à la mobilité Parcoursup ou à des solutions de garantie locative.', 'mobilite',SOURCES.mobilite,'Vérifier l’aide à la mobilité'],
 ['05','Insertion et réussite', 'Avant de choisir, regarde les informations sur les études et l’emploi après la formation, quand elles sont publiées.', 'insertion',SOURCES.fiches,'Lire les fiches Parcoursup'],
 ['06','Apprentissage', 'Il faut un contrat avec une entreprise. Les chiffres d’accès affichés dans CORTEX ne couvrent pas les formations en apprentissage.', 'apprentissage',SOURCES.parcoursup,'Comprendre l’apprentissage']
 ];
 wrap.innerHTML='<div class="co-aid-grid">'+cards.map(([n,t,desc,def,url,ct])=>
 '<article><span class="co-aid-index">'+n+'</span><h3>'+esc(t)+' '+help(def)+'</h3><p>'+esc(desc)+'</p>'+anchor(url,ct)+'</article>').join('')+'</div>'+
 '<div class="co-aid-note">✧ Ces informations ne remplacent pas les organismes officiels. Aucun montant de bourse ni droit individuel n’est calculé ici.</div>'+
 '<div class="co-aid-bottom"><strong>Besoin d’aide pour choisir ?</strong><p>Ton professeur principal, le ou la psychologue de l’Éducation nationale et un CIO peuvent t’aider à construire plusieurs possibilités.</p></div>';
}
const SEARCH_LABELS=[
 'Tourisme',"Support à l'action managériale",'Management Commercial Opérationnel',
 'Négociation et digitalisation de la Relation Client','Communication','Gestion de la PME',
 'Commerce International','Banque','Assurance','Comptabilité et gestion',
 'Services informatiques aux organisations','Techniques de commercialisation',
 'Gestion des entreprises et des administrations','Information communication',
 'Administration économique et sociale','Accueil dans les transports','Accueil-réception',
 'Professions immobilières'
];
const quoted=value=>JSON.stringify(value);
const asCity=value=>norm(value).replace(/[’']/g,"'").replace(/[-\s]+/g,' ');
const RECORD_FIELDS='lib_for_voe_ins,fil_lib_voe_acc,g_ea_lib_vx,ville_etab,region_etab_aff,lien_form_psup,cod_aff_form,taux_acces_ens,part_acces_pro,pct_bp';
function courseQuery(course){
 const index=COURSES.indexOf(course),label=SEARCH_LABELS[index],partial=index===13;
 const types=course.startsWith('BTS')?['BTS']:course.startsWith('BUT')?['BUT']:
  course.startsWith('Licence')?['Licence','Licence_Las']:['Autre formation'];
 const type='('+types.map(value=>'fili='+quoted(value)).join(' OR ')+')';
 const filter=partial?'search(fil_lib_voe_acc, '+quoted(label)+')':'fil_lib_voe_acc='+quoted(label);
 return {types,label,partial,conditions:type+' AND '+filter};
}
async function fetchCourseRecords(course,zone,limit,offset,signal){
 if(zone===null)return {results:[],total_count:0};
 return fetchRecords({
  select:RECORD_FIELDS,where:'session=2025 AND '+courseQuery(course).conditions+zone,
  order_by:'ville_etab, g_ea_lib_vx, cod_aff_form',limit,offset
 },signal);
}

function resetSearch(){
 searchRequest?.abort();
 searchRequest=null;records=[];searchState='idle';searchTotal=0;searchPage=1;
}
function formatRecord(r){
 return {
  title:clean(r.lib_for_voe_ins||r.fil_lib_voe_acc||'Formation'),
  place:clean(r.g_ea_lib_vx||'Établissement non renseigné'),
  city:clean(r.ville_etab||'Ville non renseignée').replace(/\s+/g,' '),
  rate:pct(r.taux_acces_ens),pro:pct(r.part_acces_pro),admitted:pct(r.pct_bp)
 };
}
function renderSearch(){
 const selected=tabData??profile.goal;
 const sel=$('co-search-course');
 sel.innerHTML=courseOptions(selected,'Choisir une formation');
 $('co-city-field').hidden=profile.mobility==='france';
 $('co-city').required=profile.mobility!=='france';
 const btn=$('co-search');
 btn.disabled=searchState==='loading';
 btn.textContent=btn.disabled?'Recherche en cours…':'Rechercher';
 const info=$('co-explore-description');
 const guide=COURSES.includes(selected)?aboutCourse(selected):null;
 info.innerHTML=guide?'<p class="co-search-tip"><b>À vérifier sur la fiche</b> '+esc(guide.detail.focus)+'</p>':'';
 const box=$('co-results');
 if(searchState==='idle'){box.innerHTML='';return;}
 if(searchState==='loading'){box.innerHTML='<p class="co-loading">Consultation des données Parcoursup 2025…</p>';return;}
 if(searchState==='error'){
  box.innerHTML='<div class="co-search-empty"><h3>Les données sont momentanément indisponibles</h3><p>Tu peux relancer la recherche ou consulter la carte officielle.</p>'+anchor(SOURCES.carte,'Carte Parcoursup')+'</div>';return;
 }
 if(!records.length){
  box.innerHTML='<div class="co-search-empty"><h3>Aucun résultat dans les données 2025</h3><p>Consulte la carte Parcoursup pour voir l’offre de formation actuelle et les possibilités en apprentissage.</p>'+
   (profile.mobility!=='france'?'<button type="button" class="co-btn co-soft" data-co-wide-search>Rechercher dans toute la France</button>':'')+'</div>';return;
 }
 box.innerHTML='<p class="co-results-info">'+records.length+' sur '+searchTotal+' résultat'+(searchTotal===1?'':'s')+' · session 2025</p>'+
 '<div class="co-result-list">'+records.map((r,i)=>{
  const f=formatRecord(r),code=clean(r.cod_aff_form),found=code&&profile.wishes.some(w=>w.code===code);
  const metrics=[['Bac pro parmi les candidats qui pouvaient recevoir une offre','bacpro',f.pro],
   ['Bac pro parmi les admis','admispro',f.admitted]];
  return '<article class="co-data-card" tabindex="-1"><div class="co-data-head"><div><h3>'+esc(f.place)+'</h3><p>'+esc(f.city)+' · '+esc(f.title)+'</p></div>'+
   anchor(sourceUrl(r.lien_form_psup),'Fiche Parcoursup')+'</div>'+
   '<div class="co-result-footer"><span>Taux d’accès 2025 '+help('admission')+' <strong>'+formatPct(f.rate)+'</strong></span>'+
   (found?'<button type="button" class="co-btn co-small co-soft" data-co-wish-from="'+i+'">Préparer mes vœux</button>':'<button type="button" class="co-btn co-small co-primary" data-co-add-result="'+i+'">Garder</button>')+'</div>'+
   '<details class="co-optional"><summary>Les chiffres en détail</summary><div class="co-indicator-list">'+
   metrics.map(([label,id,metric])=>'<div><small>'+label+' '+help(id)+'</small><strong>'+formatPct(metric)+'</strong></div>').join('')+'</div></details></article>';
 }).join('')+'</div>'+
 (records.length<searchTotal?'<button type="button" class="co-btn co-soft co-search-more" data-co-more-results>Afficher plus d’établissements</button>':'');
}
async function fetchRecords(params,signal){
 const u=new URL(DATA);
 Object.entries(params).forEach(([key,value])=>u.searchParams.set(key,value));
 const response=await fetch(u,{headers:{accept:'application/json'},signal});
 if(!response.ok)throw Error('Données indisponibles');
 const data=await response.json();
 if(!Array.isArray(data.results))throw Error('Données indisponibles');
 return data;
}
async function resolveZone(city,scope,signal){
 if(scope==='france')return '';
 const {results}=await fetchRecords({
  select:'ville_etab,region_etab_aff',group_by:'ville_etab,region_etab_aff',
  where:'session=2025 AND search(ville_etab, '+quoted(city)+')',limit:100
 },signal);
 const wanted=asCity(city);
 const matches=results.filter(r=>{
  const name=asCity(r.ville_etab);
  return name===wanted||name.replace(/ \d+(?:er|e) arrondissement$/,'')===wanted;
 });
 if(!matches.length)return null;
 const field=scope==='region'?'region_etab_aff':'ville_etab';
 const names=[...new Set(matches.map(r=>r[field]).filter(Boolean))];
 return names.length?' AND ('+names.map(name=>field+'='+quoted(name)).join(' OR ')+')':null;
}
async function search(event,more=false){
 event?.preventDefault();
 if(searchRequest)return;
 const term=$('co-search-course').value,index=COURSES.indexOf(term);
 const city=clean($('co-city').value),scope=profile.mobility;
 if(index<0){$('co-search-course').focus();return;}
 if(scope!=='france'&&!city){$('co-city').reportValidity();return;}
 if(!more){resetSearch();tabData=term;searchState='loading';status('');renderSearch();}
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 const moreButton=root.querySelector('[data-co-more-results]');
 if(moreButton){moreButton.disabled=true;moreButton.textContent='Chargement…';}
 searchRequest=controller;
 try{
  const zone=await resolveZone(city,scope,controller.signal);
  const result=await fetchCourseRecords(term,zone,PAGE_SIZE,(searchPage-1)*PAGE_SIZE,controller.signal);
  if(searchRequest!==controller)return;
  const previous=records.length;
  records.push(...result.results);
  searchTotal=result.results.length<PAGE_SIZE?records.length:Math.max(records.length,result.total_count||0);
  searchPage++;
  searchState='ready';renderSearch();
  if(more)$('co-results').querySelectorAll('.co-data-card')[previous]?.focus();
 }catch{
  if(searchRequest!==controller)return;
  if(more){
   const button=root.querySelector('[data-co-more-results]');
   if(button){button.disabled=false;button.textContent='Réessayer de charger la suite';}
   status('Le chargement de la suite a échoué. Les résultats affichés restent disponibles.',true);
  }else{searchState='error';renderSearch();}
 }finally{
  clearTimeout(timeout);
  if(searchRequest===controller)searchRequest=null;
 }
}
function openDefinition(id){
 const d=DEFINITIONS[id];if(!d)return;
 $('co-dialog-title').textContent=d[0];
 $('co-dialog-text').textContent=d[1];
 const dlg=$('co-dialog');dlg.showModal?.();
}
function download(){
 if(!persist(true))return;
 const blob=new Blob([JSON.stringify({format:'CORTEX_ORIENTATION_DEMO_LOCAL',version:2,project:profile,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
 const u=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=u;a.download='cortex-mon-orientation.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),2000);
 status('Ton dossier a été exporté. Garde ce fichier dans un endroit privé.');
}
async function importFile(file){
 if(!file||file.size>900000){status('Le fichier d’import est trop volumineux.',true);return;}
 try{
  const text=await file.text(),obj=JSON.parse(text);
  if(obj?.format!=='CORTEX_ORIENTATION_DEMO_LOCAL'||!obj.project||typeof obj.project!=='object')throw Error('Ce fichier ne correspond pas à un projet CORTEX.');
  if(JSON.stringify(obj.project).length>450000)throw Error('Ce projet dépasse la taille maximale de sauvegarde.');
  if(!window.confirm('Remplacer ton projet d’orientation actuel par le fichier importé ?'))return;
  clearTimeout(autoTimer);autoTimer=0;
  localStorage.setItem(KEY,JSON.stringify(obj.project));
  letterStudio?.dispose();letterStudio=null;
  careerStudio?.dispose();careerStudio=null;
  resetSearch();cancelWishRequest();searchCareer='';aiRequest?.abort();profile=read();wishMain=profile.wish_plan?.main||'';compared.clear();aiResult=null;tabData=null;
  refresh();status('Projet importé et enregistré dans ce navigateur.');
 }catch(e){status('Import impossible : '+(e?.message||'fichier invalide'),true);}
}
function erase(){
 if(!window.confirm('Effacer ton projet Orientation de ce navigateur ? Les autres outils CORTEX ne seront pas modifiés.'))return;
 clearTimeout(autoTimer);autoTimer=0;
 try{localStorage.removeItem(KEY);}catch{}
 letterStudio?.dispose();letterStudio=null;
 careerStudio?.dispose();careerStudio=null;
 resetSearch();cancelWishRequest();wishMain='';searchCareer='';aiRequest?.abort();profile=dflt();compared.clear();aiResult=null;tabData=null;
 refresh();status('Le projet local a été effacé.');
}
function refresh(){
 if(!root?.isConnected)return;
 renderSectors();
 $('co-city').value=profile.city;
 $('co-mobility').value=profile.mobility;
 $('co-notes').value=profile.notes;
 renderInterests();renderSuggestions();renderAlbert();renderWishes();renderAid();renderSearch();if(tab==='lettre')renderLetter();renderEntry();updateCounters();
 root.querySelectorAll('.co-step-navigation [data-co-tab]').forEach(el=>{
  const on=el.dataset.coTab===tab;el.classList.toggle('active',on);if(on)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
 });
 root.querySelectorAll('[data-co-panel]').forEach(el=>el.hidden=el.dataset.coPanel!==tab);
}
function click(event){
 const el=event.target;
 if(el.closest('[data-co-define]')){event.preventDefault();openDefinition(el.closest('[data-co-define]').dataset.coDefine);return;}
 if(el.closest('[data-co-close]')){$('co-dialog').close();return;}
 const entry=el.closest('[data-co-entry]');
 if(entry){const next=entry.dataset.coEntry;if(next==='metier'||next==='formation'){profile.entry_mode=next;persist(true);status('');if(next==='formation'){renderSectors();renderInterests();renderSuggestions();renderAlbert();}renderEntry();}return;}
 const interest=el.closest('[data-co-interest]');
 if(interest){
  const k=interest.dataset.coInterest;
  if(profile.interests.includes(k))profile.interests=profile.interests.filter(x=>x!==k);
  else if(profile.interests.length<5)profile.interests.push(k);
  else{status('Choisis cinq centres d’intérêt maximum.',true);return;}
  cancelWishRequest();aiResult=null;persist(true);renderInterests();renderGoalInfo();renderSuggestions();renderAlbert();return;
 }
 const tabButton=el.closest('[data-co-tab]');
 if(tabButton){openTab(tabButton.dataset.coTab,!tabButton.closest('.co-step-navigation'));return;}
 if(el.closest('[data-co-show-all]')){showAllSuggestions=!showAllSuggestions;renderSuggestions();return;}
 const course=el.closest('[data-co-keep-course]');
 if(course){keepCourse(course.dataset.coKeepCourse);return;}
 const explore=el.closest('[data-co-explore-course]');
 if(explore){exploreCourse(explore.dataset.coExploreCourse,explore.dataset.coCareer);return;}
 const row=el.closest('[data-co-add-result]');
 if(row){
  const n=Number(row.dataset.coAddResult),rec=records[n];
  if(rec&&keepCourse(tabData,rec,searchCareer)){
   if(!currentWishPlan()&&!wishMain&&completeWish(wishForRecord(tabData,rec,searchCareer)))wishMain=clean(rec.cod_aff_form);
   renderSearch();$('co-results').querySelectorAll('.co-data-card')[n]?.focus({preventScroll:true});
  }
  return;
 }
 const from=el.closest('[data-co-wish-from]');
 if(from){
  const code=clean(records[Number(from.dataset.coWishFrom)]?.cod_aff_form);
  if(code){
   if(wishMain!==code)cancelWishRequest();
   wishMain=code;openTab('pistes',true);
   if(!currentWishPlan())buildWishPlan();
  }
  return;
 }
 if(el.closest('[data-co-build-wishes]')){buildWishPlan();return;}
 const proposal=el.closest('[data-co-keep-proposal]');
 if(proposal){
  const index=Number(proposal.dataset.coKeepProposal);
  const choice=currentWishPlan()?.suggestions[index]?.choice;
  if(choice&&keepWish(choice)){
   $('co-wish-plan').querySelectorAll('.co-wish-proposal')[index]?.querySelector('a')?.focus({preventScroll:true});
  }
  return;
 }
 if(el.closest('[data-co-more-results]')){search(null,true);return;}
 if(el.closest('[data-co-wide-search]')){cancelWishRequest();$('co-mobility').value='france';profile.mobility='france';aiResult=null;renderAlbert();resetSearch();persist(true);search();return;}
 if(el.closest('[data-co-career-return]')){profile.entry_mode='metier';persist(true);openTab('projet');return;}
 const letterWish=el.closest('[data-co-letter-wish]');
 if(letterWish){
  const w=profile.wishes[Number(letterWish.dataset.coLetterWish)];
  if(w&&COURSES.includes(w.pathway)){
   openTab('lettre',true);letterStudio?.selectWish(w);
  }
  return;
 }
 const remove=el.closest('[data-co-remove]');
 if(remove){const n=Number(remove.dataset.coRemove);if(n>=0&&n<profile.wishes.length){compared.delete(profile.wishes[n]);profile.wishes.splice(n,1);persist(true);renderWishes();renderSuggestions();renderAlbert();}return;}
 if(el.closest('[data-co-export]')){download();return;}
 if(el.closest('[data-co-clear]')){erase();return;}
}
function input(e){
 const t=e.target;
 if(t?.id==='co-city'){profile.city=clean(t.value).slice(0,100);resetSearch();renderSearch();schedule();}
 if(t?.id==='co-notes'){profile.notes=String(t.value||'').slice(0,1200);schedule();}
}
function change(e){
 const t=e.target;
 if(t?.id==='co-wish-main'){
  cancelWishRequest();wishMain=t.value;renderWishPlan();$('co-wish-main')?.focus();return;
 }
 if(t?.id==='co-bac'){changeBac(t.value);return;}
 if(t?.id==='co-goal'){resetSearch();profile.goal=COURSES.includes(t.value)?t.value:'';tabData=null;searchCareer='';aiResult=null;persist(true);renderGoalInfo();renderSuggestions();renderAlbert();}
 if(t?.id==='co-city')persist(true);
 if(t?.id==='co-mobility'){cancelWishRequest();profile.mobility=t.value;aiResult=null;renderAlbert();resetSearch();persist(true);renderSearch();}
 if(t?.id==='co-search-course'){tabData=t.value;searchCareer='';resetSearch();renderSearch();}
 if(t?.hasAttribute('data-co-compare')){
  const wish=profile.wishes[Number(t.dataset.coCompare)];
  if(!wish)return;
  if(t.checked&&compared.size===3){t.checked=false;status('Tu peux comparer jusqu’à trois pistes à la fois.',true);return;}
  if(t.checked)compared.add(wish);else compared.delete(wish);
  status('');renderComparison();return;
 }
 if(t?.hasAttribute('data-co-task')){
  const k=t.dataset.coTask;
  profile.tasks=t.checked?[...new Set([...profile.tasks,k])]:profile.tasks.filter(x=>x!==k);
  persist();renderWishes();
 }
 if(t?.id==='co-import-file'){importFile(t.files?.[0]);t.value='';}
}
function mount(el,entry){
 if(!el)return;
 dispose();
 root=el;profile=read();wishMain=profile.wish_plan?.main||'';compared.clear();
 if(entry==='metier'||entry==='formation')profile.entry_mode=entry;
tab='projet';records=[];tabData=null;aiResult=null;showAllSuggestions=false;
 root.classList.add('co-v2');
 layout();refresh();
 if(entry==='metier'||entry==='formation'){
  persist(true);
  const panel=root.querySelector('[data-co-panel="projet"]');
  panel.focus({preventScroll:true});
  panel.scrollIntoView({block:'start'});
 }
 $('co-albert-button').addEventListener('click',askAlbert);

}
function dispose(){
 if(autoTimer&&root?.isConnected){clearTimeout(autoTimer);autoTimer=0;persist(true);}else clearTimeout(autoTimer);
 letterStudio?.dispose();letterStudio=null;
 careerStudio?.dispose();careerStudio=null;
 if(root){root.removeEventListener('click',click);root.removeEventListener('input',input);root.removeEventListener('change',change);}
 resetSearch();cancelWishRequest();wishMain='';searchCareer='';aiRequest?.abort();aiRequest=null;aiBusy=false;root=null;
}
window.addEventListener('pagehide',()=>{if(autoTimer&&root?.isConnected){clearTimeout(autoTimer);autoTimer=0;persist(true);}});
window.CORTEX_ORIENTATION={mount,dispose,version:'5.1'};
})();
