import type {
  ClassificationResult,
  KeyMEP,
  MEPProfile,
  ModuleData,
  ModuleDataMeta,
  ModuleSliceMeta,
  NewsHeadline,
  SentimentPoint,
} from '@/lib/types';
import { formatCountryAlpha2 } from '@/lib/countryDisplay';
import { lookupHowTheyVoteVoteExtras } from '@/lib/sources/howTheyVote';
import { loadHowTheyVoteRollCallFromDisk } from '@/lib/sources/howTheyVoteRollCallServer';

export interface MergeModuleDataOptions {
  /** When set, overrides default lobbying provenance (e.g. register snapshot) */
  lobbyingSliceMeta?: ModuleSliceMeta;
  /** Clean search phrase — used to update news/lobbying topic labels when real data arrives */
  searchQuery?: string;
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
        recentVotes?: Array<{
          for: number;
          against: number;
          abstain: number;
          date: string;
          label: string;
          howTheyVoteVoteId?: number;
        }>;
        shortName?: string;
        committee?: string;
        keyMEPs?: KeyMEP[];
        mepProfiles?: MEPProfile[];
      };
      if (!r.queryMatched) continue;

      const docs = r.matchedDocuments ?? [];
      const votes = r.recentVotes ?? [];
      const doc = docs[0];
      const vote = votes[0];
      const htvExtras =
        vote?.howTheyVoteVoteId != null ? lookupHowTheyVoteVoteExtras(vote.howTheyVoteVoteId) : null;

      const keyMEPsFromExtras =
        htvExtras?.keyMEPs?.map(k => ({
          ...k,
          country: formatCountryAlpha2(k.country),
        })) ?? [];

      const rollCallFromDisk =
        vote?.howTheyVoteVoteId != null
          ? loadHowTheyVoteRollCallFromDisk(vote.howTheyVoteVoteId)
          : null;

      const keyMEPsMerged =
        rollCallFromDisk && rollCallFromDisk.length > 0
          ? rollCallFromDisk
          : r.keyMEPs && r.keyMEPs.length > 0
            ? r.keyMEPs
            : keyMEPsFromExtras.length > 0
              ? keyMEPsFromExtras
              : undefined;

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
          ...(htvExtras ? { partyBreakdown: htvExtras.partyBreakdown } : {}),
          ...(r.shortName ? { shortName: r.shortName } : {}),
          ...(typeof r.committee === 'string'
            ? { committee: r.committee.trim() || out.voting.committee }
            : {}),
          ...(vote?.howTheyVoteVoteId != null
            ? { howTheyVoteVoteId: vote.howTheyVoteVoteId }
            : {}),
          ...(keyMEPsMerged != null && keyMEPsMerged.length > 0 ? { keyMEPs: keyMEPsMerged } : {}),
          ...(r.mepProfiles && r.mepProfiles.length > 0 ? { mepProfiles: r.mepProfiles } : {}),
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
        // Update topic to the clean search phrase when real data arrives
        ...(options?.searchQuery ? { topic: options.searchQuery } : {}),
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
        label:
          'EP API v2 + HowTheyVote (totals, party breakdown; full MEP list loads from roll-call files when present)',
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
