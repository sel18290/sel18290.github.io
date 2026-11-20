// Ignore loading/resume stalls, then use sustained frame windows and hysteresis.
// Resolution changes only; scene content and CSS/UI resolution stay untouched.
export function createFrameBudget({enabled=false,minScale=.72}={}){
  let scale=1,elapsed=0,frames=0,warmup=1800,good=0;
  return {
    get scale(){return scale;},
    reset(){elapsed=frames=good=0;warmup=1800;},
    sample(ms,active=true,timing={}){
      if(!enabled||!active||!Number.isFinite(ms)||ms<=0||ms>120){this.reset();return false;}
      if(warmup>0){warmup-=ms;return false;}
      elapsed+=ms;frames++;
      if(elapsed<1600)return false;
      const average=elapsed/frames;elapsed=frames=0;const before=scale;
      if(average>19.2){scale=Math.max(minScale,scale-.06);good=0;}
      // 16.7 ms on a 60 Hz screen proves no GPU headroom. Require measured CPU
      // AND GPU time before increasing quality, or it oscillates indefinitely.
      else if(average<17.3&&Number.isFinite(timing.gpuMs)&&Number.isFinite(timing.cpuMs)&&timing.gpuMs<10&&timing.cpuMs<8){if(++good>=3){scale=Math.min(1,scale+.03);good=0;}}
      else good=0;
      return before!==scale;
    }
  };
}
