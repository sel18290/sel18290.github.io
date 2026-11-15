"""Check real spatial data independently of a GPU. This does not test visibility."""
import hashlib, json, struct
from pathlib import Path
from math import isfinite,sqrt
p=Path(__file__).resolve().parents[1]/'dist/assets'
meta=json.loads((p/'sector.json').read_text())
data=(p/'sector.splat').read_bytes()
assert len(data)==meta['count']*32==meta['bytes']
assert hashlib.sha256(data).hexdigest()==meta['sha256']
extrema=[[float('inf'),float('-inf')] for _ in range(3)]
octants=set()
for rec in struct.iter_unpack('<6f8B',data):
    x,y,z,sx,sy,sz,r,g,b,alpha,*q=rec
    assert all(isfinite(v) for v in rec) and min(sx,sy,sz)>0 and alpha>0
    assert .983<sqrt(sum(((c-128)/128)**2 for c in q))<1.017
    octants.add((x>=0,y>=2.9,z>=0))
    for limits,c in zip(extrema,[x,y,z]):
        limits[0]=min(limits[0],c);limits[1]=max(limits[1],c)
assert len(octants)==8 and all(hi-lo>5 for lo,hi in extrema)
# Lateral translation of the viewer relative to two actual Gaussian centers near the axis.
xyz=[rec[:3] for rec in struct.iter_unpack('<6f8B',data)]
near=min(xyz,key=lambda v:sum((a-b)**2 for a,b in zip(v,(0,1.68,-1.5))))
far=min(xyz,key=lambda v:sum((a-b)**2 for a,b in zip(v,(0,1.68,-5.8))))
shift=lambda v:abs((v[0]-1)/(4.5-v[2])-v[0]/(4.5-v[2]))
assert shift(near)>1.5*shift(far)
print('size, checksum, scales, opacity, quaternions, three-dimensional extents and differential projection OK')
print('Camera translated 1m: normalized near/far projection shift',round(shift(near),4),round(shift(far),4))
