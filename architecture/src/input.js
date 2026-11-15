export function controls(canvas,pad,signal){
 const keys=new Set();let drag=null,stick=null,x=0,z=0,enabled=false;
 const on=(el,name,fn)=>el.addEventListener(name,fn,{signal});
 const api={yaw:-Math.PI/2,pitch:0,get enabled(){return enabled;},set enabled(value){enabled=value;keys.clear();drag=stick=null;x=z=0;},
  movement(){const down=(...codes)=>Number(codes.some(c=>keys.has(c)));return {right:x+down('KeyD','ArrowRight')-down('KeyA','KeyQ','ArrowLeft'),forward:z+down('KeyW','KeyZ','ArrowUp')-down('KeyS','ArrowDown'),yaw:api.yaw};}
 };
 on(window,'keydown',e=>{if(!enabled||e.target.closest?.('button,a,input,select'))return;keys.add(e.code);if(/^(Key[WAZQSD]|Arrow)/.test(e.code))e.preventDefault();});
 on(window,'keyup',e=>keys.delete(e.code));on(window,'blur',()=>{keys.clear();x=z=0;drag=stick=null;});
 on(document,'visibilitychange',()=>{if(document.hidden){keys.clear();x=z=0;drag=stick=null;}});
 on(canvas,'pointerdown',e=>{if(!enabled)return;drag=[e.pointerId,e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);canvas.focus();});
 on(canvas,'pointermove',e=>{if(drag?.[0]!==e.pointerId||!enabled)return;api.yaw-=(e.clientX-drag[1])*.003;api.pitch=Math.max(-1.4,Math.min(1.4,api.pitch-(e.clientY-drag[2])*.003));drag=[e.pointerId,e.clientX,e.clientY];});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])on(canvas,name,e=>{if(drag?.[0]===e.pointerId)drag=null;});
 const update=e=>{const r=pad.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width/2),dz=(e.clientY-r.top-r.height/2)/(r.height/2),n=Math.max(1,Math.hypot(dx,dz));x=dx/n;z=-dz/n;};
 on(pad,'pointerdown',e=>{if(!enabled)return;stick=e.pointerId;pad.setPointerCapture(stick);update(e);});on(pad,'pointermove',e=>{if(stick===e.pointerId)update(e);});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])on(pad,name,e=>{if(stick===e.pointerId){stick=null;x=z=0;}});
 return api;
}
