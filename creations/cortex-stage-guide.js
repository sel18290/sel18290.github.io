/* Repères pédagogiques pour la recherche de PFMP. Les identifiants de lieux
   correspondent aux catégories acceptées par l’annuaire CORTEX. */
(function () {
  'use strict';

  const MCV = 'https://eduscol.education.fr/referentiels-professionnels/BacPro_MetCoVe/Annexes_BacPro_MetCoVe.pdf';
  const profiles = {
    A: {
      title: 'Conseil et vente en magasin',
      source: MCV,
      blocks: [
        ['Conseiller et vendre', 'Identifier le besoin d’un client, lui présenter un produit et l’aider à choisir.'],
        ['Suivre les ventes', 'Suivre une commande, un retrait ou une demande après l’achat.'],
        ['Développer la relation client', 'Présenter un service de l’enseigne ou participer à une action de fidélisation.'],
        ['Animer l’espace de vente', 'Mettre des produits en valeur, vérifier un rayon ou préparer une animation.']
      ],
      lead: 'Cherche une équipe qui te laisse conseiller des clients et participer à la vie du magasin.',
      contact: 'la personne responsable du magasin ou du rayon',
      question: 'Pourrai-je conseiller des clients, participer à la vente et mettre des produits en valeur ?',
      goal: 'conseiller des clients et participer à l’animation de l’espace de vente'
    },
    B: {
      title: 'Prospection et offre commerciale',
      source: MCV,
      blocks: [
        ['Conseiller et vendre', 'Reformuler un besoin et présenter une offre adaptée.'],
        ['Suivre les ventes', 'Aider à suivre un devis, un rendez-vous ou une demande client.'],
        ['Développer la relation client', 'Préparer un suivi commercial ou une action de fidélisation.'],
        ['Prospecter et valoriser l’offre', 'Identifier des prospects, préparer une prise de contact et en consigner le résultat.']
      ],
      lead: 'Vise une équipe commerciale qui prospecte vraiment et peut t’associer à ses démarches.',
      contact: 'la personne responsable de l’équipe commerciale',
      question: 'Pourrai-je participer à la recherche de prospects, aux prises de contact et au suivi des réponses ?',
      goal: 'participer à la prospection et présenter des offres à des clients'
    },
    accueil: {
      title: 'Accueil et orientation du public',
      source: 'https://eduscol.education.fr/referentiels-professionnels/BacPro_MetAc/Annexes_BacPro_MetAc.pdf',
      blocks: [
        ['Accueillir sur plusieurs canaux', 'Renseigner et orienter un visiteur, répondre au téléphone ou traiter une demande numérique.'],
        ['Organiser l’information et les prestations', 'Mettre à jour un support, gérer un rendez-vous ou aider à l’accueil d’un événement.'],
        ['Suivre la relation avec le public', 'Expliquer un service, recueillir un retour ou transmettre une réclamation.']
      ],
      lead: 'Repère un vrai poste d’accueil où tu peux informer des visiteurs et traiter leurs demandes.',
      contact: 'la personne responsable du service d’accueil',
      question: 'Pourrai-je accueillir et orienter du public sur place et par téléphone ou par un canal numérique ?',
      goal: 'accueillir du public, traiter ses demandes et l’orienter vers le bon service'
    },
    'gestion-administration': {
      title: 'Suivi administratif et organisation',
      source: 'https://www.francecompetences.fr/recherche/rncp/40705/',
      blocks: [
        ['Suivre les relations avec les interlocuteurs', 'Traiter une demande client, usager ou fournisseur et mettre à jour le dossier.'],
        ['Organiser l’activité', 'Tenir un tableau de suivi, aider à planifier une activité ou préparer des documents.'],
        ['Administrer le personnel', 'Aider à suivre un planning ou un dossier du personnel, sous la responsabilité du service.']
      ],
      lead: 'Vise un service qui peut te confier des dossiers et des outils de suivi sous la supervision d’un tuteur.',
      contact: 'la personne responsable du service administratif',
      question: 'Pourrai-je traiter des demandes, suivre des dossiers ou participer à l’organisation du service ?',
      goal: 'suivre des dossiers et participer à l’organisation administrative du service'
    }
  };

  const programs = {
    'commerce-vente': { short: 'MCV', label: 'Commerce et vente', name: 'Métiers du commerce et de la vente', detail: 'Magasin ou prospection' },
    accueil: { short: 'MA', label: 'Métiers de l’accueil', name: 'Métiers de l’accueil', detail: 'Informer et orienter' },
    'gestion-administration': { short: 'AGOrA', label: 'Gestion administrative', name: 'Assistance à la gestion des organisations et de leurs activités', detail: 'Dossiers et organisation' }
  };

  const types = {
    'commerce-vente': [
      ['distribution', 'Distribution et grands magasins', 'Renseigner des clients, vérifier les stocks et préparer une mise en avant.', 'A'],
      ['mode', 'Mode et accessoires', 'Conseiller une taille, un article ou un accessoire, et préparer la présentation des produits.', 'A'],
      ['beaute', 'Beauté et parfumerie', 'Découvrir un besoin, présenter des produits et tenir un espace de vente.', 'A'],
      ['technologie', 'Téléphonie et équipement', 'Comparer des produits avec un client et suivre une commande.', 'A'],
      ['maison', 'Maison et bricolage', 'Conseiller un client selon son projet et mettre en avant une gamme.', 'A'],
      ['alimentation', 'Commerces alimentaires', 'Conseiller sur les produits et contribuer à la tenue du point de vente.', 'A'],
      ['sports-culture', 'Sport, culture et loisirs', 'Conseiller un article selon l’usage et participer à une animation.', 'A'],
      ['vehicules', 'Mobilité et concessions', 'Présenter des modèles ou accessoires et participer à la tenue de l’espace de vente.', 'A'],
      ['immobilier', 'Agences immobilières', 'Repérer des prospects, préparer des prises de contact et suivre des rendez-vous.', 'B'],
      ['finance', 'Banques et assurances', 'Vérifier si l’équipe te permet de participer à la prospection ou à la valorisation d’offres, dans le cadre autorisé.', 'B'],
      ['relation-client', 'Téléconseil et services commerciaux', 'Préparer un argumentaire, participer au suivi des contacts et consigner les réponses.', 'B'],
      ['entreprises-b2b', 'Entreprises et clientèle professionnelle', 'Vérifier la présence d’un service commercial où tu pourrais qualifier des prospects ou préparer une offre.', 'B']
    ],
    accueil: [
      ['administrations', 'Mairies et services publics', 'Reformuler une demande et orienter l’usager vers le service adapté.'],
      ['sante', 'Hôpitaux et établissements de santé', 'Informer et orienter patients et visiteurs, dans un service hors soins.'],
      ['hotels', 'Hôtels et hébergements', 'Renseigner les clients sur les services et participer à l’accueil à la réception.'],
      ['tourisme', 'Tourisme et information', 'Répondre à une demande en personne ou à distance et proposer une orientation adaptée.'],
      ['culture', 'Musées et lieux culturels', 'Informer sur les visites, accueillir des groupes et gérer l’orientation du public.'],
      ['evenementiel', 'Congrès et événementiel', 'Aider à préparer l’accueil, recevoir les participants et orienter les flux.'],
      ['entreprises', 'Sièges et accueil d’entreprises', 'Recevoir des visiteurs, transmettre les appels et gérer des rendez-vous.'],
      ['social', 'Associations et centres sociaux', 'Accueillir les bénéficiaires et les informer sur les services proposés.'],
      ['transport', 'Gares et pôles de transport', 'Accueillir et orienter des voyageurs selon les missions proposées par l’opérateur.'],
      ['education', 'Écoles et universités', 'Renseigner les visiteurs et les diriger vers le bon interlocuteur.']
    ],
    'gestion-administration': [
      ['administrations', 'Mairies et administrations', 'Qualifier des demandes et suivre des dossiers administratifs.'],
      ['entreprises', 'Services administratifs d’entreprises', 'Suivre des commandes, des dossiers ou des tableaux de bord.'],
      ['associations', 'Associations et structures sociales', 'Tenir à jour des dossiers d’adhérents et aider à organiser une activité.'],
      ['sante', 'Services administratifs de santé', 'Aider au suivi de rendez-vous ou de dossiers, dans le respect de la confidentialité.'],
      ['education', 'Écoles et universités', 'Préparer des documents et contribuer au suivi administratif de la vie scolaire.'],
      ['banques', 'Banques, assurances et mutuelles', 'Aider au suivi de dossiers et de documents, dans le cadre autorisé.'],
      ['comptabilite', 'Cabinets comptables et de gestion', 'Classer des pièces, suivre une facturation ou tenir un tableau de contrôle.'],
      ['rh', 'Services RH et agences d’emploi', 'Suivre des plannings et aider à préparer des dossiers administratifs.']
    ]
  };

  function inferProgram(value) {
    const label = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (/AGORA|ADMINISTRAT|\b[12T]?GA\d*\b/.test(label)) return 'gestion-administration';
    if (/ACCUEIL|\b[12T]?MA\d*\b/.test(label)) return 'accueil';
    return 'commerce-vente';
  }

  function forSearch(sector, option) {
    return types[sector].filter(type => !type[3] || option === 'toutes' || type[3] === option);
  }

  function forPlace(sector, option, matched = []) {
    const categories = forSearch(sector, option).filter(type => matched.includes(type[0]));
    if (sector !== 'commerce-vente') return { categories, profile: profiles[sector] };
    const routes = new Set(categories.map(type => type[3]));
    const route = option === 'toutes' ? (routes.size === 1 ? routes.values().next().value : null) : option;
    return { categories, profile: profiles[route] || null };
  }

  function normalizePFMP(value) {
    return String(value || '')
      .replace(/\bMon stage\b/g, 'Ma PFMP').replace(/\bmon stage\b/gi, 'ma PFMP')
      .replace(/\bTon stage\b/g, 'Ta PFMP').replace(/\bton stage\b/gi, 'ta PFMP')
      .replace(/\bCe stage\b/g, 'Cette PFMP').replace(/\bce stage\b/gi, 'cette PFMP')
      .replace(/\bdu stage\b/gi, 'de la PFMP').replace(/\ble stage\b/gi, 'la PFMP')
      .replace(/\bun stage\b/gi, 'une PFMP').replace(/\bstages?\b/gi, 'PFMP');
  }

  // Extensions validées sur le serveur : mêmes catégories et même parcours que les 3 filières natives.
  const customPrograms = Object.create(null);
  function registerCustom(program) {
    if(!program || !/^perso-[a-f0-9]{24}$/.test(program.id) ||
       typeof program.name!=='string' || !Array.isArray(program.types) ||
       program.types.length<4 || program.types.length>12 || !program.profile) return false;
    const id = program.id;
    const copy = value => String(value||'').replace(/[<>]/g,'').trim();
    const items=[],seen=new Set();
    for (const item of program.types) {
      if(!item || typeof item.ref!=='string' ||
         !/^(commerce-vente|accueil|gestion-administration|catalogue):[a-z0-9-]+$/.test(item.ref) ||
         seen.has(item.ref) || !copy(item.label)) return false;
      seen.add(item.ref);
      items.push([item.ref,copy(item.label).slice(0,120),
        copy(item.mission).slice(0,180)||'Découvrir les activités de ce lieu.']);
    }
    const blocks=(Array.isArray(program.profile.blocks)?program.profile.blocks:[])
      .slice(0,5).filter(row=>Array.isArray(row)&&row.length>=2)
      .map(row=>[copy(row[0]).slice(0,100),copy(row[1]).slice(0,260)])
      .filter(row=>row[0]&&row[1]);
    if(blocks.length<2)return false;
    const data={
      id,name:copy(program.name).slice(0,65),label:copy(program.label).slice(0,45),
      short:copy(program.short).slice(0,12),detail:copy(program.detail).slice(0,100),
      types:program.types.map(item=>({
        ref:item.ref,label:copy(item.label).slice(0,120),
        mission:copy(item.mission).slice(0,180)
      })),
      profile:{
        title:copy(program.profile.title).slice(0,100),
        lead:copy(program.profile.lead).slice(0,220),
        contact:copy(program.profile.contact).slice(0,120),
        question:copy(program.profile.question).slice(0,200),
        goal:copy(program.profile.goal).slice(0,250),
        blocks
      }
    };
    customPrograms[id]=data;
    programs[id]={short:data.short||'PFMP',label:data.label||data.name,name:data.name,
      detail:data.detail||'Filière personnalisée'};
    types[id]=items;
    profiles[id]={
      title:data.profile.title||data.name,lead:data.profile.lead,
      source:'',blocks,
      contact:data.profile.contact,question:data.profile.question,goal:data.profile.goal
    };
    return true;
  }
  const getCustom = id => customPrograms[id] || null;
  window.CORTEX_STAGE_GUIDE = { programs, profiles, forSearch, forPlace, inferProgram, normalizePFMP,
    registerCustom, getCustom };
})();
