import * as T from '../vendor/three.module.js';

// One repeat is one machined panel. All channels use the same periodic height field.
export function panelFinish(style, size=128) {
  const height=new Float32Array(size*size);
  const rough=new Uint8Array(size*size*4), normal=new Uint8Array(rough.length);
  const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size,i=y*size+x;
    const grain=Math.sin(2*Math.PI*(41*v+Math.sin(2*Math.PI*u)*.14));
    const tread=Math.pow(Math.max(0,Math.cos(2*Math.PI*(6*u+3*v))),10)*Math.pow(Math.sin(4*Math.PI*v),2);
    height[i]=style==='tread'?.55*tread+.05*grain:style==='enamel'?.04*Math.cos(2*Math.PI*(13*u+7*v)):.14*grain;
    const worn=Math.exp(-Math.min(u,1-u,v,1-v)*55);
    const value=clamp((style==='tread'?195:style==='enamel'?211:164)+19*height[i]-20*worn+8*Math.cos(2*Math.PI*(u+v)));
    rough.set([value,value,value,255],i*4);
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const at=(a,b)=>height[((b+size)%size)*size+(a+size)%size];
    const nx=2*(at(x-1,y)-at(x+1,y)),ny=2*(at(x,y-1)-at(x,y+1)),len=Math.hypot(nx,ny,1);
    normal.set([clamp(127.5*(1+nx/len)),clamp(127.5*(1+ny/len)),clamp(127.5*(1+1/len)),255],4*(y*size+x));
  }
  function texture(bytes){
    const t=new T.DataTexture(bytes,size,size);
    t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;
  }
  return {normalMap:texture(normal),roughnessMap:texture(rough)};
}

export function applyIndustrialFinishes(m,renderer){
  const maps={};
  const profiles=[
    ['deck','tread',0x64656b,.85,.74],['anodized','enamel',0x41434a,.69,.78],
    ['titanium','brush',0x98999e,.69,.90],['steel','brush',0x62656c,.78,.86]
  ];
  for(const [name,type,color,roughness,metalness] of profiles){
    const pair=maps[type]??=panelFinish(type);
    const mat=m[name];
    Object.assign(mat,pair,{roughness,metalness});mat.normalScale.setScalar(type==='tread'?.56:.26);
    mat.color.setHex(color);
    for(const t of Object.values(pair))t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  }
  for(const t of [m.deck.map])if(t){m.deck.map=t.clone();m.deck.map.repeat.set(1,1);m.deck.map.needsUpdate=true}
}
