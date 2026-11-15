// Form fields keep their native input, including the E key used to interact.
export function isInteractionKey(event,paused,connecting){
  return !paused&&!connecting&&!event.repeat&&!event.isComposing&&event.code==='KeyE'&&
    !event.target?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]');
}
