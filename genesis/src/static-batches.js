import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Keep spatial cells for frustum culling, but submit different panel sizes together.
// Transforms, normals, UVs and materials are retained; no simplification is applied.
export function buildPanelBatches(batches,{merge=true}={}){
  const groups=new Map(),result=[],indexed=new Map();
  for(const batch of batches){
    if(!merge){
      const mesh=new T.InstancedMesh(batch.geom,batch.material,batch.matrices.length);
      mesh.userData.batchCell=batch.cell;
      batch.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.computeBoundingSphere();result.push(mesh);continue;
    }
    const key=batch.cell+'/'+batch.material.uuid;
    if(!groups.has(key))groups.set(key,{material:batch.material,cell:batch.cell,geometries:[]});
    const group=groups.get(key);
    if(!indexed.has(batch.geom))indexed.set(batch.geom,mergeVertices(batch.geom,1e-7));
    for(const matrix of batch.matrices){
      const geometry=indexed.get(batch.geom).clone();geometry.applyMatrix4(matrix);
      group.geometries.push(geometry);
    }
  }
  for(const {material,cell,geometries} of groups.values()){
    const geometry=mergeGeometries(geometries);
    geometries.forEach(g=>g.dispose());
    if(!geometry)throw Error('Attributs de panneaux incompatibles');
    geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,material);mesh.userData.batchCell=cell;result.push(mesh);
  }
  if(merge)new Set([...batches].map(b=>b.geom)).forEach(g=>g.dispose());
  indexed.forEach(g=>g.dispose());
  for(const mesh of result){
    mesh.name='N05 static panels';mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.updateMatrix();mesh.matrixAutoUpdate=false;
  }
  return result;
}
