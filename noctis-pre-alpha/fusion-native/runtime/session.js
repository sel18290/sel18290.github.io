export const SESSION_KEY='cortex.fusion.native.session.v1';
export const PREFIX='cortex.fusion.native.legacy.';
export class GameSession{
 constructor(storage){this.storage=storage;this.state={schema:1,scene:'noctis',legacy:{},completed:[],quizzes:{},position:null};try{const s=JSON.parse(storage.getItem(SESSION_KEY));if(s?.schema===1)this.state={...this.state,...s}}catch{}}
 save(){try{this.storage.setItem(SESSION_KEY,JSON.stringify(this.state));return true}catch{return false}}
 checkpoint(scene){this.state.scene=scene;return this.save()}
 record(key,value){
 this.state.legacy[key]=value;
 let data;try{data=JSON.parse(value)}catch{}
 const mark=id=>{if(!this.state.completed.includes(id))this.state.completed.push(id)};
 if(key==='noctis.orbi.v1')this.state.identity=data?.name||'';
 if(key==='noctis.sleep-puzzle.v1'&&data?.unlocked)mark('fragment-1');
 if(key==='noctis.n02.final.v1'&&data?.fragment)mark('fragment-2');
 if(key.endsWith('.archives.v1')&&Array.isArray(data))this.state.archives=data;
 if(key.endsWith('.reconstruction.v1')&&data){
  this.state.repairs=data.modules;
  if(data.fragment)mark('fragment-3');
  if(data.transmission)mark('transmission');
 }
 this.save()
}
 complete(id){if(!this.state.completed.includes(id))this.state.completed.push(id);this.save()}
}
export class QuestEngine{
 constructor(session,definitions=[]){this.session=session;this.definitions=new Map(definitions.map(d=>[d.id,d]))}
 ready(id){const d=this.definitions.get(id);return !!d&&(d.prerequisites||[]).every(v=>this.session.state.completed.includes(v))}
 complete(id){if(!this.ready(id))return false;this.session.complete(id);return true}
 answer(id,answer){const d=this.definitions.get(id);if(!d?.quiz||!this.ready(id))return {correct:false,explanation:d?.hint||'Objectif préalable requis.'};
 const correct=JSON.stringify(answer)===JSON.stringify(d.quiz.answer);
 this.session.state.quizzes[id]={answer,correct};if(correct)this.complete(id);else this.session.save();return {correct,explanation:correct?d.quiz.success:d.quiz.explanation}}
}
export const scenes=[
 {id:'noctis',mode:'2d',url:'./noctis/',exit:'east'},
 {id:'east',mode:'hybrid',url:'./east/',prerequisites:['secret-passage']},
 {id:'n04',mode:'hybrid',url:'../spark-fusion/n04/?embedded=1'},
 {id:'n05',mode:'hybrid',url:'../genesis/?scene=n05'},
 {id:'demo2d',mode:'2d',url:'./examples/?mode=2d'},
 {id:'demo3d',mode:'3d',url:'./examples/?mode=3d'},
 {id:'demohybrid',mode:'hybrid',url:'./examples/?mode=hybrid'}
];
