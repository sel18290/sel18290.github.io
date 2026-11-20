// Optional, bounded local machinery ambience. One context, no external audio.
export function createSpatialAudio(){
  let ctx,master;const voices=[];
  return {
    async enable(value){
      if(!value){if(ctx)await ctx.suspend();return;}
      if(!ctx){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;
        ctx=new C();master=ctx.createGain();master.gain.value=.12;master.connect(ctx.destination);
        for(const [x,z,hz] of [[-20,-1,92],[20,0,57],[4,34,138]]){
          const oscillator=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
          oscillator.type='sine';oscillator.frequency.value=hz;gain.gain.value=0;
          oscillator.connect(gain).connect(pan).connect(master);oscillator.start();voices.push({x,z,gain,pan,oscillator});
        }
      }await ctx.resume();
    },
    update(p,yaw,paused){if(!ctx)return;for(const v of voices){const dx=v.x-p.x,dz=v.z-p.z,d=Math.hypot(dx,dz);
      v.gain.gain.setTargetAtTime(paused?0:.16*Math.max(0,1-d/12)**2,ctx.currentTime,.15);
      v.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/Math.max(1,d))),ctx.currentTime,.15);
    }},
    dispose(){for(const v of voices){v.oscillator.stop();v.oscillator.disconnect();v.gain.disconnect();v.pan.disconnect();}master?.disconnect();ctx?.close();voices.length=0;ctx=null;}
  };
}
