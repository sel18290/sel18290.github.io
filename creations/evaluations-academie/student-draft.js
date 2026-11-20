function readLocal(key,storage){
 try{return JSON.parse(storage.getItem(key)||'null')}catch{return null}
}

export function recoverAnswers({attempt,key,legacyKey,storage}){
 const local=readLocal(key,storage);
 if(local?.pending&&local.answers&&typeof local.answers==='object'){
  if(local.revision===attempt.revision)return local.answers;
  const rebased={...attempt.answers};
  for(const [id,value] of Object.entries(local.answers)){
   const base=local.base?.[id]??'', remote=rebased[id]??'';
   if(typeof value==='string'&&value!==base&&(remote===base||remote===local.sending?.[id]))
    rebased[id]=value;
  }
  return rebased;
 }
 if(attempt.revision===0&&!Object.keys(attempt.answers||{}).length){
  const legacy=readLocal(legacyKey,storage);
  if(legacy?.answers&&Date.now()-Number(legacy.updated||0)<12*3600000)return legacy.answers;
 }
 return attempt.answers||{};
}

export function createStudentDraft({attempt,key,legacyKey,storage,initialAnswers,collect,request,onStatus,onReceipt,onAttachment}){
 let revision=attempt.revision, attachment=attempt.file_name||'';
 let lastSaved=JSON.stringify(attempt.answers||{}), pending=JSON.stringify(initialAnswers);
 let fileChange=null, timer=null, running=null, sending=null, stopped=false, completed=false, blocked=false, submitting=false;
 const keyFor=(values)=>JSON.stringify(Object.entries(values).filter(([,value])=>value!=='').sort(([a],[b])=>a.localeCompare(b)));
 function comparable(raw){return keyFor(JSON.parse(raw))}
 function persist(){
  if(completed)return;
  try{
   if(comparable(pending)===comparable(lastSaved)){
    storage.removeItem(key);
   }else storage.setItem(key,JSON.stringify({revision,pending:true,answers:JSON.parse(pending),base:JSON.parse(lastSaved),sending}));
  }catch{}
 }
 function capture(){
  pending=JSON.stringify(collect());
  persist();
 }
 function finish(){
  completed=true;
  clearTimeout(timer);
  try{storage.removeItem(key);storage.removeItem(legacyKey)}catch{}
 }
 function defer(ms){
  clearTimeout(timer);
  if(!stopped&&!blocked&&!completed)timer=setTimeout(()=>{void flush()},ms);
 }
 async function flush(){
  clearTimeout(timer);
  if(running||blocked||completed||submitting)return running;
  const answers=pending,change=fileChange;
  if(!change&&comparable(answers)===comparable(lastSaved))return;
  onStatus(change?'Enregistrement du fichier et du brouillon…':'Sauvegarde serveur en cours…');
  const requestPayload={answers,revision,remove_file:change?.remove===true};
  sending=JSON.parse(answers);
  persist();
  let retry=0;
  running=(async()=>{
   try{
    const result=await request('student_save',requestPayload,change?.file);
    if(result.status==='submitted'){
     finish();
     if(!stopped)onReceipt();
     return;
    }
    if(result.status==='conflict'){
     const sameAnswers=comparable(answers)===comparable(JSON.stringify(result.answers||{}));
     const sameFile=!change||result.file_name===(change.remove?null:change.file.name);
     if(!sameAnswers||!sameFile){
      blocked=true;
      onStatus('Une autre fenêtre a enregistré ce contrôle. Rouvre le contrôle pour reprendre la version du serveur.',true);
      return;
     }
    }else if(result.status!=='open'){
     blocked=true;
     onStatus('Le contrôle est fermé. Les dernières modifications sont conservées dans cet onglet.',true);
     return;
    }
    revision=result.revision;
    lastSaved=answers;
    sending=null;
    if(fileChange===change)fileChange=null;
    attachment=result.file_name||'';
    persist();
    onAttachment(attachment);
    onStatus('✓ Brouillon enregistré sur le serveur.');
   }catch(error){
    retry=7000;
    onStatus('Sauvegarde serveur en attente. Les réponses sont conservées dans cet onglet. '+error.message,true);
   }finally{
    running=null;
    if(!blocked&&!completed&&(fileChange||comparable(pending)!==comparable(lastSaved))){
     if(stopped){if(!retry&&pending!==answers)void flush()}
     else defer(retry||0);
    }
   }
  })();
  return running;
 }
 return {
  update(immediate=false){
   if(stopped||completed)return;
   capture();
   if(immediate)void flush();else defer(850);
  },
  attach(file){
   fileChange=file?{file}:{remove:true};
   capture();
   void flush();
  },
  async submit(){
   capture();
   submitting=true;
   clearTimeout(timer);
   try{
    if(running)await running;
    if(completed)return;
    if(blocked)throw Error('Rouvre le contrôle pour synchroniser ta copie.');
    const result=await request('student_submit',{answers:pending,revision,remove_file:fileChange?.remove===true},fileChange?.file);
    if(result.status!=='submitted')throw Error('La copie a changé sur le serveur. Rouvre le contrôle et vérifie tes réponses.');
    finish();
   }finally{
    submitting=false;
    defer(2000);
   }
  },
  finish,
  dispose(){
   if(!completed){capture();void flush()}
   stopped=true;
   clearTimeout(timer);
  },
  get attachment(){return fileChange?.remove?'':fileChange?.file?.name||attachment}
 };
}
