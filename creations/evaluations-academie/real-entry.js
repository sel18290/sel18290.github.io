/* Accès temporaire à CORTEX Académie, avant l’authentification du compte. */
(function () {
  'use strict';
  const gate = document.getElementById('cortex-real-entry');
  const form = document.getElementById('cortex-real-entry-form');
  const input = document.getElementById('cortex-real-entry-password');
  const feedback = document.getElementById('cortex-real-entry-status');
  const submit = document.getElementById('cortex-real-entry-submit');
  const storageKey = 'cortex:real-entry:ticket';
  let ticket = '', unlock;
  const ready = new Promise(resolve => { unlock = resolve; });
  window.CORTEX_REAL_ENTRY = { ready, token: () => ticket };

  async function request(payload) {
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await import('./config.js?v=1');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(SUPABASE_URL + '/functions/v1/cortex-real-entry', {
        method: 'POST', cache: 'no-store', credentials: 'omit',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify(payload), signal: controller.signal
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw Error(result?.error || 'Vérification momentanément indisponible.');
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  function open(value) {
    ticket = value;
    try { sessionStorage.setItem(storageKey, value); } catch {}
    input.value = '';
    gate.hidden = true;
    document.body.classList.remove('cortex-preaccess');
    document.querySelectorAll('[data-real-entry-covered]').forEach(element => { element.inert = false; });
    document.getElementById('cortex-institutional-ribbon').hidden = false;
    unlock();
  }

  async function restore() {
    let saved;
    try { saved = sessionStorage.getItem(storageKey); } catch {}
    if (!saved) { submit.disabled = false; return; }
    feedback.textContent = 'Vérification de l’accès…';
    try {
      const result = await request({ action: 'session', ticket: saved });
      if (result.allowed) { open(saved); return; }
      try { sessionStorage.removeItem(storageKey); } catch {}
    } catch {}
    feedback.textContent = '';
    submit.disabled = false;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled || !input.value) return;
    submit.disabled = true;
    feedback.textContent = 'Vérification du mot de passe…';
    try {
      const result = await request({ action: 'verify', password: input.value });
      if (result.allowed && typeof result.ticket === 'string') { open(result.ticket); return; }
      feedback.textContent = 'Mot de passe incorrect.';
      input.select();
    } catch (error) {
      feedback.textContent = error.name === 'AbortError' || error instanceof TypeError
        ? 'Le service d’accès ne répond pas. Réessaie dans un instant.' : error.message;
    } finally {
      submit.disabled = false;
    }
  });
  void restore();
})();
