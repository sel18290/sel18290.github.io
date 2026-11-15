import * as T from '../vendor/three.module.js';
import {duct} from './industrial-parts.js';
const roles={coolant:['coolant','feed','return'],power:['power','feed'],data:['data','synchronization']};
export function validateLink(link){
  if(!link||Object.getPrototypeOf(link)!==Object.prototype||Object.keys(link).some(k=>!['a','b','socketA','socketB','kind'].includes(k)))throw Error('Raccord invalide');
  if(!Object.hasOwn(roles,link.kind))throw Error('Circuit inconnu');
  for(const key of ['a','b','socketA','socketB'])if(typeof link[key]!=='string'||!/^[a-z][a-z0-9-]{0,47}$/.test(link[key]))throw Error('Extrémité de raccord invalide');
  if(link.a===link.b)throw Error('Circuit replié sur un seul équipement');
}
export function connectMachines(root,links,m,height){
  root.updateMatrixWorld(true);
  for(const [i,link] of links.entries()){
    validateLink(link);
    const a=root.children.find(o=>o.name===link.a)?.getObjectByName('port.'+link.socketA);
    const b=root.children.find(o=>o.name===link.b)?.getObjectByName('port.'+link.socketB);
    for(const socket of [a,b]){
      if(!socket?.userData.socket||!roles[link.kind].includes(socket.userData.socket.role)||socket.userData.linked||socket.children.length)throw Error('Prise de raccord incompatible ou occupée');
    }
    const start=a.getWorldPosition(new T.Vector3()),end=b.getWorldPosition(new T.Vector3());
    const overhead=Math.max(3,start.y+.35,end.y+.35);
    if(overhead>height-.4)throw Error('Circuit trop proche du plafond');
    const points=[start.toArray(),[start.x,overhead,start.z],[end.x,overhead,end.z],end.toArray()];
    const conduit=duct(root,'circuit-'+i,points,link.kind==='data'?.026:.055,link.kind==='power'?m.rubber:m.copper);
    conduit.userData.link={...link};a.userData.linked=true;b.userData.linked=true;
  }
}
