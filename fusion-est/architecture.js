import * as T from '../vendor/three.module.js';

// Shared cross-sections. All parts are rigid and can use the same draw per finish.
function armour() {
  const profile = new T.Shape();
  const points = [[-.48,-.37],[-.36,-.5],[.37,-.5],[.5,-.35],[.5,.33],[.33,.5],[-.32,.5],[-.48,.36]];
  points.forEach(([x,y],i)=>i ? profile.lineTo(x,y) : profile.moveTo(x,y));
  profile.closePath();
  const geometry = new T.ExtrudeGeometry(profile,{depth:.85,bevelEnabled:true,bevelSegments:1,bevelThickness:.05,bevelSize:.025,curveSegments:1});
  geometry.translate(0,0,-.425);
  return geometry;
}

export function dress(scene,plan,m) {
  const root = new T.Group();
  root.name='Corridor architecture';
  const geometries = {box:new T.BoxGeometry(),panel:armour(),tube:new T.CylinderGeometry(.5,.5,1,12)};
  const batches=new Map();
  const dummy=new T.Object3D();
  function record(form,finish) {
    const key=form+'/'+finish;
    if(!batches.has(key)) batches.set(key,{geo:geometries[form],material:m[finish],matrices:[]});
    dummy.updateMatrix();
    batches.get(key).matrices.push(dummy.matrix.clone());
  }
  function add(form,finish,x,y,z,w,h,d,yaw=0) {
    dummy.position.set(x,y,z);dummy.rotation.set(0,yaw,0);dummy.scale.set(w,h,d);record(form,finish);
  }
  function rod(a,b,diameter,finish) {
    const direction=new T.Vector3().subVectors(b,a);
    dummy.position.copy(a).lerp(b,.5);dummy.scale.set(diameter,direction.length(),diameter);
    dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());record('tube',finish);
  }
  for (const room of plan.rooms) {
    const cx=(room.x0+room.x1)/2,cz=(room.z0+room.z1)/2;
    const w=room.x1-room.x0,d=room.z1-room.z0;
    const nx=Math.ceil(w/2.45),nz=Math.ceil(d/2.45),tw=w/nx,td=d/nz;
    for(let i=0;i<nx;i++) for(let j=0;j<nz;j++) {
      const x=room.x0+(i+.5)*tw,z=room.z0+(j+.5)*td;
      add('box',(i+2*j)%5===2?'anodized':'deck',x,.009,z,tw-.026,.018,td-.027);
      if((i+j)%3===0){
        add('box','composite',x,.023,z,.46,.012,.55);
        for(let slat=0;slat<5;slat++)add('box','steel',x,.031,z+(slat-2)*.10,.41,.009,.034);
      }
    }
    const longitudinal=d>=w;
    const roof=(u,v,y)=>new T.Vector3(cx+(longitudinal?u:v),y,cz+(longitudinal?v:u));
    const span=(longitudinal?w:d),length=(longitudinal?d:w);
    for(const side of [-1,1]){
      for(let k=0;k<3;k++){
        const offset=side*(span*.33+k*.165);
        rod(roof(offset,-length*.5,room.h-.28),roof(offset,length*.5,room.h-.28),k===2?.09:.135,k===1?'copper':'steel');
      }
    }
    const count=Math.ceil(length/3.5);
    for(let i=0;i<count;i++){
      const v=(i+.5)*length/count-length/2;
      const a=roof(0,v,room.h-.13);
      add('box','anodized',a.x,a.y,a.z,longitudinal?span:.21,.26,longitudinal?.21:span);
      for(const side of [-1,1]){
        rod(roof(side*(span*.5-.13),v,room.h-1.10),roof(side*(span*.5-.85),v,room.h-.19),.23,'titanium');
        const strip=roof(side*span*.22,v,room.h-.34);
        add('box','white',strip.x,strip.y,strip.z,longitudinal?.09:1.12,.04,longitudinal?1.12:.09);
      }
    }
  }
  for(const wall of plan.walls){
    const room=plan.rooms.find(r=>r.id===wall.id);
    if(!room) throw Error('Unknown wall room '+wall.id);
    const dx=wall.x2-wall.x1,dz=wall.z2-wall.z1,L=Math.hypot(dx,dz);
    if(L<.1)continue;
    const tx=dx/L,tz=dz/L;
    const cx=(room.x0+room.x1)/2,cz=(room.z0+room.z1)/2;
    const sign=Math.sign((cx-wall.x1)*(-tz)+(cz-wall.z1)*tx)||1;
    const nx=-tz*sign,nz=tx*sign,yaw=Math.atan2(-tz,tx);
    const p=(s,y,n)=>new T.Vector3(wall.x1+s*tx+n*nx,y,wall.z1+s*tz+n*nz);
    const part=(form,finish,s,y,n,w,h,d)=>{const pos=p(s,y,n);add(form,finish,pos.x,y,pos.z,w,h,d,yaw)};
    const count=Math.ceil(L/3.25),pitch=L/count;
    for(let i=0;i<count;i++){
      const s=(i+.5)*pitch;
      part('panel','anodized',s,wall.h*.51,.042,pitch-.09,wall.h*.88,.13);
      part('panel','steel',s,wall.h*.69,.12,pitch*.83,wall.h*.27,.065);
      part('panel','composite',s,1.01,.12,pitch*.79,.84,.055);
      for(let k=0;k<6;k++)part('box','titanium',s, .73+k*.093,.161,pitch*.67,.038,.05);
      for(const k of [-1,1])part('box','steel',s+pitch*.424*k,wall.h*.5,.134,.036,wall.h*.64,.075);
      if(i%3===1 && room.id==='D'){
        part('panel','dark',s,1.48,.176,pitch*.78,2.84,.09);
        part('box','steel',s,1.51,.23,.034,2.59,.03);
        part('box','emitter',s,2.82,.23,pitch*.53,.035,.026);
      }else{
        part('box',i%3===0?'emitter':'white',s,wall.h*.52,.145,pitch*.51,.045,.028);
      }
      if(wall.h>=4.9 && (room.id==='B'||room.id==='E')){
        const h=wall.h*.55;
        part('box','anodized',s,h,.39,pitch-.025,.13,.72);
        rod(p(s-pitch*.46,h,.66),p(s-pitch*.46,h+.65,.66),.06,'steel');
        rod(p(s-pitch*.5,h+.64,.66),p(s+pitch*.5,h+.64,.66),.058,'titanium');
        rod(p(s-pitch*.3,h-.46,.10),p(s-pitch*.3,h-.08,.69),.09,'steel');
      }
      part('box','aluminium',s,.035,.37,pitch*.92,.035,.044);
      part('box','emitter',s,.056,.37,pitch*.30,.012,.030);
    }
  }
  for(const {geo,material,matrices} of batches.values()){
    const mesh=new T.InstancedMesh(geo,material,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.computeBoundingSphere();mesh.receiveShadow=true;root.add(mesh);
  }
  scene.add(root);return root;
}
