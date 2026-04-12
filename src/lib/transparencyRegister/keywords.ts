const SYNONYMS: Record<string, string[]> = {
  ai: ['artificial intelligence', 'ai act', 'machine learning', 'foundation model', 'biometric', 'high-risk'],
  pharma: ['pharmaceutical', 'vaccine', 'pfizer', 'medicine', 'health', 'biontech', 'sanofi'],
  farm: ['cap', 'farmer', 'agriculture', 'subsidy', 'copa', 'cogeca', 'rural'],
  climate: ['climate', 'green deal', 'emission', 'carbon', 'nature restoration', 'biodiversity', 'nrl'],
  digital: ['digital', 'platform', 'dsa', 'dma', 'data', 'privacy', 'gdpr'],
  lobby: ['lobbying', 'lobbyist', 'influence', 'interest representative', 'transparency register'],
  migration: ['asylum', 'asylum pact', 'migration pact', 'ceas', 'refugee', 'border management', 'frontex', 'migration management', 'return directive', 'eurodac', 'reception conditions', 'screening regulation'],
  copyright: ['copyright', 'upload filter', 'article 13', 'article 17', 'digital single market', 'content id', 'rights management', 'directive on copyright'],
};

// Words that are too generic to be useful search terms against the register
const LOBBY_STOPWORDS = new Set([
  'article', 'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into',
  'about', 'what', 'who', 'how', 'why', 'when', 'did', 'does', 'was', 'were',
  'tell', 'show', 'give', 'explain', 'regulation', 'directive', 'act', 'law',
  'policy', 'new', 'old', 'all', 'any', 'its',
]);

/** Tokens + expanded phrases for cheap matching against register text */
export function extractSearchTerms(query: string, entities: string[]): string[] {
  const raw = `${query} ${entities.join(' ')}`.toLowerCase();
  const parts = raw
    .split(/[^a-z0-9äöüßàéèùôîêâ]+/i)
    .filter(t => t.length > 2 && !/^\d+$/.test(t) && !LOBBY_STOPWORDS.has(t));
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
