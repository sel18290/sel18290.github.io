import * as T from 'three';
import {levelDefinition,checkBudget} from './levels.js';
import {physics} from './physics.js';
import {controls} from './input.js';
import {loadGardenSurfaces} from '../../genesis/src/garden-finishes.js';
import {createGardenUniverse,createGardenLighting} from '../../genesis/src/garden-universe.js';
import {SparkRenderer,SplatMesh} from '@sparkjsdev/spark';
import {gardenPolicy,gardenRuntimeResolution} from '../../genesis/src/garden-policy.js';
import {applyGardenContact} from '../../genesis/src/garden-contact.js';
import {GenesisBridge} from '../../genesis/src/bridge.js';
import {adapters} from '../../genesis/src/adapters.js';
import {renderProfiles,selectProfile,resolution} from '../../genesis/src/render-profile.js';
import {isMobileRenderer} from '../../genesis/src/render-device.js';
import {createFrameBudget} from '../../genesis/src/frame-budget.js';
import {createFrameTelemetry} from '../../genesis/src/frame-telemetry.js';
import {prepareRenderer} from '../../genesis/src/prepare-renderer.js';
import {idleAnnouncement} from './idle-announcement.js';
import {robotSpeech} from './central-voice.js';

const $=id=>document.getElementById(id),lifetime=new AbortController(),signal=lifetime.signal;
let renderer,surfaces,universe,architecture,walker,disposed=false,playing=false,gardenLights,releaseContact,spark,questBridge,questScope,centralVoice,idleVoice;const botanicals=[];
const release=()=>{if(disposed)return;disposed=true;lifetime.abort();idleVoice?.dispose();centralVoice?.dispose();questBridge?.exit();renderer?.setAnimationLoop(null);botanicals.forEach(v=>v.dispose());spark?.dispose();gardenLights?.dispose();releaseContact?.();walker?.dispose();architecture?.dispose();universe?.dispose();surfaces?.dispose();renderer?.dispose();};
addEventListener('pagehide',release,{once:true});
async function start(){
 const params=new URLSearchParams(location.search),mobile=isMobileRenderer({coarse:matchMedia('(pointer:coarse)').matches,hover:matchMedia('(hover:hover)').matches,touchPoints:navigator.maxTouchPoints,width:innerWidth,height:innerHeight});
 const level=levelDefinition(params.get('level')||'atelier');const arrival=level.arrivals.find(a=>a.id===params.get('arrival'))||level.arrivals[0];document.title=level.title+' · NOCTIS';document.querySelector('h1').textContent=level.title;
 if(params.get('level')==='n06-etendue'){
  const caption=document.createElement('section'),label=document.createElement('span'),text=document.createElement('p'),retry=document.createElement('button');
  caption.className='central-subtitles';caption.hidden=true;caption.setAttribute('aria-label','Sous-titres de l’IA centrale');label.className='eyebrow';label.textContent='IA CENTRALE · COMMUNICATION';retry.textContent='Écouter l’alerte';retry.hidden=true;caption.append(label,text,retry);document.body.append(caption);
  centralVoice=robotSpeech({onCaption:line=>{text.textContent=line;caption.hidden=!line;},onState:state=>{caption.dataset.state=state;retry.hidden=state!=='blocked';}});
  retry.onclick=()=>{centralVoice.unlock();centralVoice.retry();};
  let storage;try{storage=sessionStorage;}catch{}
  idleVoice=idleAnnouncement({storage,onTrigger:()=>centralVoice.play()});
 }
 const profileName=selectProfile(params.get('quality'),mobile),profile=renderProfiles[profileName],budget=createFrameBudget({enabled:params.get('adaptive')!=='0',minScale:level.garden?.78:.72}),telemetry=createFrameTelemetry();
 renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:mobile?'default':'high-performance'});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(65,1,.05,1200);camera.rotation.order='YXZ';
 const input=controls($('world'),$('pad'),signal),resize=()=>{renderer.setPixelRatio((level.garden?gardenRuntimeResolution(gardenPolicy({quality:profileName,mobile}),devicePixelRatio,innerWidth,innerHeight):resolution(profile,devicePixelRatio,innerWidth,innerHeight))*budget.scale);renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};resize();
 addEventListener('resize',()=>{budget.reset();telemetry.reset();resize();},{signal});
 const check=()=>{if(disposed)throw new DOMException('Chargement interrompu','AbortError');};
 const adopt=resource=>{if(disposed){resource.dispose();check();}return resource;};
 surfaces=adopt(await loadGardenSurfaces(renderer,{mobile:mobile&&profileName!=='detail'}));check();
 architecture=level.create(surfaces.materials,{mobile});if(level.garden)architecture.batchStatic();checkBudget(architecture,level.budgets);architecture.travel=id=>{const query=new URLSearchParams({room:id});if(params.has('quality'))query.set('quality',profileName);location.assign('/architecture/visit.html?'+query);};scene.add(architecture.root);universe=createGardenUniverse(scene,renderer);
 const hemi=new T.HemisphereLight(0xb8d4ff,0x31434a,1.3),key=new T.DirectionalLight(0xc6daff,3.2);key.position.set(-14,25,10);key.castShadow=profile.shadows;key.shadow.mapSize.set(profile.shadowSize,profile.shadowSize);Object.assign(key.shadow.camera,{left:-24,right:24,top:22,bottom:-22,near:1,far:70});key.shadow.normalBias=.025;scene.add(hemi,key);
 const warm=new T.PointLight(0xffcf9a,110,22,2);warm.position.set(11,5,6);scene.add(warm);
 if(level.garden){hemi.visible=false;key.visible=false;warm.visible=false;gardenLights=createGardenLighting(scene,profile,{optimize:true});releaseContact=applyGardenContact(surfaces.materials.deck);
  for(const [x,y,z,color]of [[0,3.8,28,0xffd5af],[-38,3.5,34,0xffd3a1],[38,3.5,34,0xbddfff],[0,9.5,40,0xc8daff]]){const lamp=new T.PointLight(color,x===0&&z===28?120:45,12,2);lamp.position.set(x,y,z);scene.add(lamp);}
  spark=new SparkRenderer({renderer,depthTest:true,enableLod:false,blurAmount:.02,maxStdDev:mobile?Math.sqrt(5):Math.sqrt(8)});spark.name='genesis-spark';scene.add(spark);
  const policy=gardenPolicy({quality:profileName,mobile});const files=policy.botanical==='hd'?['hd-1','hd-2']:[policy.botanical];
  for(const file of files){const volume=new SplatMesh({url:'/genesis/assets/n06-surface-'+file+'.splat',nonLod:true,raycastable:false});botanicals.push(volume);scene.add(volume);await volume.initialized;check();volume.recolor.setRGB(.88,.98,1.14);}
  architecture.garden.setGaussianFoliage(true);document.querySelector('#welcome h2').textContent='Explorez le campus orbital';document.querySelector('#welcome p').textContent='Le jardin d’origine ouvre au sud sur les nouveaux habitats, le laboratoire et une circulation sur deux étages. La rampe ambre et l’ascenseur relient les niveaux.';
 }
 renderer.shadowMap.enabled=profile.shadows;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 walker=adopt(await physics(architecture,{spawn:arrival.position}));check();input.yaw=arrival.yaw;camera.position.copy(walker.position);camera.position.y+=1.65;
 await prepareRenderer(renderer,scene,camera,{signal});check();
 const setPlaying=value=>{playing=value;input.enabled=value;walker.stop();idleVoice?.reset();if(value)centralVoice?.unlock();else centralVoice?.cancel();budget.reset();telemetry.reset();$('welcome').hidden=value;$('pause').textContent=value?'Pause':'Reprendre';if(value)$('world').focus();};
 const questActions=new Map();
 if(level.garden){
  const bp=await (await fetch('/genesis/scenes/n06.json',{signal})).json();check();bp.objects=bp.objects.filter(o=>!o.components.hubGate);
  const dialog=document.createElement('dialog'),close=document.createElement('button'),panel=document.createElement('div');close.textContent='Fermer le dossier';dialog.append(close,panel);document.body.append(dialog);close.onclick=()=>dialog.close();dialog.onclose=()=>{playing=true;input.enabled=true;};
  questBridge=new GenesisBridge(adapters);questScope=await questBridge.enter(bp,{garden:async()=>({update(){},dispose(){}}),
   action(object,config,activate){architecture.target('quest-'+object.id,{position:[object.position[0],1.38,object.position[2]],label:config.label,range:config.range});questActions.set('quest-'+object.id,activate);return ()=>questActions.delete('quest-'+object.id);},
   panel(){playing=false;input.enabled=false;walker.stop();idleVoice?.reset();centralVoice?.cancel();if(!dialog.open)dialog.showModal();return panel;},status:text=>$('message').textContent=text});
 }
 $('loading').hidden=true;$('enter').hidden=false;$('enter').onclick=()=>setPlaying(true);$('pause').onclick=()=>setPlaying(!playing);
 for(const arrival of level.arrivals.filter(a=>!a.hidden)){const button=document.createElement('button');button.dataset.arrival=arrival.id;button.textContent=arrival.label;$('arrivals').insertBefore(button,$('pause'));button.onclick=()=>{walker.reset(arrival.position);input.yaw=arrival.yaw;input.pitch=0;$('message').textContent='Approchez un repère circulaire et regardez-le.';setPlaying(true);};}
 $('quality').value=profileName;$('quality').onchange=()=>{params.set('quality',$('quality').value);location.search=params.toString();};
 let selected=null;const activate=()=>{if(!playing||!selected)return;const quest=questActions.get(selected.id);if(quest){quest();return;}architecture.activate?.(selected.id);$('message').textContent=selected.label+' · commande confirmée';};$('interact').onclick=activate;
 addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.repeat)activate();if(e.code==='Escape'&&!document.querySelector('dialog[open]'))setPlaying(false);},{signal});
 $('diagnostic').onclick=()=>{const blob=new Blob([JSON.stringify({scene:'architecture-r1',profile:profileName,mobile,geometry:architecture.cost(),colliders:walker.colliderCount,output:[renderer.domElement.width,renderer.domElement.height],...telemetry.snapshot()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='noctis-architecture-diagnostic.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('world').addEventListener('webglcontextlost',e=>{e.preventDefault();setPlaying(false);$('loading').hidden=false;$('loading').textContent='Affichage interrompu. Rechargez cette page.';renderer.setAnimationLoop(null);},{signal});
 addEventListener('visibilitychange',()=>{walker.stop();idleVoice?.reset();if(document.hidden)centralVoice?.cancel();budget.reset();telemetry.reset();},{signal});
 let previous,stamp=0,cpu=0;const direction=new T.Vector3();
 renderer.setAnimationLoop(now=>{
  const ms=now-(previous??now);previous=now;if(document.hidden)return;
  if(budget.sample(ms,playing,{cpuMs:cpu}))resize();const begin=performance.now();
  if(playing)walker.step(ms/1000,input.movement());if(walker.position.y<-8){walker.reset();idleVoice?.reset();$('message').textContent='Retour à l’entrée de la galerie.';}
  idleVoice?.sample(now,walker.position,{level:params.get('level'),active:playing&&!document.hidden});
  camera.position.copy(walker.visualPosition);camera.position.y+=1.65;camera.rotation.set(input.pitch,input.yaw,0,'YXZ');universe.update(camera);
  if(level.garden){questBridge?.update(playing?Math.min(.05,ms/1000):0);const state={light:questScope?.achieved('light'),rest:questScope?.achieved('rest'),meal:questScope?.achieved('meal'),complete:questScope?.achieved('safety')};architecture.garden.update(playing?Math.min(.05,ms/1000):0,state);gardenLights.update(Math.min(.05,ms/1000),state,camera);const factor=state.light?.88:1;for(const v of botanicals)v.recolor.setRGB(.88*factor,.98*factor,1.14*factor);}
  camera.getWorldDirection(direction);selected=playing?walker.select(camera.position,direction):null;$('interact').hidden=!selected;if(selected)$('interact').textContent=selected.label+' · E';
  renderer.render(scene,camera);cpu=performance.now()-begin;if(playing)telemetry.record(ms,{cpuMs:cpu,shaderPrograms:renderer.info.programs?.length??0});
  if(now-stamp>500){stamp=now;const stats=telemetry.snapshot();$('position').textContent='Sol : '+walker.position.y.toFixed(2)+' m · '+(walker.grounded?'Appui au sol':'En descente');$('metrics').textContent='p95 '+stats.p95Ms.toFixed(1)+' ms · '+stats.over33ms+' images >33 ms · '+renderer.info.render.calls+' appels · '+Math.round(renderer.info.render.triangles/1000)+' k triangles · échelle '+Math.round(budget.scale*100)+' %';}
 });
}
start().catch(error=>{if(error.name==='AbortError')return;console.error(error);release();$('loading').textContent='L’atelier ne peut pas démarrer : '+error.message;});
