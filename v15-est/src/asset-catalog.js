import * as T from '../vendor/three.module.js';
import {block,pipe,beam,plate,bolt} from './industrial-parts.js';
import {BUILD_ASSEMBLIES} from './architecture-assets.js';
import {batchRigidParts} from './mechanical-rig.js';

export const MODULE_KINDS=Object.freeze(['pillar','beam','ring','duct','wall-panel','vent','luminaire','platform','support','neural-stack','buttress','halo']);
export function validateModule(def){
  if(!def||Object.getPrototypeOf(def)!==Object.prototype||Object.keys(def).some(k=>!['id','kind','size','position','rotation'].includes(k)))throw Error('Module invalide');
  if(typeof def.id!=='string'||!/^module-[a-z0-9-]+$/.test(def.id)||!MODULE_KINDS.includes(def.kind))throw Error('Module inconnu');
  if(!Array.isArray(def.size)||def.size.length!==3||def.size.some(n=>!Number.isFinite(n)||n<.1||n>30))throw Error('Dimensions du module invalides');
  if(!Array.isArray(def.position)||def.position.length!==3||def.position.some(n=>!Number.isFinite(n)))throw Error('Position du module invalide');
  if(def.rotation!==undefined&&(!Number.isFinite(def.rotation)||Math.abs(def.rotation)>Math.PI*2))throw Error('Rotation du module invalide');
}
export function buildModule(def,m,{profile='balanced'}={}){
  validateModule(def);
  const root=new T.Group(),[w,h,d]=def.size;
  root.name=def.id;root.userData.asset={family:def.kind,anchor:'floor-center',version:1};
  const port=(name,p,normal)=>{const node=new T.Group();node.name='port.'+name;node.position.set(...p);node.userData.socket={role:name,normal,frame:'local'};root.add(node);};
  if(['neural-stack','buttress','halo'].includes(def.kind)){
    const factory=BUILD_ASSEMBLIES[{'neural-stack':'stack',buttress:'buttress',halo:'halo'}[def.kind]];
    const assembly=factory(m,{distant:profile==='economy'});
    const box=new T.Box3().setFromObject(assembly),extent=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
    const wrapper=new T.Group();wrapper.scale.set(w/extent.x,h/extent.y,d/extent.z);
    assembly.position.set(-center.x,-box.min.y,-center.z);wrapper.add(assembly);root.add(wrapper);
    assembly.traverse(node=>{
      const rig=node.userData.mechanism;
      if(!rig||!node.userData.dynamic)return;
      node.userData.drive={type:rig.kind==='translation'?'slide':'rotate',axis:rig.axis,amplitude:rig.kind==='translation'?Math.min(.035,rig.max-rig.min):1,speed:rig.kind==='translation'?.15:.025};
    });
    port('structural',[0,h,0],[0,1,0]);
  }else if(def.kind==='pillar'){
    for(const side of [-1,1])block(root,'flange',[side*w*.4,h/2,0],[w*.2,h,d],m.titanium,true);
    block(root,'web',[0,h/2,0],[w*.7,h,d*.26],m.steel,true);
    for(const y of [.12,h-.12]){block(root,'bolted-plate',[0,y,0],[w+.06,.16,d+.06],m.shell,true);for(const x of [-w*.32,w*.32])for(const z of [-d*.32,d*.32])bolt(root,[x,y+.09,z],m.chrome,.035);}
    port('load',[0,h,0],[0,1,0]);
  }else if(def.kind==='ring'){
    const radius=Math.min(w,d)/2;
    const ring=new T.Mesh(new T.TorusGeometry(radius*.9,Math.max(.03,radius*.07),profile==='economy'?8:12,profile==='cinematic'?128:64),m.titanium);
    ring.rotation.x=Math.PI/2;ring.position.y=h/2;root.add(ring);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;block(root,'clamp',[Math.cos(a)*radius*.9,h/2,Math.sin(a)*radius*.9],[radius*.14,.17,radius*.14],m.anodized,true);}
    port('synchronization',[0,h/2,0],[0,1,0]);
  }else if(def.kind==='duct'){
    pipe(root,'supply',[0,d*.0,0],[0,h,0],Math.min(w,d)*.33,m.steel);
    for(const y of [0,h/2,h]){const c=new T.Mesh(new T.CylinderGeometry(Math.min(w,d)*.43,Math.min(w,d)*.43,.13,32),m.titanium);c.position.y=y;root.add(c);}
    port('feed',[0,h,0],[0,1,0]);port('return',[0,0,0],[0,-1,0]);
  }else if(def.kind==='vent'){
    plate(root,'access-frame',w,h,d,[0,h/2,0],m.shell);
    const rows=Math.max(3,Math.min(18,Math.ceil(h/.15)));
    block(root,'dark-plenum',[0,h/2,d*.55],[w*.84,h*.8,.02],m.rubber);
    for(let i=0;i<rows;i++)block(root,'louver',[0,h*(.14+.72*i/(rows-1)),d*.62],[w*.82,h*.32/rows,.06],m.steel,true);
  }else if(def.kind==='luminaire'){
    block(root,'housing',[0,h/2,0],[w,h,d],m.anodized,true);
    block(root,'diffuser',[0,h/2,d*.51],[w*.84,h*.65,.015],m.screen);
    port('power',[0,0,-d/2],[0,0,-1]);
  }else if(def.kind==='platform'){
    block(root,'deck',[0,h/2,0],[w,h,d],m.steel,true);
    for(const side of [-1,1]){beam(root,'lower-rib',[-w/2,h*.1,side*d*.38],[w/2,h*.1,side*d*.38],.1,.12,m.shell);pipe(root,'guard',[side*w*.48,h,-d/2],[side*w*.48,h,d/2],.035,m.chrome);}
  }else if(def.kind==='support'){
    beam(root,'diagonal',[-w/2,0,-d/2],[w/2,h,d/2],.16,.16,m.steel);
    for(const p of [[-w/2,0,-d/2],[w/2,h,d/2]])block(root,'connection-plate',p,[.3,.2,.3],m.shell,true);
  }else{
    block(root,'chassis',[0,h/2,0],[w,h,d],m.anodized,true);
    if(def.kind==='wall-panel'){
      plate(root,'removable-cover',w*.94,h*.94,Math.min(d*.2,.06),[0,h/2,d*.52],m.shell);
      for(const x of [-w*.4,w*.4])for(const y of [h*.12,h*.88])bolt(root,[x,y,d*.61],m.chrome,.03);
      block(root,'seal',[0,h*.2,d*.565],[w*.66,.018,.012],m.rubber);
    }
  }
  const extents=new T.Box3().setFromObject(root),center=extents.getCenter(new T.Vector3());
  for(const child of root.children)child.position.sub(new T.Vector3(center.x,extents.min.y,center.z));
  root.position.set(...def.position);root.rotation.y=def.rotation??0;
  batchRigidParts(root);
  root.userData.ports=[];
  root.traverse(n=>{if(n.userData.socket)root.userData.ports.push(n.name);});
  return root;
}
