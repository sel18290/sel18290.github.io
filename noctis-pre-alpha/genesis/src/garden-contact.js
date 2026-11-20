import * as T from 'three';

const contacts=[[-8,7,2.25,2.25], [8,7,2.25,2.25],[-10,-9,2.25,2.25],[10,-9,2.25,2.25],[-12,0,1.5,1.5],[12,0,1.5,1.5],[-3,12,1.45,1.45],[3,12,1.45,1.45]];
for(const sx of [-1,1])for(const z of [-3,3])contacts.push([-23+sx*5.1,-4+z,1.25,.8]);
for(const [x,z] of [[-4,-3],[4,-3],[-4,3],[4,3]])contacts.push([23+x,-4+z,1.05,1.05]);

export function gardenContact(x,z){
  let occlusion=0;
  for(const [cx,cz,rx,rz] of contacts){
    const radius=Math.min(rx,rz),edge=Math.max(0,(Math.hypot((x-cx)/rx,(z-cz)/rz)-1)*radius);
    occlusion=Math.max(occlusion,.22*Math.exp(-edge*edge/(.17+.06*radius)**2));
  }
  return 1-occlusion;
}

export function applyGardenContact(material,size=512){
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const value=Math.round(255*gardenContact(-35+(x+.5)*70/size,-36+(y+.5)*56/size)),i=(y*size+x)*4;
    data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const texture=new T.DataTexture(data,size,size);texture.name='N06 / Baked contact occlusion';
  texture.colorSpace=T.NoColorSpace;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
  material.aoMap=texture;material.aoMapIntensity=1;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vGardenContactUv;');
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 gardenWorldPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
      gardenWorldPosition=instanceMatrix*gardenWorldPosition;
      #endif
      gardenWorldPosition=modelMatrix*gardenWorldPosition;
      vGardenContactUv=(gardenWorldPosition.xz+vec2(35.0,36.0))/vec2(70.0,56.0);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vGardenContactUv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',T.ShaderChunk.aomap_fragment.replaceAll('vAoMapUv','vGardenContactUv'));
  };
  material.customProgramCacheKey=()=> 'n06-contact-world-v1';material.needsUpdate=true;
  let done=false;return ()=>{if(done)return;done=true;texture.dispose();};
}
