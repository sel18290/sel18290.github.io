// Offline pre-publication geometric inspection. It operates on the actual mesh,
// including instances, independently from the supported-floor collision solver.
import {Raycaster,Vector3} from '../vendor/three.module.js';
import {galleryAccess} from './gallery-access.js';
import {walk} from './room-plan.js';
export function inspectGalleryClearance(room){
  const a=galleryAccess(room.layout.spec);if(!a)return {samples:0,rays:0};
  room.root.updateMatrixWorld(true);
  const p={...room.layout.spawn},ray=new Raycaster(),up=new Vector3(0,1,0),origin=new Vector3();
  ray.near=0;ray.far=1.62;
  const targets=[[a.x,a.lowZ+.4],[a.x,a.highZ-.3],[a.galleryX,a.highZ-.3],[a.galleryX,Math.min(a.lowZ-.8,a.galleryLength/2-.5)]];
  let samples=0,rays=0,travel=1;
  for(const [x,z] of targets){
    for(let i=0;i<2000&&Math.hypot(p.x-x,p.z-z)>.04;i++){
      const dx=x-p.x,dz=z-p.z,length=Math.hypot(dx,dz),step=Math.min(.035,length);
      const before={x:p.x,z:p.z};walk(p,dx/length*step,dz/length*step,room.layout);
      const distance=Math.hypot(p.x-before.x,p.z-before.z);
      if(distance<.001)throw Error('Inspection galerie : trajet bloqué');
      travel+=distance;if(travel<.8)continue;travel=0;samples++;
      for(const [ox,oz] of [[0,0],[-.22,0],[.22,0],[0,-.22],[0,.22]]){
        origin.set(p.x+ox,(p.floor??0)+.18,p.z+oz);ray.set(origin,up);rays++;
        const hit=ray.intersectObjects(room.root.children,true).find(h=>h.object.isMesh);
        if(hit)throw Error('Dégagement galerie insuffisant : '+hit.object.name+' à X '+p.x.toFixed(2)+' / Z '+p.z.toFixed(2)+' / hauteur '+(p.floor??0).toFixed(2));
      }
    }
  }
  return {samples,rays,method:'Five vertical mesh rays per sampled location, body from +0.18 m to +1.8 m; preferred ascent and gallery path. This verifies sampled geometry, not all possible player trajectories.'};
}
