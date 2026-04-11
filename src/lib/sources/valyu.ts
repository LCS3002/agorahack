import type { NewsHeadline, SentimentPoint } from '@/lib/types';
import { getNewsLean } from './domains';
import type { GdeltFetchResult } from './gdelt';

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

  // Build a targeted news query — don't force EU Parliament anchor for named entities
  const entityPart = entities.find(e => e.length > 2) ?? '';
  const searchQuery = entityPart
    ? `${entityPart} ${query}`
    : `${query} European Union`;

  const res = await fetch('https://api.valyu.ai/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: searchQuery,
      search_type: 'news',
      max_num_results: 15,
      response_length: 'short',
      is_tool_call: true,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Valyu ${res.status}: ${await res.text().catch(() => '')}`);

  const data = await res.json() as {
    success: boolean;
    results?: Array<{
      id: string;
      title: string;
      url: string;
      content?: string;
      description?: string;
      source: string;
      relevance_score?: number;
      publication_date?: string;
    }>;
  };

  const results = data.results ?? [];
  if (!results.length) {
    return { headlines: [], sentiment: 0, sentimentHistory: [], framing: { left: '', centre: '', right: '' }, queryMatched: false };
  }

  const headlines: NewsHeadline[] = results
    .filter(r => r.title && r.url)
    .slice(0, 10)
    .map(r => {
      const domain = getDomain(r.url);
      const text = r.content ?? r.description ?? '';
      return {
        source: domain,
        title: r.title,
        sentiment: estimateSentiment(text),
        date: r.publication_date ?? '',
        lean: getNewsLean(domain),
        url: r.url,
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
