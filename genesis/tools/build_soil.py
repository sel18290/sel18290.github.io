"""Half-metre organic potting-soil tile: colour, roughness and tangent normal.
Aggregates, pores, perlite and fibres describe composition, not painted light.
"""
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
OUT=Path(__file__).resolve().parents[1]/'assets'
n=2048;rng=np.random.default_rng(60603)
def noise(size):
 a=np.uint8(rng.random((size,size))*255)
 # Repeat a 3x3 neighbourhood before resampling to preserve periodic boundaries.
 image=Image.fromarray(np.tile(a,(3,3))).resize((n*3,n*3),Image.Resampling.BICUBIC)
 return np.asarray(image.crop((n,n,n*2,n*2)),dtype=float)/255-.5
large=noise(12);medium=noise(68);fine=noise(300);grain=noise(1024)
height=.0013*large+.0014*medium+.00045*fine+.00015*grain
mix=large*9+medium*14+fine*12+grain*5
rgb=np.stack([69+mix*1.12,47+mix*.86,31+mix*.55],-1)
# Separate mineral and organic aggregates create irregular visible structure.
colour=Image.fromarray(np.uint8(np.clip(rgb,0,255)));draw=ImageDraw.Draw(colour)
relief=Image.new('F',(n,n),0);hd=ImageDraw.Draw(relief)
rough=Image.new('L',(n,n),232);rd=ImageDraw.Draw(rough)
for i in range(6200):
 x,y=rng.integers(0,n,2);rx=int(rng.integers(3,20));ry=int(rx*rng.uniform(.45,1.25))+1
 v=int(rng.integers(-11,17));c=(76+v,51+int(v*.8),33+int(v*.5));h=float(rng.uniform(.00035,.0017))
 for ox in [-n,0,n]:
  for oy in [-n,0,n]:
   box=(int(x-rx+ox),int(y-ry+oy),int(x+rx+ox),int(y+ry+oy));draw.ellipse(box,fill=c);hd.ellipse(box,fill=h);rd.ellipse(box,fill=int(rng.integers(215,245)))
for i in range(450):
 x,y=rng.integers(0,n,2);r=int(rng.integers(2,7));v=int(rng.integers(0,30));colour_value=(154+v,143+v,117+v)
 draw.ellipse((int(x-r),int(y-r),int(x+r),int(y+r)),fill=colour_value);hd.ellipse((int(x-r),int(y-r),int(x+r),int(y+r)),fill=.0014)
for i in range(270):
 x,y=rng.integers(0,n,2);a=rng.uniform(0,np.pi*2);length=rng.uniform(10,37);width=rng.uniform(1,3)
 dx,dy=np.cos(a)*length,np.sin(a)*length;wx,wy=-np.sin(a)*width,np.cos(a)*width
 points=[(x-dx/2-wx,y-dy/2-wy),(x+dx/2-wx,y+dy/2-wy),(x+dx/2+wx,y+dy/2+wy),(x-dx/2+wx,y-dy/2+wy)]
 draw.polygon(points,fill=(112,80,48));hd.polygon(points,fill=.0009)
height+=np.asarray(relief)
# A subpixel smoothing pass rounds aggregate edges without baking shadows.
height=(height*2+np.roll(height,1,0)+np.roll(height,-1,0)+np.roll(height,1,1)+np.roll(height,-1,1))/6
step=.5/n;dx=(np.roll(height,-1,1)-np.roll(height,1,1))/(2*step);dy=(np.roll(height,-1,0)-np.roll(height,1,0))/(2*step)
normal=np.stack([-dx,-dy,np.ones_like(dx)],-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
colour.save(OUT/'n06-soil-v2-colour.png',optimize=True)
rough.save(OUT/'n06-soil-v2-rough.png',optimize=True)
Image.fromarray(np.uint8(np.clip((normal*.5+.5)*255,0,255))).save(OUT/'n06-soil-v2-normal.png',optimize=True)
print('Soil v2: 2048px, 0.5m tile, 6200 aggregates / perlite / organic fibres')
