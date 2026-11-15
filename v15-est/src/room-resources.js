// Geometry caches and source images may be shared across room rebuilds.
// Release only the GPU objects that the replacement does not retain.
function resources(room){
  const geometries=new Set(),materials=new Set(Object.values(room.materials??{})),textures=new Set();
  room.root.traverse(o=>{
    if(o.geometry)geometries.add(o.geometry);
    for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m);
  });
  for(const m of materials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  return {geometries,materials,textures};
}
export function retireRoom(previous,replacement){
  const old=resources(previous),keep=replacement?resources(replacement):{};
  for(const family of ['textures','materials','geometries'])for(const resource of old[family]){
    if(!keep[family]?.has(resource))resource.dispose();
  }
  previous.root.removeFromParent();
}
