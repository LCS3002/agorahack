const SYNONYMS: Record<string, string[]> = {
  ai: ['artificial intelligence', 'ai act', 'machine learning', 'foundation model', 'biometric', 'high-risk'],
  pharma: ['pharmaceutical', 'vaccine', 'pfizer', 'medicine', 'health', 'biontech', 'sanofi'],
  farm: ['cap', 'farmer', 'agriculture', 'subsidy', 'copa', 'cogeca', 'rural'],
  climate: ['climate', 'green deal', 'emission', 'carbon', 'nature restoration', 'biodiversity', 'nrl'],
  digital: ['digital', 'platform', 'dsa', 'dma', 'data', 'privacy', 'gdpr'],
  lobby: ['lobbying', 'lobbyist', 'influence', 'interest representative', 'transparency register'],
};

/** Tokens + expanded phrases for cheap matching against register text */
export function extractSearchTerms(query: string, entities: string[]): string[] {
  const raw = `${query} ${entities.join(' ')}`.toLowerCase();
  const parts = raw.split(/[^a-z0-9äöüßàéèùôîêâ]+/i).filter(t => t.length > 2);
  const set = new Set(parts);

  for (const [key, phrases] of Object.entries(SYNONYMS)) {
    const hit = raw.includes(key) || phrases.some(p => raw.includes(p));
    if (hit) {
      set.add(key);
      for (const p of phrases) {
        for (const w of p.split(/\s+/)) {
          if (w.length > 2) set.add(w);
        }
      }
    }
  }

  for (const e of entities) {
    for (const w of e.toLowerCase().split(/\s+/)) {
      if (w.length > 2) set.add(w);
    }
  }

  return [...set];
}
