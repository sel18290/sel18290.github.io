import * as T from '../vendor/three.module.js';

const TAU = Math.PI * 2;
const Y = new T.Vector3(0,1,0);
const Z = new T.Vector3(0,0,1);

function casting(radius, depth) {
  const section = [[.78,.04],[.79,.23],[.86,.39],[.94,.39],[1,.24],[1,.10],[.98,.04],[.98,-.08],[1,-.12],[.97,-.24],[.91,-.35],[.82,-.29],[.78,-.16],[.78,.04]];
  return new T.LatheGeometry(section.map(([r,y])=>new T.Vector2(r*radius,y*depth)),64);
}

function batches(root, materials) {
  const forms = {
    plate:new T.BoxGeometry(), rod:new T.CylinderGeometry(.5,.5,1,10),
    bolt:new T.CylinderGeometry(.5,.5,1,6), casting:casting(1,1),
    band:new T.TorusGeometry(1,.023,8,80).rotateX(Math.PI/2)
  };
  const groups=new Map();
  const dummy=new T.Object3D();
  function put(shape, finish, p, scale, q) {
    const key=shape+'-'+finish;
    if(!groups.has(key)) groups.set(key,{shape,finish,matrices:[]});
    dummy.position.copy(p);dummy.scale.set(...scale);
    if(q)dummy.quaternion.copy(q);else dummy.quaternion.identity();
    dummy.updateMatrix();
    groups.get(key).matrices.push(dummy.matrix.clone());
  }
  function link(a,b,diameter,finish,depth=diameter,shape='rod') {
    const axis=b.clone().sub(a);
    put(shape,finish,a.clone().lerp(b,.5),[diameter,axis.length(),depth],new T.Quaternion().setFromUnitVectors(Y,axis.normalize()));
  }
  function flush(){
    for(const {shape,finish,matrices} of groups.values()){
      const mesh=new T.InstancedMesh(forms[shape],materials[finish],matrices.length);
      mesh.name='casting-'+shape+'-'+finish;
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.computeBoundingSphere();mesh.receiveShadow=true;
      root.add(mesh);
    }
  }
  return {put,link,flush};
}

function runway(kit,start,end,width) {
  const along=end.clone().sub(start); const length=along.length(); along.normalize();
  const lateral=new T.Vector3(along.z,0,-along.x);
  const rot=new T.Quaternion().setFromUnitVectors(Z,along);
  function at(u,v,h){return start.clone().addScaledVector(along,v).addScaledVector(lateral,u).setY(h);}
  function plate(u,v,y,w,d,h,finish){kit.put('plate',finish,at(u,v,y),[w,h,d],rot);}
  const count=Math.ceil(length/1.65), pitch=length/count;
  for(let i=0;i<count;i++){
    const v=(i+.5)*pitch;
    const access=i%4===2;
    plate(0,v,.040,width,pitch-.025,.010,access?'anodized':'composite');
    if(access){
      for(const side of [-1,1]){
        plate(side*.30*width,v,.049,.034,.34,.008,'titanium');
        for(const offset of [-.17,.17])plate(side*.30*width,v+offset,.051,.082,.045,.012,'steel');
      }
    }else{
      // Long load-bearing bars sit above the finer transverse tie bars.
      for(let j=0;j<15;j++) plate((j-7)*width/16,v,.059,.029,pitch-.10,.025,'steel');
      for(let j=0;j<4;j++)plate(0,v+pitch*(j-1.5)/4,.049,width-.07,.045,.012,'titanium');
    }
    for(const side of [-1,1]){
      plate(side*(width/2+.065),v,.058,.095,pitch-.014,.024,'titanium');
      plate(side*(width/2+.19),v,.049,.105,pitch-.036,.02,'anodized');
      if(i%3!==2)plate(side*(width/2+.19),v,.061,.027,pitch*.64,.006,'emitter');
      for(const edge of [-1,1])kit.put('bolt','steel',at(side*(width/2+.065),v+edge*pitch*.38,.075),[.052,.012,.052]);
    }
    plate(0,v-pitch*.5+.029,.059,width,.053,.024,'aluminium');
  }
}

function gallerySpine(kit,r){
  const longitudinal=r.z1-r.z0>r.x1-r.x0;
  const width=longitudinal?r.x1-r.x0:r.z1-r.z0;
  const length=longitudinal?r.z1-r.z0:r.x1-r.x0;
  const x=(r.x0+r.x1)/2,z=(r.z0+r.z1)/2;
  const p=(u,v,h)=>new T.Vector3(x+(longitudinal?u:v),h,z+(longitudinal?v:u));
  const orient=new T.Quaternion().setFromAxisAngle(Y,longitudinal?0:Math.PI/2);
  const bays=Math.ceil(length/3.8);
  for(const side of [-1,1]){
    const u=side*width*.31;
    for(let i=0;i<bays;i++){
      const a=(i/bays-.5)*length, b=((i+1)/bays-.5)*length;
      const top=r.h-.53;
      for(let k=0;k<2;k++){
        const offset=u+side*(k-.5)*.19;
        let last=p(offset,a,top);
        for(let step=1;step<=5;step++){
          const t=step/5, sag=(r.id==='D'?.32:.18)*4*t*(1-t);
          const next=p(offset,a+t*(b-a),top-sag);
          kit.link(last,next,k?.067:.105,k?'polymer':'steel');last=next;
        }
      }
      const mid=(a+b)/2;
      kit.put('plate','anodized',p(u,mid,top-.23),[.38,.14,.76],orient);
      kit.put('plate','white',p(u,mid,top-.305),[.22,.012,.51],orient);
      for(const offset of [-.18,.18])kit.put('plate','titanium',p(u,mid+offset,top-.315),[.3,.019,.035],orient);
      for(const offset of [-.12,.12])kit.link(p(u+offset,a,r.h-.1),p(u+offset,a,top-.06),.042,'steel');
      kit.put('plate','aluminium',p(u,a,top-.06),[.35,.055,.09],orient);
    }
  }
}

function crown(kit,r,x,z,radius){
  const base=r.h-1.1; const n=r.id==='E'?12:8;
  const p=(rad,angle,y)=>new T.Vector3(x+rad*Math.cos(angle),y,z+rad*Math.sin(angle));
  for(const [factor,h,thickness,finish] of [[1,0,.94,'anodized'],[.81,-.36,.60,'titanium'],[.65,-.62,.52,'steel']]){
    kit.put('casting',finish,p(0,0,base+h),[radius*factor,thickness,radius*factor]);
    kit.put('band','emitter',p(0,0,base+h-.15),[radius*factor*.97,.75,radius*factor*.97]);
  }
  for(let i=0;i<n;i++){
    const a=TAU*i/n;
    kit.link(p(radius*1.16,a,r.h-.10),p(radius*.94,a,base),.12,'titanium');
    kit.link(p(radius*.60,a,base-.62),p(radius*.90,a,base+.15),.13,'anodized',.22,'plate');
    kit.link(p(radius*1.16,a,r.h-.16),p(radius*1.16,a+TAU/n,r.h-.16),.12,'steel');
    kit.put('bolt','steel',p(radius*1.16,a,r.h-.15),[.32,.21,.32]);
  }
}

export function buildDecks(scene,plan,materials){
  const root=new T.Group();root.name='Infrastructure de circulation et de suspension';
  for(const r of plan.rooms){
    const section=new T.Group(); section.name='Deck-'+r.id; root.add(section);
    const kit=batches(section,materials);
    const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2;
    const v=(x,z)=>new T.Vector3(x,0,z);
    if(r.id==='B'){
      runway(kit,v(cx,r.z1),v(cx,cz+.91),1.45);
      runway(kit,v(cx+.9,cz),v(r.x0,cz),1.45);
      crown(kit,r,r.x1-(r.x1-r.x0)*.33,cz-.6,2.46);
    }else if(r.id==='E'){
      runway(kit,v(r.x1,cz),v(cx+3.7,cz),1.45);
      crown(kit,r,cx-1,cz,3.04);
    }else{
      const zAxis=r.z1-r.z0>r.x1-r.x0;
      runway(kit,zAxis?v(cx,r.z1):v(r.x1,cz),zAxis?v(cx,r.z0):v(r.x0,cz),1.45);
      gallerySpine(kit,r);
    }
    kit.flush();
  }
  scene.add(root);return root;
}
