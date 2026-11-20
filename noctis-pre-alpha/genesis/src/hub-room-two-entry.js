// Installed only in the generated hub entry, never in the historical main page.
export function installRoomTwoEntry({enter,document:doc=document}){
 const original=doc.querySelector('#start-sound');if(!original)throw Error('Accueil NOCTIS indisponible');
 const button=doc.createElement('button');button.id='start-sound';button.type='button';button.textContent='Entrer dans N02 · Chambre des écrans';
 original.replaceWith(button);const resume=doc.querySelector('#resume-game');if(resume)resume.hidden=true;
 const status=doc.createElement('p');status.setAttribute('role','status');button.after(status);
 button.addEventListener('click',async()=>{
  if(button.disabled)return;button.disabled=true;status.textContent='Ouverture de la salle 2…';
  try{await enter();status.textContent='';}
  catch(error){status.textContent='Accès interrompu · '+error.message;button.disabled=false;}
 });
 return button;
}
