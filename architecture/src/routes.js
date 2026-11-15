import * as T from 'three';
import {sweep,framesAlong} from './geometry.js';
const slab=w=>[[-w,-.20],[w,-.20],[w,0],[-w,0]];
export function routeBuilder(world,materials,{mobile=false}={}){
 const skin=materials.paint.clone(),graphite=materials.graphite,steel=materials.steel,cyan=materials.cyan;skin.side=T.DoubleSide;(world.routeMaterials??=[]).push(skin);
 function route(id,path,width,{roof=false,accent=cyan,open=false,openSides=[],guardStart=0,guardEnd=1,roofStart=0,roofEnd=1}={}){
  const segments=mobile?56:88;
  world.add(id+'-deck',{geometry:sweep({path,section:slab(width),segments}),collision:sweep({path,section:slab(width),segments:44}),material:materials.deck,walkable:true});
  for(const side of [-1,1]){const x=side*(width-.25);world.add(id+'-floor-guide-'+side,{geometry:sweep({path,section:[[x-.025,.008],[x+.025,.008],[x+.025,.025],[x-.025,.025]],segments}),material:accent,collision:false});}
  const guardPath=guardStart||guardEnd<1?new T.CatmullRomCurve3(Array.from({length:65},(_,i)=>path.getPointAt(guardStart+(guardEnd-guardStart)*i/64))):path;
  (world.routes??=[]).push({id,path,width});
  for(const sign of open?[]:[-1,1].filter(s=>!openSides.includes(s))){
   const x=sign*(width-.08),rail=[[x-.045,.22],[x+.045,.22],[x+.045,1.04],[x-.045,1.04]];
   world.add(id+'-guard-'+sign,{geometry:sweep({path:guardPath,section:rail,segments}),collision:sweep({path:guardPath,section:rail,segments:44}),material:graphite});
   world.add(id+'-guide-'+sign,{geometry:sweep({path:guardPath,section:[[x-.065,1.04],[x+.065,1.04],[x+.065,1.08],[x-.065,1.08]],segments}),material:accent,collision:false});
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
   const roofPath=roofStart||roofEnd<1?new T.CatmullRomCurve3(Array.from({length:49},(_,i)=>path.getPointAt(roofStart+(roofEnd-roofStart)*i/48))):path;
   const roofFrames=framesAlong(roofPath,8);
   const profile=[];for(let i=0;i<=24;i++){const a=Math.PI-i*Math.PI/24;profile.push([width*Math.cos(a),2.05+1.12*Math.sin(a)]);}
   for(let i=24;i>=0;i--){const a=Math.PI-i*Math.PI/24;profile.push([(width+.12)*Math.cos(a),2.05+1.24*Math.sin(a)]);}
   world.add(id+'-canopy',{geometry:sweep({path:roofPath,section:profile,segments}),collision:sweep({path:roofPath,section:profile,segments:32}),material:skin});
   for(let i=0;i<roofFrames.length;i+=2){const f=roofFrames[i],points=[];for(let k=0;k<=24;k++){const a=Math.PI*k/24;points.push(f.position.clone().addScaledVector(f.right,(width-.03)*Math.cos(a)).addScaledVector(f.up,2.05+1.09*Math.sin(a)));}
    world.add(id+'-arch-'+i,{geometry:new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.045,6,false),material:steel,collision:false});
   }
  }
 }
 return route;
}
