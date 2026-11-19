/* CORTEX Académie — progression Albert élève (estimation / correction / carnet).
 * La réponse n'est reçue qu'en fin d'analyse : animation indéterminée,
 * sans progression artificielle. La note professeur n'est jamais modifiée.
 */
const create=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;};
export function openStudentAlbertProgress({action,onReveal}){
 const labels={
  estimate:{title:'✦ Albert estime ma note',description:'Albert examine les réponses et les documents nécessaires sans dévoiler la correction.',done:'Voir mon estimation'},
  corrected:{title:'✦ Albert explique ma correction',description:'Albert relit la correction publiée par mon professeur et prépare des conseils.',done:'Lire mes conseils'},
  insights:{title:'✦ Albert analyse mon carnet',description:'Albert étudie les résultats déjà publiés pour proposer un plan de progression.',done:'Voir mon bilan'}
 };
 const label=labels[action]||labels.estimate;
 const dialog=create('dialog','cortex-albert-progress cw-teacher-albert-dialog cw-student-albert-dialog');
 dialog.setAttribute('aria-label','Albert IA analyse mes résultats');
 const inner=create('div','cai-progress-inner'),heading=create('h2','',label.title),
  detail=create('p','cai-sub',label.description),dots=create('div','cai-animation');
 dots.setAttribute('aria-hidden','true');
 dots.append(create('span'),create('span'),create('span'));
 const track=create('div','cai-track cw-real-indeterminate');
 track.setAttribute('role','progressbar');track.setAttribute('aria-label','Analyse en cours');
 const bar=create('div','cai-bar');track.append(bar);
 const status=create('p','cai-status','✦ Albert prépare ton analyse…');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const count=create('p','cai-count','Analyse en cours · la durée dépend du nombre de questions');
 const footer=create('div','cai-footer'),close=create('button','cai-cancel','Masquer');
 close.type='button';footer.append(close);
 inner.append(heading,detail,dots,track,status,count,footer);
 dialog.append(inner);document.body.append(dialog);
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 let closed=false,finished=false;
 const remove=()=>{closed=true;dialog.remove()};
 dialog.addEventListener('close',remove,{once:true});
 const hide=()=>{if(closed)return;if(typeof dialog.close==='function')dialog.close();else remove()};
 close.addEventListener('click',()=>{if(finished&&onReveal)onReveal();hide()});
 function done(){
  finished=true;track.classList.remove('cw-real-indeterminate');
  track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow','100');
  bar.style.width='100%';
 }
 return{
  success(){
   if(closed)return;
   done();heading.textContent='✓ Albert a terminé son analyse';
   dots.classList.add('cai-finished');
   status.textContent='Le résultat est prêt. Il ne remplace pas la note du professeur.';
   count.textContent='Consulte ton retour personnalisé ci-dessous.';
   close.classList.remove('cai-cancel');close.textContent=label.done;
  },
  failure(error){
   if(closed)return;
   done();heading.textContent='Albert n’a pas pu terminer';
   dots.classList.add('cai-error');
   status.textContent='⚠ '+String(error?.message||error||'Analyse indisponible');
   count.textContent='Tu pourras réessayer. Aucune note officielle n’a été modifiée.';
   close.textContent='Fermer';
  }
 };
}
