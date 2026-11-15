import * as T from 'three';
import {loadSurfaceLibrary} from './surface-library.js';

// Box projection in metres, performed before batching. A two-metre panel
// remains two metres on a large floor instead of stretching across its diameter.
export function metricUV(source,metres=2,offset=[0,0,0]){
 const g=source.index?source.toNonIndexed():source;
 if(g!==source)source.dispose();
 const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=new Float32Array(p.count*2);
 for(let tri=0;tri<p.count;tri+=3){
  const normal=[0,0,0];for(let j=0;j<3;j++){normal[0]+=n.getX(tri+j);normal[1]+=n.getY(tri+j);normal[2]+=n.getZ(tri+j);}
  const axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
  for(let j=0;j<3;j++){const i=tri+j,x=p.getX(i)+offset[0],y=p.getY(i)+offset[1],z=p.getZ(i)+offset[2];
   uv[i*2]=(axis===0?z:x)/metres;uv[i*2+1]=(axis===1?-z:y)/metres;}
 }
 g.setAttribute('uv',new T.BufferAttribute(uv,2));return g;
}
export function createGardenMaterials(base,maps={}){
 const materials={...base},owned=[];
 function finish(key,source,family,opts,metres=2){
  const m=base[source].clone();Object.assign(m,maps[family]||{},opts);
  m.name='n06-'+family;m.userData.metresPerTile=metres;
  m.normalScale=new T.Vector2(key==='soil'?.28:.65,key==='soil'?.28:.65);owned.push(m);materials[key]=m;
 }
 finish('deck','deck','deck',{color:new T.Color(maps.deck?0xffffff:0x6c797f),metalness:.40,roughness:maps.deck?1:.65});
 finish('paint','paint','panel',{color:new T.Color(maps.panel?0xffffff:0xc9c6b7),metalness:.12,roughness:maps.panel?1:.6});
 finish('wood','copper','composite',{color:new T.Color(maps.composite?0xffffff:0x7b5b43),metalness:.35,roughness:maps.composite?1:.57},1);
 finish('fabric','ceramic','textile',{color:new T.Color(maps.textile?0xffffff:0x6b7b7b),metalness:0,roughness:maps.textile?1:.88},.5);
 finish('soil','seal','soil',{color:new T.Color(maps.soil?0xffffff:0x2b3126),metalness:0,roughness:maps.soil?1:.95},.5);
 finish('annexShell','paint','annex-shell',{color:new T.Color(maps['annex-shell']?0xffffff:0xcac9bf),metalness:.20,roughness:maps['annex-shell']?1:.58},1);
 finish('annexFrame','steel','annex-frame',{color:new T.Color(maps['annex-frame']?0xffffff:0x9aa5ac),metalness:.82,roughness:maps['annex-frame']?1:.43},.75);
 finish('annexLining','graphite','annex-lining',{color:new T.Color(maps['annex-lining']?0xffffff:0x404b53),metalness:.10,roughness:maps['annex-lining']?1:.76},1);
 return {materials,dispose(){owned.forEach(m=>m.dispose());}};
}
export async function loadGardenSurfaces(renderer,{mobile=false}={}){
 const assetRoot='/genesis/assets'+(mobile?'/mobile':''),maxAnisotropy=mobile?4:16;
 const base=await loadSurfaceLibrary(renderer,{assetRoot,maxAnisotropy:mobile?4:8,selectedFamilies:mobile?['alloy','graphite','seal','ceramic']:undefined}),textures=new Set(),maps={};let finish;
 try{
  const loader=new T.TextureLoader();
  const results=await Promise.allSettled(['deck','panel','composite','textile','soil','annex-shell','annex-frame','annex-lining'].map(async family=>{
   const layers=await Promise.allSettled(['colour','rough','normal'].map(async channel=>{
    const t=await loader.loadAsync(assetRoot+'/n06-'+(family==='soil'?(channel==='colour'?'soil-v3':'soil-v2'):family)+'-'+channel+'.png');textures.add(t);
    t.colorSpace=channel==='colour'?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;
    t.anisotropy=Math.min(maxAnisotropy,renderer.capabilities.getMaxAnisotropy());return t;
   }));
   const error=layers.find(r=>r.status==='rejected');if(error)throw error.reason;
   maps[family]={map:layers[0].value,roughnessMap:layers[1].value,normalMap:layers[2].value};
  }));
  const error=results.find(r=>r.status==='rejected');if(error)throw error.reason;
  finish=createGardenMaterials(base.materials,maps);let done=false;
  return {materials:finish.materials,dispose(){if(done)return;done=true;finish.dispose();textures.forEach(t=>t.dispose());base.dispose();}};
 }catch(error){finish?.dispose();textures.forEach(t=>t.dispose());base.dispose();throw error;}
}

// Purposeful fittings stay on the existing structural surfaces or inside an
// existing furniture collision envelope. No new wall or floor-plan boundary.
export function dressGarden({root,box,tube,ring,cylinder,materials,signals,annexPalettes={}}){
 const {steel,graphite:dark,paint:ivory,copper,seal,ceramic}=materials;
 const {amber,cyan}=signals;
 const fittings=new T.Group();fittings.name='N06 / Technical surface fittings';root.add(fittings);
 const beds=[[-8,7,2.25],[8,7,2.25],[-10,-9,2.25],[10,-9,2.25],[-12,0,1.5],[12,0,1.5],[-3,12,1.45],[3,12,1.45]];
 // Maintenance bands, recessed hatches and lane edging give the broad floor scale.
 for(const [x,z,r] of [[0,0,18.2],[-23,-4,10.2],[23,-4,10.2],[0,-25,10.2]]){
  ring(x,z,r-.85,.012,.045,dark,fittings);ring(x,z,r-1.02,.014,.014,copper,fittings);
  for(let i=0;i<48;i++){
   const a=i*Math.PI/24,mark=box(i%6===0?.12:.04,.009,i%6===0?.42:.20,[x+Math.sin(a)*(r-1.3),.013,z+Math.cos(a)*(r-1.3)],i%6===0?ivory:steel,fittings,.003);mark.rotation.y=a;
  }
 }
 for(const z of [-6.65,.65])box(31,.012,.055,[0,.008,z],copper,fittings,.004);
 for(const x of [-3.65,3.65])box(.055,.012,12,[x,.008,-16],steel,fittings,.004);
 for(const [x,z] of [[-4,4],[4,4],[-5,-7],[5,-7],[-23,-11],[23,3],[0,-18]]){
  box(1.48,.015,.85,[x,.013,z],seal,fittings,.025);box(1.40,.017,.77,[x,.024,z],steel,fittings,.025);
  for(const side of [-1,1])box(.13,.02,.025,[x+side*.54,.039,z+.22],dark,fittings,.005);
 }
 // Irrigation cartridges, lower metal skirts and cable connections are fitted
 // within the original planter footprints, below the botanical splat foliage.
 for(const [x,z,r] of beds){
  ring(x,z,r+.005,.10,.027,dark,fittings);ring(x,z,r+.007,.43,.019,steel,fittings);
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6,p=new T.Group();p.position.set(x+Math.sin(a)*(r-.01),.275,z+Math.cos(a)*(r-.01));p.rotation.y=a;fittings.add(p);
   box(.065,.28,.035,[0,0,0],steel,p,.009);
   if(i%3===0)for(let j=0;j<4;j++)box(.21,.012,.042,[.19,-.08+j*.052,0],dark,p,.003);
  }
  const p=new T.Group();p.position.set(x,.56,z-r*.53);fittings.add(p);
  cylinder(.11,.72,[0,.36,0],ceramic,p);ring(0,0,.12,.65,.018,copper,p);
  box(.24,.32,.14,[0,.85,0],dark,p,.04);box(.13,.07,.013,[0,.90,.077],cyan,p,.008);
  tube([[0,.1,0],[.24,.1,0],[.32,.03,.24]],.022,steel,p);
 }
 // The main dome's original ribs acquire collars, actuators and parallel feeds.
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,ca=Math.cos(a),sa=Math.sin(a);
  const collar=new T.Group();collar.position.set(16.8*ca,3.8,16.8*sa);collar.rotation.y=-a;fittings.add(collar);
  box(.48,.34,.30,[0,0,0],dark,collar,.06);box(.52,.065,.34,[0,.12,0],steel,collar,.014);
  box(.18,.06,.022,[0,-.03,.17],i%3===0?amber:cyan,collar,.006);
  const pts=[];for(let j=2;j<=22;j++){const t=Math.PI*j/24;pts.push([17.72*Math.cos(t)*ca,.1+10.22*Math.sin(t),17.72*Math.cos(t)*sa]);}
  tube(pts,.032,i%3===0?copper:dark,fittings);
 }
 // Existing pavilion parapets and upper galleries receive cladding and vents.
 for(const [cx,cz] of [[-23,-4],[23,-4],[0,-25]]){
  const palette=annexPalettes[cx<0?'rest':cx>0?'meal':'light'];
  const annexFrame=palette?.frame||steel,annexPanel=palette?.panel||dark,annexSeal=palette?.gasket||seal,annexTrim=palette?.trim||copper;
  const p=new T.Group();p.position.set(cx,0,cz);fittings.add(p);
  for(let i=0;i<24;i++){
   const a=Math.PI*.25+(i+.5)*Math.PI*1.5/24,r=10.08;
   const plate=box(1.80,.34,.07,[Math.sin(a)*r,.36,Math.cos(a)*r],i%4===0?annexFrame:annexPanel,p,.028);plate.rotation.y=a;
  }
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4;const unit=new T.Group();unit.position.set(Math.sin(a)*7.0,3.8,Math.cos(a)*7.0);unit.rotation.y=a;p.add(unit);
   box(1.12,.36,.31,[0,0,0],annexPanel,unit,.06);box(1.02,.28,.06,[0,0,.18],annexFrame,unit,.035);
   for(let j=0;j<7;j++)box(.70,.013,.022,[0,-.10+j*.032,.217],annexSeal,unit,.003);
   box(.075,.06,.028,[.43,0,.22],cx<0?amber:cyan,unit,.006);
  }
  ring(0,0,6.24,4.60,.036,annexTrim,p);
 }
 return fittings;
}
