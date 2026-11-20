/* CORTEX · Recherche et suivi des PFMP, en démonstration et en Académie. */
(function () {
  'use strict';

  const ENDPOINT = 'https://jhtmaoeazmjigfruandl.supabase.co/functions/v1/cortex-stage-search';
  const GUIDE = window.CORTEX_STAGE_GUIDE;
  const RANKING = window.CORTEX_STAGE_RANKING;
  const SECTORS = Object.entries(GUIDE.programs).map(([id, program]) => [id, program.label]);
  const RADII = [1200, 2500, 4000, 6500, 10000, 20000, 50000];
  const PAGE_SIZE = 12;
  const CACHE_AGE = 48 * 60 * 60 * 1000;
  const STATES = {
    todo: 'À contacter',
    waiting: 'En attente',
    meeting: 'Entretien prévu',
    accepted: 'Accord reçu',
    declined: 'Refus'
  };
  const CHECKLIST = [
    ['cv', 'J’ai préparé mon CV et adapté mon message.'],
    ['missions', 'J’ai vérifié les missions et identifié le tuteur.'],
    ['school', 'J’ai fait valider le lieu et les missions par le lycée.'],
    ['agreement', 'Ma convention est signée avant le début de la PFMP.']
  ];
  const HERO = {
    search: ['Trouve ta', 'prochaine PFMP.', 'Recherche de PFMP', 'Repère des lieux autour de toi, prépare le premier contact et garde le fil de tes candidatures.'],
    board: ['Mes', 'démarches', 'Carnet PFMP', 'Retrouve tes contacts, tes réponses et tes prochaines relances.'],
    prep: ['Préparer', 'ma PFMP', 'Avant le premier contact', 'Prépare tes dates, les questions à poser et la convention à faire valider.'],
    cv: ['CV et', 'lettre', 'Atelier de candidature', 'Rédige, améliore et relis tes documents avant de les partager.'],
    assistant: ['Ton assistant', 'Albert', 'Accompagnement PFMP', 'Choisis une action pour avancer, de la recherche au premier entretien.']
  };

  const clean = value => String(value ?? '').trim();
  const numbers = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  const dates = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
  const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value));
  const formatDate = value => dates.format(new Date(value + 'T12:00:00'));
  const today = () => new Date().toLocaleDateString('sv-SE');
  const plural = (n, singular, pluralForm = singular + 's') => n === 1 ? singular : pluralForm;
  const canRelance = status => status === 'waiting' || status === 'todo';

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function button(label, className, action) {
    const element = node('button', className, label);
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
  }

  function outbound(label, href, className) {
    const anchor = node('a', className, label);
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    return anchor;
  }

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function webUrl(value) {
    try {
      const url = new URL(clean(value));
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch {
      // Le lien n’est affiché que si l’annuaire fournit une URL utilisable.
    }
    return '';
  }

  function phoneUrl(value) {
    const phone = clean(value).split(/[;/]/)[0].replace(/[^+0-9]/g, '');
    return /^\+?[0-9]{6,16}$/.test(phone) ? 'tel:' + phone : '';
  }

  function coordinates(raw) {
    if (raw.lat == null || raw.lon == null || raw.lat === '' || raw.lon === '') return null;
    const lat = Number(raw.lat);
    const lon = Number(raw.lon);
    return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180
      ? { lat, lon }
      : null;
  }

  function placeFrom(raw) {
    if (!raw || !clean(raw.name) || !clean(raw.id)) return null;
    const distance = raw.distance_km == null ? NaN : Number(raw.distance_km);
    return {
      id: clean(raw.id),
      name: clean(raw.name),
      address: clean(raw.address),
      phone: clean(raw.phone),
      callable: Boolean(phoneUrl(raw.phone)),
      website: webUrl(raw.website),
      activity: clean(raw.activity || raw.category),
      employer: raw.employer === true,
      point: coordinates(raw),
      distance: Number.isFinite(distance) && distance >= 0 ? distance : null,
      types: Array.isArray(raw.target_types) ? raw.target_types : [],
      rank: Number(raw.albert_rank) > 0 ? Number(raw.albert_rank) : 0,
      why: clean(raw.albert_why),
      suggestion: Array.isArray(raw.missions) ? raw.missions.map(clean).filter(Boolean)[0] || '' : '',
      evidence: raw.pfmp_evidence?.label ? {
        label: clean(raw.pfmp_evidence.label), date: clean(raw.pfmp_evidence.date),
        period: clean(raw.pfmp_evidence.period), url: webUrl(raw.pfmp_evidence.url)
      } : null,
      manual: raw.manual === true
    };
  }

  function publicSource(place) {
    if (/^(node|way|relation)\/[0-9]+$/.test(place.id)) return 'https://www.openstreetmap.org/' + place.id;
    if (/^siret\/[0-9]{14}$/.test(place.id)) {
      return 'https://annuaire-entreprises.data.gouv.fr/etablissement/' + place.id.slice(6);
    }
    return '';
  }

  function linksFor(place) {
    const links = node('div', 'cs-stage-contact-links');
    const tel = phoneUrl(place.phone);
    if (tel) {
      const call = node('a', 'cs-stage-link', 'Appeler');
      call.href = tel;
      links.append(call);
    }
    if (place.point || place.address) {
      const destination = place.point ? place.point.lat + ',' + place.point.lon : place.address;
      links.append(outbound('Itinéraire',
        'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destination),
        'cs-stage-link'));
    }
    const mapQuery = [place.name, place.address, !place.address && place.point ? place.point.lat + ',' + place.point.lon : ''].filter(Boolean).join(' ');
    links.append(outbound(tel ? 'Fiche Google Maps' : 'Chercher le numéro sur Google Maps',
      'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery), 'cs-stage-link'));
    if (place.website) links.append(outbound('Site web', place.website, 'cs-stage-link'));
    return links;
  }

  function apiLevel(className) {
    const label = normalize(className);
    if (/^(2|seconde)/.test(label)) return 'seconde';
    if (/^(1|premi)/.test(label)) return 'premiere';
    if (/^(t|term)/.test(label)) return 'terminale';
    return '';
  }

  function exportCsv(name, rows) {
    const quote = value => {
      const text = String(value ?? '');
      const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? "'" + text : text;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    const data = '\ufeff' + rows.map(row => row.map(quote).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }));
    const anchor = node('a');
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const screen = `
    <header class="cs-stage-hero">
      <div class="cs-stage-hero-visual" aria-hidden="true"></div>
      <div class="cs-stage-hero-content">
        <div class="cs-stage-hero-top">
          <span class="cs-stage-signature"><span aria-hidden="true"></span> CORTEX / STATION NOCTIS</span>
          <button type="button" class="cs-stage-return" id="cs-stage-back">Retour à l’espace élève</button>
        </div>
        <div class="cs-stage-hero-copy">
          <div class="cs-stage-kicker" id="cs-stage-hero-kicker">Recherche de PFMP</div>
          <h1 tabindex="-1" id="cs-stage-title"><span id="cs-stage-hero-title">Trouve ta</span><br><em id="cs-stage-hero-emphasis">prochaine PFMP.</em></h1>
          <p id="cs-stage-hero-description">Repère des lieux autour de toi, prépare le premier contact et garde le fil de tes candidatures.</p>
        </div>
      </div>
    </header>
    <nav class="cs-stage-nav" aria-label="Parcours de recherche de PFMP">
      <button type="button" data-stage-nav="search" aria-controls="cs-stage-search-panel" aria-pressed="true"><span class="cs-stage-nav-icon is-search" aria-hidden="true"></span> Rechercher</button>
      <button type="button" data-stage-nav="board" aria-controls="cs-stage-board-panel" aria-pressed="false"><span class="cs-stage-nav-icon is-board" aria-hidden="true"></span> Mes démarches <span id="cs-stage-board-count" class="cs-stage-nav-count" hidden></span></button>
      <button type="button" data-stage-nav="prep" aria-controls="cs-stage-prep-panel" aria-pressed="false"><span class="cs-stage-nav-icon is-prep" aria-hidden="true"></span> Préparer ma PFMP</button>
      <button type="button" data-stage-nav="cv" aria-controls="cs-stage-cv-panel" aria-pressed="false"><span class="cs-stage-nav-icon is-board" aria-hidden="true"></span> CV et lettre</button>
      <button type="button" data-stage-nav="assistant" aria-controls="cs-stage-assistant-panel" aria-pressed="false"><span class="cs-stage-nav-icon is-advisor" aria-hidden="true">✦</span> Assistant Albert</button>
    </nav>
    <div class="cs-stage-doc-launch" id="cs-stage-doc-launch" aria-label="Préparer ta candidature">
      <button type="button" data-stage-document="cv" aria-controls="cs-stage-cv-panel"><span class="cs-stage-doc-icon" aria-hidden="true">CV</span><span><strong>Préparer mon CV</strong><small>Présente tes compétences et tes expériences.</small></span></button>
      <button type="button" data-stage-document="lettre" aria-controls="cs-stage-cv-panel"><span class="cs-stage-doc-icon is-letter" aria-hidden="true">✉</span><span><strong>Préparer ma lettre de motivation</strong><small>Explique pourquoi le lieu t’intéresse.</small></span></button>
    </div>
    <div class="cs-stage-panel" data-stage-panel="search" id="cs-stage-search-panel">
      <div class="cs-stage-workspace">
        <form class="cs-stage-surface cs-stage-console" id="cs-stage-form" aria-labelledby="cs-stage-form-title">
          <div class="cs-stage-panel-kicker">Annuaire des structures</div>
          <h2 id="cs-stage-form-title" tabindex="-1">Où veux-tu faire ta PFMP ?</h2>
          <fieldset class="cs-stage-fieldset">
            <legend>Ta filière</legend>
            <div class="cs-stage-programs" id="cs-stage-programs"></div>
          </fieldset>
          <fieldset class="cs-stage-fieldset cs-stage-options" id="cs-stage-options">
            <legend>Ton option commerce</legend>
            <div class="cs-stage-options-row">
              <label><input type="radio" name="stage-option" value="toutes" checked><span>Explorer A et B</span></label>
              <label><input type="radio" name="stage-option" value="A"><span>Option A · Magasin</span></label>
              <label><input type="radio" name="stage-option" value="B"><span>Option B · Prospection</span></label>
            </div>
          </fieldset>
          <div class="cs-stage-zone">
            <label for="cs-stage-city">Ville ou quartier<input id="cs-stage-city" value="Paris 15e" maxlength="90" required placeholder="Ex. Paris 15e ou Saint-Denis"></label>
            <label for="cs-stage-radius">Rayon<select id="cs-stage-radius">
              <option value="1200">1,2 km</option><option value="2500" selected>2,5 km</option>
              <option value="4000">4 km</option><option value="6500">6,5 km</option>
              <option value="10000">10 km</option><option value="20000">20 km</option><option value="50000">50 km</option>
            </select></label>
          </div>
          <details class="cs-stage-kinds" id="cs-stage-kinds">
            <summary>Types de lieux <span id="cs-stage-type-count" class="cs-stage-kind-count"></span></summary>
            <div class="cs-stage-kind-panel">
              <div class="cs-stage-kind-tools">
                <button type="button" class="cs-stage-text-button" id="cs-stage-all-types">Tout cocher</button>
                <button type="button" class="cs-stage-text-button" id="cs-stage-no-types">Tout décocher</button>
              </div>
              <div id="cs-stage-type-list"></div>
            </div>
          </details>
          <div class="cs-stage-launch">
            <div class="cs-stage-search-options">
              <label class="cs-stage-toggle"><input type="checkbox" id="cs-stage-albert" checked><span><strong>Classement Albert IA</strong><small>Prioriser les lieux adaptés à ta filière</small></span></label>
              <label class="cs-stage-toggle cs-stage-confirmed-toggle"><input type="checkbox" id="cs-stage-confirmed"><span><strong>Uniquement les lieux ayant déjà accueilli en PFMP</strong><small id="cs-stage-confirmed-scope"></small></span></label>
            </div>
            <button type="submit" class="cs-stage-primary" id="cs-stage-submit"><span class="cs-stage-nav-icon is-search" aria-hidden="true"></span> Trouver des lieux</button>
          </div>
        </form>
        <aside class="cs-stage-brief" id="cs-stage-brief" aria-labelledby="cs-stage-brief-title"></aside>
      </div>
      <div class="cs-stage-loader" id="cs-stage-loader" hidden>
        <span class="cs-stage-spinner" aria-hidden="true"></span>
        <div><strong>Recherche en cours</strong><p id="cs-stage-loader-copy"></p></div>
        <button type="button" id="cs-stage-cancel" class="cs-stage-quiet">Annuler</button>
      </div>
      <p id="cs-stage-status" class="cs-stage-status" role="status" aria-live="polite"></p>
      <section class="cs-stage-results" id="cs-stage-results" aria-labelledby="cs-stage-result-title" hidden>
        <div class="cs-stage-result-header">
          <div><div class="cs-stage-kicker">Résultats de recherche</div><h2 id="cs-stage-result-title" tabindex="-1"></h2><p id="cs-stage-result-context"></p></div>
          <div class="cs-stage-result-actions">
            <button type="button" id="cs-stage-resume" class="cs-stage-primary" hidden>Reprendre la recherche</button>
            <button type="button" id="cs-stage-compare" class="cs-stage-quiet" hidden>Comparer avec Albert</button>
            <button type="button" id="cs-stage-refresh" class="cs-stage-quiet">Actualiser</button>
          </div>
        </div>
        <p class="cs-stage-ai-note" id="cs-stage-ai-note"></p>
        <details class="cs-stage-criteria" id="cs-stage-criteria">
          <summary>Comment les lieux sont-ils sélectionnés ?</summary>
          <ul>
            <li><strong>Missions du bac pro</strong> Le type d’établissement doit correspondre à ta filière et aux activités à pratiquer.</li>
            <li><strong>Proximité</strong> La distance est calculée à vol d’oiseau depuis la zone recherchée.</li>
            <li><strong>Coordonnées</strong> Une adresse, un numéro public ou un site renseigné rendent la prise de contact plus facile.</li>
            <li><strong>Équipe sur place</strong> Le statut d’employeur, quand il est renseigné, est un indice qu’une équipe peut être présente.</li>
          </ul>
          <p>Albert peut ajuster la priorité des types de lieux. Confirme les missions et les possibilités d’accueil auprès de chaque structure.</p>
        </details>
        <nav class="cs-stage-batch-nav" id="cs-stage-batch-nav" aria-label="Sélections de lieux de PFMP" hidden>
          <p id="cs-stage-batch-label" aria-live="polite"></p>
          <div>
            <button type="button" id="cs-stage-batch-prev" class="cs-stage-quiet" hidden>Sélection précédente</button>
            <button type="button" id="cs-stage-batch-next" class="cs-stage-primary" hidden>100 autres pistes</button>
          </div>
        </nav>
        <div class="cs-stage-filters" id="cs-stage-filters" hidden>
          <label>Filtrer cette sélection<select id="cs-stage-filter"><option value="all">Tous les lieux</option><option value="phone">Avec téléphone</option><option value="full">Avec adresse</option><option value="site">Avec site web</option><option value="saved">Dans mes démarches</option></select></label>
          <label>Trier cette sélection<select id="cs-stage-sort"><option value="default">Pertinence</option><option value="distance">Proximité</option><option value="phone">Téléphone disponible</option><option value="name">Nom A à Z</option></select></label>
          <button type="button" id="cs-stage-export" class="cs-stage-quiet">Exporter en CSV</button>
        </div>
        <p class="cs-stage-matches" id="cs-stage-matches" aria-live="polite"></p>
        <div class="cs-stage-cards" id="cs-stage-cards"></div>
        <div class="cs-stage-display-actions">
          <button type="button" id="cs-stage-more" class="cs-stage-quiet cs-stage-more" hidden></button>
          <button type="button" id="cs-stage-show-all" class="cs-stage-quiet" hidden>Afficher toute la sélection</button>
        </div>
      </section>
      <p class="cs-stage-sources">Sources <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>, <a href="https://annuaire-entreprises.data.gouv.fr/" target="_blank" rel="noopener noreferrer">Annuaire des entreprises</a> et IGN. Vérifie les coordonnées et demande à la structure si elle peut t’accueillir en PFMP.</p>
    </div>
    <div class="cs-stage-panel" data-stage-panel="board" id="cs-stage-board-panel" hidden>
      <section class="cs-stage-surface cs-stage-survey" aria-labelledby="cs-stage-board-title">
        <div class="cs-stage-pane-head">
          <div><h2 id="cs-stage-board-title" tabindex="-1">Mon carnet de candidatures</h2><p>Ton carnet est enregistré dans ce navigateur.</p></div>
          <div class="cs-stage-board-actions">
            <button type="button" class="cs-stage-pale" id="cs-stage-add-place">Ajouter un lieu</button>
            <button type="button" class="cs-stage-pale" id="cs-stage-export-board" hidden>Exporter en CSV</button>
          </div>
        </div>
        <div class="cs-stage-board-stats" id="cs-stage-board-stats" aria-label="Résumé de mes démarches"></div>
        <div class="cs-stage-board-tools" id="cs-stage-board-tools" hidden>
          <label>Retrouver un lieu<input type="search" id="cs-stage-board-query" placeholder="Nom ou adresse"></label>
          <label>Afficher<select id="cs-stage-board-filter"><option value="all">Toutes mes démarches</option><option value="todo">À contacter</option><option value="due">À relancer</option><option value="progress">En cours</option><option value="waiting">En attente</option><option value="meeting">Entretien prévu</option><option value="accepted">Accord reçu</option><option value="declined">Refus</option></select></label>
        </div>
        <p class="cs-stage-board-notice" id="cs-stage-board-notice" role="status"></p>
        <div class="cs-stage-board-list" id="cs-stage-board-list"></div>
      </section>
    </div>
    <div class="cs-stage-panel" data-stage-panel="prep" id="cs-stage-prep-panel" hidden>
      <div class="cs-stage-prep-grid">
        <section class="cs-stage-surface cs-stage-prep-contact" aria-labelledby="cs-stage-prep-title">
          <h2 id="cs-stage-prep-title" tabindex="-1">Préparer le premier contact</h2>
          <p>Ajoute les dates données par ton lycée. Elles seront reprises dans tes modèles.</p>
          <div class="cs-stage-date-fields">
            <label>Date de début <input type="date" id="cs-stage-start"></label>
            <label>Date de fin <input type="date" id="cs-stage-end"></label>
          </div>
          <p id="cs-stage-date-status" class="cs-stage-date-status" role="status"></p>
          <label class="cs-stage-contact-target">Lieu à contacter
            <select id="cs-stage-contact-target"><option value="">Sans structure précise</option></select>
          </label>
          <div class="cs-stage-action-row">
            <button type="button" class="cs-stage-primary" id="cs-stage-make-message">Écrire ou appeler</button>
            <button type="button" class="cs-stage-pale" id="cs-stage-prep-cv">Préparer mon CV</button>
          </div>
        </section>
        <div class="cs-stage-prep-side">
          <section class="cs-stage-brief cs-stage-coach-callout" aria-labelledby="cs-stage-interview-heading">
            <div class="cs-stage-kicker">Assistant Albert</div>
            <h2 id="cs-stage-interview-heading">Un entretien à préparer ?</h2>
            <p>Entraîne-toi à présenter ce que tu sais faire et à poser des questions sur tes missions.</p>
            <button type="button" class="cs-stage-quiet" id="cs-stage-prep-interview">M’entraîner avec Albert</button>
          </section>
          <section class="cs-stage-surface cs-stage-check-area" aria-labelledby="cs-stage-check-title">
            <h2 id="cs-stage-check-title">Avant de commencer</h2>
            <div class="cs-stage-progress"><progress id="cs-stage-progress" max="4" value="0" aria-label="Étapes avant la PFMP"></progress><span id="cs-stage-progress-label">0 / 4</span></div>
            <div id="cs-stage-checklist"></div>
          </section>
        </div>
        <section class="cs-stage-surface cs-stage-reference" id="cs-stage-reference"></section>
      </div>
    </div>
    <div class="cs-stage-panel" data-stage-panel="cv" id="cs-stage-cv-panel" hidden>
      <section class="cs-stage-surface" aria-labelledby="cs-stage-cv-title">
        <h2 id="cs-stage-cv-title" tabindex="-1">Ma candidature</h2>
        <div id="cs-stage-cv-workshop"></div>
      </section>
    </div>
    <div class="cs-stage-panel" data-stage-panel="assistant" id="cs-stage-assistant-panel" hidden>
      <div class="cs-stage-advisor-grid">
        <form class="cs-stage-surface cs-stage-advisor-form" id="cs-stage-advisor-form">
          <h2 id="cs-stage-assistant-title" tabindex="-1">Comment Albert peut t’aider ?</h2>
          <p id="cs-stage-advisor-context" class="cs-stage-advisor-context"></p>
          <fieldset class="cs-stage-advisor-goals"><legend class="cs-stage-sr-only">Choisis une action</legend><div id="cs-stage-advisor-goals"></div></fieldset>
          <label id="cs-stage-advisor-situation-wrap">Ta situation<select id="cs-stage-advisor-situation"></select></label>
          <label id="cs-stage-advisor-target-wrap" hidden>Lieu concerné<select id="cs-stage-advisor-target"></select></label>
          <button type="submit" id="cs-stage-advisor-ask" class="cs-stage-primary">Demander à Albert</button>
          <p id="cs-stage-advisor-status" role="status"></p>
        </form>
        <section class="cs-stage-surface cs-stage-advisor-response" id="cs-stage-advisor-response" aria-label="Conseils pour ta PFMP" tabindex="-1"></section>
      </div>
    </div>
    <dialog class="cs-stage-dialog" id="cs-stage-dialog" aria-labelledby="cs-stage-dialog-title">
      <div class="cs-stage-dialog-head"><h2 id="cs-stage-dialog-title"></h2><form method="dialog"><button class="cs-stage-pale" aria-label="Fermer la fenêtre">Fermer</button></form></div>
      <div id="cs-stage-dialog-content"></div>
    </dialog>`;

  function mount(container, settings = {}) {
    if (!container) return;

    const mode = settings.demo ? 'demo' : 'real';
    const scope = encodeURIComponent(settings.storageScope || 'public');
    const key = 'cortex-stage-workspace:v1:' + mode + ':' + scope;
    const cacheKey = 'cortex-stage-cache:v7:' + mode;
    const saved = read(key, {});
    const identity = saved.identity || {};
    const drafts = Object.assign(Object.create(null), saved.drafts || {});
    const hooks = Object.assign(Object.create(null), saved.hooks || {});
    const legacy = settings.demo && !settings.storageScope ? read('cortex-stage-favoris:v1', []) : [];
    const legacyIds = new Set(Array.isArray(legacy) ? legacy : []);
    const board = new Map(Array.isArray(saved.board) ? saved.board.map(entry => [entry.place.id, entry]) : []);
    const preferences = saved.preferences || {};
    let sector = Object.hasOwn(GUIDE.programs, preferences.sector)
      ? preferences.sector : GUIDE.inferProgram(settings.filiere || settings.className);
    let option = ['A', 'B', 'toutes'].includes(preferences.option) ? preferences.option : 'toutes';
    let panel = 'search';
    let result = null;
    let pending = null;
    let pageLimit = PAGE_SIZE;
    let batchIndex = 0;
    let shown = [];
    let contactsDirty = true;
    let destroyed = false;
    const calibrationScores = new Map();

    const section = node('section', 'cs-stage-search');
    section.setAttribute('aria-labelledby', 'cs-stage-title');
    section.innerHTML = screen;
    container.replaceChildren(section);
    const $ = id => section.querySelector('#cs-stage-' + id);
    const navigation = section.querySelector('.cs-stage-nav');
    const siteHeader = document.querySelector('header.topbar, header.top');

    function setScrollOffset() {
      const rect = siteHeader?.getBoundingClientRect();
      const visible = rect && rect.top >= -2 && ['fixed','sticky'].includes(getComputedStyle(siteHeader).position);
      const offset = Math.ceil(visible ? rect.bottom : 0) + 12;
      section.style.setProperty('--cs-stage-scroll-start', offset + 'px');
      return offset;
    }
    setScrollOffset();

    const prep = saved.prep || { start: '', end: '', done: [] };
    const checks = new Set(Array.isArray(prep.done) ? prep.done : []);
    const selections = preferences.types || {};
    $('city').value = clean(preferences.city) || 'Paris 15e';
    $('radius').value = RADII.includes(preferences.radius) ? String(preferences.radius) : '2500';
    $('albert').checked = preferences.albert !== false;
    $('confirmed').checked = preferences.confirmed === true;
    $('confirmed-scope').textContent = settings.demo
      ? 'S’appuie sur les témoignages publics vérifiés.' : 'S’appuie sur l’historique de ton enseignant et les sources publiques vérifiées.';
    section.querySelector('input[name="stage-option"][value="' + option + '"]').checked = true;
    $('start').value = validDate(prep.start) ? prep.start : '';
    $('end').value = validDate(prep.end) ? prep.end : '';

    const route = () => sector === 'commerce-vente' ? option : 'toutes';
    const status = (text, error = false) => {
      $('status').textContent = text;
      $('status').classList.toggle('is-error', error);
    };
    const boardNotice = text => { $('board-notice').textContent = text; };

    function persist() {
      return save(key, {
        preferences: { sector, option, city: $('city').value, radius: Number($('radius').value),
          albert: $('albert').checked, confirmed: $('confirmed').checked, types: selections },
        prep: { start: prep.start || '', end: prep.end || '', done: [...checks] },
        board: [...board.values()], identity, drafts, hooks
      });
    }

    function needsFollowUp(entry) {
      return canRelance(entry.status) && validDate(entry.followUp) && entry.followUp <= today();
    }

    function boardChanged() {
      contactsDirty = true;
      const count = $('board-count');
      count.hidden = !board.size;
      count.textContent = String(board.size);
    }

    function setPanel(next, moveFocus = true, company = '', kind = '') {
      panel = next;
      section.dataset.stageView = next;
      const [title, emphasis, kicker, description] = HERO[next];
      $('hero-title').textContent = title;
      $('hero-emphasis').textContent = emphasis;
      $('hero-kicker').textContent = kicker;
      $('hero-description').textContent = description;
      section.querySelectorAll('[data-stage-panel]').forEach(element => {
        element.hidden = element.dataset.stagePanel !== next;
      });
      section.querySelectorAll('[data-stage-nav]').forEach(element => {
        element.setAttribute('aria-pressed', String(element.dataset.stageNav === next));
      });
      if (next === 'board') renderBoard();
      if (next === 'prep') {
        renderReference();
        const target = $('contact-target');
        const previous = target.value;
        target.replaceChildren(new Option('Sans structure précise', ''),
          ...[...board.values()].map(({place}) => new Option(place.name, place.id)));
        if (board.has(company || previous)) target.value = company || previous;
      }
      $('doc-launch').hidden = next !== 'search';
      if (next === 'cv') workshop.show(company, kind);
      else workshop.hide();
      if (next === 'assistant') assistant.show(kind, company);
      else assistant.hide();
      if (next === 'search' && result && contactsDirty) renderCards();
      if (moveFocus) {
        const offset = setScrollOffset();
        const area = navigation.getBoundingClientRect();
        $(next === 'search' ? 'form-title' : next + '-title').focus({ preventScroll:true });
        if (area.top < offset || area.bottom > innerHeight) navigation.scrollIntoView({ block:'start' });
      }
    }

    section.querySelectorAll('[data-stage-nav]').forEach(element => {
      element.addEventListener('click', () => setPanel(element.dataset.stageNav));
    });

    section.querySelectorAll('[data-stage-document]').forEach(element => {
      element.addEventListener('click', () => setPanel('cv', true,
        panel === 'prep' ? $('contact-target').value : '', element.dataset.stageDocument));
    });

    function stagePeriod() {
      return periodKnown()
        ? 'du ' + formatDate(prep.start) + ' au ' + formatDate(prep.end)
        : 'du [date de début] au [date de fin]';
    }
    function periodKnown() { return validDate(prep.start) && validDate(prep.end); }

    async function askAlbert(input, signal) {
      const response = await fetch(ENDPOINT, {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal,
        body: JSON.stringify({ ...input, demo: settings.demo === true, session: settings.session || '' })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw Error(data?.error || 'Albert est momentanément indisponible.');
      return data;
    }

    const workshop = window.CORTEX_STAGE_CV.mount($('cv-workshop'), {
      identity, drafts, save: persist, entries: () => [...board.values()],
      general: () => ({ place:{id:'general/' + sector + '/' + route(),name:'',address:'',types:[]}, sector, option:route() }),
      openBoard: () => setPanel('board'), openPrep: () => setPanel('prep'),
      program: entry => GUIDE.programs[entry.sector].name + (entry.option==='toutes'?'':' (option '+entry.option+')'),
      getHook: entry => hooks[entry.place.id] || hooks[entry.sector+'-'+entry.option] || '',
      period: stagePeriod,
      async ask(entry, kind, field, raw, signal) {
        let text = raw.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[e-mail]').replace(/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/g,'[téléphone]');
        for (const value of [identity.first,identity.last,identity.school,identity.email,identity.phone].filter(x=>x?.length>1)) {
          const escaped = value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          text = text.replace(new RegExp('(^|[^\\p{L}\\p{N}])'+escaped+'(?![\\p{L}\\p{N}])','giu'),'$1[information personnelle]');
        }
        const {categories} = GUIDE.forPlace(entry.sector,entry.option,entry.place.types);
        return askAlbert({action:'improve_application',document:kind,field,text,
          filiere:entry.sector,optionCommerce:entry.option,type:categories[0]?.[0]||'',
          company:entry.place.manual ? '' : entry.place.name.slice(0,120)},signal);
      }
    });

    function targetEntries() {
      const entries = new Map(board);
      if (result) for (const place of currentBatch()) {
        if (!entries.has(place.id)) entries.set(place.id, resultEntry(place));
      }
      return [...entries.values()];
    }

    function assistantContext(goal, targetId) {
      const target = targetId ? targetEntries().find(entry => entry.place.id === targetId) : null;
      const useResults = goal === 'compare' && result && shown.length;
      const program = target?.sector || (useResults ? result.query.sector : sector);
      const track = target?.option || (useResults ? result.query.option : route());
      const types = useResults ? result.query.types : program === sector && track === route() ? selected() : [];
      const entries = goal === 'compare'
        ? (useResults ? shown.map(place => resultEntry(place)) : [...board.values()].filter(entry => entry.sector === program && entry.option === track)).slice(0, 8)
        : target ? [target] : [];
      const targetGuide = GUIDE.forPlace(program, track, target?.place.types || []);
      const candidates = entries.map(({place}) => ({types:place.types, distance:place.distance,
        phone:place.callable, website:Boolean(place.website), confirmed:Boolean(place.evidence)}));
      return {
        input: { filiere:program, optionCommerce:track, niveau:apiLevel(settings.className), types,
          candidates, state:target?.status || '', has_dates:periodKnown(), saved_count:board.size,
          due_count:[...board.values()].filter(needsFollowUp).length },
        entries, target, period:periodKnown() ? stagePeriod() : '',
        typeLabels:GUIDE.forSearch(program, track).filter(([id]) => types.includes(id)).map(([,label]) => label),
        mission:targetGuide.categories[0]?.[2] || targetGuide.profile?.question,
        label:GUIDE.programs[program].label + (track === 'toutes' ? '' : ' · Option ' + track) +
          (goal === 'compare' ? ' · ' + entries.length + ' ' + plural(entries.length, 'piste') : '')
      };
    }

    const assistant = window.CORTEX_PFMP_ASSISTANT.mount($('assistant-panel'), {
      node, button, context:assistantContext, targets:targetEntries,
      refreshScrollOffset: setScrollOffset,
      ask: (input, signal) => askAlbert({action:'guide_search', ...input}, signal),
      isSaved: entry => board.has(entry.place.id), keep: addEntry, contact: openContact,
      search: () => setPanel('search'), board: showBoardEntry,
      documents(entry) {
        if (entry && !board.has(entry.place.id)) addEntry(entry);
        setPanel('cv', true, entry?.place.id || '', entry ? 'lettre' : 'cv');
      },
      async copy(text, notice) {
        try { await navigator.clipboard.writeText(text); notice.textContent = 'Modèle copié.'; }
        catch { notice.textContent = 'Sélectionne le modèle, puis utilise la commande Copier.'; }
      }
    });

    const available = () => GUIDE.forSearch(sector, route());
    const selected = () => available().filter(type =>
      !Array.isArray(selections[sector]) || selections[sector].includes(type[0])
    ).map(type => type[0]);

    function updateTypeSummary() {
      const n = selected().length;
      $('type-count').textContent = n + ' / ' + available().length;
      $('submit').disabled = Boolean(pending) || !n;
    }

    function renderTypes() {
      $('options').hidden = sector !== 'commerce-vente';
      const list = $('type-list');
      list.replaceChildren();
      const types = available();
      const checked = new Set(selected());
      const groups = sector === 'commerce-vente' && option === 'toutes'
        ? [['Option A · Magasin', types.filter(type => type[3] === 'A')], ['Option B · Prospection', types.filter(type => type[3] === 'B')]]
        : [['', types]];
      for (const [name, entries] of groups) {
        if (name) list.append(node('p', 'cs-stage-kind-heading', name));
        const grid = node('div', 'cs-stage-kind-grid');
        for (const [id, label, description] of entries) {
          const item = node('label', 'cs-stage-kind');
          const box = node('input');
          box.type = 'checkbox';
          box.checked = checked.has(id);
          box.addEventListener('change', () => {
            const next = new Set(selections[sector] || GUIDE.forSearch(sector, 'toutes').map(type => type[0]));
            if (box.checked) next.add(id); else next.delete(id);
            selections[sector] = [...next];
            updateTypeSummary();
            if (selected().length) updateSearchHint();
            else status('Coche au moins un type de lieu pour lancer la recherche.');
            persist();
          });
          const copy = node('span');
          copy.append(node('strong', '', label), node('small', '', description));
          item.append(box, copy);
          grid.append(item);
        }
        list.append(grid);
      }
      updateTypeSummary();
    }

    function setAllTypes(enable) {
      const choices = new Set(selections[sector] || GUIDE.forSearch(sector, 'toutes').map(type => type[0]));
      for (const [id] of available()) {
        if (enable) choices.add(id); else choices.delete(id);
      }
      selections[sector] = [...choices];
      renderTypes();
      if (selected().length) updateSearchHint();
      else status('Coche au moins un type de lieu pour lancer la recherche.');
      persist();
    }

    $('all-types').addEventListener('click', () => setAllTypes(true));
    $('no-types').addEventListener('click', () => setAllTypes(false));
    for (const [id, program] of Object.entries(GUIDE.programs)) {
      const label = node('label', 'cs-stage-program');
      const radio = node('input');
      radio.type = 'radio';
      radio.name = 'stage-program';
      radio.value = id;
      radio.checked = sector === id;
      radio.addEventListener('change', () => {
        sector = id;
        changeCriteria();
      });
      const card = node('span', 'cs-stage-program-card');
      card.append(node('span', 'cs-stage-program-code', program.short),
        node('strong', '', program.label), node('small', '', program.detail));
      label.append(radio, card);
      $('programs').append(label);
    }
    $('options').addEventListener('change', event => {
      option = event.target.value;
      changeCriteria();
    });
    $('city').addEventListener('change', changeCriteria);
    $('radius').addEventListener('change', changeCriteria);
    $('albert').addEventListener('change', changeCriteria);
    $('confirmed').addEventListener('change', changeCriteria);

    function updateSearchHint() {
      if (pending) return;
      if (result && signature(queryFromForm()) !== signature(result.query)) {
        status('Lance la recherche pour appliquer les nouveaux critères.');
      } else {
        status('');
      }
    }

    function changeCriteria() {
      persist();
      updateSearchHint();
      renderTypes();
      renderBrief();
    }

    function programProfiles() {
      if (sector !== 'commerce-vente') return [[GUIDE.programs[sector].short, GUIDE.profiles[sector]]];
      if (option === 'toutes') return [['Option A', GUIDE.profiles.A], ['Option B', GUIDE.profiles.B]];
      return [['Option ' + option, GUIDE.profiles[option]]];
    }

    function renderBrief() {
      const brief = $('brief');
      const heading = node('h2', '', 'Les missions à demander');
      heading.id = 'cs-stage-brief-title';
      brief.replaceChildren(node('div', 'cs-stage-kicker', GUIDE.programs[sector].label), heading);
      for (const [label, profile] of programProfiles()) {
        const item = node('div', 'cs-stage-brief-item');
        item.append(node('span', 'cs-stage-brief-code', label), node('strong', '', profile.title), node('p', '', profile.lead));
        brief.append(item);
      }
      brief.append(button('Voir les compétences et le guide', 'cs-stage-quiet cs-stage-brief-link', () => setPanel('prep')));
    }

    function renderReference() {
      const reference = $('reference');
      reference.replaceChildren(node('div', 'cs-stage-panel-kicker', GUIDE.programs[sector].label),
        node('h2', '', 'Vérifier les missions'));
      for (const [label, profile] of programProfiles()) {
        const group = node('details', 'cs-stage-reference-group');
        group.append(node('summary', '', label + ' · ' + profile.title));
        const list = node('dl', 'cs-stage-competencies');
        for (const [title, example] of profile.blocks) {
          list.append(node('dt', '', title), node('dd', '', example));
        }
        group.append(list);
        reference.append(group);
      }
      reference.append(outbound('Lire le référentiel officiel', programProfiles()[0][1].source, 'cs-stage-pale'));
    }

    function queryFromForm() {
      return { city: clean($('city').value).replace(/\s+/g, ' '), sector, option: route(),
        types: selected().sort(), radius: Number($('radius').value), albert: $('albert').checked,
        confirmed: $('confirmed').checked, level: apiLevel(settings.className) };
    }

    function signature(query) {
      return JSON.stringify([normalize(query.city), query.sector, query.option, query.types, query.radius, query.albert,
        query.albert ? query.level : '', ...(query.confirmed ? ['confirmed'] : [])]);
    }

    function cached(query, allowOld = false) {
      if (query.confirmed && !settings.demo) return null;
      const record = read(cacheKey, []).find(item => item.key === signature(query));
      return record && (allowOld || Date.now() - record.time < CACHE_AGE) ? record : null;
    }

    function remember(query, data) {
      if (query.confirmed && !settings.demo) return;
      const id = signature(query);
      const recent = read(cacheKey, []).filter(item => item.key !== id && Date.now() - item.time < CACHE_AGE);
      const records = [{ key: id, time: Date.now(), data }, ...recent].slice(0, 8);
      while (records.length && !save(cacheKey, records)) records.pop();
    }

    function showResult(data, query, focusResults, fromCache = false, added = null) {
      const unique = added ? result.unique : new Map();
      const addresses = added ? result.addresses : new Set();
      for (const item of added || data.businesses) {
        const place = placeFrom(item);
        if (!place || unique.has(place.id)) continue;
        const addressKey = place.address && normalize(place.name + ' ' + place.address).replace(/[^\p{L}\d]+/gu, ' ').trim();
        if (addressKey && addresses.has(addressKey)) continue;
        if (addressKey) addresses.add(addressKey);
        unique.set(place.id, place);
        if (legacyIds.has(place.id) && !board.has(place.id)) {
          legacyIds.delete(place.id);
          board.set(place.id, { place, sector: query.sector, option: query.option, status: 'todo', followUp: '' });
        }
      }
      if (legacyIds.size !== legacy.length && save('cortex-stage-favoris:v1', [...legacyIds])) persist();
      boardChanged();
      result = { data, query, unique, addresses, ordered: RANKING.order(unique.values(), query, data.priorities) };
      if (!added) {
        batchIndex = 0;
        pageLimit = PAGE_SIZE;
        $('filter').value = 'all';
        $('sort').value = 'default';
      }
      const routeLabel = query.option === 'toutes' ? '' : ' · Option ' + query.option;
      $('result-context').textContent = (clean(data.city) || query.city) + ' · ' + numbers.format(query.radius / 1000) +
        ' km · ' + GUIDE.programs[query.sector].label + routeLabel + (query.confirmed ? ' · Accueil PFMP documenté' : '');
      const aiCopy = data.priorities ? 'Priorités par type de lieu ajustées par Albert.'
        : data.calibrating ? 'Albert prépare les priorités par type de lieu…'
        : 'Sélection selon les missions, la distance et les informations des annuaires.';
      const rankingNote = query.confirmed && !data.priorities && !data.calibrating ? '' : aiCopy;
      const historyNote = query.confirmed ? 'Vérifie la disponibilité pour ta période auprès du lieu.' : '';
      $('ai-note').textContent = [historyNote, rankingNote].filter(Boolean).join(' ') +
        (fromCache ? ' · Résultats enregistrés' : '') +
        (data.continuation && !data.incomplete ? ' · Chargement des pages suivantes…' : '') +
        (data.incomplete ? ' · Une partie des résultats est disponible' : '');
      $('resume').hidden = !data.incomplete || !data.continuation;
      $('results').hidden = false;
      renderBatch();
      if (focusResults && panel === 'search') {
        setScrollOffset();
        $('result-title').focus();
      }
    }

    function setBusy(query) {
      $('loader').hidden = !query;
      $('form').setAttribute('aria-busy', String(Boolean(query)));
      if (query) $('loader-copy').textContent = query.confirmed ? 'Vérification des lieux avec un accueil PFMP déjà documenté.'
        : query.albert ? 'Consultation de l’annuaire et classement des lieux avec Albert.'
          : 'Consultation des établissements répertoriés près de la zone choisie.';
      $('refresh').disabled = Boolean(query);
      $('resume').disabled = Boolean(query);
      updateTypeSummary();
    }

    async function loadStagePage(query, continuation, signal) {
      const payload = JSON.stringify({ city: query.city, filiere: query.sector,
        optionCommerce: query.option, types: query.types, radius: query.radius,
        continuation, ...(query.confirmed ? {confirmed_only:true, demo:settings.demo === true, session:settings.session || ''} : {}) });
      const attempts = continuation ? 3 : 1;
      for (let attempt = 0; attempt < attempts; attempt++) {
        if (signal.aborted) throw signal.reason;
        const pageRequest = new AbortController();
        const abortPage = () => pageRequest.abort(signal.reason);
        signal.addEventListener('abort', abortPage, { once: true });
        const timer = setTimeout(() => pageRequest.abort(), 50000);
        try {
          const response = await fetch(ENDPOINT, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: payload,
            signal: pageRequest.signal
          });
          const batch = await response.json();
          if (!response.ok || !batch.ok || !Array.isArray(batch.businesses)) {
            throw new Error(clean(batch.error) || 'Annuaire indisponible.');
          }
          return batch;
        } catch (error) {
          if (signal.aborted || attempt + 1 === attempts) throw error;
        } finally {
          clearTimeout(timer);
          signal.removeEventListener('abort', abortPage);
        }
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 900));
      }
    }

    async function calibrate(query, signal) {
      const calibrationRequest = new AbortController();
      const abort = () => calibrationRequest.abort();
      signal.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(abort, 24000);
      try {
        const response = await askAlbert({ action: 'stage_priorities', filiere: query.sector,
          optionCommerce: query.option, types: query.types, niveau: query.level }, calibrationRequest.signal);
        const scores = response.priorities;
        if (response.enabled && query.types.every(id => typeof scores?.[id] === 'number' && scores[id] >= 55 && scores[id] <= 100)) {
          return scores;
        }
      } catch {
        // Les priorités de référence donnent un classement complet si Albert est indisponible.
      } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
      }
      return null;
    }

    async function search(query = queryFromForm(), { force = false, focus = true, resume = false } = {}) {
      if (destroyed || pending) return;
      if (query.city.length < 2 || !/^[\p{L}0-9 .,'’\-]+$/u.test(query.city)) {
        status('Indique une commune ou un arrondissement français.', true);
        $('city').focus();
        return;
      }
      if (!query.types.length) {
        status('Coche au moins un type de lieu pour lancer la recherche.', true);
        $('kinds').open = true;
        $('kinds').querySelector('summary').focus();
        return;
      }
      const recent = !force && !resume && cached(query);
      if (recent) {
        status('');
        showResult(recent.data, query, focus, true);
        return;
      }

      const request = new AbortController();
      pending = request;
      status('');
      setBusy(query);
      let data = resume ? result.data : null;
      const calibrationKey = JSON.stringify([query.sector, query.option, query.types, query.level]);
      let priorities = query.albert ? data?.priorities ?? calibrationScores.get(calibrationKey) ?? null : null;
      let calibrating = query.albert && !priorities;
      const calibration = calibrating ? calibrate(query, request.signal).then(scores => {
        priorities = scores;
        if (scores) calibrationScores.set(calibrationKey, scores);
        calibrating = false;
        if (data && !browserRequestChanged(request)) {
          data.priorities = scores;
          data.calibrating = false;
          showResult(data, query, false, false, []);
        }
      }) : null;
      if (data) {
        data.incomplete = false;
        data.calibrating = calibrating;
        showResult(data, query, false, false, []);
      }
      try {
        do {
          const continuation = data?.continuation;
          if (continuation) await new Promise(resolve => setTimeout(resolve, 250));
          if (browserRequestChanged(request)) return;
          const batch = await loadStagePage(query, continuation, request.signal);
          if (destroyed || browserRequestChanged(request)) return;
          if (data) {
            data.businesses.push(...batch.businesses);
            data.continuation = batch.continuation;
            data.incomplete = batch.incomplete;
            showResult(data, query, false, false, batch.businesses);
          } else {
            data = batch;
            data.priorities = priorities;
            data.calibrating = calibrating;
            showResult(data, query, focus);
          }
        } while (data.continuation);
        await calibration;
        if (browserRequestChanged(request)) return;
        if (!data.incomplete) remember(query, data);
      } catch (error) {
        if (destroyed || browserRequestChanged(request)) return;
        if (data) {
          markPartial();
          status('L’annuaire a interrompu la recherche. Tu peux la reprendre à partir des résultats affichés.');
          return;
        }
        if (request.signal.aborted) {
          status('Recherche annulée.');
          return;
        }
        const backup = cached(query, true);
        if (backup) {
          showResult(backup.data, query, focus, true);
          status('L’annuaire est momentanément indisponible. Les derniers résultats restent consultables.');
        } else if (/^Ville (introuvable|ou quartier non valide)/i.test(error.message) || (query.confirmed && /^(Reconnecte-toi|Historique PFMP|Session PFMP)/.test(error.message))) {
          status(error.message, true);
        } else {
          status('L’annuaire ne répond pas. Réessaie ou réduis le rayon de recherche.', true);
        }
      } finally {
        if (pending === request) {
          request.abort();
          pending = null;
          if (!destroyed) setBusy(null);
        }
      }
    }

    function markPartial() {
      if (!result || (!result.data.continuation && !result.data.calibrating)) return;
      result.data.calibrating = false;
      if (result.data.continuation) result.data.incomplete = true;
      showResult(result.data, result.query, false, false, []);
    }

    function browserRequestChanged(request) {
      return pending !== request || !section.isConnected;
    }

    $('form').addEventListener('submit', event => {
      event.preventDefault();
      persist();
      search();
    });
    $('cancel').addEventListener('click', () => {
      if (!pending) return;
      pending.abort();
      pending = null;
      markPartial();
      setBusy(null);
      status('Recherche annulée.');
      $('submit').focus();
    });
    $('refresh').addEventListener('click', () => {
      if (result) search(result.query, { force: true });
    });
    $('resume').addEventListener('click', () => {
      if (result?.data.continuation) search(result.query, { resume: true, focus: false });
    });
    $('compare').addEventListener('click', () => setPanel('assistant', true, '', 'compare'));

    /* Résultats, carnet et préparation de la prise de contact. */
    function currentBatch() {
      const offset = batchIndex * RANKING.SIZE;
      return result.ordered.slice(offset, offset + RANKING.SIZE);
    }

    function renderBatch() {
      const count = currentBatch().length;
      const all = result.ordered.length;
      const nextCount = Math.min(RANKING.SIZE, all - (batchIndex + 1) * RANKING.SIZE);
      const collecting = Boolean(result.data.continuation || result.data.calibrating);
      $('result-title').textContent = count ? count + ' ' + plural(count, 'piste pour ta PFMP', 'pistes pour ta PFMP') : 'Aucun lieu repéré';
      $('batch-nav').hidden = !count;
      $('batch-label').textContent = count
        ? (collecting ? 'Sélection provisoire' : 'Sélection ' + (batchIndex + 1)) + ' · ' +
          numbers.format(all) + ' ' + plural(all, 'lieu examiné', 'lieux examinés') : '';
      $('batch-prev').hidden = batchIndex === 0;
      $('batch-next').hidden = nextCount <= 0 || collecting;
      $('batch-next').textContent = nextCount === 1 ? '1 autre piste' : nextCount + ' autres pistes';
      $('filters').hidden = !count;
      renderCards();
    }

    function filteredPlaces() {
      const filters = {
        all: () => true,
        phone: place => place.callable,
        full: place => Boolean(place.address),
        site: place => Boolean(place.website),
        saved: place => board.has(place.id)
      };
      const list = currentBatch().filter(filters[$('filter').value]);
      const byName = (a, b) => a.name.localeCompare(b.name, 'fr') || a.id.localeCompare(b.id);
      const byDistance = (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || byName(a, b);
      const sort = $('sort').value;
      if (sort === 'name') return list.sort(byName);
      if (sort === 'distance') return list.sort(byDistance);
      if (sort === 'phone') {
        return list.sort((a, b) => Number(b.callable) - Number(a.callable) || byDistance(a, b));
      }
      return list;
    }

    function emptyCard(title, copy, extra) {
      const card = node('div', 'cs-stage-empty');
      card.append(node('strong', '', title), node('p', '', copy));
      if (extra) card.append(extra);
      return card;
    }

    function renderCards() {
      contactsDirty = false;
      shown = filteredPlaces();
      const cards = $('cards');
      cards.replaceChildren();
      const count = currentBatch().length;
      $('matches').textContent = count ? Math.min(pageLimit, shown.length) + ' / ' + shown.length + ' affichés' : '';
      $('export').disabled = !shown.length;
      $('compare').hidden = !shown.length;
      $('more').hidden = shown.length <= pageLimit;
      $('show-all').hidden = shown.length <= pageLimit;
      $('more').textContent = 'Afficher ' + Math.min(PAGE_SIZE, Math.max(0, shown.length - pageLimit)) + ' lieux de plus';

      if (!shown.length) {
        if (!count && result.data.continuation && !result.data.incomplete) {
          cards.append(emptyCard('Recherche en cours', 'CORTEX examine les établissements de cette zone.'));
          return;
        }
        if (!count && result.query.confirmed) {
          cards.append(emptyCard('Aucun accueil confirmé pour ces critères',
            'Essaie d’élargir le rayon ou consulte toutes les pistes de l’annuaire.',
            button('Rechercher tous les lieux', 'cs-stage-quiet', () => {
              $('confirmed').checked = false;
              persist();
              search({ ...result.query, confirmed:false });
            })));
          return;
        }
        const bigger = RADII.find(value => value > result.query.radius);
        let action;
        if (count) {
          action = button('Afficher tous les lieux', 'cs-stage-quiet', () => {
            $('filter').value = 'all';
            resetResultsPage();
            $('filter').focus();
          });
        } else if (bigger) {
          action = button('Élargir le rayon à ' + numbers.format(bigger / 1000) + ' km', 'cs-stage-quiet', () => {
            const query = { ...result.query, radius: bigger };
            if (signature(queryFromForm()) === signature(result.query)) {
              $('radius').value = String(bigger);
              persist();
            }
            search(query);
          });
        }
        cards.append(emptyCard(count ? 'Aucun lieu pour ce filtre' : 'Élargis ta recherche',
          count ? 'Essaie un autre filtre pour voir davantage de pistes.'
            : 'Essaie un rayon plus large, d’autres types de lieux ou une commune voisine.', action));
        return;
      }
      for (const place of shown.slice(0, pageLimit)) cards.append(resultCard(place));
    }

    function resetResultsPage() {
      pageLimit = PAGE_SIZE;
      if (result) renderCards();
    }

    function placeTags(place, context) {
      const { categories } = GUIDE.forPlace(context.sector, context.option, place.types);
      const tags = node('div', 'cs-stage-tags');
      for (const [, label] of categories.slice(0, 2)) tags.append(node('span', '', label));
      if (!tags.children.length) {
        tags.append(node('span', '', place.manual ? 'Ajout personnel' : GUIDE.programs[context.sector].label));
      }
      return tags;
    }

    function evidenceFor(place) {
      const evidence = place.evidence;
      if (!evidence) return null;
      const block = node('div', 'cs-stage-evidence');
      const period = validDate(evidence.date) ? 'PFMP terminée le ' + formatDate(evidence.date) : evidence.period;
      block.append(node('strong', '', 'Accueil PFMP documenté'), node('p', '',
        [evidence.label, period].filter(Boolean).join(' · ')));
      if (evidence.url) block.append(outbound('Voir la source de l’accueil', evidence.url, 'cs-stage-evidence-link'));
      block.append(node('small', '', 'Confirme la disponibilité pour tes dates.'));
      return block;
    }

    function resultEntry(place) {
      return { place, sector: result.query.sector, option: result.query.option, status: 'todo', followUp: '' };
    }

    function resultCard(place) {
      const context = resultEntry(place);
      const { categories, profile } = GUIDE.forPlace(context.sector, context.option, place.types);
      const card = node('article', 'cs-stage-card');
      const top = node('div', 'cs-stage-card-top');
      top.append(placeTags(place, context));
      if (place.distance !== null) top.append(node('span', 'cs-stage-distance', numbers.format(place.distance) + ' km'));
      card.append(top, node('h3', '', place.name));
      const contact = node('div', 'cs-stage-coordinates');
      contact.append(node('p', '', place.address || 'Adresse à vérifier sur la carte'),
        node('p', 'cs-stage-contact-number', place.phone || 'Téléphone non renseigné'));
      card.append(contact);
      const evidence = evidenceFor(place);
      if (evidence) card.append(evidence);
      const mission = categories[0]?.[2] || profile?.lead
        || 'Vérifie si l’équipe peut te confier des missions en espace de vente ou en prospection.';
      const missions = node('div', 'cs-stage-mission-preview');
      missions.append(node('strong', '', 'À demander pendant le contact'), node('p', '', mission));
      card.append(missions, linksFor(place));
      const actions = node('div', 'cs-stage-card-actions');
      const follow = button(board.has(place.id) ? 'Voir dans mes démarches' : 'Ajouter au suivi', 'cs-stage-track', () => {
        if (board.has(place.id)) {
          setPanel('board');
        } else {
          addEntry(context);
          follow.textContent = 'Voir dans mes démarches';
          status(place.name + ' ajouté à mes démarches.');
        }
      });
      actions.append(follow, button('Préparer le contact', 'cs-stage-quiet', () => openContact(board.get(place.id) || context)));
      card.append(actions);
      return card;
    }

    $('filter').addEventListener('change', resetResultsPage);
    $('sort').addEventListener('change', resetResultsPage);
    function moveBatch(step) {
      batchIndex += step;
      pageLimit = PAGE_SIZE;
      $('filter').value = 'all';
      $('sort').value = 'default';
      renderBatch();
      $('result-title').focus();
    }
    $('batch-prev').addEventListener('click', () => moveBatch(-1));
    $('batch-next').addEventListener('click', () => moveBatch(1));
    $('more').addEventListener('click', () => {
      const firstNew = pageLimit;
      pageLimit += PAGE_SIZE;
      renderCards();
      const next = $('cards').children[firstNew]?.querySelector('h3');
      if (next) {
        next.tabIndex = -1;
        next.focus();
      }
    });
    $('show-all').addEventListener('click', () => {
      const firstNew = pageLimit;
      pageLimit = Infinity;
      renderCards();
      const next = $('cards').children[firstNew]?.querySelector('h3');
      if (next) {
        next.tabIndex = -1;
        next.focus();
      }
    });
    $('export').addEventListener('click', () => {
      if (!shown.length) return;
      const context = result.query;
      const rows = shown.map(place => {
        const { categories, profile } = GUIDE.forPlace(context.sector, context.option, place.types);
        return [place.name, categories.map(type => type[1]).join(', '), place.address, place.phone,
          place.distance === null ? '' : numbers.format(place.distance), place.website, publicSource(place),
          categories[0]?.[2] || profile?.question || '', place.evidence?.label || '',
          place.evidence?.date || place.evidence?.period || '', place.evidence?.url || ''];
      });
      exportCsv('CORTEX-recherche-PFMP.csv',
        [['Lieu', 'Type', 'Adresse', 'Téléphone', 'Distance (km)', 'Site web', 'Source', 'Mission à vérifier',
          'Accueil PFMP documenté', 'Période attestée', 'Lien de la preuve'], ...rows]);
    });

    function addEntry(entry) {
      board.set(entry.place.id, entry);
      boardChanged();
      const stored = persist();
      if (panel === 'board') renderBoard();
      if (!stored) boardNotice('Le navigateur ne peut pas enregistrer les changements. Exporte ton carnet pour les conserver.');
    }

    function renderBoard(restore) {
      const entries = [...board.values()].sort((a, b) => Number(needsFollowUp(b)) - Number(needsFollowUp(a))
        || (a.followUp || '9999').localeCompare(b.followUp || '9999') || a.place.name.localeCompare(b.place.name, 'fr'));
      const inProgress = entries.filter(entry => entry.status === 'waiting' || entry.status === 'meeting').length;
      const accepted = entries.filter(entry => entry.status === 'accepted').length;
      const statistics = [
        [entries.length, plural(entries.length, 'Lieu suivi', 'Lieux suivis'), 'all'],
        [inProgress, 'En cours', 'progress'],
        [entries.filter(needsFollowUp).length, 'À relancer', 'due'],
        [accepted, plural(accepted, 'Accord reçu', 'Accords reçus'), 'accepted']
      ];
      const stats = $('board-stats');
      stats.replaceChildren();
      for (const [number, label, state] of statistics) {
        const metric = button('', 'cs-stage-board-metric', () => {
          $('board-filter').value = state;
          $('board-query').value = '';
          renderBoard();
          $('board-filter').focus({ preventScroll:true });
        });
        metric.dataset.metric = state;
        metric.disabled = !entries.length;
        metric.setAttribute('aria-pressed', String($('board-filter').value === state));
        metric.append(node('strong', '', String(number)), node('span', '', label));
        stats.append(metric);
      }
      $('export-board').hidden = !entries.length;
      $('board-tools').hidden = !entries.length;
      const list = $('board-list');
      list.replaceChildren();
      if (!entries.length) {
        list.append(emptyCard('Tes pistes apparaîtront ici',
          'Ajoute un lieu depuis les résultats, ou saisis une structure que tu as déjà repérée.',
          button('Revenir à la recherche', 'cs-stage-pale', () => setPanel('search'))));
        return;
      }
      const query = normalize($('board-query').value);
      const filter = $('board-filter').value;
      const matches = entries.filter(entry => {
        const statusMatches = filter === 'all' || (filter === 'due' && needsFollowUp(entry)) ||
          (filter === 'progress' && ['waiting','meeting'].includes(entry.status)) || filter === entry.status;
        return statusMatches && normalize(entry.place.name + ' ' + entry.place.address).includes(query);
      });
      if (!matches.length) {
        list.append(emptyCard('Aucune démarche dans cette vue', 'Change le statut ou le nom recherché.',
          button('Afficher toutes mes démarches', 'cs-stage-pale', () => showBoardEntry())));
      }
      for (const entry of matches) list.append(boardCard(entry, restore));
      list.querySelector('[data-stage-restore]')?.focus({ preventScroll: true });
    }

    function showBoardEntry(entry) {
      $('board-filter').value = 'all';
      $('board-query').value = '';
      setPanel('board', !entry);
      if (!entry) return;
      const card = [...$('board-list').children].find(item => item.dataset.place === entry.place.id);
      (card?.querySelector('h3') || $('board-title')).focus();
    }

    $('board-query').addEventListener('input', () => renderBoard());
    $('board-filter').addEventListener('change', () => renderBoard());

    function boardCard(entry, restore) {
      const { place } = entry;
      const due = needsFollowUp(entry);
      const card = node('article', 'cs-stage-board-card');
      card.dataset.place = place.id;
      if (due) card.classList.add('is-due');
      const top = node('div', 'cs-stage-board-card-top');
      const title = node('div');
      const heading = node('h3', '', place.name);
      heading.tabIndex = -1;
      title.append(heading,
        node('p', '', place.address || 'Adresse à vérifier'),
        node('p', '', place.phone || 'Téléphone non renseigné'));
      const stage = node('span', 'cs-stage-board-state', due ? 'À relancer' : STATES[entry.status]);
      stage.dataset.stageState = due ? 'due' : entry.status;
      top.append(title, stage);
      card.append(placeTags(place, entry), top);
      const evidence = evidenceFor(place);
      if (evidence) card.append(evidence);
      card.append(linksFor(place));
      if (validDate(entry.contactedAt)) card.append(node('p', 'cs-stage-last-contact', 'Dernier contact le ' + formatDate(entry.contactedAt)));

      const fields = node('div', 'cs-stage-board-fields');
      const stateLabel = node('label', '', 'Statut');
      const select = node('select');
      for (const [value, label] of Object.entries(STATES)) {
        const option = node('option', '', label);
        option.value = value;
        select.append(option);
      }
      select.value = entry.status;
      stateLabel.append(select);
      fields.append(stateLabel);
      select.addEventListener('change', () => {
        entry.status = select.value;
        if (!canRelance(entry.status)) entry.followUp = '';
        syncBoardCard(entry, 'status');
      });
      if (restore?.id === place.id && restore.field === 'status') select.dataset.stageRestore = '';

      if (canRelance(entry.status)) {
        const followUpLabel = node('label', '', 'Relancer le');
        const followUp = node('input');
        followUp.type = 'date';
        followUp.value = entry.followUp || '';
        followUpLabel.append(followUp);
        fields.append(followUpLabel);
        followUp.addEventListener('change', () => {
          entry.followUp = followUp.value;
          syncBoardCard(entry, 'date');
        });
        if (restore?.id === place.id && restore.field === 'date') followUp.dataset.stageRestore = '';
      }
      card.append(fields);
      const notes = node('details', 'cs-stage-board-notes');
      const caption = node('summary', '', entry.notes ? 'Notes enregistrées' : 'Ajouter une note');
      const label = node('label', '', 'Ma note de suivi'), draftNote = node('textarea');
      draftNote.rows = 2;
      draftNote.maxLength = 600;
      draftNote.value = entry.notes || '';
      draftNote.placeholder = 'Ex. Rappeler lundi matin avec mon CV.';
      draftNote.addEventListener('input', () => {
        entry.notes = draftNote.value;
        caption.textContent = entry.notes ? 'Notes enregistrées' : 'Ajouter une note';
        if (!persist()) boardNotice('Le navigateur ne peut pas enregistrer cette note.');
      });
      label.append(draftNote);
      notes.append(caption, label);
      card.append(notes);
      const actions = node('div', 'cs-stage-board-card-actions');
      if (canRelance(entry.status)) {
        actions.append(button('J’ai pris contact', 'cs-stage-primary', () => {
          entry.contactedAt = today();
          entry.status = 'waiting';
          if (!validDate(entry.followUp) || entry.followUp <= entry.contactedAt) {
            const next = new Date();
            for (let days = 0; days < 3;) {
              next.setDate(next.getDate() + 1);
              if (next.getDay() % 6) days++;
            }
            entry.followUp = next.toLocaleDateString('sv-SE');
          }
          if (['todo','due'].includes($('board-filter').value)) $('board-filter').value = 'all';
          syncBoardCard(entry, 'date');
          boardNotice('Contact noté. Relance prévue le ' + formatDate(entry.followUp) + '.');
        }));
      }
      actions.append(button('Préparer le contact', 'cs-stage-pale', () => openContact(entry)),
        button('CV et lettre', 'cs-stage-pale', () => setPanel('cv', true, place.id)));
      if (due || entry.status === 'meeting') actions.append(button(due ? 'Relancer avec Albert' : 'Préparer l’entretien',
        'cs-stage-pale', () => setPanel('assistant', true, place.id, due ? 'followup' : 'interview')));
      actions.append(button('Retirer', 'cs-stage-text-button', () => confirmRemoval(entry)));
      card.append(actions);
      return card;
    }

    function syncBoardCard(entry, field) {
      const stored = persist();
      renderBoard({ id: entry.place.id, field });
      boardNotice(stored ? 'Carnet mis à jour.' : 'Le navigateur ne peut pas enregistrer ce changement.');
    }

    function openDialog(title, content) {
      $('dialog-title').textContent = title;
      $('dialog-content').replaceChildren(content);
      if (!$('dialog').open) $('dialog').showModal();
    }

    function confirmRemoval(entry) {
      const body = node('div', 'cs-stage-dialog-body');
      body.append(node('p', '', 'Retirer ' + entry.place.name + ' et ses informations de suivi' +
        (drafts[entry.place.id] ? ', y compris ses brouillons de candidature' : '') + ' ?'),
        button('Retirer ce lieu', 'cs-stage-primary', () => {
          $('dialog').close();
          board.delete(entry.place.id);
          delete drafts[entry.place.id];
          delete hooks[entry.place.id];
          boardChanged();
          const stored = persist();
          renderBoard();
          $('board-title').focus({ preventScroll: true });
          boardNotice(stored ? 'Lieu retiré de mes démarches.' : 'Le navigateur ne peut pas enregistrer ce changement.');
        }));
      openDialog('Retirer du carnet', body);
    }

    $('add-place').addEventListener('click', () => {
      const form = node('form', 'cs-stage-dialog-body cs-stage-manual-form');
      const fields = [
        ['name', 'Nom de la structure', 'text', true, 160],
        ['address', 'Adresse', 'text', false, 240],
        ['phone', 'Téléphone professionnel', 'tel', false, 80],
        ['website', 'Site web', 'url', false, 240]
      ];
      for (const [name, caption, type, required, length] of fields) {
        const label = node('label', '', caption);
        const input = node('input');
        input.name = name;
        input.type = type;
        input.required = required;
        input.maxLength = length;
        label.append(input);
        form.append(label);
      }
      const feedback = node('p', 'cs-stage-date-status');
      feedback.setAttribute('role', 'status');
      const submit = node('button', 'cs-stage-primary', 'Ajouter à mes démarches');
      submit.type = 'submit';
      form.append(feedback, submit);
      form.addEventListener('submit', event => {
        event.preventDefault();
        const values = new FormData(form);
        const name = clean(values.get('name'));
        const address = clean(values.get('address'));
        if (!name) {
          feedback.textContent = 'Indique le nom du lieu.';
          return;
        }
        const duplicate = [...board.values()].some(({ place }) =>
          normalize(place.name) === normalize(name) && normalize(place.address) === normalize(address));
        if (duplicate) {
          feedback.textContent = 'Ce lieu figure déjà dans ton carnet.';
          return;
        }
        const place = placeFrom({ id: 'manual/' + (crypto.randomUUID?.() || Date.now()), name, address,
          phone: values.get('phone'), website: values.get('website'), manual: true });
        $('dialog').close();
        addEntry({ place, sector, option: route(), status: 'todo', followUp: '' });
      });
      openDialog('Ajouter un lieu', form);
    });

    $('export-board').addEventListener('click', () => {
      const rows = [...board.values()].map(({ place, sector, option, status, followUp, contactedAt, notes }) => [
        place.name, GUIDE.programs[sector].label, option === 'toutes' ? '' : option,
        place.address, place.phone, place.website, STATES[status], contactedAt, followUp, notes, publicSource(place)
      ]);
      exportCsv('CORTEX-mes-demarches-PFMP.csv',
        [['Lieu', 'Filière', 'Option', 'Adresse', 'Téléphone', 'Site web', 'Statut', 'Dernier contact', 'Relance prévue', 'Notes', 'Source'], ...rows]);
    });

    function updateDates() {
      const start = $('start').value;
      const end = $('end').value;
      const invalid = Boolean(start && end && start > end);
      $('date-status').textContent = invalid ? 'La date de fin doit venir après la date de début.' : '';
      $('end').setAttribute('aria-invalid', String(invalid));
      $('make-message').disabled = invalid;
      if (invalid) return;
      prep.start = start;
      prep.end = end;
      persist();
    }

    function renderChecklist() {
      const list = $('checklist');
      for (const [id, text] of CHECKLIST) {
        const label = node('label', 'cs-stage-check');
        const input = node('input');
        input.type = 'checkbox';
        input.checked = checks.has(id);
        input.addEventListener('change', () => {
          if (input.checked) checks.add(id); else checks.delete(id);
          updateProgress();
          persist();
        });
        label.append(input, node('span', '', text));
        list.append(label);
      }
      updateProgress();
    }

    function updateProgress() {
      const done = CHECKLIST.filter(([id]) => checks.has(id)).length;
      $('progress').value = done;
      $('progress-label').textContent = done + ' / ' + CHECKLIST.length;
    }

    $('start').addEventListener('change', updateDates);
    $('end').addEventListener('change', updateDates);
    $('make-message').addEventListener('click', () => openContact(board.get($('contact-target').value) || { sector, option: route() }));
    $('prep-cv').addEventListener('click', () => setPanel('cv', true, $('contact-target').value, 'cv'));
    $('prep-interview').addEventListener('click', () => setPanel('assistant', true, $('contact-target').value, 'interview'));

    function openContact(context) {
      const { place, sector: program, option: track } = context;
      const { categories, profile } = GUIDE.forPlace(program, track, place?.types || []);
      const label = GUIDE.programs[program].name + (track !== 'toutes' ? ' (option ' + track + ')' : '');
      const period = stagePeriod();
      const recipient = profile?.contact || 'la personne qui organise l’accueil en PFMP';
      const body = node('div', 'cs-stage-dialog-body');
      if (place) {
        body.append(linksFor(place));
        const source = publicSource(place);
        if (source) {
          const title = place.id.startsWith('siret/') ? 'Ouvrir la fiche de l’Annuaire des entreprises' : 'Vérifier la fiche OpenStreetMap';
          body.append(outbound(title, source, 'cs-stage-text-button'));
        }
        const evidence = evidenceFor(place);
        if (evidence) body.append(evidence);
        body.append(button('Préparer mon CV et ma lettre', 'cs-stage-pale', () => {
          if (!board.has(place.id)) addEntry(context);
          $('dialog').close();
          setPanel('cv', true, place.id, 'lettre');
        }));
      }
      const mission = node('section', 'cs-stage-dialog-subsection');
      mission.append(node('h3', '', 'Missions à vérifier'));
      const list = node('ul');
      if (categories.length) {
        for (const type of categories.slice(0, 3)) list.append(node('li', '', type[2]));
      } else if (profile) {
        list.append(node('li', '', profile.blocks.at(-1)[1]));
      } else {
        list.append(node('li', '', GUIDE.profiles.A.question), node('li', '', GUIDE.profiles.B.question));
      }
      if (profile) list.append(node('li', '', profile.question));
      list.append(node('li', '', 'Qui sera mon tuteur et quelles missions pourra-t-on inscrire dans la convention ?'));
      mission.append(list);
      if (place?.suggestion) mission.append(node('p', 'cs-stage-dialog-hint', 'Suggestion Albert · ' + GUIDE.normalizePFMP(place.suggestion)));
      if (place?.why) mission.append(node('p', 'cs-stage-dialog-hint', 'Pourquoi Albert l’a repéré · ' + GUIDE.normalizePFMP(place.why)));
      body.append(mission);

      const workshop = window.CORTEX_STAGE_CONTACT.mount({
        label, period, recipient, place, identity, save: persist,
        hook: hooks[place?.id || program+'-'+track],
        rememberHook: value => { hooks[place?.id || program+'-'+track] = value; persist(); },
        profile: program === 'commerce-vente' ? categories[0]?.[3] || track : program,
        ask: (motivation, signal) => askAlbert({ action:'prepare_contact', filiere:program, optionCommerce:track,
          type:categories[0]?.[0] || '', motivation }, signal)
      });
      $('dialog').addEventListener('close', workshop.dispose, { once: true });
      body.append(workshop.root);
      openDialog(place ? place.name : 'Préparer ma candidature', body);
    }

    $('back').addEventListener('click', () => {
      dispose();
      if (typeof settings.back === 'function') settings.back();
      else if (settings.demo) location.hash = '#eleve/accueil';
      else location.href = '?espace=eleve';
    });

    function dispose() {
      destroyed = true;
      workshop.hide();
      assistant.hide();
      pending?.abort();
      pending = null;
      if ($('dialog').open) $('dialog').close();
    }

    renderTypes();
    renderBrief();
    renderChecklist();
    boardChanged();
    const initial = queryFromForm();
    const earlier = cached(initial);
    if (earlier) showResult(earlier.data, initial, false, true);
    return { search: () => search(), dispose };
  }

  window.CORTEX_STAGE = { mount, SECTORS };
})();
