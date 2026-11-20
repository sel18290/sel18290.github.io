const layout=[
 ['A','Galerie d’admission',-3,3,6,23,4.8],
 ['B','Distribution',-8,8,-6,6,7.5],
 ['C','Collecteur ouest',-16,-8,-2.5,2.5,4.8],
 ['D','Conduites secondaires',-34,-16,-2.5,2.5,5.2],
 ['E','Chambre de confinement',-50,-34,-8,8,9]
];
export const rooms=layout.map(([id,name,x0,x1,z0,z1,h])=>({id,name,x0,x1,z0,z1,h}));
export function roomAt(x,z){return rooms.find(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1)}
export const walls=[],lintels=[];
for(const room of rooms)for(const axis of ['x','z'])for(const side of [0,1]){
 const other=axis==='x'?'z':'x',fixed=room[axis+side],lo=room[other+0],hi=room[other+1];
 const neighbors=rooms.filter(r=>r!==room&&r[axis+(1-side)]===fixed);
 const cuts=[...new Set([lo,hi,...neighbors.flatMap(r=>[r[other+0],r[other+1]]).filter(v=>v>lo&&v<hi)])].sort((a,b)=>a-b);
 for(let i=1;i<cuts.length;i++){
 const a=cuts[i-1],b=cuts[i],mid=(a+b)/2,n=neighbors.find(r=>r[other+0]<mid&&mid<r[other+1]);
 const line={id:room.id,h:room.h,x1:axis==='x'?fixed:a,z1:axis==='z'?fixed:a,x2:axis==='x'?fixed:b,z2:axis==='z'?fixed:b};
 if(!n)walls.push(line);else if(room.h>n.h)lintels.push({...line,bottom:n.h});
 }
}
export function canWalk(x,z,props=[]){
 if(!roomAt(x,z))return false;
 for(const w of walls){const px=Math.max(w.x1,Math.min(w.x2,x)),pz=Math.max(w.z1,Math.min(w.z2,z));if(Math.hypot(px-x,pz-z)<.46)return false;}
 return props.every(p=>Math.hypot(x-p.x,z-p.z)>=p.r+.26);
}
