/* CORTEX · Contact et Demander une fonctionnalité, modération par Albert.
 * Aucune limite quotidienne artificielle dans cette interface.
 * Les restrictions raisonnables de taille et les limitations du fournisseur
 * Albert restent applicables. Le mailto de secours n'est jamais lancé
 * avant une validation acceptée du message par Albert.
 */
(()=>{
 'use strict';
 const TARGET='cortexgenesis1@gmail.com';
 let activeDialog=null;
 const e=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 };
 const detectMode=()=>location.pathname.includes('evaluations-academie')?'real':'demo';
 const safeKind=(v)=>v==='fonctionnalite'?'fonctionnalite':'contact';
 const specs={
  contact:{
   title:'Contacter CORTEX',
   kicker:'CORTEX · TRANSMISSION',
   intro:'Une question, un retour, un problème ou une demande de collaboration ? Albert vérifie la pertinence du message avant son enregistrement et son éventuel envoi par e-mail.',
   subject:'Question sur CORTEX',
   placeholder:'Explique ta demande, ton retour ou ton problème. Indique des informations utiles sans nommer d’élève.'
  },
  fonctionnalite:{
   title:'Demander une fonctionnalité',
   kicker:'CORTEX · ÉVOLUTION DU PROJET',
   intro:'Une fonction manque dans CORTEX ? Décris ton besoin. Albert vérifie que ta demande est compréhensible et pertinente avant sa transmission.',
   subject:'Demande de fonctionnalité CORTEX',
   placeholder:'Quelle fonctionnalité souhaites-tu ajouter ? À quel problème répondrait-elle ? Décris un exemple concret.'
  }
 };
 const endpoint=async body=>{
  const {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}=await import('./evaluations-academie/config.js?v=1');
  const response=await fetch(SUPABASE_URL+'/functions/v1/cortex-feedback',{
   method:'POST',cache:'no-store',
   headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
   body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok)throw Error(data?.error||'Service temporairement indisponible.');
  return data;
 };
 function open(kind){
  kind=safeKind(kind);
  if(activeDialog){
   activeDialog.close();
   activeDialog.remove();
   activeDialog=null;
  }
  const spec=specs[kind];
  const dialog=e('dialog','cortex-feedback-dialog');
  dialog.setAttribute('aria-label',spec.title);
  const card=e('div','cortex-feedback-shell');
  const top=e('header','cortex-feedback-head');
  const heading=e('div');
  heading.append(e('span','cortex-feedback-kicker',spec.kicker),
   e('h2','',spec.title));
  const close=e('button','cortex-feedback-close','×');
  close.type='button';close.setAttribute('aria-label','Fermer la fenêtre');
  close.onclick=()=>dialog.close();
  top.append(heading,close);
  const intro=e('p','cortex-feedback-intro',spec.intro);
  const form=e('form','cortex-feedback-form');
  form.noValidate=true;
  const field=(labelText,fieldNode)=>{
   const wrap=e('label','cortex-feedback-field');
   wrap.append(e('span','',labelText),fieldNode);
   return wrap;
  };
  const subject=e('input','cortex-feedback-subject');
  subject.name='subject';subject.type='text';subject.value=spec.subject;
  subject.minLength=5;subject.maxLength=160;subject.required=true;
  const message=e('textarea','cortex-feedback-message');
  message.name='message';message.rows=6;message.minLength=20;message.maxLength=1800;message.required=true;
  message.placeholder=spec.placeholder;
  const count=e('small','cortex-feedback-counter','0 / 1800 caractères');
  message.addEventListener('input',()=>{count.textContent=message.value.length+' / 1800 caractères'});
  const reply=e('input','cortex-feedback-reply');
  reply.name='reply_to';reply.type='email';
  reply.autocomplete='email';reply.inputMode='email';reply.maxLength=180;
  reply.placeholder='facultatif@exemple.fr';
  const honey=e('input','cortex-feedback-trap');
  honey.name='website';honey.tabIndex=-1;
  honey.autocomplete='off';honey.setAttribute('aria-hidden','true');
  const consent=e('label','cortex-feedback-consent');
  const consentCheck=e('input');
  consentCheck.type='checkbox';consentCheck.required=true;
  consent.append(consentCheck,e('span','',
   'J’accepte que le texte de ma demande soit vérifié par Albert et que, s’il est pertinent, il soit enregistré par CORTEX pour être transmis au responsable du projet.'));
  const notice=e('p','cortex-feedback-policy',
   'Les messages insultants, publicitaires, incohérents ou sans rapport avec le projet ne sont pas transmis. Les critiques constructives restent acceptées. Albert peut se tromper : tu peux reformuler si nécessaire.');
  const status=e('div','cortex-feedback-status');
  status.hidden=true;status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actions=e('div','cortex-feedback-actions');
  const send=e('button','cortex-feedback-send','✦ Analyser et transmettre avec Albert');
  send.type='submit';
  const dismiss=e('button','cortex-feedback-cancel','Annuler');
  dismiss.type='button';dismiss.onclick=()=>dialog.close();
  actions.append(send,dismiss);
  form.append(field('Objet de la demande',subject),field('Message',message),count,
   field('Adresse e-mail pour une réponse (facultative)',reply),honey,consent,notice,status,actions);
  const foot=e('footer','cortex-feedback-foot','Analyse Albert sans quota quotidien applicatif · Les messages refusés ne sont pas transmis.');
  card.append(top,intro,form,foot);dialog.append(card);document.body.append(dialog);
  activeDialog=dialog;
  dialog.addEventListener('close',()=>{
   if(activeDialog===dialog)activeDialog=null;
   dialog.remove();
  },{once:true});
  function feedback(text,type){
   status.replaceChildren(e('p','',text));
   status.className='cortex-feedback-status is-'+type;
   status.hidden=false;
  }
  form.addEventListener('submit',async ev=>{
   ev.preventDefault();
   const title=subject.value.trim(),body=message.value.trim(),email=reply.value.trim();
   if(title.length<5||title.length>160||body.length<20||body.length>1800){
    feedback('Précise un objet de 5 à 160 caractères et un message de 20 à 1800 caractères.','error');
    return;
   }
   if(email&&!reply.checkValidity()){
    feedback('Vérifie ton adresse e-mail de réponse.','error');
    return;
   }
   if(!consentCheck.checked){
    feedback('Coche la case d’accord pour que ton message puisse être vérifié par Albert.','error');
    return;
   }
   send.disabled=true;send.textContent='Albert analyse ta demande…';
   status.hidden=true;
   try{
    const result=await endpoint({
     kind,source:detectMode(),subject:title,message:body,reply_to:email,website:honey.value
    });
    if(!result.accepted){
     feedback(result.reason||'Demande non retenue. Reformule-la avec une question précise.','rejected');
     return;
    }
    form.querySelectorAll('input,textarea').forEach(node=>node.disabled=true);
    const ref=String(result.reference||'');
    if(result.emailed){
     feedback('✓ Demande validée par Albert et envoyée par e-mail au responsable de CORTEX. Référence : '+ref,'success');
    }else{
     feedback('✓ Demande jugée pertinente par Albert et enregistrée sous la référence '+ref+
      '. L’envoi automatique par e-mail n’est pas encore confirmé. Tu peux l’envoyer maintenant depuis ta messagerie.','pending');
     const compose=e('a','cortex-feedback-compose','Ouvrir ma messagerie pour envoyer maintenant');
     const bodyText='Message vérifié par Albert. Référence CORTEX : '+ref+
      '\n\n'+body+'\n\nAdresse de réponse : '+(email||'Non précisée');
     compose.href='mailto:'+TARGET+'?subject='+encodeURIComponent('[CORTEX] '+title)+
      '&body='+encodeURIComponent(bodyText);
     compose.rel='nofollow';
     status.append(compose);
    }
    send.hidden=true;
    dismiss.textContent='Fermer';
   }catch(error){
    feedback('Aucun e-mail confirmé. '+String(error?.message||error),'error');
   }finally{
    send.disabled=false;
    if(!send.hidden)send.textContent='✦ Analyser et transmettre avec Albert';
   }
  });
  dialog.showModal();
  subject.focus();
 }
 document.addEventListener('click',event=>{
  const trigger=event.target?.closest?.('[data-cortex-feedback-open]');
  if(!trigger)return;
  event.preventDefault();
  open(trigger.getAttribute('data-cortex-feedback-open'));
 });
 window.CORTEX_FEEDBACK={open};
})();