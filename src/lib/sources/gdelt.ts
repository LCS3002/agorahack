import type { NewsHeadline, SentimentPoint } from '@/lib/types';
import { getNewsLean, parseGDELTDate } from './domains';
import { buildSearchPhrase } from '@/lib/normalizeQuery';

export interface GdeltFetchResult {
  headlines: NewsHeadline[];
  sentiment: number;
  sentimentHistory: SentimentPoint[];
  framing: { left: string; centre: string; right: string };
  queryMatched: boolean;
}

export async function fetchGdeltNewsData(
  query: string,
  entities: string[] = [],
): Promise<GdeltFetchResult> {
  try {
    const terms: string[] = [];
    const entity = entities.find(e => e.length > 3);
    // For GDELT, avoid quoting long multi-word phrases — they're too strict and return 0 results.
    // Instead, take the 2-3 most distinctive content words from the entity.
    const entityKeywords = entity
      ? entity.split(/\s+/).filter(w => w.length > 3 && !/^(and|the|for|with|on|of|in|eu|european|union|pact)$/i.test(w)).slice(0, 3).join(' ')
      : '';
    if (entityKeywords) terms.push(entityKeywords);
    // Only anchor to European Parliament when the query is about EU legislation/politics
    const isEuLegislation = /parliament|mep|commission|regulation|directive|legislation|vote|lobby|asylum|migration/i.test(query);
    if (isEuLegislation || !entity) terms.push('European Parliament');
    // Add the cleaned search phrase for extra coverage
    const extra = buildSearchPhrase(query, entities);
    if (extra && extra !== entityKeywords) terms.push(extra);

    const qs = new URLSearchParams({
      query: terms.join(' '),
      mode: 'ArtList',
      maxrecords: '20',
      format: 'json',
      sourcelang: 'english',
      // One month misses many EU dossiers (e.g. 2024 Asylum Pact); six months improves recall.
      timespan: '6MONTH',
      sort: 'DateDesc',
    });

    const res = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${qs}`, {
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(`GDELT ${res.status}`);

    const data = await res.json();
    const articles = (data.articles ?? []) as Array<{
      url: string; title: string; seendate: string; domain: string; tone: string;
    }>;

    if (!articles.length) {
      return { headlines: [], sentiment: 0, sentimentHistory: [], framing: { left: '', centre: '', right: '' }, queryMatched: false };
    }

    const headlines: NewsHeadline[] = articles
      .filter(a => a.title && a.url)
      .slice(0, 10)
      .map(a => ({
        source: a.domain,
        title: a.title,
        sentiment: Math.max(-1, Math.min(1, (parseFloat(a.tone) || 0) / 40)),
        date: parseGDELTDate(a.seendate),
        lean: getNewsLean(a.domain),
        url: a.url,
      }));

    const tones = articles.map(a => parseFloat(a.tone)).filter(n => !isNaN(n));
    const sentiment = tones.length
      ? Math.max(-1, Math.min(1, tones.reduce((a, b) => a + b, 0) / tones.length / 40))
      : 0;

    const byDay: Record<string, number[]> = {};
    for (const a of articles) {
      const date = parseGDELTDate(a.seendate);
      const tone = parseFloat(a.tone);
      if (!isNaN(tone) && date) (byDay[date] ??= []).push(tone / 40);
    }
    const sentimentHistory: SentimentPoint[] = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        score: Math.max(-1, Math.min(1, vals.reduce((a, b) => a + b, 0) / vals.length)),
      }));

    const byLean: Record<string, NewsHeadline[]> = { LEFT: [], CENTRE: [], RIGHT: [] };
    for (const h of headlines) (byLean[h.lean] ??= []).push(h);

    return {
      headlines,
      sentiment,
      sentimentHistory,
      framing: {
        left: byLean.LEFT[0]?.title ?? '',
        centre: byLean.CENTRE[0]?.title ?? '',
        right: byLean.RIGHT[0]?.title ?? '',
      },
      // Show whatever GDELT returned with usable cards; query terms already scoped the request.
      queryMatched: headlines.length > 0,
    };
  } catch {
    return { headlines: [], sentiment: 0, sentimentHistory: [], framing: { left: '', centre: '', right: '' }, queryMatched: false };
  }
}
