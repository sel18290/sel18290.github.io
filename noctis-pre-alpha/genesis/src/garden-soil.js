import * as T from 'three';
// Low rounded mounds, not a perfectly flat disc. Stable deterministic relief.
export function soilHeight(x,z,radius,seed=1){
 const r=Math.min(1,Math.hypot(x,z)/radius);
 const noise=Math.sin(x*12.3+seed)*Math.cos(z*14.7-seed)*.004+Math.sin(x*31.1+z*27.3+seed)*.002;
 return .553+(1-r*r)*.022+noise*(1-r*.4);
}
export function createSoilGeometry(radius,seed=1){
 const rings=20,sides=96,positions=[],uv=[],indices=[];
 for(let j=0;j<=rings;j++)for(let i=0;i<=sides;i++){
  const r=radius*j/rings,a=i/sides*Math.PI*2,x=Math.cos(a)*r,z=Math.sin(a)*r;
  positions.push(x,soilHeight(x,z,radius,seed),z);uv.push(x/.5,-z/.5);
  if(j<rings&&i<sides){const k=j*(sides+1)+i;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
