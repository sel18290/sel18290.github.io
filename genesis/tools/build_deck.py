"""Tileable machined titanium deck: albedo, roughness and tangent-space normals."""
from pathlib import Path
import numpy as np
from PIL import Image
out=Path(__file__).resolve().parents[1]/'assets'
n=512
rng=np.random.default_rng(523)
y,x=np.mgrid[:n,:n]
edge=np.minimum.reduce([x,y,n-1-x,n-1-y])
height=np.clip(edge/5,0,1)*2.8
line=np.abs(edge-13)<1.4
height[line]-=.65
bolts=np.zeros((n,n),bool)
for cx in [28,n-29]:
 for cy in [28,n-29]:
  r=np.hypot(x-cx,y-cy)
  height-=1.7*np.exp(-((r-6)/1.3)**2)
  slot=(r<4)&(abs((x-cx)+(y-cy))<1.2)
  height[slot]-=1.3
  bolts|=slot|(abs(r-6)<1.2)
grain=rng.normal(0,1.8,(n,1))+rng.normal(0,1,(n,n))
v=195+grain-24*(edge<4)-10*line-37*bolts
rgb=np.stack([v*.94,v*.97,v],axis=-1)
rough=176+grain*2+16*line+20*bolts
dy,dx=np.gradient(height)
normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=-1)
normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
for name,a in [('colour',rgb),('rough',rough),('normal',(normal*.5+.5)*255)]:
 Image.fromarray(np.uint8(np.clip(a,0,255))).save(out/('deck-'+name+'.png'))
