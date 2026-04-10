// ── Module identifiers ────────────────────────────────────────────────────────
export type ModuleType = 'VOTING' | 'LOBBYING' | 'NEWS';
export type QueryType = 'person' | 'legislation' | 'topic' | 'event';

// ── Classification result (from /api/classify) ────────────────────────────────
export interface ClassificationResult {
  modules: ModuleType[];
  entities: string[];
  timeframe: string;
  query_type: QueryType;
}

// ── VOTING module ─────────────────────────────────────────────────────────────
export interface PartyVote {
  party: string;
  for: number;
  against: number;
  abstain: number;
  color: string; // for data viz
}

export interface KeyMEP {
  name: string;
  party: string;
  country: string;
  vote: 'FOR' | 'AGAINST' | 'ABSTAIN';
  note?: string;
}

export interface VoteResult {
  lawName: string;
  shortName: string;
  status: 'PASSED' | 'REJECTED' | 'PENDING';
  votes: {
    for: number;
    against: number;
    abstain: number;
    total: number;
  };
  partyBreakdown: PartyVote[];
  keyMEPs: KeyMEP[];
  date: string;
  committee: string;
  reference: string;
}

// ── LOBBYING module ───────────────────────────────────────────────────────────
export interface LobbyingOrg {
  rank: number;
  name: string;
  spend: number; // millions EUR
  meetings: number;
  sector: string;
}

export interface ConflictFlag {
  mepName: string;
  party: string;
  meetings: number;
  votedFor: boolean;
  lobbyist: string;
  amount: number;
}

export interface LobbyingResult {
  topic: string;
  totalDeclaredSpend: number; // millions EUR
  organizations: LobbyingOrg[];
  conflictFlags: ConflictFlag[];
  period: string;
  registryUrl: string;
}

// ── NEWS module ───────────────────────────────────────────────────────────────
export interface NewsHeadline {
  source: string;
  title: string;
  sentiment: number; // -1 to 1
  date: string;
  lean: 'LEFT' | 'CENTRE' | 'RIGHT';
}

export interface SentimentPoint {
  date: string;
  score: number; // -1 to 1
}

export interface NewsResult {
  topic: string;
  overallSentiment: number; // -1 to 1
  sentimentLabel: 'POSITIVE' | 'MIXED' | 'NEGATIVE';
  sentimentHistory: SentimentPoint[];
  headlines: NewsHeadline[];
  framingDivergence: {
    left: string;
    centre: string;
    right: string;
  };
}

// ── Aggregated module data ────────────────────────────────────────────────────
export interface ModuleData {
  voting?: VoteResult;
  lobbying?: LobbyingResult;
  news?: NewsResult;
}

// ── Query history ─────────────────────────────────────────────────────────────
export interface HistoryItem {
  id: string;
  query: string;
  summary: string;
  modules: ModuleType[];
  timestamp: number;
  timing: number; // ms
}
