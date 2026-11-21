/* CORTEX console développeur : raccourci Ctrl+Alt+D et agrégats anonymes. */
(()=>{
'use strict';
const D=document, KEY='cortex_dev_session_v1';
const store=()=>{try{return sessionStorage}catch{return null}};
let token=store()?.getItem(KEY)||'',days=30,last=null,busy=false;
const pane=D.createElement('dialog');pane.id='cortex-dev-console';
pane.setAttribute('aria-modal','true');pane.setAttribute('aria-labelledby','cortex-dev-title');
pane.innerHTML=[
'<div class="cortex-dev-shell">',
'<header class="cortex-dev-header"><div class="cortex-dev-brand"><span>⌘</span><div><small>CORTEX / ACCÈS RESTREINT</small><h2 id="cortex-dev-title">Console développeur</h2></div></div><button type="button" data-dev-close aria-label="Fermer la console">✕</button></header>',
'<section data-dev-login class="cortex-dev-login"><div class="cortex-dev-lock">◈</div><h3>Accès administrateur</h3><p>Mot de passe vérifié par Supabase. Rien n’est enregistré en clair dans le navigateur.</p>',
'<form data-dev-form><label for="cortex-dev-password">Mot de passe développeur</label><input id="cortex-dev-password" type="password" autocomplete="off" required minlength="8" maxlength="128"><button type="submit" data-dev-login-submit class="cortex-dev-primary">Déverrouiller la console</button></form>',
'<p data-dev-login-status role="status" aria-live="polite"></p><small>Ctrl + Alt + D · Session temporaire · Aucune donnée nominative</small></section>',
'<section data-dev-workspace class="cortex-dev-workspace" hidden><div class="cortex-dev-toolbar"><div><strong>Vue d’ensemble</strong><small>Statistiques agrégées · CORTEX</small></div>',
'<div class="cortex-dev-tools"><label>Période <select data-dev-period><option value="7">7 jours</option><option value="30" selected>30 jours</option><option value="90">90 jours</option></select></label>',
'<button type="button" data-dev-refresh>↻ Actualiser</button><button type="button" data-dev-export>⇩ CSV</button><button type="button" data-dev-logout>Verrouiller</button></div></div>',
'<p data-dev-data-status role="status" aria-live="polite"></p>',
'<div class="cortex-dev-kpis">',
'<article><small>Sessions cumulées</small><strong data-dev-stat="visits">—</strong><span>Depuis le premier comptage</span></article>',
'<article><small>En ligne (2 min)</small><strong data-dev-stat="online">—</strong><span>Sessions récemment actives</span></article>',
'<article><small>Sessions PFMP</small><strong data-dev-stat="pfmp">—</strong><span>Sur la période</span></article>',
'<article><small>Questions Albert suivies</small><strong data-dev-stat="albert">—</strong><span>Thèmes anonymisés</span></article>',
'</div><div class="cortex-dev-panels">',
'<section class="cortex-dev-card cortex-dev-wide"><div class="cortex-dev-card-head"><h3>Évolution quotidienne</h3><small>PFMP et questions Albert</small></div><div class="cortex-dev-bars" data-dev-bars role="img" aria-label="Histogramme quotidien des usages"></div></section>',
'<section class="cortex-dev-card"><div class="cortex-dev-card-head"><h3>Filières recherchées</h3><small>Recherches PFMP</small></div><div class="cortex-dev-list" data-dev-sectors></div></section>',
'<section class="cortex-dev-card"><div class="cortex-dev-card-head"><h3>Questions fréquentes à Albert</h3><small>Thèmes, jamais les messages</small></div><div class="cortex-dev-list" data-dev-questions></div></section>',
'<section class="cortex-dev-card"><div class="cortex-dev-card-head"><h3>Filières ajoutées avec Albert</h3><small>Créations enregistrées</small></div><div class="cortex-dev-list" data-dev-custom></div></section>',
'<section class="cortex-dev-card"><div class="cortex-dev-card-head"><h3>Fonctions utilisées</h3><small>PFMP et assistance</small></div><div class="cortex-dev-list" data-dev-features></div></section>',
'<section class="cortex-dev-card cortex-dev-wide"><div class="cortex-dev-card-head"><h3>Démonstration et espace réel</h3><small>Répartition des événements PFMP</small></div><div class="cortex-dev-list" data-dev-sources></div></section>',
'</div><p class="cortex-dev-privacy">Les sessions ne sont pas des personnes uniques. Les indicateurs PFMP et les thèmes Albert commencent à leur activation : ils ne sont pas rétroactifs. Aucun nom, copie, question saisie, adresse IP ou historique individuel n’est enregistré dans ces compteurs. Mesures indicatives.</p></section></div>'
].join('');
D.body.append(pane);
const $=q=>pane.querySelector(q);
const login=$('[data-dev-login]'),workspace=$('[data-dev-workspace]');
const loginMessage=$('[data-dev-login-status]'),status=$('[data-dev-data-status]');
const password=$('#cortex-dev-password');
const fmt=n=>new Intl.NumberFormat('fr-FR').format(Math.max(0,Number(n)||0));
async function api(payload){
 const {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}=await import('./evaluations-academie/config.js?v=1');
 const response=await fetch(SUPABASE_URL+'/functions/v1/cortex-dev-console',{
  method:'POST',cache:'no-store',
  headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY},
  body:JSON.stringify(payload)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data?.ok)throw Error(data.error||'Service indisponible ('+response.status+').');
 return data;
}
window.CORTEX_DEV_METRICS=Object.freeze({
 track(kind,category,source='demo'){
  api({action:'event',kind,category,source}).catch(()=>{});
 }
});
function lock(message=''){
 login.hidden=false;workspace.hidden=true;loginMessage.textContent=message;
 password.value='';window.setTimeout(()=>password.focus(),10);
}
function group(rows,filter,key){
 const out=new Map();
 for(const item of rows){
  if(!filter(item))continue;
  const k=key(item);out.set(k,(out.get(k)||0)+Math.max(0,Number(item.hits)||0));
 }
 return [...out.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'fr'));
}
function list(selector,entries,empty){
 const area=$(selector);area.replaceChildren();
 if(!entries.length){
  const p=D.createElement('p');p.className='cortex-dev-empty';p.textContent=empty;area.append(p);return;
 }
 const max=Math.max(1,...entries.map(v=>v[1]));
 for(const [label,count] of entries.slice(0,15)){
  const row=D.createElement('div');row.className='cortex-dev-list-row';
  const top=D.createElement('div');top.className='cortex-dev-item-text';
  const title=D.createElement('span');title.textContent=label;
  const value=D.createElement('strong');value.textContent=fmt(count);
  top.append(title,value);
  const track=D.createElement('div');track.className='cortex-dev-line';
  const bar=D.createElement('div');bar.style.width=Math.max(2,100*count/max)+'%';
  track.append(bar);row.append(top,track);area.append(row);
 }
}
const labels={
 'commerce-vente':'Commerce et vente','accueil':'Métiers de l’accueil',
 'gestion-administration':'AGOrA · Gestion administrative','personnalisee':'Filières personnalisées',
 'PFMP':'PFMP · Recherche de lieux','Contrôles':'Création et passage des contrôles',
 'Copies':'Copies et corrections','Notes':'Notes et estimation',
 'Documents':'PDF et documents','PIN':'PIN et QR codes','Sécurité':'Surveillance des épreuves',
 'CV':'CV et lettre','Autres':'Autres questions',
 'recherche':'Recherche PFMP avec Albert','conseils':'Conseils PFMP','cv':'CV ou lettre',
 'contact':'Préparer le contact','chat':'Discussion PFMP','creation':'Création de filière',
 'atelier':'Atelier CV et lettre','candidature':'Candidature PFMP'
};
const display=k=>labels[k]||k;
function chart(rows){
 const area=$('[data-dev-bars]');area.replaceChildren();
 const dates=group(rows,r=>r.kind==='pfmp_open'||r.kind==='pfmp_search'||r.kind.startsWith('albert_'),r=>r.day);
 const counts=new Map(dates),max=Math.max(1,...counts.values()),count=Math.min(days,24);
 for(let i=count-1;i>=0;i--){
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'})
    .format(new Date(Date.now()-i*86400000));
  const value=counts.get(date)||0;
  const col=D.createElement('div');col.className='cortex-dev-barcol';
  col.title=date+' : '+fmt(value)+' interactions';
  const bar=D.createElement('span');bar.className='cortex-dev-bar';
  bar.style.height=Math.max(value?5:1,100*value/max)+'%';
  col.append(bar);
  if(i%Math.ceil(count/6)===0){const label=D.createElement('small');
   const [yy,mm,dd]=date.split('-');label.textContent=dd+'/'+mm;col.append(label);}
  area.append(col);
 }
}
function draw(stats){
 last=stats;days=stats.days;
 const rows=stats.events||[];
 const sum=name=>rows.filter(x=>x.kind===name).reduce((a,x)=>a+(Number(x.hits)||0),0);
 $('[data-dev-stat="visits"]').textContent=fmt(stats.visits);
 $('[data-dev-stat="online"]').textContent=fmt(stats.online);
 $('[data-dev-stat="pfmp"]').textContent=fmt(sum('pfmp_open'));
 $('[data-dev-stat="albert"]').textContent=fmt(rows.filter(x=>x.kind.startsWith('albert_')).reduce((a,x)=>a+(Number(x.hits)||0),0));
 list('[data-dev-sectors]',group(rows,x=>x.kind==='pfmp_search',x=>display(x.category)),'Aucune recherche PFMP enregistrée.');
 list('[data-dev-questions]',group(rows,x=>['albert_help_eleve','albert_help_prof','pfmp_albert'].includes(x.kind),x=>display(x.category)),'Les thèmes fréquents apparaîtront après les premières questions.');
 list('[data-dev-custom]',group(rows,x=>x.kind==='custom_sector',x=>x.category),'Aucune filière supplémentaire ajoutée depuis le début du suivi.');
 list('[data-dev-features]',group(rows,x=>['pfmp_open','pfmp_cv','pfmp_contact','pfmp_albert'].includes(x.kind),x=>({
  pfmp_open:'Sessions PFMP',pfmp_cv:'Atelier CV et lettre',
  pfmp_contact:'Prendre contact',pfmp_albert:'Albert PFMP'}[x.kind])),'Aucun usage enregistré.');
 list('[data-dev-sources]',group(rows,x=>x.kind.startsWith('pfmp_'),x=>x.source==='demo'?'Démonstration':'Espace réel'),'Aucun événement PFMP enregistré.');
 chart(rows);
 status.textContent='Données actualisées · '+days+' derniers jours · nouveaux indicateurs non rétroactifs.';
}
async function refresh(){
 if(busy)return;busy=true;status.textContent='Chargement des statistiques…';
 try{const data=await api({action:'stats',days,token});workspace.hidden=false;login.hidden=true;draw(data.stats)}
 catch(e){
  if(/Session expirée|Reconnecte-toi/.test(String(e.message))){
   token='';store()?.removeItem(KEY);lock('Session expirée. Reconnecte-toi.');
  }else status.textContent='⚠ '+String(e.message||e);
 }finally{busy=false}
}
async function open(){
 if(!pane.open)pane.showModal();
 if(token){workspace.hidden=false;login.hidden=true;await refresh()}else lock();
}
$('[data-dev-form]').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 busy=true;loginMessage.textContent='Vérification sur le serveur…';
 const submit=$('[data-dev-login-submit]');submit.disabled=true;
 const input=password.value;
 try{
  const data=await api({action:'login',password:input});
  token=data.token;store()?.setItem(KEY,token);workspace.hidden=false;login.hidden=true;
 }catch(e){loginMessage.textContent='⚠ '+String(e.message||e)}
 finally{busy=false;password.value='';submit.disabled=false}
 if(token)await refresh();
});
$('[data-dev-close]').addEventListener('click',()=>pane.close());
$('[data-dev-refresh]').addEventListener('click',refresh);
$('[data-dev-period]').addEventListener('change',e=>{days=Number(e.target.value)||30;refresh()});
$('[data-dev-logout]').addEventListener('click',()=>{token='';store()?.removeItem(KEY);last=null;lock('Console verrouillée.')});
$('[data-dev-export]').addEventListener('click',()=>{
 if(!last)return;
 const lines=['jour;fonction;categorie;espace;nombre',...last.events.map(x=>[x.day,x.kind,x.category,x.source,x.hits]
  .map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';'))];
 const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=D.createElement('a');
 a.href=url;a.download='cortex-statistiques-anonymes-'+last.days+'j.csv';
 D.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
});
pane.addEventListener('click',e=>{if(e.target===pane)pane.close()});
window.addEventListener('keydown',e=>{
 if(e.ctrlKey&&e.altKey&&!e.metaKey&&String(e.key).toLowerCase()==='d'){
  e.preventDefault();e.stopPropagation();open();
 }
},true);
})();