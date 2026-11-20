import * as T from '../vendor/three.module.js';
import {worldScale} from './lab-layout.js?v=5';

const beamVertex=`
 varying vec2 beam;
 varying vec3 viewRay,beamNormal;
 void main(){
  beam=uv;
  vec4 viewPosition=modelViewMatrix*vec4(position,1.);
  viewRay=-viewPosition.xyz;
  beamNormal=normalMatrix*normal;
  gl_Position=projectionMatrix*viewPosition;
 }`;
const beamFragment=`
 uniform vec3 tint;
 uniform float strength;
 varying vec2 beam;
 varying vec3 viewRay,beamNormal;
 void main(){
  float haze=smoothstep(0.,.35,beam.y)*(1.-smoothstep(.73,1.,beam.y));
  float feather=smoothstep(.025,.62,abs(dot(normalize(beamNormal),normalize(viewRay))));
  gl_FragColor=vec4(tint,strength*haze*feather);
  #include <colorspace_fragment>
 }`;

export function mountProjectors(scene){
 const housing=new T.CylinderGeometry(.27,.36,.56,18);
 const lens=new T.CylinderGeometry(.25,.25,.035,18);
 const bracket=new T.CylinderGeometry(.063,.086,1.75,12);
 const black=new T.MeshStandardMaterial({
  color:0x090909,roughness:.30,metalness:.3
 });
 const axis=new T.Vector3(0,1,0);
 const red=0xff1846,blue=0x3b6cff;
 const spots=[
  [[-5.25,5.55,-4.65],red,3.0,1020],
  [[5.25,5.55,4.65],blue,3.8,1280],
  [[-5.25,5.55,4.65],blue,4.55,1270],
  [[5.25,5.55,-4.65],red,5.35,1040]
 ].map(([origin,color,delay,power])=>{
  const source=new T.Vector3(...origin),target=new T.Vector3(0,-.10,0);
  const offset=source.clone().sub(target),length=offset.length();
  const orient=new T.Quaternion().setFromUnitVectors(axis,offset.normalize());
  const mount=new T.Group();
  mount.position.copy(source);mount.quaternion.copy(orient);
  const tube=new T.Mesh(housing,black);
  const bulbMaterial=new T.MeshBasicMaterial({color:0x141414});
  const bulb=new T.Mesh(lens,bulbMaterial);
  bulb.position.y=-.289;
  mount.add(tube,bulb);
  const stem=new T.Mesh(bracket,black);
  stem.position.copy(source);stem.position.y+=.87;
  scene.add(mount,stem);

  const spot=new T.SpotLight(color,0,23*worldScale,.36,.65,2);
  spot.position.copy(source).addScaledVector(offset,-.32);
  spot.target.position.copy(target);
  scene.add(spot,spot.target);

  const beamMaterial=new T.ShaderMaterial({
   vertexShader:beamVertex,fragmentShader:beamFragment,transparent:true,
   blending:T.AdditiveBlending,depthWrite:false,
   uniforms:{tint:{value:new T.Color(color)},strength:{value:0}}
  });
  const beam=new T.Mesh(new T.CylinderGeometry(.10,2.35,length,24,1,true),beamMaterial);
  beam.renderOrder=7;
  beam.quaternion.copy(orient);
  scene.add(beam);
  return {spot,beam,beamMaterial,bulbMaterial,source,offset,length,delay,power,tint:new T.Color(color)};
 });
 const off=new T.Color(0x141414);
 return (time,roomLight)=>{
  for(const {spot,beam,beamMaterial,bulbMaterial,source,offset,length,delay,power,tint} of spots){
   const glow=T.MathUtils.smoothstep(time,delay,delay+.75);
   const reach=T.MathUtils.smoothstep(time,delay+.08,delay+1.22);
   spot.intensity=power*worldScale**2*reach*(1-.25*roomLight);
   beam.visible=reach>.001;
   beam.scale.set(reach,reach,reach);
   beam.position.copy(source).addScaledVector(offset,-reach*length/2);
   beamMaterial.uniforms.strength.value=glow*(.115-.025*roomLight);
   bulbMaterial.color.copy(off).lerp(tint,glow);
  }
 };
}
