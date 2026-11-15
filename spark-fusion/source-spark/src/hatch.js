import * as T from 'three';
// Inspection recess on the rear bulkhead. Leaves travel parallel to the wall.
export function createHatch(){
 const root=new T.Group();root.position.set(3.42,1.65,-5.79);
 const alloy=new T.MeshStandardMaterial({color:0x55565b,metalness:.52,roughness:.35});
 const graphite=new T.MeshStandardMaterial({color:0x232528,metalness:.34,roughness:.58});
 const indicator=new T.MeshBasicMaterial({color:0xe75743});
 function slab(parent,w,h,d,x,y,z,material){
   const part=new T.Mesh(new T.BoxGeometry(w,h,d),material);part.position.set(x,y,z);parent.add(part);return part;
 }
 slab(root,1.46,.88,.07,0,0,0,graphite);
 for(const y of [-.42,.42])slab(root,1.52,.055,.09,0,y,.06,alloy);
 for(let i=0;i<8;i++)slab(root,.035,.12+i%3*.08,.02,-.31+i*.085,-.04,.053,indicator);
 const leaves=[-1,1].map(side=>{
   const group=new T.Group();root.add(group);slab(group,.41,.73,.035,0,0,.10,alloy);
   for(let i=0;i<5;i++)slab(group,.32,.013,.01,0,-.24+i*.11,.122,graphite);
   return {group,side};
 });
 let open=false,travel=0;
 function update(dt){
   travel=T.MathUtils.damp(travel,open?1:0,5,Math.min(.1,dt));
   for(const {group,side} of leaves)group.position.x=side*(.207+.295*travel);
 }
 update(0);
 return {root,update,get open(){return open},activate(){open=!open}};
}
