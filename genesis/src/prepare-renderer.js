import * as T from 'three';
import {installStableLightShaders} from './stable-light-shaders.js';

export async function prepareRenderer(renderer,scene,camera,{signal,stableLights=true,yieldFrame=()=>new Promise(requestAnimationFrame)}={}){
  const check=()=>{if(signal?.aborted)throw new DOMException('Chargement interrompu','AbortError');};
  check();if(stableLights)installStableLightShaders(scene);
  const textures=new Set();scene.traverseVisible(o=>{for(const m of [].concat(o.material||[]))for(const v of Object.values(m))if(v?.isTexture)textures.add(v);});
  let uploaded=0;
  for(const texture of textures){check();renderer.initTexture(texture);if(++uploaded%4===0)await yieldFrame();}
  check();await renderer.compileAsync(scene,camera);check();
  const viewport=renderer.getViewport(new T.Vector4()),ratio=renderer.getPixelRatio();
  const spark=scene.getObjectByName('genesis-spark'),sparkVisible=spark?.visible;
  const shadowAuto=renderer.shadowMap.autoUpdate;
  const warmCamera=new T.PerspectiveCamera(90,1,camera.near,camera.far);warmCamera.position.copy(camera.position);
  const directions=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]],target=new T.Vector3();
  try{
    if(spark)spark.visible=false; // do not launch six splat sorts for dummy views
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    renderer.setViewport(0,0,64/ratio,64/ratio);
    for(const direction of directions){
      check();warmCamera.lookAt(target.copy(warmCamera.position).add(new T.Vector3(...direction)));
      renderer.render(scene,warmCamera);await yieldFrame();
    }
  }finally{
    renderer.setViewport(viewport);renderer.shadowMap.autoUpdate=shadowAuto;if(spark)spark.visible=sparkVisible;
  }
  check();
}
