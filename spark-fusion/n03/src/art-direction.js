// N03-inspired material palette. Physical texture maps and roughness are preserved.
export const CORTEX_ART=Object.freeze({signal:0xdb394e,alert:0xff3349,screen:0xffd1c5,graphite:0x343136,steel:0x64656b,shell:0x777a80,white:0xb5b5b4,fog:0x161317});
export function applyCortexPalette(m){for(const[key,color]of Object.entries({cyan:CORTEX_ART.signal,red:CORTEX_ART.alert,violet:0xb56c86,dark:CORTEX_ART.graphite,steel:CORTEX_ART.steel,shell:CORTEX_ART.shell,white:CORTEX_ART.white,deck:0x626064,rubber:0x232126,copper:0x8b6d62}))m[key]?.color.setHex(color);return m;}
