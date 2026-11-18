
import { createClient } from 'npm:@supabase/supabase-js@2.49.8';

const URL=Deno.env.get('SUPABASE_URL')||'';
const SECRET=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const BUCKET='cortex-academy-private';
const ORIGIN='https://sel18290.github.io';
const enc=new TextEncoder();
const admin=createClient(URL,SECRET,{auth:{autoRefreshToken:false,persistSession:false}});
const headerBase={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
const allowedFiles=new Map([
 ['application/pdf','pdf'],
 ['application/vnd.openxmlformats-officedocument.wordprocessingml.document','docx'],
 ['application/msword','doc'],
 ['image/png','png'],['image/jpeg','jpg'],['image/webp','webp'],
 ['text/plain','txt']
]);
function ret(obj,code=200){return new Response(JSON.stringify(obj),{status:code,headers:{...headerBase,'Access-Control-Allow-Origin':ORIGIN}})}
function fail(error,code=400){return ret({ok:false,error},code)}
function random(bytes=30){const a=new Uint8Array(bytes);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')}
function pin(){const array=new Uint32Array(1);crypto.getRandomValues(array);return String(array[0]%1000000).padStart(6,'0')}
async function digest(raw){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(raw))),b=>b.toString(16).padStart(2,'0')).join('')}
async function pinHash(id,n,p){return digest([SECRET,id,n,p].join('|'))}
function validUuid(x){return typeof x==='string'&&/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(x)}
function fname(file){return String(file?.name||'Document').replace(/[\\/\u0000-\u001f\u007f]/g,'_').slice(0,130)}
function checkedFile(file){
 if(!(file instanceof File)||file.size<1||file.size>8388608)throw Error('Fichier requis, entre 1 octet et 8 Mo.');
 const type=String(file.type||'').toLowerCase();
 const ext=allowedFiles.get(type);
 if(!ext)throw Error('Format refusé. Formats acceptés : PDF, Word, TXT, PNG, JPG ou WebP.');
 const fileExt=String(file.name||'').split('.').pop()?.toLowerCase();
 if(fileExt&&fileExt!==ext&&!(ext==='jpg'&&fileExt==='jpeg'))throw Error('Le format du fichier ne correspond pas à son extension.');
 return {ext,type};
}
async function userFromRequest(req){
 const token=req.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
 if(!token)throw Error('Connexion professeur obligatoire.');
 const {data,error}=await admin.auth.getUser(token);
 const user=data?.user;
 if(error||!user||!user.email_confirmed_at||!String(user.email||'').toLowerCase().endsWith('@ac-paris.fr'))throw Error('Compte académique confirmé requis.');
 return user;
}
async function owned(teacher,assessmentId){
 if(!validUuid(assessmentId))throw Error('Contrôle invalide.');
 const {data,error}=await admin.from('cortex_teacher_assessments')
 .select('id,title,class_id,teacher_id,published,content')
 .eq('id',assessmentId).eq('teacher_id',teacher.id).maybeSingle();
 if(error)throw Error('Impossible de consulter le contrôle.');
 if(!data)throw Error('Contrôle introuvable dans votre compte.');
 return data;
}
async function ensureAccess(assessment,roster=30){
 const {data:old,error:readErr}=await admin.from('cortex_academy_access').select('*').eq('assessment_id',assessment.id).maybeSingle();
 if(readErr)throw Error('Erreur de consultation des accès.');
 if(old)return old;
 const {data,error}=await admin.from('cortex_academy_access').insert({
 assessment_id:assessment.id,teacher_id:assessment.teacher_id,join_code:random(20),
 roster_size:roster,active:false
 }).select('*').single();
 if(error){
 const {data:existing}=await admin.from('cortex_academy_access').select('*').eq('assessment_id',assessment.id).maybeSingle();
 if(existing)return existing;
 throw Error('Impossible de préparer les accès élèves.');
 }
 return data;
}
async function resetPin(assessmentId,n){
 const newPin=pin(),pin_digest=await pinHash(assessmentId,n,newPin);
 const {error}=await admin.from('cortex_academy_roster').upsert({assessment_id:assessmentId,student_number:n,pin_digest,attempts:0,locked_until:null,updated_at:new Date().toISOString()},{onConflict:'assessment_id,student_number'});
 if(error)throw Error('Impossible de créer le PIN élève.');
 await admin.from('cortex_academy_sessions').delete().eq('assessment_id',assessmentId).eq('student_number',n);
 return {number:n,pin:newPin};
}

async function classOwned(teacher,id){
 if(!validUuid(id))throw Error('Classe inconnue.');
 const {data,error}=await admin.from('cortex_teacher_classes').select('id,code,display_name,teacher_id,archived').eq('id',id).eq('teacher_id',teacher.id).maybeSingle();
 if(error||!data||data.archived)throw Error('Classe absente de votre compte professeur.');
 return data;
}
async function classAccess(teacher,classId,size=30){
 await classOwned(teacher,classId);
 let {data:access,error}=await admin.from('cortex_academy_class_access').select('*').eq('class_id',classId).maybeSingle();
 if(error)throw Error('Impossible de charger les accès de la classe.');
 if(!access){
  const created=await admin.from('cortex_academy_class_access').insert({class_id:classId,teacher_id:teacher.id,portal_code:random(8),active:true,roster_size:size}).select('*').single();
  if(created.error){
   const existing=await admin.from('cortex_academy_class_access').select('*').eq('class_id',classId).maybeSingle();
   if(!existing.data)throw Error('Création des accès de classe impossible.');
   access=existing.data;
  }else access=created.data;
 }
 const {data:roster,error:rosterErr}=await admin.from('cortex_academy_class_roster').select('student_number').eq('class_id',classId);
 if(rosterErr)throw Error('Impossible de préparer les PIN de classe.');
 const existing=new Set((roster||[]).map(r=>r.student_number));
 const total=existing.size?Math.max(access.roster_size,size):size;
 const missing=Array.from({length:total},(_,i)=>i+1).filter(n=>!existing.has(n));
 const freshPins=[];
 if(missing.length){
  const generated=await Promise.all(missing.map(async n=>{
   const value=pin();
   return {row:{class_id:classId,student_number:n,pin_digest:await pinHash(classId,n,value),attempts:0,locked_until:null},credential:{number:n,pin:value}};
  }));
  const {error:insertErr}=await admin.from('cortex_academy_class_roster').upsert(generated.map(p=>p.row),{onConflict:'class_id,student_number'});
  if(insertErr)throw Error('Création des PIN de classe impossible.');
  freshPins.push(...generated.map(p=>p.credential));
 }
 if(access.roster_size!==total||!access.active){
  const {error:updateErr}=await admin.from('cortex_academy_class_access').update({roster_size:total,active:true}).eq('class_id',classId).eq('teacher_id',teacher.id);
  if(updateErr)throw Error('Activation des accès de classe impossible.');
  access={...access,roster_size:total,active:true};
 }
 return {access,freshPins};
}
async function resetClassPin(teacher,classId,n){
 const {data:access}=await admin.from('cortex_academy_class_access').select('*').eq('class_id',classId).eq('teacher_id',teacher.id).maybeSingle();
 if(!access||!Number.isInteger(n)||n<1||n>access.roster_size)throw Error('Numéro élève invalide dans cette classe.');
 const value=pin();
 const {error}=await admin.from('cortex_academy_class_roster').upsert({class_id:classId,student_number:n,pin_digest:await pinHash(classId,n,value),attempts:0,locked_until:null,updated_at:new Date().toISOString()},{onConflict:'class_id,student_number'});
 if(error)throw Error('PIN non réinitialisé.');
 await admin.from('cortex_academy_class_sessions').delete().eq('class_id',classId).eq('student_number',n);
 const {data:exams}=await admin.from('cortex_teacher_assessments').select('id').eq('class_id',classId).eq('teacher_id',teacher.id);
 const ids=(exams||[]).map(e=>e.id);
 if(ids.length)await admin.from('cortex_academy_sessions').delete().in('assessment_id',ids).eq('student_number',n);
 return {number:n,pin:value};
}
async function verifyClassPin(access,n,p){
 if(!Number.isInteger(n)||n<1||n>access.roster_size||!/^\d{6}$/.test(p))throw Error('Classe, numéro ou PIN incorrect.');
 const {data:cred}=await admin.from('cortex_academy_class_roster').select('*').eq('class_id',access.class_id).eq('student_number',n).maybeSingle();
 if(!cred)throw Error('Classe, numéro ou PIN incorrect.');
 if(cred.locked_until&&new Date(cred.locked_until)>new Date())throw Error('Trop de tentatives. Demandez un nouveau PIN au professeur ou réessayez plus tard.');
 const expected=await pinHash(access.class_id,n,p);
 if(cred.pin_digest!==expected){
  const tries=Number(cred.attempts||0)+1;
  await admin.from('cortex_academy_class_roster').update({attempts:tries>=5?0:tries,locked_until:tries>=5?new Date(Date.now()+900000).toISOString():null}).eq('class_id',access.class_id).eq('student_number',n);
  throw Error('Classe, numéro ou PIN incorrect.');
 }
 await admin.from('cortex_academy_class_roster').update({attempts:0,locked_until:null}).eq('class_id',access.class_id).eq('student_number',n);
}
async function activeClassStudent(token){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Error('Session expirée. Reconnectez-vous.');
 const {data:session,error}=await admin.from('cortex_academy_class_sessions').select('*').eq('token_digest',await digest(token)).gt('expires_at',new Date().toISOString()).maybeSingle();
 if(error||!session)throw Error('Session expirée. Reconnectez-vous.');
 const {data:access}=await admin.from('cortex_academy_class_access').select('*').eq('class_id',session.class_id).eq('active',true).maybeSingle();
 if(!access)throw Error('Cette classe n’est plus accessible.');
 return {session,access};
}

async function activeStudent(token,assessmentId=''){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Error('Session expirée. Reconnectez-vous avec le PIN.');
 const hash=await digest(token);
 let classSession=null;
 if(validUuid(assessmentId)){
  const {data}=await admin.from('cortex_academy_class_sessions').select('*').eq('token_digest',hash).gt('expires_at',new Date().toISOString()).maybeSingle();
  classSession=data;
 }
 if(classSession){
  const {data:classCredential}=await admin.from('cortex_academy_class_access').select('*').eq('class_id',classSession.class_id).eq('active',true).maybeSingle();
  if(!classCredential)throw Error('La classe est actuellement fermée.');
  const {data:assessment}=await admin.from('cortex_teacher_assessments').select('id,title,teacher_id,content,published,class_id').eq('id',assessmentId).eq('class_id',classSession.class_id).eq('teacher_id',classCredential.teacher_id).maybeSingle();
  if(!assessment)throw Error('Ce contrôle ne fait pas partie de votre classe.');
  const {data:access}=await admin.from('cortex_academy_access').select('*').eq('assessment_id',assessment.id).eq('teacher_id',classCredential.teacher_id).maybeSingle();
  if(!access)throw Error('Contrôle non disponible.');
  const {data:submitted}=await admin.from('cortex_academy_submissions').select('id').eq('assessment_id',assessment.id).eq('student_number',classSession.student_number).maybeSingle();
  if(!(assessment.published&&access.active)&&!submitted)throw Error('Contrôle non disponible.');
  return {session:classSession,access,assessment};
 }
 const {data:session,error}=await admin.from('cortex_academy_sessions').select('*').eq('token_digest',hash).gt('expires_at',new Date().toISOString()).maybeSingle();
 if(error||!session)throw Error('Session expirée. Reconnectez-vous avec votre PIN.');
 const {data:access}=await admin.from('cortex_academy_access').select('*').eq('assessment_id',session.assessment_id).maybeSingle();
 if(!access)throw Error('Contrôle non disponible.');
 const {data:assessment}=await admin.from('cortex_teacher_assessments').select('id,title,teacher_id,content,published,class_id').eq('id',session.assessment_id).maybeSingle();
 if(!assessment||access.teacher_id!==assessment.teacher_id)throw Error('Contrôle non disponible.');
 const {data:submitted}=await admin.from('cortex_academy_submissions').select('id').eq('assessment_id',assessment.id).eq('student_number',session.student_number).maybeSingle();
 if(!(assessment.published&&access.active)&&!submitted)throw Error('Ce contrôle est fermé.');
 return {session,access,assessment};
}
async function signed(path,expiry=90){
 if(!path)return null;
 const {data,error}=await admin.storage.from(BUCKET).createSignedUrl(path,expiry);
 if(error)throw Error('Impossible de préparer le téléchargement du document.');
 return data?.signedUrl||null;
}
async function upload(file,path){
 const meta=checkedFile(file);
 const {error}=await admin.storage.from(BUCKET).upload(path,file,{contentType:meta.type,upsert:false,cacheControl:'0'});
 if(error)throw Error('Envoi du fichier impossible.');
 return meta;
}
async function input(req){
 const contentType=req.headers.get('content-type')||'';
 const length=Number(req.headers.get('content-length')||0);
 if(length>9450000)throw Error('Dépôt limité à 8 Mo.');
 if(contentType.includes('multipart/form-data')){
 const form=await req.formData();
 return {form,action:String(form.get('action')||''),body:{
 assessment_id:form.get('assessment_id'),session:form.get('session'),answers:form.get('answers')
 }};
 }
 if(!contentType.includes('application/json'))throw Error('Format de requête invalide.');
 const body=await req.json();
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Requête incorrecte.');
 if(JSON.stringify(body).length>28000)throw Error('Requête trop volumineuse.');
 return {form:null,action:String(body.action||''),body};
}
async function teacherAction(action,body,form,req){
 const teacher=await userFromRequest(req);
 if(action==='teacher_list'){
  const [access,subs]=await Promise.all([
   admin.from('cortex_academy_access').select('assessment_id,join_code,active,roster_size,subject_name,created_at').eq('teacher_id',teacher.id),
   admin.from('cortex_academy_submissions').select('id,assessment_id,student_number,answers,file_name,submitted_at,grade,feedback,graded_at,released_at').eq('teacher_id',teacher.id).order('submitted_at',{ascending:false}).limit(500)
  ]);
  if(access.error||subs.error)throw Error('Impossible de charger les remises.');
  const {data:classAccess,error:caErr}=await admin.from('cortex_academy_class_access').select('class_id,portal_code,active,roster_size').eq('teacher_id',teacher.id);
  if(caErr)throw Error('Impossible de charger les accès des classes.');
  return ret({ok:true,access:access.data||[],classAccess:classAccess||[],submissions:subs.data||[]});
 }
 if(action==='teacher_class_prepare'){
  const id=String(body.class_id||''),size=Number(body.roster_size||30);
  if(!Number.isInteger(size)||size<1||size>60)throw Error('Effectif invalide (1 à 60).');
  const {access,freshPins}=await classAccess(teacher,id,size);
  return ret({ok:true,portal_code:access.portal_code,roster_size:access.roster_size,freshPins});
 }
 if(action==='teacher_class_reset_pin'){
  const classId=String(body.class_id||''),number=Number(body.student_number);
  await classOwned(teacher,classId);
  return ret({ok:true,...await resetClassPin(teacher,classId,number)});
 }
 const id=String(body.assessment_id||''),assessment=await owned(teacher,id);
 if(action==='teacher_publish'){
  const raw=Number(body.roster_size||30);
  if(!Number.isInteger(raw)||raw<1||raw>60)throw Error('Nombre d’élèves : entre 1 et 60.');
  if(!String(assessment.content?.description||'').trim()&&!(assessment.content?.questions||[]).length){
   const current=await ensureAccess(assessment,raw);
   if(!current.subject_path)throw Error('Ajoutez des consignes, des questions ou un document avant de publier.');
  }
  const access=await ensureAccess(assessment,raw);
  let persistent=null;
  const fresh=[];
  if(assessment.class_id){
   persistent=await classAccess(teacher,assessment.class_id,raw);
   fresh.push(...persistent.freshPins);
  }
  const {data:roster,error:rosterError}=await admin.from('cortex_academy_roster').select('student_number').eq('assessment_id',id);
  if(rosterError)throw Error('Impossible de préparer la liste d’élèves.');
  const exist=new Set((roster||[]).map(x=>x.student_number));
  const size=exist.size?Math.max(access.roster_size,raw):raw;
  const missing=assessment.class_id?[]:Array.from({length:size},(_,i)=>i+1).filter(n=>!exist.has(n));
  if(missing.length){
   const generated=await Promise.all(missing.map(async n=>{
    const value=pin();
    return {row:{assessment_id:id,student_number:n,pin_digest:await pinHash(id,n,value),attempts:0,locked_until:null},credential:{number:n,pin:value}};
   }));
   const {error:pinError}=await admin.from('cortex_academy_roster').upsert(generated.map(x=>x.row),{onConflict:'assessment_id,student_number'});
   if(pinError)throw Error('Impossible de créer les PIN élèves.');
   fresh.push(...generated.map(x=>x.credential));
  }
  const {error:updateAccess}=await admin.from('cortex_academy_access').update({roster_size:size,active:true,updated_at:new Date().toISOString()}).eq('assessment_id',id).eq('teacher_id',teacher.id);
  if(updateAccess)throw Error('Impossible d’ouvrir l’évaluation.');
  const {error:pubErr}=await admin.from('cortex_teacher_assessments').update({published:true}).eq('id',id).eq('teacher_id',teacher.id);
  if(pubErr)throw Error('Impossible de publier le contrôle.');
  return ret({ok:true,code:access.join_code,roster_size:size,freshPins:fresh,class_id:assessment.class_id||null,portal_code:persistent?.access.portal_code||null});
 }
 if(action==='teacher_close'){
  const active=!!body.active;
  const {error}=await admin.from('cortex_academy_access').update({active}).eq('assessment_id',id).eq('teacher_id',teacher.id);
  if(error)throw Error('Impossible de modifier la disponibilité du contrôle.');
  return ret({ok:true,active});
 }
 if(action==='teacher_reset_pin'){
  const {data:access}=await admin.from('cortex_academy_access').select('roster_size').eq('assessment_id',id).maybeSingle();
  const number=Number(body.student_number);
  if(!access||!Number.isInteger(number)||number<1||number>access.roster_size)throw Error('Numéro élève invalide.');
  if(assessment.class_id){
   return ret({ok:true,...await resetClassPin(teacher,assessment.class_id,number),class_id:assessment.class_id});
  }
  return ret({ok:true,...await resetPin(id,number)});
 }
 if(action==='teacher_upload'){
  const file=form?.get('file');
  if(!(file instanceof File))throw Error('Sélectionnez un fichier.');
  const fileMeta=checkedFile(file);
  await ensureAccess(assessment);
  const path='subjects/'+teacher.id+'/'+id+'/'+random(14)+'.'+fileMeta.ext;
  await upload(file,path);
  const {error}=await admin.from('cortex_academy_access').update({subject_path:path,subject_name:fname(file),subject_mime:fileMeta.type,updated_at:new Date().toISOString()}).eq('assessment_id',id).eq('teacher_id',teacher.id);
  if(error){await admin.storage.from(BUCKET).remove([path]);throw Error('Document envoyé, mais association au contrôle impossible.');}
  return ret({ok:true,name:fname(file)});
 }
 if(action==='teacher_file'){
  const kind=String(body.kind||'');
  let path,name;
  if(kind==='subject'){
   const {data:access}=await admin.from('cortex_academy_access').select('subject_path,subject_name').eq('assessment_id',id).maybeSingle();
   path=access?.subject_path;name=access?.subject_name;
  }else if(kind==='submission'){
   const number=Number(body.student_number);
   if(!Number.isInteger(number)||number<1||number>60)throw Error('Numéro élève invalide.');
   const {data:submission}=await admin.from('cortex_academy_submissions').select('file_path,file_name').eq('assessment_id',id).eq('teacher_id',teacher.id).eq('student_number',number).maybeSingle();
   path=submission?.file_path;name=submission?.file_name;
  }else throw Error('Document demandé inconnu.');
  if(!path)throw Error('Aucun document disponible.');
  return ret({ok:true,url:await signed(path,90),name});
 }
 if(action==='teacher_grade'){
  const num=Number(body.student_number),grade=Number(body.grade);
  const feedback=String(body.feedback||'').trim();
  if(!Number.isInteger(num)||num<1||num>60||!Number.isFinite(grade)||grade<0||grade>20||feedback.length>4000)throw Error('La note doit être comprise entre 0 et 20 et le commentaire limité à 4000 caractères.');
  const payload={grade,feedback,graded_at:new Date().toISOString()};
  if(body.release===true)payload.released_at=new Date().toISOString();
  else payload.released_at=null;
  const {data,error}=await admin.from('cortex_academy_submissions').update(payload).eq('assessment_id',id).eq('teacher_id',teacher.id).eq('student_number',num).select('id').maybeSingle();
  if(error||!data)throw Error('Copie introuvable ou correction impossible.');
  return ret({ok:true,released:!!payload.released_at});
 }
 throw Error('Action professeur inconnue.');
}
async function studentAction(action,body,form){
 if(action==='student_classes'){
  // Les noms de classe sont publics ; aucune identité d'élève, note ou PIN n'est renvoyé.
  const {data:access,error}=await admin.from('cortex_academy_class_access').select('class_id,portal_code,roster_size,teacher_id').eq('active',true).limit(1000);
  if(error)throw Error('Liste des classes inaccessible.');
  if(!access?.length)return ret({ok:true,classes:[]});
  const ids=access.map(x=>x.class_id);
  const {data:classes,error:clsError}=await admin.from('cortex_teacher_classes').select('id,code,display_name,archived').in('id',ids);
  if(clsError)throw Error('Liste des classes inaccessible.');
  const byId=new Map((classes||[]).filter(c=>!c.archived).map(c=>[c.id,c]));
  const list=access.filter(x=>byId.has(x.class_id)).map(x=>({
   code:x.portal_code,label:String(byId.get(x.class_id).code||byId.get(x.class_id).display_name).slice(0,45),
   display_name:String(byId.get(x.class_id).display_name||'').slice(0,80),suffix:x.portal_code.slice(-4).toUpperCase()
  })).sort((a,b)=>a.label.localeCompare(b.label,'fr')).slice(0,1000);
  return ret({ok:true,classes:list});
 }
 if(action==='student_class_login'){
  const portal=String(body.class_code||'').toLowerCase(),number=Number(body.student_number),plain=String(body.pin||'');
  if(!/^[a-f0-9]{16}$/.test(portal)||!Number.isInteger(number)||number<1||number>60||!/^\d{6}$/.test(plain))throw Error('Classe, numéro ou PIN incorrect.');
  const {data:access}=await admin.from('cortex_academy_class_access').select('*').eq('portal_code',portal).eq('active',true).maybeSingle();
  if(!access)throw Error('Classe, numéro ou PIN incorrect.');
  await verifyClassPin(access,number,plain);
  const token=random(32);
  const {error}=await admin.from('cortex_academy_class_sessions').insert({token_digest:await digest(token),class_id:access.class_id,student_number:number,expires_at:new Date(Date.now()+8*3600000).toISOString()});
  if(error)throw Error('Impossible d’ouvrir votre espace élève.');
  return ret({ok:true,session:token,student_number:number});
 }
 if(action==='student_class_list'){
  const {session,access}=await activeClassStudent(String(body.session||''));
  const [exams,links,submissions,cl]=await Promise.all([
   admin.from('cortex_teacher_assessments').select('id,title,published,created_at').eq('class_id',access.class_id).eq('teacher_id',access.teacher_id).order('created_at',{ascending:false}),
   admin.from('cortex_academy_access').select('assessment_id,active').eq('teacher_id',access.teacher_id),
   admin.from('cortex_academy_submissions').select('assessment_id,submitted_at,grade,feedback,released_at').eq('teacher_id',access.teacher_id).eq('student_number',session.student_number),
   admin.from('cortex_teacher_classes').select('code,display_name').eq('id',access.class_id).eq('teacher_id',access.teacher_id).maybeSingle()
  ]);
  if(exams.error||links.error||submissions.error||cl.error)throw Error('Impossible de récupérer vos contrôles.');
  const byAccess=new Map((links.data||[]).map(x=>[x.assessment_id,x]));
  const bySubmission=new Map((submissions.data||[]).map(x=>[x.assessment_id,x]));
  const cards=(exams.data||[]).map(e=>{
   const submitted=bySubmission.get(e.id),link=byAccess.get(e.id);
   if(!((e.published&&link?.active)||submitted))return null;
   return {id:e.id,title:e.title,available:!!(e.published&&link?.active),
    submitted_at:submitted?.submitted_at||null,released:!!submitted?.released_at,
    grade:submitted?.released_at?submitted.grade:null,feedback:submitted?.released_at?submitted.feedback:null};
  }).filter(Boolean);
  return ret({ok:true,class:{code:cl.data?.code||'Classe',name:cl.data?.display_name||'Classe'},
   student_number:session.student_number,assessments:cards});
 }
 if(action==='student_login'){
  const code=String(body.code||''),number=Number(body.student_number),plain=String(body.pin||'');
  if(!/^[a-f0-9]{40}$/.test(code)||!Number.isInteger(number)||number<1||number>60||!/^\d{6}$/.test(plain))throw Error('Numéro ou PIN invalide.');
  const {data:access}=await admin.from('cortex_academy_access').select('assessment_id,roster_size,active').eq('join_code',code).eq('active',true).maybeSingle();
  if(!access||number>access.roster_size)throw Error('Numéro ou PIN invalide.');
  const {data:assessment}=await admin.from('cortex_teacher_assessments').select('id,published').eq('id',access.assessment_id).eq('published',true).maybeSingle();
  if(!assessment)throw Error('Contrôle indisponible.');
  const {data:classExam}=await admin.from('cortex_teacher_assessments').select('class_id,teacher_id').eq('id',access.assessment_id).maybeSingle();
  let classVerified=false;
  if(classExam?.class_id){
   const {data:schoolClass}=await admin.from('cortex_academy_class_access').select('*').eq('class_id',classExam.class_id).eq('teacher_id',classExam.teacher_id).eq('active',true).maybeSingle();
   if(schoolClass){
    await verifyClassPin(schoolClass,number,plain);
    classVerified=true;
   }
  }
  const {data:cred}=classVerified?{data:null}:await admin.from('cortex_academy_roster').select('*').eq('assessment_id',access.assessment_id).eq('student_number',number).maybeSingle();
  if(!cred&&!classVerified)throw Error('Numéro ou PIN invalide.');
  if(!classVerified&&cred.locked_until&&new Date(cred.locked_until)>new Date())throw Error('Trop de tentatives. Réessayez plus tard ou demandez un nouveau PIN au professeur.');
  const good=await pinHash(access.assessment_id,number,plain);
  if(!classVerified&&cred.pin_digest!==good){
   const tries=Number(cred.attempts||0)+1;
   await admin.from('cortex_academy_roster').update({attempts:tries>=5?0:tries,locked_until:tries>=5?new Date(Date.now()+900000).toISOString():null}).eq('assessment_id',access.assessment_id).eq('student_number',number);
   throw Error('Numéro ou PIN invalide.');
  }
  if(!classVerified)await admin.from('cortex_academy_roster').update({attempts:0,locked_until:null}).eq('assessment_id',access.assessment_id).eq('student_number',number);
  const token=random(32);
  const {error}=await admin.from('cortex_academy_sessions').insert({token_digest:await digest(token),assessment_id:access.assessment_id,student_number:number,expires_at:new Date(Date.now()+8*3600000).toISOString()});
  if(error)throw Error('Ouverture de session élève impossible.');
  return ret({ok:true,session:token,student_number:number});
 }
 const {session,access,assessment}=await activeStudent(String(body.session||''),String(body.assessment_id||''));
 const {data:submission,error:getErr}=await admin.from('cortex_academy_submissions').select('id,answers,file_name,submitted_at,grade,feedback,graded_at,released_at').eq('assessment_id',assessment.id).eq('student_number',session.student_number).maybeSingle();
 if(getErr)throw Error('Impossible de consulter votre copie.');
 if(action==='student_get'){
  const raw=assessment.content||{},questions=Array.isArray(raw.questions)?raw.questions.slice(0,40):[];
  const show=!!submission?.released_at;
  return ret({ok:true,assessment:{id:assessment.id,title:assessment.title,description:String(raw.description||'').slice(0,12000),
    questions:questions.map(q=>({id:String(q.id||''),prompt:String(q.prompt||''),points:Number(q.points||0)})),antiCheat:raw.antiCheat||{}},
    student_number:session.student_number,subject:access.subject_path?{name:access.subject_name,url:await signed(access.subject_path,120)}:null,
    submission:submission?{submitted_at:submission.submitted_at,answers:submission.answers,file_name:submission.file_name,graded:show,grade:show?submission.grade:null,feedback:show?submission.feedback:null}:null});
 }
 if(action==='student_submit'){
  if(!access.active||!assessment.published)throw Error('Le contrôle est fermé aux nouvelles remises.');
  if(submission)throw Error('Votre copie a déjà été remise. Elle ne peut plus être modifiée.');
  let answers;
  try{answers=JSON.parse(String(body.answers||'{}'))}catch{throw Error('Réponses illisibles.')}
  if(!answers||typeof answers!=='object'||Array.isArray(answers)||Object.keys(answers).length>40||JSON.stringify(answers).length>22000)throw Error('Réponses trop volumineuses.');
  const clean={};
  for(const [key,val] of Object.entries(answers)){
   if(!/^[\da-z_-]{1,45}$/i.test(key)||typeof val!=='string'||val.length>6000)throw Error('Une réponse dépasse la limite autorisée.');
   clean[key]=val;
  }
  const file=form?.get('file'),hasFile=file instanceof File&&file.size>0;
  if(!Object.values(clean).some(x=>x.trim())&&!hasFile)throw Error('Rédigez au moins une réponse ou joignez un fichier.');
  let path=null,name=null;
  if(hasFile){
   const meta=checkedFile(file);
   path='submissions/'+assessment.id+'/'+session.student_number+'/'+random(16)+'.'+meta.ext;
   await upload(file,path);name=fname(file);
  }
  const {error}=await admin.from('cortex_academy_submissions').insert({assessment_id:assessment.id,teacher_id:access.teacher_id,student_number:session.student_number,answers:clean,file_path:path,file_name:name});
  if(error){
   if(path)await admin.storage.from(BUCKET).remove([path]);
   throw Error('La copie ne peut pas être enregistrée. Si vous avez déjà rendu, rechargez la page.');
  }
  return ret({ok:true,submitted:true});
 }
 if(action==='student_event'){
  const kind=String(body.kind||'');
  if(!['paste_blocked','copy_blocked','tab_hidden'].includes(kind))throw Error('Événement inconnu.');
  if(!assessment.content?.antiCheat?.enabled)return ret({ok:true,recorded:false});
  const {data:recent}=await admin.from('cortex_integrity_events').select('id')
    .eq('assessment_id',assessment.id).eq('roster_number',session.student_number).eq('kind',kind).gt('occurred_at',new Date(Date.now()-30000).toISOString()).limit(1);
  if(recent?.length)return ret({ok:true,recorded:false});
  const duration=kind==='tab_hidden'?Math.min(3600000,Math.max(0,Number(body.duration_ms)||0)):null;
  const {error}=await admin.from('cortex_integrity_events').insert({teacher_id:access.teacher_id,assessment_id:assessment.id,class_id:assessment.class_id,roster_number:session.student_number,kind,duration_ms:duration});
  if(error)throw Error('Journal temporairement inaccessible.');
  return ret({ok:true,recorded:true});
 }
 throw Error('Action élève inconnue.');
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, apikey, x-client-info','Access-Control-Max-Age':'3600','Vary':'Origin'}});
 if(req.method!=='POST')return fail('Méthode refusée.',405);
 if(req.headers.get('origin')&&req.headers.get('origin')!==ORIGIN)return fail('Origine non autorisée.',403);
 try{
  if(!URL||!SECRET)throw Error('Service temporairement indisponible.');
  const {action,body,form}=await input(req);
  if(action.startsWith('teacher_'))return await teacherAction(action,body,form,req);
  if(action.startsWith('student_'))return await studentAction(action,body,form);
  return fail('Action non prise en charge.',404);
 }catch(err){const msg=String(err?.message||'Une erreur est survenue.').slice(0,250);return fail(msg,/connexion|confirmé|obligatoire|expiré/i.test(msg)?401:400)}
});
