import * as T from 'three';
import {loft,validateGeometry} from './geometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {indexExact} from '../../genesis/src/index-exact.js';

export class Architecture {
 constructor(){this.root=new T.Group();this.root.name='NOCTIS / Architecture libre';this.parts=[];this.ports=new Map();this.targets=[];this.disposed=false;}
 add(id,{geometry,material,collision=geometry,walkable=false,matrix=new T.Matrix4()}){
  if(this.disposed||this.parts.some(p=>p.id===id))throw Error('Construction indisponible ou identifiant dupliqué : '+id);
  validateGeometry(geometry);if(collision)validateGeometry(collision);
  if(matrix.elements.some(v=>!Number.isFinite(v))||Math.abs(matrix.determinant())<1e-9)throw Error('Transformation invalide');
  const mesh=new T.Mesh(geometry,material);mesh.name=id;mesh.applyMatrix4(matrix);mesh.castShadow=!material.transparent;mesh.receiveShadow=true;this.root.add(mesh);
  const part={id,mesh,collision,walkable};this.parts.push(part);return part;
 }
 port(id,{position,quaternion=[0,0,0,1],contour}){
  if(this.ports.has(id)||!Array.isArray(contour)||contour.length<3)throw Error('Ouverture invalide : '+id);
  const matrix=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion(...quaternion).normalize(),new T.Vector3(1,1,1));
  const points=contour.map(([x,y])=>new T.Vector3(x,y,0).applyMatrix4(matrix));
  const port={matrix,points};this.ports.set(id,port);return port;
 }
 connect(id,start,end,{material,steps=4,walkable=false,closed=true,caps=closed}={}){
  if(!Number.isInteger(steps)||steps<1||steps>512)throw Error('Subdivision de raccord invalide');
  const a=this.ports.get(start),b=this.ports.get(end);if(!a||!b||a.points.length!==b.points.length)throw Error('Ouvertures incompatibles');
  // Match winding and starting vertex in world space before interpolating sections.
  let best,score=Infinity;const n=a.points.length;
  for(const sign of [-1,1])for(let offset=0;offset<n;offset++){
   const candidate=a.points.map((_,i)=>b.points[(offset+sign*i+n*2)%n]);
   const cost=candidate.reduce((sum,p,i)=>sum+p.distanceToSquared(a.points[i]),0);if(cost<score){score=cost;best=candidate;}
  }
  const rings=Array.from({length:steps+1},(_,j)=>a.points.map((p,i)=>p.clone().lerp(best[i],j/steps)));
  return this.add(id,{geometry:loft(rings,{closed,caps}),material,walkable});
 }
 target(id,{position,label,range=2.5}){if(this.targets.some(t=>t.id===id)||!Number.isFinite(range)||range<=0)throw Error('Interaction invalide');const t={id,position:new T.Vector3(...position),label,range};this.targets.push(t);return t;}
 collisionMeshes(){this.root.updateMatrixWorld(true);return this.parts.filter(p=>p.collision).map(p=>({id:p.id,geometry:p.collision,matrix:p.mesh.matrixWorld.clone(),walkable:p.walkable}));}
 batchStatic({cellSize=12}={}){
  if(this.batches)throw Error('Assemblage déjà regroupé');if(!Number.isFinite(cellSize)||cellSize<=0)throw Error('Cellule invalide');this.batches=[];this.root.updateMatrixWorld(true);const groups=new Map(),center=new T.Vector3();
  for(const part of this.parts){const mesh=part.mesh;if(!mesh.visible||part.motion||mesh.material.transparent)continue;mesh.geometry.computeBoundingBox();mesh.geometry.boundingBox.getCenter(center).applyMatrix4(mesh.matrix);const key=[mesh.material.uuid,Math.floor(center.x/cellSize),Math.floor(center.y/6),Math.floor(center.z/cellSize),mesh.castShadow].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);}
  for(const meshes of groups.values()){if(meshes.length<2)continue;const geometries=meshes.map(mesh=>{mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();return g.applyMatrix4(mesh.matrix);});
   const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)throw Error('Attributs incompatibles');const indexed=indexExact(merged);if(indexed!==merged)merged.dispose();indexed.computeBoundingSphere();const mesh=new T.Mesh(indexed,meshes[0].material);mesh.castShadow=meshes[0].castShadow;mesh.receiveShadow=true;mesh.name='Campus static cell';mesh.matrixAutoUpdate=false;this.root.add(mesh);this.batches.push(mesh);meshes.forEach(m=>m.visible=false);
  }return this.batches.length;
 }
 cost(){let triangles=0,collisionTriangles=0;for(const p of this.parts){triangles+=(p.mesh.geometry.index?.count??p.mesh.geometry.attributes.position.count)/3;if(p.collision)collisionTriangles+=(p.collision.index?.count??p.collision.attributes.position.count)/3;}return {meshes:this.parts.length,triangles,collisionTriangles};}
 dispose(){if(this.disposed)return;this.disposed=true;const geometries=new Set();for(const p of this.parts){geometries.add(p.mesh.geometry);if(p.collision)geometries.add(p.collision);}for(const batch of this.batches||[])geometries.add(batch.geometry);geometries.forEach(g=>g.dispose());this.root.removeFromParent();this.root.clear();this.parts=[];this.targets=[];this.ports.clear();}
}
