/* CORTEX · Améliorations de navigation tactile sans modification des données des contrôles. */
(function cortexMobileEnhancements(){
  'use strict';
  const app=document.getElementById('app');
  if(!app)return;
  const mobile=window.matchMedia('(max-width:760px)');
  let frame=0;
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function enhanceTables(){
    app.querySelectorAll('.table-wrap table').forEach(table=>{
      const headings=Array.from(table.querySelectorAll('thead tr:last-child th'))
        .map(th=>(th.textContent||'').replace(/\s+/g,' ').trim());
      const rows=Array.from(table.querySelectorAll('tbody tr'));
      if(!headings.length||!rows.length)return;
      // Les tableaux de documents scientifiques restent inchangés.
      if(rows.some(row=>Array.from(row.cells).some(cell=>cell.colSpan>1)))return;
      if(rows.some(row=>row.cells.length!==headings.length))return;
      table.closest('.table-wrap')?.classList.add('mobile-cards');
      rows.forEach(row=>Array.from(row.cells).forEach((cell,index)=>{
        if(!cell.dataset.label)cell.dataset.label=headings[index]||'Information';
      }));
    });
  }
  function centreItem(container,item){
    if(!container||!item||!mobile.matches)return;
    const containerRect=container.getBoundingClientRect();
    const itemRect=item.getBoundingClientRect();
    const destination=container.scrollLeft + itemRect.left-containerRect.left -
      (container.clientWidth-itemRect.width)/2;
    container.scrollLeft=Math.max(0,destination);
  }
  function syncNavigation(){
    const links=document.querySelectorAll('.top-link');
    links.forEach(link=>{
      if(link.classList.contains('active'))link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    if(!mobile.matches)return;
    const nav=app.querySelector('.side-menu');
    const selected=nav?.querySelector('.side-item.active');
    if(nav&&selected&&nav.dataset.mobileSelected!==selected.dataset.tab){
      nav.dataset.mobileSelected=selected.dataset.tab||'';
      centreItem(nav,selected);
    }
    const selectedQuestion=app.querySelector('.sidebar-note .question-dot.current');
    const dotList=selectedQuestion?.closest('.question-dots');
    if(dotList&&dotList.dataset.mobileSelected!==selectedQuestion.dataset.index){
      dotList.dataset.mobileSelected=selectedQuestion.dataset.index||'';
      centreItem(dotList,selectedQuestion);
    }
    const questionStrip=app.querySelector('.review-question-scroll');
    const question=questionStrip?.querySelector('.review-question-btn.selected');
    if(questionStrip&&question&&questionStrip.dataset.mobileSelected!==question.dataset.index){
      questionStrip.dataset.mobileSelected=question.dataset.index||'';
      centreItem(questionStrip,question);
    }
  }
  function refresh(){
    frame=0;
    enhanceTables();
    syncNavigation();
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(refresh);}
  const observer=new MutationObserver(schedule);
  observer.observe(app,{childList:true,subtree:true});
  schedule();
  mobile.addEventListener?.('change',schedule);

  // Après changement de question, revenir automatiquement au début de l'énoncé.
  // Le navigateur ne change pas de route entre deux questions.
  const questionActions=new Set(['question-next','question-prev','question-jump','review-next','review-prev','review-select','editor-next','editor-prev','editor-select']);
  document.addEventListener('click',event=>{
    if(!mobile.matches)return;
    const button=event.target.closest('[data-action]');
    if(!button||!questionActions.has(button.dataset.action))return;
    requestAnimationFrame(()=>{
      const review=button.dataset.action.startsWith('review-');
      const editor=button.dataset.action.startsWith('editor-');
      const target=document.querySelector(review?'.review-response-pane':editor?'.ed-configuration':'.exam-question');
      if(target)target.scrollIntoView({block:'start',behavior:reduceMotion.matches?'auto':'smooth'});
      schedule();
    });
  });
  // Au changement d'espace ou d'onglet, montrer le titre de la nouvelle page.
  window.addEventListener('hashchange',()=>{
    if(!mobile.matches)return;
    requestAnimationFrame(()=>{window.scrollTo(0,0);schedule();});
  });
  function isWriting(element){
    return !!element&&element.matches?.('input:not([type="checkbox"]):not([type="radio"]),textarea,select,[contenteditable="true"]');
  }
  document.addEventListener('focusin',event=>{
    if(mobile.matches&&isWriting(event.target))document.body.classList.add('mobile-input-focus');
  });
  document.addEventListener('focusout',()=>{
    requestAnimationFrame(()=>{
      if(!isWriting(document.activeElement))document.body.classList.remove('mobile-input-focus');
    });
  });
})();