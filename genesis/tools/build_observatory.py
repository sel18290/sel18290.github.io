"""N05 synthetic, metre-scale surface Gaussians. Rebuild from the image's architecture, without image projection."""
from pathlib import Path
import json, hashlib
import numpy as np
import gaussian_surfaces as g
from gaussian_surfaces import plane, pipe, strut, revolve, xyz, surface

OUT=Path(__file__).resolve().parents[1]/'assets'
METAL=[151,151,148]; DARK=[61,68,78]; TRIM=[179,171,158]
CYAN=[130,213,224]; RED=[240,69,57]
def panel(u,v,p,c):
    x,y,z=p.transpose(2,0,1)
    seams=(np.mod(x+z,1.2)<.034)|(np.mod(y+z,1.4)<.036)
    c[seams]*=.52
    c[np.mod(x*3+z*2,.16)<.005]*=.92
    return c
def arc(z,thickness,color,emit=False):
    # Elliptical arch anchored on each side of the viewing window.
    pipe(lambda u:xyz(4.78*np.cos(np.pi*u),.65+3.7*np.sin(np.pi*u),z+0*u),thickness,color,180,12,emission=emit)
def ring(x,y,z,r,minor,col,emit=False):
    pipe(lambda u:xyz(x+r*np.cos(g.TAU*u),y+r*np.sin(g.TAU*u),z+0*u),minor,col,128,10,emission=emit)
def field_cage():
    # Split shells carry the collectors; the gaps expose the bright inner winding.
    g.family='resonator-armour'
    x,z=3.05,-2.5
    for side in [-1,1]:
        for k in range(12):
            a=k*g.TAU/12
            def petal(u,v):
                angle=a+(v-.5)*.40+side*.10*u
                radius=1.16-.40*u+.12*np.sin(np.pi*u)+.045*np.sin(np.pi*v)
                return xyz(x+radius*np.cos(angle),2.09+side*(1.36-.77*u),z+radius*np.sin(angle))
            surface(petal,34,18,TRIM if k%3==0 else DARK)
            pipe(lambda u:petal(u,np.full_like(u,.07)),.016,[248,139,89],38,6,emission=True)
    g.family='central-field'
    for k in range(7):
        def coil(u):
            a=g.TAU*(k/7+1.65*u)
            r=.105+.19*np.sin(np.pi*u)**2
            return xyz(x+r*np.cos(a),1.1+1.98*u,z+r*np.sin(a))
        pipe(coil,.024,[255,167,99],112,8,emission=True)
    g.family='magnetic-winding'
    for k in range(8):
        def winding(u):
            a=g.TAU*(k/8+u*.115)
            r=2.28+.14*np.cos(u*g.TAU*11)
            return xyz(20+r*np.cos(a),4.51+.14*np.sin(u*g.TAU*11),r*np.sin(a))
        pipe(winding,.055,[184,113,72],200,10)
    g.family='cryogenic-exchanger'
    for k in range(14):
        def capillary(u):
            a=g.TAU*(k/14+u*.60)
            r=.46+.08*np.sin(np.pi*u)
            return xyz(-17+r*np.cos(a),3.04+1.52*u,r*np.sin(a))
        pipe(capillary,.039,[121,185,193],64,8)
    for h,r in [(3.1,.51),(4.5,.51),(4.62,.39)]:
        pipe(lambda u:xyz(-17+r*np.cos(g.TAU*u),h+0*u,r*np.sin(g.TAU*u)),.06,METAL,96,9)

def aurora(profile):
    # Thin translucent curtains beyond the pressurised shell. Soft overlapping
    # ellipsoids leave the stars and terrestrial horizon visible between folds.
    g.family='orbital-aurora'
    for i in range(4):
        def curtain(u,v):
            phase=2*np.pi*u
            return xyz(-79+145*u,3+i*1.8+3*np.sin(phase*1.6+i*.3)+v*(5+3*np.cos(phase*3)**2),
                       -120-i*7+7*np.cos(phase*2+i*.5)-v*2.6)
        def bands(u,v,p,c):
            t=(.5+.5*np.sin(g.TAU*(u*16+.15*np.sin(v*4))))[...,None]
            c[:]=np.array([65,173,160])+(np.array([101,48,70])*v[...,None])+34*t
            return c
        surface(curtain,230,25,[95,191,177],emission=True,pattern=bands)
        chunk=g.chunks[-1]
        pos=chunk['xyz']
        envelope=np.sin(np.pi*np.clip((pos[:,0]+79)/145,0,1))**2
        chunk['rgba'][:,3]=np.uint8(envelope*(22+12*np.sin(pos[:,0]*.8)**2))
        chunk['scale']*=1.65

def build(profile):
    g.configure(1 if profile=='hd' else .65)
    g.family='neural-resonator'
    x,z=3.05,-2.5
    # Two flared collectors joined by a waist of conducting filaments.
    for y0,y1,r0,r1,col in [(0,.18,1.32,1.32,METAL),(.18,.65,1.26,.92,DARK),(.65,.81,.92,.95,TRIM),(3.36,3.52,1.23,1.31,TRIM),(3.52,3.9,1.31,.98,DARK),(3.9,4.8,.67,.67,METAL)]:
        revolve(x,z,r0,r1,y0,y1,col,128,max(5,int((y1-y0)*45)))
    for i in range(36):
        a=g.TAU*i/36
        def strand(u):
            radius=.23+(.69+.22*u)*((2*u-1)**2)
            angle=a+.48*np.sin(u*np.pi)
            return xyz(x+radius*np.cos(angle),.8+2.58*u,z+radius*np.sin(angle))
        pipe(strand,.022,RED if i%3 else TRIM,75,7,emission=i%3!=0)
    for y,r in [(.22,1.26),(.78,.95),(1.98,.31),(2.16,.31),(3.42,1.26)]:
        pipe(lambda u:xyz(x+r*np.cos(g.TAU*u),y+0*u,z+r*np.sin(g.TAU*u)),.041,TRIM,128,8)
    # Inlaid twin service lines lead from the terminal base to the collector.
    for offset in [-.12,.12]:
        strut([1.85+offset,.035,.45],[x+offset,.035,z],.022,TRIM,82,8)
    field_cage()
    aurora(profile)
    data=np.concatenate(g.chunks)
    assert np.isfinite(data['xyz']).all() and (data['scale']>0).all()
    name='observatoire'+('' if profile=='hd' else '-mobile')+'.splat'
    data.tofile(OUT/name)
    meta={'count':len(data),'bytes':int(data.nbytes),'sha256':hashlib.sha256((OUT/name).read_bytes()).hexdigest(),'families':g.counts,'origin':'Original synthetic surface Gaussians, no training or image projection','boundsXYZ':[data['xyz'].min(axis=0).tolist(),data['xyz'].max(axis=0).tolist()],'license':'Original generated spatial asset'}
    (OUT/name.replace('.splat','.json')).write_text(json.dumps(meta,indent=2))
    print(name,meta['count'],meta['bytes'])
if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    for quality in ['hd','mobile']:build(quality)
