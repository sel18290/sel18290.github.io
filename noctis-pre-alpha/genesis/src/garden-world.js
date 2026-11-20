import * as T from 'three';
import {createAnnexPalette,finishAnnexCanopy,closeAnnexCrown,annexRoof,annexRoofPoint} from './annex-surfaces.js';
import {createSoilGeometry,soilHeight} from './garden-soil.js';
import {metricUV,dressGarden} from './garden-finishes.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {indexExact} from './index-exact.js';

import {gardenContains,gardenCircles as circles} from './garden-plan.js';
export {gardenContains,gardenZone} from './garden-plan.js';

export function createGardenWorld(materials={},reduced=false,{optimize=true,labelScale=1}={}){
 const labelTextures=new Set();
 const root=new T.Group();root.name='N06 / Jardin des nuits';const obstacles=[],owned=new Set(),geometries=new Set(),animated=[];
 function mat(name,opts){if(materials[name])return materials[name];const m=new T.MeshStandardMaterial(opts);owned.add(m);return m;}
 const ivory=mat('paint',{color:0xd0cbb8,metalness:.08,roughness:.66}),steel=mat('steel',{color:0x889ca2,metalness:.75,roughness:.38}),dark=mat('graphite',{color:0x22343c,metalness:.32,roughness:.56}),deck=mat('deck',{color:0x718080,metalness:.22,roughness:.74});
 const wood=mat('wood',{color:0x866142,metalness:0,roughness:.7}),soil=mat('soil',{color:0x24312a,metalness:0,roughness:1}),leaf=mat('leaf',{color:0x417758,metalness:0,roughness:.75}),leaf2=mat('leaf2',{color:0x69946e,metalness:0,roughness:.7});
 const copper=mat('copper',{color:0x98694a,metalness:.8,roughness:.4}),seal=mat('seal',{color:0x191f22,roughness:.86}),ceramic=mat('ceramic',{color:0xc0beaf,roughness:.67}),fabric=mat('fabric',{color:0x6b7b7b,roughness:.88});
 const glass=new T.MeshPhysicalMaterial({color:0xafd9d8,transparent:true,opacity:.055,roughness:.18,metalness:0,depthWrite:false,side:T.DoubleSide,forceSinglePass:optimize});owned.add(glass);
 function signal(color){const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.9,roughness:.35});owned.add(m);return m;}
 const amber=signal(0xf4c28b),cyan=signal(0x82cbca),night=signal(0x8ab1df),green=signal(0x98d3a2);
 const roofIvory=ivory.clone(),roofComposite=wood.clone(),roofGraphite=dark.clone();for(const m of [roofIvory,roofComposite,roofGraphite]){m.side=T.DoubleSide;owned.add(m);}
 function mesh(g,m,p=[0,0,0],parent=root){if(m.map&&m.userData.uvMode!=='authored'&&(m.isMeshStandardMaterial||m.isMeshPhysicalMaterial))g=metricUV(g,m.userData.metresPerTile||2,p);const o=new T.Mesh(g,m);o.position.set(...p);o.castShadow=!m.transparent;o.receiveShadow=!m.transparent;parent.add(o);return o;}
 function box(w,h,d,p,m,parent=root,r=.055){return mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/3,h/3,d/3)),m,p,parent);}
 function tube(points,r,m,parent=root){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(24,points.length*5),r,7,false),m,[0,0,0],parent);}
 function ring(cx,cz,r,y,thick,m,parent=root,arc=Math.PI*2,start=0){const o=mesh(new T.TorusGeometry(r,thick,8,Math.max(48,Math.round(r*12)),arc),m,[cx,y,cz],parent);o.rotation.set(Math.PI/2,0,start);return o;}
 function cylinder(r,h,p,m,parent=root){return mesh(new T.CylinderGeometry(r,r,h,64),m,p,parent);}
 // All floor is on the same plane: the architecture changes, movement does not climb invisible steps.
 for(const [x,z,r] of circles){cylinder(r,.20,[x,-.10,z],deck);ring(x,z,r-.08,.03,.07,steel);ring(x,z,r-.50,.015,.018,amber);}
 box(46,.18,8,[0,-.09,-3],deck);box(8,.18,25,[0,-.09,-12.5],deck);
 // Radial ribs describe an orbital conservatory rather than a rectangular corridor.
 for(let i=0;i<12;i++){
  const angle=i*Math.PI/6,points=[];
  for(let j=0;j<=24;j++){const a=Math.PI*j/24;points.push([17.9*Math.cos(a)*Math.cos(angle),.1+10.4*Math.sin(a),17.9*Math.cos(a)*Math.sin(angle)]);}
  tube(points,.11,i%3===0?ivory:steel);
 }
 for(const [r,y] of [[14.8,3.45],[11.8,6.9],[6.7,9.5]])ring(0,0,r,y,.075,steel);
 const dome=mesh(new T.SphereGeometry(17.8,48,16,0,Math.PI*2,0,Math.PI/2),glass,[0,.05,0]);dome.scale.y=.58;
 // Pressure-shell lining follows the existing dome curvature. Upper service
 // panels frame the glass horizon, rather than leaving an entirely empty sky.
 for(let i=0;i<12;i++){
  const skin=mesh(new T.SphereGeometry(17.72,16,14,i*Math.PI/6+.018,Math.PI/6-.036,.18,.77),i%3===0?roofGraphite:roofIvory,[0,.05,0]);skin.scale.y=.58;
 }
 ring(0,0,17.72*Math.sin(.95),.05+17.72*.58*Math.cos(.95),.065,steel);
 ring(0,0,17.72*Math.sin(.95),.01+17.72*.58*Math.cos(.95),.018,amber);
 // Central oculus / beacon: suspended, leaving the circular plaza freely accessible.
 ring(0,0,2.8,8.8,.13,ivory);ring(0,0,2.64,8.76,.025,cyan);
 const beacon=new T.Group();beacon.name='N06 / Suspended beacon';beacon.position.set(0,5.6,0);root.add(beacon);
 mesh(new T.IcosahedronGeometry(.58,1),green,[0,0,0],beacon);
 for(let i=0;i<3;i++){const r=ring(0,0,1.0+i*.20,0,.025,cyan,beacon);r.rotation.set(.45+i*.7,.5*i,.1);}
 // Garden islands stay away from the cardinal and diagonal desire lines.
 const foliage=[],soilFragments=[];
 function planter(x,z,r,seed){
  cylinder(r,.55,[x,.275,z],ivory);ring(x,z,r-.04,.55,.045,steel);mesh(createSoilGeometry(r-.12,seed),soil,[x,0,z]);obstacles.push([x,z,r]);
  let randomState=seed*100003;const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
  for(let i=0;i<110;i++){const a=random()*Math.PI*2,d=Math.sqrt(random())*(r-.20),dx=Math.cos(a)*d,dz=Math.sin(a)*d;
   soilFragments.push({x:x+dx,z:z+dz,y:soilHeight(dx,dz,r-.12,seed),angle:a,size:.006+random()*.018,mineral:i%5===0});}

  const count=Math.round(15*r);for(let j=0;j<count;j++){
   const a=j*2.399+seed,d=(.15+.72*((j*37%101)/101))*r,px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d,h=.55+(j%5)*.18;
   foliage.push({x:px,y:.58+h*.35,z:pz,h,a,variant:j%2});
  }
 }
 for(const [x,z,r,s] of [[-8,7,2.25,1],[8,7,2.25,2],[-10,-9,2.25,3],[10,-9,2.25,4],[-12,0,1.5,5],[12,0,1.5,6],[-3,12,1.45,7],[3,12,1.45,8]])planter(x,z,r,s);
 const fragmentGeometry=new T.IcosahedronGeometry(1,0),fragmentTransform=new T.Object3D();
 for(const mineral of [false,true]){
  const entries=soilFragments.filter(f=>f.mineral===mineral),material=new T.MeshStandardMaterial({color:mineral?0xa59b7b:0x62432c,roughness:.96,metalness:0});owned.add(material);
  const fragments=new T.InstancedMesh(fragmentGeometry,material,entries.length);fragments.name='N06 / Soil aggregates '+mineral;
  entries.forEach((p,i)=>{fragmentTransform.position.set(p.x,p.y+.003,p.z);fragmentTransform.rotation.set(p.angle*.4,p.angle,p.angle*.2);fragmentTransform.scale.set(p.size,p.size*.38,p.size*.7);fragmentTransform.updateMatrix();fragments.setMatrixAt(i,fragmentTransform.matrix);});
  fragments.castShadow=true;fragments.receiveShadow=true;fragments.computeBoundingSphere();root.add(fragments);
 }
 // Leaf instances are ellipsoidal blade shapes, with individual orientation and height.
 const blade=new T.SphereGeometry(1,8,5),temp=new T.Object3D();
 const plants=new T.Group();root.add(plants);
 for(let v=0;v<2;v++){
  const entries=foliage.filter(p=>p.variant===v),leaves=new T.InstancedMesh(blade,v?leaf2:leaf,entries.length*5);
  let n=0;for(const p of entries)for(let k=0;k<5;k++){
   const a=p.a+k*Math.PI*.4;temp.position.set(p.x+Math.sin(a)*.12,p.y+k*.06,p.z+Math.cos(a)*.12);temp.rotation.set(Math.sin(a)*.8,a,Math.cos(a)*.8);temp.scale.set(.13+p.h*.06,p.h*.48,.045);temp.updateMatrix();leaves.setMatrixAt(n++,temp.matrix);
  }leaves.castShadow=true;leaves.receiveShadow=true;leaves.computeBoundingSphere();plants.add(leaves);
 }
 // Sculpted timber seating follows garden edges; wide route to every quest terminal remains open.
 for(const side of [-1,1])for(const z of [4,10]){
  const x=side*11;box(2.5,.18,.65,[x,.48,z],wood);for(const sx of [-.9,.9])box(.10,.43,.48,[x+sx,.22,z],dark);obstacles.push([x,z,1.35]);
 }
 const shutters=[],annexPalettes={};
 for(const kind of ['rest','meal','light']){
  const palette=createAnnexPalette({...materials,paint:ivory,steel,graphite:dark,copper,seal},kind);palette.glass.forceSinglePass=optimize;palette.owned.forEach(m=>owned.add(m));annexPalettes[kind]=palette;
 }
 function pavilion(cx,cz,kind){
  const group=new T.Group();group.name='N06 / Annex '+kind;group.position.set(cx,0,cz);root.add(group);
  const palette=annexPalettes[kind];
  // Open arcade columns and a floating segmented canopy. Entries remain 8m broad.
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6,x=Math.sin(a)*9.75,z=Math.cos(a)*9.75;
   if(Math.abs(cx)>1&&Math.abs(z)<4&&Math.sign(x)===-Math.sign(cx))continue;
   if(cx===0&&z>5.8&&Math.abs(x)<5)continue;
   const rim=annexRoofPoint(a+Math.PI/2,annexRoof.rimTheta,9.47);
   tube([[x,0,z],[x*.995,.65,z*.995],[x*.98,1.45,z*.98],rim],.11,palette.frame,group);
   box(.25,.15,.25,rim,palette.trim,group,.035);
   const mount=box(.32,.18,.30,[x,.09,z],palette.panel,group,.035);mount.rotation.y=a;
   box(.19,.065,.18,[x,.20,z],palette.trim,group,.02);
  }
  const rim=annexRoofPoint(0,annexRoof.rimTheta,9.47),rimR=Math.hypot(rim[0],rim[2]);
  ring(0,0,rimR,rim[1],.13,palette.frame,group);ring(0,0,rimR-.10,rim[1]-.07,.018,kind==='rest'?amber:cyan,group);
  closeAnnexCrown({group,palette,mesh,ring});
  // Curved low enclosure stops at waist height; visual links across the campus stay open.
  const profile=[[10.18,0],[10.18,.55],[10.10,.72],[10.05,.72],[10.05,0]];
  const wall=new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),60,Math.PI*.25,Math.PI*1.5);mesh(wall,palette.panel,[0,0,0],group);
  for(let i=0;i<6;i++){
   const canopy=new T.Group();canopy.name='N06 / Canopy '+kind+' '+i;canopy.rotation.y=i*Math.PI/3;group.add(canopy);
   const vent=finishAnnexCanopy({canopy,palette,mesh,tube,box});
   shutters.push({o:canopy,base:i*Math.PI/3,kind,vent});
  }
  return group;
 }
 const rest=pavilion(-23,-4,'rest'),mess=pavilion(23,-4,'meal'),chrono=pavilion(0,-25,'light');
 // West: an actual residential quiet room with four enveloping sleep alcoves.
 for(const x of [-5.1,5.1])for(const z of [-3,3]){
  const pod=new T.Group();pod.position.set(x,0,z);rest.add(pod);pod.rotation.y=x<0?Math.PI/2:-Math.PI/2;
  box(1.6,.36,2.5,[0,.18,0],dark,pod,.12);box(1.43,.25,2.23,[0,.48,0],fabric,pod,.12);box(.95,.16,.48,[0,.66,-.76],fabric,pod,.09);
  for(let seam=0;seam<6;seam++)box(1.32,.014,.018,[0,.615,-.5+seam*.29],seal,pod,.006);
  for(const side of [-1,1]){box(.065,1.10,.10,[side*.68,1.03,-1.08],steel,pod,.025);box(.025,.36,.02,[side*.68,1.12,-1.015],amber,pod,.005);}
  for(let j=0;j<7;j++)box(.90,.022,.055,[0,.8+j*.10,-1.07],seal,pod,.006);
  const pts=[];for(let j=0;j<=20;j++){const a=Math.PI*j/20;pts.push([Math.cos(a)*.98,.4+Math.sin(a)*1.7,-.72]);}tube(pts,.10,wood,pod);
  box(1.65,1.45,.15,[0,1.03,-1.18],dark,pod,.06);box(.13,.48,.16,[.91,.48,.66],amber,pod);
  obstacles.push([-23+x,-4+z,1.65]);
 }
 // East: communal mess, curved preparation island and dining circles, not a prop warehouse.
 for(const [x,z] of [[-4,-3],[4,-3],[-4,3],[4,3]]){
  cylinder(1.05,.12,[x,.92,z],wood,mess);cylinder(.22,.9,[x,.45,z],steel,mess);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;box(.62,.12,.60,[x+Math.sin(a)*1.40,.47,z+Math.cos(a)*1.40],ivory,mess);}
  obstacles.push([23+x,-4+z,1.9]);
 }
 box(4.3,.95,1.15,[0,.475,-6],ivory,mess,.14);box(4.45,.10,1.25,[0,1.0,-6],wood,mess,.05);obstacles.push([23,-10,2.3]);
 for(let i=0;i<7;i++){const cup=mesh(new T.CylinderGeometry(.11,.09,.22,20),i%3?ivory:dark,[-1.6+i*.5,1.16,-6],mess);}
 // North: chronobiology chamber: an armillary instrument, radial wall displays and specimen lamps.
 const clock=new T.Group();clock.name='N06 / Chronobiology instrument';clock.position.set(0,2,-5.7);chrono.add(clock);obstacles.push([0,-30.7,1.7]);
 for(let i=0;i<4;i++){const r=ring(0,0,1.4+i*.19,0,.035,i%2?steel:cyan,clock);r.rotation.set(.4+i*.4,i*.6,0);}
 mesh(new T.SphereGeometry(.5,48,32),annexPalettes.light.frame,[0,0,0],clock);
 for(const y of [-.26,0,.26])ring(0,0,Math.sqrt(.505**2-y*y),y,.009,cyan,clock);
 for(let i=0;i<3;i++){const meridian=ring(0,0,.505,0,.008,annexPalettes.light.trim,clock);meridian.rotation.set(0,i*Math.PI/3,0);}
 for(let i=0;i<24;i++){const a=i*Math.PI/12;const o=box(.06,i%6===0?.27:.15,.08,[Math.sin(a)*2,2+Math.cos(a)*2,-5.7],ivory,chrono,.015);o.rotation.z=-a;}
 for(const side of [-1,1])for(let j=0;j<3;j++){
  const group=new T.Group();group.position.set(side*5.8,0,-3+j*3);chrono.add(group);group.rotation.y=side<0?Math.PI/2:-Math.PI/2;
  box(1.8,.95,.65,[0,.475,0],dark,group);box(1.88,.10,.76,[0,1.0,0],ivory,group);tube([[-.65,1.1,0],[-.65,2.5,0],[.65,2.5,0],[.65,1.1,0]],.035,cyan,group);obstacles.push([side*5.8,-28+j*3,1.05]);
 }
 // Work surfaces receive useful, fitted equipment rather than loose crates.
 for(const side of [-1,1])for(let j=0;j<3;j++){
  const instrument=new T.Group();instrument.position.set(side*5.8,1.06,-28+j*3);instrument.rotation.y=side<0?Math.PI/2:-Math.PI/2;root.add(instrument);
  box(.68,.06,.36,[0,.035,0],steel,instrument,.025);
  for(let i=0;i<3;i++){cylinder(.055,.19,[-.22+i*.22,.16,0],ceramic,instrument);ring(-.22+i*.22,0,.058,.20,.01,copper,instrument);}
  box(.36,.18,.10,[.56,.12,0],dark,instrument,.02);box(.22,.06,.012,[.56,.15,.057],cyan,instrument,.008);
 }
 for(const x of [-1.30,1.30]){
  const dispenser=new T.Group();dispenser.position.set(23+x,1.06,-10);root.add(dispenser);
  box(.52,.70,.40,[0,.35,0],dark,dispenser,.08);box(.45,.42,.035,[0,.44,.22],ivory,dispenser,.04);
  cylinder(.12,.27,[0,.36,.06],ceramic,dispenser);box(.35,.04,.33,[0,.05,.20],steel,dispenser,.025);
  box(.14,.04,.015,[0,.62,.245],x<0?amber:cyan,dispenser,.006);
 }
 function display(parent,title,subtitle){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=Math.round(1024*labelScale);canvas.height=Math.round(512*labelScale);
  const ctx=canvas.getContext?.('2d');if(!ctx)return;
  ctx.scale(labelScale,labelScale);
  ctx.fillStyle='#0d1c24';ctx.fillRect(0,0,1024,512);
  ctx.fillStyle='#74948f';ctx.font='24px sans-serif';ctx.fillText('NOCTIS  /  BIOSPHÈRE 06',48,48);
  ctx.fillStyle='#dae0d6';ctx.font='500 54px sans-serif';ctx.fillText(title,48,124,930);
  ctx.fillStyle='#a8bcb7';ctx.font='29px sans-serif';ctx.fillText(subtitle,48,175,930);
  ctx.strokeStyle='#203b44';ctx.lineWidth=2;
  for(let x=48;x<980;x+=58){ctx.beginPath();ctx.moveTo(x,210);ctx.lineTo(x,392);ctx.stroke();}
  for(let y=218;y<400;y+=38){ctx.beginPath();ctx.moveTo(48,y);ctx.lineTo(980,y);ctx.stroke();}
  ctx.strokeStyle='#80c2be';ctx.lineWidth=4;ctx.beginPath();
  for(let i=0;i<450;i++){const x=48+i*2,y=302-Math.sin(i*.023)*56-Math.sin(i*.086)*10;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
  ctx.fillStyle='#cfae7e';ctx.fillRect(48,435,12,12);ctx.font='25px sans-serif';ctx.fillText('DOSSIER DE RELÈVE  ·  APPROCHEZ ET UTILISEZ E',82,451,900);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;labelTextures.add(texture);
  const material=new T.MeshBasicMaterial({map:texture,toneMapped:false});owned.add(material);
  const plane=mesh(new T.PlaneGeometry(1.10,.54),material,[0,1.37,.070],parent);plane.rotation.x=-.25;
 }
 // Quest pedestals are architectural signs: small, readable, not giant collision cages.
 for(const [x,z,c,title,subtitle] of [[0,9,cyan,'MISSION AUBE','01 / Protéger la relève'],[0,-25,night,'RYTHMES BIOLOGIQUES','02 / Reconstituer la nuit'],[-23,-4,amber,'HABITAT DU REPOS','03 / Préparer les conditions'],[23,-4,green,'ROUTINE DU SOIR','04 / Choisir les habitudes'],[0,0,cyan,'CYCLE LUMINEUX','05 / Synchroniser le jardin']]){
  const console=new T.Group();console.position.set(x,0,z);root.add(console);
  cylinder(.38,.10,[0,.05,0],dark,console);tube([[0,.1,0],[0,.7,-.1],[0,1.15,0]],.095,steel,console);
  const face=box(1.20,.65,.10,[0,1.35,0],dark,console,.055);face.rotation.x=-.25;display(console,title,subtitle);
  for(const side of [-1,1]){box(.065,.56,.08,[side*.61,1.35,0],steel,console,.02);box(.10,.025,.06,[side*.43,1.03,.16],copper,console,.006);}
  for(let i=0;i<5;i++)box(.13,.025,.03,[-.43+i*.21,1.00,.17],c,console,.005);
  ring(0,0,.56,.025,.015,c,console);obstacles.push([x,z,.68]);
 }
 dressGarden({root,box,tube,ring,cylinder,materials:{steel,graphite:dark,paint:ivory,copper,seal,ceramic},signals:{amber,cyan},annexPalettes});
 // In-world wayfinding is authored as part of the campus, with no dependency in headless checks.
 function sign(title,subtitle,x,y,z,width=4,yaw=0){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=Math.round(2048*labelScale);canvas.height=Math.round(512*labelScale);
  const ctx=canvas.getContext?.('2d');if(!ctx)return;ctx.scale(2*labelScale,2*labelScale);
  ctx.fillStyle='#172e34';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#b9d3bf';ctx.fillRect(0,0,12,256);
  ctx.fillStyle='#e5e3d7';ctx.font='500 62px sans-serif';ctx.textBaseline='middle';ctx.fillText(title,45,94,940);
  ctx.fillStyle='#9dbab7';ctx.font='30px sans-serif';ctx.fillText(subtitle,45,177,940);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;labelTextures.add(tex);
  const m=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide});owned.add(m);
  const frame=box(width+.16,width/4+.16,.08,[x,y,z-.055],dark);frame.rotation.y=yaw;
  const o=mesh(new T.PlaneGeometry(width,width/4),m,[x,y,z]);o.rotation.y=yaw;
 }
 sign('JARDIN DES NUITS','NOCTIS · RESTAURER LE RYTHME DE L’ÉQUIPE',0,3.8,12.4,5.5);
 sign('PAVILLON DES RYTHMES','01 · LUMIÈRE ET HORLOGE BIOLOGIQUE',0,3.4,-29,5.5);
 sign('REFUGE DU REPOS','02 · PRÉPARER UN ENVIRONNEMENT CALME',-23,3.4,-9,5.5);
 sign('MAISON DES ÉQUIPES','03 · CHOISIR LES HABITUDES DU SOIR',23,3.4,-9,5.5);
 sign('← REFUGE','CALME · OBSCURITÉ · CONFORT',-11,2.7,-3,3.4);
 sign('MAISON DES ÉQUIPES →','REPAS · BOISSONS · ACTIVITÉS',11,2.7,-3,3.4);
 sign('↑ PAVILLON DES RYTHMES','LUMIÈRE · ÉCRANS · HORAIRES',0,2.7,-13.4,4.2);
 // Merge static meshes within each rigid frame; transparencies remain separate.
 function batch(parent){for(const c of [...parent.children])if(c.isGroup&&!shutters.some(s=>s.o===c||s.vent===c)&&c!==beacon&&c!==plants)batch(c);
  const groups=new Map();for(const o of [...parent.children])if(o.isMesh&&!o.material.transparent&&!o.isInstancedMesh){o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);o.geometry.dispose();parent.remove(o);}
  for(const [m,gs]of groups){let g=mergeGeometries(gs);gs.forEach(g=>g.dispose());
   if(!optimize){mesh(g,m,[0,0,0],parent);continue;}
   if(optimize){const indexed=indexExact(g);if(indexed!==g)g.dispose();g=indexed;}
   // UVs were already authored on the source surfaces. Do not unwrap the
   // finished batch again (which would expand indexed vertices back to triangles).
   const o=new T.Mesh(g,m);o.castShadow=!m.transparent;o.receiveShadow=!m.transparent;
   o.updateMatrix();o.matrixAutoUpdate=false;parent.add(o);
  }
 }
 // Fold rigid fitting groups into their parent before merging. Keep each
 // animated frame intact so canopy, clock and beacon retain their pivots.
 const movingFrames=new Set([beacon,plants,clock,...shutters.map(s=>s.o),...shutters.map(s=>s.vent)]);
 function flatten(parent){for(const child of [...parent.children])if(child.isGroup){
  flatten(child);if(movingFrames.has(child))continue;child.updateMatrix();
  for(const part of [...child.children]){part.applyMatrix4(child.matrix);parent.add(part);}parent.remove(child);
 }}
 flatten(root);for(const {o} of shutters)batch(o);batch(root);let time=0,finished=0,disposed=false;
 if(optimize)for(const frame of [beacon,clock,...shutters.map(s=>s.vent)])frame.traverse(o=>{if(o.isMesh)o.castShadow=false;});
 return {root,obstacles,setGaussianFoliage(enabled){plants.visible=!enabled;},update(dt,state={}){if(disposed)return;dt=Math.max(0,Math.min(.05,dt));time+=dt;finished=T.MathUtils.damp(finished,state.complete?1:0,2,dt);
  amber.emissiveIntensity=state.rest?.45:.95;night.emissiveIntensity=state.light?.38:1.2;green.emissiveIntensity=state.meal?1.2:.6;
  if(!reduced){plants.rotation.z=Math.sin(time*.45)*.0015;beacon.rotation.y=time*.12;beacon.position.y=5.6+Math.sin(time*.7)*.08+finished*.6;clock.rotation.y=time*.05;for(const s of shutters){const done=state[s.kind];s.vent.rotation.x=T.MathUtils.damp(s.vent.rotation.x,done?.18:0,2,dt);}}
 },dispose(){if(disposed)return;disposed=true;root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());labelTextures.forEach(t=>t.dispose());root.removeFromParent();}};
}
