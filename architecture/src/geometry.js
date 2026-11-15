import * as T from 'three';

const vector=p=>p?.isVector3?p.clone():new T.Vector3(...p);
const finite=(n,name)=>{if(!Number.isFinite(n))throw Error('Valeur géométrique invalide : '+name);return n;};
function divisions(n,name){if(!Number.isInteger(n)||n<1||n>512)throw Error('Subdivision invalide : '+name);return n;}
export function path3(points){
 if(points?.getPointAt)return points;
 if(typeof points==='function'){const curve=new T.Curve();curve.getPoint=t=>vector(points(t));return curve;}
 if(!Array.isArray(points)||points.length<2)throw Error('Trajectoire : deux points au minimum');
 return new T.CatmullRomCurve3(points.map(vector),false,'centripetal');
}

// Parallel transport avoids the flips of a fixed world-up frame on vertical paths.
export function framesAlong(path,segments=48){
 divisions(segments,'trajectoire');path=path3(path);
 const result=[],q=new T.Quaternion();let right,previous;
 for(let i=0;i<=segments;i++){
  const t=i/segments,p=path.getPointAt(t),forward=path.getTangentAt(t).normalize();
  if(forward.lengthSq()<.9)throw Error('Tangente nulle');
  if(!right)right=new T.Vector3(0,1,0).cross(forward);
  else right.applyQuaternion(q.setFromUnitVectors(previous,forward));
  if(right.lengthSq()<1e-8)right=new T.Vector3(0,0,1).cross(forward);
  right.addScaledVector(forward,-right.dot(forward)).normalize();
  const up=new T.Vector3().crossVectors(forward,right).normalize();
  result.push({t,position:p.clone(),right:right.clone(),up,forward});previous=forward;
 }
 return result;
}

function fromBuffers(positions,indices,uv){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 validateGeometry(g);g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export function validateGeometry(g,{maxTriangles=250000}={}){
 const p=g.getAttribute('position');if(!p||p.count<3)throw Error('Surface vide');
 for(const [name,a]of Object.entries(g.attributes))for(const v of a.array)finite(v,name);
 const index=g.index?.array??Array.from({length:p.count},(_,i)=>i);
 if(index.length%3||index.length/3>maxTriangles)throw Error('Budget ou topologie invalide');
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(let i=0;i<index.length;i+=3){
  for(let k=0;k<3;k++)if(!Number.isInteger(index[i+k])||index[i+k]<0||index[i+k]>=p.count)throw Error('Indice invalide');
  a.fromBufferAttribute(p,index[i]);b.fromBufferAttribute(p,index[i+1]);c.fromBufferAttribute(p,index[i+2]);
  if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-16)throw Error('Triangle dégénéré');
 }
 return g;
}
export function inspectTopology(g,{tolerance=1e-5}={}){
 validateGeometry(g);if(!Number.isFinite(tolerance)||tolerance<=0)throw Error('Tolérance invalide');
 const p=g.attributes.position,index=g.index?.array??Array.from({length:p.count},(_,i)=>i),edges=new Map();
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/tolerance)).join(',');
 for(let i=0;i<index.length;i+=3)for(const [a,b]of [[index[i],index[i+1]],[index[i+1],index[i+2]],[index[i+2],index[i]]]){
  const ka=key(a),kb=key(b),id=[ka,kb].sort().join('/'),edge=edges.get(id)||{count:0,winding:0};edge.count++;edge.winding+=ka<kb?1:-1;edges.set(id,edge);
 }
 const values=[...edges.values()],boundaryEdges=values.filter(e=>e.count===1).length,nonManifoldEdges=values.filter(e=>e.count>2).length,windingErrors=values.filter(e=>e.count===2&&e.winding!==0).length;
 return {boundaryEdges,nonManifoldEdges,windingErrors,closed:boundaryEdges===0&&nonManifoldEdges===0&&windingErrors===0};
}

// Rings are arbitrary points in 3D, not a catalogue of architectural shapes.
export function loft(rings,{closed=true,caps=closed,uvMetres=2}={}){
 if(!Array.isArray(rings)||rings.length<2)throw Error('Loft : deux sections au minimum');
 const rows=rings.map(row=>row.map(vector)),n=rows[0].length;
 if(n<(closed?3:2)||rows.some(row=>row.length!==n)||uvMetres<=0)throw Error('Sections incompatibles');
 if(closed){
  const normal=new T.Vector3(),first=new T.Vector3(),second=new T.Vector3();
  for(let i=0;i<n;i++)normal.add(new T.Vector3().crossVectors(rows[0][i],rows[0][(i+1)%n]));
  rows[0].forEach(p=>first.add(p));rows[1].forEach(p=>second.add(p));
  if(normal.dot(second.sub(first))<0)rows.forEach(row=>row.reverse());
 }
 const positions=[],uv=[],indices=[],stride=n+(closed?1:0);let distance=0;
 for(let j=0;j<rows.length;j++){
  if(j)distance+=rows[j][0].distanceTo(rows[j-1][0]);let arc=0;
  for(let i=0;i<stride;i++){if(i)arc+=rows[j][i%n].distanceTo(rows[j][(i-1)%n]);positions.push(...rows[j][i%n]);uv.push(arc/uvMetres,distance/uvMetres);}
 }
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<(closed?n:n-1);i++){
  const a=j*stride+i,b=a+1,c=(j+1)*stride+i,d=c+1;
  indices.push(a,b,c,b,d,c);
 }
 if(caps){
  // Project each planar end ring into its own plane and duplicate cap vertices
  // so its normal never rounds the wall/edge seam.
  for(const j of [0,rows.length-1]){
   const row=rows[j],origin=row[0],x=row[1].clone().sub(origin).normalize();
   let normal=new T.Vector3();for(let i=2;i<n&&normal.lengthSq()<1e-12;i++)normal.crossVectors(x,row[i].clone().sub(origin));
   normal.normalize();const y=new T.Vector3().crossVectors(normal,x),outline=row.map(p=>new T.Vector2(p.clone().sub(origin).dot(x),p.clone().sub(origin).dot(y)));
   if(row.some(p=>Math.abs(p.clone().sub(origin).dot(normal))>1e-4))throw Error('Extrémité de loft non plane');
   const offset=positions.length/3;row.forEach((p,i)=>{positions.push(...p);uv.push(outline[i].x/uvMetres,outline[i].y/uvMetres);});
   const faces=T.ShapeUtils.triangulateShape(outline,[]);
   const toward=rows[j===0?1:j-1][0].clone().sub(origin);
   for(const [a,b,c]of faces){
    const faceNormal=row[b].clone().sub(row[a]).cross(row[c].clone().sub(row[a]));
    if(faceNormal.dot(toward)>0)indices.push(offset+a,offset+c,offset+b);else indices.push(offset+a,offset+b,offset+c);
   }
  }
 }
 return fromBuffers(positions,indices,uv);
}
export function sweep({path,section,segments=48,closed=true,caps=closed,bank=()=>0,uvMetres=2}){
 const rings=framesAlong(path,segments).map(frame=>{
  const profile=typeof section==='function'?section(frame.t):section,angle=typeof bank==='function'?bank(frame.t):bank;
  const c=Math.cos(angle),s=Math.sin(angle);
  if(!Array.isArray(profile))throw Error('Section absente');
  return profile.map(p=>frame.position.clone().addScaledVector(frame.right,p[0]*c-p[1]*s).addScaledVector(frame.up,p[0]*s+p[1]*c));
 });
 return loft(rings,{closed,caps,uvMetres});
}

// Any authored function (u,v)->[x,y,z] can define a surface; no named preset.
export function surface(evaluate,{uSegments=24,vSegments=16,uvMetres=1}={}){
 divisions(uSegments,'u');divisions(vSegments,'v');if(uvMetres<=0)throw Error('Échelle UV invalide');
 const positions=[],uv=[],indices=[],points=[];
 for(let j=0;j<=vSegments;j++)for(let i=0;i<=uSegments;i++){
  const p=vector(evaluate(i/uSegments,j/vSegments));points.push(p);positions.push(...p);
 }
 const vLengths=new Float64Array(uSegments+1);
 for(let j=0;j<=vSegments;j++){let arc=0;for(let i=0;i<=uSegments;i++){const k=j*(uSegments+1)+i;if(i)arc+=points[k].distanceTo(points[k-1]);if(j)vLengths[i]+=points[k].distanceTo(points[k-uSegments-1]);uv.push(arc/uvMetres,vLengths[i]/uvMetres);}}
 for(let j=0;j<vSegments;j++)for(let i=0;i<uSegments;i++){
  const a=j*(uSegments+1)+i,b=a+1,c=a+uSegments+1,d=c+1;indices.push(a,b,c,b,d,c);
 }
 return fromBuffers(positions,indices,uv);
}

export function thicken(source,thickness=.15){
 finite(thickness,'épaisseur');if(thickness<=0)throw Error('Épaisseur positive requise');validateGeometry(source);
 const p=source.attributes.position,n=source.attributes.normal,uv=source.attributes.uv;
 const positions=[],coords=[],indices=[],edges=new Map(),src=Array.from(source.index?.array??Array.from({length:p.count},(_,i)=>i));
 for(const back of [false,true])for(let i=0;i<p.count;i++){
  positions.push(p.getX(i)-(back?n.getX(i)*thickness:0),p.getY(i)-(back?n.getY(i)*thickness:0),p.getZ(i)-(back?n.getZ(i)*thickness:0));coords.push(uv?.getX(i)||0,uv?.getY(i)||0);
 }
 for(let i=0;i<src.length;i+=3){const [a,b,c]=src.slice(i,i+3);indices.push(a,b,c,a+p.count,c+p.count,b+p.count);
  for(const [x,y]of [[a,b],[b,c],[c,a]]){const key=Math.min(x,y)+','+Math.max(x,y);if(edges.has(key))edges.delete(key);else edges.set(key,[x,y]);}
 }
 for(const [a,b]of edges.values())indices.push(a,a+p.count,b,b,a+p.count,b+p.count);
 return fromBuffers(positions,indices,coords);
}

export function extrude(contour,{holes=[],depth=.2,bevel=.025,curveSegments=24}={}){
 const shape=contour instanceof T.Shape?contour.clone():new T.Shape(contour.map(p=>new T.Vector2(...p)));
 for(const hole of holes)shape.holes.push(hole instanceof T.Path?hole.clone():new T.Path(hole.map(p=>new T.Vector2(...p))));
 const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments});return validateGeometry(g);
}
