import {Box3,Color,Raycaster,Vector3} from '../vendor/three.module.js';
import {EYE_HEIGHT,PLAYER_RADIUS} from './physics.js';
import {styles} from './art-profiles.js';

function luminance(color){
  return .2126*color.r+.7152*color.g+.0722*color.b;
}
function area(box){return (box.maxX-box.minX)*(box.maxZ-box.minZ);}

// Probe the first actual surface along each ray. A gap in the focal model is
// excluded rather than counted as occlusion. Alpha-blended diagnostic glass
// remains transparent for these structural sightline checks.
function firstOpaque(ray,objects){
  return ray.intersectObjects(objects,true).find(hit=>{
    const mat=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex??0]:hit.object.material;
    return mat?.visible!==false && !(mat?.transparent&&mat.opacity<.55);
  });
}
function sightlines(root,focus,spawn){
  root.updateMatrixWorld(true);
  const bounds=new Box3().setFromObject(focus);
  const size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3()),ray=new Raycaster();
  const observations=[];
  for(const offset of [0,-.28,.28]){
    const eye=new Vector3(spawn.x+offset,EYE_HEIGHT,spawn.z);
    const axis=new Vector3().subVectors(center,eye);axis.y=0;axis.normalize();
    const side=new Vector3(-axis.z,0,axis.x);
    let sampled=0,clear=0;
    for(const y of [.18,.36,.54,.72,.9])for(const x of [-.28,0,.28]){
      const target=center.clone().addScaledVector(side,x*(Math.abs(side.x)*size.x+Math.abs(side.z)*size.z));
      target.y=bounds.min.y+y*size.y;
      ray.set(eye,target.sub(eye).normalize());ray.far=Infinity;
      const intended=firstOpaque(ray,[focus]);if(!intended)continue;
      sampled++;ray.far=intended.distance-.015;
      if(!firstOpaque(ray,root.children.filter(o=>o!==focus)))clear++;
    }
    observations.push({offset,sampled,clear});
  }
  return {observations,height:size.y,angularHeightDeg:2*Math.atan2(size.y/2,Math.hypot(spawn.x-center.x,spawn.z-center.z))*180/Math.PI};
}
export function validateComposition(root,layout,materials){
  const focus=root.children.find(o=>o.name==='focus');
  if(!focus)throw Error('Composition : équipement focal absent');
  const view=sightlines(root,focus,layout.spawn),center=view.observations[0];
  if(center.clear===0)throw Error('Composition : équipement focal masqué depuis le départ');
  const {width,length}=layout.spec.dimensions;
  const occupancy=layout.boxes.reduce((v,b)=>v+area(b),0)/(width*length);
  const accentLuminance=luminance(materials.emitter.emissive)*materials.emitter.emissiveIntensity;
  const baseLuminance=luminance(materials.dark.color);
  if(!Number.isFinite(accentLuminance)||accentLuminance<=baseLuminance)throw Error('Composition : signal sans contraste de matériau');
  const warnings=[];
  if(center.clear/center.sampled<.55)warnings.push('Vue initiale partiellement masquée');
  if(view.angularHeightDeg<4)warnings.push('Point focal de faible taille apparente');
  if(occupancy<.012||occupancy>.42)warnings.push('Densité de machines à contrôler');
  const bayCenters=layout.stations.filter(s=>s.id.startsWith('bay-'));
  const left=bayCenters.filter(s=>s.x<0).length,right=bayCenters.length-left;
  if(Math.abs(left-right)>1)warnings.push('Équipements latéraux déséquilibrés');
  const aisleWidth=layout.boxes.filter(b=>b.id!=='focus'&&b.maxZ>=layout.stations[0].z)
    .reduce((acc,b)=>Math.min(acc,2*Math.max(0,b.minX,-b.maxX)),width);
  if(aisleWidth<=PLAYER_RADIUS*2)warnings.push('Axe d’arrivée encombré');
  return {view,occupancy,aisleWidth,lateralCounts:{left,right},materialSignalRatio:accentLuminance/baseLuminance,warnings};
}

export function dressRoom(scene,lights,spec,focus){
  const palette=styles[spec.style],screen=new Color(palette.screen);
  const h=spec.dimensions.height,l=spec.dimensions.length,w=spec.dimensions.width;
  scene.background=new Color(palette.graphite).multiplyScalar(palette.atmosphere.background);
  if(scene.fog){scene.fog.color.copy(scene.background);scene.fog.density=palette.atmosphere.fog/l;}
  lights.hemi.intensity=palette.lighting.fill;
  lights.cross.intensity=palette.lighting.cross;
  lights.key.intensity=palette.lighting.key;
  lights.rim.intensity=palette.lighting.rim;
  scene.environmentIntensity=palette.lighting.reflection;
  lights.hemi.color.copy(screen).lerp(new Color(0xffffff),.65);
  lights.hemi.groundColor.set(palette.graphite);
  lights.bay.position.set(-w*.48,h*.63,l*.24);
  lights.cross.color.copy(screen).lerp(new Color(0xffffff),.46);
  lights.cross.position.set(w*.53,h*.48,-l*.26);
  lights.depth.position.set(w*.1,h*.67,-l*.39);lights.depth.color.copy(screen);
  lights.depth.distance=Math.max(l,30);
  lights.key.target.position.set(focus.x,focus.height*.68,focus.z);
  lights.key.position.set(focus.x-2.4,Math.min(6,h*.74),focus.z+4.4);
  lights.rim.position.set(focus.x,focus.height+1.2,focus.z-2.6);
  lights.rim.color.set(palette.rim);
  const screenHex='#'+screen.getHexString();
  if(typeof document!=='undefined'){
    document.documentElement?.style.setProperty('--room-accent',palette.interface.accent);
    document.documentElement?.style.setProperty('--room-ink',palette.interface.ink);
    document.documentElement?.style.setProperty('--room-panel',palette.interface.panel);
    const hud=document.querySelector('.hud');
    if(hud)for(const target of hud.querySelectorAll('.sigil,.identity small,.system'))target.style.color=screenHex;
  }
  // Relative incident luminance of the actual neutral sources, not a pixel or lux measurement.
  return {upwardFill:luminance(lights.hemi.color)*lights.hemi.intensity,
    frontFill:luminance(lights.bay.color)*lights.bay.intensity,
    grazingFill:luminance(lights.cross.color)*lights.cross.intensity};
}
