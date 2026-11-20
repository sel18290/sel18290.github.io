import {gardenTasks,taskReady} from './garden-quest.js';
import {gardenZone} from './garden-plan.js';
import {composeRoom} from './compose.js';
import {GenesisBridge} from './bridge.js';
import {adapters} from './adapters.js';
import {validate} from './blueprint.js';
import {cellAt} from './sector-plan.js';
import {hubRoutes,hubRoute,hubGalleryAt,hubVisitUrl} from './hub-plan.js';
const $=id=>document.getElementById(id);
const bridge=new GenesisBridge(adapters), controller=new AbortController();
let space, scope;
async function run(){
  const name=new URLSearchParams(location.search).get('scene')||'resonance';
  if(!/^[a-z][a-z0-9-]{0,63}$/.test(name))throw Error('Identifiant de salle invalide');
  const response=await fetch('./scenes/'+name+'.json');
  if(!response.ok)throw Error('Salle introuvable');
  const definition=await response.json();
  const bp=validate(definition.modules?composeRoom(definition,await (await fetch('./scenes/modules.json')).json()):definition,adapters);
  $('title').textContent=bp.name;
  const isGarden=bp.space.network==='garden';
  const isHub=isGarden&&new URLSearchParams(location.search).get('hub')!=='0';
  if(name==='n05'){const next=document.createElement('a');next.href='./?scene=n06';next.textContent='Explorer N06 · Les jardins de l’Aube →';$('links').append(next);}
  if(isGarden){$('performance').open=true;document.body.classList.add('garden');$('preferences-title').textContent='Mission Aube · protéger la relève';document.querySelector('#preferences .intro').textContent='Explorez les trois pavillons autour du jardin. Analysez le journal, restaurez les conditions de repos puis revenez conclure à l’accueil. Les étoiles du plan indiquent vos postes de mission.';
    const map=document.createElement('div');map.className='garden-map';map.innerHTML='<svg viewBox="0 0 240 190" role="img" aria-label="Plan : accueil au sud, rythmes au nord, refuge à gauche, maison des équipages à droite"><path d="M40 112H200M120 112V40" stroke="#759792" stroke-width="24"/><circle cx="120" cy="112" r="46" fill="#244b48"/><g fill="#b6c4af" stroke="#d9e4d8"><circle cx="40" cy="112" r="27"/><circle cx="200" cy="112" r="27"/><circle cx="120" cy="35" r="27"/></g><g fill="#eef6ed" font-size="9" text-anchor="middle"><text x="120" y="36" fill="#153135">RYTHMES</text><text x="40" y="114" fill="#153135">REFUGE</text><text x="200" y="114" fill="#153135">ÉQUIPAGES</text><text x="120" y="112">HORLOGE</text><text x="120" y="153">ACCUEIL ★</text></g></svg>';
    if(isHub){
      const svg=map.querySelector('svg');svg.setAttribute('viewBox','0 0 240 220');svg.setAttribute('aria-label','Hub N06 : pavillons existants et trois galeries colorées vers N01, N02 et N03');
      for(const route of hubRoutes){const x1=120+Math.sin(route.angle)*43,z1=112+Math.cos(route.angle)*43,x2=120+Math.sin(route.angle)*80,z2=112+Math.cos(route.angle)*80,color='#'+route.color.toString(16);
        svg.insertAdjacentHTML('beforeend',`<path d="M${x1} ${z1}L${x2} ${z2}" fill="none" stroke="${color}" stroke-width="7"/><circle cx="${x2}" cy="${z2}" r="8" fill="#153135" stroke="${color}"/><text x="${x2}" y="${z2+3}" fill="${color}" font-size="8" text-anchor="middle">${route.number}</text><text x="${x2}" y="${z2+21}" fill="${color}" font-size="10" text-anchor="middle">N${route.number}</text>`);
      }
      document.querySelector('#preferences .intro').append(' Les galeries cyan, ambre et lilas, au sud du jardin, conduisent aux salles 1, 2 et 3. Le bouton Hub N06 permet de revenir au sas de départ.');
    }
    $('journal').before(map);
  }
  for(const transition of bp.transitions){const link=document.createElement('a');link.href=transition.to;link.textContent=transition.label;$('links').append(link);}
  if(name==='resonance'){const preview=document.createElement('a');preview.href='./?scene=n05';preview.textContent='Aperçu N05';$('links').append(' · ',preview);}
  if(bp.opening){
    const cover=$('cover'), image=$('plate'), enter=$('explore');
    image.alt=bp.opening.alt;image.src=bp.opening.image;
    $('cover-title').textContent=bp.name;
    await image.decode();cover.hidden=false;$('loading').hidden=true;
    await new Promise(resolve=>{enter.onclick=resolve;enter.focus();});
    cover.hidden=true;$('loading').hidden=false;
    $('review').hidden=false;$('review').onclick=()=>{
      space?.pause(true);cover.hidden=false;enter.textContent='Reprendre l’exploration';enter.focus();
      enter.onclick=()=>{cover.hidden=true;space?.pause(false);$('review').focus();};
    };
  }
  if(bp.mode!=='2d'){
    space=(await import('../spatial.bundle.js?v=n06-hub-r1')).spatial($('world'),bp,controller.signal);
    document.body.classList.add('spatial');
  }
  const actions=new Map();let selected=null,lastCount=-1,lastZone='';
  const journalEntries={lecture:['Consulter les archives','Console de l’observatoire'], 'capsule-a':['Contrôler le cycle thermique','Galerie cryogénique · à gauche'],reacteur:['Stabiliser le régulateur','Chambre de puissance · à droite'],cartographe:['Calculer la trajectoire orbitale','Cartographie · au-delà de la traverse']};
  function refreshJournal(){
    const completed=bp.objectives.filter(id=>bridge.core.progression.achieved(bp.id+'.'+id));
    if(completed.length===lastCount)return;lastCount=completed.length;
    $('objectives').textContent=completed.length+' / '+bp.objectives.length+' objectifs';$('journal').replaceChildren();
    for(const id of bp.objectives){const li=document.createElement('li'),copy=document.createElement('div'),small=document.createElement('small');const entry=isGarden?[gardenTasks[id].summary,gardenTasks[id].place]:journalEntries[id]||[id,''];
      copy.textContent=entry[0];small.textContent=entry[1];copy.append(small);li.append(copy);li.classList.toggle('done',completed.includes(id));$('journal').append(li);}
  }
  function update(){
    selected=null;let best=-Infinity;
    for(const [button,item] of actions){
      const task=item.obj.components.gardenTask?.task;
      const eligible=(!item.obj.components.hubGate||space?.hubEnabled)&&(!task||(taskReady(task,id=>scope?.achieved(id))&&(task!=='briefing'||!scope?.achieved('briefing'))&&(task!=='safety'||scope?.achieved('journal'))));
      const score=eligible?(space?space.score(item.obj,item.cfg.range):1):-Infinity;
      if(score>best){best=score;selected=button;}
    }
    for(const button of actions.keys())if(button.hidden!==(button!==selected))button.hidden=button!==selected;
    $('reticle').classList.toggle('active',!!selected);refreshJournal();
    let zone=lastZone;
    if(space&&isGarden)zone=gardenZone(space.position.x,space.position.z);
    if(space?.hubEnabled){const gallery=hubGalleryAt(space.position.x,space.position.z);if(gallery)zone='Galerie '+gallery.number+' · '+gallery.label;}
    if(space&&bp.space.network==='orbital')zone=cellAt(Math.floor((space.position.x+5)/2),Math.floor((space.position.z+6)/2))?.zone||'Observatoire';
    if(zone!==lastZone){$('zone').textContent=zone;lastZone=zone;}
  }
  let traveling=false;
  const view={...space,status:text=>$('progress').textContent=text,
    travelHub(id){
      const route=hubRoute(id);if(!route||!space?.hubEnabled||traveling)return;traveling=true;space.openHubGate(id);space.pause(true);$('progress').textContent='Liaison vers N'+route.number+' · '+route.label;document.body.classList.add('hub-departure');
      const timer=setTimeout(()=>location.assign(hubVisitUrl(id,new URLSearchParams(location.search))),space.reduced?0:380);controller.signal.addEventListener('abort',()=>clearTimeout(timer),{once:true});
    },
    action(obj,cfg,activate){const button=document.createElement('button');button.textContent=cfg.label;button.onclick=()=>{if(!space||space.score(obj,cfg.range)>-Infinity)activate();};$('actions').append(button);actions.set(button,{obj,cfg});return ()=>{actions.delete(button);button.remove();};},
    panel(){space?.pause(true);if(!$('dialog').open)$('dialog').showModal();return $('archive');}
  };
  $('dialog').onclose=()=>space?.pause($('preferences').open);
  $('preferences').onclose=()=>space?.pause($('dialog').open);
  $('settings').onclick=()=>{space?.pause(true);refreshJournal();$('preferences').showModal();};
  $('resume').onclick=()=>$('preferences').close();
  $('quality').value=space?.profileName||'balanced';
  $('quality').onchange=()=>{const url=new URL(location.href);url.searchParams.set('quality',$('quality').value);location.assign(url);};
  if(name==='n05'||isGarden){
    const row=document.createElement('label'),adaptive=document.createElement('input');adaptive.type='checkbox';adaptive.checked=space.adaptiveEnabled;
    row.className='setting-row';row.append(adaptive,'Adapter la résolution pour viser 60 FPS');
    const help=document.createElement('small');help.textContent='La résolution s’ajuste selon les performances. Ce réglage recharge la salle et conserve vos objectifs.';
    $('quality').closest('.setting-row').after(row,help);
    adaptive.onchange=()=>{const url=new URL(location.href);url.searchParams.set('adaptive',adaptive.checked?'1':'0');location.assign(url);};
  }
  if(isGarden){
    const help=document.createElement('small');help.textContent='Léger : 240 000 gaussiennes. Équilibré : 560 000. Détaillé : 1,4 million. Le mode léger est choisi automatiquement sur téléphone.';
    $('quality').closest('.setting-row').after(help);
  }
  if(name==='n05'||isGarden){
    const row=document.createElement('label'),upscale=document.createElement('input');upscale.type='checkbox';upscale.checked=space.upscaleEnabled;row.className='setting-row';row.append(upscale,'Essayer la mise à l’échelle avec netteté adaptative');
    const help=document.createElement('small');help.textContent='Option expérimentale commune aux PC, iPhone et Android : elle peut améliorer le coût du rendu, avec une image moins précise. Désactivez-la si elle ralentit votre appareil.';
    $('quality').closest('.setting-row').after(row,help);
    upscale.onchange=()=>{const url=new URL(location.href);if(upscale.checked)url.searchParams.set('upscale','spatial');else url.searchParams.delete('upscale');location.assign(url);};
    const exportButton=document.createElement('button');exportButton.textContent='Télécharger le diagnostic de fluidité';
    exportButton.onclick=()=>{const blob=new Blob([JSON.stringify(space.diagnostics(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='noctis-'+name+'-fluidite.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('resume').before(exportButton);
  }
  $('close').onclick=()=>$('dialog').close();
  window.addEventListener('keydown',e=>{if($('cover').hidden&&e.code==='KeyE'&&!e.repeat&&!$('dialog').open&&!$('preferences').open&&!e.target?.closest?.('input,textarea,select,[contenteditable=true]')){selected?.click();}},{signal:controller.signal});
  $('audio').onclick=async()=>{const enabled=!bridge.host.enabled;await bridge.host.enable(enabled);try{await space?.audio(enabled);}catch{}$('audio').setAttribute('aria-pressed',String(enabled));$('audio').textContent=enabled?'Couper le son':'Activer le son';};
  scope=await bridge.enter(bp,view);
  if(space&&(name==='n05'||isGarden)){bridge.update(0);const loading=document.querySelector('#loading p');if(loading)loading.textContent='Préparation de l’affichage…';await space.prepare();}
  $('loading').hidden=true;update();
  if(isGarden){$('progress').textContent='ORBI · Commencez au pupitre d’accueil devant vous. Carnet & réglages contient le plan.';}
  space?.start(dt=>{bridge.update(dt);update();});
}
function dispose(){controller.abort();bridge.exit();space?.dispose();bridge.host.dispose();}
addEventListener('pagehide',e=>{if(!e.persisted)dispose();},{once:true});
run().catch(e=>{dispose();$('loading').hidden=false;$('loading').textContent='Chargement interrompu · '+e.message;});
