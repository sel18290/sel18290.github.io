/* Atelier de candidature dans la rubrique PFMP. */
(function () {
  'use strict';

  const { normalizePFMP } = window.CORTEX_STAGE_GUIDE;
  const ALLOCATION = 'L’allocation de ma PFMP est versée par l’État. Mon lycée fournit la convention.';
  const fundingOpening = 'C’est une PFMP non rémunérée.';
  const withoutOpening = text => normalizePFMP(String(text || '').trim().replace(/^c['’]est (?:un stage non rémunéré|une PFMP non rémunérée)[^.!?]*[.!?]\s*/i, ''));
  const HOOK_HINT = '[Mon accroche : ce qui me motive et ce que j’aimerais apprendre.]';
  const MOTIVES = [
    ['public', 'Le contact avec le public'],
    ['metier', 'Les missions du métier'],
    ['structure', 'Un détail remarqué chez vous']
  ];
  const EXAMPLES = {
    A: ['J’aime le contact avec les gens et j’aimerais apprendre à conseiller vos clients.', 'Votre magasin m’intéresse et j’aimerais apprendre à travailler avec votre équipe.'],
    B: ['J’aimerais travailler avec vous et apprendre à présenter vos services aux clients.', 'Cette PFMP me motive et j’aimerais apprendre à prendre contact avec vos clients.'],
    accueil: ['J’aime aider les gens et j’aimerais apprendre à accueillir vos visiteurs.', 'J’aimerais rejoindre votre équipe et apprendre à renseigner les personnes qui viennent chez vous.'],
    'gestion-administration': ['Je suis motivé(e) et j’aimerais travailler avec vous pour apprendre à gérer des dossiers.', 'J’aimerais apprendre à organiser les dossiers et à aider votre équipe au quotidien.'],
    toutes: ['J’aime le contact avec les gens et j’aimerais apprendre à conseiller vos clients.', 'Je suis motivé(e) et j’aimerais découvrir le travail de votre équipe.']
  };

  function node(tag, name, text) {
    const element = document.createElement(tag);
    if (name) element.className = name;
    if (text) element.textContent = text;
    return element;
  }

  function button(text, name, action) {
    const control = node('button', name, text);
    control.type = 'button';
    control.addEventListener('click', action);
    return control;
  }

  function sentence(text) {
    const clean = text.trim().replace(/\s+/g, ' ');
    return clean && !/[.!?]$/.test(clean) ? clean + '.' : clean;
  }

  function writeMessage(context, hook, method) {
    const { label, period, recipient, place } = context;
    const name = [context.identity.first, context.identity.last].filter(Boolean).join(' ') || '[prénom et nom]';
    const intro = 'Je suis ' + name + ', élève en bac pro ' + label + ' au lycée ' + (context.identity.school || '[nom du lycée]') + '.';
    const funding = fundingOpening + ' ' + ALLOCATION;
    const line = normalizePFMP(hook || HOOK_HINT);
    if (method === 'call') {
      return 'Bonjour. ' + funding + ' ' + intro +
        ' J’appelle pour une PFMP ' + period + '. Puis-je parler à ' + recipient + ' ?\n\n' +
        line + ' Pourriez-vous accueillir un élève en PFMP à ces dates ?\n\n' +
        'À qui puis-je envoyer mon CV ou remettre ma candidature ? Merci pour votre temps.';
    }
    const subject = 'Candidature pour une PFMP' + (place ? ' — ' + place.name : '');
    return 'Objet : ' + subject + '\n\nBonjour,\n\n' + funding + ' ' + intro +
      ' Je cherche une PFMP ' + period + '.' + '\n\n' + line + '\n\n' +
      'Auriez-vous la possibilité de m’accueillir à ces dates ? Je peux vous transmettre mon CV ou venir me présenter.\n\n' +
      'Merci pour votre réponse.\n\nCordialement,\n' + name;
  }

  function mount(context) {
    const root = node('section', 'cs-stage-contact-editor cs-stage-contact-v2');
    const header = node('div', 'cs-stage-contact-v2-head');
    header.append(
      node('span','cs-stage-contact-overline','CORTEX / CONSOLE DE CANDIDATURE'),
      node('h3','','Ton premier contact, en 3 étapes'),
      node('p','','Prépare ce que tu vas dire, personnalise ton message et copie-le quand il te convient.')
    );
    root.append(header);
    const stepbar = node('nav','cs-stage-contact-v3-progress');
    stepbar.setAttribute('aria-label','Progression de la préparation de candidature');
    const stepIndicators = [];
    for (const [index, title] of ['Mes coordonnées','Mon accroche','Mon message'].entries()) {
      const part = node('span','cs-stage-contact-v3-progress-step');
      part.append(node('span','cs-stage-contact-v3-progress-index',String(index+1)),
        node('span','cs-stage-contact-v3-progress-label',title));
      stepIndicators.push(part);
      stepbar.append(part);
    }
    root.append(stepbar);
    const pending = new AbortController();
    let currentStep = 1;
    let method = 'call';
    const edits = new Map();
    let appliedHook = HOOK_HINT;
    const identity = node('div', 'cs-stage-cv-fields');
    const nameInputs = [];
    const identityInputs = [];
    const nameFeedback = node('p', 'cs-stage-date-status');
    nameFeedback.setAttribute('role', 'status');
    for (const [key, title] of [['first','Prénom'],['last','Nom'],['school','Nom du lycée']]) {
      const label = node('label','',title), input = node('input');
      input.type = 'text'; input.maxLength = 90; input.value = context.identity[key] || '';
      input.required = true;
      input.autocomplete = key === 'first' ? 'given-name' : key === 'last' ? 'family-name' : 'organization';
      identityInputs.push(input);
      if (key !== 'school') nameInputs.push(input);
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter' || event.isComposing) return;
        event.preventDefault();
        const currentIndex = identityInputs.indexOf(input);
        const next = identityInputs[currentIndex+1];
        if (next) next.focus();
        else validateIdentity();
      });
      input.addEventListener('input', () => {
        const oldName = [context.identity.first,context.identity.last].filter(Boolean).join(' ') || '[prénom et nom]';
        const oldSchool = context.identity.school || '[nom du lycée]';
        context.identity[key] = input.value.trim();
        const name = [context.identity.first,context.identity.last].filter(Boolean).join(' ') || '[prénom et nom]';
        for (const [kind, draft] of edits) edits.set(kind,
          key === 'school' ? draft.replaceAll(oldSchool, context.identity.school || '[nom du lycée]') :
          draft.replace('je suis '+oldName+',','je suis '+name+',')
            .replace('Je suis '+oldName+',','Je suis '+name+',')
            .replace('Cordialement,\n'+oldName,'Cordialement,\n'+name));
        context.save();
        nameFeedback.textContent = '';
        updateMessage();
      });
      label.append(input); identity.append(label);
    }
    const identityPanel = node('section','cs-stage-contact-v2-identity cs-stage-contact-v3-panel');
    const identityTitle = node('h3','cs-stage-contact-v3-step-title','01 · Vérifie tes coordonnées');
    identityTitle.tabIndex = -1;
    identityPanel.append(node('span','cs-stage-contact-overline','ÉTAPE 1 SUR 3'),
      identityTitle,
      node('p','cs-stage-contact-guidance','Ces informations seront utilisées dans le message, mais ne sont pas transmises à Albert.'));
    identityPanel.append(identity,nameFeedback);
    const identityNext = button('Valider et continuer →','cs-stage-primary cs-stage-contact-v3-next',validateIdentity);
    identityPanel.append(node('div','cs-stage-contact-v3-navigation'));
    identityPanel.querySelector('.cs-stage-contact-v3-navigation').append(identityNext);
    root.append(identityPanel);
    const personal = node('section','cs-stage-contact-v2-step cs-stage-contact-v3-panel');
    const personalTitle = node('h3','cs-stage-contact-v3-step-title','02 · Une phrase qui te ressemble');
    personalTitle.tabIndex = -1;
    personal.append(node('span','cs-stage-contact-overline','ÉTAPE 2 SUR 3'),
      personalTitle,
      node('p','cs-stage-contact-guidance','Explique pourquoi cette structure t’intéresse ou ce que tu souhaites apprendre.'));

    const choices = node('fieldset', 'cs-stage-contact-motives');
    choices.append(node('legend', '', 'Je veux parler de…'));
    const choiceList = node('div');
    const fixed = node('label', 'cs-stage-fixed-motive');
    const unpaid = node('input');
    unpaid.type = 'checkbox';
    unpaid.checked = true;
    unpaid.disabled = true;
    fixed.append(unpaid, node('span', '', 'Conditions d’accueil en PFMP'));
    choiceList.append(fixed);
    for (const [value, text] of MOTIVES) {
      const label = node('label');
      const input = node('input');
      input.type = 'radio';
      input.name = 'stage-contact-motive';
      input.value = value;
      input.checked = value === 'metier';
      label.append(input, node('span', '', text));
      choiceList.append(label);
    }
    choices.append(choiceList);
    const opening = node('strong', 'cs-stage-fixed-opening', fundingOpening);
    const condition = node('div','cs-stage-contact-v2-condition');
    condition.append(choices,opening);
    personal.append(condition);

    const hookLabel = node('label', 'cs-stage-contact-hook', 'La suite de mon accroche');
    const hook = node('textarea');
    hook.rows = 2;
    hook.maxLength = 250;
    hook.placeholder = 'Ex. J’ai remarqué… et j’aimerais apprendre à…';
    hookLabel.append(hook);
    personal.append(hookLabel);
    const tools = node('div', 'cs-stage-contact-actions');
    const feedback = node('p', 'cs-stage-date-status');
    feedback.setAttribute('role', 'status');
    const suggestion = node('div', 'cs-stage-contact-suggestion');
    suggestion.hidden = true;
    const motivation = () => choiceList.querySelector('input[type="radio"]:checked').value;
    const examples = EXAMPLES[context.profile] || EXAMPLES.toutes;

    function showSuggestion(title, idea, advice) {
      suggestion.hidden = false;
      const continuation = withoutOpening(idea);
      suggestion.replaceChildren(node('strong', '', title),
        node('p', '', fundingOpening + ' ' + continuation));
      if (advice) suggestion.append(node('p', 'cs-stage-contact-guidance', normalizePFMP(advice)));
      suggestion.append(button('Reprendre cette accroche', 'cs-stage-pale', () => {
        hook.value = continuation.slice(0, hook.maxLength);
        applyHook();
        hook.focus();
      }));
    }

    const example = button('Voir un exemple', 'cs-stage-pale', () => {
      const reason = motivation();
      const idea = reason === 'structure'
        ? 'J’ai remarqué [un détail sur votre structure] et j’aimerais beaucoup apprendre avec votre équipe.'
        : examples[reason === 'public' ? 0 : 1];
      showSuggestion('À adapter avec tes mots', idea, 'Tu peux remplacer le détail entre crochets par ce que tu as vérifié.');
      feedback.textContent = '';
    });
    const albert = button('Demander une accroche à Albert', 'cs-stage-primary', async () => {
      albert.disabled = true;
      feedback.textContent = 'Albert prépare une proposition…';
      const choice = motivation();
      try {
        const result = await context.ask(choice, pending.signal);
        if (pending.signal.aborted || motivation() !== choice) return;
        showSuggestion('Proposition Albert', result.hook, result.tip);
        feedback.textContent = 'Proposition disponible. Adapte-la à la structure avant de l’utiliser.';
      } catch (error) {
        if (!pending.signal.aborted) feedback.textContent = (error.message || 'Albert est momentanément indisponible.') +
          ' Tu peux utiliser l’exemple et compléter ton message.';
      } finally {
        albert.disabled = false;
      }
    });
    tools.append(example, albert);
    const assistance = node('details','cs-stage-contact-v2-assistance');
    assistance.append(node('summary','','✦ Besoin d’une idée ? Exemple et Albert'),
      node('p','cs-stage-contact-guidance','Tu peux écrire seul(e). L’aide est facultative.'));
    assistance.append(tools, node('small', 'cs-stage-contact-guidance',
      'Albert reçoit ta filière, le type de lieu et le thème choisi. Ton message reste dans cette fenêtre.'),feedback,suggestion);
    personal.append(assistance);
    const hookFeedback = node('p','cs-stage-date-status cs-stage-contact-v3-error');
    hookFeedback.setAttribute('role','status');
    const personalNav = node('div','cs-stage-contact-v3-navigation');
    personalNav.append(button('← Retour','cs-stage-pale cs-stage-contact-v3-back',()=>showStep(1)),
      button('Valider et continuer →','cs-stage-primary cs-stage-contact-v3-next',validateMotivation));
    personal.append(hookFeedback,personalNav);
    root.append(personal);
    choiceList.addEventListener('change', () => {
      suggestion.hidden = true;
      feedback.textContent = '';
    });

    const methodControls = node('div', 'cs-stage-contact-method');
    methodControls.setAttribute('role', 'group');
    methodControls.setAttribute('aria-label', 'Type de contact');
    const call = button('☎ Appeler', 'cs-stage-pale', () => selectMethod('call'));
    call.setAttribute('aria-label','Préparer un script téléphonique');
    const email = button('✉ Écrire un e-mail', 'cs-stage-pale', () => selectMethod('email'));
    email.setAttribute('aria-label','Préparer un message e-mail');
    methodControls.append(call, email);
    const output = node('section','cs-stage-contact-v2-step cs-stage-contact-v2-output cs-stage-contact-v3-panel');
    const outputTitle = node('h3','cs-stage-contact-v3-step-title','03 · Finalise ton message');
    outputTitle.tabIndex = -1;
    output.append(node('span','cs-stage-contact-overline','ÉTAPE 3 SUR 3'),
      outputTitle,
      node('p','cs-stage-contact-guidance','Sélectionne Appeler ou Écrire un e-mail. Le modèle reste modifiable.'));
    output.append(methodControls);

    const messageLabel = node('label', 'cs-stage-contact-message');
    const caption = node('span');
    const message = node('textarea');
    message.rows = 10;
    messageLabel.append(caption, message);
    const copied = node('p', 'cs-stage-date-status');
    copied.setAttribute('role', 'status');
    const reset = button('Mettre à jour le modèle', 'cs-stage-pale', () => {
      edits.delete(method);
      updateMessage();
      copied.textContent = 'Modèle mis à jour.';
    });
    const copy = button('Copier mon message →', 'cs-stage-primary cs-stage-contact-v2-copy', async () => {
      const missing = identityInputs.find(input => !input.value.trim());
      if (missing) {
        nameFeedback.textContent = 'Complète ton prénom, ton nom et ton lycée avant de copier.';
        showStep(1);
        missing.focus();
        return;
      }
      try {
        await navigator.clipboard.writeText(message.value);
        copied.textContent = 'Texte copié.';
      } catch {
        message.focus();
        message.select();
        copied.textContent = 'Texte sélectionné. Utilise la commande Copier de ton appareil.';
      }
    });
    const note = node('p', 'cs-stage-contact-guidance');
    const actions = node('div', 'cs-stage-contact-actions cs-stage-contact-v2-actions');
    actions.append(copy,reset);
    output.append(messageLabel,note,actions,copied);
    const outputNav = node('div','cs-stage-contact-v3-navigation');
    outputNav.append(button('← Modifier mon accroche','cs-stage-pale cs-stage-contact-v3-back',()=>showStep(2)));
    output.append(outputNav);
    root.append(output);

    const panels = [identityPanel,personal,output];
    const headings = [identityTitle,personalTitle,outputTitle];
    function showStep(step, focus = true) {
      currentStep = step;
      panels.forEach((panel,index)=>{ panel.hidden = index !== step-1; });
      stepIndicators.forEach((indicator,index)=>{
        const status = index+1===step ? 'current' : index+1<step ? 'complete' : 'upcoming';
        indicator.dataset.status = status;
        if (status==='current') indicator.setAttribute('aria-current','step');
        else indicator.removeAttribute('aria-current');
      });
      root.dataset.currentStep = String(step);
      if (focus) {
        headings[step-1].focus({preventScroll:true});
        root.scrollIntoView?.({behavior:'auto',block:'start'});
      }
    }
    function validateIdentity() {
      const missing = identityInputs.find(input => !input.value.trim());
      if (missing) {
        nameFeedback.textContent = 'Renseigne ton prénom, ton nom et ton lycée pour continuer.';
        missing.focus();
        return;
      }
      nameFeedback.textContent = '';
      showStep(2);
    }
    function validateMotivation() {
      const phrase = withoutOpening(hook.value);
      if (phrase.length < 12) {
        hookFeedback.textContent = 'Écris au moins une phrase personnelle (12 caractères minimum), ou utilise l’exemple ou Albert.';
        hook.focus();
        return;
      }
      hookFeedback.textContent = '';
      applyHook();
      showStep(3);
    }

    function updateMessage() {
      message.value = edits.has(method) ? edits.get(method) : writeMessage(context, sentence(hook.value), method);
      reset.hidden = !edits.has(method);
      note.textContent = edits.has(method)
        ? 'Tu as personnalisé le texte. « Mettre à jour le modèle » remplace ce texte par une nouvelle version à partir de ton accroche.'
        : 'Remplace les éléments entre crochets par tes propres informations.';
    }
    function selectMethod(next) {
      method = next;
      caption.textContent = method === 'call' ? 'Voici ce que tu peux dire au téléphone' : 'Voici le texte de ton e-mail';
      call.setAttribute('aria-pressed', String(method === 'call'));
      email.setAttribute('aria-pressed', String(method === 'email'));
      copied.textContent = '';
      updateMessage();
    }
    hook.value = withoutOpening(context.hook || '');
    appliedHook = sentence(hook.value) || HOOK_HINT;
    function applyHook() {
      const next = sentence(withoutOpening(hook.value)) || HOOK_HINT;
      for (const [kind, draft] of edits) {
        const split = draft.indexOf('\n\n', kind === 'email' ? draft.indexOf('\n\n')+2 : 0);
        edits.set(kind,draft.includes(appliedHook) ? draft.replace(appliedHook,next) :
          split >= 0 ? draft.slice(0,split) + '\n\n' + next + draft.slice(split) : draft + '\n\n' + next);
      }
      appliedHook = next;
      context.rememberHook(withoutOpening(hook.value));
      updateMessage();
    }
    hook.addEventListener('input', applyHook);
    message.addEventListener('input', () => {
      edits.set(method, message.value);
      reset.hidden = false;
      note.textContent = 'Texte modifié. Vérifie les dates, le nom du lycée et les éléments entre crochets.';
    });
    selectMethod('call');
    showStep(1,false);

    return { root, dispose: () => pending.abort() };
  }

  window.CORTEX_STAGE_CONTACT = { mount };
})();
