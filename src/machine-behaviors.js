// Mechanical travel remains calibrated by each model; a room can tune timing and cues.
export const cues = Object.freeze({
  diagnostic: {frequency:210,end:315,type:'sine'},
  calibration: {frequency:360,end:270,type:'triangle'},
  relay: {frequency:132,end:176,type:'sine'}
});
export const mechanisms = Object.freeze(['rotate','slide','swing','pulse','piston','opening','sensor','energy','diagnostic','proximity','standby','fault']);
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const v=clamp(n);return v*v*(3-2*v);};
export function bindMechanism(node,station){
  const d=node.userData.drive;
  if(!['rotate','slide','swing','pulse'].includes(d.type)||!mechanisms.includes(d.behavior??d.type)||!['x','y','z'].includes(d.axis)||![d.amplitude,d.speed].every(Number.isFinite))throw Error('Articulation incompatible '+node.name);
  const channel=d.type==='slide'?node.position:d.type==='pulse'?node.material:node.rotation;
  const key=d.type==='pulse'?'emissiveIntensity':d.axis;
  if(!Number.isFinite(channel[key]))throw Error('Canal absent '+node.name);
  return {station,d,channel,key,rest:channel[key]};
}
export function tickDrive(binding,time,distance,reduced){
  const {station:o,d,channel,key,rest}=binding;
  const t=time*(o.rate??1)*d.speed+o.phase;
  const wave=(1+Math.sin(t))*.5,near=smooth(1-distance/(o.radius??4));
  const since=o.active?Math.max(0,time-(o.activatedAt??time)):0;
  const up=o.active?smooth(since/.8):0;
  const mode=d.behavior??d.type;
  let value;
  switch(mode){
    case 'rotate':value=reduced?0:t%(2*Math.PI);break;
    case 'swing':value=reduced?0:Math.sin(t);break;
    case 'slide':case 'piston':value=reduced?0:wave;break;
    case 'pulse':value=(reduced?0:Math.sin(t))+(o.active?.45:0);break;
    case 'sensor':case 'proximity':value=near;break;
    case 'energy':value=reduced?.4:.25+.75*wave;break;
    case 'diagnostic':value=o.active?(reduced?.5:smooth((since%3)/2.8)):0;break;
    case 'opening':value=reduced?Number(o.active):up;break;
    case 'standby':value=o.active?1:.16;break;
    case 'fault':{const window=(t%41+41)%41;value=reduced?0:window<2?Math.sin(Math.PI*window/2):0;break;}
  }
  channel[key]=rest+d.amplitude*value;
}
