import * as T from '../../v15-est/vendor/three.module.js';

// Positions are metres. Local XY is the elevation of a frame; +Z faces the viewer.
const section = (points, depth, bevel = .015) => {
  const shape = new T.Shape(points.map(([x,y]) => new T.Vector2(x,y)));
  const g = new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:1});
  return g.translate(0,0,-depth/2);
};

function vaultStrip(half, height, width) {
  const crown = height - .39;
  const shoulder = Math.max(2.65,height*.56);
  const haunch = half - Math.min(half*.34,1.45);
  // A single continuous forged arch with integral angled knees and mitred crown.
  const inner = [[-half+.04,shoulder],[-half+.28,shoulder+.18],[-haunch,crown-.32],[-haunch+.32,crown],[haunch-.32,crown],[haunch,crown-.32],[half-.28,shoulder+.18],[half-.04,shoulder]];
  const outer = [...inner].reverse().map(([x,y])=>[x,y+width]);
  return section([...inner,...outer], .32);
}

export function buildWalls(scene,plan,m) {
  const root=new T.Group(); root.name='Forged bay frames';
  const box=new T.BoxGeometry();
  const hex=new T.CylinderGeometry(.5,.5,1,6).rotateX(Math.PI/2);
  const panel=section([[-.5,-.34],[-.34,-.5],[.32,-.5],[.5,-.3],[.5,.28],[.30,.5],[-.37,.5],[-.5,.34]],1,.012);
  const cache=new Map(), transform=new T.Object3D(), rotation=new T.Quaternion();
  const local=new T.Quaternion(), yAxis=new T.Vector3(0,1,0), zAxis=new T.Vector3(0,0,1);
  const geometries=new Map();
  function instance(g,finish,pos,scale,yaw,tilt=0) {
    if(!cache.has(g))cache.set(g,new Map());
    const batches=cache.get(g);
    if(!batches.has(finish))batches.set(finish,[]);
    transform.position.copy(pos);
    transform.quaternion.copy(rotation.setFromAxisAngle(yAxis,yaw)).multiply(local.setFromAxisAngle(zAxis,tilt));
    transform.scale.set(...scale);
    transform.updateMatrix();
    batches.get(finish).push(transform.matrix.clone());
  }
  for(const r of plan.rooms){
    const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2;
    const runZ=r.id==='A'||r.id==='B';
    const half=(runZ?r.x1-r.x0:r.z1-r.z0)/2;
    const length=runZ?r.z1-r.z0:r.x1-r.x0;
    const yaw=runZ?0:Math.PI/2;
    const pt=(x,y,z)=>new T.Vector3(cx+(runZ?x:z),y,cz+(runZ?z:-x));
    const key=[half,r.h].join('/');
    if(!geometries.has(key))geometries.set(key,vaultStrip(half,r.h,Math.min(.29,r.h*.047)));
    const count=Math.max(2,Math.round(length/(half>4?6.4:4.4)));
    for(let i=0;i<count;i++){
      const z=(i+.5)*length/count-length*.5;
      for(const [offset,finish,depth] of [[0,'anodized',1.85],[-.30,'titanium',.15],[.30,'titanium',.15]]){
        instance(geometries.get(key),finish,pt(0,0,z+offset),[1,1,depth],yaw);
      }
      const crown=r.h-.385;
      instance(panel,'steel',pt(0,crown+.065,z),[Math.min(1.44,half*.24),.43,.66],yaw);
      for(const sign of [-1,1]){
        instance(panel,'titanium',pt(0,crown+.065,z+sign*.348),[.48,.34,.03],yaw);
        instance(panel,'dark',pt(0,crown+.065,z+sign*.371),[.36,.26,.018],yaw);
        for(let t=-1;t<=1;t++)instance(box,'emitter',pt(t*.066,crown+.065,z+sign*.386),[.027,.108-Math.abs(t)*.026,.012],yaw,t*.24);
      }
      for(const side of [-1,1]){
        const foot=pt(side*half,0,z);
        const hasWall=plan.walls.some(w=>w.id===r.id && Math.abs(foot.x-Math.max(w.x1,Math.min(w.x2,foot.x)))<.02 && Math.abs(foot.z-Math.max(w.z1,Math.min(w.z2,foot.z)))<.02);
        if(!hasWall)continue;
        const h=Math.max(2.65,r.h*.56),x=side*(half-.122);
        instance(panel,'anodized',pt(x,h*.50,z),[.18,h,.70],yaw);
        for(const y of [.35,1.85,h-.33]){
          instance(panel,'titanium',pt(x,y,z),[.19,.12,.77],yaw);
        }
        for(const offset of [-.23,.23]){
          instance(box,'steel',pt(side*(half-.211),h*.5,z+offset),[.025,h*.79,.058],yaw);
        }
        instance(panel,'steel',pt(side*(half-.26),h-.02,z),[.46,.43,.77],yaw);
      }
    }
  }
  // Bays are built only on solid wall spans. Gallery mouths and door openings stay free.
  for(const w of plan.walls){
    const r=plan.rooms.find(v=>v.id===w.id);
    const dx=w.x2-w.x1,dz=w.z2-w.z1,length=Math.hypot(dx,dz);
    if(length<1.9)continue;
    let tx=dx/length,tz=dz/length;
    if(((r.x0+r.x1)/2-w.x1)*(-tz)+((r.z0+r.z1)/2-w.z1)*tx<0){tx=-tx;tz=-tz;}
    const yaw=Math.atan2(-tz,tx),nx=-tz,nz=tx;
    const mx=(w.x1+w.x2)/2,mz=(w.z1+w.z2)/2;
    const at=(u,y,depth)=>new T.Vector3(mx+u*tx+nx*depth,y,mz+u*tz+nz*depth);
    const count=Math.max(1,Math.round(length/3.4)),pitch=length/count;
    for(let i=0;i<count;i++){
      const u=(i+.5)*pitch-length/2, bayWidth=Math.min(2.85,pitch*.85);
      const center=r.id==='B'||r.id==='E'?r.h*.76:r.h*.61;
      function piece(geo,mat,offset,y,depth,width,height,thickness,angle=0){
        instance(geo,mat,at(u+offset,y,depth),[width,height,thickness],yaw,angle);
      }
      piece(panel,'steel',0,center,.20,bayWidth,1.16,.14);
      piece(panel,'dark',0,center,.29,bayWidth*.92,.91,.07);
      const ventilated=(i+(r.id==='D'?1:0))%3===0;
      if(ventilated){
        for(let k=0;k<7;k++)piece(box,'anodized',0,center-.30+k*.10,.355,bayWidth*.77,.045,.085);
      } else {
        for(const side of [-1,1]){
          piece(panel,'anodized',side*bayWidth*.21,center,.34,bayWidth*.38,.73,.07);
          piece(box,'titanium',side*bayWidth*.28,center+.18,.385,bayWidth*.19,.035,.045);
          piece(box,'steel',side*bayWidth*.20,center-.11,.38,bayWidth*.23,.046,.037);
        }
      }
      for(const side of [-1,1]){
        piece(panel,'titanium',side*bayWidth*.45,center,.33,.095,.64,.16);
        for(const yy of [-.22,.22])piece(hex,'steel',side*bayWidth*.45,center+yy,.417,.074,.074,.033);
      }
    }
  }
  for(const [geo,sets] of cache)for(const [finish,arr] of sets){
    const mesh=new T.InstancedMesh(geo,m[finish],arr.length);
    mesh.name='Bay frame / '+finish;
    arr.forEach((mat,i)=>mesh.setMatrixAt(i,mat));mesh.computeBoundingSphere();
    mesh.receiveShadow=true;mesh.castShadow=geo!==hex && finish!=='emitter';root.add(mesh);
  }
  scene.add(root);return root;
}
