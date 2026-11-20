// Bounds are measured on bureau-360.png, in panorama UV coordinates.
const bed=[.057,.486,.178,.617], screen=[.432,.466,.570,.589];
const robot=[.820,.520,.886,.678], door=[.892,.308,.981,.662];
export const objectZones=[
 {clock:[.026,.531,.047,.557],bed,computer:screen,robot,door},
 {computer:screen,drink:[.594,.521,.615,.618],tablet:[.636,.564,.723,.629],light:[.850,.331,.864,.523],robot,door,secret:[.958,.448,.974,.535]}
];
export function objectAt(phase,u,v,isAvailable){
 const zones=objectZones[phase-1];
 // The revealed access panel takes precedence over the enclosing door.
 return Object.keys(zones).reverse().find(key=>{
  const [left,top,right,bottom]=zones[key];
  return isAvailable(key)&&u>=left&&u<=right&&v>=top&&v<=bottom;
 });
}
