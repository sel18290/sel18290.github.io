import * as T from 'three';
// Static world-space floor bake. Works across instanced tiles without one material per tile.
export async function applyFloorLight(material,renderer){
  const loader=new T.TextureLoader();const loaded=await Promise.allSettled(['light','ao'].map(n=>loader.loadAsync('/genesis/assets/n05-floor-'+n+'.png')));
  if(loaded.some(r=>r.status==='rejected')){loaded.forEach(r=>{if(r.status==='fulfilled')r.value.dispose();});throw loaded.find(r=>r.status==='rejected').reason;}
  const [light,ao]=loaded.map(r=>r.value);
  for(const map of [light,ao]){map.colorSpace=T.NoColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
  material.lightMap=light;material.lightMapIntensity=.8;material.aoMap=ao;material.aoMapIntensity=.75;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vFloorUv;');
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 floorPosition = vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        floorPosition = instanceMatrix * floorPosition;
      #endif
      floorPosition = modelMatrix * floorPosition;
      vFloorUv = (floorPosition.xz + vec2(25.0,6.0)) / vec2(52.0,44.0);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vFloorUv;');
    // Override only sampling UVs in Three r180's own checked shader chunks.
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>',T.ShaderChunk.lights_fragment_maps.replaceAll('vLightMapUv','vFloorUv'));
    shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',T.ShaderChunk.aomap_fragment.replaceAll('vAoMapUv','vFloorUv'));
  };
  material.customProgramCacheKey=()=> 'n05-floor-world-bake-v1';material.needsUpdate=true;
  let done=false;return ()=>{if(done)return;done=true;light.dispose();ao.dispose();};
}
