import * as T from '../vendor/three.module.js';

const backdropVertex=`
 varying vec2 field;
 void main(){
  field=uv;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
 }`;
const backdropFragment=`
 varying vec2 field;
 uniform float time;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){
  vec2 cell=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(hash(cell),hash(cell+vec2(1,0)),f.x),
             mix(hash(cell+vec2(0,1)),hash(cell+vec2(1,1)),f.x),f.y);
 }
 void main(){
  vec2 uv=field-.5;
  uv.x+=time*.00011;
  vec2 p=uv*vec2(9.,9.);
  float dust=noise(p)*.57+noise(p*2.12)*.29+noise(p*4.17)*.14;
  float ridge=exp(-6.0*abs(uv.y-.16+.42*uv.x+.13*(dust-.5)));
  float veil=smoothstep(.23,.77,dust)*ridge;
  float glow=exp(-9.*length((uv-vec2(.12,.12))*vec2(.83,1.)));
  vec3 color=vec3(.0018,.0031,.0095);
  color+=vec3(.015,.033,.078)*veil+vec3(.057,.026,.071)*pow(veil,2.);
  color+=glow*vec3(.012,.012,.022);
  gl_FragColor=vec4(color,1.);
  #include <colorspace_fragment>
 }`;
const starVertex=`
 uniform float time, pixelRatio;
 attribute vec3 tint;
 attribute vec3 sparkle;
 varying vec3 starTint;
 varying float light;
 varying float flare;
 void main(){
  starTint=tint;
  light=sparkle.y*(.82+.18*sin(time*(.36+sparkle.y)+sparkle.z));
  flare=smoothstep(6.5,10.0,sparkle.x);
  vec4 view=modelViewMatrix*vec4(position,1.);
  gl_PointSize=sparkle.x*pixelRatio*clamp(29./max(-view.z,1.),.65,1.32);
  gl_Position=projectionMatrix*view;
 }`;
const starFragment=`
 varying vec3 starTint;
 varying float light,flare;
 void main(){
  vec2 p=gl_PointCoord*2.-1.;
  float r=length(p);
  float core=exp(-r*r*19.);
  float halo=exp(-r*r*4.9)*.28;
  float crossHair=exp(-min(abs(p.x),abs(p.y))*29.)*(1.-smoothstep(.12,.94,r))*flare*.30;
  float alpha=(core+halo+crossHair)*(1.-smoothstep(.68,1.,r))*light;
  gl_FragColor=vec4(starTint,alpha);
  #include <colorspace_fragment>
 }`;
const marsVertex=`
 varying vec2 surface;
 varying vec3 worldPoint, worldNormal;
 void main(){
  surface=uv;
  vec4 world=modelMatrix*vec4(position,1.);
  worldPoint=world.xyz;
  worldNormal=mat3(modelMatrix)*normal;
  gl_Position=projectionMatrix*viewMatrix*world;
 }`;
const marsFragment=`
 uniform sampler2D marsMap;
 varying vec2 surface;
 varying vec3 worldPoint,worldNormal;
 void main(){
  vec3 n=normalize(worldNormal);
  vec3 eye=normalize(cameraPosition-worldPoint);
  vec3 sun=normalize(vec3(-.57,.70,.43));
  float day=smoothstep(-.12,.77,dot(n,sun));
  float rim=pow(1.-max(0.,dot(n,eye)),4.6);
  vec3 albedo=texture2D(marsMap,surface).rgb;
  vec3 color=albedo*(.055+day*1.4)*vec3(1.13,.92,.78);
  color+=vec3(.38,.125,.047)*rim*(.12+.63*day);
  gl_FragColor=vec4(color,1.);
  #include <colorspace_fragment>
 }`;

export function mountOrbitalSky(group,end,marsMap,mobile,pixelRatio){
 const skyTime={value:0};
 const backdrop=new T.Mesh(new T.PlaneGeometry(685,430),new T.ShaderMaterial({
  uniforms:{time:skyTime},vertexShader:backdropVertex,fragmentShader:backdropFragment,toneMapped:false
 }));
 backdrop.position.set(end+295,4,0);
 backdrop.rotation.y=-Math.PI/2;
 group.add(backdrop);
 let seed=82991;
 const random=()=>{
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  return seed/4294967296;
 };
 const positions=[],tints=[],sparkles=[];
 const palette=[new T.Color(0xe7f3ff),new T.Color(0x9abcdc),new T.Color(0xffce9e),new T.Color(0xf9f2e5)];
 for(let i=0;i<(mobile?1620:2470);i++){
  const rank=random();
  const bright=rank>.978;
  const color=palette[Math.floor(random()*palette.length)];
  positions.push(end+222+random()*68,random()*298-115,random()*467-233.5);
  tints.push(color.r,color.g,color.b);
  sparkles.push(bright?6.8+random()*5.0:1.25+rank*rank*3.9,
   bright?1.13:.40+rank*.55,random()*Math.PI*2);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('tint',new T.Float32BufferAttribute(tints,3));
 geometry.setAttribute('sparkle',new T.Float32BufferAttribute(sparkles,3));
 const stars=new T.Points(geometry,new T.ShaderMaterial({
  uniforms:{time:skyTime,pixelRatio:{value:Math.min(1.6,pixelRatio)}},
  vertexShader:starVertex,fragmentShader:starFragment,transparent:true,
  depthWrite:false,blending:T.AdditiveBlending,toneMapped:false
 }));
 group.add(stars);

 const mars=new T.Mesh(new T.SphereGeometry(19.6,mobile?40:64,mobile?28:44),new T.ShaderMaterial({
  uniforms:{marsMap:{value:marsMap}},vertexShader:marsVertex,fragmentShader:marsFragment,toneMapped:false
 }));
 mars.position.set(end+174,15.8,-27.9);
 mars.rotation.z=.24;
 group.add(mars);
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 return time=>{
  skyTime.value=reducedMotion?0:time;
  mars.rotation.y=.34+(reducedMotion?0:time*.008);
 };
}
