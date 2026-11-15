import * as THREE from 'three';
import {SparkRenderer,SplatMesh} from '@sparkjsdev/spark';
import {spawn,move} from './navigation.js';
import {createHatch} from './hatch.js';
import {createChair} from './chair.js';
import {profiles,chooseProfile,resolution,withinReach} from './profile.js';
const $=id=>document.getElementById(id);
const keys=new Set(), axis={x:0,y:0};
const embedded=new URLSearchParams(location.search).get('embedded')==='1';
let hadPointerLock=false, resumeOnVisibility=false;
let yaw=0,pitch=0,playing=false,touch=navigator.maxTouchPoints>0,look,stick;
document.body.classList.toggle('touch',touch);
function fail(message){parent.postMessage({type:'spark:error',message},location.origin);$('panel').hidden=false;$('enter').disabled=true;$('status').textContent=message;}
async function boot(){
 const start=performance.now();
 const coarse=matchMedia('(pointer: coarse)').matches;
 const selected=chooseProfile(new URLSearchParams(location.search).get('qualite'),coarse);
 const profile=profiles[selected];
 const asset='./assets/'+profile.file+'.splat';
 const select=$('quality');
 select.value=selected;
 select.onchange=()=>{const url=new URL(location.href);url.searchParams.set('qualite',select.value);location.assign(url)};
 $('download').href=asset;
 const canvas=document.createElement('canvas');
 const context=canvas.getContext('webgl2',{alpha:false,antialias:false});
 if(!context){
   $('status').textContent='WebGL 2 indisponible · vérification du fichier spatial…';
   const diagnostic=new SplatMesh({url:asset});
   await diagnostic.initialized;
   const count=diagnostic.packedSplats.numSplats;
   diagnostic.dispose();
   fail(count.toLocaleString('fr-FR')+' gaussiennes décodées. WebGL 2 est indisponible ici. Ouvrez ce site dans Chrome avec l’accélération graphique pour explorer.');
   return;
 }
 const renderer=new THREE.WebGLRenderer({canvas,context});document.body.prepend(canvas);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x151519);
 const camera=new THREE.PerspectiveCamera(68,1,.06,80);camera.rotation.order='YXZ';
 const spark=new SparkRenderer({renderer,blurAmount:profile.blur,preBlurAmount:0,apertureAngle:0,depthTest:true});scene.add(spark);
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(resolution(profile,devicePixelRatio,innerWidth,innerHeight));renderer.setSize(innerWidth,innerHeight);}
 resize();addEventListener('resize',resize);
 const reset=()=>{camera.position.set(spawn.x,1.65,spawn.z);yaw=0;pitch=.10;camera.rotation.set(pitch,yaw,0)};
 reset();const sector=new SplatMesh({url:asset});scene.add(sector);await sector.initialized;
 const loadSeconds=(performance.now()-start)/1000;
 const chair=createChair();scene.add(chair.root);
 const hatch=createHatch();scene.add(hatch.root);
 function target(){
   if(withinReach(camera.position,yaw,pitch))return chair;
   const dx=hatch.root.position.x-camera.position.x,dz=hatch.root.position.z-camera.position.z;
   const d=Math.hypot(dx,dz);
   if(d<2.25 && (-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/d>.65 && Math.abs(pitch)<.75)return hatch;
 }
 const action=$('activate');
 const activate=()=>{if(playing)target()?.activate()};
 action.onclick=activate;
 function pause(){action.hidden=true;$('feedback').hidden=true;playing=false;keys.clear();axis.x=axis.y=0;look=stick=null;$('stick').firstElementChild.style.transform='';document.body.classList.remove('playing');$('panel').hidden=false;$('hud').hidden=true;if(document.pointerLockElement)document.exitPointerLock();}
 $('status').textContent=sector.packedSplats.numSplats.toLocaleString('fr-FR')+' gaussiennes · chargées en '+loadSeconds.toFixed(1)+' s';$('enter').disabled=false;
 $('enter').onclick=async()=>{playing=true;document.body.classList.add('playing');$('panel').hidden=true;$('hud').hidden=false;$('reset').hidden=false;if(!touch){try{await canvas.requestPointerLock()}catch{ /* drag remains available */ }}};
 // Entry is automatic once the actual splat data and both interactive machines are ready.
 playing=true;document.body.classList.add('playing');$('panel').hidden=true;$('hud').hidden=false;$('reset').hidden=false;
 canvas.tabIndex=0;canvas.focus();parent.postMessage({type:'spark:ready'},location.origin);
 addEventListener('pagehide',()=>{playing=false;renderer.setAnimationLoop(null);sector.dispose();renderer.dispose()},{once:true});
 $('reset').onclick=reset;$('pause').onclick=pause;
 function clearMotion(){keys.clear();axis.x=axis.y=0;look=stick=null;pad.firstElementChild.style.transform='';}
 addEventListener('blur',()=>{if(embedded)clearMotion();else pause()});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){resumeOnVisibility=playing;playing=false;clearMotion()}
  else if(resumeOnVisibility){playing=true;resumeOnVisibility=false;canvas.focus()}
 });
 document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===canvas;
  if(hadPointerLock&&!locked&&playing)pause();
  hadPointerLock=locked;
 });
 addEventListener('keydown',e=>{if(e.key==='Escape')pause();if(playing){keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)activate();if(e.code.startsWith('Arrow'))e.preventDefault()}});addEventListener('keyup',e=>keys.delete(e.code));
 function rotate(dx,dy){yaw-=dx*.0026;pitch=THREE.MathUtils.clamp(pitch-dy*.0026,-1.45,1.45)}
 canvas.onpointerdown=e=>{if(playing&&look==null){look={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)}};
 document.addEventListener('pointermove',e=>{if(!playing)return;if(document.pointerLockElement){rotate(e.movementX,e.movementY)}else if(look?.id===e.pointerId){rotate(e.clientX-look.x,e.clientY-look.y);look.x=e.clientX;look.y=e.clientY}});
 canvas.onlostpointercapture=()=>look=null;
 const pad=$('stick');function joystick(e){const r=pad.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/35,y=(e.clientY-r.top-r.height/2)/35;const norm=Math.max(1,Math.hypot(x,y));axis.x=x/norm;axis.y=-y/norm;pad.firstElementChild.style.transform='translate('+axis.x*25+'px,'+(-axis.y*25)+'px)'}
 pad.onpointerdown=e=>{if(stick!==null&&stick!==undefined)return;stick=e.pointerId;pad.setPointerCapture(stick);joystick(e)};pad.onpointermove=e=>{if(stick===e.pointerId)joystick(e)};pad.onlostpointercapture=()=>{stick=null;axis.x=axis.y=0;pad.firstElementChild.style.transform=''};
 let previous=0,lastHud=0,frames=0;
 renderer.setAnimationLoop(t=>{const dt=(t-previous)/1000;previous=t;
 if(playing){const on=(...codes)=>Number(codes.some(code=>keys.has(code)));move(camera.position,yaw,axis.x+on('KeyD','ArrowRight')-on('KeyA','KeyQ','ArrowLeft'),axis.y+on('KeyW','KeyZ','ArrowUp')-on('KeyS','ArrowDown'),dt);
 camera.rotation.set(pitch,yaw,0);}
 const near=Math.hypot(camera.position.x,camera.position.z+1.5)<2.85;
 chair.update(Math.min(.05,dt),near);
 hatch.update(Math.min(.05,dt));
 const active=playing && target();
 const reachable=Boolean(active);
 const label=active===hatch?(hatch.open?'Fermer le volet':'Inspecter le relais'):'Étalonner le siège';
 if(reachable && $('actionLabel').textContent!==label)$('actionLabel').textContent=label;
 action.hidden=!reachable || (active===chair && chair.phase==='scanning');
 $('feedback').hidden=!playing || !(chair.phase==='scanning'||(chair.phase==='complete' && near));
 if(!$('feedback').hidden)$('feedback').textContent=chair.phase==='scanning'?'Étalonnage des capteurs · '+Math.round(chair.progress*100)+' %':'Étalonnage terminé';
 try{renderer.render(scene,camera)}catch(error){renderer.setAnimationLoop(null);fail('Erreur du rendu Spark · '+error.message);return}frames++;if(t-lastHud>=1000){$('readout').textContent=Math.round(1000*frames/(t-lastHud))+' FPS · '+Math.hypot(camera.position.x-spawn.x,camera.position.z-spawn.z).toFixed(1)+' m';lastHud=t;frames=0;}});
 canvas.addEventListener('webglcontextlost',()=>{pause();fail('Le contexte graphique a été interrompu. Rechargez la page pour retrouver le secteur.')});
}
boot().catch(e=>{console.error(e);fail('Échec du chargement volumétrique · '+e.message)});
