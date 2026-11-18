window.CORTEX_CLASSES=(function classModule(){
'use strict';
const NAMES=['2MRC1','2MRC2','2MRC3','2GA','2GA2','1MA','1AGORA','1AGORA2','1MCV1','1MCV2','3PM'];
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const codeName=(s)=>String(s||'').trim().toUpperCase().replace(/\s+/g,' ');
const id=()=>String(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9));
function classes(){return NAMES.map(name=>({id:name.toLowerCase(),name,groups:[],archived:false}));}
function init(state){
 if(!Array.isArray(state.classes))state.classes=classes();
 if(!Array.isArray(state.assignments))state.assignments=[];
 for(const cl of state.classes){cl.groups ||= [];if(cl.archived==null)cl.archived=false;}
 const demo=state.exams.find(e=>e.id==='sommeil-pdf-a2');
 if(demo&&!state.assignments.some(a=>a.examId===demo.id)){
  state.assignments.push({id:'demo-sommeil-2mrc1',examId:demo.id,classId:'2mrc1',groupId:null,
    token:'DEMO-CORTEX-2MRC1-A2',active:true,createdAt:Date.now()});
 }
 for(const at of state.attempts){
  if(at.id==='ex-pdf-demo'&&!at.assignmentId){
    at.classId='2mrc1';at.className='2MRC1';at.groupId=null;at.groupName='Classe entière';at.assignmentId='demo-sommeil-2mrc1';
  }
 }
 return state;
}
function byId(s,key){return s.classes.find(c=>c.id===key)}
function group(s,clId,gId){return byId(s,clId)?.groups?.find(g=>g.id===gId)}
function classLabel(s,key,fallback='Classe non renseignée'){return byId(s,key)?.name||fallback}
function groupLabel(s,clId,groupId,fallback='Classe entière'){return groupId?group(s,clId,groupId)?.name||fallback:'Classe entière'}
function assignmentLabel(s,a){return classLabel(s,a.classId)+(a.groupId?' · '+groupLabel(s,a.classId,a.groupId):' · Classe entière')}
function assignments(s,examId){return s.assignments.filter(a=>a.examId===examId&&a.active&&!byId(s,a.classId)?.archived&&!group(s,a.classId,a.groupId)?.archived);}
function assignedTo(s,examId,clId,grId=''){
 return assignments(s,examId).some(a=>a.classId===clId&&(!grId||a.groupId===grId));
}
function copyMatch(at,clId,grId){return (!clId||at.classId===clId)&&(!grId||at.groupId===grId);}
function classSelect(s,current='',label='Toutes les classes'){
 return `<select id="teacher-class-filter" data-class-filter aria-label="Filtrer par classe"><option value="">${h(label)}</option>${s.classes.filter(c=>!c.archived).map(c=>`<option value="${h(c.id)}" ${current===c.id?'selected':''}>${h(c.name)}</option>`).join('')}</select>`;
}
function groupSelect(s,clId,current='',label='Tous les groupes'){
 const cl=byId(s,clId);const groups=cl?.groups?.filter(g=>!g.archived)||[];
 return `<select id="teacher-group-filter" data-group-filter aria-label="Filtrer par demi-groupe" ${!groups.length?'disabled':''}><option value="">${h(label)}</option>${groups.map(g=>`<option value="${h(g.id)}" ${current===g.id?'selected':''}>${h(g.name)}</option>`).join('')}</select>`;
}
function filterBar(s,clId='',grId=''){
 return `<div class="class-filter-bar"><div><span class="class-filter-kicker">ORGANISER PAR CLASSE</span><p>Retrouve les contrôles et les copies du groupe sélectionné.</p></div><div class="class-filters">${classSelect(s,clId)}${groupSelect(s,clId,grId)}<button class="btn ghost small" data-action="class-go" ${!clId?'disabled':''}>Voir la classe</button></div></div>`;
}
function overview(s,selected){
 const active=s.classes.filter(x=>!x.archived);
 const cards=active.map(c=>{
  const assigned=s.assignments.filter(a=>a.classId===c.id&&a.active),ctrl=new Set(assigned.map(a=>a.examId));
  const submissions=s.attempts.filter(a=>a.classId===c.id&&a.status==='submitted');
  const pending=submissions.filter(a=>a.grade==null);
  const numGroups=c.groups.filter(g=>!g.archived).length;
  return `<button type="button" class="class-card ${selected===c.id?'chosen':''}" data-action="class-open" data-id="${h(c.id)}">
    <span class="class-card-upper">CLASSE · PSE</span><strong>${h(c.name)}</strong>
    <span class="class-card-note">${numGroups?numGroups+' demi-groupe(s)':'Classe entière'}</span>
    <span class="class-card-bottom"><span>${ctrl.size} contrôle(s)</span><span>${submissions.length} copie(s)${pending.length?' · '+pending.length+' à corriger':''}</span></span>
  </button>`;
 }).join('');
 const current=byId(s,selected);
 return `<div class="classes-page"><div class="page-head"><div><p class="eyebrow">Espace professeur · Organisation</p>
   <h1>Mes classes</h1><p>Une classe, ses demi-groupes, ses contrôles et ses copies.</p></div></div>
   <div class="class-addbar"><div class="field"><label for="new-class-name">Ajouter une classe</label><input id="new-class-name" type="text" maxlength="32" placeholder="Ex. Terminale MA"></div>
    <button class="btn" data-action="class-add">＋ Ajouter la classe</button></div>
   <div class="class-grid">${cards||'<p>Aucune classe active. Ajoute une classe ci-dessus.</p>'}</div>
   ${current&&!current.archived?details(s,current):`<div class="class-welcome"><strong>Sélectionne une classe</strong><p>Tu pourras organiser ses groupes, attribuer un contrôle et générer les QR codes à distribuer aux élèves.</p></div>`}
   <p class="class-safety">Les suppressions de classes et de demi-groupes sont des archivages : les copies et les corrections existantes sont conservées. Toutes ces données restent fictives et locales.</p>
   </div>`;
}
function details(s,cl){
 const groups=cl.groups.filter(g=>!g.archived),split=groups.length>0;
 const as=s.assignments.filter(a=>a.classId===cl.id&&a.active),
  listed=s.exams.filter(e=>as.some(a=>a.examId===e.id));
 const copies=s.attempts.filter(a=>a.classId===cl.id&&a.status==='submitted'),
  pending=copies.filter(a=>a.grade==null);
 const groupChoices=split?groups.map(g=>`<option value="${h(g.id)}">${h(g.name)}</option>`).join(''):'<option value="">Classe entière</option>';
 return `<section class="class-details panel" id="class-details">
   <div class="panel-head"><div><p class="eyebrow">FICHE CLASSE</p><h2>${h(cl.name)}</h2>
     <p>${copies.length} copie(s) · ${pending.length} à corriger · ${listed.length} contrôle(s) affecté(s)</p></div>
     <div class="btn-row"><button class="btn secondary small" data-action="access-manage" data-id="${h(cl.id)}">⌑ PIN élèves</button>
      <button class="btn secondary small" data-action="class-show-copies" data-id="${h(cl.id)}">Corriger les copies →</button>
       <button class="btn danger small" data-action="class-ask-delete" data-id="${h(cl.id)}">Supprimer la classe</button></div></div>
   <div class="class-detail-cols">
     <div class="class-detail-area"><h3>Organisation des demi-groupes</h3><p class="muted small">Par défaut, la classe est entière. Tu peux activer les groupes 1 et 2 ou créer d’autres groupes.</p>
       <div class="btn-row">${!split?`<button class="btn secondary small" data-action="class-split" data-id="${h(cl.id)}">Séparer en demi-groupes 1 et 2</button>`:
       `<button class="btn ghost small" data-action="class-merge" data-id="${h(cl.id)}">Revenir en classe entière</button>`}</div>
       <div class="class-groups">${groups.map(g=>`<div class="class-group-row"><span>◈ ${h(g.name)}</span>
         <div class="btn-row"><button class="btn ghost small" data-action="class-group-copies" data-id="${h(cl.id)}" data-group="${h(g.id)}">Copies</button>
         <button class="btn danger small" data-action="class-ask-delete-group" data-id="${h(cl.id)}" data-group="${h(g.id)}">Supprimer</button></div></div>`).join('')}</div>
       <div class="class-addgroup"><input id="class-new-group" type="text" maxlength="32" placeholder="Nom du demi-groupe"><button class="btn secondary small" data-action="class-group-add" data-id="${h(cl.id)}">＋ Ajouter un demi-groupe</button></div>
     </div>
     <div class="class-detail-area"><h3>Affecter un contrôle</h3><p class="muted small">Choisis le contrôle puis la classe entière ou son demi-groupe. Le QR sera distinct pour chaque affectation.</p>
       <div class="field"><label for="class-assign-exam">Contrôle à proposer</label><select id="class-assign-exam"><option value="">Choisir un contrôle…</option>${s.exams.map(e=>`<option value="${h(e.id)}">${h(e.title)}</option>`).join('')}</select></div>
       <div class="field"><label for="class-assign-group">Destination</label><select id="class-assign-group">${groupChoices}</select></div>
       <button class="btn full" data-action="class-assign" data-id="${h(cl.id)}">Affecter et créer l'accès QR</button>
       <p class="muted small">Le contrôle doit être publié pour qu'un élève puisse l'ouvrir.</p>
     </div>
   </div>
   <div class="class-assignment-section"><div class="panel-head"><h3>Contrôles et QR codes de ${h(cl.name)}</h3><span class="chip teal">${as.length} accès</span></div>
   ${as.length?`<div class="class-assign-list">${as.map(a=>{
     const e=s.exams.find(e=>e.id===a.examId);if(!e)return'';
     const sub=s.attempts.filter(x=>x.assignmentId===a.id&&x.status==='submitted');
     return `<div class="class-assignment-row"><div><strong>${h(e.title)}</strong><small>${h(groupLabel(s,a.classId,a.groupId))} · ${sub.length} copie(s) · ${e.open?'Publié':'Brouillon'}</small></div>
        <div class="btn-row"><button class="btn secondary small" data-action="class-open-qr" data-id="${h(a.id)}">▣ Générer QR</button>
         <button class="btn secondary small" data-action="access-manage" data-id="${h(a.id)}">⌑ PIN élèves</button>
        <button class="btn ghost small" data-action="class-assignment-copies" data-id="${h(a.id)}">Copies</button>
        <button class="btn danger small" data-action="class-unassign" data-id="${h(a.id)}">Retirer</button></div></div>`;
     }).join('')}</div>`:'<div class="empty">Aucun contrôle affecté à cette classe.</div>'}</div></section>`;
}
function qrChoices(s,exam){
 const list=assignments(s,exam.id);
 return `<div class="class-qr-list"><p class="muted small">Chaque QR correspond à un contrôle, une classe et éventuellement un demi-groupe. Seul l’espace professeur de démonstration propose la génération.</p>
  ${list.map(a=>`<button type="button" class="class-qr-pick" data-action="class-open-qr" data-id="${h(a.id)}"><span><strong>${h(assignmentLabel(s,a))}</strong><small>Contrôle : ${h(exam.title)}</small></span><span>Voir le QR ▣</span></button>`).join('')}
  ${!list.length?'<div class="empty">Aucun QR actif. Affecte d’abord le contrôle à une classe dans « Mes classes ».</div>':''}
  <button class="btn secondary full" data-action="class-open-manager">Gérer les affectations dans Mes classes →</button>
 </div>`;
}
function qrLink(a){
 const base=location.origin+location.pathname;
 // Ces métadonnées permettent de reconnaître le contrôle de démonstration sur un autre appareil.
 // Elles ne constituent PAS une preuve d'identité ni un droit d'accès sécurisé.
 const cl=a.classId||'2mrc1',groupId=a.groupId||'entier',examId=a.examId||'sommeil-pdf-a2';
 return `${base}#eleve/rejoindre/${encodeURIComponent(a.id)}/${encodeURIComponent(a.token)}/${encodeURIComponent(cl)}/${encodeURIComponent(groupId)}/${encodeURIComponent(examId)}`;
}
function hydrateQrDemo(state,parts){
 const [id,token,classId,groupRaw,examId]=parts;
 if(!id||!token||!classId||!examId)return false;
 if(state.assignments.some(a=>a.id===id))return false;
 // En mode statique, seul le véritable contrôle PSE de démonstration est distribuable
 // sans transfert de données depuis le navigateur du professeur.
 if(examId!=='sommeil-pdf-a2'||!state.exams.some(e=>e.id===examId&&e.pdfSource))return false;
 if(id.length>100||token.length>128||!/^[-a-z0-9]{2,80}$/i.test(id)||
 !/^(QR-[a-z0-9]+|DEMO-CORTEX-[a-z0-9-]+)$/i.test(token))return false;
 const classroom=state.classes.find(c=>c.id===classId&&!c.archived);
 if(!classroom)return false;
 const groupId=groupRaw==='entier'?null:groupRaw;
 if(groupId){
   if(!/^(g[12]|g-[a-z0-9-]{1,35})$/i.test(groupId))return false;
   let g=classroom.groups.find(g=>g.id===groupId);
   if(!g){g={id:groupId,name:groupId==='g1'?'Demi-groupe 1':groupId==='g2'?'Demi-groupe 2':'Demi-groupe',archived:false};classroom.groups.push(g);}
   if(g.archived)return false;
 }
 state.assignments.push({id,token,classId,groupId,examId,active:true,createdAt:Date.now(),demoQr:true});
 return true;
}
function qrModal(s,a,e,url){
 return `<div class="qr-sheet"><span class="chip teal">QR professeur · ${h(assignmentLabel(s,a))}</span>
  <h3>${h(e.title)}</h3><p class="muted small">Les élèves scannent ce QR pour ouvrir directement la page de leur classe et groupe, puis leur numéro de liste et leur PIN.</p>
  <div id="class-qr-image" class="qr-image"><span>Création du QR code…</span></div>
  <div class="class-qr-details"><span>CLASSE / GROUPE</span><strong>${h(assignmentLabel(s,a))}</strong><span>DURÉE</span><strong>${Number(e.duration)||60} minutes</strong></div>
  <div class="class-qr-url">${h(url)}</div>
  <div class="btn-row"><button class="btn" data-action="class-qr-copy" data-id="${h(a.id)}">Copier le lien</button>
    <button class="btn secondary" data-action="class-qr-download" data-id="${h(a.id)}">Télécharger le QR</button>
    <button class="btn ghost" data-action="class-qr-simulate" data-id="${h(a.id)}">Simuler le scan</button>
     <button class="btn secondary" data-action="access-manage" data-id="${h(a.id)}">⌑ Gérer les PIN élèves</button></div>
  <p class="class-qr-warning">Démonstration GitHub : le QR transmet une destination, pas une authentification sécurisée. Les copies ne sont pas synchronisées entre appareils.</p></div>`;
}
async function drawQr(url,selector='class-qr-image'){
 const target=document.getElementById(selector);if(!target)return;
 const lib='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
 if(!window.QRCode){
  await new Promise((resolve,reject)=>{
    const tag=document.createElement('script');tag.src=lib;tag.async=true;tag.onload=resolve;
    tag.onerror=()=>reject(Error('Générateur QR indisponible. Tu peux copier le lien.'));document.head.appendChild(tag);
  });
 }
 if(!target.isConnected)return;
 target.replaceChildren();
 new window.QRCode(target,{text:url,width:230,height:230,colorDark:'#0a2630',colorLight:'#ffffff',
  correctLevel:window.QRCode.CorrectLevel.M});
}
function landing(s,assignment,exam,invalid=false,options={}){
 if(invalid||!assignment||!exam){
  return '<div class="qr-student-landing panel"><div class="qr-landing-icon">!</div><h1>QR code non reconnu</h1>'+
   '<p>Ce contrôle n’est pas accessible sur cet appareil. Sans serveur, les contrôles personnalisés ne sont pas synchronisés.</p>'+
   '<button class="btn secondary" data-action="home">Retour à l’accueil</button></div>';
 }
 const cl=byId(s,assignment.classId);
 const number=window.CORTEX_ACCESS?.normalizeNumber(options.number,cl)||'';
 const mode=options.step==='ready'&&options.authorized&&number?'ready':options.step==='pin'&&number?'pin':'identify';
 const registered=mode==='pin'&&!!window.CORTEX_ACCESS?.record(s,cl,number);
 const head=mode==='ready'?'Ton contrôle est prêt.':mode==='pin'?(registered?'Retrouve ton contrôle.':'Crée ton PIN personnel.'):'Bienvenue dans ta classe.';
 const label=classLabel(s,assignment.classId),groupName=groupLabel(s,assignment.classId,assignment.groupId);
 const numberForm='<p class="muted">Saisis ton <strong>numéro sur la liste de classe</strong> (et non ton numéro de téléphone).</p>'+
  '<div class="field"><label for="student-number">Mon numéro de liste</label>'+
  '<input id="student-number" type="text" inputmode="numeric" pattern="[0-9]{1,3}" maxlength="3" autocomplete="off"'+
  ' placeholder="Ex. 12" aria-describedby="student-number-hint" required>'+
  '<small id="student-number-hint">Entre 1 et '+window.CORTEX_ACCESS.count(cl)+' selon ta classe.</small></div>';
 const identity='<div class="qr-identity-confirm"><span>NUMÉRO DE LISTE</span><strong>N° '+h(number)+'</strong>'+
  '<button type="button" class="btn ghost small" data-action="class-student-edit-number">Modifier le numéro</button></div>';
 const pinForm='<p class="muted">'+(registered?'Un PIN a déjà été créé pour ce numéro. Saisis ton PIN personnel à 6 chiffres pour accéder à tes évaluations.':
   'Première connexion : choisis toi-même un PIN de <strong>6 chiffres</strong>. Tu le réutiliseras pour les autres contrôles de cette classe.')+'</p>'+
  '<div class="field"><label for="student-pin">'+(registered?'Mon PIN personnel':'Créer mon PIN à 6 chiffres')+'</label>'+
  '<input id="student-pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" minlength="6" autocomplete="off" placeholder="● ● ● ● ● ●" required>'+
  '<small>Ne partage pas ton PIN avec tes camarades.</small></div>'+
  (registered?'':'<div class="field"><label for="student-pin-confirm">Confirmer mon PIN</label>'+
  '<input id="student-pin-confirm" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" minlength="6" autocomplete="off" placeholder="● ● ● ● ● ●" required>'+
  '<small>Retape exactement les 6 chiffres.</small></div>');
 const readyNote='<div class="qr-start-notice"><span>✓</span><div><strong>PIN validé.</strong>'+
  '<p>Le décompte de '+(Number(exam.duration)||60)+' minutes commencera lorsque tu appuieras sur « Démarrer le contrôle ».</p></div></div>';
 const action=mode==='identify'?'class-student-number':mode==='pin'?'class-student-pin':'class-student-start';
 const actionLabel=mode==='identify'?'Continuer →':mode==='pin'?(registered?'Valider mon PIN →':'Créer mon PIN et continuer →'):'Démarrer le contrôle →';
 return '<div class="qr-student-landing panel">'+
  '<span class="chip teal">QR reconnu (démo) · '+h(label)+'</span>'+
  '<h1>'+head+'</h1><h2>'+h(label)+' · '+h(groupName)+'</h2>'+
  (mode==='identify'?numberForm:identity+(mode==='pin'?pinForm:''))+
  '<div class="qr-landing-exam"><span>TON ÉVALUATION</span><strong>'+h(exam.title)+'</strong>'+
  '<small>'+exam.questions.length+' questions · '+exam.duration+' minutes · '+(exam.open?'Prête':'Non publiée')+'</small></div>'+
  (mode==='ready'?readyNote:'')+
  '<button class="btn full" data-action="'+action+'" '+(!exam.open?'disabled':'')+'>'+actionLabel+'</button>'+
  '<p class="class-qr-warning">Démo GitHub : le PIN et la copie restent sur cet appareil, et la première connexion ne vérifie pas l’identité. Impossible de retrouver les PIN sur un autre téléphone sans serveur.</p>'+
  '</div>';
}
return {NAMES,classes,init,byId,group,classLabel,groupLabel,assignmentLabel,assignments,assignedTo,copyMatch,
 classSelect,groupSelect,filterBar,overview,qrChoices,qrLink,hydrateQrDemo,qrModal,drawQr,landing,codeName,id};
})();
