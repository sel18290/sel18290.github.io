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
 {title:'Se mettre à la place de l’élève',eyebrow:'Passation et documents',route:'#eleve/accueil',icon:'✎',selector:'.student-shell',body:'Le parcours élève permet de rejoindre sa classe, répondre à des QCM ou rédiger des réponses, consulter les documents et remettre la copie.',task:'Pour faire un contrôle de bout en bout, utilisez d’abord le QR du professeur et « Simuler le scan » ; l’accès par PIN s’effectue ensuite côté élève.'},
 {title:'Retrouver et corriger les copies',eyebrow:'Notes et corrections',route:'#professeur/copies',icon:'✓',selector:'.workspace-main',body:'Les copies sont classées par classe et groupe. Vous pouvez consulter les réponses, les documents sources, attribuer des points puis télécharger une copie ou un lot en PDF.',task:'Ouvrez la « copie PDF de démonstration » pour expérimenter la correction question par question.'},
 {title:'Suivre les épreuves',eyebrow:'Observations en temps réel local',route:'#professeur/suivi',icon:'◷',selector:'.workspace-main',body:'Le suivi présente les copies en cours, les remises et les interruptions signalées par le navigateur. Une interruption n’est pas une preuve de triche.',task:'Repérez les indicateurs et le journal des événements. Dans la démo, ce suivi fonctionne uniquement sur votre appareil.'},
 {title:'Analyser les résultats',eyebrow:'Remédiation pédagogique',route:'#professeur/analyses',icon:'▥',selector:'.workspace-main',body:'Retrouvez les moyennes, les répartitions de notes et les indicateurs utiles pour identifier les points à retravailler avec les élèves.',task:'Testez les filtres par classe lorsque plusieurs contrôles fictifs sont disponibles.'},
 {title:'Paramétrer l’anti-triche',eyebrow:'Contrôles adaptés aux élèves',route:'#professeur/integrite',icon:'◈',selector:'#integrity-controls',body:'Chaque contrôle dispose de boutons indépendants pour le collage, la copie, les sorties de page, les avertissements et le filigrane IA. Les événements restent des indices à vérifier.',task:'Choisissez le contrôle puis testez le bouton Activer / Désactiver de chaque outil. Le filigrane ne bloque pas les captures d’écran ni les IA.'},
 {title:'Vous avez exploré CORTEX',eyebrow:'Fin de la visite',route:'#accueil',icon:'★',selector:'.home-hero',body:'Vous connaissez maintenant les principaux espaces de la plateforme. Revenez librement à n’importe quelle rubrique pour refaire une démonstration.',task:'CORTEX Académie stocke déjà les comptes, classes et paramètres des évaluations dans Supabase. La passation et les copies côté élèves ne sont pas encore reliées au serveur : n’utilisez pas de vraies données scolaires.'}
];
let active=false,index=0,minimized=false,root=null,highlighted=null,refocus=null;
const clamp=n=>Math.max(0,Math.min(steps.length-1,n));
function read(){try{return JSON.parse(sessionStorage.getItem(STORAGE)||'null')}catch{return null}}
function store(){try{if(active)sessionStorage.setItem(STORAGE,JSON.stringify({index,minimized}));else sessionStorage.removeItem(STORAGE)}catch{}}
function target(){return document.querySelector(steps[index].selector)}
function highlight(){
 if(highlighted){highlighted.classList.remove('ct-tour-highlight');highlighted=null}
 if(!active||minimized)return;
 const node=target();
 if(node&&!node.closest('#ct-tour')){node.classList.add('ct-tour-highlight');highlighted=node}
}
function route(){
 const hash=steps[index].route;
 if(location.hash!==hash)location.hash=hash;
 window.setTimeout(highlight,80);
 window.setTimeout(highlight,320);
}
function content(){
 const step=steps[index],first=index===0,last=index===steps.length-1,percent=Math.round(100*(index+1)/steps.length);
 const dots=steps.map((s,i)=>'<button type="button" class="ct-tour-step'+(i===index?' active':'')+(i<index?' visited':'')+'" data-tour="jump" data-step="'+i+'" aria-label="Aller à l’étape '+(i+1)+' : '+s.title+'" '+(i===index?'aria-current="step"':'')+'>'+(i+1)+'</button>').join('');
 return '<div class="ct-tour-top"><span class="ct-tour-mark">✦</span><div class="ct-tour-top-copy"><strong>VISITE GUIDÉE CORTEX</strong><small>Étape '+(index+1)+' sur '+steps.length+' · '+percent+' %</small></div><button class="ct-tour-icon-button" type="button" data-tour="minimize" aria-label="'+(minimized?'Développer':'Réduire')+' la visite">'+(minimized?'▣':'—')+'</button><button class="ct-tour-icon-button" type="button" data-tour="close" aria-label="Quitter la visite guidée">×</button></div>'+
 (minimized?'<button type="button" class="ct-tour-resume" data-tour="minimize">Continuer la visite : '+step.title+' ↗</button>':
 '<div class="ct-tour-progress" role="progressbar" aria-label="Progression de la visite" aria-valuemin="0" aria-valuemax="'+steps.length+'" aria-valuenow="'+(index+1)+'"><span style="width:'+percent+'%"></span></div>'+
 '<div class="ct-tour-main"><div class="ct-tour-kicker"><span>'+step.icon+'</span> '+step.eyebrow+'</div><h2>'+step.title+'</h2><p>'+step.body+'</p><div class="ct-tour-task"><span aria-hidden="true">➜</span><div><strong>À découvrir</strong><p>'+step.task+'</p></div></div></div>'+
 '<div class="ct-tour-dots" role="group" aria-label="Étapes de la visite">'+dots+'</div>'+
 '<div class="ct-tour-actions"><button type="button" class="ct-tour-secondary" data-tour="previous" '+(first?'disabled':'')+'>← Précédent</button><button type="button" class="ct-tour-visit" data-tour="visit">Voir cette section ↗</button><button type="button" class="ct-tour-next" data-tour="'+(last?'finish':'next')+'">'+(last?'Terminer ✓':'Suivant →')+'</button></div>'+
 (last?'<a class="ct-tour-academy" href="../evaluations-academie/">Revenir à CORTEX Académie ↗</a>':''));
}
function draw(){
 if(!active)return;
 if(!root){root=document.createElement('section');root.id='ct-tour';root.className='ct-tour';root.setAttribute('role','region');root.setAttribute('aria-label','Visite guidée interactive');document.body.append(root)}
 root.classList.toggle('ct-tour-minimized',minimized);
 root.innerHTML=content();store();highlight();
}
function jump(n){index=clamp(n);minimized=false;draw();route()}
function start(){if(!active){refocus=document.activeElement}active=true;index=0;minimized=false;jump(0);const close=root?.querySelector('[data-tour="close"]');close?.focus?.()}
function close(){active=false;minimized=false;store();if(highlighted){highlighted.classList.remove('ct-tour-highlight');highlighted=null}if(root){root.remove();root=null}document.getElementById('ct-tour-launch')?.focus?.()}
function handle(action,el){
 if(action==='close'||action==='finish'){close();return}
 if(action==='minimize'){minimized=!minimized;draw();return}
 if(action==='visit'){route();highlight();minimized=true;draw();return}
 if(action==='previous'){jump(index-1);return}
 if(action==='next'){jump(index+1);return}
 if(action==='jump'){jump(Number(el.dataset.step)||0);return}
}
document.addEventListener('click',event=>{
 const launcher=event.target.closest('[data-tour-launch]');
 if(launcher){event.preventDefault();start();return}
 const el=event.target.closest('#ct-tour [data-tour]');
 if(el){event.preventDefault();handle(el.dataset.tour,el)}
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active&&document.activeElement?.closest?.('#ct-tour')){event.preventDefault();close()}});
window.addEventListener('hashchange',()=>{if(active)window.setTimeout(highlight,90)});
const existing=read();
if(location.hash==='#visite'||location.hash==='#demonstration'){start()}
else if(existing&&Number.isInteger(existing.index)){active=true;index=clamp(existing.index);minimized=!!existing.minimized;draw()}
window.CORTEX_TOUR={start,stop:close,steps:steps.length};
})();
