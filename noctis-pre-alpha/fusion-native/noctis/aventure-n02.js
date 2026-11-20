import '/noctis-pre-alpha/aventure/storage.js';
import { enterStage } from '/noctis-pre-alpha/aventure/progression.js';
import { restoreRoomTwo, takeWestPassage } from './n2-story.js';
import { installN02Audio } from './audio/n02-audio.js';
import { installN01Score } from './audio/n01-score.js';
import { renderTablet } from './tablet-archive.js';
import { interceptTransmission, resetTransmission } from './n02-transmission.js';
import { resynchronize } from './resync.js';
import { attachFullscreen } from './n03/fullscreen.js';
import { createLaboratory } from './n03/lab.js';
import { OrbiVoice } from './audio/orbi-voice.js';
import { Soundscape } from './audio/soundscape.js';
import { installFirstSignal } from './n01-signal.js';
import { playUnknownSignal } from './audio/unknown-signal.js';
const sound = new Soundscape();
const orbiVoice = new OrbiVoice(sound);
import { validSleepAnswer } from './sleep-answer.mjs';
import { RoomClock } from './clock-core.mjs';
// N01-A : commandes d'affichage uniquement. Aucun objet de jeu actif.
const viewport = document.querySelector('#viewport');
const room = document.querySelector('#room');
const overview = document.querySelector('#overview');
function centerScene() { viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2; }
if (room.complete && room.naturalWidth) centerScene();
room.addEventListener('load', centerScene, { once: true });
room.addEventListener('error', () => { document.querySelector('#error').hidden = false; });
overview.addEventListener('click', () => {
  const active = document.body.classList.toggle('overview');
  overview.setAttribute('aria-pressed', String(active));
  overview.innerHTML = active ? 'Vue immersive <span aria-hidden="true">↗</span>' : 'Vue complète <span aria-hidden="true">↗</span>';
  if (!active) centerScene();
});
const fullscreen = document.querySelector('#fullscreen');
const fullscreenNote=document.createElement('span');fullscreenNote.className='room-fullscreen-note';fullscreenNote.setAttribute('role','status');fullscreen.after(fullscreenNote);
attachFullscreen(fullscreen,fullscreenNote);

// N01-B. Le délai de secours CSS reste actif même si JavaScript échoue.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let wakeTimer,wakeSignalTimer;
let stopEyeSignal=()=>{};
function finishWake(notify = true) {
  const wasWaking = document.body.classList.contains("waking");
  clearTimeout(wakeTimer); clearTimeout(wakeSignalTimer); stopEyeSignal(); stopEyeSignal=()=>{};
  document.body.classList.remove('waking');
  document.querySelector('.eyelids').style.display = 'none';
  if (wasWaking) { document.body.dataset.wakeEnded=String(performance.now()); sound.stopWake(); if(notify) document.dispatchEvent(new Event('noctis:awake')); } 
}
function playWake() {
  finishWake(false);
  document.dispatchEvent(new Event("noctis:wake-start"));
  if (reducedMotion.matches) { sound.stopWake(); document.dispatchEvent(new Event("noctis:awake")); return; }
  const lids = document.querySelector('.eyelids');
  lids.style.display = 'block';
  void lids.offsetWidth;
  document.body.classList.add('waking');
  wakeSignalTimer=setTimeout(()=>{stopEyeSignal=playUnknownSignal(sound,{level:.4});},2000);
  wakeTimer = setTimeout(finishWake, 5000);
}
document.querySelector('.eyelids').addEventListener('animationend',e=>{if(e.animationName==='wake-cut')finishWake();});
document.querySelector('#replay').addEventListener('click', e => { e.stopPropagation(); playWake(); });
document.addEventListener('pointerdown', () => { if(document.body.classList.contains('waking')) finishWake(); }, true);
document.addEventListener('keydown', e => {
  if(document.body.classList.contains('waking')) { finishWake(); if(e.key !== 'Tab') e.preventDefault(); }
}, true);
reducedMotion.addEventListener('change', () => { if(reducedMotion.matches) finishWake(); });


// N01-C: identité et progression locales uniquement, aucun appel réseau.
const storageKey = 'noctis.orbi.v1';
let player = { name: '', completed: false };
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if(saved && typeof saved.name === 'string') player = {name:saved.name.slice(0,40),completed:saved.completed === true};
} catch { /* Stockage désactivé ou données invalides : partie utilisable en mémoire. */ }
const panel = document.querySelector('#dialogue');
const speech = document.querySelector('#speech');
const nameForm = document.querySelector('#name-form');
const nameInput = document.querySelector('#player-name');
const next = document.querySelector('#continue');
let stage = 0, sceneTimer, lightTimer, hintTimer, editing = false;
let freshNameRequested = true;
function persistPlayer() {
  try { localStorage.setItem(storageKey, JSON.stringify(player)); return true; }
  catch { return false; }
}
function stopScene() {
  orbiVoice.stop();
  setExploration(false);
  clearTimeout(sceneTimer); clearTimeout(lightTimer); clearTimeout(hintTimer);
  panel.hidden = true; document.querySelector('#explore').hidden = true;
  document.body.classList.remove('orbi-speaking');
}
function showStage(value) {
  orbiVoice.say(value === 0 || value === 4 ? "greeting" : value === 1 ? "question" : "curious");
  stage = value; panel.hidden = false;
  panel.dataset.shownAt=String(performance.now());
  document.body.classList.add('orbi-on','orbi-speaking');
  nameForm.hidden = stage !== 1; next.hidden = stage === 1;
  const address = player.name ? `, ${player.name}` : '';
  const lines = [
    'Bonjour. Le réveil semble difficile ce matin.',
    'Je suis ORBI-7, ton assistant personnel. Comment dois-je t’appeler ?',
    `Identité enregistrée${address}. Tu sembles encore épuisé malgré cette nuit de repos.`,
    'Prends un instant. Les traces de cette nuit devraient nous aider à comprendre.',
    `Bonjour${player.name ? `, ${player.name}` : ''}… Tu sembles avoir du mal à te réveiller ce matin. Je suis là. Prends ton temps, puis regarde autour de toi.`
  ];
  speech.textContent = lines[stage];
  if(stage === 1) { nameInput.value = freshNameRequested ? '' : player.name; freshNameRequested = false; nameInput.focus({preventScroll:true}); }
  else next.focus({preventScroll:true});
}
function endIntroduction() {
  stopScene(); player.completed = true;
  setExploration(true);
  const saved = persistPlayer();
  const hint = document.querySelector('#explore');
  hint.textContent = saved ? 'Explore ta chambre.' : 'Explore ta chambre. Sauvegarde locale indisponible.';
  hint.hidden = false; hintTimer = setTimeout(()=>{ hint.hidden = true; },6000);
  viewport.focus({preventScroll:true});
}
next.addEventListener('click',()=>{ if(stage === 3 || stage === 4) endIntroduction(); else showStage(stage+1); });
nameForm.addEventListener('submit', e=>{
  e.preventDefault(); player.name = nameInput.value.trim().slice(0,40);
  const saved = persistPlayer();
  document.querySelector('#save-note').textContent = saved ? '' : 'Sauvegarde indisponible : le choix reste valable pour cette session.';
  if(editing) { editing = false; endIntroduction(); } else showStage(2);
});
document.querySelector('#edit-name').addEventListener('click',()=>{
  if(document.body.classList.contains('waking')) return;
  stopScene(); editing = player.completed; showStage(1);
});
document.addEventListener('noctis:wake-start', stopScene);
document.addEventListener('noctis:awake',()=>{
  stopScene();
  sceneTimer = setTimeout(()=>{
    sound.effect('servo');
    document.body.classList.add('orbi-on');
    freshNameRequested = true;
    showStage(0);
  },500);
});


// N01-D: progression indépendante afin de préserver la sauvegarde du prénom.
const examinedKey = 'noctis.examined.v1';
const objectTitles = {clock:'RÉVEIL',bed:'LE LIT',computer:'ORDINATEUR',robot:'ORBI-7',door:'PORTE VERROUILLÉE'};
let examined = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(examinedKey));
  if(Array.isArray(saved)) examined = new Set(saved.filter(key=>Object.hasOwn(objectTitles,key)));
} catch { /* Exploration possible même sans stockage. */ }
const discovery = document.querySelector('#discovery');
let lastObject, robotLine = 0;
function setExploration(active) {
  document.body.classList.toggle('exploring',active);
  document.querySelector('#n1-progress').hidden=!active||document.body.classList.contains('room-two');
  document.querySelector('#objects').inert = !active;
  if(!active && document.querySelector('#discovery')?.open) document.querySelector('#discovery').close();
}
function markExamined() {
  document.querySelector('#n1-progress').textContent='Indices découverts : '+examined.size+' / 5';
  document.querySelectorAll('[data-object]').forEach(button=>{
    const key=button.dataset.object;

    button.dataset.examined = String(examined.has(key));
    const label = key === 'robot' ? 'Parler à ORBI-7' : `Examiner ${key === 'clock' ? 'le réveil' : key === 'bed' ? 'le lit' : key === 'computer' ? 'l’ordinateur' : 'la porte'}`;
    button.setAttribute('aria-label',label+(examined.has(key) ? ', déjà examiné' : ''));
  });
}
document.querySelectorAll('[data-object]').forEach(button=>{
  button.addEventListener('click',()=>{
    if(!document.body.classList.contains('exploring')) return;
    const key=button.dataset.object;
    sound.effect(key === "door" ? (puzzleState.unlocked ? "servo" : "locked") : key === "robot" ? "servo" : key);
    const address=player.name ? `, ${player.name}` : '';
    const robotLines=[`La fatigue persiste${address}. Le journal de sommeil peut nous éclairer.`,`Observe les équipements${address}. Certains conservent les traces de la nuit.`,`Je reste en liaison${address}. Examine la chambre à ton rythme.`];
    const messages={clock:clockMessage(),bed:"Je suis réveillé, mais mon corps semble encore attendre le repos. Que s’est-il passé cette nuit ?",computer:'Journal de sommeil personnel détecté.',robot:robotLines[robotLine % robotLines.length],door:"Accès verrouillé. L’analyse de la nuit doit être terminée avant le départ."};
    if(key==='robot') robotLine++;
    lastObject=button; examined.add(key); markExamined();
    let saved=true;
    try {localStorage.setItem(examinedKey,JSON.stringify([...examined]));} catch {saved=false;}
    document.querySelector('#discovery-title').textContent=objectTitles[key];
    document.querySelector('#discovery-text').textContent=messages[key];
    document.querySelector('#discovery-save').textContent=saved ? '' : 'Sauvegarde locale indisponible : les découvertes restent disponibles pendant cette session.';
    showDiscoveryContent(key);
    document.body.classList.toggle('orbi-speaking',key==='robot');
    if(key==='robot')orbiVoice.say('curious');
    discovery.showModal();
  });
});
discovery.addEventListener('click',e=>{if(e.target===discovery && !puzzleLocked){const r=discovery.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)discovery.close();}});
discovery.addEventListener('close',()=>{orbiVoice.stop();sound.effect('close');document.body.classList.remove('orbi-speaking');if(document.body.classList.contains('exploring'))lastObject?.focus({preventScroll:true});});
markExamined();


// N01-E : horloge de la partie (cet onglet), pause hors visibilité.
const clockKey = 'noctis.clock.v1';
let gameStarted = false;
const roomClock = new RoomClock(0, performance.now(), false);
let discoveryObject = '', journalStep = 0;
const journal = document.querySelector('#sleep-journal');
const journalNext = document.querySelector('#journal-next');
const journalKey = 'noctis.journal.v1';
const firstSignal=installFirstSignal(sound,journal,discovery);
function clockMessage() { return `${roomClock.time(performance.now())} — Heure actuelle\nRéveil du personnage : 06:30.`; }
function updateClock() {
  const time = roomClock.time(performance.now());
  const alarm = document.querySelector('.alarm');
  alarm.textContent = time; alarm.setAttribute('aria-label',`Heure actuelle : ${time}`);
  if(discovery.open && discoveryObject === 'clock') document.querySelector('#discovery-text').textContent = clockMessage();
}
function checkpointClock(visible = !document.hidden) {
  const total = roomClock.checkpoint(performance.now(),gameStarted && visible);
  try { sessionStorage.setItem(clockKey,String(total)); } catch {}
  updateClock();
}
document.addEventListener('visibilitychange',()=>checkpointClock(!document.hidden));
window.addEventListener('pagehide',()=>checkpointClock(false));
window.addEventListener('pageshow',()=>checkpointClock(!document.hidden));
setInterval(()=>checkpointClock(),1000);
function showDiscoveryContent(key) {
  resetPuzzleUI();
  discovery.dataset.kind=key;
  discoveryObject = key; journalStep = 0;
  if(key === "door" && puzzleState.unlocked) { showExit(); return; }
  journal.hidden = key !== 'computer'; journalNext.hidden = key !== 'computer';
  if(key === 'computer') {
    firstSignal.discover();
    document.querySelector('#discovery-title').textContent = 'JOURNAL DE SOMMEIL';
    document.querySelector('#discovery-text').textContent = '';
    try { if(!JSON.parse(localStorage.getItem(journalKey))?.discovered) sound.effect('noctis'); localStorage.setItem(journalKey,JSON.stringify({discovered:true})); }
    catch { document.querySelector('#discovery-save').textContent='Indice consulté. Sauvegarde locale indisponible pour cette session.'; }
  }
}
journalNext.addEventListener('click',()=>{
  firstSignal.clearJournal();
  journal.hidden = true; journalNext.hidden = true;
  if(puzzleState.unlocked) { showExplanation(); return; }
  askSleepQuestion();
});

updateClock();


// Énigme de la nuit historique, indépendante de l’horloge de la chambre.
const puzzleKey='noctis.sleep-puzzle.v1';
let puzzleState={correct:false,unlocked:false};
try { const s=JSON.parse(localStorage.getItem(puzzleKey)); if(s) puzzleState={correct:s.correct===true,unlocked:s.correct===true&&s.unlocked===true}; } catch {}
let puzzleLocked=false,puzzlePhase='';
const answerForm=document.querySelector('#sleep-answer-form');
const answerInput=document.querySelector('#sleep-answer');
const puzzleNext=document.querySelector('#puzzle-next');
const closeForm=discovery.querySelector('form[method="dialog"]');
function savePuzzle(){try{localStorage.setItem(puzzleKey,JSON.stringify(puzzleState));}catch{document.querySelector('#discovery-save').textContent='Sauvegarde indisponible : progression conservée pendant cette session.';}}
function resetPuzzleUI(){document.querySelector('#n2-document').replaceChildren();document.querySelector('#n2-document').hidden=true;puzzleLocked=false;puzzlePhase='';answerForm.hidden=true;document.querySelector('#sleep-comparison').hidden=true;puzzleNext.hidden=true;closeForm.hidden=false;}
function robotText(text){discovery.dataset.kind='robot';orbiVoice.say(text.includes("?") ? "question" : text.startsWith("Exactement") ? "correct" : text.startsWith("Accès autorisé") ? "praise" : "hint");document.querySelector('#discovery-title').textContent='ORBI-7';document.querySelector('#discovery-text').textContent=text;document.body.classList.add('orbi-speaking');}
function askSleepQuestion(){
  puzzleLocked=true;closeForm.hidden=true;
  if(puzzleState.correct){showExplanation();return;}
  const address=player.name ? `Dis-moi, ${player.name},` : 'Dis-moi,';
  robotText(`Tu t’es couché à 3 h du matin et tu t’es réveillé à 6 h 30… ${address} combien de temps as-tu dormi ?`);
  answerForm.hidden=false;answerInput.value='';document.querySelector('#sleep-hint').textContent='';answerInput.focus();
}
answerForm.addEventListener('submit',e=>{
  e.preventDefault();
  if(!validSleepAnswer(answerInput.value)){orbiVoice.say('wrong');document.querySelector('#sleep-hint').textContent='De 3 h à 6 h, combien d’heures se sont écoulées ? Et de 6 h à 6 h 30 ?';answerInput.setAttribute('aria-invalid','true');answerInput.focus();return;}
  answerInput.removeAttribute('aria-invalid');puzzleState.correct=true;savePuzzle();answerForm.hidden=true;
  robotText(`Le calcul est correct${player.name ? `, ${player.name}` : ''}. Cette nuit, ton sommeil a duré seulement 3 h 30.`);
  puzzlePhase='correct';puzzleNext.hidden=false;puzzleNext.textContent='Comprendre';puzzleNext.focus();
});
function showExplanation(){
  puzzleLocked=!puzzleState.unlocked;closeForm.hidden=puzzleLocked;
  robotText('À ton âge, entre 14 et 17 ans, il est recommandé de dormir entre 8 et 10 heures par nuit.\n\nCette durée très courte peut expliquer la fatigue ressentie au réveil.');
  document.querySelector('#sleep-comparison').hidden=false;puzzlePhase='explanation';puzzleNext.hidden=puzzleState.unlocked;puzzleNext.textContent='J’ai compris';if(!puzzleNext.hidden)puzzleNext.focus();
}
puzzleNext.addEventListener('click',()=>{
  if(puzzlePhase==='correct'){showExplanation();return;}
  if(puzzlePhase==='explanation'){
    sound.effect('unlock');setTimeout(()=>sound.effect('fragment'),700);
    puzzleState={correct:true,unlocked:true};savePuzzle();puzzleLocked=false;closeForm.hidden=false;document.querySelector('#sleep-comparison').hidden=true;puzzleNext.hidden=true;
    document.body.classList.add('door-unlocked');
    robotText(`Accès autorisé${player.name ? `, ${player.name}` : ''}. Nous pouvons poursuivre.\n\nFragment NOCTIS 1/9 obtenu.`);
    closeForm.querySelector('button').focus();
    discovery.close();
    resynchronize(sound,reducedMotion.matches).then(()=>{ setExploration(true); viewport.focus({preventScroll:true}); });
  }else if(puzzlePhase==='exit'){
    sound.effect('open');
    discovery.close(); enterRoomTwo();
  }
});
function showExit(){robotText(`Accès autorisé${player.name ? `, ${player.name}` : ''}. La première porte est déverrouillée.`);puzzlePhase='exit';puzzleNext.textContent='Quitter la chambre';puzzleNext.hidden=false;}
discovery.addEventListener('cancel',e=>{if(puzzleLocked)e.preventDefault();});
closeForm.addEventListener('submit',e=>{if(puzzleLocked)e.preventDefault();});
if(puzzleState.unlocked)document.body.classList.add('door-unlocked');
function resetCurrentRoom(){
  const roomTwo=document.body.classList.contains('room-two');
  let saved=true;
  const keys=roomTwo?[n2Key,scienceKey,n2FinalKey,adventureKey,lightingKey]:[examinedKey,journalKey,puzzleKey];
  for(const key of keys){try{localStorage.removeItem(key);}catch{saved=false;}}
  if(roomTwo){
    resetTransmission();clearTimeout(lightingTimer);
    lighting={stage:'unseen',expiresAt:0};
    adventure=emptyAdventure();
    syncAdventureView();
    n2Seen.clear();
    scienceRead.clear();
    n2Final={step:0,evening:false,unlocked:false,fragment:false};
    n2Attempts=[0,0,0];
    n2RobotLine=0;
    n2Announced=false;
    document.body.classList.remove('n2-light-adjusted','n2-door-unlocked','n2-evening');
    if(discovery.open)discovery.close();
    startN2Exploration();
    document.querySelector('#discovery-text').textContent='Les découvertes de cette pièce ont été réinitialisées. Examine les objets pour retrouver les indices et refaire l’analyse du sommeil.';
  }else{
    firstSignal.reset();
    examined.clear();
    robotLine=0;
    puzzleState={correct:false,unlocked:false};
    puzzleLocked=false;
    document.body.classList.remove('door-unlocked');
    if(discovery.open)discovery.close();
    resetPuzzleUI();
    markExamined();
    document.querySelector('#discovery-title').textContent='EXPLORATION RÉINITIALISÉE';
    document.querySelector('#discovery-text').textContent='Tu peux redécouvrir les objets et consulter le journal de sommeil pour refaire l’énigme.';
    journal.hidden=true;
    journalNext.hidden=true;
    discovery.showModal();
  }
  if(!saved)document.querySelector('#discovery-save').textContent='Réinitialisation effectuée pour cette session. Le navigateur ne permet pas de modifier la sauvegarde.';
}



// N01-S : démarrage explicite, un seul contexte et une seule ambiance.
const toggleSound=document.querySelector('#audio-toggle');
const volumeSound=document.querySelector('#audio-volume');
function updateSoundControls(){toggleSound.setAttribute('aria-pressed',String(sound.enabled));toggleSound.textContent=sound.enabled?'Couper le son':'Activer le son';volumeSound.value=String(Math.round(sound.volume*100));}
function beginAudioGame(enabled){
 if(document.querySelector('#audio-start').hidden)return;
 document.querySelector('#start-sound').disabled=true;
 const readiness=sound.enable(enabled); // jamais attendu par le déroulement visuel
 document.body.classList.remove('audio-gated');document.querySelector('#audio-start').hidden=true;
 gameStarted=true;roomClock.elapsed=0;roomClock.checkpoint(performance.now(),!document.hidden);updateClock();
 updateSoundControls();playWake();
 readiness.then(ok=>{if(enabled&&!ok)document.querySelector('#audio-feedback').textContent='Son indisponible. Tu peux continuer sans son.';updateSoundControls();});
}
// Accueil autonome et montage fixe : aucun téléchargement ne bloque le réveil.
try{if(!localStorage.getItem('noctis.audio.v1'))sound.enabled=true;}catch{}
const welcomeVolume=document.querySelector('#welcome-volume');
welcomeVolume.value=String(Math.round(sound.enabled?sound.volume*100:0));
welcomeVolume.addEventListener('input',()=>{sound.setVolume(Number(welcomeVolume.value)/100);sound.enable(Number(welcomeVolume.value)>0);updateSoundControls();});
const frameUrls=Array.from({length:24},(_,i)=>`./assets/connection/frame-${String(i+1).padStart(2,'0')}.webp`);
const readyFrames=new Set();
let framesLoaded;
function loadConnectionFrames(){
 if(!framesLoaded)framesLoaded=Promise.all(frameUrls.map(url=>new Promise(resolve=>{const image=new Image();image.onload=()=>{readyFrames.add(url);resolve();image.onload=null;image.onerror=null;};image.onerror=()=>resolve();image.src=url;})));
 return framesLoaded;
}

let connecting=false,connectTimer,connectionNodes=[];
function stopConnectionSound(){for(const node of connectionNodes)try{node.stop();}catch{}connectionNodes=[];}
function connectionPulse(i){stopConnectionSound();const node=sound.tone(240+i*19.5,.075,0,.03,'sine',0,340+i*20);if(node)connectionNodes.push(node);}
function startConnection(){
 if(connecting)return;connecting=true;document.querySelector('#audio-start').inert=true;document.querySelector('#start-sound').disabled=true;
 sound.enable(sound.enabled);const panel=document.querySelector('#cortex-connect');panel.hidden=false;
 let index=0,finished=false;
 const finish=()=>{if(finished)return;finished=true;clearTimeout(connectTimer);stopConnectionSound();document.querySelector('#connection-label').textContent='CORTEX — CONNEXION ÉTABLIE';document.querySelector('#connection-progress').value=24;document.querySelector('#skip-connect').hidden=true;const n=sound.tone(660,.35,0,.035,'sine',0,880);if(n)connectionNodes.push(n);connectTimer=setTimeout(()=>{stopConnectionSound();panel.classList.add('connection-blackout');sound.wake();firstSignal.wake();connectTimer=setTimeout(()=>{sound.stopWake();firstSignal.endWake();panel.hidden=true;beginAudioGame(sound.enabled);},2000);},650);};
 document.querySelector('#skip-connect').onclick=finish;
 const advance=()=>{if(finished)return;if(index>=24){finish();return;}const url=frameUrls[index];document.querySelector('#connection-frame').src=url;document.querySelector('#connection-progress').value=index+1;document.querySelector('#connection-label').textContent=['INITIALISATION CORTEX','CARTOGRAPHIE NEURONALE','SYNCHRONISATION CONSCIENCE','CONNEXION CORTEX'][Math.floor(index/6)];connectionPulse(index);const delay=[450,250,150,100][Math.floor(index/6)];index++;connectTimer=setTimeout(advance,delay);};
 if(reducedMotion.matches)finish();else {document.querySelector('#connection-label').textContent='PRÉPARATION DE LA CONNEXION';Promise.race([loadConnectionFrames(),new Promise(resolve=>setTimeout(resolve,2500))]).then(()=>{if(!finished)advance();});}
}
document.querySelector('#start-sound').addEventListener('click',()=>{
 if(laboratory.canResume()){resumeLaboratory();return;}
 startConnection();
});
if(player.completed){const resume=document.createElement('button');resume.type='button';resume.id='resume-game';resume.textContent='Reprendre sans la connexion';resume.addEventListener('click',()=>laboratory.canResume()?resumeLaboratory():beginAudioGame(sound.enabled));document.querySelector('.welcome-copy').append(resume);}
document.querySelector('#connection-frame').addEventListener('error',e=>{if(!e.target.src.endsWith('/noctis-pre-alpha/assets/cortex-welcome.webp'))e.target.src='./assets/cortex-welcome.webp';});
toggleSound.addEventListener('click',async()=>{const requested=!sound.enabled;if(!requested)orbiVoice.stop();const ok=await sound.enable(requested);document.querySelector('#audio-feedback').textContent=requested&&!ok?'Son indisponible dans ce navigateur.':'';updateSoundControls();});
volumeSound.addEventListener('input',()=>sound.setVolume(Number(volumeSound.value)/100));
document.addEventListener('visibilitychange',()=>{if(document.hidden)orbiVoice.stop();sound.visibility();});
let wasSpeaking=false;
const mixObserver=new MutationObserver(()=>{
 const speaking=document.body.classList.contains('orbi-speaking');
 const busy=speaking||!panel.hidden||discovery.open;
 sound.duck(busy);
 if(document.body.classList.contains('room-three')&&sound.ctx&&sound.amb)sound.amb.gain.setTargetAtTime(0,sound.ctx.currentTime,.3);
 if(wasSpeaking&&!speaking){orbiVoice.stop();sound.effect('end');}wasSpeaking=speaking;
});
mixObserver.observe(document.body,{attributes:true,attributeFilter:['class'],subtree:false});
mixObserver.observe(discovery,{attributes:true,attributeFilter:['open']});
mixObserver.observe(panel,{attributes:true,attributeFilter:['hidden']});

updateSoundControls();

// N02-A : navigation de scène sans réinitialiser le moteur ou les données.
const roomOneView={src:room.getAttribute('src'),alt:room.alt,width:room.width,height:room.height};
let roomTransition=false;
async function enterRoomTwo(developer=false){
 if((!puzzleState.unlocked&&!developer)||roomTransition)return;
 roomTransition=true;
 try{
  const nextImage=new Image();nextImage.src='assets/noctis-study.webp';await nextImage.decode();
  document.body.classList.add('room-transition');
  await new Promise(resolve=>setTimeout(resolve,reducedMotion.matches?0:300));
  setExploration(false);stopScene();
  room.src=nextImage.src;room.width=nextImage.naturalWidth;room.height=nextImage.naturalHeight;
  room.alt='Quartiers personnels, espace des écrans : grand bureau, écran holographique, tablette, boisson énergisante, objets personnels, baie sur la station orbitale, ORBI-7 et nouvelle porte.';
  document.body.classList.add('room-two');
  document.querySelector('#return-room-one').hidden=false;
  document.querySelector('.caption').textContent='La chambre des écrans';
  startN2Exploration();
  centerScene();viewport.focus({preventScroll:true});
 }catch{robotText('Le nouvel espace ne peut pas se charger. Tu peux réessayer en ouvrant la porte.');discovery.showModal();}
 finally{document.body.classList.remove('room-transition');roomTransition=false;}
}
document.querySelector('#return-room-one').addEventListener('click',()=>{
 if(roomTransition)return;
 document.querySelector('#n2-objects').inert=true;document.querySelector('#n2-progress').hidden=true;
 document.body.classList.remove('room-two');room.src=roomOneView.src;room.alt=roomOneView.alt;room.width=roomOneView.width;room.height=roomOneView.height;
 document.querySelector('#return-room-one').hidden=true;document.querySelector('.caption').textContent='Le calme avant l’éveil.';setExploration(true);centerScene();viewport.focus({preventScroll:true});
});

// N02-B : mêmes panneaux et moteur sonore ; indices indépendants de N01.
const n2Key='noctis.n02.clues.v1';
const n2Clues=['computer','drink','tablet','light'];
let n2Seen=new Set(),n2RobotLine=0;
try{const saved=JSON.parse(localStorage.getItem(n2Key));if(Array.isArray(saved))n2Seen=new Set(saved.filter(k=>n2Clues.includes(k)));}catch{}
function updateN2Progress(){
 document.querySelector('#n2-progress').textContent=`Découvertes importantes : ${scienceRead.size} / 4`;
 document.querySelectorAll('[data-n2]').forEach(b=>b.setAttribute('title',n2Seen.has(b.dataset.n2)?'Indice déjà découvert, consulter à nouveau':'Examiner'));
 document.querySelectorAll('[data-clue-indicator]').forEach(marker=>{
  const key=marker.dataset.clueIndicator;
  marker.dataset.state=key==='light'?lighting.stage:scienceRead.has(key)?'discovered':'unseen';
  marker.title=key==='light'?lightingStatus():scienceRead.has(key)?'Découverte consultée':'À découvrir';
 });
 syncAdventureView();
}

function n2Panel(title,text,robot=false){
 discovery.dataset.kind=title==='ORBI-7'?'robot':title.includes('PORTE')||title.includes('PASSAGE')?'door':title==='MODE SOIRÉE'?'light':lastObject?.dataset.n2||'robot';
 resetPuzzleUI();discoveryObject='n2';journal.hidden=true;journalNext.hidden=true;
 document.querySelector('#discovery-title').textContent=title;
 document.querySelector('#discovery-text').textContent=text;
 document.querySelector('#discovery-save').textContent='';
 document.body.classList.toggle('orbi-speaking',robot);
 if(robot)orbiVoice.say('hint');
 discovery.showModal();
}
function startN2Exploration(){
 applyLightingView();document.body.classList.toggle('n2-door-unlocked',n2Final.unlocked);n2Announced=false;
 syncAdventureView();
 document.querySelector('#n2-objects').inert=false;
 document.querySelector('#n1-progress').hidden=true;
 document.querySelector('#n2-progress').hidden=false;updateN2Progress();
 const address=player.name?`${player.name}, nous`:'Nous';
 n2Panel('ORBI-7',`${address} avons établi que ta nuit n’a duré que 3 h 30. Il reste à comprendre ce qui a repoussé ton coucher. Les équipements ont conservé des traces de la soirée.`,true);
}
document.querySelectorAll('[data-n2]').forEach(button=>button.addEventListener('click',()=>{
 if(!document.body.classList.contains('room-two')||roomTransition)return;
 const key=button.dataset.n2;lastObject=button;
 if(key==='light'){handleLightingInteraction();return;}
 if(n2Clues.includes(key))n2Seen.add(key);
 let saved=true;try{localStorage.setItem(n2Key,JSON.stringify([...n2Seen]));}catch{saved=false;}
 updateN2Progress();
 const address=player.name?`, ${player.name}`:'';
 const remaining=n2Clues.filter(k=>k==='light'?!['anomaly','repaired'].includes(lighting.stage):!scienceRead.has(k));
 const locations={computer:'le grand écran holographique, à gauche sur le bureau',drink:'la canette posée au milieu du bureau',tablet:'la tablette posée sur la partie droite du bureau',light:'la lampe verticale, à droite du bureau, près de la porte'};
 const clues=remaining.length?remaining.map(key=>{
  if(key==='light'&&lighting.stage==='preview')return `Observe la lampe près de la porte${address}. Le jaune est-il conservé ? Attends son retour au bleu, puis réactive-la pour examiner le dysfonctionnement.`;
  if(key==='light'&&lighting.stage==='reverted')return `La lampe près de la porte est revenue au bleu${address}. Clique de nouveau dessus : nous devons comprendre pourquoi le réglage ne tient pas.`;
  if(key==='tablet')return `Examine ${locations[key]}${address}. Ouvre son document, puis utilise « Enregistrer la lecture » pour conserver cette découverte.`;
  return `Il reste un indice à examiner${address} : ${locations[key]}. Clique directement dessus.`;
 }):[`Les découvertes scientifiques sont réunies${address}. Le protocole nocturne est accessible en bas de l’écran.`];
 const texts={computer:"Historique d’utilisation détecté. Activité prolongée pendant la nuit.",drink:"Cette canette était sur le bureau cette nuit. Je me souviens l’avoir ouverte pour rester éveillé.",tablet:"Archive personnelle disponible. Certaines habitudes de la soirée restent à examiner.",light:"L’intensité de cet éclairage semble peu adaptée à une préparation au repos.",robot:clues[n2RobotLine++%clues.length],door:"Analyse incomplète. Il reste des éléments à comprendre dans cette chambre."};
 const titles={computer:'ORDINATEUR PRINCIPAL',drink:'BOISSON ÉNERGISANTE',tablet:'TABLETTE PERSONNELLE',light:'ORBI-7 · ÉCLAIRAGE',robot:'ORBI-7',door:'PORTE VERROUILLÉE'};
 if(key==='drink'){sound.texture(.18,0,1600,.12);sound.tone(360,.12,0,.025,'triangle',.03,260);}
 else sound.effect({computer:'computer',tablet:'clock',light:'close',robot:'servo',door:'locked'}[key]);
 n2Panel(titles[key],texts[key],key==='robot'||key==='light');
 showScience(key);
 if(!saved)document.querySelector('#discovery-save').textContent='Sauvegarde indisponible : indices conservés pendant cette session.';
}));
discovery.addEventListener('close',()=>{if(document.body.classList.contains('room-two'))(lastObject?.dataset.n2?lastObject:document.querySelector('#return-room-one')).focus({preventScroll:true});});

// N02-C : découvertes scientifiques, indépendantes des examens N02-B.
const scienceKey='noctis.n02.science.v1';
let scienceRead=new Set();
try{const saved=JSON.parse(localStorage.getItem(scienceKey));if(Array.isArray(saved))scienceRead=new Set(saved.filter(k=>n2Clues.includes(k)));}catch{}
function rememberScience(key){scienceRead.add(key);try{localStorage.setItem(scienceKey,JSON.stringify([...scienceRead]));}catch{document.querySelector('#discovery-save').textContent='Sauvegarde indisponible : découverte conservée pendant cette session.';}updateN2Progress();}
const scienceSource='';
function showScience(key,tabletTab='light'){
 if(!n2Clues.includes(key))return;
 const doc=document.querySelector('#n2-document'),title=document.querySelector('#discovery-title'),text=document.querySelector('#discovery-text');doc.hidden=false;
 if(key==='computer'){
  title.textContent='HISTORIQUE NOCTURNE';text.textContent=`${player.name?player.name+', ton':'Ton'} ordinateur est resté actif très tard. Et cette boisson n’a probablement pas aidé non plus…`;
  document.body.classList.add('orbi-speaking');orbiVoice.say('curious');
  doc.innerHTML='<div class="history-heading"><span>◷</span><div><small>ARCHIVES PERSONNELLES</small><strong>Traces d’une nuit écourtée</strong></div></div><ol class="night-timeline"><li><span class="history-icon">◒</span><time>21 h 00</time><strong>Boisson énergisante</strong><small>La soirée commence</small></li><li><span class="history-icon">▣</span><time>22 h 30</time><strong>Ordinateur allumé</strong><small>Une activité prolongée</small></li><li><span class="history-icon">◉</span><time>02 h 45</time><strong>Dernière activité</strong><small>L’écran est encore utilisé</small></li><li><span class="history-icon">☾</span><time>03 h 00</time><strong>Fin de l’activité · coucher</strong><small>Le coucher est repoussé</small></li></ol>';rememberScience(key);
 }else if(key==='tablet'){
  title.textContent='ARCHIVE CORTEX';text.textContent='Lumière, mélatonine et endormissement';
  renderTablet(doc,{read:scienceRead.has('tablet'),onRead:()=>rememberScience('tablet'),tab:tabletTab});
 }else if(key==='drink'){
  title.textContent='CAFÉINE — SUBSTANCE STIMULANTE';
  doc.innerHTML='<p>La caféine peut favoriser le maintien de l’éveil et perturber l’endormissement lorsqu’elle est consommée tard dans la journée.</p>'+scienceSource;rememberScience(key);
 }else{
  const warm=document.body.classList.contains('n2-light-adjusted');
  text.textContent=warm?'Le panneau est maintenant tamisé et plus chaud. Observe la différence.':'Le panneau retrouve une lumière intense, froide et bleutée.';
  doc.innerHTML=`<p class="light-state">${warm?'◐ Tamisé · chaud':'☀ Intense · froid'}</p><p>La lumière du soir peut influencer l’horloge biologique.</p>`;
  syncLightingDiscovery();
 }
 appendAdventureControls(key,doc);
 title.tabIndex=-1;title.focus({preventScroll:true});discovery.scrollTop=0;
}

// N02-D : protocole final, sauvegarde indépendante et documents toujours accessibles.
const n2FinalKey='noctis.n02.final.v1';
let n2Final={step:0,evening:false,unlocked:false,fragment:false};
try{const s=JSON.parse(localStorage.getItem(n2FinalKey));if(s)n2Final={step:Math.max(0,Math.min(3,Number(s.step)||0)),evening:s.evening===true,unlocked:s.unlocked===true&&s.step===3&&s.evening===true,fragment:s.fragment===true&&s.unlocked===true};}catch{}
let n2Announced=false,n2Attempts=[0,0,0];
const finalQuestions=[
 {q:'Quel est le rôle de la mélatonine dans ton sommeil ?',a:['Elle maintient le cerveau éveillé toute la nuit.','Elle participe à la régulation du rythme veille-sommeil et signale l’arrivée de la nuit.','Elle remplace les heures de sommeil manquantes.'],ok:[1],hint:['Pense au signal que ton organisme reçoit quand la nuit arrive.','Relis dans la tablette le passage sur le rythme veille-sommeil.'],explain:'La mélatonine participe à la régulation du rythme veille-sommeil et signale l’arrivée de la nuit. Elle ne remplace pas le sommeil.'},
 {q:'Pourquoi utiliser un écran lumineux tard le soir peut-il retarder ton endormissement ?',a:['Parce que la lumière reçue en soirée peut retarder la sécrétion de mélatonine.','Parce que les écrans empêchent définitivement de dormir.','Parce que la lumière bleue augmente toujours le besoin de sommeil.'],ok:[0],hint:['Observe le lien entre lumière du soir et signal nocturne.','La tablette explique un retard possible, pas une impossibilité définitive de dormir.'],explain:'La lumière reçue le soir peut retarder la sécrétion de mélatonine et l’endormissement. L’effet dépend de l’exposition ; les activités stimulantes et la caféine peuvent aussi intervenir.'},
 {q:'Quelles habitudes pourrais-tu modifier pour favoriser ton endormissement ?',a:['Réduire l’utilisation des écrans avant le coucher.','Boire davantage de caféine tard le soir.','Privilégier une lumière douce en soirée.','Éviter les boissons caféinées en soirée.'],ok:[0,2,3],hint:['Compare tes choix avec les découvertes sur la lumière, les activités stimulantes et la caféine.','La caféine est un stimulant. Cherche les trois habitudes qui favorisent une soirée plus calme.'],explain:'Réduire les écrans avant le coucher, privilégier une lumière douce et éviter la caféine en soirée peuvent favoriser l’endormissement. Plusieurs facteurs peuvent contribuer au coucher tardif.'}
];
function saveN2Final(){try{localStorage.setItem(n2FinalKey,JSON.stringify(n2Final));}catch{document.querySelector('#discovery-save').textContent='Sauvegarde indisponible : progression conservée pendant cette session.';}document.body.classList.toggle('n2-door-unlocked',n2Final.unlocked);document.body.classList.toggle('n2-evening',n2Final.evening&&document.body.classList.contains('n2-light-adjusted'));}
function finalButton(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;if(label.startsWith('Reprendre')||label.startsWith('Retour à la réparation'))b.classList.add('help-required');if(label.startsWith('Retour au protocole')||label.startsWith('Revenir au protocole'))b.dataset.protocolReturn='true';b.addEventListener('click',action);return b;}
function showN2Final(){
 n2Announced=true;
 if(!protocolAvailable()){showNightMission();return;}
 if(n2Final.unlocked){showDoorAuthorized();return;}
 if(!adventure.introduced||!adventureReady()){showNightMission();return;}
 if(n2Final.step===3){unlockN2();return;}
 const step=n2Final.step,item=finalQuestions[step];
 const scenes=[
  {title:'Le signal de la nuit',symbol:'☾',context:'La nuit arrive. Ton organisme reçoit un signal. Identifie la mission de la mélatonine.',short:['Maintenir l’éveil','Réguler le rythme','Compenser le manque']},
  {title:'L’écran encore allumé',symbol:'▣',context:'02 h 45. L’ordinateur est toujours actif. Analyse ce que la lumière du soir peut changer.',short:['Retarder le signal nocturne','Bloquer tout sommeil','Augmenter le besoin de sommeil']},
  {title:'Recomposer ta soirée',symbol:'◷',context:'Reprends les commandes de ta soirée. Choisis trois actions qui pourraient faciliter ton endormissement.',short:['Réduire les écrans','Ajouter de la caféine','Adoucir la lumière','Éviter la caféine']}
 ];
 const scene=scenes[step];
 n2Panel('PROTOCOLE NOCTIS',player.name?player.name+', à toi de mener l’analyse.':'À toi de mener l’analyse.',true);
 orbiVoice.say('question');
 const doc=document.querySelector('#n2-document');doc.hidden=false;doc.replaceChildren();
 const shell=document.createElement('section');shell.className='n2-final-shell';doc.append(shell);
 const progress=document.createElement('ol');progress.className='n2-analysis-progress';progress.setAttribute('aria-label','Progression de l’analyse');
 ['Mélatonine','Écrans','Habitudes'].forEach((name,i)=>{
  const part=document.createElement('li');part.textContent=(i<step?'✓ ':String(i+1)+' ')+name;
  if(i===step)part.setAttribute('aria-current','step');
  if(i<step)part.className='complete';
  progress.append(part);
 });shell.append(progress);
 const sceneBox=document.createElement('div');sceneBox.className='n2-case-scene';
 const symbol=document.createElement('span');symbol.className='n2-case-symbol';symbol.setAttribute('aria-hidden','true');symbol.textContent=scene.symbol;
 const context=document.createElement('div');const title=document.createElement('h3');title.textContent=scene.title;
 const situation=document.createElement('p');situation.textContent=scene.context;context.append(title,situation);sceneBox.append(symbol,context);shell.append(sceneBox);
 const form=document.createElement('form');form.className='n2-final-form';
 const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=item.q;field.append(legend);
 const instructions=document.createElement('p');instructions.className='n2-selection-instruction';instructions.textContent=step===2?'Sélectionne 3 actions.':'Sélectionne une réponse.';field.append(instructions);
 const choices=document.createElement('div');choices.className='n2-answer-grid';
 item.a.forEach((answer,i)=>{
  const label=document.createElement('label'),input=document.createElement('input');input.type=step===2?'checkbox':'radio';input.name='n2-answer';input.value=String(i);
  const marker=document.createElement('span');marker.className='n2-answer-marker';marker.textContent=String.fromCharCode(65+i);marker.setAttribute('aria-hidden','true');
  const copy=document.createElement('span');copy.className='n2-answer-copy';const heading=document.createElement('strong');heading.textContent=scene.short[i];const detail=document.createElement('span');detail.textContent=answer;copy.append(heading,detail);
  input.addEventListener('change',()=>{
   sound.effect('clock');
   instructions.textContent=step===2?form.querySelectorAll('input:checked').length+' / 3 actions sélectionnées.':'Réponse sélectionnée. Tu peux la valider.';
  });label.append(input,marker,copy);choices.append(label);
 });field.append(choices);
 const hint=document.createElement('p');hint.setAttribute('role','status');hint.className='n2-final-hint';
 const submit=document.createElement('button');submit.className='n2-validate';submit.type='submit';submit.textContent=step===2?'Valider mon plan de soirée →':'Valider mon analyse →';
 form.append(field,hint,submit);shell.append(form);
 const help=document.createElement('p');help.className='n2-analysis-help';help.textContent='Besoin d’un indice ? Ferme ce panneau pour relire les archives, puis retrouve ORBI-7. Ta progression est conservée.';shell.append(help);
 form.addEventListener('submit',e=>{e.preventDefault();const chosen=[...form.querySelectorAll('input:checked')].map(i=>Number(i.value));if(chosen.length!==item.ok.length||!item.ok.every(i=>chosen.includes(i))){orbiVoice.say('wrong');hint.textContent=item.hint[Math.min(n2Attempts[step]++,item.hint.length-1)];return;}
 n2Final.step=step+1;saveN2Final();orbiVoice.say('correct');sound.effect('correct');doc.replaceChildren();const success=document.createElement('section');success.className='n2-final-shell n2-analysis-success';const badge=document.createElement('span');badge.className='n2-success-badge';badge.textContent='✓';badge.setAttribute('aria-hidden','true');const heading=document.createElement('h3');heading.textContent=scene.title+' · validé';const explanation=document.createElement('p');explanation.textContent=item.explain;success.append(badge,heading,explanation,finalButton(step===2?'Déverrouiller la porte →':'Poursuivre l’analyse →',showN2Final));doc.append(success);document.querySelector('#discovery-text').textContent='Analyse validée.';doc.querySelector('button').focus();});
 legend.tabIndex=-1;legend.focus();discovery.scrollTop=0;
}
function unlockN2(){
 if(n2Final.unlocked||n2Final.step!==3||!adventureReady()||!document.body.classList.contains('n2-light-adjusted'))return;
 n2Final.evening=true;n2Final.unlocked=true;saveN2Final();
 document.body.classList.add('n2-evening');
 syncAdventureView();
 sound.effect('correct');
 setTimeout(()=>sound.effect('unlock'),180);
 showDoorAuthorized();
 orbiVoice.say('praise');
}

discovery.addEventListener('close',()=>syncAdventureView());
document.querySelectorAll('[data-n2]').forEach(b=>{b.addEventListener('click',e=>{if(!document.body.classList.contains('room-two'))return;if(b.dataset.n2==='robot'&&protocolAvailable()){e.stopImmediatePropagation();lastObject=b;showRobotCheckpoint();}if(b.dataset.n2==='door'&&n2Final.unlocked){e.stopImmediatePropagation();lastObject=b;attemptN2Exit();}},true);
});
// Confirmation intégrée : fonctionne également dans l’iframe de CORTEX.
const resetConfirm=document.createElement('dialog');
resetConfirm.id='reset-confirm';
resetConfirm.setAttribute('aria-labelledby','reset-confirm-title');
resetConfirm.innerHTML='<h2 id="reset-confirm-title">Recommencer cette pièce ?</h2><p>Les découvertes et les réponses de cette pièce seront effacées. Sa porte sera de nouveau verrouillée.</p><div><button type="button" data-reset-cancel>Annuler</button><button type="button" data-reset-accept>Oui, recommencer la pièce</button></div>';
document.body.append(resetConfirm);
document.querySelector('#reset-game').addEventListener('click',()=>{
 resetConfirm.showModal();
 resetConfirm.querySelector('[data-reset-cancel]').focus();
});
resetConfirm.querySelector('[data-reset-cancel]').addEventListener('click',()=>resetConfirm.close());
resetConfirm.querySelector('[data-reset-accept]').addEventListener('click',()=>{resetConfirm.close();resetCurrentRoom();});
resetConfirm.addEventListener('close',()=>document.querySelector('#reset-game').focus({preventScroll:true}));


// N02 aventure : configuration, chronologie et accès technique.
const adventureKey='noctis.n02.adventure.v1';
function emptyAdventure(){return {introduced:false,light:false,screens:false,caffeine:false,timeline:false,protocolComplete:false,secretRevealed:false,order:['last','drink','bed','computer']};}
let adventure=emptyAdventure();
let hasSecretSave=false;
try{
 const saved=JSON.parse(localStorage.getItem(adventureKey));
 if(saved){
  hasSecretSave=Object.hasOwn(saved,'secretRevealed');
  for(const key of ['introduced','light','screens','caffeine','timeline','protocolComplete','secretRevealed'])adventure[key]=saved[key]===true;
  if(saved.screenSchedule&&[1350,1380,1410].includes(saved.screenSchedule.bedtime)&&Number.isInteger(saved.screenSchedule.shutdown)&&saved.screenSchedule.shutdown>=saved.screenSchedule.bedtime-60&&saved.screenSchedule.shutdown<=saved.screenSchedule.bedtime-30)adventure.screenSchedule=saved.screenSchedule;
  if(Array.isArray(saved.pausePlan)&&saved.pausePlan.length===2&&saved.pausePlan.includes('book')&&saved.pausePlan.includes('music'))adventure.pausePlan=['book','music'];
  if(Array.isArray(saved.order)&&saved.order.length===4&&new Set(saved.order).size===4&&saved.order.every(id=>adventure.order.includes(id)))adventure.order=saved.order;
 }else if(n2Final.unlocked){
  // Compatibilité : une ancienne réussite conserve son fragment et son accès.
  adventure={introduced:true,light:true,screens:true,caffeine:true,timeline:true,protocolComplete:true,secretRevealed:true,order:['drink','computer','last','bed']};
 }
}catch{}
const lightingKey='noctis.n02.lighting.v1';
let lighting={stage:'unseen',expiresAt:0};
let lightingTimer;
try{
 const saved=JSON.parse(localStorage.getItem(lightingKey));
 if(saved&&['unseen','preview','reverted','anomaly','repaired'].includes(saved.stage)){
  lighting={stage:saved.stage,expiresAt:Number(saved.expiresAt)||0};
 }else if(adventure.light||n2Final.unlocked)lighting.stage='repaired';
}catch{}
adventure.light=lighting.stage==='repaired';
if(adventure.light&&adventure.screens&&adventure.caffeine&&adventure.timeline){adventure.protocolComplete=true;n2Final.evening=true;}
if(n2Final.unlocked&&!hasSecretSave)adventure.secretRevealed=true;
const missionControl=document.querySelector('#night-mission');
missionControl.addEventListener('click',showNightMission);
document.querySelector('.masthead').append(missionControl);
const missionArrow=document.createElement('span');missionArrow.id='protocol-arrow';missionArrow.textContent='←';missionArrow.setAttribute('aria-hidden','true');
missionControl.insertAdjacentElement('afterend',missionArrow);
const secretNotice=document.createElement('span');secretNotice.id='secret-discovery-status';secretNotice.setAttribute('role','status');
secretNotice.textContent='Accès secret découvert · Cherche près de la porte.';
missionArrow.insertAdjacentElement('afterend',secretNotice);

const clueIndicators=document.createElement('div');clueIndicators.id='n2-clue-indicators';clueIndicators.setAttribute('aria-label','État des découvertes de la chambre');
[['computer','PC'],['tablet','Tablette'],['drink','Boisson'],['light','Éclairage']].forEach(([key,label])=>{
 const marker=document.createElement('span');marker.dataset.clueIndicator=key;marker.textContent=label;clueIndicators.append(marker);
});
document.querySelector('#n2-progress').insertAdjacentElement('afterend',clueIndicators);

const secretPanel=finalButton('Accès technique dissimulé',showSecretTransition);
secretPanel.id='secret-panel';
secretPanel.setAttribute('aria-label','Ouvrir l’accès technique vers le laboratoire des cycles du sommeil');
document.querySelector('#n2-objects').append(secretPanel);
const secretAccess=finalButton('Traverser le passage secret →',showSecretTransition);
secretAccess.id='secret-access';
document.querySelector('.view-tools').append(secretAccess);
const screenRest=document.createElement('span');
screenRest.className='screen-rest-overlay';screenRest.setAttribute('aria-hidden','true');
document.querySelector('#n2-objects').append(screenRest);
const unknownSignal=document.createElement('span');
unknownSignal.className='unknown-signal';unknownSignal.innerHTML='<i aria-hidden="true">◈</i><span>Signal inconnu détecté<small>Inspecte le panneau près de la porte</small></span>';unknownSignal.setAttribute('role','status');
document.querySelector('#n2-objects').append(unknownSignal);

function saveAdventure(){
 if(!adventureReady()&&!n2Final.unlocked)adventure.protocolComplete=false;
 try{localStorage.setItem(adventureKey,JSON.stringify(adventure));}
 catch{document.querySelector('#discovery-save').textContent='Sauvegarde indisponible : mission conservée pendant cette session.';}
 syncAdventureView();
}
function adventureReady(){return lighting.stage==='repaired'&&adventure.light&&adventure.screens&&adventure.caffeine&&adventure.timeline;}
function syncAdventureView(){
 const available=protocolAvailable();
 missionControl.hidden=false;
 secretNotice.hidden=!adventure.secretRevealed;
 missionArrow.hidden=!available||adventure.protocolComplete||n2Final.unlocked;
 document.body.classList.toggle('night-mission-active',adventure.introduced&&available);
 document.body.classList.toggle('night-screens-rest',adventure.screens);
 document.body.classList.toggle('night-caffeine-set',adventure.caffeine);
 document.body.classList.toggle('secret-revealed',adventure.secretRevealed&&n2Final.unlocked);
 document.body.classList.toggle('robot-quiz-ready',adventure.protocolComplete&&!n2Final.unlocked);
 missionControl.textContent=adventure.secretRevealed?'Protocole nocturne · consulter':n2Final.unlocked?'Protocole nocturne · validé':adventure.protocolComplete?'Protocole réussi · Voir ORBI-7':adventure.introduced?'Protocole nocturne · '+[adventure.light,adventure.screens,adventure.caffeine,adventure.timeline].filter(Boolean).length+'/4':'Protocole nocturne';
 secretPanel.hidden=!adventure.secretRevealed||!n2Final.unlocked;
 secretAccess.hidden=secretPanel.hidden;
 document.querySelector('[data-n2="door"]').setAttribute('aria-label',n2Final.unlocked?'Sortir par la porte déverrouillée':'Examiner la porte suivante');
}
function missionDocument(){
 const doc=document.querySelector('#n2-document');doc.hidden=false;
 const shell=document.createElement('section');shell.className='n2-final-shell adventure-shell';doc.append(shell);return shell;
}
function showNightMission(){
 const ready=protocolAvailable();

 adventure.introduced=true;
 adventure.light=lighting.stage==='repaired';
 saveAdventure();n2Announced=true;
 n2Panel('MISSION · RÉTABLIR LE PROTOCOLE NOCTURNE',
  (player.name?player.name+', prépare':'Prépare')+' les conditions d’une nuit plus reposante. Nous devons reprendre le contrôle des réglages de cette chambre.',true);
 discovery.dataset.kind='robot';
 const shell=missionDocument();
 const status=document.createElement('p');status.className='protocol-state';
 status.textContent=!ready?'Protocole nocturne · découvertes préalables à terminer':adventureReady()?'Chambre prête pour la nuit':'Configuration nocturne à restaurer';
 if(!ready){
  const prerequisites=document.createElement('p');
  const missing=['computer','tablet','drink'].filter(key=>!scienceRead.has(key));
  const labels={computer:'écran principal',tablet:'tablette',drink:'boisson'};
  prerequisites.textContent=(missing.length?'Consulte et enregistre les découvertes suivantes : '+missing.map(k=>labels[k]).join(', ')+'. ':'')+(!['anomaly','repaired'].includes(lighting.stage)?'Essaie le réglage de la lampe et observe son retour au bleu.':'');
  shell.append(prerequisites,finalButton('Consulter le document de la tablette →',()=>{
   lastObject=document.querySelector('[data-n2="tablet"]');n2Panel('TABLETTE PERSONNELLE','');showScience('tablet');
   document.querySelector('#n2-document').append(finalButton('Revenir au protocole nocturne →',showNightMission));
  }));
 }
 shell.append(status);
 const tasks=document.createElement('div');tasks.className='protocol-grid';
 const entries=[
  ['light','☾','Éclairage',adventure.light,'Tamisé et chaud','À régler sur le luminaire'],
  ['computer','▣','Écrans',adventure.screens,'Arrêt programmé','Choisir l’heure d’arrêt'],
  ['drink','◒','Caféine',adventure.caffeine,'Sans caféine le soir','Choisir une nouvelle habitude'],
  ['timeline','☾','Pause détente',adventure.timeline,'Pause sans écran préparée','Choisir deux activités calmes']
 ];
 entries.forEach(([object,icon,label,done,yes,no])=>{
  const button=finalButton('',()=>openMissionObject(object));
  button.className='protocol-task'+(done?' done':'');
  button.disabled=!ready;
  const symbol=document.createElement('span');symbol.className='protocol-icon';if(done)symbol.textContent='✓';else symbol.append(missionArt(object));
  const copy=document.createElement('span');const title=document.createElement('strong');title.textContent=label;
  const detail=document.createElement('small');detail.textContent=done?yes:no;copy.append(title,detail);button.append(symbol,copy);tasks.append(button);
 });shell.append(tasks);
 if(n2Final.unlocked){
  shell.append(finalButton(adventure.secretRevealed?'Traverser le passage secret →':'Rejoindre la porte et révéler le passage →',attemptN2Exit));
 }else if(adventureReady()){
  adventure.protocolComplete=true;saveAdventure();
  const next=finalButton('Retrouver ORBI-7 · valider mes découvertes →',showRobotCheckpoint);
  next.classList.add('help-required');shell.append(next);
 }
}
function openMissionObject(key){
 if(key==='timeline'){showEveningPause();return;}
 if(key==='computer'){showScreenProgrammer();return;}
 if(key==='drink'){showDrinkMission();return;}
 lastObject=document.querySelector('[data-n2="'+key+'"]');
 n2Panel(key==='light'?'RÉPARER L’ÉCLAIRAGE':'PRÉPARER LA SOIRÉE','');
 const shell=missionDocument();shell.classList.add('compact-settings');
 appendAdventureControls(key,shell);
 shell.append(finalButton('Aide · document de la tablette',()=>{n2Panel('ARCHIVE CORTEX','');showScience('tablet');document.querySelector('#n2-document').append(finalButton('Retour à la réparation',()=>openMissionObject(key)));}));

}
function showLightingQuiz(step=0){
 const questions=[
 {q:'Quel rôle joue la mélatonine ?',answers:['Elle signale l’arrivée de la nuit et participe au rythme veille-sommeil.','Elle maintient l’organisme en éveil.','Elle remplace le sommeil manquant.'],correct:0,hint:'Relis le premier paragraphe de la tablette : quel signal cette hormone transmet-elle ?',explain:'La mélatonine participe à la régulation du rythme veille-sommeil et signale la nuit.'},
 {q:'Que peut provoquer une lumière intense reçue le soir ?',answers:['Elle garantit un sommeil profond immédiat.','Elle peut retarder la sécrétion de mélatonine et l’endormissement.','Elle empêche définitivement de dormir.'],correct:1,hint:'Observe le schéma obscurité / lumière intense dans la tablette.',explain:'La lumière du soir peut retarder le signal nocturne. Son effet dépend notamment de l’intensité, de la durée et du moment d’exposition.'},
 {q:'Pourquoi conserver une lumière douce en soirée ?',answers:['Pour supprimer entièrement le besoin de sommeil.','Parce que seule la couleur compte, quelle que soit l’intensité.','Pour réduire l’exposition lumineuse et préparer une transition plus calme vers le sommeil.'],correct:2,hint:'Le réglage doit réduire l’intensité lumineuse. La lumière n’est pas le seul facteur qui influence le sommeil.',explain:'Une lumière douce limite l’exposition en soirée ; les activités stimulantes et la caféine peuvent aussi influencer l’endormissement.'}
 ];
 n2Panel('RECONFIGURATION · VÉRIFICATION SCIENTIFIQUE','');const doc=missionDocument(),item=questions[step];
 const progress=document.createElement('p');progress.className='journal-subtitle';progress.textContent='ÉCLAIRAGE · QUESTION '+(step+1)+' / 3';
 const title=document.createElement('h3');title.textContent=item.q;
 const form=document.createElement('form');form.className='protocol-console lighting-quiz';
 const group=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='Choisis une réponse';group.append(legend);
 item.answers.forEach((answer,index)=>{const label=document.createElement('label');label.style.cssText='display:flex;gap:12px;padding:14px;margin:8px 0;border:1px solid #7ac4d750;border-radius:6px;background:#102936';const input=document.createElement('input');input.type='radio';input.name='lighting-answer';input.value=index;input.required=true;label.append(input,document.createTextNode(answer));group.append(label);});
 const feedback=document.createElement('p');feedback.className='protocol-feedback';feedback.setAttribute('role','status');const submit=document.createElement('button');submit.type='submit';submit.textContent='Vérifier';
 form.append(group,feedback,submit);let correct=false;
 group.addEventListener('change',()=>{if(correct)return;feedback.textContent='Nouveau choix sélectionné. Clique sur Vérifier pour le valider.';submit.disabled=false;submit.textContent='Vérifier ma réponse';});
 form.addEventListener('submit',e=>{e.preventDefault();if(correct){if(step<2){showLightingQuiz(step+1);return;}lighting={stage:'repaired',expiresAt:0};clearTimeout(lightingTimer);adventure.light=true;persistLighting();syncLightingDiscovery();applyLightingView();saveAdventure();sound.effect('correct');orbiVoice.say('correct');if(adventureReady())finishNightProtocol();else {openMissionObject('light');guideProtocolReturn();}return;}
 const chosen=form.querySelector('input:checked');if(!chosen)return;if(Number(chosen.value)!==item.correct){feedback.textContent='ORBI-7 · '+item.hint+' Consulte le document de la tablette avec le bouton d’aide, puis modifie ta réponse et clique sur Vérifier.';group.disabled=false;submit.disabled=false;submit.textContent='Vérifier ma nouvelle réponse';chosen.focus({preventScroll:true});orbiVoice.say('hint');return;}correct=true;group.disabled=true;feedback.textContent='✓ '+item.explain;submit.textContent=step<2?'Question suivante →':'Valider la réparation de l’éclairage';orbiVoice.say('correct');});
 doc.append(progress,title,form,finalButton('Aide · lire la tablette',()=>{n2Panel('ARCHIVE CORTEX','');showScience('tablet');document.querySelector('#n2-document').append(finalButton('Reprendre la question '+(step+1),()=>showLightingQuiz(step)));}));
}
const protocolChoices={
 light:{title:'Quel éclairage pour préparer la nuit ?',choices:['Éclairage intense et froid','Éclairage tamisé et chaud'],correct:1,hint:'Compare l’éclairage proposé avec le signal nocturne décrit dans la tablette.',explain:'Réglage conservé. Une lumière douce le soir limite l’exposition lumineuse qui peut retarder l’endormissement.'},
 drink:{title:'Quelle habitude choisir en soirée ?',choices:['Éviter les boissons caféinées en soirée','Ajouter une boisson énergisante tard le soir'],correct:0,hint:'La caféine est une substance stimulante. Quel choix préparerait une soirée plus calme ?',explain:'Éviter la caféine en soirée peut faciliter l’endormissement, car elle peut maintenir l’éveil.'}
};
function appendAdventureControls(key,doc){
 if(!adventure.introduced||!protocolAvailable())return;
 if(key==='computer'){
  const actions=document.createElement('section');actions.className='protocol-console';
  const label=document.createElement('h3');label.textContent='Préparer la prochaine nuit';
  actions.append(label,finalButton(adventure.screens?'Consulter ou modifier l’arrêt programmé →':'Programmer l’arrêt de l’ordinateur →',showScreenProgrammer),finalButton('Préparer ma pause sans écran →',showEveningPause));
  doc.append(actions);return;
 }
 if(key==='drink'){const launch=finalButton('Composer ma sélection de boissons →',showDrinkMission);launch.className='drink-launch';doc.append(launch);return;}
 if(!protocolChoices[key])return;
 const item=protocolChoices[key],section=document.createElement('section');section.className='protocol-console';
 const title=document.createElement('h3');title.textContent=item.title;section.append(title);
 const feedback=document.createElement('p');feedback.className='protocol-feedback';feedback.setAttribute('role','status');
 const buttons=document.createElement('div');buttons.className='protocol-options';
 item.choices.forEach((choice,index)=>{
  const button=finalButton(choice,()=>{
   sound.effect('clock');
   if(index!==item.correct){feedback.textContent=item.hint;orbiVoice.say('wrong');return;}
   if(key==='light'){ showLightingQuiz(); return;
   }else adventure.caffeine=true;
   saveAdventure();sound.effect('correct');orbiVoice.say('correct');
   feedback.textContent='✓ Réglage enregistré. '+item.explain;
   buttons.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
   guideProtocolReturn();if(adventureReady())finishNightProtocol();
  });
  button.prepend(missionArt(key,index===item.correct?'soft':'active'));
  button.setAttribute('aria-pressed',String((key==='light'?adventure.light:key==='computer'?adventure.screens:adventure.caffeine)&&index===item.correct));
  buttons.append(button);
 });section.append(buttons,feedback);
 section.append(finalButton('Revenir au protocole nocturne',showNightMission));doc.append(section);
}
function guideProtocolReturn(){document.querySelectorAll('[data-protocol-return]').forEach(b=>{b.classList.add('help-required');b.textContent='✓ Retour au protocole nocturne · prochaine tâche →';});}
const requiredHelp=new Set();
function requireActivityHelp(key){requiredHelp.add(key);const button=document.querySelector('[data-activity-help="'+key+'"]');if(button){button.classList.add('help-required');button.textContent='↗ Consulte cette aide pour réessayer';button.scrollIntoView({block:'nearest',behavior:'auto'});}const form=document.querySelector('#n2-document form');if(form){const submit=form.querySelector('button[type=submit]');if(submit)submit.textContent='Consulte l’aide jaune pour débloquer la validation';}}
function activityHelpButton(key,label,back){const button=finalButton(label,()=>openTabletHelp('calm',back));button.dataset.activityHelp=key;if(requiredHelp.has(key)){button.classList.add('help-required');button.textContent='↗ Consulte cette aide pour réessayer';}return button;}
function openTabletHelp(tab,back){n2Panel('ARCHIVE CORTEX','');showScience('tablet',tab);document.querySelector('#n2-document').append(finalButton('Reprendre mon activité →',()=>{if(back===showDrinkMission)requiredHelp.delete('drink');if(back===showEveningPause)requiredHelp.delete('pause');if(back===showScreenProgrammer)requiredHelp.delete('screens');back();}));}
function showDrinkMission(){
 n2Panel('RÉSERVE DE BORD · SÉLECTION DU SOIR','Prépare deux boissons sans caféine pour ta soirée. Examine leurs étiquettes.',true);
 const shell=missionDocument(),form=document.createElement('form');form.className='pause-form drink-form';
 const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='Choisis les deux boissons à garder';field.append(legend);
 const grid=document.createElement('div');grid.className='pause-grid drink-grid';
 const choices=[['water','Eau','Sans caféine','💧'],['coffee','Café','Contient de la caféine','☕'],['herbal','Infusion','Plantes · sans caféine','❀'],['energy','Boisson énergisante','Contient de la caféine','ϟ'],['tea','Thé noir','Contient de la caféine','♨']];
 choices.forEach(([id,name,note,icon])=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=id;input.name='evening-drink';const art=document.createElement('span');art.className='drink-art drink-'+id;art.textContent=icon;art.setAttribute('aria-hidden','true');const title=document.createElement('strong');title.textContent=name;const detail=document.createElement('small');detail.textContent=note;label.append(input,art,title,detail);grid.append(label);});
 field.append(grid);const preview=document.createElement('div');preview.className='pause-plan';preview.setAttribute('role','status');
 const feedback=document.createElement('p');feedback.className='protocol-feedback';feedback.setAttribute('role','status');
 const submit=document.createElement('button');submit.type='submit';submit.textContent='Valider ma réserve du soir →';submit.disabled=true;
 function update(){const selected=[...grid.querySelectorAll('input:checked')];submit.disabled=selected.length!==2||requiredHelp.has('drink');preview.textContent=selected.length+' / 2 boissons sélectionnées';if(!requiredHelp.has('drink'))feedback.textContent='';sound.effect('clock');}
 grid.addEventListener('change',update);preview.textContent='0 / 2 boissons sélectionnées';if(requiredHelp.has('drink'))feedback.textContent='Ouvre l’aide « Caféine et détente », puis utilise « Reprendre mon activité » pour réessayer.';
 form.addEventListener('submit',e=>{e.preventDefault();if(requiredHelp.has('drink'))return;const selected=[...grid.querySelectorAll('input:checked')].map(i=>i.value);if(selected.length!==2)return;if(!selected.includes('water')||!selected.includes('herbal')){requireActivityHelp('drink');submit.disabled=true;feedback.textContent='ORBI-7 · Le thé contient aussi de la caféine. Consulte l’aide « Caféine et détente », puis reprends ton choix de boissons.';orbiVoice.say('hint');return;}adventure.caffeine=true;saveAdventure();sound.effect('correct');orbiVoice.say('correct');feedback.textContent='✓ Réserve préparée. Eau et infusion sans caféine permettent d’éviter ce stimulant en soirée. La caféine du café, du thé et des boissons énergisantes peut gêner l’endormissement.';submit.textContent='Réserve du soir enregistrée ✓';guideProtocolReturn();if(adventureReady())finishNightProtocol();});
 form.append(field,preview,feedback,submit);shell.append(form,activityHelpButton('drink','Aide · caféine et détente',showDrinkMission),finalButton('Retour au protocole nocturne',showNightMission));
}

// La clé timeline reste utilisée pour conserver les réussites antérieures.
function showEveningPause(){
 n2Panel('APRÈS L’ÉCRAN · TA PAUSE DÉTENTE','Choisis deux activités calmes sans écran pour préparer ton endormissement.');
 discovery.dataset.kind='bed';
 const shell=missionDocument();shell.classList.add('evening-pause');
 const choices=[
  {id:'book',art:'book',title:'Lecture papier',detail:'Un moment au calme',ok:true},
  {id:'video',art:'computer',title:'Vidéos sur téléphone',detail:'Encore de la lumière d’écran',ok:false},
  {id:'music',art:'music',title:'Musique douce',detail:'Écran éteint, volume doux',ok:true},
  {id:'game',art:'game',title:'Jeu en ligne',detail:'Une activité stimulante',ok:false}
 ];
 const form=document.createElement('form');form.className='pause-form';
 const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='Ma pause avant le coucher';field.append(legend);
 const cards=document.createElement('div');cards.className='pause-grid';
 const plan=document.createElement('div');plan.className='pause-plan';plan.setAttribute('role','status');
 const feedback=document.createElement('p');feedback.className='protocol-feedback';feedback.setAttribute('role','status');
 const submit=document.createElement('button');submit.type='submit';submit.textContent='Installer ma pause détente →';
 function update(){
  const selected=[...form.querySelectorAll('input:checked')].map(input=>choices.find(choice=>choice.id===input.value));
  plan.replaceChildren();
  for(let index=0;index<2;index++){
   const slot=document.createElement('span');slot.textContent=selected[index]?.title||'＋ Une activité calme';plan.append(slot);
  }
  submit.disabled=selected.length!==2||requiredHelp.has('pause');if(!requiredHelp.has('pause'))feedback.textContent='';
 }
 choices.forEach(choice=>{
  const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.name='pause-activity';input.value=choice.id;input.checked=adventure.pausePlan?.includes(choice.id)===true;
  const title=document.createElement('strong');title.textContent=choice.title;
  const detail=document.createElement('small');detail.textContent=choice.detail;
  input.addEventListener('change',()=>{sound.effect('clock');update();});
  label.append(input,missionArt(choice.art),title,detail);cards.append(label);
 });
 field.append(cards);form.append(field,plan,feedback,submit);shell.append(form,activityHelpButton('pause','Aide · préparer une pause calme',showEveningPause),finalButton('Retour au protocole',showNightMission));update();if(requiredHelp.has('pause'))feedback.textContent='Ouvre l’aide « Caféine et détente », puis utilise « Reprendre mon activité » pour réessayer.';
 form.addEventListener('submit',event=>{
  event.preventDefault();
  if(requiredHelp.has('pause'))return;
  const selected=[...form.querySelectorAll('input:checked')].map(input=>input.value);
  if(selected.length!==2||!selected.every(id=>choices.find(choice=>choice.id===id)?.ok)){
   requireActivityHelp('pause');submit.disabled=true;feedback.textContent='ORBI-7 · Cherche deux activités sans lumière d’écran et peu stimulantes. Consulte l’aide « Caféine et détente » avant de réessayer.';
   orbiVoice.say('hint');return;
  }
  adventure.timeline=true;adventure.pausePlan=['book','music'];saveAdventure();sound.effect('correct');orbiVoice.say('correct');
  feedback.textContent='✓ Pause préparée. Réduire la lumière des écrans et les activités stimulantes aide à préparer l’endormissement.';
  submit.textContent='Pause détente installée ✓';
  guideProtocolReturn();if(adventureReady())finishNightProtocol();
 });
}

function showSecretDiscovery(){
 n2Panel('ORBI-7 · ACCÈS NON RÉPERTORIÉ',
  (player.name?player.name+', ce':'Ce')+' signal révèle un accès absent de mes plans. Il semble mener au laboratoire des cycles du sommeil.',true);
 discovery.dataset.kind='robot';
 const shell=missionDocument(),signal=document.createElement('div');signal.className='secret-signal';discovery.classList.add('compact-secret');
 signal.innerHTML='<span aria-hidden="true">◈</span><strong>PASSAGE SECRET DÉTECTÉ</strong><p>Le passage se trouve dans le panneau technique, à droite de la porte.</p>';
 shell.append(signal,finalButton('Observer le passage dans la chambre →',()=>{discovery.close();secretPanel.scrollIntoView({block:'center',inline:'center'});secretPanel.focus();}),finalButton('Traverser le passage secret →',showSecretTransition));
}

async function showSecretTransition(){
 if(!n2Final.unlocked||!adventure.secretRevealed)return;
 await takeWestPassage(()=>interceptTransmission(sound,reducedMotion.matches,true),()=>sound.effect('open'));
}

restoreLighting();
saveN2Final();
saveAdventure();


// Programmation de la prochaine nuit, distincte de l’historique nocturne.
function displayScheduleTime(minutes){
 return String(Math.floor(minutes/60)).padStart(2,'0')+' h '+String(minutes%60).padStart(2,'0');
}
function showScreenProgrammer(){
 n2Panel('ORDINATEUR · PROGRAMMATION NOCTURNE',
  'Éteins l’ordinateur avant le coucher pour réduire la lumière des écrans le soir.',true);
 discovery.dataset.kind='computer';
 const shell=missionDocument();shell.classList.add('screen-programmer');
 let bedtime=adventure.screenSchedule?.bedtime||1380;
 let shutdown=adventure.screenSchedule?.shutdown??null;
 const device=document.createElement('div');device.className='schedule-device';
 device.innerHTML='<span class="schedule-monitor" aria-hidden="true">▣</span><div><strong>Ordinateur personnel</strong><span class="device-status">PROGRAMMATION DE L’ARRÊT</span></div>';
 const connection=document.createElement('div');connection.className='screen-science-link';
 const screen=document.createElement('div');screen.append(missionArt('computer'));
 const screenLabel=document.createElement('strong');screenLabel.textContent='Lumière des écrans';const blue=document.createElement('small');blue.textContent='Dont la lumière bleue';screen.append(screenLabel,blue);
 const arrow=document.createElement('span');arrow.className='science-link-arrow';arrow.textContent='→';arrow.setAttribute('aria-hidden','true');
 const night=document.createElement('div');night.append(missionArt('light'));
 const nightLabel=document.createElement('strong');nightLabel.textContent='Mélatonine';const risk=document.createElement('small');risk.textContent='Sécrétion parfois retardée le soir';night.append(nightLabel,risk);connection.append(screen,arrow,night);
 const transition=document.createElement('div');transition.className='schedule-track';
 const on=document.createElement('span');on.className='track-screen';on.textContent='Écran allumé';
 const off=document.createElement('span');off.className='track-pause';off.textContent='Pause sans écran';
 const bed=document.createElement('span');bed.className='track-bed';transition.append(on,off,bed);

 const targetLabel=document.createElement('label');targetLabel.className='bedtime-choice';targetLabel.textContent='Heure de coucher cible';
 const target=document.createElement('select');target.setAttribute('aria-label','Heure de coucher cible');
 [1350,1380,1410].forEach(minutes=>{const option=document.createElement('option');option.value=String(minutes);option.textContent=displayScheduleTime(minutes);option.selected=minutes===bedtime;target.append(option);});
 targetLabel.append(target);
 const instruction=document.createElement('h3');instruction.className='schedule-instruction';
 const objective=document.createElement('p');objective.className='schedule-objective';objective.textContent='Prévois au moins 30 minutes sans écran.';
 const form=document.createElement('form');form.className='screen-schedule-form';
 const field=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='Heure d’arrêt à programmer';field.append(legend);
 const timeline=document.createElement('div');timeline.className='schedule-timeline';
 const preview=document.createElement('p');preview.className='schedule-preview';preview.setAttribute('role','status');
 const feedback=document.createElement('p');feedback.className='protocol-feedback';feedback.setAttribute('role','status');
 const submit=document.createElement('button');submit.type='submit';submit.className='schedule-submit';submit.textContent='Confirmer l’arrêt programmé →';
 const saved=document.createElement('p');saved.className='schedule-saved';

 function renderHours(){
  timeline.replaceChildren();
  instruction.textContent='Quand éteindre l’ordinateur pour te coucher à '+displayScheduleTime(bedtime)+' ?';
  [-60,-45,-30,-15,0,15].forEach(offset=>{
   const minutes=bedtime+offset;
   const label=document.createElement('label'),input=document.createElement('input');
   input.type='radio';input.name='shutdown-time';input.value=String(minutes);input.checked=shutdown===minutes;
   const stamp=document.createElement('span');stamp.textContent=displayScheduleTime(minutes);
   const marker=document.createElement('small');marker.textContent=offset===0?'Coucher prévu':'';
   input.addEventListener('change',()=>{
    shutdown=minutes;feedback.textContent='';device.classList.remove('sleeping');
    device.querySelector('.device-status').textContent='Programmation en cours';
    sound.effect('clock');updatePreview();
   });label.append(input,stamp,marker);timeline.append(label);
  });
  updatePreview();
 }
 function updatePreview(){
  submit.disabled=shutdown===null||requiredHelp.has('screens');

  const pause=shutdown===null?30:Math.max(0,bedtime-shutdown);
  transition.style.setProperty('--pause-ratio',String(Math.min(70,Math.max(12,pause))));
  off.textContent=shutdown===null?'Ta pause sans écran':pause+' min sans écran';
  bed.textContent='☾ '+displayScheduleTime(bedtime);

  preview.textContent=shutdown===null?'Touche un horaire, puis confirme.':'Arrêt choisi : '+displayScheduleTime(shutdown)+' · coucher cible : '+displayScheduleTime(bedtime)+'.';
  saved.textContent=adventure.screenSchedule?'Programme enregistré · arrêt à '+displayScheduleTime(adventure.screenSchedule.shutdown)+' pour un coucher à '+displayScheduleTime(adventure.screenSchedule.bedtime)+'.':adventure.screens?'Le mode repos déjà acquis est conservé. Tu peux programmer un horaire pour la prochaine nuit.':'';
 }
 target.addEventListener('change',()=>{
  bedtime=Number(target.value);shutdown=null;feedback.textContent='';device.classList.remove('sleeping');device.querySelector('.device-status').textContent='Programmation en cours';renderHours();
 });
 form.addEventListener('submit',e=>{
  e.preventDefault();if(shutdown===null||requiredHelp.has('screens'))return;

  if(bedtime-shutdown<30){
   requireActivityHelp('screens');submit.disabled=true;
   feedback.textContent='ORBI-7 · Ton ordinateur resterait allumé trop près de l’heure du coucher. Consulte l’aide jaune « Écrans et sommeil », puis reprends la programmation pour prévoir une transition sans écran.';
   orbiVoice.say('hint');return;
  }
  adventure.screenSchedule={bedtime,shutdown};adventure.screens=true;saveAdventure();
  device.classList.add('sleeping');device.querySelector('.device-status').textContent='SYSTÈME RECONFIGURÉ — MODE SOIRÉE ACTIVÉ';
  feedback.textContent='✓ '+(bedtime-shutdown)+' minutes de pause programmées : moins de lumière d’écran et de stimulation avant le coucher.';
  sound.effect('computer');orbiVoice.say('correct');updatePreview();
  guideProtocolReturn();if(adventureReady())finishNightProtocol();
 });
 field.append(timeline);form.append(field,preview,feedback,submit);
 shell.append(device,connection,targetLabel,instruction,objective,transition,form,saved,activityHelpButton('screens','Aide · écrans et sommeil',showScreenProgrammer),finalButton('Retour au protocole nocturne',showNightMission));
 renderHours();
 if(adventure.screenSchedule){device.classList.add('sleeping');device.querySelector('.device-status').textContent='SYSTÈME RECONFIGURÉ — MODE SOIRÉE ACTIVÉ';}
}


// L’activation temporaire ne devient une découverte durable qu’après l’anomalie.
function protocolAvailable(){
 return n2Final.unlocked||(['anomaly','repaired'].includes(lighting.stage)&&['computer','tablet','drink'].every(key=>scienceRead.has(key)));
}
function lightingStatus(){
 return {unseen:'Éclairage non découvert',preview:'Éclairage découvert temporairement',reverted:'Éclairage non validé — retour automatique au bleu',anomaly:'Anomalie détectée',repaired:'Reconfiguration réussie — éclairage permanent'}[lighting.stage];
}
function persistLighting(){
 try{localStorage.setItem(lightingKey,JSON.stringify(lighting));}
 catch{document.querySelector('#discovery-save').textContent='Sauvegarde indisponible : état de l’éclairage conservé pendant cette session.';}
}
function syncLightingDiscovery(){
 const active=['preview','anomaly','repaired'].includes(lighting.stage);
 for(const set of [scienceRead,n2Seen]){if(active)set.add('light');else set.delete('light');}
 try{
  localStorage.setItem(scienceKey,JSON.stringify([...scienceRead]));
  localStorage.setItem(n2Key,JSON.stringify([...n2Seen]));
 }catch{document.querySelector('#discovery-save').textContent='Sauvegarde indisponible : découvertes conservées pendant cette session.';}
 updateN2Progress();
}
function applyLightingView(){
 const warm=['preview','anomaly','repaired'].includes(lighting.stage);
 document.body.classList.toggle('n2-light-adjusted',warm);
 document.body.classList.toggle('n2-evening',lighting.stage==='repaired'&&n2Final.step===3);
 document.body.dataset.lightingState=lighting.stage;
}
function expireLightingPreview(){
 if(lighting.stage!=='preview')return;
 clearTimeout(lightingTimer);
 lighting={stage:'reverted',expiresAt:0};persistLighting();applyLightingView();syncLightingDiscovery();
 if(document.body.classList.contains('room-two')&&discovery.open&&discoveryObject==='n2'&&lastObject?.dataset.n2==='light'){
  document.querySelector('#discovery-text').textContent='La lumière est revenue au bleu. Le réglage jaune n’a pas été conservé…';
  const state=document.querySelector('#n2-document .light-state');if(state)state.textContent='Éclairage bleu · réglage non conservé';
 }
}
function restoreLighting(){
 clearTimeout(lightingTimer);
 if(lighting.stage==='preview'){
  if(lighting.expiresAt<=Date.now()){expireLightingPreview();return;}
  lightingTimer=setTimeout(expireLightingPreview,lighting.expiresAt-Date.now());
 }
 persistLighting();applyLightingView();syncLightingDiscovery();
}
function handleLightingInteraction(){
 if(lighting.stage==='preview'&&Date.now()>=lighting.expiresAt)expireLightingPreview();
 sound.effect('close');
 if(lighting.stage==='unseen'){
  lighting={stage:'preview',expiresAt:Date.now()+15000};
  persistLighting();applyLightingView();syncLightingDiscovery();
  lightingTimer=setTimeout(expireLightingPreview,15000);
 }else if(lighting.stage==='reverted'){
  lighting={stage:'anomaly',expiresAt:0};persistLighting();applyLightingView();syncLightingDiscovery();
  n2Panel('ANOMALIE DÉTECTÉE — RECONFIGURATION NÉCESSAIRE',
   'Étrange'+(player.name?', '+player.name:'')+'… L’éclairage est revenu automatiquement en mode bleu. Le système semble refuser de conserver les paramètres de soirée.\n\nJ’ai détecté une anomalie dans la configuration de cette chambre. Nous allons devoir intervenir sur l’ensemble du système.',true);
  discovery.dataset.kind='light';
  const doc=document.querySelector('#n2-document');doc.hidden=false;
  const status=document.createElement('p');status.className='light-state';
  status.textContent=protocolAvailable()?'PROTOCOLE NOCTURNE DISPONIBLE':'Anomalie identifiée · consulte les autres découvertes pour accéder au protocole nocturne.';
  doc.append(status);
  if(protocolAvailable())doc.append(finalButton('Ouvrir le protocole nocturne →',showNightMission));
  interceptTransmission(sound,reducedMotion.matches);return;
 }
 n2Panel(lighting.stage==='repaired'?'ÉCLAIRAGE RECONFIGURÉ':lighting.stage==='anomaly'?'ANOMALIE D’ÉCLAIRAGE':'ORBI-7 · ÉCLAIRAGE','',true);
 showScience('light');
 document.querySelector('#discovery-text').textContent=lighting.stage==='preview'?'La lumière passe au jaune et l’ambiance s’adoucit.':lighting.stage==='repaired'?'Le retour automatique au bleu est désactivé. L’éclairage jaune et tamisé est enregistré durablement.':'Le système refuse de conserver le réglage de soirée. Le protocole nocturne permettra de reconfigurer l’éclairage.';
}

// Le protocole prépare la pièce. Le questionnaire autorise ensuite la sortie.
function missionArt(kind,tone='soft'){
 const art=document.createElement('span');
 art.className='mission-art art-'+kind+' tone-'+tone;art.setAttribute('aria-hidden','true');
 return art;
}
function finishNightProtocol(){
 if(!adventureReady()||adventure.protocolComplete||n2Final.unlocked)return;
 adventure.protocolComplete=true;n2Final.evening=true;
 saveAdventure();saveN2Final();sound.effect('correct');showProtocolSuccess();orbiVoice.say('praise');
}
function showProtocolSuccess(){
 n2Panel('PROTOCOLE NOCTURNE RÉTABLI',n2Final.unlocked?'Questionnaire réussi. La porte est déverrouillée.':'Mission réussie ! Retrouve ORBI-7 pour valider tes découvertes.',true);
 const shell=missionDocument();shell.classList.add('protocol-celebration');
 const success=document.createElement('div');success.className='protocol-success-visual';
 success.innerHTML='<span aria-hidden="true">✓</span><h3>Chambre prête pour la nuit</h3>';
 const icons=document.createElement('div');icons.className='success-settings';
 [['light','Lumière douce'],['computer','Écrans en repos'],['drink','Soirée sans caféine']].forEach(([kind,text])=>{
  const card=document.createElement('div'),caption=document.createElement('span');caption.textContent=text;card.append(missionArt(kind),caption);icons.append(card);
 });
 shell.append(success,icons,finalButton('Revenir dans la chambre →',()=>{discovery.close();document.querySelector('[data-n2="robot"]').focus();}));
}
function showRobotCheckpoint(){
 if(adventure.secretRevealed){showSecretDiscovery();return;}
 if(n2Final.unlocked){showDoorAuthorized();return;}
 if(!adventureReady()){showNightMission();return;}
 if(!adventure.protocolComplete){finishNightProtocol();return;}
 n2Panel('ORBI-7 · VALIDATION DES DÉCOUVERTES',(player.name?player.name+', la':'La')+' chambre est reconfigurée. Prêt pour trois questions avant de sortir ?',true);
 const shell=missionDocument();shell.append(missionArt('robot'),finalButton(n2Final.step?'Reprendre le questionnaire →':'Commencer le questionnaire →',showN2Final));
}
function showDoorAuthorized(){
 n2Panel('VALIDATION RÉUSSIE','Analyse confirmée'+(player.name?', '+player.name:'')+'. Les vérifications sont terminées. La porte est déverrouillée.',true);
 const shell=missionDocument(),result=document.createElement('div');result.className='door-authorized';
 result.innerHTML='<span aria-hidden="true">✓</span><h3>Accès autorisé</h3><p>Tu peux maintenant rejoindre la porte.</p>';
 shell.append(result,finalButton('Rejoindre la porte →',attemptN2Exit));
}
function attemptN2Exit(){
 if(!n2Final.unlocked)return;
 if(adventure.secretRevealed){showSecretTransition();return;}
 adventure.secretRevealed=true;n2Final.fragment=true;
 saveAdventure();saveN2Final();sound.effect('computer');
 setTimeout(()=>sound.effect('fragment'),350);showSecretDiscovery();orbiVoice.say('curious');
}

// Point d’intégration N03, isolé du moteur des chambres précédentes.
const laboratory=createLaboratory({sound,voice:orbiVoice,getName:()=>player.name,onAudio:updateSoundControls,
 prepare:()=>{if(discovery.open)discovery.close();stopScene();finishWake(false);document.querySelector('#objects').inert=true;document.querySelector('#n2-objects').inert=true;},
 leave:()=>{document.querySelector('#n2-objects').inert=false;document.querySelector('#n2-progress').hidden=false;document.body.classList.add('room-two','exploring');document.querySelector('#n2-objects [data-n2="door"]').focus({preventScroll:true});}
});
function resumeLaboratory(){
 sound.enable(sound.enabled);updateSoundControls();
 document.body.classList.remove('audio-gated');document.querySelector('#audio-start').hidden=true;document.querySelector('#cortex-connect').hidden=true;
 gameStarted=true;roomClock.checkpoint(performance.now(),!document.hidden);updateClock();
 // Charger N02 sous le laboratoire permet un retour cohérent sans rejouer le réveil.
 room.src='assets/noctis-study.webp';document.body.classList.add('room-two');document.querySelector('#return-room-one').hidden=false;
 laboratory.enter();
}

// Raccourci de développement N01 → N03 : rejoue le diagnostic et la révélation.
document.querySelector('#dev-scene-three').addEventListener('click',()=>{
 if(document.body.classList.contains('room-two')||document.body.classList.contains('room-three'))return;
 sound.enable(sound.enabled);updateSoundControls();
 room.src='assets/noctis-study.webp';
 document.body.classList.add('room-two');
 document.querySelector('#return-room-one').hidden=false;
 laboratory.replayEntrance();
});

discovery.addEventListener('close',()=>discovery.classList.remove('compact-secret'));

// Outils de navigation isolés : aucun indice, fragment ou puzzle n’est validé.
let developerEnabled=false;try{developerEnabled=localStorage.getItem('noctis.developer.v1')==='true';}catch{}
const devMenu=document.createElement('dialog');devMenu.className='developer-menu';devMenu.innerHTML='<h2>Outils de développement</h2><p>Déplacements libres et séquences d’entrée rejouables. Les énigmes et fragments restent conservés.</p><label><input type="checkbox" id="developer-active"> Activer le mode développeur</label><div class="developer-destinations"></div><form method="dialog"><button>Fermer</button></form>';document.body.append(devMenu);
const devSwitch=devMenu.querySelector('input');devSwitch.checked=developerEnabled;
const devIcons=[];
function syncDeveloper(){devIcons.forEach(b=>{b.classList.toggle('developer-on',developerEnabled);b.setAttribute('aria-pressed',String(developerEnabled));b.title=developerEnabled?'Mode développeur actif':'Mode développeur';});devMenu.querySelectorAll('[data-dev-room]').forEach(b=>b.disabled=!developerEnabled);}
devSwitch.onchange=()=>{developerEnabled=devSwitch.checked;try{localStorage.setItem('noctis.developer.v1',String(developerEnabled));}catch{}syncDeveloper();};
for(const footer of [document.querySelector('body>footer'),document.querySelector('.lab-bottom')]){if(!footer)continue;const b=document.createElement('button');b.type='button';b.className='developer-icon';b.textContent='⚙';b.setAttribute('aria-label','Ouvrir le mode développeur');b.onclick=()=>{syncDeveloper();devMenu.inert=false;devMenu.showModal();};footer.append(b);devIcons.push(b);}
const devOld=document.querySelector('#dev-scene-three');if(devOld)devOld.hidden=true;
let developerBusy=false;
for(const [id,label] of [[1,'N01 · Rejouer le réveil'],[2,'N02 · Resynchronisation et entrée'],[3,'N03 · Restauration et révélation']]){const b=document.createElement('button');b.type='button';b.dataset.devRoom=id;b.textContent=label;b.onclick=async()=>{if(!developerEnabled||developerBusy)return;developerBusy=true;devMenu.close();try{if(document.body.classList.contains('room-three'))laboratory.exit();if(discovery.open)discovery.close();if(!panel.hidden){panel.hidden=true;orbiVoice.stop();}finishWake(false);if(id===1){if(document.body.classList.contains('room-two'))document.querySelector('#return-room-one').click();playWake();}else if(id===2){await resynchronize(sound,reducedMotion.matches);await enterRoomTwo(true);}else{room.src='assets/noctis-study.webp';document.body.classList.add('room-two');document.querySelector('#return-room-one').hidden=false;laboratory.replayEntrance();}}finally{developerBusy=false;}};devMenu.querySelector('.developer-destinations').append(b);}
syncDeveloper();

installN01Score(sound);

installN01Score(sound,{room:2});

installN02Audio(sound,orbiVoice);

if(enterStage('n2'))await restoreRoomTwo({sound,updateSound:updateSoundControls,enter:async()=>{
 clearTimeout(connectTimer);stopConnectionSound();stopScene();finishWake(false);
 document.body.classList.remove('audio-gated');document.querySelector('#audio-start').hidden=true;document.querySelector('#cortex-connect').hidden=true;
 gameStarted=true;roomClock.checkpoint(performance.now(),!document.hidden);updateClock();
 await enterRoomTwo(true);
}});
