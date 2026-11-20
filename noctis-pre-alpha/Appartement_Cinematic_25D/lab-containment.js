import * as T from '../vendor/three.module.js';

export function mountContainment(scene,finish){
 const {ceramic,seam,light}=finish;
 const ring=(radius,thickness,y,material)=>{
  const mesh=new T.Mesh(new T.TorusGeometry(radius,thickness,8,112),material);
  mesh.rotation.x=-Math.PI/2;mesh.position.y=y;scene.add(mesh);
 };
 // Stacked ceramic tracks float above the test volume.
 ring(5.85,.16,6.15,ceramic);
 ring(5.53,.036,6.03,light);
 ring(6.23,.09,6.29,seam);
 ring(6.45,.028,-4.46,light);
 ring(7.60,.018,-4.47,seam);

 const braces=new T.InstancedMesh(new T.BoxGeometry(.34,.26,1.48),ceramic,24);
 const markers=new T.InstancedMesh(new T.BoxGeometry(.045,.012,.32),light,48);
 const frame=new T.Object3D();
 for(let i=0;i<48;i++){
  const angle=i*Math.PI/24;
  frame.rotation.y=angle;
  frame.position.set(Math.sin(angle)*7.33,-4.475,Math.cos(angle)*7.33);
  frame.updateMatrix();markers.setMatrixAt(i,frame.matrix);
  if(i%2===0){
   frame.position.set(Math.sin(angle)*6.15,6.27,Math.cos(angle)*6.15);
   frame.updateMatrix();braces.setMatrixAt(i/2,frame.matrix);
  }
 }
 scene.add(braces,markers);

 // A translucent scanning plane sweeps the cube without adding a light pass.
 const scannerMaterial=new T.MeshBasicMaterial({
  color:0xffffff,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,
  blending:T.AdditiveBlending
 });
 const scanner=new T.Mesh(new T.RingGeometry(3.25,3.29,96),scannerMaterial);
 scanner.rotation.x=-Math.PI/2;scanner.renderOrder=7;scene.add(scanner);

 return time=>{
  const phase=((time-10.8)%12)/12;
  scanner.visible=time>=10.8;
  scanner.position.y=-3.4+phase*6.8;
  scannerMaterial.opacity=.65*Math.sin(Math.PI*Math.max(0,phase))**2;
 };
}
