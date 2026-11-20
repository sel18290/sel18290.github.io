// Slow, bounded disturbances; no strobe, no catastrophe. The same clock drives audio and light.
export function anomalyState(time){const cycle=Math.floor(time/23),phase=time%23;const active=phase>=12&&phase<14.8;const envelope=active?Math.sin((phase-12)/2.8*Math.PI):0;return{cycle,active,envelope,light:1-envelope*.82};}
export function graphicsPolicy({mobile=false,eco=false,dpr=1}={}){return{pixelRatio:eco?Math.min(dpr,.8):Math.min(dpr,mobile?1:1.5),shadows:!eco,shadowSize:mobile?1024:2048,envSize:mobile?128:256};}
