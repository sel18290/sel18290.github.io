import * as T from '../vendor/three.module.js';
import {buildEquipment} from '../src/master-kit.js';
import {bindMechanism,tickDrive} from '../src/machine-behaviors.js';
const labels={terminal:'Relevé de contrôle enregistré.',relay:'Relais de maintenance testé.',reactor:'Champ de confinement stabilisé.',cooler:'Circuit de refroidissement vérifié.',server:'Matrices de calcul synchronisées.',scanner:'Capteurs recalibrés.',robot:'Cycle de positionnement engagé.',sensor:'Capteur vérifié.'};
export function equip(scene,plan,m){
 const economical=globalThis.matchMedia?.('(pointer:coarse)').matches??false;
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion:reduce)').matches??false;
 let time=0;
 const stations=plan.props.map((prop,index)=>{
   const root=buildEquipment(prop.kind,m,{variant:index%3,profile:economical?'economy':'balanced'});
   root.position.set(prop.x,0,prop.z);
   root.scale.setScalar(prop.scale);
   root.rotation.y=prop.yaw??0;
   const station={...prop,phase:index*.77,active:false,bindings:[]};
   root.traverse(node=>{
     if(node.userData.drive)station.bindings.push(bindMechanism(node,station));
     if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}
   });
   scene.add(root);
   return station;
 });
 function interact(position){
   let closest,range=1.65;
   for(const station of stations){
     const d=Math.hypot(position.x-station.x,position.z-station.z)-station.r;
     if(d<range){closest=station;range=d;}
   }
   if(!closest)return 'Approchez-vous d’un équipement pour l’inspecter.';
   closest.active=true;closest.activatedAt=time;
   return labels[closest.kind];
 }
 function update(dt,position){
   time+=Math.min(dt,.1);
   for(const station of stations){
     const distance=position?Math.hypot(position.x-station.x,position.z-station.z):5;
     if(distance>25)continue;
     for(const binding of station.bindings)tickDrive(binding,time,distance,reduced);
   }
 }
 return {interact,update};
}
