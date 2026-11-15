import {creations,categories,creation} from './catalogue.js';
import {createHubVisit} from '../genesis/src/hub-visit-session.js';
import {GameSession} from '../fusion-native/runtime/session.js';
const $=id=>document.getElementById(id),selector=$('destination');let scope,frame,current;
// Read-only construction does not award objectives; existing child controllers own saves.
const memory=new Map();let storage;try{storage=localStorage;}catch{storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};}
const session=new GameSession(storage);
for(const [id,title]of Object.entries(categories)){
 const group=document.createElement('optgroup');group.label=title;
 for(const item of creations.filter(c=>c.category===id)){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;group.append(option);}selector.append(group);
}
function open(id,{historyMode='push'}={}){
 const item=creation(id);if(!item){$('opening').hidden=false;$('opening').textContent='Cette destination est inconnue. Choisissez une salle dans le menu supérieur.';return;}
 scope?.abort();scope=new AbortController();frame?.remove();frame=null;current=item;selector.value=item.id;
 const url=new URL(location.href);url.searchParams.set('id',id);if(historyMode==='push')history.pushState({id},'',url);else if(historyMode==='replace')history.replaceState({id},'',url);
 document.title=item.name+' · NOCTIS';$('room-name').textContent=item.name;$('room-description').textContent=item.description;$('direct').href=item.url;$('room-info').hidden=true;$('info').setAttribute('aria-expanded','false');
 $('opening').hidden=false;$('opening').textContent='Ouverture · '+item.name;
 frame=document.createElement('iframe');frame.id='environment';frame.title=item.name;frame.allow='autoplay; fullscreen; pointer-lock';frame.setAttribute('allowfullscreen','');
 frame.addEventListener('load',()=>{$('opening').hidden=true;$('room-status').textContent='Page ouverte · '+item.name;},{signal:scope.signal});$('viewport').append(frame);
 if(item.journey){createHubVisit({destination:item.journey,frame,session,signal:scope.signal,onRoute:()=>{$('opening').hidden=false;},onReady:()=>{$('opening').hidden=true;},onFail:message=>{$('opening').hidden=false;$('opening').textContent=message+' · Utilisez ↻ pour réessayer.';}});}
 else frame.src=item.url;
 if(item.entry)frame.src=item.entry;
}
selector.onchange=()=>open(selector.value);$('reload').onclick=()=>current&&open(current.id,{historyMode:'none'});
$('info').onclick=()=>{$('room-info').hidden=!$('room-info').hidden;$('info').setAttribute('aria-expanded',String(!$('room-info').hidden));};
addEventListener('popstate',()=>open(new URLSearchParams(location.search).get('id')||'n06-campus',{historyMode:'none'}));
addEventListener('pagehide',()=>{scope?.abort();frame?.remove();},{once:true});
open(new URLSearchParams(location.search).get('id')||'n06-campus',{historyMode:'replace'});
