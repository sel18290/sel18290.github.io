"""Metric technical PBR finishes for N06's three lateral annexes only."""
from pathlib import Path
import numpy as np
from PIL import Image
OUT=Path(__file__).resolve().parents[1]/'assets';n=1024
y,x=np.mgrid[:n,:n];u=x/n;v=y/n
rng=np.random.default_rng(60604)
fine=rng.normal(0,1,(n,n));soft=np.sin(2*np.pi*(3*u+2*v))*.5+np.sin(2*np.pi*(7*u-5*v))*.25
edge=np.minimum(np.minimum(u,1-u),np.minimum(v,1-v))
for name in ['annex-shell','annex-frame','annex-lining']:
 height=fine*.000006
 if name=='annex-shell':
  gasket=np.exp(-(edge/.004)**2);fold=np.exp(-((edge-.028)/.0017)**2)
  base=np.array([202,201,191]);value=soft*.8+fine*.5-gasket*55-fold*16
  height-=gasket*.0017+fold*.0006;rough=156+fine*2+gasket*38
  for a in [.055,.945]:
   for b in [.055,.945]:
    d=np.hypot(u-a,v-b);rim=np.exp(-((d-.0045)/.001)**2);height-=rim*.0005;value-=rim*34
  # Small recessed inspection slots, not exaggerated dirt or rust.
  slots=(np.abs(v-.91)<.004)*(u>.77)*(u<.88);value-=slots*22;height-=slots*.0005
 elif name=='annex-frame':
  grain=np.sin(2*np.pi*v*221+np.sin(2*np.pi*u)*.4)
  base=np.array([154,165,172]);value=grain*2+soft+fine*.6
  height+=grain*.000018;rough=112+grain*7+fine*3
 else:
  ribs=(.5+.5*np.cos(2*np.pi*u*36))**6
  perforations=np.maximum(0,np.cos(2*np.pi*u*52))**18*np.maximum(0,np.cos(2*np.pi*v*52))**18
  base=np.array([64,75,83]);value=ribs*7-perforations*24+fine*.6
  height+=ribs*.00025-perforations*.00020;rough=193+fine*3+ribs*7
 rgb=np.uint8(np.clip(base+value[...,None],0,255));step=1/n
 dx=(np.roll(height,-1,1)-np.roll(height,1,1))/(2*step);dy=(np.roll(height,-1,0)-np.roll(height,1,0))/(2*step)
 normal=np.stack([-dx,-dy,np.ones_like(dx)],-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
 for channel,data in [('colour',rgb),('rough',np.uint8(np.clip(rough,0,255))),('normal',np.uint8(np.clip((normal*.5+.5)*255,0,255)))]:Image.fromarray(data).save(OUT/f'n06-{name}-{channel}.png',optimize=True)
print('Nine dedicated annex PBR maps generated.')
