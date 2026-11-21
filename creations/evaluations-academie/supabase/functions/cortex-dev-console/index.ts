/* CORTEX · console développeur : confidentialité des usages et accès privé.
 * Aucune copie, aucun nom d'élève, aucune question IA en clair n'est enregistré.
 * Compteurs agrégés par jour ; le chiffre "visiteurs" désigne des sessions anonymes.
 */
import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
const ORIGIN='https://sel18290.github.io';
const cors={
 'Access-Control-Allow-Origin':ORIGIN,
 'Access-Control-Allow-Headers':'content-type, apikey, authorization, x-client-info',
 'Access-Control-Allow-Methods':'POST,OPTIONS',
 'Cache-Control':'no-store','Vary':'Origin'
};
const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{
 auth:{persistSession:false,autoRefreshToken:false}});
const encoder=new TextEncoder();
const SALT='a179008854c8a94a51824a759c3036b14732543f';
const PASSWORD_PBKDF2='00285a6a4de2a38c5b19375fa855291f71616310270e6c171b74764507633bb6';
const KDF_ITERATIONS=240000;
const EVENT_KINDS=new Set(['pfmp_open','pfmp_search','pfmp_cv','pfmp_contact','pfmp_albert','custom_sector']);
const CATEGORY={
 pfmp_open:new Set(['ouverture']),
 pfmp_search:new Set(['commerce-vente','accueil','gestion-administration','personnalisee']),
 pfmp_cv:new Set(['cv','lettre','atelier']),
 pfmp_contact:new Set(['candidature']),
 pfmp_albert:new Set(['recherche','conseils','cv','contact','chat','creation']),
 custom_sector:null
};
const hexToBytes=(value:string)=>Uint8Array.from(value.match(/.{2}/g)??[],x=>parseInt(x,16));
const toHex=(bytes:Uint8Array)=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
function safeLabel(value:unknown){
 const name=String(value??'').trim().replace(/\s+/g,' ');
 if(name.length<3||name.length>65||!/^[-\p{L}\p{M}0-9 .()'’/&]+$/u.test(name))return '';
 if(/[\w.+-]+@[\w.-]+\.|(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/i.test(name))return '';
 return name;
}
async function comparePassword(value:string){
 const key=await crypto.subtle.importKey('raw',encoder.encode(value),'PBKDF2',false,['deriveBits']);
 const result=new Uint8Array(await crypto.subtle.deriveBits({
  name:'PBKDF2',salt:hexToBytes(SALT),iterations:KDF_ITERATIONS,hash:'SHA-256'
 },key,256));
 const reference=hexToBytes(PASSWORD_PBKDF2);
 let different=result.length^reference.length;
 for(let i=0;i<result.length;i++)different|=result[i]^reference[i];
 return different===0;
}
async function signingKey(){
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret)throw Error('Signing key not configured');
 return await crypto.subtle.importKey('raw',encoder.encode('CORTEX_DEV_CONSOLE_V1|'+secret),
  {name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
function b64(bytes:Uint8Array){
 let s='';for(const byte of bytes)s+=String.fromCharCode(byte);
 return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromB64(x:string){
 const source=x.replace(/-/g,'+').replace(/_/g,'/');
 const raw=atob(source.padEnd(Math.ceil(source.length/4)*4,'='));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function issueToken(){
 const now=Date.now();
 const payload=b64(encoder.encode(JSON.stringify({
  v:1,iat:now,exp:now+90*60*1000,n:b64(crypto.getRandomValues(new Uint8Array(16)))
 })));
 const signature=await crypto.subtle.sign('HMAC',await signingKey(),encoder.encode(payload));
 return payload+'.'+b64(new Uint8Array(signature));
}
async function verifyToken(token:unknown){
 if(typeof token!=='string'||token.length>550||!token.match(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/))return false;
 try{
  const [payload,signature]=token.split('.');
  const valid=await crypto.subtle.verify('HMAC',await signingKey(),fromB64(signature),encoder.encode(payload));
  if(!valid)return false;
  const info=JSON.parse(new TextDecoder().decode(fromB64(payload)));
  return info?.v===1&&Number.isFinite(info.iat)&&Number.isFinite(info.exp)&&
    info.exp>Date.now()&&info.exp-info.iat<=91*60*1000&&info.iat<=Date.now()+30000;
 }catch{return false}
}
async function gather(days:number){
 const since=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'})
  .format(new Date(Date.now()-(days-1)*86400000));
 const [rows,total,online]=await Promise.all([
  db.from('cortex_dev_events').select('day,kind,category,source,hits')
   .gte('day',since).order('day',{ascending:false}).limit(5000),
  db.from('cortex_traffic_totals').select('session_visits,first_active_at').eq('id',1).maybeSingle(),
  db.from('cortex_traffic_sessions').select('session_id',{head:true,count:'exact'})
   .gte('last_seen',new Date(Date.now()-120000).toISOString())
 ]);
 if(rows.error||total.error||online.error)throw Error('Statistiques indisponibles');
 const events=(rows.data||[]).map(x=>({
  day:String(x.day),kind:String(x.kind),category:String(x.category),
  source:String(x.source),hits:Number(x.hits)||0
 }));
 return {
  days,since,visits:Number(total.data?.session_visits||0),
  sinceTraffic:total.data?.first_active_at||null,
  online:Number(online.count||0),
  meaning:'Sessions de navigation, pas des personnes uniques ; événements anonymes comptés à partir de leur activation.',
  events
 };
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return respond({ok:false,error:'Méthode non autorisée'},405);
 if(req.headers.get('origin')!==ORIGIN)return respond({ok:false,error:'Origine non autorisée'},403);
 try{
  const raw=await req.text();
  if(raw.length>1800)return respond({ok:false,error:'Requête trop longue'},413);
  let body:any;try{body=JSON.parse(raw)}catch{return respond({ok:false,error:'Requête incorrecte'},400)}
  if(!body||Array.isArray(body)||typeof body!=='object')return respond({ok:false,error:'Requête incorrecte'},400);
  if(body.action==='event'){
   if(Object.keys(body).sort().join(',')!=='action,category,kind,source')return respond({ok:false},400);
   const kind=String(body.kind||''),source=String(body.source||''),category=String(body.category||'');
   if(!EVENT_KINDS.has(kind)||!['demo','real'].includes(source))return respond({ok:false},422);
   if(kind==='custom_sector'?!safeLabel(category):!CATEGORY[kind as keyof typeof CATEGORY]?.has(category))
    return respond({ok:false},422);
   const {error}=await db.rpc('cortex_dev_event_increment',{
    p_kind:kind,p_category:category,p_source:source});
   return error?respond({ok:false},503):respond({ok:true},200);
  }
  if(body.action==='login'){
   if(Object.keys(body).sort().join(',')!=='action,password'||typeof body.password!=='string'||
      body.password.length<8||body.password.length>128)
    return respond({ok:false,error:'Identifiants invalides.'},401);
   const match=await comparePassword(body.password);
   const {data:allowed,error}=await db.rpc('cortex_dev_login_gate',{p_correct:match});
   if(error)return respond({ok:false,error:'Authentification temporairement indisponible.'},503);
   if(!allowed)return respond({ok:false,error:'Mot de passe incorrect ou accès temporairement bloqué.'},401);
   return respond({ok:true,token:await issueToken(),expiresIn:5400});
  }
  if(body.action==='stats'){
   if(Object.keys(body).sort().join(',')!=='action,days,token')return respond({ok:false},400);
   if(!(await verifyToken(body.token)))return respond({ok:false,error:'Session expirée. Reconnecte-toi.'},401);
   const days=[7,30,90].includes(body.days)?body.days:30;
   return respond({ok:true,stats:await gather(days)});
  }
  return respond({ok:false,error:'Action inconnue'},404);
 }catch(error){
  console.error('CortexDevConsole.failure',error instanceof Error?error.name:'UNKNOWN');
  return respond({ok:false,error:'Console momentanément indisponible.'},503);
 }
});