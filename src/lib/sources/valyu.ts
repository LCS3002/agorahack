import type { NewsHeadline, SentimentPoint } from '@/lib/types';
import { getNewsLean } from './domains';
import type { GdeltFetchResult } from './gdelt';
import { buildSearchPhrase } from '@/lib/normalizeQuery';

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

const POS_WORDS = /\b(approv|pass|agree|progress|deal|sign|reform|adopt|achiev|success|boost|support|launch|fund|invest|partner|landmark|historic|breakthrough)\w*/gi;
const NEG_WORDS = /\b(reject|fail|crisis|dispute|controver|fine|breach|violat|concern|warn|risk|threat|block|veto|collapse|scandal|fraud|corruption|penalt|sanction)\w*/gi;

function estimateSentiment(text: string): number {
  if (!text) return 0;
  const pos = (text.match(POS_WORDS) ?? []).length;
  const neg = (text.match(NEG_WORDS) ?? []).length;
  const total = pos + neg;
  if (total === 0) return 0;
  return Math.max(-1, Math.min(1, (pos - neg) / Math.max(total, 3)));
}

export async function fetchValyuNewsData(
  query: string,
  entities: string[] = [],
): Promise<GdeltFetchResult> {
  const apiKey = process.env.VALYU_API_KEY?.trim();
  if (!apiKey) throw new Error('VALYU_API_KEY not set');

  // Classifier `search_query` is short; prepend 1–2 entities so topics like "Asylum Pact" stay specific.
  const base = query.length <= 80 ? query.trim() : buildSearchPhrase(query, entities);
  const entityPrefix = entities
    .slice(0, 2)
    .map(e => e.trim())
    .filter(e => e.length > 2 && !base.toLowerCase().includes(e.toLowerCase()))
    .join(' ');
  const searchQuery = [entityPrefix, base].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 200);

  const res = await fetch('https://api.valyu.ai/v1/search', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: searchQuery,
      search_type: 'all',          // 'all' = web + academic (covers news via web); change to 'news' if your plan includes it
      max_num_results: 15,
      response_length: 'short',
      is_tool_call: true,
      // Anchor to last 12 months for EU political relevance
      start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Valyu ${res.status}: ${await res.text().catch(() => '')}`);

  const data = await res.json() as {
    success: boolean;
    results?: Array<{
      id: string;
      title?: string;
      url?: string;
      link?: string;
      content?: string;
      description?: string;
      source?: string;
      relevance_score?: number;
      publication_date?: string;
    }>;
  };

  const results = data.results ?? [];
  if (!results.length) {
    return { headlines: [], sentiment: 0, sentimentHistory: [], framing: { left: '', centre: '', right: '' }, queryMatched: false };
  }

  const headlines: NewsHeadline[] = results
    .map(r => {
      const url = typeof r.url === 'string' && r.url ? r.url : typeof r.link === 'string' ? r.link : '';
      const title =
        typeof r.title === 'string' && r.title.trim()
          ? r.title.trim()
          : typeof r.description === 'string' && r.description.trim()
            ? r.description.trim().slice(0, 140) + (r.description.length > 140 ? '…' : '')
            : '';
      return { url, title, r };
    })
    .filter(x => x.title && x.url)
    .slice(0, 10)
    .map(({ url, title, r }) => {
      const text = r.content ?? r.description ?? '';
      const domain = getDomain(url);
      return {
        source: r.source && String(r.source).trim() ? String(r.source) : domain,
        title,
        sentiment: estimateSentiment(text),
        date: r.publication_date ?? '',
        lean: getNewsLean(domain),
        url,
      };
    });

  const avgSentiment = headlines.length
    ? headlines.reduce((a, h) => a + h.sentiment, 0) / headlines.length
    : 0;

  // Group by lean for framing
  const byLean: Record<string, NewsHeadline[]> = { LEFT: [], CENTRE: [], RIGHT: [] };
  for (const h of headlines) (byLean[h.lean] ??= []).push(h);

  // Build a sparse sentiment history from publication dates
  const byDay: Record<string, number[]> = {};
  for (const h of headlines) {
    if (h.date) (byDay[h.date] ??= []).push(h.sentiment);
  }
  const sentimentHistory: SentimentPoint[] = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      score: vals.reduce((a, b) => a + b, 0) / vals.length,
    }));

  // Only "match" when we have usable cards — otherwise summarize must fall back to GDELT.
  if (headlines.length === 0) {
    return { headlines: [], sentiment: 0, sentimentHistory: [], framing: { left: '', centre: '', right: '' }, queryMatched: false };
  }

  return {
    headlines,
    sentiment: avgSentiment,
    sentimentHistory,
    framing: {
      left: byLean.LEFT[0]?.title ?? '',
      centre: byLean.CENTRE[0]?.title ?? '',
      right: byLean.RIGHT[0]?.title ?? '',
    },
    queryMatched: true,
  };
}
