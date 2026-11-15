import RAPIER from '@dimforge/rapier3d-compat';
import * as T from 'three';
let initialization;
export async function physics(architecture,{spawn=[0,.02,8],speed=2.6}={}){
 await (initialization??=RAPIER.init());
 const world=new RAPIER.World({x:0,y:-9.81,z:0}),colliders=new Map(),stepTime=1/60;
 const moving=[];
 for(const part of architecture.collisionMeshes()){
  const p=part.geometry.attributes.position,vertices=new Float32Array(p.count*3),point=new T.Vector3();
  for(let i=0;i<p.count;i++)point.fromBufferAttribute(p,i).applyMatrix4(part.matrix).toArray(vertices,i*3);
  const indices=part.geometry.index?new Uint32Array(part.geometry.index.array):Uint32Array.from({length:p.count},(_,i)=>i);
  const owner=architecture.lifts?.find(l=>l.id===part.id),rigid=owner?world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()):undefined;
  const collider=world.createCollider(owner?RAPIER.ColliderDesc.cuboid(owner.motion.half,.11,owner.motion.half).setTranslation(owner.motion.x,-.11+(owner.motion.deckHeight||0),owner.motion.z):RAPIER.ColliderDesc.trimesh(vertices,indices,RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES),rigid);colliders.set(collider.handle,part.id);if(owner){moving.push({owner,rigid});for(const rail of owner.motion.rails||[]){const c=world.createCollider(RAPIER.ColliderDesc.cuboid(...rail.size).setTranslation(...rail.center),rigid);colliders.set(c.handle,owner.id+'-cabin');}}
 }
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...spawn));
 const capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.62,.28).setTranslation(0,.90,0),body);
 const controller=world.createCharacterController(.015);
 controller.setMaxSlopeClimbAngle(Math.PI/4);controller.setMinSlopeSlideAngle(Math.PI/3);
 controller.enableAutostep(.25,.3,true);controller.enableSnapToGround(.25);controller.setSlideEnabled(true);
 world.timestep=stepTime;world.step();
 let accumulator=0,vy=0,disposed=false,grounded=false;const velocity=new T.Vector3(),position=new T.Vector3(...spawn),previous=position.clone(),visualPosition=position.clone();
 const api={position,visualPosition,contacts(){return Array.from({length:controller.numComputedCollisions()},(_,i)=>{const c=controller.computedCollision(i);return {id:colliders.get(c.collider?.handle),normal:c.normal1};});},get grounded(){return grounded;},get colliderCount(){return colliders.size+1;},
  step(dt,{right=0,forward=0,yaw=0}={}){
   if(disposed||!Number.isFinite(dt))return;accumulator+=Math.min(.1,Math.max(0,dt));
   const norm=Math.max(1,Math.hypot(right,forward)),dx=(Math.cos(yaw)*right-Math.sin(yaw)*forward)*speed/norm,dz=(-Math.sin(yaw)*right-Math.cos(yaw)*forward)*speed/norm;
   while(accumulator>=stepTime){
    let support=null;
    for(const {owner,rigid}of moving){const m=owner.motion,old=m.y,delta=Math.sign(m.goal-old)*Math.min(Math.abs(m.goal-old),m.speed*stepTime);m.y+=delta;rigid.setNextKinematicTranslation({x:0,y:m.y,z:0});owner.mesh.position.y=m.y;for(const t of architecture.targets)if(t.lift===owner)t.position.y=t.baseY+m.y;
     const feet=body.translation();if(Math.abs(feet.x-m.x)<m.half-.015&&Math.abs(feet.z-m.z)<m.half-.015&&Math.abs(feet.y-old-(m.deckHeight||0))<.08){support=owner;body.setTranslation({x:feet.x,y:m.y+(m.deckHeight||0)+.018,z:feet.z},true);}
    }
    for(const landing of architecture.landings||[]){const feet=body.translation();if(Math.abs(feet.x-landing.x)<landing.halfX+.24&&Math.abs(feet.z-landing.z)<landing.halfZ+.24&&Math.abs(feet.y-landing.y)<.25){support=landing;body.setTranslation({x:feet.x,y:landing.y+.018,z:feet.z},true);}}
    const blend=1-Math.exp(-14*stepTime);velocity.x+=(dx-velocity.x)*blend;velocity.z+=(dz-velocity.z)*blend;
    vy=grounded?-.01:Math.max(-25,vy-18*stepTime);
    controller.computeColliderMovement(capsule,{x:velocity.x*stepTime,y:support?0:vy*stepTime,z:velocity.z*stepTime},RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,undefined,c=>!support||colliders.get(c.handle)!==support.id);
    const move=controller.computedMovement(),old=body.translation();grounded=!!support||controller.computedGrounded();previous.copy(position);
    body.setNextKinematicTranslation({x:old.x+move.x,y:old.y+move.y,z:old.z+move.z});world.step();
    const p=body.translation();position.set(p.x,p.y,p.z);accumulator-=stepTime;
   }visualPosition.lerpVectors(previous,position,accumulator/stepTime);
  },
  reset(feet=spawn){if(disposed)return;body.setTranslation({x:feet[0],y:feet[1],z:feet[2]},true);body.setNextKinematicTranslation({x:feet[0],y:feet[1],z:feet[2]});world.step();position.fromArray(feet);previous.copy(position);visualPosition.copy(position);vy=0;velocity.set(0,0,0);accumulator=0;grounded=false;},
  stop(){velocity.set(0,0,0);accumulator=0;},
  select(origin,direction){
   if(disposed)return null;let selected=null,best=-Infinity;const to=new T.Vector3();
   for(const target of architecture.targets){
    to.copy(target.position).sub(origin);const distance=to.length();if(distance<.01||distance>target.range)continue;to.divideScalar(distance);
    const facing=direction.dot(to);if(facing<.92)continue;
    const hit=world.castRay(new RAPIER.Ray(origin,to),distance-.08,true,RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,undefined,capsule,body);
    if(hit)continue;const score=facing*4-distance*.2;if(score>best){best=score;selected=target;}
   }return selected;
  },
  dispose(){if(disposed)return;disposed=true;world.removeCharacterController(controller);world.free();colliders.clear();}
 };return api;
}




