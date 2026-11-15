export class DialogueManager {
 constructor(events){this.events=events;this.adapter=null;}
 attach(adapter){this.adapter=adapter;}
 show(text){if(typeof text!=='string')throw TypeError('Dialogue text');return this.adapter.show(text);}
 observe(root,signal){let last='';const sync=()=>{const text=root.textContent?.trim()||'';if(text===last)return;last=text;this.events.emit('dialogue.changed',{text});};const observer=new MutationObserver(sync);observer.observe(root,{childList:true,subtree:true,characterData:true});signal.addEventListener('abort',()=>observer.disconnect(),{once:true});return ()=>observer.disconnect();}
}
