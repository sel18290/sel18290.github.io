/* Compteurs CORTEX Noctis — un indicateur partagé entre Démo et Académie.
 * Visites = sessions d'onglet anonymes, PAS personnes uniques.
 * Présence = sessions ayant envoyé un signal dans les deux dernières minutes.
 * Aucun cookie, compte, adresse IP ou historique de navigation transmis.
 */
(()=>{
 'use strict';
 const panel=document.getElementById('cortex-traffic');
 if(!panel)return;
 const total=panel.querySelector('[data-traffic="visits"]');
 const active=panel.querySelector('[data-traffic="online"]');
 const annotation=panel.querySelector('[data-traffic="note"]');
 if(!total||!active)return;
 const key='cortex_traffic_session_v1';
 let session='';
 try{
  session=sessionStorage.getItem(key)||'';
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(session)){
   session=crypto.randomUUID();sessionStorage.setItem(key,session);
  }
 }catch{
  try{session=crypto.randomUUID()}catch{return}
 }
 const fmt=new Intl.NumberFormat('fr-FR');
 let pending=false,failed=0;
 async function update(){
  if(pending||document.visibilityState==='hidden')return;
  pending=true;
  try{
   const {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}=await import('./evaluations-academie/config.js?v=1');
   const response=await fetch(SUPABASE_URL+'/functions/v1/cortex-traffic',{
    method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY},
    body:JSON.stringify({action:'pulse',sessionId:session})
   });
   const data=await response.json().catch(()=>null);
   if(!response.ok||!data?.ok)throw Error('Compteurs indisponibles');
   if(!Number.isSafeInteger(data.visits)||!Number.isSafeInteger(data.online))throw Error('Réponse invalide');
   total.textContent=fmt.format(data.visits);
   active.textContent=fmt.format(data.online);
   panel.dataset.status='live';
   const since=/^\d{4}-\d{2}-\d{2}$/.test(data.since)?new Date(data.since+'T00:00:00Z') : null;
   const sinceText=since&&!Number.isNaN(since.getTime())?new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(since):'la mise en service';
   const desc='Explorations = sessions ouvertes depuis le '+sinceText+
      ' (pas des personnes uniques). En orbite = sessions actives au cours des 2 dernières minutes. Données anonymes et approximatives.';
   panel.title=desc;
   if(annotation)annotation.textContent='Sessions depuis le '+sinceText+' · activité sur 2 min';
   failed=0;
  }catch{
   failed++;
   if(panel.dataset.status!=='live'){
    total.textContent='—';active.textContent='—';
    panel.dataset.status='offline';
    panel.title='Statistiques temporairement indisponibles, aucune valeur estimée.';
    if(annotation)annotation.textContent='Mesure temporairement indisponible';
   }
  }finally{pending=false}
 }
 update();
 const interval=setInterval(update,35000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')update()});
 window.addEventListener('pageshow',event=>{if(event.persisted)update()});
 window.addEventListener('pagehide',()=>{clearInterval(interval)},{once:true});
})();