import {installArchives} from './archives.js';
import {installReconstruction} from './reconstruction.js';

export function quests({input,camera,stations}){
 const variant=location.pathname.includes('fusion-est')?'est':'ouest';
 const namespace='cortex.noctis3d.'+variant+'.v1';
 const root=document.createElement('div');
 root.id='n3-root';
 root.innerHTML='<div class="lab-top"></div><div class="lab-world" hidden><div class="lab-data"><strong></strong><div class="data-slots"><span></span><span></span><span></span></div><p></p><svg><path/><path class="missing"/></svg></div><div class="lab-frame"></div><p class="lab-view-caption"></p><div class="lab-targets"></div><button class="lab-scientist"></button><button class="lab-technician"></button><button class="lab-robot"></button><button class="lab-exit"></button><button data-view="console"></button><span class="lab-fragments"></span></div><div class="lab-bottom"></div>';
 document.body.append(root);
 let audio;
 const sound={effect(){if(!audio)return;this.tone(520,.08)},tone(hz,duration=.15){
  if(!audio)return;
  const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=hz;
  g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
  o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
 }};
 const voice={say(){},stop(){}};
 let name='';
 try{name=JSON.parse(localStorage.getItem('noctis.orbi.v1'))?.name||''}catch{}
 const options={sound,voice,getName:()=>name,namespace};
 const quiz=document.createElement('dialog');quiz.className='quest-intro';
 document.body.append(quiz);
 const questions=[
  ['Après un coucher à 03:00 et un réveil à 06:30, combien de temps s’est écoulé ?',['3 h 30','6 h 30','9 h 30'],0,'Le journal de N01 donne les deux heures. Compte de 03:00 à 06:00, puis ajoute 30 minutes.'],
  ['Quelle préparation du soir correspond au protocole de N02 ?',['Lumière forte et boisson caféinée','Lumière atténuée et activité calme','Écran lumineux jusqu’au coucher'],1,'N02 associe la préparation du sommeil à un éclairage atténué et une activité de détente.'],
  ['Quelle évolution observe-t-on généralement dans la nuit ?',['Le profond augmente continuellement','Toutes les phases restent identiques','Le paradoxal prend davantage de place en fin de nuit'],2,'Relis l’hypnogramme : le profond est davantage présent au début, le paradoxal vers la fin.']
 ];
 let question=0;
 function showQuiz(){
  quiz.replaceChildren();
  const h=document.createElement('h2');h.textContent='ORBI-7 · Relier les découvertes';quiz.append(h);
  const [text,choices,answer,hint]=questions[question];
  const p=document.createElement('p');p.textContent=text;quiz.append(p);
  const feedback=document.createElement('p');feedback.setAttribute('role','status');
  choices.forEach((choice,index)=>{const b=document.createElement('button');b.textContent=choice;b.onclick=()=>{
   if(index!==answer){feedback.textContent=hint;return}
   if(question<questions.length-1){question++;showQuiz()}
   else{feedback.textContent='Les connaissances de N01, N02 et N03 sont reliées.';try{localStorage.setItem(namespace+'.quiz','true')}catch{}}
  };quiz.append(b)});
  quiz.append(feedback);
  const back=document.createElement('button');back.textContent='Reprendre l’exploration';back.onclick=()=>{quiz.close();input.enabled=true};quiz.append(back);
 }
 const quizButton=document.createElement('button');quizButton.textContent='Quiz de liaison';
 document.querySelector('aside').prepend(quizButton);
 quizButton.onclick=()=>{pause();showQuiz();quiz.showModal()};

 const archives=installArchives(root,options);
 const repair=installReconstruction(root,options);
 const launch=document.createElement('button');launch.textContent='ORBI-7 · Mission N03';
 document.querySelector('aside').prepend(launch);
 const pause=()=>{
  input.enabled=false;input.clear();input.unlock();
  if(!audio)try{audio=new AudioContext();audio.resume()}catch{}
 };
 launch.onclick=()=>{pause();repair.hub()};
 const resume=document.createElement('button');resume.textContent='Reprendre l’exploration →';resume.className='resume-quest';
 resume.onclick=()=>{archives.close();repair.close();input.enabled=true;document.querySelector('#menu').hidden=true;document.querySelector('aside').hidden=false;document.body.classList.add('play')};
 root.append(resume);
 function inspect(){
  const near=stations.filter(s=>!s.y).map(s=>({s,d:Math.hypot(camera.position.x-s.x,camera.position.z-s.z)-s.r})).sort((a,b)=>a.d-b.d)[0];
  if(!near||near.d>1.8)return;
  pause();
  const id=near.s.id;
  if(id.startsWith('A'))archives.open(1);
  else if(id.startsWith('B'))archives.open(id.includes('controle')||id==='B03'?3:2);
  else if(id.startsWith('D')||id.startsWith('C'))archives.open(4);
  else repair.hub();
 }
 document.querySelector('#use').onclick=inspect;
 window.addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.repeat&&input.enabled)inspect()});
 root.dataset.view='console';
 const intro=document.createElement('dialog');intro.className='quest-intro';
 intro.innerHTML='<small>CORTEX / NOCTIS — N03</small><h2>Les enregistrements manquants</h2><p>ORBI-7 · Après le journal de sommeil et le protocole nocturne, le passage nous conduit aux enregistrements des cycles. Certaines données ont été modifiées. Explore les équipements, enregistre quatre archives puis reconstruis les trois modules de l’analyseur.</p><p>Galerie d’entrée · cycles<br>Distribution · phases et hypnogramme<br>Couloir secondaire · signal inconnu<br>Salle terminale · reconstruction</p><button>Commencer l’enquête</button>';
 document.body.append(intro);intro.querySelector('button').onclick=()=>intro.close();
 document.querySelector('#enter').addEventListener('click',()=>{
  if(!sessionStorage.getItem(namespace+'.intro')){pause();intro.showModal();sessionStorage.setItem(namespace+'.intro','1')}
 });
 intro.addEventListener('close',()=>{input.enabled=true});
}
