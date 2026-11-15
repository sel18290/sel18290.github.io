"""Structural, parallax and repeatability checks for the two synthetic-room recipes."""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib
import json

import numpy as np
from build_pilot import ROOT, build, g


def check(asset_dir, name):
    source=asset_dir/(name+'.splat')
    meta=json.loads((asset_dir/(name+'.json')).read_text())
    records=np.fromfile(source,dtype=g.dtype)
    assert source.stat().st_size==len(records)*32==meta['bytes']
    assert hashlib.sha256(source.read_bytes()).hexdigest()==meta['sha256']
    assert len(records)==meta['count']==sum(meta['families'].values())
    assert np.isfinite(records['xyz']).all() and np.isfinite(records['scale']).all()
    assert records['scale'].min()>0 and (records['rgba'][:,3]>0).all()
    q=(records['rotation'].astype(float)-128)/128
    assert np.allclose(np.linalg.norm(q,axis=1),1,atol=.018)
    # Central seat is a mesh. No static Gaussian between deck and upper suspension.
    sx,_,sz=meta['seatAnchor']; x,y,z=records['xyz'].T
    assert not np.any(((x-sx)**2+(z-sz)**2<1.45**2)&(y>.08)&(y<2.90))
    # Compare two actual splat centres projected as the camera strafes one metre.
    cam=np.array(meta['spawn'])
    centered=records['xyz']-cam
    left=meta['collisionDiscs'][1]
    near_i=np.argmin(np.linalg.norm(records['xyz']-np.array([left['x'],1.65,left['z']+.65]),axis=1))
    far_i=np.argmin(np.linalg.norm(records['xyz']-np.array([0,1.65,meta['bounds']['minZ']]),axis=1))
    depth=-centered[:,2]
    delta=1/depth[[near_i,far_i]]
    assert delta[0]>1.5*delta[1]>0
    return meta


if __name__=='__main__':
    assets=ROOT/'dist/assets'
    hd=check(assets,'pilot')
    mobile=check(assets,'pilot-mobile')
    assert hd['count']>2*mobile['count']
    assert hd['collisionDiscs']==mobile['collisionDiscs']
    baseline=json.loads((assets/'sector.json').read_text())
    assert hd['collisionDiscs']==baseline['collisionDiscs'] and hd['spawn']==baseline['spawn']
    with TemporaryDirectory() as tmp:
        tmp=Path(tmp)
        pilot=json.loads((ROOT/'rooms/pilot.json').read_text())
        assert build(pilot,'mobile',tmp)['sha256']==mobile['sha256']
        flux=json.loads((ROOT/'rooms/flux.json').read_text())
        second=build(flux,'mobile',tmp)
        assert second['sha256']!=mobile['sha256'] and second['bounds']!=mobile['bounds']
        check(tmp,'flux-mobile')
    print('Pilot HD/mobile topology, seat exclusion, navigation parity, near/far disparity, deterministic export and second recipe OK.')
