import * as T from '../vendor/three.module.js';
import {Reflector} from './floor-reflector.js';
import {loadCubeFaces} from './reveal-faces.js?v=5';
import {createRedPullback} from './red-pullback.js';
import {mountProjectors} from './lab-projectors.js?v=7';
import {createArtifact} from './lab-artifact.js?v=4';
import {laboratoryFinish,dressLaboratory} from './lab-finishes.js?v=5';

import {mountWallCladding} from './lab-walls.js?v=5';
import {mountPerimeter} from './lab-perimeter.js';
import {mountLabDoor} from './lab-door.js?v=2';
import {portal,createPerimeterLap,eyeHeight,deckLevel,worldScale} from './lab-layout.js?v=6';
import {mountHangar} from './lab-hangar.js?v=4';
import {mountLaunchTerminal} from './lab-launch.js';
import {mountContainment} from './lab-containment.js?v=3';

const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);

export async function prepareReveal(renderer,panorama,onDeparture){

 const pullback=createRedPullback(panorama);
 const scene=new T.Scene();
 scene.background=new T.Color(0xe2eef4);
 const mobile=matchMedia('(pointer:coarse)').matches;
 const [faces,finish,marsMap]=await Promise.all([
  loadCubeFaces(panorama,Math.min(8,renderer.capabilities.getMaxAnisotropy())),
  laboratoryFinish(renderer,mobile),
  // Viking map credit: NASA/JPL-Caltech, processed at USGS (NASA Mars Image Texture).
  new T.TextureLoader().loadAsync('./assets/lab/mars-viking.jpg')
 ]);
 marsMap.colorSpace=T.SRGBColorSpace;
 marsMap.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const {wall:white,ceramic:panel,floor}=finish;
 function box(size,position,material=white){
  const mesh=new T.Mesh(new T.BoxGeometry(...size),material);
  mesh.position.set(...position);scene.add(mesh);return mesh;
 }
 box([32,.4,32],[0,-4.7,0],floor);
 box([32,.4,32],[0,7.5,0],floor);
 for(const sign of [-1,1]){
  box([32,12,.4],[0,1.4,sign*16]);
 }
 box([.4,12,32],[-portal.wall,1.4,0]);
 for(const side of [-1,1]){
  box([.4,12,portal.wall-portal.opening],[portal.wall,1.4,side*(portal.wall+portal.opening)/2]);
 }
 box([.4,7.5-portal.top,6],[portal.wall,(portal.top+7.5)/2,0]);
 const perimeter=mountPerimeter(scene,finish);
 const {group:hangar,updateSky,ship}=mountHangar(scene,finish,marsMap,mobile,renderer.getPixelRatio());
 const launcher=onDeparture?mountLaunchTerminal(hangar,finish,ship,onDeparture):null;
 const lap=createPerimeterLap();
 let destination='ring';
 const door=mountLabDoor(scene,finish);
 for(const x of [-11,11])for(const z of [-11,11])box([.58,11.7,.58],[x,1.35,z],panel);
 mountWallCladding(scene,finish);
 dressLaboratory(box,scene,finish);
 const scan=mountContainment(scene,finish);
 const ambient=new T.HemisphereLight(0xffffff,0xa6a6a6,0);
 const roomKey=new T.DirectionalLight(0xffffff,0);
 roomKey.position.set(-14,9,8);
 const roomFill=new T.DirectionalLight(0xffffff,0);
 roomFill.position.set(-4,-14,-4);
 scene.add(ambient,roomKey,roomFill);
 const project=mountProjectors(scene);
 const ringMaterial=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:T.DoubleSide});
 for(const radius of [2.4,2.63]){
  const ring=new T.Mesh(new T.RingGeometry(radius,radius+.025,96),ringMaterial);
  ring.rotation.x=-Math.PI/2;ring.position.y=-4.48;scene.add(ring);
 }
 const artifact=createArtifact(scene,faces.materials);
 const floorReflection=mountReflection(scene,-4.489,-Math.PI/2,mobile?256:512,.27);
 const ceilingReflection=mountReflection(scene,7.285,Math.PI/2,mobile?160:384,.25);
 for(const [surface,opposite] of [[floorReflection,ceilingReflection],[ceilingReflection,floorReflection]]){
  const renderReflection=surface.onBeforeRender.bind(surface);
  surface.onBeforeRender=(...args)=>{
   // Exclude the other mirror from this pass to avoid feeding one reflection into the other.
   const visible=opposite.visible;
   opposite.visible=false;
   try{renderReflection(...args);}
   finally{opposite.visible=visible;}
  };
 }
 const world=new T.Group();
 for(const child of [...scene.children])world.add(child);
 world.scale.setScalar(worldScale);
 world.position.y=deckLevel*(1-worldScale);
 scene.add(world);
 const renderCamera=new T.PerspectiveCamera();
 const target=new T.Vector3();
 const arrival=10.8;
 const airStart=new T.Color(0x080808),airFinal=new T.Color(0xffffff);
 let startFov=70;
 function start(camera){
  startFov=camera.fov;
  pullback.begin(camera);
  door.reset();
  lap.reset();
  launcher?.reset();
  destination='ring';
  perimeter.visible=true;
  hangar.visible=false;
 }
 function cinematicCamera(camera,time){
  const radius=2.27*smooth(0,1.32,time)+6.45*smooth(.98,5.6,time)+3.90*smooth(3.3,arrival,time);
  const orbit=.49*smooth(4.72,arrival,time);
  camera.position.set(-radius*Math.cos(orbit),1.32*smooth(3.2,8.4,time)+(eyeHeight-1.32)*smooth(7.8,arrival,time),radius*Math.sin(orbit));
  camera.lookAt(target);
  const fov=T.MathUtils.lerp(72,59,smooth(3.8,arrival,time));
  if(camera.fov!==fov||camera.far!==215){
   camera.fov=fov;camera.far=215;camera.updateProjectionMatrix();
  }
 }
 function render(camera,time,walk,dt){
  if(!walk?.active)cinematicCamera(camera,time);
  if(walk&&!walk.active&&time>=arrival)walk.start(camera,door);
  artifact.update(time);
  const opening=door.tick(dt);
  const roomLight=smooth(7.25,10.55,time);
  const farLight=smooth(8.08,10.55,time);
  scene.background.copy(airStart).lerp(airFinal,roomLight);
  ambient.intensity=.018+1.10*roomLight;
  roomKey.intensity=1.05*smooth(7.25,9.55,time);
  roomFill.intensity=1.23*farLight;
  finish.light.color.setScalar(.002+.90*farLight);
  ringMaterial.opacity=.55*farLight;
  project(time,roomLight);
  floorReflection.visible=time>3.5;
  ceilingReflection.visible=time>7.65;
  scan(time);
  if(launcher?.active)launcher.update(camera,dt);
  else if(walk?.active){
   walk.update(camera,dt,opening,destination,launcher);
   if(destination==='ring'&&lap.advance(camera.position)){
    destination='switching';
    door.close();
   }
   if(destination==='switching'&&opening===0){
    perimeter.visible=false;
    hangar.visible=true;
    destination='hangar';
    door.destination(true);
   }
  }
  if(hangar.visible)updateSky(time);
  renderCamera.position.copy(camera.position).multiplyScalar(worldScale).add(world.position);
  renderCamera.quaternion.copy(camera.quaternion);
  renderCamera.projectionMatrix.copy(camera.projectionMatrix);
  renderCamera.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  renderCamera.far=camera.far;
  renderer.render(scene,renderCamera);
  pullback.render(renderer,camera,time,startFov);
 }
 function dispose(){
  scene.traverse(object=>{object.geometry?.dispose();for(const material of [object.material].flat())material?.dispose();object.shadow?.dispose();});
  pullback.dispose();floorReflection.dispose();ceilingReflection.dispose();faces.dispose();finish.dispose();door.dispose();marsMap.dispose();ship.dispose();launcher?.dispose();
 }
 return {start,render,dispose};
}

function mountReflection(scene,height,rotation,resolution,opacity){
 const reflection=new Reflector(new T.PlaneGeometry(31.45,31.45),{
  color:0xffffff,textureWidth:resolution,textureHeight:resolution,multisample:0,
  shader:{
   ...Reflector.ReflectorShader,
   fragmentShader:Reflector.ReflectorShader.fragmentShader
    .replace('vec4 base = texture2DProj( tDiffuse, vUv );',`
     vec2 uv = vUv.xy / vUv.w;
     float texel = ${(1/resolution).toFixed(7)};
     vec2 edge = vec2(texel * 1.15);
     vec4 base = texture2D(tDiffuse, uv) * .40;
     base += .15*texture2D(tDiffuse, uv + edge);
     base += .15*texture2D(tDiffuse, uv - edge);
     base += .15*texture2D(tDiffuse, uv + vec2(edge.x,-edge.y));
     base += .15*texture2D(tDiffuse, uv + vec2(-edge.x,edge.y));
    `)
    .replace('vec4( blendOverlay( base.rgb, color ), 1.0 )',`vec4( base.rgb, ${opacity.toFixed(2)} )`)
  }
 });
 reflection.rotation.x=rotation;
 reflection.position.y=height;
 reflection.material.transparent=true;
 reflection.material.depthWrite=false;
 reflection.renderOrder=6;
 reflection.visible=false;
 scene.add(reflection);
 return reflection;
}
