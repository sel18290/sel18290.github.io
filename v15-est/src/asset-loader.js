import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';

export function placeModel(template,station){
  const holder=new T.Group();
  const model=template.clone(true);
  model.rotation.y+=station.yaw||0;
  model.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(model);
  const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const scale=Math.min(1.84*station.r/Math.hypot(size.x,size.z),station.h/size.y);
  if(!Number.isFinite(scale)||scale<=0)throw Error('Dimensions invalides : '+station.asset);
  model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  model.scale.multiplyScalar(scale);
  holder.position.set(station.x,station.y||0,station.z);
  holder.name=station.id;
  holder.add(model);
  return holder;
}

export function createLibrary(scene,stations,{finish,onError=console.warn}={}){
  const loader=new GLTFLoader(),cache=new Map(),mounted=new Map(),pending=new Set(),failed=new Set();
  let loading=0, nextUpdate=0;
  function get(asset){
    if(!cache.has(asset))cache.set(asset,loader.loadAsync(new URL('../assets/'+asset+'.glb',import.meta.url).href).then(g=>{
      finish(g.scene);
      return g.scene;
    }));
    return cache.get(asset);
  }
  function update(position){
    const now=performance.now();
    if(now<nextUpdate)return;
    nextUpdate=now+160;
    const nearby=stations.map(s=>({s,d:Math.hypot(position.x-s.x,position.z-s.z)})).sort((a,b)=>a.d-b.d);
    for(const {s,d} of nearby){
      const root=mounted.get(s.id);
      if(root){root.visible=d<36;continue}
      if(d>24||loading>=2||pending.has(s.id)||failed.has(s.id))continue;
      pending.add(s.id);loading++;
      get(s.asset).then(template=>{
        const instance=placeModel(template,s);scene.add(instance);mounted.set(s.id,instance);
      }).catch(err=>{failed.add(s.id);onError(s,err)}).finally(()=>{pending.delete(s.id);loading--});
    }
  }
  function interact(position){
    const active=stations.filter(s=>mounted.has(s.id)&&!s.y).map(s=>({s,d:Math.hypot(s.x-position.x,s.z-position.z)-s.r})).sort((a,b)=>a.d-b.d)[0];
    return active&&active.d<1.7?active.s.label:'Approchez-vous d’un équipement pour l’inspecter.';
  }
  return {update,interact};
}
