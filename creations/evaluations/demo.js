(function demoModule(){
'use strict';
const KEY='cortex-evaluations-demo-2026-v2';
const docSleep='Un adolescent de 15 à 17 ans a généralement besoin de 8 à 10 heures de sommeil par nuit. Le sommeil intervient dans la récupération, la consolidation de la mémoire et le maintien de la vigilance.';
const seed=[
{id:'sommeil',title:'Le sommeil et les rythmes biologiques',level:'Seconde Bac Pro',chapter:'PSE · A2',duration:45,code:'SOMMEIL26',open:true,doc:docSleep,questions:[
{id:'q1',type:'text',prompt:'Indique deux conséquences possibles d’un manque de sommeil sur la vie scolaire.',points:4},
{id:'q2',type:'choice',prompt:'Combien d’heures de sommeil sont généralement recommandées pour un adolescent ?',choices:['5 à 6 heures','6 à 7 heures','8 à 10 heures','11 à 13 heures'],correct:2,points:4},
{id:'q3',type:'text',prompt:'Explique le rôle du sommeil dans la mémorisation des apprentissages.',points:4},
{id:'q4',type:'text',prompt:'Propose deux habitudes permettant d’améliorer la qualité du sommeil.',points:4},
{id:'q5',type:'choice',prompt:'Quel comportement risque de retarder l’endormissement ?',choices:['Conserver des horaires réguliers','Consulter son téléphone juste avant de dormir','Pratiquer une activité calme','Aérer sa chambre'],correct:1,points:4}
]},
{id:'risques',title:'Prévenir les risques professionnels',level:'CAP 1re année',chapter:'PSE · Prévention',duration:35,code:'RISQUES26',open:true,doc:'Le danger est une source potentielle de dommage. Le risque tient compte de l’exposition au danger et des conséquences possibles. Prévenir un risque consiste notamment à supprimer le danger ou à limiter l’exposition.',questions:[
{id:'r1',type:'text',prompt:'Quelle différence fais-tu entre un danger et un risque ?',points:5},
{id:'r2',type:'choice',prompt:'Quelle mesure est prioritaire dans une démarche de prévention ?',choices:['Supprimer le danger à la source','Distribuer une affiche seulement','Attendre un accident'],correct:0,points:5},
{id:'r3',type:'text',prompt:'Donne deux exemples de protections collectives en milieu professionnel.',points:5},
{id:'r4',type:'text',prompt:'Explique pourquoi le port d’un équipement de protection individuelle ne remplace pas toutes les mesures de prévention.',points:5}
]},
{id:'addictions',title:'Les conduites addictives',level:'Première Bac Pro',chapter:'PSE · Addictions',duration:40,code:'ADDICTIONS26',open:false,doc:'Une addiction est un trouble marqué par une perte de contrôle d’un comportement malgré les conséquences négatives possibles. Les facteurs de risque et de protection peuvent être individuels, sociaux et environnementaux.',questions:[
{id:'a1',type:'text',prompt:'Explique la notion de perte de contrôle.',points:5},
{id:'a2',type:'text',prompt:'Propose deux facteurs de protection contre une conduite addictive.',points:5},
{id:'a3',type:'text',prompt:'Pourquoi les conséquences d’une addiction peuvent-elles dépasser le domaine de la santé ?',points:5},
{id:'a4',type:'text',prompt:'Cite une structure ou une personne ressource pour demander de l’aide.',points:5}
]}];
function makeSeed(){
return {exams:JSON.parse(JSON.stringify(seed)),attempts:[
{id:'ex1',examId:'sommeil',name:'Élève Démo 01',status:'submitted',startedAt:Date.now()-7200000,submittedAt:Date.now()-5500000,answers:{q1:'Fatigue et manque de concentration.',q2:'2',q3:'Le sommeil aide le cerveau à retenir les cours.',q4:'Pas d’écrans le soir et horaires réguliers.',q5:'1'},interruptions:0,grade:15,feedback:'Bonne compréhension générale ; développer les explications.'},
{id:'ex2',examId:'sommeil',name:'Élève Démo 02',status:'submitted',startedAt:Date.now()-7300000,submittedAt:Date.now()-5600000,answers:{q1:'On est fatigué et on réagit moins vite.',q2:'2',q3:'Le cerveau travaille.',q4:'',q5:'1'},interruptions:2,grade:null,feedback:''},
{id:'ex3',examId:'risques',name:'Élève Démo 03',status:'submitted',startedAt:Date.now()-6600000,submittedAt:Date.now()-5600000,answers:{r1:'Le danger est ce qui peut blesser et le risque est lié à l’exposition.',r2:'0',r3:'Barrière de protection et aspiration à la source.',r4:'On doit aussi agir sur le danger.'},interruptions:0,grade:16,feedback:'Explications pertinentes.'}
],events:[{id:'ev1',attemptId:'ex2',kind:'visibility',at:Date.now()-6800000},{id:'ev2',attemptId:'ex2',kind:'visibility',at:Date.now()-6750000}],activeAttemptId:null};
}
function load(){
try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&Array.isArray(v.exams)&&Array.isArray(v.attempts)&&Array.isArray(v.events))return v;}catch(e){}
return makeSeed();
}
let state=load(),view='home',tab='dashboard',currentQuestion=0,editor=null,search='',toastTimer=null,chosenCode='SOMMEIL26';
const root=document.getElementById('app'),toast=document.getElementById('toast'),modal=document.getElementById('modal');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=v=>esc(v);
const sum=exam=>exam.questions.reduce((a,q)=>a+Number(q.points||0),0);
const date=ms=>new Date(ms).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const examBy=id=>state.exams.find(e=>e.id===id);
const attemptBy=id=>state.attempts.find(a=>a.id===id);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){showToast('Stockage local indisponible : les changements ne sont pas conservés.')}};
const btn=(label,action,kind='secondary',extra='')=>`<button type="button" class="btn ${kind} ${extra}" data-action="${action}">${label}</button>`;
const pill=(label,cls='')=>`<span class="status ${cls}">${esc(label)}</span>`;
const short=(v,n=85)=>esc(String(v||'').length>n?String(v).slice(0,n)+'…':v);
function showToast(msg){toast.textContent=msg;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);}
function nav(next,t){const route=next==='home'?'accueil':next==='teacher'?'professeur/'+(t||'dashboard'):'eleve/'+(t||'accueil');location.hash='#'+route;routePage();}
function routePage(){
const bits=decodeURIComponent(location.hash.slice(1)||'accueil').split('/');
view=bits[0]==='professeur'?'teacher':bits[0]==='eleve'?'student':'home';
tab=bits[1]|| (view==='teacher'?'dashboard':'accueil');
render();
}
function header(){
document.querySelectorAll('.top-link').forEach(el=>el.classList.toggle('active',el.dataset.action===view));
}
function render(){
header();
if(view==='teacher')root.innerHTML=teacherShell();
else if(view==='student')root.innerHTML=studentShell();
else root.innerHTML=home();
document.title=(view==='teacher'?'Espace professeur':view==='student'?'Espace élève':'Accueil')+' · CORTEX Évaluations';
}
function home(){
return `<div class="home"><section class="home-hero"><div class="hero-copy"><p class="eyebrow">Biosphère Genesis / Apprendre</p><h1>Évaluer autrement.<br><em>Comprendre davantage.</em></h1><p class="lead">Un espace conçu pour transformer les contrôles en expériences claires, accessibles et pédagogiques. Découvre les deux côtés de CORTEX, librement, sans mot de passe.</p><div class="hero-actions">${btn('Découvrir le profil professeur <span class="button-arrow">↗</span>','teacher','')} ${btn('Essayer côté élève →','student','secondary')}</div><div class="hero-foot"><span>Optimisé iPhone et Android</span><span>Contrôles rédigés et QCM</span><span>Aucune donnée réelle</span></div></div><div class="hero-visual" aria-hidden="true"><div class="visual-grid"></div><div class="visual-orbit"></div><div class="mock-window"><div class="mock-top"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span style="font-size:10px;color:#8da7c0;margin-left:12px">CORTEX / ÉVALUATION</span></div><div class="mock-content"><span class="chip teal">Contrôle en cours</span><div class="mock-line"></div><div class="mock-line"></div><div class="mock-answer"><span style="color:#8dded6;font-size:11px">QUESTION 3 / 5</span><div class="mock-line"></div><div class="mock-line" style="width:80%"></div><div class="mock-progress"></div></div></div></div><div class="floating-card"><small>Progression du contrôle</small><strong>3 / 5</strong></div></div></section>
<section class="home-section"><div class="section-head"><div><p class="eyebrow">Deux parcours · une plateforme</p><h2>Choisis ton espace</h2></div><span class="chip teal">Démo libre · sans compte</span></div><div class="role-grid">
<article class="card role-card prof"><div class="role-icon" aria-hidden="true">▤</div><div><h2>Je suis professeur</h2><p>Un tableau de bord complet pour créer des contrôles, suivre les rendus, repérer les interruptions et corriger les copies.</p></div><div class="btn-row">${btn('Entrer dans l’espace professeur →','teacher','')}<span class="small muted">Accès libre en démo</span></div></article>
<article class="card role-card eleve"><div class="role-icon" aria-hidden="true">✎</div><div><h2>Je suis élève</h2><p>Un parcours simple et agréable pour lire les documents, répondre aux questions, enregistrer sa progression et rendre son contrôle.</p></div><div class="btn-row">${btn('Tester un contrôle →','student','secondary')}<span class="small muted">Code SOMMEIL26</span></div></article></div></section>
<section class="home-section"><div class="section-head"><div><p class="eyebrow">Parcours guidé</p><h2>Trois étapes pour tout découvrir</h2></div></div><div class="mini-steps"><div class="mini-step"><div class="step-n">01</div><h3>Crée un contrôle</h3><p class="muted small">Ajoute tes questions et ton barème dans le profil professeur.</p></div><div class="mini-step"><div class="step-n">02</div><h3>Passe côté élève</h3><p class="muted small">Ouvre le contrôle avec son code et réponds comme dans une vraie évaluation.</p></div><div class="mini-step"><div class="step-n">03</div><h3>Retrouve la copie</h3><p class="muted small">Reviens dans le tableau de bord et consulte le rendu.</p></div></div></section></div>`;
}
const teacherMenu=[['dashboard','▦','Vue d’ensemble'],['controles','▤','Mes contrôles'],['copies','✎','Copies & notes'],['suivi','◷','Suivi des épreuves'],['analyses','▥','Analyses'],['creer','＋','Créer un contrôle']];
function teacherShell(){
const body=tab==='controles'?teacherExams():tab==='copies'?teacherCopies():tab==='suivi'?teacherMonitoring():tab==='analyses'?teacherAnalytics():tab==='creer'?teacherEditor():teacherDashboard();
return `<div class="workspace"><aside class="sidebar"><div class="side-title"><strong>Espace professeur</strong><span>Compte de démonstration</span></div><nav class="side-menu" aria-label="Navigation professeur">${teacherMenu.map(([id,ico,label])=>`<button type="button" class="side-item ${tab===id?'active':''}" data-action="teacher-tab" data-tab="${id}"><span class="side-icon">${ico}</span>${label}</button>`).join('')}</nav><div class="side-bottom">Données fictives, modifiables dans ce navigateur uniquement.<br><br><a href="./ancienne-interface-v04.html">Ancienne interface sauvegardée ↗</a></div></aside><div class="workspace-main">${body}</div></div>`;
}
function pageHead(title,desc,actions=''){return `<div class="page-head"><div><p class="eyebrow">Espace professeur · Démonstration</p><h1>${title}</h1><p>${desc}</p></div><div class="btn-row">${actions}</div></div>`;}
function teacherDashboard(){
const submitted=state.attempts.filter(a=>a.status==='submitted'),corrected=submitted.filter(a=>a.grade!=null),live=state.attempts.filter(a=>a.status==='progress');
return pageHead('Tableau de bord','Tes évaluations et tes copies au même endroit.',btn('＋ Nouveau contrôle','create',''))+
`<div class="stats"><div class="stat"><div class="stat-label">Contrôles disponibles</div><div class="stat-value">${state.exams.length}</div><div class="stat-foot">Bibliothèque de démonstration</div></div><div class="stat"><div class="stat-label">Copies remises</div><div class="stat-value">${submitted.length}</div><div class="stat-foot">Conservées sur cet appareil</div></div><div class="stat"><div class="stat-label">Notes validées</div><div class="stat-value">${corrected.length}</div><div class="stat-foot">Sur ${submitted.length} copies</div></div><div class="stat"><div class="stat-label">Épreuves en cours</div><div class="stat-value">${live.length}</div><div class="stat-foot">Démonstration locale</div></div></div>
<div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Contrôles récents</h2><p>Créer, publier et essayer depuis l’espace élève.</p></div>${btn('Tout voir →','go-exams','ghost small')}</div>${state.exams.slice(0,4).map(e=>`<div class="list-row"><div class="item-icon">▤</div><div class="grow"><div class="item-title">${esc(e.title)}</div><div class="item-meta">${esc(e.level)} · ${e.questions.length} questions · ${e.duration} min</div></div>${pill(e.open?'Publié':'Brouillon',e.open?'ok':'warn')}<button class="table-action" data-action="try-exam" data-id="${e.id}">Tester</button></div>`).join('')}</section>
<section class="panel"><div class="panel-head"><h2>Commencer ici</h2>${pill('Démo','live')}</div><p class="muted small">Cette version sert à découvrir l'ergonomie. Les PDF réels, les copies scolaires et la correction IA seront activés seulement sur un serveur privé.</p><div class="inline-note"><strong>Parcours conseillé</strong><br>1. Ouvre « Mes contrôles ».<br>2. Essaie un contrôle côté élève.<br>3. Reviens dans « Copies & notes » pour le corriger.</div><div class="btn-row" style="margin-top:18px">${btn('Essayer le contrôle sommeil →','try-sleep','secondary full')}</div></section></div>`;
}
function teacherExams(){
return pageHead('Mes contrôles','Retrouve tes évaluations, duplique-les et passe en aperçu élève.',btn('＋ Créer un contrôle','create',''))+
`<div class="toolbar"><span class="muted small">${state.exams.length} contrôles de démonstration</span><input class="search-field" type="search" placeholder="Rechercher un contrôle…" aria-label="Rechercher un contrôle" data-search-exams value="${esc(search)}"></div>
<div class="tile-grid" id="exam-tiles">${state.exams.map(e=>`<article class="card tile" data-search="${esc((e.title+' '+e.level).toLowerCase())}"><div class="tile-stats">${pill(e.open?'Publié · Code '+e.code:'Brouillon',e.open?'ok':'warn')}<span class="small muted">${esc(e.chapter)}</span></div><div><h3>${esc(e.title)}</h3><p>${esc(e.level)} · ${e.questions.length} questions · ${sum(e)} points · ${e.duration} min</p></div><div class="tile-foot"><div class="btn-row">${btn('Modifier','edit-exam','ghost small').replace('data-action','data-id="'+e.id+'" data-action')}${btn('Dupliquer','duplicate-exam','ghost small').replace('data-action','data-id="'+e.id+'" data-action')}</div><div class="btn-row"><button class="table-action" data-action="toggle-exam" data-id="${e.id}">${e.open?'Fermer':'Publier'}</button><button class="table-action" data-action="try-exam" data-id="${e.id}">Tester ↗</button></div></div></article>`).join('')}</div>`;
}
function editorFor(id){const e=examBy(id);return e?JSON.parse(JSON.stringify(e)):{id:'demo-'+Date.now(),title:'',level:'Seconde Bac Pro',chapter:'PSE · Nouveau chapitre',duration:45,code:'DEMO'+Math.floor(Math.random()*9000+1000),open:false,doc:'',questions:[{id:'q-'+Date.now(),type:'text',prompt:'',points:4}]};}
function teacherEditor(){
if(!editor)editor=editorFor(null);
return pageHead(editor.isNew===false?'Modifier le contrôle':'Créer un contrôle','Organise les questions et le barème. Toute modification reste dans cette démonstration.',btn('← Mes contrôles','go-exams','ghost'))+
`<div class="panel"><div class="form-grid"><div class="field"><label for="ex-title">Titre du contrôle</label><input id="ex-title" data-editor="title" placeholder="Ex. Le sommeil" value="${esc(editor.title)}"></div><div class="field"><label for="ex-level">Classe / niveau</label><input id="ex-level" data-editor="level" value="${esc(editor.level)}"></div><div class="field"><label for="ex-chapter">Chapitre</label><input id="ex-chapter" data-editor="chapter" value="${esc(editor.chapter)}"></div><div class="field"><label for="ex-duration">Durée (minutes)</label><input id="ex-duration" type="number" min="5" max="240" data-editor="duration" value="${esc(editor.duration)}"></div></div><div class="field"><label for="ex-doc">Document à consulter (texte)</label><textarea id="ex-doc" data-editor="doc" placeholder="Rédige ou colle un document scientifique…">${esc(editor.doc)}</textarea></div><div class="field"><label for="pdf">Joindre un PDF – aperçu uniquement</label><input id="pdf" type="file" accept=".pdf,.doc,.docx" data-demo-file><small>Dans cette démo publique, aucun document n'est importé ni transmis ; seul le nom du fichier est affiché.</small><span class="small muted" id="pdf-status"></span></div><hr class="divider"><div class="panel-head"><h2>Questions <span class="chip blue">${editor.questions.length}</span></h2><span class="small muted">Barème : ${sum(editor)} points (20 conseillé)</span></div>
<div id="edit-questions">${editor.questions.map((q,i)=>`<div class="question-editor"><div class="question-editor-head"><strong>Question ${i+1}</strong><div class="btn-row"><span class="small muted">${Number(q.points||0)} pt</span><button class="table-action" data-action="remove-question" data-index="${i}">Supprimer</button></div></div><div class="form-grid" style="margin-top:13px"><div class="field"><label>Type de question</label><select data-question="${i}" data-qfield="type"><option value="text" ${q.type==='text'?'selected':''}>Réponse rédigée</option><option value="choice" ${q.type==='choice'?'selected':''}>QCM (une réponse)</option></select></div><div class="field"><label>Points</label><input type="number" min="1" max="20" value="${esc(q.points)}" data-question="${i}" data-qfield="points"></div></div><div class="field"><label>Énoncé</label><textarea data-question="${i}" data-qfield="prompt" rows="2">${esc(q.prompt)}</textarea></div>${q.type==='choice'?`<div class="field"><label>Choix (séparés par ;)</label><textarea rows="2" data-question="${i}" data-qfield="choices">${esc((q.choices||['Option 1','Option 2']).join(' ; '))}</textarea><small>Les choix sont utilisés dans la démo ; le corrigé officiel reste à ajouter au serveur privé.</small></div>`:''}</div>`).join('')}</div>
<button class="dashed-add" data-action="add-question">＋ Ajouter une question</button><div class="btn-row" style="margin-top:23px">${btn('Enregistrer le contrôle','save-exam','')} ${btn('Annuler','go-exams','ghost')}</div></div>`;
}
function teacherCopies(){
const submitted=state.attempts.filter(a=>a.status==='submitted');
return pageHead('Copies & notes','Consulte les réponses et valide une note manuellement.',btn('Essayer côté élève →','student','secondary'))+
`<div class="panel"><div class="panel-head"><div><h2>Copies reçues <span class="chip blue">${submitted.length}</span></h2><p>Exemples fictifs + copies remises sur cet appareil.</p></div>${btn('Réinitialiser la démo','reset-demo','ghost small')}</div><div class="table-wrap"><table><thead><tr><th>Élève fictif</th><th>Contrôle</th><th>Remise</th><th>Note</th><th>Interruptions</th><th>Action</th></tr></thead><tbody>${submitted.map(a=>`<tr><td><strong>${esc(a.name)}</strong></td><td>${esc(examBy(a.examId)?.title||'Contrôle')}</td><td>${date(a.submittedAt)}</td><td>${a.grade==null?pill('À corriger','warn'):`<strong>${esc(a.grade)} / 20</strong>`}</td><td>${a.interruptions||0}</td><td><button class="table-action" data-action="review-copy" data-id="${esc(a.id)}">Ouvrir ↗</button></td></tr>`).join('')}</tbody></table></div>${submitted.length===0?'<p class="empty">Aucune copie pour l’instant. Passe côté élève pour en créer une.</p>':''}</div>`;
}
function teacherMonitoring(){
const progress=state.attempts.filter(a=>a.status==='progress');const recent=[...state.events].sort((a,b)=>b.at-a.at);
return pageHead('Suivi des épreuves','Repère les changements de visibilité signalés par le navigateur.',btn('Tester côté élève →','student','secondary'))+
`<div class="stats"><div class="stat"><div class="stat-label">Copies en cours</div><div class="stat-value">${progress.length}</div><div class="stat-foot">Sur cet appareil</div></div><div class="stat"><div class="stat-label">Copies remises</div><div class="stat-value">${state.attempts.filter(a=>a.status==='submitted').length}</div><div class="stat-foot">Démo locale</div></div><div class="stat"><div class="stat-label">Changements détectés</div><div class="stat-value">${state.events.length}</div><div class="stat-foot">Exemples inclus</div></div><div class="stat"><div class="stat-label">Épreuves publiées</div><div class="stat-value">${state.exams.filter(e=>e.open).length}</div><div class="stat-foot">Codes de démonstration</div></div></div>
<div class="two-col"><section class="panel"><div class="panel-head"><h2>Journal des interruptions</h2>${pill('À examiner','warn')}</div>${recent.length?`<div class="timeline">${recent.map(ev=>{const a=attemptBy(ev.attemptId);return `<div class="timeline-event warn"><strong>${esc(a?.name||'Élève démo')} · ${date(ev.at)}</strong><p>Page masquée ou interruption simulée pendant le contrôle ${esc(examBy(a?.examId)?.title||'')}.</p></div>`}).join('')}</div>`:'<p class="empty">Aucun événement enregistré.</p>'}</section><section class="panel"><div class="panel-head"><h2>À savoir</h2></div><p class="small muted">CORTEX peut détecter que la page devient invisible. Cela ne permet pas de connaître l'application ouverte, ni de prouver une triche.</p><div class="inline-note"><strong>Démo de la fonction</strong><br>Ouvre un contrôle comme élève, puis change d'onglet et reviens. Consulte ensuite ce journal dans le même navigateur.</div><p class="small muted" style="margin-top:15px">Ce suivi est fictif et local. Une vraie supervision à distance nécessitera le serveur sécurisé.</p></section></div>`;
}
function teacherAnalytics(){
const done=state.attempts.filter(a=>a.status==='submitted'),graded=done.filter(a=>a.grade!=null),avg=graded.length?(graded.reduce((n,a)=>n+Number(a.grade),0)/graded.length).toFixed(1):'—';const bins=[0,0,0,0];graded.forEach(a=>bins[Math.min(3,Math.floor(a.grade/5))]++);
return pageHead('Analyses pédagogiques','Un aperçu des résultats pour cibler la remédiation.',btn('Voir les copies →','go-copies','secondary'))+
`<div class="stats"><div class="stat"><div class="stat-label">Moyenne validée</div><div class="stat-value">${avg}${avg!=='—'?'<span class="small">/20</span>':''}</div><div class="stat-foot">Exemple de classe</div></div><div class="stat"><div class="stat-label">Copies notées</div><div class="stat-value">${graded.length}</div><div class="stat-foot">Sur ${done.length} copies</div></div><div class="stat"><div class="stat-label">En attente de correction</div><div class="stat-value">${done.length-graded.length}</div><div class="stat-foot">À valider</div></div><div class="stat"><div class="stat-label">Contrôles publiés</div><div class="stat-value">${state.exams.filter(e=>e.open).length}</div><div class="stat-foot">Évaluations accessibles</div></div></div>
<div class="two-col"><section class="panel"><div class="panel-head"><h2>Répartition des notes</h2>${pill('Notes validées','live')}</div><div class="bars">${bins.map((n,i)=>`<div class="bar-row"><span>${i*5}–${i===3?'20':i*5+4} / 20</span><div class="bar-bg"><span style="width:${graded.length?(n/graded.length*100):0}%"></span></div><b>${n}</b></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>Idées de remédiation</h2></div><p class="small muted">Exemples de suggestions pédagogiques, non générées par une IA dans cette démonstration.</p><div class="preview-list"><div class="summary-answer"><strong>Sommeil</strong><p>Revoir les conséquences du manque de sommeil avec une carte mentale.</p></div><div class="summary-answer"><strong>Réponses rédigées</strong><p>Entraîner les élèves à justifier avec une notion scientifique et un exemple.</p></div></div></section></div>`;
}
function studentShell(){
return `<div class="student-shell">${tab==='examen'?studentExam():tab==='termine'?studentDone():studentWelcome()}</div>`;
}
function studentWelcome(){
const active=state.attempts.find(a=>a.id===state.activeAttemptId && a.status==='progress');
return `<div class="page-head"><div><p class="eyebrow">Espace élève · Mode découverte</p><h1>Prêt pour ton contrôle ?</h1><p>Entre le code fourni par ton professeur, puis réponds question par question.</p></div>${btn('← Accueil','home','ghost')}</div>
<div class="student-intro"><div class="panel"><div class="panel-head"><div><h2>Rejoindre une évaluation</h2><p>Accès sans compte pour cette démonstration.</p></div>${pill('Démo gratuite','ok')}</div><div class="field"><label for="student-code">Code du contrôle</label><input id="student-code" type="text" autocapitalize="characters" autocomplete="off" maxlength="22" value="${esc(chosenCode)}" placeholder="SOMMEIL26"></div><div class="field"><label for="student-name">Nom fictif utilisé pour le test</label><input id="student-name" type="text" maxlength="35" value="Élève Démo" placeholder="Élève Démo"><small>Utilise un pseudonyme : aucune identité réelle n'est nécessaire.</small></div><div class="btn-row">${btn(active?'Reprendre le contrôle →':'Commencer le contrôle →','start-exam','')}</div></div>
<aside class="exam-card"><p class="eyebrow">Contrôle de référence</p><span class="exam-tag">PSE · SECONDE BAC PRO</span><h2>Le sommeil et les rythmes biologiques</h2><p class="muted">5 questions, dont 3 réponses rédigées et 2 QCM, pour tester l'interface de Cortex.</p><div class="tile-stats">${pill('45 minutes','live')}${pill('20 points','ok')}</div><div class="btn-row" style="margin-top:22px"><button class="btn secondary" data-action="choose-sleep">Utiliser le code SOMMEIL26</button></div></aside></div>
<section class="panel"><div class="panel-head"><h2>Contrôles disponibles en démonstration</h2><span class="chip">${state.exams.filter(e=>e.open).length} publiés</span></div><div class="tile-grid">${state.exams.filter(e=>e.open).map(e=>`<div class="card"><span class="chip blue">${esc(e.level)}</span><h3 style="margin:12px 0">${esc(e.title)}</h3><p class="muted small">${e.questions.length} questions · ${e.duration} minutes · Code <strong>${esc(e.code)}</strong></p><button class="btn ghost small" data-action="choose-code" data-code="${esc(e.code)}">Choisir ce contrôle →</button></div>`).join('')}</div></section>`;
}
function activeAttempt(){return attemptBy(state.activeAttemptId);}
function studentExam(){
const a=activeAttempt();
if(!a||a.status!=='progress'){tab='accueil';return studentWelcome();}
const e=examBy(a.examId),q=e.questions[currentQuestion]||e.questions[0];if(!q)return '<p>Ce contrôle ne contient pas de questions.</p>';
const answered=e.questions.filter(q=>String(a.answers[q.id]??'').trim().length>0).length;
const elapsed=Math.max(0,Math.floor((Date.now()-a.startedAt)/60000));const remaining=Math.max(0,e.duration-elapsed);
const ans=String(a.answers[q.id]??'');
return `<div class="page-head"><div><p class="eyebrow">CORTEX · Contrôle en cours</p><h1>${esc(e.title)}</h1><p>${esc(e.level)} · ${e.questions.length} questions · ${sum(e)} points</p></div><div class="btn-row">${pill('Temps indicatif : '+remaining+' min','live')}${pill((a.interruptions||0)+' interruption(s)',(a.interruptions||0)?'warn':'ok')}</div></div>
<div class="exam-top"><div><strong>Ta progression : ${answered} / ${e.questions.length} réponses</strong><div class="small muted">Brouillon conservé uniquement sur cet appareil</div></div><div class="btn-row"><span class="chip teal" id="save-hint">✓ Sauvegarde locale</span><button class="btn ghost small" data-action="review-exam">Relire ma copie</button></div></div><div class="exam-progress" aria-label="${answered} réponses sur ${e.questions.length}"><span style="width:${answered/e.questions.length*100}%"></span></div>
<div class="student-exam"><section class="panel exam-question"><div class="question-number">QUESTION ${currentQuestion+1} / ${e.questions.length} · ${q.points} POINTS</div><h2>${esc(q.prompt)}</h2>${e.doc?`<div class="question-doc"><strong>DOCUMENT SCIENTIFIQUE</strong><br>${esc(e.doc)}</div>`:''}
${q.type==='choice'?`<div class="exam-choices">${(q.choices||[]).map((c,i)=>`<label class="choice"><input type="radio" name="choice" value="${i}" data-answer="${esc(q.id)}" ${ans===String(i)?'checked':''}><span>${esc(c)}</span></label>`).join('')}</div>`:`<div class="field"><label for="student-answer">Ta réponse</label><textarea id="student-answer" rows="6" data-answer="${esc(q.id)}" placeholder="Rédige ta réponse ici…">${esc(ans)}</textarea><small>Tu peux modifier ta réponse avant de rendre le contrôle.</small></div>`}
<div class="exam-nav"><button class="btn ghost" data-action="question-prev" ${currentQuestion===0?'disabled':''}>← Précédent</button>${currentQuestion===e.questions.length-1?btn('Relire et terminer →','review-exam',''):btn('Question suivante →','question-next','')}</div></section>
<aside class="panel sidebar-note"><div class="panel-head"><h2>Mes questions</h2>${pill( Math.round(answered/e.questions.length*100)+' %','ok')}</div><div class="question-dots">${e.questions.map((other,i)=>`<button class="question-dot ${i===currentQuestion?'current':''} ${String(a.answers[other.id]??'').trim()?'answered':''}" title="Question ${i+1}" aria-label="Aller à la question ${i+1}" data-action="question-jump" data-index="${i}">${i+1}</button>`).join('')}</div><hr class="divider"><p class="small muted">Le passage à une autre application peut être détecté comme une interruption. Ce signal n'est jamais une preuve de triche.</p><button class="btn ghost small full" data-action="simulate-interruption">Simuler une interruption</button><p class="tiny muted" style="margin-top:13px">Fonction de démonstration. Elle n'identifie pas l'application ouverte.</p></aside></div>`;
}
function studentDone(){
const a=activeAttempt(),e=examBy(a?.examId);
return `<div class="panel student-done"><div class="done-icon">✓</div><p class="eyebrow" style="justify-content:center">Évaluation terminée</p><h1 style="font-size:38px">Copie remise !</h1><p class="lead">Ton contrôle « ${esc(e?.title||'Évaluation')} » a été ajouté au tableau de bord de démonstration.</p><p class="muted small">Aucune copie réelle n'a été envoyée. Pour voir tes réponses, repasse en profil professeur sur ce même navigateur.</p><div class="btn-row" style="justify-content:center;margin-top:28px">${btn('Voir la copie côté professeur →','go-copies','')}${btn('Retour à l’espace élève','student','secondary')}</div></div>`;
}
function setAnswer(key,value){
const a=activeAttempt();if(!a||a.status!=='progress')return;a.answers[key]=value;save();
const el=document.getElementById('save-hint');if(el)el.textContent='✓ Enregistré sur cet appareil';
}
function startExam(){
const code=document.getElementById('student-code')?.value.trim().toUpperCase()||'SOMMEIL26';
const e=state.exams.find(x=>x.code.toUpperCase()===code&&x.open);if(!e){showToast('Code inconnu ou contrôle non publié.');return;}
const existing=activeAttempt();
if(existing&&existing.status==='progress'&&existing.examId===e.id){nav('student','examen');return;}
const pseudonym=(document.getElementById('student-name')?.value.trim()||'Élève Démo').slice(0,35);
const a={id:'attempt-'+Date.now()+'-'+Math.floor(Math.random()*99999),examId:e.id,name:pseudonym,status:'progress',startedAt:Date.now(),submittedAt:null,answers:{},grade:null,feedback:'',interruptions:0};
state.attempts.push(a);state.activeAttemptId=a.id;currentQuestion=0;save();nav('student','examen');
}
function registerInterruption(kind){
const a=activeAttempt();if(!a||a.status!=='progress')return;
const last=state.events[state.events.length-1];if(last&&last.attemptId===a.id&&Date.now()-last.at<900)return;
a.interruptions=(a.interruptions||0)+1;state.events.push({id:'event-'+Date.now(),attemptId:a.id,kind,at:Date.now()});save();
}
function modalShow(title,content,footer=''){
modal.innerHTML=`<div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-top"><h2 id="modal-title">${title}</h2><button type="button" class="icon-btn" aria-label="Fermer" data-action="close-modal">✕</button></div>${content}${footer?`<div class="btn-row" style="margin-top:19px">${footer}</div>`:''}</div>`;
modal.querySelector('[data-action="close-modal"]')?.focus();
}
function closeModal(){modal.innerHTML='';}
function previewCopy(id){
const a=attemptBy(id),e=examBy(a?.examId);if(!a||!e)return;
modalShow('Copie · '+esc(a.name),`<p class="muted small">${esc(e.title)} · ${a.interruptions||0} interruption(s) enregistrée(s) · Toutes les notes sont fictives.</p><div class="preview-list">${e.questions.map((q,i)=>`<div class="summary-answer"><strong>${i+1}. ${esc(q.prompt)} (${q.points} pt)</strong><p>${q.type==='choice'?esc(q.choices?.[Number(a.answers[q.id])]||'Sans réponse'):esc(a.answers[q.id]||'Sans réponse')}</p></div>`).join('')}</div><hr class="divider"><div class="field"><label for="manual-grade">Note proposée par le professeur, sur 20</label><input id="manual-grade" type="number" min="0" max="20" step=".5" value="${a.grade??''}" placeholder="Ex. 14.5"></div><div class="field"><label for="manual-feedback">Commentaire pédagogique</label><textarea id="manual-feedback" rows="3">${esc(a.feedback)}</textarea></div>`,
`<button class="btn" data-action="save-grade" data-id="${esc(a.id)}">Enregistrer la note</button>${btn('Fermer','close-modal','ghost')}`);
}
function reviewExam(){
const a=activeAttempt(),e=examBy(a?.examId);if(!a||!e)return;
const empty=e.questions.filter(q=>!String(a.answers[q.id]??'').trim()).length;
modalShow('Relire ma copie',`<p>${e.questions.length-empty} réponses sur ${e.questions.length}. ${empty?'<strong>'+empty+' question(s) sans réponse.</strong>':'Toutes les questions ont une réponse.'}</p><div class="preview-list">${e.questions.map((q,i)=>`<div class="summary-answer"><strong>Question ${i+1}</strong><p>${q.type==='choice'?esc(q.choices?.[Number(a.answers[q.id])]||'Sans réponse'):esc(a.answers[q.id]||'Sans réponse')}</p></div>`).join('')}</div><p class="small muted">Cette remise reste une simulation enregistrée dans ton navigateur.</p>`,
`<button class="btn" data-action="confirm-submit">Rendre ma copie →</button>${btn('Continuer à répondre','close-modal','ghost')}`);
}
function notifyAbout(){
modalShow('Comment fonctionne cette démonstration ?',`<p>Tu peux explorer librement les profils <strong>Professeur</strong> et <strong>Élève</strong>, sans créer de compte.</p><div class="preview-list"><div class="summary-answer"><strong>Ce qui fonctionne</strong><p>Création de contrôles fictifs, passage d'un contrôle, sauvegarde dans ce navigateur, copie remise, correction manuelle et journal d'interruptions local.</p></div><div class="summary-answer"><strong>Ce qui n'est pas activé</strong><p>Comptes réels, traitement de PDF, stockage serveur, suivi de classe à distance et correction IA par RTX 3060. Rien n'est envoyé sur internet depuis les formulaires.</p></div></div><p class="small muted">Évite d'utiliser de vraies données scolaires : cette page est publique.</p>`,btn('Compris','close-modal',''));
}
function action(el){
const a=el.dataset.action,id=el.dataset.id;
if(a==='home'){nav('home');return;}
if(a==='teacher'){nav('teacher');return;}
if(a==='student'){nav('student');return;}
if(a==='about'){notifyAbout();return;}
if(a==='teacher-tab'){if(el.dataset.tab==='creer')editor=editorFor(null);nav('teacher',el.dataset.tab);return;}
if(a==='create'){editor=editorFor(null);nav('teacher','creer');return;}
if(a==='go-exams'){nav('teacher','controles');return;}
if(a==='go-copies'){nav('teacher','copies');return;}
if(a==='edit-exam'){editor=editorFor(id);editor.isNew=false;nav('teacher','creer');return;}
if(a==='duplicate-exam'){const e=editorFor(id);e.id='copy-'+Date.now();e.title+=' (copie)';e.code='DEMO'+Math.floor(1000+Math.random()*9000);e.open=false;state.exams.unshift(e);save();showToast('Contrôle dupliqué.');render();return;}
if(a==='toggle-exam'){const e=examBy(id);if(e){e.open=!e.open;save();render();}return;}
if(a==='try-exam'||a==='try-sleep'){const e=examBy(id||'sommeil');if(!e)return;e.open=true;chosenCode=e.code;save();nav('student','accueil');return;}
if(a==='add-question'){if(!editor)return;editor.questions.push({id:'q-'+Date.now(),type:'text',prompt:'',points:4});render();return;}
if(a==='remove-question'){if(editor&&editor.questions.length>1){editor.questions.splice(Number(el.dataset.index),1);render();}else showToast('Conserve au moins une question.');return;}
if(a==='save-exam'){
if(!editor)return;
if(!editor.title.trim()){showToast('Donne un titre à ton contrôle.');return;}
if(!editor.questions.every(q=>q.prompt.trim())){showToast('Complète les énoncés des questions.');return;}
if(!editor.questions.every(q=>Number(q.points)>0&&Number(q.points)<=20)){showToast('Chaque question doit avoir entre 1 et 20 points.');return;}
const existing=state.exams.findIndex(e=>e.id===editor.id);
const clean=JSON.parse(JSON.stringify(editor));delete clean.isNew;
if(existing>=0)state.exams[existing]=clean;else state.exams.unshift(clean);
save();editor=null;showToast('Contrôle enregistré dans cette démo.');nav('teacher','controles');return;}
if(a==='close-modal'){closeModal();return;}
if(a==='review-copy'){previewCopy(id);return;}
if(a==='save-grade'){const at=attemptBy(id);const grade=Number(document.getElementById('manual-grade')?.value);const original=document.getElementById('manual-grade')?.value;if(!at||original===''||!Number.isFinite(grade)||grade<0||grade>20){showToast('Saisis une note entre 0 et 20.');return;}at.grade=grade;at.feedback=document.getElementById('manual-feedback')?.value||'';save();closeModal();showToast('Note enregistrée dans la démonstration.');render();return;}
if(a==='choose-sleep'){chosenCode='SOMMEIL26';render();return;}
if(a==='choose-code'){chosenCode=el.dataset.code;render();return;}
if(a==='start-exam'){startExam();return;}
if(a==='question-prev'){currentQuestion=Math.max(0,currentQuestion-1);render();return;}
if(a==='question-next'){const e=examBy(activeAttempt()?.examId);currentQuestion=Math.min((e?.questions.length||1)-1,currentQuestion+1);render();return;}
if(a==='question-jump'){currentQuestion=Number(el.dataset.index)||0;render();return;}
if(a==='simulate-interruption'){registerInterruption('simulation');showToast('Interruption fictive enregistrée.');render();return;}
if(a==='review-exam'){reviewExam();return;}
if(a==='confirm-submit'){const at=activeAttempt();if(!at)return;at.status='submitted';at.submittedAt=Date.now();save();closeModal();nav('student','termine');return;}
if(a==='reset-demo'){modalShow('Réinitialiser la démonstration ?',`<p>Les contrôles ajoutés et les copies fictives créées dans ce navigateur seront effacés. Aucun serveur n'est concerné.</p>`,btn('Tout réinitialiser','confirm-reset','danger')+btn('Annuler','close-modal','ghost'));return;}
if(a==='confirm-reset'){state=makeSeed();save();closeModal();editor=null;currentQuestion=0;showToast('Démonstration réinitialisée.');render();return;}
}
document.addEventListener('click',e=>{
const el=e.target.closest('[data-action]');if(el){e.preventDefault();action(el);}
});
document.addEventListener('input',e=>{
const t=e.target;
if(t.hasAttribute('data-editor')&&editor){editor[t.dataset.editor]=t.dataset.editor==='duration'?Number(t.value):t.value;}
if(t.hasAttribute('data-question')&&editor){const q=editor.questions[Number(t.dataset.question)];if(!q)return;const name=t.dataset.qfield;q[name]=name==='points'?Number(t.value):name==='choices'?t.value.split(';').map(v=>v.trim()).filter(Boolean):t.value;}
if(t.hasAttribute('data-answer')&&t.tagName==='TEXTAREA')setAnswer(t.dataset.answer,t.value);
if(t.hasAttribute('data-search-exams')){search=t.value.toLowerCase();document.querySelectorAll('#exam-tiles [data-search]').forEach(card=>card.hidden=!card.dataset.search.toLowerCase().includes(search));}
});
document.addEventListener('change',e=>{
const t=e.target;
if(t.hasAttribute('data-question')&&t.dataset.qfield==='type'&&editor){editor.questions[Number(t.dataset.question)].type=t.value;if(t.value==='choice'&&!editor.questions[Number(t.dataset.question)].choices)editor.questions[Number(t.dataset.question)].choices=['Proposition A','Proposition B'];render();}
if(t.hasAttribute('data-answer')&&t.type==='radio'){setAnswer(t.dataset.answer,t.value);render();}
if(t.hasAttribute('data-demo-file')){const s=document.getElementById('pdf-status');if(s)s.textContent=t.files?.[0]?'Fichier sélectionné : '+t.files[0].name+' (aperçu uniquement, non importé)':'';}
});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&view==='student'&&tab==='examen')registerInterruption('visibility');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.children.length)closeModal();});
window.addEventListener('hashchange',routePage);
routePage();
})();