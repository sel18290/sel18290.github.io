import * as T from 'three';
import {Architecture} from './assembly.js';
import {loft,path3,extrude,thicken} from './geometry.js';
import {routeBuilder} from './routes.js';
import {createGardenWorld} from '../../genesis/src/garden-world.js';
import {gardenContains} from '../../genesis/src/garden-plan.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createExpandedN06(materials,{mobile=false}={}){
 const world=new Architecture(),owned=[],textures=[],cabinGeometries=[];
 const garden=createGardenWorld(materials,false,{optimize:true,labelScale:mobile?.5:1});world.root.add(garden.root);world.garden=garden;
 function add(id,geometry,material=materials.steel,collision=true){return world.add(id,{geometry,material,collision:collision?geometry:false});}
 function box(id,size,position,material,collision=true){const g=new RoundedBoxGeometry(...size,1,Math.min(.035,...size.map(v=>v/3)));g.translate(...position);return add(id,g,material,collision);}
 for(const [i,o]of garden.obstacles.entries()){const g=new T.CylinderGeometry(o[2],o[2],1.1,16);g.translate(o[0],.55,o[1]);const part=add('garden-obstacle-'+i,g);part.mesh.visible=false;}
 const route=routeBuilder(world,materials,{mobile});owned.push(...world.routeMaterials);
 route('south-concourse',path3([[0,0,16],[0,0,25],[0,0,32.4]]),2.4,{roof:true,open:true,roofEnd:.34});
 route('west-residential',path3([[0,0,28],[-12,0,30],[-25,0,34],[-34,0,34]]),2,{roof:true,open:true,roofStart:.25});
 route('east-research',path3([[0,0,28],[12,0,30],[25,0,34],[34,0,34]]),2,{roof:true,open:true,roofStart:.25,accent:materials.lamp});
 route('ascending-orbit',path3([[7,0,30],[18,1,39],[14,3,49],[0,5,50],[-12,6,43],[-12,6,36]]),2,{roof:true,accent:materials.lamp,guardStart:.08,guardEnd:.90});
 route('upper-west',path3([[-12,6,34],[-9,6,34],[-6.8,6,34]]),2,{roof:true,openSides:[-1]});
 route('upper-east',path3([[8.1,6,36],[10,6,36],[12,6,36]]),2,{roof:true});
 const junctionMat=materials.paint.clone();junctionMat.side=T.DoubleSide;owned.push(junctionMat);
 const roofShape=new T.Shape();roofShape.absarc(0,-28,9.5,0,Math.PI*2,false);const hole=new T.Path();hole.moveTo(-2,-32);hole.lineTo(2,-32);hole.lineTo(2,-36);hole.lineTo(-2,-36);hole.closePath();roofShape.holes.push(hole);
 const base=new T.ShapeGeometry(roofShape,48),bp=base.attributes.position,bi=base.index.array,positionsRoof=[],normalRoof=[],uvRoof=[],indicesRoof=[],lookup=new Map();
 const point=(x,z)=>{const key=Math.round(x*1e5)+','+Math.round(z*1e5);if(lookup.has(key))return lookup.get(key);const n=positionsRoof.length/3,r=Math.sqrt(Math.max(.01,100-x*x-(z-28)**2)),normal=new T.Vector3(.55*x/r,1,.55*(z-28)/r).normalize();positionsRoof.push(x,.3+.55*r,z);normalRoof.push(...normal);uvRoof.push(x/2,z/2);lookup.set(key,n);return n;};
 for(let f=0;f<bi.length;f+=3){const A=new T.Vector2(bp.getX(bi[f]),-bp.getY(bi[f])),B=new T.Vector2(bp.getX(bi[f+1]),-bp.getY(bi[f+1])),C=new T.Vector2(bp.getX(bi[f+2]),-bp.getY(bi[f+2]));const n=8,sample=(i,j)=>point(A.x+(B.x-A.x)*i/n+(C.x-A.x)*j/n,A.y+(B.y-A.y)*i/n+(C.y-A.y)*j/n);for(let j=0;j<n;j++)for(let i=0;i<n-j;i++){indicesRoof.push(sample(i,j),sample(i+1,j),sample(i,j+1));if(i+j<n-1)indicesRoof.push(sample(i+1,j),sample(i+1,j+1),sample(i,j+1));}}
 const patch=new T.BufferGeometry();patch.setAttribute('position',new T.Float32BufferAttribute(positionsRoof,3));patch.setAttribute('normal',new T.Float32BufferAttribute(normalRoof,3));patch.setAttribute('uv',new T.Float32BufferAttribute(uvRoof,2));const valid=[];const pa=patch.attributes.position,A=new T.Vector3(),B=new T.Vector3(),C=new T.Vector3();for(let i=0;i<indicesRoof.length;i+=3){const [a,b,c]=indicesRoof.slice(i,i+3);A.fromBufferAttribute(pa,a);B.fromBufferAttribute(pa,b);C.fromBufferAttribute(pa,c);if(B.sub(A).cross(C.sub(A)).lengthSq()>1e-15)valid.push(a,b,c);}patch.setIndex(valid);const junction=thicken(patch,.12);patch.dispose();base.dispose();add('atrium-junction-roof',junction,junctionMat,false);

 function room(id,x,y,z,r){
  const outline=Array.from({length:64},(_,i)=>{const a=-i*Math.PI*2/64;return [x+r*Math.cos(a),y-.2,z+r*Math.sin(a)];});let deck;
  if(y>0){deck=extrude(outline.map(([x,,z])=>[x,-z]),{holes:[[[-1.75,-32.25],[-1.75,-35.75],[1.75,-35.75],[1.75,-32.25]]],depth:.2,bevel:0});deck.rotateX(-Math.PI/2);deck.translate(0,y-.2,0);}else deck=loft([outline,outline.map(([x,,z])=>[x,y,z])]);
  add(id+'-deck',deck,materials.deck);
  const skin=materials.paint.clone();skin.side=T.DoubleSide;owned.push(skin);const shell=new T.SphereGeometry(r,40,18,0,Math.PI*2,0,Math.PI*.43);shell.scale(1,.6,1);shell.translate(x,y+1,z);const uv=shell.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Math.PI*r,uv.getY(i)*Math.PI*r*.3);add(id+'-roof',shell,skin,false);
  for(const dz of [-r*.5,0,r*.5]){const points=[];for(let i=0;i<=48;i++){const a=Math.PI*i/48;points.push(new T.Vector3(x+r*Math.cos(a),y+.2+4.5*Math.sin(a),z+dz));}add(id+'-rib-'+dz,new T.TubeGeometry(new T.CatmullRomCurve3(points),48,.10,8,false),materials.steel,false);}
  const guide=new T.TorusGeometry(r-.3,.035,6,80);guide.rotateX(Math.PI/2);guide.translate(x,y+.03,z);add(id+'-guide',guide,materials.cyan,false);
  for(let i=0;i<24;i++){const a=i*Math.PI/12,door=y>0?(Math.sin(a)<-.15&&Math.abs(Math.cos(a))>.5):Math.cos(a)*(x<0?1:-1)>.86;if(door)continue;
   const contour=[];for(let j=0;j<=3;j++){const p=a-.125+j*.25/3;contour.push([x+(r+.10)*Math.cos(p),y,z+(r+.10)*Math.sin(p)]);}for(let j=3;j>=0;j--){const p=a-.125+j*.25/3;contour.push([x+(r-.10)*Math.cos(p),y,z+(r-.10)*Math.sin(p)]);}
   add(id+'-wall-'+i,loft([contour,contour.map(([x,,z])=>[x,y+2.25,z])]),i%3?materials.paint:materials.graphite);
  }
  for(let i=0;i<6;i++){if(y===0&&((x<0&&i===0)||(x>0&&i===3)))continue;const a=i*Math.PI/3,matrix=new T.Matrix4().makeRotationY(-a+Math.PI/2);matrix.setPosition(x+Math.cos(a)*r*.66,y,z+Math.sin(a)*r*.66);
   for(const [name,size,pos,mat]of [['base',[1.8,.16,.8],[0,.12,0],materials.graphite],['body',[1.5,.75,.55],[0,.55,0],materials.paint],['worktop',[1.9,.10,.85],[0,.98,0],materials.steel],['screen',[1.3,.55,.07],[0,1.45,-.25],materials.graphite],['signal',[1.08,.035,.015],[0,1.5,-.205],materials.cyan]]){const g=new RoundedBoxGeometry(...size,1,Math.min(.025,...size.map(v=>v/3)));g.translate(...pos);world.add(id+'-'+name+'-'+i,{geometry:g,material:mat,matrix,collision:name==='body'?g:false});}
  }
  world.target(id,{position:[x,y+1.4,z],label:id,range:3});
 }
 room('Habitat des équipes',-38,0,34,7);room('Laboratoire des cycles',38,0,34,7);room('Observatoire supérieur',0,6,40,9);
 const landing=new T.BoxGeometry(2.8,.16,2.6);landing.translate(0,6.08,36.9);add('upper-lift-landing',landing,materials.steel);world.landings=[{id:'upper-lift-landing',x:0,z:36.9,y:6.16,halfX:1.4,halfZ:1.3}];
 for(const sx of [-1,1])for(const sz of [-1,1]){const x=-38+sx*2.7,z=34+sz*2;box('bed-'+sx+'-'+sz,[1.65,.35,2.4],[x,.175,z],materials.graphite);box('mattress-'+sx+'-'+sz,[1.48,.24,2.2],[x,.47,z],materials.fabric,false);box('pillow-'+sx+'-'+sz,[1.04,.14,.5],[x,.66,z-.7],materials.fabric,false);const points=[];for(let i=0;i<=24;i++){const a=Math.PI*i/24;points.push(new T.Vector3(x+.95*Math.cos(a),.35+1.7*Math.sin(a),z-1));}add('pod-arch-'+sx+'-'+sz,new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.075,7,false),materials.wood,false);}
 for(let i=0;i<3;i++){const g=new T.TorusGeometry(.8+i*.18,.045,8,64);g.rotateX(.4+i*.6);g.rotateY(i*.7);g.translate(38,2.3,34);add('research-armillary-'+i,g,materials.copper,false);}
 for(const [text,x,y,z,yaw]of [['HABITAT / REPOS',-38,2.8,34,Math.PI/2],['LABORATOIRE / CYCLES',38,2.8,34,-Math.PI/2],['OBSERVATOIRE / NIVEAU 1',0,8.8,40,Math.PI],['HABITAT / ASCENSEUR / LABORATOIRE',0,4,30,Math.PI]]){
  if(typeof document==='undefined')continue;const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;const ctx=canvas.getContext('2d');if(!ctx)continue;ctx.fillStyle='#162c36';ctx.fillRect(0,0,1024,192);ctx.fillStyle='#dbe8de';ctx.font='42px sans-serif';ctx.fillText(text,38,100,950);ctx.fillStyle='#e4be84';ctx.fillRect(0,0,10,192);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);const mat=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});owned.push(mat);const g=new T.PlaneGeometry(text.includes('ASCENSEUR')?3.6:4.8,.7);g.rotateY(yaw);g.translate(x,y,z);add(text,g,mat,false);
 }
 // Merge lower-floor collision coverage without overlapping coplanar meshes.
 const flat=world.routes.filter(r=>!r.id.startsWith('upper-')&&!r.id.startsWith('ascending-')).map(r=>({width:r.width,points:r.path.getSpacedPoints(100)}));
 const onFloor=(x,z)=>{if(Math.abs(x)<1.72&&z>32.4+1e-5&&z<35.8)return false;if(gardenContains(x,z)||Math.hypot(x+38,z-34)<=7||Math.hypot(x-38,z-34)<=7)return true;return flat.some(r=>r.points.some((p,i)=>{if(!i)return false;const a=r.points[i-1],dx=p.x-a.x,dz=p.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<=r.width-.02;}));};
 for(const part of world.parts)if(['south-concourse-deck','west-residential-deck','east-research-deck','Habitat des équipes-deck','Laboratoire des cycles-deck'].includes(part.id)){part.collision=false;part.mesh.position.y-=.012;}
 const positions=[],uv=[],indices=[],inside=[],pitch=.4,nx=230,nz=200;
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=-46+i*pitch,z=-36+j*pitch;positions.push(x,0,z);uv.push(x/2,z/2);inside.push(onFloor(x,z));}
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;if([a,b,c,d].every(k=>inside[k]))indices.push(a,c,b,b,c,d);}
 const floor=new T.BufferGeometry();floor.setAttribute('position',new T.Float32BufferAttribute(positions,3));floor.setAttribute('uv',new T.Float32BufferAttribute(uv,2));floor.setIndex(indices);floor.computeVertexNormals();const ground=add('continuous-ground-collision',floor,materials.deck);ground.mesh.visible=false;
 const visible=[];for(let i=0;i<indices.length;i+=3){const ids=indices.slice(i,i+3),x=ids.reduce((v,k)=>v+positions[k*3],0)/3,z=ids.reduce((v,k)=>v+positions[k*3+2],0)/3;if(!gardenContains(x,z))visible.push(...ids);}const skin=floor.clone();skin.setIndex(visible);skin.translate(0,.002,0);add('continuous-new-deck',skin,materials.deck,false);
 const liftGeometry=new T.BoxGeometry(3.2,.22,3.2);liftGeometry.translate(0,-.03,34);const lift=add('ascenseur',liftGeometry,materials.steel);lift.mesh.castShadow=false;lift.motion={deckHeight:.08,y:0,goal:0,min:0,max:6,speed:1,x:0,z:34,half:1.6};world.lifts=[lift];
 function cabin(name,size,pos,mat){const g=new RoundedBoxGeometry(...size,1,Math.min(.035,...size.map(v=>v/3)));g.translate(...pos);cabinGeometries.push(g);const mesh=new T.Mesh(g,mat);mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=true;lift.mesh.add(mesh);}
 for(const side of [-1,1]){cabin('Cabin side',[.10,1.05,3],[side*1.53,.62,34],materials.graphite);cabin('Cabin handrail',[.14,.055,3],[side*1.53,1.18,34],materials.cyan);for(const z of [32.6,35.4])cabin('Cabin upright',[.10,2.4,.12],[side*1.53,1.25,z],materials.steel);}
 cabin('Cabin canopy',[3.2,.12,3.2],[0,2.5,34],materials.paint);cabin('Cabin lamp',[1.7,.035,.2],[0,2.42,34],materials.lamp);cabin('Cabin control',[.12,.5,.6],[1.37,1.4,34],materials.graphite);cabin('Cabin control signal',[.025,.035,.4],[1.29,1.4,34],materials.cyan);
 lift.motion.rails=[{size:[.05,.525,1.5],center:[-1.53,.62,34]},{size:[.05,.525,1.5],center:[1.53,.62,34]},{size:[1.6,.06,1.6],center:[0,2.5,34]}];
 const cabinTarget=world.target('lift-cabin',{position:[1.25,1.4,34],label:'Cabine · monter / descendre',range:2});cabinTarget.lift=lift;cabinTarget.baseY=1.4;
 const destinations={'Habitat des équipes':'n01','Laboratoire des cycles':'n02','Observatoire supérieur':'n03'};
 for(const t of world.targets)if(destinations[t.id]){t.label+=' · accès '+destinations[t.id].toUpperCase();const g=new T.CylinderGeometry(.30,.4,1.05,24);g.translate(t.position.x,.525+(t.position.y-1.4),t.position.z);add('access-console-'+destinations[t.id],g,materials.graphite);const ring=new T.TorusGeometry(.35,.035,8,40);ring.translate(...t.position);add('access-ring-'+destinations[t.id],ring,materials.cyan,false);}
 world.target('lift-control',{position:[0,1.25,33],label:'Ascenseur · monter / descendre',range:3});world.target('lift-upper',{position:[0,7.25,35],label:'Ascenseur · appeler / descendre',range:3});world.activate=id=>{if(id.startsWith('lift-'))lift.motion.goal=lift.motion.goal===0?6:0;else if(destinations[id])world.travel?.(destinations[id]);};
 for(const x of [-1.85,1.85]){const g=new T.CylinderGeometry(.10,.10,9,16);g.translate(x,4.3,34);add('lift-guide-'+x,g,materials.steel);}
 const oldDispose=world.dispose.bind(world);world.dispose=()=>{if(world.disposed)return;garden.dispose();oldDispose();owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());cabinGeometries.forEach(g=>g.dispose());};return world;
}
