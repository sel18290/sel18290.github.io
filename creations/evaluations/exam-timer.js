window.CORTEX_CLOCK=(function clockModule(){
  'use strict';
  const number=x=>Number.isFinite(Number(x))?Number(x):0;
  function duration(attempt,exam){return Math.max(1,Math.min(480,number(attempt?.durationMinutes??exam?.duration)||60));}
  function remaining(attempt,exam,now=Date.now()){
    const limit=duration(attempt,exam)*60000;
    const start=number(attempt?.startedAt)||now;
    return {totalMs:limit,remainingMs:Math.max(0,limit-Math.max(0,now-start)),
      endAt:start+limit,elapsedMs:Math.max(0,now-start)};
  }
  function display(ms){
    const secs=Math.max(0,Math.ceil(ms/1000));
    const ss=String(secs%60).padStart(2,'0');
    const mins=Math.floor(secs/60);
    return mins>=60?`${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}:${ss}`:`${String(mins).padStart(2,'0')}:${ss}`;
  }
  function render(exam,attempt,now=Date.now()){
    const d=remaining(attempt,exam,now),percent=100*d.remainingMs/d.totalMs;
    const urgency=d.remainingMs===0?'is-expired':d.remainingMs<=60000?'is-critical':d.remainingMs<=300000?'is-warning':'';
    return `<section class="exam-timer ${urgency}" id="exam-timer" aria-label="Compte à rebours de l'évaluation">
      <div class="timer-copy"><span class="timer-kicker"><span class="timer-pulse"></span> TEMPS DE L'ÉPREUVE</span>
        <div class="timer-time" id="exam-timer-value" role="timer" aria-live="off">${display(d.remainingMs)}</div>
        <div class="timer-subtitle" id="exam-timer-note">${d.remainingMs===0?'Temps écoulé — pense à rendre ta copie.':d.remainingMs<=300000?'Attention, il reste peu de temps.':'Décompte commencé à l’ouverture de ta copie.'}</div>
      </div>
      <div class="timer-info">
        <span class="timer-total">Durée prévue <strong>${duration(attempt,exam)} min</strong></span>
        <div class="timer-meter" role="progressbar" aria-label="Temps restant en pourcentage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}">
          <span id="exam-timer-meter" style="width:${percent}%"></span>
        </div>
        <span class="timer-caption">Le décompte continue même si tu changes de question ou actualises la page.</span>
      </div>
    </section>`;
  }
  function update(doc,attempt,exam,now=Date.now()){
    const container=doc.getElementById('exam-timer');
    if(!container||!attempt||!exam||attempt.status!=='progress')return false;
    const d=remaining(attempt,exam,now),percent=100*d.remainingMs/d.totalMs;
    const value=doc.getElementById('exam-timer-value');
    if(value)value.textContent=display(d.remainingMs);
    const meter=doc.getElementById('exam-timer-meter');
    if(meter)meter.style.width=percent+'%';
    const role=container.querySelector?.('[role="progressbar"]');
    if(role)role.setAttribute('aria-valuenow',String(Math.round(percent)));
    container.classList.toggle('is-warning',d.remainingMs>60000&&d.remainingMs<=300000);
    container.classList.toggle('is-critical',d.remainingMs>0&&d.remainingMs<=60000);
    container.classList.toggle('is-expired',d.remainingMs===0);
    const note=doc.getElementById('exam-timer-note');
    if(note)note.textContent=d.remainingMs===0?'Temps écoulé — pense à rendre ta copie.':d.remainingMs<=300000?'Attention, il reste peu de temps.':'Décompte commencé à l’ouverture de ta copie.';
    return true;
  }
  return {duration,remaining,display,render,update};
})();
