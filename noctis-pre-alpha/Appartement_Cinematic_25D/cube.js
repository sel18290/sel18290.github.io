import * as T from '../vendor/three.module.js';
import {laboratoryWalk} from './lab-flight.js?v=8';
import {faces,view,zip} from './cube-math.js';
import {panoramas,panoramaIndex} from './panorama-scenes.js';
import {isStory,enterStage,nextStage} from '../aventure/progression.js';
const $=id=>document.getElementById(id),canvas=$('world'),life=new AbortController(),signal=life.signal;
let renderer,cube,scene,camera,raf,disposed=false,index=0,busy=false,drag=null,last=0,yaw=0,pitch=0,fov=70,dirty=true;
const params=new URLSearchParams(location.search);
const revealEnabled=params.get('revelation')==='1';
const story=revealEnabled&&params.get('scene')==='salle3'&&isStory();
if(story){enterStage('cube');document.body.classList.add('story-reveal');}
const walk=revealEnabled&&(story||params.get('mode')!=='cinema')?laboratoryWalk(canvas,signal,story):null;
let loadRequest=0;
let reveal, elapsed=0, started=false, visibleSince=null;
let departureStarted=false;
const revealControls=['left','right','reset','export'];
function clearReveal(){
 walk?.stop();document.body.classList.remove('exploring');
 $('reactor').textContent='Panorama 360 salle 3';
 reveal?.dispose();reveal=null;elapsed=0;started=false;visibleSince=null;
 camera.position.set(0,0,0);camera.far=10;renderer.shadowMap.enabled=false;document.body.classList.remove('revealing');
 for(const id of revealControls)$(id).disabled=false;
}
const keys=new Set(),sources=panoramas.map(p=>p.url);
function resize(){if(!renderer)return;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5,Math.sqrt(2000000/(innerWidth*innerHeight))));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();dirty=true;}
async function switchScene(next){if(busy||disposed)return;busy=true;$('veil').classList.add('visible');$('export').disabled=true;$('status').textContent='Chargement du panorama…';
 clearReveal();loadRequest++;
 try{const image=await new T.TextureLoader().loadAsync(sources[next]);if(disposed){image.dispose();return;}image.colorSpace=T.SRGBColorSpace;const replacement=new T.WebGLCubeRenderTarget(Math.min(renderer.capabilities.maxCubemapSize,matchMedia('(pointer:coarse)').matches?1024:(panoramas[next].cubeSize||1024)));replacement.fromEquirectangularTexture(renderer,image);image.dispose();scene.background=replacement.texture;cube?.dispose();cube=replacement;index=next;document.title=panoramas[index].title+' · NOCTIS';$('scene-title').textContent=story?'NOCTIS · Le cube':panoramas[index].title;yaw=panoramas[index].yaw||0;pitch=0;dirty=true;$('status').textContent=panoramas[index].title+' · vue générée 360° · six faces';$('export').disabled=false;
 if(revealEnabled&&panoramas[index].id==='salle3'){
  const current=cube, request=loadRequest;
  import('./n6-reveal.js?v=22').then(module=>module.prepareReveal(renderer,current.texture,story?()=>{
   departureStarted=nextStage('cube','chambres');
  }:null)).then(prepared=>{
   if(disposed||request!==loadRequest){prepared.dispose();return;}
   reveal=prepared;
  }).catch(error=>{
   if(!disposed&&request===loadRequest)$('status').textContent='Révélation indisponible · '+error.message;
  });
 }
 }
 catch(e){$('status').textContent='Panorama indisponible : '+e.message;}
 finally{busy=false;$('veil').classList.remove('visible');}
}
try{renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});renderer.outputColorSpace=T.SRGBColorSpace;scene=new T.Scene();camera=new T.PerspectiveCamera(70,1,.1,10);camera.rotation.order='YXZ';resize();switchScene(panoramaIndex(new URLSearchParams(location.search).get('scene')));
 function loop(now){if(disposed)return;raf=requestAnimationFrame(loop);const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(document.hidden)return;
 if(revealEnabled&&panoramas[index].id==='salle3'&&!busy){
  if(visibleSince!==null)elapsed+=Math.max(0,now-visibleSince)/1000;
  visibleSince=now;
 }
 if(!started&&reveal&&elapsed>=10){
  started=true;elapsed=10;document.body.classList.add('revealing');keys.clear();drag=null;
  reveal.start(camera);
  for(const id of revealControls)$(id).disabled=true;
  $('status').textContent='';
 }
 if(started){
  reveal.render(camera,elapsed-10,walk,dt);
  if(walk?.active&&!document.body.classList.contains('exploring')){
   document.body.classList.add('exploring');
   $('status').textContent='Déplacement au sol';
   $('reactor').textContent='Rejouer la révélation';
  }
  $('angle').textContent=elapsed>=20.8?'Cube N1, N2 et N3 · laboratoire':'';
  return;
 }
 const dx=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyQ')||keys.has('KeyA')?1:0),dy=(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0);if(dx||dy){yaw-=dx*dt*1.1;pitch+=dy*dt*.8;dirty=true;}
 const zoom=(keys.has('KeyS')?1:0)-(keys.has('KeyW')||keys.has('KeyZ')?1:0);if(zoom){fov+=zoom*dt*25;dirty=true;}
 if(dirty){const v=view(yaw,pitch,fov);({yaw,pitch,fov}=v);camera.rotation.set(pitch,yaw,0);camera.fov=fov;camera.updateProjectionMatrix();renderer.render(scene,camera);dirty=false;$('angle').textContent='Regard '+Math.round(-yaw*180/Math.PI)+'° · inclinaison '+Math.round(pitch*180/Math.PI)+'°';}
 }raf=requestAnimationFrame(loop);
}catch(e){$('status').textContent='WebGL indisponible : '+e.message;}
for(const [next,p]of panoramas.entries())$(p.button).onclick=()=>{
 if(p.id==='salle3'&&walk?.active){
  walk.stop();document.body.classList.remove('exploring');
  elapsed=10;visibleSince=null;
  camera.rotation.set(0,p.yaw||0,0);
  camera.fov=70;
  reveal.start(camera);
  $('status').textContent='';
  $('reactor').textContent=p.title;
  return;
 }
 switchScene(next);
};
for(const [id,amount]of [['left',Math.PI/2],['right',-Math.PI/2]])$(id).onclick=()=>{yaw+=amount;dirty=true;};$('reset').onclick=()=>{yaw=panoramas[index].yaw||0;pitch=0;fov=70;dirty=true;};
canvas.addEventListener('pointerdown',e=>{if(started)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch};canvas.setPointerCapture(e.pointerId);canvas.focus();},{signal});canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;yaw=drag.yaw+(e.clientX-drag.x)*.006;pitch=drag.pitch+(e.clientY-drag.y)*.004;dirty=true;},{signal});for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{drag=null;},{signal});
canvas.addEventListener('wheel',e=>{if(started)return;e.preventDefault();fov+=e.deltaY*.025;dirty=true;},{passive:false,signal});addEventListener('keydown',e=>{if(started||e.target.closest('button,a'))return;if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','KeyD','KeyQ','KeyA','KeyW','KeyZ','KeyS'].includes(e.code)){keys.add(e.code);e.preventDefault();}},{signal});addEventListener('keyup',e=>keys.delete(e.code),{signal});addEventListener('blur',()=>{keys.clear();drag=null;},{signal});document.addEventListener('visibilitychange',()=>{keys.clear();drag=null;last=0;visibleSince=null;dirty=true;},{signal});addEventListener('resize',resize,{signal});
$('export').onclick=async()=>{if(!cube||busy)return;busy=true;$('export').disabled=true;const selection=index,files=[],size=cube.width;try{
 for(let face=0;face<6;face++){const pixels=new Uint8Array(size*size*4);renderer.readRenderTargetPixels(cube,0,0,size,size,pixels,face);const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),data=ctx.createImageData(size,size);data.data.set(pixels);ctx.putImageData(data,0,0);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));files.push([faces[face]+'.png',new Uint8Array(await blob.arrayBuffer())]);}
 files.push(['LIRE.txt',new TextEncoder().encode('Faces cubemap Three.js: px +X droite, nx -X gauche, py +Y haut, ny -Y bas, pz +Z arriere, nz -Z avant. Camera initiale vers -Z. Images derivees du panorama genere, interpretation artistique des references NOCTIS / CORTEX. Pas de profondeur geometrique. Resolution de face indiquee par les dimensions des PNG.')]);const url=URL.createObjectURL(zip(files)),a=document.createElement('a');a.href=url;a.download=panoramas[selection].slug+'-cube-6-faces.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);$('status').textContent='Six faces PNG exportées · '+panoramas[selection].slug;
 }catch(e){$('status').textContent='Export impossible : '+e.message;}finally{busy=false;$('export').disabled=false;}};
function dispose(){if(disposed)return;disposed=true;life.abort();cancelAnimationFrame(raf);reveal?.dispose();cube?.dispose();renderer?.dispose();}
addEventListener('pagehide',event=>{if(!event.persisted)dispose();},{signal});
addEventListener('pageshow',event=>{if(event.persisted&&departureStarted)location.reload();},{signal});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();dispose();$('status').textContent='Affichage interrompu : rechargez cette page.';});
