import * as T from '../vendor/three.module.js';
import {portal} from './lab-layout.js';
import {plating} from './lab-walls.js?v=5';

export function mountPerimeter(scene,finish){
 const {wall,ceramic,gasket,seam,floor,light}=finish;
 const outside=23.55,inside=16,mid=(outside+inside)/2;
 const group=new T.Group(),frame=new T.Object3D();
 scene.add(group);
 function batch(geometry,material,transforms){
  const mesh=new T.InstancedMesh(geometry,material,transforms.length);
  for(const [i,[x,y,z,yaw=0,roll=0]] of transforms.entries()){
   frame.position.set(x,y,z);frame.rotation.set(0,yaw,roll,'YXZ');
   frame.updateMatrix();mesh.setMatrixAt(i,frame.matrix);
  }
  group.add(mesh);
 }
 const atSides=points=>points.flatMap(([x,y,z,roll=0])=>[[x,y,z,0,roll],[z,y,-x,Math.PI/2,roll],[-x,y,-z,Math.PI,roll],[-z,y,x,Math.PI*1.5,roll]]);
 const slabWidth=outside-inside;
 const slabCenters=[-mid,mid];
 for(const [height,material] of [[-4.70,floor],[portal.ceiling+.20,floor]]){
  batch(new T.BoxGeometry(outside*2,.4,slabWidth),material,slabCenters.map(z=>[0,height,z]));
  batch(new T.BoxGeometry(slabWidth,.4,inside*2),material,slabCenters.map(x=>[x,height,0]));
 }
 batch(new T.BoxGeometry(47.1,9,.46),wall,atSides([[0,0,outside]]));
 const centers=[-20,-14.3,-8.6,-2.9,2.9,8.6,14.3,20];
 batch(plating(5.47,7.62,.47,.18),gasket,atSides(centers.map(x=>[x,-.05,23.29])));
 batch(plating(5.23,5.62,.42,.15),wall,atSides(centers.map(x=>[x,.88,23.11])));
 batch(plating(5.23,1.57,.34,.20),ceramic,atSides(centers.map(x=>[x,-2.85,23.08])));
 batch(plating(1.95,.46,.18,.10),gasket,atSides(centers.map(x=>[x,-2.81,22.98])));
 batch(new T.BoxGeometry(1.52,.036,.041),seam,atSides(centers.flatMap(x=>[-2.92,-2.81,-2.70].map(y=>[x,y,22.943]))));
 batch(new T.BoxGeometry(45.2,.18,.20),gasket,atSides([[0,3.93,22.88],[0,-3.87,22.91]]));
 batch(new T.BoxGeometry(45.2,.047,.064),light,atSides([[0,3.91,22.748],[0,-3.85,22.776]]));
 // Repeating cross-members and diagonal shoulders tie the ring into one structure.
 const ticks=[-17.25,-11.55,-5.75,0,5.75,11.55,17.25];
 batch(new T.BoxGeometry(.31,.28,6.47),ceramic,atSides(ticks.map(x=>[x,4.21,mid])));
 batch(new T.BoxGeometry(.089,.047,5.65),light,atSides(ticks.map(x=>[x,4.051,mid])));
 batch(new T.BoxGeometry(.30,2.12,.26),ceramic,atSides(ticks.map(x=>[x,3.20,22.37,-.51])));
 const lowerWayGuide=new T.MeshBasicMaterial({color:0x99d4e4});
 batch(new T.BoxGeometry(40.8,.012,.044),lowerWayGuide,atSides([[0,-4.489,21.52]]));
 // Frames on the inner side deliberately leave the real laboratory opening clear.
 const inner=atSides(centers.filter(x=>Math.abs(x)>4&&Math.abs(x)<17).map(x=>[x,.12,16.25]));
 batch(plating(5.42,6.80,.66,.20),ceramic,inner.map(([x,y,z,yaw])=>[x+Math.sin(yaw)*.18,y,z+Math.cos(yaw)*.18,yaw]));
 // Corner grilles and diagonal treatments mark the change of direction.
 batch(new T.BoxGeometry(4.2,.12,4.2),ceramic,atSides([[mid,4.26,mid]]));
 batch(new T.BoxGeometry(3.65,.06,.07),light,atSides([[mid,4.177,mid]]));
 return group;
}
