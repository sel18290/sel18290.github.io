const adventureStorage = 'cortex.noctis.aventure.v1';

export const stageRoutes = Object.freeze({
  n1: '/noctis-pre-alpha/fusion-native/noctis/aventure-n01.html?aventure=1',
  'n2-panorama': '/noctis-pre-alpha/fusion-native/noctis/panorama-objets.html?aventure=1',
  n2: '/noctis-pre-alpha/fusion-native/noctis/aventure-n02.html?aventure=1',
  ouest: '/noctis-pre-alpha/aventure/reseau-ouest.html?aventure=1',
  cube: '/noctis-pre-alpha/Appartement_Cinematic_25D/?scene=salle3&revelation=1&aventure=1',
  chambres: '/noctis-pre-alpha/quatre-chambres/?aventure=1',
  jardin: '/noctis-pre-alpha/genesis/aventure-jardin.html?scene=n06&hub=0&aventure=1',
});

const chapterChanges = {
  n1: ['n2-panorama', 'La porte s’ouvre. La pièce de l’autre côté semble familière.'],
  'n2-panorama': ['n2', '« ARRÊTEZ ! » Le signal se coupe. La pièce vient de changer.'],
  n2: ['ouest', 'Derrière le passage, quelque chose vibre au rythme des fragments.'],
  ouest: ['cube', 'Le sol se dérobe. Une autre image prend sa place.'],
  cube: ['chambres', 'Signal accroché. Transfert vers les quatre chambres.'],
  chambres: ['jardin', 'Derrière le dernier verrou, le vent couvre le bruit des machines.'],
};

let memory;
let transition;
let scopedRun;

export function isStory() {
  return new URLSearchParams(location.search).get('aventure') === '1';
}

function readState() {
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      const state = JSON.parse(globalThis[name].getItem(adventureStorage));
      if (state?.id && Object.hasOwn(stageRoutes, state.stage)) return state;
    } catch {
      // The page can still play if browser storage is unavailable.
    }
  }
  return memory;
}

function saveState(state) {
  memory = state;
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      globalThis[name].setItem(adventureStorage, JSON.stringify(state));
      return;
    } catch {
      // Use session storage if persistent storage is blocked.
    }
  }
}

function currentState() {
  const saved = readState();
  if (saved) return saved;
  return startStory();
}

export function startStory() {
  const id = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
  const state = {id, stage: 'n1'};
  saveState(state);
  if (scopedRun) scopedRun = id;
  return state;
}

export function runId() {
  return currentState().id;
}

export function storyKey(key) {
  return `${adventureStorage}.${runId()}.${key}`;
}

export function resumeStoryUrl() {
  const state = readState();
  return state ? stageRoutes[state.stage] : null;
}

export function scopeStoryStorage() {
  if (scopedRun || !isStory()) return;
  scopedRun = runId();
  const scopeKey = key => {
    const value = String(key);
    return value.startsWith('noctis.') || value.startsWith('cortex.noctis3d.est.') ? adventureStorage + "." + scopedRun + "." + value : value;
  };
  const storage = Storage.prototype;
  const originalGet = storage.getItem;
  const originalSet = storage.setItem;
  const originalRemove = storage.removeItem;
  storage.getItem = function (key) { return originalGet.call(this, scopeKey(key)); };
  storage.setItem = function (key, value) { return originalSet.call(this, scopeKey(key), value); };
  storage.removeItem = function (key) { return originalRemove.call(this, scopeKey(key)); };
}

export function enterStage(stage) {
  if (!isStory() || !Object.hasOwn(stageRoutes, stage)) return false;
  const state = currentState();
  saveState({...state, stage});
  return true;
}

function transitionCover(message) {
  const cover = document.createElement('div');
  cover.setAttribute('role', 'status');
  cover.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:2rem;text-align:center;background:#080c12;color:#f3efeb;font:500 clamp(1rem,3vw,1.35rem)/1.4 system-ui;letter-spacing:.05em';
  const text = document.createElement('p');
  text.textContent = message;
  cover.append(text);
  document.body.append(cover);
  return cover;
}

export function nextStage(from, to) {
  if (!isStory() || transition || currentState().stage !== from) return false;
  const change = Object.hasOwn(chapterChanges, from) ? chapterChanges[from] : null;
  if (!change || change[0] !== to) return false;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cover = transitionCover(change[1]);
  transition = cover;
  if (!reduced) cover.animate?.([{opacity: 0}, {opacity: 1}], {duration: 260, fill: 'both'});
  addEventListener('pageshow', event => {
    if (event.persisted) {
      cover.remove();
      transition = null;
      enterStage(from);
    }
  }, {once: true});

  globalThis.setTimeout(() => {
    saveState({...currentState(), stage: to});
    location.assign(stageRoutes[to]);
  }, reduced ? 850 : 1500);
  return true;
}

