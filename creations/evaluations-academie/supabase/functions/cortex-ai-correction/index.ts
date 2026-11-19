// CORTEX Évaluations : brouillon de correction IA, jamais publié sans l'enseignant.
import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
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
   // Fractionner les contrôles longs : Albert doit traiter chaque question.
  // Trois petits lots sont plus fiables qu'un JSON de 21 corrections tronqué.
  const chunks:any[][]=[];
  for(let i=0;i<items.length;i+=8)chunks.push(items.slice(i,i+8));
  const batchResults=await Promise.all(chunks.map(async(batch:any[])=>{
   const context=JSON.stringify({
    discipline:'PSE lycée professionnel',titre:exam.title,
    contexte:clean(exam.content?.description,2000),
    document_commun:clean(exam.content?.doc,10000),questions:batch
   });
   const upstream=await fetch('https://albert.api.etalab.gouv.fr/v1/chat/completions',{
    method:'POST',signal:AbortSignal.timeout(93000),
    headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
    body:JSON.stringify({model:Deno.env.get('ALBERT_MODEL')||'openai/gpt-oss-120b',
     messages:[{role:'system',content:instructions},{role:'user',content:context}],
     temperature:0.1,max_tokens:5200,stream:false})
   });
   if(!upstream.ok)throw new Error('Albert a refusé la correction ('+upstream.status+').');
   const response=await upstream.json();
   const rawContent=response?.choices?.[0]?.message?.content;
   const txt=(typeof rawContent==='string'?rawContent:
     Array.isArray(rawContent)?rawContent.map((x:any)=>x?.text||'').join(''):'').trim();
   const open=txt.indexOf('{'),close=txt.lastIndexOf('}');
   let parsed:any;try{parsed=JSON.parse(txt.slice(open,close+1))}catch{throw new Error('La correction Albert n’est pas lisible. Relance-la.')}
   if(!Array.isArray(parsed?.questions)||parsed.questions.length!==batch.length)
    throw new Error('Albert n’a pas traité toutes les questions du lot.');
   return parsed;
  }));
  const parsed={commentaire:batchResults.map(x=>String(x.commentaire||'').trim()).filter(Boolean).join(' ').slice(0,3000),
    questions:batchResults.flatMap(x=>x.questions)};
  if(parsed.questions.length!==items.length)
   return fail('Correction Albert incomplète : aucun brouillon enregistré.',502);
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
   feedback:String(parsed.commentaire||'').slice(0,3000),questions:marks,warning:'Brouillon Albert IA non enregistré. Vérification de toutes les questions et des documents du PDF, Word ou des images par le professeur obligatoire.'});
 }catch(e){
  return fail(e instanceof Error&&e.message==='barème'?'La réponse IA ne respecte pas le barème.':e instanceof Error&&e.message.startsWith('Albert')?e.message:'Erreur de correction Albert IA. Aucune note modifiée.',502);
 }
});