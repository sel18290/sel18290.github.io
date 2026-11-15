// Public artistic contracts. New profiles are data, shared by the material,
// architecture, lighting, interface, atmosphere and audio systems.
const equipment=['server','reactor','robot','terminal','sensor','cooler','relay','scanner'];
export const styles=Object.freeze({
  cortex:Object.freeze({
    signal:0xd64458,graphite:0x454249,steel:0x858186,screen:0xffd9ca,rim:0xff485e,
    structures:['vault','gantry'],equipment,
    lighting:{fill:1.12,cross:1.02,key:680,rim:76,reflection:.85},
    atmosphere:{background:.33,fog:.21},
    interface:{accent:'#d64458',ink:'#ffdfd2',panel:'#20191f'},
    effects:{bloom:true,emission:.8},
    sound:{ambient:[55,82.4,110.08],pulse:147,motor:91,interval:8,level:.022}
  }),
  forge:Object.freeze({
    signal:0xd99449,graphite:0x47494b,steel:0x948d85,screen:0xffe8c2,rim:0xffb574,
    structures:['vault','gantry'],equipment,
    lighting:{fill:1.16,cross:.98,key:630,rim:64,reflection:.9},
    atmosphere:{background:.36,fog:.16},
    interface:{accent:'#d99449',ink:'#ffe8c2',panel:'#211d17'},
    effects:{bloom:true,emission:.68},
    sound:{ambient:[48,72,96],pulse:164.8,motor:105,interval:10,level:.019}
  })
});
export function validateArtProfile(profile){
  if(!profile||!profile.equipment?.length||!profile.structures?.length)throw Error('Profil artistique incomplet');
  for(const group of ['lighting','atmosphere','effects','sound','interface'])if(!profile[group])throw Error('Profil artistique incomplet : '+group);
  for(const v of Object.values(profile.lighting))if(!Number.isFinite(v)||v<0)throw Error('Lumière de profil invalide');
  return profile;
}
