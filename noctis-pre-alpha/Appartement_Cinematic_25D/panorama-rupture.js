import * as T from '../vendor/three.module.js';

const vertexShader=`
 varying vec2 frame;
 void main(){
  frame=uv;
  gl_Position=vec4(position.xy,0.,1.);
 }`;

const fragmentShader=`
 uniform samplerCube panorama;
 uniform mat3 panoramaRotation;
 uniform vec2 lens;
 uniform float time,tear,spread;
 varying vec2 frame;

 float hash(vec2 p){
  return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));
 }
 void main(){
  vec2 p=frame*2.-1.;
  vec2 count=vec2(46.,29.);
  vec2 cell=floor(frame*count), tile=fract(frame*count);
  float variation=hash(cell);
  vec2 center=(cell+.5)/count*2.-1.;
  float distanceFromCenter=length(center*vec2(.73,1.0));
  float opening=spread*1.78-distanceFromCenter-(variation-.5)*.31;
  float missing=smoothstep(-.09,.07,opening);
  float seam=(1.-smoothstep(.04,.27,abs(opening)))*tear;
  float row=hash(vec2(cell.y,9.))-.5;
  vec2 shifted=p+vec2(row*.11*seam,(variation-.5)*.036*seam);
  vec3 d=normalize(panoramaRotation*vec3(shifted*lens,-1.));
  vec3 image=textureCube(panorama,d).rgb;
  float line=1.-smoothstep(.02,.12,min(tile.x,tile.y));
  float pulse=.68+.32*sin(time*5.+cell.y*.35);
  vec3 teal=vec3(.02,.88,.79);
  image=mix(image,vec3(dot(image,vec3(.23,.59,.18)))*vec3(.22,.85,.78),.62*tear);
  image*=1.-.68*tear*(.40+.60*variation);
  image+=teal*(line*.31*tear+seam*.52)*pulse;
  gl_FragColor=vec4(image,1.-missing);
  #include <colorspace_fragment>
 }`;

export function createPanoramaRupture(panorama){
 const scene=new T.Scene();
 const geometry=new T.PlaneGeometry(2,2);
 const rotationMatrix=new T.Matrix4();
 const uniforms={
  panorama:{value:panorama},panoramaRotation:{value:new T.Matrix3()},
  lens:{value:new T.Vector2()},time:{value:0},tear:{value:0},spread:{value:0}
 };
 const material=new T.ShaderMaterial({
  vertexShader,fragmentShader,uniforms,transparent:true,toneMapped:false,
  depthTest:false,depthWrite:false
 });
 const screen=new T.Mesh(geometry,material);
 screen.frustumCulled=false;
 scene.add(screen);

 return {
  begin(camera){
   uniforms.panoramaRotation.value.setFromMatrix4(rotationMatrix.makeRotationFromQuaternion(camera.quaternion));
  },
  render(renderer,camera,time,startFov){
   if(time>=4.1)return;
   const fov=T.MathUtils.degToRad(startFov);
   const scale=Math.tan(fov/2);
   uniforms.lens.value.set(scale*camera.aspect,scale);
   uniforms.time.value=time;
   uniforms.tear.value=T.MathUtils.smoothstep(time,.25,1.48);
   uniforms.spread.value=T.MathUtils.smoothstep(time,1.36,4.04)
    - .26*(1-T.MathUtils.smoothstep(time,1.36,1.68));
   const autoClear=renderer.autoClear;
   renderer.autoClear=false;
   try{renderer.render(scene,camera);}
   finally{renderer.autoClear=autoClear;}
  },
  dispose(){geometry.dispose();material.dispose();}
 };
}
