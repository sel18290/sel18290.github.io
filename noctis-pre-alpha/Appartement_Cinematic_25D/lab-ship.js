import * as T from '../vendor/three.module.js';

function hullGeometry(sections){
 const section=[[-.64,-1],[.64,-1],[1,-.52],[1,.42],[.55,1],[-.55,1],[-1,.42],[-1,-.52]];
 const vertices=[];
 for(const [x,y,z,halfWidth,halfHeight] of sections){
  for(const [w,h] of section)vertices.push(x,y+h*halfHeight,z+w*halfWidth);
 }
 const indices=[],stride=section.length;
 for(let s=0;s<sections.length-1;s++){
  for(let i=0;i<stride;i++){
   const a=s*stride+i,b=s*stride+(i+1)%stride;
   indices.push(a,a+stride,b,b,a+stride,b+stride);
  }
 }
 const end=(sections.length-1)*stride;
 for(let i=1;i<stride-1;i++)indices.push(0,i,i+1,end,end+i+1,end+i);
 const indexed=new T.BufferGeometry();
 indexed.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 indexed.setIndex(indices);
 const geometry=indexed.toNonIndexed();
 indexed.dispose();
 geometry.computeVertexNormals();
 const point=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),uv=[];
 for(let i=0;i<point.count;i++){
  const across=Math.abs(normal.getY(i))>.63?point.getZ(i):point.getY(i);
  const lengthwise=Math.abs(normal.getX(i))>.8?point.getZ(i):point.getX(i);
  uv.push(lengthwise*.21,(Math.abs(normal.getX(i))>.8?point.getY(i):across)*.41);
 }
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 return geometry;
}

function paintTexture(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#d6dce0';ctx.fillRect(0,0,512,256);
 let seed=401773;
 const random=()=>{
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  return seed/4294967296;
 };
 for(const [x,y,w,h,tone] of [
  [0,0,313,145,'#e4e7e6'],[315,0,197,145,'#c6cfd4'],
  [0,147,197,109,'#cfd6d9'],[199,147,313,109,'#dee2e1']
 ]){
  ctx.fillStyle=tone;ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#6d7b83';ctx.lineWidth=2.7;ctx.strokeRect(x,y,w,h);
  ctx.strokeStyle='#f8f8f3';ctx.lineWidth=1.6;ctx.strokeRect(x+3,y+3,w-6,h-6);
  ctx.fillStyle='#747f83';
  for(const cx of [x+12,x+w-12])for(const cy of [y+12,y+h-12]){
   ctx.beginPath();ctx.arc(cx,cy,2.55,0,Math.PI*2);ctx.fill();
  }
 }
 ctx.fillStyle='rgba(117,130,137,.19)';
 for(let n=0;n<3300;n++){
  const x=random()*512,y=random()*256;
  ctx.fillRect(x,y,random()*3.3+.2,random()*.85+.15);
 }
 ctx.fillStyle='rgba(60,72,79,.13)';
 for(let n=0;n<160;n++)ctx.fillRect(random()*512,random()*256,random()*17+2,.75);
 const texture=new T.CanvasTexture(canvas);
 texture.colorSpace=T.SRGBColorSpace;
 texture.wrapS=texture.wrapT=T.RepeatWrapping;
 texture.anisotropy=6;
 return texture;
}

function registrationTexture(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#2d3640';ctx.fillRect(11,30,15,67);
 ctx.font='bold 67px sans-serif';ctx.fillText('NOCTIS  /  07',48,86);
 ctx.fillStyle='#c85239';ctx.fillRect(50,103,238,6);
 const texture=new T.CanvasTexture(canvas);
 texture.colorSpace=T.SRGBColorSpace;
 texture.anisotropy=4;
 return texture;
}

export function buildDockedShip(group,finish){
 const pivot=new T.Group(),geometryGroup=new T.Group();
 const center=1.2,centerX=49.4;
 geometryGroup.position.set(-centerX,0,-center);
 pivot.position.set(centerX,0,center);
 pivot.add(geometryGroup);
 group.add(pivot);
 const paint=paintTexture(),registration=registrationTexture();
 const shell=new T.MeshPhysicalMaterial({
  color:0xf2f2ed,map:paint,normalMap:finish.wall.normalMap,normalScale:new T.Vector2(.58,.58),
  roughnessMap:finish.wall.roughnessMap,roughness:.54,metalness:.21,clearcoat:.26,clearcoatRoughness:.34
 });
 const trim=new T.MeshStandardMaterial({color:0xc94f37,map:paint,roughness:.43,metalness:.23});
 const metal=new T.MeshStandardMaterial({color:0x68757d,map:paint,roughness:.35,metalness:.52});
 const black=finish.gasket;
 const glass=new T.MeshPhysicalMaterial({
  color:0x285777,metalness:.25,roughness:.15,clearcoat:.78,
  emissive:0x102f47,emissiveIntensity:.4
 });
 const thrust=new T.MeshBasicMaterial({color:0x86dfff});
 const thrustCore=new T.MeshBasicMaterial({color:0xe0faff});
 const running=new T.MeshBasicMaterial({color:0xffb95e});
 const marking=new T.MeshBasicMaterial({map:registration,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3});
 function mesh(geometry,material,x=0,y=0,z=0){
  const object=new T.Mesh(geometry,material);
  object.position.set(x,y,z);geometryGroup.add(object);return object;
 }
 function box(w,h,d,x,y,z,material){
  return mesh(new T.BoxGeometry(w,h,d),material,x,y,z);
 }
 const shadowMaterial=new T.ShaderMaterial({
  transparent:true,depthWrite:false,
  vertexShader:`varying vec2 coord;void main(){coord=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  uniforms:{ink:{value:.42}},
  fragmentShader:`varying vec2 coord;uniform float ink;void main(){float d=length((coord-.5)*2.);gl_FragColor=vec4(.018,.023,.033,ink*pow(max(0.,1.-d*d),2.));}`
 });
 const shadow=mesh(new T.PlaneGeometry(25,16),shadowMaterial,50,-4.476,1.2);
 shadow.rotation.x=-Math.PI/2;
 group.add(shadow);
 mesh(hullGeometry([
  [39.9,-1.7,center,.30,.24],[42,-1.5,center,1.40,.52],[45,-1.36,center,1.96,.75],
  [49,-1.24,center,2.51,1.08],[55.2,-1.15,center,2.38,1.30],[58.5,-1.31,center,1.59,.89]
 ]),shell);
 mesh(hullGeometry([
  [42.6,-.90,center,.55,.10],[44.8,-.45,center,.94,.35],[47.6,-.11,center,1.32,.61],
  [50.3,-.10,center,1.49,.57],[51.5,-.39,center,1.36,.35]
 ]),glass);
 mesh(hullGeometry([
  [40.6,-1.45,center,.50,.09],[43.5,-1.05,center,.75,.11],[45.3,-.66,center,.99,.13]
 ]),trim);
 for(const side of [-1,1]){
  const z=d=>center+side*d;
  mesh(hullGeometry([
   [46.8,-1.50,z(1.70),.82,.26],[49.2,-1.54,z(3.87),2.68,.33],
   [54.3,-1.46,z(4.13),2.92,.39],[58.3,-1.43,z(5.02),2.04,.28]
  ]),shell);
  mesh(hullGeometry([
   [49.9,-1.18,z(3.85),1.30,.09],[52.7,-1.05,z(4.20),1.60,.12],[57.7,-1.11,z(4.98),1.12,.09]
  ]),trim);
  const skirt=hullGeometry([[42.5,-1.69,z(1.30),.11,.13],[48,-1.43,z(2.24),.2,.18],[55,-1.36,z(2.40),.19,.18],[58.2,-1.52,z(1.62),.13,.12]]);
  mesh(skirt,metal);
  const glassFrame=new T.CatmullRomCurve3([
   [42.8,-.81,z(.41)],[45,-.46,z(1.02)],[47.65,.24,z(1.13)],[50.2,.19,z(1.33)],[51.5,-.28,z(1.18)]
  ].map(point=>new T.Vector3(...point)));
  mesh(new T.TubeGeometry(glassFrame,22,.052,6,false),metal);
  const intake=mesh(new T.CylinderGeometry(.85,.95,4.28,24),metal,55.40,-1.14,z(4.18));
  intake.rotation.z=-Math.PI/2;
  for(const [x,radius,thickness,material] of [[53.24,.77,.14,shell],[53.36,.63,.095,black],[56.55,.80,.12,black],[57.57,.70,.13,metal],[57.65,.56,.045,thrust]]){
   mesh(new T.TorusGeometry(radius,thickness,9,32),material,x,-1.14,z(4.18)).rotation.y=Math.PI/2;
  }
  mesh(new T.CircleGeometry(.575,28),black,53.21,-1.14,z(4.18)).rotation.y=-Math.PI/2;
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4;
   const blade=box(.15,.41,.07,53.18,-1.14+Math.sin(a)*.24,z(4.18)+Math.cos(a)*.24,metal);
   blade.rotation.x=Math.PI/2-a+.31;
  }
  mesh(new T.CircleGeometry(.47,28),thrust,57.61,-1.14,z(4.18)).rotation.y=Math.PI/2;
  mesh(new T.TorusGeometry(.32,.042,8,24),thrustCore,57.67,-1.14,z(4.18)).rotation.y=Math.PI/2;
  box(.33,.085,.20,49.85,-1.62,z(6.4),side<0?running:thrust);
  const number=mesh(new T.PlaneGeometry(1.93,.49),marking,47.36,-1.06,z(2.03));
  number.rotation.y=side===1?0:Math.PI;
  for(const x of [45.9,54.3]){
   const strut=mesh(new T.CylinderGeometry(.19,.28,1.91,14),metal,x,-3.20,z(1.25));
   strut.rotation.x=side*.19;
   box(1.14,.23,.63,x,-4.35,z(1.43),black);
   box(.87,.12,.59,x,-4.20,z(1.43),metal);
  }
  for(let i=0;i<6;i++)box(.092,.049,.48,54.1+i*.36,-.88,z(2.72),black);
  for(let i=0;i<4;i++)box(.093,.067,.51, 55.1+i*.28,-.75,z(4.85),black);
 }
 return {
  move(lift,turn,travel,ignition){
   pivot.position.set(centerX+travel,lift,center);
   pivot.rotation.y=turn;
   shadow.position.x=50+travel;
   shadowMaterial.uniforms.ink.value=.42*(1-.78*Math.min(1,lift/3.45));
   thrustCore.color.setRGB(.745+ignition*.65,.956+ignition*.4,1+ignition*.72);
  },
  dispose(){paint.dispose();registration.dispose();}
 };
}
