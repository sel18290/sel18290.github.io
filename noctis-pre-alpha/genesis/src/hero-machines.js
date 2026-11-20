import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Authoring in metres, origin on the floor, operating face towards +Z.
// Rigid parts are merged per material; only real mechanical assemblies move.
export function createHeroMachine(kind,{materials={},reducedMotion=false}={}) {
  if(!['console','capsule','reactor','atlas'].includes(kind))throw Error('Machine inconnue : '+kind);
  const root=new T.Group();root.name='N05 / '+kind;
  const owned=new Set(), maps=new Set();
  function material(name,settings){
    if(materials[name])return materials[name];
    const m=new T.MeshStandardMaterial(settings);owned.add(m);return m;
  }
  // Restrained machining grain: surface response, not large decorative scratches.
  const size=64,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const v=Math.round(190+8*Math.sin(y*2.13)+3*Math.sin(x*7.4+y*.91)),i=(y*size+x)*4;
    pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;
  }
  const grain=new T.DataTexture(pixels,size,size);grain.wrapS=grain.wrapT=T.RepeatWrapping;
  grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;maps.add(grain);
  const steel=material('steel',{color:0x9aa5aa,metalness:.82,roughness:.46,roughnessMap:grain});
  const ceramic=material('ceramic',{color:0xd2cec0,metalness:.12,roughness:.48,roughnessMap:grain});
  const shell=material('graphite',{color:0x263941,metalness:.58,roughness:.46,roughnessMap:grain});
  const rubber=material('rubber',{color:0x101a20,metalness:0,roughness:.88});
  const copper=material('copper',{color:0xa6724c,metalness:.84,roughness:.32,roughnessMap:grain});
  const glass=material('glass',{color:0x326a78,metalness:.2,roughness:.2,transparent:true,opacity:.44,depthWrite:false});
  const screen=material('screen',{color:0x051c27,metalness:.2,roughness:.28,emissive:0x093949,emissiveIntensity:.38});
  // Per-machine signal materials must never mutate supplied shared materials.
  const signal=new T.MeshStandardMaterial({color:0x8bd3d5,metalness:.1,roughness:.3,emissive:0x43b8c6,emissiveIntensity:.7});owned.add(signal);
  const warm=new T.MeshStandardMaterial({color:0xe6aa69,metalness:.2,roughness:.38,emissive:0xe66e2c,emissiveIntensity:.4});owned.add(warm);
  const dynamic=[];
  const mesh=(g,m,p=[0,0,0],parent=root)=>{const o=new T.Mesh(g,m);o.position.set(...p);o.castShadow=!m.transparent;o.receiveShadow=!m.transparent;parent.add(o);return o;};
  const box=(w,h,d,p,m=steel,parent=root,r=.035)=>mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.4,h*.4,d*.4)),m,p,parent);
  const lathe=(profile,m,p=[0,0,0],parent=root,segments=64,start=0,arc=Math.PI*2)=>mesh(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),segments,start,arc),m,p,parent);
  const tube=(points,r,m,parent=root)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.min(160,Math.max(16,points.length*8)),r,8,false),m,[0,0,0],parent);
  const ring=(radius,thickness,y,m,parent=root)=>{const o=mesh(new T.TorusGeometry(radius,thickness,10,80),m,[0,y,0],parent);o.rotation.x=Math.PI/2;return o;};
  const cylinder=(r,h,y,m,parent=root)=>mesh(new T.CylinderGeometry(r,r,h,48),m,[0,y,0],parent);
  function movable(name,parent=root){const g=new T.Group();g.name=name;parent.add(g);dynamic.push(g);return g;}
  function screw(x,y,z,parent=root){const o=mesh(new T.CylinderGeometry(.017,.017,.012,12),steel,[x,y,z],parent);o.rotation.x=Math.PI/2;}
  function display(parent,w,h){
    box(w+.10,h+.10,.075,[0,0,0],steel,parent,.035);
    box(w,h,.02,[0,0,.048],screen,parent,.014);
    // In-world display graphics stay sharp at any resolution, with no canvas dependency.
    for(let i=0;i<5;i++)box(w*.11,.008,.007,[-w*.37+i*w*.18,h*.34,.063],i===0?warm:signal,parent,.001);
    const points=[];
    for(let i=0;i<=100;i++){const u=i/100;const peak=Math.exp(-(((u-.56)/.12)**2));points.push([(u-.5)*w*.86,(-.10+peak*.30*Math.sin(u*49))*h,.068]);}
    tube(points,.005,signal,parent);
    for(let i=0;i<4;i++)box(w*(.18+i*.035),.009,.007,[-w*.30,-h*.30+i*.028,.064],signal,parent,.001);
    for(const x of [-1,1])for(const y of [-1,1])screw(x*(w/2+.025),y*(h/2+.025),.045,parent);
  }
  let collider,animate=()=>{};
  if(kind==='console'||kind==='atlas'){
    const wide=kind==='console',width=wide?1.78:1.58;collider=[width/2,.57];
    box(width,.10,.98,[0,.05,0],rubber,root,.045);
    box(width-.08,.09,.90,[0,.135,0],steel,root,.04);
    // Sculpted pedestal section; continuous rolled skin rather than stacked boxes.
    const shape=new T.Shape();shape.moveTo(-.32,.18);shape.bezierCurveTo(-.54,.50,-.52,.88,-.32,1.02);shape.lineTo(.38,1.02);shape.bezierCurveTo(.22,.78,.17,.50,.30,.18);shape.closePath();
    const pedestal=mesh(new T.ExtrudeGeometry(shape,{depth:width-.32,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:3,steps:1,curveSegments:20}),shell);
    pedestal.rotation.y=Math.PI/2;pedestal.position.set(-(width-.32)/2,0,0);
    for(const side of [-1,1]){
      box(.07,.69,.55,[side*(width/2-.14),.55,.03],ceramic,root,.035);
      tube([[side*.45,.2,-.31],[side*.46,.51,-.30],[side*.56,.87,-.20]],.024,copper);
    }
    const head=movable('Console articulated display');head.position.set(0,1.12,.02);head.rotation.x=-.38;
    display(head,width-.28,.37);
    box(width-.11,.085,.35,[0,.97,.31],ceramic,root,.035);
    for(let i=0;i<7;i++)box(.10,.018,.055,[-.39+i*.13,1.02,.36],i===6?warm:rubber,root,.012);
    for(let i=0;i<3;i++){const knob=mesh(new T.CylinderGeometry(.031,.037,.025,20),i===2?copper:steel,[.49+i*.09,1.03,.37]);}
    const spindle=movable('Status dial');spindle.position.set(-width*.37,1.045,.32);
    const dial=mesh(new T.TorusGeometry(.065,.009,8,32,Math.PI*1.6),signal,[0,0,0],spindle);dial.rotation.x=Math.PI/2;
    if(!wide){
      for(let i=0;i<3;i++){const orbit=mesh(new T.TorusGeometry(.15+i*.035,.006,6,48),signal,[-.48,1.26,.10]);orbit.rotation.set(.3+i*.65,i*.40,0);}
    }
    animate=(t,engage,progress)=>{head.rotation.x=-.38-engage*.055;spindle.rotation.y=t*.32+engage*Math.PI*progress;};
  } else if(kind==='capsule'){
    collider=[.86,.86];
    lathe([[0,0],[.63,0],[.78,.06],[.81,.17],[.78,.29],[.62,.36],[0,.36]],shell);
    ring(.74,.025,.23,steel);ring(.66,.013,.34,signal);
    lathe([[.59,.35],[.64,.46],[.64,2.13],[.59,2.29]],glass);
    lathe([[0,2.28],[.59,2.28],[.69,2.34],[.71,2.43],[.62,2.57],[.30,2.64],[0,2.64]],ceramic);
    ring(.65,.035,2.30,steel);ring(.68,.015,2.40,signal);
    const specimen=movable('Thermal suspension');
    lathe([[0,.48],[.17,.48],[.26,.60],[.27,1.78],[.21,1.94],[0,2.0]],ceramic,[0,0,0],specimen,48);
    for(const y of [.60,.72,1.82,1.94])ring(.275,.018,y,copper,specimen);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const o=box(.055,1.15,.085,[Math.sin(a)*.30,1.20,Math.cos(a)*.30],shell,specimen);o.rotation.y=a;}
    // Two curved shutters retract around the shell's own axis into rear housings.
    const shutters=[];
    for(const side of [-1,1]){
      const shutter=movable('Cryogenic shield '+side);shutters.push(shutter);
      const start=side<0?-Math.PI*.43:0;
      lathe([[.66,.42],[.72,.48],[.72,2.10],[.66,2.24]],ceramic,[0,0,0],shutter,28,start,Math.PI*.42);
      const angle=start+Math.PI*.21;
      tube([[Math.sin(angle)*.735,.62,Math.cos(angle)*.735],[Math.sin(angle)*.735,1.10,Math.cos(angle)*.735],[Math.sin(angle)*.735,1.93,Math.cos(angle)*.735]],.017,signal,shutter);
    }
    for(const side of [-1,1]){
      tube([[side*.57,.31,-.39],[side*.70,.56,-.42],[side*.70,2.10,-.42],[side*.52,2.35,-.33]],.055,steel);
      for(const y of [.7,1.2,1.7,2.08])box(.15,.07,.16,[side*.68,y,-.40],shell);
    }
    const scanner=movable('Thermal scan ring');ring(.47,.013,0,signal,scanner);scanner.position.y=.60;
    animate=(t,engage,progress)=>{
      shutters[0].rotation.y=-engage*.83;shutters[1].rotation.y=engage*.83;
      specimen.rotation.y=engage*.06*Math.sin(t*.45);
      scanner.position.y=.60+Math.sin(progress*Math.PI)*1.42;
    };
  } else {
    collider=[2.2,2.2];
    lathe([[0,0],[1.30,0],[1.48,.08],[1.50,.18],[1.41,.30],[1.17,.39],[0,.39]],shell);
    ring(1.37,.037,.25,steel);ring(1.18,.02,.38,warm);
    lathe([[.77,.35],[.96,.58],[.98,.84],[.88,1.05],[.88,2.73],[.96,2.92],[.94,3.18],[.74,3.40],[0,3.40]],steel);
    lathe([[.57,3.34],[.62,3.49],[.55,3.70],[.40,3.81],[.40,4.08],[.34,4.18],[0,4.18]],shell);
    for(const y of [.61,.84,1.05,2.74,2.94,3.17])ring(y<1.1?.98:.97,.045,y,copper);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,group=new T.Group();group.rotation.y=a;root.add(group);
      tube([[0,.22,1.29],[0,.49,1.60],[0,1.0,1.70],[0,2.50,1.67],[0,2.98,1.40],[0,3.22,.83]],.075,shell,group);
      tube([[.10,.42,1.20],[.10,.85,1.43],[.10,2.53,1.43],[.10,2.85,1.05]],.029,copper,group);
      box(.23,.13,.40,[0,.27,1.37],steel,group);
      box(.22,.65,.17,[0,1.68,.89],ceramic,group);
      box(.045,.47,.028,[0,1.68,.99],warm,group,.009);
      for(const y of [1.28,2.05])box(.19,.10,.18,[0,y,1.68],steel,group);
    }
    for(const y of [1.13,2.64]){ring(1.79,.095,y,copper);ring(1.79,.025,y+.08,warm);}
    const rotor=movable('Regulator induction rotor');rotor.position.y=2.70;
    ring(1.63,.045,0,steel,rotor);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;const vane=box(.21,.13,.29,[Math.sin(a)*1.62,0,Math.cos(a)*1.62],ceramic,rotor);vane.rotation.y=a;}
    const regulator=movable('Regulator actuator');regulator.position.set(0,.65,1.87);regulator.rotation.x=-.20;
    display(regulator,.48,.26);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;const p=new T.Group();p.rotation.y=a;root.add(p);tube([[0,.35,1.03],[0,.48,1.67],[0,.67,1.92],[0,.91,1.92]],.065,steel,p);}
    animate=(t,engage)=>{rotor.rotation.y=t*(.045+engage*.17);regulator.rotation.x=-.20-engage*.04;};
  }
  // Merge within each stationary frame, preserving all independently animated pivots.
  function mergeRigid(parent){
    for(const child of [...parent.children])if(child.isGroup)mergeRigid(child);
    const batches=new Map();
    for(const child of [...parent.children])if(child.isMesh&&!child.material.transparent){
      child.updateMatrix();const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();g.applyMatrix4(child.matrix);
      for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
      if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
      if(!batches.has(child.material))batches.set(child.material,[]);batches.get(child.material).push(g);
      child.geometry.dispose();parent.remove(child);
    }
    for(const [m,geometries] of batches){const g=mergeGeometries(geometries);geometries.forEach(x=>x.dispose());mesh(g,m,[0,0,0],parent);}
  }
  function collapseStaticGroups(parent){
    for(const child of [...parent.children])if(child.isGroup){
      collapseStaticGroups(child);
      if(!dynamic.includes(child)){
        child.updateMatrix();
        for(const part of [...child.children]){part.applyMatrix4(child.matrix);parent.add(part);}
        parent.remove(child);
      }
    }
  }
  collapseStaticGroups(root);mergeRigid(root);
  let state='idle',progress=0,time=0,engagement=0,disposed=false;
  function update(dt){
    if(disposed)return;dt=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));time+=dt;
    if(state==='working'){progress=Math.min(1,progress+dt/4.2);if(progress>=1-1e-9){progress=1;state='complete';}}
    const goal=state==='working'?1:state==='complete'?.35:0;
    engagement=T.MathUtils.damp(engagement,goal,3.5,dt);
    if(!reducedMotion)animate(time,engagement,progress);
    signal.emissiveIntensity=state==='complete'?.95:state==='working'?1.2:.7;
    warm.emissiveIntensity=state==='working'?1.1:state==='complete'?.65:.4;
    root.userData.machineState=state;root.userData.progress=progress;
  }
  update(0);
  return {root,collider,update,
    get state(){return state;},get progress(){return progress;},
    activate(){if(disposed||state==='working')return false;state='working';progress=0;update(0);return true;},
    restore(completed){state=completed?'complete':'idle';progress=completed?1:0;engagement=completed?.35:0;update(0);},
    dispose(){if(disposed)return;disposed=true;const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());maps.forEach(m=>m.dispose());root.removeFromParent();}
  };
}
