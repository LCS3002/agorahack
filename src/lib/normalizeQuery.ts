/**
 * Strips natural-language question preamble from user queries so they can be
 * passed cleanly to external search APIs (GDELT, Valyu, Wikipedia, etc.).
 *
 * Examples:
 *   "what happened with the 2024 EU Asylum Pact" → "2024 EU Asylum Pact"
 *   "tell me about lobbying on the AI Act"        → "AI Act lobbying"
 *   "who voted for the Digital Services Act"      → "Digital Services Act"
 *   "EU Asylum Pact"                              → "EU Asylum Pact"
 */

// Ordered from most-specific to least-specific so greedy phrases match first
const QUESTION_PREFIXES: RegExp[] = [
  /^(tell me about|show me|explain|give me|i want to know about|can you explain|could you explain|what can you tell me about)\s*/i,
  /^(what happened (with|to|regarding|about|on)|what is|what are|what was|what were|how did|how does|who voted|who is|who are|where is)\s*/i,
  /^(what|how|who|when|where|why|did|does)\s+(happened?|is|are|was|were|voted|passed|signed|decided|adopted|rejected)?\s*/i,
  /^(is|are|was|were|did|does|has|have|had)\s+/i,
];

// After stripping question words, remove leading prepositions / articles
const LEADING_PREP = /^(with|about|for|on|of|in|regarding|concerning|the|a|an)\s+/i;

const TRAILING_NOISE =
  /\s+(please|for me|to me|quickly|briefly|in detail|in short|in summary)\.?$/i;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'of', 'for', 'to', 'and', 'or', 'but',
  'with', 'about', 'from', 'by', 'at', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'since', 'up', 'down',
  'that', 'this', 'these', 'those', 'its', 'their', 'our', 'your',
  'has', 'have', 'had', 'been', 'being', 'be', 'do', 'did', 'does',
  'was', 'were', 'will', 'would', 'could', 'should', 'may', 'might',
  'shall', 'can', 'not', 'also', 'just', 'more', 'most', 'some',
]);

/**
 * Returns the cleanest possible search phrase for external APIs.
 * Prefers the first meaningful entity (if classified), falls back to
 * stripping question words from the raw query.
 */
export function normalizeSearchQuery(query: string, entities: string[] = []): string {
  // Use the first substantive entity if the classifier found one
  const mainEntity = entities.find(e => e.length > 4);
  if (mainEntity) return mainEntity;

  // Strip question-word prefix (try each pattern in order)
  let stripped = query.trim().replace(TRAILING_NOISE, '').trim();
  for (const re of QUESTION_PREFIXES) {
    const next = stripped.replace(re, '').trim();
    if (next && next !== stripped) { stripped = next; break; }
  }
  // Remove any remaining leading prepositions / articles (run up to 3 times for chains like "for the X")
  for (let i = 0; i < 3; i++) {
    const next = stripped.replace(LEADING_PREP, '').trim();
    if (next === stripped) break;
    stripped = next;
  }

  return stripped || query.trim();
}

/**
 * Builds a multi-term search string for APIs that accept longer queries
 * (GDELT, Valyu). Combines entities + cleaned query, deduplicated.
 * Keeps it focused: max ~10 meaningful words.
 */
export function buildSearchPhrase(query: string, entities: string[] = []): string {
  const cleanQuery = normalizeSearchQuery(query, []);

  // Key content words from cleaned query (skip stopwords, keep >=3 chars)
  const queryWords = cleanQuery
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w.toLowerCase()));

  // Start with entities, then append query words not already covered
  const parts: string[] = [];
  const seen = new Set<string>();

  for (const e of entities.slice(0, 2)) {
    parts.push(e);
    for (const w of e.toLowerCase().split(/\s+/)) seen.add(w);
  }

  for (const w of queryWords) {
    if (!seen.has(w.toLowerCase()) && parts.join(' ').length < 80) {
      parts.push(w);
      seen.add(w.toLowerCase());
    }
  }

  return parts.join(' ').trim() || cleanQuery;
}
