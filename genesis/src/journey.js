// Bind the existing child controllers to one host. Historical storage and entry
// sequences remain owned by the original controllers.
import {EventManager} from '../../core/events.js';
export const journeyEvents={
  noctis:{'fusion:passage':'journey.passage','fusion:resume':'journey.resume'},
  east:{'cortex:n04':'journey.next','fusion:position':'journey.position'},
  n04:{'spark:ready':'journey.ready','spark:error':'journey.error'}
};
export function bindJourney({frame,active,session,route,ready,fail,signal}){
  const bus=new EventManager();
  const on=(type,fn)=>bus.on(type,fn,signal);
  on('journey.passage',()=>{session.complete('secret-passage');route('east');});
  on('journey.resume',()=>route('east'));
  on('journey.next',()=>route('n04'));
  on('journey.ready',ready);
  on('journey.error',msg=>fail(String(msg.message||'Chargement interrompu')));
  on('journey.position',msg=>{session.state.position=msg.position;session.save();});
  on('journey.save',msg=>session.record(msg.key,msg.value));
  const receive=e=>{
    if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
    const type=e.data?.type;
    if(typeof type!=='string')return;
    const adapter=journeyEvents[active()];
    if(type==='fusion:save' && adapter && typeof e.data.key==='string')bus.emit('journey.save',e.data);
    else if(adapter && Object.hasOwn(adapter,type))bus.emit(adapter[type],e.data);
  };
  window.addEventListener('message',receive,{signal});
  return bus;
}
