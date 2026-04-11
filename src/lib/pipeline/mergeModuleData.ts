import type {
  ClassificationResult,
  ModuleData,
  ModuleDataMeta,
  ModuleSliceMeta,
  NewsHeadline,
  SentimentPoint,
} from '@/lib/types';

export interface MergeModuleDataOptions {
  /** When set, overrides default lobbying provenance (e.g. register snapshot) */
  lobbyingSliceMeta?: ModuleSliceMeta;
}

/**
 * Merge live tool payloads onto the scenario fixture from `selectMockData`,
 * then attach `meta` describing api vs mock vs hybrid per slice.
 */
export function mergeModuleData(
  classification: ClassificationResult,
  mockBase: ModuleData,
  toolResults: { name: string; result: Record<string, unknown> }[],
  options?: MergeModuleDataOptions,
): ModuleData {
  const out: ModuleData = { ...mockBase };

  for (const { name, result } of toolResults) {
    if (name === 'fetch_voting_data' && classification.modules.includes('VOTING')) {
      const r = result as {
        queryMatched?: boolean;
        matchedDocuments?: Array<{ title: string; reference: string; date: string }>;
        recentVotes?: Array<{ for: number; against: number; abstain: number; date: string; label: string }>;
      };
      if (!r.queryMatched) continue;

      const docs = r.matchedDocuments ?? [];
      const votes = r.recentVotes ?? [];
      const doc = docs[0];
      const vote = votes[0];
      if (out.voting && (doc || vote)) {
        out.voting = {
          ...out.voting,
          ...(doc ? {
            lawName: doc.title || out.voting.lawName,
            reference: doc.reference || out.voting.reference,
            date: doc.date || vote?.date || out.voting.date,
          } : {}),
          ...(vote && vote.for + vote.against + vote.abstain > 0 ? {
            votes: {
              for: vote.for,
              against: vote.against,
              abstain: vote.abstain,
              total: vote.for + vote.against + vote.abstain,
            },
            status: vote.for > vote.against ? 'PASSED' : 'REJECTED',
          } : {}),
        };
      }
    }

    if (name === 'fetch_news_data' && classification.modules.includes('NEWS')) {
      const r = result as {
        queryMatched?: boolean;
        headlines?: NewsHeadline[];
        framing?: { left: string; centre: string; right: string };
        sentiment?: number;
        sentimentHistory?: SentimentPoint[];
      };
      if (!r.queryMatched || !out.news) continue;
      const headlines = r.headlines ?? [];
      if (headlines.length === 0) continue;

      const framing = r.framing ?? { left: '', centre: '', right: '' };
      const sentiment = r.sentiment ?? 0;
      const history = r.sentimentHistory ?? [];
      out.news = {
        ...out.news,
        headlines: headlines.slice(0, 8),
        overallSentiment: sentiment,
        sentimentLabel: sentiment > 0.15 ? 'POSITIVE' : sentiment < -0.15 ? 'NEGATIVE' : 'MIXED',
        ...(history.length ? { sentimentHistory: history } : {}),
        framingDivergence: {
          left: framing.left || out.news.framingDivergence.left,
          centre: framing.centre || out.news.framingDivergence.centre,
          right: framing.right || out.news.framingDivergence.right,
        },
      };
    }
  }

  out.meta = buildModuleMeta(classification, toolResults, options?.lobbyingSliceMeta);
  return out;
}

function buildModuleMeta(
  classification: ClassificationResult,
  toolResults: { name: string; result: Record<string, unknown> }[],
  lobbyingSliceMeta?: ModuleSliceMeta,
): ModuleDataMeta | undefined {
  const meta: ModuleDataMeta = {};

  const votingTool = toolResults.find(t => t.name === 'fetch_voting_data');
  const newsTool = toolResults.find(t => t.name === 'fetch_news_data');

  const votingR = votingTool?.result as { queryMatched?: boolean } | undefined;
  const newsR = newsTool?.result as { queryMatched?: boolean } | undefined;

  if (classification.modules.includes('VOTING')) {
    if (votingR?.queryMatched) {
      meta.voting = {
        source: 'hybrid',
        partial: true,
        label: 'EP open data (docs/votes) + roll-call fixture',
      };
    } else {
      meta.voting = {
        source: 'mock',
        partial: false,
        label: 'Scenario fixture',
      };
    }
  }

  if (classification.modules.includes('LOBBYING')) {
    meta.lobbying = lobbyingSliceMeta ?? {
      source: 'mock',
      partial: true,
      label: 'Curated scenario (no register path)',
    };
  }

  if (classification.modules.includes('NEWS')) {
    if (newsR?.queryMatched) {
      meta.news = {
        source: 'hybrid',
        partial: true,
        label: 'GDELT headlines + sentiment fixture where needed',
      };
    } else {
      meta.news = {
        source: 'mock',
        partial: false,
        label: 'Scenario fixture',
      };
    }
  }

  return Object.keys(meta).length ? meta : undefined;
}
