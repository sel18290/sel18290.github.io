/* CORTEX · Espace professeur mobile 3.0
   Navigation accessible, panneau Outils refermable, raccourcis et contexte de page.
   Aucune modification des données enregistrées ou de l'interface ordinateur. */
(function mobileProfessor(){
  'use strict';
  const app=document.getElementById('app');
  if(!app)return;
  const html=document.documentElement;
  const phoneQuery=window.matchMedia('(max-width:760px)');
  const coarseQuery=window.matchMedia('(pointer:coarse)');
  const tabs=[
    {tab:'dashboard',label:'Accueil',icon:'⌂'},
    {tab:'classes',label:'Classes',icon:'▣'},
    {tab:'controles',label:'Contrôles',icon:'▤'},
    {tab:'copies',label:'Copies',icon:'✎'}
  ];
  const more=[
    {tab:'suivi',label:'Suivi des épreuves',icon:'◷',detail:'Épreuves en cours et interruptions'},
    {tab:'analyses',label:'Analyses',icon:'▥',detail:'Résultats et indicateurs'},
    {tab:'import',label:'Importer un PDF / Word',icon:'⇪',detail:'Créer depuis un document'},
    {tab:'creer',label:'Créer un contrôle',icon:'＋',detail:'Énoncés, documents et barème'}
  ];
  const labels={
    dashboard:'Mon espace',classes:'Mes classes',controles:'Mes contrôles',
    copies:'Copies et notes',suivi:'Suivi des épreuves',
    analyses:'Analyses pédagogiques',import:'Importer un contrôle',
    creer:'Créer un contrôle',corriger:'Corriger une copie'
  };
  let bar=null,drawer=null,backdrop=null,pending=0,lastRoute='',opener=null;
  function onPhone(){
    const screenWidth=window.screen?.width||window.innerWidth;
    const touched=(navigator.maxTouchPoints||0)>0;
    return phoneQuery.matches ||
      (coarseQuery.matches&&(window.innerWidth<=1100||screenWidth<=820)) ||
      (touched&&/Android|iPhone|iPod|Mobile/i.test(navigator.userAgent)&&screenWidth<=920);
  }
  function currentRoute(){return decodeURIComponent(location.hash.slice(1)||'accueil');}
  function activeTab(){
    const bits=currentRoute().split('/');
    return bits[0]==='professeur'?(bits[1]||'dashboard'):null;
  }
  function makeTab(item,description){
    const button=document.createElement('button');
    button.type='button';
    button.dataset.action='teacher-tab';
    button.dataset.tab=item.tab;
    if(description){
      button.innerHTML='<span aria-hidden="true">'+item.icon+'</span><strong>'+item.label+
        '</strong><small>'+item.detail+'</small>';
    }else button.innerHTML='<span aria-hidden="true">'+item.icon+'</span>'+item.label;
    return button;
  }
  function setOpen(open,source,restore=true){
    if(!drawer)return;
    const wasOpen=!drawer.hidden;
    if(open&&(!onPhone()||!activeTab()))return;
    if(open&&source)opener=source;
    drawer.hidden=!open;
    backdrop.hidden=!open;
    document.body.classList.toggle('mobile-tools-open',open);
    const button=bar?.querySelector('#phone-teacher-more-button');
    if(button)button.setAttribute('aria-expanded',String(open));
    const headerButton=app.querySelector('.phone-teacher-header [data-phone-open-tools]');
    if(headerButton){
      headerButton.setAttribute('aria-expanded',String(open));
      headerButton.textContent=open?'✕ Fermer':'☰ Outils';
    }
    if(open){
      if(!wasOpen)requestAnimationFrame(()=>drawer.querySelector('.phone-teacher-close')?.focus({preventScroll:true}));
    }else if(wasOpen&&restore){
      const target=opener&&opener.isConnected?opener:button;
      target?.focus?.({preventScroll:true});
    }
    if(!open)opener=null;
  }
  function toggleDrawer(source){setOpen(drawer?.hidden!==false,source);}
  function ensureBar(){
    if(bar&&document.body.contains(bar))return;
    bar=document.createElement('nav');
    bar.className='phone-teacher-nav';
    bar.setAttribute('aria-label','Navigation principale professeur');
    tabs.forEach(item=>bar.appendChild(makeTab(item)));
    const extra=document.createElement('button');
    extra.type='button';
    extra.id='phone-teacher-more-button';
    extra.setAttribute('aria-expanded','false');
    extra.setAttribute('aria-controls','phone-teacher-more');
    extra.innerHTML='<span aria-hidden="true">☰</span>Outils';
    extra.addEventListener('click',()=>toggleDrawer(extra));
    bar.appendChild(extra);
    document.body.appendChild(bar);

    backdrop=document.createElement('button');
    backdrop.type='button';
    backdrop.hidden=true;
    backdrop.className='phone-teacher-backdrop';
    backdrop.setAttribute('aria-label','Fermer les outils');
    backdrop.addEventListener('click',()=>setOpen(false));
    document.body.appendChild(backdrop);

    drawer=document.createElement('section');
    drawer.id='phone-teacher-more';
    drawer.className='phone-teacher-more';
    drawer.hidden=true;
    drawer.setAttribute('role','dialog');
    drawer.setAttribute('aria-modal','true');
    drawer.setAttribute('aria-labelledby','phone-tools-title');
    drawer.innerHTML='<div class="phone-teacher-more-head">'+
      '<div><small>CORTEX / NAVIGATION</small><h2 id="phone-tools-title">Tous les outils</h2>'+
      '<p>Accède aux fonctions de ton espace professeur.</p></div>'+
      '<button class="phone-teacher-close" type="button" aria-label="Fermer le panneau Outils">✕</button></div>'+
      '<div class="phone-teacher-more-grid"></div>'+
      '<button class="phone-teacher-dismiss" type="button">Fermer les outils</button>';
    const grid=drawer.querySelector('.phone-teacher-more-grid');
    more.forEach(item=>grid.appendChild(makeTab(item,true)));
    drawer.querySelector('.phone-teacher-close').addEventListener('click',()=>setOpen(false));
    drawer.querySelector('.phone-teacher-dismiss').addEventListener('click',()=>setOpen(false));
    // Fermer avant que le routeur global ne reconstruise l'écran professeur.
    grid.addEventListener('click',event=>{
      if(event.target.closest('[data-action="teacher-tab"]'))setOpen(false,null,false);
    },true);
    // Geste naturel de fermeture en abaissant l'entête.
    const head=drawer.querySelector('.phone-teacher-more-head');
    let y0=null;
    head.addEventListener('touchstart',event=>{
      if(event.touches.length===1)y0=event.touches[0].clientY;
    },{passive:true});
    head.addEventListener('touchend',event=>{
      if(y0!==null&&event.changedTouches[0].clientY-y0>70)setOpen(false);
      y0=null;
    },{passive:true});
    document.body.appendChild(drawer);
  }
  function drawHeader(tab){
    const workspace=app.querySelector('.workspace');
    if(!workspace)return;
    let header=workspace.querySelector('.phone-teacher-header');
    if(!header){
      header=document.createElement('div');
      header.className='phone-teacher-header';
      workspace.insertBefore(header,workspace.firstChild);
    }
    if(header.dataset.tab!==tab){
      header.dataset.tab=tab;
      header.innerHTML='<div class="phone-teacher-heading"><small>CORTEX / PROFESSEUR</small>'+
        '<strong>'+labels[tab]+'</strong></div>'+
        '<button type="button" class="btn secondary" data-phone-open-tools '+
        'aria-haspopup="dialog" aria-controls="phone-teacher-more" aria-expanded="false">☰ Outils</button>';
      header.querySelector('[data-phone-open-tools]').addEventListener('click',event=>{
        toggleDrawer(event.currentTarget);
      });
    }
    if(tab==='dashboard'){
      const main=workspace.querySelector('.workspace-main');
      if(main&&!main.querySelector('.phone-teacher-shortcuts')){
        const quick=document.createElement('div');
        quick.className='phone-teacher-shortcuts';
        quick.setAttribute('aria-label','Accès rapide');
        const actions=[
          ['＋','Créer une évaluation','create'],
          ['▣','Gérer mes classes','class-open-manager'],
          ['✎','Corriger les copies','go-copies'],
          ['⇪','Importer un document','go-import']
        ];
        for(const [icon,label,action] of actions){
          const button=document.createElement('button');
          button.type='button';
          button.dataset.action=action;
          button.innerHTML='<span aria-hidden="true">'+icon+'</span>'+label;
          quick.appendChild(button);
        }
        main.insertBefore(quick,main.firstChild);
      }
    }
  }
  function drawContext(tab){
    const root=app.querySelector(tab==='corriger'?'.review-workspace':tab==='creer'?'.ed-workspace':'.__absent__');
    if(!root||root.querySelector('.phone-context-nav'))return;
    const context=document.createElement('nav');
    context.className='phone-context-nav';
    context.setAttribute('aria-label',tab==='corriger'?'Accès rapide à la correction':'Accès rapide à la conception');
    const shortcuts=tab==='corriger'?[
      {label:'Document',target:'.review-document-pane'},
      {label:'Réponse',target:'.review-response-pane'},
      {label:'Noter',target:'.review-mark-zone'},
      {label:'Bilan',target:'.review-footer'}
    ]:[
      {label:'Questions',target:'.ed-navigation'},
      {label:'Document',target:'.ed-document'},
      {label:'Modifier',target:'.ed-configuration'},
      {label:'Enregistrer',action:'save-exam',primary:true}
    ];
    const reduce=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    shortcuts.forEach(item=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=item.label;
      if(item.primary)button.classList.add('phone-context-primary');
      if(item.action)button.dataset.action=item.action;
      else button.addEventListener('click',()=>{
        const target=root.querySelector(item.target);
        if(!target)return;
        target.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
      });
      context.appendChild(button);
    });
    const anchor=tab==='corriger'?root.querySelector('.review-layout'):
      root.querySelector('.ed-settings')||root.querySelector('.ed-layout');
    if(anchor)root.insertBefore(context,anchor);
  }
  function sync(){
    pending=0;
    const phone=onPhone();
    const tab=activeTab();
    html.classList.toggle('cortex-phone',phone);
    html.classList.toggle('teacher-mobile-active',phone&&!!tab);
    if(!phone||!tab){
      if(drawer)setOpen(false,null,false);
      lastRoute='';
      return;
    }
    ensureBar();
    const route=currentRoute();
    if(route!==lastRoute){
      setOpen(false,null,false);
      lastRoute=route;
    }
    drawHeader(tab);
    drawContext(tab);
    bar.querySelectorAll('button[data-tab]').forEach(button=>{
      if(button.dataset.tab===tab)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    const extra=bar.querySelector('#phone-teacher-more-button');
    if(more.some(item=>item.tab===tab)||tab==='corriger')extra.setAttribute('aria-current','page');
    else extra.removeAttribute('aria-current');
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(sync);}
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  window.addEventListener('resize',schedule);
  phoneQuery.addEventListener?.('change',schedule);
  coarseQuery.addEventListener?.('change',schedule);
  document.addEventListener('keydown',event=>{
    if(!drawer||drawer.hidden)return;
    if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
    if(event.key!=='Tab')return;
    const focusable=Array.from(drawer.querySelectorAll('button:not([disabled])'));
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&(document.activeElement===first||!drawer.contains(document.activeElement))){
      event.preventDefault();last.focus();
    }else if(!event.shiftKey&&(document.activeElement===last||!drawer.contains(document.activeElement))){
      event.preventDefault();first.focus();
    }
  });
  schedule();
})();