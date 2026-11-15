import * as T from '../vendor/three.module.js';
import {pipe} from './industrial-parts.js';
export function galleryAccess(spec){
  if(!spec.architecture?.walkable)return null;
  const {width:w,length:l,height:h}=spec.dimensions;
  const cut=spec.architecture.shape==='chamfered'?Math.min(3,w*.14):0;
  return {x:-w/2+2.6,width:1.4,lowZ:l/2-cut-2,highZ:-l/2+cut+3,height:h*.57+.115,
    galleryX:-w/2+.88,galleryWidth:1.7,galleryLength:l-2*((spec.architecture.shape==='chamfered'?Math.min(3,w*.14):0)+1)};
}
export function validateGallery(spec){
  if(spec.architecture?.walkable!==undefined&&typeof spec.architecture.walkable!=='boolean')throw Error('Accès galerie invalide');
  const a=galleryAccess(spec);if(!a)return;
  if((spec.architecture.galleries??0)<1||spec.dimensions.width<16||a.height/(a.lowZ-a.highZ)>.4)throw Error('Galerie : prévoir une largeur de 16 m et une longueur suffisante pour une rampe douce');
}
function within(x,z,minX,maxX,minZ,maxZ,r){
  return x>=minX+r&&x<=maxX-r&&z>=minZ+r&&z<=maxZ-r;
}
export function accessFloor(x,z,previous,spec,r=.3){
  const a=galleryAccess(spec);if(!a)return 0;
  const candidates=[0];
  const ramp=within(x,z,a.x-a.width/2,a.x+a.width/2,a.highZ,a.lowZ,r);
  const rampY=a.height*(a.lowZ-z)/(a.lowZ-a.highZ);
  if(ramp)candidates.push(rampY);
  // A landing connects the inner ramp to the outer gallery.
  if(within(x,z,-spec.dimensions.width/2+.25,spec.dimensions.width/2-.25,a.highZ-1.25,a.highZ+.65,r))candidates.push(a.height);
  const count=spec.architecture.galleries;
  for(let i=0;i<count;i++){
    const gx=(i?1:-1)*(spec.dimensions.width/2-.88);
    if(within(x,z,gx-.85,gx+.85,-a.galleryLength/2,a.galleryLength/2,r))candidates.push(a.height);
  }
  for(let i=0;i<spec.bridges;i++){
    const bz=-spec.dimensions.length/2+(i+1)*spec.dimensions.length/(spec.bridges+1);
    if((x+r< a.x-a.width/2-.15||x-r>a.x+a.width/2+.15)&&within(x,z,-spec.dimensions.width/2,spec.dimensions.width/2,bz-.5,bz+.5,r))candidates.push(spec.dimensions.height*.57+.14);
  }
  const accepted=candidates.filter(h=>Math.abs(h-previous)<=.31);
  if(!accepted.length)return null;
  const height=Math.max(...accepted);
  // Do not allow a player to walk through the low underside of the ramp.
  if(Math.abs(x-a.x)<a.width/2+r&&z>=a.highZ&&z<=a.lowZ&&rampY>height+.31&&rampY<height+1.85)return null;
  return height;
}
export function buildGalleryAccess(root,spec,m){
  const a=galleryAccess(spec);if(!a)return;
  const {x,width:w,lowZ:z0,highZ:z1,height:h}=a;
  const vertices=[
    x-w/2,-.12,z0,x+w/2,-.12,z0,x-w/2,h-.12,z1,x+w/2,h-.12,z1,
    x-w/2,0,z0,x+w/2,0,z0,x-w/2,h,z1,x+w/2,h,z1
  ];
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setIndex([4,5,6,5,7,6,0,2,1,1,2,3,0,1,4,1,5,4,2,6,3,3,6,7,0,4,2,2,4,6,1,3,5,3,7,5]);
  const g=geometry.toNonIndexed();g.computeVertexNormals();
  g.setAttribute('uv',new T.Float32BufferAttribute(Array.from({length:g.attributes.position.count},(_,i)=>[g.attributes.position.getX(i),g.attributes.position.getZ(i)]).flat(),2));
  const mesh=new T.Mesh(g,m.deck);mesh.name='walkable_maintenance_ramp';mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);geometry.dispose();
  for(const side of [-1,1]){
    pipe(root,'ramp_guard',[x+side*w/2,.94,z0],[x+side*w/2,h+.94,z1],.035,m.chrome);
    for(let i=0;i<=5;i++){
      const t=i/5,z=z0+(z1-z0)*t,y=h*t;
      pipe(root,'ramp_stanchion',[x+side*w/2,y,z],[x+side*w/2,y+.94,z],.027,m.steel);
    }
  }
  const minX=-spec.dimensions.width/2+.25,maxX=spec.dimensions.width/2-.25;
  const deck=new T.Mesh(new T.BoxGeometry(maxX-minX,.23,1.9),m.steel);
  deck.position.set((minX+maxX)/2,h-.115,z1-.3);deck.name='gallery_access_landing';deck.receiveShadow=true;root.add(deck);
  pipe(root,'landing_guard',[minX,h+.94,z1-1.25],[maxX,h+.94,z1-1.25],.035,m.chrome);
}
