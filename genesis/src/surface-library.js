import * as T from 'three';

const families = ['alloy', 'paint', 'graphite', 'seal', 'ceramic', 'deck'];

/** Synchronous material factory: useful without a DOM, and for headless tests.
 * maps is {alloy:{map,roughnessMap,normalMap}, ...}. Texture tiles represent
 * nominal 2m panels. Consumers of larger UV surfaces may clone texture transforms.
 * Materials are owned by the caller; the async library owns all its textures.
 */
export function createSurfaceMaterials(maps = {}) {
  const material = (family, fallback, metalness, roughness, extra = {}) => {
    const layers = maps[family] || {};
    const m = new T.MeshStandardMaterial({
      color: layers.map ? 0xffffff : fallback,
      metalness, roughness: layers.roughnessMap ? 1 : roughness,
      ...layers, normalScale: new T.Vector2(.36, .36), ...extra
    });
    m.name = 'n05-' + family;
    return m;
  };
  const steel = material('alloy', 0xb5bcc1, .88, .4);
  const graphite = material('graphite', 0x3c4952, .32, .63);
  const paint = material('paint', 0xd0ccbc, .08, .58);
  const seal = material('seal', 0x191f22, .02, .86);
  const deck = material('deck', 0x869095, .5, .65, {normalScale: new T.Vector2(.65, .65)});
  const ceramic = material('ceramic', 0xc0beaf, .02, .67);
  const copper = material('alloy', 0x98694a, .83, .4);
  if (maps.alloy?.map) copper.color.setHex(0xc7926d);
  copper.name = 'n05-copper';
  const lamp = new T.MeshStandardMaterial({color: 0xffe7bd, emissive: 0xffd69c,
    emissiveIntensity: 2.1, roughness: .32, metalness: 0});
  lamp.name = 'n05-warm-emitter';
  const cyan = new T.MeshStandardMaterial({color: 0xb6e8e9, emissive: 0x64bdc5,
    emissiveIntensity: 1.7, roughness: .3, metalness: 0});
  cyan.name = 'n05-cyan-emitter';
  const glass = new T.MeshPhysicalMaterial({color: 0xbcd6da, roughness: .13,
    metalness: 0, transparent: true, opacity: .12, depthWrite: false,
    clearcoat: 1, clearcoatRoughness: .08, side: T.DoubleSide});
  glass.name = 'n05-observation-glass';
  return {steel, graphite, seal, lamp, cyan, deck, paint, copper, glass, ceramic};
}

/** Load original local finish maps, with explicit colour-space handling.
 * On failure all resources allocated by this request are released.
 * dispose is idempotent; do not share its material instances across libraries.
 */
export async function loadSurfaceLibrary(renderer,{assetRoot='/genesis/assets',maxAnisotropy=8,selectedFamilies=families}={}) {
  const loader = new T.TextureLoader(), textures = new Set();
  const anisotropy = Math.min(maxAnisotropy, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  const maps = {};
  try {
    const results = await Promise.allSettled(selectedFamilies.map(async family => {
      const layers = await Promise.allSettled(['colour', 'rough', 'normal'].map(async channel => {
        const texture = await loader.loadAsync(assetRoot+'/n05-' + family + '-' + channel + '.png');
        textures.add(texture);
        texture.colorSpace = channel === 'colour' ? T.SRGBColorSpace : T.NoColorSpace;
        texture.wrapS = texture.wrapT = T.RepeatWrapping;
        texture.repeat.set(1, 1);
        texture.anisotropy = anisotropy;
        return texture;
      }));
      const error = layers.find(item => item.status === 'rejected');
      if (error) throw error.reason;
      maps[family] = {map: layers[0].value, roughnessMap: layers[1].value, normalMap: layers[2].value};
    }));
    const error = results.find(item => item.status === 'rejected');
    if (error) throw error.reason;
    const materials = createSurfaceMaterials(maps);
    let disposed = false;
    return {materials, maps, dispose() {
      if (disposed) return;
      disposed = true;
      Object.values(materials).forEach(m => m.dispose());
      textures.forEach(texture => texture.dispose());
      textures.clear();
    }};
  } catch (error) {
    textures.forEach(texture => texture.dispose());
    textures.clear();
    throw error;
  }
}
