import * as T from '../vendor/three.module.js';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';

export async function laboratoryFinish(renderer,mobile){
 const loader=new T.TextureLoader(),textures=new Set();
 const anisotropy=Math.min(mobile?2:6,renderer.capabilities.getMaxAnisotropy());
 async function surface(family,tiles){
  const root=mobile?'/noctis-pre-alpha/genesis/assets/mobile/':'/noctis-pre-alpha/genesis/assets/';
  const maps=await Promise.all(['normal','rough'].map(async kind=>{
   try{
    const texture=await loader.loadAsync(root+'n05-'+family+'-'+kind+'.png');
    texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.repeat.set(tiles,tiles);
    texture.anisotropy=anisotropy;
    textures.add(texture);
    return texture;
   }catch{return null;}
  }));
  return {normalMap:maps[0],roughnessMap:maps[1]};
 }
 const [paint,deck]=await Promise.all([surface('paint',.65),surface('deck',12)]);
 return {
  wall:new T.MeshStandardMaterial({color:0xf1f2f3,roughness:.53,...paint,normalScale:new T.Vector2(.48,.48)}),
  ceramic:new T.MeshStandardMaterial({color:0xf8f9fa,metalness:.12,roughness:.37,...paint,normalScale:new T.Vector2(.37,.37)}),
  floor:new T.MeshStandardMaterial({color:0xf2f3f4,roughness:.47,...deck,normalScale:new T.Vector2(.29,.29)}),
  seam:new T.MeshStandardMaterial({color:0xaab2b9,roughness:.40,metalness:.20}),
  gasket:new T.MeshStandardMaterial({color:0x42474c,roughness:.63,metalness:.15}),
  light:new T.MeshBasicMaterial({color:0xffffff}),
  dispose(){for(const texture of textures)texture.dispose();}
 };
}

export function dressLaboratory(box,scene,finish){
 const {ceramic,seam,gasket,light}=finish;
 // Ceiling services sit in dark recesses, with the deck finish on the exposed shell.
 for(const x of [-9.9,-5,0,5,9.9]){
  for(const side of [-1,1]){
   box([.98,.21,10.15],[x,7.22,side*9.28],gasket);
   box([.46,.037,9.76],[x,7.076,side*9.28],light);
   box([1.48,.24,.37],[x,7.12,side*4.03],seam);
   box([1.48,.24,.37],[x,7.12,side*14.53],seam);
  }
 }
 for(const side of [-1,1]){
  const bed=new T.Mesh(new RoundedBoxGeometry(.98,.34,6.8,2,.16),ceramic);
  bed.position.set(side*6,-4.32,0);
  scene.add(bed);
  box([.09,.032,5.78],[side*5.72,-4.133,0],gasket);
  box([.034,.027,5.55],[side*5.72,-4.107,0],light);
 }
 for(let offset=-12;offset<=12;offset+=4){
  box([.022,.007,31],[offset,-4.495,0],seam);
  box([31,.007,.022],[0,-4.494,offset],seam);
  box([.022,.007,31],[offset,7.295,0],seam);
  box([31,.007,.022],[0,7.294,offset],seam);
 }
 const plinth=new T.Mesh(new T.CylinderGeometry(2.22,2.44,.12,96),ceramic);
 plinth.position.y=-4.439;
 scene.add(plinth);
}
