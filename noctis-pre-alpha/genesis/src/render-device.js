// One policy for Chrome desktop, Android (including desktop-site mode), and iOS.
// No GPU vendor-specific path; a touch-capable desktop with hover stays desktop.
export function isMobileRenderer({coarse=false,hover=true,touchPoints=0,uaMobile=false,width=1920,height=1080}={}){
  return coarse||uaMobile||(!hover&&touchPoints>0&&Math.min(width,height)<1000);
}
