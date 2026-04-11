// ── Module identifiers ────────────────────────────────────────────────────────
export type ModuleType = 'VOTING' | 'LOBBYING' | 'NEWS';
export type QueryType = 'person' | 'legislation' | 'topic' | 'event';

// ── Classification result (from /api/classify) ────────────────────────────────
export interface ClassificationResult {
  modules: ModuleType[];
  entities: string[];
  timeframe: string;
  query_type: QueryType;
  /** Context hints for modules NOT in the active modules array — shown in dashboard empty states */
  moduleContext?: Partial<Record<ModuleType, string>>;
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
  /** Present in HowTheyVote-derived JSON; used for EP enrichment */
  memberId?: number;
}

export interface MEPConnection {
  org: string;
  meetings: number;
  spend: number; // €M declared
  sector: string;
}

export interface MEPProfile extends KeyMEP {
  bio: string;
  committees: string[];
  bornYear: number;
  nationality: string;
  /** EP portrait URL when enriched from open data */
  photoUrl?: string;
  /** MEP site or europarl profile */
  officialPageUrl?: string;
  lobbyConnections: MEPConnection[];
  pastVotes: {
    law: string;
    shortName: string;
    vote: 'FOR' | 'AGAINST' | 'ABSTAIN';
    year: number;
  }[];
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
  mepProfiles?: MEPProfile[];
  date: string;
  committee: string;
  reference: string;
}

// ── LOBBYING module ───────────────────────────────────────────────────────────
export interface LobbyingOrg {
  rank: number;
  name: string;
  spend: number; // millions EUR
  /** Scenario “logged meetings” or, for register-derived rows, a heuristic proxy (not EP meeting counts). */
  meetings: number;
  /** Declared persons / FTE from Transparency Register when present */
  peopleInvolved?: number;
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

/** Heuristic “signals” from register overlap — not proven MEP-level conflicts */
export interface PartialLobbyingConflict {
  label: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
  partial: true;
}

export interface LobbyingResult {
  topic: string;
  totalDeclaredSpend: number; // millions EUR
  organizations: LobbyingOrg[];
  conflictFlags: ConflictFlag[];
  period: string;
  registryUrl: string;
  partialConflicts?: PartialLobbyingConflict[];
}

// ── NEWS module ───────────────────────────────────────────────────────────────
export interface NewsHeadline {
  source: string;
  title: string;
  sentiment: number; // -1 to 1
  date: string;
  lean: 'LEFT' | 'CENTRE' | 'RIGHT';
  /** Present when headlines come from GDELT */
  url?: string;
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

// ── Provenance (which slices are live API vs curated fixture) ─────────────────
export type DataProvenance = 'api' | 'mock' | 'hybrid' | 'register';

export interface ModuleSliceMeta {
  source: DataProvenance;
  /** True when roll-call / org list / chart mixes live + fixture or is incomplete */
  partial: boolean;
  /** Short explanation for UI / debugging */
  label: string;
}

export interface ModuleDataMeta {
  voting?: ModuleSliceMeta;
  lobbying?: ModuleSliceMeta;
  news?: ModuleSliceMeta;
}

/** Clickable citation targets for the intelligence summary (built from real tool outputs). */
export interface SummarySourceLink {
  num: number;
  label: string;
  url: string;
}

// ── Aggregated module data ────────────────────────────────────────────────────
export interface ModuleData {
  voting?: VoteResult;
  lobbying?: LobbyingResult;
  news?: NewsResult;
  meta?: ModuleDataMeta;
  /** When set, inline [n] and the Sources block can open these URLs in a new tab */
  summarySources?: SummarySourceLink[];
}

// ── Agent tool status (shown while query is in-flight) ───────────────────────
export interface ToolStatusItem {
  name: string;
  phase: 'running' | 'done';
  matched?: boolean;
}

// ── Query history ─────────────────────────────────────────────────────────────
export interface HistoryItem {
  id: string;
  query: string;
  summary: string;
  modules: ModuleType[];
  timestamp: number;
  timing: number; // ms
  /** Full module data snapshot — enables dashboard restoration without a new API call */
  moduleData?: ModuleData;
  /** Classification result — restores moduleContext and active modules */
  classification?: ClassificationResult;
}
