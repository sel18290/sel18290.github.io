import * as T from '../vendor/three.module.js';

// Order matches the physical mounts. The upper face is a ceramic cap.
const roomAssets={
 N1:'./assets/chambre-360.png',
 N2:'./assets/bureau-360.png'
};
export const faceSubjects=[
 {room:'N1',view:[.16,.54,.76]},
 {room:'N3'},
 null,
 {room:'N2',view:[.83,.53,.80]},
 {room:'N1',view:[.49,.49,1]},
 {room:'N2',view:[.50,.50,.95]}
];

const vertexShader=`
 varying vec2 frame;
 void main(){
  frame=uv;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
 }`;

const fragmentShader=`
 uniform sampler2D panorama;
 uniform samplerCube reactor;
 uniform vec3 crop;
 uniform float build;
 uniform bool isReactor;
 varying vec2 frame;

 vec3 viewRay(vec2 p){
  float longitude=(crop.x-.5)*6.2831853;
  float latitude=(.5-crop.y)*3.14159265;
  vec3 forward=vec3(cos(longitude)*cos(latitude),sin(latitude),sin(longitude)*cos(latitude));
  vec3 right=normalize(cross(forward,vec3(0.,1.,0.)));
  return normalize(forward+(right*p.x+cross(right,forward)*p.y)*crop.z);
 }
 void main(){
  vec2 tile=floor(frame*17.);
  float grain=fract(sin(dot(tile,vec2(27.17,79.17)))*3271.9);
  float threshold=grain*.21+(1.-frame.y)*.69;
  if(build<threshold||build<=0.)discard;
  vec3 ray=viewRay(frame-.5);
  vec2 uv=vec2(fract(atan(ray.z,ray.x)/6.2831853+.5),asin(ray.y)/3.14159265+.5);
  vec3 image=isReactor?textureCube(reactor,ray).rgb:texture2D(panorama,uv).rgb;
  vec2 margin=min(frame,1.-frame);
  float border=1.-smoothstep(.0015,.005,min(margin.x,margin.y));
  float front=(1.-smoothstep(.012,.085,abs(build-threshold)))*(1.-smoothstep(.88,.98,build));
  gl_FragColor=vec4(image+vec3(.025,.80,.79)*(border*.64+front*.62),1.);
  #include <colorspace_fragment>
 }`;

export async function loadCubeFaces(reactor,anisotropy){
 const loader=new T.TextureLoader();
 const textures=new Map();
 const settled=await Promise.allSettled(Object.entries(roomAssets).map(async ([room,url])=>{
  const texture=await loader.loadAsync(url);
  texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=anisotropy;
  textures.set(room,texture);
 }));
 const dispose=()=>{for(const texture of textures.values())texture.dispose();};
 const failure=settled.find(result=>result.status==='rejected');
 if(failure){dispose();throw failure.reason;}
 const materials=faceSubjects.map(subject=>subject&&new T.ShaderMaterial({
  vertexShader,fragmentShader,toneMapped:false,
  uniforms:{
   reactor:{value:reactor},
   panorama:{value:textures.get(subject.room)||null},
   crop:{value:new T.Vector3(...(subject.view||[.5,.5,1.87]))},
   isReactor:{value:subject.room==='N3'},
   build:{value:0}
  }
 }));
 return {materials,dispose};
}
