/**
 * Local index built from HowTheyVote `votes.csv.gz` (main votes per procedure)
 * and `member_votes` aggregates (party breakdown + key MEP picks).
 * @see https://github.com/HowTheyVote/data — `npm run data:howtheyvote`
 */
import howTheyVoteIndex from '@/data/howtheyvote-main-by-procedure.json';
import voteExtras from '@/data/howtheyvote-vote-extras.json';

import type { KeyMEP, PartyVote } from '@/lib/types';

export type HowTheyVoteMainRow = {
  id: number;
  timestamp: string;
  displayTitle: string;
  reference: string;
  procedureReference: string;
  procedureTitle: string;
  procedureType: string;
  for: number;
  against: number;
  abstain: number;
};

const INDEX = howTheyVoteIndex as Record<string, HowTheyVoteMainRow>;

function epProcedureTypeAbbrev(processTypeField: string): string {
  const m = processTypeField.match(/ep-procedure-types\/([^/]+)$/);
  return m ? m[1] : 'COD';
}

function syntheticProcedureRef(processId: string, abbrev: string): string | null {
  const m = processId.match(/^(\d{4})-(\d{4})/);
  if (!m) return null;
  return `${m[1]}/${m[2]}(${abbrev})`;
}

/**
 * Match EP procedure `label` (e.g. 2021/0106(COD)) or derive the same key from process_id + procedure type.
 */
export function lookupHowTheyVoteMainVote(opts: {
  procedureLabel: string;
  processId: string;
  processType?: string;
}): HowTheyVoteMainRow | null {
  const abbrev = epProcedureTypeAbbrev(opts.processType ?? 'def/ep-procedure-types/COD');
  const candidates = [opts.procedureLabel.trim()].filter(Boolean);
  const syn = syntheticProcedureRef(opts.processId, abbrev);
  if (syn) candidates.push(syn);

  for (const k of candidates) {
    const row = INDEX[k];
    if (row) return row;
  }

  const m = opts.processId.match(/^(\d{4})-(\d{4})/);
  if (m) {
    const prefix = `${m[1]}/${m[2]}(`;
    const keys = Object.keys(INDEX).filter(k => k.startsWith(prefix));
    if (keys.length === 1) return INDEX[keys[0]];
  }

  return null;
}

export function lookupHowTheyVoteVoteExtras(voteId: number): {
  partyBreakdown: PartyVote[];
  keyMEPs: KeyMEP[];
} | null {
  const row = (voteExtras as Record<string, { partyBreakdown: PartyVote[]; keyMEPs: KeyMEP[] }>)[String(voteId)];
  return row ?? null;
}

/**
 * Fuzzy title search over the full HowTheyVote snapshot.
 * Splits the query into content words (≥4 chars), scores each row by how many match
 * in procedureTitle or displayTitle, returns the best match above a threshold.
 *
 * Covers queries that don't carry a procedure reference number, e.g.
 * "taxonomy regulation", "return border procedure", "screening regulation".
 */
export function searchHowTheyVoteByTitle(
  query: string,
  entities: string[] = [],
): HowTheyVoteMainRow | null {
  const STOPWORDS = new Set([
    'the','and','for','with','that','this','from','into','about','have',
    'been','were','what','happened','tell','show','explain','give','when',
    'how','who','did','does','was','will','would','could','should',
  ]);

  // Build search terms from entities + query, min 4 chars, no stopwords
  const termSrc = [...entities, query].join(' ').toLowerCase();
  const terms = [...new Set(
    termSrc.split(/[^a-z0-9äöüßàéèùôîêâ]+/i)
      .filter(w => w.length >= 4 && !STOPWORDS.has(w))
  )];

  if (terms.length === 0) return null;

  let bestRow: HowTheyVoteMainRow | null = null;
  let bestScore = 0;

  for (const row of Object.values(INDEX)) {
    const hay = `${row.procedureTitle ?? ''} ${row.displayTitle ?? ''}`.toLowerCase();
    const score = terms.filter(t => hay.includes(t)).length;
    // Require at least 2 matching terms (or 1 if the term is very specific / long)
    const threshold = terms.length === 1 ? 1 : 2;
    if (score >= threshold && score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  }

  return bestRow;
}
