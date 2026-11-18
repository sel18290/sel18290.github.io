/* CORTEX / NOCTIS — Ciel vivant V2
 * Vraies étoiles animées, scintillement et météores rares ; profondeur douce.
 * Canevas transparent, aucune interaction interceptée.
 * 30 IPS maximum sur ordinateur, 20 sur mobile, arrêt en onglet masqué,
 * animation désactivée si prefers-reduced-motion ou économie de données.
 */
(()=>{
 'use strict';
 if(!document.body.classList.contains('cortex-noctis'))return;
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const saveData=!!navigator.connection?.saveData;
 if(reduce.matches||saveData)return;
 const lowPower=window.matchMedia('(max-width: 760px)').matches;
 const fps=lowPower?20:30;
 const frameMs=1000/fps;
 let last=0,raf=0,layers=[],resizeQueued=false,heroObserver=null;
 const colors=[[198,225,255],[172,196,255],[234,244,255],[132,211,251],[212,198,255]];
 const rand=(a,b)=>a+Math.random()*(b-a);
 function makeCanvas(parent,local){
  const canvas=document.createElement('canvas');
  canvas.className=local?'cortex-sky-canvas cortex-sky-canvas-local':'cortex-sky-canvas';
  canvas.setAttribute('aria-hidden','true');
  canvas.setAttribute('role','presentation');
  parent.append(canvas);
  const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
  if(!ctx){canvas.remove();return null}
  return {canvas,ctx,parent,local,stars:[],meteors:[],w:1,h:1,scale:1};
 }
 function star(w,h,randomPosition=true){
  const depth=Math.random(),radius=depth>.86?rand(1.5,2.4):depth>.46?rand(.8,1.45):rand(.5,.95);
  return {
   x:rand(0,w),y:randomPosition?rand(0,h):h+8,
   vx:rand(.025,.14)*(1+depth*2.6),
   vy:rand(-.33,-.08)*(1+depth*1.6),
   r:radius,depth,base:rand(.35,.78),phase:rand(0,6.283),
   twinkle:rand(.8,2.1),color:colors[Math.floor(rand(0,colors.length))]
  }
 }
 function resize(layer){
  const rect=layer.local?layer.parent.getBoundingClientRect():{width:innerWidth,height:innerHeight};
  const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
  if(Math.abs(w-layer.w)<2&&Math.abs(h-layer.h)<2&&layer.stars.length)return;
  layer.w=w;layer.h=h;layer.scale=Math.min(devicePixelRatio||1,lowPower?1.1:1.6);
  layer.canvas.width=Math.round(w*layer.scale);
  layer.canvas.height=Math.round(h*layer.scale);
  layer.canvas.style.width=w+'px';
  layer.canvas.style.height=h+'px';
  layer.ctx.setTransform(layer.scale,0,0,layer.scale,0,0);
  const density=layer.local?8500:lowPower?15000:11500;
  const max=layer.local?95:lowPower?65:175;
  const count=Math.min(max,Math.max(layer.local?24:lowPower?35:85,Math.round(w*h/density)));
  layer.stars=Array.from({length:count},()=>star(w,h));
  layer.meteors=[];
 }
 function paint(layer,now,dt){
  const {ctx,w,h}=layer;
  ctx.clearRect(0,0,w,h);
  const time=now/1000;
  // Douce lueur de nébuleuse : visible sur les marges mais très légère.
  if(layer.local){
   const glow=ctx.createRadialGradient(w*.75,h*.28,4,w*.75,h*.28,Math.max(160,w*.55));
   glow.addColorStop(0,'rgba(113,124,241,.085)');
   glow.addColorStop(1,'rgba(113,124,241,0)');
   ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  }
  for(const s of layer.stars){
   s.x+=s.vx*dt;s.y+=s.vy*dt;
   if(s.x>w+12)s.x=-12;
   if(s.y< -12){s.y=h+8;s.x=rand(0,w)}
   const blink=.72+.28*Math.sin(time*s.twinkle+s.phase);
   const alpha=Math.max(.26,Math.min(.98,s.base*blink*1.45));
   const c=s.color;
   // Certaines étoiles ont une queue courte, suggérant la perspective.
   if(s.depth>.82){
    ctx.strokeStyle='rgba('+c.join(',')+','+(alpha*.23)+')';
    ctx.lineWidth=Math.max(.7,s.r*.6);
    ctx.beginPath();ctx.moveTo(s.x-s.r*3,s.y+s.r*3);
    ctx.lineTo(s.x,s.y);ctx.stroke();
   }
   if(s.r>1.5){
    const halo=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*4.1);
    halo.addColorStop(0,'rgba('+c.join(',')+','+(alpha*.23)+')');
    halo.addColorStop(1,'rgba('+c.join(',')+',0)');
    ctx.fillStyle=halo;
    ctx.beginPath();ctx.arc(s.x,s.y,s.r*4.1,0,6.283);ctx.fill();
   }
   ctx.fillStyle='rgba('+c.join(',')+','+alpha+')';
   ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.283);ctx.fill();
  }
  if(!lowPower){
   // Un météore calme et bref au maximum, toutes les 8 à 16 secondes.
   if(!layer.nextMeteor)layer.nextMeteor=now+rand(5000,10000);
   if(now>=layer.nextMeteor){
    layer.nextMeteor=now+rand(8500,15500);
    layer.meteors=[{x:rand(w*.25,w*.92),y:rand(h*.12,h*.62),
      vx:rand(-.75,-.4),vy:rand(.22,.48),life:0,maxLife:rand(85,130),
      len:rand(35,68)}];
   }
   for(const m of layer.meteors){
    m.x+=m.vx*dt;m.y+=m.vy*dt;m.life+=dt;
    const a=Math.sin(Math.PI*Math.min(1,m.life/m.maxLife))*.43;
    const tail=ctx.createLinearGradient(m.x-m.vx*m.len,m.y-m.vy*m.len,m.x,m.y);
    tail.addColorStop(0,'rgba(147,200,255,0)');
    tail.addColorStop(1,'rgba(212,229,255,'+a+')');
    ctx.strokeStyle=tail;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(m.x-m.vx*m.len,m.y-m.vy*m.len);ctx.lineTo(m.x,m.y);ctx.stroke();
   }
   layer.meteors=layer.meteors.filter(m=>m.life<m.maxLife);
  }
 }
 function attachHero(){
  const hero=document.querySelector('.home-hero');
  const local=layers.find(l=>l.local);
  if(local&&local.parent===hero&&local.canvas.isConnected)return;
  if(local){local.canvas.remove();layers=layers.filter(l=>l!==local)}
  if(hero){
   const layer=makeCanvas(hero,true);
   if(layer){layers.push(layer);resize(layer)}
  }
 }
 function loop(now){
  if(document.visibilityState==='hidden'){raf=0;return}
  if(now-last>=frameMs){
   const dt=Math.min(2.3,Math.max(.2,(now-last)/frameMs));
   last=now;
   for(const l of layers){
    if(l.local&&!l.parent.isConnected)continue;
    paint(l,now,dt);
   }
  }
  raf=requestAnimationFrame(loop);
 }
 function start(){if(!raf&&!reduce.matches&&!saveData){last=performance.now();raf=requestAnimationFrame(loop)}}
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
 function onResize(){
  if(resizeQueued)return;
  resizeQueued=true;
  requestAnimationFrame(()=>{resizeQueued=false;for(const layer of layers)resize(layer)});
 }
 const global=makeCanvas(document.body,false);
 if(!global)return;
 layers.push(global);resize(global);attachHero();start();
 // La démo remplace le contenu de #app à chaque changement de section.
 const root=document.getElementById('app');
 if(root&&typeof MutationObserver==='function'){
  heroObserver=new MutationObserver(()=>attachHero());
  heroObserver.observe(root,{childList:true,subtree:false});
 }
 window.addEventListener('resize',onResize,{passive:true});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden')stop();
  else {attachHero();start()}
 });
 reduce.addEventListener?.('change',e=>{
  if(e.matches){stop();for(const l of layers)l.canvas.style.display='none'}
  else{for(const l of layers)l.canvas.style.display='';start()}
 });
 window.addEventListener('pagehide',stop);
 window.addEventListener('pageshow',start);
})();
