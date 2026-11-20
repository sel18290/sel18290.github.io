export class ProgressionManager {
 constructor({storage,events}){this.storage=storage;this.events=events;}
 achieved(id){return this.storage.read('objective.'+id)===true;}
 award(id){if(this.achieved(id))return false;this.storage.write('objective.'+id,true);this.events.emit('objective.completed',{id});return true;}
 // Existing games keep their own award rules; this is a read-only adapter.
 legacy(read){return {snapshot:()=>structuredClone(read())};}
}
