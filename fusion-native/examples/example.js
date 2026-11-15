import {GameSession,QuestEngine} from '../runtime/session.js';
import {examples} from './definitions.js';
import * as T from '../../v15-est/vendor/three.module.js';
const mode=new URLSearchParams(location.search).get('mode')||'2d',def=examples.find(d=>d.mode===mode)||examples[0];
const key='cortex.fusion.example.'+def.id;
const memory={getItem(){return localStorage.getItem(key)},setItem(k,v){localStorage.setItem(key,v)}};
const session=new GameSession(memory),engine=new QuestEngine(session,def.objectives);
document.querySelector('h1').textContent=def.dialogue;
document.querySelector('#read').onclick=()=>{
 engine.complete('read');
 const pane=document.querySelector('#activity');pane.hidden=false;pane.textContent=def.document;
 const q=document.createElement('p');q.textContent='Quelle phase est davantage présente au début de nuit ?';pane.append(q);
 def.objectives[1].quiz.choices.forEach((c,i)=>{const b=document.createElement('button');b.textContent=c;b.onclick=()=>{const result=engine.answer('quiz',i);document.querySelector('[role=status]').textContent=result.explanation};pane.append(b)});
};
if(mode==='2d')document.querySelector('#art').innerHTML='<svg viewBox="0 0 500 150" aria-label="Cycles schématiques"><path d="M0 35h35v80h65v-80h40v-25h35v25h40v80h35v-80h40v-25h65v25h35v-25h65" stroke="#e17386" fill="none" stroke-width="4"/></svg>';
else try{
 const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});
 renderer.setSize(innerWidth,innerHeight);const scene=new T.Scene(),camera=new T.PerspectiveCamera(60,innerWidth/innerHeight,.1,50);
 camera.position.set(0,1,5);
 const machine=new T.Mesh(new T.TorusKnotGeometry(1,.22,80,12),new T.MeshStandardMaterial({color:0x8a5661,metalness:.6,roughness:.35}));
 scene.add(machine,new T.HemisphereLight(0xffffff,0x383844,3));renderer.setAnimationLoop(t=>{machine.rotation.y=t*.0002;renderer.render(scene,camera)});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
}catch(e){document.querySelector('[role=status]').textContent='WebGL indisponible : '+e.message}
