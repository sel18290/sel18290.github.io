import * as T from 'three';

// Deduplicate only exactly equal attribute tuples: preserve UV/normal seams and
// triangle winding. Avoid tolerance welding on pressure-shell junctions.
export function indexExact(source){
  if(source.index)return source;
  const attributes=Object.entries(source.attributes),count=source.attributes.position.count;
  const seen=new Map(),unique=[],indices=new Uint32Array(count);
  for(let i=0;i<count;i++){
    let key='';for(const [,attr] of attributes)for(let c=0;c<attr.itemSize;c++)key+=attr.array[i*attr.itemSize+c]+',';
    let index=seen.get(key);
    if(index===undefined){index=unique.length;seen.set(key,index);unique.push(i);}
    indices[i]=index;
  }
  const result=new T.BufferGeometry();
  for(const [name,attr] of attributes){
    const values=new attr.array.constructor(unique.length*attr.itemSize);
    for(let j=0;j<unique.length;j++)for(let c=0;c<attr.itemSize;c++)values[j*attr.itemSize+c]=attr.array[unique[j]*attr.itemSize+c];
    result.setAttribute(name,new T.BufferAttribute(values,attr.itemSize,attr.normalized));
  }
  result.setIndex(new T.BufferAttribute(unique.length<=65535?new Uint16Array(indices):indices,1));
  result.computeBoundingSphere();return result;
}
