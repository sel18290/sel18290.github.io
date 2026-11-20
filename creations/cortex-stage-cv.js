/* Atelier CV et lettre : données conservées sans gestion visible de versions intermédiaires. */
(function () {
  'use strict';
  const { normalizePFMP } = window.CORTEX_STAGE_GUIDE;
  const fields = {
    cv: [
      ['profil', 'Mon profil', 'Présente ta formation, la PFMP recherchée et une qualité que tu peux expliquer.'],
      ['formation', 'Ma formation', 'Indique ton diplôme et les années. Ex. Bac pro AGOrA, 2025–2028.'],
      ['experiences', 'Mes expériences et projets', 'Décris ce que tu as fait lors d’un projet au lycée, d’une action associative ou d’une PFMP précédente.'],
      ['competences', 'Mes compétences', 'Note les outils ou activités que tu sais utiliser. Donne un exemple concret pour chaque compétence.'],
      ['interets', 'Mes centres d’intérêt (facultatif)', 'Choisis un intérêt dont tu peux parler en entretien.']
    ],
    lettre: [
      ['motivation', 'Pourquoi cette entreprise ?', 'Dis ce qui te plaît dans cette entreprise. Ajoute un détail que tu as réellement vérifié.'],
      ['qualites', 'Ce que je peux apporter', 'Choisis une qualité et raconte une situation où tu l’as montrée.'],
      ['objectif', 'Ce que j’aimerais apprendre', 'Nomme une ou deux missions que tu aimerais découvrir pendant ta PFMP.']
    ]
  };

  const element = (tag, cls, text) => {
    const item = document.createElement(tag);
    if (cls) item.className = cls;
    if (text) item.textContent = text;
    return item;
  };
  function button(text, cls, onClick) {
    const item = element('button', cls, text);
    item.type = 'button';
    item.addEventListener('click', onClick);
    return item;
  }
  const filled = value => typeof value === 'string' && value.trim();

  function finalText(entry, identity, kind, draft, period, programLabel) {
    const name = [identity.first, identity.last].filter(Boolean).join(' ');
    const identityLine = [identity.email, identity.phone].filter(Boolean).join(' · ');
    const header = [name || '[Prénom et nom]', identityLine, identity.school].filter(Boolean).join('\n');
    const target = entry.place.name || '[nom de la structure]';
    if (kind === 'cv') {
      const sections = fields.cv.filter(([key]) => filled(draft[key]))
        .map(([key, title]) => title.replace(' (facultatif)', '') + '\n' + draft[key].trim());
      return [header, 'CV · PFMP en bac pro ' + programLabel + '\n' +
        [entry.place.name, period].filter(Boolean).join(' · '), ...sections].join('\n\n');
    }
    return [
      header, ['À l’attention de l’équipe de ' + target, entry.place.address].filter(Boolean).join('\n'),
      'Objet : candidature pour une PFMP ' + period,
      'Madame, Monsieur,\n\nJe suis en bac pro ' + programLabel + ' et je souhaite effectuer ma PFMP au sein de votre équipe. Mon lycée fournit la convention.',
      ...fields.lettre.map(([key]) => filled(draft[key])).filter(Boolean),
      'Seriez-vous disponible pour échanger au sujet de ma candidature ? Je vous remercie pour votre attention.',
      'Cordialement,\n' + (name || '[Prénom et nom]')
    ].join('\n\n');
  }

  function printText(title, content) {
    const frame = element('iframe', 'cs-stage-print-frame');
    frame.title = 'Impression de ma candidature';
    document.body.append(frame);
    const doc = frame.contentDocument;
    doc.title = title;
    const style = doc.createElement('style');
    style.textContent = '@page{size:A4;margin:19mm}body{color:#172936;font:11pt/1.55 system-ui;margin:0}h1{font-size:22pt;border-bottom:2px solid #356a65;padding-bottom:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}';
    doc.head.append(style);
    const heading = doc.createElement('h1'), text = doc.createElement('pre');
    heading.textContent = title;
    text.textContent = content;
    doc.body.append(heading, text);
    const win = frame.contentWindow;
    win.addEventListener('afterprint', () => frame.remove(), { once:true });
    win.focus();
    win.print();
  }

  function mount(host, api) {
    let selected = '', kind = 'cv', step = 2;
    let request = null;
    const descriptions = {
      cv: 'Présente ton parcours, tes compétences et tes expériences.',
      lettre: 'Explique pourquoi cette structure t’intéresse et ce que tu veux apprendre.'
    };
    const placeholders = {
      profil: 'Ex. Je suis élève en bac pro Métiers de l’accueil, motivé(e) et à l’aise pour renseigner le public.',
      formation: 'Ex. Bac pro AGOrA au lycée …, 2025–2028.',
      experiences: 'Ex. Projet réalisé en classe, PFMP précédente, bénévolat, accueil d’un événement…',
      competences: 'Ex. Accueillir des visiteurs, communiquer à l’oral, organiser des documents, utiliser un logiciel…',
      interets: 'Ex. Sport collectif, lecture, théâtre, engagement associatif…',
      motivation: 'Ex. J’aimerais découvrir votre activité car …',
      qualites: 'Ex. Lors d’un projet de classe, j’ai montré mon sens de l’organisation en …',
      objectif: 'Ex. J’aimerais apprendre à accueillir les visiteurs et à traiter une demande.'
    };

    function progress(draft, type) {
      const count = fields[type].filter(([key]) => filled(draft?.[key])).length;
      return { count, total: fields[type].length };
    }

    function draftFor(entry) {
      const key = entry.place.id;
      if (!Object.hasOwn(api.drafts,key) || !api.drafts[key] || typeof api.drafts[key] !== 'object')
        api.drafts[key] = {cv:{},lettre:{}};
      for (const type of ['cv','lettre']) {
        if (!api.drafts[key][type] || typeof api.drafts[key][type] !== 'object')
          api.drafts[key][type] = {};
      }
      return api.drafts[key];
    }

    function badge(cls, content) {
      return element('span',cls,content);
    }

    function scrollToWork() {
      host.querySelector('.cs-stage-cv-step')?.focus({preventScroll:true});
      host.querySelector('.cs-stage-cv-step')?.scrollIntoView({block:'nearest',behavior:'auto'});
    }

    function render() {
      request?.abort();
      request = null;
      const entries = api.entries();
      if (selected && !entries.some(item => item.place.id === selected)) {
        selected = '';
        step = 2;
      }
      const entry = entries.find(item => item.place.id === selected) || api.general();
      const allDrafts = draftFor(entry); // Compatibilité des réponses déjà enregistrées
      const draft = allDrafts[kind];
      const shell = element('div','cs-stage-cv-shell');
      shell.dataset.document = kind;
      shell.dataset.phase = String(step);

      const chooser = element('section','cs-stage-cv-chooser');
      const choices = element('div','cs-stage-cv-choices');
      for (const [type,title,subtitle] of [
        ['cv','Mon CV','Parcours, compétences, expériences'],
        ['lettre','Ma lettre de motivation','Motivations, qualités, objectifs']
      ]) {
        const control = button('','cs-stage-cv-choice',()=>{
          if (kind === type && step === 2) return;
          kind = type;
          step = 2;
          render();
          scrollToWork();
        });
        control.dataset.kind = type;
        control.setAttribute('aria-pressed',String(kind===type));
        control.setAttribute('aria-label',title+' : '+subtitle);
        const texts = element('span','cs-stage-cv-choice-text');
        texts.append(element('strong','',title),element('small','',subtitle));
        const done = progress(allDrafts[type],type);
        const meter = element('span','cs-stage-cv-choice-progress',done.count+'/'+done.total+' rubriques');
        control.append(texts,meter);
        choices.append(control);
      }
      chooser.append(choices);

      // Aucun sélecteur de version : la structure éventuelle est transmise
      // directement depuis « Mes démarches », sans étape supplémentaire.
      const recipient = kind === 'lettre' && entry.place.name
        ? element('p','cs-stage-cv-recipient','Lettre destinée à : ' + entry.place.name) : null;

      const folio = element('div','cs-stage-cv-work');
      if (step===2) folio.classList.add('is-editing');
      shell.append(chooser);
      if(recipient) shell.append(recipient);
      shell.append(folio);
      host.replaceChildren(shell);

      if (step===3) {
        const review = element('section','cs-stage-cv-review');
        const reviewHead = element('div','cs-stage-cv-review-head');
        const title = element('h3','cs-stage-cv-step','Relis et finalise ton '+(kind==='cv'?'CV':'courrier'));
        title.tabIndex = -1;
        reviewHead.append(title,
          element('p','', 'Vérifie le nom, les coordonnées, les dates et le contenu. Tu peux modifier directement ce document avant de le copier ou de l’exporter.'));
        const paper = element('div','cs-stage-cv-paper');
        paper.append(badge('cs-stage-cv-paper-head','APERÇU ÉDITABLE · FORMAT A4'));
        const area = element('textarea','cs-stage-cv-preview');
        area.setAttribute('aria-label','Document prêt à relire et à modifier');
        area.rows = 17;
        area.maxLength = 16000;
        const baseText = finalText(entry,api.identity,kind,draft,api.period(),api.program(entry));
        area.value = draft.final ?? baseText;
        area.addEventListener('input',()=>{draft.final=area.value;api.save();});
        paper.append(area);
        const actions = element('div','cs-stage-cv-export');
        const notice=element('p','cs-stage-cv-notice');
        notice.setAttribute('role','status');
        actions.append(
          button('Modifier mes réponses','cs-stage-cv-secondary',()=>{step=2;render();scrollToWork();}),
          button('Copier le texte','cs-stage-cv-secondary',async()=>{
            try{await navigator.clipboard.writeText(area.value);notice.textContent='Document copié.';}
            catch{area.focus();area.select();notice.textContent='Texte sélectionné : utilise la commande Copier.';}
          }),
          button('Imprimer / Enregistrer en PDF','cs-stage-cv-export-main',()=>{
            printText(kind==='cv'?'CV':'Lettre de motivation',area.value);
          })
        );
        review.append(reviewHead,paper,actions,notice);
        folio.append(review);
        return;
      }

      const editor=element('section','cs-stage-cv-editor');
      const sidebar=element('aside','cs-stage-cv-sidebar');
      const heading=element('h3','cs-stage-cv-step','Rédige '+(kind==='cv'?'ton CV':'ta lettre de motivation'));
      heading.tabIndex=-1;
      const intro=element('p','cs-stage-cv-editor-intro',descriptions[kind]+' Réponds simplement avec tes propres mots : Albert peut ensuite t’aider à améliorer une partie.');
      const editorHead=element('div','cs-stage-cv-editor-head');
      const count=progress(draft,kind);
      const tracker=element('div','cs-stage-cv-tracker');
      const trackerText=element('span','cs-stage-cv-tracker-text',count.count+' / '+count.total+' rubriques renseignées');
      const track=element('progress','cs-stage-cv-tracker-bar');
      track.max=count.total;
      track.value=count.count;
      track.setAttribute('aria-label','Progression du '+(kind==='cv'?'CV':'courrier'));
      tracker.append(trackerText,track);
      editorHead.append(heading,intro,tracker);
      editor.append(editorHead);

      const identityPanel=element('details','cs-stage-cv-identity');
      if (!api.identity.first || !api.identity.last) identityPanel.open=true;
      identityPanel.append(element('summary','','Mes coordonnées'));
      identityPanel.append(element('p','cs-stage-cv-identity-hint','Elles figurent sur ton document, mais ne sont pas envoyées à Albert.'));
      const identity=element('div','cs-stage-cv-fields');
      for(const [key,label,type,autocomplete] of [
        ['first','Prénom','text','given-name'],['last','Nom','text','family-name'],
        ['school','Nom du lycée','text','organization'],
        ['email','E-mail (facultatif)','email','email'],['phone','Téléphone (facultatif)','tel','tel']
      ]) {
        const wrap=element('label','',label);
        const input=element('input');
        input.type=type; input.maxLength=100;input.value=api.identity[key]||'';
        input.autocomplete=autocomplete;
        input.addEventListener('input',()=>{
          api.identity[key]=input.value.trim();
          api.save();
        });
        wrap.append(input);
        identity.append(wrap);
      }
      identityPanel.append(identity);
      editor.append(identityPanel);

      const fieldList=element('div','cs-stage-cv-field-list');
      const inputs=new Map();
      let finalize;
      function fieldChanged(){
        if(draft.final!==undefined)delete draft.final;
        api.save();
        const next=progress(draft,kind);
        trackerText.textContent=next.count+' / '+next.total+' rubriques renseignées';
        track.value=next.count;
        finalize.disabled=next.count===0;
        const cards=fieldList.querySelectorAll('.cs-stage-cv-field');
        cards.forEach((card,index)=>{
          const item=fields[kind][index];
          if(!item)return;
          const ok=Boolean(filled(draft[item[0]]));
          card.classList.toggle('is-filled',ok);
          const state=card.querySelector('.cs-stage-cv-field-state');
          if(state)state.textContent=ok?'✓ Renseigné':'À compléter';
        });
      }
      for(const [key,title,hint] of fields[kind]){
        const wrap=element('label','cs-stage-cv-field');
        if(filled(draft[key]))wrap.classList.add('is-filled');
        const top=element('span','cs-stage-cv-field-top');
        top.append(element('strong','cs-stage-cv-field-name',title),
          badge('cs-stage-cv-field-state',filled(draft[key])?'✓ Renseigné':'À compléter'));
        const instruction=element('span','cs-stage-cv-field-hint',hint);
        const input=element('textarea','cs-stage-cv-field-input');
        input.rows=3;
        input.maxLength=1300;
        input.value=draft[key]||'';
        input.placeholder=placeholders[key]||'Écris ici avec tes mots…';
        input.addEventListener('input',()=>{draft[key]=input.value;fieldChanged();});
        wrap.append(top,instruction,input);
        fieldList.append(wrap);
        inputs.set(key,input);
      }
      editor.append(fieldList);

      const hook=api.getHook(entry).trim();
      if(kind==='lettre' && hook) {
        editor.append(button('Insérer mon accroche déjà préparée','cs-stage-cv-secondary',()=>{
          const input=inputs.get('motivation');
          if(!input.value.includes(hook)){
            input.value=[hook,input.value].filter(Boolean).join('\n').slice(0,input.maxLength);
            draft.motivation=input.value;
            fieldChanged();
          }
          input.focus();
        }));
      }

      const footer=element('div','cs-stage-cv-editor-footer');
      const footerText=element('div','');
      footerText.append(element('strong','','Tes réponses sont conservées sur cet appareil.'),
        element('small','','Complète les rubriques, puis relis ton document avant de le partager.'));
      finalize=button('Relire et finaliser mon '+(kind==='cv'?'CV':'courrier'),'cs-stage-cv-export-main',()=>{
        step=3;render();scrollToWork();
      });
      finalize.disabled=count.count===0;
      footer.append(footerText,finalize);
      editor.append(footer);

      const guidance=element('section','cs-stage-cv-help-card');
      guidance.append(element('h3','',kind==='cv'?'Un CV clair, en quelques lignes.':'Une lettre personnelle, sans phrases copiées.'),
        element('p','',kind==='cv'
          ? 'Privilégie ce que tu sais faire, même lors d’un projet scolaire. Sois précis et évite les compétences que tu ne peux pas expliquer.'
          : 'Montre pourquoi tu souhaites découvrir cette structure. Donne un exemple réel et indique une mission que tu aimerais apprendre.'));
      const tips=element('ul','cs-stage-cv-tips');
      for(const item of (kind==='cv'
        ? ['Parcours et formation à jour','Compétences avec un exemple concret','Informations de contact vérifiées']
        : ['Nom de la structure vérifié','Motivation personnelle et précise','Dates et missions cohérentes']))tips.append(element('li','',item));
      guidance.append(tips);
      sidebar.append(guidance);

      const box=element('section','cs-stage-cv-assistance');
      box.append(element('h3','', 'Améliore un passage avec Albert'),
        element('p','cs-stage-cv-ai-note','Albert propose une reformulation : tu restes libre de l’accepter ou non. Évite d’envoyer tes coordonnées personnelles.'));
      const selectLabel=element('label','cs-stage-cv-ai-select','Rubrique à améliorer');
      const aiSelect=element('select');
      for(const [id,title] of fields[kind]){
        const option=element('option','',title);option.value=id;aiSelect.append(option);
      }
      selectLabel.append(aiSelect);
      const feedback=element('p','cs-stage-cv-notice');
      feedback.setAttribute('role','status');
      const suggestion=element('div','cs-stage-contact-suggestion');
      suggestion.hidden=true;
      aiSelect.addEventListener('change',()=>{
        suggestion.hidden=true;feedback.textContent='';request?.abort();ask.disabled=false;
      });
      const ask=button('Améliorer cette rubrique','cs-stage-cv-ai-action',async()=>{
        const id=aiSelect.value, input=inputs.get(id), raw=input.value.trim();
        if(raw.length<12){
          feedback.textContent='Écris d’abord une phrase (au moins 12 caractères) dans cette rubrique.';
          input.focus();
          return;
        }
        request?.abort();
        const own=new AbortController();request=own;
        ask.disabled=true;suggestion.hidden=true;
        feedback.textContent='Albert relit ton passage…';
        try{
          const data=await api.ask(entry,kind,id,raw,own.signal);
          if(own.signal.aborted)return;
          if(input.value.trim()!==raw){
            feedback.textContent='Ce passage a changé. Redemande une reformulation.';
            return;
          }
          const improved=normalizePFMP(data.improved);
          feedback.textContent='Lis la proposition et garde uniquement ce qui te correspond.';
          suggestion.replaceChildren(element('strong','','Proposition Albert'),
            element('p','',improved),element('p','',normalizePFMP(data.tip)),
            button('Utiliser cette proposition','cs-stage-cv-ai-action',()=>{
              if(input.value.trim()!==raw){
                feedback.textContent='Ce passage a changé. Redemande une reformulation.';
                suggestion.hidden=true;return;
              }
              input.value=improved;draft[id]=improved;fieldChanged();
              suggestion.hidden=true;input.focus();
            }));
          suggestion.hidden=false;
        }catch(error){
          if(!own.signal.aborted)feedback.textContent=error.message||'Albert est indisponible. Tes réponses restent accessibles.';
        }finally{if(request===own)ask.disabled=false;}
      });
      box.append(selectLabel,ask,feedback,suggestion);
      sidebar.append(box);
      sidebar.append(button('Renseigner mes dates de PFMP','cs-stage-cv-aside-link',api.openPrep));
      if(!entries.length)sidebar.append(button('Retrouver mes démarches','cs-stage-cv-aside-link',api.openBoard));
      const quick=button('Aide Albert','cs-stage-cv-ai-jump',()=>{
        box.scrollIntoView({block:'start',behavior:'smooth'});
        aiSelect.focus({preventScroll:true});
      });
      editorHead.append(quick);
      folio.append(editor,sidebar);
    }

    function focusStep(){ scrollToWork(); }

    return {
      show(company, preferredKind){
        if(preferredKind && ['cv','lettre'].includes(preferredKind)){kind=preferredKind;step=2;}
        if(company){selected=company;step=2;}
        render();
      },
      hide(){request?.abort();}
    };
  }

  window.CORTEX_STAGE_CV = { mount };
})();
