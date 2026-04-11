/**
 * Heuristic: extract EP committee abbreviations from procedure event `activity_id` / nested ids.
 */
const COMMITTEE_CODE = new Set([
  'AFET',
  'ITRE',
  'IMCO',
  'LIBE',
  'ENVI',
  'AGRI',
  'PECH',
  'CONT',
  'BUDG',
  'CULT',
  'JURI',
  'FEMM',
  'TRAN',
  'REGI',
  'PETI',
  'DROI',
  'SEDE',
  'INTA',
  'DEVE',
  'AFCO',
  'ECON',
  'EMPL',
  'FISC',
  'AIDA',
  'BECA',
]);

function scanString(s: string, found: Set<string>) {
  if (!s) return;
  for (const code of COMMITTEE_CODE) {
    if (s.includes(code)) found.add(code);
  }
}

function walk(v: unknown, found: Set<string>) {
  if (v == null) return;
  if (typeof v === 'string') {
    scanString(v, found);
    return;
  }
  if (Array.isArray(v)) {
    for (const x of v) walk(x, found);
    return;
  }
  if (typeof v === 'object') {
    for (const k of Object.keys(v as object)) {
      walk((v as Record<string, unknown>)[k], found);
    }
  }
}

/** Priority for headline order (lead committees for dossiers often IMCO/LIBE/ITRE/ENVI). */
const PRIORITY = [
  'IMCO',
  'LIBE',
  'ITRE',
  'ENVI',
  'JURI',
  'AGRI',
  'AFET',
  'ECON',
  'TRAN',
  'FEMM',
  'CULT',
  'DEVE',
  'INTA',
  'EMPL',
  'BUDG',
  'CONT',
  'PETI',
  'REGI',
  'AFCO',
  'DROI',
  'SEDE',
  'PECH',
  'FISC',
  'AIDA',
  'BECA',
];

/**
 * Returns e.g. `IMCO · LIBE · ITRE` from `/procedures/{id}/events` payload (`data` array).
 */
export function committeeLabelFromProcedureEvents(events: Record<string, unknown>[]): string {
  const found = new Set<string>();
  walk(events, found);
  const list = [...found].sort((a, b) => {
    const ia = PRIORITY.indexOf(a);
    const ib = PRIORITY.indexOf(b);
    const sa = ia === -1 ? 999 : ia;
    const sb = ib === -1 ? 999 : ib;
    if (sa !== sb) return sa - sb;
    return a.localeCompare(b);
  });
  return list.join(' · ');
}
