"""Author an original Y-up, metre-scale chamber directly as oriented 3D Gaussian surfels."""
from pathlib import Path
import json, math, hashlib
import numpy as np
from scipy.spatial.transform import Rotation
from PIL import Image, ImageDraw, ImageFont

OUT=Path(__file__).resolve().parents[1]/'dist/assets'
OUT.mkdir(exist_ok=True,parents=True)
TAU=2*math.pi
dtype=np.dtype([('xyz','<f4',(3,)),('scale','<f4',(3,)),('rgba','u1',(4,)),('rotation','u1',(4,))])
chunks=[]
counts={}
family='shell'
rng=np.random.default_rng(71003)
def unit(v): return v/np.maximum(np.linalg.norm(v,axis=-1,keepdims=True),1e-12)
def xyz(x,y,z): return np.stack(np.broadcast_arrays(x,y,z),axis=-1)
def surface(fn,nu,nv,color,emission=False,pattern=None):
    u,v=np.meshgrid((np.arange(nu)+.5)/nu,(np.arange(nv)+.5)/nv,indexing='ij')
    p=fn(u,v)
    h=1.e-4
    du=(fn(u+h,v)-fn(u-h,v))/(2*h*nu)
    dv=(fn(u,v+h)-fn(u,v-h))/(2*h*nv)
    a=unit(du); n=unit(np.cross(du,dv)); b=np.cross(n,a)
    frames=np.stack([a,b,n],axis=-1).reshape(-1,3,3)
    q=Rotation.from_matrix(frames).as_quat()[:,[3,0,1,2]]
    pack=np.zeros(u.size,dtype=dtype)
    pack['xyz']=p.reshape(-1,3)
    scales=np.stack([np.linalg.norm(du,axis=-1)*.69,np.linalg.norm(dv,axis=-1)*.69,np.full_like(u,.009)],axis=-1)
    pack['scale']=scales.reshape(-1,3)
    base=np.array(color)*np.ones_like(p)
    if pattern: base=pattern(u,v,p,base)
    if not emission:
        key=np.abs(n@np.array([.36,.84,.40]))[...,None]
        base*=.61+.41*key
        for pos, tint,power in [([-4,3,0],[1,.10,.10],1.1),([2,4,-3],[1,.76,.63],.75),([0,1.4,-1.5],[1,.08,.07],1.3),([3,3.4,4],[.74,.82,.94],.8)]:
            light=np.array(pos)-p
            length=np.linalg.norm(light,axis=-1)
            facing=np.abs(np.sum(unit(light)*n,axis=-1))
            base+=(np.array(tint)*43)*(facing/(1+.15*length**2)*power)[...,None]
        base+=rng.normal(0,1.2,size=u.shape)[...,None]
    pack['rgba'][:,:3]=np.clip(base,0,255).reshape(-1,3).astype('u1')
    pack['rgba'][:,3]=248
    pack['rotation']=np.clip(np.rint(q*128+128),0,255).astype('u1')
    chunks.append(pack);counts[family]=counts.get(family,0)+len(pack)
def plane(origin,dx,dy,nu,nv,color,**kw):
    o,a,b=map(np.array,(origin,dx,dy))
    surface(lambda u,v:o+u[...,None]*a+v[...,None]*b,nu,nv,color,**kw)
def revolve(cx,cz,r0,r1,y0,y1,color,n=72,m=6,**kw):
    surface(lambda u,v:xyz(cx+(r0+(r1-r0)*v)*np.cos(u*TAU),y0+(y1-y0)*v,cz+(r0+(r1-r0)*v)*np.sin(u*TAU)),n,m,color,**kw)
def pipe(path,r,color,segments=70,sides=8,**kw):
    def fn(u,v):
        center=path(u); t=unit(path(u+.0001)-path(u-.0001))
        aux=np.zeros_like(t); aux[...,1]=1
        aux[np.abs(t[...,1])>.98]=[1,0,0]
        a=unit(np.cross(t,aux));b=np.cross(t,a)
        return center+r*(a*np.cos(v[...,None]*TAU)+b*np.sin(v[...,None]*TAU))
    surface(fn,segments,sides,color,**kw)
def strut(p,q,r,color,n=18,s=7,**kw):
    p,q=map(np.asarray,(p,q));pipe(lambda u:p+(q-p)*u[...,None],r,color,n,s,**kw)
steel=[125,131,137]; gun=[77,83,92];dark=[48,52,59]; warm=[180,164,145];red=[236,55,53]; light=[241,208,183]
def deck(u,v,p,c):
    x,y,z=p.transpose(2,0,1); X=(x+6)%1.5;Z=(z+6)%1.5
    joint=(X<.05)|(Z<.05);c[joint]*=.52
    c[((X>.12)&(X<.17)&(Z<.30))|((Z>.12)&(Z<.17)&(X<.3))]*=1.48
    c[(abs(abs(x)-1.55)<.065)&((z*1.5)%2<1.15)]=[175,148,128]
    c[(abs(abs(x)-4.6)<.3)&((z*8)%1<.43)]*=.48
    return c
plane([-5.8,0,-6],[11.6,0,0],[0,0,12],174,180,[96,99,103],pattern=deck)
plane([-5.8,5.8,-6],[11.6,0,0],[0,0,12],100,110,dark,pattern=deck)
def panels(u,v,p,c):
    t=p[...,0]+p[...,2]; h=p[...,1]
    seam=(t%1.5<.08)|(h%1.4<.065);c[seam]*=.43
    c+=((t%1.5)+.5*(h%1.4))[...,None]*4
    vent=(h>.32)&(h<.93)&(t%2.5<1.65);c[vent&(t*7%1<.42)]*=.38
    return c
for k in [-1,1]:
    plane([k*5.8,0,-6],[0,0,12],[0,5.8,0],125,64,gun,pattern=panels)
    plane([-5.8,0,k*6],[11.6,0,0],[0,5.8,0],125,64,gun,pattern=panels)
family='overhead_ribs'
# Folded twin ribs arch over the gallery, with luminous perforations on their undersides.
for z in [-5.4,-2.6,.2,3.0,5.45]:
    for lane in [-.13,.13]:
        pts=[(-5.62,.1),(-5.54,3.52),(-4.03,5.03),(-2.1,5.53),(2.1,5.53),(4.03,5.03),(5.54,3.52),(5.62,.1)]
        for (x,y),(X,Y) in zip(pts,pts[1:]):
            strut([x,y,z+lane],[X,Y,z+lane],.128,steel,max(9,int(12*math.hypot(X-x,Y-y))),8)
    for k in [-1,1]:
        strut([k*5.38,3.48,z],[k*4.06,4.85,z],.048,light,24,6,emission=True)
for k in [-1,1]:
    for i in range(3):
        strut([k*(4.88-.20*i),5.03+.10*i,-5.95],[k*(4.88-.20*i),5.03+.10*i,5.95],.11 if i<2 else .055,gun if i!=1 else warm,140,8)
    strut([k*5.54,1.48,-5.9],[k*5.54,1.48,5.9],.035,red,150,6,emission=True)
family='neural_core'
cx,cz=0,-1.5
for y0,y1,r0,r1,col in [(0,.12,1.3,1.32,steel),(.12,.28,1.32,1.15,gun),(.28,.43,1.15,1.08,steel),(.43,.48,1.08,.47,dark),(.48,.75,.47,.30,steel),(.75,1.15,.30,.24,warm)]:
    revolve(cx,cz,r0,r1,y0,y1,col,90,5)
def ring(center,r,thick,basis_a,basis_b,col,seg=110,**kw):
    a,b,c=map(np.array,(basis_a,basis_b,center))
    pipe(lambda u:c+r*(np.cos(u[...,None]*TAU)*a+np.sin(u[...,None]*TAU)*b),thick,col,seg,8,**kw)
# Three coupled gimbals in intersecting planes held by an inclined fork.
for rad,ang,col in [(1.04,.22,steel),(.84,1.08,warm),(.67,2.04,gun)]:
    axis=[math.cos(ang),0,math.sin(ang)]
    ring([0,1.68,cz],rad,.075,axis,[0,1,0],col)
    ring([0,1.68,cz],rad-.061,.022,axis,[0,1,0],red,emission=True)
for s in [-1,1]:
    for a,b in [([s*.78,.30,cz+.08],[s*1.11,.93,cz+.11]),([s*1.11,.93,cz+.11],[s*.99,1.72,cz+.21])]:
        strut(a,b,.105,gun,16,10)
# Translucent-looking neural lattice around a small hot kernel.
for i in range(9):
    ph=i*TAU/9
    pipe(lambda u:xyz(.45*np.sin(np.pi*u)*np.cos(ph+u*2.6),1.21+.92*u,cz+.45*np.sin(np.pi*u)*np.sin(ph+u*2.6)),.018,[251,121,87],36,6,emission=True)
for y in [1.47,1.68,1.89]:
    ring([0,y,cz],.21,.026,[1,0,0],[0,0,1],light,40,emission=True)
family='heat_exchangers'
for cx,cz,h in [(-3.65,.65,2.50),(3.65,-2.5,2.98)]:
    for y0,y1,r0,r1,col in [(0,.18,.86,.86,steel),(.18,.43,.86,.65,gun),(.43,h-.45,.62,.62,dark),(h-.45,h-.20,.76,.68,steel),(h-.20,h,.68,.42,gun),(h,h+.05,.42,.02,steel)]:
        revolve(cx,cz,r0,r1,y0,y1,col,64,max(4,int((y1-y0)*14)))
    for i in range(8):
        a=i*TAU/8
        pipe(lambda u:xyz(cx+(.64+.12*np.sin(np.pi*u))*np.cos(a+.51*u),.34+(h-.63)*u,cz+(.64+.12*np.sin(np.pi*u))*np.sin(a+.51*u)),.095,steel,29,8)
    for j in range(7):
        y=.5+(h-.93)*j/6
        ring([cx,y,cz],.644,.035,[1,0,0],[0,0,1],red if j in [1,5] else gun,60,emission=j in [1,5])
    pipe(lambda u:xyz(cx+.28*np.sin(2*np.pi*u),h+(.52+.2*np.sin(2*np.pi*u))*u+(5.1-h-.52)*u*u,cz+.26*u),.12,gun,50,8)
family='rear_bulkhead'
# Rear shield iris with layered pressure leaves and inspection scale.
for radial,th,col in [(1.95,.095,steel),(1.72,.12,gun),(1.46,.038,red)]:
    ring([0,2.65,-5.78],radial,th,[1,0,0],[0,1,0],col,148,emission=col==red)
for i in range(14):
    ang=i*TAU/14
    def blade(u,v):
        r=.18+1.30*u;a=ang+.38*v+.5*u
        return xyz(r*np.cos(a),2.65+r*np.sin(a),-5.82+.07*np.sin(v*np.pi))
    surface(blade,15,7,steel if i%2 else gun)
family='instrumentation'
# Printed serials and instrument displays are sampled on local metal plaques.
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',30)
for x,z,label,sub in [(-3.37,-5.9,'N / 03','FIELD LAB'),(3.37,-5.9,'R / 07','COUPLING'),(0,5.9,'AIRLOCK','SECTOR 01')]:
    sign=Image.new('RGB',(240,100),(41,45,51));d=ImageDraw.Draw(sign)
    d.rectangle((0,0,239,3),fill=(183,84,68));d.text((12,6),label,font=font,fill=(246,226,201))
    d.text((12,48),sub,font=font,fill=(182,186,186));pix=np.asarray(sign)
    side=1 if z<0 else -1
    plane([x-1.02*side,2.25,z],[2.04*side,0,0],[0,.85,0],165,66,gun,emission=True,pattern=lambda u,v,p,c:pix[np.int32((1-v)*99),np.int32(u*239)])
data=np.concatenate(chunks)
assert len(data)*32<8_000_000 and np.isfinite(data['xyz']).all() and np.all(data['scale']>0)
out=OUT/'sector.splat';data.tofile(out)
metadata={'format':'antimatter15/splat; 32 bytes per Gaussian, little endian; Y up; metres','count':len(data),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'families':counts,'origin':'Original synthetic calibration bay, deterministic parametric oriented Gaussians. No captured photography, external model or image. Baked material colour and lighting, no view-dependent harmonics.','license':'Original sector.splat released under CC0-1.0. Plaque glyphs from DejaVu Sans Mono.','bounds':{'minX':-5.8,'maxX':5.8,'minZ':-6,'maxZ':6,'floor':0,'ceiling':5.8},'spawn':[0,1.65,4.5],'collisionDiscs':[{'x':0,'z':-1.5,'r':1.35},{'x':-3.65,'z':.65,'r':.91},{'x':3.65,'z':-2.5,'r':.91}]}
(OUT/'sector.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata,indent=2))
