const families=new Set(['MUSIC','ORBI','INTERACTION','SUCCESS']);
export class AudioManager {
 constructor(){this.cues=new Map();this.playing=new Map();this.backend=null;}
 attach(backend){if(this.backend&&this.backend!==backend)throw Error('Audio host already attached');this.backend=backend;}
 register(id,play){if(this.cues.has(id))throw Error('Duplicate audio cue');this.cues.set(id,play);return ()=>this.cues.delete(id);}
 play(id,options){if(!families.has(options.family))throw Error('Unknown audio family');const scope=typeof options.scope==='string'?options.scope:options.scope.sceneId;const key=scope+':'+options.instanceId+':'+(options.layer||'base');if(this.playing.has(key)){if(!options.combine)return this.playing.get(key).stop;throw Error('Distinct layer ID required for intentional combination');}const cue=this.cues.get(id);if(!cue)throw Error('Unknown cue '+id);const stopSource=cue(options,this.backend)||(()=>{});const stop=()=>{if(!this.playing.has(key))return;stopSource();this.playing.delete(key);};this.playing.set(key,{scope,stop});return stop;}
 stopScope(scope){const id=typeof scope==='string'?scope:scope.sceneId;for(const item of [...this.playing.values()])if(item.scope===id)item.stop();}
 duck(family,gain){if(family==='MUSIC')this.backend?.duck?.(gain<1);}
 setVolume(value){this.backend?.setVolume(value);}mute(value){return this.backend?.enable(!value);}
}
