/* CORTEX Académie : proposition IA, jamais de publication automatique. */
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js?v=1';

export async function requestAiDraft(assessmentId,studentNumber){
 const client=window.CORTEX_ACADEMY_BRIDGE?.client?.();
 if(!client)throw new Error('Connectez-vous dans l’espace professeur.');
 const {data,error}=await client.auth.getSession();
 if(error||!data?.session?.access_token)throw new Error('Session expirée. Reconnectez-vous.');
 const response=await fetch(SUPABASE_URL+'/functions/v1/cortex-ai-correction',{
  method:'POST',cache:'no-store',
  headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,
   Authorization:'Bearer '+data.session.access_token},
  body:JSON.stringify({action:'draft',assessment_id:assessmentId,student_number:studentNumber})
 });
 const out=await response.json().catch(()=>null);
 if(!response.ok||!out?.ok)throw new Error(out?.error||'Correction IA temporairement indisponible.');
 return out;
}
export function formatDraftFeedback(draft){
 const lines=[String(draft.feedback||'').trim()];
 for(const q of (draft.questions||[])){
  lines.push('Question '+String(q.id)+' : '+String(q.points)+'/'+String(q.max)+' pt — '+String(q.commentaire||''));
 }
 return lines.filter(Boolean).join('\n').slice(0,4000);
}
