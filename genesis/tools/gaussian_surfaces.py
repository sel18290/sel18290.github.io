"""Metric surface samplers for the CORTEX direct Gaussian export. Y up."""
import math
import numpy as np
from scipy.spatial.transform import Rotation
TAU=2*math.pi
dtype=np.dtype([('xyz','<f4',(3,)),('scale','<f4',(3,)),('rgba','u1',(4,)),('rotation','u1',(4,))])
chunks=[]
counts={}
family='shell'
rng=np.random.default_rng(71003)
density=1.0
def configure(detail):
    global density, rng
    density=detail
    rng=np.random.default_rng(71003)
    counts.clear()
    chunks.clear()
def unit(v): return v/np.maximum(np.linalg.norm(v,axis=-1,keepdims=True),1e-12)
def xyz(x,y,z): return np.stack(np.broadcast_arrays(x,y,z),axis=-1)
def surface(fn,nu,nv,color,emission=False,pattern=None):
    nu=max(4,round(nu*density)); nv=max(3,round(nv*density))
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
    scales=np.stack([np.linalg.norm(du,axis=-1)*.59,np.linalg.norm(dv,axis=-1)*.59,np.full_like(u,.0045)],axis=-1)
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
        grain=np.sin((p[...,0]*7+p[...,2]*9+p[...,1]*36)*2.4)
        base+=grain[...,None]*1.7
        # Static highlights from high strip lamps. A fixed bake, not tracked specularity.
        stripe=np.abs(n@np.array([.85,.23,.47]))**13
        base+=stripe[...,None]*np.array([24,23,22])
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
