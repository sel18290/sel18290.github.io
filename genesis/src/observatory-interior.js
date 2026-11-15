import {createSurfaceMaterials} from './surface-library.js';
import {pressureShells} from './pressure-shells.js';
import {sectorFinish} from './sector-finish.js';
import {buildSector} from './sector-art.js';
import {buildPanelBatches} from './static-batches.js';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function observatoryInterior(root, maps={},bayReflection,materials,options={}){
  const fallback=createSurfaceMaterials(maps.map?{deck:maps}:{});
  const palette=materials||fallback;
  if(materials)Object.values(fallback).forEach(m=>m.dispose());
  const {steel,graphite,seal,lamp,cyan,deck,paint,ceramic}=palette;
  const bayDeck=deck;if(bayReflection){bayDeck.envMap=bayReflection;bayDeck.envMapIntensity=1.65;bayDeck.roughness=.45;}
  const geometries=new Map(),batches=new Map(),transform=new T.Object3D();
  function panel(size,pos,material,radius=.035,angle=0){
    const key=size.join('/')+'/'+radius;
    if(!geometries.has(key))geometries.set(key,new RoundedBoxGeometry(...size,1,Math.min(radius,...size.map(v=>v/3))));
    const geom=geometries.get(key),cell=Math.floor(pos[0]/8)+'/'+Math.floor(pos[2]/8),id=key+material.uuid+'/sector/'+cell;
    if(!batches.has(id))batches.set(id,{geom,material,cell,matrices:[]});
    transform.position.set(...pos);transform.rotation.set(0,0,angle);transform.updateMatrix();
    batches.get(id).matrices.push(transform.matrix.clone());
  }
  // A sealed underdeck catches light through the narrow expansion joints.
  panel([10.1,.16,12.1],[0,-.13,0],seal);
  for(let x=0;x<5;x++)for(let z=0;z<6;z++){
    const cx=-4+x*2,cz=-5+z*2;
    panel([1.987,.09,1.987],[cx,-.025,cz],bayDeck);
    if(x===0||x===4)for(let k=0;k<9;k++)panel([.44,.014,.04],[cx,.024,cz-.56+k*.14],seal,.006);
  }
  for(const sign of [-1,1]){
    panel([.16,4.9,6],[sign*5.04,2.4,-3],seal);
    panel([.16,4.9,2],[sign*5.04,2.4,5],seal);
    panel([.22,1.55,4],[sign*5,4.08,2],graphite);
    for(let i=0;i<6;i++){
      const z=-5+i*2;
      if(z===1||z===3)continue;
      panel([.11,2.72,1.89],[sign*4.94,2.02,z],paint);
      panel([.12,.58,1.87],[sign*4.92,.34,z],steel);
      panel([.26,.22,1.94],[sign*4.86,3.46,z],steel);
      for(let j=0;j<7;j++)panel([.16,.038,1.2],[sign*4.85,1.36+j*.091,z],seal,.009);
      panel([.17,1.05,.14],[sign*4.81,2.62,z+.73],steel);
      panel([.14,.04,.55],[sign*4.81,2.97,z-.13],cyan,.008);
      panel([.32,1.75,1.87],[sign*4.64,4.06,z],graphite,.08,sign*.36);
      panel([.34,.09,1.25],[sign*4.31,4.48,z],lamp);
    }
  }
  for(let z=0;z<6;z++)panel([9.95,.19,1.985],[0,4.76,-5+z*2],graphite);
  for(const i of [0,1,4])panel([1.99,4.85,.17],[-4+i*2,2.4,6],graphite);
  panel([4,1.55,.22],[1,4.08,6],graphite);
  buildSector(root,panel,{steel,graphite,seal,lamp,cyan,deck,paint,ceramic});
  pressureShells(root,{steel,graphite,cyan,paint});
  sectorFinish(root,panel,{steel,graphite,seal,cyan});
  // Solid front bulkhead cut around a single panoramic aperture.
  const shape=new T.Shape();shape.moveTo(-5.12,-.12);shape.lineTo(5.12,-.12);shape.lineTo(5.12,4.85);shape.lineTo(-5.12,4.85);shape.closePath();
  const opening=new T.Path();opening.moveTo(-4.58,1.54);
  opening.bezierCurveTo(-4.90,2.36,-4.51,4.28,-3.53,4.20);
  opening.bezierCurveTo(-1.30,4.07,1.06,3.90,3.50,3.42);
  opening.bezierCurveTo(4.66,3.18,4.74,2.64,4.55,1.58);
  opening.bezierCurveTo(4.42,.80,4.08,.58,3.22,.52);
  opening.bezierCurveTo(.78,.33,-1.82,.52,-3.44,.81);
  opening.bezierCurveTo(-4.14,.95,-4.41,1.12,-4.58,1.54);
  opening.closePath();shape.holes.push(opening);
  const frame=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.4,bevelEnabled:true,bevelSegments:4,bevelThickness:.055,bevelSize:.055,curveSegments:24}),steel);
  frame.position.z=-6.09;root.add(frame);
  const outline=opening.getPoints(28);
  outline.pop();
  const gasket=new T.CatmullRomCurve3(outline.map(p=>new T.Vector3(p.x,p.y,-5.61)),true);
  root.add(new T.Mesh(new T.TubeGeometry(gasket,240,.073,10,true),graphite));
  const reveal=new T.Mesh(new T.TubeGeometry(gasket,240,.022,8,true),steel);
  reveal.position.z=.078;root.add(reveal);
  root.add(...buildPanelBatches([...batches.values()],{merge:options.optimize!==false}));
}
