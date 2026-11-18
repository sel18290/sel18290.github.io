/* CORTEX STATION NOCTIS — audience anonyme et présence
   - Comptage des sessions de navigation depuis activation, pas des personnes uniques
   - "En orbite" = sessions vues dans les deux dernières minutes
   - Pas de cookies, de collecte d'IP par ce code, de noms ou de parcours utilisateurs
   - Service role sur le serveur exclusivement ; tables fermées avec RLS
*/
import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
const origin='https://sel18290.github.io';
const cors={
 'Access-Control-Allow-Origin':origin,
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Access-Control-Allow-Headers':'content-type, apikey, x-client-info',
 'Cache-Control':'no-store',
 'Vary':'Origin'
};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,
 headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{
 auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({ok:false,error:'Méthode non autorisée.'},405);
 if(req.headers.get('origin')!==origin)return json({ok:false,error:'Origine non autorisée.'},403);
 try{
  const input=await req.text();
  if(input.length>160)return json({ok:false,error:'Demande invalide.'},413);
  let body:any;try{body=JSON.parse(input)}catch{return json({ok:false,error:'Format non reconnu.'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body)||
    Object.keys(body).sort().join(',')!=='action,sessionId'||body.action!=='pulse'||
    typeof body.sessionId!=='string'||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.sessionId))
   return json({ok:false,error:'Session non valide.'},422);
  const {data,error}=await db.rpc('cortex_traffic_touch',{p_session_id:body.sessionId});
  if(error||!data||!Number.isFinite(Number(data.visits))||!Number.isFinite(Number(data.online))){
   console.error('CortexTraffic.rpcFailure',error?.code||'NO_RESULT');
   return json({ok:false,error:'Statistiques temporairement indisponibles.'},503);
  }
  return json({ok:true,visits:Math.max(0,Number(data.visits)),online:Math.max(0,Number(data.online)),
   since:String(data.since||''),presenceMinutes:2,metric:'anonymous_sessions'});
 }catch(e){
  console.error('CortexTraffic.failure',e instanceof Error?e.name:'UNKNOWN');
  return json({ok:false,error:'Compteurs momentanément indisponibles.'},503);
 }
});