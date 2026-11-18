window.CORTEX_EDITOR=(function editorModule(){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(Number(n)||0);
const numbered=q=>Number.isFinite(Number(q.number))&&q.number!==undefined?String(q.number):null;
const sectionNames=['Analyser une situation','Comprendre les rythmes','Les phases du sommeil','Santé et vie sociale','Désynchronisation','Prévention et travail de nuit'];
function documentContent(exam,question){
  const module=window.CORTEX_REVIEW;
  const raw=module?.source?module.source(exam,question,{original:true}):'<p>Document indisponible.</p>';
  return raw.replaceAll('id="review-source-canvas"','id="editor-source-canvas"').replaceAll('data-action="review-original"','data-action="editor-original"').replaceAll('id="review-word-canvas"','id="editor-word-canvas"');
}
const visualPane=function visualPane(exam,q,index,sourceHtml){
 const items=exam.assets||[],associated=q.assetIds||[],helper=window.CORTEX_VISUAL;
 const bank=items.map(asset=>`<div class="ed-library-item"><img data-visual-id="${esc(asset.id)}" data-visual-drag="${esc(asset.id)}" draggable="true" alt="${esc(asset.name)}">
  <span>${esc(asset.name)}</span><button class="btn ${associated.includes(asset.id)?'secondary':'ghost'} small" data-action="${associated.includes(asset.id)?'visual-detach':'visual-attach'}" data-id="${esc(asset.id)}">${associated.includes(asset.id)?'Retirer de cette question':'Associer à cette question'}</button></div>`).join('');
 const original=(exam.sourceId||exam.pdfSource)?`<details class="ed-original-details"><summary>▤ Consulter le sujet original ${exam.sourceId?'('+esc(exam.sourceName||'document')+')':''}</summary>
   <div class="ed-original-body"><div class="visual-editor-tools">
    <button class="btn ghost small" data-action="visual-copy-source">Copier l’extrait</button>
    <button class="btn ghost small" data-action="visual-download-source">Télécharger en PNG</button>
    ${exam.sourceId?'<button class="btn secondary small" data-action="visual-return-import">Découper le PDF / Word</button>':''}
   </div><div id="visual-source-preview">${sourceHtml}</div></div></details>`:'';
 return `<div class="cortex-unified-document ed-document-unified">
   <label class="cortex-unified-doc-label" for="ed-qdoc">Texte / données du document (facultatif)</label>
   <textarea id="ed-qdoc" rows="4" maxlength="5000" data-question="${index}" data-qfield="doc" placeholder="Colle ici le texte ou les données destinées à l’élève pour cette question…">${esc(q.doc||'')}</textarea>
   <p class="cortex-unified-doc-hint">Texte associé uniquement à la question sélectionnée et visible par l’élève.</p>
   <div class="cortex-unified-image-preview" data-visual-dropzone tabindex="0" role="group" aria-label="Coller ou déposer une image pour la question">
    ${helper?.renderAssets(exam,q,'editor')||'<p class="cortex-unified-empty">Aucune image associée. Fais une capture d’écran ou choisis une image.</p>'}
    <div class="cortex-unified-buttons">
     <label class="btn secondary small" for="visual-editor-upload">＋ Choisir une image</label>
     <input id="visual-editor-upload" type="file" accept="image/png,image/jpeg,image/webp" data-visual-upload hidden>
     <button class="btn secondary small" data-action="visual-paste-image">▣ Coller une capture</button>
    </div>
    <p class="cortex-unified-doc-hint">Windows + Maj + S, puis Ctrl + V ici ; ou utilise les boutons. Chaque capture est liée à cette question.</p>
   </div>
   ${original}
   ${items.length?`<details class="ed-library-details"><summary>Réutiliser une capture du contrôle (${items.length})</summary><div class="visual-editor-library">${bank}</div></details>`:''}
  </div>`;
};
function render({exam,index=0,docTab='source'}){
  if(!exam||!Array.isArray(exam.questions))return '<div class="panel">Aucun contrôle en cours.</div>';
  if(!exam.questions.length)return '<div class="panel">Ajoute une question pour commencer.</div>';
  const q=exam.questions[index]||exam.questions[0],i=Math.min(index,exam.questions.length-1);
  const sample=!!exam.pdfSource,imported=!!exam.sourceId;
  const total=exam.questions.reduce((x,v)=>x+Number(v.points||0),0);
  const isExisting=exam.isNew===false;
  const sectionCount=window.CORTEX_DOCS?.sections?.length||6;
  const sourceSelect=sample?`<div class="field ed-document-reference"><label for="ed-section">Partie du sujet associée</label><select id="ed-section" data-question="${i}" data-qfield="section">
    ${Array.from({length:sectionCount},(_,j)=>`<option value="${j}" ${Number(q.section||0)===j?'selected':''}>Partie ${j+1} · ${esc(sectionNames[j]||'Documents')}</option>`).join('')}</select></div>`:
    imported?`<div class="field ed-document-reference"><label for="ed-page">Page du sujet original associée</label><select id="ed-page" data-question="${i}" data-qfield="page">${Array.from({length:Math.max(1,Math.min(35,Number(exam.sourcePageCount||exam.sourcePages?.length||1)))},(_,j)=>`<option value="${j+1}" ${Number(q.page||1)===j+1?'selected':''}>Page ${j+1}</option>`).join('')}</select></div>`:'';
  const associated=q.assetIds||[];
  const documentPanel=visualPane(exam,q,i,documentContent(exam,q));
  const types=window.CORTEX_QUESTION_TYPES;
  const typeField=sample?'<div class="ed-format-lock"><strong>Format du contrôle de référence préservé</strong><span>Les nouveaux contrôles disposent de neuf formats personnalisables.</span></div>':
    '<div class="field"><label for="ed-qtype">Type de question</label><select id="ed-qtype" data-question="'+i+'" data-qfield="type">'+
     types.TYPES.map(x=>'<option value="'+esc(x[0])+'" '+(types.type(q)===x[0]?'selected':'')+'>'+esc(x[1])+'</option>').join('')+
     '</select><small>Réponse rédigée, choix unique ou multiple, vrai/faux, tableau, association, numérique et champs à compléter.</small></div>';
  const typeExtras=sample?'':types.editorExtra(q,i,'demo');
  const cards=exam.questions.map((v,j)=>{
    const secTag=sample &&(j===0||v.section!==exam.questions[j-1].section)?`<div class="review-group-label">PARTIE ${Number(v.section||0)+1} · ${esc(sectionNames[Number(v.section||0)]||'Documents')}</div>`:'';
    return secTag+`<button class="review-question-btn ${j===i?'selected':''}" data-action="editor-select" data-index="${j}" type="button" ${j===i?'aria-current="step"':''}>
      <span class="review-q-index">${esc(numbered(v)||j+1)}</span>
      <span class="review-q-desc"><span>${esc(v.prompt||'Question à renseigner')}</span><small>${fmt(v.points)} pt · ${sample?'Partie '+(Number(v.section||0)+1):imported?'Page '+(v.page||1):'Question '+(j+1)}</small></span>
      <span class="review-q-status ${v.prompt.trim()?'done':'empty'}" aria-hidden="true">${v.prompt.trim()?'✓':'–'}</span></button>`;
  }).join('');
  const warning=total===20?'Barème sur 20 points':`Barème actuel : ${fmt(total)} points (20 conseillés)`;
  return `<div class="ed-workspace">
    <header class="review-head ed-header"><div><button class="review-back" data-action="go-exams">← Mes contrôles</button>
    <div class="eyebrow">CORTEX · ATELIER DE CONCEPTION</div><h1>${isExisting?'Modifier':'Créer'} un contrôle <em>avec ses documents.</em></h1>
    <p>Choisis une question pour retrouver sa source, modifier son énoncé et son barème, puis enregistrer le contrôle.</p></div>
    <div class="review-head-actions"><span class="chip teal">Démo · sauvegarde locale après validation</span>
    <button class="btn" data-action="save-exam">Enregistrer le contrôle ✓</button></div></header>
    <div class="ed-summary"><div><small>Questions</small><strong>${exam.questions.length}</strong></div><div><small>Barème</small><strong>${fmt(total)} <span>/ 20 conseillé</span></strong></div>
    <div><small>Documents</small><strong>${(exam.assets||[]).length} capture(s) · ${exam.questions.filter(x=>x.doc?.trim()).length} texte(s)</strong></div>
    <div><small>Publication</small><strong>${exam.open?'Publié':'Brouillon'}</strong></div></div>
    <details class="ed-settings" ${!isExisting?'open':''}><summary><span>⚙</span> Paramètres généraux <small>Titre · niveau · durée · sujet original</small></summary>
    <div class="ed-settings-body"><div class="form-grid">
    <div class="field"><label for="ed-title">Titre du contrôle</label><input id="ed-title" value="${esc(exam.title)}" data-editor="title" placeholder="Titre du contrôle"></div>
    <div class="field"><label for="ed-level">Niveau / classe</label><input id="ed-level" value="${esc(exam.level)}" data-editor="level"></div>
    <div class="field"><label for="ed-chapter">Chapitre</label><input id="ed-chapter" value="${esc(exam.chapter)}" data-editor="chapter"></div>
    <div class="field"><label for="ed-duration">Durée (minutes)</label><input id="ed-duration" type="number" min="5" max="240" value="${esc(exam.duration)}" data-editor="duration"></div></div>

    <div class="ed-upload-area"><label for="ed-upload">Importer un autre PDF ou Word</label><input type="file" id="ed-upload" accept=".pdf,.docx" data-demo-file><small>Il sera analysé localement dans ton navigateur ; aucun fichier n'est envoyé au serveur.</small><span class="small muted" id="pdf-status"></span></div>
    </div></details>
    <div class="review-layout ed-layout">
      <nav class="review-question-list ed-navigation" aria-label="Questions du contrôle"><div class="review-pane-title">
      <div><span class="review-overline">PLAN DE L'ÉVALUATION</span><h2>Questions</h2></div><span class="review-count">${exam.questions.length}</span></div>
      <div class="review-question-scroll">${cards}</div><div class="ed-nav-actions"><button class="btn ghost small full" data-action="editor-add-question">＋ Ajouter une question</button></div></nav>
      <section class="review-document-pane ed-document" aria-label="Document de la question ${i+1}">
      <div class="review-pane-title"><div><span class="review-overline">SOURCE PÉDAGOGIQUE</span><h2>Document associé</h2></div><span class="review-source-badge">${sample?'PDF reconstitué':imported?'Fichier importé':'Texte / cours'}</span></div>
      ${sourceSelect}${documentPanel}
      </section>
      <section class="review-response-pane ed-configuration" aria-label="Modification question ${i+1}">
      <div class="review-pane-title"><div><span class="review-overline">QUESTION ${esc(numbered(q)||i+1)} / ${exam.questions.length}</span><h2>Modifier la question</h2></div><span class="review-points-pill">${fmt(q.points)} pt</span></div>
      <div class="ed-config-body"><div class="field"><label for="ed-prompt">Énoncé affiché à l'élève</label>
      <textarea id="ed-prompt" rows="5" data-question="${i}" data-qfield="prompt" placeholder="Rédige la question…">${esc(q.prompt)}</textarea></div>
      <div class="ed-qfields"><div class="field"><label for="ed-points">Barème (points)</label><input id="ed-points" type="number" min="0.25" max="20" step="0.25" data-question="${i}" data-qfield="points" value="${esc(q.points)}"></div>
      ${typeField}</div>${typeExtras}
      <div class="ed-tools"><button class="btn ghost small" data-action="editor-move-up" ${i===0?'disabled':''}>↑ Monter</button>
      <button class="btn ghost small" data-action="editor-move-down" ${i===exam.questions.length-1?'disabled':''}>↓ Descendre</button>
      <button class="btn ghost small" data-action="editor-duplicate">Dupliquer</button>
      <button class="btn danger small" data-action="editor-delete" ${exam.questions.length<=1?'disabled':''}>Supprimer</button></div>
      </div>
      <div class="review-nextline"><button class="btn ghost" data-action="editor-prev" ${i===0?'disabled':''}>← Précédente</button>
      <span>${i+1} / ${exam.questions.length}</span><button class="btn" data-action="editor-next" ${i===exam.questions.length-1?'disabled':''}>Suivante →</button></div>
      </section></div>
      <footer class="ed-footer"><div><strong>Vérification avant enregistrement</strong><p>${esc(warning)} · Tous les énoncés doivent être renseignés.</p></div>
      <div class="btn-row"><button class="btn secondary" data-action="go-exams">Annuler</button><button class="btn" data-action="save-exam">Enregistrer le contrôle ✓</button></div>
      </footer></div>`;
}
return {render};
})();
