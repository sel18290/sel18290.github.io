import * as T from '../vendor/three.module.js';

// Use object-space box projection for authored parts which have no texture UVs.
function surfaceUV(geometry){
  const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);
  geometry.computeBoundingBox();
  const extent=geometry.boundingBox.getSize(new T.Vector3());
  const frequency=3/Math.max(extent.x,extent.y,extent.z,.001);
  for(let i=0;i<p.count;i++){
    const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    uv[i*2]=(nx>=ny&&nx>=nz?z:x)*frequency;
    uv[i*2+1]=(ny>=nx&&ny>=nz?z:y)*frequency;
  }
  geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
}

export function equipmentFinishes(kit){
  const paint=kit.anodized.clone();
  paint.color.setHex(0x963444);paint.metalness=.49;paint.roughness=.65;
  const trim=kit.anodized.clone();trim.color.setHex(0x542e37);
  const lamp=kit.emitter.clone();lamp.emissiveIntensity=1.6;
  const white=lamp.clone();white.color.setHex(0xd8dadd);white.emissive.setHex(0xe4e6ec);
  const viewport=kit.glass.clone();viewport.color.setHex(0x847481);viewport.opacity=.52;
  const finishes={main:kit.anodized,shell:kit.anodized,graphite:kit.anodized,darkgrey:kit.steel,dark:kit.composite,
    black:kit.polymer,steel:kit.steel,metal:kit.titanium,galv:kit.titanium,accent:paint,yellow:paint,
    darkaccent:trim,orange:trim,glass:viewport,glow:lamp,light:white};
  return root=>root.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    const convert=m=>{
      // Atlas materials carry their own authored UVs and baked metallic/roughness channels.
      const finish=!m.map&&finishes[m.name.toLowerCase()];
      if(!finish)return m;
      if(!o.geometry.attributes.uv&&o.geometry.attributes.normal)surfaceUV(o.geometry);
      return finish;
    };
    o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
    o.castShadow=!Array.isArray(o.material)&&!o.material.transparent;
  });
}
