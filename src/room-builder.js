import * as T from '../vendor/three.module.js';
import {prepareStructuralSurfaces} from './surface-policy.js';
import {connectMachines} from './machine-links.js';
import {buildModule} from './asset-catalog.js';
import {galleryAccess} from './gallery-access.js';
import {buildBoundary} from './room-shell.js';
import {block,pipe,beam,plate} from './industrial-parts.js';
import {batchRigidParts} from './mechanical-rig.js';
import {createKitMaterials,buildEquipment} from './master-kit.js';
import {compileRoom,styles,validatePaths,validateGalleryRoute} from './room-plan.js';
import {bindMechanism,tickDrive} from './machine-behaviors.js';
import {profileName} from './mesh-quality.js';
import {validateComposition} from './art-director.js';
export const referenceCeilings={economy:245280,balanced:262896,cinematic:307072};
function architecture(root,s,m){
  const {width:w,length:l,height:h}=s.dimensions;
  buildBoundary(root,s,m);
  const floor=block(root,'deck',[0,-.12,0],[w,.24,l],m.deck);
  block(root,'ceiling',[0,h+.18,0],[w,.36,l],m.dark);
  for(const side of [-1,1]){
    block(root,'route_strip',[side*1.45,.008,0],[.045,.016,l-.7],m.cyan);
    pipe(root,'power_supply',[side*(w/2-.7),(s.architecture?.walkable?Math.max(h*.71,h*.57+2.4):h*.71),-l/2],[side*(w/2-.7),(s.architecture?.walkable?Math.max(h*.71,h*.57+2.4):h*.71),l/2],.19,m.copper);
  }
  const bays=Math.ceil(l/4);
  for(let i=0;i<bays;i++){
    const z=-l/2+(i+.5)*l/bays;
    for(const side of [-1,1]){
      const x=side*(w/2-.35);
      block(root,'rib',[x,h*.34,z],[.46,h*.68,.42],m.steel,true);
      beam(root,'haunch',[x,s.architecture?.walkable?Math.max(h*.65,h*.57+2.4):h*.65,z],[side*w*.32,h-.18,z],.42,.38,m.shell);
      plate(root,'service_access',1.6,1.4,.09,[x-side*.26,2.3,z],m.shell).rotation.y=-side*Math.PI/2;
      block(root,'maintenance_light',[x-side*.29,3.65,z],[.08,.14,1.25],m.violet);
    }
    block(root,'overhead_beam',[0,h-.32,z],[w*.7,.48,.34],m.steel,true);
    if(s.ceiling==='vault'){
      const arc=new T.Mesh(new T.TorusGeometry(w*.43,.12,8,64,Math.PI),m.chrome);
      arc.position.set(0,h*.64,z);arc.scale.y=h*.31/(w*.43);root.add(arc);
    }
  }
  for(let i=0;i<s.bridges;i++){
    const z=-l/2+(i+1)*l/(s.bridges+1),y=h*.57,access=galleryAccess(s);
    const spans=access?[[-w/2,access.x-access.width/2-.15],[access.x+access.width/2+.15,w/2]]:[[-w/2,w/2]];
    for(const [left,right] of spans){
      block(root,'service_bridge',[(left+right)/2,y,z],[right-left,.28,1],m.steel,true);
      const railLeft=access?Math.max(left,-w/2+1.85):left;
      const railRight=access&&(s.architecture.galleries??0)>1?Math.min(right,w/2-1.85):right;
      if(railRight>railLeft)for(const dz of [-.47,.47]){
        pipe(root,'bridge_rail',[railLeft,y+.94,z+dz],[railRight,y+.94,z+dz],.045,m.chrome);
        for(let x=railLeft+.2;x<railRight;x+=2)pipe(root,'rail_post',[x,y,z+dz],[x,y+.94,z+dz],.03,m.shell);
      }
      block(root,'underside_luminaire',[(left+right)/2,y-.16,z],[(right-left)*.68,.04,.11],m.violet);
    }
  }
  floor.receiveShadow=true;prepareStructuralSurfaces(root,m);batchRigidParts(root);
}
export function measureRoom(root){
  const sources=new Set();let triangles=0,batches=0,textureBytes=0;
  root.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];batches+=mats.length;
    triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);
    for(const m of mats)for(const t of Object.values(m))if(t?.isTexture&&!sources.has(t.source)){sources.add(t.source);textureBytes+=Math.ceil((t.image?.width||0)*(t.image?.height||0)*4*(t.generateMipmaps?4/3:1));}});
  return {triangles,batches,textureBytes};
}
export function buildRoom(spec,{profile='balanced',textures=true}={}){
  if(profileName(profile)!==profile)throw Error('Profil graphique inconnu');
  const plan=compileRoom(spec),materials=createKitMaterials(styles[spec.style],{textures}),root=new T.Group();
  const shell=new T.Group();root.name=spec.id;root.add(shell);architecture(shell,spec,materials);
  const stations=[],boxes=[],drives=[];const bounds=new T.Box3();
  for(const obj of plan.objects){
    const model=buildEquipment(obj.kind,materials,{profile,variant:obj.variant,attachments:obj.attachments});
    model.position.set(obj.x,0,obj.z);model.rotation.y=obj.angle;model.name=obj.id;root.add(model);
    bounds.setFromObject(model);boxes.push({id:obj.id,minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z,minY:bounds.min.y,maxY:bounds.max.y});
    stations.push({...obj,height:Math.min(2.1,bounds.max.y*.7),active:false});
    const firstDrive=drives.length;
    model.traverse(n=>{const d=n.userData.drive;if(!d)return;
      drives.push(bindMechanism(n,stations.at(-1)));});
    // Reserve the swept volume of movable components, including access covers.
    const station=stations.at(-1),boundDrive=drives.slice(firstDrive);
    const resting=boundDrive.map(b=>b.channel[b.key]);
    station.active=true;station.activatedAt=0;
    for(let frame=0;frame<12;frame++){
      for(const binding of boundDrive)tickDrive(binding,frame*3.7,0,false);
      bounds.union(new T.Box3().setFromObject(model));
    }
    boundDrive.forEach((b,i)=>b.channel[b.key]=resting[i]);
    station.active=false;delete station.activatedAt;
    Object.assign(boxes.at(-1),{minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z,minY:bounds.min.y,maxY:bounds.max.y});
  }
  for(const module of spec.modules??[]){
    const model=buildModule(module,materials,{profile});root.add(model);
    const station={x:module.position[0],z:module.position[2],phase:0,active:false};
    model.traverse(n=>{if(n.userData.drive)drives.push(bindMechanism(n,station));});
    bounds.setFromObject(model);
    if(bounds.min.x < -spec.dimensions.width/2 || bounds.max.x > spec.dimensions.width/2 || bounds.min.z < -spec.dimensions.length/2 || bounds.max.z > spec.dimensions.length/2 || bounds.max.y > spec.dimensions.height || bounds.min.y<-.02)throw Error('Module hors volume '+module.id);
    if(bounds.min.y<2.1&&bounds.max.y>.15)boxes.push({id:module.id,minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z,minY:bounds.min.y,maxY:bounds.max.y});
  }
  connectMachines(root,spec.connections??[],materials,spec.dimensions.height);
  const layout={...plan,stations,boxes};validatePaths(layout);validateGalleryRoute(layout);
  const cost=measureRoom(root),budget={triangles:referenceCeilings[profile],...spec.budgets};
  for(const [k,limit] of Object.entries(budget))if(cost[k]>limit)throw Error('Budget dépassé '+k+' '+cost[k]+' / '+limit);
  let last=-Infinity;
  function update(t,reduced,{pose,eco}){
    if(t-last<(eco?1/12:1/24))return;last=t;
    for(const binding of drives){
      const distance=Math.hypot(pose.x-binding.station.x,pose.z-binding.station.z);
      if(distance<=(eco?15:32))tickDrive(binding,t,distance,reduced);
    }
  }
  const composition=validateComposition(root,layout,materials);
  return {root,materials,layout,cost,composition,update,anomalyAt:()=>({active:false,light:1}),stations};
}
