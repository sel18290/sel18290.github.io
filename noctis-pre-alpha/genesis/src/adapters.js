import {renderGardenTask,gardenTasks} from './garden-quest.js';
import {renderTablet} from '../../fusion-native/noctis/tablet-archive.js';
import {hubRoute} from './hub-plan.js';
const asset=(c,b)=>Object.hasOwn(b.resources,c.asset);
export const adapters=new Map(Object.entries({
  garden:{spatial:true,valid:()=>true,async mount(s){
    const world=await s.view.garden();s.release(world.dispose);
    s.animate(dt=>world.update(dt,{light:s.achieved('light'),rest:s.achieved('rest'),meal:s.achieved('meal'),complete:s.achieved('safety')}));
  }},
  gardenTask:{valid:(c,b)=>Object.hasOwn(gardenTasks,c.task)&&b.objectives.includes(c.task),mount(s,o,c){s.listen('device.activated',({id})=>{if(id===o.id)renderGardenTask(s,c.task);});}},
  hubGate:{valid:c=>!!hubRoute(c.destination),mount(s,o,c){s.listen('device.activated',({id})=>{if(id===o.id)s.view.travelHub(c.destination);});}},
  orbital:{spatial:true,valid:c=>!c.horizon||/^\/genesis\/assets\/[\w-]+\.webp$/.test(c.horizon),async mount(s,o,c){s.release(await s.view.orbital(c.horizon));}},
  catalogue:{
    spatial:true,valid:(c,b)=>asset(c,b)&&c.height>0&&Number.isFinite(c.height),
    async mount(s,o,c){s.release(await s.view.model(s.resource(c.asset),o.position,c.height,{id:o.id,collider:c.autoCollider===true}));}
  },
  machine:{
    spatial:true,valid:(c,b)=>['console','capsule','reactor','atlas'].includes(c.kind)&&b.objectives.includes(c.objective),
    mount(s,o,c){
      const machine=s.view.machine(c.kind,o.position,o.id);s.release(machine.dispose);
      machine.restore(s.achieved(c.objective));let working=false;
      s.listen('device.activated',({id})=>{if(id!==o.id||working)return;machine.activate();working=true;s.view.status(c.working||'Diagnostic en cours…');});
      s.animate(dt=>{machine.update(dt);if(working&&machine.state==='complete'){working=false;s.emit('device.finished',{id:o.id});}});
    }
  },
  gaussian:{
    spatial:true,valid:(c,b)=>asset(c,b)&&Object.hasOwn(b.resources,c.mobile)&&b.objectives.includes(c.objective)&&b.objects.some(o=>o.id===c.signal&&o.components.interaction),
    async mount(s,o,c){
      const effect=await s.view.splats(s.resource(s.view.mobile?c.mobile:c.asset),o.position);
      s.release(effect.dispose);
      let brightness=s.achieved(c.objective)?1:.83,goal=brightness;
      s.listen('device.activated',({id})=>{if(id===c.signal)goal=1;});
      if(c.static)return;
      s.animate(dt=>{brightness+=(goal-brightness)*Math.min(1,dt*5);effect.tint(brightness);});
    }
  },
  collider:{
    spatial:true,valid:c=>Number.isFinite(c.radius)&&c.radius>0,
    mount(s,o,c){if(!o.components.machine&&!o.components.catalogue?.autoCollider)s.release(s.view.block(o.position,c.radius,o.id));}
  },
  interaction:{
    valid:c=>typeof c.label==='string'&&Number.isFinite(c.range)&&c.range>0,
    mount(s,o,c){s.release(s.view.action(o,c,()=>s.emit('device.activated',{id:o.id})));}
  },
  inspection:{
    valid:(c,b)=>b.objectives.includes(c.objective)&&typeof c.message==='string',
    mount(s,o,c){s.listen(o.components.machine?'device.finished':'device.activated',({id})=>{
      if(id!==o.id)return;
      if(!s.achieved(c.objective))s.complete(c.objective);
      s.view.status(c.message);
    });}
  },
  archive:{
    valid:(c,b)=>['light','screens','calm'].includes(c.theme)&&b.objectives.includes(c.objective)&&(!c.trigger||b.objects.some(o=>o.id===c.trigger&&o.components.interaction)),
    mount(s,o,c){
      s.listen(c.afterMachine?'device.finished':'device.activated',({id})=>{
        if(id!==(c.trigger??o.id))return;
        const doc=s.view.panel();
        renderTablet(doc,{tab:c.theme,read:s.achieved(c.objective),onRead:()=>{
          s.complete(c.objective);s.view.status('Lecture enregistrée');
        }});
      });
      if(s.achieved(c.objective))s.view.status('Lecture enregistrée');
    }
  }
}));
