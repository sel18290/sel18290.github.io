"""Deterministic, periodic N05 surface textures (one tile = nominally 2 metres).

These maps describe surface finish, not room lighting. No painted highlights or
large shadows: actual light response remains the renderer's responsibility.
Rebuild with Python, NumPy and Pillow. Every seam uses wrapped distances.
"""
from pathlib import Path
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'assets'
SIZE = 512
y, x = np.mgrid[:SIZE, :SIZE]
u, v = x / SIZE, y / SIZE
rng = np.random.default_rng(5405)


def periodic_noise(low=2, high=36, terms=48):
    value = np.zeros((SIZE, SIZE), dtype=float)
    for _ in range(terms):
        kx, ky = rng.integers(low, high + 1, 2)
        phase = rng.uniform(0, np.pi * 2)
        value += np.sin(2 * np.pi * (kx * u + ky * v) + phase)
    return value / np.sqrt(terms / 2)


fine = periodic_noise(40, 180, 72)
soft = periodic_noise(1, 8, 24)
brush = sum(np.sin(2 * np.pi * (i * v + u) + i * .73) for i in [81, 113, 149, 177]) / 2


def distance(a, center):
    return np.abs((a - center + .5) % 1 - .5)


def save_family(name, colour, roughness, height, normal_strength=1):
    rgb = np.broadcast_to(np.asarray(colour), (SIZE, SIZE, 3)).copy()
    rgb = np.clip(rgb, 0, 255).astype('uint8')
    # Central differences wrap around the tile rather than creating boundary seams.
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * normal_strength
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * normal_strength
    normal = np.stack([-dx, -dy, np.ones_like(dx)], axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    files = {'colour': rgb, 'rough': np.uint8(np.clip(roughness, 0, 255)),
             'normal': np.uint8(np.clip((normal * .5 + .5) * 255, 0, 255))}
    for suffix, array in files.items():
        Image.fromarray(array).save(OUT / f'n05-{name}-{suffix}.png', optimize=True)


def create():
    OUT.mkdir(parents=True, exist_ok=True)
    # Neutral brushed alloy: coloured metals tint this same finish at runtime.
    c = 183 + 1.4 * brush + .5 * soft
    save_family('alloy', np.stack([c * .98, c, c * 1.025], -1),
                102 + brush * 5 + soft * 2, brush * .018 + fine * .006)
    # Powder coated enamel and technical polymer stay mostly non-metallic.
    c = .75 * soft + .65 * fine
    save_family('paint', np.array([208, 204, 188]) + c[..., None],
                149 + fine * 3 + soft * 2, fine * .018)
    save_family('graphite', np.array([60, 73, 82]) + (soft * .8 + fine * .4)[..., None],
                160 + soft * 3 + fine * 2, fine * .014)
    # Parallel micro-ribs in rubber; no exaggerated dark cracks.
    rib = (.5 + .5 * np.cos(2 * np.pi * 96 * u)) ** 3
    save_family('seal', np.array([25, 31, 34]) + (rib * 2 + fine * .25)[..., None],
                220 + fine * 2, rib * .035 + fine * .007)
    # Satin ceramic insulating collars. Their warm neutral differs from paint.
    save_family('ceramic', np.array([192, 190, 175]) + (soft * .45)[..., None],
                172 + fine * 2, fine * .006)

    # An engineered deck tile with perimeter gasket, recessed fasteners and
    # a shallow anti-slip center. Wear follows edges, rather than random dirt.
    edge = np.minimum(distance(u, 0), distance(v, 0))
    gasket = np.exp(-(edge / .0045) ** 2)
    channel = np.exp(-((edge - .028) / .0025) ** 2)
    lip = np.exp(-((edge - .033) / .002) ** 2)
    height = -gasket * .8 - channel * .24 + lip * .06
    dark = gasket * 83 + channel * 21
    wear = lip * 7
    for bx in [.065, .935]:
        for by in [.065, .935]:
            xx, yy = distance(u, bx), distance(v, by)
            r = np.hypot(xx, yy)
            ring = np.exp(-((r - .010) / .0019) ** 2)
            inset = np.exp(-(r / .009) ** 6)
            slot = (r < .0065) * np.exp(-(distance(u, bx) / .0013) ** 2)
            height -= ring * .3 + slot * .25
            dark += ring * 36 + inset * 9 + slot * 45
    safe = np.clip((edge - .065) / .025, 0, 1)
    grip = np.sin(2 * np.pi * (u + v) * 40) ** 10 * safe
    height += grip * .028 + fine * .008
    value = 144 + brush * 1.2 + soft * 1.2 - dark + wear
    rgb = np.stack([value * .93, value * .98, value * 1.025], -1)
    save_family('deck', rgb, 166 + gasket * 50 + channel * 20 + fine * 2 - wear,
                height, .8)
    print('Wrote 18 deterministic 512px N05 colour / roughness / normal maps.')


if __name__ == '__main__':
    create()
