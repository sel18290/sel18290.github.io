/* Assistant Albert public sur CORTEX DEMONSTRATION : aucune donnée élève, copie ou secret. */
import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
const origin='https://sel18290.github.io';
const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{autoRefreshToken:false,persistSession:false}});
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type, apikey, authorization, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
const send=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
const fail=(error:string,status=400)=>send({ok:false,error},status);
const clean=(s:unknown,n:number)=>String(s??'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const pii=(s:string)=>/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(s)||/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/.test(s)||/sk-[a-z0-9]{14,}/i.test(s);
const screens=['accueil','tableau-prof','classes','mes-controles','creer','import','copies','publication','qr','eleve','carnet','correction','autre'];
const site=[
 'CORTEX est un site de démonstration avec des données fictives, distinct de CORTEX Académie réel.',
 'Professeur : Mes classes, Mes contrôles, Créer un contrôle, Importer PDF / Word, Copies & notes, anti-triche, QR codes et publication.',
 'Créer un contrôle : titre, classe, niveau, chapitre, durée ; ajouter des questions, types de réponses et barèmes.',
 'Document associé : une image collée avec Windows + Maj + S puis Ctrl+V, une image choisie, ou un texte ; chaque question a ses propres documents.',
 'Mes contrôles : modifier, dupliquer, tester en aperçu élève avec chrono, publier pour classe entière ou groupe 1 ou 2 après confirmation.',
 'Import : atelier classique ou Albert IA pour proposer questions, barèmes et documents PDF, notamment images, tableaux et schémas.',
 'Élève : tester sans compte le contrôle fictif PSE sur le sommeil (20 questions) ; carnet Mon CORTEX pour voir copies corrigées, révisions et estimation fictive en attendant le professeur.',
 'Dans la démonstration, les copies et notes sont fictives et locales ; ne pas utiliser de vraies données élèves.',
 'Tu aides à comprendre et à naviguer ; ne prétends pas effectuer une action administrative ou enregistrer une donnée. Donne des chemins de menu précis.'
].join('\n');
const fictive=[
 'Profil scolaire entièrement FICTIF : élève de seconde professionnelle, carnet d’exemple avec douze évaluations publiées (11 à 18 sur 20).',
 'Notions évaluées : sommeil et rythmes biologiques, prévention des risques, alimentation, stress et santé.',
 'Difficultés fictives récurrentes : argumenter avec un document, ajouter un exemple professionnel, expliquer une démarche de prévention.',
 'Prépare exactement trois conseils pédagogiques personnalisés. Ne donne pas de note supplémentaire et ne prétends pas analyser un véritable élève.'
].join('\n');
async function requestAlbert(kind:string,prompt:string){
 const key=Deno.env.get('ALBERT_API_KEY');if(!key)throw Error('NO_KEY');
 const system=kind==='teacher_help'?
  'Tu es Albert, assistant du PROFESSEUR pour CORTEX Démonstration. Réponds en français en 3 à 6 phrases précises, chaleureuses et pratiques, sans inventer de fonctions et sans traiter de données personnelles. Manuel du site :\n'+site:
  'Tu es Albert, tuteur PSE du carnet fictif. Réponds UNIQUEMENT en JSON {"tips":[{"title":"titre","advice":"2 phrases utiles","topic":"notion"}]} avec EXACTEMENT trois objets différents et des conseils précis, positifs, sans inventer de diagnostic.\n'+fictive;
 let res:Response;
 try{res=await fetch('https://albert.api.etalab.gouv.fr/v1/chat/completions',{
  method:'POST',signal:AbortSignal.timeout(47000),
  headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify({model:Deno.env.get('ALBERT_MODEL')||'openai/gpt-oss-120b',stream:false,max_tokens:950,
   messages:[{role:'system',content:system},{role:'user',content:prompt}]})
 })}catch{throw Error('TIMEOUT')}
 if(!res.ok){console.error('AlbertGuide.status',res.status);throw Error('MODEL_UNAVAILABLE')}
 const response:any=await res.json(),raw=response?.choices?.[0]?.message?.content;
 const msg=(typeof raw==='string'?raw:Array.isArray(raw)?raw.map((p:any)=>p.text||'').join(''):'').trim();
 if(kind==='teacher_help'){if(msg.length<12)throw Error('FORMAT');return {answer:clean(msg,1600)}}
 let result:any;try{
  const first=msg.indexOf('{'),last=msg.lastIndexOf('}');
  result=JSON.parse(msg.slice(first,last+1));
 }catch{throw Error('FORMAT')}
 if(!Array.isArray(result.tips)||result.tips.length<3)throw Error('FORMAT');
 const tips=result.tips.slice(0,3).map((t:any)=>({title:clean(t.title,80),advice:clean(t.advice,420),topic:clean(t.topic,80)}));
 if(tips.some((t:any)=>t.title.length<4||t.advice.length<25))throw Error('FORMAT');
 return {tips};
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return fail('Méthode non autorisée.',405);
 if(req.headers.get('origin')!==origin)return fail('Origine non autorisée.',403);
 try{
  const raw=await req.text();if(raw.length>2500)return fail('Demande trop longue.',413);
  let body:any;try{body=JSON.parse(raw)}catch{return fail('Requête illisible.')}
  if(!body||typeof body!=='object'||Array.isArray(body))return fail('Demande invalide.');
  const keys=Object.keys(body).sort().join(',');
  if(body.action==='report_bug'){
   if(keys!=='action,description,interface,screen')return fail('Demande incorrecte.');
   const description=clean(body.description,1501),screen=clean(body.screen,90),role=body.interface;
   if(!screens.includes(screen)||!['professeur','eleve','autre'].includes(role)||description.length<20||description.length>1500)
    return fail('Décris le bug (20 à 1500 caractères), sans données personnelles.',422);
   if(pii(description))return fail('Retire les coordonnées personnelles et clés secrètes du signalement.',422);
   const {data:allowed,error:limit}=await db.rpc('cortex_demo_bug_claim_slot');
   if(limit)return fail('Protection du signalement indisponible.',503);
   if(allowed!==true)return fail('Trop de signalements momentanément. Réessaie plus tard.',429);
   const {data,error}=await db.from('cortex_demo_bug_reports').insert({interface:role,screen,description}).select('id').single();
   if(error||!data)return fail('Impossible de transmettre ce signalement à l’administrateur.',503);
   return send({ok:true,reference:String(data.id).slice(0,8)});
  }
  if(body.action!=='teacher_help'&&body.action!=='student_tips')return fail('Action non reconnue.');
  if(body.action==='teacher_help'&&keys!=='action,message,screen')return fail('Demande invalide.');
  if(body.action==='student_tips'&&keys!=='action')return fail('Demande invalide.');
  const message=clean(body.message,501),screen=clean(body.screen||'autre',90);
  if(body.action==='teacher_help'&&(!screens.includes(screen)||message.length<5||message.length>500))
   return fail('Pose une question de 5 à 500 caractères sur le site.',422);
  if(body.action==='teacher_help'&&pii(message))return fail('N’envoie aucune donnée personnelle à Albert.',422);
  if(!Deno.env.get('ALBERT_API_KEY'))return fail('La clé Albert est absente du serveur.',503);
  const {data:quota,error:quotaError}=await db.rpc('cortex_albert_demo_claim_slot');
  if(quotaError)return fail('Protection du quota Albert indisponible.',503);
  if(quota!==true)return fail('Albert est occupé : un appel toutes les 20 secondes, 24 par jour pour toute la démo.',429);
  try{
   const out=await requestAlbert(body.action,
    body.action==='teacher_help'?'Page '+screen+' ; question du professeur : '+message:
    'Propose maintenant trois aides de révision à l’élève fictif à partir du profil indiqué.');
   return send({ok:true,provider:'Albert API',demo:true,...out});
  }catch(e){
   const kind=e instanceof Error?e.message:'UNKNOWN';
   console.error('AlbertGuide.error',kind);
   return fail(kind==='TIMEOUT'?'Albert n’a pas répondu dans le délai prévu.':
    kind==='FORMAT'?'Albert a répondu, mais le format des conseils est incomplet.':
    'Albert n’est pas disponible pour le moment.',502);
  }
 }catch(e){console.error('AlbertGuide.unexpected',String(e).slice(0,75));return fail('Erreur technique du guide Albert.',503)}
});