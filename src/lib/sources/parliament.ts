/**
 * EU Parliament open data — procedure → plenary vote → meeting vote-results (EP API v2).
 * Roll-call totals: HowTheyVote CSV snapshot (`lookupHowTheyVoteMainVote`), not EP open API.
 */

import { lookupHowTheyVoteMainVote } from '@/lib/sources/howTheyVote';

export interface ParliamentVotingFetchResult {
  matchedDocuments: Array<{ title: string; reference: string; date: string }>;
  recentVotes: Array<{
    label: string;
    for: number;
    against: number;
    abstain: number;
    date: string;
  }>;
  queryMatched: boolean;
}

const EP_V2 = 'https://data.europarl.europa.eu/api/v2';
const PLENARY_VOTE = 'def/ep-activities/PLENARY_VOTE';

const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/ld+json',
  'User-Agent': 'agorahack/1.0',
};

function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

/** e.g. COD/2021/0106, 2021/0106(COD), 2021-0106, 2021/0106 → 2021-0106 */
function parseProcedureProcessId(text: string): string | null {
  const compact = text.replace(/\u2212/g, '-').trim();
  let m = compact.match(/\b([A-Z]{2,4})\s*\/\s*(\d{4})\s*[\/-]\s*(\d{4})\b/i);
  if (m) return `${m[2]}-${m[3]}`;
  m = compact.match(/\b(\d{4})\s*[\/-]\s*(\d{4})\s*\(([A-Z]{2,4})\)/i);
  if (m) return `${m[1]}-${m[2]}`;
  m = compact.match(/\b(\d{4}-\d{4}[A-Z]?)\b/);
  if (m && /^\d{4}-\d{4}/.test(m[1])) return m[1];
  return null;
}

/** EP document id like A-9-2023-0188 */
function parseDocumentId(text: string): string | null {
  const m = text.match(/\b(A-\d+-\d{4}-\d{4})\b/i);
  return m ? m[1] : null;
}

function pickLangString(m: Record<string, string> | undefined, prefer: string[]): string {
  if (!m) return '';
  for (const k of prefer) {
    const v = m[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const first = Object.values(m).find(v => typeof v === 'string' && v.trim());
  return first ? String(first).trim() : '';
}

/** Scan document JSON for 2021/0106(COD) → process id 2021-0106 */
function processIdFromDocumentPayload(doc: Record<string, unknown>): string | null {
  const blob = JSON.stringify(doc);
  const m = blob.match(/\b(\d{4})\s*\/\s*(\d{4})\s*\(([A-Z]{2,4})\)/);
  if (m) return `${m[1]}-${m[2]}`;
  return null;
}

function sittingIdFromPlenaryVoteActivityId(activityId: string): string | null {
  const m = activityId.match(/^(MTG-PL-\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPlenaryVoteEvent(ev: any): boolean {
  const t = String(ev?.had_activity_type ?? '');
  return t.endsWith('/PLENARY_VOTE') || t === PLENARY_VOTE;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickVoteResultRow(rows: any[], processId: string, docIds: Set<string>): any | undefined {
  const procSuffix = `eli/dl/proc/${processId}`;
  const byProc = rows.find((r: { inverse_consists_of?: { id?: string }[] }) =>
    (r.inverse_consists_of ?? []).some(x => x?.id === procSuffix),
  );
  if (byProc) return byProc;
  return rows.find((r: { based_on_a_realization_of?: string[] }) =>
    (r.based_on_a_realization_of ?? []).some(d => docIds.has(d)),
  );
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(url, { signal: timeoutSignal(12000), headers: DEFAULT_HEADERS });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

async function fetchAllVoteResultsForSitting(sittingId: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  const pageSize = 100;
  for (let offset = 0; offset < 800; offset += pageSize) {
    const url = `${EP_V2}/meetings/${encodeURIComponent(sittingId)}/vote-results?limit=${pageSize}&offset=${offset}`;
    const json = await fetchJson(url);
    const data = json?.data as Record<string, unknown>[] | undefined;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < pageSize) break;
  }
  return out;
}

async function resolveProcessId(query: string, entities: string[]): Promise<string | null> {
  const hay = [query, ...entities].join(' ');
  const direct = parseProcedureProcessId(hay);
  if (direct) return direct;

  const docId = parseDocumentId(hay);
  if (!docId) return null;
  const procUrl = `${EP_V2}/documents/${encodeURIComponent(docId)}`;
  const json = await fetchJson(procUrl);
  const data = json?.data as Record<string, unknown>[] | undefined;
  const doc = data?.[0];
  if (!doc) return null;
  return processIdFromDocumentPayload(doc);
}

/**
 * v1 plenary-documents: still 200 — used only to infer `YYYY/NNNN(COD)` from matched titles when v2 id missing.
 */
async function tryProcessIdFromPlenaryDocMatch(query: string, entities: string[]): Promise<string | null> {
  const res = await fetch(
    'https://data.europarl.europa.eu/api/v1/plenary-documents?format=application%2Fld%2Bjson&limit=40',
    {
      signal: timeoutSignal(8000),
      headers: { Accept: 'application/json', 'User-Agent': 'agorahack/1.0' },
    },
  );
  if (!res.ok) return null;
  const d = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs: any[] = d['@graph'] ?? d.results ?? [];
  const terms = [
    ...query.toLowerCase().split(/\s+/).filter(t => t.length > 3),
    ...entities.map(e => e.toLowerCase()),
  ];
  const scored = docs
    .map(doc => {
      const text = [doc.label, doc.notation, doc.title].filter(Boolean).join(' ').toLowerCase();
      const score = terms.filter(t => text.includes(t)).length;
      return { doc, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { doc } of scored.slice(0, 5)) {
    const pid = processIdFromDocumentPayload(doc as Record<string, unknown>);
    if (pid) return pid;
    const blob = JSON.stringify(doc);
    const fromNotation = parseProcedureProcessId(blob);
    if (fromNotation) return fromNotation;
  }
  return null;
}

export async function fetchParliamentVotingData(
  query: string,
  entities: string[] = [],
): Promise<ParliamentVotingFetchResult> {
  try {
    let processId = await resolveProcessId(query, entities);
    if (!processId) processId = await tryProcessIdFromPlenaryDocMatch(query, entities);
    if (!processId) {
      return { matchedDocuments: [], recentVotes: [], queryMatched: false };
    }

    const procUrl = `${EP_V2}/procedures/${encodeURIComponent(processId)}`;
    const procJson = await fetchJson(procUrl);
    const procRow = (procJson?.data as Record<string, unknown>[] | undefined)?.[0];
    if (!procRow) {
      return { matchedDocuments: [], recentVotes: [], queryMatched: false };
    }

    const label = String(procRow.label ?? '');
    const procTitle = pickLangString(procRow.process_title as Record<string, string> | undefined, [
      'en',
      'fr',
      'de',
    ]);

    const htv = lookupHowTheyVoteMainVote({
      procedureLabel: label,
      processId,
      processType: String(procRow.process_type ?? ''),
    });
    const htvDate = htv?.timestamp?.slice(0, 10) ?? '';
    const htvTallies = () =>
      htv
        ? { for: htv.for, against: htv.against, abstain: htv.abstain }
        : { for: 0, against: 0, abstain: 0 };

    const eventsUrl = `${EP_V2}/procedures/${encodeURIComponent(processId)}/events`;
    const eventsJson = await fetchJson(eventsUrl);
    const events = (eventsJson?.data ?? []) as Record<string, unknown>[];
    const plenaryVotes = events.filter(isPlenaryVoteEvent);
    if (plenaryVotes.length === 0) {
      return {
        matchedDocuments: [
          {
            title: procTitle || label || processId,
            reference: label || processId,
            date: htvDate,
          },
        ],
        recentVotes: htv
          ? [
              {
                label: htv.displayTitle || procTitle || label,
                ...htvTallies(),
                date: htvDate,
              },
            ]
          : [],
        queryMatched: true,
      };
    }

    plenaryVotes.sort((a, b) => String(b.activity_date ?? '').localeCompare(String(a.activity_date ?? '')));
    const latestPv = plenaryVotes[0];
    const activityId = String(latestPv.activity_id ?? '');
    const docIds = new Set(
      ((latestPv.based_on_a_realization_of as string[] | undefined) ?? []).filter(Boolean),
    );
    const sittingId = sittingIdFromPlenaryVoteActivityId(activityId);
    if (!sittingId) {
      const d = String(latestPv.activity_date ?? '');
      return {
        matchedDocuments: [
          {
            title: procTitle || label || processId,
            reference: label || processId,
            date: d || htvDate,
          },
        ],
        recentVotes: htv
          ? [
              {
                label: htv.displayTitle || procTitle || label,
                ...htvTallies(),
                date: d || htvDate,
              },
            ]
          : [],
        queryMatched: true,
      };
    }

    const voteRows = await fetchAllVoteResultsForSitting(sittingId);
    const resultRow = pickVoteResultRow(voteRows, processId, docIds);

    const voteDate = String((resultRow ?? latestPv).activity_date ?? '');
    const activityLabel = resultRow
      ? pickLangString(resultRow.activity_label as Record<string, string> | undefined, ['en', 'fr'])
      : '';

    let voteLabel = activityLabel;
    if (!voteLabel && resultRow?.structuredLabel && typeof resultRow.structuredLabel === 'object') {
      voteLabel = pickLangString(resultRow.structuredLabel as Record<string, string>, ['fr', 'en']);
    }
    if (!voteLabel) voteLabel = procTitle || label;

    return {
      matchedDocuments: [
        {
          title: procTitle || label || processId,
          reference: label || processId,
          date: voteDate || htvDate,
        },
      ],
      recentVotes: [
        {
          label: voteLabel,
          ...htvTallies(),
          date: voteDate || htvDate,
        },
      ],
      queryMatched: true,
    };
  } catch {
    return { matchedDocuments: [], recentVotes: [], queryMatched: false };
  }
}
