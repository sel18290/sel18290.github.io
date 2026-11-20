import {pose,clamp} from './path.js';
const canvas=document.querySelector('canvas'),slider=document.querySelector('#travel'),status=document.querySelector('#state'),error=document.querySelector('#error'),life=new AbortController(),signal=life.signal;
let gl,program,buffer,raf,disposed=false;const textures=[],keys=new Set();let current=0,target=0,look=0,lookTarget=0,last=0,drag=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
async function start(){
 gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)throw Error('WebGL indisponible : ouvrir N1 ou N2 depuis la collection.');
 const vs=shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}');
 const fs=shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 uv;uniform sampler2D picture;uniform vec2 frame;uniform vec3 camera;uniform float look,black;
 void main(){vec2 p=vec2(uv.x,1.-uv.y);float aspect=frame.x/frame.y;vec2 size=vec2(min(1.,aspect/(1672./941.)),min(1.,(1672./941.)/aspect));vec2 halfView=size/camera.z*.5;p=(p-.5)*size/camera.z+clamp(camera.xy,halfView+vec2(.006),vec2(1.)-halfView-vec2(.006));
 // Conservative authored depth prior: window is far, lower furniture near.
 // Not a measured depth map or a hidden-surface reconstruction.
 float nearFurniture=smoothstep(.48,.95,p.y);float wall=smoothstep(.72,.9,p.x);float depth=mix(.12,.85,nearFurniture);depth=max(depth,wall*.45);
 p.x+=look*.005*depth;p=clamp(p,vec2(.002),vec2(.998));gl_FragColor=vec4(texture2D(picture,p).rgb*(1.-black),1.);}`);
 program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Programme de reprojection indisponible');gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
 buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 for(const name of ['noctis-bedroom.webp','noctis-study.webp']){const image=new Image();image.src='/noctis-pre-alpha/fusion-native/noctis/assets/'+name;await image.decode();if(disposed)return;const texture=gl.createTexture();textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);}
 const uniforms=Object.fromEntries(['frame','camera','look','black'].map(k=>[k,gl.getUniformLocation(program,k)]));
 function draw(now){if(disposed)return;raf=requestAnimationFrame(draw);const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(document.hidden)return;
 target=clamp(target+((keys.has('KeyW')||keys.has('KeyZ')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0))*dt*.12);
 const lateral=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('KeyQ')||keys.has('ArrowLeft')?1:0);if(lateral)lookTarget=clamp(lookTarget+lateral*dt,-1,1);
 current+=(target-current)*(1-Math.exp(-dt*5));look+=(lookTarget-look)*(1-Math.exp(-dt*7));const p=pose(current);slider.value=current;status.textContent=p.label;
 const ratio=Math.min(devicePixelRatio,1.5,Math.sqrt(1800000/(innerWidth*innerHeight)));const w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
 gl.bindTexture(gl.TEXTURE_2D,textures[p.first?0:1]);gl.uniform2f(uniforms.frame,w,h);gl.uniform3f(uniforms.camera,p.x,.5,p.zoom);gl.uniform1f(uniforms.look,reduced?0:look);gl.uniform1f(uniforms.black,p.transition);gl.drawArrays(gl.TRIANGLES,0,6);
 }raf=requestAnimationFrame(draw);
}
slider.oninput=()=>{target=Number(slider.value);};for(const b of document.querySelectorAll('[data-stop]'))b.onclick=()=>{target=Number(b.dataset.stop);canvas.focus();};
addEventListener('keydown',e=>{if(e.target===slider||e.target.closest('button,a'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyZ','KeyS','KeyQ','KeyA','KeyD'].includes(e.code)){e.preventDefault();keys.add(e.code);}},{signal});addEventListener('keyup',e=>keys.delete(e.code),{signal});addEventListener('blur',()=>keys.clear(),{signal});document.addEventListener('visibilitychange',()=>{keys.clear();last=0;},{signal});
canvas.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,look:lookTarget};canvas.setPointerCapture(e.pointerId);},{signal});canvas.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)lookTarget=clamp(drag.look+(e.clientX-drag.x)/150,-1,1);},{signal});for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{drag=null;},{signal});
function dispose(){if(disposed)return;disposed=true;life.abort();cancelAnimationFrame(raf);keys.clear();for(const t of textures)gl.deleteTexture(t);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);}
addEventListener('pagehide',dispose,{once:true});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();dispose();error.hidden=false;error.textContent='Affichage interrompu. Rechargez la scène.';});start().catch(e=>{dispose();error.hidden=false;error.textContent=e.message;});
