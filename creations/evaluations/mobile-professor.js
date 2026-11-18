/* CORTEX · Navigation professeur native smartphone. Fonctionne aussi en mode « site ordinateur » Android. */
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
    {tab:'suivi',label:'Suivi des épreuves',icon:'◷'},
    {tab:'analyses',label:'Analyses',icon:'▥'},
    {tab:'import',label:'Importer PDF / Word',icon:'⇪'},
    {tab:'creer',label:'Créer un contrôle',icon:'＋'}
  ];
  let bar=null,drawer=null,pending=0,lastTab='';
  function onPhone(){
    // screen.width reste généralement la largeur physique même quand Chrome présente
    // un viewport « ordinateur » de 980 px sur un téléphone.
    const sw=window.screen?.width||window.innerWidth;
    const touched=(navigator.maxTouchPoints||0)>0;
    return phoneQuery.matches ||
      (coarseQuery.matches&&(window.innerWidth<=1100||sw<=820)) ||
      (touched && /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent) && sw<=920);
  }
  function activeTab(){
    const hash=decodeURIComponent(location.hash.slice(1)||'');
    const bits=hash.split('/');
    return bits[0]==='professeur'?(bits[1]||'dashboard'):null;
  }
  function makeTab(item){
    const button=document.createElement('button');
    button.type='button';
    button.setAttribute('data-action','teacher-tab');
    button.setAttribute('data-tab',item.tab);
    button.innerHTML='<span aria-hidden="true">'+item.icon+'</span>'+item.label;
    return button;
  }
  function ensureBar(){
    if(bar&&document.body.contains(bar))return;
    bar=document.createElement('nav');
    bar.className='phone-teacher-nav';
    bar.setAttribute('aria-label','Navigation professeur sur téléphone');
    tabs.forEach(item=>bar.appendChild(makeTab(item)));
    const extra=document.createElement('button');
    extra.type='button';extra.id='phone-teacher-more-button';
    extra.setAttribute('aria-expanded','false');
    extra.setAttribute('aria-controls','phone-teacher-more');
    extra.innerHTML='<span aria-hidden="true">☰</span>Plus';
    extra.addEventListener('click',()=>toggleDrawer(!drawer||drawer.hidden));
    bar.appendChild(extra);
    document.body.appendChild(bar);
    drawer=document.createElement('section');drawer.id='phone-teacher-more';
    drawer.className='phone-teacher-more';drawer.hidden=true;
    drawer.innerHTML='<h2>Tous les outils professeur</h2><div class="phone-teacher-more-grid"></div>';
    const grid=drawer.querySelector('.phone-teacher-more-grid');
    more.forEach(item=>grid.appendChild(makeTab(item)));
    document.body.appendChild(drawer);
  }
  function toggleDrawer(open){
    if(!drawer)return;
    drawer.hidden=!open;
    bar?.querySelector('#phone-teacher-more-button')?.setAttribute('aria-expanded',String(open));
  }
  function drawHeader(tab){
    const workspace=app.querySelector('.workspace');
    if(!workspace)return;
    let header=workspace.querySelector('.phone-teacher-header');
    if(!header){
      header=document.createElement('div');header.className='phone-teacher-header';
      workspace.insertBefore(header,workspace.firstChild);
    }
    const labels={
      dashboard:'Mon espace',classes:'Mes classes',controles:'Mes contrôles',
      copies:'Copies et notes',suivi:'Suivi des épreuves',
      analyses:'Analyses pédagogiques',import:'Importer un contrôle',
      creer:'Créer un contrôle',corriger:'Corriger une copie'
    };
    const label=labels[tab]||'Espace professeur';
    if(header.dataset.tab!==tab){
      header.dataset.tab=tab;
      header.innerHTML='<div><small>CORTEX / PROFESSEUR</small><strong>'+label+
        '</strong></div><button type="button" class="btn secondary" data-phone-open-tools>☰ Outils</button>';
      header.querySelector('[data-phone-open-tools]').addEventListener('click',()=>toggleDrawer(true));
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
          const btn=document.createElement('button');btn.type='button';btn.dataset.action=action;
          btn.innerHTML='<span aria-hidden="true">'+icon+'</span>'+label;quick.appendChild(btn);
        }
        main.insertBefore(quick,main.firstChild);
      }
    }
  }
  function sync(){
    pending=0;
    const phone=onPhone();
    const tab=activeTab();
    html.classList.toggle('cortex-phone',phone);
    html.classList.toggle('teacher-mobile-active',phone&&!!tab);
    if(!phone||!tab){if(drawer)toggleDrawer(false);lastTab='';return;}
    ensureBar();
    if(tab!==lastTab){toggleDrawer(false);lastTab=tab;}
    drawHeader(tab);
    bar.querySelectorAll('button[data-tab]').forEach(button=>{
      const selected=button.dataset.tab===tab;
      if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    const extra=bar.querySelector('#phone-teacher-more-button');
    if(more.some(item=>item.tab===tab)||tab==='corriger'){
      extra.setAttribute('aria-current','page');
    }else extra.removeAttribute('aria-current');
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(sync);}
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  addEventListener('hashchange',schedule);
  addEventListener('resize',schedule);
  phoneQuery.addEventListener?.('change',schedule);
  coarseQuery.addEventListener?.('change',schedule);
  addEventListener('keydown',event=>{if(event.key==='Escape')toggleDrawer(false);});
  document.addEventListener('click',event=>{
    const clicked=event.target.closest('.phone-teacher-more-grid [data-action]');
    if(clicked)toggleDrawer(false);
    if(drawer&&!drawer.hidden&&!event.target.closest('.phone-teacher-more,.phone-teacher-header,.phone-teacher-nav'))
      toggleDrawer(false);
  });
  schedule();
})();