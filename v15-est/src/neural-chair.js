import * as THREE from '../vendor/three.module.js';
import {block,pipe,plate,bolt,part,polygon,sector,duct} from './industrial-parts.js';
import {makeSurface} from './surfaces.js';
import{CORTEX_ART}from'./art-direction.js';
import{mechanicalGroup,batchRigidParts}from'./mechanical-rig.js';
import{QUALITY_PROFILES,profileName,softCushionGeometry}from'./mesh-quality.js';
const geometries=new Map();const geo=(k,fn)=>{if(!geometries.has(k))geometries.set(k,fn());return geometries.get(k);};
let activeProfile='balanced';const cylinder=geo('cylinder',()=>new THREE.CylinderGeometry(1,1,1,48));
function disk(root,name,r,h,y,mat){return part(root,name,cylinder,mat,[0,y,0],[r,h,r]);}
function ball(root,name,pos,r,mat){return part(root,name,geo('ball:'+activeProfile+':'+(r>=.085?'joint':'sensor'),()=>new THREE.SphereGeometry(1,...QUALITY_PROFILES[activeProfile][r>=.085?'joint':'sensor'])),mat,pos,[r,r,r]);}
function torus(root,name,r,t,mat,pos){return part(root,name,geo('torus:'+activeProfile+':'+r+':'+t,()=>new THREE.TorusGeometry(r,t,QUALITY_PROFILES[activeProfile].tube,QUALITY_PROFILES[activeProfile].torus)),mat,pos);}
function cushion(shape,depth,lumbar=false){return geo('cushion:'+activeProfile+JSON.stringify(shape)+depth+lumbar,()=>softCushionGeometry(shape,depth,lumbar,activeProfile));}

export function chairMaterials(base,{textures=false}={}){const m={titanium:base.white.clone(),frame:base.dark.clone(),satin:base.shell.clone(),chrome:base.chrome.clone(),rubber:base.rubber.clone(),foam:new THREE.MeshStandardMaterial({color:0x28252c,roughness:.88,metalness:.025}),glass:new THREE.MeshPhysicalMaterial({color:0x713f4a,roughness:.12,metalness:.08,clearcoat:.75,clearcoatRoughness:.14,transparent:true,opacity:.58,depthWrite:false}),lamp:new THREE.MeshStandardMaterial({color:0x59232f,roughness:.28,metalness:.25,emissive:CORTEX_ART.signal,emissiveIntensity:.8}),screen:new THREE.MeshBasicMaterial({color:CORTEX_ART.screen})};m.titanium.roughness=.38;m.titanium.metalness=.84;m.satin.roughness=.47;
 if(textures){// Texture views have separate UV transforms but share the pixel source with the room.
 const maps=base.rubber.map?{color:base.rubber.map.clone(),normal:base.rubber.normalMap.clone(),roughness:base.rubber.roughnessMap.clone()}:makeSurface('polymer');for(const t of Object.values(maps))t.repeat.set(3,3);m.foam.map=maps.color;m.foam.normalMap=maps.normal;m.foam.normalScale=new THREE.Vector2(.16,.16);m.foam.roughnessMap=maps.roughness;}
 for(let i=0;i<8;i++){m['sensor'+i]=m.lamp.clone();m['sensor'+i].emissiveIntensity=.04;}
 for(const[k,v]of Object.entries(m)){v.name='chair_'+k;v.flatShading=false;}m.titanium.roughness=.60;m.frame.roughness=.67;m.satin.roughness=.62;return m;}
function batch(root){root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),groups=new Map();root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.material.transparent||o.userData.dynamic)return;for(let p=o.parent;p&&p!==root;p=p.parent)if(p.userData.dynamic)return;const key=o.geometry.uuid+o.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);});for(const list of groups.values()){if(list.length<2)continue;const first=list[0],inst=new THREE.InstancedMesh(first.geometry,first.material,list.length);inst.name='chair_static_fasteners';inst.castShadow=first.castShadow;inst.receiveShadow=first.receiveShadow;list.forEach((o,i)=>inst.setMatrixAt(i,inverse.clone().multiply(o.matrixWorld)));root.add(inst);for(const o of list)o.removeFromParent();}}
function diagnostics(root,m){if(typeof document==='undefined')return null;const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;m.screen.map=texture;m.screen.color.set(0xffffff);m.screen.needsUpdate=true;return{canvas,ctx,texture};}
export function createNeuralChair(base,{labels=false,textures=false,asset,instanced=true,detail='balanced',servoAsset}={}){activeProfile=profileName(detail);const m=chairMaterials(base,{textures});let root;
 if(asset){root=(asset.getObjectByName('CORTEX_NEURAL_CHAIR')||asset).clone(true);root.traverse(o=>{if(!o.isMesh)return;const key=o.material.name?.replace(/^chair_/,'');if(m[key])o.material=m[key];});}
 else{root=new THREE.Group();root.name='CORTEX_NEURAL_CHAIR';
 // Anchored octagonal foundation, bearing stack and four radial locking feet.
 const oct=Array.from({length:8},(_,i)=>[Math.cos(Math.PI/8+i*Math.PI/4)*.86,Math.sin(Math.PI/8+i*Math.PI/4)*.86]);const basePlate=part(root,'anchored_foundation',polygon(oct,.13,.025),m.frame,[0,.165,0]);basePlate.rotation.x=-Math.PI/2;
 for(const sx of[-1,1])for(const sz of[-1,1]){const foot=plate(root,'anchor_shoe',.32,.42,.08,[sx*.58,.13,sz*.56],m.satin);foot.rotation.x=-Math.PI/2;const b=bolt(root,[sx*.58,.195,sz*.56],m.chrome,.065);b.rotation.x=0;}
 disk(root,'bearing_isolator',.61,.07,.28,m.rubber);
 const profile=[[.37,.28],[.43,.32],[.43,.39],[.30,.43],[.30,.56],[.39,.60],[.50,.66],[.52,.73]].map(([x,y])=>new THREE.Vector2(x,y));part(root,'lathed_servo_bearing',geo('servo_bearing:'+activeProfile,()=>{const g=new THREE.LatheGeometry(profile,QUALITY_PROFILES[activeProfile].lathe);g.normalizeNormals();return g;}),m.satin);
 for(let i=0;i<16;i++){const a=i*Math.PI/8;block(root,'bearing_heat_fin',[Math.cos(a)*.39,.47,Math.sin(a)*.39],[.045,.25,.08],m.frame).rotation.y=-a;const b=bolt(root,[Math.cos(a)*.62,.255,Math.sin(a)*.62],m.chrome,.024);b.rotation.x=0;}
 disk(root,'bearing_signal_band',.437,.018,.35,m.lamp);
 // Contoured seat pan: soft edge, front relief and separate titanium underframe.
 const seatOutline=[[-.48,.44],[-.56,.19],[-.54,-.36],[-.37,-.53],[0,-.47],[.37,-.53],[.54,-.36],[.56,.19],[.48,.44],[-.48,.44]];
 const seat=part(root,'ergonomic_seat_pan',cushion(seatOutline,.11),m.foam,[0,.83,.10]);seat.rotation.x=-Math.PI/2;
 const under=plate(root,'seat_titanium_shell',1.15,1.18,.10,[0,.78,.05],m.titanium,{holes:[{x:0,y:0,r:.2}]});under.rotation.x=-Math.PI/2;
 for(const s of[-1,1]){pipe(root,'seat_exoskeleton',[s*.48,.68,-.48],[s*.5,.78,.5],.046,m.chrome);duct(root,'seat_edge_stitch',[[s*.43,.958,-.29],[s*.47,.96,.03],[s*.45,.956,.40]],.006,m.satin);}
 // A hinged vertebral carrier supports torso, neck and lateral anatomical pads.
 const back=new THREE.Group();back.name='articulated_back';back.userData.dynamic=true;back.position.set(0,.94,-.43);back.rotation.x=-.16;root.add(back);
 const framePoints=[[-.38,0],[-.57,.32],[-.59,.85],[-.38,1.14],[.38,1.14],[.59,.85],[.57,.32],[.38,0]];
 part(back,'vertebral_titanium_shell',polygon(framePoints,.12,.035,[{x:-.41,y:.62,r:.055},{x:.41,y:.62,r:.055}]),m.titanium,[0,0,-.06]);
 const torso=[[-.35,0],[-.44,.12],[-.38,.39],[-.50,.77],[-.35,1.02],[.35,1.02],[.50,.77],[.38,.39],[.44,.12],[.35,0],[-.35,0]];
 part(back,'anatomical_torso_padding',cushion(torso,.09,true),m.foam,[0,.03,.035]);
 for(const s of[-1,1]){pipe(back,'back_lateral_rail',[s*.52,.12,-.1],[s*.46,1.04,-.1],.028,m.chrome);block(back,'lumbar_latch',[s*.43,.18,.13],[.12,.15,.04],m.frame,true);for(let i=0;i<4;i++)block(back,'lumbar_stitch',[s*.27,.20+i*.16,.18],[.18,.008,.005],m.satin);}
 for(const s of[-1,1]){const j=part(root,'back_hinge',geo('hinge:'+activeProfile,()=>new THREE.CylinderGeometry(.12,.12,.12,QUALITY_PROFILES[activeProfile].joint[0])),m.chrome,[s*.54,.97,-.44]);j.rotation.z=Math.PI/2;}
 const headOutline=[[-.25,-.17],[-.34,-.04],[-.29,.20],[-.13,.24],[.13,.24],[.29,.20],[.34,-.04],[.25,-.17],[-.25,-.17]];
 const headCarriage=mechanicalGroup(back,'headrest_carriage',[0,1.21,-.02],{axis:'y',kind:'translation',min:-.015,max:.015});
 pipe(back,'headrest_riser',[0,1.0,-.1],[0,1.25,-.1],.052,m.chrome);part(headCarriage,'anatomical_headrest',cushion(headOutline,.08),m.foam);
 for(const s of[-1,1]){const pad=block(headCarriage,'occipital_side_pad',[s*.28,.01,.12],[.13,.30,.20],m.rubber,true);pad.rotation.y=s*.22;}
 // Independent servo shoulders and elbows. Pistons telescope to the moving joints.
 for(const s of[-1,1]){const suffix=s<0?'left':'right',arm=new THREE.Group();arm.name='servo_shoulder_'+suffix;arm.userData.dynamic=true;arm.position.set(s*.62,.88,-.43);root.add(arm);
  createServo(arm,m,servoAsset,suffix);pipe(arm,'shoulder_drive_axis',[-.10,0,0],[.10,0,0],.071,m.chrome,16);pipe(arm,'upper_robotic_link',[0,.02,0],[s*.19,.32,.02],.065,m.satin);block(arm,'upper_link_cover',[s*.09,.17,.02],[.15,.24,.17],m.frame,true).rotation.z=-s*.5;
  const elbow=new THREE.Group();elbow.name='servo_elbow_'+suffix;elbow.userData.dynamic=true;elbow.position.set(s*.19,.32,.02);arm.add(elbow);ball(elbow,'elbow_actuator',[0,0,0],.092,m.chrome);pipe(elbow,'forearm_inner_rail',[0,0,0],[0,.10,.67],.048,m.chrome);block(elbow,'forearm_casing',[0,.045,.32],[.21,.15,.67],m.frame,true);block(elbow,'forearm_signal',[s*.105,.09,.32],[.015,.018,.51],m.lamp);
  block(elbow,'wrist_lock',[0,.07,.64],[.26,.10,.14],m.satin,true);const latch=block(elbow,'safety_clasp',[s*.08,.14,.64],[.055,.05,.12],m.frame,true);latch.userData.dynamic=true;
  const displayMount=new THREE.Group();displayMount.position.set(0,.19,.43);displayMount.rotation.x=-.32;elbow.add(displayMount);block(displayMount,'diagnostic_case',[0,0,0],[.29,.18,.045],m.satin,true);part(displayMount,'diagnostic_screen',geo('screen',()=>new THREE.PlaneGeometry(.25,.135)),m.screen,[0,0,.027]);part(displayMount,'diagnostic_glass',geo('screen_glass',()=>new THREE.PlaneGeometry(.267,.15)),m.glass,[0,0,.031]);
  for(const name of['piston_barrel_','piston_rod_']){const o=part(root,name+suffix,cylinder,name.startsWith('piston_barrel')?m.frame:m.chrome);o.userData.dynamic=true;}
  duct(root,'servo_supply_'+suffix,[[s*.36,.38,-.56],[s*.69,.60,-.70],[s*.74,.91,-.64]],.028,m.rubber);
 }
 // The rotation carrier is distinct from the stationary head contacts and their wiring.
 for(const s of[-1,1]){pipe(root,'ring_support',[s*.44,.35,-.72],[s*.75,1.85,-.89],.055,m.satin);ball(root,'ring_mount',[s*.75,1.85,-.89],.09,m.frame);}
 const rotor=new THREE.Group();rotor.name='sync_rotor';rotor.userData.dynamic=true;rotor.position.set(0,1.76,-.86);root.add(rotor);torus(rotor,'neural_crown',1.13,.028,m.chrome,[0,0,0]);torus(root,'stationary_neural_guide',1.08,.021,m.frame,[0,1.76,-.92]);
 for(let i=0;i<16;i++){const piece=part(rotor,'rotor_segment',sector(1.08,1.18,Math.PI/8-.045,.09),i%4===0?m.titanium:m.frame);piece.rotation.z=i*Math.PI/8;const a=(i+.35)*Math.PI/8;const led=block(rotor,'rotor_encoder',[Math.cos(a)*1.14,Math.sin(a)*1.14,.057],[.045,.015,.015],m.lamp);led.rotation.z=a;}
 for(let i=0;i<8;i++){const a=.12+(Math.PI-.24)*i/7,x=Math.cos(a)*.52,y=2.06+Math.sin(a)*.36;const mount=new THREE.Group();mount.name='cranial_contact_'+i;mount.userData.dynamic=true;mount.userData.mechanism={version:'cortex.mechanics.1',axis:'z',kind:'translation',min:0,max:.012,restPosition:[x,y,-.48]};mount.position.set(x,y,-.48);root.add(mount);pipe(mount,'sensor_stalk',[0,0,-.22],[-Math.cos(a)*.055,-Math.sin(a)*.055,0],.019,m.chrome);ball(mount,'sensor_housing',[0,0,0],.062,m.frame);const lens=ball(mount,'sensor_lens_'+i,[0,0,.04],.038,m['sensor'+i]);lens.userData.dynamic=true;ball(mount,'sensor_optical_cover',[0,0,.043],.043,m.glass);duct(root,'cranial_data_cable_'+i,[[x,y,-.69],[x*.8,y-.25,-.97],[Math.sign(x||1)*.25,.57,-.78]],.011,m.rubber);}
 const foot=plate(root,'articulated_footrest',.88,.40,.07,[0,.41,.86],m.satin);foot.rotation.x=-Math.PI/2-.18;for(const x of[-.34,.34])pipe(root,'footrest_link',[x,.66,.35],[x,.38,.85],.033,m.chrome);
 // Rear access panel, grounded connectors and clamp assemblies remain readable from behind.
 plate(root,'rear_diagnostic_panel',.48,.46,.06,[0,.55,-.73],m.frame,{holes:[{x:-.12,y:0,r:.04},{x:.12,y:0,r:.04}]});for(const s of[-1,1]){pipe(root,'rear_connector',[s*.15,.49,-.73],[s*.15,.49,-.84],.045,m.chrome,16);duct(root,'transmission_trunk_'+s,[[s*.15,.49,-.83],[s*.38,.25,-.94],[s*.59,.17,-.77]],.037,m.rubber);}
 if(instanced){batch(headCarriage);batch(back);for(const s of['left','right']){batch(root.getObjectByName('servo_elbow_'+s));batch(root.getObjectByName('servo_shoulder_'+s));}batch(rotor);batch(root);}
 }
 for(const [name,axis,kind,min,max] of [['sync_rotor','z','rotation',-6.284,6.284],['articulated_back','x','rotation',-.19,-.13],['servo_shoulder_left','z','rotation',-.04,.04],['servo_shoulder_right','z','rotation',-.04,.04],['servo_elbow_left','x','rotation',-.02,.02],['servo_elbow_right','x','rotation',-.02,.02],['piston_barrel_left','y','extension',0,.8],['piston_barrel_right','y','extension',0,.8],['piston_rod_left','y','extension',0,.8],['piston_rod_right','y','extension',0,.8]]){const o=root.getObjectByName(name);if(o)o.userData.mechanism={version:'cortex.mechanics.1',axis,kind,min,max,restPosition:o.position.toArray(),restQuaternion:o.quaternion.toArray(),restScale:o.scale.toArray()};}
 root.animations=asset?.animations?.length?asset.animations:[chairIdleClip(root)];root.position.z=-3;root.userData.dynamic=true;root.userData.revision='neural-chair-23ter';root.userData.detail=activeProfile;root.userData.collision={minX:-.975,maxX:.975,minZ:-4.1,maxZ:-1.9};root.chairMaterials=m;root.chairDiagnostics=labels?diagnostics(root,m):null;return root;
}

function createServo(parent,m,asset,suffix){
 const pivot=mechanicalGroup(parent,'shoulder_bearing_'+suffix,[0,0,0],{axis:'x',min:-.18,max:.18,movable:false});
 if(asset){const model=(asset.getObjectByName('BLENDER_SERVO_CARTRIDGE')||asset).clone(true);model.traverse(o=>{if(o.isMesh){const key=o.material.name.replace(/^chair_/,'');if(m[key])o.material=m[key];}if(o.name==='BLENDER_SERVO_CARTRIDGE')o.name+='_'+suffix;if(o.name==='servo_joint_rotor'){o.name+='_'+suffix;o.userData.dynamic=true;o.userData.mechanism={version:'cortex.mechanics.1',axis:'x',kind:'rotation',min:-.18,max:.18};}});pivot.add(model);batchRigidParts(model);}
 else {const rotor=mechanicalGroup(pivot,'servo_joint_rotor_'+suffix,[0,0,0],{axis:'x',min:-.18,max:.18});for(const [r,x,material]of[[.128,0,m.frame],[.113,-.065,m.titanium],[.113,.065,m.titanium]]){const part=disk(pivot,'servo_machined_shell',r,.018,0,material);part.rotation.z=Math.PI/2;part.position.x=x;}const hub=disk(rotor,'servo_drive_hub',.078,.156,0,m.chrome);hub.rotation.z=Math.PI/2;}
 pivot.userData.modelSource=asset?'Blender 4.3.2 / original Cortex model':'procedural machined fallback';
}

export class NeuralChairController{
 constructor(root){this.root=root;this.rotor=root.getObjectByName('sync_rotor');this.back=root.getObjectByName('articulated_back');this.materials=root.chairMaterials;this.diagnostic=root.chairDiagnostics;this.last=-Infinity;this.lastScreen=-Infinity;this.lastStage=-1;this.proximity=0;this.connection=0;this.connected=false;this.armPos=[new THREE.Vector3(),new THREE.Vector3()];this.forward=new THREE.Vector3(0,1,0);this.temp=new THREE.Vector3();this.direction=new THREE.Vector3();this.shadowDirty=false;}
 update(time,{distance=100,reduced=false,eco=false,connecting=false,progress=0,rotorDriven=false}={}){if(time-this.last<(eco?1/15:1/30))return false;const dt=Number.isFinite(this.last)?Math.min(.1,time-this.last):1/30;this.last=time;const target=THREE.MathUtils.clamp((6-distance)/3.5,0,1);this.proximity=reduced?target:THREE.MathUtils.damp(this.proximity,target,4,dt);this.connection=connecting?progress:this.connected?1:0;
  if(!rotorDriven)this.rotor.rotation.z=reduced?0:time*.035+this.connection*.22;this.back.rotation.x=-.16+(reduced?0:Math.sin(time*.21)*.004*this.proximity);
  for(let i=0;i<2;i++){const s=i===0?-1:1,suffix=s<0?'left':'right',arm=this.root.getObjectByName('servo_shoulder_'+suffix),elbow=this.root.getObjectByName('servo_elbow_'+suffix);const adjustment=reduced?0:Math.sin(time*.33+i*.8)**8*.021;arm.rotation.z=s*(adjustment+this.connection*.014);elbow.rotation.x=reduced?0:Math.sin(time*.28+i)*.012;
   this.root.updateMatrixWorld(true);elbow.getWorldPosition(this.armPos[i]);this.root.worldToLocal(this.armPos[i]);const a=this.temp.set(s*.46,.43,-.61),b=this.armPos[i],mid=a.clone().lerp(b,.58);this.setPiston(this.root.getObjectByName('piston_barrel_'+suffix),a,mid,.048);const overlap=a.clone().lerp(b,.47);this.setPiston(this.root.getObjectByName('piston_rod_'+suffix),overlap,b,.023);
  }
  const pulse=reduced?1:.92+Math.sin(time*1.6)*.08;this.materials.lamp.emissiveIntensity=(.65+this.proximity*.55+this.connection*.9)*pulse;
  let lit=0;for(let i=0;i<8;i++){const level=THREE.MathUtils.clamp(Math.max(this.proximity,this.connection)*8-i,0,1);this.materials['sensor'+i].emissiveIntensity=.025+level*(1.2+this.connection*.9)*pulse;if(level>.75)lit++;}
  if(this.diagnostic&&(time-this.lastScreen>.18)&&(lit!==this.lastStage||connecting)){this.lastScreen=time;this.lastStage=lit;const c=this.diagnostic.ctx;c.fillStyle='#1b1118';c.fillRect(0,0,512,256);c.strokeStyle='#ac4657';c.lineWidth=3;c.strokeRect(6,6,500,244);c.fillStyle='#ffd5ca';c.font='600 31px monospace';c.fillText(connecting?'SYNCHRONISATION':'POSTE NEURONAL',24,54);c.font='23px monospace';c.fillText('CAPTEURS  '+lit+'/8',24,104);for(let i=0;i<8;i++){c.fillStyle=i<lit?'#f2808b':'#432931';c.fillRect(25+i*59,132,43,20);}c.fillStyle='#c7acb0';c.font='18px monospace';c.fillText(connecting?Math.round(progress*100)+' % / LIAISON ACTIVE':lit===8?'CONTACTS CALIBRÉS':'EN ATTENTE DE PROXIMITÉ',24,207);this.diagnostic.texture.needsUpdate=true;}
  this.shadowDirty=!reduced;return true;
 }
 setPiston(mesh,a,b,r){mesh.position.copy(a).add(b).multiplyScalar(.5);this.direction.copy(b).sub(a);mesh.scale.set(r,this.direction.length(),r);mesh.quaternion.setFromUnitVectors(this.forward,this.direction.normalize());}
 complete(){this.connected=true;this.connection=1;this.materials.lamp.emissiveIntensity=2;for(let i=0;i<8;i++)this.materials['sensor'+i].emissiveIntensity=2;}
 reset(){this.connected=false;this.connection=0;}
}
export function chairIdleClip(root){const q=new THREE.Quaternion(),axis=new THREE.Vector3(0,0,1),values=[];for(const a of[0,Math.PI,Math.PI*2])values.push(...q.setFromAxisAngle(axis,a).toArray());const rotor=root.getObjectByName('sync_rotor');return new THREE.AnimationClip('CORTEX_precise_rotor_idle',180,[new THREE.QuaternionKeyframeTrack(rotor.uuid+'.quaternion',[0,90,180],values)]);}
