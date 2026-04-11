import { NextRequest, NextResponse } from 'next/server';
import type { ClassificationResult, NewsHeadline, SentimentPoint } from '@/lib/types';

// ── Domain → political lean ───────────────────────────────────────────────────
const LEAN_MAP: Record<string, 'LEFT' | 'CENTRE' | 'RIGHT'> = {
  'theguardian.com': 'LEFT', 'guardian.com': 'LEFT', 'taz.de': 'LEFT',
  'liberation.fr': 'LEFT', 'derstandard.at': 'LEFT', 'lemonde.fr': 'LEFT',
  'ft.com': 'CENTRE', 'economist.com': 'CENTRE', 'politico.eu': 'CENTRE',
  'euractiv.com': 'CENTRE', 'reuters.com': 'CENTRE', 'bbc.co.uk': 'CENTRE',
  'bbc.com': 'CENTRE', 'apnews.com': 'CENTRE', 'dw.com': 'CENTRE',
  'elpais.com': 'CENTRE', 'sueddeutsche.de': 'CENTRE',
  'telegraph.co.uk': 'RIGHT', 'welt.de': 'RIGHT', 'bild.de': 'RIGHT',
  'lefigaro.fr': 'RIGHT', 'dailymail.co.uk': 'RIGHT', 'express.co.uk': 'RIGHT',
};

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function getLean(domain: string): 'LEFT' | 'CENTRE' | 'RIGHT' {
  return LEAN_MAP[domain] ?? 'CENTRE';
}

function parseGDELTDate(d: string): string {
  // "20240401T120000Z" → "2024-04-01"
  if (d && d.length >= 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d ?? '';
}

// ── GDELT v2 Article API — totally free, no key ────────────────────────────────
async function fetchGDELTNews(query: string, entities: string[]) {
  const terms: string[] = [];
  // Prefer first entity name if available
  const entity = entities.find(e => e.length > 3);
  if (entity) terms.push(`"${entity}"`);
  // Always anchor to EU Parliament context
  terms.push('European Parliament');
  const extra = query.split(/\s+/).slice(0, 3).join(' ');
  if (extra) terms.push(extra);

  const qs = new URLSearchParams({
    query: terms.join(' '),
    mode: 'ArtList',
    maxrecords: '15',
    format: 'json',
    sourcelang: 'english',
    timespan: 'MONTH',
    sort: 'DateDesc',
  });

  const res = await fetch(
    `https://api.gdeltproject.org/api/v2/doc/doc?${qs}`,
    { signal: AbortSignal.timeout(7000) }
  );
  if (!res.ok) throw new Error(`GDELT ${res.status}`);
  return res.json() as Promise<{
    articles?: Array<{ url: string; title: string; seendate: string; domain: string; tone: string }>;
  }>;
}

// ── EU Parliament Open Data API — free, no key ────────────────────────────────
async function fetchEPMEPs() {
  const res = await fetch(
    'https://data.europarl.europa.eu/api/v1/meps?status=CURRENT&format=application%2Fld%2Bjson&limit=100',
    {
      signal: AbortSignal.timeout(7000),
      headers: { Accept: 'application/json' },
    }
  );
  if (!res.ok) throw new Error(`EP MEP API ${res.status}`);
  return res.json();
}

// ── EP recent plenary documents — free, no key ────────────────────────────────
async function fetchEPDocuments(searchTerm: string) {
  const qs = new URLSearchParams({
    format: 'application/ld+json',
    limit: '10',
  });
  const res = await fetch(
    `https://data.europarl.europa.eu/api/v1/plenary-documents?${qs}`,
    {
      signal: AbortSignal.timeout(7000),
      headers: { Accept: 'application/json' },
    }
  );
  if (!res.ok) throw new Error(`EP Docs ${res.status}`);
  const data = await res.json();
  // Filter to docs matching the search term
  const graph: Record<string, unknown>[] = data['@graph'] ?? data.results ?? [];
  const term = searchTerm.toLowerCase();
  return graph.filter(
    (d) =>
      String(d.label ?? '').toLowerCase().includes(term) ||
      String(d.notation ?? '').toLowerCase().includes(term)
  );
}

// ── Wikipedia entity summary — free, no key ───────────────────────────────────
async function fetchWikipediaSummary(title: string): Promise<string | null> {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
    { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return (data.extract as string) ?? null;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { query, classification } = (await request.json()) as {
    query: string;
    classification: ClassificationResult;
  };

  type LiveResult = {
    news: {
      headlines: NewsHeadline[];
      sentiment: number;
      sentimentHistory: SentimentPoint[];
    } | null;
    meps: Array<{ id: string; name: string; group: string; country: string }> | null;
    recentDocs: Array<{ title: string; date: string; reference: string }> | null;
    entitySummary: string | null;
  };

  const result: LiveResult = { news: null, meps: null, recentDocs: null, entitySummary: null };

  await Promise.allSettled([
    // ── 1. GDELT news headlines + sentiment ──────────────────────────────────
    (async () => {
      if (!classification.modules.includes('NEWS')) return;
      const data = await fetchGDELTNews(query, classification.entities);
      const articles = data.articles ?? [];
      if (!articles.length) return;

      const headlines: NewsHeadline[] = articles
        .filter((a) => a.title && a.url)
        .slice(0, 8)
        .map((a) => {
          const tone = parseFloat(a.tone) || 0;
          return {
            source: a.domain,
            title: a.title,
            sentiment: Math.max(-1, Math.min(1, tone / 40)),
            date: parseGDELTDate(a.seendate),
            lean: getLean(a.domain),
          };
        });

      const tones = articles.map((a) => parseFloat(a.tone)).filter((n) => !isNaN(n));
      const avgTone = tones.length ? tones.reduce((a, b) => a + b, 0) / tones.length : 0;
      const sentiment = Math.max(-1, Math.min(1, avgTone / 40));

      // Aggregate sentiment by day for the history chart
      const byDay: Record<string, number[]> = {};
      for (const a of articles) {
        const date = parseGDELTDate(a.seendate);
        const tone = parseFloat(a.tone);
        if (!isNaN(tone) && date) {
          (byDay[date] ??= []).push(tone / 40);
        }
      }
      const sentimentHistory: SentimentPoint[] = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({
          date,
          score: Math.max(-1, Math.min(1, vals.reduce((a, b) => a + b, 0) / vals.length)),
        }));

      result.news = { headlines, sentiment, sentimentHistory };
    })(),

    // ── 2. EP current MEPs ───────────────────────────────────────────────────
    (async () => {
      const data = await fetchEPMEPs();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const graph: any[] = data['@graph'] ?? data.results ?? [];
      result.meps = graph
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((m: any) => m.familyName && m.givenName)
        .slice(0, 80)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) => ({
          id: String(m.identifier ?? m['@id'] ?? ''),
          name: `${String(m.givenName ?? '')} ${String(m.familyName ?? '')}`.trim(),
          group: String(m.hasMembership?.[0]?.label ?? m.politicalGroup ?? ''),
          country: String(m.represents ?? m.nationality ?? ''),
        }));
    })(),

    // ── 3. EP recent plenary documents ───────────────────────────────────────
    (async () => {
      if (!classification.modules.includes('VOTING')) return;
      const searchTerm = classification.entities[0] ?? query.split(' ').slice(0, 2).join(' ');
      const docs = await fetchEPDocuments(searchTerm);
      result.recentDocs = docs.slice(0, 5).map((d) => ({
        title: String(d.label ?? d.title ?? ''),
        date: String(d.activityDate ?? d.date ?? ''),
        reference: String(d.notation ?? d['@id'] ?? ''),
      }));
    })(),

    // ── 4. Wikipedia entity summary ──────────────────────────────────────────
    (async () => {
      const entity = classification.entities[0];
      if (!entity) return;
      result.entitySummary = await fetchWikipediaSummary(entity);
    })(),
  ]);

  return NextResponse.json(result);
}
