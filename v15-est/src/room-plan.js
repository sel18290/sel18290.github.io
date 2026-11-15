// Rooms are data. Only these installed families and presets can be instantiated.
import {shellAllows,shellBounds,validateShell} from './room-shell.js';
import {validateModule} from './asset-catalog.js';
import {validateLink} from './machine-links.js';
import {accessFloor,galleryAccess} from './gallery-access.js';
import {cues} from './machine-behaviors.js';
import {intersects, PLAYER_RADIUS} from './physics.js';
import {styles,validateArtProfile} from './art-profiles.js';
export {styles};
const recipes = {
  calcul:['server','reactor'], energie:['reactor','reactor'], robotique:['robot','terminal'],
  neuronal:['sensor','reactor'], controle:['terminal','sensor'], synchronisation:['sensor','reactor'],
  donnees:['server','server'], confinement:['sensor','terminal'], couloir:['terminal','sensor'],
  experimentation:['robot','sensor']
};
export const families=['server','reactor','robot','terminal','sensor','cooler','relay','scanner'];
const keys = ['version','id','name','function','style','dimensions','seed','machines','bridges','focal','equipment','ceiling','interaction','audio','budgets','stations','architecture','modules','layout','connections'];
function requireValue(ok, message){if(!ok)throw new Error(message);}
function onlyKeys(obj, allowed){requireValue(obj && Object.getPrototypeOf(obj)===Object.prototype && Object.keys(obj).every(k=>allowed.includes(k)), 'Champ ou objet inconnu');}
function integer(v,lo,hi){return Number.isInteger(v)&&v>=lo&&v<=hi;}
function random(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
export function compileRoom(spec){
  onlyKeys(spec, keys);
  requireValue(spec.version===1 && typeof spec.id==='string' && /^[a-z][a-z0-9-]{0,47}$/.test(spec.id) && typeof spec.name==='string' && spec.name.length>0 && spec.name.length<=80,'Identité de salle invalide');
  requireValue(Object.hasOwn(recipes,spec.function)&&Object.hasOwn(styles,spec.style),'Fonction ou profil inconnu');
  onlyKeys(spec.dimensions,['width','length','height']);
  const {width:w,length:l,height:h}=spec.dimensions;
  requireValue(integer(w,12,48)&&integer(l,16,72)&&integer(h,8,28),'Dimensions hors limites');
  requireValue(integer(spec.seed,0,4294967295)&&integer(spec.machines,2,16)&&integer(spec.bridges,0,4),'Valeur de génération invalide');
  requireValue(['vault','gantry'].includes(spec.ceiling)&&['diagnostic','calibration'].includes(spec.interaction)&&['compute','servo'].includes(spec.audio),'Comportement inconnu');
  const family=spec.equipment??[recipes[spec.function][0]],focal=spec.focal??recipes[spec.function][1];
  requireValue(Array.isArray(family)&&family.length>=1&&family.length<=5&&family.every(f=>families.includes(f))&&families.includes(focal),'Équipement inconnu');
  if(spec.budgets){onlyKeys(spec.budgets,['triangles','batches','textureBytes']);requireValue(Object.values(spec.budgets).every(n=>integer(n,1,1e9)),'Budget invalide');}
  const art=validateArtProfile(styles[spec.style]);
  requireValue(art.structures.includes(spec.ceiling)&&family.every(f=>art.equipment.includes(f))&&art.equipment.includes(focal),'Profil incompatible avec les équipements');
  validateShell(spec);
  if(spec.modules!==undefined){
    requireValue(Array.isArray(spec.modules)&&spec.modules.length<=32,'Liste de modules invalide');
    const ids=new Set();
    for(const module of spec.modules){validateModule(module);requireValue(!ids.has(module.id),'Identifiant module dupliqué');ids.add(module.id);}
  }
  requireValue(['paired','staggered','split'].includes(spec.layout??'paired'),'Disposition inconnue');
  if(spec.connections!==undefined){
    requireValue(Array.isArray(spec.connections)&&spec.connections.length<=32,'Liste de circuits invalide');
    spec.connections.forEach(validateLink);
  }
  const rand=random(spec.seed), rows=Math.ceil(spec.machines/2);
  requireValue((l-6)/rows>=4.1,'Longueur insuffisante pour les allées');
  const objects=[];
  function place(kind,id,x,z,angle,action=false){objects.push({kind,id,x,z,angle,action,variant:Math.floor(rand()*5),phase:rand()*Math.PI*2});}
  place(focal,'focus',0,-l*.19,0,true);
  for(let i=0;i<spec.machines;i++){
    const side=i%2?1:-1;
    const selectedFamily=family[Math.floor(rand()*family.length)];
    let x=side*(w/2-2.3-rand()*.3),z=l/2-3-(Math.floor(i/2)+.5)*(l-6)/rows;
    if(spec.architecture?.walkable&&side<0)x+=2.3;
    if(spec.layout==='staggered')z+=(i%2?.35:-.35);
    if(spec.layout==='split')x*=.78;
    place(selectedFamily,'bay-'+(i+1),x,z,-side*Math.PI/2,true);
  }
  place('terminal','terminal',w*.22,l*.25,-.45,true);
  if(spec.stations){
    onlyKeys(spec.stations,objects.map(o=>o.id));
    for(const o of objects){
      if(!Object.hasOwn(spec.stations,o.id))continue;
      const settings=spec.stations[o.id];
      onlyKeys(settings,['kind','cue','interaction','rate','radius','attachments']);
      if(settings.kind!==undefined)requireValue(families.includes(settings.kind),'Famille du poste inconnue');
      if(settings.cue!==undefined)requireValue(Object.hasOwn(cues,settings.cue),'Signal inconnu');
      if(settings.interaction!==undefined)requireValue(['diagnostic','calibration'].includes(settings.interaction),'Action inconnue');
      if(settings.rate!==undefined)requireValue(Number.isFinite(settings.rate)&&settings.rate>=.2&&settings.rate<=2,'Cadence invalide');
      if(settings.radius!==undefined)requireValue(Number.isFinite(settings.radius)&&settings.radius>=1&&settings.radius<=8,'Rayon invalide');
      if(settings.attachments!==undefined)requireValue(Array.isArray(settings.attachments)&&settings.attachments.length<=4&&settings.attachments.every(x=>typeof x==='string'),'Accessoires invalides');
      Object.assign(o,settings);
    }
  }
  const plan={spec,objects,spawn:{x:0,z:l/2-1.6},bounds:shellBounds(spec)};
  return plan;
}
export function standHeight(x,z,layout,previous=0){
  const b=layout.bounds,r=PLAYER_RADIUS;
  const floor=layout.spec?accessFloor(x,z,previous,layout.spec,r):0;
  if(floor===null)return null;
  if(layout.spec&&!shellAllows(x,z,r,layout.spec,floor))return null;
  if(x<b.minX+r||x>b.maxX-r||z<b.minZ+r||z>b.maxZ-r)return null;
  if(layout.boxes.some(box=>(box.maxY??Infinity)>floor+.12&&(box.minY??0)<floor+1.8&&intersects(x,z,box,r)))return null;
  return floor;
}
export function canStand(x,z,layout,floor=0){return standHeight(x,z,layout,floor)!==null;}
export function walk(position,dx,dz,layout){
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.065));
  let hits=0;
  for(let i=0;i<count;i++){
    const xFloor=standHeight(position.x+dx/count,position.z,layout,position.floor??0);
    if(xFloor!==null){position.x+=dx/count;if(layout.spec?.architecture?.walkable)position.floor=xFloor;}else hits++;
    const zFloor=standHeight(position.x,position.z+dz/count,layout,position.floor??0);
    if(zFloor!==null){position.z+=dz/count;if(layout.spec?.architecture?.walkable)position.floor=zFloor;}else hits++;
  }
  return hits;
}
export function nearestStation(p,yaw,layout){
  let closest=null,best=Infinity;
  for(const o of layout.stations){
    const dx=o.x-p.x,dz=o.z-p.z,dy=(p.floor??0)+1.68-(o.height??1.68),d=Math.hypot(dx,dz,dy);
    if(d>2.6||d>=best||(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)<.38*d)continue;
    if(layout.boxes.some(b=>b.id!==o.id&&Array.from({length:8},(_,i)=>(i+1)/9).some(t=>intersects(p.x+t*dx,p.z+t*dz,b,.03))))continue;
    closest=o;best=d;
  }
  return closest;
}
// Flood fill uses player radius; approach must also satisfy the actual interaction ray.
export function validatePaths(layout){
  const {spawn,bounds:b}=layout;
  requireValue(canStand(spawn.x,spawn.z,layout),'Départ obstrué');
  for(const [i,a] of layout.boxes.entries()){
    requireValue(a.minX>=b.minX&&a.maxX<=b.maxX&&a.minZ>=b.minZ&&a.maxZ<=b.maxZ,'Équipement hors salle '+a.id);
    for(const c of layout.boxes.slice(i+1))requireValue((a.maxY??Infinity)<=(c.minY??0)||(c.maxY??Infinity)<=(a.minY??0)||a.maxX<=c.minX||a.minX>=c.maxX||a.maxZ<=c.minZ||a.minZ>=c.maxZ,'Chevauchement '+a.id+' / '+c.id);
  }
  const step=.45,queue=[[0,0]],seen=new Set(['0,0']),unreached=new Set(layout.stations);
  const doors=new Set((layout.spec?.architecture?.doors??[]).map(d=>({x:d.offset,z:(d.wall==='north'?-1:1)*(layout.spec.dimensions.length/2+.75),wall:d.wall})));
  for(let i=0;i<queue.length&&(unreached.size||doors.size);i++){
    const [ix,iz]=queue[i],x=spawn.x+ix*step,z=spawn.z+iz*step;
    for(const door of doors)if(Math.hypot(door.x-x,door.z-z)<=.35)doors.delete(door);
    for(const o of unreached){if(Math.hypot(o.x-x,o.z-z)<=2.6&&nearestStation({x,z},Math.atan2(x-o.x,z-o.z),layout)===o)unreached.delete(o);}
    for(const [sx,sz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=ix+sx,nz=iz+sz,key=nx+','+nz;
      if(!seen.has(key)&&canStand(x+sx*step/2,z+sz*step/2,layout)&&canStand(spawn.x+nx*step,spawn.z+nz*step,layout)){seen.add(key);queue.push([nx,nz]);}
    }
  }
  requireValue(!doors.size,'Sas inaccessible '+[...doors].map(d=>d.wall+'@'+d.x).join(', '));
  requireValue(!unreached.size,'Station inaccessible '+[...unreached].map(o=>o.id).join(', '));
}

export function validateGalleryRoute(layout){
  const access=galleryAccess(layout.spec);if(!access)return;
  const pose={...layout.spawn};
  const target={x:access.galleryX,z:Math.min(access.lowZ-.8,access.galleryLength/2-.5)};
  const points=[[access.x,access.lowZ+.4],[access.x,access.highZ-.3],[access.galleryX,access.highZ-.3],[target.x,target.z]];
  let clear=true;
  for(const [x,z] of points){
    for(let i=0;i<2000&&Math.hypot(pose.x-x,pose.z-z)>.04;i++){
      const dx=x-pose.x,dz=z-pose.z,length=Math.hypot(dx,dz),step=Math.min(.035,length);
      const beforeX=pose.x,beforeZ=pose.z;
      walk(pose,dx/length*step,dz/length*step,layout);
      if(Math.hypot(pose.x-beforeX,pose.z-beforeZ)<.001){clear=false;break;}
    }
    if(Math.hypot(pose.x-x,pose.z-z)>.04){clear=false;break;}
  }
  if(clear&&Math.abs(pose.floor-access.height)<.05)return;
  // A preferred route is only a fast witness. A different arrangement may
  // still provide a valid route, so search actual supported levels as fallback.
  const pitch=.3,queue=[{...layout.spawn,floor:0,ix:0,iz:0}],seen=new Set(['0,0,0.00']);
  for(let i=0;i<queue.length;i++){
    const current=queue[i];
    if(Math.hypot(current.x-target.x,current.z-target.z)<.35&&Math.abs(current.floor-access.height)<.1)return;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const ix=current.ix+dx,iz=current.iz+dz;
      const next={x:current.x,z:current.z,floor:current.floor,ix,iz};
      walk(next,dx*pitch,dz*pitch,layout);
      const x=layout.spawn.x+ix*pitch,z=layout.spawn.z+iz*pitch;
      if(Math.hypot(next.x-x,next.z-z)>.001)continue;
      const key=ix+','+iz+','+next.floor.toFixed(2);
      if(!seen.has(key)){seen.add(key);queue.push(next);}
    }
  }
  throw Error('Accès à la galerie obstrué');
}
