/* CORTEX — parcours guidé autonome de la démonstration, sans collecte ni serveur. */
(function cortexGuidedTour(){
'use strict';
const STORAGE='cortex-tour-v1';
const steps=[
 {title:'Bienvenue dans CORTEX',eyebrow:'Découvrir la plateforme',route:'#accueil',icon:'✦',selector:'.home-hero',body:'CORTEX accompagne tout le cycle de l’évaluation : préparer un sujet, organiser une classe, faire passer un contrôle, corriger et analyser les résultats.',task:'Commencez par découvrir l’environnement. Ici, tous les élèves et les notes sont fictifs : aucun compte n’est nécessaire.'},
 {title:'Le tableau de bord professeur',eyebrow:'Votre point de départ',route:'#professeur/dashboard',icon:'▦',selector:'.workspace-main',body:'Visualisez rapidement vos contrôles, vos copies et les indicateurs de suivi. Le menu professeur donne accès à toutes les fonctions.',task:'Repérez la navigation latérale sur ordinateur ou la barre de navigation sur mobile.'},
 {title:'Organiser les classes',eyebrow:'Classes et demi-groupes',route:'#professeur/classes',icon:'▣',selector:'.workspace-main',body:'Créez, renommez ou archivez vos classes, puis séparez-les en demi-groupes 1 et 2 lorsque c’est nécessaire. Les copies existantes restent associées à leur classe.',task:'Ouvrez une classe pour voir ses groupes, ses contrôles et les options de gestion.'},
 {title:'Créer un contrôle',eyebrow:'Questions et barème',route:'#professeur/creer',icon:'＋',selector:'.workspace-main',body:'Composez un contrôle avec énoncés, questions ouvertes ou QCM, documents et points. Les modifications se font dans l’éditeur.',task:'Examinez les différents champs de l’éditeur. Vous pouvez créer un sujet fictif et l’enregistrer uniquement dans ce navigateur.'},
 {title:'Importer un PDF ou Word',eyebrow:'Documents pédagogiques',route:'#professeur/import',icon:'⇪',selector:'.workspace-main',body:'Vous pouvez partir d’un document PDF ou Word et l’associer aux questions pour que l’élève consulte les bonnes ressources pendant son contrôle.',task:'Repérez l’importation du document et les outils de sélection des extraits. Cette démonstration utilise des fichiers locaux.'},
 {title:'Publier et partager le contrôle',eyebrow:'Affectation et QR code',route:'#professeur/controles',icon:'▤',selector:'#exam-tiles',body:'Après création, publiez le contrôle puis affectez-le à une classe ou à un groupe pour générer un QR code. L’accès n’est pas ouvert tant que le contrôle n’est pas publié.',task:'Sur le contrôle « Sommeil », cliquez sur « QR codes » ou « Tester ». L’option « Simuler le scan » permet de voir l’accès élève.'},
 {title:'Comprendre le PIN élève',eyebrow:'Accès individuel',route:'#professeur/codes',icon:'⌑',selector:'.workspace-main',body:'Chaque élève utilise son numéro sur la liste et un PIN personnel de six chiffres. Le professeur peut réinitialiser un PIN sans supprimer les copies.',task:'Examinez le panneau PIN élèves. Dans cette démo, ces codes ne sont pas synchronisés entre différents appareils.'},
 {title:'Se mettre à la place de l’élève',eyebrow:'Passation et documents',route:'#eleve/accueil',icon:'✎',selector:'.student-shell',body:'Le parcours élève permet de rejoindre sa classe, répondre aux questions, consulter les documents et remettre sa copie. Dans « Mon CORTEX », l’élève retrouve ses notes et corrections après publication par le professeur, ainsi que ses moyennes par période.',task:'Pour faire un contrôle de bout en bout, utilisez d’abord le QR du professeur et « Simuler le scan » ; l’accès par PIN s’effectue ensuite côté élève.'},
 {title:'Retrouver et corriger les copies',eyebrow:'Notes et corrections',route:'#professeur/copies',icon:'✓',selector:'.workspace-main',body:'Les copies sont classées par classe et groupe. Vous pouvez consulter les réponses et documents sources, attribuer des points, publier la correction pour l’élève puis télécharger une copie ou un lot en PDF.',task:'Ouvrez la « copie PDF de démonstration » pour expérimenter la correction question par question.'},
 {title:'Suivre les épreuves',eyebrow:'Observations en temps réel local',route:'#professeur/suivi',icon:'◷',selector:'.workspace-main',body:'Le suivi présente les copies en cours, les remises et les interruptions signalées par le navigateur. Une interruption n’est pas une preuve de triche.',task:'Repérez les indicateurs et le journal des événements. Dans la démo, ce suivi fonctionne uniquement sur votre appareil.'},
 {title:'Analyser les résultats',eyebrow:'Remédiation pédagogique',route:'#professeur/analyses',icon:'▥',selector:'.workspace-main',body:'Retrouvez les moyennes, les répartitions de notes et les indicateurs utiles pour identifier les points à retravailler avec les élèves.',task:'Testez les filtres par classe lorsque plusieurs contrôles fictifs sont disponibles.'},
 {title:'Paramétrer l’anti-triche',eyebrow:'Contrôles adaptés aux élèves',route:'#professeur/integrite',icon:'◈',selector:'#integrity-controls',body:'Chaque contrôle dispose de boutons indépendants pour le collage, la copie, les sorties de page, les avertissements et le filigrane IA. Les événements restent des indices à vérifier.',task:'Choisissez le contrôle puis testez le bouton Activer / Désactiver de chaque outil. Le filigrane ne bloque pas les captures d’écran ni les IA.'},
 {title:'Vous avez exploré CORTEX',eyebrow:'Fin de la visite',route:'#accueil',icon:'★',selector:'.home-hero',body:'Vous connaissez maintenant les principaux espaces de la plateforme. Revenez librement à n’importe quelle rubrique pour refaire une démonstration.',task:'La démonstration fonctionne uniquement dans votre navigateur. CORTEX Académie possède des services Supabase distincts pour les comptes, classes, contrôles et copies ; leur usage scolaire nécessite une validation institutionnelle.'}
];
let active=false,index=0,minimized=false,showList=false,root=null,highlighted=null,refocus=null,dockChoice='auto';
const clamp=n=>Math.max(0,Math.min(steps.length-1,n));
function read(){try{return JSON.parse(sessionStorage.getItem(STORAGE)||'null')}catch{return null}}
function store(){try{if(active)sessionStorage.setItem(STORAGE,JSON.stringify({index,minimized,dockChoice}));else sessionStorage.removeItem(STORAGE)}catch{}}
// Cibler un véritable élément à découvrir, pas toute la page quand c'est possible.
const targetCandidates=[
 ['.home-hero .hero-copy','.home-hero'],
 ['.workspace-main .stats','.workspace-main .page-head','.workspace-main'],
 ['.classes-page .class-grid','.classes-page .page-head','.workspace-main'],
 ['.ed-workspace .ed-configuration','.ed-workspace .ed-layout','.ed-workspace','.workspace-main'],
 ['.visual-import-drop','.visual-import-start','.workspace-main'],
 ['#exam-tiles .tile','#exam-tiles','.workspace-main'],
 ['.access-grid .access-card','.access-intro','.workspace-main'],
 ['.portal-login-form','.portal-root','.student-shell'],
 ['.workspace-main .table-wrap','.workspace-main .panel','.workspace-main'],
 ['.workspace-main .stats','.workspace-main .two-col','.workspace-main'],
 ['.workspace-main .stats','.workspace-main .two-col','.workspace-main'],
 ['#integrity-tool-panel','#integrity-controls','.integrity-page'],
 ['.home-hero .hero-copy','.home-hero']
];
const isDesktop=()=>window.matchMedia?.('(min-width:761px) and (pointer:fine)').matches===true;
function target(){
 const selectors=targetCandidates[index]||[steps[index].selector];
 for(const selector of selectors){
  const node=document.querySelector(selector);
  if(node&&node.getBoundingClientRect().width>0&&node.getBoundingClientRect().height>0)return node;
 }
 return document.querySelector(steps[index].selector);
}
function overlap(a,b){return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))}
function placeGuide(){
 if(!root||!isDesktop())return;
 if(dockChoice!=='auto'){root.dataset.tourSide=dockChoice;return}
 const panelWidth=Math.min(420,window.innerWidth-32),panelHeight=Math.min(560,window.innerHeight-118);
 const right={left:window.innerWidth-panelWidth-18,right:window.innerWidth-18,top:94,bottom:94+panelHeight};
 const left={left:18,right:18+panelWidth,top:94,bottom:94+panelHeight};
 const tgt=target()?.getBoundingClientRect(),side=document.querySelector('.workspace .sidebar')?.getBoundingClientRect();
 const penalty=area=>(tgt?overlap(area,tgt):0)+(side?overlap(area,side)*1.25:0);
 root.dataset.tourSide=penalty(left)+4000<penalty(right)?'left':'right';
}
function scrollToTarget(stepIndex=index){
 if(!active||index!==stepIndex||minimized)return;
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
 const hash=steps[index].route,expected=index;
 if(location.hash!==hash)location.hash=hash;
 window.setTimeout(()=>{if(active&&index===expected){highlight();scrollToTarget(expected)}},130);
 window.setTimeout(()=>{if(active&&index===expected)highlight()},410);
}
const mobileHints=[
 ['La découverte commence ici.','Découvrez les trois accès : professeur, élève et démonstration.'],
 ['Votre tableau de bord central.','Repérez les raccourcis et le menu professeur.'],
 ['Toutes les classes au même endroit.','Ouvrez une classe pour voir les groupes.'],
 ['Vos questions et votre barème.','Essayez de créer une question fictive.'],
 ['Vos documents de travail.','Repérez le bouton pour importer un PDF ou Word.'],
 ['Le contrôle et son QR code.','Ouvrez le contrôle Sommeil, puis son QR code.'],
 ['Les accès personnels des élèves.','Découvrez les PIN et leur réinitialisation.'],
 ['La plateforme vue par un élève.','Simulez un scan de QR code depuis un contrôle.'],
 ['Corriger et publier les notes.','Ouvrez la copie PDF de démonstration.'],
 ['Voir le déroulement des épreuves.','Regardez les indicateurs de suivi.'],
 ['Comprendre les résultats.','Explorez les moyennes et les filtres.'],
 ['Des protections selon vos besoins.','Testez les interrupteurs des outils anti-triche.'],
 ['Vous savez naviguer dans CORTEX !','Terminez ou retournez dans CORTEX Académie.']
];
function mobileCard(step,last){
 const hint=mobileHints[index];
 return '<div class="ct-tour-mobile">'+
  (showList?
   '<div class="ct-tour-mobile-list-head"><strong>Choisissez une étape</strong><button type="button" data-tour="list">Retour à la visite</button></div>'+
   '<div class="ct-tour-mobile-list">'+steps.map((v,i)=>'<button type="button" data-tour="jump" data-step="'+i+'" class="ct-tour-mobile-list-item'+(i===index?' active':'')+'" '+(i===index?'aria-current="step"':'')+'><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+v.title+'</strong><span class="ct-tour-mobile-list-arrow">›</span></button>').join('')+'</div>':
   '<div class="ct-tour-mobile-main"><div class="ct-tour-mobile-kicker">'+step.icon+' · ÉTAPE '+String(index+1).padStart(2,'0')+' / '+steps.length+'</div>'+
   '<h2>'+step.title+'</h2><p>'+hint[0]+'</p>'+
   '<div class="ct-tour-mobile-hint"><span aria-hidden="true">☝</span><div><strong>Ce que vous pouvez essayer</strong><p>'+hint[1]+'</p></div></div></div>'+
   '<div class="ct-tour-mobile-primary"><button type="button" class="ct-tour-mobile-explore" data-tour="visit">Explorer cet écran <span aria-hidden="true">↗</span></button><button type="button" class="ct-tour-mobile-next" data-tour="'+(last?'finish':'next')+'">'+(last?'Terminer ✓':'Suivant →')+'</button></div>'+
   '<div class="ct-tour-mobile-options"><button type="button" data-tour="previous" '+(index===0?'disabled':'')+'>← Retour</button><button type="button" data-tour="list">Toutes les étapes</button><button type="button" data-tour="minimize">Réduire ↑</button></div>'+
   (last?'<a class="ct-tour-mobile-academy" href="../evaluations-academie/">Retour à CORTEX Académie ↗</a>':'')
 )+'</div>';
}
function content(){
 const step=steps[index],first=index===0,last=index===steps.length-1,percent=Math.round(100*(index+1)/steps.length);
 const dots=steps.map((s,i)=>'<button type="button" class="ct-tour-step'+(i===index?' active':'')+(i<index?' visited':'')+'" data-tour="jump" data-step="'+i+'" aria-label="Aller à l’étape '+(i+1)+' : '+s.title+'" '+(i===index?'aria-current="step"':'')+'>'+(i+1)+'</button>').join('');
 return '<div class="ct-tour-top"><span class="ct-tour-mark">✦</span><div class="ct-tour-top-copy"><strong>VISITE GUIDÉE CORTEX</strong><small>Étape '+(index+1)+' sur '+steps.length+' · '+percent+' %</small></div><button class="ct-tour-icon-button" type="button" data-tour="minimize" aria-label="'+(minimized?'Développer':'Réduire')+' la visite">'+(minimized?'▣':'—')+'</button><button class="ct-tour-icon-button" type="button" data-tour="close" aria-label="Quitter la visite guidée">×</button></div>'+
 (minimized?
 '<div class="ct-tour-minibar"><div class="ct-tour-minibar-label"><small>ÉTAPE '+(index+1)+' / '+steps.length+'</small><strong>'+step.title+'</strong></div><button type="button" class="ct-tour-mini-help" data-tour="minimize">Aide</button><button type="button" class="ct-tour-mini-next" data-tour="'+(last?'finish':'next')+'">'+(last?'Fin ✓':'Suite →')+'</button></div>':
 '<div class="ct-tour-progress" role="progressbar" aria-label="Progression de la visite" aria-valuemin="0" aria-valuemax="'+steps.length+'" aria-valuenow="'+(index+1)+'"><span style="width:'+percent+'%"></span></div>'+
 '<div class="ct-tour-desktop">'+
 '<div class="ct-tour-stepbar"><span class="ct-tour-step-label">PARCOURS · '+String(index+1).padStart(2,'0')+' / '+steps.length+'</span><button type="button" class="ct-tour-plan-button" data-tour="list" aria-expanded="'+showList+'">'+(showList?'← Retour à l’étape':'☷ Voir les 13 étapes')+'</button></div>'+
 (showList?
  '<div class="ct-tour-desktop-plan" role="group" aria-label="Sommaire du parcours">'+steps.map((item,i)=>'<button type="button" data-tour="jump" data-step="'+i+'" class="ct-tour-plan-item'+(i===index?' active':'')+'" '+(i===index?'aria-current="step"':'')+'><span class="ct-tour-plan-number">'+String(i+1).padStart(2,'0')+'</span><span class="ct-tour-plan-title">'+item.title+'</span><span class="ct-tour-plan-arrow" aria-hidden="true">'+(i===index?'●':'›')+'</span></button>').join('')+'</div>':
  '<div class="ct-tour-main"><div class="ct-tour-kicker"><span>'+step.icon+'</span> '+step.eyebrow+'</div><h2 id="ct-tour-title" tabindex="-1">'+step.title+'</h2><p>'+step.body+'</p><div class="ct-tour-task"><span aria-hidden="true">➜</span><div><strong>À essayer sur la page</strong><p>'+step.task+'</p></div></div></div>'+
  '<div class="ct-tour-desktop-hint"><span class="ct-tour-hint-pulse" aria-hidden="true"></span><span>L’élément à découvrir est entouré en rose. Vous pouvez cliquer directement dessus.</span></div>')+
 '<div class="ct-tour-actions"><button type="button" class="ct-tour-secondary" data-tour="previous" '+(first?'disabled':'')+'>← Retour</button><button type="button" class="ct-tour-visit" data-tour="visit">Essayer sur la page ↗</button><button type="button" class="ct-tour-next" data-tour="'+(last?'finish':'next')+'">'+(last?'Terminer ✓':'Suivant →')+'</button></div>'+
 '<div class="ct-tour-desktop-foot"><button type="button" class="ct-tour-dock" data-tour="dock">⇄ Déplacer le guide</button><span>Clavier : ← → pour naviguer · Échap pour fermer</span></div>'+
 (last?'<a class="ct-tour-academy" href="../evaluations-academie/">Revenir à CORTEX Académie ↗</a>':'')+'</div>'+mobileCard(step,last));
}
function draw(){
 if(!active)return;
 if(!root){root=document.createElement('section');root.id='ct-tour';root.className='ct-tour';root.setAttribute('role','region');root.setAttribute('aria-label','Visite guidée interactive');document.body.append(root)}
 root.classList.toggle('ct-tour-minimized',minimized);
 root.dataset.tourSide=dockChoice==='left'?'left':'right';
 root.innerHTML=content();store();highlight();
}
function jump(n){index=clamp(n);minimized=false;showList=false;draw();route()}
function start(){if(!active){refocus=document.activeElement}active=true;index=0;minimized=false;showList=false;jump(0);const close=root?.querySelector('[data-tour="close"]');close?.focus?.()}
function close(){active=false;minimized=false;showList=false;store();if(highlighted){highlighted.classList.remove('ct-tour-highlight');highlighted=null}if(root){root.remove();root=null}document.getElementById('ct-tour-launch')?.focus?.()}
function handle(action,el){
 if(action==='close'||action==='finish'){close();return}
 if(action==='minimize'){minimized=!minimized;showList=false;draw();return}
 if(action==='dock'){dockChoice=(root?.dataset.tourSide==='right'?'left':'right');draw();return}
 if(action==='list'){showList=!showList;draw();root?.querySelector('[data-tour="list"]')?.focus?.();return}
 if(action==='visit'){route();highlight();minimized=true;showList=false;draw();window.setTimeout(()=>{const node=target();if(node&&typeof node.scrollIntoView==='function')node.scrollIntoView({behavior:'smooth',block:'start'});},160);return}
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
else if(existing&&Number.isInteger(existing.index)){active=true;index=clamp(existing.index);minimized=!!existing.minimized;dockChoice=['left','right'].includes(existing.dockChoice)?existing.dockChoice:'auto';draw()}
window.CORTEX_TOUR={start,stop:close,steps:steps.length};
})();
