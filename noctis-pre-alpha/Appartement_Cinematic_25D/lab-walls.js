import * as T from '../vendor/three.module.js';
import {portal} from './lab-layout.js';

function chamfered(width,height,cut){
 const x=width/2,y=height/2;
 return [[-x+cut,-y],[x-cut,-y],[x,-y+cut],[x,y-cut],[x-cut,y],[-x+cut,y],[-x,y-cut],[-x,-y+cut]];
}

function trace(path,points){
 points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));
 path.closePath();
 return path;
}

export function plating(width,height,cut,depth,inner){
 const shape=trace(new T.Shape(),chamfered(width,height,cut));
 if(inner)shape.holes.push(trace(new T.Path(),chamfered(...inner).reverse()));
 return new T.ExtrudeGeometry(shape,{
  depth,bevelEnabled:true,bevelSize:.045,bevelThickness:.035,bevelSegments:2,steps:1
 });
}

export function mountWallCladding(scene,finish){
 const {wall,ceramic,seam,gasket,light}=finish;
 const vertex=new T.Vector3(),frame=new T.Object3D(),vertical=new T.Vector3(0,1,0);
 const bays=[-12.11,-6.82,6.82,12.11];
 function row(geometry,material,points,sides=[0,1,2,3]){
  const mesh=new T.InstancedMesh(geometry,material,points.length*sides.length);
  let index=0;
  for(const face of sides){
   const angle=face*Math.PI/2;
   for(const [x,y,z,roll=0] of points){
    frame.position.copy(vertex.set(x,y,z).applyAxisAngle(vertical,angle));
    frame.rotation.set(0,angle,roll,'YXZ');
    frame.updateMatrix();
    mesh.setMatrixAt(index++,frame.matrix);
   }
  }
  scene.add(mesh);
 }
 // Wide, beveled ribs tie the lower machinery band into the ceiling coves.
 row(plating(31.1,1.24,.48,.36),wall,[[0,6.54,15.06]]);
 row(plating(31.1,1.05,.38,.30),ceramic,[[0,-3.90,15.12]],[0,2,3]);
 row(plating(11.9,1.05,.38,.30),ceramic,[[-9.57,-3.90,15.12],[9.57,-3.90,15.12]],[1]);
 row(new T.BoxGeometry(30.1,.11,.16),gasket,[[0,5.94,15.10]]);
 row(new T.BoxGeometry(30.1,.11,.16),gasket,[[0,-3.41,15.05]],[0,2,3]);
 row(new T.BoxGeometry(11.9,.11,.16),gasket,[[-9.57,-3.41,15.05],[9.57,-3.41,15.05]],[1]);
 row(new T.BoxGeometry(30.1,.034,.045),light,[[0,6.00,15.015]]);
 row(new T.BoxGeometry(30.1,.034,.045),light,[[0,-3.35,14.965]],[0,2,3]);
 row(new T.BoxGeometry(11.9,.034,.045),light,[[-9.57,-3.35,14.965],[9.57,-3.35,14.965]],[1]);

 row(plating(4.78,8.44,.70,.20),gasket,bays.map(x=>[x,1.28,15.53]));
 row(plating(4.62,5.15,.66,.16),wall,bays.map(x=>[x,2.74,15.31]));
 row(plating(4.62,2.73,.43,.16),ceramic,bays.map(x=>[x,-1.4,15.31]));
 row(plating(2.28,.89,.14,.10),gasket,bays.map(x=>[x,-1.35,15.20]));
 row(new T.BoxGeometry(1.92,.046,.05),seam,
  bays.flatMap(x=>[-1.61,-1.48,-1.35,-1.22,-1.09].map(y=>[x,y,15.15])));
 row(plating(.50,4.06,.22,.17),ceramic,[-14.79,-9.47,-4.18,4.18,9.47,14.79].map(x=>[x,1.65,15.08]));
 row(new T.BoxGeometry(.23,3.23,.10),gasket,[-9.47,-4.18,4.18,9.47].map(x=>[x,1.64,14.99]));
 row(new T.BoxGeometry(.064,.88,.032),light,
  [-9.47,-4.18,4.18,9.47].flatMap(x=>[.62,1.64,2.66].map(y=>[x,y,14.927])));

 // Pressure doors use a real cutout with a stepped frame and split metal leaves.
 row(plating(7.48,8.56,1.10,.22,[6.10,7.42,.87]),ceramic,[[0,.88,15.07]],[0,2,3]);
 row(plating(7.48,8.56,1.10,.22,[6.10,7.42,.87]),ceramic,[[0,portal.centerY,15.07]],[1]);
 row(plating(6.12,7.44,.88,.20,[5.86,7.18,.77]),gasket,[[0,.88,15.23]],[0,2,3]);
 row(plating(6.12,7.44,.88,.20,[5.86,7.18,.77]),gasket,[[0,portal.centerY,15.23]],[1]);
 row(plating(5.88,7.21,.77,.16),gasket,[[0,.88,15.55]],[0,2,3]);
 row(plating(2.76,6.97,.53,.18),wall,[[-1.37,.88,15.37],[1.37,.88,15.37]],[0,2,3]);
 row(plating(2.27,.50,.16,.095),gasket,[[-1.39,.89,15.265],[1.39,.89,15.265]],[0,2,3]);
 row(new T.BoxGeometry(.50,.055,.025),light,[[-1.40,.89,15.195],[1.40,.89,15.195]],[0,2,3]);
 row(plating(2.71,.63,.22,.17),gasket,[[0,5.54,15.21]],[0,2,3]);
 row(new T.BoxGeometry(1.75,.082,.042),light,[[0,5.54,15.105]],[0,2,3]);
}
