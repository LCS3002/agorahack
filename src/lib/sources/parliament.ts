/**
 * EU Parliament open data — procedure → plenary vote → meeting vote-results (EP API v2).
 * Roll-call totals: HowTheyVote CSV snapshot (`lookupHowTheyVoteMainVote`), not EP open API.
 */

import { committeeLabelFromProcedureEvents } from '@/lib/epProcedureCommittees';
import type { KeyMEP, MEPProfile } from '@/lib/types';
import { enrichKeyMepProfiles } from '@/lib/sources/epMepEnrichment';
import { lookupHowTheyVoteMainVote, lookupHowTheyVoteVoteExtras, searchHowTheyVoteByTitle } from '@/lib/sources/howTheyVote';

export interface ParliamentVotingFetchResult {
  matchedDocuments: Array<{ title: string; reference: string; date: string }>;
  recentVotes: Array<{
    label: string;
    for: number;
    against: number;
    abstain: number;
    date: string;
    /** HowTheyVote `votes.csv` id — join to `howtheyvote-vote-extras.json` */
    howTheyVoteVoteId?: number;
  }>;
  queryMatched: boolean;
  /** Report / dossier short label (e.g. A9-0188/2023) */
  shortName?: string;
  /** Lead committees from procedure events */
  committee?: string;
  /** Enriched key MEPs (country alpha-2, EP names) */
  keyMEPs?: KeyMEP[];
  mepProfiles?: MEPProfile[];
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
export function parseProcedureProcessId(text: string): string | null {
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

function sittingIdFromPlenaryVoteActivityId(activityId: string, fallbackDate?: string): string | null {
  // Sitting-level activity IDs: "MTG-PL-2024-04-10-VOT-ITM-..."
  const m = activityId.match(/^(MTG-PL-\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  // Procedure-level adoption events: "2016-0280-DEC-DCPL-2019-03-26"
  // Derive the sitting from the event's activity_date instead.
  if (fallbackDate) {
    const d = fallbackDate.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return `MTG-PL-${d}`;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPlenaryVoteEvent(ev: any): boolean {
  const t = String(ev?.had_activity_type ?? '');
  // Match sitting-level PLENARY_VOTE and procedure-level adoption events
  // (PLENARY_ADOPT_POSITION = first/second reading; PLENARY_ADOPT_TEXT = final text)
  return (
    t.endsWith('/PLENARY_VOTE') ||
    t === PLENARY_VOTE ||
    t.endsWith('/PLENARY_ADOPT_POSITION') ||
    t.endsWith('/PLENARY_ADOPT_TEXT')
  );
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

async function resolveProcessId(query: string, entities: string[], procedureRef?: string | null): Promise<string | null> {
  // Use LLM-extracted procedure ref first — most reliable for named legislation
  if (procedureRef) {
    const pid = parseProcedureProcessId(procedureRef);
    if (pid) return pid;
    if (/^\d{4}-\d{4}/.test(procedureRef)) return procedureRef;
  }

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
 * When EP document / plenary text search fails, map well-known legislation names to OLP process_id (YYYY-NNNN).
 */
export function processIdFromLegislationKeywords(text: string): string | null {
  const q = text.toLowerCase();
  const hasDsa =
    q.includes('digital services act') ||
    /\bdsa\b/.test(q) ||
    q.includes('single market for digital services');
  const hasDma = q.includes('digital markets act') || /\bdma\b/.test(q);
  const hasAi =
    /\bai act\b/.test(q) ||
    (q.includes('artificial intelligence act') && !q.includes('digital services act'));

  const hasAsylumPact =
    q.includes('asylum pact') ||
    q.includes('pact on migration') ||
    (q.includes('asylum') && (q.includes('migration') || q.includes('pact'))) ||
    q.includes('ammr') ||
    q.includes('2020/0279') ||
    q.includes('2020-0279');
  // Asylum Procedures Regulation (recast) — voted April 2024 as part of the Pact package
  const hasAsylumProcedures =
    !hasAsylumPact &&
    (q.includes('asylum procedures') || q.includes('2016/0224') || q.includes('2016-0224'));

  // Nature Restoration Law — EP voted June 2024
  const hasNatureRestoration =
    q.includes('nature restoration') ||
    q.includes('nature restoration law') ||
    q.includes('2022/0195');
  // European Climate Law / Green Deal — voted June 2021
  const hasGreenDeal =
    q.includes('green deal') ||
    q.includes('european green deal') ||
    q.includes('climate law') ||
    q.includes('european climate law') ||
    q.includes('fit for 55') ||
    q.includes('2020/0036');

  if (hasDsa) return '2020-0361';
  if (hasDma) return '2020-0374';
  if (hasAi) return '2021-0106';
  // Asylum and Migration Management Regulation — flagship regulation of the 2024 Pact
  if (hasAsylumPact) return '2020-0279';
  if (hasAsylumProcedures) return '2016-0224';
  if (hasNatureRestoration) return '2022-0195';
  if (hasGreenDeal) return '2020-0036';
  return null;
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
  // Use content words only (skip stopwords that inflate false-positive scores)
  const STOPWORDS_EP = new Set(['what','happened','with','the','about','that','this','tell','show','give','explain','when','how','who','did','does','was','were','will','would','could','from','into','onto','been','have','shall']);
  const terms = [
    ...query.toLowerCase().split(/\s+/).filter(t => t.length > 3 && !STOPWORDS_EP.has(t)),
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

/**
 * When EP v2 is unreachable but HowTheyVote has a main vote for this process_id, still return real tallies.
 */
async function parliamentVoteResultFromHowTheyVoteSnapshot(
  processId: string,
): Promise<ParliamentVotingFetchResult | null> {
  const htv = lookupHowTheyVoteMainVote({
    procedureLabel: '',
    processId,
    processType: 'def/ep-procedure-types/COD',
  });
  if (!htv) return null;

  const htvDate = htv.timestamp?.slice(0, 10) ?? '';
  const procTitle = htv.procedureTitle || htv.displayTitle || '';
  const shortName =
    htv.reference?.trim() ||
    (procTitle.length > 48 ? `${procTitle.slice(0, 46)}…` : procTitle) ||
    htv.displayTitle ||
    processId;

  const extras = lookupHowTheyVoteVoteExtras(htv.id);
  const raw = extras?.keyMEPs as Array<KeyMEP & { memberId?: number }> | undefined;
  const picks =
    raw
      ?.filter((k): k is KeyMEP & { memberId: number } => typeof k.memberId === 'number')
      .map(k => ({
        memberId: k.memberId,
        name: k.name,
        party: k.party,
        country: k.country,
        vote: k.vote,
      })) ?? [];
  const enr = picks.length ? await enrichKeyMepProfiles(picks, htvDate) : {};

  return {
    matchedDocuments: [
      {
        title: htv.procedureTitle || htv.displayTitle || processId,
        reference: htv.procedureReference || processId,
        date: htvDate,
      },
    ],
    recentVotes: [
      {
        label: htv.displayTitle || htv.procedureTitle || processId,
        for: htv.for,
        against: htv.against,
        abstain: htv.abstain,
        date: htvDate,
        howTheyVoteVoteId: htv.id,
      },
    ],
    queryMatched: true,
    shortName,
    ...enr,
  };
}

/**
 * Build a full result from a HowTheyVote snapshot row (offline, instant).
 * Used by both the title-search path and the processId-with-snapshot path.
 */
async function resultFromHtvRow(titleHit: import('@/lib/sources/howTheyVote').HowTheyVoteMainRow): Promise<ParliamentVotingFetchResult> {
  const htvDate = titleHit.timestamp?.slice(0, 10) ?? '';
  const extras = lookupHowTheyVoteVoteExtras(titleHit.id);
  const raw = extras?.keyMEPs as Array<KeyMEP & { memberId?: number }> | undefined;
  const picks = raw
    ?.filter((k): k is KeyMEP & { memberId: number } => typeof k.memberId === 'number')
    .map(k => ({ memberId: k.memberId, name: k.name, party: k.party, country: k.country, vote: k.vote }))
    ?? [];
  const enr = picks.length ? await enrichKeyMepProfiles(picks, htvDate) : {};
  return {
    matchedDocuments: [{
      title: titleHit.procedureTitle || titleHit.displayTitle,
      reference: titleHit.procedureReference || titleHit.reference,
      date: htvDate,
    }],
    recentVotes: [{
      label: titleHit.displayTitle || titleHit.procedureTitle,
      for: titleHit.for,
      against: titleHit.against,
      abstain: titleHit.abstain,
      date: htvDate,
      howTheyVoteVoteId: titleHit.id,
    }],
    queryMatched: true,
    shortName: titleHit.reference?.trim() || titleHit.displayTitle,
    ...enr,
  };
}

export async function fetchParliamentVotingData(
  query: string,
  entities: string[] = [],
  procedureRef?: string | null,
): Promise<ParliamentVotingFetchResult> {
  try {
    const haystack = [query, ...entities].join(' ');

    // ── Step 1: derive a processId from the fastest sources (no network) ──────
    // Priority: LLM-extracted ref → inline ref in query text → keyword table
    let processId = await resolveProcessId(query, entities, procedureRef);
    if (!processId) processId = processIdFromLegislationKeywords(haystack);

    // ── Step 2: if we have a processId, try HowTheyVote OFFLINE FIRST ─────────
    // This covers ~95% of well-known legislation instantly without any network call.
    if (processId) {
      const htvDirect = lookupHowTheyVoteMainVote({
        procedureLabel: '',
        processId,
        processType: 'def/ep-procedure-types/COD',
      });
      if (htvDirect) return resultFromHtvRow(htvDirect);
    }

    // ── Step 3: fuzzy title search in local HowTheyVote index ────────────────
    // Catches queries where the user doesn't use the exact procedure name.
    const titleHit = searchHowTheyVoteByTitle(query, entities);
    if (titleHit) return resultFromHtvRow(titleHit);

    // ── Step 4: EP v2 live API (network, slow — only reached for very recent
    //    or obscure votes not yet in the HowTheyVote snapshot) ─────────────────
    if (!processId) processId = await tryProcessIdFromPlenaryDocMatch(query, entities);
    if (!processId) return { matchedDocuments: [], recentVotes: [], queryMatched: false };

    const procUrl = `${EP_V2}/procedures/${encodeURIComponent(processId)}`;
    const procJson = await fetchJson(procUrl);
    const procRow = (procJson?.data as Record<string, unknown>[] | undefined)?.[0];
    if (!procRow) {
      const snap = await parliamentVoteResultFromHowTheyVoteSnapshot(processId);
      if (snap) return snap;
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
    const committee = committeeLabelFromProcedureEvents(events);
    const shortName =
      htv?.reference?.trim() ||
      (procTitle.length > 48 ? `${procTitle.slice(0, 46)}…` : procTitle) ||
      label;

    const loadEnrichedMeps = async (voteDateStr: string) => {
      if (!htv) return {};
      const extras = lookupHowTheyVoteVoteExtras(htv.id);
      const raw = extras?.keyMEPs as Array<KeyMEP & { memberId?: number }> | undefined;
      const picks =
        raw
          ?.filter((k): k is KeyMEP & { memberId: number } => typeof k.memberId === 'number')
          .map(k => ({
            memberId: k.memberId,
            name: k.name,
            party: k.party,
            country: k.country,
            vote: k.vote,
          })) ?? [];
      if (!picks.length) return {};
      return enrichKeyMepProfiles(picks, voteDateStr || htvDate);
    };

    const plenaryVotes = events.filter(isPlenaryVoteEvent);
    if (plenaryVotes.length === 0) {
      const enr = await loadEnrichedMeps(htvDate);
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
                howTheyVoteVoteId: htv.id,
              },
            ]
          : [],
        queryMatched: true,
        shortName,
        committee,
        ...enr,
      };
    }

    plenaryVotes.sort((a, b) => String(b.activity_date ?? '').localeCompare(String(a.activity_date ?? '')));
    const latestPv = plenaryVotes[0];
    const activityId = String(latestPv.activity_id ?? '');
    const docIds = new Set(
      ((latestPv.based_on_a_realization_of as string[] | undefined) ?? []).filter(Boolean),
    );
    const eventDate = String(latestPv.activity_date ?? '');
    const sittingId = sittingIdFromPlenaryVoteActivityId(activityId, eventDate);
    if (!sittingId) {
      const d = eventDate;
      const enr = await loadEnrichedMeps(d || htvDate);
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
                howTheyVoteVoteId: htv.id,
              },
            ]
          : [],
        queryMatched: true,
        shortName,
        committee,
        ...enr,
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

    const enr = await loadEnrichedMeps(voteDate || htvDate);
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
          ...(htv ? { howTheyVoteVoteId: htv.id } : {}),
        },
      ],
      queryMatched: true,
      shortName,
      committee,
      ...enr,
    };
  } catch {
    const hay = [query, ...entities].join(' ');
    const pid = parseProcedureProcessId(hay) ?? processIdFromLegislationKeywords(hay);
    if (pid) {
      const snap = await parliamentVoteResultFromHowTheyVoteSnapshot(pid);
      if (snap) return snap;
    }
    return { matchedDocuments: [], recentVotes: [], queryMatched: false };
  }
}
