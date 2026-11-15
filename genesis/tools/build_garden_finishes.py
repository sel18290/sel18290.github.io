"""N06 technical PBR finishes; same ivory/graphite/copper palette as N05.
Textures describe materials in metres, with no painted lighting or cast shadows.
"""
from pathlib import Path
import argparse
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
OUT=Path(__file__).resolve().parents[1]/'assets'
rng=np.random.default_rng(6054)
previews=[]
def create(name,n,base,rough,kind,tile=2):
    y,x=np.mgrid[:n,:n];u=x/n;v=y/n
    fine=rng.normal(0,1,(n,n))
    # Low-frequency wrapped variation preserves material identity at close range.
    soft=(np.sin(2*np.pi*(u*3+v*2))+.6*np.sin(2*np.pi*(u*7-v*5)))/1.6
    height=np.zeros((n,n)); variation=.8*soft+.5*fine
    roughness=np.full((n,n),rough,dtype=float)+fine*2
    if kind=='deck':
        edge=np.minimum(np.minimum(u,1-u),np.minimum(v,1-v))
        seam=np.exp(-(edge/.004)**2); inset=np.exp(-((edge-.026)/.002)**2)
        height-=.003*seam+.001*inset;variation-=seam*55+inset*18
        wear=np.exp(-((edge-.032)/.003)**2);variation+=wear*5
        grip=np.maximum(0,np.sin(2*np.pi*(u+v)*56))**12*np.clip((edge-.05)*25,0,1)
        height+=grip*.00012+fine*.000008;roughness+=seam*38-grip*8
        for a in [.06,.94]:
            for b in [.06,.94]:
                r=np.hypot(u-a,v-b);bolt=np.exp(-((r-.007)/.0012)**2)
                slot=np.exp(-((u-a)/.0008)**2)*(r<.005)
                height-=bolt*.001+slot*.0008;variation-=bolt*30+slot*40
    elif kind=='panel':
        edge=np.minimum(np.minimum(u,1-u),np.minimum(v,1-v));joint=np.exp(-(edge/.003)**2)
        height-=joint*.0017;variation-=joint*55
        # Folded seam at one edge, small inset access marks at the other.
        fold=np.exp(-((u-.028)/.002)**2);height-=fold*.0007;variation-=fold*13
        for a in [.07,.93]:
            for b in [.07,.93]:
                r=np.hypot(u-a,v-b);s=np.exp(-((r-.0045)/.0012)**2);height-=s*.0006;variation-=s*32
        height+=fine*.000009
    elif kind=='composite':
        grain=np.sin(2*np.pi*v*260+np.sin(2*np.pi*u*3)*.5)
        variation+=grain*1.8;height+=grain*.000025+fine*.000008;roughness+=grain*5
    elif kind=='textile':
        weave=np.sin(u*2*np.pi*192)*np.sin(v*2*np.pi*192)
        stitch=np.exp(-((np.minimum(u,1-u)-.025)/.0018)**2)
        variation+=weave*4+stitch*12;height+=weave*.00010+stitch*.00014;roughness+=weave*3
    else:
        grains=np.sin(2*np.pi*(u*93+v*76))*np.cos(2*np.pi*(v*115-u*65))
        variation=soft*4+fine*3+grains*4;height+=soft*.001+grains*.0003+fine*.00008;roughness+=grains*5
    rgb=np.clip(np.array(base)+variation[...,None],0,255).astype('uint8')
    dx=(np.roll(height,-1,1)-np.roll(height,1,1))/(2*tile/n)
    dy=(np.roll(height,-1,0)-np.roll(height,1,0))/(2*tile/n)
    normal=np.stack([-dx,-dy,np.ones_like(dx)],-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    for channel,a in [('colour',rgb),('rough',np.clip(roughness,0,255).astype('uint8')),('normal',np.uint8(np.clip((normal*.5+.5)*255,0,255)))]:
        Image.fromarray(a).save(OUT/f'n06-{name}-{channel}.png',optimize=True)
    preview=Image.fromarray(rgb);preview.thumbnail((320,320));previews.append((name,preview))
create('deck',2048,[108,121,127],165,'deck')
create('panel',1024,[201,198,183],155,'panel')
create('composite',1024,[123,91,67],144,'composite',1)
create('textile',1024,[107,123,123],224,'textile',.5)
create('soil',1024,[43,49,38],242,'soil',1)
# Contact sheet is a reproducible intermediate used for inspecting the base maps.
sheet=Image.new('RGB',(320*len(previews),355),'#192831');d=ImageDraw.Draw(sheet)
for i,(name,im) in enumerate(previews):sheet.paste(im,(i*320,30));d.text((i*320+12,8),name,fill='white')
parser=argparse.ArgumentParser();parser.add_argument('--preview');args=parser.parse_args()
if args.preview:sheet.save(args.preview)
print('Created 15 N06 PBR maps, including 2048px deck.')
