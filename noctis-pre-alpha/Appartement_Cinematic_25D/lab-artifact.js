import * as T from '../vendor/three.module.js';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';

export function createArtifact(scene,panels){
 const root=new T.Group();
 const caseMaterial=new T.MeshStandardMaterial({
  color:0x3e5160,metalness:.46,roughness:.30,emissive:0x194c5d,emissiveIntensity:.24
 });
 const housing=new T.Mesh(new RoundedBoxGeometry(4.2,4.2,4.2,3,.12),caseMaterial);
 root.add(housing);
 const capMaterial=new T.MeshPhysicalMaterial({
  color:0xffffff,roughness:.33,clearcoat:.36,clearcoatRoughness:.25
 });
 const cap=new T.Mesh(new RoundedBoxGeometry(3.91,.056,3.91,2,.028),capMaterial);
 cap.position.y=2.105;
 root.add(cap);

 const surface=new T.PlaneGeometry(3.94,3.94);
 const panelMounts=[
  [[2.103,0,0],[0,Math.PI/2,0]],
  [[-2.103,0,0],[0,-Math.PI/2,0]],
  [[0,2.103,0],[-Math.PI/2,0,0]],
  [[0,-2.103,0],[Math.PI/2,0,0]],
  [[0,0,2.103],[0,0,0]],
  [[0,0,-2.103],[0,Math.PI,0]]
 ];
 for(const [index,[position,rotation]] of panelMounts.entries()){
  if(!panels[index])continue;
  const display=new T.Mesh(surface,panels[index]);
  display.position.set(...position);
  display.rotation.set(...rotation);
  display.renderOrder=4;
  root.add(display);
 }
 scene.add(root);

 const smooth=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);
 return {
  root,
  update(time){
   const phase=Math.max(0,time-5.05)*.19;
   const tilt=smooth(5.3,9,time);
   root.rotation.set(.72*Math.sin(phase)*tilt,phase,.40*Math.sin(phase*2)*tilt);
   root.visible=time>1.23;
   panels.forEach((material,i)=>{
    if(!material)return;
    material.uniforms.build.value=i===1?1:smooth(3.65+i*.31,5.45+i*.31,time);
   });
  }
 };
}
