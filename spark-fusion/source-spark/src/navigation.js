export const spawn = {x:0,z:4.5};
export const chamber = {width:11.6, depth:12};
export const obstacles = [[0,-1.5,1.35],[-3.65,.65,.91],[3.65,-2.5,.91]];
export function accessible(x,z) {
  const radius=.25;
  return Math.abs(x)<=chamber.width/2-radius && Math.abs(z)<=chamber.depth/2-radius && obstacles.every(([cx,cz,r])=>Math.hypot(x-cx,z-cz)>=r+radius);
}
export function move(position, yaw, lateral, forward, dt) {
  const distance=Math.min(.05,Math.max(0,dt))*2.2/Math.max(1,Math.hypot(lateral,forward));
  const dx=(Math.cos(yaw)*lateral-Math.sin(yaw)*forward)*distance;
  const dz=(-Math.sin(yaw)*lateral-Math.cos(yaw)*forward)*distance;
  if(accessible(position.x+dx,position.z)) position.x+=dx;
  if(accessible(position.x,position.z+dz)) position.z+=dz;
}
