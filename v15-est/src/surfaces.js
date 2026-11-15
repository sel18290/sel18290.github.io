import * as THREE from '../vendor/three.module.js';
// Original deterministic PBR surfaces, generated locally. No network texture or stock image.
export function surfacePixels(kind='alloy',size=256){
 const color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),height=new Float32Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,k=i*4,n=((x*73+y*151+x*y*17)%127)/127;
  const seam=kind==='deck'&&(x%128<3||y%128<3),rim=kind==='deck'&&(x%128<6||y%128<6);
  const brushing=Math.sin(y*2.1)*1.7+Math.sin(y*.63)*.9;
  const value=kind==='polymer'?(204+n*5+(x%4<2?3:-3)+(y%4<2?2:-2)):kind==='deck'?(seam?46:rim?117:177+n*5):(191+brushing+n*3);
  color[k]=value;color[k+1]=value+2;color[k+2]=value+4;color[k+3]=255;
  const r=kind==='polymer'?194+n*25:kind==='deck'?(seam?220:rim?156:168+n*16):162+n*36;
  roughness[k]=roughness[k+1]=roughness[k+2]=r;roughness[k+3]=255;
  height[i]=kind==='polymer'?(.75+Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2)*.014+n*.003):seam?.1:rim?.65:.78+(kind==='deck'?n*.008:Math.sin(y*2.1)*.023+n*.003);
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=height[y*size+(x+1)%size]-height[y*size+(x-1+size)%size],dy=height[((y+1)%size)*size+x]-height[((y-1+size)%size)*size+x];
  const length=Math.sqrt(dx*dx*4+dy*dy*4+1),k=(y*size+x)*4;normal[k]=(-dx/length+.5)*255;normal[k+1]=(-dy/length+.5)*255;normal[k+2]=(.5/length+.5)*255;normal[k+3]=255;
 }
 return{color,normal,roughness,size};
}
export function makeSurface(kind){const p=surfacePixels(kind),maps={};for(const key of ['color','normal','roughness']){const t=new THREE.DataTexture(p[key],p.size,p.size,THREE.RGBAFormat);t.colorSpace=key==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;maps[key]=t;}return maps;}
export function haloTexture(size=64){const data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const k=(y*size+x)*4,r=Math.hypot(x/(size-1)*2-1,y/(size-1)*2-1);data[k]=data[k+1]=data[k+2]=255;data[k+3]=Math.pow(Math.max(0,1-r),3)*210;}const tex=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);tex.needsUpdate=true;return tex;}
