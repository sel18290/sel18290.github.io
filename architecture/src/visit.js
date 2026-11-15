import {hubRoute,hubReturnUrl} from '../../genesis/src/hub-plan.js';
import {createHubVisit} from '../../genesis/src/hub-visit-session.js';
import {GameSession} from '../../fusion-native/runtime/session.js';
const params=new URLSearchParams(location.search),destination=hubRoute(params.get('room')),frame=document.querySelector('#room'),loading=document.querySelector('#loading'),status=document.querySelector('#status');
const lifetime=new AbortController();let visit,lastPage;
document.querySelector('#return-hub').onclick=()=>{
 lifetime.abort();frame.src='about:blank';location.assign('/architecture/?'+new URLSearchParams({level:'n06-etendue',arrival:destination?.id||'jardin',...(params.has('quality')?{quality:params.get('quality')}:{})}));
};
if(!destination){status.textContent='Destination inconnue. Revenez au hub pour choisir une galerie.';}
else{
 document.documentElement.style.setProperty('--route','#'+destination.color.toString(16));
 document.querySelector('#destination').textContent='N'+destination.number+' · '+destination.label;
 const session=new GameSession(localStorage),retry=document.querySelector('#retry'),back=document.querySelector('#back-room');
 frame.addEventListener('load',()=>{if(visit?.active!=='n04')loading.hidden=true;},{signal:lifetime.signal});
 visit=createHubVisit({destination:destination.id,frame,session,signal:lifetime.signal,
  onRoute:id=>{lastPage=id;loading.hidden=false;status.textContent='Ouverture de la salle…';retry.hidden=true;back.hidden=!['east','n03','n04','n05'].includes(id);back.textContent=id==='n04'?'← N03':id==='n05'?'← N04':'← N02';},
  onReady:()=>{loading.hidden=true;},onFail:message=>{loading.hidden=false;status.textContent=message;retry.hidden=false;}
 });
 retry.onclick=()=>visit.route(lastPage);back.onclick=()=>visit.route(lastPage==='n04'?'east':lastPage==='n05'?'n04':'n02');
}
addEventListener('pagehide',()=>lifetime.abort(),{once:true});
