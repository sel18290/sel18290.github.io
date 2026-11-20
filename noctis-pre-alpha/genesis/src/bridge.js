import {createCore} from '../../core/index.js';
import {BrowserAudioHost} from '../../core/browser-audio.js';
import {validate} from './blueprint.js';

export class GenesisBridge {
  constructor(plugins,local=localStorage) {
    this.plugins=plugins;
    this.core=createCore({local,namespace:'genesis.bridge.v1'});
    this.host=new BrowserAudioHost();
    this.core.audio.attach(this.host);
  }
  async enter(blueprint,view) {
    validate(blueprint,this.plugins);
    this.exit();
    const abort=new AbortController(),cleanups=[],ticks=[];
    const active={abort,cleanups,ticks};this.active=active;
    const {events,progression,audio,scenes}=this.core;
    scenes.adopt(blueprint.id);
    const key=id=>blueprint.id+'.'+id;
    const scope={
      view, blueprint, signal:abort.signal,
      listen:(type,fn)=>events.on(type,fn,abort.signal),
      emit:(type,data)=>events.emit(type,data),
      achieved:id=>progression.achieved(key(id)),
      complete:id=>{if(!blueprint.objectives.includes(id))throw Error('Objectif inconnu');return progression.award(key(id));},
      resource:id=>blueprint.resources[id],
      release:fn=>{if(abort.signal.aborted)fn();else cleanups.push(fn);},
      animate:fn=>{if(!abort.signal.aborted)ticks.push(fn);},
      sound:()=>audio.play('signal',{family:'INTERACTION',scope:blueprint.id,instanceId:'terminal'}),
    };
    cleanups.push(audio.register('signal',()=>{const tone=this.host.tone(480,.14);return ()=>{try{tone?.stop()}catch{}}}));
    scope.listen('device.activated',()=>{const stop=scope.sound();setTimeout(stop,180)});
    try {
      for(const object of blueprint.objects) for(const [name,config] of Object.entries(object.components)) {
        await this.plugins.get(name).mount(scope,object,config);
        if(abort.signal.aborted) throw Error('Chargement interrompu');
      }
    } catch(error) {if(this.active===active)this.exit();throw error;}
    return scope;
  }
  update(dt){for(const tick of this.active?.ticks||[]) tick(Math.min(.05,dt));}
  exit(){
    if(!this.active)return;
    this.active.abort.abort();
    for(const cleanup of this.active.cleanups.reverse())cleanup();
    this.core.scenes.dispose();this.active=null;
  }
}
