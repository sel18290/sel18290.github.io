import {gardenContains} from './garden-plan.js';

// Additive southern galleries, between the existing dome ribs and clear of beds.
export const hubRoutes=Object.freeze([
 {id:'n01',number:'01',label:'Quartiers personnels',color:0x73dce8,angle:-Math.PI*5/24},
 {id:'n02',number:'02',label:'Chambre des écrans',color:0xf1bf7b,angle:Math.PI/12},
 {id:'n03',number:'03',label:'Réseau Est · Laboratoire',color:0xbaacf0,angle:Math.PI*5/24}
].map(route=>Object.freeze({...route,start:17.2,end:32,halfWidth:1.85,gateZ:30.45})));
export const hubRoute=id=>hubRoutes.find(route=>route.id===id);
export function hubWorldPoint(route,x,y,z){const s=Math.sin(route.angle),c=Math.cos(route.angle);return [x*c+z*s,y,-x*s+z*c];}
export function hubLocalPoint(route,x,z){const s=Math.sin(route.angle),c=Math.cos(route.angle);return [x*c-z*s,x*s+z*c];}
export function hubGalleryAt(x,z){return hubRoutes.find(route=>{const [side,along]=hubLocalPoint(route,x,z);return Math.abs(side)<=route.halfWidth-.3&&along>=route.start-.3&&along<=route.end-.5;});}
export const hubContains=(x,z)=>gardenContains(x,z)||!!hubGalleryAt(x,z);
export function hubFloorHeight(x,z){const route=hubGalleryAt(x,z);if(!route)return 0;const [,along]=hubLocalPoint(route,x,z);return .004+.116*Math.max(0,Math.min(1,along-route.start));}
export const hubGatePosition=route=>hubWorldPoint(route,1.12,0,route.gateZ);
export function hubArrival(id){const route=hubRoute(id);if(!route)return null;const p=hubWorldPoint(route,0,0,route.gateZ-1.5);p[1]=1.65+hubFloorHeight(p[0],p[2]);return {position:p,yaw:route.angle};}
function carrySettings(params,url){
 for(const [key,allowed] of [['quality',['light','balanced','detail']],['adaptive',['0','1']],['diagnostics',['0','1']],['upscale',['spatial']]])if(allowed.includes(params.get(key)))url.set(key,params.get(key));
 return url;
}
export function hubVisitUrl(id,params=new URLSearchParams()){
 if(!hubRoute(id))throw Error('Destination inconnue');return '/genesis/hub-visit.html?'+carrySettings(params,new URLSearchParams({room:id}));
}
export function hubReturnUrl(id,params=new URLSearchParams()){
 if(!hubRoute(id))throw Error('Destination inconnue');return '/genesis/?'+carrySettings(params,new URLSearchParams({scene:'n06',arrival:id}));
}
