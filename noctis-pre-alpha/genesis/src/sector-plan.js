// Grid origin is the front left corner of the observatory. Each bay is two metres.
const cells=new Map();
function area(x0,x1,z0,z1,zone){
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)cells.set(x+','+z,{x,z,zone});
}
area(0,4,0,5,'Observatoire');
area(-5,-1,3,4,'Galerie cryogénique');
area(5,9,3,4,'Galerie énergétique');
area(-10,-6,1,6,'Laboratoire cryogénique');
area(10,15,1,6,'Chambre de puissance');
area(-8,-7,7,11,'Conduite froide');
area(11,12,7,11,'Conduite chaude');
area(-8,12,12,13,'Traverse de maintenance');
area(2,3,6,11,'Accès observatoire');
area(2,3,14,16,'Accès cartographie');
area(0,5,17,21,'Cartographie orbitale');
export const sectorCells=[...cells.values()];
export const cellAt=(x,z)=>cells.get(x+','+z);
export function sectorContains(x,z){
  const cornerX=Math.abs(x+20)-2.85,cornerZ=Math.abs(z-2)-3.85;
  if(x>-25 && x<-15 && z>-4 && z<8 && cornerX>0 && cornerZ>0 && Math.hypot(cornerX,cornerZ)>1.72)return false;
  return [-.28,.28].every(dx=>[-.28,.28].every(dz=>cellAt(Math.floor((x+dx+5)/2),Math.floor((z+dz+6)/2))));
}
