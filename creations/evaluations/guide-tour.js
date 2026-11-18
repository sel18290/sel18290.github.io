/* CORTEX — parcours guidé autonome de la démonstration, sans collecte ni serveur. */
(function cortexGuidedTour(){
'use strict';
const STORAGE='cortex-tour-v4';
const steps=[
 {phase:'DÉCOUVRIR',title:'Bienvenue dans CORTEX',eyebrow:'Station Noctis · Une évaluation de bout en bout',route:'#accueil',icon:'✦',
  targets:['.home-hero .hero-copy','.home-hero'],
  body:'CORTEX réunit l’espace professeur, les contrôles numériques, les documents, les copies et le carnet élève. Albert IA intervient à plusieurs moments : préparation d’un sujet, correction fictive et accompagnement pédagogique.',
  task:'Commencez sans compte. Tout le contenu de démonstration est fictif ; les fonctions de l’espace réel attendent les validations institutionnelles.'},
 {phase:'ALBERT IA',title:'Rencontrer Albert, votre guide IA',eyebrow:'Aide immédiate et signalements',route:'#accueil',icon:'✧',
  targets:['#cortex-albert-person','.home-hero'],
  body:'Le petit robot Albert, sur le côté gauche, répond à des questions sur les fonctionnalités de CORTEX. Il présente ses réponses en étapes lisibles et permet aussi de signaler un bug à l’administrateur.',
  task:'Cliquez sur « Albert IA » puis essayez « Comment publier un contrôle ? » ou l’onglet « Signaler un bug ». N’ajoutez pas de données personnelles.',visitLabel:'Ouvrir Albert ↗',openTarget:true},
 {phase:'PROFESSEUR',title:'Comprendre le tableau de bord',eyebrow:'Vue d’ensemble des évaluations',route:'#professeur/dashboard',icon:'▦',
  targets:['.workspace-main .stats','.workspace-main .page-head','.workspace-main'],
  body:'Le tableau de bord donne une vue rapide des contrôles, copies et indicateurs. Le menu professeur conduit à Mes classes, Mes contrôles, Importer PDF / Word, Copies & notes et Analyses.',
  task:'Repérez les raccourcis du menu, puis utilisez « Suivant » pour explorer chaque étape.'},
 {phase:'PROFESSEUR',title:'Organiser classes et groupes',eyebrow:'Classe entière · Groupe 1 · Groupe 2',route:'#professeur/classes',icon:'▣',
  targets:['.classes-page .class-grid','.classes-page .page-head','.workspace-main'],
  body:'Les classes et leurs demi-groupes sont gérés ici. Une publication peut cibler la classe entière, le groupe 1 ou le groupe 2, sans mélanger les contrôles et copies des groupes.',
  task:'Consultez une classe et repérez les groupes. Vous pourrez modifier le destinataire lors de la publication.'},
 {phase:'CRÉATION',title:'Créer un contrôle comme dans le réel',eyebrow:'Même atelier dans test et Académie',route:'#professeur/creer',icon:'＋',
  targets:['#prof-assessments .real-manual-columns','#prof-assessments .real-manual-workshop','#prof-assessments','.workspace-main'],
  body:'La démonstration reprend l’atelier de création de l’espace réel : informations du contrôle, classe, groupe, durée, liste de questions, réponses rédigées, QCM, tableaux et barèmes. Les changements de la démo sont enregistrés localement.',
  task:'Parcourez les trois colonnes : questions, document associé et configuration de la réponse.'},
 {phase:'CRÉATION',title:'Associer un document à chaque question',eyebrow:'Images, captures et textes',route:'#professeur/creer',icon:'▧',
  targets:['#manual-source-preview','#manual-paste-image','.real-manual-document','#prof-assessments'],
  body:'Chaque question possède son document associé : un texte, une image seule ou une combinaison. Vous pouvez importer une image, coller une capture avec Windows + Maj + S puis Ctrl + V et consulter le document original.',
  task:'Repérez « Choisir une image » et « Coller une capture » au centre. Le panneau droit sert à configurer l’énoncé, le type de réponse et les points.'},
 {phase:'IMPORT',title:'Importer un sujet PDF ou Word',eyebrow:'L’atelier classique',route:'#professeur/import',icon:'⇪',
  targets:['[data-action="visual-import-file"]','.visual-import-drop','.visual-import-start'],
  body:'Dans Importer / Exporter, choisissez un fichier PDF ou Word puis « Atelier classique ». Vous pourrez parcourir le document original, sélectionner des passages et relier les captures aux questions.',
  task:'Identifiez les deux choix d’importation. Le mode classique conserve le fichier dans votre navigateur de démonstration ; vous pourrez remplacer un mauvais fichier.'},
 {phase:'ALBERT IA',title:'Albert prépare le sujet automatiquement',eyebrow:'Import / Export · Lecture visuelle IA',route:'#professeur/import',icon:'✦',
  targets:['[data-action="visual-import-albert"]','.visual-import-modes','.visual-import-start'],
  body:'L’option « Préparer avec Albert IA » transmet, après confirmation, des images des pages et le texte du document via Supabase vers Albert. Le système propose les documents repérés, les questions, les types de réponses, les barèmes présents et les associations image/question.',
  task:'Choisissez un PDF ou Word fictif puis « Préparer avec Albert IA ». La fenêtre indique les pages examinées et les erreurs éventuelles. Vérifiez les propositions et les recadrages avant de les utiliser.'},
 {phase:'PUBLICATION',title:'Retrouver et organiser Mes contrôles',eyebrow:'Classe · Brouillons · Duplications',route:'#professeur/controles',icon:'▤',
  targets:['#exam-tiles .tile','#exam-tiles','.workspace-main'],
  body:'Chaque carte indique le titre, la classe, le nombre de questions, les points et le périmètre de diffusion. Vous pouvez modifier, dupliquer, consulter l’original, publier ou supprimer une évaluation.',
  task:'Repérez le contrôle PSE Sommeil, puis les commandes « Modifier », « Publier », « QR codes » et « Tester ».'},
 {phase:'PUBLICATION',title:'Publier pour la bonne classe ou le bon groupe',eyebrow:'Confirmation avant ouverture',route:'#professeur/controles',icon:'◉',
  targets:['#exam-tiles [data-action="publish-exam"]','#exam-tiles','.workspace-main'],
  body:'« Publier » ouvre une confirmation : choisissez la classe entière, le groupe 1 ou le groupe 2. Vous pouvez y vérifier ou modifier le périmètre avant de rendre le contrôle accessible aux élèves.',
  task:'Cliquez sur « Publier » sur une évaluation fictive pour examiner la fenêtre de confirmation. Aucun élève réel n’est concerné.'},
 {phase:'PASSATION',title:'Tester le contrôle comme un élève',eyebrow:'Aperçu professeur · Chronomètre réel',route:'#professeur/controles',icon:'◷',
  targets:['#exam-tiles [data-action="try-exam"]','#exam-tiles','.workspace-main'],
  body:'Le bouton « Tester » ouvre la simulation côté élève directement depuis l’espace professeur : les mêmes questions, documents, navigation et compte à rebours que pendant une passation.',
  task:'Cliquez sur « Tester ↗ » sur le contrôle Sommeil pour vérifier vous-même le rendu avant publication. Vous pouvez revenir au professeur.'},
 {phase:'PASSATION',title:'QR codes et PIN des élèves',eyebrow:'Accès à la bonne classe',route:'#professeur/codes',icon:'⌑',
  targets:['.access-grid .access-card','.access-intro','.workspace-main'],
  body:'Les accès élèves reposent sur le QR code, la classe, le numéro de liste et le PIN personnel. Le professeur peut renouveler les codes sans effacer les copies. Dans la démo, ces accès restent fictifs et propres au navigateur.',
  task:'Consultez les PIN ici ; les QR codes se trouvent aussi sur chaque carte dans « Mes contrôles ».'},
 {phase:'CORRECTION',title:'Corriger les copies question par question',eyebrow:'Documents sources et validation humaine',route:'#professeur/copies',icon:'✓',
  targets:['[data-action="review-pdf-sample"]','.workspace-main .table-wrap','.workspace-main'],
  body:'Dans Copies & notes, le professeur retrouve les réponses et les documents sources, attribue les points et écrit des commentaires. Il peut télécharger une copie ou un lot en PDF et publier les résultats après vérification.',
  task:'Ouvrez « Corriger la copie PDF de démonstration » pour retrouver les 20 questions PSE Sommeil.'},
 {phase:'ALBERT IA',title:'Faire corriger la copie fictive par Albert',eyebrow:'20 questions · Une proposition de correction',route:'#professeur/corriger/ex-pdf-demo',icon:'✦',
  targets:['[data-action="ai-albert-demo"]','.review-head-actions','.review-layout','.review-workspace'],
  body:'Le bouton « Corriger avec Albert IA » demande à Albert une proposition sur les 20 réponses du contrôle fictif. Il produit des points et commentaires question par question : ce sont des suggestions, non une correction officielle.',
  task:'Cliquez sur « Corriger avec Albert IA », lancez l’analyse, puis comparez les réponses attendues et les propositions. Le professeur garde le dernier mot et décide de reporter ou non les points.'},
 {phase:'CORRECTION',title:'Comparer les méthodes et respecter le RGPD',eyebrow:'Albert, ChatGPT et limites de traitement',route:'#professeur/corriger/ex-pdf-demo',icon:'⚑',
  targets:['[data-action="ai-chatgpt-copy"]','.review-head-actions','.workspace-main'],
  body:'La correction humaine reste obligatoire. La fonction de correction avec ChatGPT possède une alerte RGPD spécifique : une confirmation ne vaut pas autorisation institutionnelle. La démonstration Albert n’utilise que des copies fictives prédéfinies.',
  task:'Observez l’avertissement associé à « Corriger avec ChatGPT · RGPD ». N’envoyez aucune donnée réelle d’élève pendant cette visite.'},
 {phase:'ÉLÈVE',title:'Passer le contrôle de sommeil',eyebrow:'60 minutes · 20 questions',route:'#eleve/decouverte',icon:'✎',
  targets:['.pse-discovery-start','.pse-discovery-entry','.pse-discovery'],
  body:'Le parcours élève propose un contrôle PSE Sommeil fictif de 60 minutes : documents, questions et compte à rebours. Aucun compte n’est nécessaire pour cette passation de découverte.',
  task:'Choisissez « Entrer sans connexion », puis « Démarrer le contrôle ». Le temps commence seulement après le démarrage explicite.'},
 {phase:'CARNET',title:'Entrer dans le carnet élève fictif',eyebrow:'Mon CORTEX · Notes et progression',route:'#eleve/espace',enterDemoPortal:true,icon:'◈',
  targets:['.portal-welcome','.portal-dashboard','.portal-root'],
  body:'La visite ouvre automatiquement le carnet fictif, sans demander de PIN. Vous y retrouvez les contrôles corrigés, les notes publiées, une copie encore en correction et les bilans par période.',
  task:'Parcourez « Mes contrôles » et « Mes révisions ». Les exemples du carnet n’incluent aucune donnée d’élève réel.'},
 {phase:'ALBERT IA',title:'Estimer la note d’une copie en attente',eyebrow:'Indication IA, jamais note officielle',route:'#eleve/espace',enterDemoPortal:true,icon:'≈',
  targets:['[data-action="portal-albert-estimate"]','#portal-results','.portal-results'],
  body:'Sur une copie « Correction en attente », l’élève peut demander « Estimer ma note avec Albert IA ». Albert propose une note indicative sur la copie fictive, sans publier de correction ni de remarques détaillées avant le professeur.',
  task:'Dans les copies, trouvez celle en attente et son bouton d’estimation. Sa note estimée n’entre ni dans la moyenne ni dans les résultats officiels.'},
 {phase:'ALBERT IA',title:'Comprendre une copie déjà corrigée',eyebrow:'Albert accompagne après la correction',route:'#eleve/espace',enterDemoPortal:true,icon:'✧',
  targets:['[data-action="portal-albert-corrected"]','#portal-results','.portal-results'],
  body:'Une fois la copie corrigée et publiée par l’enseignant, le bouton « Albert m’aide à comprendre ma copie » peut expliquer les réussites, les erreurs et les prochaines pistes de travail. Albert ne modifie jamais la note officielle.',
  task:'Repérez le bouton d’accompagnement sur une copie corrigée. Les remarques IA ne sont proposées qu’après la correction du professeur.'},
 {phase:'ALBERT IA',title:'Analyser les 13 contrôles avec Albert',eyebrow:'Difficultés · Progrès · Recommandations',route:'#eleve/espace',enterDemoPortal:true,icon:'✦',
  targets:['[data-action="portal-albert-tips"]','#portal-revisions','.portal-root'],
  body:'Dans « Mes révisions », Albert étudie le parcours fictif déjà corrigé : notes, questions, commentaires du professeur et évolutions. Il propose un bilan des points forts, des difficultés, des progrès et des recommandations adaptées.',
  task:'Cliquez sur « Analyser mes 13 contrôles avec Albert » pour voir un bilan IA du carnet fictif. Les copies en attente ne sont pas utilisées comme corrections.'},
 {phase:'SUIVI',title:'Suivi, analyses et anti-triche',eyebrow:'Repérer sans tirer de conclusions hâtives',route:'#professeur/analyses',icon:'▥',
  targets:['.workspace-main .stats','.workspace-main .two-col','.workspace-main'],
  body:'Les analyses regroupent les moyennes et répartitions pour identifier les notions à revoir. Les rubriques « Suivi des épreuves » et « Anti-triche » renseignent sur les événements du navigateur : un signalement ne constitue jamais une preuve de fraude.',
  task:'Explorez les analyses, puis les réglages anti-triche dans le menu latéral. Chaque option reste sous le contrôle du professeur.'},
 {phase:'CONCLUSION',title:'Vous connaissez le parcours CORTEX',eyebrow:'Pédagogie assistée par IA, validation humaine',route:'#accueil',icon:'★',
  targets:['.home-hero .hero-copy','.home-hero'],
  body:'Du PDF aux questions, de la passation à la copie, puis à l’estimation et aux conseils du carnet : vous avez parcouru les fonctions majeures de CORTEX et d’Albert IA. L’IA formule des propositions ; l’enseignant valide les évaluations et corrections.',
  task:'Vous pouvez refaire cette visite à tout moment. CORTEX Académie (espace réel) reste en attente des autorisations institutionnelles nécessaires, notamment pour les données personnelles.'}
];
const targetCandidates=steps.map(step=>step.targets||[step.selector]);
let active=false,index=0,minimized=false,showList=false,root=null,highlighted=null,refocus=null,dockChoice='auto',tourDemoEntered=false;
const clamp=n=>Math.max(0,Math.min(steps.length-1,n));
function read(){try{return JSON.parse(sessionStorage.getItem(STORAGE)||'null')}catch{return null}}
function store(){try{if(active)sessionStorage.setItem(STORAGE,JSON.stringify({index,minimized,dockChoice}));else sessionStorage.removeItem(STORAGE)}catch{}}
// Cibler un véritable élément à découvrir, pas toute la page quand c'est possible.
const isDesktop=()=>window.matchMedia?.('(min-width:761px) and (pointer:fine)').matches===true;
function target(){
 const selectors=targetCandidates[index]||[steps[index].selector];
 for(const selector of selectors){
  const node=document.querySelector(selector);
  if(node&&node.getBoundingClientRect().width>0&&node.getBoundingClientRect().height>0)return node;
 }
 return selectors.length?document.querySelector(selectors[0]):null;
}
function overlap(a,b){return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))}
function placeGuide(){
 if(!root||!isDesktop())return;
 if(dockChoice!=='auto'){root.dataset.tourSide=dockChoice;return}
 const panelWidth=Math.min(420,window.innerWidth-32),panelHeight=Math.min(560,window.innerHeight-118);
 const right={left:window.innerWidth-panelWidth-18,right:window.innerWidth-18,top:94,bottom:94+panelHeight};
 const left={left:18,right:18+panelWidth,top:94,bottom:94+panelHeight};
 const tgt=target()?.getBoundingClientRect(),side=document.querySelector('.workspace .sidebar')?.getBoundingClientRect();
 const penalty=area=>(tgt?overlap(area,tgt):0)+(side?overlap(area,side)*0.4:0);
 root.dataset.tourSide=penalty(left)+4000<penalty(right)?'left':'right';
}
function scrollToTarget(stepIndex=index){
 if(!isDesktop()||!active||index!==stepIndex||minimized)return;
 const node=target();if(!node)return;
 const b=node.getBoundingClientRect();
 if(b.bottom<155||b.top>window.innerHeight-125||b.top<90){
  node.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'center',inline:'nearest'});
 }
}

function highlight(){
 if(highlighted){highlighted.classList.remove('ct-tour-highlight');highlighted=null}
 if(!active)return;
 const node=target();
 if(node&&!node.closest('#ct-tour')){node.classList.add('ct-tour-highlight');highlighted=node}
 placeGuide();
}
function route(){
 const step=steps[index],hash=step.route,expected=index;
 // Entrer automatiquement dans le seul carnet FICTIF lors de la visite guidée.
 // Cela n'ouvre aucun compte réel et ne demande ni PIN ni données personnelles.
 if(step.enterDemoPortal&&!tourDemoEntered){
  // La visite installe le carnet fictif une fois ; elle ne lit pas un compte réel.
  if(location.hash!=='#eleve/accueil')location.hash='#eleve/accueil';
  window.setTimeout(()=>{
   if(!active||index!==expected)return;
   const button=document.querySelector('[data-action="portal-demo"]');
   if(button){button.click();tourDemoEntered=true}
  },190);
 }else if(location.hash!==hash)location.hash=hash;
 window.setTimeout(()=>{if(active&&index===expected){highlight();scrollToTarget(expected)}},370);
 window.setTimeout(()=>{if(active&&index===expected)highlight()},630);
}
function mobileCard(step,last){
 return '<div class="ct-tour-mobile">'+
  (showList?
   '<div class="ct-tour-mobile-list-head"><strong>Choisissez une étape</strong><button type="button" data-tour="list">Retour à la visite</button></div>'+
   '<div class="ct-tour-mobile-list">'+steps.map((v,i)=>'<button type="button" data-tour="jump" data-step="'+i+'" class="ct-tour-mobile-list-item'+(i===index?' active':'')+'" '+(i===index?'aria-current="step"':'')+'><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+v.title+'</strong><span class="ct-tour-mobile-list-arrow">›</span></button>').join('')+'</div>':
   '<div class="ct-tour-mobile-main"><div class="ct-tour-mobile-kicker">'+step.icon+' · '+step.phase+' · ÉTAPE '+String(index+1).padStart(2,'0')+' / '+steps.length+'</div>'+
   '<h2>'+step.title+'</h2><p>'+step.body+'</p>'+
   '<div class="ct-tour-mobile-hint"><span aria-hidden="true">☝</span><div><strong>À essayer dans CORTEX</strong><p>'+step.task+'</p></div></div></div>'+
   '<div class="ct-tour-mobile-primary"><button type="button" class="ct-tour-mobile-explore" data-tour="visit">Explorer cet écran <span aria-hidden="true">↗</span></button><button type="button" class="ct-tour-mobile-next" data-tour="'+(last?'finish':'next')+'">'+(last?'Terminer ✓':'Suivant →')+'</button></div>'+
   '<div class="ct-tour-mobile-options"><button type="button" data-tour="previous" '+(index===0?'disabled':'')+'>← Retour</button><button type="button" data-tour="list">Toutes les étapes</button><button type="button" data-tour="minimize">Réduire ↑</button></div>'+
   (last?'<a class="ct-tour-mobile-academy" href="../evaluations-academie/">Prévisualiser CORTEX Académie (accès restreint) ↗</a>':'')
 )+'</div>';
}
function content(){
 const step=steps[index],first=index===0,last=index===steps.length-1,percent=Math.round(100*(index+1)/steps.length);
 const dots=steps.map((s,i)=>'<button type="button" class="ct-tour-step'+(i===index?' active':'')+(i<index?' visited':'')+'" data-tour="jump" data-step="'+i+'" aria-label="Aller à l’étape '+(i+1)+' : '+s.title+'" '+(i===index?'aria-current="step"':'')+'>'+(i+1)+'</button>').join('');
 return '<div class="ct-tour-top"><span class="ct-tour-mark">✦</span><div class="ct-tour-top-copy"><strong>VISITE GUIDÉE CORTEX</strong><small>Étape '+(index+1)+' sur '+steps.length+' · '+percent+' %</small></div><button class="ct-tour-icon-button" type="button" data-tour="minimize" aria-label="'+(minimized?'Développer':'Réduire')+' la visite">'+(minimized?'▣':'—')+'</button><button class="ct-tour-icon-button" type="button" data-tour="close" aria-label="Quitter la visite guidée">×</button></div>'+
 (minimized?
 '<div class="ct-tour-minibar"><div class="ct-tour-minibar-label"><small>ÉTAPE '+(index+1)+' / '+steps.length+'</small><strong>'+step.title+'</strong></div><button type="button" class="ct-tour-mini-help" data-tour="minimize"><span class="ct-tour-mini-desktop-label">↥ Reprendre</span><span class="ct-tour-mini-mobile-label">Aide</span></button><button type="button" class="ct-tour-mini-next" data-tour="'+(last?'finish':'next')+'">'+(last?'Fin ✓':'Suite →')+'</button></div>':
 '<div class="ct-tour-progress" role="progressbar" aria-label="Progression de la visite" aria-valuemin="0" aria-valuemax="'+steps.length+'" aria-valuenow="'+(index+1)+'"><span style="width:'+percent+'%"></span></div>'+
 '<div class="ct-tour-desktop">'+
 '<div class="ct-tour-stepbar"><span class="ct-tour-step-label">PARCOURS · '+String(index+1).padStart(2,'0')+' / '+steps.length+'</span><button type="button" class="ct-tour-plan-button" data-tour="list" aria-expanded="'+showList+'">'+(showList?'← Retour à l’étape':'☷ Voir les '+steps.length+' étapes')+'</button></div>'+
 (showList?
  '<div class="ct-tour-desktop-plan" role="group" aria-label="Sommaire du parcours">'+steps.map((item,i)=>'<button type="button" data-tour="jump" data-step="'+i+'" class="ct-tour-plan-item'+(i===index?' active':'')+'" '+(i===index?'aria-current="step"':'')+'><span class="ct-tour-plan-number">'+String(i+1).padStart(2,'0')+'</span><span class="ct-tour-plan-title">'+item.title+'</span><span class="ct-tour-plan-arrow" aria-hidden="true">'+(i===index?'●':'›')+'</span></button>').join('')+'</div>':
  '<div class="ct-tour-main"><div class="ct-tour-kicker"><span>'+step.icon+'</span> '+step.eyebrow+'</div><h2 id="ct-tour-title" tabindex="-1">'+step.title+'</h2><p>'+step.body+'</p><div class="ct-tour-task"><span aria-hidden="true">➜</span><div><strong>À essayer sur la page</strong><p>'+step.task+'</p></div></div></div>'+
  '<div class="ct-tour-desktop-hint"><span class="ct-tour-hint-pulse" aria-hidden="true"></span><span>L’élément à découvrir est entouré en rose. Vous pouvez cliquer directement dessus.</span></div>')+
 '<div class="ct-tour-actions"><button type="button" class="ct-tour-secondary" data-tour="previous" '+(first?'disabled':'')+'>← Retour</button><button type="button" class="ct-tour-visit" data-tour="visit">Essayer sur la page ↗</button><button type="button" class="ct-tour-next" data-tour="'+(last?'finish':'next')+'">'+(last?'Terminer ✓':'Suivant →')+'</button></div>'+
 '<div class="ct-tour-desktop-foot"><button type="button" class="ct-tour-dock" data-tour="dock">⇄ Déplacer le guide</button><span>Clavier : ← → pour naviguer · Échap pour fermer</span></div>'+
 (last?'<a class="ct-tour-academy" href="../evaluations-academie/">Prévisualiser CORTEX Académie (accès restreint) ↗</a>':'')+'</div>'+mobileCard(step,last));
}
function draw(){
 if(!active)return;
 if(!root){root=document.createElement('section');root.id='ct-tour';root.className='ct-tour';root.setAttribute('role','region');root.setAttribute('aria-label','Visite guidée interactive');document.body.append(root)}
 root.classList.toggle('ct-tour-minimized',minimized);
 root.dataset.tourSide=dockChoice==='left'?'left':'right';
 root.innerHTML=content();store();highlight();
}
function jump(n){index=clamp(n);minimized=false;showList=false;draw();route()}
function start(){if(!active){refocus=document.activeElement}active=true;index=0;minimized=false;showList=false;tourDemoEntered=false;jump(0);const close=root?.querySelector('[data-tour="close"]');close?.focus?.()}
function close(){active=false;minimized=false;showList=false;store();if(highlighted){highlighted.classList.remove('ct-tour-highlight');highlighted=null}if(root){root.remove();root=null}document.getElementById('ct-tour-launch')?.focus?.()}
function handle(action,el){
 if(action==='close'||action==='finish'){close();return}
 if(action==='minimize'){minimized=!minimized;showList=false;draw();return}
 if(action==='dock'){dockChoice=(root?.dataset.tourSide==='right'?'left':'right');draw();return}
 if(action==='list'){showList=!showList;draw();root?.querySelector('[data-tour="list"]')?.focus?.();if(showList&&isDesktop())root?.querySelector('.ct-tour-desktop-plan [aria-current="step"]')?.scrollIntoView?.({block:'nearest'});return}
 if(action==='visit'){const step=steps[index];route();highlight();minimized=true;showList=false;draw();window.setTimeout(()=>{const node=target();if(node&&typeof node.scrollIntoView==='function')node.scrollIntoView({behavior:'smooth',block:'start'});if(step.openTarget&&node?.matches?.('#cortex-albert-person'))node.click();},270);return}
 if(action==='previous'){jump(index-1);if(isDesktop())root?.querySelector('#ct-tour-title')?.focus?.();return}
 if(action==='next'){jump(index+1);if(isDesktop())root?.querySelector('#ct-tour-title')?.focus?.();return}
 if(action==='jump'){jump(Number(el.dataset.step)||0);if(isDesktop())root?.querySelector('#ct-tour-title')?.focus?.();return}
}
document.addEventListener('click',event=>{
 const launcher=event.target.closest('[data-tour-launch]');
 if(launcher){event.preventDefault();start();return}
 const el=event.target.closest('#ct-tour [data-tour]');
 if(el){event.preventDefault();handle(el.dataset.tour,el)}
});
document.addEventListener('keydown',event=>{
 if(!active)return;
 const within=document.activeElement?.closest?.('#ct-tour');
 if(event.key==='Escape'&&within){event.preventDefault();close();return}
 if(!isDesktop()||!within||event.altKey||event.ctrlKey||event.metaKey)return;
 const tag=document.activeElement?.tagName;
 if(['INPUT','TEXTAREA','SELECT'].includes(tag)||document.activeElement?.isContentEditable)return;
 if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
  event.preventDefault();jump(index+(event.key==='ArrowRight'?1:-1));
  root?.querySelector('#ct-tour-title')?.focus?.();
 }
});
window.addEventListener('hashchange',()=>{if(active)window.setTimeout(highlight,90)});
const existing=read();
if(location.hash==='#visite'||location.hash==='#demonstration'){start()}
else if(existing&&Number.isInteger(existing.index)){active=true;index=clamp(existing.index);minimized=!!existing.minimized;dockChoice=['left','right'].includes(existing.dockChoice)?existing.dockChoice:'auto';draw();route()}
window.CORTEX_TOUR={start,stop:close,steps:steps.length,sections:[...new Set(steps.map(step=>step.phase))]};
})();
