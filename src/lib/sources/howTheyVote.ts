/**
 * Local index built from HowTheyVote `votes.csv.gz` (main votes per procedure).
 * @see https://github.com/HowTheyVote/data — `npm run data:howtheyvote`
 */
import howTheyVoteIndex from '@/data/howtheyvote-main-by-procedure.json';

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
