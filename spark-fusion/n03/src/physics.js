export const PLAYER_RADIUS=.3, EYE_HEIGHT=1.68, SPEED=2.35;
export const BOUNDS={minX:-8.5,maxX:8.5,minZ:-12.5,maxZ:12.5};
export function intersects(x,z,box,r=PLAYER_RADIUS){const cx=Math.max(box.minX,Math.min(x,box.maxX)),cz=Math.max(box.minZ,Math.min(z,box.maxZ));return (x-cx)**2+(z-cz)**2<r*r;}
export function blocked(x,z,boxes,r=PLAYER_RADIUS){return x<BOUNDS.minX+r||x>BOUNDS.maxX-r||z<BOUNDS.minZ+r||z>BOUNDS.maxZ-r||boxes.some(b=>intersects(x,z,b,r));}
export function moveWithCollisions(position,dx,dz,boxes){const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.065));let hits=0;for(let i=0;i<count;i++){const nx=position.x+dx/count,nz=position.z+dz/count;if(!blocked(nx,position.z,boxes))position.x=nx;else hits++;if(!blocked(position.x,nz,boxes))position.z=nz;else hits++;}return hits;}
export function direction(yaw,right,forward){const length=Math.hypot(right,forward);if(length>1){right/=length;forward/=length;}return {x:Math.cos(yaw)*right-Math.sin(yaw)*forward,z:-Math.sin(yaw)*right-Math.cos(yaw)*forward};}
export function canActivate(position,yaw,boxes){const dx=-position.x,dz=-3-position.z,d=Math.hypot(dx,dz);if(d>2.45||d<.001)return false;const dot=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/d;if(dot<.32)return false;return !boxes.filter(b=>b.id!=='chair').some(b=>{for(let t=.1;t<.85;t+=.1)if(intersects(position.x+dx*t,position.z+dz*t,b,.02))return true;return false;});}
export function floorHeight(x,z){return Math.hypot(x,z+3)<3.1?.075:0;}
