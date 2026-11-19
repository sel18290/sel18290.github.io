/* CORTEX · Recherche de stages (démo + réel)
 * Annuaire géographique : source IGN/OSM, sans entreprises inventées.
 * Résultats conservés localement 48 h; Albert classe uniquement les lieux réels avec la même API que CORTEX.
 */
(function(){
 "use strict";
 const ENDPOINT="https://jhtmaoeazmjigfruandl.supabase.co/functions/v1/cortex-stage-search";
 const SECTORS=[
  ["gestion-administration","Gestion-administration (AGOrA)"],
  ["commerce-vente","Commerce et vente (MCV)"],
  ["accueil","Métiers de l'accueil (MA)"]
 ];
 const TYPES={
  "gestion-administration":[
   ["administrations","Mairies et administrations","Courriers, dossiers, relation avec les usagers."],
   ["entreprises","Services administratifs d'entreprises","Suivi administratif et organisation d'activité."],
   ["associations","Associations et structures sociales","Gestion de dossiers et suivi des adhérents."],
   ["sante","Établissements de santé","Secrétariat et administration, hors soins."],
   ["education","Établissements scolaires et universitaires","Secrétariat et suivi de dossiers."],
   ["banques","Banques, assurances et mutuelles","Gestion des informations et documents administratifs."],
   ["comptabilite","Cabinets comptables et de gestion","Classement, facturation, suivi administratif."],
   ["rh","Agences d'emploi et services RH","Gestion de plannings, dossiers et documents."]
  ],
  "commerce-vente":[
   ["distribution","Supermarchés et grands magasins","Vente, rayons, stocks et conseil.","A"],
   ["mode","Mode, chaussures et accessoires","Conseil client et mise en valeur des produits.","A"],
   ["beaute","Beauté, cosmétiques et parfumeries","Conseil, vente et présentation commerciale.","A"],
   ["technologie","Téléphonie, informatique et électroménager","Vente-conseil et suivi de commandes.","A"],
   ["maison","Maison, décoration, bricolage et jardin","Merchandising, vente et relation client.","A"],
   ["alimentation","Commerces alimentaires spécialisés","Accueil, conseil et vente alimentaire.","A"],
   ["sports-culture","Sport, librairies, jouets et loisirs","Vente-conseil et animation commerciale.","A"],
   ["vehicules","Concessions automobiles, vélos et mobilité","Vente d'équipements et conseil clientèle.","A"],
   ["immobilier","Agences immobilières","Prospection, rendez-vous et relation client.","B"],
   ["finance","Banques et assurances","Offres de services, conseil et relation clientèle.","B"],
   ["relation-client","Téléconseil et services commerciaux","Prospection et fidélisation à distance.","B"],
   ["entreprises-b2b","Entreprises avec service commercial","Prospection et suivi commercial interentreprises.","B"]
  ],
  "accueil":[
   ["administrations","Mairies et services publics","Accueil et orientation des usagers."],
   ["sante","Hôpitaux, cliniques et centres de santé","Accueil et orientation, hors activités de soins."],
   ["hotels","Hôtels et hébergements touristiques","Réception et information des visiteurs."],
   ["tourisme","Offices de tourisme et points d'information","Renseignement et orientation du public."],
   ["culture","Musées, bibliothèques et lieux culturels","Accueil, information et gestion des flux."],
   ["evenementiel","Centres de congrès et espaces événementiels","Accueil de participants et organisation d'événements."],
   ["entreprises","Accueil d'entreprises et de sièges","Accueil physique, téléphonique et numérique."],
   ["social","Associations et centres sociaux","Accueil des bénéficiaires et orientation."],
   ["transport","Gares et pôles de transport","Information et orientation des voyageurs."],
   ["education","Établissements scolaires et universités","Accueil des visiteurs et communication."]
  ]
 };
 const LEVELS={seconde:"Seconde",premiere:"Première",terminale:"Terminale"};
 function inferLevel(s){
  const v=String(s||"").trim().toLowerCase();
  if(/^(2|seconde)/.test(v))return "seconde";
  if(/^(1|premi)/.test(v))return "premiere";
  if(/^(t|term)/.test(v))return "terminale";
  return "";
 }
 function inferSector(s){
  const v=String(s||"").toLowerCase();
  if(/agora|gestion|administration|2ga|tga/.test(v))return "gestion-administration";
  if(/accueil|(^|[^a-z])ma([^a-z]|$)|tma/.test(v))return "accueil";
  return "commerce-vente";
 }
 const E=(tag,cls,txt)=>{
  const e=document.createElement(tag);if(cls)e.className=cls;
  if(txt!==undefined)e.textContent=String(txt);return e;
 };
 const cachePrefix="cortex-stage:v3:";
 const favKey="cortex-stage-favoris:v1";
 const clean=s=>String(s??"").trim();
 const loadJson=(key,fallback)=>{
  try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}
 };
 const saveJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
 const missions={
  "gestion-administration":"Classement de dossiers, accueil administratif, suivi de tableaux, saisie et secrétariat.",
  "commerce-vente":"Accueil client, présentation de produits, mise en rayon, vente accompagnée, gestion de stocks.",
  "accueil":"Accueil physique et téléphonique, orientation des visiteurs, information et préparation d'évènements."
 };
 const escapeCSV=s=>{
  let t=String(s??"");if(/^[\s]*[=+\-@\t\r]/.test(t))t="'"+t;
  return '"'+t.replace(/"/g,'""')+'"'
 };
 const telHref=s=>{
  const v=clean(s).split(/[;/]/)[0].replace(/[^+0-9]/g,"");
  return /^\+?[0-9]{6,16}$/.test(v)?"tel:"+v:"";
 };
 function mount(container,settings={}){
  if(!container)return;
  const currentClass=clean(settings.className||"");
  let state=null,all=[],shown=[],controller=null,destroyed=false;
  const favorites=new Set(loadJson(favKey,[]));
  const section=E("section","cs-stage-search");
  section.innerHTML=
   '<header class="cs-stage-head"><div><span class="cs-stage-eyebrow">CORTEX · PARCOURS PROFESSIONNEL</span>'+
   '<h2>Recherche de stages</h2>'+
   '<p>Découvre des lieux de PFMP autour de toi, avec leurs coordonnées publiques et des idées de missions.</p></div>'+
   '<span class="cs-stage-marker">✦ STAGES</span></header>'+
   '<form class="cs-stage-form" id="cs-stage-form">'+
   '<label>Mon niveau<select id="cs-stage-level" required><option value="">Choisir mon niveau</option>'+
   '<option value="seconde">Seconde</option><option value="premiere">Première</option><option value="terminale">Terminale</option></select></label>'+
   '<label>Ma filière<select id="cs-stage-sector" required></select></label>'+
   '<label class="cs-stage-option-field" id="cs-stage-option-wrap" hidden>Mon orientation commerciale'+
   '<select id="cs-stage-option"><option value="toutes">Toutes les orientations / à préciser</option>'+
   '<option value="A">Option A · Vente en magasin</option>'+
   '<option value="B">Option B · Prospection et relation client</option></select></label>'+
   '<fieldset class="cs-stage-types" id="cs-stage-types"><legend>Quels types de lieux souhaites-tu rechercher ?</legend>'+
   '<p class="cs-stage-types-intro">Coche les structures qui t’intéressent. Les propositions sont adaptées aux activités de ta filière.</p>'+
   '<div class="cs-stage-types-toolbar"><span id="cs-stage-types-count" aria-live="polite"></span>'+
   '<button type="button" id="cs-stage-all-types">Tout cocher</button>'+
   '<button type="button" id="cs-stage-no-types">Tout décocher</button></div>'+
   '<div class="cs-stage-types-grid" id="cs-stage-types-grid"></div>'+
   '<p class="cs-stage-types-foot">Un stage doit comporter de vraies missions correspondant à ton diplôme. Le professeur confirme la pertinence du lieu.</p></fieldset>'+
   '<label>Ville ou quartier<input id="cs-stage-city" value="Paris 15e" maxlength="90" required placeholder="Ex. Paris 15e, Saint-Denis…"></label>'+
   '<label>Rayon de recherche<select id="cs-stage-radius">'+
   '<option value="1200">1,2 km</option><option value="2500" selected>2,5 km</option>'+
   '<option value="4000">4 km</option><option value="6500">6,5 km</option></select></label>'+
   '<label class="cs-stage-albert-option"><input type="checkbox" id="cs-stage-albert" checked>'+
   '<span>✦ Albert IA : sélectionner les établissements les plus pertinents</span></label>'+
   '<div class="cs-stage-actions"><button type="submit" class="cs-stage-primary" id="cs-stage-submit">🔎 Rechercher des entreprises</button>'+
   '<button type="button" id="cs-stage-back" class="cs-stage-secondary">← Retour</button></div></form>'+
   '<p class="cs-stage-info">Données publiques : IGN Géoplateforme et © OpenStreetMap contributors. Les entreprises repérées ne sont pas nécessairement disponibles pour accueillir un stagiaire. Vérifie l’information avant d’appeler.</p>'+
   '<div class="cs-stage-loader" id="cs-stage-loader" hidden role="status" aria-live="polite"><span class="cs-stage-spinner" aria-hidden="true"></span><span>Recherche des lieux réels et de leurs coordonnées…</span><button type="button" id="cs-stage-cancel">Annuler</button></div>'+
   '<div class="cs-stage-status" id="cs-stage-status" role="status" aria-live="polite"></div>'+
   '<section class="cs-stage-results" id="cs-stage-results" hidden><div class="cs-stage-summary" id="cs-stage-summary"></div>'+
   '<div class="cs-stage-toolbar">'+
   '<label>Afficher<select id="cs-stage-filter"><option value="all">Tous les établissements</option>'+
   '<option value="phone">Avec téléphone public</option><option value="full">Avec adresse</option>'+
   '<option value="favorite">Mes favoris</option></select></label>'+
   '<label>Trier<select id="cs-stage-sort"><option value="default">Pertinence / proximité</option>'+
   '<option value="phone">Téléphone disponible d’abord</option><option value="name">Nom A–Z</option></select></label>'+
   '<button type="button" id="cs-stage-export" class="cs-stage-secondary">↓ Exporter CSV</button>'+
   '<button type="button" id="cs-stage-refresh" class="cs-stage-secondary">↻ Actualiser les données</button></div>'+
   '<div class="cs-stage-cards" id="cs-stage-cards"></div>'+
   '<p class="cs-stage-footnote">Source : © OpenStreetMap contributors · géocodage IGN. Les numéros manquants ne sont jamais inventés. La prise de stagiaires doit être confirmée directement auprès de la structure.</p>'+
   '</section>';
  container.replaceChildren(section);
  const $=id=>section.querySelector("#"+id);
  const sectorSelect=$("cs-stage-sector");
  const levelSelect=$("cs-stage-level"),optionSelect=$("cs-stage-option");
  const savedTypes=Object.fromEntries(Object.entries(TYPES).map(([key,values])=>[key,new Set(values.map(x=>x[0]))]));
  for(const [value,label] of SECTORS){const option=E("option","",label);option.value=value;sectorSelect.append(option)}
  const inferred=currentClass+" "+(settings.filiere||"");
  sectorSelect.value=inferSector(inferred);
  levelSelect.value=inferLevel(currentClass);
  if(!levelSelect.value)levelSelect.value="";
  function availableTypes(){
   const option=sectorSelect.value==="commerce-vente"?optionSelect.value:"toutes";
   return (TYPES[sectorSelect.value]||[]).filter(x=>option==="toutes"||!x[3]||x[3]===option);
  }
  const selectedTypes=()=>availableTypes().filter(x=>savedTypes[sectorSelect.value]?.has(x[0])).map(x=>x[0]);
  function updateTypeCount(){
   const number=selectedTypes().length,total=availableTypes().length;
   $("cs-stage-types-count").textContent=number+" type"+(number>1?"s":"")+" sélectionné"+(number>1?"s":"")+" sur "+total;
   $("cs-stage-submit").disabled=number===0;
  }
  function renderTypes(){
   $("cs-stage-option-wrap").hidden=sectorSelect.value!=="commerce-vente";
   const grid=$("cs-stage-types-grid");grid.replaceChildren();
   for(const [id,label,desc,option] of availableTypes()){
    const item=E("label","cs-stage-type");
    const box=E("input");box.type="checkbox";box.value=id;
    box.checked=savedTypes[sectorSelect.value].has(id);
    box.addEventListener("change",()=>{
     if(box.checked)savedTypes[sectorSelect.value].add(id);
     else savedTypes[sectorSelect.value].delete(id);
     item.classList.toggle("is-checked",box.checked);updateTypeCount();
    });
    const body=E("span","cs-stage-type-copy");
    const title=E("strong","",label);
    if(option)title.append(E("small","cs-stage-type-option","Option "+option));
    body.append(title,E("small","cs-stage-type-description",desc));
    item.append(box,body);item.classList.toggle("is-checked",box.checked);
    grid.append(item);
   }
   updateTypeCount();
  }
  sectorSelect.addEventListener("change",renderTypes);
  optionSelect.addEventListener("change",renderTypes);
  $("cs-stage-all-types").addEventListener("click",()=>{
   for(const [id] of availableTypes())savedTypes[sectorSelect.value].add(id);
   renderTypes();
  });
  $("cs-stage-no-types").addEventListener("click",()=>{
   for(const [id] of availableTypes())savedTypes[sectorSelect.value].delete(id);
   renderTypes();
  });
  renderTypes();
  function tell(message,error=false){
   const place=$("cs-stage-status");
   place.textContent=message;place.classList.toggle("is-error",error)
  }
  function busy(flag){
   $("cs-stage-submit").disabled=flag;$("cs-stage-loader").hidden=!flag;
  }
  const cacheKey=()=>cachePrefix+JSON.stringify([sectorSelect.value,levelSelect.value,optionSelect.value,selectedTypes().slice().sort(),clean($("cs-stage-city").value).toLowerCase(),Number($("cs-stage-radius").value),Boolean($("cs-stage-albert").checked),Boolean(settings.demo)]);
  function render(){
   if(!state)return;
   const filt=$("cs-stage-filter").value,sort=$("cs-stage-sort").value;
   all=Array.isArray(state.businesses)?state.businesses:[];
   shown=all.filter(x=>filt==="all"||(filt==="phone"&&x.phone)||(filt==="full"&&x.address)||(filt==="favorite"&&favorites.has(x.id)));
   if(sort==="name")shown.sort((a,b)=>a.name.localeCompare(b.name,"fr"));
   else if(sort==="phone")shown.sort((a,b)=>Number(Boolean(b.phone))-Number(Boolean(a.phone))||a.distance_km-b.distance_km);
   else shown.sort((a,b)=>(a.albert_rank||999)-(b.albert_rank||999)||a.distance_km-b.distance_km||a.id.localeCompare(b.id));
   const summary=$("cs-stage-summary");summary.replaceChildren();
   const heading=E("div","cs-stage-result-heading");
   heading.append(E("strong","",all.length+" lieux repérés · "+shown.length+" affichés"),
    E("span","",LEVELS[state.niveau||levelSelect.value]+" · "+state.city+" · "+Number(state.radius)/1000+" km"));
   summary.append(heading);
   const ai=state.ai||{enabled:false};
   const explanation=ai.enabled?
    "✦ Albert IA a classé des établissements vérifiables. Les missions sont des suggestions, pas des offres de stage confirmées.":
    "Classement par proximité · "+(ai.reason||"Albert non sollicité pour cette recherche");
   summary.append(E("p","cs-stage-ai-status",explanation));
   if(state.checked_at)summary.append(E("small","cs-stage-timestamp","Données consultées le "+new Date(state.checked_at).toLocaleString("fr-FR")));
   const cards=$("cs-stage-cards");cards.replaceChildren();
   if(!shown.length){
    cards.append(E("p","cs-stage-empty",all.length?
     "Aucun établissement ne correspond à ce filtre. Essaie « Tous les établissements ».":
     "Aucun lieu repéré ici avec ces critères. Essaie une autre ville, un autre rayon ou une autre filière."));
   }
   for(const business of shown){
    const card=E("article","cs-stage-card");
    const title=E("div","cs-stage-card-title");
    const name=E("strong","",business.name);
    const badge=E("span","cs-stage-category",business.category);
    title.append(name,badge);card.append(title);
    if(business.target_labels?.length)card.append(E("p","cs-stage-target","Type de lieu recherché : "+business.target_labels.join(", ")));
    if(business.albert_rank)card.append(E("span","cs-stage-ai-rank","✦ Sélection Albert · n°"+business.albert_rank));
    card.append(E("p","cs-stage-address","📍 "+(business.address||"Adresse non renseignée : voir la carte")));
    const phone=E("p","cs-stage-phone");
    phone.append(E("span","","☎ "));
    if(business.phone){
     const link=E("a","",business.phone);const href=telHref(business.phone);
     if(href)link.href=href;else link.removeAttribute("href");
     phone.append(link);
    }else phone.append(E("span","cs-stage-missing","Téléphone non renseigné dans l'annuaire"));
    card.append(phone);
    card.append(E("small","cs-stage-distance","À environ "+business.distance_km.toLocaleString("fr-FR")+" km du centre recherché"));
    if(business.albert_why)card.append(E("p","cs-stage-why","✦ "+business.albert_why));
    card.append(E("p","cs-stage-missions","Missions possibles à discuter : "+(business.missions?.[0]||missions[sectorSelect.value])));
    const links=E("div","cs-stage-links");
    const map=E("a","cs-stage-map","Voir la carte");
    map.href="https://www.openstreetmap.org/?mlat="+encodeURIComponent(business.lat)+"&mlon="+encodeURIComponent(business.lon)+"#map=18/"+Number(business.lat)+"/"+Number(business.lon);
    map.target="_blank";map.rel="noopener noreferrer";links.append(map);
    if(business.website){
     const site=E("a","cs-stage-map","Site de l’entreprise");site.href=business.website;site.target="_blank";site.rel="noopener noreferrer";links.append(site)
    }
    const osm=E("a","cs-stage-source","Source OSM");
    if(/^(node|way|relation)\/[0-9]+$/.test(business.id)){
     osm.href="https://www.openstreetmap.org/"+business.id;osm.target="_blank";osm.rel="noopener noreferrer";
    }
    links.append(osm);
    const fav=E("button","cs-stage-favorite",favorites.has(business.id)?"★ Favori":"☆ Favori");
    fav.type="button";fav.setAttribute("aria-pressed",String(favorites.has(business.id)));
    fav.addEventListener("click",()=>{
     if(favorites.has(business.id))favorites.delete(business.id);else favorites.add(business.id);
     saveJson(favKey,[...favorites]);fav.textContent=favorites.has(business.id)?"★ Favori":"☆ Favori";
     fav.setAttribute("aria-pressed",String(favorites.has(business.id)));
     if($("cs-stage-filter").value==="favorite")render();
    });
    links.append(fav);card.append(links);cards.append(card);
   }
   $("cs-stage-results").hidden=false;
  }
  function restore(){
   const cached=loadJson(cacheKey(),null);
   if(cached&&cached.data&&Date.now()-cached.time<48*3600000){
    state=cached.data;render();tell("Derniers résultats conservés : consultation immédiate sans nouvelle recherche.");return true;
   }
   return false;
  }
  async function search(force=false){
   if(controller)controller.abort();
   if(!force&&restore())return;
   const city=clean($("cs-stage-city").value);
   if(city.length<2||!levelSelect.value||!sectorSelect.value){tell("Indique ton niveau, ta filière et une ville ou un quartier.",true);return}
   if(!selectedTypes().length){tell("Coche au moins un type de lieu pour lancer la recherche.",true);return}
   controller=new AbortController();busy(true);tell("Recherche en cours…");
   try{
    const response=await fetch(ENDPOINT,{
     method:"POST",headers:{"content-type":"application/json"},
     body:JSON.stringify({city,filiere:sectorSelect.value,niveau:levelSelect.value,
      optionCommerce:optionSelect.value,types:selectedTypes(),radius:Number($("cs-stage-radius").value),
      session:settings.session||"",albert:Boolean($("cs-stage-albert").checked),demo:settings.demo===true}),
     signal:controller.signal
    });
    const data=await response.json();
    if(!response.ok||!data.ok)throw Error(data.error||"Recherche indisponible.");
    if(destroyed)return;
    state=data;saveJson(cacheKey(),{time:Date.now(),data});
    render();
    tell(data.businesses.length+" établissement(s) répertorié(s). Vérifie les coordonnées avant toute démarche.");
   }catch(error){
    if(error?.name==="AbortError")tell("Recherche interrompue.");
    else if(!restore())tell("Recherche impossible : "+(error?.message||"Service inaccessible."),true);
   }finally{busy(false);controller=null}
  }
  $("cs-stage-form").addEventListener("submit",e=>{e.preventDefault();search(false)});
  $("cs-stage-cancel").addEventListener("click",()=>controller?.abort());
  $("cs-stage-filter").addEventListener("change",render);
  $("cs-stage-sort").addEventListener("change",render);
  $("cs-stage-refresh").addEventListener("click",()=>search(true));
  $("cs-stage-export").addEventListener("click",()=>{
   if(!shown.length){tell("Aucun résultat à exporter.",true);return}
   const header=["Entreprise","Catégorie","Adresse","Téléphone","Distance (km)","Site web","Source OSM","Missions possibles"];
   const rows=shown.map(x=>[x.name,x.category,x.address||"À vérifier",x.phone||"Non renseigné",
    x.distance_km,x.website||"",x.id,(x.missions?.[0]||missions[sectorSelect.value])]);
   const contents="\ufeff"+[header,...rows].map(row=>row.map(escapeCSV).join(";")).join("\r\n");
   const blob=new Blob([contents],{type:"text/csv;charset=utf-8"});
   const url=URL.createObjectURL(blob),a=E("a");a.href=url;a.download="CORTEX-stages-"+sectorSelect.value+".csv";
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
  });
  $("cs-stage-back").addEventListener("click",()=>{
   destroyed=true;controller?.abort();
   if(typeof settings.back==="function")settings.back();
   else if(settings.demo)location.hash="#eleve/accueil";
   else location.href="?espace=eleve";
  });
  // Aucun appel réseau automatique : l'élève choisit son secteur.
  tell("Choisis ton niveau, ta filière et les types de structures à rechercher.");
  return {search,dispose(){destroyed=true;controller?.abort()}};
 }
 window.CORTEX_STAGE={mount,SECTORS};
})();