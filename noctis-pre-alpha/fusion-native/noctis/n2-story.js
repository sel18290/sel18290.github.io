import { nextStage, storyKey } from '/noctis-pre-alpha/aventure/progression.js';

const warningKey = 'noctis.n02.panorama-warning.v1';
let panoramaTransitionPending = false;
let passageTransitionPending = false;

export async function restoreRoomTwo({ enter, sound, updateSound, panorama = false }) {
  // Audio still needs a gesture on the new document in Chrome and on iOS.
  if (sound.enabled) {
    document.addEventListener('click', () => {
      if (sound.enabled) void sound.enable(true).then(updateSound);
    }, { once: true, capture: true });
  }

  await enter();
  if (!document.body.classList.contains('room-two')) return;
  document.querySelector('#return-room-one').hidden = true;
  document.querySelector('.chapter').lastChild.textContent = ' N02';
  if (panorama) return;

  document.title = 'NOCTIS · N2 · Chambre des écrans';
  document.querySelector('#discovery-title').textContent = 'ORBI-7 · IMAGE RÉTABLIE';
  document.querySelector('#discovery-text').textContent =
    'La pièce vient de changer autour de toi. Je reconnais pourtant les équipements et les découvertes déjà enregistrées. Reprends le protocole nocturne. Ce signal venait de quelque part.';
}

function hasSeenWarning() {
  try { return localStorage.getItem(storyKey(warningKey)) === 'seen'; }
  catch { return false; }
}

export async function leavePanoramaAfterWarning(playTransmission) {
  if (panoramaTransitionPending) return;
  panoramaTransitionPending = true;

  try {
    let seen = hasSeenWarning();
    if (!seen) {
      const transmission = playTransmission();
      const dialog = document.querySelector('dialog.n02-interception[open]');
      const heading = dialog?.querySelector('h2');
      // Preserve the original warning and acknowledge it only when it appears.
      const observeWarning = new MutationObserver(() => {
        if (heading.textContent !== 'ARRÊTEZ !') return;
        seen = true;
        try { localStorage.setItem(storyKey(warningKey), 'seen'); } catch {}
      });
      if (heading) observeWarning.observe(heading, { childList: true });
      dialog?.addEventListener('cancel', (event) => {
        if (seen) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, { capture: true });
      try { await transmission; } finally { observeWarning.disconnect(); }
    }
    if (seen) {
      document.querySelector('#discovery').close();
      nextStage('n2-panorama', 'n2');
    }
  } finally {
    panoramaTransitionPending = false;
  }
}

export async function takeWestPassage(playTransmission, open) {
  if (passageTransitionPending) return;
  passageTransitionPending = true;
  try {
    await playTransmission();
    open();
    document.querySelector('#discovery').close();
    nextStage('n2', 'ouest');
  } finally {
    passageTransitionPending = false;
  }
}
