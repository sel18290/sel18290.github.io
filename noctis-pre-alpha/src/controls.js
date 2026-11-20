export class FirstPersonInput{
 constructor(canvas,joystick,onPause){this.canvas=canvas;this.keys=new Set();this.yaw=0;this.pitch=0;this.stick={x:0,y:0};this.locked=false;this.enabled=false;this.lookPointer=null;this.stickPointer=null;this.sensitivity=.0023;this.abort=new AbortController();const opts={signal:this.abort.signal};this.onPause=onPause;
 window.addEventListener('keydown',e=>{if(e.code==='Escape'){this.clear();onPause();return;}if(!this.enabled||e.target?.matches?.('input,select,textarea'))return;if(['KeyW','KeyZ','KeyS','KeyA','KeyQ','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}},opts);window.addEventListener('keyup',e=>this.keys.delete(e.code),opts);window.addEventListener('blur',()=>this.clear(),opts);
 document.addEventListener('pointerlockchange',()=>{const previous=this.locked;this.locked=document.pointerLockElement===canvas;if(previous&&!this.locked&&this.enabled){this.clear();onPause();}},opts);
 document.addEventListener('pointerlockerror',()=>{document.querySelector('#inputHint').textContent='Glisser sur la vue pour regarder · ZQSD / WASD pour marcher';},opts);
 document.addEventListener('mousemove',e=>{if(this.enabled&&this.locked)this.rotate(e.movementX,e.movementY);},opts);
 canvas.addEventListener('pointerdown',e=>{if(!this.enabled)return;if(this.locked)return;this.lookPointer=e.pointerId;this.lookLast={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);},opts);
 canvas.addEventListener('pointermove',e=>{if(!this.enabled||this.locked||this.lookPointer!==e.pointerId)return;this.rotate(e.clientX-this.lookLast.x,e.clientY-this.lookLast.y,e.pointerType==='touch'?.004:.003);this.lookLast={x:e.clientX,y:e.clientY};},opts);
 const end=e=>{if(e.pointerId===this.lookPointer)this.lookPointer=null;};canvas.addEventListener('pointerup',end,opts);canvas.addEventListener('pointercancel',end,opts);canvas.addEventListener('lostpointercapture',end,opts);
 const knob=joystick.querySelector('span');const stick=e=>{const r=joystick.getBoundingClientRect(),dx=e.clientX-r.x-r.width/2,dy=e.clientY-r.y-r.height/2,len=Math.hypot(dx,dy),max=40,scale=len>max?max/len:1;this.stick.x=dx*scale/max;this.stick.y=-dy*scale/max;knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;};
 joystick.addEventListener('pointerdown',e=>{if(!this.enabled||this.stickPointer!==null)return;e.preventDefault();this.stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);stick(e);},opts);joystick.addEventListener('pointermove',e=>{if(e.pointerId===this.stickPointer&&this.enabled)stick(e);},opts);
 const release=e=>{if(e.pointerId===this.stickPointer){this.stickPointer=null;this.stick.x=this.stick.y=0;knob.style.transform='translate(0,0)';}};for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,release,opts);this.resetStick=()=>{this.stickPointer=null;this.stick.x=this.stick.y=0;knob.style.transform='translate(0,0)';};
 }
 rotate(dx,dy,scale=this.sensitivity){this.yaw-=dx*scale;this.pitch=Math.max(-1.2,Math.min(1.2,this.pitch-dy*scale));}
 movement(){const has=(...codes)=>codes.some(c=>this.keys.has(c));return{right:(has('KeyD','ArrowRight')?1:0)-(has('KeyA','KeyQ','ArrowLeft')?1:0)+this.stick.x,forward:(has('KeyW','KeyZ','ArrowUp')?1:0)-(has('KeyS','ArrowDown')?1:0)+this.stick.y};}
 async capture(){if(!this.enabled)return;try{await this.canvas.requestPointerLock?.();}catch{document.querySelector('#inputHint').textContent='Glisser sur la vue pour regarder · ZQSD / WASD pour marcher';}}
 clear(){this.keys.clear();this.lookPointer=null;this.resetStick?.();}
 unlock(){if(document.pointerLockElement===this.canvas)document.exitPointerLock();}
 dispose(){this.enabled=false;this.clear();this.unlock();this.abort.abort();}
}
