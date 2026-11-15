// Continuous open campus: about 1,830 m² traversable area after the safety margin.
export const gardenCircles=[[0,0,18.2],[-23,-4,10.2],[23,-4,10.2],[0,-25,10.2]];
function contains(x,z,margin){return gardenCircles.some(([cx,cz,r])=>Math.hypot(x-cx,z-cz)<=r-margin)||(x>=-23+margin&&x<=23-margin&&z>=-7+margin&&z<=1-margin)||(x>=-4+margin&&x<=4-margin&&z>=-25+margin&&z<=0-margin);}
export const gardenContains=(x,z)=>contains(x,z,.30);
export function gardenZone(x,z){if(Math.hypot(x,z+25)<10.2)return 'Pavillon des rythmes';if(Math.hypot(x+23,z+4)<10.2)return 'Habitat du repos';if(Math.hypot(x-23,z+4)<10.2)return 'Maison des équipes';return 'Jardin des nuits';}
