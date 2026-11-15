// A recess is physical walkable space ending at a sealed pressure door.
import {validateGallery,buildGalleryAccess,galleryAccess} from './gallery-access.js';
import { block, pipe, plate, beam } from './industrial-parts.js';
const RECESS=1.8, WALL=.25;
const options=s=>s.architecture??{};
const bevel=s=>options(s).shape==='chamfered'?Math.min(3,s.dimensions.width*.14):0;
export function validateShell(s){
  const a=options(s);
  if(Object.getPrototypeOf(a)!==Object.prototype||!Object.keys(a).every(k=>['shape','platforms','galleries','doors','walkable'].includes(k)))throw Error('Architecture inconnue');
  if(!['rectangular','chamfered'].includes(a.shape??'rectangular'))throw Error('Plan inconnu');
  for(const [key,max] of [['platforms',4],['galleries',2]]){
    const n=a[key]??0;if(!Number.isInteger(n)||n<0||n>max)throw Error('Quantité invalide : '+key);
  }
  validateGallery(s);
  const doors=a.doors??[];
  if(!Array.isArray(doors)||doors.length>6)throw Error('Nombre de sas invalide');
  for(const [i,d] of doors.entries()){
    if(!d||Object.getPrototypeOf(d)!==Object.prototype||!Object.keys(d).every(k=>['wall','offset','width'].includes(k))||
      !['north','south'].includes(d.wall)||!Number.isFinite(d.offset)||!Number.isFinite(d.width)||d.width<1.8||d.width>4.2||
      Math.abs(d.offset)+d.width/2>s.dimensions.width/2-bevel(s)-.65)throw Error('Ouverture invalide');
    if(doors.slice(0,i).some(p=>p.wall===d.wall&&Math.abs(p.offset-d.offset)<(p.width+d.width)/2+.6))throw Error('Sas trop proches');
  }
}
export function shellBounds(s){
 const {width:w,length:l}=s.dimensions,doors=options(s).doors??[];
 return {minX:-w/2+WALL,maxX:w/2-WALL,minZ:-l/2+WALL-(doors.some(d=>d.wall==='north')?RECESS:0),maxZ:l/2-WALL+(doors.some(d=>d.wall==='south')?RECESS:0)};
}
export function shellAllows(x,z,r,s,floor=0){
 const {width:w,length:l}=s.dimensions,a=options(s),ax=Math.abs(x),az=Math.abs(z);
 if(ax+r>w/2-WALL)return false;
 if(az+r>l/2-WALL){
    const wall=z<0?'north':'south';
    return az+r<=l/2+RECESS-WALL&&(a.doors??[]).some(d=>d.wall===wall&&Math.abs(x-d.offset)+r<=d.width/2-WALL);
 }
 const cut=bevel(s);
 if(cut&&ax+az>w/2+l/2-cut-(WALL+r)*Math.SQRT2)return false;
 // Low side-wall inspection panels and columns protrude into the walkable envelope.
 const bays=Math.ceil(l/4),pitch=l/bays,zi=-l/2+(Math.floor((z+l/2)/pitch)+.5)*pitch;
 if(floor>hGallery(s)-.35)return ax+r<=w/2-.58;
 return !(ax+r>w/2-.65&&Math.abs(z-zi)<1+r);
}
function hGallery(s){return s.dimensions.height*.57;}
export function buildBoundary(root,s,m){
 const {width:w,length:l,height:h}=s.dimensions,hw=w/2,hl=l/2,cut=bevel(s),a=options(s);
 for(const side of [-1,1]){
   block(root,'bulkhead',[side*hw,h/2,0],[.36,h,l-2*cut],m.dark);
   if(cut)for(const end of [-1,1]){
     const panel=block(root,'corner_pressure_facet',[side*(hw-cut/2),h/2,end*(hl-cut/2)],[cut*Math.SQRT2,h,.36],m.shell);
     panel.rotation.y=side*end*Math.PI/4;
   }
 }
 for(const sign of [-1,1]){
   const wall=sign<0?'north':'south',z=sign*hl;
   const doors=(a.doors??[]).filter(d=>d.wall===wall).sort((a,b)=>a.offset-b.offset);
   let start=-hw+cut;
   function span(end){if(end-start>.01)block(root,'pressure_wall',[(end+start)/2,h/2,z],[end-start,h,.32],m.shell);}
   for(const d of doors){
     const x=d.offset,v=d.width,opening=3.1;
     span(x-v/2);start=x+v/2;
     block(root,'portal_header',[x,(opening+h)/2,z],[v,h-opening,.32],m.shell);
     for(const edge of [-1,1]){
       block(root,'recess_jamb',[x+edge*v/2,opening/2,z+sign*RECESS/2],[.23,opening,RECESS],m.steel);
       block(root,'jamb_locator',[x+edge*(v/2-.13),opening*.64,z-sign*.1],[.04,.66,.09],m.cyan);
     }
     block(root,'recess_floor',[x,-.12,z+sign*RECESS/2],[v,.24,RECESS],m.deck);
     block(root,'recess_soffit',[x,opening+.12,z+sign*RECESS/2],[v,.24,RECESS],m.dark);
     block(root,'pressure_door',[x,opening/2,z+sign*RECESS],[v,opening,.30],m.steel,true);
     block(root,'closure_joint',[x,opening/2,z+sign*(RECESS-.16)],[.045,opening,.025],m.rubber);
   }
   span(hw-cut);
   if(!doors.length)plate(root,'sealed_access',3.4,3.5,.24,[0,1.75,z-sign*.2],m.steel);
 }
 for(let i=0;i<(a.galleries??0);i++){
   const side=i===0?-1:1,x=side*(hw-.88),y=h*.57,len=l-2*(cut+1);
   block(root,'longitudinal_gallery',[x,y,0],[1.7,.23,len],m.steel,true);
   const access=galleryAccess(s),start=access&&i===0?access.highZ+1.05:-len/2;
   const gaps=Array.from({length:s.bridges},(_,j)=>{const z=-hl+(j+1)*l/(s.bridges+1);return [z-.65,z+.65];});
   let cursor=start;
   for(const [from,to] of [...gaps,[len/2,len/2]]){
     const end=Math.min(from,len/2);
     if(end>cursor+.05){
       pipe(root,'gallery_handrail',[x-side*.8,y+.96,cursor],[x-side*.8,y+.96,end],.045,m.chrome);
       for(let z=cursor;z<=end;z+=2)pipe(root,'gallery_stanchion',[x-side*.8,y,z],[x-side*.8,y+.96,z],.034,m.steel);
     }
     cursor=Math.max(cursor,to);
   }
 }
 buildGalleryAccess(root,s,m);
 for(let i=0;i<(a.platforms??0);i++){
   const side=a.walkable?1:(i%2?1:-1),z=-hl+(i+1)*l/((a.platforms??0)+1),x=side*(hw-1.8),y=h*.42;
   block(root,'service_balcony',[x,y,z],[3.55,.25,2.3],m.steel,true);
   for(const dz of [-.88,.88])beam(root,'platform_knee',[side*(hw-.22),y-1.2,z+dz],[x-side*1.44,y-.1,z+dz],.13,.15,m.shell);
   pipe(root,'balcony_guard',[x-side*1.72,y+.92,z-1.12],[x-side*1.72,y+.92,z+1.12],.045,m.chrome);
   for(const dz of [-1.12,1.12])pipe(root,'balcony_post',[x-side*1.72,y,z+dz],[x-side*1.72,y+.92,z+dz],.04,m.steel);
 }
}
