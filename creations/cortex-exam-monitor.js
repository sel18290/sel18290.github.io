(function () {
  'use strict';

  const kindLabels = {
    tab_hidden: 'Sortie d’écran',
    paste_blocked: 'Collage bloqué',
    copy_blocked: 'Copie du sujet bloquée',
    parallel_access: 'Accès simultanés'
  };
  const formatter = options => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...options });
  const day = formatter({ day: 'numeric', month: 'short', year: 'numeric' });
  const clock = formatter({ hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const PAGE_SIZE = 16;
  const duration = ms => window.CORTEX_EXAM_INTEGRITY.formatDuration(ms);
  const validDuration = event => event.kind === 'tab_hidden' && Number.isFinite(event.durationMs) && event.durationMs > 0;
  const classesOf = exam => exam.classes || (exam.classId ? [[exam.classId, exam.className]] : []);

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function appendTime(row, label, at) {
    const item = element('div', 'ce-event-time');
    const time = element('time', '', clock.format(at));
    time.dateTime = new Date(at).toISOString();
    item.append(element('span', '', label), time);
    row.append(item);
  }

  function eventRow(event, exam) {
    const row = element('li', 'ce-event ce-event--' + event.kind);
    const group = element('div', 'ce-event-heading');
    const title = element('div', 'ce-event-title');
    title.append(element('strong', '', kindLabels[event.kind]));
    if (event.simulated) title.append(element('span', 'ce-simulated', 'Simulation'));
    const identity = event.studentNumber ? 'Élève n° ' + event.studentNumber : event.studentName || 'Élève';
    group.append(title, element('p', 'ce-event-identity', [identity, event.className || exam?.className, event.groupName].filter(Boolean).join(' · ')));
    if (exam?.title) group.append(element('p', 'ce-event-exam', exam.title));
    if (event.kind === 'parallel_access') group.append(element('p', 'ce-event-identity', 'Deux pages actives pour le même numéro.'));
    row.append(group);
    if (event.kind === 'tab_hidden') {
      const measure = element('div', 'ce-event-measure');
      measure.append(element('span', '', 'Durée'), element('strong', '', duration(event.durationMs)));
      row.append(measure);
    }
    if (Number.isFinite(event.at)) {
      const timeline = element('div', 'ce-event-timeline');
      timeline.append(element('span', 'ce-event-date', day.format(event.at)));
      if (validDuration(event)) {
        const start = event.at - event.durationMs;
        appendTime(timeline, day.format(start) === day.format(event.at) ? 'Départ' : 'Départ · ' + day.format(start), start);
        appendTime(timeline, 'Retour', event.at);
      } else {
        appendTime(timeline, 'Heure du signal', event.at);
      }
      row.append(timeline);
    }
    return row;
  }

  function newestFirst(events) {
    return events.filter(event => Object.hasOwn(kindLabels, event.kind)).sort((a, b) => (b.at || 0) - (a.at || 0));
  }

  function eventList(events, exams = new Map()) {
    const list = element('ol', 'ce-event-list');
    for (const event of newestFirst(events)) list.append(eventRow(event, exams.get(event.examId)));
    return list;
  }

  function fromDemo(event, attempt) {
    const simulated = event.kind === 'simulation' || event.kind === 'visibility';
    return {
      examId: attempt.examId, studentNumber: attempt.studentNumber, studentName: attempt.name,
      classId: attempt.classId, className: attempt.className, groupName: attempt.groupId ? attempt.groupName : '',
      kind: simulated ? 'tab_hidden' : event.kind, simulated,
      at: event.at, durationMs: event.durationMs
    };
  }

  function mount(host, { perExam = false, onExamChange, onViewChange, demo = false, live = null } = {}) {
    let exams = [], events = [], updatedAt = null, loading = false, failed = false;
    let limit = PAGE_SIZE, lastList = '', showingLive = false;
    host.classList.add('ce-monitor');
    const header = element('div', 'ce-monitor-heading');
    const intro = element('div', '');
    const introText = element('p');
    intro.append(element('h2', '', 'Journal des épreuves'), introText);
    const status = element('p', 'ce-update-status');
    header.append(intro, status);
    const filters = element('div', 'ce-monitor-filters');
    function field(label, input, wide = false) {
      const wrapper = element('label', 'ce-monitor-field' + (wide ? ' ce-monitor-field-wide' : ''));
      wrapper.append(element('span', '', label), input);
      filters.append(wrapper);
      return input;
    }
    const classSelect = field('Classe', element('select'));
    const student = field('N° sur la liste', element('input'));
    student.type = 'search';
    student.inputMode = 'numeric';
    student.maxLength = 2;
    student.placeholder = 'Ex. 12';
    const examSelect = field('Contrôle', element('select'), true);
    const kind = field('Événement', element('select'), true);
    const priority = field('Afficher', element('select'));
    const options = (select, choices, selected) => {
      select.replaceChildren(...choices.map(([id, label]) => new Option(label, id)));
      if (choices.some(([id]) => id === selected)) select.value = selected;
    };
    options(kind, [['', 'Tous les événements'], ...Object.entries(kindLabels)], '');
    options(priority, [['', 'Tous les signalements'], ['long', 'Sorties de 10 s ou plus'],
      ['blocked', 'Gestes bloqués']], '');
    const stats = element('div', 'ce-monitor-stats');
    stats.setAttribute('aria-label', 'Bilan de la sélection');
    const figures = ['Sorties d’écran', 'Durée cumulée', 'Plus longue sortie', 'Gestes bloqués'].map(label => {
      const metric = element('div', 'ce-figure');
      const value = element('strong', '');
      metric.append(element('span', '', label), value);
      stats.append(metric);
      return value;
    });
    const caption = element('div', 'ce-metric-caption');
    const results = element('div', 'ce-monitor-results');
    const more = element('button', 'btn secondary small ce-more', 'Afficher plus d’événements');
    more.type = 'button';
    more.hidden = true;
    const download = element('button', 'btn secondary small ce-monitor-export',
      '⇩ Télécharger ce journal (CSV)');
    download.type = 'button';
    download.title = 'Exporte uniquement les événements correspondant aux filtres. Ne contient pas les réponses ni les copies.';
    const footer = element('p', 'ce-monitor-note',
      'Heures de Paris. Durées estimées par le navigateur. Une sortie longue ou un geste bloqué demande une vérification humaine : ce n’est pas une preuve de triche.');
    const log = element('div', 'ce-monitor-log');
    log.append(stats, caption, results, more, download, footer);
    const tabs = element('div', 'ce-monitor-views');
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Vues du suivi');
    const logButton = element('button', '', 'Journal');
    const liveButton = element('button', '', 'En direct');
    for (const button of [logButton, liveButton]) button.type = 'button';
    tabs.append(logButton, liveButton);
    host.replaceChildren(header, ...(live ? [tabs] : []), filters, ...(live ? [live.root] : []), log);

    function chooseView(next) {
      if (showingLive === next) return;
      showingLive = next;
      render();
      onViewChange?.();
    }
    logButton.addEventListener('click', () => chooseView(false));
    liveButton.addEventListener('click', () => chooseView(true));

    function visibleEvents() {
      return events.filter(event =>
        (!classSelect.value || classSelect.value === event.classId) &&
        (!examSelect.value || examSelect.value === event.examId) &&
        (!student.value || Number(student.value) === Number(event.studentNumber)) &&
        (!kind.value || kind.value === event.kind) &&
        (!priority.value || (priority.value === 'long'
          ? event.kind === 'tab_hidden' && validDuration(event) && event.durationMs >= 10000
          : event.kind === 'paste_blocked' || event.kind === 'copy_blocked')));
    }

    function render() {
      const currentExam = exams.find(exam => exam.id === examSelect.value);
      if (live) {
        logButton.setAttribute('aria-pressed', String(!showingLive));
        liveButton.setAttribute('aria-pressed', String(showingLive));
        header.hidden = showingLive;
        log.hidden = showingLive;
        kind.parentElement.hidden = showingLive;
        live.root.hidden = !showingLive;
        if (showingLive) {
          live.setScope(currentExam, student.value, classSelect.value);
          return;
        }
      }
      introText.textContent = demo ? 'Données locales de la démonstration.' :
        currentExam?.tracksExits === false ? 'Le signalement des sorties d’écran est désactivé pour ce contrôle.' :
        'Les sorties d’écran apparaissent au retour de l’élève.';
      const filtered = visibleEvents();
      download.disabled = !filtered.length;
      download.setAttribute('aria-label',
        'Télécharger ' + filtered.length + ' événements filtrés en CSV');
      const exits = filtered.filter(event => event.kind === 'tab_hidden');
      const measured = exits.filter(validDuration);
      const total = measured.reduce((sum, event) => sum + event.durationMs, 0);
      const longest = measured.reduce((max, event) => Math.max(max, event.durationMs), 0);
      const blocked = filtered.filter(event => event.kind === 'paste_blocked' || event.kind === 'copy_blocked').length;
      const known = !perExam || updatedAt !== null;
      const display = known ? [exits.length, total ? duration(total) : (exits.length ? '—' : '0 s'),
        longest ? duration(longest) : '—', blocked] : ['—', '—', '—', '—'];
      display.forEach((value, index) => { figures[index].textContent = value; });
      const missing = exits.length - measured.length;
      caption.textContent = missing ? missing + (missing === 1 ? ' sortie sans durée mesurée.' : ' sorties sans durée mesurée.') : '';
      caption.hidden = !missing;
      const overview = loading && !known ? 'Chargement du journal…' : failed ? 'Actualisation impossible.' :
        updatedAt !== null ? 'Actualisé à ' + clock.format(updatedAt) : '';
      if (status.textContent !== overview) status.textContent = overview;
      if (filtered.length) {
        const visible = filtered.slice(0, limit);
        const examMap = new Map(exams.map(exam => [exam.id, exam]));
        const signature = JSON.stringify(visible.map(event => [event, examMap.get(event.examId)?.title]));
        if (signature !== lastList) {
          results.replaceChildren(eventList(visible, examMap));
          lastList = signature;
        }
      } else {
        let empty = 'Aucun événement pour cette sélection.';
        if (perExam && !examSelect.value) empty = 'Aucun contrôle disponible pour le suivi.';
        else if (loading && !known) empty = 'Recherche des événements…';
        else if (failed && !known) empty = 'Le journal est momentanément indisponible. Utilise « Actualiser ».';
        if (lastList !== empty) {
          results.replaceChildren(element('p', 'ce-monitor-empty', empty));
          lastList = empty;
        }
      }
      more.hidden = filtered.length <= limit;
      more.textContent = 'Afficher plus d’événements (' + Math.max(0, filtered.length - limit) + ')';
    }

    function pickExam(preferred, previous = examSelect.value) {
      const visible = exams.filter(exam => !classSelect.value || classesOf(exam).some(([id]) => id === classSelect.value));
      const choices = visible.map(exam => [exam.id, exam.title]);
      if (!perExam) choices.unshift(['', 'Tous les contrôles']);
      if (!choices.length) choices.push(['', 'Aucun contrôle']);
      options(examSelect, choices, preferred);
      examSelect.disabled = perExam && !visible.length;
      if (examSelect.value !== previous) examChanged();
      else render();
    }

    function examChanged() {
      limit = PAGE_SIZE;
      if (perExam) {
        events = [];
        updatedAt = null;
        failed = false;
        loading = Boolean(examSelect.value);
      }
      render();
      onExamChange?.(examSelect.value);
    }

    classSelect.addEventListener('change', () => pickExam(examSelect.value));
    examSelect.addEventListener('change', examChanged);
    student.addEventListener('input', () => {
      const value = student.value.replace(/[^0-9]/g, '').slice(0, 2);
      if (student.value !== value) student.value = value;
      limit = PAGE_SIZE;
      render();
    });
    kind.addEventListener('change', () => { limit = PAGE_SIZE; render(); });
    priority.addEventListener('change', () => { limit = PAGE_SIZE; render(); });
    download.addEventListener('click', () => {
      const selected = visibleEvents();
      if (!selected.length) return;
      const quote = value => '"' + String(value ?? '').replace(/"/g, '""')
        .replace(/[\r\n]/g, ' ') + '"';
      const lines = [
        ['Date','Heure (Paris)','Classe','N° élève','Contrôle','Événement','Durée (secondes)']
          .map(quote).join(';')
      ];
      const formatDay = formatter({year:'numeric',month:'2-digit',day:'2-digit'});
      for (const event of selected) {
        const exam = exams.find(e => e.id === event.examId);
        const date = Number.isFinite(event.at) ? new Date(event.at) : null;
        lines.push([
          date ? formatDay.format(date) : '',date ? clock.format(date) : '',
          event.className || '',event.studentNumber || '', exam?.title || '',
          kindLabels[event.kind] || event.kind,
          validDuration(event) ? (event.durationMs / 1000).toFixed(1).replace('.', ',') : ''
        ].map(quote).join(';'));
      }
      const blob = new Blob(['\ufeff' + lines.join('\r\n')], {type:'text/csv;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const link = element('a');
      link.href = url;
      link.download = 'cortex-journal-integrite-' + new Date().toISOString().slice(0,10) + '.csv';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    more.addEventListener('click', () => {
      const oldLimit = limit;
      limit += PAGE_SIZE;
      render();
      const next = results.querySelectorAll('.ce-event')[oldLimit];
      if (next) {
        next.tabIndex = -1;
        next.focus();
      }
    });

    return {
      setExams(next, preferred = examSelect.value) {
        exams = next;
        const classes = new Map(exams.flatMap(classesOf));
        const choices = [...classes].sort((a, b) => a[1].localeCompare(b[1], 'fr', { numeric: true }));
        options(classSelect, [['', 'Toutes'], ...choices], classSelect.value);
        pickExam(preferred);
      },
      selectExam(id) {
        const exam = exams.find(item => item.id === id);
        if (!exam) return;
        const classes = classesOf(exam);
        if (!classes.some(([classId]) => classSelect.value === classId)) classSelect.value = classes.length === 1 ? classes[0][0] : '';
        pickExam(id);
      },
      examId: () => examSelect.value,
      isLive: () => showingLive,
      showJournal() { chooseView(false); },
      setEvents(next, at = null) {
        events = newestFirst(next);
        updatedAt = at;
        failed = false;
        loading = false;
        render();
      },
      setError() { failed = true; loading = false; render(); },
      reset() {
        events = [];
        updatedAt = null;
        loading = false;
        failed = false;
        limit = PAGE_SIZE;
        showingLive = false;
        student.value = '';
        kind.value = '';
        priority.value = '';
        this.setExams([], '');
      }
    };
  }

  window.CORTEX_EXAM_MONITOR = { mount, eventList, fromDemo };
})();
