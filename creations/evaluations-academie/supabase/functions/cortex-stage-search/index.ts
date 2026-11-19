/* CORTEX Recherche de stages — IGN & OpenStreetMap, classement Claude optionnel.
 * Les données affichées proviennent exclusivement d'établissements publics OSM.
 * Aucune information sur l'élève n'est envoyée à une IA.
 */
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.57.0";
const ORIGINS=["https://sel18290.github.io","http://localhost:5173","http://127.0.0.1:5173"];
const sectors={
 "gestion-administration":{name:"Gestion-administration",tags:[
 '["office"~"^(company|government|administrative|accountant|insurance|association|lawyer|employment_agency|notary|estate_agent)$"]',
 '["amenity"~"^(townhall|post_office|bank|social_facility|courthouse|community_centre|library)$"]']},
 "commerce-vente":{name:"Commerce et vente",tags:[
 '["shop"]["shop"!~"^(vacant|no|construction|closed)$"]',
 '["amenity"~"^(marketplace|bank|pharmacy)$"]']},
 "accueil":{name:"Métiers de l'accueil",tags:[
 '["tourism"~"^(hotel|hostel|museum|information|gallery)$"]',
 '["office"~"^(government|company|association|administrative|insurance|estate_agent)$"]',
 '["amenity"~"^(townhall|library|bank|community_centre|theatre|arts_centre|conference_centre|hospital|clinic|post_office)$"]']}
};
const clean=(x,n=150)=>String(x??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
const respond=(obj,code,origin)=>new Response(JSON.stringify(obj),{status:code,headers:{
 "content-type":"application/json; charset=utf-8","cache-control":"no-store",
 "access-control-allow-origin":ORIGINS.includes(origin)?origin:ORIGINS[0],
 "access-control-allow-headers":"content-type,authorization,apikey",
 "access-control-allow-methods":"POST,OPTIONS","vary":"origin"}});
async function timed(url,opt,ms){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),ms);
 try{return await fetch(url,{...opt,signal:c.signal})}finally{clearTimeout(timer)}
}
const fallback={"paris":[48.8566,2.3522],"paris 15e":[48.8414,2.3001],"boulogne-billancourt":[48.8352,2.2409],"saint-denis":[48.9362,2.3574],"montreuil":[48.8638,2.4485],"nanterre":[48.8924,2.2066],"versailles":[48.8014,2.1301]};
async function geocode(city){
 if(!/^[\p{L}0-9 .,'’\-]{2,90}$/u.test(city))throw Error("Ville ou quartier non valide.");
 try{
  const url=new URL("https://data.geopf.fr/geocodage/search");
  url.searchParams.set("q",city+", France");url.searchParams.set("limit","1");
  const res=await timed(url.toString(),{headers:{"accept":"application/json"}},10000);
  if(res.ok){
   const data=await res.json(),loc=data.features?.[0],x=loc?.geometry?.coordinates;
   if(Array.isArray(x)&&x.length>=2&&x[0]>=-6&&x[0]<=11&&x[1]>=41&&x[1]<=52)
    return{lat:x[1],lon:x[0],label:clean(loc.properties?.label||city),source:"IGN"};
  }
 }catch{}
 const key=city.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 if(fallback[key])return {lat:fallback[key][0],lon:fallback[key][1],label:city,source:"Coordonnées locales"};
 throw Error("Ville introuvable : indique une commune ou un arrondissement français.");
}
function osmQuery(lat,lon,radius,sector){
 const items=sectors[sector].tags.map(tag=>"nwr(around:"+radius+","+lat+","+lon+")[\"name\"]"+tag+";").join("\n");
 return "[out:json][timeout:25];(\n"+items+"\n);out center 2500;";
}
async function osm(query){
 let problem="Service indisponible.";
 for(const url of ["https://overpass.private.coffee/api/interpreter","https://overpass-api.de/api/interpreter"]){
  try{
   const res=await timed(url,{method:"POST",headers:{
    "content-type":"application/x-www-form-urlencoded;charset=UTF-8","accept":"application/json",
    "user-agent":"CORTEX-Academie-Stage/1.0 (https://sel18290.github.io)"},
    body:new URLSearchParams({data:query}).toString()},30000);
   if(!res.ok)throw Error("Annuaire HTTP "+res.status);
   const payload=await res.json();
   if(!Array.isArray(payload.elements))throw Error("Réponse invalide");
   return payload.elements;
  }catch(e){problem=clean(e?.message,120)}
 }
 throw Error("Annuaire temporairement indisponible : "+problem);
}
function distance(a,b,c,d){
 const rad=Math.PI/180,h=Math.sin((c-a)*rad/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin((d-b)*rad/2)**2;
 return Math.round(12742*Math.asin(Math.min(1,Math.sqrt(h)))*10)/10;
}
function entries(elements,loc,radius){
 const data=[],dedup=new Set();
 for(const item of elements){
  const t=item.tags||{},name=clean(t.name||t["name:fr"]);
  const lat=Number(item.lat??item.center?.lat),lon=Number(item.lon??item.center?.lon);
  if(!name||!Number.isFinite(lat)||!Number.isFinite(lon))continue;
  const dist=distance(loc.lat,loc.lon,lat,lon);
  if(dist>radius/1000+.2)continue;
  const address=clean(t["addr:full"]||t["contact:address"]||[
   [t["addr:housenumber"],t["addr:street"]].filter(Boolean).join(" "),
   [t["addr:postcode"],t["addr:city"]].filter(Boolean).join(" ")
  ].filter(Boolean).join(", "),220);
  const unique=(name+"|"+address).toLowerCase();if(dedup.has(unique))continue;dedup.add(unique);
  const site=clean(t["contact:website"]||t.website,220);
  data.push({id:String(item.type)+"/"+String(item.id),name,address,
   phone:clean(t["contact:phone"]||t.phone,75),
   website:/^https?:\/\/[^\s]+$/i.test(site)?site:"",
   category:clean(t.shop||t.office||t.amenity||t.tourism||"établissement").replace(/_/g," "),
   lat:Math.round(lat*1e5)/1e5,lon:Math.round(lon*1e5)/1e5,distance_km:dist,
   source:"OpenStreetMap",claude_rank:null,claude_why:"",missions:[]});
 }
 data.sort((a,b)=>a.distance_km-b.distance_km||a.name.localeCompare(b.name,"fr")||a.id.localeCompare(b.id));
 return data.slice(0,160);
}
async function validStudent(token){
 if(!/^[A-Za-z0-9_-]{40,256}$/.test(token||""))return false;
 const u=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!u||!key)return false;
 try{
  const hex=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,"0")).join("");
  const db=createClient(u,key,{auth:{persistSession:false}});
  for(const table of ["cortex_academy_class_sessions","cortex_academy_sessions"]){
   const {data,error}=await db.from(table).select("token_digest").eq("token_digest",hex)
    .gt("expires_at",new Date().toISOString()).limit(1).maybeSingle();
   if(!error&&data)return true;
  }
 }catch{}
 return false;
}
async function ranked(sector,businesses,token){
 const key=Deno.env.get("ANTHROPIC_API_KEY")||Deno.env.get("CLAUDE_API_KEY");
 if(!key)return{enabled:false,reason:"Clé Claude non configurée",picks:[]};
 if(!await validStudent(token))return{enabled:false,reason:"Session élève requise pour Claude",picks:[]};
 const candidates=businesses.slice(0,40).map(x=>({id:x.id,name:x.name,category:x.category,
  has_address:!!x.address,has_phone:!!x.phone}));
 if(!candidates.length)return{enabled:true,picks:[]};
 try{
  const prompt="Tu conseilles des élèves de bac pro en filière "+sectors[sector].name+
   ". Voici de vrais lieux issus d'OpenStreetMap. Choisis jusqu'à 15 sites pertinents. "+
   "Ne prétends jamais qu'ils acceptent des stagiaires. N'invente aucun établissement, téléphone ou adresse. "+
   "Réponds en JSON uniquement : {\"picks\":[{\"id\":\"ID présent\",\"why\":\"motif bref\",\"missions\":\"missions pédagogiques possibles\"}]}. Lieux : "+JSON.stringify(candidates);
  const res=await timed("https://api.anthropic.com/v1/messages",{method:"POST",headers:{
   "content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},
   body:JSON.stringify({model:Deno.env.get("CORTEX_CLAUDE_MODEL")||"claude-haiku-4-5-20251001",
    max_tokens:1800,temperature:0,messages:[{role:"user",content:prompt}]})},16000);
  if(!res.ok)throw Error("Service Claude HTTP "+res.status);
  const data=await res.json(),raw=(data.content||[]).filter(x=>x.type==="text").map(x=>x.text).join("\n");
  const match=raw.match(/\{[\s\S]*\}/);if(!match)throw Error("Réponse Claude non reconnue");
  const answer=JSON.parse(match[0]),ids=new Set(candidates.map(x=>x.id));
  const picks=(Array.isArray(answer.picks)?answer.picks:[]).filter(x=>ids.has(x.id)).slice(0,15)
   .map(x=>({id:x.id,why:clean(x.why,220),missions:clean(x.missions,260)}));
  return{enabled:true,picks,model:"Claude"};
 }catch(e){return{enabled:false,reason:clean(e?.message,130),picks:[]}}
}
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return respond({ok:true},200,origin);
 if(req.method!=="POST")return respond({ok:false,error:"Méthode interdite."},405,origin);
 if(origin&&!ORIGINS.includes(origin))return respond({ok:false,error:"Origine non autorisée."},403,origin);
 try{
  if(Number(req.headers.get("content-length")||0)>11000)throw Error("Requête trop volumineuse.");
  const body=await req.json();
  const sector=clean(body.filiere,40),city=clean(body.city||"Paris 15e",90);
  if(!sectors[sector])throw Error("Choisis une filière valide.");
  const radius=Math.min(6500,Math.max(800,Math.round(Number(body.radius)||2500)));
  const loc=await geocode(city),places=entries(await osm(osmQuery(loc.lat,loc.lon,radius,sector)),loc,radius);
  const ai=body.claude===true?await ranked(sector,places,clean(body.session,256)):
   {enabled:false,reason:"Classement géographique",picks:[]};
  const map=new Map(ai.picks.map((x,i)=>[x.id,{...x,rank:i+1}]));
  for(const x of places){const match=map.get(x.id);if(match){x.claude_rank=match.rank;x.claude_why=match.why;x.missions=[match.missions].filter(Boolean)}}
  if(map.size)places.sort((a,b)=>(a.claude_rank||999)-(b.claude_rank||999)||a.distance_km-b.distance_km||a.id.localeCompare(b.id));
  return respond({ok:true,filiere:sector,city:loc.label,location:{lat:loc.lat,lon:loc.lon},radius,
   businesses:places,found:places.length,ai,checked_at:new Date().toISOString(),
   sources:["IGN Géoplateforme","© OpenStreetMap contributors"],
   note:"L'existence et l'acceptation de stagiaires ne sont pas garanties. Téléphones et adresses sont affichés uniquement lorsqu'ils figurent dans l'annuaire public."},200,origin);
 }catch(e){return respond({ok:false,error:clean(e?.message||"Recherche indisponible.",300)},400,origin)}
});