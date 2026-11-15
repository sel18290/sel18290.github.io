export class SceneManager {
 constructor({events,resources,audio}){this.events=events;this.resources=resources;this.audio=audio;this.scenes=new Map();this.active=null;this.busy=false;}
 register(id,controller){if(this.scenes.has(id))throw Error('Duplicate scene');this.scenes.set(id,controller);}
 adopt(id){if(this.active===id)return;const old=this.active;if(old){this.resources.release(old);this.audio.stopScope(old);this.events.emit('room.exited',{id:old});}this.active=id;this.events.emit('room.entered',{id,legacy:true});}
 async go(id,options={replayIntro:false}){if(this.busy)throw Error('Scene transition in progress');const target=this.scenes.get(id);if(!target)throw Error('Unknown scene');const old=this.active;this.busy=true;try{await this.scenes.get(old)?.exit?.();await target.enter(options);this.adopt(id);}catch(error){if(old&&old!==id)await this.scenes.get(old)?.resume?.();throw error;}finally{this.busy=false;}}
 dispose(){for(const s of this.scenes.values())s.dispose?.();if(this.active){this.resources.release(this.active);this.audio.stopScope(this.active);}this.active=null;}
}
