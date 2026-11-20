import {renderProfiles,selectProfile,gardenResolution,resolution} from './render-profile.js';

export function gardenPolicy({quality,mobile=false,reference=false}={}){
  const name=selectProfile(quality||(reference?'detail':null),mobile);
  const botanical=name==='detail'?'hd':name==='balanced'?'balanced':'mobile';
  return {name,profile:renderProfiles[name],botanical:reference?'hd':botanical,
    count:reference||botanical==='hd'?1400000:botanical==='balanced'?560000:240000,
    mobileTextures:!reference&&mobile&&name!=='detail'};
}

export function gardenRuntimeResolution(policy,dpr,w,h,reference=false){
  if(reference)return gardenResolution(policy.profile,w,h);
  // Explicit HD remains available, but no mode supersamples a low-DPI display.
  const profile=policy.name==='light'?{...policy.profile,ratio:1.6,pixels:850000}:policy.profile;
  return resolution(profile,dpr,w,h);
}
