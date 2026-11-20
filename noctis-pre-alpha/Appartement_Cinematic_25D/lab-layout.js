export const deckLevel=-4.5;
export const worldScale=.504;
export const eyeHeight=deckLevel+1.68/worldScale;

export const portal={
 wall:16, opening:3, centerY:-.68, top:3.03, corridorEdge:22.93, innerEdge:16.83, ceiling:4.5
};

export const launchTerminal={x:41.8,z:-5.6,reach:3.55};

export const hangarDimensions={
 throatEnd:30,throatWidth:3.65,side:13.7,end:70,roof:11.1
};

export function canWalkHere({x,z},opening,radius,destination='ring',withLaunchTerminal=false){
 const absX=Math.abs(x),absZ=Math.abs(z),span=Math.max(absX,absZ);
 if(span<=14.9){
  // The round plinth also encloses the lowest sweep of the rotating cube.
  if(Math.hypot(x,z)<3.52+radius)return false;
  if(Math.abs(absX-6)<.49+radius&&absZ<3.4+radius)return false;
  return !(Math.abs(absX-11)<.29+radius&&Math.abs(absZ-11)<.29+radius);
 }
 if(opening===undefined||destination==='switching')return false;
 const clearance=Math.min(portal.opening-.07,2.94*opening)-radius;
 if(x>0&&x<portal.innerEdge&&absZ<clearance)return true;
 if(destination==='hangar'){
  if(withLaunchTerminal&&Math.abs(x-launchTerminal.x)<.32+radius&&Math.abs(z-launchTerminal.z)<.75+radius)return false;
  return hangarAccess(x,z,radius);
 }
 return span>=portal.innerEdge&&span<=portal.corridorEdge-radius;
}

function hangarAccess(x,z,radius){
 const {throatEnd,throatWidth,side,end}=hangarDimensions;
 if(x<portal.innerEdge)return false;
 if(x<throatEnd+radius)return Math.abs(z)<throatWidth-radius;
 if(x>end-radius||Math.abs(z)>side-radius)return false;
 const hull=x>39.5-radius&&x<58.8+radius&&Math.abs(z-1.2)<2.75+radius;
 const wings=x>46.3-radius&&x<59+radius&&Math.abs(z-1.2)<7.2+radius;
 return !hull&&!wings;
}

const fullTurn=2*Math.PI;
const entranceArc=2*Math.atan((portal.opening-.34)/portal.innerEdge);
export function createPerimeterLap(){
 let lastAngle=null,travel=0;
 function reset(){lastAngle=null;travel=0;}
 return {
  reset,
  advance({x,z}){
   if(Math.max(Math.abs(x),Math.abs(z))>=portal.innerEdge){
    const angle=Math.atan2(z,x);
    if(lastAngle!==null){
     let increment=angle-lastAngle;
     if(increment>Math.PI)increment-=fullTurn;
     if(increment< -Math.PI)increment+=fullTurn;
     travel+=increment;
    }
    lastAngle=angle;
    return false;
   }
   if(x>=14.35)return false;
   const complete=Math.abs(travel)>=fullTurn-entranceArc;
   reset();
   return complete;
  }
 };
}
