// Executed before the original module. The original source keeps its storage API and keys.
const prefix='cortex.fusion.native.legacy.';
const nativeGet=Storage.prototype.getItem,nativeSet=Storage.prototype.setItem,nativeRemove=Storage.prototype.removeItem;
const scope=key=>String(key).startsWith('noctis.')||String(key).startsWith('cortex.noctis3d.est.');
Storage.prototype.getItem=function(key){return nativeGet.call(this,scope(key)?prefix+key:key)};
Storage.prototype.setItem=function(key,value){nativeSet.call(this,scope(key)?prefix+key:key,value);if(scope(key))parent.postMessage({type:'fusion:save',key,value},location.origin)};
Storage.prototype.removeItem=function(key){nativeRemove.call(this,scope(key)?prefix+key:key);if(scope(key))parent.postMessage({type:'fusion:save',key,value:null},location.origin)};

// The public entry always shows the original welcome. Resuming the 3D chapter is explicit.
if(location.pathname.includes('/noctis/')){
 document.addEventListener('DOMContentLoaded',()=>{
  let saved;try{saved=JSON.parse(nativeGet.call(localStorage,'cortex.fusion.native.session.v1'))}catch{}
  if(!saved?.completed?.includes('secret-passage'))return;
  const welcome=document.querySelector('.welcome-copy');
  if(!welcome)return;
  const resume=document.createElement('button');
  resume.type='button';resume.textContent='Reprendre dans le Réseau Est · N03 →';
  resume.onclick=()=>parent.postMessage({type:'fusion:resume'},location.origin);
  welcome.append(resume);
 });
}
