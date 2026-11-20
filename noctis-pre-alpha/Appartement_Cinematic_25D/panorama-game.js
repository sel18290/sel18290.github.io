import * as T from '../vendor/three.module.js';
import {view} from './cube-math.js';
import {gameplayObjects,directionAt,gamePhase} from './gameplay-plan.js';
import {objectAt} from './object-zones.js';
import {GameSession} from '../fusion-native/runtime/session.js';

export async function installPanoramaGame({direct=false,story=false}={}){
 document.body.classList.toggle('panorama-direct',direct);
 const canvas=document.querySelector('#game-panorama'),life=new AbortController(),signal=life.signal;
 let renderer,cube,raf,disposed=false,dirty=true,last=0,yaw=-Math.PI/2,pitch=0,fov=75,drag=null,previousClasses='',phase=0;
 const keys=new Set(),camera=new T.PerspectiveCamera(75,1,.1,100),scene=new T.Scene();camera.rotation.order='YXZ';
 // Authored spherical mask for the primary screen: its in-game sleep state
 // follows the existing controller, without repainting the source panorama.
 const vertices=[],indices=[],corners=[[.383,.465],[.554,.465],[.576,.647],[.376,.647]],segments=16;
 for(let y=0;y<=segments;y++)for(let x=0;x<=segments;x++){
  const u=x/segments,v=y/segments,top=corners[0].map((n,i)=>n+(corners[1][i]-n)*u),bottom=corners[3].map((n,i)=>n+(corners[2][i]-n)*u);
  vertices.push(...directionAt(top[0]+(bottom[0]-top[0])*v,top[1]+(bottom[1]-top[1])*v).map(n=>n*9.8));
  if(x<segments&&y<segments){const a=y*(segments+1)+x;indices.push(a,a+1,a+segments+1,a+1,a+segments+2,a+segments+1);}
 }
 const screenGeometry=new T.BufferGeometry();screenGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));screenGeometry.setIndex(indices);
 const screenMaterial=new T.MeshBasicMaterial({color:0x071923,opacity:.9,transparent:true,side:T.DoubleSide,depthWrite:false}),screenMask=new T.Mesh(screenGeometry,screenMaterial);screenMask.visible=false;scene.add(screenMask);
 const dock=document.createElement('details');dock.id='panorama-actions';const summary=document.createElement('summary');summary.textContent='Objets et actions';const list=document.createElement('nav'),caption=document.createElement('p');dock.append(summary,caption,list);document.body.append(dock);
 const controls=document.createElement('div');controls.id='panorama-tools';const home=document.createElement('a');home.href='/creations/';home.textContent='Toutes mes créations';const reset=document.createElement('button');reset.textContent='Recentrer';reset.onclick=()=>{yaw=-Math.PI/2;pitch=0;fov=75;dirty=true;};const visit=document.createElement('a');visit.href='/noctis-pre-alpha/Appartement_Cinematic_25D/?scene=bureau&mode=visite';visit.textContent='Visite sans énigmes';controls.append(home,reset,visit);document.body.append(controls);
 const status=document.createElement('p');status.id='panorama-game-status';status.setAttribute('role','status');status.textContent='Chargement du panorama de jeu…';document.body.append(status);
 dock.hidden=true;controls.hidden=true;
 // The catalogue supplies its own journey host. Standalone visits need the
 // same save mirror and real outgoing transition, without awarding on entry.
 if(!story&&parent===window){
  let session;try{session=new GameSession(localStorage);}catch{}
  addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==window)return;const m=event.data;
   if(m?.type==='fusion:save'&&typeof m.key==='string')session?.record(m.key,m.value);
   if(m?.type==='fusion:passage'||m?.type==='fusion:resume'){
    if(m.type==='fusion:passage')session?.complete('secret-passage');
    location.assign('/creations/explorer.html?id=n03-est-aventure');
   }
  },{signal});
 }
 const anchors=gameplayObjects.map(item=>{
  const button=document.querySelector(item.selector||(item.phase===1?'[data-object="'+item.key+'"]':'[data-n2="'+item.key+'"]'));if(!button)throw Error('Interaction historique manquante : '+item.key);
  button.classList.add('panorama-hotspot');const tag=document.createElement('b');tag.className='panorama-tag';tag.textContent=item.label;button.append(tag);
  const proxy=document.createElement('button');proxy.textContent=direct?item.label.replace(' · inventaire',''):item.label;proxy.dataset.gameKey=item.phase+':'+item.key;
  proxy.onclick=()=>{if(gamePhase(document.body.classList)!==item.phase||button.hidden||modal()||!active())return;button.click();};list.append(proxy);
  const point=item.uv?new T.Vector3(...directionAt(...item.uv)).multiplyScalar(10):null;
  return {...item,button,proxy,point};
 });
 function active(){return !document.hidden&&!document.body.classList.contains('audio-gated')&&!document.body.classList.contains('waking')&&!document.body.classList.contains('room-three')&&!document.body.classList.contains('room-transition')&&(document.body.classList.contains('exploring')||document.body.classList.contains('room-two'));}
 function modal(){return [...document.querySelectorAll('dialog[open],[role="dialog"]')].some(el=>el.getClientRects().length>0)||!document.querySelector('#dialogue').hidden;}
 function resize(){if(!renderer)return;const ratio=Math.min(devicePixelRatio,1.5,Math.sqrt(2000000/(innerWidth*innerHeight)));renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();dirty=true;}
 function dispose(){if(disposed)return;disposed=true;life.abort();cancelAnimationFrame(raf);keys.clear();screenGeometry.dispose();screenMaterial.dispose();cube?.dispose();renderer?.dispose();}
 addEventListener('pagehide',dispose,{once:true});
 try{
  renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});renderer.outputColorSpace=T.SRGBColorSpace;resize();
  const texture=await new T.TextureLoader().loadAsync('/noctis-pre-alpha/Appartement_Cinematic_25D/assets/bureau-360.png');if(disposed){texture.dispose();return;}
  texture.colorSpace=T.SRGBColorSpace;cube=new T.WebGLCubeRenderTarget(1024);cube.fromEquirectangularTexture(renderer,texture);texture.dispose();scene.background=cube.texture;status.textContent=direct?'Glisse pour regarder · touche un objet pour l’examiner':'Glisser pour regarder · flèches / QD : tourner · molette : zoomer · objets : cliquer ou ouvrir le menu';
  const projected=new T.Vector3();
  function loop(now){if(disposed)return;raf=requestAnimationFrame(loop);const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(document.hidden)return;
   const enabled=active(),blocked=modal();if(blocked||!enabled){keys.clear();drag=null;hoverLabel.hidden=true;}
   const dx=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyQ')||keys.has('KeyA')?1:0),dy=(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0);
   if(dx||dy){yaw-=dx*dt;pitch+=dy*dt*.8;dirty=true;}
   if(previousClasses!==document.body.className){previousClasses=document.body.className;dirty=true;}
   dock.hidden=!enabled||blocked;controls.hidden=document.body.classList.contains('audio-gated')||document.body.classList.contains('room-three');status.hidden=!enabled||blocked;
   const next=gamePhase(document.body.classList);if(next!==phase){phase=next;caption.textContent=phase===1?'Chapitre N1 · journal et durée du sommeil':'Chapitre N2 · indices et protocole nocturne';for(const a of anchors)a.proxy.hidden=a.phase!==phase;dirty=true;}
   if(dirty){const v=view(yaw,pitch,fov);({yaw,pitch,fov}=v);camera.rotation.set(pitch,yaw,0);camera.fov=fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    for(const a of anchors){a.proxy.hidden=a.phase!==phase||a.button.hidden;let visible=false;if(!direct&&a.point&&!a.button.hidden&&enabled&&a.phase===phase&&!blocked){projected.copy(a.point).project(camera);visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.96&&Math.abs(projected.y)<.83;
      if(visible){a.button.style.left=(projected.x*.5+.5)*innerWidth+'px';a.button.style.top=(-projected.y*.5+.5)*innerHeight+'px';}}
     a.button.style.setProperty('display',visible?'block':'none','important');
     const seen=a.button.dataset.examined==='true'||a.button.title?.includes('déjà');a.proxy.dataset.examined=String(seen);
    }
    screenMask.visible=phase===2&&document.body.classList.contains('night-screens-rest');
    if(!document.body.classList.contains('room-three'))renderer.render(scene,camera);dirty=false;
   }
   // Native dialog state can change without a body-class change.
   if(blocked!==loop.blocked){loop.blocked=blocked;dirty=true;}
  }raf=requestAnimationFrame(loop);
 }catch(error){dispose();status.hidden=false;status.textContent='Panorama indisponible : '+error.message+' · Les scènes originales restent accessibles dans le catalogue.';}
 const ray=new T.Vector3();
 const objectUnderPointer=event=>{
  const bounds=canvas.getBoundingClientRect();
  ray.set(2*(event.clientX-bounds.left)/bounds.width-1,1-2*(event.clientY-bounds.top)/bounds.height,0)
   .unproject(camera).normalize();
  const u=.5+Math.atan2(ray.z,ray.x)/(2*Math.PI);
  const v=.5-Math.asin(Math.max(-1,Math.min(1,ray.y)))/Math.PI;
  const chapter=gamePhase(document.body.classList);
  const available=anchors.filter(a=>a.phase===chapter&&!a.button.hidden&&!a.button.closest('[inert]'));
  const key=objectAt(chapter,u,v,id=>available.some(a=>a.key===id));
  return available.find(a=>a.key===key);
 };
 const hoverLabel=document.createElement('span');
 hoverLabel.id='panorama-hover-label';
 hoverLabel.hidden=true;
 if(direct)document.body.append(hoverLabel);
 canvas.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||!active()||modal())return;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,pitch,moved:false};
  hoverLabel.hidden=true;
  canvas.setPointerCapture(event.pointerId);
  canvas.focus();
 },{signal});
 canvas.addEventListener('pointermove',event=>{
  if(drag?.id===event.pointerId){
   const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
   if(!drag.moved&&Math.hypot(dx,dy)<7)return;
   drag.moved=true;yaw=drag.yaw+dx*.006;pitch=drag.pitch+dy*.004;dirty=true;
   return;
  }
  const hit=direct&&active()&&!modal()?objectUnderPointer(event):null;
  canvas.style.cursor=hit?'pointer':'grab';
  hoverLabel.hidden=!hit;
  if(hit){
   hoverLabel.textContent=hit.label.replace(' · inventaire','');
   hoverLabel.style.left=Math.min(event.clientX+12,innerWidth-180)+'px';
   hoverLabel.style.top=Math.max(event.clientY-34,4)+'px';
  }
 },{signal});
 canvas.addEventListener('pointerup',event=>{
  if(drag?.id!==event.pointerId)return;
  const tapped=!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7;
  drag=null;
  if(direct&&tapped&&active()&&!modal())objectUnderPointer(event)?.button.click();
 },{signal});
 for(const type of ['pointercancel','lostpointercapture','pointerleave']){
  canvas.addEventListener(type,()=>{drag=null;hoverLabel.hidden=true;},{signal});
 }
 canvas.addEventListener('wheel',e=>{if(!active()||modal())return;e.preventDefault();fov+=e.deltaY*.025;dirty=true;},{passive:false,signal});
 addEventListener('keydown',e=>{if(!active()||modal()||e.target.closest('button,a,input,select,textarea,summary'))return;if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','KeyD','KeyQ','KeyA'].includes(e.code)){e.preventDefault();keys.add(e.code);}},{signal});addEventListener('keyup',e=>keys.delete(e.code),{signal});addEventListener('blur',()=>{keys.clear();drag=null;},{signal});addEventListener('resize',resize,{signal});document.addEventListener('visibilitychange',()=>{keys.clear();drag=null;last=0;dirty=true;},{signal});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();dispose();status.hidden=false;status.textContent='Affichage interrompu. Rechargez la page.';},{signal});
}
