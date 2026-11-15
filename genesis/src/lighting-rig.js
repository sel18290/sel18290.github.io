import * as T from 'three';
import {createLightCuller} from './light-culling.js';
// A single nearby shadow caster, with four physically placed pools of light.
export function createLightingRig(scene,renderer,profile,{optimize=true}={}){
  const group=new T.Group();scene.add(group);
  const points=[];
  const zones=[[-2,4.1,-3,0xffe8cd,180],[-20,4.5,0,0xb8e4ed,170],[20,4.6,0,0xffcf9e,240],[1,4.5,32,0xc3deed,200]];
  for(const [x,y,z,color,power] of zones){const l=new T.PointLight(color,power,14,2);l.position.set(x,y,z);group.add(l);points.push(l);}
  // Corridor pools support navigation without adding more shadow maps.
  for(const [x,z] of [[-10,2],[10,2],[-19,13],[19,13],[1,12],[1,20],[1,25]]){
    const l=new T.PointLight(0xb9cbd3,35,7,2);l.position.set(x,2.9,z);group.add(l);points.push(l);
  }
  const spot=new T.SpotLight(0xffe6cf,150,20,.95,.65,2);spot.castShadow=profile.shadows;
  spot.shadow.mapSize.set(profile.shadowSize,profile.shadowSize);spot.shadow.bias=-.0002;spot.shadow.normalBias=.025;
  group.add(spot,spot.target);renderer.shadowMap.enabled=profile.shadows;renderer.shadowMap.type=T.PCFSoftShadowMap;
  let current=-1;
  const cull=createLightCuller(points);
  return {get activeLights(){return cull.activeLights;},update(p,camera){let next=0,best=Infinity;zones.forEach((v,i)=>{const d=Math.hypot(v[0]-p.x,v[2]-p.z);if(d<best){best=d;next=i;}});
      if(next!==current){current=next;const [x,y,z,c]=zones[next];spot.position.set(x-1.4,y,z+1.8);spot.target.position.set(x,.2,z);spot.color.setHex(c);}
      spot.intensity=best<13?150:0;
      if(optimize&&camera)cull(camera);
    },dispose(){spot.shadow.dispose();group.removeFromParent();}};
}
