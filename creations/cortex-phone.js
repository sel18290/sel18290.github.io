/* Interactions partagées des écrans compacts de la démonstration et d’Académie. */
(() => {
  'use strict';

  const phone = window.matchMedia('(max-width: 760px), (max-width: 1100px) and (pointer: coarse)');
  const layout = window.matchMedia('(max-width: 760px), (max-width: 950px) and (max-height: 520px) and (pointer: coarse)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const body = document.body;
  const viewport = window.visualViewport;
  const editable = 'textarea:not([readonly]), input:not([readonly]):is(:not([type]), [type="text"], [type="number"], [type="email"], [type="search"], [type="password"], [type="tel"], [type="url"]), [contenteditable="true"]';
  let frame = 0;
  let keyboardBase = 0;
  let lastWidth = 0;

  function syncViewport() {
    frame = 0;
    const compact = phone.matches;
    root.classList.toggle('cortex-compact', compact);
    const height = viewport?.height ?? window.innerHeight;
    const typing = compact && document.activeElement?.matches(editable);
    const width = root.clientWidth;
    if (!typing || Math.abs(width - lastWidth) > 100) keyboardBase = height;
    lastWidth = width;
    const viewportAtNormalScale = !viewport || Math.abs(viewport.scale - 1) < .05;
    const keyboard = typing && (!viewport || (viewportAtNormalScale
      && Math.max(keyboardBase, root.clientHeight) - height > 100));
    body.classList.toggle('mobile-input-focus', Boolean(keyboard));
    if (keyboard) {
      root.style.setProperty('--cortex-visual-height', Math.round(height) + 'px');
      root.style.setProperty('--cortex-visual-top', Math.max(0, Math.round(viewport?.offsetTop ?? 0)) + 'px');
    } else {
      root.style.removeProperty('--cortex-visual-height');
      root.style.removeProperty('--cortex-visual-top');
    }
  }

  function scheduleViewport() {
    if (!frame) frame = requestAnimationFrame(syncViewport);
  }

  for (const type of ['focusin', 'focusout']) document.addEventListener(type, scheduleViewport);
  window.addEventListener('resize', scheduleViewport, { passive: true });
  viewport?.addEventListener('resize', scheduleViewport, { passive: true });
  viewport?.addEventListener('scroll', scheduleViewport, { passive: true });
  phone.addEventListener?.('change', scheduleViewport);
  syncViewport();

  function jump(target) {
    if (!target || !target.getClientRects().length) return;
    const title = target.matches('h1,h2,h3,h4') ? target : target.querySelector('h1,h2,h3,h4');
    if (title) {
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    }
    target.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }

  document.addEventListener('click', event => {
    const control = event.target.closest('[data-cortex-phone-target]');
    if (phone.matches && control) jump(document.querySelector(control.dataset.cortexPhoneTarget));
  });

  function setCropMode(control, surface, enabled) {
    surface.classList.toggle('cortex-crop-armed', enabled);
    control.setAttribute('aria-pressed', String(enabled));
    control.textContent = enabled ? 'Annuler la sélection' : 'Sélectionner un extrait';
  }

  function bindCrop(control, surface) {
    if (!control || !surface) return () => {};
    const reset = () => setCropMode(control, surface, false);
    reset();
    control.onclick = () => {
      const enabled = !surface.classList.contains('cortex-crop-armed');
      setCropMode(control, surface, enabled);
      if (enabled && phone.matches) surface.scrollIntoView({ block: 'nearest' });
    };
    return reset;
  }

  function permitsCrop(surface, event) {
    return !phone.matches || event.pointerType === 'mouse' || surface.classList.contains('cortex-crop-armed');
  }

  window.CORTEX_PHONE = { bindCrop, permitsCrop, layout };

  const workspace = document.getElementById('acad-professor-workspace');
  if (!workspace || typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;
  const links = [...workspace.querySelectorAll('.academie-prof-nav a[data-acad-view]')];
  const dock = document.createElement('nav');
  dock.className = 'cortex-acad-dock';
  dock.setAttribute('aria-label', 'Navigation mobile professeur');
  dock.hidden = true;
  const sheet = document.createElement('dialog');
  sheet.id = 'cortex-acad-tools';
  sheet.className = 'cortex-acad-tools';
  sheet.setAttribute('aria-labelledby', 'cortex-acad-tools-title');
  sheet.innerHTML = '<header><h2 id="cortex-acad-tools-title">Outils professeur</h2><form method="dialog"><button type="submit">Fermer</button></form></header>'
    + '<nav aria-label="Outils et rubriques professeur"></nav><footer></footer>';
  const toolLinks = sheet.querySelector('nav');
  const primary = { overview: 'Accueil', classes: 'Classes', assessments: 'Contrôles', copies: 'Copies' };
  for (const link of links) {
    const view = link.dataset.acadView;
    const inDock = Object.hasOwn(primary, view);
    const shortcut = link.cloneNode(true);
    shortcut.className = '';
    shortcut.removeAttribute('aria-current');
    shortcut.querySelector('.side-icon')?.setAttribute('aria-hidden', 'true');
    if (inDock) shortcut.lastChild.textContent = primary[view];
    (inDock ? dock : toolLinks).append(shortcut);
  }
  const qr = document.createElement('a');
  qr.href = '#cw-assessment-cards';
  qr.dataset.acadView = 'qr';
  qr.innerHTML = '<span aria-hidden="true">▣</span>QR des contrôles';
  toolLinks.insertBefore(qr, toolLinks.children[1] ?? null);
  const tools = document.createElement('button');
  tools.type = 'button';
  tools.innerHTML = '<span aria-hidden="true">☰</span>Outils';
  tools.setAttribute('aria-haspopup', 'dialog');
  tools.setAttribute('aria-controls', sheet.id);
  tools.setAttribute('aria-expanded', 'false');
  tools.addEventListener('click', () => {
    sheet.showModal();
    tools.setAttribute('aria-expanded', 'true');
  });
  dock.append(tools);
  const footer = sheet.querySelector('footer');
  const demo = document.createElement('a');
  demo.href = '../evaluations/';
  demo.textContent = 'Ouvrir la démonstration';
  const logout = document.createElement('button');
  logout.type = 'button';
  logout.textContent = 'Se déconnecter';
  logout.addEventListener('click', () => {
    sheet.close();
    document.getElementById('logout')?.click();
  });
  footer.append(demo, logout);
  toolLinks.addEventListener('click', event => {
    if (event.target.closest('a[data-acad-view]')) sheet.close();
  });
  sheet.addEventListener('close', () => tools.setAttribute('aria-expanded', 'false'));
  sheet.addEventListener('click', event => {
    if (event.target !== sheet) return;
    const bounds = sheet.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) sheet.close();
  });
  body.append(dock, sheet);

  function syncTeacherNav() {
    const visible = phone.matches && body.matches('.academy-authenticated:not(.cw-student-active)');
    if (!visible && sheet.open) sheet.close();
    dock.hidden = !visible;
    root.classList.toggle('cortex-acad-compact', visible);
    const view = body.dataset.acadView;
    for (const link of [...dock.querySelectorAll('a'), ...sheet.querySelectorAll('nav a')]) {
      if (link.dataset.acadView === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    if (view && !Object.hasOwn(primary, view)) tools.setAttribute('aria-current', 'page');
    else tools.removeAttribute('aria-current');
  }

  phone.addEventListener?.('change', syncTeacherNav);
  new MutationObserver(syncTeacherNav).observe(body, { attributes: true, attributeFilter: ['class', 'data-acad-view'] });
  syncTeacherNav();
})();
