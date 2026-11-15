import * as T from '../../v15-est/vendor/three.module.js';
import {createLighting} from '../../v15-est/src/lighting.js';

// One shadow map and one shared reflection environment across the full network.
export function light(scene,renderer,m,plan){
 const mobile=globalThis.matchMedia?.('(pointer:coarse)').matches??false;
 const rig=createLighting(renderer,scene,{mobile});
 rig.quality(mobile);
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.08;
 renderer.outputColorSpace=T.SRGBColorSpace;
 rig.hemi.color.setHex(0xe3e5eb);
 rig.hemi.groundColor.setHex(0x57474b);
 rig.key.color.setHex(0xf3f2ff);
 rig.cross.color.setHex(0xffd6d0);
 rig.rim.color.setHex(0xff354a);
 scene.environmentIntensity=.96;
 rig.key.position.set(-39,6,1.5);
 rig.key.target.position.set(-43,1,0);
 rig.rim.position.set(-45,3,-2);
 rig.depth.position.set(-23,3.4,0);
 rig.red.position.set(2.5,2,-.6);
 rig.red.intensity=35;
 rig.depth.intensity=115;
 const entry=new T.PointLight(0xffefe1,88,17);
 entry.position.set(0,3.5,13);
 scene.add(entry);
 return rig;
}
