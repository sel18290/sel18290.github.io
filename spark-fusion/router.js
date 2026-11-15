const KEY='cortex.sparkFusion.v1';
const frame=document.querySelector('iframe'),loading=document.querySelector('#loading'),status=document.querySelector('#status'),back=document.querySelector('#back');
const session={schema:1,scene:'n03',pose:null};
try{Object.assign(session,JSON.parse(localStorage.getItem(KEY))||{})}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(session))}catch{}};
let target='n03';
function go(scene){
 target=scene;session.scene=scene;save();
 loading.hidden=false;document.querySelector('#error').textContent='';document.querySelector('#retry').hidden=true;
 status.textContent=scene==='n04'?'Chargement du monde Spark':'Chargement du laboratoire N03';
 back.hidden=scene!=='n04';
 frame.src=scene==='n04'?'./n04/?embedded=1':'./n03/';
}
document.querySelector('#retry').onclick=()=>go(target);
back.onclick=()=>go('n03');
frame.addEventListener('load',()=>{if(target==='n03')loading.hidden=true;frame.focus()});
addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
 const m=e.data;
 if(m?.type==='cortex:n04'){session.pose=m.pose;go('n04')}
 if(m?.type==='spark:ready'){loading.hidden=true;frame.focus()}
 if(m?.type==='spark:error'){loading.hidden=false;status.textContent='N04 · rendu indisponible';document.querySelector('#error').textContent=m.message;document.querySelector('#retry').hidden=false}
});
go('n03');
