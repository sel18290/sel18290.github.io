const goals = {
  plan: 'Construire un plan de recherche réalisable aujourd’hui et dans les prochains jours.',
  compare: 'Comparer les pistes proposées à partir des missions, du trajet à vérifier, des coordonnées et de l’historique documenté.',
  call: 'Préparer un premier appel pour demander une PFMP et identifier la personne à contacter.',
  followup: 'Rédiger une relance courte et polie après une demande restée sans réponse.',
  interview: 'Préparer un entretien avec deux questions possibles et un exemple concret à préparer.'
};

const situations = {
  start: 'Je commence ma recherche.',
  broaden: 'Je trouve peu de pistes dans ma zone.',
  blocked: 'J’ai déjà contacté des structures et j’ai peu de réponses.',
  urgent: 'La PFMP approche et je cherche encore.'
};
const states = ['todo', 'waiting', 'meeting', 'accepted', 'declined'];

function boundedCount(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) ? Math.max(0, Math.min(99, value)) : 0;
}

export function assistantContext(body, knownTypes: Record<string, string>) {
  const goal = body.goal;
  if (!Object.hasOwn(goals, goal)) throw Error('Choisis une action dans l’assistant PFMP.');
  const candidates = (Array.isArray(body.candidates) ? body.candidates.slice(0, 8) : []).map(row => ({
    types: Array.isArray(row?.types) ? row.types.slice(0, 3).filter(id => Object.hasOwn(knownTypes, id)).map(id => knownTypes[id]) : [],
    distance_km: typeof row?.distance === 'number' && row.distance >= 0 && row.distance <= 50 ? Math.round(row.distance * 10) / 10 : null,
    telephone_public: row?.phone === true,
    site_public: row?.website === true,
    accueil_anterieur_documente: row?.confirmed === true
  }));
  if (goal === 'compare' && !candidates.length) throw Error('Effectue d’abord une recherche ou ajoute un lieu à ton carnet.');
  return {
    goal,
    task: goals[goal],
    situation: Object.hasOwn(situations, body.situation) ? situations[body.situation] : situations.start,
    state: states.includes(body.state) ? body.state : null,
    dates_connues: body.has_dates === true,
    lieux_suivis: boundedCount(body.saved_count),
    relances_dues: boundedCount(body.due_count),
    types_selectionnes: Array.isArray(body.types) ? [...new Set(body.types)]
      .filter(id => Object.hasOwn(knownTypes, id)).map(id => knownTypes[id]) : [],
    pistes: candidates.map((item, index) => ({ index, ...item }))
  };
}

const sharedInstructions = [
  'Tu es Albert, le conseiller PFMP de CORTEX. Tu aides un lycéen de bac professionnel avec des mots simples et des actions concrètes.',
  'Utilise le mot PFMP. Les informations de contexte décrivent des catégories et des indices. Tu ignores les disponibilités, contacts, horaires et missions exactes.',
  'Un accueil antérieur est à vérifier pour la période demandée. N’attribue un accueil passé que si le champ correspondant est vrai. Aucune probabilité, promesse, coordonnées, nouveau lieu, lien ou affirmation juridique.'
];

export function assistantInstructions(goal: string) {
  if (goal === 'compare') return [...sharedInstructions,
    'Classe une à trois pistes parmi le tableau pistes. Utilise exactement le nombre index indiqué pour la piste. Donne une raison vérifiable et une question à poser pour chacune.',
    'Donne deux actions pour préparer les premiers contacts. Réponds seulement avec cet objet JSON et ces noms de clés :',
    '{"intro":"Une phrase de synthèse","steps":[{"title":"Action","detail":"Conseil pratique"},{"title":"Action","detail":"Conseil pratique"}],"picks":[{"index":0,"why":"Raison fondée sur les critères fournis","ask":"Question à poser"}]}.'
  ].join('\n');
  return [...sharedInstructions,
    'Donne deux ou trois actions. Pour un appel ou une relance, complète script avec un modèle poli et les repères [prénom et nom] et [dates]. Pour un entretien, écris un exemple de réponse à compléter, sans inventer de compétence. Pour un plan, laisse script vide.',
    'Réponds uniquement avec cet objet JSON et ces noms de clés : {"intro":"Une phrase de synthèse","steps":[{"title":"Action","detail":"Conseil pratique"},{"title":"Action","detail":"Conseil pratique"}],"script":"Modèle ou chaîne vide"}.'
  ].join('\n');
}

function line(value: unknown, max: number) {
  return typeof value === 'string' ? value.replace(/[<>\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, max) : '';
}

export function assistantReply(value, goal: string, count: number) {
  const intro = line(value?.intro, 285);
  const steps = (Array.isArray(value?.steps) ? value.steps : []).slice(0, 3)
    .map(row => ({ title: line(row?.title, 72), detail: line(row?.detail, 255) }))
    .filter(row => row.title && row.detail);
  const picks = [];
  if (goal === 'compare') {
    for (const row of (Array.isArray(value?.picks) ? value.picks : []).slice(0, 8)) {
      const supplied = row?.index;
      const index = typeof supplied === 'string' && /^\d$/.test(supplied) ? Number(supplied) : supplied;
      const why = line(row?.why, 210);
      const ask = line(row?.ask, 180) || 'Quelles missions pourrais-je pratiquer pendant ma PFMP ?';
      if (Number.isInteger(index) && index >= 0 && index < count && why && ask && !picks.some(pick => pick.index === index)) {
        picks.push({ index, why, ask });
      }
      if (picks.length === 3) break;
    }
  }
  if (!intro || !steps.length || (goal === 'compare' && !picks.length))
    throw Error('Réponse incomplète (' + goal + ', ' + steps.length + ' actions, ' + picks.length + ' pistes)');
  const script = ['call', 'followup', 'interview'].includes(goal) ? line(value?.script, 700) : '';
  if (['call', 'followup', 'interview'].includes(goal) && !script) throw Error('Modèle de réponse manquant');
  return { intro, steps, script, picks };
}
