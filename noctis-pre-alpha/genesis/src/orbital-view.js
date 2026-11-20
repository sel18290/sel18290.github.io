import {observatoryInterior} from './observatory-interior.js';
import * as T from 'three';

// All visible station rings, solar decks and pillars are spatial geometry.
// This exterior stays beyond the sealed viewing window.
export function createOrbitalView(horizonTexture,maps,bayReflection,materials,options={}) {
  const root=new T.Group();observatoryInterior(root,maps,bayReflection,materials,options);
  const steel=new T.MeshStandardMaterial({color:0x8995a1,metalness:.74,roughness:.36});
  const graphite=new T.MeshStandardMaterial({color:0x323c4b,metalness:.65,roughness:.48});
  const light=new T.MeshBasicMaterial({color:0xb0e7ed});
  const warm=new T.MeshBasicMaterial({color:0xffddaa});
  function mesh(geometry,material,position,parent=root){
    const object=new T.Mesh(geometry,material);object.position.set(...position);parent.add(object);return object;
  }
  const station=new T.Group();station.position.set(-22,1,-89);station.rotation.set(.28,.66,-.33);root.add(station);
  for(const r of [19,20]){
    for(const depth of [-.5,.5]){
      mesh(new T.TorusGeometry(r,.18,8,192),steel,[0,0,depth],station);
      mesh(new T.TorusGeometry(r+.32,.025,6,192),light,[0,0,depth],station);
    }
    const ribGeometry=new T.BoxGeometry(.16,.9,1.1);
    const ribs=new T.InstancedMesh(ribGeometry,graphite,Math.round(r*4));
    const matrix=new T.Matrix4(),rotation=new T.Quaternion(),scale=new T.Vector3(1,1,1);
    const center=new T.Vector3();
    for(let i=0;i<ribs.count;i++){
      const a=i/ribs.count*Math.PI*2;center.set(Math.cos(a)*r,Math.sin(a)*r,0);
      rotation.setFromAxisAngle(new T.Vector3(0,0,1),a);
      matrix.compose(center,rotation,scale);ribs.setMatrixAt(i,matrix);
    }
    station.add(ribs);
  }
  const tower=new T.Group();tower.position.set(0,0,0);station.add(tower);
  mesh(new T.CylinderGeometry(1.2,1.8,35,40),steel,[0,4,0],tower);
  for(const y of [-7,0,8,15]){
    mesh(new T.CylinderGeometry(4.5,5.2,.6,64),graphite,[0,y,0],tower);
    const windows=mesh(new T.TorusGeometry(4.55,.045,6,96),light,[0,y+.2,0],tower);windows.rotation.x=Math.PI/2;
    mesh(new T.CylinderGeometry(2.5,4.5,.8,64),steel,[0,y+.7,0],tower);
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    const arm=mesh(new T.BoxGeometry(18,.48,.75),steel,[Math.cos(a)*10,Math.sin(a)*10,0],station);arm.rotation.z=a;
  }
  // A distant, curved orbital horizon sampled from the approved illustration.
  // Window frames, station and machinery remain at their own metric depths.
  if(horizonTexture){
    const sky=new T.SphereGeometry(320,96,64);
    const uv=sky.attributes.uv, pos=sky.attributes.position;
    for(let i=0;i<pos.count;i++){
      const az=Math.atan2(pos.getX(i),-pos.getZ(i)),el=Math.asin(T.MathUtils.clamp(pos.getY(i)/320,-1,1));
      uv.setXY(i,.5+az/(Math.PI*1.35),.5+el/(Math.PI*.64));
    }
    mesh(sky,new T.MeshBasicMaterial({map:horizonTexture,side:T.BackSide,toneMapped:false}),[0,0,0]);
  }
  // Window mullions and glass are meshes for precise silhouettes at close range.
  const glass=mesh(new T.PlaneGeometry(9.5,3.6),new T.MeshPhysicalMaterial({color:0xc7e0ed,transparent:true,opacity:.055,roughness:.12,metalness:.12,side:T.DoubleSide,depthWrite:false}),[0,2.43,-5.93]);
  glass.renderOrder=1;
  root.traverse(o=>{if(o.isMesh&&!o.material?.transparent){o.receiveShadow=true;o.castShadow=true;}});
  // Caller owns the shared surface library; clones borrow its textures.
  const shared=new Set(Object.values(materials||{}));
  for(const m of Object.values(materials||{}))for(const v of Object.values(m))if(v?.isTexture)shared.add(v);
  let disposed=false;
  root.userData.dispose=()=>{
    if(disposed)return;disposed=true;
    const resources=new Set();root.traverse(o=>{if(o.isMesh||o.isLine){resources.add(o.geometry);[].concat(o.material).forEach(m=>{resources.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.add(value);});}});
    resources.forEach(r=>{if(!shared.has(r))r.dispose();});root.removeFromParent();
  };
  return root;
}
