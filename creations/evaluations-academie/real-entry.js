/* CORTEX Académie : porte d'accès de prévisualisation institutionnelle.
 * Mot de passe vérifié côté Supabase; jamais dans le JavaScript public.
 * AVERTISSEMENT : GitHub Pages reste public. Ce garde-écran est une
 * barrière d'interface, pas une authentification sécurisant les données.
 * Les comptes et données restent protégés par Supabase Auth et les contrôles backend.
 */
(function(){
 'use strict';
 const gate=document.getElementById('cortex-real-entry');
 const form=document.getElementById('cortex-real-entry-form');
 const input=document.getElementById('cortex-real-entry-password');
 const feedback=document.getElementById('cortex-real-entry-status');
 const submit=document.getElementById('cortex-real-entry-submit');
 const ribbon=document.getElementById('cortex-institutional-ribbon');
 const KEY='cortex_real_entry_preparation_v1';
 if(!gate||!form)return;
 function unlock(){
  document.body.classList.remove('cortex-preaccess');
  gate.hidden=true;
  if(ribbon)ribbon.hidden=false;
  input.value='';
 }
 let sessionValid=false;
 try{sessionValid=sessionStorage.getItem(KEY)==='ok'}catch{}
 if(sessionValid){unlock();return}
 gate.hidden=false;
 form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const password=input.value;
  if(!password){feedback.textContent='Saisis le mot de passe de prévisualisation.';return}
  submit.disabled=true;
  feedback.textContent='Vérification du code auprès du serveur sécurisé…';
  try{
   const {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}=await import('./config.js?v=1');
   const response=await fetch(SUPABASE_URL+'/functions/v1/cortex-real-entry',{
    method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY},
    body:JSON.stringify({action:'verify',password})
   });
   const result=await response.json().catch(()=>null);
   if(!response.ok||!result?.ok)throw Error(result?.error||'Vérification impossible (HTTP '+response.status+').');
   if(!result.allowed){feedback.textContent='Mot de passe incorrect. Vérifie la saisie.';input.select();return;}
   try{sessionStorage.setItem(KEY,'ok')}catch{}
   unlock();
  }catch(err){
   feedback.textContent='⚠ '+String(err?.message||err);
  }finally{submit.disabled=false}
 });
})();
