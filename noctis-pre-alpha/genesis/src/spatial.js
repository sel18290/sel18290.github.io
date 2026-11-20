import {gardenContains,createGardenWorld} from './garden-world.js';
import {sectorContains} from './sector-plan.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createOrbitalView} from './orbital-view.js';
import {createGardenUniverse,createGardenLighting} from './garden-universe.js';
import {loadGardenSurfaces} from './garden-finishes.js';
import {loadSurfaceLibrary} from './surface-library.js';
import {createHeroMachine} from './hero-machines.js';
import {createWalker,sightScore} from './navigation.js';
import {renderProfiles,selectProfile,resolution} from './render-profile.js';
import {gardenPolicy,gardenRuntimeResolution} from './garden-policy.js';
import {applyGardenContact} from './garden-contact.js';
import {applyFloorLight} from './floor-light.js';
import {createLightingRig} from './lighting-rig.js';
import {createSpatialAudio} from './spatial-audio.js';
import {createFrameBudget} from './frame-budget.js';
import {createGpuTiming} from './gpu-timing.js';
import {isMobileRenderer} from './render-device.js';
import {prepareRenderer} from './prepare-renderer.js';
import {SpatialUpscaler} from './spatial-upscaler.js';
import {createFrameTelemetry} from './frame-telemetry.js';
import {createHubWorld} from './hub-world.js';
import {hubContains,hubFloorHeight,hubArrival} from './hub-plan.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SparkRenderer,SplatMesh} from '@sparkjsdev/spark';

export function spatial(canvas,blueprint,signal){
  const isGarden=blueprint.space.network==='garden';
  const mobile=isMobileRenderer({coarse:matchMedia('(pointer:coarse)').matches,hover:matchMedia('(hover:hover)').matches,touchPoints:navigator.maxTouchPoints||0,uaMobile:navigator.userAgentData?.mobile===true,width:innerWidth,height:innerHeight}),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params=new URLSearchParams(location.search),isN05=blueprint.id==='n05-apercu',optimize=!(isN05||isGarden)||params.get('perf')!=='reference';
  const hubEnabled=isGarden&&params.get('hub')!=='0';
  const adaptive=(isN05||isGarden)&&optimize&&params.get('adaptive')!=='0';
  const upscale=(isN05||isGarden)&&optimize&&params.get('upscale')==='spatial';
  const budget=createFrameBudget({enabled:adaptive,minScale:isGarden?.78:.72});
  const gardenConfig=isGarden?gardenPolicy({quality:params.get('quality'),mobile,reference:!optimize}):null;
  const profileName=gardenConfig?.name??selectProfile(params.get('quality'),mobile),profile=renderProfiles[profileName];
  // Keep native AA by default for the hard-surface meshes. aa=off is an explicit
  // diagnostic ablation: Spark itself does not benefit from multisampling.
  const renderer=new T.WebGLRenderer({canvas,antialias:!upscale&&!((isN05||isGarden)&&params.get('aa')==='off'),powerPreference:mobile?'default':'high-performance'});
  renderer.outputColorSpace=T.SRGBColorSpace;
  // Spark runs internal passes: collect all calls rather than only the last pass.
  renderer.info.autoReset=false;
  const gpu=params.get('diagnostics')==='1'?createGpuTiming(renderer.getContext()):null;
  const upscaler=upscale?new SpatialUpscaler(renderer):null,telemetry=createFrameTelemetry();
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(65,1,.05,1200);
  camera.rotation.order='YXZ';camera.position.fromArray(blueprint.space.spawn);scene.background=new T.Color(0x17253b);
  if(hubEnabled){const arrival=hubArrival(params.get('arrival'));if(arrival){camera.position.fromArray(arrival.position);camera.rotation.y=arrival.yaw;}}
  const hemi=new T.HemisphereLight(0xdce7ed,0x282d36,.75);scene.add(hemi);
  const key=new T.DirectionalLight(0xffdfc5,1.25);key.position.set(-3,4,-6);scene.add(key);
  const splatCounts=new Map(),bufferSize=new T.Vector2();
  const obstacles=[...blueprint.space.obstacles],blockers=new Map(),keys=new Set(),ticks=new Set(),modelRoots=new Set();
  const walkable=blueprint.space.network==='garden'?(hubEnabled?hubContains:gardenContains):blueprint.space.network==='orbital'?sectorContains:(x,z)=>Math.abs(x)<=blueprint.space.width/2-.24&&Math.abs(z)<=blueprint.space.depth/2-.24;
  const walker=createWalker(camera.position,walkable,obstacles),ambience=createSpatialAudio();
  const loader=new GLTFLoader(),cache=new Map(),resources=new Set(),ownedCleanups=new Set();
  let tickSector,rig,gardenRig,hubWorld,surfaces,disposed=false,drag=null,stick=null,side=0,forward=0,paused=false;
  const assertActive=()=>{if(disposed||signal.aborted)throw new DOMException('Chargement interrompu','AbortError');};
  const track=root=>root.traverse(o=>{if(o.isMesh){resources.add(o.geometry);for(const m of [].concat(o.material)){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);}}});
  const on=(el,type,fn)=>el?.addEventListener(type,fn,{signal});
  const clear=()=>{keys.clear();side=forward=0;drag=stick=null;walker.stop();};
  on(window,'blur',clear);on(document,'visibilitychange',()=>{if(document.hidden)clear();});
  const editing=e=>e.target?.closest?.('input,textarea,select,[contenteditable=true]');
  on(window,'keydown',e=>{if(!paused&&!editing(e)&&['KeyW','KeyZ','KeyA','KeyQ','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){keys.add(e.code);e.preventDefault();}});
  on(window,'keyup',e=>keys.delete(e.code));
  on(canvas,'pointerdown',e=>{if(paused)return;drag=[e.pointerId,e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);canvas.focus();});
  on(canvas,'pointermove',e=>{if(drag?.[0]!==e.pointerId||paused)return;
    camera.rotation.y-=(e.clientX-drag[1])*.003;camera.rotation.x=T.MathUtils.clamp(camera.rotation.x-(e.clientY-drag[2])*.003,-1.45,1.45);drag=[e.pointerId,e.clientX,e.clientY];});
  on(canvas,'lostpointercapture',()=>drag=null);on(canvas,'pointercancel',clear);
  const pad=document.querySelector('#pad');
  function joystick(e){const r=pad.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width/2),z=(e.clientY-r.top-r.height/2)/(r.height/2),n=Math.max(1,Math.hypot(x,z));side=x/n;forward=-z/n;}
  on(pad,'pointerdown',e=>{if(paused)return;stick=e.pointerId;pad.setPointerCapture(stick);joystick(e);});
  on(pad,'pointermove',e=>{if(stick===e.pointerId)joystick(e);});on(pad,'lostpointercapture',()=>{side=forward=0;stick=null;});
  let sizeWidth=0,sizeHeight=0,sizeRatio=0;
  const resize=()=>{const ratio=(isGarden?gardenRuntimeResolution(gardenConfig,devicePixelRatio,innerWidth,innerHeight,!optimize):resolution(profile,devicePixelRatio,innerWidth,innerHeight))*(upscaler&&!upscaler.failed?1:budget.scale);
    if(sizeRatio!==ratio){renderer.setPixelRatio(ratio);sizeRatio=ratio;}
    if(sizeWidth!==innerWidth||sizeHeight!==innerHeight){renderer.setSize(innerWidth,innerHeight,false);sizeWidth=innerWidth;sizeHeight=innerHeight;}
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};resize();on(window,'resize',()=>{budget.reset();telemetry.reset();resize();});
  on(document,'visibilitychange',()=>{budget.reset();telemetry.reset();});
  function block(position,r,id){const item=typeof r==='number'?[position[0],position[2],r]:{x:position[0],z:position[2],halfX:r[0],halfZ:r[1]};obstacles.push(item);if(id)blockers.set(id,item);
    let removed=false;return ()=>{if(removed)return;removed=true;const i=obstacles.indexOf(item);if(i>=0)obstacles.splice(i,1);if(blockers.get(id)===item)blockers.delete(id);};}
  const api={
    mobile,reduced,profileName,hubEnabled,adaptiveEnabled:adaptive,upscaleEnabled:upscale,position:camera.position,
    openHubGate(id){hubWorld?.open(id);},
    async prepare(){
      assertActive();rig?.update(camera.position,camera);
      await prepareRenderer(renderer,scene,camera,{signal,stableLights:optimize});assertActive();
      if(upscaler)await renderer.compileAsync(upscaler.scene,upscaler.camera);assertActive();
    },
    diagnostics(){renderer.getDrawingBufferSize(bufferSize);return {version:'stable-chrome-r1',scene:blueprint.id,profile:profileName,mobile,adaptive,upscale,upscaleFailed:upscaler?.failed??false,output:[bufferSize.x,bufferSize.y],renderScale:budget.scale,splats:[...splatCounts.values()].reduce((a,b)=>a+b,0),...telemetry.snapshot()};},
    pause(value){paused=value;clear();},
    audio(value){return ambience.enable(value);},
    score(object,range){return sightScore(camera.position,camera.rotation.y,camera.rotation.x,object.position,range,walkable,obstacles,blockers.get(object.id));},
    block,
    async garden(){
      try{surfaces=await loadGardenSurfaces(renderer,{mobile:gardenConfig.mobileTextures});assertActive();}
      catch(error){surfaces?.dispose();surfaces=null;throw error;}
      let universe,lighting,world,releaseContact;
      const oldHemi=hemi.visible,oldKey=key.visible;
      try{
        if(optimize)releaseContact=applyGardenContact(surfaces.materials.deck);
        universe=createGardenUniverse(scene,renderer);lighting=createGardenLighting(scene,profile,{optimize,cullLights:optimize&&params.get('lightcull')!=='0'});gardenRig=lighting;
        world=createGardenWorld(surfaces.materials,reduced,{optimize,labelScale:gardenConfig.mobileTextures?.5:1});scene.add(world.root);obstacles.push(...world.obstacles);
        if(hubEnabled){hubWorld=createHubWorld(surfaces.materials,{labelScale:gardenConfig.mobileTextures?.5:1,reduced});scene.add(hubWorld.root);obstacles.push(...hubWorld.obstacles);}
      }catch(error){hubWorld?.dispose();hubWorld=null;world?.dispose();lighting?.dispose();gardenRig=null;universe?.dispose();releaseContact?.();surfaces.dispose();surfaces=null;throw error;}
      const gardenObstacles=[...world.obstacles,...(hubWorld?.obstacles||[])];
      for(const object of blueprint.objects){const own=gardenObstacles.find(o=>Array.isArray(o)&&Math.hypot(o[0]-object.position[0],o[1]-object.position[2])<.05);if(own)blockers.set(object.id,own);}
      hemi.visible=false;key.visible=false;
      renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
      renderer.shadowMap.enabled=profile.shadows;renderer.shadowMap.type=T.PCFSoftShadowMap;
      let done=false;const cleanup=()=>{if(done)return;done=true;hubWorld?.dispose();hubWorld=null;world.dispose();lighting.dispose();gardenRig=null;universe.dispose();releaseContact?.();hemi.visible=oldHemi;key.visible=oldKey;surfaces.dispose();surfaces=null;ownedCleanups.delete(cleanup);};ownedCleanups.add(cleanup);
      const botanical=[];
      try{
        if(!optimize){for(let part=1;part<=2;part++)botanical.push(await api.splats('/noctis-pre-alpha/genesis/assets/n06-botanical-'+part+'.splat',[0,0,0],700000));}
        else if(gardenConfig.botanical==='hd'){for(let part=1;part<=2;part++)botanical.push(await api.splats('/noctis-pre-alpha/genesis/assets/n06-surface-hd-'+part+'.splat',[0,0,0],700000));}
        else botanical.push(await api.splats('/noctis-pre-alpha/genesis/assets/n06-surface-'+gardenConfig.botanical+'.splat',[0,0,0],gardenConfig.count));
      }
      catch(error){botanical.forEach(volume=>volume.dispose());throw error;}
      world.setGaussianFoliage(true);
      const dispose=()=>{botanical.forEach(volume=>volume.dispose());cleanup();};
      return {update(dt,state){world.update(dt,state);lighting.update(dt,state,camera);universe.update(camera);
        const factor=state.light?.88:1;for(const volume of botanical)volume.illuminate(.88*factor,.98*factor,1.14*factor);
      },dispose};
    },
    async orbital(url){
      let texture,reflection,environment,releaseFloor;const generator=new T.PMREMGenerator(renderer);
      try{
        texture=url?await new T.TextureLoader().loadAsync(url):null;if(texture)texture.colorSpace=T.SRGBColorSpace;
        surfaces=await loadSurfaceLibrary(renderer);releaseFloor=await applyFloorLight(surfaces.materials.deck,renderer);assertActive();
        // Reflection studio uses the same warm/cool family as the installed fixtures.
        const studio=new RoomEnvironment();reflection=generator.fromScene(studio,.06);studio.dispose();
        scene.environment=reflection.texture;scene.environmentIntensity=.65;
        environment=createOrbitalView(texture,{},null,surfaces.materials,{optimize:optimize&&params.get('batching')!=='0'});scene.add(environment);tickSector=environment.userData.tickSector;
        rig=createLightingRig(scene,renderer,profile,{optimize:optimize&&params.get('lightcull')!=='0'});renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
      }catch(e){environment?.userData.dispose();reflection?.dispose();texture?.dispose();releaseFloor?.();surfaces?.dispose();throw e;}finally{generator.dispose();}
      let done=false;const cleanup=()=>{if(done)return;done=true;rig?.dispose();rig=null;tickSector=null;environment.userData.dispose();scene.environment=null;reflection.dispose();texture?.dispose();releaseFloor?.();surfaces?.dispose();surfaces=null;ownedCleanups.delete(cleanup);};ownedCleanups.add(cleanup);return cleanup;
    },
    async model(url,position,height,options={}){
      if(!cache.has(url))cache.set(url,loader.loadAsync(url).then(g=>{track(g.scene);if(disposed){resources.forEach(r=>r.dispose());resources.clear();}return g;}));
      const gltf=await cache.get(url);assertActive();const root=gltf.scene.clone(true);
      const bounds=new T.Box3().setFromObject(root),s=height/(bounds.max.y-bounds.min.y),center=bounds.getCenter(new T.Vector3());
      if(!Number.isFinite(s)||s<=0)throw Error('Dimensions du modèle invalides');
      root.scale.multiplyScalar(s);root.position.set(position[0]-center.x*s,position[1]-bounds.min.y*s,position[2]-center.z*s);
      root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(root);modelRoots.add(root);
      const mixer=gltf.animations.length?new T.AnimationMixer(root):null;
      if(mixer&&!reduced)for(const clip of gltf.animations)mixer.clipAction(clip).play();
      const tick=dt=>{if(root.visible)mixer?.update(dt);};ticks.add(tick);
      const size=bounds.getSize(new T.Vector3()).multiplyScalar(s);
      const unblock=options.collider?block(position,[size.x/2,size.z/2],options.id):()=>{};
      let done=false;return ()=>{if(done)return;done=true;unblock();ticks.delete(tick);mixer?.stopAllAction();mixer?.uncacheRoot(root);root.removeFromParent();modelRoots.delete(root);};
    },
    machine(kind,position,id){
      assertActive();const machine=createHeroMachine(kind,{reducedMotion:reduced});machine.root.position.fromArray(position);
      machine.root.traverse(o=>{if(o.isMesh){o.castShadow=!o.material?.transparent;o.receiveShadow=true;}});scene.add(machine.root);modelRoots.add(machine.root);
      const unblock=block(position,machine.collider,id);let done=false;
      return {...machine,get state(){return machine.state;},dispose(){if(done)return;done=true;unblock();modelRoots.delete(machine.root);machine.dispose();}};
    },
    async splats(url,position,expectedCount){
      let spark=scene.getObjectByName('genesis-spark');if(!spark){spark=new SparkRenderer({renderer,depthTest:true,blurAmount:isGarden?.02:.12,enableLod:!isGarden,maxStdDev:isGarden&&optimize&&mobile?Math.sqrt(5):Math.sqrt(8)});spark.name='genesis-spark';scene.add(spark);}
      const volume=new SplatMesh({url,nonLod:isGarden,raycastable:!isGarden,onProgress:event=>{
        if(expectedCount){const el=document.querySelector('#loading p');if(el)el.textContent='Chargement des '+(gardenConfig?.count??expectedCount).toLocaleString('fr-FR')+' gaussiennes… '+(event.total?Math.round(event.loaded/event.total*100)+' %':Math.round(event.loaded/1048576)+' Mo');}
      }});volume.position.fromArray(position);scene.add(volume);
      try{await volume.initialized;assertActive();
        const count=volume.splats.getNumSplats();
        if(expectedCount&&count!==expectedCount)throw Error('Nombre de gaussiennes incorrect : '+count);
        splatCounts.set(volume,count);}catch(e){volume.removeFromParent();volume.dispose();throw e;}
      let done=false;return {tint:v=>volume.recolor.setRGB(v,.96*v,.94*v),illuminate:(r,g,b)=>volume.recolor.setRGB(r,g,b),dispose(){if(done)return;done=true;splatCounts.delete(volume);volume.removeFromParent();volume.dispose();}};
    },
    start(update){let previous,lastStats,frames=0,cpuTotal=0,callsTotal=0,trianglesTotal=0,lastCpu=0;renderer.setAnimationLoop(time=>{
      const interval=time-(previous??time),dt=Math.min(.05,interval/1000);previous=time;
      if(document.hidden){lastStats=undefined;frames=cpuTotal=callsTotal=trianglesTotal=0;return;}
      lastStats??=time;
      if(budget.sample(interval,!paused,{gpuMs:gpu?.milliseconds,cpuMs:lastCpu}))resize();
      const cpuStart=performance.now();renderer.info.reset();
      if(!paused){const down=(...codes)=>Number(codes.some(c=>keys.has(c)));walker.step(dt,camera.rotation.y,side+down('KeyD','ArrowRight')-down('KeyA','KeyQ','ArrowLeft'),forward+down('KeyW','KeyZ','ArrowUp')-down('KeyS','ArrowDown'));tickSector?.(dt);for(const tick of ticks)tick(dt);}
      if(hubEnabled)camera.position.y=blueprint.space.spawn[1]+hubFloorHeight(camera.position.x,camera.position.z);
      for(const root of modelRoots)root.visible=Math.hypot(root.position.x-camera.position.x,root.position.z-camera.position.z)<profile.visibility;
      rig?.update(camera.position,camera);ambience.update(camera.position,camera.rotation.y,paused);update(paused?0:dt);
      hubWorld?.update(dt);
      const upscaleFailed=upscaler?.failed;gpu?.begin();if(upscaler)upscaler.render(scene,camera,.8*budget.scale);else renderer.render(scene,camera);gpu?.end();if(upscaler?.failed&&!upscaleFailed)resize();frames++;
      lastCpu=performance.now()-cpuStart;cpuTotal+=lastCpu;callsTotal+=renderer.info.render.calls;trianglesTotal+=renderer.info.render.triangles;
      if(!paused)telemetry.record(interval,{shaderPrograms:renderer.info.programs?.length??0,cpuMs:lastCpu,gpuMs:gpu?.milliseconds??null});
      if(time-lastStats>=1000){renderer.getDrawingBufferSize(bufferSize);const el=document.querySelector('#metrics'),stats=telemetry.snapshot();if(el)el.textContent=bufferSize.x+' × '+bufferSize.y+' px · '+[...splatCounts.values()].reduce((a,b)=>a+b,0).toLocaleString('fr-FR')+' gaussiennes chargées · '+Math.round(frames*1000/(time-lastStats))+' FPS · p95 '+stats.p95Ms.toFixed(1)+' ms · '+stats.over33ms+' images >33 ms · '+Math.round(callsTotal/frames)+' appels · '+Math.round(trianglesTotal/frames/1000)+' k triangles · CPU '+(cpuTotal/frames).toFixed(1)+' ms'+(gpu?.milliseconds!=null?' · GPU '+gpu.milliseconds.toFixed(1)+' ms':'')+' · '+stats.shaderPrograms+' shaders'+(rig?' · '+rig.activeLights+'/11 lumières':'')+(gardenRig?' · '+gardenRig.activeLights+'/12 lumières':'')+(adaptive?' · échelle '+Math.round(budget.scale*100)+' %':'')+(upscaler?(upscaler.failed?' · spatial indisponible, rendu direct':' · spatial '+upscaler.inputWidth+' × '+upscaler.inputHeight):'');frames=0;cpuTotal=callsTotal=trianglesTotal=0;lastStats=time;}
    });},
    dispose(){if(disposed)return;disposed=true;renderer.setAnimationLoop(null);clear();gpu?.dispose();upscaler?.dispose();for(const cleanup of [...ownedCleanups])cleanup();ambience.dispose();resources.forEach(r=>r.dispose());resources.clear();cache.clear();scene.getObjectByName('genesis-spark')?.dispose();renderer.dispose();}
  };
  on(canvas,'webglcontextlost',e=>{e.preventDefault();api.pause(true);renderer.setAnimationLoop(null);const el=document.querySelector('#loading');if(el){el.hidden=false;el.textContent='Affichage interrompu. Rechargez la salle ; vos objectifs restent enregistrés.';}});
  return api;
}
