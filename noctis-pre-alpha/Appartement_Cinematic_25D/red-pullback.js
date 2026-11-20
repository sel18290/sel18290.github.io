import * as T from '../vendor/three.module.js';

const vertexShader=`
 varying vec2 frame;
 void main(){
  frame=uv*2.-1.;
  gl_Position=vec4(position.xy,0.,1.);
 }`;

const fragmentShader=`
 uniform samplerCube panorama;
 uniform mat3 liveRotation, panoramaRotation;
 uniform vec3 eye;
 uniform vec2 lens, introLens;
 uniform float retreat,join,fade;
 varying vec2 frame;

 void main(){
  float sides=smoothstep(.25,1.,abs(frame.x));
  vec2 stretched=frame;
  stretched.x*=1.-.25*sides*retreat;
  stretched.y*=1.-.10*sides*retreat;
  vec3 ray=normalize(panoramaRotation*vec3(stretched*introLens,-1.));
  vec3 picture=textureCube(panorama,ray).rgb;

  // The original image converges on the actual reactor panel's plane.
  vec3 sight=liveRotation*vec3(frame*lens,-1.);
  float distanceToScreen=max(.025,-2.103-eye.x);
  vec2 region=(eye+sight*distanceToScreen/max(.035,sight.x)).zy/1.97;
  float edge=max(abs(region.x),abs(region.y));
  vec3 panelRay=normalize(vec3(1.,region.y*.935,region.x*.935));
  vec3 panel=textureCube(panorama,panelRay).rgb;
  vec3 color=mix(picture,panel,join*(1.-smoothstep(1.,1.62,edge)));

  float bands=.23+.77*pow(.5+.5*sin(frame.y*63.+6.*sin(frame.y*8.)+abs(frame.x)*5.),7.);
  float spill=sides*bands*retreat*(1.-fade);
  color+=vec3(.88,.034,.006)*spill*.66;
  float aperture=1.-smoothstep(1.-.14*(1.-join),1.+.27*(1.-join)+.016,edge);
  float redTrail=(1.-smoothstep(1.,4.3,edge))*spill;
  float mask=mix(1.,max(aperture,redTrail*.58),retreat);
  gl_FragColor=vec4(color,mask*(1.-fade));
  #include <colorspace_fragment>
 }`;

export function createRedPullback(panorama){
 const scene=new T.Scene();
 const geometry=new T.PlaneGeometry(2,2);
 const rotationMatrix=new T.Matrix4();
 const start=new T.Quaternion(),center=new T.Quaternion(),view=new T.Quaternion();
 center.setFromAxisAngle(new T.Vector3(0,1,0),-Math.PI/2);
 const uniforms={
  panorama:{value:panorama},liveRotation:{value:new T.Matrix3()},
  panoramaRotation:{value:new T.Matrix3()},eye:{value:new T.Vector3()},
  lens:{value:new T.Vector2()},introLens:{value:new T.Vector2()},
  retreat:{value:0},join:{value:0},fade:{value:0}
 };
 const material=new T.ShaderMaterial({
  vertexShader,fragmentShader,uniforms,transparent:true,toneMapped:false,
  depthTest:false,depthWrite:false
 });
 const screen=new T.Mesh(geometry,material);
 screen.frustumCulled=false;
 scene.add(screen);
 const smooth=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);

 return {
  begin(camera){start.copy(camera.quaternion);},
  render(renderer,camera,time,startFov){
   if(time>=5.1)return;
   const join=smooth(1.35,4.5,time);
   const introFov=T.MathUtils.lerp(startFov,99,smooth(0,3.45,time));
   const scale=Math.tan(T.MathUtils.degToRad(introFov)/2);
   const liveScale=Math.tan(T.MathUtils.degToRad(camera.fov)/2);
   uniforms.introLens.value.set(scale*camera.aspect,scale);
   uniforms.lens.value.set(liveScale*camera.aspect,liveScale);
   uniforms.eye.value.copy(camera.position);
   uniforms.retreat.value=smooth(1.25,4.0,time);
   uniforms.join.value=join;
   uniforms.fade.value=smooth(4.35,5.1,time);
   view.slerpQuaternions(start,center,smooth(.30,2.75,time));
   uniforms.panoramaRotation.value.setFromMatrix4(rotationMatrix.makeRotationFromQuaternion(view));
   uniforms.liveRotation.value.setFromMatrix4(rotationMatrix.makeRotationFromQuaternion(camera.quaternion));
   const autoClear=renderer.autoClear;
   renderer.autoClear=false;
   try{renderer.render(scene,camera);}
   finally{renderer.autoClear=autoClear;}
  },
  dispose(){geometry.dispose();material.dispose();}
 };
}
