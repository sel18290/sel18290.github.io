(function () {
  'use strict';

  const integrity = () => window.CORTEX_EXAM_INTEGRITY;
  const clock = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const states = {
    visible: 'Dans le contrôle', hidden: 'Page masquée', left: 'A quitté le contrôle',
    stale: 'Sans contact récent', waiting: 'En attente de contact', finalizing: 'Remise en cours',
    closed: 'Contrôle fermé', submitted: 'Copie remise'
  };
  const needsReview = entry => entry.parallel || ['hidden', 'left', 'stale'].includes(entry.state);
  const timeOf = value => value ? clock.format(new Date(value)) : '—';

  function createReporter(send) {
    const pageId = integrity().eventId();
    let active = null, sequence = 0, timer = null, lastState = '', lastSentAt = 0;

    function report(state) {
      if (!active || navigator.onLine === false || Date.now() >= active.deadline) return;
      const now = Date.now();
      if (state === lastState && now - lastSentAt < 750) return;
      lastState = state;
      lastSentAt = now;
      void send(active, { page_id: pageId, state, sequence: ++sequence }).catch(() => {});
    }

    function reportVisibility() {
      report(document.hidden ? 'hidden' : 'visible');
    }

    document.addEventListener('visibilitychange', reportVisibility);
    window.addEventListener('pagehide', () => report('hidden'));
    window.addEventListener('pageshow', reportVisibility);
    window.addEventListener('online', reportVisibility);
    // Reprise immédiate au retour dans l'onglet, sans présumer qu'un flou de
    // fenêtre est une sortie : seules les vraies pages masquées sont signalées.
    window.addEventListener('focus', reportVisibility);
    return {
      setActive(next = null) {
        if (active?.key === next?.key) {
          active = next;
          return;
        }
        if (active) report('left');
        clearInterval(timer);
        active = next;
        lastState = '';
        if (!active) return;
        reportVisibility();
        timer = setInterval(() => { if (!document.hidden) report('visible'); }, 20000);
      }
    };
  }

  function element(tag, cls, value) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  }

  function statusRow(entry, observedAt, demo) {
    const row = element('li', 'ce-live-row' + (needsReview(entry) ? ' ce-live-review' : ''));
    const identifier = 'N° ' + entry.student_number;
    const identity = element('div', 'ce-live-identity');
    identity.append(element('strong', '', identifier));
    if (demo && entry.title) identity.append(element('small', '', entry.title));

    const state = element('div', 'ce-live-state');
    state.append(element('span', 'ce-live-badge ce-live-' + entry.state, states[entry.state] || 'En cours'));
    if (entry.parallel) state.append(element('span', 'ce-live-badge ce-live-parallel', 'Accès simultanés'));

    const progression = element('div', 'ce-live-progress');
    if (entry.state === 'submitted') {
      progression.append(element('small', '', entry.auto_submitted ? 'Remise automatique' : 'Remise par l’élève'));
    } else if (entry.question_count > 0) {
      const answerCount = entry.answered + ' / ' + entry.question_count;
      const progress = element('progress');
      progress.max = entry.question_count;
      progress.value = entry.answered;
      progress.setAttribute('aria-label', 'Réponses sauvegardées pour le ' + identifier);
      progression.append(element('small', '', answerCount + ' réponses sauvegardées'), progress);
    }

    const contact = element('div', 'ce-live-contact');
    if (entry.state === 'submitted') contact.textContent = 'Remise à ' + timeOf(entry.submitted_at);
    else if (entry.state === 'hidden') {
      const elapsed = Date.parse(observedAt) - Date.parse(entry.state_since);
      contact.textContent = 'Depuis ' + (elapsed >= 1000 ? integrity().formatDuration(elapsed) : 'moins de 1 s');
    } else if (entry.seen_at) {
      if (entry.state === 'stale' && entry.last_state === 'hidden') {
        contact.append(element('small', '', 'Dernier état · Page masquée'));
      }
      contact.append(element('span', '', 'Dernier contact à ' + timeOf(entry.seen_at)));
    } else if (entry.started_at) {
      contact.textContent = 'Début à ' + timeOf(entry.started_at);
    }
    row.append(identity, state, progression, contact);
    return row;
  }

  function createPanel({ demo = false } = {}) {
    const root = element('section', 'ce-live-panel');
    root.setAttribute('aria-label', 'Passation en direct');
    const heading = element('div', 'ce-live-heading');
    const title = element('div', '');
    const detail = element('p', 'ce-monitor-note');
    title.append(element('h2', '', 'Passation en direct'), detail);
    const filter = element('label', 'ce-monitor-field');
    const select = element('select');
    for (const [value, label] of [['', 'Tous les états'], ['review', 'À vérifier'],
      ['visible', 'Dans le contrôle'], ['hidden', 'Page masquée'], ['stale', 'Sans contact récent'],
      ['parallel', 'Accès simultanés'], ['submitted', 'Copie remise']]) select.add(new Option(label, value));
    filter.append(element('span', '', 'État de la copie'), select);
    heading.append(title, filter);
    const list = element('div', 'ce-live-list');
    root.append(heading, list);
    let exam = null, studentNumber = '', classId = '', snapshot = null, failed = false;

    function render() {
      const snapshotAge = snapshot?.observed_at ? Date.now() - Date.parse(snapshot.observed_at) : 0;
      const isOld = Number.isFinite(snapshotAge) && snapshotAge >= 45000;
      detail.textContent = demo ? 'Exemple de passation avec des élèves fictifs.' :
        snapshot?.observed_at
          ? (isOld ? 'Dernier relevé à ' + timeOf(snapshot.observed_at) +
              ' · Données anciennes : actualise avant toute conclusion.'
            : 'Relevé à ' + timeOf(snapshot.observed_at) + ' · Actualisation automatique')
          : 'Activité des élèves et réponses sauvegardées.';
      let message = '';
      if (!demo && !exam) message = 'Choisis un contrôle publié.';
      else if (!demo && (exam.tracksLive === false || snapshot?.enabled === false)) {
        message = 'Active « Suivi en direct » dans Réglages anti-triche pour suivre ce contrôle.';
      } else if (failed) {
        if (!snapshot) message = 'Suivi momentanément indisponible. Utilise « Actualiser ».';
        else detail.textContent = 'Dernier relevé à ' + timeOf(snapshot.observed_at) +
          ' · Actualisation indisponible, états historiques uniquement.';
      } else if (!snapshot) message = 'Chargement de la passation…';
      const entries = message ? [] : (snapshot?.entries || []).filter(entry => {
        if (demo && ((exam && exam.id !== entry.examId) || (classId && classId !== entry.classId))) return false;
        if (studentNumber && Number(studentNumber) !== entry.student_number) return false;
        if (select.value === 'review') return needsReview(entry);
        if (select.value === 'parallel') return entry.parallel;
        return !select.value || select.value === entry.state;
      }).sort((a, b) => Number(needsReview(b)) - Number(needsReview(a)) || a.student_number - b.student_number);
      filter.hidden = Boolean(message);
      if (!entries.length) {
        list.replaceChildren(element('p', 'ce-monitor-empty', message || 'Aucun élève pour cette sélection.'));
        return;
      }
      const rows = element('ul', 'ce-live-rows');
      for (const entry of entries) rows.append(statusRow(entry, snapshot.observed_at, demo));
      list.replaceChildren(rows);
    }

    select.addEventListener('change', render);
    return {
      root,
      setScope(nextExam, nextNumber, nextClass) {
        if (!demo && nextExam?.id !== exam?.id) {
          snapshot = null;
          failed = false;
        }
        exam = nextExam;
        studentNumber = nextNumber;
        classId = nextClass;
        render();
      },
      setSnapshot(next) { snapshot = next; failed = false; render(); },
      setError() { failed = true; render(); },
      reset() { exam = null; snapshot = null; failed = false; render(); }
    };
  }

  window.CORTEX_EXAM_LIVE = { createReporter, createPanel };
})();
