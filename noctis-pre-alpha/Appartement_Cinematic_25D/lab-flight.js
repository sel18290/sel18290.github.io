import * as T from '../vendor/three.module.js';
import {controls} from '../architecture/src/input.js';
import {canWalkHere,portal,eyeHeight,worldScale} from './lab-layout.js?v=6';

const radius=.34;
const speed=3*4.35*.63/worldScale;
const trial=new T.Vector3();

export function moveLabPlayer(position,delta,opening,destination,withLaunchTerminal=false){
 position.y=eyeHeight;
 const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.15));
 for(let step=0;step<steps;step++){
  // Resolve horizontal axes separately to slide along the surface of a barrier.
  trial.copy(position);trial.x+=delta.x/steps;
  if(canWalkHere(trial,opening,radius,destination,withLaunchTerminal))position.x=trial.x;
  trial.copy(position);trial.z+=delta.z/steps;
  if(canWalkHere(trial,opening,radius,destination,withLaunchTerminal))position.z=trial.z;
 }
}

export function laboratoryWalk(canvas,signal,story=false){
 const ui=document.createElement('aside');
 ui.id='laboratory-walk';
 ui.hidden=true;
 ui.setAttribute('aria-label','Commandes de déplacement');
 ui.innerHTML=`<div class="walk-message"><strong>LABORATOIRE N6</strong><span>Glisser pour regarder · ZQSD ou flèches pour marcher</span><p class="walk-objective" hidden></p></div>
 <button type="button" class="walk-door" hidden><span>Ouvrir la porte</span> <kbd>F</kbd></button>
 <div class="walk-pad" aria-label="Joystick de déplacement"><span aria-hidden="true">✥</span></div>`;
 document.body.append(ui);
 const input=controls(canvas,ui.querySelector('.walk-pad'),signal);
 const doorButton=ui.querySelector('.walk-door');
 const locationLabel=ui.querySelector('.walk-message strong');
 const actionLabel=doorButton.querySelector('span');
 const objective=ui.querySelector('.walk-objective');
 let activeDoor=null,activeCamera=null,availableAction=null;
 function activate(){
  if(!availableAction)return;
  availableAction();
  availableAction=null;
  doorButton.hidden=true;
  canvas.focus({preventScroll:true});
 }
 doorButton.addEventListener('click',activate,{signal});
 window.addEventListener('keydown',e=>{
  if(input.enabled&&!e.repeat&&e.code==='KeyF'&&!doorButton.hidden){
   e.preventDefault();activate();
  }
 },{signal});
 signal.addEventListener('abort',()=>ui.remove(),{once:true});
 const rotation=new T.Euler(0,0,0,'YXZ');
 const velocity=new T.Vector3(),desired=new T.Vector3(),delta=new T.Vector3();
 return {
  get active(){return input.enabled;},
  start(camera,door){
   activeDoor=door;activeCamera=camera;
   camera.position.y=eyeHeight;
   rotation.setFromQuaternion(camera.quaternion);
   input.yaw=rotation.y;input.pitch=rotation.x;
   input.enabled=true;ui.hidden=false;canvas.focus({preventScroll:true});
  },
  stop(){input.enabled=false;ui.hidden=true;doorButton.hidden=true;activeDoor=activeCamera=availableAction=null;velocity.set(0,0,0);},
  update(camera,dt,opening,destination,launcher){
   const {right,forward,yaw}=input.movement();
   desired.set(right*Math.cos(yaw)-forward*Math.sin(yaw),0,-right*Math.sin(yaw)-forward*Math.cos(yaw));
   if(desired.lengthSq()>1)desired.normalize();
   velocity.lerp(desired.multiplyScalar(speed),1-Math.exp(-15*dt));
   delta.copy(velocity).multiplyScalar(dt);
   moveLabPlayer(camera.position,delta,opening,destination,!!launcher);
   const canLaunch=destination==='hangar'&&launcher?.canActivate(camera.position);
   const canOpen=activeDoor?.canOpen(camera.position);
   if(canLaunch)availableAction=()=>{
    if(launcher.start(activeCamera))ui.hidden=true;
   };
   else if(canOpen)availableAction=()=>activeDoor.open();
   else availableAction=null;
   const action=canLaunch?'Activer la navette':'Ouvrir la porte';
   if(actionLabel.textContent!==action)actionLabel.textContent=action;
   doorButton.hidden=!availableAction;
   const outside=Math.max(Math.abs(camera.position.x),Math.abs(camera.position.z))>=portal.innerEdge;
   const location=outside?(destination==='hangar'?'HANGAR ORBITAL':'COURSIVE PÉRIPHÉRIQUE'):'LABORATOIRE N6';
   if(locationLabel.textContent!==location)locationLabel.textContent=location;
   if(story){
    const hint=destination==='hangar'?'Active la borne orange près du nez de la navette.':
     outside?'Fais le tour de la coursive puis reviens au cube.':'Ouvre la porte de la coursive.';
    if(objective.textContent!==hint)objective.textContent=hint;
    objective.hidden=false;
   }
   camera.rotation.set(input.pitch,yaw,0,'YXZ');
  }
 };
}
