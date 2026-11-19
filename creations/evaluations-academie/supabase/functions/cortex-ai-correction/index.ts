// CORTEX Évaluations : brouillon de correction IA, jamais publié sans l'enseignant.
import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import {EVIDENCE_PROMPT,albertGroups,albertModel,documentText,mapGroups,prepareEvidence} from '../_shared/albert-evidence.ts';
const ORIGIN='https://sel18290.github.io',URL=Deno.env.get('SUPABASE_URL')||'',KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const db=createClient(URL,KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const cors={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
const json=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
const fail=(error:string,status=400)=>json({ok:false,error},status);
const isUuid=(s:unknown)=>typeof s==='string'&&/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(s);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return fail('Méthode non autorisée.',405);
 if(req.headers.get('origin')&&req.headers.get('origin')!==ORIGIN)return fail('Origine non autorisée.',403);
 try{
  const jwt=req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
  if(!jwt)return fail('Connexion professeur nécessaire.',401);
  const {data:{user},error:authError}=await db.auth.getUser(jwt);
  if(authError||!user||!user.email_confirmed_at||!user.email?.toLowerCase().endsWith('@ac-paris.fr'))return fail('Compte académique confirmé nécessaire.',403);
  const {data:profile}=await db.from('cortex_teacher_profiles').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!profile)return fail('Professeur non autorisé.',403);
  // Les tests envoient exclusivement une phrase fixe, sans aucune donnée scolaire.
  const raw=await req.text();
  if(raw.length>4000)return fail('Requête trop longue.',413);
  let body:any;try{body=JSON.parse(raw)}catch{return fail('Requête illisible.')}
  const apiKey=Deno.env.get('ALBERT_API_KEY')||'';
  if(body?.action==='test'){
   if(!apiKey)return fail('Secret ALBERT_API_KEY introuvable sur Supabase.',503);
   const upstream=await fetch('https://albert.api.etalab.gouv.fr/v1/chat/completions',{
    method:'POST',signal:AbortSignal.timeout(45000),
    headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
    body:JSON.stringify({model:Deno.env.get('ALBERT_MODEL')||'openai/gpt-oss-120b',
      messages:[{role:'user',content:'Test technique de connectivité sans données personnelles. Réponds brièvement OK.'}],
      max_tokens:128,stream:false})
   });
   if(!upstream.ok)return fail('Albert API a refusé le test (HTTP '+upstream.status+'). Vérifiez la clé et l’accès au modèle.',502);
   const result=await upstream.json();
   if(!Array.isArray(result?.choices)||!result.choices.length)return fail('Albert API n’a pas renvoyé de réponse exploitable.',502);
   return json({ok:true,status:'test',provider:'Albert API',message:'Albert a répondu depuis Supabase. Aucune copie ni donnée élève envoyée.'});
  }
  // L’envoi de données scolaires reste désactivé sans accord institutionnel.
  if(Deno.env.get('CORTEX_AI_ENABLED')!=='true')return fail('Albert IA non activé : accord de l’établissement et du DPO requis. Aucune copie transmise à l’IA.',503);
  if(!apiKey)return fail('Clé Albert API absente du serveur. Aucune copie transmise.',503);
  if(body?.action!=='draft')return fail('Action inconnue.',400);
  const number=Number(body?.student_number),assessmentId=body?.assessment_id;
  if(body?.action!=='draft'||!isUuid(assessmentId)||!Number.isInteger(number)||number<1||number>60)return fail('Copie invalide.');
  const {data:exam}=await db.from('cortex_teacher_assessments').select('id,title,teacher_id,content').eq('id',assessmentId).eq('teacher_id',user.id).maybeSingle();
  if(!exam)return fail('Contrôle introuvable.',404);
  const {data:copy}=await db.from('cortex_academy_submissions').select('answers,file_path').eq('assessment_id',assessmentId).eq('teacher_id',user.id).eq('student_number',number).maybeSingle();
  if(!copy)return fail('Copie introuvable.',404);
  if(copy.file_path)return fail('Cette copie contient un fichier joint non analysé. Correction IA indisponible pour éviter une note incomplète.',422);
  const evidence=prepareEvidence(exam,copy.answers);
  const {items,total}=evidence;
  const clean=documentText;
  const instructions=[
    'Tu proposes un brouillon de correction à un enseignant de lycée professionnel. Pour chaque question, confronte la réponse à la consigne, aux sources et à la correction confirmée du professeur.',
    EVIDENCE_PROMPT,
    'Accorde les points partiels à ce qui est juste et pertinent. Ne sanctionne pas un simple écart de formulation. Respecte l’unité demandée et le total maximal par question.',
    'Le commentaire cite un élément précis de la réponse, justifie les points puis donne un conseil actionnable. La réponse attendue cite les faits exacts des documents utiles.',
    'Si une question exige une source manquante ou illisible, ajoute son identifiant dans documents_insuffisants. N’en invente pas le contenu.',
    'JSON uniquement : {"commentaire":"appréciation courte","documents_insuffisants":[],"questions":[{"id":"id exact","points":0,"commentaire":"...","attendu":"...","conseil":"...","document":"repère réellement utilisé"}]}.',
    'Chaque identifiant attendu figure exactement une fois. Le professeur décide de la correction et de la note officielles.'
  ].join('\n');
  const payload={titre:clean(exam.title,180),contexte:clean(exam.content?.description,2000)};
  const groups=await albertGroups(db,evidence,payload,{batchSize:7});
  const batches=await mapGroups(groups,async group=>{
   const {content,vision}=await group.asMessage();
   const upstream=await fetch('https://albert.api.etalab.gouv.fr/v1/chat/completions',{
    method:'POST',signal:AbortSignal.timeout(60000),
    headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
    body:JSON.stringify({model:albertModel(vision),messages:[
     {role:'system',content:instructions},{role:'user',content}
    ],temperature:0.05,max_tokens:4700,stream:false})
   });
   if(!upstream.ok)throw Error('Albert API a refusé la demande ('+upstream.status+').');
   const response=await upstream.json();
   const raw=response?.choices?.[0]?.message?.content;
   const message=(typeof raw==='string'?raw:Array.isArray(raw)?raw.map((part:any)=>part?.text||'').join(''):'').trim();
   const open=message.indexOf('{'),close=message.lastIndexOf('}');
   let draft:any;
   try{draft=JSON.parse(message.slice(open,close+1))}
   catch{throw Error('La correction Albert est illisible. Relancez-la.')}
   if(Array.isArray(draft?.documents_insuffisants)&&draft.documents_insuffisants.length)
    throw Error('Un document associé est insuffisant pour corriger fidèlement cette copie.');
   if(!Array.isArray(draft?.questions)||draft.questions.length!==group.questions.length)
    throw Error('Albert n’a pas corrigé toutes les questions du lot.');
   return draft;
  });
  const parsed:any={
   commentaire:batches.map((x:any)=>String(x.commentaire||'').trim()).filter(Boolean).join(' ').slice(0,3000),
   questions:batches.flatMap((x:any)=>x.questions)
  };
  if(parsed.questions.length!==items.length)throw Error('La correction de certaines questions est manquante.');
  const marks=items.map((q:any)=>{
   const matched=parsed.questions.filter((a:any)=>a?.id===q.id);
   if(matched.length!==1)throw new Error('barème');
   const m=matched[0],mark=Number(m.points);
   if(!Number.isFinite(mark)||mark<0||mark>q.max||!String(m.commentaire||'').trim())
     throw new Error('barème');
   return {
    id:q.id,numero:q.numero,points:Math.round(mark*100)/100,max:q.max,
    commentaire:clean(m.commentaire,700),attendu:clean(m.attendu,650),
    conseil:clean(m.conseil,350),document:clean(m.document,180)
   };
  });
  const points=marks.reduce((sum:number,m:any)=>sum+m.points,0);
  return json({ok:true,provider:'Albert API',status:'draft',grade:Math.round(points/total*2000)/100,points:Math.round(points*100)/100,max:total,
   feedback:String(parsed.commentaire||'').slice(0,3000),questions:marks,warning:'Brouillon Albert IA non enregistré. Vérification et validation du professeur obligatoires.'});
 }catch(e){
  const message=e instanceof Error?e.message:'';
  if(/capture|document|trop volumineux/i.test(message))return fail(documentText(message,220),422);
  return fail(message==='barème'?'La réponse IA ne respecte pas le barème.':'Erreur de correction Albert IA. Aucune note modifiée.',502);
 }
});