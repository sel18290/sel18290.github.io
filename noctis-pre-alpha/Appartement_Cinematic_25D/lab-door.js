import * as T from '../vendor/three.module.js';
import {plating} from './lab-walls.js?v=5';
import {portal} from './lab-layout.js?v=2';

export function mountLabDoor(scene,finish){
 const {wall,gasket,ceramic}=finish;
 const jamb=new T.Group();
 jamb.rotation.y=Math.PI/2;
 scene.add(jamb);

 function mesh(parent,geometry,material,x,y,z){
  const part=new T.Mesh(geometry,material);
  part.position.set(x,y,z);parent.add(part);return part;
 }
 const leafGeometry=plating(2.76,7.22,.49,.20);
 const gripGeometry=plating(2.20,.49,.15,.10);
 const gripLight=new T.BoxGeometry(.54,.047,.024);
 const cyan=new T.MeshBasicMaterial({color:0x71e2f6});
 const green=new T.Color(0x81ffe1),locked=new T.Color(0x50d4ff);
 const leaves=[-1,1].map(side=>{
  const leaf=new T.Group();
  jamb.add(leaf);
  mesh(leaf,leafGeometry,wall,0,portal.centerY-.06,15.43);
  mesh(leaf,gripGeometry,gasket,0,.24,15.30);
  mesh(leaf,gripLight,cyan,0,.24,15.23);
  return {leaf,side};
 });
 mesh(jamb,plating(7.41,8.54,1.03,.24,[6.1,7.42,.87]),ceramic,0,portal.centerY,16.38);
 // Each side of the opening gets its own reachable panel.
 const terminalCase=new T.BoxGeometry(.61,1.11,.23);
 const terminalInset=plating(.46,.59,.07,.05);
 for(const [x,z] of [[3.23,14.85],[-3.23,16.70]]){
  mesh(jamb,terminalCase,gasket,x,.06,z);
  mesh(jamb,terminalInset,cyan,x,.09,z-.146);
  mesh(jamb,terminalInset,cyan,x,.09,z+.10);
 }
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
 const context=canvas.getContext('2d');
 const labelTexture=new T.CanvasTexture(canvas);
 labelTexture.colorSpace=T.SRGBColorSpace;
 const labelMaterial=new T.MeshBasicMaterial({map:labelTexture});
 const label=mesh(jamb,new T.PlaneGeometry(2.50,.46),labelMaterial,0,4.04,14.92);
 label.rotation.y=Math.PI;
 const returnLabel=mesh(jamb,new T.PlaneGeometry(2.50,.46),labelMaterial,0,4.04,16.66);
 returnLabel.position.y=Math.min(returnLabel.position.y,portal.ceiling-.36);
 const amber=new T.Color(0xffb461);
 let progress=0,requested=false,changed=false;
 function destination(hangar){
  changed=hangar;
  context.fillStyle='#252e33';context.fillRect(0,0,512,96);
  context.fillStyle=hangar?'#ffb461':'#7de0f2';
  context.fillRect(18,20,5,56);
  context.font='600 48px sans-serif';context.textBaseline='middle';context.fillStyle='#eafbff';
  context.fillText(hangar?'HANGAR':'COURSIVE',51,51);
  labelTexture.needsUpdate=true;
 }
 destination(false);

 function tick(dt){
  progress=T.MathUtils.clamp(progress+(requested?dt:-dt)/1.5,0,1);
  const opening=T.MathUtils.smoothstep(progress,0,1);
  for(const {leaf,side} of leaves)leaf.position.x=side*(1.392+2.94*opening);
  cyan.color.copy(changed?amber:locked).lerp(green,opening);
  return opening;
 }
 tick(0);
 return {
  tick,
  canOpen(position){return !requested&&progress===0&&Math.abs(position.x-portal.wall)<5.6&&Math.abs(position.z)<5.25&&position.y<2.95;},
  open(){requested=true;},
  close(){requested=false;},
  destination,
  reset(){requested=false;progress=0;destination(false);tick(0);},
  dispose(){labelTexture.dispose();}
 };
}
