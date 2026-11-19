/* CORTEX — MON CORTEX : dashboard élève local, sans serveur.
   Les valeurs sont des données de démo. En production, les contrôles d'accès
   doivent être exécutés côté serveur avec RLS et authentification du professeur. */
window.CORTEX_PORTAL=(function(){
 'use strict';
 const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const grade=x=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(Number(x)||0);
 const date=x=>new Date(x).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
 const shortDate=x=>new Date(x).toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
 function level(name){
  const n=String(name||'').toLowerCase().replace(/\s+/g,'');
  if(/^(3|troisi|3e|3è|3pm)/.test(n))return '3e';
  if(/^(2|sec|seconde)/.test(n))return 'seconde';
  if(/^(1|prem|première|premiere)/.test(n))return 'première';
  if(/^(tma|tmcv|tagora|term|terminale|t[^a-z])/.test(n))return 'terminale';
  return 'autre';
 }
 function getClassCode(state,cl){
  return typeof state?.classCodes?.[cl?.id]==='string'?state.classCodes[cl.id]:'';
 }
 function makeCode(state,cl,rotate=false){
  if(!cl?.id)throw Error('Classe introuvable.');
  if(!window.crypto?.getRandomValues)throw Error('Navigateur sécurisé requis pour générer le code.');
  if(!state.classCodes||typeof state.classCodes!=='object')state.classCodes={};
  if(!rotate&&state.classCodes[cl.id])return state.classCodes[cl.id];
  const bytes=new Uint8Array(12);window.crypto.getRandomValues(bytes);
  let code=Array.from(bytes,b=>chars[b%chars.length]).join('');
  if(code===state.classCodes[cl.id])code=code.slice(0,-1)+chars[(chars.indexOf(code.slice(-1))+1)%chars.length];
  state.classCodes[cl.id]=code;
  return code;
 }
 function classPanel(state,cl){
  const code=getClassCode(state,cl);
  return '<div class="portal-class-code"><p class="portal-kicker">ACCES A MON CORTEX · '+esc(cl.name)+'</p>'+
   '<h3>Code de classe</h3><p>Communique ce code aux élèves de la classe pour accéder à leur espace personnel, en plus de leur numéro et de leur PIN.</p>'+
   (code?'<div class="portal-code-value" aria-label="Code de classe">'+esc(code)+'</div>':'<div class="portal-code-empty">Aucun code créé pour cette classe</div>')+
   '<div class="portal-inline-actions">'+
    (!code?'<button class="btn" data-action="portal-create-class-code" data-id="'+esc(cl.id)+'">Générer le code de classe</button>':
    '<button class="btn secondary" data-action="portal-copy-class-code" data-id="'+esc(cl.id)+'">Copier le code</button>'+
    '<button class="btn danger" data-action="portal-ask-rotate-code" data-id="'+esc(cl.id)+'">Renouveler</button>')+
   '</div><p class="class-qr-warning">Démo locale : ce code est visible depuis l’espace professeur public. Il ne protège donc pas les copies sur GitHub Pages. Une version réelle nécessitera un espace professeur authentifié et des vérifications côté Supabase.</p></div>';
 }
 function eligible(a){
  return a?.status==='submitted'&&a.publishedToStudent===true&&Number.isFinite(Number(a.grade))&&a.grade!==null&&Number(a.grade)>=0&&Number(a.grade)<=20;
 }
 function keyYear(ms){
  const d=new Date(Number(ms)||0);
  if(!Number.isFinite(d.getTime()))return null;
  return d.getMonth()>=8?d.getFullYear():d.getFullYear()-1;
 }
 function periodBounds(year,p){
  const start=p==='s2'?new Date(year+1,1,1):new Date(year,8,1);
  const end=p==='s2'?new Date(year+1,6,1):new Date(year+1,1,1);
  return {start,end};
 }
 function schoolYears(attempts){
  const current=keyYear(Date.now()),years=new Set([current]);
  for(const a of attempts){const y=keyYear(a.submittedAt);if(y&&y>=2020&&y<=current+1)years.add(y);}
  return [...years].sort((a,b)=>b-a);
 }
 function average(attempts){
  return attempts.length?attempts.reduce((n,a)=>n+Number(a.grade),0)/attempts.length:null;
 }
 function periodAttempts(attempts,year,period){
  const {start,end}=periodBounds(year,period);
  return attempts.filter(a=>eligible(a)&&a.submittedAt>=start.getTime()&&a.submittedAt<end.getTime());
 }
 function weeks(attempts,year,period){
  const {start,end}=periodBounds(year,period);
  const monday=new Date(start.getFullYear(),start.getMonth(),start.getDate());
  monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
  const items=[];
  for(let at=new Date(monday);at<end;){
   const next=new Date(at);next.setDate(next.getDate()+7);
   const to=next<end?next:end;
   const a=at<start?start:at;
   const grades=attempts.filter(x=>eligible(x)&&x.submittedAt>=a.getTime()&&x.submittedAt<to.getTime());
   items.push({start:new Date(a),end:new Date(to.getTime()-1),value:average(grades),count:grades.length});
   at=next;
  }
  return items;
 }
 function mine(state,clId,number){
  return (state.attempts||[]).filter(a=>a.classId===clId&&String(Number(a.studentNumber))===String(Number(number)));
 }
 function candidate(state,clId,number,id){
  return mine(state,clId,number).find(a=>a.id===id&&eligible(a))||null;
 }
 function formatYear(year){return year+'–'+(year+1);}
 function studentLogin(state,opts={}){
  const classes=(state.classes||[]).filter(c=>!c.archived);
  const levels=[['3e','Troisième'],['seconde','Seconde'],['première','Première'],['terminale','Terminale'],['autre','Autre']];
  return '<div class="portal-root portal-login"><section class="portal-login-visual">'+
   '<div class="portal-symbol" aria-hidden="true">C<span>·</span></div><p class="portal-kicker">STATION NOCTIS / MON CORTEX</p>'+
   '<h1>Ta progression.<br><em>Ton univers.</em></h1><p>Retrouve tes contrôles corrigés, comprends tes erreurs et observe tes progrès au fil des semaines.</p>'+
   '<div class="portal-illustration" aria-hidden="true"><div class="portal-illustration-glow"></div><div class="portal-planet">20<span>points</span></div><div class="portal-small-orbit">✦</div></div>'+
   '<div class="portal-visual-foot">Une note ne résume pas ce que tu sais. Chaque correction est une occasion d’avancer.</div></section>'+
   '<section class="portal-login-form">'+
   '<div class="portal-demo-gateway" aria-label="Découvrir le carnet élève fictif de CORTEX">'+
   '<div class="portal-demo-gateway-top"><span class="portal-demo-status"><span class="portal-demo-status-dot" aria-hidden="true"></span> MODE DÉMONSTRATION</span><span class="portal-demo-noctis">NOCTIS / MON CORTEX</span></div>'+
   '<div class="portal-demo-gateway-main"><div class="portal-demo-gateway-copy"><span class="portal-demo-kicker">✦ TON ESPACE ÉLÈVE</span><h2>Entre dans ton <em>univers.</em></h2><p>Découvre ton carnet fictif : copies corrigées, progression, estimation d’une note et conseils d’Albert IA. Aucun compte nécessaire.</p></div><div class="portal-demo-orbit" aria-hidden="true"><span class="portal-demo-orbit-core">C<span>·</span></span><i class="portal-demo-star star-one"></i><i class="portal-demo-star star-two"></i><i class="portal-demo-star star-three"></i></div></div>'+
   '<button class="portal-preview-button" type="button" data-action="portal-demo"><span class="portal-preview-icon" aria-hidden="true">✦</span><span class="portal-preview-copy"><strong>Découvrir mon tableau de bord</strong><small>13 contrôles fictifs · Notes · Albert IA</small></span><span class="portal-preview-arrow" aria-hidden="true">↗</span></button>'+
   '<div class="portal-demo-features" aria-hidden="true"><span>◈ Mes résultats</span><span>≈ Estimation IA</span><span>✧ Conseils Albert</span></div>'+
   '</div>'+
   '<section class="cs-stage-featured cs-stage-featured-demo" aria-label="Accéder à la recherche de stages">'+
   '<div class="cs-stage-featured-top"><span class="cs-stage-featured-label">✦ CORTEX · TON AVENIR PROFESSIONNEL</span><span class="cs-stage-featured-status">OUTIL STAGES</span></div>'+
   '<div class="cs-stage-featured-main"><div class="cs-stage-featured-content"><span class="cs-stage-featured-kicker">PFMP · 3 FILIÈRES</span>'+
   '<h2>Ton prochain stage<br><em>commence ici.</em></h2>'+
    '<p>Repère des lieux adaptés à ta filière, prépare ton premier contact et retrouve tes candidatures dans ton carnet.</p></div>'+
   '<div class="cs-stage-featured-illustration" aria-hidden="true"><span class="cs-stage-featured-globe">⌖</span><span class="cs-stage-featured-orbit">✦</span><span class="cs-stage-featured-dot"></span></div></div>'+
   '<button class="cs-stage-featured-button" type="button" data-action="student-stages"><span class="cs-stage-featured-icon">🎓</span>'+
    '<span class="cs-stage-featured-button-copy"><strong>Rechercher mon stage</strong><small>Annuaire · Modèles de contact · Suivi des relances</small></span>'+
   '<span class="cs-stage-featured-arrow" aria-hidden="true">↗</span></button>'+
   '<div class="cs-stage-featured-tags"><span>◈ Gestion-administration</span><span>◈ Commerce-vente</span><span>◈ Accueil</span></div></section>'+
   '<div class="portal-pse-teaser"><div class="portal-pse-teaser-mark">PSE · 60 MINUTES</div><h2>Tester un vrai contrôle de PSE</h2><p>20 questions sur le sommeil, documents et chronomètre. Aucun compte ni PIN requis pour cette démonstration.</p><button class="portal-pse-teaser-action" type="button" data-action="demo-pse-open">Tester le contrôle PSE <span aria-hidden="true">↗</span></button></div>'+
   '<div class="portal-login-divider"><span>OU ACCÉDER À MES COPIES</span></div>'+
   '<div class="portal-tag">ESPACE ELEVE</div><h2>Retrouve ton espace</h2>'+
   '<p class="portal-muted">Accès personnel avec ton numéro de liste, ton PIN et le code communiqué par ton professeur.</p>'+
   '<div class="portal-form-grid"><div class="field"><label for="portal-level">Mon niveau</label><select id="portal-level"><option value="">Choisir un niveau</option>'+
   levels.map(([v,t])=>'<option value="'+esc(v)+'" '+(opts.level===v?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></div>'+
   '<div class="field"><label for="portal-class">Ma classe</label><select id="portal-class"><option value="">Choisir une classe</option>'+
   classes.map(cl=>'<option value="'+esc(cl.id)+'" data-level="'+level(cl.name)+'" '+(opts.classId===cl.id?'selected':'')+'>'+esc(cl.name)+'</option>').join('')+'</select></div></div>'+
   '<div class="field"><label for="portal-number">Mon numéro sur la liste</label><input id="portal-number" type="text" inputmode="numeric" pattern="[0-9]{1,3}" maxlength="3" autocomplete="off" placeholder="Ex. 12"></div>'+
   '<div class="field"><label for="portal-classcode">Code de ma classe</label><input id="portal-classcode" type="text" autocomplete="off" autocapitalize="characters" maxlength="12" placeholder="Code remis par le professeur" spellcheck="false"></div>'+
   '<div class="field"><label for="portal-pin">Mon PIN personnel à 6 chiffres</label>'+
   '<div class="portal-pin-wrap"><input id="portal-pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off" placeholder="••••••"><button type="button" class="portal-show-pin" data-action="portal-toggle-pin" aria-label="Afficher ou masquer le PIN">Afficher</button></div></div>'+
   '<button class="portal-main-button" type="button" data-action="portal-login">Accéder à mon espace <span aria-hidden="true">↗</span></button>'+
   '<p class="portal-login-help">Première connexion ? Scanne le QR code de ton contrôle pour créer ton PIN. Si tu l’as oublié, demande sa réinitialisation au professeur.</p>'+
   '<div class="portal-safety"><strong>Version de démonstration.</strong> Les données sont locales à cet appareil, non synchronisées, et l’espace professeur n’est pas protégé. N’utilise aucune donnée réelle.</div>'+
   '</section></div>';
 }
 function peak(attempts){
  return attempts.length?Math.max(...attempts.map(a=>Number(a.grade))):null;
 }
 function inspiration(attempts,state,number,clId){
  const weak=[];
  for(const at of attempts){
   const exam=(state.exams||[]).find(e=>e.id===at.examId);
   if(!exam)continue;
   for(const q of exam.questions||[]){
    const mark=at.marks?.[q.id],mx=Number(q.points)||0,pt=Number(mark?.points);
    if(mx<=0||!Number.isFinite(pt)||!mark||typeof mark.points!=='number'||pt/mx>=0.75)continue;
    const done=!!state.studentReviewFlags?.[clId]?.[number]?.[at.id]?.[q.id];
    weak.push({attemptId:at.id,qid:q.id,title:q.prompt,exam:exam.title,comment:mark.comment||'',loss:mx-pt,done});
   }
  }
  return weak.sort((a,b)=>Number(a.done)-Number(b.done)||b.loss-a.loss).slice(0,4);
 }
 function graph(bars){
  const months=[];
  for(const w of bars){const m=w.start.toLocaleDateString('fr-FR',{month:'short'});if(!months.includes(m))months.push(m);}
  const html=bars.map((w,i)=>{
   const available=w.value!==null;
   const high=available?Math.max(8,Math.round(w.value/20*100)):4;
   const color=available?(w.value>=14?'great':w.value>=10?'good':'improve'):'empty';
   const info='Semaine du '+shortDate(w.start)+' au '+shortDate(w.end)+' : '+(available?grade(w.value)+'/20 sur '+w.count+' contrôle(s)':'aucune note publiée');
   return '<div class="portal-week" role="img" aria-label="'+esc(info)+'" title="'+esc(info)+'">'+
     '<div class="portal-week-value">'+(available?grade(w.value):'—')+'</div>'+
     '<div class="portal-week-track"><div class="portal-week-bar '+color+'" style="height:'+high+'%"></div></div>'+
     '<span class="portal-week-label">'+(i%2===0?esc(shortDate(w.start)):'·')+'</span></div>';
  }).join('');
  return '<div class="portal-graph-legend"><span>Une barre = moyenne des contrôles corrigés dans la semaine.</span><span><i class="legend-dot"></i> /20</span></div>'+
   '<div class="portal-chart-scroll" tabindex="0" aria-label="Graphique de moyenne par semaine, défilable horizontalement"><div class="portal-week-chart">'+html+'</div></div>';
 }
 function dashboard(state,session,opts={}){
  const cl=(state.classes||[]).find(c=>c.id===session.classId);
  if(!cl)return '<p>Classe introuvable.</p>';
  const number=session.number,all=mine(state,cl.id,number);
  const finished=all.filter(eligible).sort((a,b)=>(b.submittedAt||0)-(a.submittedAt||0));
  const pending=all.filter(a=>a.status==='submitted'&&!eligible(a));
  const ongoing=all.filter(a=>a.status==='progress');
  const year=Number(opts.year)||keyYear(Date.now()),period=opts.period==='s2'?'s2':'s1';
  const yearList=schoolYears(all),periodGrades=periodAttempts(finished,year,period),avg=average(periodGrades),best=peak(periodGrades);
  const graphItems=weeks(periodGrades,year,period),reviewList=inspiration(finished,state,number,cl.id);
  const compared=graphItems.filter(w=>w.value!==null),last=compared.at(-1),previous=compared.at(-2);
  const delta=last&&previous?(last.value-previous.value):null;
  const doneCount=reviewList.filter(w=>w.done).length;
  const tiles=[
   {val:avg===null?'—':grade(avg),unit:'/20',label:'Moyenne du semestre',sub:periodGrades.length+' contrôle(s) publiés'},
   {val:finished.length,label:'Copies corrigées',sub:pending.length+' en attente'},
   {val:best===null?'—':grade(best),unit:'/20',label:'Meilleure note',sub:'Sur la période choisie'},
   {val:delta===null?'—':(delta>0?'+':'')+grade(delta),unit:'pt',label:'Évolution récente',sub:delta===null?'Deux semaines notées nécessaires':'Par rapport à la semaine notée précédente'}
  ];
  const stats=tiles.map((t,i)=>'<article class="portal-stat"><span class="portal-stat-top">'+['◈','▤','✧','↗'][i]+'</span><div class="portal-stat-main">'+esc(t.val)+(t.unit?'<small>'+esc(t.unit)+'</small>':'')+'</div>'+
    '<strong>'+esc(t.label)+'</strong><span>'+esc(t.sub)+'</span></article>').join('');
  const cards=all.slice().sort((a,b)=>(b.submittedAt||b.startedAt||0)-(a.submittedAt||a.startedAt||0)).map(at=>{
   const ex=(state.exams||[]).find(e=>e.id===at.examId),pub=eligible(at),open=at.status==='progress';
   const badge=pub?'<span class="portal-status ready">✓ Corrigé et publié</span>':open?'<span class="portal-status wait">En cours</span>':'<span class="portal-status wait">Correction en attente</span>';
   return '<article class="portal-result"><div class="portal-result-icon" aria-hidden="true">'+(pub?'✓':open?'◷':'·')+'</div>'+
    '<div class="portal-result-content"><strong>'+esc(ex?.title||'Évaluation')+'</strong><small>'+esc(date(at.submittedAt||at.startedAt))+' · '+esc(at.groupName||cl.name)+'</small>'+badge+'</div>'+
    '<div class="portal-result-end">'+(pub?'<div class="portal-grade">'+grade(at.grade)+'<span>/20</span></div><button class="portal-link" data-action="portal-copy" data-id="'+esc(at.id)+'">Voir ma correction ↗</button>'+
      (opts.preview?'<p class="portal-albert-hook">✦ Pour comprendre tes réussites et progresser, Albert peut relire ta correction.</p>'+
       '<button class="portal-albert-corrected" type="button" data-action="portal-albert-corrected" data-id="'+esc(at.id)+'">✦ Albert m’aide à comprendre ma copie</button>'+
       '<div class="portal-albert-corrected-slot" data-albert-copy="'+esc(at.id)+'" aria-live="polite" role="status"></div>':''):open?'<span class="portal-pending">Brouillon en cours</span>':
    opts.preview&&at.id==='exemple-attente-albert'?
      '<span class="portal-pending">En attente de la correction du professeur</span>'+
      '<button type="button" class="portal-albert-estimate" data-action="portal-albert-estimate" data-id="'+esc(at.id)+'">✦ Estimer ma note avec Albert IA</button>'+
      '<div id="cortex-estimate-result" class="cortex-estimate-result" role="status" aria-live="polite">'+
      (window.CORTEX_ALBERT_TOOLS?.estimate?'<div class="cortex-estimate-grade">≈ '+esc(window.CORTEX_ALBERT_TOOLS.estimate.score)+' / 20</div>'+
      '<small class="cortex-estimate-disclaimer">Estimation IA seulement. Aucun commentaire avant la correction officielle du professeur ; note exclue de la moyenne.</small>':'Albert peut estimer une note provisoire sur la copie fictive, sans fournir de remarques.')+'</div>':
      '<span class="portal-pending">Ta note apparaîtra après publication</span>')+'</div></article>';
  }).join('');
  const suggestions=reviewList.map((s,i)=>'<article class="portal-revision '+(s.done?'is-done':'')+'"><div class="portal-revision-num">'+String(i+1).padStart(2,'0')+'</div>'+
   '<div><span class="portal-kicker">'+esc(s.exam)+'</span><strong>'+esc(s.title)+'</strong>'+
   (s.comment?'<p>'+esc(s.comment)+'</p>':'<p>Reprends cette question et justifie ta réponse avec une notion précise.</p>')+'</div>'+
   '<button class="portal-revision-button" data-action="portal-revision" data-attempt="'+esc(s.attemptId)+'" data-question="'+esc(s.qid)+'" aria-pressed="'+(s.done?'true':'false')+'">'+(s.done?'✓ Revus':'À revoir')+'</button></article>').join('');
  const periodLabel=period==='s1'?'Septembre → janvier':'Février → juin';
  return '<div class="portal-root portal-dashboard">'+
   (opts.preview?'<div class="portal-demo-ribbon">✧ APERÇU FICTIF · AUCUNE NOTE RÉELLE</div>':'')+
   '<header class="portal-toolbar"><div class="portal-brand"><div class="portal-mark">C</div><div><strong>MON CORTEX</strong><span>STATION NOCTIS · ÉLÈVE</span></div></div>'+
   '<div class="portal-actions"><span class="portal-class-indicator">'+esc(cl.name)+' · n° '+esc(number)+'</span><button data-action="portal-logout" class="portal-signout">Déconnexion ↗</button></div></header>'+
   '<div class="portal-main"><section class="portal-welcome"><div><span class="portal-tag">TON ESPACE D’APPRENTISSAGE</span>'+
   '<h1>Chaque progrès<br><em>compte.</em></h1><p>Des résultats pour comprendre, des corrections pour avancer. Voici ton parcours personnel.</p>'+
   '<div class="portal-welcome-buttons"><button data-action="portal-show-results">Mes contrôles ↓</button><button data-action="portal-show-revision">Mes révisions ↗</button><button data-action="student-stages">🎓 Recherche de stages</button></div></div>'+
   '<div class="portal-welcome-art" aria-hidden="true"><div class="portal-art-ring"><span>'+(avg===null?'—':grade(avg))+'</span><small>/20</small></div><div class="portal-art-orbit"></div><div class="portal-art-stars">✦</div></div></section>'+
    '<section class="cs-stage-featured cs-stage-featured-dashboard" aria-label="Trouver un stage"><div class="cs-stage-featured-top"><span class="cs-stage-featured-label">PARCOURS PROFESSIONNEL</span></div>'+
   '<div class="cs-stage-featured-main"><div class="cs-stage-featured-content"><span class="cs-stage-featured-kicker">PFMP · RECHERCHE ASSISTÉE</span><h2>Trouve ton<br><em>prochain stage.</em></h2>'+
    '<p>Explore les lieux autour de toi, prépare ta candidature et organise tes relances.</p></div></div>'+
    '<button type="button" class="cs-stage-featured-button" data-action="student-stages"><span class="cs-stage-featured-icon" aria-hidden="true">⌖</span><span class="cs-stage-featured-button-copy"><strong>Ouvrir la recherche de stages</strong><small>Recherche par filière · Carnet de candidatures</small></span></button></section>'+
   '<section aria-label="Indicateurs de réussite" class="portal-stats">'+stats+'</section>'+
   '<section class="portal-section" id="portal-progression"><div class="portal-section-head"><div><span class="portal-kicker">01 / TA TRAJECTOIRE</span><h2>Tes moyennes, semaine après semaine.</h2><p>Seules les notes publiées sont comptabilisées. Une semaine sans contrôle reste vide.</p></div>'+
   '<div class="portal-select"><label for="portal-year">Année scolaire</label><select id="portal-year">'+
   yearList.map(y=>'<option value="'+y+'" '+(y===year?'selected':'')+'>'+formatYear(y)+'</option>').join('')+'</select></div></div>'+
   '<div class="portal-segment" role="group" aria-label="Choisir un semestre"><button class="'+(period==='s1'?'selected':'')+'" data-action="portal-period" data-period="s1" aria-pressed="'+(period==='s1')+'">Septembre — janvier</button>'+
   '<button class="'+(period==='s2'?'selected':'')+'" data-action="portal-period" data-period="s2" aria-pressed="'+(period==='s2')+'">Février — juin</button></div>'+
   '<div class="portal-chart-title"><strong>'+periodLabel+'</strong><span>'+formatYear(year)+' · '+periodGrades.length+' contrôle(s) noté(s)</span></div>'+
   graph(graphItems)+'</section>'+
   '<section class="portal-section" id="portal-results"><div class="portal-section-head"><div><span class="portal-kicker">02 / TES ÉVALUATIONS</span><h2>Copies et corrections.</h2><p>Consulte tes réponses, les points obtenus et les conseils de ton professeur.</p></div>'+
   '<span class="portal-count">'+finished.length+' corrigée(s)</span></div>'+
   (cards?'<div class="portal-results">'+cards+'</div>':'<div class="portal-empty">Aucune copie pour l’instant. Tes contrôles apparaîtront ici dès qu’ils seront rendus.</div>')+'</section>'+
   '<section class="portal-section" id="portal-revisions"><div class="portal-section-head"><div><span class="portal-kicker">03 / TON PARCOURS DE RÉVISION</span><h2>Albert t’aide à progresser.</h2><p>'+
    (opts.preview?'Albert examine les 13 contrôles corrigés de cet élève fictif : notes, questions, retours du professeur, difficultés et progression.':
    'Les aides automatiques sur les copies réelles nécessitent une validation institutionnelle et ne sont pas activées.')+
    '</p></div><span class="portal-count">✦ Aides Albert</span></div>'+
   (opts.preview?
    '<div class="portal-albert-tips"><button type="button" data-action="portal-albert-tips">✦ Analyser mes 13 contrôles avec Albert</button>'+
     '<div id="cortex-albert-tips-slot" class="portal-albert-tips-slot" role="status" aria-live="polite">'+
      '<p class="portal-empty">Albert examine les 13 copies corrigées de la démonstration pour proposer un bilan fondé sur leurs notes, annotations et compétences.</p></div></div>'+
     '<p class="portal-revision-note">Ces aides portent uniquement sur les contrôles fictifs du carnet, sans transmettre de véritable copie. Aucune note ni correction du professeur n’est modifiée.</p>':
    '<p class="portal-empty">L’analyse IA des copies réelles est désactivée en attente des autorisations nécessaires. Consulte la correction et les observations de ton professeur.</p>')+'</section>'+
   '<div class="portal-footer-tools"><button data-action="portal-export" class="portal-secondary-button">↓ Exporter mon bilan (CSV)</button>'+
   '<button data-action="portal-print" class="portal-secondary-button">▤ Imprimer mon bilan</button></div>'+
   '<p class="portal-demo-warning">Prototype GitHub : aucune synchronisation ni confidentialité réelle entre comptes. Les notes et PIN sont conservés localement et l’espace professeur reste public. Ne pas utiliser avec de véritables élèves.</p>'+
   '</div></div>';
 }
 function correction(state,session,id){
  const at=candidate(state,session.classId,session.number,id);
  if(!at)return '<div class="portal-root"><div class="portal-main"><h1>Correction non disponible.</h1><p>Cette copie n’est pas publiée ou ne correspond pas à ton compte.</p><button data-action="portal-back" class="portal-main-button">Retour</button></div></div>';
  const exam=(state.exams||[]).find(e=>e.id===at.examId);
  if(!exam)return '<p>Contrôle introuvable.</p>';
  const questions=(exam.questions||[]).map((q,i)=>{
   const answer=at.answers?.[q.id],points=at.marks?.[q.id]?.points,hasPoints=typeof points==='number'&&Number.isFinite(points),comment=at.marks?.[q.id]?.comment;
   const choice=q.type==='choice'&&Array.isArray(q.choices)&&q.correct!=null&&Number.isInteger(Number(q.correct))&&q.choices[q.correct];
   const sourceText=String(q.doc||exam.doc||exam.sourcePages?.[Math.max(0,Number(q.page||1)-1)]||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,2200);
   const answerText=choice&&/^\d+$/.test(String(answer??''))?q.choices[Number(answer)]??answer:answer;
   return '<article class="portal-question"><div class="portal-question-top"><span>QUESTION '+(i+1)+' / '+exam.questions.length+'</span>'+
    (hasPoints?'<strong>'+grade(points)+' / '+grade(q.points)+' pt</strong>':'<strong>Commentaire</strong>')+'</div>'+
    '<h3>'+esc(q.prompt)+'</h3><div class="portal-response"><span>TA RÉPONSE</span><p>'+esc(String(answerText??'').trim()||'Aucune réponse donnée')+'</p></div>'+
    (choice?'<div class="portal-expected"><span>RÉPONSE ATTENDUE (QCM)</span><p>'+esc(q.choices[q.correct])+'</p></div>':'')+
    (comment?'<div class="portal-feedback"><span>RETOUR DU PROFESSEUR</span><p>'+esc(comment)+'</p></div>':'')+
    (sourceText?'<details class="portal-document"><summary>Consulter le document utilisé pour cette question</summary><p>'+esc(sourceText)+'</p></details>':'')+
    '</article>';
  }).join('');
  const general=String(at.feedback||'').trim();
  return '<div class="portal-root portal-correction"><div class="portal-main">'+
   '<div class="portal-correction-head"><button type="button" data-action="portal-back" class="portal-back">← Mon espace</button><span class="portal-tag">CORRECTION PUBLIÉE</span></div>'+
   '<div class="portal-correction-hero"><div><span class="portal-kicker">'+esc(date(at.submittedAt||at.startedAt))+' · '+esc(at.className||'Classe')+'</span><h1>'+esc(exam.title)+'</h1><p>Lis les retours question par question. L’important est de comprendre comment progresser.</p></div><div class="portal-correction-grade">'+grade(at.grade)+'<small>/20</small></div></div>'+
   (general?'<div class="portal-general"><span>APPRÉCIATION GÉNÉRALE</span><p>'+esc(general)+'</p></div>':'')+
   (id.startsWith('exemple-')?'<section class="portal-corrected-invitation"><div><span class="portal-kicker">✦ CONSEILS PERSONNALISÉS · ALBERT</span><h2>Et si tu allais plus loin que la note ?</h2><p>Albert lit ta correction déjà publiée et t’explique ce que tu réussis, ce que tu peux améliorer et comment progresser. Il ne change jamais les points du professeur.</p></div><button class="portal-albert-corrected" data-action="portal-albert-corrected" data-id="'+esc(at.id)+'">Découvrir les conseils d’Albert ✦</button><div class="portal-albert-corrected-slot" data-albert-copy="'+esc(at.id)+'" role="status" aria-live="polite"></div></section>':'')+
   '<div class="portal-section-head"><div><span class="portal-kicker">TON TRAVAIL</span><h2>La correction en détail.</h2></div><span class="portal-count">'+exam.questions.length+' question(s)</span></div>'+
   '<div class="portal-question-grid">'+questions+'</div>'+
   (exam.sourceId?'<div class="portal-footer-tools"><button type="button" class="portal-secondary-button" data-action="portal-original" data-id="'+esc(at.id)+'">▤ Voir le document original</button></div>':'')+
   '<div class="portal-footer-tools"><button type="button" class="portal-secondary-button" data-action="portal-back">← Revenir aux résultats</button><button type="button" class="portal-secondary-button" data-action="portal-print">▤ Imprimer</button></div>'+
   '<p class="portal-demo-warning">Les documents sources complexes peuvent ne pas être reproduits dans cet aperçu ; l’enseignant doit vérifier la correction avant publication.</p>'+
   '</div></div>';
 }
 function exportCsv(state,session){
  const list=mine(state,session.classId,session.number).filter(eligible).sort((a,b)=>a.submittedAt-b.submittedAt);
  const rows=['Date;Annee scolaire;Semestre;Controle;Note sur 20'];
  for(const at of list){
   const y=keyYear(at.submittedAt),d=new Date(at.submittedAt),p=d.getMonth()>=8||d.getMonth()===0?'S1':'S2';
   const title=(state.exams||[]).find(e=>e.id===at.examId)?.title||'Évaluation';
   const cell=x=>'"'+String(x).replace(/"/g,'""')+'"';
   rows.push([d.toLocaleDateString('fr-FR'),y+'-'+(y+1),p,cell(title),String(at.grade).replace('.',',')].join(';'));
  }
  return '\ufeff'+rows.join('\r\n');
 }
 
 function previewData(demoSeed){
  const year=keyYear(Date.now())-1,cl={id:'exemple-eleve',name:'2MRC2 · Exemple',archived:false,studentCount:30,groups:[]};
  const topics=['Le sommeil','Les rythmes biologiques','L’alimentation','Le stress','Les risques professionnels','Les addictions','Le système de santé','Les risques auditifs','L’équilibre alimentaire','L’environnement','La prévention'];
  const records=[
   [8,9,11],[8,23,13],[9,9,14],[9,27,15],[10,18,12],[11,9,16],
   [0,15,17],[1,13,14],[2,10,15],[3,22,16],[4,18,17],[5,5,18]
  ];
  const exams=[],attempts=[];
  records.forEach(([month,day,score],i)=>{
   const calendarYear=month>=8?year:year+1,examId='exemple-examen-'+i;
   const q1='expl-'+i,q2='qcm-'+i,topic=topics[i%topics.length],q1Points=Math.min(10,Math.ceil(score/2)),q2Points=Math.max(0,score-q1Points);
   const stamp=new Date(calendarYear,month,day,11,20).getTime();
   exams.push({id:examId,title:topic,level:'Seconde',duration:45,open:true,questions:[
    {id:q1,prompt:'Explique une notion importante du chapitre « '+topic+' » et donne un exemple concret.',points:10,type:'text'},
    {id:q2,prompt:'Présente une démarche de prévention et explique son utilité dans une situation concrète.',points:10,type:'text'}
   ]});
   attempts.push({id:'exemple-copie-'+i,examId,classId:cl.id,className:cl.name,studentNumber:'12',
    groupName:'Classe entière',status:'submitted',submittedAt:stamp,startedAt:stamp-2700000,
    grade:score,reviewedAt:stamp+86400000,publishedToStudent:true,feedback:i%3===0?'Tu maîtrises plusieurs notions. Pour progresser, pense à toujours expliquer tes choix avec un exemple précis.':'Travail sérieux. Continue à structurer tes réponses et à justifier chaque étape.',
    marks:{[q1]:{points:q1Points,comment:i%3===0?'Une définition juste, mais il manque une justification ou un exemple.':'Bonne démarche. Tu peux enrichir ton explication.'},[q2]:{points:q2Points,comment:q2Points<7?'Relis la démarche de prévention et explique pourquoi elle est utile.':'Tu identifies correctement la prévention adaptée.'}},
    answers:{[q1]:'Je peux expliquer le principe et proposer une action de prévention.',
     [q2]:'Identifier les risques puis adopter une mesure adaptée. Je dois encore justifier son utilité par un exemple précis.'}});
  });
  // Copie du contrôle PSE fictif, réellement en attente de validation du professeur.
  // Le serveur Albert connaît exclusivement ce jeu de 20 réponses fictives.
  const sourceExam=demoSeed?.exams?.find(e=>e.id==='sommeil-pdf-a2')||window.CORTEX_DOCS?.demoExam;
  const sourceCopy=demoSeed?.attempts?.find(a=>a.id==='ex-pdf-demo');
  if(sourceExam&&sourceCopy&&Array.isArray(sourceExam.questions)&&sourceExam.questions.length===20){
   exams.push(JSON.parse(JSON.stringify(sourceExam)));
   const stamp=Date.now()-25*60*1000;
   // Copie PSE fictive de référence : correction VALIDÉE PAR LE PROFESSEUR,
   // 20 questions avec points, commentaires précis et appréciation globale.
   const assigned=[1,1,.75,1,.75,1.5,.5,.5,1,1,1.25,1,.5,1,.75,1,.75,1,1,.5];
   const comments=[
    'Calcul exact : 8 − 4 = 4 heures de déficit chaque nuit de cours.',
    'Les deux comportements retardant le sommeil sont correctement identifiés.',
    'La conséquence scolaire est correcte. Précise une conséquence relationnelle distincte.',
    'La problématique est formulée sous forme d’une question pertinente.',
    'Les deux définitions sont présentes ; précise la notion de périodicité.',
    'Les rythmes ultradien, circadien et infradien sont bien classés.',
    'Tu distingues correctement le rythme social d’un mécanisme biologique.',
    'La durée moyenne d’un cycle de sommeil est bien indiquée.',
    'Le calcul est justifié : 450 ÷ 90 = 5 cycles.',
    'Le sommeil lent profond et le sommeil paradoxal sont bien associés aux fonctions demandées.',
    'L’explication est correcte ; développe le rôle du sommeil dans la consolidation des apprentissages.',
    'Deux effets pertinents sont relevés.',
    'Une seule conséquence sociale est clairement donnée. Ajoute un deuxième exemple.',
    'Les informations du document sont identifiées avec précision.',
    'Le danger professionnel est pertinent ; illustre-le par un exemple concret.',
    'Tu expliques correctement la mélatonine et la perturbation liée à la lumière.',
    'La différence entre les horaires est repérée ; explicite le décalage de l’horloge biologique.',
    'Les difficultés de sommeil et de vie sociale sont bien repérées.',
    'La contrepartie et le principe du compte professionnel de prévention sont présents.',
    'Deux conseils sont cités, mais il faut préciser quand éteindre les écrans et proposer une mesure adaptée à Dylan.'
   ];
   const fullMarks=Object.fromEntries(sourceExam.questions.map((q,i)=>[q.id,{
    points:assigned[i],comment:comments[i]
   }]));
   attempts.push({
    id:'exemple-corrige-sommeil',examId:'sommeil-pdf-a2',classId:cl.id,className:cl.name,
    studentNumber:'12',groupName:'Classe entière',status:'submitted',
    submittedAt:Date.now()-9*24*60*60*1000,
    startedAt:Date.now()-9*24*60*60*1000-60*60*1000,
    grade:17.75,publishedToStudent:true,
    reviewedAt:Date.now()-8*24*60*60*1000,
    feedback:'Copie sérieuse et bien structurée : 17,75/20. Tu sais lire les documents et effectuer les calculs. Pour progresser, distingue davantage les conséquences scolaires et sociales et justifie les conseils de prévention.',
    marks:fullMarks,
    answers:{...JSON.parse(JSON.stringify(sourceCopy.answers||{})),
     pdfq3:'Il se concentre moins bien en classe et devient irritable.',
     pdfq13:'Il se dispute avec ses amis.'}
   });
   attempts.push({
    id:'exemple-attente-albert',examId:'sommeil-pdf-a2',classId:cl.id,className:cl.name,
    studentNumber:'12',groupName:'Classe entière',status:'submitted',
    submittedAt:stamp,startedAt:stamp-60*60*1000,
    grade:null,feedback:'',marks:{},answers:JSON.parse(JSON.stringify(sourceCopy.answers||{})),
    reviewedAt:null,publishedToStudent:false
   });
  }
  return {classes:[cl],exams,attempts,events:[],studentPins:{},studentReviewFlags:{},activeAttemptId:null};
 }
return {level,getClassCode,makeCode,classPanel,eligible,keyYear,periodBounds,schoolYears,average,periodAttempts,weeks,mine,candidate,studentLogin,dashboard,correction,exportCsv,previewData};
})();
