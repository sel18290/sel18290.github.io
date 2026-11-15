import * as T from 'three';

// Optional bilinear spatial reconstruction + bounded contrast-adaptive sharpening.
// This is NOT DLSS or FSR. No history buffers, motion vectors, AI or frame creation.
export const UPSCALE_FRAGMENT=`uniform sampler2D image;uniform vec2 texel;varying vec2 vUv;
void main(){
 vec3 c=texture2D(image,vUv).rgb,n=texture2D(image,vUv+vec2(0.,texel.y)).rgb,s=texture2D(image,vUv-vec2(0.,texel.y)).rgb;
 vec3 e=texture2D(image,vUv+vec2(texel.x,0.)).rgb,w=texture2D(image,vUv-vec2(texel.x,0.)).rgb;
 vec3 lo=min(c,min(min(n,s),min(e,w))),hi=max(c,max(max(n,s),max(e,w)));
 float contrast=max(max(hi.r-lo.r,hi.g-lo.g),hi.b-lo.b);
 float gain=.16*(1.-smoothstep(.15,.65,contrast));
 vec3 rgb=clamp(c+gain*(c-(n+s+e+w)*.25),lo,hi);
 gl_FragColor=vec4(rgb,1.);
}`;

export class SpatialUpscaler{
 constructor(renderer){
  this.renderer=renderer;this.size=new T.Vector2();this.viewport=new T.Vector4();this.inputWidth=this.inputHeight=0;this.texture=null;this.failed=false;
  this.scene=new T.Scene();this.camera=new T.Camera();
  this.material=new T.ShaderMaterial({uniforms:{image:{value:null},texel:{value:new T.Vector2()}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:UPSCALE_FRAGMENT,
   toneMapped:false,depthTest:false,depthWrite:false,blending:T.NoBlending});
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
  this.triangle=new T.Mesh(geometry,this.material);this.triangle.frustumCulled=false;this.scene.add(this.triangle);
 }
 render(scene,camera,scale=.8){
  const r=this.renderer;if(this.failed){r.render(scene,camera);return;}r.getDrawingBufferSize(this.size);const ratio=r.getPixelRatio();
  const w=Math.max(2,Math.floor(this.size.x*scale)),h=Math.max(2,Math.floor(this.size.y*scale));
  if(w!==this.inputWidth||h!==this.inputHeight){
   this.texture?.dispose();this.texture=new T.FramebufferTexture(w,h);this.texture.minFilter=this.texture.magFilter=T.LinearFilter;
   // The copy contains already tone-mapped sRGB bytes. Keep them unconverted:
   // no second tone mapping or colour conversion in this presentation shader.
   this.texture.colorSpace=T.NoColorSpace;this.material.uniforms.image.value=this.texture;this.material.uniforms.texel.value.set(1/w,1/h);
   this.inputWidth=w;this.inputHeight=h;
  }
  r.getViewport(this.viewport);
  try{r.setViewport(0,0,w/ratio,h/ratio);r.render(scene,camera);r.copyFramebufferToTexture(this.texture);r.setViewport(this.viewport);r.render(this.scene,this.camera);}
  catch(error){this.failed=true;this.error=String(error.message||error);r.setViewport(this.viewport);r.render(scene,camera);}
  finally{r.setViewport(this.viewport);}
 }
 dispose(){this.texture?.dispose();this.texture=null;this.material.dispose();this.triangle.geometry.dispose();this.scene.clear();}
}
