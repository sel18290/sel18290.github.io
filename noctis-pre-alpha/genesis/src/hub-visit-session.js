import {bindJourney} from './journey.js';

export const hubVisitPages=Object.freeze({
 n01:'/noctis-pre-alpha/fusion-native/noctis/',n02:'/noctis-pre-alpha/fusion-native/noctis/hub-n02.html',n03:'/noctis-pre-alpha/fusion-native/east/',
 noctis:'/noctis-pre-alpha/fusion-native/noctis/',east:'/noctis-pre-alpha/fusion-native/east/',n04:'/spark-fusion/n04/?embedded=1',n05:'/noctis-pre-alpha/genesis/?scene=n05'
});
export function createHubVisit({destination,frame,session,signal,onRoute=()=>{},onReady=()=>{},onFail=()=>{}}){
 if(!['n01','n02','n03'].includes(destination))throw Error('Destination inconnue');
 let current;
 const route=id=>{
  if(!Object.hasOwn(hubVisitPages,id))throw Error('Page de visite inconnue');
  current=id==='n01'||id==='n02'?'noctis':id==='n03'?'east':id;
  onRoute(id);frame.src=hubVisitPages[id];
 };
 bindJourney({frame,active:()=>current,session,route,ready:onReady,fail:onFail,signal});
 route(destination); // navigation alone never calls session.complete or .record
 return {route,get active(){return current;}};
}
