export class InteractionManager {
 constructor(events){this.events=events;this.roots=new WeakMap();}
 bind(root,resolve,signal){this.roots.get(root)?.();const handler=e=>{const target=e.target.closest?.('button,[role=button]');if(!target||!root.contains(target))return;const id=resolve(target);if(id)this.events.emit('object.interacted',{id,source:e.detail===0?'keyboard':'pointer'});};root.addEventListener('click',handler,{signal});const off=()=>root.removeEventListener('click',handler);this.roots.set(root,off);return off;}
}
