import * as T from '../vendor/three.module.js';
import {plating} from './lab-walls.js?v=5';
import {buildDockedShip} from './lab-ship.js?v=3';
import {hangarDimensions as dimensions} from './lab-layout.js?v=6';
import {mountOrbitalSky} from './lab-orbital-sky.js?v=2';

export function mountHangar(scene,finish,marsMap,mobile,pixelRatio){
 const {wall,ceramic,seam,gasket,floor,light}=finish;
 const {throatEnd,throatWidth,side,end,roof}=dimensions;
 const group=new T.Group();
 scene.add(group);
 group.visible=false;

 const amber=new T.MeshBasicMaterial({color:0xffae58});
 const ice=new T.MeshBasicMaterial({color:0x8edcf9});
 const frame=new T.Object3D();
 function row(geometry,material,points){
  const mesh=new T.InstancedMesh(geometry,material,points.length);
  for(const [i,[x,y,z,yaw=0,roll=0]] of points.entries()){
   frame.position.set(x,y,z);
   frame.rotation.set(0,yaw,roll,'YXZ');
   frame.updateMatrix();
   mesh.setMatrixAt(i,frame.matrix);
  }
  group.add(mesh);
 }
 const solid=(w,h,d,material,...points)=>row(new T.BoxGeometry(w,h,d),material,points);
 const entrance=15.94,throatLength=throatEnd-entrance,entranceMid=(throatEnd+entrance)/2;
 const depth=end-throatEnd,mid=(end+throatEnd)/2;
 solid(throatLength,.4,throatWidth*2+.30,floor,[entranceMid,-4.7,0],[entranceMid,4.7,0]);
 solid(throatLength,9,.32,wall,[entranceMid,0,throatWidth],[entranceMid,0,-throatWidth]);
 solid(depth,.45,side*2+.3,floor,[mid,-4.725,0],[mid,roof+.225,0]);
 solid(depth,roof+4.5,.33,wall,[mid,(roof-4.5)/2,side],[mid,(roof-4.5)/2,-side]);

 const transitionWidth=side-throatWidth+.24;
 solid(.35,roof+4.5,transitionWidth,wall,[throatEnd,(roof-4.5)/2,(side+throatWidth)/2],
  [throatEnd,(roof-4.5)/2,-(side+throatWidth)/2]);
 solid(.35,roof-4.5,throatWidth*2+.15,wall,[throatEnd,(roof+4.5)/2,0]);
 row(plating(7.35,8.70,1.1,.52,[6.72,8.2,.65]),ceramic,
  [18.3,22.8,27.25].map(x=>[x,.02,0,Math.PI/2]));
 solid(throatLength,.15,.14,gasket,[entranceMid,2.8,3.43],[entranceMid,2.8,-3.43]);
 solid(throatLength-.3,.052,.05,amber,[entranceMid,2.8,3.33],[entranceMid,2.8,-3.33]);
 solid(throatLength,.02,.048,ice,[entranceMid,-4.485,1.65],[entranceMid,-4.485,-1.65]);

 const contour=[[31.6,3.30,0,Math.PI/2],[43,3.30,0,Math.PI/2],[54,3.30,0,Math.PI/2],[65,3.30,0,Math.PI/2]];
 row(plating(27.05,15.51,3.30,.34,[25.22,14.25,2.95]),ceramic,contour);
 const bays=[33,39,45,51,57,63,67.7];
 const sidePoints=(y,z)=>bays.flatMap(x=>[[x,y,z],[x,y,-z,Math.PI]]);
 row(plating(5.36,11.45,.82,.26),gasket,sidePoints(2.94,13.43));
 row(plating(5.11,9.69,.70,.25),wall,sidePoints(3.52,13.19));
 row(plating(5.02,1.29,.18,.23),ceramic,sidePoints(-2.36,13.17));
 row(plating(1.48,2.06,.22,.21),gasket,sidePoints(-.41,13.00));
 solid(.083,1.58,.046,ice,...sidePoints(-.41,12.91));
 solid(depth-.25,.25,.18,gasket,[mid,8.19,12.85],[mid,8.19,-12.85]);
 solid(depth-.29,.066,.048,amber,[mid,8.19,12.732],[mid,8.19,-12.732]);

 solid(depth-.9,.021,.075,amber,[mid,-4.481,8.22],[mid,-4.481,-8.22]);
 solid(depth-.9,.020,.055,ice,[mid,-4.482,10.44],[mid,-4.482,-10.44]);
 solid(.76,.019,.27,seam,...Array.from({length:16},(_,i)=>[[32+i*2.37,-4.482,9.12],[32+i*2.37,-4.482,-9.12]]).flat());
 const landingRing=new T.Mesh(new T.RingGeometry(8.1,8.18,96),new T.MeshBasicMaterial({color:0xf0b365}));
 landingRing.rotation.x=-Math.PI/2;
 landingRing.position.set(49.5,-4.477,1.2);
 group.add(landingRing);

 row(plating(27.58,15.5,3.06,.38,[24.72,12.5,2.42]),ceramic,[[end,3.28,0,Math.PI/2]]);
 row(plating(24.87,12.69,2.46,.26,[23.82,11.74,2.22]),gasket,[[end+.46,3.28,0,Math.PI/2]]);
 solid(.28,.064,18.3,ice,[end+.15,-2.72,0],[end+.15,9.16,0]);
 const updateSky=mountOrbitalSky(group,end,marsMap,mobile,pixelRatio);
 const ship=buildDockedShip(group,finish);
 return {group,updateSky,ship};
}
