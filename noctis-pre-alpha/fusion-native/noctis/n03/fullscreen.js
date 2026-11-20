// La cible iframe retire aussi l’en-tête du portail, lorsque le parent est accessible.
export function attachFullscreen(button,note){
 let target=document.documentElement;try{if(window.frameElement)target=window.frameElement;}catch{}
 const doc=target.ownerDocument,request=target.requestFullscreen||target.webkitRequestFullscreen,exit=doc.exitFullscreen||doc.webkitExitFullscreen;
 const current=()=>doc.fullscreenElement||doc.webkitFullscreenElement;
 const supported=!!(request&&exit&&(doc.fullscreenEnabled??doc.webkitFullscreenEnabled??false));
 button.hidden=!supported;
 function sync(){const active=current()===target;button.textContent=active?'⛶ Quitter':'⛶ Plein écran';button.setAttribute('aria-label',active?'Quitter le plein écran':'Afficher le jeu en plein écran');button.setAttribute('aria-pressed',String(active));}
 button.onclick=async()=>{try{if(current())await exit.call(doc);else await request.call(target);note.textContent='';}catch{note.textContent='Plein écran indisponible dans ce navigateur.';}sync();};
 doc.addEventListener('fullscreenchange',sync);doc.addEventListener('webkitfullscreenchange',sync);sync();
}
