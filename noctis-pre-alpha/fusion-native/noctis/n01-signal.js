import {playUnknownSignal} from './audio/unknown-signal.js';
export const SIGNAL_KEY='noctis.signal.v1';
export const NOTICE_KEY='noctis.signal.notice.v1';
export function readJournalSignal(storage){
 try{const saved=storage.getItem(SIGNAL_KEY);if(saved!==null)return JSON.parse(saved)?.journal===true;
 return JSON.parse(storage.getItem('noctis.journal.v1'))?.discovered===true;}catch{return false;}
}
export function installFirstSignal(sound,journal,dialog){
 let seen=false,noticeSeen=false;try{seen=readJournalSignal(localStorage);noticeSeen=localStorage.getItem(NOTICE_KEY)==='true';}catch{}
 let timer=0,noticeTimer=0,wakeTimer=0,stopJournal=()=>{},stopWake=()=>{};
 const indicator=document.createElement('span');indicator.className='n01-signal-interface';indicator.setAttribute('aria-hidden','true');indicator.innerHTML='<i></i><b></b>';journal.prepend(indicator);
 function makeNotice(){const el=document.createElement('aside');el.className='n01-unknown-notice';el.hidden=true;el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.innerHTML='<span class="signal-emblem" aria-hidden="true">⌁</span><span><small>CORTEX · SIGNAL NON IDENTIFIÉ</small><strong>INTERFÉRENCE INCONNUE</strong></span><span class="signal-bars" aria-hidden="true">▂▅▃</span>';return el;}
 const journalNotice=makeNotice();journal.prepend(journalNotice);
 const wakeNotice=makeNotice();wakeNotice.classList.add('signal-wake-notice');document.querySelector?.('#cortex-connect')?.append(wakeNotice);
 function clearJournal(){clearTimeout(timer);clearTimeout(noticeTimer);journal.classList.remove('signal-crossing');journalNotice.hidden=true;stopJournal();stopJournal=()=>{};}
 function endWake(){clearTimeout(wakeTimer);wakeNotice.hidden=true;stopWake();stopWake=()=>{};}
 function cancel(){clearJournal();endWake();}
 function discover(){if(seen&&noticeSeen)return false;seen=true;noticeSeen=true;try{localStorage.setItem(SIGNAL_KEY,JSON.stringify({journal:true}));localStorage.setItem(NOTICE_KEY,'true');}catch{}
 clearJournal();journal.classList.add('signal-crossing');journalNotice.hidden=false;
 stopJournal=playUnknownSignal(sound,{level:.6});timer=setTimeout(()=>journal.classList.remove('signal-crossing'),420);noticeTimer=setTimeout(clearJournal,6000);return true;}
 dialog.addEventListener('close',clearJournal);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 window.addEventListener('pagehide',cancel);
 return {discover,clearJournal,cancel,endWake,wake(){endWake();stopWake=playUnknownSignal(sound,{level:.16,delay:.66});wakeTimer=setTimeout(()=>{if(!document.hidden)wakeNotice.hidden=false;},660);},reset(){cancel();seen=false;noticeSeen=false;try{localStorage.removeItem(SIGNAL_KEY);localStorage.removeItem(NOTICE_KEY);}catch{}}};
}
