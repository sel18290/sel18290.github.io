export const CENTRAL_ALERT_KEY='noctis.n06.central-alert.v1';

// Actual XYZ positions, independent of keyboard, camera and rendering cadence.
export function idleAnnouncement({onTrigger,storage,delay=10000,tolerance=.002,maxGap=1000}={}){
 let fired=false,previous=null,anchor=null,elapsed=0,disposed=false;
 try{fired=storage?.getItem(CENTRAL_ALERT_KEY)==='1';}catch{}
 const reset=()=>{previous=null;anchor=null;elapsed=0;};
 return {
  get fired(){return fired;},get elapsed(){return elapsed;},reset,
  sample(now,position,{level,active=true}={}){
   if(disposed||fired)return;
   if(level!=='n06-etendue'||!active||!Number.isFinite(now)||![position?.x,position?.y,position?.z].every(Number.isFinite)){reset();return;}
   const p=[position.x,position.y,position.z];
   const distance=anchor?Math.hypot(...p.map((v,i)=>v-anchor[i])):Infinity;
   if(previous===null||now<previous||now-previous>maxGap||distance>tolerance){anchor=p;elapsed=0;previous=now;return;}
   elapsed+=now-previous;previous=now;
   if(elapsed>=delay){
    // Latch BEFORE invoking playback: errors or repeated frames cannot requeue it.
    fired=true;try{storage?.setItem(CENTRAL_ALERT_KEY,'1');}catch{}
    onTrigger?.();
   }
  },
  dispose(){disposed=true;reset();}
 };
}
