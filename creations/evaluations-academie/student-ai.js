/* CORTEX Académie — assistance Albert dans l'espace élève réel.
 * Les traitements ne démarrent jamais automatiquement : clic explicite requis.
 */
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js?v=1';
const ENDPOINT=SUPABASE_URL+'/functions/v1/cortex-student-ai';
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e};
const tiny=(s,max=600)=>String(s??'').slice(0,max);
async function ask(action,session,assessmentId){
 // Aucun blocage silencieux si le service Albert ne répond plus sur mobile.
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),180000);
 try{
  const response=await fetch(ENDPOINT,{
   method:'POST',cache:'no-store',signal:controller.signal,
   headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY},
   body:JSON.stringify({action,session,assessment_id:assessmentId})
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result?.ok)
   throw Error(result?.error||'Albert IA a renvoyé une réponse illisible. Réessaie ou préviens ton professeur.');
  return result;
 }catch(error){
  if(error?.name==='AbortError')throw Error('Le service Albert met trop de temps à répondre. Vérifie ta connexion puis réessaie depuis cette page.');
  if(error instanceof TypeError)throw Error('Connexion au service Albert impossible. Vérifie Internet puis réessaie.');
  throw error;
 }finally{clearTimeout(timeout)}
}
function zone(title,items,kind){
 const section=el('section','cw-ai-zone cw-ai-zone-'+kind);
 section.append(el('h4','',title));
 const list=el('div','cw-ai-card-list');
 for(const [index,item] of (items||[]).entries()){
  const article=el('article','cw-ai-card'),num=el('span','cw-ai-card-num',String(index+1).padStart(2,'0')),body=el('div');
  body.append(el('strong','',tiny(item?.title,100)),el('p','',tiny(item?.detail,500)));
  article.append(num,body);list.append(article);
 }
 section.append(list);return section;
}
function notice(text,isError=false){
 const p=el('p','cw-ai-notice'+(isError?' is-error':''),text);
 p.setAttribute('role','status');p.setAttribute('aria-live','polite');return p;
}
function cardBase(kicker,title,description){
 const container=el('section','cw-ai-real');
 container.append(el('span','cw-ai-kicker',kicker),el('h3','',title),el('p','cw-ai-description',description));
 return container;
}
function showEstimate(target,result){
 target.replaceChildren();
 const banner=el('div','cw-ai-estimate-score');
 banner.append(el('span','','≈'),el('strong','',Number(result.estimated_grade).toFixed(2).replace('.',',')+' / 20'));
 target.append(banner,notice('Estimation Albert IA provisoire, non validée par le professeur et exclue de toutes les moyennes.'));
 const images=Number(result.images_used||0),sources=Number(result.sources_used||0);
 if(sources>0){
  const amount=images>0?' dont '+images+' '+(images===1?'capture originale':'captures originales'):'';
  target.append(el('p','cw-ai-minor',sources+' '+(sources===1?'source du sujet consultée':'sources du sujet consultées')+amount+'.'));
 }
 target.append(el('p','cw-ai-minor','Aucun détail de correction, aucune réponse attendue et aucun conseil ne sont dévoilés avant la publication de la correction officielle.'));
}
function showCorrected(target,result){
 target.replaceChildren();
 const f=result.feedback;
 if(!f){target.append(notice('Albert n’a pas fourni de correction exploitable.',true));return}
 target.append(el('p','cw-ai-overview',tiny(f.intro)));
 target.append(zone('Points maîtrisés',f.strengths,'positive'),zone('Points à renforcer',f.improvements,'revision'),zone('Comment progresser',f.actions,'action'));
 target.append(el('p','cw-ai-minor','Albert explique la copie déjà corrigée. La note et les appréciations officielles de l’enseignant restent inchangées.'));
}
function showInsights(target,result){
 target.replaceChildren();
 const a=result.analysis;if(!a){target.append(notice('Analyse du carnet indisponible.',true));return}
 const summary=el('div','cw-ai-summary');
 summary.append(el('strong','','✦ '+Number(a.reviewedCount||0)+' contrôle(s) corrigé(s) analysé(s)'),el('p','',tiny(a.overview)));
 target.append(summary);
 if(a.progress)target.append(zone('Mon évolution',[a.progress],'trend'));
 target.append(zone('Ce que je réussis',a.strengths,'positive'),zone('Ce que je peux travailler',a.difficulties,'revision'),zone('Mon plan de progression',a.recommendations,'action'));
 target.append(el('p','cw-ai-minor','Seules les notes et appréciations déjà publiées sont analysées. Les contrôles en attente restent confidentiels.'));
}
function attachAction(card,label,action,{session,assessmentId},renderer){
 const button=el('button','cw-ai-action',label);
 button.type='button';
 const confirmBox=el('section','cw-ai-confirmation');
 confirmBox.hidden=true;
 confirmBox.setAttribute('role','group');
 confirmBox.setAttribute('aria-label','Confirmer le lancement de l’analyse Albert');
 const subject=action==='insights'
  ?'les notes et les appréciations déjà publiées dans ton carnet'
  :'tes réponses et les documents associés au contrôle, y compris les captures originales';
 const title=el('strong','','Autoriser cette analyse avec Albert IA ?');
 const detail=el('p','',
  'Albert analysera '+subject+'. Cette fonction est facultative et doit être autorisée par ton établissement. '+
  (action==='estimate'?'La note estimée ne remplace jamais celle du professeur.':'La correction officielle ne sera pas modifiée.'));
 const actions=el('div','cw-ai-confirm-actions');
 const start=el('button','cw-ai-action cw-ai-confirm-start','Oui, lancer l’analyse');
 start.type='button';
 const cancel=el('button','cw-ai-confirm-cancel','Annuler');
 cancel.type='button';
 actions.append(start,cancel);
 confirmBox.append(title,detail,actions);
 const progress=el('div','cw-ai-inline-progress');
 progress.hidden=true;
 progress.setAttribute('role','status');
 progress.setAttribute('aria-live','polite');
 progress.append(el('span','cw-ai-progress-spinner'),el('span','',
  'Albert analyse les réponses et les documents… Le résultat apparaîtra ici après traitement.'));
 const output=el('div','cw-ai-output');
 output.setAttribute('aria-live','polite');
 button.addEventListener('click',()=>{
  if(button.disabled)return;
  output.replaceChildren();
  progress.hidden=true;
  confirmBox.hidden=false;
  confirmBox.scrollIntoView({block:'nearest',behavior:'auto'});
 });
 cancel.addEventListener('click',()=>{
  confirmBox.hidden=true;
  output.replaceChildren(notice('Analyse annulée : aucune donnée envoyée.'));
 });
 start.addEventListener('click',async()=>{
  if(button.disabled)return;
  button.disabled=true;
  start.disabled=true;
  confirmBox.hidden=true;
  progress.hidden=false;
  output.replaceChildren(notice('Analyse demandée à Albert. Le résultat sera affiché directement sous ce bouton.'));
  progress.scrollIntoView({block:'nearest',behavior:'auto'});
  try{
   const result=await ask(action,session,assessmentId);
   renderer(output,result);
  }catch(error){
   output.replaceChildren(notice('Analyse impossible : '+tiny(error?.message||'Service indisponible.',350)+' Tu peux réessayer.',true));
  }finally{
   progress.hidden=true;
   button.disabled=false;
   start.disabled=false;
   output.scrollIntoView({block:'nearest',behavior:'auto'});
  }
 });
 card.append(button,confirmBox,progress,output);
 return card;
}
export function renderReceiptAi(receipt,{session,assessmentId,submission}){
 if(!receipt||!submission)return;
 if(!submission.graded){
  const card=cardBase('✦ ALBERT · APRÈS LA REMISE','Estimer ma note avant la correction.','Albert lit tes réponses, le barème et les documents associés au contrôle pour proposer une estimation sur 20.');
  attachAction(card,'✦ Estimer ma note avec Albert IA','estimate',{session,assessmentId},showEstimate);
  card.append(el('p','cw-ai-minor','L’enseignant décide de la note officielle. Un document indispensable doit être lisible pour permettre l’estimation.'));
  receipt.append(card);
 }else{
  const card=cardBase('✦ ALBERT · CORRECTION PUBLIÉE','Comprendre ma copie corrigée.','Après la correction de ton enseignant, Albert peut expliquer tes réussites, les points à renforcer et proposer des méthodes de révision.');
  attachAction(card,'✦ Albert m’aide à comprendre ma copie','corrected',{session,assessmentId},showCorrected);
  receipt.append(card);
 }
}
export function renderDashboardAi(work,{session,assessments}){
 const published=(assessments||[]).filter(x=>x.released&&x.submitted_at);
 if(!session||!published.length)return;
 const card=cardBase('✦ ALBERT · CARNET ÉLÈVE','Mon bilan personnalisé.','Albert peut relire les résultats et les appréciations publiés par ton professeur pour repérer les acquis et préparer un plan de révision.');
 attachAction(card,'✦ Analyser mes '+published.length+' contrôle(s) corrigé(s)','insights',
  {session,assessmentId:published[0].id},showInsights);
 work.append(card);
}
