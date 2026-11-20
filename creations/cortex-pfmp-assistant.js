/* Assistant PFMP. Les noms des lieux, les notes et les dates restent dans le navigateur. */
(function () {
  'use strict';
  const { normalizePFMP } = window.CORTEX_STAGE_GUIDE;

  const goals = [
    ['plan', 'Organiser ma recherche', 'Un plan adapté à ta situation'],
    ['compare', 'Comparer mes pistes', 'Choisir les premiers lieux à contacter'],
    ['call', 'Préparer un appel', 'Savoir quoi dire et quoi demander'],
    ['followup', 'Relancer une structure', 'Préparer une relance courte'],
    ['interview', 'Préparer un entretien', 'T’entraîner à parler de tes missions']
  ];
  const situations = [
    ['start', 'Je commence ma recherche'], ['broaden', 'Je trouve peu de lieux'],
    ['blocked', 'Je reçois peu de réponses'], ['urgent', 'La PFMP approche']
  ];
  const targetGoals = new Set(['call', 'followup', 'interview']);

  function fallback(input, view) {
    const mission = view.mission || 'Repère une activité liée à ta filière et demande si tu pourras la pratiquer avec un tuteur.';
    const period = view.period || '[dates]';
    const ideas = {
      plan: {
        intro: input.situation === 'urgent' ? 'Cherche des réponses rapides et demande l’aide de ton lycée dès aujourd’hui.'
          : input.situation === 'blocked' ? 'Relance les demandes en cours et ajoute quelques pistes de types différents.'
          : input.situation === 'broaden' ? 'Essaie un autre type de lieu dans ta filière ou une commune facile d’accès.'
          : 'Pars des activités que tu veux apprendre, puis prépare une première liste de lieux à contacter.',
        steps: [
          ['Fixe tes critères', input.has_dates ? 'Garde tes dates sous les yeux et vérifie le trajet aux heures où tu te déplacerais.'
            : 'Vérifie tes dates de PFMP auprès du lycée et prépare un trajet que tu peux faire chaque jour.'],
          ['Sélectionne quelques pistes', view.typeLabels.length
            ? 'Commence par deux types de lieux parmi ta sélection. ' + view.typeLabels.slice(0, 2).join(' · ') + '.' : mission],
          [input.due_count ? 'Commence par tes relances' : 'Contacte et note la suite', input.due_count
            ? 'Ouvre Mes démarches, filtre les relances et reprends une demande à la fois.'
            : 'Prépare une phrase d’appel, demande le bon interlocuteur et note la réponse dans Mes démarches.']
        ]
      },
      compare: {
        intro: 'Ces pistes sont un point de départ. Vérifie le trajet, les missions et la disponibilité pour tes dates.',
        steps: [
          ['Vérifie le trajet', 'Ouvre l’itinéraire et regarde combien de temps tu mettrais aux heures habituelles de travail.'],
          ['Confirme les missions', 'Appelle les premiers lieux pour demander quelles tâches tu pourrais pratiquer avec un tuteur.']
        ],
        picks: view.entries.slice(0, 3).map(({ place }, index) => ({ index,
          why: place.evidence ? 'Un accueil PFMP antérieur est documenté.' : place.callable ? 'Un téléphone public permet de prendre contact.'
            : 'Le type de lieu correspond à ta recherche et mérite une vérification.',
          ask: 'Quelles missions pourrais-je découvrir avec votre équipe pendant ma PFMP ?'
        }))
      },
      call: {
        intro: 'En une phrase, présente ta formation et tes dates, puis demande à parler à la bonne personne.',
        steps: [['Prépare ton appel', 'Garde les dates du lycée et une mission qui t’intéresse sous les yeux.'],
          ['Pose une question sur les missions', mission],
          ['Note la suite', 'Demande à qui adresser ton CV et quand tu peux reprendre contact.']],
        script: 'Bonjour, je m’appelle [prénom et nom]. Je cherche une PFMP '+period+' dans le cadre de mon bac pro. Pourrais-je parler à la personne qui organise l’accueil des élèves ?'
      },
      followup: {
        intro: 'Rappelle ta demande et propose une action simple à la personne qui te répond.',
        steps: [['Reprends le premier échange', 'Retrouve la date et le canal utilisés, puis vérifie si on t’avait donné un délai.'],
          ['Demande une suite précise', 'Propose de renvoyer ton CV ou demande à quel moment tu peux rappeler.']],
        script: 'Bonjour, je reviens vers vous au sujet de ma demande de PFMP '+period+'. Avez-vous pu la consulter ? Je peux vous renvoyer mon CV si besoin. Merci pour votre retour.'
      },
      interview: {
        intro: 'Prépare une présentation de trente secondes et un exemple que tu as vraiment vécu.',
        steps: [['Pourquoi cette structure ?', 'Choisis une activité que tu as vérifiée et explique ce que tu veux y apprendre.'],
          ['Que sais-tu déjà faire ?', 'Raconte un projet au lycée ou ailleurs. Dis ce que tu as fait et ce que tu as appris.'],
          ['Quelle sera ta mission ?', 'Demande qui t’accompagnera et ce que tu pourras pratiquer au début de la PFMP.']],
        script: 'Dans [projet ou situation], j’ai [action que j’ai faite]. Cela m’a appris [compétence]. Pendant ma PFMP, j’aimerais progresser en [mission].'
      }
    };
    const idea = ideas[input.goal];
    return { ...idea, steps: idea.steps.map(([title, detail]) => ({ title, detail })) };
  }

  function mountChat(host, api) {
    const dialog = host.querySelector('#cs-stage-chat');
    const form = dialog.querySelector('.cs-stage-chat-form');
    const field = form.querySelector('textarea');
    const send = form.querySelector('[type="submit"]');
    const transcript = dialog.querySelector('[role="log"]');
    const status = dialog.querySelector('[role="status"]');
    const reset = dialog.querySelector('[data-chat-reset]');
    let history = [];
    let pending = null;

    function message(role, content) {
      const bubble = api.node('article', 'cs-stage-chat-message is-' + role);
      bubble.append(api.node('strong', '', role === 'assistant' ? 'Albert' : 'Toi'), api.node('p', '', content));
      transcript.append(bubble);
      transcript.scrollTop = transcript.scrollHeight;
      return bubble;
    }

    host.querySelector('#cs-stage-chat-open').addEventListener('click', () => {
      dialog.showModal();
      transcript.scrollTop = transcript.scrollHeight;
    });
    reset.addEventListener('click', () => {
      history = [];
      transcript.replaceChildren();
      field.value = '';
      status.textContent = 'Nouvelle discussion.';
      field.focus();
    });
    dialog.addEventListener('close', () => pending?.abort());

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const content = field.value.trim();
      if (pending || !content) return;
      const controller = new AbortController();
      pending = controller;
      const timer = setTimeout(() => controller.abort(), 42000);
      const user = { role:'user', content };
      const bubble = message(user.role, user.content);
      field.value = '';
      field.readOnly = true;
      send.disabled = true;
      reset.disabled = true;
      status.textContent = 'Albert prépare sa réponse…';
      try {
        const result = await api.chat([...history.slice(-4), user], controller.signal);
        if (controller.signal.aborted) throw new Error('Réponse interrompue.');
        const reply = { role:'assistant', content:normalizePFMP(result.reply) };
        history = [...history.slice(-4), user, reply];
        message(reply.role, reply.content);
        status.textContent = '';
      } catch (error) {
        bubble.remove();
        field.value = content;
        const detail = controller.signal.aborted ? 'Réponse interrompue. Tu peux renvoyer ton message.' :
          error instanceof TypeError ? 'Connexion indisponible. Tu peux renvoyer ton message.' : error.message;
        status.textContent = detail;
      } finally {
        clearTimeout(timer);
        pending = null;
        field.readOnly = false;
        send.disabled = false;
        reset.disabled = false;
      }
    });
    field.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && matchMedia('(pointer: fine)').matches) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    return () => {
      pending?.abort();
      if (dialog.open) dialog.close();
    };
  }

  function mount(host, api) {
    const hideChat = mountChat(host, api);
    const { node, button } = api;
    const byId = id => host.querySelector('#cs-stage-' + id);
    const form = byId('advisor-form'), choices = byId('advisor-goals'), target = byId('advisor-target');
    const situation = byId('advisor-situation'), response = byId('advisor-response');
    const notice = byId('advisor-status'), submit = byId('advisor-ask');
    let goal = 'plan';
    let pending;
    let contextKey = '';
    let renderedKey = '';
    const answers = new Map();

    for (const [id, title, detail] of goals) {
      const label = node('label', 'cs-stage-advisor-goal');
      const input = node('input');
      input.type = 'radio'; input.name = 'pfmp-advisor-goal'; input.value = id; input.checked = id === goal;
      const text = node('span');
      text.append(node('strong', '', title), node('small', '', detail));
      label.append(input, text);
      choices.append(label);
      input.addEventListener('change', () => {
        goal = id;
        refresh();
      });
    }
    situation.replaceChildren(...situations.map(([id, label]) => new Option(label, id)));
    target.addEventListener('change', refresh);
    situation.addEventListener('change', refresh);

    function clearPending() {
      pending?.abort();
      pending = null;
      form.removeAttribute('aria-busy');
      submit.disabled = false;
      submit.textContent = 'Demander à Albert';
      notice.textContent = '';
    }

    function current() {
      const view = api.context(goal, target.value);
      const input = { ...view.input, goal, situation: situation.value };
      return { input, view, key: JSON.stringify([input, view.entries.map(entry => entry.place.id), view.period]) };
    }

    function refresh() {
      const { key, input, view } = current();
      byId('advisor-target-wrap').hidden = !targetGoals.has(goal);
      byId('advisor-situation-wrap').hidden = goal !== 'plan';
      byId('advisor-context').textContent = view.label;
      if (key !== contextKey) {
        contextKey = key;
        clearPending();
      }
      const noCandidates = goal === 'compare' && !view.entries.length;
      submit.disabled = Boolean(pending) || noCandidates;
      if (pending || renderedKey === key) return;
      const saved = answers.get(key);
      if (saved) {
        showAnswer(saved.answer, input, view, saved.source);
        if (saved.reason) notice.textContent = saved.reason;
        renderedKey = key;
      } else {
        const title = noCandidates ? 'Ajoute tes premières pistes' : 'Ta réponse s’affichera ici';
        const copy = noCandidates ? 'Lance une recherche ou ajoute des lieux à Mes démarches pour les comparer.'
          : 'Albert utilise ta filière et les critères de ta recherche pour te proposer une prochaine étape.';
        response.replaceChildren(node('h3', '', title), node('p', '', copy));
        if (noCandidates) response.append(button('Ouvrir la recherche', 'cs-stage-pale', api.search));
        renderedKey = '';
      }
    }

    function showAnswer(answer, input, view, source) {
      const list = node('ol', 'cs-stage-advisor-steps');
      for (const { title, detail } of answer.steps) {
        const item = node('li');
        item.append(node('strong', '', normalizePFMP(title)), node('p', '', normalizePFMP(detail)));
        list.append(item);
      }
      const title = goals.find(([id]) => id === goal)[1];
      response.replaceChildren(node('div', 'cs-stage-panel-kicker', source), node('h3', '', title), node('p', '', normalizePFMP(answer.intro)), list);
      if (answer.picks?.length) {
        const picks = node('div', 'cs-stage-advisor-picks');
        for (const pick of answer.picks) {
          const entry = view.entries[pick.index];
          if (!entry) continue;
          const card = node('article', 'cs-stage-advisor-pick'), actions = node('div', 'cs-stage-action-row');
          const keep = button(api.isSaved(entry) ? 'Voir le suivi' : 'Ajouter à mes démarches', 'cs-stage-pale', () => {
            if (api.isSaved(entry)) api.board(entry);
            else { api.keep(entry); keep.textContent = 'Voir le suivi'; notice.textContent = entry.place.name + ' ajouté à ton carnet.'; }
          });
          actions.append(keep, button('Préparer le contact', 'cs-stage-primary', () => api.contact(entry)));
          card.append(node('h4', '', entry.place.name), node('p', '', normalizePFMP(pick.why)), node('p', 'cs-stage-advisor-question', normalizePFMP(pick.ask)), actions);
          picks.append(card);
        }
        response.append(picks);
      }
      if (answer.script) {
        const script = node('section', 'cs-stage-advisor-script');
        const scriptText = normalizePFMP(answer.script);
        const text = view.period ? scriptText.replace(/(?:du\s+)?\[dates\]/gi, view.period) : scriptText;
        script.append(node('h4', '', goal === 'interview' ? 'À dire avec tes mots' : 'Modèle à adapter'), node('p', '', text),
          button('Copier le modèle', 'cs-stage-pale', () => api.copy(text, notice)));
        response.append(script);
      }
      const navigation = node('div', 'cs-stage-action-row');
      if (input.goal === 'plan') navigation.append(button('Revenir aux critères', 'cs-stage-primary', api.search));
      if (input.goal === 'plan' || input.goal === 'followup') navigation.append(button('Ouvrir Mes démarches', 'cs-stage-pale', () => api.board(view.target)));
      if (input.goal === 'call' || input.goal === 'interview') navigation.append(button('Préparer ma candidature', 'cs-stage-primary', () => api.documents(view.target)));
      if (navigation.childElementCount) response.append(navigation);
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (pending || submit.disabled) return;
      const { input, view, key } = current();
      const own = new AbortController();
      pending = own;
      form.setAttribute('aria-busy', 'true');
      submit.disabled = true;
      submit.textContent = 'Albert réfléchit…';
      notice.textContent = 'Préparation des conseils en cours.';
      const timer = setTimeout(() => own.abort(), 28000);
      let answer, reason = '', source = 'Albert IA';
      try {
        const data = await api.ask(input, own.signal);
        if (!data.enabled) reason = data.reason || 'Albert est momentanément indisponible.';
        else answer = data;
      } catch (error) {
        reason = error.name === 'AbortError' ? 'Albert met trop de temps à répondre.' : 'Albert est momentanément indisponible.';
      } finally {
        clearTimeout(timer);
      }
      if (pending !== own) return;
      clearPending();
      if (!answer) { answer = fallback(input, view); source = 'Guide CORTEX'; }
      if (answers.size >= 12) answers.delete(answers.keys().next().value);
      if (source === 'Albert IA') answers.set(key, { answer, source });
      showAnswer(answer, input, view, source);
      renderedKey = key;
      notice.textContent = reason ? reason + ' Le guide CORTEX te propose la suite.' : 'Conseils d’Albert prêts à consulter.';
      api.refreshScrollOffset();
      response.focus({ preventScroll:true });
      response.scrollIntoView({ block:'start' });
    });

    return {
      show(preferred, selected) {
        if (preferred) goal = preferred;
        const previous = selected || target.value;
        target.replaceChildren(new Option('Sans structure précise', ''), ...api.targets().map(({place}) =>
          new Option([place.name, place.address].filter(Boolean).join(' · '), place.id)));
        target.value = Array.from(target.options).some(option => option.value === previous) ? previous : '';
        choices.querySelector('input[value="' + goal + '"]').checked = true;
        refresh();
      },
      hide() { clearPending(); hideChat(); }
    };
  }

  window.CORTEX_PFMP_ASSISTANT = { mount };
})();
