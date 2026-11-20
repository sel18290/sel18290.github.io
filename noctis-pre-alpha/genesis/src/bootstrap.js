// Keep startup error handling independent of the application module graph.
import('./player.js?v=n06-hub-r1').catch(error=>{
  console.error('GENESIS startup failed',error);
  const loading=document.getElementById('loading');
  loading.hidden=false;
  loading.textContent='Chargement interrompu · '+error.message+' · Rechargez la page pour réessayer.';
});
