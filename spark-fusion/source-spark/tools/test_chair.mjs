import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createChair} from '../src/chair.js';
const station=createChair(),v=new Vector3();
assert.equal(station.root.position.z,-1.5);
function verifyEnvelope(){
 station.root.updateMatrixWorld(true);
 station.root.traverse(node=>{
   if(!node.isMesh)return;
   const vertices=node.geometry.getAttribute('position');
   for(let i=0;i<vertices.count;i++){
     node.localToWorld(v.fromBufferAttribute(vertices,i));
     assert(Math.hypot(v.x,v.z+1.5)<1.35&&v.y>=-1e-6&&v.y<2.7);
   }
 });
}
verifyEnvelope();station.update(.1,true);assert.equal(station.phase,'proximity');
station.update(.1,false);assert.equal(station.phase,'idle');
assert(station.activate());assert(!station.activate());
for(let i=0;i<41;i++){station.update(.1,true);if(i%5===0)verifyEnvelope();}
assert.equal(station.progress,1);assert.equal(station.phase,'complete');
assert(station.activate());assert.equal(station.progress,0);station.dispose();
console.log('Siège : états, diagnostic, redémarrage, enveloppe géométrique et destruction vérifiés.');
