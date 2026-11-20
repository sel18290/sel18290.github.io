import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {sweptRoof} from './pressure-shells.js';
import {metricUV} from './garden-finishes.js';
import {indexExact} from './index-exact.js';
import {hubRoutes,hubWorldPoint,hubGatePosition} from './hub-plan.js';

export function createHubWorld(materials,{labelScale=1,reduced=false}={}){
 const root=new T.Group();root.name='N06 Hub / Southern galleries';
 const owned=new Set(),textures=new Set(),geometries=new Set(),obstacles=[],doors=new Map();
 function borrow(name,fallback){if(materials[name])return materials[name];const m=new T.MeshStandardMaterial({color:fallback,roughness:.55});owned.add(m);return m;}
 const deck=borrow('deck',0x718080),steel=borrow('steel',0x889ca2),paint=borrow('paint',0xd0cbb8),dark=borrow('graphite',0x22343c),seal=borrow('seal',0x191f22),copper=borrow('copper',0x98694a);
 const lining=paint.clone();lining.side=T.DoubleSide;owned.add(lining);
 function mesh(g,m,p,parent,{metric=true}={}){
  if(metric&&m.map)g=metricUV(g,m.userData.metresPerTile||2,p);
  const o=new T.Mesh(g,m);o.position.fromArray(p);o.castShadow=false;o.receiveShadow=true;parent.add(o);return o;
 }
 function box(size,p,m,parent,r=.035){return mesh(new RoundedBoxGeometry(...size,1,Math.min(r,...size.map(v=>v/3))),m,p,parent);}
 function tube(points,r,m,parent){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(24,points.length*3),r,8,false),m,[0,0,0],parent);}
 function label(text,subtitle,width,p,parent,color,yaw=Math.PI){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=Math.round(1024*labelScale);canvas.height=Math.round(256*labelScale);const ctx=canvas.getContext?.('2d');if(!ctx)return;
  ctx.scale(labelScale,labelScale);ctx.fillStyle='#14282f';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.fillRect(0,0,14,256);
  ctx.fillStyle='#e2e7df';ctx.font='500 63px sans-serif';ctx.fillText(text,40,100,940);ctx.fillStyle='#a9c2c2';ctx.font='30px sans-serif';ctx.fillText(subtitle,40,176,940);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.add(texture);const m=new T.MeshBasicMaterial({map:texture,toneMapped:false});owned.add(m);
  const o=mesh(new T.PlaneGeometry(width,width/4),m,p,parent,{metric:false});o.rotation.y=yaw;
 }
 for(const route of hubRoutes){
  const group=new T.Group();group.name='N06 Hub / Corridor '+route.id;group.rotation.y=route.angle;root.add(group);
  const length=route.end-route.start,center=(route.start+route.end)/2;
  const accent=new T.MeshBasicMaterial({color:route.color});owned.add(accent);
  // Continuous pressure roof, identical swept-section construction to N05.
  const roof=sweptRoof(length+.35,route.halfWidth,2.18,1.22);
  const uv=roof.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*3.5,uv.getY(i)*length/2);
  mesh(roof,lining,[0,.12,center],group,{metric:false});
  box([route.halfWidth*2,.16,length],[0,-.10,center],seal,group);
  box([route.halfWidth*2,.14,length-1],[0,.025,center+.5],seal,group,.012);
  function wallCollider(x,z,halfX,halfZ){const p=hubWorldPoint(route,x,0,z);obstacles.push({x:p[0],z:p[2],halfX,halfZ,yaw:route.angle,cosYaw:Math.cos(route.angle),sinYaw:Math.sin(route.angle)});}
  for(const side of [-1,1])wallCollider(side*1.88,center,.06,length/2);
  wallCollider(0,route.end,route.halfWidth,.14);
  // Threshold ramps bridge the original rim without cutting or moving it.
  const w=route.halfWidth,positions=[-w,.004,route.start,w,.004,route.start,-w,.12,route.start+1,w,.12,route.start+1];
  const ramp=new T.BufferGeometry();ramp.setAttribute('position',new T.Float32BufferAttribute(positions,3));ramp.setIndex([0,2,1,1,2,3]);ramp.computeVertexNormals();ramp.setAttribute('uv',new T.Float32BufferAttribute([-w/2,0,w/2,0,-w/2,.6,w/2,.6],2));mesh(ramp,deck,[0,0,0],group,{metric:false});
  for(let z=route.start+1;z<route.end;z+=1.8){const d=Math.min(1.8,route.end-z);box([3.66,.075,d-.012],[0,.0825,z+d/2],deck,group,.012);}
  for(const side of [-1,1]){
   box([.12,2.20,length],[side*1.88,1.22,center],dark,group);
   box([.10,.24,length],[side*1.80,.26,center],steel,group);
   box([.035,.038,length-.4],[side*1.725,.40,center],accent,group,.009);
   box([.12,.10,length],[side*1.76,2.15,center],steel,group);
   for(let j=0;j<7;j++){
    const z=route.start+1.05+j*2;
    box([.07,1.30,1.82],[side*1.79,1.28,z],paint,group,.04);
    for(let k=0;k<5;k++)box([.08,.035,1.05],[side*1.73,.76+k*.105,z],seal,group,.006);
    box([.13,.31,.28],[side*1.75,1.85,z+.60],steel,group,.025);
   }
   tube([[side*1.65,2.36,route.start+.6],[side*1.70,2.45,route.start+2],[side*1.70,2.45,route.end-.6]],.035,side<0?copper:steel,group);
  }
  // Repeated elliptic ribs and service collars remain sculpted geometry.
  const points=[];for(let i=0;i<=24;i++){const a=Math.PI*i/24;points.push([1.76*Math.cos(a),2.30+1.12*Math.sin(a),0]);}
  const ribGeometry=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),48,.062,8,false);
  const ribs=new T.InstancedMesh(ribGeometry,steel,8),matrix=new T.Matrix4();ribs.name='N06 Hub / Elliptic ribs '+route.id;
  for(let i=0;i<8;i++)ribs.setMatrixAt(i,matrix.makeTranslation(0,0,route.start+.7+i*(length-1.4)/7));ribs.computeBoundingSphere();ribs.receiveShadow=true;group.add(ribs);
  for(const z of [route.start+.8,center,route.end-.8]){
   box([.68,.055,.18],[0,3.33,z],accent,group,.012);
   for(const side of [-1,1]){box([.18,2.11,.20],[side*1.78,1.175,z],steel,group,.03);box([.29,.18,.32],[side*1.78,.21,z],dark,group,.025);}
  }
  label('N'+route.number+' · '+route.label.toUpperCase(),'NOCTIS / GALERIE '+route.number,3.1,[0,2.75,route.start+.7],group,route.color);
  label('HUB N06','LES JARDINS DE L’AUBE / RETOUR',3.1,[0,2.75,route.start+.72],group,route.color,0);
  label('N'+route.number,'ACCÈS / E POUR ENTRER',1.7,[0,2.73,route.end-.30],group,route.color);
  // Sealed bulkhead and two sliding pressure-door leaves.
  box([3.7,.28,.30],[0,2.79,route.end-.04],dark,group);
  box([3.7,2.7,.12],[0,1.47,route.end+.08],seal,group);
  const cap=new T.Shape();cap.moveTo(w,2.30);for(let i=1;i<=40;i++){const a=Math.PI*i/40;cap.lineTo(w*Math.cos(a),2.30+1.22*Math.sin(a));}cap.closePath();
  mesh(new T.ShapeGeometry(cap),lining,[0,0,route.end+.05],group);
  const pair=[];
  for(const side of [-1,1]){
   box([.32,2.62,.34],[side*1.62,1.43,route.end-.11],steel,group,.05);
   const moving=new T.Group();moving.name='N06 Hub / Door '+route.id+' '+side;moving.position.set(side*.65,0,route.end-.20);group.add(moving);
   box([1.27,2.48,.14],[0,1.36,0],paint,moving,.075);box([.055,2.18,.025],[-side*.54,1.36,-.082],accent,moving,.008);
   box([.14,.62,.085],[-side*.39,1.37,-.12],steel,moving,.025);pair.push({object:moving,side});
  }
  const terminal=new T.Group();terminal.position.set(1.12,0,route.gateZ);group.add(terminal);
  box([.55,.14,.55],[0,.19,0],dark,terminal);box([.15,1.10,.20],[0,.72,0],steel,terminal);
  box([.68,.50,.12],[0,1.42,0],dark,terminal,.05);box([.42,.04,.018],[0,1.27,-.07],accent,terminal,.005);
  label('N'+route.number,'ENTRER · E',.57,[0,1.49,-.072],terminal,route.color);
  const gate=hubGatePosition(route);obstacles.push([gate[0],gate[2],.37]);doors.set(route.id,{pair,open:0,goal:0});
  // Merge rigid parts by material; leave the real door pivots independent.
  function merge(parent){
   for(const child of [...parent.children])if(child.isGroup&&!pair.some(p=>p.object===child)){child.updateMatrix();for(const part of [...child.children]){part.applyMatrix4(child.matrix);parent.add(part);}parent.remove(child);}
   const batches=new Map();for(const o of [...parent.children])if(o.isMesh&&!o.isInstancedMesh&&!o.material.map?.isCanvasTexture){
    o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(g);o.geometry.dispose();parent.remove(o);
   }
   for(const [m,parts] of batches){const expanded=mergeGeometries(parts),g=indexExact(expanded);expanded.dispose();parts.forEach(p=>p.dispose());const o=new T.Mesh(g,m);o.receiveShadow=true;o.matrixAutoUpdate=false;parent.add(o);}
  }
  for(const {object} of pair)merge(object);merge(group);
 }
 let disposed=false;
 return {root,obstacles,open(id){const door=doors.get(id);if(door){door.goal=1;if(reduced){door.open=1;for(const part of door.pair)part.object.position.x=part.side*1.73;}}},
  update(dt){if(disposed)return;for(const door of doors.values()){door.open=T.MathUtils.damp(door.open,door.goal,9,Math.min(.05,dt));for(const part of door.pair)part.object.position.x=part.side*(.65+door.open*1.08);}},
  dispose(){if(disposed)return;disposed=true;root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();}
 };
}
