// Metres, seconds. Independent from rendering so movement and sight can be tested.
export const PLAYER_RADIUS=.24;
export function clearOfObstacle(x,z,o,padding=PLAYER_RADIUS){
  if(Array.isArray(o))return Math.hypot(x-o[0],z-o[1])>=o[2]+padding;
  let localX=x-o.x,localZ=z-o.z;
  if(Number.isFinite(o.yaw)){const c=o.cosYaw??Math.cos(o.yaw),s=o.sinYaw??Math.sin(o.yaw),rx=localX*c-localZ*s;localZ=localX*s+localZ*c;localX=rx;}
  const dx=Math.max(Math.abs(localX)-o.halfX,0),dz=Math.max(Math.abs(localZ)-o.halfZ,0);
  return Math.hypot(dx,dz)>=padding;
}
export function createWalker(position,walkable,obstacles){
  let vx=0,vz=0;
  const valid=(x,z)=>walkable(x,z)&&obstacles.every(o=>clearOfObstacle(x,z,o));
  return {valid,stop(){vx=vz=0;},step(dt,yaw,right,forward){
    dt=Math.min(.1,Math.max(0,dt));const norm=Math.max(1,Math.hypot(right,forward));
    const tx=2.2*(Math.cos(yaw)*right-Math.sin(yaw)*forward)/norm;
    const tz=2.2*(-Math.sin(yaw)*right-Math.cos(yaw)*forward)/norm;
    const n=Math.max(1,Math.ceil(dt/.008));
    for(let i=0;i<n;i++){
      const h=dt/n,k=1-Math.exp(-h*(right||forward?10:16));vx+=(tx-vx)*k;vz+=(tz-vz)*k;
      if(valid(position.x+vx*h,position.z))position.x+=vx*h;else vx=0;
      if(valid(position.x,position.z+vz*h))position.z+=vz*h;else vz=0;
    }
  }};
}
export function sightScore(position,yaw,pitch,target,range,walkable,obstacles,ignore){
  const dx=target[0]-position.x,dz=target[2]-position.z,d=Math.hypot(dx,dz);
  if(d>range||d<.05||Math.abs(pitch)>1.15)return -Infinity;
  const facing=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/d;
  if(facing<.55)return -Infinity;
  for(let i=1,n=Math.ceil(d/.12);i<n;i++){
    const x=position.x+dx*i/n,z=position.z+dz*i/n;
    if(!walkable(x,z)||obstacles.some(o=>o!==ignore&&!clearOfObstacle(x,z,o,.025)))return -Infinity;
  }
  return facing*4-d*.15;
}
