import * as T from 'three';

// A finite point light cannot affect a visible fragment if its entire influence
// sphere is outside the camera frustum. Keep every intersecting light, no top-N cap.
export function createLightCuller(lights,{intensity}={}){
  const frustum=new T.Frustum(),projection=new T.Matrix4(),sphere=new T.Sphere();
  const original=new Map(lights.map(light=>[light,light.intensity]));let activeCount=lights.length;
  const update=camera=>{
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    let active=0;
    for(const light of lights){
      light.getWorldPosition(sphere.center);sphere.radius=light.distance;
      const activeLight=light.distance<=0||frustum.intersectsSphere(sphere);
      // Three bakes light COUNTS into shader keys. Never toggle visibility here:
      // update a uniform, keeping the same shader while the camera turns.
      light.visible=true;light.intensity=activeLight?(intensity?intensity(light):original.get(light)):0;
      if(activeLight)active++;
    }
    activeCount=active;
    return active;
  };
  Object.defineProperty(update,'activeLights',{get:()=>activeCount});return update;
}
