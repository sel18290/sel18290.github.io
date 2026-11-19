/* CORTEX Académie — assistance Albert dans l'espace élève réel.
 * Les traitements ne démarrent jamais automatiquement : clic explicite requis.
 */
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js?v=1';
const ENDPOINT=SUPABASE_URL+'/functions/v1/cortex-student-ai';
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e};
const tiny=(s,max=600)=>String(s??'').slice(0,max);
async function ask(action,session,assessmentId){
 const response=await fetch(ENDPOINT,{
  method:'POST',cache:'no-store',
  headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY},
  body:JSON.stringify({action,session,assessment_id:assessmentId})
 });
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result?.ok)throw Error(result?.error||'Albert IA est temporairement indisponible.');
 return result;
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
 const button=el('button','cw-ai-action',label);button.type='button';
 const output=el('div','cw-ai-output');output.setAttribute('aria-live','polite');
 button.addEventListener('click',async()=>{
  if(button.disabled)return;
  if(!confirm('Albert analysera les éléments nécessaires de ta copie ou de ton carnet déjà enregistré. Cette fonction est facultative, soumise à l’autorisation de l’établissement ; elle ne change jamais la note du professeur. Continuer ?'))return;
  button.disabled=true;
  output.replaceChildren(notice('✦ Albert prépare ton analyse…'));
  try{const result=await ask(action,session,assessmentId);renderer(output,result)}
  catch(error){output.replaceChildren(notice(tiny(error?.message||'Service indisponible.'),true))}
  finally{button.disabled=false}
 });
 card.append(button,output);return card;
}
export function renderReceiptAi(receipt,{session,assessmentId,submission}){
 if(!receipt||!submission)return;
 if(!submission.graded){
  const card=cardBase('✦ ALBERT · APRÈS LA REMISE','Estimer ma note avant la correction.','Ta copie est enregistrée. Albert peut te donner une estimation indicative sur 20, sans révéler la correction question par question.');
  attachAction(card,'✦ Estimer ma note avec Albert IA','estimate',{session,assessmentId},showEstimate);
  card.append(el('p','cw-ai-minor','Une estimation n’est jamais une note officielle. Si un document est manquant, Albert refuse plutôt que de deviner.'));
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
