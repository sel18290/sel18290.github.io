window.CORTEX_DOCS=(function cortexDocEngine(){
  'use strict';
  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const doc=(n,title,body,source='')=>`<article class="source-document"><div class="source-head"><strong>DOCUMENT ${n}</strong><span>${title}</span></div><div class="source-body">${body}</div>${source?`<div class="source-cite">${h(source)}</div>`:''}</article>`;
  const sections=[
  {title:'Le sommeil, un rythme essentiel',subtitle:'PARTIE 1 — ANALYSER UNE SITUATION',description:'Lire attentivement les documents. Chaque réponse doit s’appuyer sur les informations fournies.',points:4,footer:'Analyse de situation · rythme de vie et dette de sommeil',document:doc(1,'Une semaine dans la vie de Dylan',`
  <p>Dylan, 16 ans, est élève de seconde professionnelle. Depuis la rentrée, il joue en ligne jusqu’à <strong>1 h 30</strong> et boit régulièrement une boisson énergisante vers <strong>21 h</strong>. Il doit se lever à <strong>6 h</strong> pour aller en cours.</p>
  <div class="source-subtitle">DURÉE DE SOMMEIL DE DYLAN</div>
  <div class="sleep-bar-legend"><span>0 h</span><span>4 h</span><span>8 h</span><span>12 h</span></div>
  <div class="sleep-bar-row"><strong>Jours de cours</strong><div class="sleep-bar-track"><span style="width:33.333%;background:#886a56">4 h</span></div></div>
  <div class="sleep-bar-row"><strong>Week-end</strong><div class="sleep-bar-track"><span style="width:100%;background:#a2a4a0">12 h</span></div></div>
  <p class="source-highlight"><strong>Repère :</strong> entre 14 et 17 ans, il est recommandé de dormir 8 à 10 h par nuit. Dylan bâille en classe, se concentre mal, se dispute avec ses amis et ne va plus au football.</p>`,
  'Source : situation fictive ; données sur le sommeil des adolescents, Assurance maladie (2025-2026).')},
  {title:'À chacun son rythme',subtitle:'PARTIE 2 — COMPRENDRE LES RYTHMES',description:'Certains phénomènes sont commandés par l’organisme ; d’autres dépendent de l’emploi du temps.',points:3,footer:'Notions : rythme biologique, cycle, fréquence, rythme social',document:doc(2,'Rythmes biologiques et rythmes sociaux',`
  <p><strong>Rythme biologique :</strong> phénomène naturel qui se répète. Un cycle correspond à une répétition complète. Sa <strong>fréquence</strong> indique combien de fois le phénomène se produit en un temps donné.</p>
  <div class="rhythm-panel"><div><strong>ULTRADIEN</strong><p><b>Période inférieure à 24 h</b></p><small>Ex. : battements du cœur, respiration.</small></div><div class="rhythm-symbol">●●●●●●●●</div></div>
  <div class="rhythm-panel"><div><strong>CIRCADIEN</strong><p><b>Période d’environ 24 h</b></p><small>Ex. : alternance veille / sommeil.</small></div><div class="rhythm-symbol gray">●　●　●　●</div></div>
  <div class="rhythm-panel"><div><strong>INFRADIEN</strong><p><b>Période supérieure à 24 h</b></p><small>Ex. : cycle menstruel.</small></div><div class="rhythm-symbol gray">●　　　　●</div></div>
  <p><strong>Rythme social :</strong> activité organisée par les horaires de la vie quotidienne : aller en cours à 8 h ou s’entraîner au football chaque mardi à 18 h. Il ne s’agit pas d’un phénomène physiologique.</p>`,
  'Source : Éduscol, programme de PSE seconde, module A2 (2019), adaptation pédagogique.')},
  {title:'Dans les coulisses d’une nuit',subtitle:'PARTIE 3 — LES PHASES DU SOMMEIL',description:'Une nuit de sommeil est une succession de cycles, chacun constitué de plusieurs phases.',points:4,footer:'Notions : cycles, phases et rôles du sommeil',document:doc(3,'Comment se déroule une nuit de sommeil ?',`
  <p>Un cycle de sommeil dure en moyenne <strong>90 minutes</strong> (durée variable). Une nuit se compose en général de <strong>4 à 6 cycles successifs</strong>.</p><div class="source-subtitle">REPRÉSENTATION SIMPLIFIÉE D’UNE NUIT</div>
  <div class="cycle-grid">${[1,2,3,4,5].map(i=>`<div><strong>CYCLE ${i}</strong><small>≈ 90 min</small></div>`).join('')}</div>
  <p>À l’intérieur d’un cycle : trois grandes phases se succèdent, avec des durées qui varient au cours de la nuit.</p>
  <div class="phase-grid"><div><strong>1 · SOMMEIL LENT LÉGER</strong><p>Endormissement ; activité du corps qui ralentit.</p></div><div><strong>2 · SOMMEIL LENT PROFOND</strong><p>Récupération physique importante.</p></div><div><strong>3 · SOMMEIL PARADOXAL</strong><p>Rêves fréquents ; activité cérébrale élevée.</p></div></div>
  <p class="source-highlight"><strong>Rôle du sommeil :</strong> la nuit participe à la réparation de l’organisme, à la mémorisation des cours et à la régulation des émotions.</p>`,
  'Source : Inserm, dossier « Sommeil » ; Assurance maladie, sommeil de l’adolescent.')},
  {title:'Quand le manque de sommeil s’installe',subtitle:'PARTIE 4 — SANTÉ ET VIE SOCIALE',description:'Les conséquences ne concernent pas uniquement la fatigue : elles peuvent toucher plusieurs domaines.',points:4,footer:'Notions : retentissement sur la santé, la vie sociale et professionnelle',document:doc(4,'Les conséquences d’un sommeil insuffisant',`
  <p>Un manque de sommeil répété peut produire des effets visibles rapidement. Des études observent aussi des <strong>associations</strong> avec certains problèmes de santé à long terme.</p>
  <div class="consequence-grid"><div><strong>CAPACITÉS ET HUMEUR</strong><p>Fatigue, somnolence, irritabilité, difficultés d’attention et de mémoire.</p></div><div><strong>RELATIONS SOCIALES</strong><p>Disputes plus fréquentes, irritabilité envers les proches, activités et sorties abandonnées.</p></div><div><strong>ÉTUDES ET TRAVAIL</strong><p>Baisse de concentration, erreurs, accidents liés à la somnolence, absentéisme possible.</p></div></div>
  <div class="source-subtitle">À PLUS LONG TERME : DES ASSOCIATIONS ÉTUDIÉES CHEZ L’ADULTE</div>
  <div class="risk-block"><strong>AVC ET SANTÉ CARDIOVASCULAIRE</strong><p>Les durées de sommeil très courtes sont associées, dans des études sur des adultes, à un risque plus élevé d’AVC (accident vasculaire cérébral) et à des troubles cardiovasculaires.</p></div>
  <div class="risk-block"><strong>QUALITÉ DES SPERMATOZOÏDES</strong><p>Un sommeil de mauvaise qualité est associé, chez des hommes adultes étudiés, à une diminution du nombre et de la mobilité des spermatozoïdes.</p></div>
  <p class="source-caution">Important : une association statistique ne signifie pas que ces maladies apparaîtront chez chaque personne qui dort peu.</p>`,
  'Sources : Ameli ; Inserm ; méta-analyse AVC (GeroScience, 2025) ; étude qualité du sperme (Human Reproduction, 2026).')},
  {title:'Quand l’horloge se décale',subtitle:'PARTIE 5 — DÉSYNCHRONISATION',description:'La lumière, les écrans et les contraintes d’horaires peuvent dérégler le sommeil.',points:3,footer:'Notions : horloge interne, mélatonine, désynchronisation',document:
  doc(5,'L’horloge biologique et la mélatonine',`
  <p>La mélatonine est une <strong>hormone</strong> qui signale à l’organisme l’arrivée de la nuit et facilite l’endormissement. L’obscurité favorise sa production ; la lumière du soir, notamment celle des écrans, peut la retarder.</p>
  <div class="source-subtitle">LES SIGNAUX QUI RÈGLENT L’HORLOGE INTERNE</div><div class="daynight"><div><strong>JOUR : lumière</strong><p>Éveil favorisé ; la lumière du matin aide à se recaler.</p></div><div><strong>NUIT : obscurité</strong><p>Mélatonine favorisée ; sommeil plus facile.</p></div></div>
  <p><strong>Désynchronisation :</strong> décalage entre l’horloge biologique de l’individu et les horaires imposés par sa vie quotidienne.</p>`)+
  doc(6,'Deux situations de décalage',`<div class="case-grid"><div><strong>DYLAN, PENDANT LES VACANCES</strong><p>Il dort de <strong>10 h à 17 h</strong>, puis doit retrouver ses horaires de cours : sommeil de <strong>2 h à 6 h</strong>.</p></div><div><strong>CAMILLE, RÉCEPTIONNISTE</strong><p>Elle travaille de <strong>22 h à 6 h</strong>. Dormir de jour est plus difficile (bruit, lumière) et voir ses proches devient compliqué.</p></div></div>`,
  'Sources : Ameli, sommeil de l’adolescent ; Éduscol, PSE seconde, module A2 (2019).')},
  {title:'Mieux dormir, mieux se protéger',subtitle:'PARTIE 6 — PRÉVENTION ET TRAVAIL DE NUIT',description:'Des habitudes de vie et des règles professionnelles protègent la santé.',points:2,footer:'Évaluation /20 · Programme officiel PSE seconde professionnelle, module A2',document:
  doc(7,'Travail de nuit : des garanties pour les salariés',`
  <p>Dans le cas général, le travail de nuit est encadré. Les accords collectifs peuvent préciser certaines règles ou prévoir des exceptions.</p>
  <div class="work-grid"><div><b>8 h</b><span>Durée quotidienne maximale habituelle de travail de nuit.</span></div><div><b>11 h</b><span>Repos quotidien prévu en principe après le travail.</span></div><div><b>REPOS</b><span>Repos compensateur obligatoire ; une majoration de salaire peut s’ajouter.</span></div><div><b>SANTÉ</b><span>Suivi par le service de prévention et de santé au travail.</span></div></div>
  <p><strong>Compte professionnel de prévention (C2P) :</strong> sous certaines conditions d’exposition au travail de nuit, des points permettent notamment une formation, un temps de travail réduit ou un départ anticipé à la retraite.</p>`)+
  doc(8,'Quelles habitudes favorisent le sommeil ?',`
  <div class="tip-table"><div><b>ÉCRANS</b><span>Faire une pause 1 à 2 h avant le coucher : moins de lumière et de stimulation.</span></div><div><b>BOISSONS</b><span>Éviter les boissons caféinées en fin de journée : la caféine maintient éveillé.</span></div><div><b>HORAIRES</b><span>Garder des heures de coucher et de lever régulières, y compris le week-end.</span></div><div><b>CHAMBRE</b><span>Privilégier une pièce sombre, calme, à environ 18–19 °C.</span></div></div>`,
  'Sources : Service Public, « Travail de nuit » ; Assurance maladie, « Comment mieux dormir à l’adolescence ? » (2025).')}
  ];
  const prompts=[
  [1,'Calculer le nombre d’heures qui manquent à Dylan chaque nuit de cours pour atteindre au moins 8 h de sommeil.',1,0],
  [2,'Relever deux habitudes de Dylan qui peuvent retarder son endormissement.',1,0],
  [3,'Citer une conséquence de son manque de sommeil sur sa scolarité et une sur ses relations sociales.',1,0],
  [4,'Formuler le problème de santé de Dylan sous la forme d’une question commençant par « Comment… ? » ou « Pourquoi… ? ».',1,0],
  [5,'À partir du document 2, expliquer ce qu’est un rythme biologique puis définir sa fréquence.',1,1],
  [6,'Classer les exemples ci-dessous en rythmes ultradien, circadien ou infradien.',1.5,1],
  [7,'Expliquer pourquoi l’entraînement du mardi à 18 h est un rythme social et non un rythme biologique.',0.5,1],
  [8,'Indiquer la durée moyenne d’un cycle de sommeil.',0.5,2],
  [9,'Estimer le nombre de cycles correspondant à 7 h 30 de sommeil. Écrire le calcul.',1,2],
  [10,'Compléter : la récupération physique est surtout liée au sommeil ....................... ; les rêves sont fréquents pendant le sommeil ....................... .',1,2],
  [11,'À l’aide du document 3, expliquer pourquoi une bonne nuit de sommeil peut aider Dylan à mieux retenir ses leçons.',1.5,2],
  [12,'Relever deux effets possibles du manque de sommeil sur les capacités ou l’humeur de Dylan.',1,3],
  [13,'Citer deux conséquences possibles sur la vie sociale de Dylan.',1,3],
  [14,'Indiquer le risque cardiovasculaire mentionné dans le document et une modification possible des spermatozoïdes associée à un mauvais sommeil.',1,3],
  [15,'Dans un contexte professionnel, relever une conséquence du manque de sommeil et expliquer en quoi elle peut être dangereuse.',1,3],
  [16,'Expliquer le rôle de la mélatonine et l’effet possible d’un écran lumineux utilisé tard le soir.',1,4],
  [17,'Pourquoi le passage des horaires de vacances aux horaires de cours peut-il désynchroniser le sommeil de Dylan ?',1,4],
  [18,'À partir du cas de Camille, citer une difficulté pour son sommeil et une conséquence sur sa vie sociale.',1,4],
  [19,'À partir du document 7, indiquer une contrepartie du travail de nuit et un avantage du C2P.',1,5],
  [20,'À partir du document 8, proposer deux conseils concrets à Dylan pour améliorer son sommeil.',1,5]
  ];
  const demoExam={
    id:'sommeil-pdf-a2',title:'Le sommeil, un rythme essentiel — contrôle PDF',level:'Seconde Bac Pro',chapter:'PSE · Module A2',duration:60,code:'SOMMEILPDF',open:true,doc:'',
    sourceType:'pdf-reconstitue',pdfSource:true,questions:prompts.map(([n,prompt,points,section])=>({id:'pdfq'+n,number:n,type:'text',prompt,points,section}))
  };
  const guidePanel=()=>`<section class="panel import-lead"><p class="eyebrow">Nouveau · Importation documentaire</p><h1>Importer un contrôle <span class="accent-word">PDF ou Word.</span></h1><p class="muted">Conserve ton éditeur de questions et tes QCM, et ajoute un second mode : charger un document existant, lire ses questions, vérifier l'extraction et créer les champs où l'élève répondra.</p><div class="import-tip">◇ Les fichiers sont analysés <strong>localement dans ton navigateur</strong> pour cette démonstration. Aucun fichier n'est envoyé à un serveur. Le rendu original des PDF peut être consulté. Les tableaux, numéros et questions détectés doivent être vérifiés avant publication.</div><div class="import-controls"><div class="field"><label for="cortex-import-file">Fichier PDF ou Word (.docx)</label><input type="file" id="cortex-import-file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div><button type="button" class="btn" data-action="import-doc-file">Analyser le fichier →</button><button type="button" class="btn secondary" data-action="try-pdf-demo">Tester le PDF fourni en exemple</button></div><div id="import-progress" role="status" class="small muted"></div><div id="import-results"></div></section>`;
  function renderSample(e,q,idx,answer,answered){
    const section=sections[q.section]||sections[0];const a=h(answer||'');
    const choices=['Ultradien','Circadien','Infradien'];
    const select=(id,label,selected)=>`<label class="table-select"><span>${h(label)}</span><select data-doc-sub="${h(q.id)}" data-subkey="${id}" aria-label="${h(label)}"><option value="">— Choisir —</option>${choices.map(c=>`<option ${selected===c?'selected':''}>${c}</option>`).join('')}</select></label>`;
    const field=q.number===6?`<div class="doc-answer-table"><div class="doc-answer-heading"><b>Exemple</b><b>Type de rythme à indiquer</b></div>${['Battements du cœur','Alternance veille / sommeil','Cycle menstruel'].map((l,i)=>select(String(i),l,answer.split(' | ')[i]||'')).join('')}</div>`:q.number===10?
      `<div class="doc-fill"><label>Récupération physique : sommeil <input data-doc-fill="${h(q.id)}" data-subkey="0" type="text" placeholder="Compléter…" value="${h(answer.split(' | ')[0]||'')}"></label><label>Rêves fréquents : sommeil <input data-doc-fill="${h(q.id)}" data-subkey="1" type="text" placeholder="Compléter…" value="${h(answer.split(' | ')[1]||'')}"></label></div>`:
      `<div class="field"><label for="student-answer">Réponse à rédiger</label><textarea data-answer="${h(q.id)}" id="student-answer" rows="${q.number===4||q.number===11||q.number===15?5:3}" placeholder="Rédige ta réponse ici. Tu peux utiliser plusieurs lignes…">${a}</textarea><small>${q.points} point${q.points>1?'s':''} · Sauvegarde locale automatique</small></div>`;
    return `<div class="doc-exam-ribbon"><span>ÉVALUATION PSE / SECONDE PROFESSIONNELLE</span><span>MODULE A2 · / 20</span></div><section class="doc-section"><div class="doc-section-meta">${h(section.subtitle)} <span>DOCUMENT SOURCE · PAGE ${q.section+1}/6</span></div><h2>${h(section.title)}</h2><p class="doc-intro">${h(section.description)}</p><div class="doc-original">${section.document}</div><p class="doc-footer">${h(section.footer)}</p></section><div class="doc-question-response"><div class="question-number">QUESTION ${q.number} / 20 · ${q.points} PT</div><h2>${h(q.prompt)}</h2>${field}</div>`;
  }
  const importlib={};
  function addScript(url){
    if(importlib[url])return importlib[url];
    return importlib[url]=new Promise((resolve,reject)=>{
      const tag=document.createElement('script');tag.src=url;tag.async=true;tag.onload=resolve;tag.onerror=()=>reject(new Error('Bibliothèque de lecture indisponible. Réessaie avec une connexion internet.'));document.head.appendChild(tag);
    });
  }
  async function parseFile(file,onStatus){
    if(!file)throw Error('Choisis d’abord un PDF ou un document .docx.');
    if(file.size>8*1024*1024)throw Error('Pour cette démonstration, la limite est de 8 Mo par fichier.');
    const suffix=file.name.toLowerCase().split('.').pop();
    if(!['pdf','docx'].includes(suffix))throw Error('Formats pris en charge : PDF et Word (.docx). Le vieux format .doc doit être converti en .docx.');
    onStatus('Lecture locale du fichier…');
    const buf=await file.arrayBuffer(),pages=[],kind=suffix;
    if(kind==='pdf'){
      await addScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      const pdf=window.pdfjsLib;
      if(!pdf)throw Error('Impossible de charger le lecteur PDF.');
      pdf.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const reader=await pdf.getDocument({data:new Uint8Array(buf)}).promise;
      if(reader.numPages>35)throw Error('Limite de la démonstration : 35 pages.');
      for(let pageNumber=1;pageNumber<=reader.numPages;pageNumber++){
        onStatus('Extraction de la page '+pageNumber+' / '+reader.numPages+'…');
        const page=await reader.getPage(pageNumber),items=(await page.getTextContent()).items.filter(x=>typeof x.str==='string'&&x.str.trim());
        const lines=[];
        for(const item of items){const y=item.transform[5],x=item.transform[4];let line=lines.find(z=>Math.abs(z.y-y)<3);if(!line){line={y,parts:[]};lines.push(line);}line.parts.push({x,str:item.str});}
        lines.sort((a,b)=>b.y-a.y);
        pages.push(lines.map(l=>l.parts.sort((a,b)=>a.x-b.x).map(x=>x.str).join(' ')).join('\n'));
      }
    }else{
      await addScript('https://unpkg.com/mammoth@1.10.0/mammoth.browser.min.js');
      if(!window.mammoth)throw Error('Impossible de charger le lecteur Word.');
      const result=await window.mammoth.extractRawText({arrayBuffer:buf});
      pages.push(result.value||'');
    }
    const raw=pages.join('\n\n'),qs=[];
    const allLines=raw.split('\n').map(s=>s.trim()).filter(Boolean);
    for(let i=0;i<allLines.length;i++){
      const line=allLines[i];
      // Numéro dans la marge + question, ou ligne commençant par "Question N"
      const match=line.match(/^(?:Question\s*)?([1-9]|1\d|20)\s*[\).:\s-]+\s*(.{18,})$/i);
      if(!match)continue;
      let question=match[2].replace(/\s+\d+(?:[.,]\d+)?\s*pts?\s*$/i,'').trim();
      if(question.length<18)continue;
      // La suite d'un énoncé peut être à la ligne, mais ne doit pas avaler le document suivant
      for(let offset=1;offset<=2;offset++){
        const next=allLines[i+offset]||'';
        if(!next||/^(?:Question\s*)?\d{1,2}\s|^(?:DOCUMENT|PARTIE|Source\s*:|Notions\s*:)/i.test(next)||/\bpts?\s*$/.test(next))break;
        if(question.endsWith('?')||question.endsWith('.'))break;
        question+=' '+next;
      }
      if(!qs.some(q=>q.prompt===question))qs.push({id:'import-q-'+(qs.length+1),prompt:question,type:'text',points:1});
    }
    onStatus('Extraction terminée : '+pages.length+' page(s), '+qs.length+' question(s) proposées. Contrôle manuel requis.');
    return {kind,filename:file.name,pages,raw,questions:qs.slice(0,80),blob:file,sourceId:'doc-'+Date.now()+'-'+Math.floor(Math.random()*99999)};
  }
  async function storeFile(d){
    return await new Promise((resolve,reject)=>{
      const open=indexedDB.open('cortex-demo-documents-v1',1);
      open.onupgradeneeded=()=>open.result.createObjectStore('files');
      open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{
        const db=open.result,tx=db.transaction('files','readwrite');
        tx.objectStore('files').put({blob:d.blob,kind:d.kind,name:d.filename},d.sourceId);
        tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>{db.close();reject(tx.error);};
      };
    });
  }
  async function readFile(id){
    return await new Promise((resolve,reject)=>{
      const open=indexedDB.open('cortex-demo-documents-v1',1);
      open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{
        const db=open.result,tx=db.transaction('files','readonly'),req=tx.objectStore('files').get(id);
        req.onsuccess=()=>{db.close();resolve(req.result||null)};
        req.onerror=()=>{db.close();reject(req.error)};
      };
    });
  }
  function importReview(d){
    const candidates=d.questions||[];
    return `<div class="import-review"><div class="import-summary"><span class="chip teal">Fichier lu : ${h(d.filename)}</span><span class="chip">${d.pages.length} page(s)</span><span class="chip blue">${candidates.length} question(s) détectée(s)</span></div>
    <div class="import-columns"><section class="panel"><h3>Documents et tableaux du fichier</h3><p class="small muted">Le PDF original peut être conservé dans ce navigateur, avec sa mise en page et ses schémas. L’extraction texte ci-dessous ne préserve pas toujours la disposition des tableaux.</p><details><summary>Afficher le texte extrait (vérification)</summary><pre class="doc-raw-preview">${h(d.raw.slice(0,26000))}</pre></details><button class="btn ghost small" data-action="preview-import-original">Voir le document original</button></section>
    <section class="panel"><h3>Questions proposées</h3><p class="small muted">Corrige les énoncés avant d'enregistrer. Tu peux ajouter les questions manquantes ensuite dans l'éditeur.</p><div class="import-question-list">${candidates.length?candidates.map((q,i)=>`<label><strong>Question ${i+1}</strong><textarea rows="2" data-import-q="${i}">${h(q.prompt)}</textarea></label>`).join(''):'<p class="small muted">Aucun numéro de question reconnu automatiquement. Crée les questions dans l’éditeur après import.</p>'}</div><div class="btn-row"><button class="btn" data-action="save-import">Enregistrer le contrôle importé →</button></div></section></div></div>`;
  }
  return {demoExam,sections,renderSample,guidePanel,parseFile,storeFile,readFile,importReview};
})();
