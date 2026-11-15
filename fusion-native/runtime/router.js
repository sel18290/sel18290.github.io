import {bindJourney} from '../../genesis/src/journey.js';
import {GameSession,scenes} from './session.js';
const session=new GameSession(localStorage),frame=document.querySelector('iframe'),loading=document.querySelector('#loading'),progress=document.querySelector('progress');
let target;
async function route(id){
 const def=scenes.find(s=>s.id===id);if(!def)throw Error('Scène inconnue');
 if(id==='east'&&!session.state.completed.includes('secret-passage'))return;
 target=id;
 document.querySelector('#next-n05').hidden=id!=='n04';
 document.querySelector('#return-n04').hidden=id!=='n05';
 document.querySelector('#return-n03').hidden=id!=='n04';
 document.querySelector('#back').hidden=id!=='n04';
 document.querySelector('#back').textContent=id==='n04'?'Revenir à N03':'Retour à N02';
 loading.hidden=false;document.querySelector('#error').textContent='';document.querySelector('#retry').hidden=true;progress.value=0;
 try{
  if(id==='east'){
   const props=await import('../east/props.js');const names=[...new Set(props.props.map(p=>p.asset))];
   for(let i=0;i<names.length;i++){
    const response=await fetch(new URL('../../../v15-est/assets/'+names[i]+'.glb',import.meta.url));
    if(!response.ok)throw Error('Ressource 3D indisponible : '+names[i]);await response.arrayBuffer();
    progress.value=(i+1)/names.length;document.querySelector('#detail').textContent='Ressources vérifiées : '+(i+1)+' / '+names.length;
   }
  }
  frame.src=def.url;
 }catch(e){document.querySelector('#error').textContent=e.message;document.querySelector('#retry').hidden=false;document.querySelector('#back').hidden=false}
}
frame.addEventListener('load',()=>{if(target!=='n04')loading.hidden=true;session.checkpoint(target)});
document.querySelector('#next-n05').onclick=()=>route('n05');
document.querySelector('#return-n04').onclick=()=>route('n04');
document.querySelector('#return-n03').onclick=()=>route('east');
document.querySelector('#retry').onclick=()=>route(target);
document.querySelector('#back').onclick=()=>route(target==='n04'?'east':'noctis');
const lifetime=new AbortController();
bindJourney({frame,active:()=>target,session,route,signal:lifetime.signal,
 ready:()=>{loading.hidden=true;document.querySelector('#back').hidden=false;},
 fail:message=>{document.querySelector('#error').textContent=message;document.querySelector('#retry').hidden=false;}
});
window.addEventListener('pagehide',event=>{if(!event.persisted)lifetime.abort()});

route('noctis');
