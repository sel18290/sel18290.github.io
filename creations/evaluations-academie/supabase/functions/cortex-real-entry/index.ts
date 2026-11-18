/* Portail CORTEX Académie — accès de prévisualisation avant autorisations institutionnelles.
 * Le mot de passe n'est ni dans GitHub ni dans ce fichier : vérification du hash salé
 * dans Supabase, avec quotas. Ce n'est PAS une authentification de données :
 * Supabase Auth et les règles serveur restent l'unique contrôle des données réelles.
 */
import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
const origin='https://sel18290.github.io';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'apikey, authorization, content-type, x-client-info','Cache-Control':'no-store','Vary':'Origin'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({ok:false,error:'Méthode non autorisée.'},405);
 if(req.headers.get('origin')!==origin)return json({ok:false,error:'Origine non autorisée.'},403);
 try{
  const body=await req.text();
  if(body.length>250)return json({ok:false,error:'Demande invalide.'},400);
  let input:any;try{input=JSON.parse(body)}catch{return json({ok:false,error:'Demande illisible.'},400)}
  if(!input||Object.keys(input).sort().join(',')!=='action,password'||input.action!=='verify'||
      typeof input.password!=='string'||input.password.length<1||input.password.length>90)
   return json({ok:false,error:'Mot de passe invalide.'},400);
  const {data:allowed,error:quotaError}=await db.rpc('cortex_real_entry_claim_slot');
  if(quotaError)return json({ok:false,error:'Vérification momentanément indisponible.'},503);
  if(allowed!==true)return json({ok:false,error:'Trop de tentatives rapprochées. Réessaie ultérieurement.'},429);
  const {data:valid,error:checkError}=await db.rpc('cortex_real_entry_verify',{p_password:input.password});
  if(checkError)return json({ok:false,error:'Impossible de vérifier le code d’accès.'},503);
  return json({ok:true,allowed:valid===true,message:valid===true?'Accès de prévisualisation autorisé.':'Mot de passe incorrect.'});
 }catch(err){
  console.error('CortexRealEntry.failure',String(err).slice(0,65));
  return json({ok:false,error:'Service d’accès indisponible.'},503);
 }
});