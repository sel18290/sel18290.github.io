/* Atelier de candidature dans la rubrique PFMP. */
(function () {
  'use strict';

  const RULE = 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029234400';
  const GRATIFICATION = 'Mon lycée fournit la convention. Le stage ne donne pas lieu à un salaire. Une gratification est obligatoire si mes périodes de stage chez vous dépassent deux mois au total sur l’année scolaire.';
  const MOTIVES = [
    ['public', 'Le contact avec le public'],
    ['metier', 'Les missions du métier'],
    ['structure', 'Un détail remarqué chez vous']
  ];
  const EXAMPLES = {
    A: ['J’aimerais apprendre à conseiller un client et à lui proposer un produit qui répond à son besoin.', 'J’aimerais apprendre à préparer une mise en rayon qui aide le client à choisir.'],
    B: ['J’aimerais apprendre à présenter une offre et à comprendre les besoins de nouveaux clients.', 'J’aimerais apprendre à préparer une prise de contact et à suivre les réponses des prospects.'],
    accueil: ['J’aimerais apprendre à renseigner et à orienter des visiteurs selon leurs demandes.', 'J’aimerais apprendre à traiter une demande, au téléphone comme sur place.'],
    'gestion-administration': ['J’aimerais apprendre à répondre à une demande et à suivre son dossier jusqu’à la réponse.', 'J’aimerais apprendre à organiser le suivi des dossiers au quotidien.'],
    toutes: ['J’aimerais apprendre à écouter un client et à lui proposer une réponse adaptée.', 'J’aimerais découvrir comment votre équipe conseille ses clients et assure le suivi des ventes.']
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
    const intro = 'Je suis [prénom et nom], élève en bac pro ' + label + ' au lycée [nom du lycée].';
    const line = hook || '[Mon accroche : ce que j’ai remarqué ou ce que je souhaite apprendre.]';
    if (method === 'call') {
      return 'Bonjour, ' + intro.charAt(0).toLowerCase() + intro.slice(1) +
        ' J’appelle pour un stage ' + period + '. Puis-je parler à ' + recipient + ' ?\n\n' +
        line + ' Accueillez-vous des stagiaires à ces dates ?\n\n' +
        GRATIFICATION + '\n\n' +
        'À qui puis-je envoyer mon CV ou remettre ma candidature ? Merci pour votre temps.';
    }
    const subject = 'Candidature pour une PFMP' + (place ? ' — ' + place.name : '');
    return 'Objet : ' + subject + '\n\nBonjour,\n\n' + line + ' ' + intro +
      ' Je souhaite effectuer ma période de formation en milieu professionnel ' + period + '.\n\n' +
      GRATIFICATION + '\n\n' +
      'Auriez-vous la possibilité de m’accueillir à ces dates ? Je peux vous transmettre mon CV ou venir me présenter.\n\n' +
      'Merci pour votre réponse.\n\nCordialement,\n[prénom et nom]';
  }

  function mount(context) {
    const root = node('section', 'cs-stage-contact-editor');
    const pending = new AbortController();
    let method = 'call';
    const edits = new Map();
    root.append(node('h3', '', 'Trouve ton accroche'), node('p', 'cs-stage-contact-guidance',
      'En une phrase, dis ce qui t’intéresse chez cette structure ou ce que tu voudrais apprendre. Choisis un détail que tu as vérifié.'));

    const choices = node('fieldset', 'cs-stage-contact-motives');
    choices.append(node('legend', '', 'Je veux parler de…'));
    const choiceList = node('div');
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
    root.append(choices);

    const hookLabel = node('label', 'cs-stage-contact-hook', 'Ma phrase d’accroche');
    const hook = node('textarea');
    hook.rows = 2;
    hook.maxLength = 250;
    hook.placeholder = 'Ex. J’ai remarqué… et j’aimerais apprendre à…';
    hookLabel.append(hook);
    root.append(hookLabel);
    const tools = node('div', 'cs-stage-contact-actions');
    const feedback = node('p', 'cs-stage-date-status');
    feedback.setAttribute('role', 'status');
    const suggestion = node('div', 'cs-stage-contact-suggestion');
    suggestion.hidden = true;
    const motivation = () => choiceList.querySelector('input:checked').value;
    const examples = EXAMPLES[context.profile] || EXAMPLES.toutes;

    function showSuggestion(title, idea, advice) {
      suggestion.hidden = false;
      suggestion.replaceChildren(node('strong', '', title), node('p', '', idea));
      if (advice) suggestion.append(node('p', 'cs-stage-contact-guidance', advice));
      suggestion.append(button('Reprendre cette accroche', 'cs-stage-pale', () => {
        hook.value = idea.slice(0, hook.maxLength);
        updateMessage();
        hook.focus();
      }));
    }

    const example = button('Voir un exemple', 'cs-stage-pale', () => {
      const reason = motivation();
      const idea = reason === 'structure'
        ? 'J’ai repéré [un détail sur votre structure] et j’aimerais apprendre comment votre équipe s’en occupe.'
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
    root.append(tools, node('small', 'cs-stage-contact-guidance',
      'Albert reçoit ta filière, le type de lieu et le thème choisi. Ton brouillon reste dans cette fenêtre.'), feedback, suggestion);
    choiceList.addEventListener('change', () => {
      suggestion.hidden = true;
      feedback.textContent = '';
    });

    const notice = node('details', 'cs-stage-call-script');
    notice.append(node('summary', '', 'Que dire sur la rémunération ?'));
    const rule = node('p', '', 'Une PFMP se fait sous convention et ne donne pas lieu à un salaire. Le seuil légal de gratification s’apprécie en cumulant les périodes chez le même organisme sur la même année scolaire. Le lycée peut t’aider à vérifier le calcul. ');
    const link = node('a', '', 'Article L. 124-6 du Code de l’éducation');
    link.href = RULE;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    rule.append(link);
    notice.append(rule);
    root.append(notice);

    const methodControls = node('div', 'cs-stage-contact-method');
    methodControls.setAttribute('role', 'group');
    methodControls.setAttribute('aria-label', 'Type de contact');
    const call = button('Ce que je vais dire', 'cs-stage-pale', () => selectMethod('call'));
    const email = button('Mon e-mail', 'cs-stage-pale', () => selectMethod('email'));
    methodControls.append(call, email);
    root.append(node('h3', '', 'Prépare ton message'), methodControls);

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
    const copy = button('Copier le texte', 'cs-stage-primary', async () => {
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
    const actions = node('div', 'cs-stage-contact-actions');
    actions.append(copy, reset);
    root.append(messageLabel, note, actions, copied);

    function updateMessage() {
      message.value = edits.has(method) ? edits.get(method) : writeMessage(context, sentence(hook.value), method);
      reset.hidden = !edits.has(method);
      note.textContent = edits.has(method)
        ? 'Tu as personnalisé le texte. « Mettre à jour le modèle » remplace ce texte par une nouvelle version à partir de ton accroche.'
        : 'Remplace les éléments entre crochets par tes propres informations.';
    }
    function selectMethod(next) {
      method = next;
      caption.textContent = method === 'call' ? 'Ton script pour l’appel' : 'Ton message à personnaliser avant l’envoi';
      call.setAttribute('aria-pressed', String(method === 'call'));
      email.setAttribute('aria-pressed', String(method === 'email'));
      copied.textContent = '';
      updateMessage();
    }
    hook.addEventListener('input', updateMessage);
    message.addEventListener('input', () => {
      edits.set(method, message.value);
      reset.hidden = false;
      note.textContent = 'Texte modifié. Vérifie les dates, le nom du lycée et les éléments entre crochets.';
    });
    selectMethod('call');

    return { root, dispose: () => pending.abort() };
  }

  window.CORTEX_STAGE_CONTACT = { mount };
})();
