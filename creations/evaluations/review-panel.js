window.CORTEX_REVIEW=(function reviewModule(){
  'use strict';
  const esc = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = value=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(Number(value)||0);
  function isMark(m){return !!m && typeof m.points==='number' && Number.isFinite(m.points);}
  function totals(attempt,exam){
    const marks=attempt.marks||{},max=exam.questions.reduce((n,q)=>n+Number(q.points||0),0);
    const completed=exam.questions.filter(q=>isMark(marks[q.id])).length;
    const earned=exam.questions.reduce((n,q)=>n+(isMark(marks[q.id])?Math.max(0,Math.min(Number(q.points),marks[q.id].points)):0),0);
    return {completed,total:exam.questions.length,max,earned,grade:max?Math.round((earned/max)*2000)/100:0,ready:completed===exam.questions.length&&!!max};
  }
  function answer(attempt,q){
    const raw=String(attempt.answers?.[q.id]??'');
    if(!raw.trim())return '<div class="review-empty-answer">Aucune réponse pour cette question.</div>';
    if(q.number===6){
      const parts=raw.split(' | ');
      return '<div class="review-answer-table">'+['Battements du cœur','Alternance veille / sommeil','Cycle menstruel'].map((name,i)=>
        `<div><span>${esc(name)}</span><strong>${esc(parts[i]||'—')}</strong></div>`).join('')+'</div>';
    }
    if(q.number===10){
      const parts=raw.split(' | ');
      return `<div class="review-answer-table"><div><span>Récupération physique</span><strong>${esc(parts[0]||'—')}</strong></div><div><span>Rêves fréquents</span><strong>${esc(parts[1]||'—')}</strong></div></div>`;
    }
    if(q.type==='choice'){
      const selected=Number(raw);
      const response=q.choices?.[selected]||'Réponse non reconnue';
      const expected=Number.isInteger(q.correct)&&q.choices?.[q.correct]?`<div class="review-expected"><strong>Réponse attendue (QCM)</strong><span>${esc(q.choices[q.correct])}</span></div>`:'';
      return `<div class="review-written-response">${esc(response)}</div>${expected}`;
    }
    return `<div class="review-written-response">${esc(raw)}</div>`;
  }
  function source(exam,q,options={}){
    const captures=window.CORTEX_VISUAL?.renderAssets(exam,q,'review')||'';
    if(captures&&!options.original){
      return '<div class="review-source-label"><span class="review-source-tag">DOCUMENTS ASSOCIÉS À CETTE QUESTION</span><h3>Extraits fournis aux élèves</h3></div>'+
        '<div class="review-source-content">'+captures+'</div>';
    }
    if(q.doc && !exam.pdfSource && !exam.sourceId){
      return '<div class="review-source-label"><span class="review-source-tag">DOCUMENT ASSOCIÉ À CETTE QUESTION</span><h3>'+esc(exam.title)+'</h3></div>'+
        '<div class="review-generic-doc">'+esc(q.doc)+'</div>';
    }
    if(exam.pdfSource && window.CORTEX_DOCS?.sections){
      const section=window.CORTEX_DOCS.sections[q.section]||window.CORTEX_DOCS.sections[0];
      return `<div class="review-source-label"><span class="review-source-tag">DOCUMENT ORIGINAL · PARTIE ${(q.section||0)+1}/6</span><h3>${esc(section.title)}</h3><p>${esc(section.description)}</p></div><div class="review-source-content">${section.document}</div><div class="review-source-foot">Documents reproduits à partir du contrôle PSE de démonstration.</div>`;
    }
    if(exam.sourceId && exam.sourceType==='pdf'){
      const pn=q.page||1;
      return `<div class="review-source-label"><span class="review-source-tag">PDF IMPORTÉ · PAGE ${pn}/${exam.sourcePageCount||'?'}</span><h3>${esc(exam.sourceName||'Document original')}</h3><p>Cette page est celle que l'élève consulte pendant son contrôle.</p></div>
      <div class="review-source-content"><div id="review-source-canvas" class="import-original-canvas"><p class="small muted">Chargement du PDF original…</p></div>
      <details class="review-transcript"><summary>Voir le texte extrait</summary><pre class="doc-import-text">${esc(exam.sourcePages?.[pn-1]||'')}</pre></details></div>
      <button class="btn ghost small" data-action="review-original" data-id="${esc(exam.id)}">↗ Ouvrir le document intégral</button>`;
    }
    if(exam.sourceId){
      return '<div class="review-source-label"><span class="review-source-tag">DOCUMENT WORD ORIGINAL</span><h3>'+esc(exam.sourceName||'Document Word')+'</h3></div>'+
        '<div class="review-source-content"><div class="import-original-canvas" id="review-word-canvas"><p class="small muted">Affichage du Word original…</p></div></div>'+
        '<button class="btn ghost small" data-action="review-original" data-id="'+esc(exam.id)+'">↗ Ouvrir le document complet</button>';
    }
    if(exam.doc){
      return `<div class="review-source-label"><span class="review-source-tag">DOCUMENT PÉDAGOGIQUE</span><h3>${esc(exam.title)}</h3></div><div class="review-generic-doc">${esc(exam.doc)}</div>`;
    }
    return `<div class="review-no-source"><span aria-hidden="true">◇</span><h3>Aucun document joint</h3><p>Cette question a été créée sans document source.</p></div>`;
  }
  function render({attempt,exam,index=0}){
    if(!attempt||!exam)return '<section class="panel"><p>Copie introuvable.</p><button class="btn" data-action="review-back">Retour aux copies</button></section>';
    index=Math.max(0,Math.min(exam.questions.length-1,index));
    const q=exam.questions[index],m=attempt.marks?.[q.id]||{},t=totals(attempt,exam),scored=isMark(m);
    const sectionTitles=['Analyser une situation','Comprendre les rythmes','Les phases du sommeil','Santé et vie sociale','Désynchronisation','Prévention et travail de nuit'];
    const nav=exam.questions.map((x,i)=>{
      const completed=isMark(attempt.marks?.[x.id]);
      const answered=String(attempt.answers?.[x.id]??'').trim().length>0;
      const header=exam.pdfSource&&(i===0||x.section!==exam.questions[i-1].section)?`<div class="review-group-label">PARTIE ${x.section+1} · ${esc(sectionTitles[x.section]||'Questions')}</div>`:'';
      return header+`<button type="button" class="review-question-btn ${i===index?'selected':''}" data-action="review-select" data-index="${i}" ${i===index?'aria-current="step"':''}>
        <span class="review-q-index">${esc(x.number||i+1)}</span><span class="review-q-desc"><span>${esc(x.prompt)}</span><small>${fmt(x.points)} pt · ${completed?'Corrigée':answered?'À corriger':'Sans réponse'}</small></span>
        <span class="review-q-status ${completed?'done':answered?'pending':'empty'}" aria-hidden="true">${completed?'✓':answered?'•':'–'}</span></button>`;
    }).join('');
    const scoreButtons=[{label:'0',value:0},{label:'Moitié',value:Math.round(q.points*50)/100},{label:'Totalité',value:Number(q.points)}];
    const scoreControls=scoreButtons.map(b=>`<button type="button" class="review-score-quick ${scored&&Number(m.points)===b.value?'is-selected':''}" data-action="review-mark" data-value="${b.value}">${esc(b.label)}${b.label==='Totalité'?' · '+fmt(q.points)+' pt':''}</button>`).join('');
    return `<div class="review-workspace">
      <header class="review-head"><div><button class="review-back" data-action="review-back" type="button">← Retour aux copies</button><div class="eyebrow">CORTEX · ATELIER DE CORRECTION</div>
      <h1>Chaque réponse. Son document.</h1><p><strong>${esc(attempt.name)}</strong>${attempt.studentNumber?'<span class="class-copy-badge">N° '+esc(attempt.studentNumber)+'</span>':''}<span class="review-sep">·</span><span class="class-copy-badge">${esc(attempt.className||'Sans classe')}${attempt.groupId?' · '+esc(attempt.groupName||'Demi-groupe'):''}</span><span class="review-sep">·</span>${esc(exam.title)}<span class="review-sep">·</span>${exam.questions.length} questions</p></div>
      <div class="review-head-actions"><span class="chip teal">Démo · sauvegarde locale</span><button class="btn small" data-action="ai-chatgpt-copy" data-id="${esc(attempt.id)}">✦ Corriger avec ChatGPT</button><button class="btn secondary small" data-action="pdf-download-copy" data-id="${esc(attempt.id)}">↓ Télécharger cette copie en PDF</button><button class="btn ghost small" data-action="review-back">Terminer plus tard</button></div></header>
      <div class="review-summary">
        <div><span class="review-summary-label">Questions évaluées</span><strong>${t.completed} <small>/ ${t.total}</small></strong><div class="review-small-meter"><span style="width:${t.total?t.completed/t.total*100:0}%"></span></div></div>
        <div><span class="review-summary-label">Points attribués</span><strong>${fmt(t.earned)} <small>/ ${fmt(t.max)}</small></strong><small>Barème du contrôle</small></div>
        <div><span class="review-summary-label">Note calculée</span><strong>${fmt(t.grade)} <small>/ 20</small></strong><small>${t.ready?'Toutes les questions évaluées':'Provisoire · non validée'}</small></div>
        <div><span class="review-summary-label">Note enregistrée</span><strong>${attempt.grade==null?'—':fmt(attempt.grade)} <small>${attempt.grade==null?'':'/ 20'}</small></strong><small>${attempt.reviewedAt?'Validée dans la démo':'Note antérieure ou à valider'}</small></div>
      </div>
      <div class="review-layout">
      <nav class="review-question-list" aria-label="Questions de cette copie"><div class="review-pane-title"><div><span class="review-overline">NAVIGATION</span><h2>Questions</h2></div><span class="review-count">${t.completed}/${t.total}</span></div><div class="review-question-scroll">${nav}</div></nav>
      <section class="review-document-pane" aria-label="Document de la question ${index+1}"><div class="review-pane-title"><div><span class="review-overline">CONSIGNES ET RÉFÉRENCES</span><h2>Le document</h2></div><span class="review-source-badge">Source de l’élève</span></div>${source(exam,q)}</section>
      <section class="review-response-pane" aria-label="Correction de la question ${index+1}">
        <div class="review-pane-title"><div><span class="review-overline">QUESTION ${esc(q.number||index+1)} / ${exam.questions.length}</span><h2>Corriger la réponse</h2></div><span class="review-points-pill">${fmt(q.points)} pt${q.points>1?'s':''}</span></div>
        <div class="review-prompt">${esc(q.prompt)}</div>
        <div class="review-subhead"><span>RÉPONSE DE L’ÉLÈVE</span><span>${String(attempt.answers?.[q.id]??'').trim()?'Réponse enregistrée':'Non répondu'}</span></div>
        ${answer(attempt,q)}
        <div class="review-mark-zone"><div class="review-mark-title"><h3>Points attribués</h3><span>${scored?'✓ Évaluée':'À évaluer'}</span></div>
        <div class="review-quick-row">${scoreControls}</div>
        <div class="review-manual-row"><label for="review-points">Ajuster précisément</label><div><input id="review-points" type="number" min="0" max="${Number(q.points)}" step="0.25" inputmode="decimal" value="${scored?esc(m.points):''}" placeholder="—" aria-describedby="review-max"><span id="review-max">/ ${fmt(q.points)} pt</span></div><button type="button" class="review-clear" data-action="review-clear">Effacer la note</button></div>
        </div>
        <div class="field review-comment"><label for="review-comment">Commentaire pour cette question</label><textarea id="review-comment" data-review-comment rows="3" placeholder="Ex. : Bonne réponse, mais il manque une justification…">${esc(m.comment||'')}</textarea><small>Commentaires facultatifs, enregistrés automatiquement.</small></div>
        <div class="review-nextline"><button class="btn ghost" data-action="review-prev" ${index===0?'disabled':''}>← Précédente</button><span>Question ${index+1} sur ${exam.questions.length}</span><button class="btn" data-action="review-next" ${index===exam.questions.length-1?'disabled':''}>Suivante →</button></div>
      </section></div>
      <footer class="review-footer"><div class="review-feedback"><label for="review-general">Appréciation générale</label><textarea id="review-general" data-review-general rows="2" placeholder="Bilan global et conseils pour progresser…">${esc(attempt.feedback||'')}</textarea><small>Les données de cette démonstration ne quittent pas ce navigateur.</small></div>
        <div class="review-validation"><span>${t.ready?'Toutes les questions sont évaluées.':`${t.total-t.completed} question(s) restent à évaluer.`}</span>
        <button class="btn" data-action="review-validate" ${t.ready?'':'disabled'}>✓ Valider ${fmt(t.grade)} / 20</button></div></footer></div>`;
  }
  return {render,totals,source};
})();
