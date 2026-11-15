import * as T from '../vendor/three.module.js';

// Sample real fixture positions. The nearest luminaires share a fixed GPU light budget.
// The spare candidate sets a continuous fade boundary during slot reassignment.
export function architecturalLights(scene,rooms,mobile) {
  const fixtures=[];
  for(const r of rooms){
    const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2;
    const hall=r.id==='B'||r.id==='E';
    const alongZ=r.z1-r.z0>r.x1-r.x0,span=alongZ?r.x1-r.x0:r.z1-r.z0;
    const length=alongZ?r.z1-r.z0:r.x1-r.x0;
    const count=hall?3:Math.ceil(length/5);
    for(let i=0;i<count;i++){
      const station=((i+.5)/count-.5)*length;
      for(const side of [-1,1]){
        const offset=side*(span*(hall?.38:.29));
        const pos=new T.Vector3(cx+(alongZ?offset:station),r.h*(hall?.65:.81),cz+(alongZ?station:offset));
        fixtures.push({pos,color:new T.Color(0xe3ebff),power:hall?78:45,dist:0});
      }
    }
  }
  // Diffusers and their recessed housings mark the origin of every practical light.
  const holder=new T.InstancedMesh(new T.BoxGeometry(.82,.12,.32),new T.MeshStandardMaterial({color:0x383b40,roughness:.5,metalness:.82}),fixtures.length);
  const strip=new T.InstancedMesh(new T.BoxGeometry(.66,.032,.19),new T.MeshStandardMaterial({color:0xdce6f2,emissive:0xd6e2ff,emissiveIntensity:1.8}),fixtures.length);
  const hanger=new T.InstancedMesh(new T.CylinderGeometry(.034,.034,1,8),holder.material,fixtures.length);
  const frame=new T.Object3D();
  fixtures.forEach((f,i)=>{
    const r=rooms.find(r=>f.pos.x>=r.x0&&f.pos.x<=r.x1&&f.pos.z>=r.z0&&f.pos.z<=r.z1);
    const drop=r.h-f.pos.y;
    frame.scale.set(1,drop,1);frame.position.copy(f.pos);frame.position.y+=drop/2;
    frame.updateMatrix();hanger.setMatrixAt(i,frame.matrix);
    frame.scale.set(1,1,1);frame.position.copy(f.pos);frame.updateMatrix();holder.setMatrixAt(i,frame.matrix);
    frame.position.y-=.068;frame.updateMatrix();strip.setMatrixAt(i,frame.matrix);
  });
  scene.add(holder,strip,hanger);
  const slots=Array.from({length:mobile?2:4},()=>{
    const lamp=new T.PointLight(0xffffff,0,14,2);scene.add(lamp);return lamp;
  });
  const last=new T.Vector3(Infinity,Infinity,Infinity);
  return function update(position){
    if(last.distanceToSquared(position)<.018)return;
    last.copy(position);
    for(const f of fixtures)f.dist=f.pos.distanceTo(position);
    fixtures.sort((a,b)=>a.dist-b.dist);
    const boundary=fixtures[slots.length].dist;
    slots.forEach((lamp,i)=>{
      const f=fixtures[i];lamp.position.copy(f.pos);lamp.color.copy(f.color);
      lamp.intensity=f.power*T.MathUtils.smoothstep(boundary-f.dist,0,1.8);
    });
  };
}
