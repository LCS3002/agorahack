/** Domain → political lean (GDELT / news). */
export const NEWS_DOMAIN_LEAN: Record<string, 'LEFT' | 'CENTRE' | 'RIGHT'> = {
  'theguardian.com': 'LEFT', 'lemonde.fr': 'LEFT', 'taz.de': 'LEFT',
  'liberation.fr': 'LEFT', 'derstandard.at': 'LEFT',
  'ft.com': 'CENTRE', 'economist.com': 'CENTRE', 'politico.eu': 'CENTRE',
  'euractiv.com': 'CENTRE', 'reuters.com': 'CENTRE', 'bbc.co.uk': 'CENTRE',
  'bbc.com': 'CENTRE', 'apnews.com': 'CENTRE', 'dw.com': 'CENTRE',
  'elpais.com': 'CENTRE', 'sueddeutsche.de': 'CENTRE',
  'telegraph.co.uk': 'RIGHT', 'welt.de': 'RIGHT', 'bild.de': 'RIGHT',
  'lefigaro.fr': 'RIGHT', 'dailymail.co.uk': 'RIGHT', 'express.co.uk': 'RIGHT',
};

export function getNewsLean(domain: string): 'LEFT' | 'CENTRE' | 'RIGHT' {
  return NEWS_DOMAIN_LEAN[domain] ?? 'CENTRE';
}

/** GDELT seendate "20240401T120000Z" → "2024-04-01" */
export function parseGDELTDate(d: string): string {
  if (d && d.length >= 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d ?? '';
}
