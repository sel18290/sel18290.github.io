export const renderProfiles=Object.freeze({
  light:{label:'Léger',ratio:1.25,pixels:1400000,shadows:false,shadowSize:512,visibility:34},
  balanced:{label:'Équilibré',ratio:1.6,pixels:2500000,shadows:true,shadowSize:1024,visibility:48},
  detail:{label:'Détaillé',ratio:2,pixels:4000000,shadows:true,shadowSize:2048,visibility:64}
});
export function selectProfile(value,coarse){return Object.hasOwn(renderProfiles,value)?value:coarse?'light':'balanced';}
export function resolution(profile,dpr,w,h){return Math.min(dpr,profile.ratio,Math.sqrt(profile.pixels/Math.max(1,w*h)));}

// N06 targets the pixel area of 2024² without stretching the camera aspect.
export const gardenPixelBudget=2024*2024;
export function gardenResolution(profile,w,h){
  return Math.sqrt((profile===renderProfiles.light?profile.pixels:gardenPixelBudget)/Math.max(1,w*h));
}
