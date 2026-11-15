export class SaveManager {
 constructor({local,session,namespace,events}){this.local=local;this.session=session;this.namespace=namespace;this.events=events;}
 legacy(kind='local'){const backend=()=>typeof this[kind]==='function'?this[kind]():this[kind];return {getItem:key=>backend().getItem(key),setItem:(key,value)=>{backend().setItem(key,value);this.events?.emit('save.written',{key,kind});},removeItem:key=>{backend().removeItem(key);this.events?.emit('save.removed',{key,kind});}};}
 read(key){const raw=this.legacy().getItem(this.namespace+':'+key);return raw===null?undefined:JSON.parse(raw);}
 write(key,value){this.legacy().setItem(this.namespace+':'+key,JSON.stringify(value));}
}
