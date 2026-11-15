import * as T from 'three';
import {Architecture} from './assembly.js';
import {sweep,loft,surface,thicken,path3,framesAlong} from './geometry.js';

export const spawnPoints=Object.freeze({entrance:[0,.025,10],lower:[0,.025,4],upper:[8,3.625,-2]});
export const ascent=()=>path3([[0,0,10],[7,.35,10],[13,1.8,7],[14,3.35,1],[10,3.6,-2]]);
const slab=w=>[[-w,-.20],[w,-.20],[w,0],[-w,0]];

export function createDemonstration(materials,{mobile=false}={}){
 const world=new Architecture(),owned=new Set();
 const skin=materials.paint.clone();skin.side=T.DoubleSide;owned.add(skin);
 const cyan=new T.MeshStandardMaterial({color:0xa8e2df,emissive:0x4ca3b7,emissiveIntensity:.8,roughness:.4});owned.add(cyan);
 const amber=cyan.clone();amber.color.set(0xf2cf9c);amber.emissive.set(0x9b5a21);owned.add(amber);
 const graphite=materials.graphite,steel=materials.steel;
 function route(id,path,width,{roof=false,accent=cyan}={}){
  const segments=mobile?56:88;
  world.add(id+'-deck',{geometry:sweep({path,section:slab(width),segments}),collision:sweep({path,section:slab(width),segments:44}),material:materials.deck,walkable:true});
  for(const sign of [-1,1]){
   const x=sign*(width-.08),rail=[[x-.045,.22],[x+.045,.22],[x+.045,1.04],[x-.045,1.04]];
   world.add(id+'-guard-'+sign,{geometry:sweep({path,section:rail,segments}),collision:sweep({path,section:rail,segments:44}),material:graphite});
   world.add(id+'-guide-'+sign,{geometry:sweep({path,section:[[x-.065,1.04],[x+.065,1.04],[x+.065,1.08],[x-.065,1.08]],segments}),material:accent,collision:false});
  }
  const frames=framesAlong(path,14);
  for(let j=0;j<frames.length;j++){
   const f=frames[j],matrix=new T.Matrix4().makeBasis(f.right,f.up,f.forward);matrix.setPosition(f.position);
   // Real bevelled collars sit across the deck, with curved ends and fasteners.
   const rib=new T.Shape();rib.moveTo(-width+.13,0);rib.lineTo(width-.13,0);rib.lineTo(width-.25,.055);rib.lineTo(-width+.25,.055);rib.closePath();
   const g=new T.ExtrudeGeometry(rib,{depth:.06,bevelEnabled:false});g.translate(0,.012,-.03);
   world.add(id+'-threshold-'+j,{geometry:g,material:steel,collision:false,matrix});
  }
  if(roof){
   const profile=[];for(let i=0;i<=24;i++){const a=Math.PI-i*Math.PI/24;profile.push([width*Math.cos(a),2.05+1.12*Math.sin(a)]);}
   for(let i=24;i>=0;i--){const a=Math.PI-i*Math.PI/24;profile.push([(width+.12)*Math.cos(a),2.05+1.24*Math.sin(a)]);}
   world.add(id+'-canopy',{geometry:sweep({path,section:profile,segments}),collision:sweep({path,section:profile,segments:32}),material:skin});
   for(let i=0;i<frames.length;i+=2){const f=frames[i],points=[];for(let k=0;k<=24;k++){const a=Math.PI*k/24;points.push(f.position.clone().addScaledVector(f.right,(width-.03)*Math.cos(a)).addScaledVector(f.up,2.05+1.09*Math.sin(a)));}
    world.add(id+'-arch-'+i,{geometry:new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.045,6,false),material:steel,collision:false});
   }
  }
 }
 // The lower floor and upper bridge genuinely cross at different heights.
 const outline=Array.from({length:72},(_,i)=>{const a=-i*Math.PI*2/72;return [20*Math.cos(a),-.22,15*Math.sin(a)];});
 world.add('arrival-plaza',{geometry:loft([outline,outline.map(([x,,z])=>[x,0,z])]),material:materials.deck,walkable:true});
 route('ascending-gallery',ascent(),1.65,{roof:true,accent:amber});
 route('upper-bridge',path3([[-11,3.6,-2],[0,3.6,-2],[10,3.6,-2]]),1.85,{roof:true});
 // Tall tapered supports and ring fittings reveal the vertical layering.
 for(const x of [-9,-3,3,9]){
  const points=Array.from({length:20},(_,i)=>{const a=i*Math.PI*2/20;return [x+.35*Math.cos(a),0,-2+.35*Math.sin(a)];});
  world.add('support-'+x,{geometry:loft([points,points.map(([px,,pz])=>[x+(px-x)*.65,3.35,-2+(pz+2)*.65])]),material:steel});
  for(const y of [.15,3.15]){const g=new T.TorusGeometry(.38,.045,6,32);g.rotateX(Math.PI/2);g.translate(x,y,-2);world.add('support-collar-'+x+'-'+y,{geometry:g,material:graphite,collision:false});}
 }
 // A free function controls this doubly curved suspended surface.
 const patch=surface((u,v)=>[(u-.5)*12,7.9+.85*Math.sin(u*Math.PI)*Math.cos(v*Math.PI),(v-.5)*8-3],{uSegments:32,vSegments:22,uvMetres:2});
 const shell=thicken(patch,.12);patch.dispose();world.add('free-surface',{geometry:shell,material:skin,collision:false});
 for(let i=0;i<5;i++){
  const u=i/4,points=Array.from({length:25},(_,j)=>{const v=j/24;return new T.Vector3((u-.5)*12,7.9+.85*Math.sin(u*Math.PI)*Math.cos(v*Math.PI)+.04,(v-.5)*8-3);});
  world.add('free-surface-rib-'+i,{geometry:new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.045,6,false),material:steel,collision:false});
 }
 // A genuine floor-to-floor connector derives from named, fully oriented ports.
 const end=slab(1.85);world.port('bridge-west',{position:[-11,3.6,-2],quaternion:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2).toArray(),contour:end});
 world.port('balcony-east',{position:[-14,3.6,-2],quaternion:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2).toArray(),contour:end});
 world.connect('west-connection','bridge-west','balcony-east',{material:materials.deck,walkable:true});
 world.target('lower-console',{position:[0,1.35,-5],label:'Passage inférieur · sol à 0 m'});
 world.target('upper-console',{position:[0,4.95,-2],label:'Galerie haute · sol à 3,60 m'});
 for(const [i,t]of world.targets.entries()){
  const g=new T.TorusGeometry(.26,.035,7,40);g.translate(...t.position);world.add('marker-'+i,{geometry:g,material:i?amber:cyan,collision:false});
 }
 const dispose=world.dispose.bind(world);world.dispose=()=>{if(world.disposed)return;dispose();owned.forEach(m=>m.dispose());};
 return world;
}
