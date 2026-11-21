(function () {
  'use strict';

  const MIN_EXIT_MS = 2000;
  const MAX_EVENT_AGE_MS = 8 * 60 * 60 * 1000;
  // Toutes les réponses textuelles : textes courts, tableaux, cases à compléter,
  // anciennes évaluations et version mobile. Les cases à cocher, pièces jointes
  // et fenêtres de connexion restent hors du blocage.
  const answerField = [
    '[data-cortex-q] textarea',
    '[data-cortex-q] input:not([type=radio]):not([type=checkbox]):not([type=file]):not([type=hidden])',
    '[data-cortex-q] [contenteditable="true"]',
    '.cw-question-response textarea',
    '.cw-question-response input:not([type=radio]):not([type=checkbox]):not([type=file]):not([type=hidden])',
    '.cw-question-response [contenteditable="true"]',
    '.exam-question textarea',
    '.exam-question input[data-cq-input]:not([type=radio]):not([type=checkbox])',
    'textarea[data-answer]', 'input[data-answer]:not([type=radio]):not([type=checkbox]):not([type=file])',
    'input[data-doc-fill]'
  ].join(',');
  const editable = 'input, textarea, select, [contenteditable="true"]';
  const frenchNumber = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

  function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return 'Durée indisponible';
    const tenths = Math.max(1, Math.round(ms / 100));
    const hours = Math.floor(tenths / 36000);
    const minutes = Math.floor(tenths / 600) % 60;
    const remainder = (tenths % 600) / 10;
    const parts = [];
    if (hours) parts.push(hours + ' h');
    if (minutes) parts.push(minutes + ' min');
    if (remainder) parts.push(frenchNumber.format(remainder) + ' s');
    return parts.join(' ');
  }

  function eventId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }

  function describe(settings) {
    if (settings?.enabled !== true) return '';
    const rules = [];
    if (settings.trackVisibility === true) rules.push('Les sorties d’écran d’au moins 2 secondes sont signalées au retour.');
    if (settings.trackLive === true) rules.push('Ton professeur voit la progression de ton brouillon, l’état de la page et les accès simultanés pour ton numéro.');
    if (settings.blockPaste === true) rules.push('Le collage dans les réponses est bloqué.');
    if (settings.blockCopy === true) rules.push('La copie du sujet est limitée.');
    if (settings.watermarkCapture === true) rules.push('Un filigrane visible identifie les écrans du contrôle et les documents affichés dans CORTEX. Une capture système reste possible.');
    return rules.join(' ');
  }

  function create({ storageKey, onEvent, onNotice }) {
    let active = null;
    let hiddenAt = null;
    let visibleAt = document.hidden ? null : Date.now();
    const lastAction = new Map();

    function readHidden() {
      if (!storageKey) return null;
      try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { return null; }
    }

    function writeHidden() {
      if (!storageKey) return;
      try {
        if (hiddenAt === null) sessionStorage.removeItem(storageKey);
        else sessionStorage.setItem(storageKey, JSON.stringify({ key: active.key, at: hiddenAt }));
      } catch {}
    }

    function report(kind, at, durationMs = null) {
      onEvent({ kind, at, durationMs }, active);
      if (active.settings.warnStudent !== true) return;
      const message = {
        tab_hidden: 'Sortie d’écran signalée · ' + formatDuration(durationMs) + '.',
        paste_blocked: 'Le collage est désactivé dans les réponses à ce contrôle.',
        copy_blocked: 'La copie du sujet est désactivée pour ce contrôle.'
      };
      onNotice?.(message[kind]);
    }

    function tracking() {
      return active?.settings.enabled === true && active.settings.trackVisibility === true;
    }

    function leaveScreen() {
      visibleAt = null;
      if (!tracking() || hiddenAt !== null) return;
      hiddenAt = Date.now();
      writeHidden();
    }

    function returnToScreen() {
      if (document.visibilityState === 'hidden') return;
      visibleAt ??= Date.now();
      if (!tracking() || hiddenAt === null) return;
      const at = visibleAt;
      const duration = at - hiddenAt;
      hiddenAt = null;
      writeHidden();
      if (duration >= MIN_EXIT_MS && duration <= MAX_EVENT_AGE_MS) report('tab_hidden', at, duration);
    }

    function setActive(next = null) {
      if (active?.key === next?.key) {
        const wasTracking = tracking();
        active = next;
        if (wasTracking && !tracking()) {
          hiddenAt = null;
          writeHidden();
        } else if (!wasTracking && tracking() && document.hidden) leaveScreen();
        return;
      }
      if (active) {
        hiddenAt = null;
        writeHidden();
      }
      active = next;
      lastAction.clear();
      if (!tracking()) return;
      const previous = readHidden();
      const now = Date.now();
      if (previous?.key === active.key && previous.at >= active.startedAt && previous.at <= now &&
          now - previous.at <= MAX_EVENT_AGE_MS) hiddenAt = previous.at;
      else writeHidden();
      if (document.visibilityState === 'hidden') leaveScreen();
      else returnToScreen();
    }

    function block(event, kind) {
      if (!event.cancelable) return;
      event.preventDefault();
      const at = Date.now();
      // Safari peut émettre paste et beforeinput pour une seule action.
      if (at - (lastAction.get(kind) ?? -Infinity) < 750) return;
      lastAction.set(kind, at);
      report(kind, at);
    }

    function isSubjectTarget(target) {
      if (!active?.root?.contains(target) || !active.subjectSelector) return false;
      return Boolean(target.closest?.(active.subjectSelector));
    }

    function blockPaste(event) {
      if (active?.settings.enabled !== true || active.settings.blockPaste !== true) return;
      const target = event.target;
      if (!active.root?.contains(target)) return;
      // Sur iOS et avec les tableaux, l'événement peut partir d'un enfant
      // d'un élément contenteditable plutôt que du conteneur lui-même.
      if (target.closest?.(answerField)) block(event, 'paste_blocked');
    }

    function isSubjectSelection() {
      const selection = document.getSelection();
      if (!selection || selection.isCollapsed) return false;
      const bounds = [selection.anchorNode, selection.focusNode].some(node => {
        const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
        return element && isSubjectTarget(element);
      });
      if (bounds) return true;
      // Une sélection peut commencer dans un en-tête et se terminer ailleurs.
      if (!selection.rangeCount) return false;
      try {
        const range = selection.getRangeAt(0);
        return [...active.root.querySelectorAll(active.subjectSelector)]
          .some(subject => range.intersectsNode(subject));
      } catch { return false; }
    }

    function blockCopy(event) {
      if (active?.settings.enabled !== true || active.settings.blockCopy !== true) return;
      // L'élève garde le droit de corriger et de copier son propre brouillon.
      if (event.target.closest?.(editable)) return;
      if (isSubjectSelection()) block(event, 'copy_blocked');
    }

    function blockSubjectDrag(event) {
      if (active?.settings.enabled !== true || active.settings.blockCopy !== true) return;
      const target = event.target;
      if (target.closest?.('a,button,input,textarea,select,[contenteditable="true"]')) return;
      if (!isSubjectTarget(target)) return;
      // Interdit le glisser-déposer d'un extrait ou d'une image du sujet ;
      // ce geste n'est PAS enregistré comme une preuve de copie.
      if (event.cancelable) event.preventDefault();
    }

    function blockSubjectContextMenu(event) {
      if (active?.settings.enabled !== true || active.settings.blockCopy !== true) return;
      const target = event.target;
      if (target.closest?.('a,button,input,textarea,select,[contenteditable="true"]')) return;
      if (!isSubjectTarget(target)) return;
      if (target.closest?.('img,svg,canvas') || isSubjectSelection()) {
        // Masque la fonction Copier depuis le menu contextuel de la page
        // sans bloquer l'accès aux outils de zoom, clavier ou lecture vocale.
        if (event.cancelable) event.preventDefault();
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') leaveScreen();
      else returnToScreen();
    });
    window.addEventListener('pagehide', leaveScreen);
    window.addEventListener('pageshow', returnToScreen);
    document.addEventListener('paste', blockPaste);
    document.addEventListener('drop', blockPaste);
    document.addEventListener('beforeinput', event => {
      if (['insertFromPaste', 'insertFromPasteAsQuotation', 'insertFromDrop'].includes(event.inputType)) blockPaste(event);
    });
    document.addEventListener('copy', blockCopy);
    document.addEventListener('cut', blockCopy);
    document.addEventListener('dragstart', blockSubjectDrag);
    document.addEventListener('contextmenu', blockSubjectContextMenu);
    return { setActive };
  }

  window.CORTEX_EXAM_INTEGRITY = { create, describe, formatDuration, eventId, MAX_EVENT_AGE_MS };
})();
