/* CORTEX Académie — fenêtre de travail Albert sur des copies réelles.
 * Le serveur renvoie le résultat complet à la fin : la barre reste
 * volontairement indéterminée, aucun faux pourcentage n'est affiché.
 */
const make=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
export function openTeacherAlbertProgress({studentNumber,assessmentTitle,questionCount,onReveal}={}){
 const dialog=make('dialog','cortex-albert-progress cw-teacher-albert-dialog');
 dialog.setAttribute('aria-label','Albert analyse une copie réelle');
 const inner=make('div','cai-progress-inner');
 const heading=make('h2','','✦ Albert IA · Correction en cours');
 const detail=make('p','cai-sub','Élève n°'+String(studentNumber||'—')+' · '+String(assessmentTitle||'Contrôle'));
 const dots=make('div','cai-animation');
 dots.setAttribute('aria-hidden','true');
 dots.append(make('span'),make('span'),make('span'));
 const track=make('div','cai-track cw-real-indeterminate');
 track.setAttribute('role','progressbar');
 track.setAttribute('aria-label','Analyse Albert en cours, durée variable');
 const bar=make('div','cai-bar');track.append(bar);
 const status=make('p','cai-status','Albert examine les réponses et les documents associés…');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const count=make('p','cai-count','Analyse de '+String(questionCount||'toutes les')+' question(s) · durée variable');
 const safety=make('p','cw-real-ai-safety','Le résultat sera un brouillon. Aucune note ni correction ne sera publiée sans validation du professeur.');
 const footer=make('div','cai-footer');
 const close=make('button','cai-cancel','Masquer la fenêtre');
 close.type='button';
 footer.append(close);
 inner.append(heading,detail,dots,track,status,count,safety,footer);
 dialog.append(inner);
 document.body.append(dialog);
 if(typeof dialog.showModal==='function')dialog.showModal();
 else dialog.setAttribute('open','');
 let stopped=false,closed=false;
 const cleanup=()=>{closed=true;dialog.remove();};
 dialog.addEventListener('close',cleanup,{once:true});
 const hide=()=>{if(closed)return;if(typeof dialog.close==='function')dialog.close();else cleanup()};
 close.addEventListener('click',()=>{
  if(stopped&&typeof onReveal==='function')onReveal();
  hide();
 });
 function finish(){
  stopped=true;
  track.classList.remove('cw-real-indeterminate');
  track.setAttribute('aria-valuemin','0');
  track.setAttribute('aria-valuemax','100');
  track.setAttribute('aria-valuenow','100');
  bar.style.width='100%';
 }
 return {
  update(message){if(!stopped&&!closed)status.textContent=String(message||'Albert travaille sur la copie…');},
  success(result){
   if(closed)return;
   finish();dots.classList.add('cai-finished');
   const countDone=Array.isArray(result?.questions)?result.questions.length:0;
   heading.textContent='✓ Albert a terminé son analyse';
   status.textContent='Brouillon prêt : '+countDone+' question(s) traitée(s) · proposition de '+Number(result.grade||0).toFixed(2).replace('.',',')+' / 20.';
   count.textContent='Tu peux vérifier les commentaires et le barème, puis enregistrer toi-même une correction.';
   close.textContent='Voir la correction proposée';
   close.classList.remove('cai-cancel');
  },
  failure(error){
   if(closed)return;
   finish();dots.classList.add('cai-error');
   heading.textContent='Albert n’a pas terminé';
   status.textContent='⚠ '+String(error?.message||error||'Analyse indisponible.');
   count.textContent='Aucune note n’a été enregistrée ou publiée. Tu peux réessayer.';
   close.textContent='Fermer et revenir à la copie';
  },
  close:hide,
  get open(){return !closed}
 };
}
