import * as THREE from '../vendor/three.module.js';

// Floor lighting in linear space. The mesh has a separate albedo/roughness UV transform.
// Each pair of broad pools corresponds to the inward-facing service luminaires in the nave.
export const SERVICE_BAYS = Object.freeze([-8, 0, 8]);

export function deckIrradiance(x, z) {
 let sideLight = 0;
 for (const side of [-1, 1]) {
  for (const bay of SERVICE_BAYS) {
   const dx = (x - side * 5.3) / 3.6;
   const dz = (z - bay) / 3.2;
   sideLight += Math.exp(-(dx * dx + dz * dz));
  }
 }
 const landing = Math.exp(-((x / 3.6) ** 2 + ((z + 2.1) / 3.3) ** 2));
 return [.17 + .62 * sideLight + .38 * landing,
         .16 + .54 * sideLight + .22 * landing,
         .155 + .48 * sideLight + .22 * landing];
}

export function createDeckIrradiance(width, depth, size = 64) {
 const bytes = new Uint8Array(size * size * 4);
 for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
   const irradiance = deckIrradiance(((x + .5) / size - .5) * width, (.5 - (y + .5) / size) * depth);
   const offset = (size * y + x) * 4;
   irradiance.forEach((channel, i) => { bytes[offset + i] = Math.round(255 * Math.min(1, channel)); });
   bytes[offset + 3] = 255;
  }
 }
 const texture = new THREE.DataTexture(bytes, size, size);
 texture.name = 'cortex.deck.service-bay-fill';
 texture.magFilter = texture.minFilter = THREE.LinearFilter;
 texture.colorSpace = THREE.NoColorSpace;
 texture.needsUpdate = true;
 return texture;
}
