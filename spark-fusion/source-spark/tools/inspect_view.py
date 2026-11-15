"""Offline pinhole projection of static Gaussian geometry for art inspection.
No Spark shaders, interactive meshes, GPU measurements or view-dependent shading.
"""
import argparse
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
from PIL import Image
def render(path, target, eye, look, size=(800,480)):
    record=np.dtype([('p','<f4',3),('s','<f4',3),('rgba','u1',4),('q','u1',4)])
    g=np.fromfile(path,dtype=record)
    forward=np.array(look)-eye
    forward/=np.linalg.norm(forward)
    right=np.cross(forward,[0,1,0]); right/=np.linalg.norm(right)
    basis=np.stack([right,np.cross(right,forward),forward])
    cam=(g['p']-eye)@basis.T
    width,height=size
    focal=height/(2*np.tan(np.deg2rad(68/2)))
    keep=(cam[:,2]>.14)&(abs(cam[:,0])<cam[:,2]*(width/2+40)/focal)&(abs(cam[:,1])<cam[:,2]*(height/2+40)/focal)
    ordered=np.flatnonzero(keep)
    ordered=ordered[np.argsort(-cam[ordered,2])]
    g=g[ordered];cam=cam[ordered];z=cam[:,2]
    center=np.stack([width/2+focal*cam[:,0]/z,height/2-focal*cam[:,1]/z],axis=1)
    q=(g['q'].astype(float)-128)/128
    axes=(basis@Rotation.from_quat(q[:,[1,2,3,0]]).as_matrix())*g['s'][:,None,:]
    jac=np.zeros((len(z),2,3));jac[:,0,0]=focal/z;jac[:,1,1]=-focal/z
    jac[:,0,2]=-focal*cam[:,0]/z**2;jac[:,1,2]=focal*cam[:,1]/z**2
    proj=jac@axes
    cov=proj@proj.transpose(0,2,1)+.15*np.eye(2)
    inv=np.linalg.inv(cov)
    extent=np.ceil(3*np.sqrt(np.diagonal(cov,axis1=1,axis2=2))).astype(int)
    frame=np.full((height,width,3),20,dtype='float32')
    for i,((u,v),(rx,ry)) in enumerate(zip(center,extent)):
        x0=max(0,int(u)-rx); x1=min(width,int(u)+rx+1)
        y0=max(0,int(v)-ry); y1=min(height,int(v)+ry+1)
        if x0>=x1 or y0>=y1:continue
        x=np.arange(x0,x1)+.5-u;y=(np.arange(y0,y1)+.5-v)[:,None]
        a,b,c=inv[i,0,0],inv[i,0,1],inv[i,1,1]
        alpha=np.exp(-.5*(a*x*x+2*b*x*y+c*y*y))*g['rgba'][i,3]/255
        region=frame[y0:y1,x0:x1]
        region+=(g['rgba'][i,:3]-region)*alpha[:,:,None]
    Image.fromarray(frame.clip(0,255).astype('uint8')).save(target)
if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('asset',type=Path); parser.add_argument('out',type=Path)
    parser.add_argument('--eye',type=float,nargs=3,default=[0,1.65,4.5])
    parser.add_argument('--look',type=float,nargs=3,default=[0,2.3,-3])
    args=parser.parse_args();render(args.asset,args.out,np.array(args.eye),np.array(args.look))
