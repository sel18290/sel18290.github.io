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
const sourceUrl=v=>{try{const u=new URL(String(v));return u.protocol==='https:'&&/(\.|^)parcoursup\.(gouv\.fr|fr)$/.test(u.hostname)?u.href:SOURCES.parcoursup;}catch{return SOURCES.parcoursup;}};
const dflt=()=>({bac_origin:'accueil',goal:'',city:'Paris',mobility:'ville',apprenticeship:false,interests:[],wishes:[],tasks:[],notes:''});
let root=null,profile=dflt(),tab='projet',records=[],loading=false,aiBusy=false,autoTimer=0,reqId=0,tabData=null,aiResult=null,noticeTimer=0;
const $=id=>root?.querySelector('#'+id);
const help=(id)=>'<button type="button" class="co-help" data-co-define="'+esc(id)+'" aria-label="Comprendre : '+esc(DEFINITIONS[id]?.[0]||id)+'" title="Explication en mots simples">?</button>';
const anchor=(url,text)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(text)+' ↗</a>';
function read(){
 try{
 const raw=localStorage.getItem(KEY);if(!raw||raw.length>60000)return dflt();
 const x=JSON.parse(raw);if(!x||typeof x!=='object'||Array.isArray(x))return dflt();
 const old=x.bac_origin==='mcv'?'commerce':x.bac_origin;
 const p={...dflt(),...x,bac_origin:old};
 if(!FILIERES[p.bac_origin])p.bac_origin='accueil';
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
 p.city=clean(p.city).slice(0,100)||'Paris';
 p.mobility=['ville','region','france'].includes(p.mobility)?p.mobility:'ville';
 // Migrer les anciens champs d'intérêt libres en mots-clés locaux ; ne jamais les envoyer à Albert.
 p.interests=Array.isArray(x.interests)?x.interests.filter(v=>Object.hasOwn(INTERESTS,v)).slice(0,5):[];
 p.apprenticeship=!!p.apprenticeship;
 p.wishes=Array.isArray(x.wishes)?x.wishes.slice(0,30).map(w=>({
  title:clean(w?.title).slice(0,160),school:clean(w?.school).slice(0,150),city:clean(w?.city).slice(0,80),
  url:sourceUrl(w?.url),code:clean(w?.code).slice(0,110),taux:w?.taux??null,
  part:w?.part??null,pctbp:w?.pctbp??null
 })).filter(w=>w.title):[];
 p.tasks=Array.isArray(x.tasks)?x.tasks.filter(v=>['fiches','parler','bourse','alternance','comparaison'].includes(v)):[];
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
 const a=$('co-count-wishes'),b=$('co-count-tasks');if(a)a.textContent=String(profile.wishes.length);if(b)b.textContent=String(profile.tasks.length);
 const c=$('co-progress');if(c)c.textContent=(profile.goal?'Projet défini':'Projet à explorer')+' · '+profile.wishes.length+' piste'+(profile.wishes.length>1?'s':'')+' sauvegardée'+(profile.wishes.length>1?'s':'');
}
function openTab(next){
 tab=['projet','explorer','pistes','aides'].includes(next)?next:'projet';
 root.querySelectorAll('.co-step-navigation [data-co-tab]').forEach(el=>{
  const on=el.dataset.coTab===tab;el.classList.toggle('active',on);el.setAttribute('aria-selected',String(on));
 });
 root.querySelectorAll('[data-co-panel]').forEach(el=>{el.hidden=el.dataset.coPanel!==tab;});
 if(tab==='projet'){renderSectors();renderInterests();renderSuggestions();renderAlbert();}
 if(tab==='pistes'){renderWishes();}
 if(tab==='aides'){renderAid();}
 if(tab==='explorer'){renderSearch();}
 root.querySelector('.co-stage-panels')?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function courseOptions(){
 const fav=new Set(FILIERES[profile.bac_origin].courses);
 return '<option value="">Je découvre encore mes possibilités</option>'+
 COURSES.map((s,i)=>'<option value="'+esc(s)+'"'+(profile.goal===s?' selected':'')+'>'+esc(s)+(fav.has(i)?' · conseillé pour ton bac':'')+'</option>').join('');
}
function titleBar(){
 return '<div class="co-head"><div class="co-headline"><span class="co-orbit-label"><span class="co-pulse"></span> CORTEX / ORIENTATION · DÉMONSTRATION</span>'+
 '<h1>Un avenir.<br><em>Plusieurs chemins.</em></h1>'+
 '<p>Tu n’as pas besoin de tout savoir aujourd’hui. On construit ton projet, une étape après l’autre, avec des mots simples.</p>'+
 '<div class="co-head-actions"><button class="co-btn co-ghost" type="button" data-action="student-orientation-back">← Retour à mon espace</button>'+
 '<span class="co-local-pill">✧ Sauvegarde locale · Sans compte</span></div></div>'+
 '<div class="co-head-aside"><span class="co-aside-symbol">✦</span><strong>TON CAP</strong><span id="co-progress">Projet à explorer</span><small>Les recherches sont indicatives. Les fiches officielles font référence.</small></div></div>';
}
function layout(){
 root.innerHTML=
 titleBar()+
 '<div class="co-step-navigation" role="tablist" aria-label="Étapes de mon orientation">'+
 [['projet','01','Mon projet'],['explorer','02','Explorer'],['pistes','03','Mes choix'],['aides','04','Mes aides']].map(([id,n,label])=>
 '<button type="button" role="tab" data-co-tab="'+id+'" aria-selected="false"><span>'+n+'</span>'+label+(id==='pistes'?'<b id="co-count-wishes">0</b>':'')+'</button>').join('')+'</div>'+
 '<p class="co-sticky-message" role="status" id="co-message" aria-live="polite">Sauvegarde automatique sur cet appareil.</p>'+
 '<div class="co-stage-panels">'+
 '<section data-co-panel="projet" class="co-page"><div class="co-two-col"><div class="co-pane co-profile-pane">'+
 '<div class="co-section-top"><span class="co-step">01 / MA SITUATION</span><h2>Quel est ton bac pro ?</h2><p>Choisis ta formation actuelle pour recevoir des pistes adaptées.</p></div>'+
 '<div class="co-sector-cards" role="group" aria-label="Choisir ma filière">'+Object.entries(FILIERES).map(([id,f])=>
 '<button type="button" data-co-sector="'+id+'" class="co-sector" aria-pressed="false"><span class="co-sector-icon">'+f.icon+'</span><strong>'+esc(f.label)+'</strong><small>'+esc(f.explain)+'</small><span class="co-tick">✓</span></button>').join('')+'</div>'+
 '<div class="co-profile-form"><label for="co-goal">Quelle formation t’intéresse déjà ? '+help('voeu')+'</label>'+
 '<select id="co-goal">'+courseOptions()+'</select><p class="co-field-hint">Pas encore d’idée ? Aucun problème : Albert et les suggestions t’aideront.</p>'+
 '<div class="co-grid-fields"><div><label for="co-city">Dans quelle ville veux-tu étudier ?</label><input id="co-city" maxlength="100" placeholder="Ex. Paris, Lille, Lyon" autocomplete="address-level2"></div>'+
 '<div><label for="co-mobility">Jusqu’où peux-tu aller ? '+help('mobilite')+'</label><select id="co-mobility"><option value="ville">Ma ville en priorité</option><option value="region">Ma ville et d’autres villes</option><option value="france">Partout en France</option></select></div></div>'+
 '<label class="co-check-row"><input type="checkbox" id="co-apprenticeship"> Je veux aussi découvrir l’alternance '+help('apprentissage')+'</label>'+
 '<label for="co-notes">Ce qui compte pour moi <span class="co-field-optional">(notes privées sur cet appareil)</span></label>'+
 '<textarea id="co-notes" maxlength="1200" rows="3" placeholder="Ex. Je veux travailler dans le tourisme, j’aime l’accueil du public… Cette zone n’est jamais envoyée à Albert."></textarea>'+
 '</div></div>'+
 '<div class="co-pane co-support-pane"><div class="co-section-top"><span class="co-step">02 / MES ENVIES</span><h2>Qu’est-ce que tu aimes ?</h2><p>Choisis jusqu’à cinq domaines. Tu pourras modifier tes choix plus tard.</p></div>'+
 '<div class="co-interest-tags" id="co-interests"></div>'+
 '<div class="co-panel-tint"><span class="co-tint-icon">✧</span><div><strong>De bonnes idées, pas des promesses</strong><p>Personne ne peut connaître tes chances exactes sur Parcoursup. Nous allons regarder les formations, les chiffres officiels disponibles et leurs explications.</p></div></div>'+
 '<div class="co-next-actions"><button type="button" class="co-btn co-primary" data-co-tab="explorer">Explorer les formations →</button><button type="button" class="co-btn co-soft" data-co-tab="pistes">Voir mes choix</button></div></div></div>'+
 '<div class="co-guide-panels"><section class="co-pane co-suggestions-pane"><div class="co-section-top"><span class="co-step">DES IDÉES POUR MON BAC</span><h2>Des pistes qui te correspondent</h2><p>Des propositions indicatives selon ta filière. Elles ne remplacent pas les attendus des formations.</p></div><div id="co-alternatives"></div></section>'+
 '<section class="co-pane co-ai-pane"><div class="co-section-top"><span class="co-step">✦ ASSISTANCE ALBERT</span><h2>Albert prépare ton parcours</h2><p>Des idées expliquées simplement, adaptées à tes goûts et à ton bac pro.</p></div>'+
 '<div class="co-ai-content" id="co-albert"></div><div class="co-ai-actions"><button type="button" class="co-btn co-primary" id="co-albert-button">✦ Demander conseil à Albert</button></div>'+
 '<p class="co-data-policy">Albert reçoit seulement ta filière, la formation choisie et tes centres d’intérêt prédéfinis. Ni nom, ni ville, ni notes personnelles, ni dossier sauvegardé.</p></section></div></section>'+
 '<section data-co-panel="explorer" class="co-page" hidden><div class="co-pane co-explorer-pane"><div class="co-section-top"><span class="co-step">LES DONNÉES OFFICIELLES / SESSION 2025</span><h2>Compare les formations, sans te perdre dans les chiffres.</h2>'+
 '<p>Recherche des établissements proposant une formation. Les chiffres décrivent des candidatures passées, pas tes chances personnelles.</p></div>'+
 '<div class="co-explore-controls"><label for="co-search-course">Formation recherchée</label><select id="co-search-course"></select>'+
 '<button type="button" class="co-btn co-primary" id="co-search">Rechercher près de moi ↗</button></div>'+
 '<div class="co-explore-explain"><div><strong>Taux d’accès '+help('admission')+'</strong><p>Un indicateur global de la session 2025.</p></div>'+
 '<div><strong>Part des candidats de bac pro '+help('bacpro')+'</strong><p>Parmi ceux susceptibles de recevoir une proposition, et non une chance personnelle.</p></div>'+
 '<div><strong>Admis venant du bac pro '+help('admispro')+'</strong><p>Parmi ceux qui ont finalement accepté.</p></div></div>'+
 '<div id="co-results" aria-live="polite"></div>'+
 '<div class="co-source-note">Source : '+anchor(SOURCES.data,'données ouvertes 2025')+' · '+anchor(SOURCES.fiches,'expliquer les chiffres')+'. Hors apprentissage. Pas de prédiction individuelle.</div></div></section>'+
 '<section data-co-panel="pistes" class="co-page" hidden><div class="co-pane co-wishes-pane"><div class="co-section-top"><span class="co-step">MES POSSIBILITÉS</span><h2>Construis plusieurs pistes.</h2>'+
 '<p>Un seul choix peut être un bon début. Tu peux aussi garder des formations proches pour comparer leurs établissements et leurs critères.</p></div>'+
 '<div class="co-plan-stats"><span>Formations gardées <strong id="co-pistes-count">0</strong></span><span>Étapes terminées <strong id="co-count-tasks">0</strong></span><span>Stockage <strong>Mon appareil</strong></span></div>'+
 '<div id="co-wishes"></div><div class="co-planning"><h3>Ma petite feuille de route</h3><div id="co-tasks"></div></div>'+
 '<div class="co-export-tools"><button type="button" class="co-btn co-soft" data-co-export>↓ Exporter mon projet</button><label class="co-btn co-soft" for="co-import-file">↑ Importer un projet</label><input type="file" accept=".json,application/json" id="co-import-file" hidden>'+
 '<button type="button" class="co-btn co-danger" data-co-clear>Effacer sur cet appareil</button></div></div></section>'+
 '<section data-co-panel="aides" class="co-page" hidden><div class="co-pane co-aid-pane"><div class="co-section-top"><span class="co-step">VIE ÉTUDIANTE</span><h2>Les aides à connaître avant de choisir.</h2>'+
 '<p>Tu peux étudier plus loin que prévu si tu repères les aides possibles. Les montants et les droits dépendent de ta situation : utilise les outils officiels.</p></div>'+
 '<div id="co-aides-list"></div></div></section></div>'+
 '<dialog id="co-dialog" class="co-definition" aria-labelledby="co-dialog-title"><form method="dialog"><button type="submit" class="co-dialog-close" aria-label="Fermer l’explication">×</button></form>'+
 '<span class="co-def-kicker">LE PETIT DICO CORTEX</span><h2 id="co-dialog-title"></h2><p id="co-dialog-text"></p><div class="co-def-footer"><button type="button" class="co-btn co-primary" data-co-close>J’ai compris ✓</button></div></dialog>';
 root.addEventListener('click',click);
 root.addEventListener('input',input);
 root.addEventListener('change',change);
}
function renderSectors(){
 root.querySelectorAll('[data-co-sector]').forEach(el=>{
  const active=el.dataset.coSector===profile.bac_origin;
  el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));
 });
 const sel=$('co-goal');if(sel)sel.innerHTML=courseOptions();
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
 const f=FILIERES[profile.bac_origin];
 const chosen=new Set(profile.wishes.map(w=>norm(w.title)));
 const candidates=f.courses.map(i=>COURSES[i]).filter(Boolean).filter(c=>c!==profile.goal).slice(0,7);
 const head=profile.wishes.length<=1?'<p class="co-alert"><strong>Une idée, c’est un début.</strong> Découvre au moins deux autres possibilités cohérentes avec ton bac.</p>':'';
 wrap.innerHTML=head+'<div class="co-suggestion-grid">'+candidates.map(course=>{
 const saved=chosen.has(norm(course));
 return '<article class="co-suggestion"><div><span class="co-course-type">'+(course.startsWith('BTS')?'BAC + 2':course.startsWith('BUT')?'BAC + 3':'AUTRE PARCOURS')+'</span>'+
 '<h3>'+esc(course)+'</h3></div><div class="co-sug-actions">'+(saved?'<span class="co-kept">✓ Dans mes choix</span>':'<button class="co-btn co-small" data-co-keep-course="'+esc(course)+'">+ Garder</button>')+
 '<button class="co-btn co-small co-soft" data-co-explore-course="'+esc(course)+'">Voir les établissements</button></div></article>';
 }).join('')+'</div>';
}
function renderAlbert(){
 const box=$('co-albert');if(!box)return;
 if(!aiResult){box.innerHTML='<div class="co-ai-placeholder"><span>✧</span><p>Albert peut t’aider à comprendre plusieurs parcours possibles et préparer des questions à poser au lycée.</p>'+
 '<small>Tu gardes toujours le dernier mot sur tes choix.</small></div>';return;}
 box.innerHTML='<div class="co-ai-intro">'+esc(aiResult.intro||'Voici quelques pistes à vérifier ensemble.')+'</div>'+
 '<div class="co-ai-suggestions">'+(aiResult.suggestions||[]).map(x=>
 '<article><div><strong>'+esc(x.course)+'</strong><p>'+esc(x.why)+'</p><small>'+esc(x.preparation)+'</small></div>'+
 '<button type="button" class="co-btn co-small" data-co-keep-course="'+esc(x.course)+'">+ Garder</button></article>').join('')+'</div>'+
 (aiResult.plan?.length?'<h3>Ce que tu peux faire ensuite</h3><ol>'+aiResult.plan.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>':'')+
 (aiResult.questions?.length?'<h3>Questions à poser</h3><ul>'+aiResult.questions.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+
 '<p class="co-ai-caution">Conseils générés par Albert. Vérifie les conditions de chaque formation et parle-en avec un adulte référent.</p>';
}
async function askAlbert(){
 if(aiBusy)return;
 const btn=$('co-albert-button');aiBusy=true;
 btn.disabled=true;btn.textContent='Albert prépare tes pistes…';
 const request={filiere:profile.bac_origin,goal:profile.goal,interests:profile.interests.slice(0,5),mobility:profile.mobility};
 try{
  const response=await fetch(ALBERT,{method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify(request),
   signal:AbortSignal.timeout(45000)});
  const body=await response.json().catch(()=>({}));
  if(!response.ok||!body.ok||!Array.isArray(body.suggestions))throw Error(body.error||'Albert n’a pas pu répondre.');
  aiResult={intro:body.intro,suggestions:body.suggestions,questions:body.questions,plan:body.plan};
  renderAlbert();status('Conseils Albert affichés. Ton dossier reste uniquement dans le navigateur.');
 }catch(err){status((err?.message||'Albert est indisponible.')+' Les pistes proposées localement restent accessibles.',true);}
 finally{aiBusy=false;btn.disabled=false;btn.textContent='✦ Demander de nouvelles idées à Albert';}
}
function keepCourse(course,rec){
 if(!COURSES.includes(course)&&!rec)return;
 const item=rec?{
  title:clean(rec.lib_for_voe_ins||course).slice(0,160),
  school:clean(rec.g_ea_lib_vx).slice(0,150),
  city:clean(rec.ville_etab).slice(0,80),
  url:sourceUrl(rec.lien_form_psup),
  code:clean(rec.cod_aff_form).slice(0,110),
  taux:pct(rec.taux_acces_ens),part:pct(rec.part_acces_pro),pctbp:pct(rec.pct_bp)
 }:{title:course,school:'À rechercher',city:profile.city,url:SOURCES.parcoursup,code:'',taux:null,part:null,pctbp:null};
 if(profile.wishes.some(w=>(w.code&&item.code&&w.code===item.code)||(!item.code&&!w.code&&norm(w.title)===norm(item.title)))){
  status('Cette piste est déjà dans tes choix.');return;
 }
 if(profile.wishes.length>=30){status('Tu peux conserver jusqu’à 30 pistes : retire-en une avant de continuer.',true);return;}
 profile.wishes.push(item);persist();renderSuggestions();renderWishes();
 status('Piste ajoutée : '+item.title+'. Tu peux la retrouver dans « Mes choix ».');
}
function renderWishes(){
 const wrap=$('co-wishes');if(!wrap)return;
 $('co-pistes-count').textContent=String(profile.wishes.length);
 const saved=profile.wishes;
 const callout=saved.length===0?'Ajoute une première formation depuis « Mon projet » ou « Explorer ».':saved.length===1?'Tu as une seule piste. Essaie d’en ajouter deux autres pour diversifier ton projet.':'Tu as déjà plusieurs pistes. Compare leurs critères et les établissements.';
 wrap.innerHTML='<div class="co-wish-guidance">'+esc(callout)+' '+help('diversite')+
  '<p class="co-wish-caution">Ce carnet sert à préparer tes choix. Il ne crée aucun vœu sur Parcoursup et ne transmet aucune candidature. '+help('voeu')+'</p></div>'+
 (saved.length?'<div class="co-wish-list">'+saved.map((w,i)=>
 '<article class="co-wish-card"><div class="co-wish-index">'+String(i+1).padStart(2,'0')+'</div><div><strong>'+esc(w.title)+'</strong>'+
 '<small>'+esc(w.school||'Établissement à préciser')+(w.city?' · '+esc(w.city):'')+'</small>'+
 (pct(w.taux)!==null?'<span class="co-wish-stat">Accès 2025 : '+formatPct(w.taux)+' '+help('admission')+'</span>':'')+'</div>'+
 '<div class="co-wish-actions">'+anchor(sourceUrl(w.url),'Fiche Parcoursup')+'<button type="button" data-co-remove="'+i+'">Retirer</button></div></article>').join('')+'</div>':
 '<div class="co-empty-state"><span>✦</span><h3>Tes possibilités commencent ici</h3><p>Tu peux ajouter des idées sans remplir de dossier Parcoursup.</p><button type="button" class="co-btn co-primary" data-co-tab="projet">Découvrir des idées →</button></div>');
 const tasks=[
 ['fiches','Lire les attendus de deux formations', 'attendus'],
 ['comparaison','Comparer au moins trois pistes','diversite'],
 ['parler','En parler à mon professeur principal ou au PsyEN','voeu'],
 ['bourse','Vérifier les bourses et le logement','bourse'],
 ['alternance','Regarder si l’apprentissage m’intéresse','apprentissage']
 ];
 $('co-tasks').innerHTML=tasks.map(([id,text,def])=>'<label class="co-task"><input type="checkbox" data-co-task="'+id+'"'+(profile.tasks.includes(id)?' checked':'')+'><span>'+esc(text)+'</span></label>').join('');
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
function formatRecord(r){
 const title=clean(r.lib_for_voe_ins||r.fil_lib_voe_acc||'Formation');
 const place=clean(r.g_ea_lib_vx||'Établissement non renseigné');
 const city=clean(r.ville_etab||'Ville non renseignée');
 return {title,place,city,rate:pct(r.taux_acces_ens),pro:pct(r.part_acces_pro),admitted:pct(r.pct_bp)};
}
function recordScore(r,term){
 const name=norm(r.lib_for_voe_ins)+' '+norm(r.fil_lib_voe_acc);
 const goal=norm(term).replace(/^bts /,'').replace(/^but /,'');
 const tokens=goal.split(/[^a-z0-9]+/).filter(x=>x.length>2);
 const match=tokens.reduce((n,t)=>n+(name.includes(t)?3:0),0);
 const city=norm(r.ville_etab),wanted=norm(profile.city);
 return match+(city===wanted?10:city.includes(wanted)?5:0)+((pct(r.part_acces_pro)??0)/100);
}
function renderSearch(){
 const sel=$('co-search-course');if(sel)sel.innerHTML='<option value="">Choisir une formation</option>'+COURSES.map(c=>'<option value="'+esc(c)+'"'+(c===(tabData||profile.goal)?' selected':'')+'>'+esc(c)+'</option>').join('');
 const box=$('co-results');if(!box)return;
 if(!records.length){box.innerHTML='<div class="co-empty-state"><span>⌖</span><h3>À toi de trouver des établissements.</h3><p>Choisis une formation puis lance une recherche. Les chiffres disponibles sont issus de la session 2025.</p></div>';return;}
 const term=tabData||profile.goal;
 const sorted=records.slice().sort((a,b)=>recordScore(b,term)-recordScore(a,term));
 const city=norm(profile.city);
 const local=sorted.filter(r=>norm(r.ville_etab).includes(city));
 const shown=profile.mobility==='ville'&&local.length?local:sorted;
 const selectedNorm=norm(term).replace(/^bts /,'').replace(/^but /,'').replace(/^certificat de specialisation /,'');
 const matchWords=selectedNorm.split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!['management','gestion','professionnel','entreprises','activites'].includes(w));
 const relevant=shown.filter(r=>{
  const title=norm(r.lib_for_voe_ins)+' '+norm(r.fil_lib_voe_acc);
  return matchWords.some(w=>title.includes(w));
 });
 const limited=(relevant.length?relevant:shown).slice(0,35);
 box.innerHTML='<p class="co-results-info">'+limited.length+' résultat(s) affiché(s) · '+(local.length&&profile.mobility==='ville'?'établissements de '+esc(profile.city):'recherche élargie')+' · 2025, hors apprentissage</p>'+
 '<div class="co-result-list">'+limited.map((r,i)=>{
 const f=formatRecord(r);
 const found=profile.wishes.some(w=>w.code&&w.code===String(r.cod_aff_form||''));
 return '<article class="co-data-card"><div class="co-data-head"><div><span class="co-data-label">'+esc(r.fili||'Formation')+'</span><h3>'+esc(f.title)+'</h3>'+
 '<p>⌖ '+esc(f.place)+' · '+esc(f.city)+'</p></div>'+anchor(sourceUrl(r.lien_form_psup),'Fiche officielle')+'</div>'+
 '<div class="co-indicator-list"><div><small>Taux d’accès '+help('admission')+'</small><strong>'+formatPct(f.rate)+'</strong></div>'+
 '<div><small>Part bac pro parmi les appelables '+help('bacpro')+'</small><strong>'+formatPct(f.pro)+'</strong></div>'+
 '<div><small>Admis issus du bac pro '+help('admispro')+'</small><strong>'+formatPct(f.admitted)+'</strong></div></div>'+
 '<div class="co-result-footer"><span>Pas une probabilité personnelle. '+help('historique')+'</span>'+
 (found?'<span class="co-kept">✓ Déjà gardée</span>':'<button type="button" class="co-btn co-small co-primary" data-co-add-result="'+i+'">+ Garder</button>')+'</div></article>';
 }).join('')+'</div>';
 // Maintenir les références de lignes locales du tableau affiché, quelle que soit la recherche.
 root._orientationShown=limited;
}
async function fetchBatch(term,cityFilter,offset){
 const u=new URL(DATA);
 u.searchParams.set('limit','100');
 u.searchParams.set('offset',String(offset));
 u.searchParams.set('where','session=2025'+(cityFilter?' AND search(ville_etab, '+JSON.stringify(profile.city)+')':''));
 u.searchParams.set('q',term);
 const response=await fetch(u.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw Error('La base ministérielle n’a pas répondu ('+response.status+').');
 const obj=await response.json();
 if(!Array.isArray(obj.results))throw Error('Réponse inattendue de la base officielle.');
 return obj.results;
}
async function search(){
 if(loading)return;
 const sel=$('co-search-course');
 const term=clean(sel?.value||tabData||profile.goal);
 if(!COURSES.includes(term)){status('Choisis une formation dans la liste pour commencer.',true);sel?.focus();return;}
 profile.goal=term;tabData=term;persist(true);
 loading=true;const id=++reqId;
 const btn=$('co-search'),box=$('co-results');
 btn.disabled=true;btn.textContent='Recherche en cours…';
 box.innerHTML='<div class="co-loading"><span>✦</span> Consultation des données publiques Parcoursup 2025…</div>';
 try{
  let q=term.replace(/^(BTS|BUT) /,'').replace(/^Certificat de spécialisation /,'');
  let data=await fetchBatch(q,profile.mobility==='ville',0);
  if(!data.length&&profile.mobility==='ville')data=await fetchBatch(q,false,0);
  if(!data.length&&q.includes(' '))data=await fetchBatch(q.split(' ')[0],false,0);
  if(id!==reqId)return;
  records=data.filter(r=>r&&typeof r==='object');
  renderSearch();
  status(records.length?'Données officielles 2025 chargées. Compare les chiffres et ouvre les fiches.':'Aucun résultat pour ces critères. Essaie un autre BTS ou une zone plus large.');
 }catch(err){
  if(id!==reqId)return;
  records=[];
  box.innerHTML='<div class="co-empty-state"><h3>Recherche temporairement indisponible</h3><p>Tu peux toujours consulter les formations directement sur le portail officiel.</p>'+anchor(SOURCES.data,'Ouvrir les données Parcoursup')+'</div>';
  status('La recherche externe a échoué : '+(err?.message||'service indisponible'),true);
 }finally{loading=false;btn.disabled=false;btn.textContent='Rechercher près de moi ↗';}
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
 if(!file||file.size>100000){status('Le fichier d’import est trop volumineux.',true);return;}
 try{
  const text=await file.text(),obj=JSON.parse(text);
  if(obj?.format!=='CORTEX_ORIENTATION_DEMO_LOCAL'||!obj.project||typeof obj.project!=='object')throw Error('Ce fichier ne correspond pas à un projet CORTEX.');
  if(!window.confirm('Remplacer ton projet d’orientation actuel par le fichier importé ?'))return;
  localStorage.setItem(KEY,JSON.stringify(obj.project));
  profile=read();aiResult=null;tabData=null;records=[];
  refresh();status('Projet importé et enregistré dans ce navigateur.');
 }catch(e){status('Import impossible : '+(e?.message||'fichier invalide'),true);}
}
function erase(){
 if(!window.confirm('Effacer ton projet Orientation de ce navigateur ? Les autres outils CORTEX ne seront pas modifiés.'))return;
 clearTimeout(autoTimer);
 try{localStorage.removeItem(KEY);}catch{}
 profile=dflt();records=[];aiResult=null;tabData=null;
 refresh();status('Le projet local a été effacé.');
}
function refresh(){
 if(!root?.isConnected)return;
 renderSectors();
 $('co-city').value=profile.city;
 $('co-mobility').value=profile.mobility;
 $('co-apprenticeship').checked=profile.apprenticeship;
 $('co-notes').value=profile.notes;
 renderInterests();renderSuggestions();renderAlbert();renderWishes();renderAid();renderSearch();updateCounters();
 root.querySelectorAll('.co-step-navigation [data-co-tab]').forEach(el=>{
  const on=el.dataset.coTab===tab;el.classList.toggle('active',on);el.setAttribute('aria-selected',String(on));
 });
 root.querySelectorAll('[data-co-panel]').forEach(el=>el.hidden=el.dataset.coPanel!==tab);
}
function click(event){
 const el=event.target;
 if(el.closest('[data-co-define]')){event.preventDefault();openDefinition(el.closest('[data-co-define]').dataset.coDefine);return;}
 if(el.closest('[data-co-close]')){$('co-dialog').close();return;}
 const sector=el.closest('[data-co-sector]');
 if(sector){reqId++;profile.bac_origin=sector.dataset.coSector;profile.goal='';tabData=null;records=[];aiResult=null;persist();refresh();return;}
 const interest=el.closest('[data-co-interest]');
 if(interest){
  const k=interest.dataset.coInterest;
  if(profile.interests.includes(k))profile.interests=profile.interests.filter(x=>x!==k);
  else if(profile.interests.length<5)profile.interests.push(k);
  else{status('Choisis cinq centres d’intérêt maximum.',true);return;}
  aiResult=null;persist();renderInterests();renderAlbert();return;
 }
 const tabButton=el.closest('[data-co-tab]');
 if(tabButton){openTab(tabButton.dataset.coTab);return;}
 const course=el.closest('[data-co-keep-course]');
 if(course){keepCourse(course.dataset.coKeepCourse);return;}
 const explore=el.closest('[data-co-explore-course]');
 if(explore){tabData=explore.dataset.coExploreCourse;records=[];openTab('explorer');return;}
 const row=el.closest('[data-co-add-result]');
 if(row){const n=Number(row.dataset.coAddResult),rec=root._orientationShown?.[n];if(rec){keepCourse(clean(rec.lib_for_voe_ins),rec);renderSearch();}return;}
 const remove=el.closest('[data-co-remove]');
 if(remove){const n=Number(remove.dataset.coRemove);if(n>=0&&n<profile.wishes.length){profile.wishes.splice(n,1);persist();renderWishes();renderSuggestions();}return;}
 if(el.closest('[data-co-export]')){download();return;}
 if(el.closest('[data-co-clear]')){erase();return;}
}
function input(e){
 const t=e.target;
 if(t?.id==='co-city'){profile.city=clean(t.value).slice(0,100);records=[];schedule();}
 if(t?.id==='co-notes'){profile.notes=String(t.value||'').slice(0,1200);schedule();}
}
function change(e){
 const t=e.target;
 if(t?.id==='co-goal'){reqId++;profile.goal=COURSES.includes(t.value)?t.value:'';tabData=null;records=[];aiResult=null;persist();renderSuggestions();renderAlbert();}
 if(t?.id==='co-city'){profile.city=clean(t.value)||'Paris';persist();}
 if(t?.id==='co-mobility'){profile.mobility=t.value;persist();renderSearch();}
 if(t?.id==='co-apprenticeship'){profile.apprenticeship=!!t.checked;persist();}
 if(t?.id==='co-search-course'){tabData=COURSES.includes(t.value)?t.value:'';records=[];renderSearch();}
 if(t?.hasAttribute('data-co-task')){
  const k=t.dataset.coTask;
  profile.tasks=t.checked?[...new Set([...profile.tasks,k])]:profile.tasks.filter(x=>x!==k);
  persist();renderWishes();
 }
 if(t?.id==='co-import-file'){importFile(t.files?.[0]);t.value='';}
}
function mount(el){
 if(!el)return;
 dispose();
 root=el;profile=read();tab='projet';records=[];tabData=null;aiResult=null;
 root.classList.add('co-v2');
 layout();refresh();
 $('co-albert-button').addEventListener('click',askAlbert);
 $('co-search').addEventListener('click',search);
 const banner=$('co-message');
 if(banner)banner.textContent='Tes données personnelles restent sur cet appareil. Conseils Albert et recherches officiels sur demande seulement.';
}
function dispose(){
 if(autoTimer&&root?.isConnected){clearTimeout(autoTimer);autoTimer=0;persist(true);}else clearTimeout(autoTimer);
 root=null;records=[];reqId++;loading=false;aiBusy=false;
}
window.addEventListener('pagehide',()=>{if(autoTimer&&root?.isConnected){clearTimeout(autoTimer);autoTimer=0;persist(true);}});
window.CORTEX_ORIENTATION={mount,dispose,version:'2.0'};
})();
