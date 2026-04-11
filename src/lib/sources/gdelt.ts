import type { NewsHeadline, SentimentPoint } from '@/lib/types';
import { getNewsLean, parseGDELTDate } from './domains';

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
    if (entity) terms.push(`"${entity}"`);
    // Only anchor to European Parliament when the query is about EU legislation/politics,
    // not for named entities like companies or people that may not have EP-specific coverage.
    const isEuLegislation = /parliament|mep|commission|regulation|directive|legislation|vote|lobby/i.test(query);
    if (isEuLegislation || !entity) terms.push('European Parliament');
    const extra = query.split(/\s+/).slice(0, 4).join(' ');
    if (extra && extra !== entity) terms.push(extra);

    const qs = new URLSearchParams({
      query: terms.join(' '),
      mode: 'ArtList',
      maxrecords: '20',
      format: 'json',
      sourcelang: 'english',
      timespan: 'MONTH',
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
      queryMatched: true,
    };
  } catch {
    return { headlines: [], sentiment: 0, sentimentHistory: [], framing: { left: '', centre: '', right: '' }, queryMatched: false };
  }
}
