"""Build a synthetic room directly as oriented ellipsoids in the Spark .splat format."""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import gaussian_surfaces as g
from gaussian_surfaces import plane, pipe, revolve, strut, surface, xyz

ROOT = Path(__file__).resolve().parents[1]
STEEL = [135, 134, 132]
TITANIUM = [168, 158, 146]
GRAPHITE = [75, 81, 85]
GASKET = [45, 48, 52]
LIGHT = [249, 220, 192]


def ring(center, radius, thickness, axes, color, n=96, emit=False):
    c, a, b = map(np.array, [center, *axes])
    def path(u):
        phase = (u*g.TAU)[..., None]
        return c+radius*(a*np.cos(phase)+b*np.sin(phase))
    pipe(path, thickness, color, n, 8, emission=emit)


def flooring(u, v, p, c):
    x, y, z = p.transpose(2, 0, 1)
    tx, tz = (x+.6)%1.2, (z+.8)%1.6
    c[(tx<.043)|(tz<.045)] *= .49
    c[(tx>.046)&(tx<.080)] *= 1.23
    # Directional treads, engraved channels and bolts along each removable plate.
    vent=(abs(abs(x)-4.4)<.36)
    c[vent & ((z+abs(x)*.45)%.18<.085)] *= .45
    c[(tx<.13)&(tz<.15)] *= .64
    c[(abs(abs(x)-1.72)<.035)&(z%1<.62)] = TITANIUM
    return c


def wall(u, v, p, c):
    t=p[...,0]+p[...,2]; h=p[...,1]
    groove=(t%1.45<.062)|(h%1.15<.045)
    c[groove]*=.53
    c[(t%1.45>.066)&(t%1.45<.10)]*=1.22
    c[(h>.55)&(h<1.25)&((t+h*.38)%.24<.085)]*=.55
    return c


def vault(spec):
    w,l,h=spec['halfWidth'],spec['halfLength'],spec['height']
    accent=spec['accent']
    g.family='deck_and_pressure_shell'
    plane([-w,0,-l],[2*w,0,0],[0,0,2*l],int(w*38),int(l*38),[99,101,103],pattern=flooring)
    plane([-w,h,-l],[2*w,0,0],[0,0,2*l],92,102,GASKET,pattern=wall)
    for sign in [-1,1]:
        # Wall-height recesses above walking level open to a deeper service gallery.
        plane([sign*w,0,-l],[0,0,2*l],[0,3.25,0],int(l*27),57,GRAPHITE,pattern=wall)
        plane([sign*(w+.9),3.25,-l],[0,0,2*l],[0,h-3.25,0],100,54,GASKET,pattern=wall)
        plane([sign*w,3.25,-l],[sign*.94,0,0],[0,0,2*l],12,100,STEEL)
        plane([-w,0,sign*l],[2*w,0,0],[0,h,0],158,95,GRAPHITE,pattern=wall)
        g.family='service_galleries'
        for rail in [3.39,4.05]:
            strut([sign*(w-.55),rail,-l],[sign*(w-.55),rail,l],.044,TITANIUM,112)
        plane([sign*(w-.65),3.22,-l],[sign*.65,0,0],[0,0,2*l],8,110,GRAPHITE)
        for z in np.linspace(-l+.2,l-.2,spec['bayCount']*2):
            strut([sign*(w-.55),3.24,z],[sign*(w-.55),4.08,z],.035,STEEL,11)
            strut([sign*w,2.98,z],[sign*(w-.56),3.22,z],.045,TITANIUM,10)
        for j in range(3):
            z0=-l
            x=sign*(w+.52)
            strut([x,4.65+.32*j,z0],[x,4.65+.32*j,l],.11,TITANIUM if j==1 else GRAPHITE,115,9)
        g.family='deck_and_pressure_shell'
    g.family='arched_transverse_frames'
    for z in np.linspace(-l+.45,l-.45,spec['bayCount']):
        for sign in [-1,1]:
            # A tapered portal rib with separate flange faces and web.
            profile=np.array([[sign*(w-.045),.05],[sign*(w-.10),3.1],[sign*(w-.87),h*.67],[sign*(w*.54),h-.65],[0,h-.36]])
            for i,(a,b) in enumerate(zip(profile,profile[1:])):
                vector=b-a
                offset=np.array([-vector[1],vector[0]])/np.linalg.norm(vector)*.14*sign
                def web(u,v):
                    xy=a+u[...,None]*vector+v[...,None]*offset
                    return xyz(xy[...,0],xy[...,1],z+0*u)
                surface(web,max(8,int(np.linalg.norm(vector)*16)),4,GRAPHITE)
                for d in [-.10,.10]:
                    strut([*a,z+d],[*b,z+d],.082,STEEL,max(9,int(np.linalg.norm(vector)*12)),7)
                if i==2:
                    strut([*a,z+.16],[*b,z+.16],.035,LIGHT,32,6,emission=True)
    g.family='suspension_and_power'
    cx,cz=spec['seat']
    axes=([1,0,0],[0,0,1])
    for j,(r,y) in enumerate([(2.13,h-.9),(1.9,h-1.27),(1.59,h-1.44)]):
        ring([cx,y,cz],r,.12,axes,TITANIUM if j==1 else GRAPHITE,136)
        ring([cx,y-.105,cz],r,.022,axes,accent,136,True)
    for a in np.linspace(0,g.TAU,8,endpoint=False):
        dx,dz=np.cos(a),np.sin(a)
        strut([cx+2.78*dx,h-.08,cz+2.78*dz],[cx+1.83*dx,h-1.36,cz+1.83*dz],.072,STEEL,24)
        # Catenary drops remain entirely overhead.
        pipe(lambda u:xyz(cx+dx*(1.8+1.85*u),h-.9-1.15*np.sin(np.pi*u),cz+dz*(1.8+1.85*u)),.033,GASKET,36)


def exchangers(spec):
    g.family='thermal_machines'
    for machine in spec['machines']:
        x,z,h=machine['x'],machine['z'],machine['height']
        accent=spec['accent']
        layers=[(0,.14,.88,.88,STEEL),(.14,.35,.88,.66,GRAPHITE),(.35,h-.31,.59,.59,GASKET),
                (h-.31,h-.15,.73,.65,TITANIUM),(h-.15,h,.65,.38,GRAPHITE),(h,h+.04,.38,.02,STEEL)]
        for bottom,top,ra,rb,col in layers:
            revolve(x,z,ra,rb,bottom,top,col,82,max(5,int((top-bottom)*20)))
        if machine['type']=='helical':
            for i in range(9):
                angle=i*g.TAU/9
                def coil(u):
                    a=angle+1.12*u
                    radius=.64+.09*np.sin(u*np.pi)
                    return xyz(x+radius*np.cos(a),.36+(h-.63)*u,z+radius*np.sin(a))
                pipe(coil,.066,TITANIUM,42,8)
        else:
            for i in range(15):
                y=.46+(h-.85)*i/14
                r=.73+.10*np.sin(np.pi*i/14)
                revolve(x,z,.59,r,y,y+.035,TITANIUM,68,3)
                revolve(x,z,r,.59,y+.035,y+.075,GRAPHITE,68,3)
        for i in [0,1,2]:
            ring([x,.48+i*(h-.83)*.5,z],.60,.027,([1,0,0],[0,0,1]),accent,82,True)
        for j in [-1,1]:
            # Separate high pressure feeds follow a swept curve up to the lateral header.
            sign=np.sign(x)
            def feed(u):
                smooth=u*u*(3-2*u)
                return xyz(x+sign*(spec['halfWidth']-abs(x)+.3)*smooth,h+(4.65-h)*u+.6*np.sin(np.pi*u),z+j*.18+smooth*.50)
            pipe(feed,.082 if j==1 else .053,GRAPHITE if j==1 else TITANIUM,48,8)


def bulkhead(spec):
    g.family='pressure_iris'
    r=spec['apertureRadius'];z=-spec['halfLength']+.12;y=r+.20
    for f,width,col in [(1.04,.105,STEEL),(.96,.12,GRAPHITE),(.85,.028,spec['accent'])]:
        ring([0,y,z+.04],r*f,width,([1,0,0],[0,1,0]),col,156,col==spec['accent'])
    for i in range(18):
        def vane(u,v):
            radius=.05+.83*r*u
            theta=g.TAU*i/18+.36*v+.58*u
            return xyz(radius*np.cos(theta),y+radius*np.sin(theta),z+.045*np.sin(v*np.pi))
        surface(vane,32,9,STEEL if i%2 else GRAPHITE)
    # Injection needles along the outer rim; solid backs and separately picked-out tips.
    for i in range(32):
        a=g.TAU*i/32
        rad=np.array([np.cos(a),np.sin(a),0])
        base=np.array([0,y,z+.18])
        strut(base+rad*r*.99,base+rad*r*1.095,.032,TITANIUM,5,5)


def build(spec, profile, out):
    g.configure(1.28 if profile=='hd' else .79)
    vault(spec); exchangers(spec); bulkhead(spec)
    records=np.concatenate(g.chunks)
    out.mkdir(exist_ok=True,parents=True)
    stem=spec['id']+('' if profile=='hd' else '-mobile')
    asset=out/(stem+'.splat')
    records.tofile(asset)
    if asset.stat().st_size>15_000_000: raise ValueError('Resource exceeds authored file budget')
    seat=spec['seat']; w,l=spec['halfWidth'],spec['halfLength']
    meta=dict(count=len(records),bytes=asset.stat().st_size,sha256=hashlib.sha256(asset.read_bytes()).hexdigest(),
              format='antimatter15/splat; 32-byte little-endian records, metres, Y up',origin='Original parametric 3D Gaussian sector; surface-aligned ellipsoids and baked colour, no training, no image planes.',
              license='CC0-1.0 for original generated spatial asset', profile=profile, families=dict(g.counts),
              bounds=dict(minX=-w,maxX=w,minZ=-l,maxZ=l,floor=0,ceiling=spec['height']),spawn=spec['spawn'],
              seatAnchor=[seat[0],0,seat[1]],
              collisionDiscs=[dict(x=seat[0],z=seat[1],r=1.35)]+[dict(x=m['x'],z=m['z'],r=.91) for m in spec['machines']])
    (out/(stem+'.json')).write_text(json.dumps(meta,indent=2)+'\n')
    print(asset.name,meta['count'],meta['bytes'],meta['sha256'])
    return meta


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--room',type=Path,default=ROOT/'rooms/pilot.json')
    parser.add_argument('--profile',choices=['hd','mobile','both'],default='both')
    parser.add_argument('--out',type=Path,default=ROOT/'dist/assets')
    args=parser.parse_args()
    for profile in (['hd','mobile'] if args.profile=='both' else [args.profile]):
        build(json.loads(args.room.read_text()),profile,args.out)
