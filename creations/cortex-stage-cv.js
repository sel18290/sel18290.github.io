/* Atelier CV et lettre : brouillons séparés par entreprise, dans le carnet de l’élève. */
(function () {
  'use strict';
  const fields = {
    cv: [
      ['profil', 'Mon profil', 'En deux phrases, présente ta formation, le stage recherché et une qualité que tu peux expliquer.'],
      ['formation', 'Ma formation', 'Indique ton diplôme et les années. Ex. Bac pro AGOrA, 2025–2028.'],
      ['experiences', 'Mes expériences et projets', 'Un projet au lycée, une aide dans une association ou un stage précédent. Indique ce que tu as vraiment fait.'],
      ['competences', 'Mes compétences', 'Note les outils ou activités que tu sais utiliser. Donne un exemple concret pour chaque compétence.'],
      ['interets', 'Mes centres d’intérêt (facultatif)', 'Choisis un intérêt dont tu peux parler en entretien.']
    ],
    lettre: [
      ['motivation', 'Pourquoi cette entreprise ?', 'Dis ce qui te plaît dans cette entreprise. Ajoute un détail que tu as réellement vérifié.'],
      ['qualites', 'Ce que je peux apporter', 'Choisis une qualité et raconte une situation où tu l’as montrée.'],
      ['objectif', 'Ce que j’aimerais apprendre', 'Nomme une ou deux missions que tu aimerais découvrir pendant ton stage.']
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
    const target = entry.place.name;
    if (kind === 'cv') {
      const sections = fields.cv.filter(([key]) => filled(draft[key]))
        .map(([key, title]) => title.replace(' (facultatif)', '') + '\n' + draft[key].trim());
      return [header, 'CV · Stage en bac pro ' + programLabel + '\n' + target + ' · ' + period, ...sections].join('\n\n');
    }
    return [
      header, ['À l’attention de l’équipe de ' + target, entry.place.address].filter(Boolean).join('\n'),
      'Objet : candidature pour un stage ' + period,
      'Madame, Monsieur,\n\nJe suis en bac pro ' + programLabel + ' et je souhaite faire mon stage dans votre équipe. Mon lycée fournit la convention et mon allocation de stage est versée par l’État.',
      ...fields.lettre.map(([key]) => filled(draft[key])).filter(Boolean),
      'Seriez-vous disponible pour échanger au sujet de mon stage ? Je vous remercie pour votre attention.',
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
    let selected = '', kind = 'lettre', step = 1;
    let request;
    function render() {
      request?.abort();
      request = null;
      const entries = api.entries();
      const entry = entries.find(item => item.place.id === selected);
      if (!entry) { selected = ''; step = 1; }
      host.replaceChildren(element('p', 'cs-stage-contact-guidance',
        'Choisis une entreprise de ton carnet, rédige un premier jet et prépare ton document.'));
      if (!entries.length) {
        host.append(element('p', '', 'Ajoute une entreprise dans « Mes démarches » pour préparer ton CV ou ta lettre.'),
          button('Ouvrir mes démarches', 'cs-stage-primary', api.openBoard));
        return;
      }
      const rail = element('div', 'cs-stage-cv-rail'), controls = element('div', 'cs-stage-cv-tools');
      rail.setAttribute('aria-label','Entreprises enregistrées');
      rail.setAttribute('role','group');
      controls.append(button('Précédentes', 'cs-stage-pale', () => rail.scrollBy({left:-rail.clientWidth,behavior:'smooth'})),
        button('Suivantes', 'cs-stage-pale', () => rail.scrollBy({left:rail.clientWidth,behavior:'smooth'})));
      host.append(element('h3', '', 'Choisis ton entreprise'), controls, rail);
      for (const item of entries) {
        const card = button('', 'cs-stage-cv-company', () => { selected = item.place.id; step = 2; render(); focusStep(); });
        card.append(element('strong','',item.place.name),element('small','',item.place.address || api.status(item)));
        card.setAttribute('aria-pressed',String(item === entry));
        rail.append(card);
      }
      const active = rail.querySelector('[aria-pressed="true"]');
      if (active) rail.scrollLeft = active.getBoundingClientRect().left - rail.getBoundingClientRect().left;
      if (!entry) return;
      if (!Object.hasOwn(api.drafts, selected)) api.drafts[selected] = {cv:{},lettre:{}};
      const draft = api.drafts[selected][kind];
      const folio = element('div','cs-stage-cv-work');
      folio.append(element('h3','','Candidature pour '+entry.place.name));
      const tabs = element('div','cs-stage-cv-tools');
      for (const [key,label] of [['lettre','Lettre de motivation'],['cv','CV']]) {
        const tab = button(label,'cs-stage-pale',() => {kind=key;step=2;render();focusStep();});
        tab.setAttribute('aria-pressed',String(kind===key));tabs.append(tab);
      }
      folio.append(tabs);
      const heading = element('h3','cs-stage-cv-step',step===2 ? 'Rédige ton premier jet' : 'Relis ton document');
      heading.tabIndex = -1;
      folio.append(heading);
      host.append(folio);
      if (step === 3) {
        const content = finalText(entry,api.identity,kind,draft,api.period(),api.program(entry));
        const area = element('textarea','cs-stage-cv-preview');
        area.setAttribute('aria-label','Document prêt à relire');
        area.rows = 14;
        area.value = draft.final ?? content;
        area.maxLength = 16000;
        area.addEventListener('input',()=>{draft.final=area.value;api.save();});
        const tools = element('div','cs-stage-cv-tools'), notice = element('p');
        notice.setAttribute('role','status');
        tools.append(button('Modifier le brouillon','cs-stage-pale',()=>{step=2;render();focusStep();}),
          button('Reprendre la version du brouillon','cs-stage-pale',()=>{delete draft.final;area.value=content;api.save();notice.textContent='Version du brouillon rétablie.';}),
          button('Copier','cs-stage-pale',async()=>{
            try {await navigator.clipboard.writeText(area.value);notice.textContent='Document copié.';}
            catch {area.focus();area.select();notice.textContent='Texte sélectionné. Utilise la commande Copier.';}
          }),button('Imprimer ou enregistrer en PDF','cs-stage-primary',()=>printText(kind==='cv'?'CV':'Lettre de motivation',area.value)));
        folio.append(element('p','cs-stage-contact-guidance','Vérifie les coordonnées, les dates et le nom de l’entreprise avant de remettre ta candidature.'),area,tools,notice);
        return;
      }

      const identity = element('div','cs-stage-cv-fields');
      for (const [key,label,fieldType] of [['first','Prénom','text'],['last','Nom','text'],['school','Nom du lycée','text'],['email','E-mail (facultatif)','email'],['phone','Téléphone (facultatif)','tel']]) {
        const wrap = element('label','',label), input = element('input');
        input.type = fieldType; input.maxLength=100; input.value=api.identity[key]||'';
        input.addEventListener('input',()=>{api.identity[key]=input.value.trim();api.save();});
        wrap.append(input);identity.append(wrap);
      }
      folio.append(identity);
      const inputs = new Map();
      const fieldChanged = () => {
        if (draft.final !== undefined) delete draft.final;
        api.save();
        preview.disabled = !fields[kind].some(([id])=>filled(draft[id]));
      };
      for (const [key,title,hint] of fields[kind]) {
        const wrap=element('label','cs-stage-cv-field',title), input=element('textarea');
        input.rows=3;input.maxLength=1300;input.value=draft[key]||'';
        wrap.append(element('small','cs-stage-contact-guidance',hint),input);
        folio.append(wrap); inputs.set(key,input);
        input.addEventListener('input',()=>{draft[key]=input.value;fieldChanged();});
      }
      const hook = api.getHook(entry).trim();
      if (kind === 'lettre' && hook) folio.append(button('Ajouter mon accroche au brouillon','cs-stage-pale',()=>{
        const target=inputs.get('motivation');
        if(!target.value.includes(hook)){
          target.value=[hook,target.value].filter(Boolean).join('\n').slice(0,target.maxLength);
          draft.motivation=target.value;fieldChanged();
        }
        target.focus();
      }));

      const box=element('div','cs-stage-cv-assistance'), select=element('select'), label=element('label','','Partie à améliorer');
      const feedback=element('p');feedback.setAttribute('role','status');
      const suggestion=element('div','cs-stage-contact-suggestion');
      suggestion.hidden=true;
      for(const [id,title] of fields[kind]){const option=element('option','',title);option.value=id;select.append(option);}
      label.append(select);
      select.addEventListener('change',()=>{suggestion.hidden=true;feedback.textContent='';request?.abort();ask.disabled=false;});
      const ask=button('Améliorer ce passage avec Albert','cs-stage-primary',async()=>{
        const id=select.value, input=inputs.get(id), raw=input.value.trim();
        if(raw.length<12){feedback.textContent='Écris d’abord une phrase dans cette partie.';input.focus();return;}
        request?.abort();
        const own=new AbortController();request=own;ask.disabled=true;suggestion.hidden=true;
        feedback.textContent='Albert relit ton passage…';
        try {
          const data=await api.ask(entry,kind,id,raw,own.signal);
          if(own.signal.aborted)return;
          feedback.textContent='Lis la proposition et garde ce qui te ressemble.';
          suggestion.replaceChildren(element('strong','','Proposition Albert'),element('p','',data.improved),element('p','',data.tip),
            button('Utiliser cette proposition','cs-stage-pale',()=>{
              input.value=data.improved;draft[id]=data.improved;fieldChanged();suggestion.hidden=true;input.focus();
            }));
          suggestion.hidden=false;
        } catch(error) {
          if(!own.signal.aborted)feedback.textContent=error.message||'Albert est indisponible. Ton brouillon reste accessible.';
        } finally {if(request===own)ask.disabled=false;}
      });
      box.append(element('h3','','Demander un coup de main à Albert'),label,
        element('small','cs-stage-contact-guidance','Albert reçoit le passage choisi, ta filière et le nom de la structure. Garde tes coordonnées et tes informations personnelles dans les champs prévus.'),
        ask,feedback,suggestion);
      const preview=button('Relire mon document','cs-stage-primary',()=>{step=3;render();focusStep();});
      preview.disabled=!fields[kind].some(([id])=>filled(draft[id]));
      folio.append(box,preview);
    }
    function focusStep(){host.querySelector('.cs-stage-cv-step')?.focus();}
    return {
      show(company, preferredKind) {
        if (preferredKind) { kind = preferredKind; step = 2; }
        if (company) { selected = company; step = 2; }
        render();
      },
      hide() { request?.abort(); }
    };
  }
  window.CORTEX_STAGE_CV = { mount };
})();
