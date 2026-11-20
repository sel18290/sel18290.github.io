import '/noctis-pre-alpha/aventure/storage.js';
import {enterStage, nextStage, resumeStoryUrl, stageRoutes, startStory} from '/noctis-pre-alpha/aventure/progression.js';
import {OrbiVoice} from './audio/orbi-voice.js';
import {Soundscape} from './audio/soundscape.js';
import {playUnknownSignal} from './audio/unknown-signal.js';
import {resynchronize} from './resync.js';
import {RoomClock} from './clock-core.mjs';
import {validSleepAnswer} from './sleep-answer.mjs';

const $ = selector => document.querySelector(selector);
const room = $('#viewport');
const dialog = $('#discovery');
const roomClock = new RoomClock(0, performance.now(), false);
let clockStarted = false;
function checkpointClock(visible = !document.hidden) {
  const now = performance.now();
  roomClock.checkpoint(now, clockStarted && visible);
  const time = roomClock.time(now);
  const alarm = $('.alarm');
  alarm.textContent = time;
  alarm.setAttribute('aria-label', 'Heure actuelle : ' + time);
  const display = $('#acte-clock-time');
  if (dialog.open && display) display.textContent = time;
}
document.addEventListener('visibilitychange', () => checkpointClock());
addEventListener('pagehide', () => checkpointClock(false));
addEventListener('pageshow', () => checkpointClock());
setInterval(checkpointClock, 1000);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const sound = new Soundscape();
const key = 'noctis.acte1.v1';
const initialState = () => ({started: false, terminal: false, evaluation: false, denied: 0, cleared: false, passwordIntroduced: false, spoken: [], journalUnlocked: false, settingsSeen: false, archiveSeen: false, fragmentPending: false});
let state = initialState();
try { Object.assign(state, JSON.parse(localStorage.getItem(key))); } catch {}
function save() {
  try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
}
const voice = new OrbiVoice(sound);
const cue = $('#acte-cue');
const speech = $('#acte-dialogue');
speech.addEventListener('cancel', event => event.preventDefault());

function sayOrbi(text, mood = 'hint') {
  voice.say(mood);
  speakLine(text, true);
}

function speakLine(text, robotic = false) {
  if (!sound.enabled || !globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return;
  speechSynthesis.cancel();
  const line = new SpeechSynthesisUtterance(text);
  line.lang = 'fr-FR';
  line.rate = robotic ? .8 : .94;
  line.pitch = robotic ? .78 : 1;
  line.volume = sound.volume;
  speechSynthesis.speak(line);
}

function guide() {
  const [target, objective] = state.cleared ? ['door', 'Ouvrir la porte']
    : state.archiveSeen && state.denied ? ['computer', 'Ouvrir le protocole de sortie dans la messagerie']
    : state.archiveSeen ? ['door', 'Essayer la poignée du sas']
    : state.settingsSeen ? ['computer', 'Consulter le rapport dans les archives']
    : state.evaluation ? ['computer', 'Ouvrir les paramètres de CORTEX']
    : state.terminal ? ['computer', 'Consulter l’évaluation dans PRONOTE']
    : ['computer', 'Déverrouiller le terminal pour trouver une sortie'];
  cue.textContent = objective;
  document.querySelectorAll('[data-object]').forEach(hotspot => {
    hotspot.classList.toggle('acte-target', hotspot.dataset.object === target);
  });
}

function locateObjective() {
  const target = document.querySelector('.acte-target');
  if (target) {
    const delta = target.getBoundingClientRect().left - room.getBoundingClientRect().left - room.clientWidth / 2;
    room.scrollLeft += delta + target.offsetWidth / 2;
  }
  room.focus({preventScroll:true});
}
function intro() {
  const beats = [
    ['VOIX INCONNUE', 'Bonjour, Maître. Vous m’entendez ?'],
    ['VOUS', 'Qui parle ? Et cette alerte rouge… Qu’est-ce qui se passe ?'],
    ['VOUS', 'Pourquoi tu m’appelles Maître ? Ce n’est pas ma chambre. Comment je suis arrivé ici ?'],
    ['ORBI-7', 'Je suis ORBI-7. Mon registre vous identifie comme mon utilisateur, Maître. Il ne contient aucune trace de votre arrivée.'],
    ['VOUS', 'Regarde la fenêtre. Même la planète bouge avec le mur quand je tourne la tête. C’est quoi, cet endroit ?'],
    ['ORBI-7', 'Le rendu de secours est actif, Maître. Le système ne parvient plus à afficher la profondeur.'],
    ['VOUS', 'Le rendu de secours… Donc c’est censé être normal ? Non. Je veux sortir d’ici.'],
    ['ORBI-7', 'Je n’arrive pas à joindre le sas. Essayez le terminal, près de la fenêtre. Il est peut-être encore relié à la porte.'],
    ['VOUS', 'D’accord. Mais reste avec moi. Ne coupe pas la liaison.'],
  ];
  playDialogue(beats, () => {
    $('#objects').inert = false;
    cue.hidden = false;
    guide();
    locateObjective();
  }, index => {
    if (index === 5) interference('CORTEX · Rendu de secours. Profondeur indisponible.');
  });
}

function playDialogue(beats, onFinish, onBeat = () => {}) {
  let index = 0;
  hideCaption();
  speech.showModal();
  speech.focus({preventScroll:true});

  const advance = () => {
    if (index === beats.length) {
      document.removeEventListener('keydown', onSpace);
      globalThis.speechSynthesis?.cancel();
      voice.stop();
      speech.close();
      onFinish();
      return;
    }
    const [speaker, line] = beats[index++];
    $('#acte-speaker').textContent = speaker;
    $('#acte-line').textContent = line;
    if (speaker === 'ORBI-7' || speaker === 'VOIX INCONNUE') sayOrbi(line, 'greeting');
    else { voice.stop(); speakLine(line); }
    onBeat(index);
  };

  function onSpace(event) {
    if (event.code !== 'Space') return;
    event.preventDefault();
    if (!event.repeat) advance();
  }
  document.addEventListener('keydown', onSpace);
  advance();
}
let stopSignal = () => {};
let diagnosticsTimer;
function startDiagnostics() {
  const readings = [
    'Profondeur indisponible · image de secours',
    'Sas · aucune réponse du capteur',
    'Horloge locale · horodatage incohérent',
    'Plan de la chambre · contrôle impossible',
  ];
  let index = 0;
  diagnosticsTimer = setInterval(() => {
    if (document.hidden || dialog.open || speech.open || state.fragmentPending) return;
    $('#acte-fault').textContent = readings[index++ % readings.length];
  }, 9000);
}
function interference(message) {
  const banner = $('#acte-signal');
  banner.hidden = false;
  $('#acte-fault').textContent = message.replace(/^CORTEX · /, '');
  if (dialog.open) {
    dialog.querySelector('.acte-interference')?.remove();
    const notice = document.createElement('p');
    notice.className = 'acte-interference';
    notice.setAttribute('role', 'status');
    notice.textContent = message;
    $('.acte-actions').before(notice);
  }
  banner.getAnimations().forEach(animation => animation.cancel());
  if (!reduce.matches) {
    banner.animate([{opacity:.35, transform:'translateX(5px)'},{opacity:1, transform:'none'}], 210);
    $('#room').animate([{filter:'saturate(.55) hue-rotate(30deg)'},{filter:'none'}], 260);
  }
  stopSignal();
  stopSignal = playUnknownSignal(sound, {level:.23});
}
addEventListener('pagehide', () => { clearInterval(diagnosticsTimer); stopSignal(); sound.stopWake(); voice.stop(); globalThis.speechSynthesis?.cancel(); });

dialog.addEventListener('close', () => { voice.stop(); hideCaption(); locateObjective(); });

const caption = $('#acte-caption');

function hideCaption() {
  if (caption.hidePopover && caption.matches(':popover-open')) caption.hidePopover();
  caption.hidden = true;
  globalThis.speechSynthesis?.cancel();
}

function captionOnce(id, text) {
  if (!text || state.spoken.includes(id)) return;
  state.spoken.push(id);
  save();
  caption.querySelector('p').textContent = text;
  caption.hidden = false;
  dialog.append(caption);
  if (caption.showPopover) caption.showPopover();
  speakLine(text);
}

function show(title, text, playerLine) {
  hideCaption();
  guide();
  dialog.innerHTML = '<div class="acte-system-line"><span class="acte-terminal-mark">CORTEX</span><span class="acte-terminal-status">Liaison dégradée</span></div><h2 id="discovery-title"></h2><p id="discovery-text"></p><div class="acte-actions"></div><form method="dialog"><button>Retour à la chambre</button></form>';
  $('#discovery-title').textContent = title;
  $('#discovery-text').textContent = text;
  if (!dialog.open) dialog.showModal();
  captionOnce(title, playerLine);
  return $('.acte-actions');
}

function interfaceContent(markup) {
  const panel = document.createElement('div');
  panel.id = 'discovery-text';
  panel.className = 'acte-panel-content';
  panel.innerHTML = markup;
  $('#discovery-text').replaceWith(panel);
}


function button(label, action, host = $('.acte-actions')) {
  const control = document.createElement('button');
  control.type = 'button';
  control.textContent = label;
  control.onclick = action;
  host.append(control);
  return control;
}
function desktop() {
  if (!state.terminal) { password(); return; }
  const apps = show('Terminal personnel', '');
  apps.classList.add('acte-apps');
  const tile = (name, icon, open, primary = false) => {
    const control = button(name, open, apps);
    control.classList.toggle('acte-primary', primary);
    const label = document.createElement('span');
    label.className = 'acte-app-label';
    label.textContent = name;
    const symbol = document.createElement('span');
    symbol.className = 'acte-app-icon';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = icon;
    control.replaceChildren(symbol, label);
  };
  tile('PRONOTE', '▦', pronote, !state.evaluation);
  if (state.journalUnlocked || state.terminal) tile('Journal de sommeil', '☾', journal);
  if (state.evaluation) tile('Paramètres', '⊙', settings, !state.settingsSeen);
  if (state.settingsSeen || state.cleared) tile('Archives', '▤', archives, !state.archiveSeen && !state.cleared);
  if (state.cleared || (state.denied && state.archiveSeen)) tile('Messagerie', '✉', inbox, true);
}

function archives() {
  const firstVisit = !state.archiveSeen;
  state.archiveSeen = true;
  save();
  show('Archives · Rapport du sas', '');
  interfaceContent(`<div class="acte-record"><span class="acte-label">Commande à distance</span><strong class="acte-badge acte-fault">Indisponible</strong></div>
    <h3>Déclencher le protocole de secours</h3>
    <ol class="acte-steps"><li>Essaie d’ouvrir le sas depuis la chambre.</li><li>Si le sas refuse, consulte ta messagerie. Le protocole y sera envoyé.</li></ol>`);
  const goToDoor = dialog.querySelector('form[method="dialog"] button');
  goToDoor.textContent = 'Revenir devant le sas';
  goToDoor.classList.add('acte-primary');
  button('Retour au bureau', desktop);
  if (firstVisit) playDialogue([
    ['ORBI-7', 'J’ai trouvé pourquoi les paramètres ne répondent pas, Maître. Le terminal a perdu la commande du sas, mais la poignée fonctionne encore en local.'],
    ['VOUS', 'Donc je dois aller essayer la porte, même si elle est bloquée ?'],
    ['ORBI-7', 'Oui, Maître. Le sas doit enregistrer votre tentative. S’il refuse, il enverra le protocole de secours à votre messagerie.'],
    ['VOUS', 'D’accord. Je vais essayer la poignée. Reste en ligne.'],
  ], () => goToDoor.focus());
}

function password() {
  const firstAttempt = !state.passwordIntroduced;
  state.passwordIntroduced = true;
  save();
  const actions = show('Terminal verrouillé', 'Saisissez le code pour ouvrir la session locale.',
    firstAttempt ? 'Un mot de passe… Je ne sais même pas à qui est cet ordinateur. Tant pis, j’essaie quelque chose au hasard.' : undefined);
  const form = document.createElement('form');
  form.innerHTML = '<label for="acte-code">Mot de passe</label><input id="acte-code" autocomplete="off" maxlength="40"><button type="submit">Valider</button><p role="status"></p>';
  form.onsubmit = event => {
    event.preventDefault();
    if (!validSleepAnswer(form.querySelector('input').value) && !/^0?330$/.test(form.querySelector('input').value.trim())) {
      sound.effect('locked');
      const firstFailure = !state.journalUnlocked;
      state.journalUnlocked = true;
      save();
      journalHelp.hidden = false;
      form.querySelector('p').textContent = 'Code incorrect.';
      form.querySelector('input').setAttribute('aria-invalid', 'true');
      if (firstFailure) playDialogue([
        ['ORBI-7', 'Le serveur d’identification ne répond plus, Maître. Le terminal est passé en mode secours.'],
        ['VOUS', 'D’accord… Et le code de secours, je le trouve où ?'],
        ['ORBI-7', 'Le système a choisi votre dernière durée de sommeil comme code de dépannage. Les heures de coucher et de réveil sont dans le journal local.'],
      ], () => journalHelp.focus());
      else journalHelp.focus();
      return;
    }
    state.terminal = true;
    save();
    sound.effect('unlock');
    show('Accès autorisé', 'Session locale ouverte. Vous pouvez consulter PRONOTE.');
    const desktopButton = button('Accéder au bureau', desktop);
    desktopButton.classList.add('acte-primary');
    playDialogue([
      ['VOUS', 'Trois heures et demie… Ça explique le mal de crâne. Pour le reste, ça n’explique rien du tout.'],
      ['ORBI-7', 'Code accepté, Maître. Votre dossier est accessible. Je reste en ligne pendant que vous cherchez une sortie.'],
    ], () => desktopButton.focus());
  };
  actions.append(form);
  const journalHelp = button('Consulter le journal de sommeil', journal);
  journalHelp.hidden = !state.journalUnlocked;
  journalHelp.classList.add('acte-primary');
  form.querySelector('input').focus();
}
function journal() {
  const actions = show('Journal de sommeil', '', 'J’ai dormi moins longtemps que mon téléphone a chargé. Et c’est moi qui dois retenir un mot de passe ?');
  const log = document.createElement('dl');
  log.className = 'acte-sleep-log';
  log.innerHTML = `<div class="acte-sleep-event acte-bedtime">
    <dt><span aria-hidden="true">☾</span> Coucher</dt>
    <dd><time datetime="03:00">03<span>:</span>00</time></dd>
  </div>
  <div class="acte-sleep-event acte-wake">
    <dt><span aria-hidden="true">☀</span> Réveil</dt>
    <dd><time datetime="06:30">06<span>:</span>30</time></dd>
  </div>`;
  $('#discovery-text').replaceWith(log);
  interference('Défaillance système');
  button(state.terminal ? 'Retour au bureau' : 'Saisir le mot de passe', state.terminal ? desktop : password, actions).classList.add('acte-primary');
}
function pronote() {
  const firstVisit = !state.evaluation;
  state.evaluation = true;
  save();
  show('Évaluation aujourd’hui', '');
  interfaceContent(`<article class="acte-school-card">
    <div class="acte-record"><span class="acte-label">PRONOTE · Emploi du temps</span><span class="acte-badge">Aujourd’hui</span></div>
    <h3>Prévention, santé, environnement</h3>
    <p>Évaluation sur le sommeil et ses effets sur la santé.</p>
  </article>`);
  const settingsButton = button('Voir les paramètres', settings);
  button('Retour au bureau', desktop);
  if (firstVisit) playDialogue([
    ['VOUS', 'Ça, je m’en souviens. Le cours de PSE, le contrôle… Pourquoi je reconnais mon emploi du temps et rien de ce qu’il y a autour de moi ?'],
    ['ORBI-7', 'Maître, le manque de sommeil peut gêner votre concentration et votre mémorisation.'],
  ], () => settingsButton.focus());
}
function settings() {
  const firstDialogue = !state.spoken.includes('dialogue-simulation');
  state.settingsSeen = true;
  if (firstDialogue) state.spoken.push('dialogue-simulation');
  save();
  show('Diagnostic de la chambre', '');
  interfaceContent(`<dl class="acte-readings">
    <div><dt>Simulation</dt><dd><span class="acte-badge">Active</span></dd></div>
    <div><dt>Affichage</dt><dd>Rendu de secours 2D</dd></div>
    <div><dt>Capteurs de profondeur</dt><dd><span class="acte-badge acte-fault">Hors service</span></dd></div>
  </dl>`);
  interference('CORTEX · Profondeur demandée. Origine du signal inconnue.');
  const records = button('Consulter les archives', archives);
  button('Retour au bureau', desktop);
  if (firstDialogue) playDialogue([
    ['VOUS', 'Une simulation… Alors je suis où, en vrai ? Et si je quitte cette chambre, est-ce que je sors aussi de la simulation ?'],
    ['ORBI-7', 'Je ne sais pas, Maître. Le diagnostic ne couvre que cette chambre. Je ne reçois plus aucune donnée de l’autre côté du sas.'],
    ['VOUS', 'Et si le système lâche avant qu’on ait ouvert la porte ? Il doit bien rester une sortie de secours.'],
    ['ORBI-7', 'Le terminal ne peut plus commander le sas à distance. Il reste un rapport dans les archives. Il indique peut-être quoi faire sur place.'],
  ], () => records.focus());
}
function inbox() {
  show('MESSAGERIE · BOÎTE DE RÉCEPTION', '', state.denied ? 'L’autorisation est arrivée. Pas de nom, pas de réponse. Juste un bouton pour sortir.' : 'Des mails de l’école et des alertes de maintenance. C’est quoi ce mélange ?');
  $('#discovery-title').textContent = 'Messagerie';
  interfaceContent(`<ul class="acte-mail">
    <li><strong>Scolarité</strong><p>Rappel de l’évaluation de PSE. Consultez PRONOTE.</p></li>
    <li><strong>Maintenance CORTEX</strong><p>En mode de secours 2D, évitez de recalibrer l’affichage manuellement.</p></li>
  </ul>`);
  if (state.cleared) button('Autorisation de sortie activée', door);
  else if (state.denied && state.evaluation) button('Ouvrir le message « Protocole de sortie »', clearance);
  else $('.acte-actions').append(state.denied ? 'Authentifiez votre dossier dans PRONOTE pour ouvrir le message de sortie.' : 'Le message de sortie sera délivré après une demande à la porte.');
  button('Retour au bureau', desktop);
}
function clearance() {
  const actions = show('Protocole de sortie · Sommeil', '');
  interfaceContent(`<dl class="acte-figures">
    <div><dt>Objectif</dt><dd>8 h</dd></div>
    <div><dt>Coucher</dt><dd>03:00</dd></div>
    <div><dt>Réveil</dt><dd>06:30</dd></div>
  </dl><h3>Combien de temps de sommeil a-t-il manqué pour atteindre l’objectif ?</h3>`);
  const form = document.createElement('form');
  form.innerHTML = '<label for="acte-protocol-answer">Temps manquant</label><input id="acte-protocol-answer" autocomplete="off" maxlength="40" placeholder="En heures et minutes"><button type="submit" class="acte-primary">Valider le protocole</button><p role="status"></p>';
  const answer = form.querySelector('input');
  form.onsubmit = event => {
    event.preventDefault();
    const value = answer.value.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, '').replace(/heures?/g, 'h').replace(/minutes?/g, 'min');
    if (!/^(?:4h30(?:min)?|4:30|4[.,]5h?|270min)$/.test(value)) {
      sound.effect('locked');
      answer.setAttribute('aria-invalid', 'true');
      form.querySelector('p').textContent = 'Soustrayez la durée de sommeil enregistrée de l’objectif de 8 h.';
      answer.focus();
      return;
    }
    state.fragmentPending = true;
    save();
    void restoreFragment();
  };
  actions.append(form);
  button('Retour à la messagerie', inbox);
  if (state.spoken.includes('protocole-sommeil')) { answer.focus(); return; }
  state.spoken.push('protocole-sommeil');
  save();
  playDialogue([
    ['VOUS', 'Attends… J’ai déjà calculé combien de temps j’ai dormi pour entrer dans le terminal. Pourquoi la porte me demande encore de faire un calcul ?'],
    ['ORBI-7', 'C’est le test de vigilance du protocole de secours, Maître. Cette fois, il faut calculer le sommeil qui vous a manqué.'],
    ['VOUS', 'Un test de vigilance pour sortir de ma chambre… Rien ici ne tourne rond. D’accord. On le fait.'],
  ], () => answer.focus());
}

async function restoreFragment() {
  if (dialog.open) dialog.close();
  $('#objects').inert = true;
  cue.hidden = true;
  sound.effect('fragment');
  await resynchronize(sound, reduce.matches);
  state.fragmentPending = false;
  state.cleared = true;
  save();
  try { localStorage.setItem('noctis.sleep-puzzle.v1', JSON.stringify({correct:true, unlocked:true})); } catch {}
  document.body.classList.add('door-unlocked');
  playDialogue([
    ['ORBI-7', 'Quatre heures et demie. Le protocole a accepté votre réponse et le fragment est synchronisé. J’ai déverrouillé la porte, Maître.'],
    ['VOUS', 'Attends… Tu l’as vraiment ouverte ? Dis-moi que c’est bien une sortie, ORBI.'],
    ['ORBI-7', 'Le seuil est libre, Maître. Au-delà, les capteurs me renvoient une pièce qui ne figure sur aucun plan.'],
    ['VOUS', 'Je ne sais pas sur quoi je vais tomber. Mais je ne reste pas ici. Tu viens avec moi ?'],
  ], () => {
    $('#objects').inert = false;
    cue.hidden = false;
    guide();
    locateObjective();
  });
}

function door() {
  if (state.cleared) {
    show('ACCÈS AUTORISÉ', 'Sas déverrouillé.', 'Elle est ouverte… D’accord. Un pas à la fois.');
    button('Ouvrir la porte', () => {
      sound.effect('open');
      dialog.close();
      nextStage('n1', 'n2-panorama');
    });
    return;
  }
  sound.effect('locked');
  if (!state.archiveSeen) {
    show('SAS HORS LIGNE', 'Consultez le rapport de maintenance du sas sur le terminal personnel.', 'La poignée ne cède pas. ORBI, je ne veux pas rester enfermé ici. Tu peux repérer ce qui bloque ?');
    return;
  }
  const firstRefusal = state.denied === 0;
  state.denied++;
  save();
  show('Accès refusé', '');
  interfaceContent(`<div class="acte-record"><span class="acte-label">Tentative d’ouverture</span><strong class="acte-badge acte-fault">Refusée</strong></div>
    <p>Le protocole de secours est disponible dans la messagerie du terminal.</p>`);
  const back = dialog.querySelector('form[method="dialog"] button');
  back.textContent = 'Retourner vers le terminal';
  if (firstRefusal) playDialogue([
    ['VOUS', 'Le sas a refusé, comme tu l’avais prévu. Est-ce que la demande est bien partie ?'],
    ['ORBI-7', 'Oui, Maître. Le protocole vient d’arriver dans votre messagerie. Il faut le valider pour que je puisse ouvrir le sas.'],
  ], () => back.focus());
}

function orbi() {
  sound.effect('servo');
  show('ORBI-7 · ASSISTANT PERSONNEL', 'Canal local disponible.');
  if (state.spoken.includes('origine-maitre')) return;
  button('Pourquoi « Maître » ?', () => {
    state.spoken.push('origine-maitre');
    save();
    playDialogue([
      ['ORBI-7', 'Vous avez choisi cette appellation lors de ma configuration.'],
      ['VOUS', 'Ah. Donc ça, c’est bien de ma faute.'],
    ], () => show('ORBI-7 · ASSISTANT PERSONNEL', 'Canal local disponible.'));
  });
}

const interactions = {
  bed: () => show('LE LIT', '', 'La couverture est encore chaude. C’est bien moi qui dormais ici ? J’ai beau chercher, je ne me rappelle pas m’être allongé.'),
  clock: () => {
    show('Le réveil', '', 'Six heures et demie quand j’ai ouvert les yeux. Ça devrait être un matin comme les autres…');
    $('#discovery-text').innerHTML = 'Heure actuelle · <time id="acte-clock-time"></time><br>Sonnerie enregistrée à 06:30.';
    checkpointClock();
    button('Écouter le gazouillis', orbi);
  },
  robot: orbi, computer: desktop, door,
};
for (const hotspot of document.querySelectorAll('[data-object]')) {
  hotspot.onclick = () => {
    sound.effect(hotspot.dataset.object);
    interactions[hotspot.dataset.object]();
  };
}
$('#overview').onclick = () => {
  const active = document.body.classList.toggle('overview');
  $('#overview').setAttribute('aria-pressed', String(active));
  room.scrollLeft = (room.scrollWidth - room.clientWidth) / 2;
};
$('#fullscreen').onclick = () => {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  else void document.documentElement.requestFullscreen?.()?.catch(() => {});
};
const volume = $('#welcome-volume');
volume.value = Math.round(sound.volume * 100);
volume.oninput = () => sound.setVolume(Number(volume.value) / 100);
function wake() {
  enterStage('n1');
  state.started = true;
  save();
  $('#audio-start').hidden = true;
  document.body.classList.remove('audio-gated');

  const lids = $('.eyelids');
  const veil = $('#acte-veil');
  const breach = $('#acte-breach');
  const reduced = reduce.matches;
  let opening = true;
  if (reduced) veil.hidden = false;
  else {
    lids.style.display = 'block';
    document.body.classList.add('waking');
  }
  void sound.enable(Number(volume.value) > 0).then(ok => { if (ok && opening) sound.wake(); });

  setTimeout(() => {
    opening = false;
    sound.stopWake();
    veil.hidden = true;
    breach.hidden = false;
    interference('CORTEX · Perte de synchronisation visuelle');
    const duration = reduced ? 2200 : 3000;
    if (!reduced) breach.animate([{opacity:1},{opacity:1,offset:.84},{opacity:0}], {duration});
    setTimeout(() => {
      document.body.classList.remove('waking');
      lids.style.display = 'none';
      breach.hidden = true;
      document.body.classList.add('exploring');
      document.body.classList.toggle('door-unlocked', state.cleared);
      room.scrollLeft = (room.scrollWidth - room.clientWidth) / 2;
      clockStarted = true;
      checkpointClock();
      startDiagnostics();
      if (state.fragmentPending) void restoreFragment();
      else intro();
    }, duration);
  }, reduced ? 550 : 2000);
}

$('#start-sound').onclick = () => {
  startStory();
  state = initialState();
  wake();
};

const resume = $('#acte-resume');
const resumeUrl = resumeStoryUrl();
if (resumeUrl && (resumeUrl !== stageRoutes.n1 || state.started || state.passwordIntroduced || state.terminal)) {
  resume.hidden = false;
  resume.onclick = () => {
    if (resumeUrl !== stageRoutes.n1) location.assign(resumeUrl);
    else wake();
  };
}
const audioToggle = $('#audio-toggle');
audioToggle.onclick = async () => {
  const active = await sound.enable(!sound.enabled);
  if (!active) { voice.stop(); globalThis.speechSynthesis?.cancel(); }
  audioToggle.textContent = active ? 'Couper le son' : 'Activer le son';
  audioToggle.setAttribute('aria-pressed', String(active));
};
$('#audio-volume').value = volume.value;
$('#audio-volume').oninput = event => sound.setVolume(Number(event.target.value) / 100);































