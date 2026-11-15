import {quests} from '../quest-runtime/bridge.js';
import {equipmentFinishes} from '../v15-est/src/equipment-finish.js';
import {architecturalLights} from '../v15-est/src/architectural-lights.js';
import {buildInstruments} from './instruments.js';
import {buildDecks} from './decks.js';
import {buildWalls} from './walls.js';
import {applyIndustrialFinishes} from '../v15-est/src/industrial-finishes.js';
import {createLibrary} from '../v15-est/src/asset-loader.js';
import {props} from './props.js';
import {light} from './lighting.js';
import {dress} from './architecture.js';
import * as T from '../v15-est/vendor/three.module.js';
import {FirstPersonInput} from '../v15-est/src/controls.js';
import {createKitMaterials} from '../v15-est/src/master-kit.js';
import {rooms,walls,lintels,canWalk,roomAt} from './plan.js';
const $=s=>document.querySelector(s),canvas=$('canvas');
function launch(){
 const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(69,1,.07,120),m=createKitMaterials();
 applyIndustrialFinishes(m,renderer);
 camera.position.set(0,1.67,20);camera.rotation.order='YXZ';scene.background=new T.Color(0x17181b);
 const obstacles=props.filter(s=>s.y<2);
 const plan={rooms,walls,props:obstacles};
 function slab(x,y,z,w,h,d,material){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.receiveShadow=true;scene.add(mesh)}
 for(const r of rooms){for(const y of [-.12,r.h+.12])slab((r.x0+r.x1)/2,y,(r.z0+r.z1)/2,r.x1-r.x0,.24,r.z1-r.z0,y<0?m.deck:m.shell)}
 for(const w of [...walls,...lintels]){const bottom=w.bottom||0;slab((w.x1+w.x2)/2,(w.h+bottom)/2,(w.z1+w.z2)/2,w.x2-w.x1||.15,w.h-bottom,w.z2-w.z1||.15,m.dark)}
 light(scene,renderer,m,plan);
 const illuminate=architecturalLights(scene,rooms,matchMedia("(pointer:coarse)").matches);
 const input=new FirstPersonInput(canvas,$('#stick'),pause);
 function pause(){input.enabled=false;input.clear();input.unlock();$('#menu').hidden=false;$('aside').hidden=true;document.body.classList.remove('play')}
 $('#enter').onclick=()=>{input.enabled=true;$('#menu').hidden=true;$('aside').hidden=false;document.body.classList.add('play');if(!matchMedia('(pointer:coarse)').matches)input.capture()};
 $('#pause').onclick=pause;const equipment=createLibrary(scene,props,{finish:equipmentFinishes(m),onError:(s,e)=>{console.error(s.id,e);$("#result").textContent="Chargement impossible : "+s.label}}); equipment.update(camera.position);
 // MODULES
 dress(scene,plan,m);
 buildInstruments(scene,plan,m);
 buildDecks(scene,plan,m);
 buildWalls(scene,plan,m);
 function inspect(){if(input.enabled)$('#result').textContent=equipment?.interact(camera.position)||roomAt(camera.position.x,camera.position.z).name}
 quests({input,camera,stations:props});
 // Spatial inspection is handled by the NOCTIS bridge.
 /* $('#use').onclick=inspect;addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.repeat)inspect()}); */
 function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}resize();addEventListener('resize',resize);
 let last=0;renderer.setAnimationLoop(t=>{const dt=Math.min(.05,(t-last)/1000);last=t;
 if(input.enabled){const {right,forward}=input.movement(),s=dt*3/Math.max(1,Math.hypot(right,forward)),a=input.yaw,p=camera.position;
 const x=p.x+s*(right*Math.cos(a)-forward*Math.sin(a)),z=p.z+s*(-right*Math.sin(a)-forward*Math.cos(a));
 if(canWalk(x,p.z,plan.props))p.x=x;if(canWalk(p.x,z,plan.props))p.z=z;camera.rotation.set(input.pitch,a,0);
 $('#zone').textContent=roomAt(p.x,p.z).name;}equipment.update(camera.position);illuminate(camera.position);renderer.render(scene,camera)});
}
try{launch()}catch(e){$('#inputHint').textContent='Initialisation 3D impossible · '+e.message;$('#enter').disabled=true;console.error(e)}
