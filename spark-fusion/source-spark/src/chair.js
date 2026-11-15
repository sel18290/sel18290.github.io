import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Authoring units are metres. The front of the chair faces +Z, toward the entrance.
export function createChair() {
  const root=new T.Group();
  root.name='Neural station';root.position.set(0,0,-1.5);
  const metal=(c,m,r)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:r});
  const titanium=metal(0xb5a89c,.68,.37), graphite=metal(0x474952,.6,.39);
  const alloy=metal(0x958274,.64,.33), pad=metal(0x47434a,.07,.83);
  const seam=metal(0x29292d,.02,.78), glass=metal(0x221b21,.34,.2);
  const lamp=new T.MeshStandardMaterial({color:0xff9e71,emissive:0xff3a20,emissiveIntensity:.6});
  const digits=new T.MeshBasicMaterial({color:0xffb49a});
  const materials=[titanium,graphite,alloy,pad,seam,glass,lamp,digits];
  function part(parent,geometry,material,x,y,z) {
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function plate(parent,x,y,z,w,h,d,r,material) {
    return part(parent,new RoundedBoxGeometry(w,h,d,2,r),material,x,y,z);
  }
  function drum(parent,x,y,z,top,bottom,height,mat) {
    return part(parent,new T.CylinderGeometry(top,bottom,height,48),mat,x,y,z);
  }
  function tube(parent,coords,r,mat) {
    const path=new T.CatmullRomCurve3(coords.map(p=>new T.Vector3(...p)));
    return part(parent,new T.TubeGeometry(path,Math.max(8,coords.length*4),r,8,false),mat,0,0,0);
  }
  function rim(parent,x,y,z,r,section,mat,arc=Math.PI*2) {
    return part(parent,new T.TorusGeometry(r,section,10,64,arc),mat,x,y,z);
  }
  // A single swept outline gives the upholstery a lumbar taper and broad shoulders.
  // Each row is [height, half-width, centre depth, half-thickness].
  function mould(parent,rows,mat) {
    const geometry=new T.BufferGeometry(),positions=[],indices=[];
    const resolution=40;
    const contour=new T.CatmullRomCurve3(rows.map(([y,w,z])=>new T.Vector3(w,y,z)));
    for(let j=0;j<=32;j++) {
      const t=j/32,c=contour.getPoint(t);
      const section=t*(rows.length-1),lo=Math.min(Math.floor(section),rows.length-2);
      const thickness=T.MathUtils.lerp(rows[lo][3],rows[lo+1][3],section-lo);
      for(let i=0;i<resolution;i++){
        const a=i/resolution*Math.PI*2;
        const signed=(n,p)=>Math.sign(n)*Math.pow(Math.abs(n),p);
        positions.push(c.x*signed(Math.cos(a),.75),c.y,c.z+thickness*signed(Math.sin(a),.65));
        if(j){const a0=(j-1)*resolution+i,b0=(j-1)*resolution+(i+1)%resolution;
          indices.push(a0,a0+resolution,b0,b0,a0+resolution,b0+resolution);}
      }
    }
    for(let i=1;i<resolution-1;i++){
      indices.push(0,i,i+1,32*resolution,32*resolution+i+1,32*resolution+i);
    }
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    return part(parent,geometry,mat,0,0,0);
  }
  drum(root,0,.085,0,1.05,1.15,.17,graphite);
  drum(root,0,.19,0,.87,1.05,.06,titanium);
  drum(root,0,.235,0,.82,.82,.04,graphite);
  const baseRing=rim(root,0,.227,0,.92,.012,lamp);baseRing.rotation.x=Math.PI/2;
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5;
    const lug=plate(root,.99*Math.sin(a),.16,.99*Math.cos(a),.115,.06,.16,.015,alloy);
    lug.rotation.y=a;
  }
  drum(root,0,.41,-.1,.27,.36,.36,graphite);
  for(const side of [-1,1]){
    tube(root,[[side*.48,.25,-.38],[side*.48,.47,-.43],[side*.40,.69,-.23],[side*.36,.77,.3]],.073,titanium);
    tube(root,[[side*.27,.26,.5],[side*.29,.53,.37],[side*.4,.72,.27]],.043,alloy);
    tube(root,[[side*.31,.23,-.55],[side*.47,.52,-.55],[side*.46,.96,-.44],[side*.39,1.42,-.54],[side*.34,1.94,-.59]],.045,graphite);
  }
  const pan=plate(root,0,.72,.04,.95,.13,.91,.065,graphite);pan.rotation.x=-.09;
  const seat=plate(root,0,.825,.08,.86,.17,.87,.084,pad);seat.rotation.x=-.09;
  mould(root,[[.79,.29,-.26,.065],[.9,.43,-.28,.13],[1.12,.37,-.31,.13],[1.37,.37,-.39,.12],[1.58,.46,-.45,.12],[1.75,.43,-.51,.10],[1.86,.28,-.54,.065]],pad);
  for(const side of [-1,1]){
    tube(root,[[side*.38,.89,-.185],[side*.31,1.13,-.205],[side*.31,1.38,-.29],[side*.40,1.61,-.35],[side*.35,1.77,-.42]],.014,alloy);
    const armrest=plate(root,side*.54,1.075,.035,.145,.115,.58,.056,pad);armrest.rotation.x=-.06;
    tube(root,[[side*.46,.72,.22],[side*.55,.88,.23],[side*.55,1.04,.19]],.038,graphite);
    tube(root,[[side*.38,1.76,-.52],[side*.26,1.95,-.60],[side*.19,2.08,-.61]],.045,titanium);
  }
  plate(root,0,2.03,-.55,.48,.28,.19,.085,pad);
  rim(root,0,1.76,-.635,.62,.055,titanium);
  rim(root,0,1.76,-.637,.548,.018,lamp);
  const rotor=new T.Group();rotor.name='Scanner index';rotor.position.set(0,1.76,-.635);root.add(rotor);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const marker=plate(rotor,.611*Math.sin(a),.611*Math.cos(a),.005,.085,.048,.13,.016,graphite);
    marker.rotation.z=-a;
  }
  const booms=[];
  for(const side of [-1,1]){
    const pivot=new T.Group();pivot.position.set(side*.68,1.26,-.38);pivot.name='Sensor hinge';root.add(pivot);
    const pin=drum(root,side*.68,1.26,-.38,.105,.105,.13,titanium);pin.rotation.z=Math.PI/2;
    tube(root,[[side*.51,.87,-.32],[side*.62,1.03,-.35],[side*.68,1.26,-.38]],.068,graphite);
    tube(pivot,[[0,0,0],[side*.07,.25,-.03],[side*.045,.53,-.08],[-side*.14,.73,-.02]],.053,alloy);
    tube(pivot,[[0,.025,.04],[side*.04,.29,.035],[-side*.01,.54,-.01],[-side*.14,.7,.05]],.023,graphite);
    const head=plate(pivot,-side*.17,.73,.015,.135,.20,.16,.05,graphite);head.rotation.z=-side*.24;
    const lens=drum(pivot,-side*.245,.73,.017,.059,.059,.018,lamp);lens.rotation.z=Math.PI/2;
    booms.push(pivot);
  }
  const screen=new T.Group();screen.position.set(.69,1.03,.39);screen.rotation.set(-.70,-.24,0);root.add(screen);
  tube(root,[[.48,.78,.22],[.62,.83,.34],[.69,1.02,.39]],.034,titanium);
  plate(screen,0,0,0,.36,.22,.045,.025,titanium);
  plate(screen,0,0,.029,.327,.186,.016,.014,glass);
  for(let i=0;i<12;i++){
    const bar=plate(screen,-.13+i*.021,-.007,.046,.012,.018+.056*Math.abs(Math.sin(i*.8)),.004,.001,digits);
    bar.name='Diagnostic trace';
  }
  plate(screen,-.033,.065,.045,.21,.008,.006,.001,lamp);
  const beam=new T.Group();beam.position.set(0,1.97,-.49);root.add(beam);
  for(let i=0;i<2;i++){
    const sweep=rim(beam,0,i*.04,0,.29+i*.035,.004,digits,Math.PI*1.55);
    sweep.rotation.x=Math.PI/2;sweep.rotation.z=i*.8;
  }
  beam.visible=false;
  // Bake rigid pieces per material while keeping each hinge and the rotor independent.
  for(const parent of [screen,rotor,...booms,beam,root]){
    const batches=new Map();
    for(const mesh of [...parent.children]){
      if(!mesh.isMesh)continue;
      mesh.updateMatrix();
      const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrix);
      for(const key of Object.keys(geometry.attributes))if(key!=='position'&&key!=='normal')geometry.deleteAttribute(key);
      if(!batches.has(mesh.material))batches.set(mesh.material,[]);
      batches.get(mesh.material).push(geometry);mesh.geometry.dispose();parent.remove(mesh);
    }
    for(const [material,batch] of batches){
      const merged=mergeGeometries(batch);for(const geometry of batch)geometry.dispose();
      parent.add(new T.Mesh(merged,material));
    }
  }
  root.add(new T.HemisphereLight(0xffe8da,0x665563,1.8));
  const key=new T.DirectionalLight(0xffecdc,2.2);key.position.set(-2,3,3);root.add(key,key.target);
  let phase='idle',progress=0,elapsed=0,openness=0;
  function update(dt,near){
    dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1));elapsed+=dt;
    if(phase==='scanning'){progress=Math.min(1,progress+dt/4);if(progress>=1-1e-8){progress=1;phase='complete';}}
    else if(phase!=='complete'){phase=near?'proximity':'idle';}
    const engagement=phase==='scanning'?1:near?.45:0;
    openness=T.MathUtils.damp(openness,engagement,4,dt);
    for(let i=0;i<booms.length;i++)booms[i].rotation.z=(i===0?-1:1)*openness*.16;
    rotor.rotation.z+=dt*(.055+openness*.21);
    lamp.emissiveIntensity=.48+openness*.95+.065*Math.sin(elapsed*2);
    beam.visible=phase==='scanning';beam.rotation.y=elapsed*1.8;
    beam.position.y=1.89+.24*Math.sin(progress*Math.PI);
  }
  return {root,update,get phase(){return phase;},get progress(){return progress;},
    activate(){if(phase==='scanning')return false;progress=0;phase='scanning';return true;},
    dispose(){root.traverse(o=>{if(o.isMesh)o.geometry.dispose()});materials.forEach(m=>m.dispose());root.removeFromParent();}
  };
}
