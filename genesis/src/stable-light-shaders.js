import * as T from 'three';

// Uniform branches skip black light contributions without changing NUM_*_LIGHTS.
export function stableLightChunk(){
  let chunk=T.ShaderChunk.lights_fragment_begin;
  for(const name of ['point','spot']){
    const token=`${name}Light = ${name}Lights[ i ];`;
    const start=chunk.indexOf(token),end=chunk.indexOf('\n\t}\n\t#pragma unroll_loop_end',start);
    if(start<0||end<0)throw Error('Version de shader Three incompatible');
    chunk=chunk.slice(0,end)+'\n\t\t}'+chunk.slice(end);
    chunk=chunk.replace(token,token+`\n\t\tif (any(greaterThan(${name}Light.color, vec3(0.0)))) {`);
  }
  return chunk;
}

export function installStableLightShaders(root){
  const chunk=stableLightChunk(),materials=new Set();
  root.traverse(o=>{for(const m of [].concat(o.material||[]))if(m.isMeshStandardMaterial||m.isMeshPhysicalMaterial)materials.add(m);});
  for(const material of materials){
    if(material.userData.stableLightShader)continue;
    const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
    material.onBeforeCompile=function(shader,renderer){
      previous.call(this,shader,renderer);
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',chunk);
    };
    material.customProgramCacheKey=()=>key+'|stable-light-uniforms-v1';
    material.userData.stableLightShader=true;material.needsUpdate=true;
  }
}
