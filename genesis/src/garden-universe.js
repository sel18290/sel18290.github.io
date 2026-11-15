import * as T from 'three';
import {createLightCuller} from './light-culling.js';

// Seamless directional radiance: the same sky supplies the panorama and PMREM
// reflections. Stars are a full sphere, not a hemisphere or camera-facing card.
const noiseGrid=new Float32Array(32*32*32);
let noiseSeed=60603;for(let i=0;i<noiseGrid.length;i++){noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;noiseGrid[i]=noiseSeed/4294967296;}
function noise(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let u=x-ix,v=y-iy,w=z-iz;
 u=u*u*(3-2*u);v=v*v*(3-2*v);w=w*w*(3-2*w);
 const at=(a,b,c)=>noiseGrid[((c&31)*32+(b&31))*32+(a&31)];
 const mix=(a,b,t)=>a+(b-a)*t;
 return mix(mix(mix(at(ix,iy,iz),at(ix+1,iy,iz),u),mix(at(ix,iy+1,iz),at(ix+1,iy+1,iz),u),v),
            mix(mix(at(ix,iy,iz+1),at(ix+1,iy,iz+1),u),mix(at(ix,iy+1,iz+1),at(ix+1,iy+1,iz+1),u),v),w);
}
export function universeRadiance(x,y,z){
 const n=noise(x*5+12,y*5+6,z*5+10),detail=noise(x*17+8,y*17+3,z*17+5);
 const fine=noise(x*51,y*51,z*51),warp=(n-.5)*.37;
 const band=Math.exp(-Math.pow((y*.79+x*.31+z*.47+warp)/.25,2));
 const secondary=Math.exp(-Math.pow((y*.4-x*.65+z*.15-warp*.6)/.20,2))*.28;
 const density=(band+secondary)*(.18+.82*n)*( .3+.7*detail);
 const dust=Math.max(.12,Math.min(1,(noise(x*9+4,y*9+3,z*9+8)-.23)*2.4));
 const cloud=density*dust;
 const filament=density*Math.pow(1-Math.abs(fine*2-1),8)*.35;
 const lobe=Math.exp(-((x+.58)**2+(y-.40)**2+(z+.71)**2)*15);
 const star=Math.exp((x*-.5307+y*.6755+z*-.5126-1)*4500);
 return [.002+cloud*.09+filament*.09+lobe*.035+star*18,
         .004+cloud*.28+filament*.26+lobe*.16+star*23,
         .014+cloud*.93+filament*.65+lobe*.60+star*32];
}
export function universeTexture(width=1024,height=512){
 const data=new Uint16Array(width*height*4);
 for(let j=0;j<height;j++){
  const theta=Math.PI*(1-j/(height-1)),sin=Math.sin(theta),y=Math.cos(theta);
  for(let i=0;i<width;i++){
   const phi=(i/(width-1)-.5)*Math.PI*2;
   const rgb=universeRadiance(Math.cos(phi)*sin,y,Math.sin(phi)*sin),k=(j*width+i)*4;
   for(let c=0;c<3;c++)data[k+c]=T.DataUtils.toHalfFloat(rgb[c]);data[k+3]=T.DataUtils.toHalfFloat(1);
  }
 }
 const texture=new T.DataTexture(data,width,height,T.RGBAFormat,T.HalfFloatType);
 texture.mapping=T.EquirectangularReflectionMapping;texture.colorSpace=T.LinearSRGBColorSpace;
 texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;texture.name='N06 / Blue cosmic radiance';return texture;
}
export function starField(count=14000){
 let seed=6062024;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const positions=new Float32Array(count*3),colours=new Float32Array(count*3),sizes=new Float32Array(count);
 for(let i=0;i<count;i++){
  const y=random()*2-1,a=random()*Math.PI*2,s=Math.sqrt(1-y*y);
  positions.set([Math.cos(a)*s*470,y*470,Math.sin(a)*s*470],i*3);
  const rare=random(),b=.3+Math.pow(random(),4)*1.7;
  const color=rare<.12?[1,.72,.49]:rare<.50?[.65,.81,1]:[.92,.95,1];
  colours.set(color.map(c=>c*b),i*3);sizes[i]=rare<.008?5+random()*5:1.1+random()*2.1;
 }
 // Match the brightest blue star to the main directional light.
 positions.set([-.5307*470,.6755*470,-.5126*470],0);colours.set([2.3,2.9,4],0);sizes[0]=20;
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('color',new T.BufferAttribute(colours,3));g.setAttribute('starSize',new T.BufferAttribute(sizes,1));
 const m=new T.ShaderMaterial({uniforms:{pixelRatio:{value:1}},transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,
  vertexShader:`attribute float starSize;attribute vec3 color;varying vec3 vColor;uniform float pixelRatio;
   void main(){vColor=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=starSize*pixelRatio;}`,
  fragmentShader:`varying vec3 vColor;void main(){vec2 p=gl_PointCoord-.5;float r=length(p)*2.;if(r>1.)discard;
   float core=exp(-r*r*12.);float halo=exp(-r*r*4.)*.20;gl_FragColor=vec4(vColor,(core+halo)*smoothstep(1.,.65,r));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const stars=new T.Points(g,m);stars.name='N06 / Full-sphere stars';stars.frustumCulled=false;stars.renderOrder=-1000;return stars;
}
export function createGardenUniverse(scene,renderer){
 const texture=universeTexture(),generator=new T.PMREMGenerator(renderer);let reflection;
 try{reflection=generator.fromEquirectangular(texture);}catch(error){texture.dispose();throw error;}finally{generator.dispose();}
 const previous={background:scene.background,environment:scene.environment,backgroundIntensity:scene.backgroundIntensity,environmentIntensity:scene.environmentIntensity};
 scene.background=texture;scene.backgroundIntensity=.86;scene.environment=reflection.texture;scene.environmentIntensity=1.45;
 const stars=starField();scene.add(stars);let done=false;
 return {update(camera){stars.position.copy(camera.position);stars.material.uniforms.pixelRatio.value=renderer.getPixelRatio();},dispose(){if(done)return;done=true;
  stars.removeFromParent();stars.geometry.dispose();stars.material.dispose();texture.dispose();reflection.dispose();Object.assign(scene,previous);
 }};
}

// One shadow caster, plus local pools of light attached to visible luminaires.
export function createGardenLighting(scene,profile,{optimize=true,cullLights=optimize}={}){
 const root=new T.Group();root.name='N06 / Luminaires and blue starlight';scene.add(root);
 const geometries=new Set(),materials=new Set(),lamps=[];
 const hemi=new T.HemisphereLight(0x9dbdff,0x293244,.72);root.add(hemi);
 const moon=new T.DirectionalLight(0x9bbbff,2.8);moon.position.set(-22,28,-21.25);moon.castShadow=profile.shadows;
 moon.shadow.mapSize.set(profile.shadowSize,profile.shadowSize);Object.assign(moon.shadow.camera,{left:-36,right:36,top:36,bottom:-36,near:.5,far:110});moon.shadow.normalBias=.035;moon.shadow.bias=-.0001;root.add(moon);
 function luminaire(position,target,color,intensity,distance,angle,label){
  const light=new T.SpotLight(color,intensity,distance,angle,.65,2);light.position.fromArray(position);light.target.position.fromArray(target);root.add(light,light.target);
  const geometry=new T.CylinderGeometry(.43,.48,.10,32);geometries.add(geometry);
  const body=new T.MeshStandardMaterial({color:0x39454b,metalness:.7,roughness:.35});materials.add(body);
  const frame=new T.Mesh(geometry,body);frame.position.fromArray(position);root.add(frame);
  const glow=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2.5,roughness:.25});materials.add(glow);
  const discGeometry=new T.CircleGeometry(.37,32);geometries.add(discGeometry);
  const disc=new T.Mesh(discGeometry,glow);disc.position.fromArray(position);disc.position.y-=.058;disc.rotation.x=Math.PI/2;root.add(disc);
  light.name=label;lamps.push({light,glow,base:intensity,label});return light;
 }
 // Indirect light inside the shells reveals graphite panels and their seams.
 const roofBounce=new T.PointLight(0xc8daff,62,23,2);roofBounce.name='Central dome indirect fill';roofBounce.position.set(0,6.4,0);root.add(roofBounce);
 for(const [x,z,color] of [[-23,-4,0xffd4a3],[23,-4,0xffe3c3],[0,-25,0xc3dcff]]){
  const bounce=new T.PointLight(color,22,10,2);bounce.position.set(x,3.9,z);root.add(bounce);lamps.push({light:bounce,base:22,label:x<0?'rest':'roof-bounce'});
 }
 luminaire([0,8.55,0],[0,0,0],0xc8dcff,245,25,1.05,'garden');
 luminaire([-23,4.12,-4],[-23,0,-4],0xffcb8c,150,16,1.18,'rest');
 luminaire([23,4.12,-4],[23,0,-4],0xffe3ba,180,16,1.18,'meal');
 luminaire([0,4.12,-25],[0,0,-25],0xb9e1ff,185,16,1.18,'chrono');
 // Low grazing fixtures illuminate the soil and foliage, not just their own discs.
 for(const [x,z] of [[-8,7],[8,7],[-10,-9],[10,-9]]){
  const light=new T.PointLight(0xb7d9ff,10,4.6,2);light.position.set(x,.95,z+.6);root.add(light);lamps.push({light,base:10,label:'horticulture'});
  const housing=new T.Mesh(new T.CylinderGeometry(.055,.07,.33,12),new T.MeshStandardMaterial({color:0x53616b,metalness:.6,roughness:.4}));geometries.add(housing.geometry);materials.add(housing.material);housing.position.set(x,.72,z+.6);root.add(housing);
  const cap=new T.Mesh(new T.SphereGeometry(.06,12,6),new T.MeshStandardMaterial({color:0xc4deff,emissive:0x9ac6ff,emissiveIntensity:3}));geometries.add(cap.geometry);materials.add(cap.material);cap.position.copy(light.position);root.add(cap);
 }
 const finite=[];root.traverse(o=>{if(o.isPointLight||o.isSpotLight)finite.push(o);});
 const levels=new Map(finite.map(light=>[light,light.intensity]));const cull=createLightCuller(finite,{intensity:light=>levels.get(light)});
 if(optimize){moon.shadow.autoUpdate=false;moon.shadow.needsUpdate=true;}
 let done=false;
 return {root,get activeLights(){return cull.activeLights;},update(dt,state={},camera){if(done)return;dt=Math.max(0,Math.min(.05,dt));for(const lamp of lamps){
  const factor=lamp.label==='rest'&&state.rest?.28:(lamp.label==='garden'||lamp.label==='horticulture')&&state.light?.46:1;
  const level=T.MathUtils.damp(levels.get(lamp.light),lamp.base*factor,2.5,dt);levels.set(lamp.light,level);lamp.light.intensity=level;
  if(lamp.glow)lamp.glow.emissiveIntensity=1.5+level/lamp.base;
 }
  if(cullLights&&camera)cull(camera);
  // Static architecture casts the cached moon shadow; moving ornaments are
  // excluded by garden-world. No periodic full-scene shadow spikes during play.
 },dispose(){if(done)return;done=true;root.removeFromParent();moon.shadow.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
