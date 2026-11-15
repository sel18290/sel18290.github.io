import {fieldAnimation} from './field-animation.js';
import {sectorCells,cellAt} from './sector-plan.js';
import * as T from 'three';
export function buildSector(root,panel,{steel,graphite,seal,lamp,cyan,deck,paint=graphite,ceramic=steel}){
  const amber=new T.MeshBasicMaterial({color:0xf59c57}),blue=new T.MeshBasicMaterial({color:0x7cd3e0});
  const lettering=new Map();
  function sign(text,color,x,y,z,yaw){
    if(typeof document==='undefined'||!document.createElement('canvas').getContext)return;
    if(!lettering.has(text)){
      const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;
      const ctx=canvas.getContext('2d');if(!ctx)return;ctx.fillStyle='#182127';ctx.fillRect(0,0,768,128);
      ctx.fillStyle=color;ctx.fillRect(0,0,12,128);ctx.font='bold 49px sans-serif';ctx.textBaseline='middle';ctx.fillText(text,30,65,710);
      const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
      lettering.set(text,new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));
    }
    const label=new T.Mesh(new T.PlaneGeometry(3,.5),lettering.get(text));label.position.set(x,y,z);label.rotation.y=yaw;root.add(label);
  }
  for(const {x,z,zone} of sectorCells){
    if(zone==='Observatoire')continue;
    const cx=x*2-4,cz=z*2-5;
    const large=['Laboratoire cryogénique','Chambre de puissance','Cartographie orbitale'].includes(zone);
    const height=large?5.2:3.4,accent=x<0?blue:x>4?amber:cyan;
    panel([1.994,.13,1.994],[cx,-.06,cz],deck);
    panel([2,.14,2],[cx,height,cz],seal);
    if((x+z)%3===0)panel([1.1,.06,.13],[cx,height-.13,cz],lamp);
    if(!large && (x+z)%2===0)panel([1.9,.13,.14],[cx,height-.16,cz],steel);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      if(cellAt(x+dx,z+dz))continue;
      const wx=cx+dx*.97,wz=cz+dz*.97;
      const slab=(len,h,thick,y,offset,material)=>panel(dx?[thick,h,len]:[len,h,thick],[wx-dx*offset,y,wz-dz*offset],material);
      slab(2.02,height,.12,height/2,0,seal);
      slab(1.90,height-.66,.14,height/2,.035,zone.includes('cryog')?ceramic:zone==='Chambre de puissance'?graphite:paint);
      slab(1.94,.24,.18,.18,.09,steel);
      if((x+z)%3===0)slab(.76,.045,.12,1.02,.11,accent);
      slab(.13,height-.18,.22,height/2,.09,steel);
      if((x+z)%5===0)for(let k=0;k<3;k++)slab(1.34,.055,.15,1.41+.10*k,.10,seal);
    }
    // Clerestory at each change of ceiling height.
    if(large)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const neighbor=cellAt(x+dx,z+dz);
      if(neighbor&&neighbor.zone!==zone)panel(dx?[.22,1.8,2]:[2,1.8,.22],[cx+dx,4.3,cz+dz],steel);
    }
  }
  sign('CRYOGÉNIE','#9cdae4',-4.66,3.55,2,Math.PI/2);
  sign('PUISSANCE','#eca167',4.66,3.55,2,-Math.PI/2);
  sign('CARTOGRAPHIE','#9cdae4',1.9,3.55,5.72,Math.PI);
  sign('ATLAS ORBITAL','#9cdae4',1,2.6,37.72,Math.PI);
  sign('← CRYOGÉNIE     PUISSANCE →','#cee4e4',1.8,2.7,21.7,Math.PI);
  // Orbital map suspended over a recessed instrument table.
  const atlas=new T.Group();atlas.position.set(1,1.75,32);root.add(atlas);
  const geometry=new T.SphereGeometry(.84,32,20);
  atlas.add(new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x163f54,roughness:.24,metalness:.56})));
  atlas.add(new T.Mesh(new T.SphereGeometry(.85,18,12),new T.MeshBasicMaterial({color:0x79c2cc,wireframe:true})));
  for(let i=0;i<3;i++){
    const ring=new T.Mesh(new T.TorusGeometry(1.17+i*.15,.016,6,96),cyan);
    ring.rotation.set(.65+i*.65,.38*i,.28*i);atlas.add(ring);
  }
  panel([3,.16,2.6],[1,.86,32],steel);panel([2.4,.82,1.9],[1,.41,32],graphite);
  const signals=fieldAnimation(root);
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  root.userData.tickSector=dt=>{if(!reduced){atlas.rotation.y+=dt*.095;signals(dt);}};
}
