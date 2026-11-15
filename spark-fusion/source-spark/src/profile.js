export const profiles = {
  mobile: {file:'pilot-mobile', maxRatio:1.5, blur:.22, pixelBudget:2400000},
  detail: {file:'pilot', maxRatio:2.25, blur:.15, pixelBudget:6500000}
};
export function chooseProfile(value, coarse) {
  return Object.hasOwn(profiles,value) ? value : coarse ? 'mobile' : 'detail';
}
export function resolution(profile,deviceRatio,w,h) {
  return Math.min(deviceRatio,profile.maxRatio,Math.sqrt(profile.pixelBudget/(w*h)));
}
export function withinReach(camera,yaw,pitch) {
  const dx=-camera.x,dz=-1.5-camera.z,d=Math.hypot(dx,dz);
  return d<=2.85 && d>0 && (-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/d>.46 && Math.abs(pitch)<.95;
}
