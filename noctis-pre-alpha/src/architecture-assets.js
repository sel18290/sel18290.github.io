import * as THREE from '../vendor/three.module.js';
import {mechanicalGroup,batchRigidParts} from './mechanical-rig.js';
import {block,beam,pipe,plate,bolt,part,polygon,sector} from './industrial-parts.js';
export const ARCHITECTURE_FILES={stack:'neural-stack-p21.glb',buttress:'power-buttress-p21.glb',halo:'synchronization-halo-p21.glb'};
// Original modeled assemblies. Units are metres; all exportable as portable GLB.
export function createNeuralStack(m,{distant=false}={}){const g=new THREE.Group();g.name='NEURAL_COMPUTE_STACK';g.userData.function='calcul neuronal / refroidissement';
 plate(g,'isolation_base',1.47,.38,1.43,[0,.23,0],m.dark);block(g,'floating_foundation',[0,.08,0],[1.55,.16,1.55],m.steel,true);
 for(const x of[-.66,.66])for(const z of[-.64,.64])pipe(g,'tension_spine',[x,.4,z],[x,7.25,z],.055,m.chrome);
 for(let i=0;i<5;i++){const y=1.1+i*1.22,module=mechanicalGroup(g,'compute_cartridge_'+i,[0,y,0],{axis:'z',kind:'translation',min:0,max:.035,movable:!distant&&i===2});
  plate(module,'compute_module',1.26,.94,1.12,[0,y,0],m.dark,{bevel:.03});
  const holes=distant?[]:Array.from({length:4},(_,j)=>({x:0,y:-.24+j*.16,w:.84,h:.048}));plate(module,'machined_cooling_face',1.32,.86,.065,[0,y,.602],m.steel,{holes});
  if(!distant)for(const x of[-.54,.54])for(const yy of[-.28,.28])bolt(module,[x,y+yy,.66],m.chrome,.027);
  for(const x of[-.59,.59])block(module,'neural_status',[x,y,.65],[.02,.54,.013],m.cyan);
  for(const x of[-.74,.74])for(let f=0;f<(distant?1:4);f++)block(module,'heat_exchange_fin',[x,y-.28+f*.17,0],[.035,.06,1.08],m.shell);
  block(module,'compute_bridge',[0,y+.51,0],[1.44,.06,1.4],m.shell);
  for(const child of module.children)child.position.y-=y;if(!distant&&i===2)batchRigidParts(module);
 }
 plate(g,'pressure_head',1.48,.54,1.35,[0,7.2,0],m.shell);for(const x of[-.4,.4]){pipe(g,'coolant_return',[x,.5,-.68],[x,7.4,-.68],.09,m.copper);pipe(g,'head_feed',[x,7.35,0],[x,7.9,0],.10,m.steel);}
 return g;
}
export function createPowerButtress(m){const g=new THREE.Group();g.name='POWER_STRUCTURAL_BUTTRESS';g.userData.function='charpente / alimentation haute tension';
 const silhouette=[[-1.2,0],[1.1,0],[1.1,3.4],[.48,5.5],[.48,10.4],[1.3,12.7],[1.0,14.2],[-.15,14.2],[-.6,12.4],[-.6,6.2],[-1.2,3.9]];
 part(g,'cast_structural_shell',polygon(silhouette,1.16,.065),m.steel);
 const front=[[-.78,.6],[.65,.6],[.65,3.35],[.1,5.6],[.1,10.7],[-.22,11.6],[-.22,5.7],[-.78,3.6]];
 part(g,'inset_armor',polygon(front,.1,.03),m.dark,[0,0,.66]);
 for(const z of[-.73,.73]){pipe(g,'main_bus',[-.18,.7,z],[-.18,11.8,z],.14,m.rubber);for(const y of[1.2,3.6,6,8.4,10.8]){plate(g,'bus_retainer',.92,.28,.12,[-.18,y,z],m.shell);for(const x of[-.51,.15])bolt(g,[x,y,z+.1],m.chrome);}}
 for(const y of[1.2,2.1,3.0,4.0]){plate(g,'recess_cover',.75,.55,.10,[.12,y,.73],m.dark,{holes:[{x:0,y:0,w:.4,h:.12}]});block(g,'circuit_reveal',[.12,y,.69],[.4,.05,.025],m.cyan);}
 beam(g,'upper_connection',[-.1,11.7,0],[1.2,14.1,0],.18,.25,m.chrome);return g;
}
export function createSynchronizationHalo(m){const g=new THREE.Group();g.name='SEGMENTED_SYNCHRONIZATION_HALO';g.userData.function='synchronisation neuronale';const rotor=mechanicalGroup(g,'synchronization_rotor',[0,0,0],{axis:'z',min:-Math.PI*2,max:Math.PI*2});const count=16,arc=Math.PI*2/count-.035;
 for(let i=0;i<count;i++){const chunk=new THREE.Group();chunk.rotation.z=i*Math.PI*2/count;rotor.add(chunk);part(chunk,'machined_annulus_sector',sector(3.67,4.3,arc,.48),m.steel);part(chunk,'inner_titanium_band',sector(3.60,3.70,arc,.56),m.chrome);part(chunk,'synchronization_emitter',sector(3.73,3.77,arc*.8,.025),m.cyan,[0,0,.27]);const a=arc/2;for(const r of[3.85,4.17])bolt(chunk,[Math.cos(a)*r,Math.sin(a)*r,.29],m.chrome,.045);}
 batchRigidParts(rotor);return g;
}
export const BUILD_ASSEMBLIES={stack:createNeuralStack,buttress:createPowerButtress,halo:createSynchronizationHalo};
export function placeAssembly(root,key,m,assets,pos,rotation=0,scale=1){let o;if(key==='stack'&&pos[2]<-20)o=createNeuralStack(m,{distant:true});else if(assets?.[key]){o=assets[key].clone(true);o.traverse(n=>{if(!n.isMesh)return;const mat=m[n.material.name];if(mat)n.material=mat;n.castShadow=!n.material.isMeshBasicMaterial;n.receiveShadow=!n.material.isMeshBasicMaterial;});}else o=BUILD_ASSEMBLIES[key](m);o.position.set(...pos);o.rotation.y=rotation;o.scale.setScalar(scale);root.add(o);return o;}
