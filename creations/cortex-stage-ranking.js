/* Priorités pédagogiques par type, complétées par les coordonnées publiques. */
(() => {
  'use strict';

  const SIZE = 100;
  const priorities = {
    'commerce-vente': {
      distribution: 91, mode: 93, beaute: 86, technologie: 92, maison: 88, alimentation: 83,
      'sports-culture': 91, vehicules: 85, immobilier: 92, finance: 76,
      'relation-client': 94, 'entreprises-b2b': 76
    },
    accueil: {
      administrations: 94, sante: 84, hotels: 94, tourisme: 97, culture: 91,
      evenementiel: 85, entreprises: 74, social: 85, transport: 89, education: 82
    },
    'gestion-administration': {
      administrations: 92, entreprises: 81, associations: 85, sante: 84,
      education: 88, banques: 79, comptabilite: 93, rh: 94
    }
  };
  const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
  const genericActivity = /^(?:company|consulting|coworking|civic|70\.10Z|46\.90Z)$/i;

  function relevance(place, query, calibration) {
    let bestType = 0;
    for (const id of place.types) {
      if (!query.types.includes(id)) continue;
      const base = priorities[query.sector]?.[id] ?? 65;
      const proposed = calibration?.[id];
      const fit = Number.isFinite(proposed) ? base * .65 + proposed * .35 : base;
      bestType = Math.max(bestType, fit);
    }
    if (!bestType) return 0;
    const missionFit = Math.max(0, bestType - (genericActivity.test(place.activity) ? 7 : 0));
    const distance = place.distance ?? Infinity;
    const trip = Number.isFinite(distance) ? 1 / (1 + distance / 2.5) : 0;
    const contact = (place.callable ? 6 : 0) + (place.website ? 4 : 0) + (place.address ? 2 : 0);
    return missionFit * .65 + trip * 20 + contact + (place.employer ? 3 : 0);
  }

  function order(places, query, calibration) {
    return Array.from(places, place => ({ place, score: relevance(place, query, calibration) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score
        || (a.place.distance ?? Infinity) - (b.place.distance ?? Infinity)
        || collator.compare(a.place.name, b.place.name)
        || a.place.id.localeCompare(b.place.id))
      .map(item => item.place);
  }

  window.CORTEX_STAGE_RANKING = { order, SIZE };
})();
