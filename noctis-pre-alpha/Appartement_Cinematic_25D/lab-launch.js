import * as T from '../vendor/three.module.js';
import {deckLevel,eyeHeight,launchTerminal} from './lab-layout.js?v=6';

const departureDuration=5.2;
const smooth=(start,end,time)=>T.MathUtils.smoothstep(time,start,end);

export function mountLaunchTerminal(hangar,finish,ship,onDeparture){
 const {x,z}=launchTerminal;
 const terminal=new T.Group();
 terminal.position.set(x,deckLevel,z);
 terminal.rotation.y=-Math.PI/2;
 hangar.add(terminal);

 function add(geometry,material,y,depth){
  const mesh=new T.Mesh(geometry,material);
  mesh.position.set(0,y,depth);
  terminal.add(mesh);
  return mesh;
 }
 add(new T.BoxGeometry(.54,1.75,.53),finish.gasket,.87,0);
 add(new T.BoxGeometry(1.40,.16,.95),finish.seam,.08,0);
 add(new T.BoxGeometry(1.40,.90,.55),finish.ceramic,2.01,0);
 const frame=add(new T.BoxGeometry(1.15,.67,.06),finish.gasket,2.01,.29);
 frame.rotation.x=-.10;
 const display=add(new T.BoxGeometry(.96,.47,.016),new T.MeshBasicMaterial({color:0xf9c47f}),2.04,.337);
 display.rotation.x=frame.rotation.x;

 const overlay=document.createElement('section');
 overlay.className='launch-sequence';
 overlay.hidden=true;
 overlay.innerHTML='<p aria-live="polite"></p>';
 const caption=overlay.querySelector('p');
 document.body.append(overlay);

 const cameraStart=new T.Vector3(),watchPosition=new T.Vector3(33.5,eyeHeight+.35,-8.8);
 const watchTarget=new T.Vector3(),rotationStart=new T.Quaternion();
 const view=new T.Matrix4(),up=new T.Vector3(0,1,0),watchRotation=new T.Quaternion();
 let elapsed=null,departed=false;
 function canActivate(position){
  return elapsed===null&&Math.hypot(position.x-x,position.z-z)<launchTerminal.reach;
 }

 function update(camera,dt){
  if(elapsed===null||departed)return;
  elapsed=Math.min(departureDuration,elapsed+dt);
  const crane=smooth(0,1.4,elapsed);
  const lift=smooth(.6,2.1,elapsed);
  const turn=smooth(1.1,2.7,elapsed);
  const travel=smooth(2.65,departureDuration,elapsed);
  ship.move(lift*3.45,turn*Math.PI,travel*35,smooth(.25,1.22,elapsed));
  camera.position.lerpVectors(cameraStart,watchPosition,crane);
  watchTarget.set(49.4+travel*19,-.5+lift*2,1.2);
  view.lookAt(camera.position,watchTarget,up);
  watchRotation.setFromRotationMatrix(view);
  camera.quaternion.slerpQuaternions(rotationStart,watchRotation,crane);
  overlay.style.setProperty('--launch-fade',String(smooth(4.15,departureDuration,elapsed)));
  const line=elapsed<2.72?'Navette 07 · propulsion active':'Signal perdu. Un autre espace se dessine.';
  if(caption.textContent!==line)caption.textContent=line;
  if(elapsed>=departureDuration){
   departed=true;
   onDeparture();
  }
 }

 return {
  get active(){return elapsed!==null;},
  canActivate,
  start(camera){
   if(!canActivate(camera.position))return false;
   cameraStart.copy(camera.position);
   rotationStart.copy(camera.quaternion);
   display.material.color.setHex(0x78f9f1);
   elapsed=0;overlay.hidden=false;
   return true;
  },
  update,
  reset(){
   elapsed=null;departed=false;
   overlay.hidden=true;
   overlay.style.removeProperty('--launch-fade');
   display.material.color.setHex(0xf9c47f);
   ship.move(0,0,0,0);
  },
  dispose(){overlay.remove();}
 };
}
