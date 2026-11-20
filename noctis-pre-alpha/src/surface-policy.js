import {BufferAttribute} from '../vendor/three.module.js';
// Repeatable industrial maps are projected in metres on structural pieces.
// Keep each cached source geometry immutable for other rooms and asset users.
const projected=new Map();
export function meterUV(mesh,tile=2){
  if(!mesh.isMesh||!mesh.geometry.attributes.normal||!mesh.geometry.attributes.uv)return;
  const source=mesh.geometry;
  const key=source.uuid+':'+mesh.scale.toArray().join(':')+':'+tile;
  let geometry=projected.get(key);
  if(!geometry){
    geometry=source.clone();
    const position=geometry.attributes.position,normal=geometry.attributes.normal,uv=new Float32Array(position.count*2);
    for(let i=0;i<position.count;i++){
      const x=position.getX(i)*mesh.scale.x,y=position.getY(i)*mesh.scale.y,z=position.getZ(i)*mesh.scale.z;
      const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));
      const pair=ny>=nx&&ny>=nz?[x,z]:nx>=nz?[z,y]:[x,y];
      uv[i*2]=pair[0]/tile;uv[i*2+1]=pair[1]/tile;
    }
    geometry.setAttribute('uv',new BufferAttribute(uv,2));
    projected.set(key,geometry);
  }
  mesh.geometry=geometry;
}
export function prepareStructuralSurfaces(root,materials){
  // Existing deck maps are authored at the reference floor dimensions. Each
  // generated room instead has metre-based geometry UVs and unit-repeat views.
  for(const name of ['map','normalMap','roughnessMap']){
    if(!materials.deck[name])continue;
    materials.deck[name]=materials.deck[name].clone();
    materials.deck[name].repeat.set(1,1);
    materials.deck[name].needsUpdate=true;
  }
  root.traverse(o=>{
    if(o.material?.isMeshStandardMaterial&&!o.material.emissive?.getHex())meterUV(o,o.material===materials.deck?2:1);
  });
}
