"""Original static floor irradiance/contact atlas. Not a global-illumination bake.
World rectangle x [-25,27], z [-6,38]. Linear RGB irradiance; AO red channel.
Opaque floor-level walls occlude luminaires; moving machine shadows remain runtime.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt
out=Path(__file__).resolve().parents[1]/'assets'
n=512
x,z=np.meshgrid(np.linspace(-25,27,n),np.linspace(-6,38,n))
areas=[(0,4,0,5),(-5,-1,3,4),(5,9,3,4),(-10,-6,1,6),(10,15,1,6),(-8,-7,7,11),(11,12,7,11),(-8,12,12,13),(2,3,6,11),(2,3,14,16),(0,5,17,21)]
def inside(x,z):
 gx=np.floor((x+5)/2);gz=np.floor((z+6)/2);a=np.zeros(np.broadcast(x,z).shape,bool)
 for x0,x1,z0,z1 in areas:a|=(gx>=x0)&(gx<=x1)&(gz>=z0)&(gz<=z1)
 return a
mask=inside(x,z)
distance=distance_transform_edt(mask,sampling=(44/(n-1),52/(n-1)))
ao=.47+.53*(1-np.exp(-distance*4))
# Small base contacts follow the actual footprints rather than generic circular stains.
for cx,cz,hx,hz in [(1.85,.45,.89,.57),(-20,-1,.70,.70),(-20,4,.85,.85),(-17,0,.42,.42),(20,0,1.45,1.45),(23,5,1.14,1.14),(4,34,.79,.57),(1,32,1.2,.95),(3.05,-2.5,1.25,1.25)]:
 d=np.hypot(np.maximum(abs(x-cx)-hx,0),np.maximum(abs(z-cz)-hz,0));ao*=1-.40*np.exp(-d*11)
light=np.full((n,n,3),.06)
sources=[(-2,-3,4.1,[1,.84,.66],1.2),(-20,0,4.5,[.65,.91,1],1.1),(20,0,4.6,[1,.70,.42],1.3),(1,32,4.5,[.7,.86,1],1.1)]
for cx,cz in [(-10,2),(10,2),(-19,13),(19,13),(1,12),(1,20),(1,25)]:sources.append((cx,cz,2.9,[.68,.8,.86],.35))
for cx,cz,h,color,power in sources:
 visible=np.ones((n,n),bool)
 for t in np.linspace(.03,.97,48):visible&=inside(x+(cx-x)*t,z+(cz-z)*t)
 d2=(x-cx)**2+(z-cz)**2+h*h
 irradiance=power*h/(d2**1.5)*12*visible
 light+=irradiance[:,:,None]*np.array(color)
light*=ao[:,:,None]
# flip: Three's texture V increases with world Z in the shader below.
Image.fromarray(np.uint8(np.flipud(np.clip(light,0,1))*255)).save(out/'n05-floor-light.png')
Image.fromarray(np.uint8(np.flipud(np.clip(ao,0,1))*255)).save(out/'n05-floor-ao.png')
print('Original floor bake: 512x512 light and contact AO, deterministic.')
