export class EventManager {
 #topics=new Map();
 on(type,fn,signal){if(typeof type!=='string'||typeof fn!=='function')throw TypeError('Invalid subscription');if(signal?.aborted)return ()=>{};let set=this.#topics.get(type);if(!set)this.#topics.set(type,set=new Set());set.add(fn);const off=()=>{set.delete(fn);if(!set.size)this.#topics.delete(type);signal?.removeEventListener('abort',off);};signal?.addEventListener('abort',off,{once:true});return off;}
 emit(type,payload){if(typeof type!=='string'||!type.includes('.'))throw TypeError('Namespaced event required');for(const fn of [...(this.#topics.get(type)||[])])fn(payload);}
 count(){return [...this.#topics.values()].reduce((n,s)=>n+s.size,0);}
}
