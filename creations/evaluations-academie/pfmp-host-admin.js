/* Historique PFMP de l’enseignant. Seules les données de la structure sont enregistrées. */
(function () {
  'use strict';
  const endpoint = 'https://jhtmaoeazmjigfruandl.supabase.co/functions/v1/cortex-stage-search';
  const dialog = document.getElementById('pfmp-host-admin');
  if (!dialog) return;
  const find = name => dialog.querySelector('[data-host-' + name + ']');
  const form = find('form'), siret = form.elements.siret, program = form.elements.program, type = form.elements.type;
  const completed = form.elements.completed, confirmed = form.elements.confirmed;
  const details = find('details'), matches = find('match'), lookup = find('lookup'), submit = find('submit');
  const output = find('list'), status = find('status'), pageActions = find('pages');
  const previous = find('previous'), next = find('next');
  const guide = window.CORTEX_STAGE_GUIDE;
  const pageSize = 20;
  let matched = '', offset = 0, request, listRequest;

  function el(tag, text) {
    const item = document.createElement(tag);
    if (text) item.textContent = text;
    return item;
  }
  const note = text => { status.textContent = text; };
  function resetMatch() {
    matched = '';
    details.hidden = true;
    matches.textContent = '';
    confirmed.checked = false;
  }
  const siretNumber = () => siret.value.replace(/\s/g, '');

  async function send(action, input, signal) {
    const client = window.CORTEX_ACADEMY_BRIDGE?.client();
    const { data } = client ? await client.auth.getSession() : {};
    const token = data?.session?.access_token;
    if (!token) throw Error('Reconnecte-toi à ton espace professeur.');
    const response = await fetch(endpoint, {
      method:'POST', signal, headers:{'content-type':'application/json', authorization:'Bearer ' + token},
      body:JSON.stringify({ action, ...input })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw Error(result?.error || 'Service PFMP momentanément indisponible.');
    return result;
  }

  function updateTypes() {
    type.replaceChildren(...guide.forSearch(program.value, 'toutes').map(([id,label]) => new Option(label,id)));
  }
  program.replaceChildren(...Object.entries(guide.programs).map(([id,item]) => new Option(item.label,id)));
  program.addEventListener('change', updateTypes);
  updateTypes();
  completed.max = new Date().toLocaleDateString('sv-SE', {timeZone:'Europe/Paris'});

  function renderHost(row) {
    const card = el('article'), title = el('strong',row.name);
    const date = new Date(row.completed_on + 'T12:00:00').toLocaleDateString('fr-FR', {dateStyle:'long'});
    const category = guide.forSearch(row.sector, 'toutes').find(([id]) => id === row.type_id)?.[1];
    const remove = el('button','Retirer cette confirmation');
    remove.type = 'button'; remove.className = 'cs-stage-pale';
    let confirming = false;
    remove.addEventListener('click', async () => {
      if (!confirming) {
        confirming = true;
        remove.textContent = 'Confirmer le retrait';
        note('Vérifie la structure avant de confirmer le retrait de cette ligne.');
        return;
      }
      remove.disabled = true;
      try {
        await send('host_remove',{id:row.id});
        if (!dialog.open) return;
        note('Confirmation retirée.');
        await refresh();
      } catch (error) { if (dialog.open) note(error.message); }
      finally { remove.disabled = false; }
    });
    card.append(title,el('p',row.address),el('p',[guide.programs[row.sector]?.label,category,date].filter(Boolean).join(' · ')),remove);
    return card;
  }

  async function refresh() {
    listRequest?.abort();
    const own = new AbortController();
    listRequest = own;
    output.replaceChildren(el('p','Chargement de ton historique…'));
    pageActions.hidden = true;
    try {
      const {hosts,hasMore} = await send('host_admin_list',{offset},own.signal);
      if (own.signal.aborted || !dialog.open) return;
      if (!hosts.length && offset) { offset = Math.max(0, offset - pageSize); return refresh(); }
      output.replaceChildren(...hosts.map(renderHost));
      if (!hosts.length) output.append(el('p','Aucun accueil enregistré pour le moment.'));
      previous.disabled = !offset; next.disabled = !hasMore;
      pageActions.hidden = !offset && !hasMore;
    } catch (error) {
      if (!own.signal.aborted && dialog.open) output.replaceChildren(el('p', error.message));
    }
  }

  async function resolveSiret() {
    if (form.hasAttribute('aria-busy')) return;
    resetMatch();
    const value = siretNumber();
    if (!/^\d{14}$/.test(value)) { note('Indique les 14 chiffres du SIRET de l’établissement.'); siret.focus(); return; }
    request?.abort();
    const own = new AbortController();
    request = own;
    lookup.disabled = true;
    note('Vérification dans l’Annuaire des entreprises…');
    try {
      const {place} = await send('host_lookup',{siret:value},own.signal);
      if (own.signal.aborted || !dialog.open || value !== siretNumber()) return;
      matched = value;
      matches.replaceChildren(el('strong',place.name),el('p',place.address));
      details.hidden = false;
      note('Vérifie l’adresse, puis renseigne la PFMP effectuée.');
      program.focus();
    } catch (error) { if (!own.signal.aborted && dialog.open) note(error.message); }
    finally { if (request === own) lookup.disabled = false; }
  }

  lookup.addEventListener('click', resolveSiret);
  siret.addEventListener('input', () => { resetMatch(); note(''); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!matched || matched !== siretNumber()) { await resolveSiret(); return; }
    if (!form.reportValidity() || submit.disabled) return;
    const own = new AbortController();
    request = own;
    submit.disabled = true;
    lookup.disabled = true;
    siret.readOnly = true;
    form.setAttribute('aria-busy','true');
    try {
      await send('host_confirm',{siret:matched,filiere:program.value,type:type.value,
        completed_on:completed.value,confirmed:confirmed.checked},own.signal);
      if (own.signal.aborted || !dialog.open) return;
      form.reset(); updateTypes(); resetMatch(); offset = 0;
      note('Accueil confirmé. Tes élèves peuvent retrouver cette structure avec le filtre PFMP.');
      siret.focus();
      await refresh();
    } catch (error) { if (!own.signal.aborted && dialog.open) note(error.message); }
    finally { if (request === own) { submit.disabled = false; lookup.disabled = false; siret.readOnly = false; form.removeAttribute('aria-busy'); } }
  });

  previous.addEventListener('click',()=>{offset -= pageSize; void refresh();});
  next.addEventListener('click',()=>{offset += pageSize; void refresh();});
  document.querySelector('[data-pfmp-host-open]')?.addEventListener('click',()=>{
    if (!window.CORTEX_ACADEMY_BRIDGE?.teacher()) return;
    dialog.showModal();
    void refresh();
  });
  dialog.addEventListener('close',()=>{
    request?.abort(); listRequest?.abort(); form.reset(); updateTypes(); resetMatch(); offset = 0;
    lookup.disabled = false; submit.disabled = false; siret.readOnly = false; form.removeAttribute('aria-busy'); note('');
    output.replaceChildren();
  });
  window.addEventListener('cortex:academy-logout',()=>{if(dialog.open)dialog.close();});
})();
