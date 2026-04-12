/**
 * Enrich HowTheyVote key MEP picks with EP API v2 person + committee bodies.
 */
import type { KeyMEP, MEPConnection, MEPProfile } from '@/lib/types';
import { fixUtf8Mojibake } from '@/lib/fixUtf8Mojibake';
import { formatCountryAlpha2, formatCountryForUi } from '@/lib/countryDisplay';

const EP_V2 = 'https://data.europarl.europa.eu/api/v2';

const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/ld+json',
  'User-Agent': 'agorahack/1.0',
};

function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { signal: timeoutSignal(12000), headers: DEFAULT_HEADERS });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function orgNumericId(org: string | undefined): string | null {
  if (!org) return null;
  const m = String(org).match(/org\/(\d+)/);
  return m ? m[1] : null;
}

function countryFromCitizenship(uri: string | undefined): string {
  if (!uri) return '';
  const m = String(uri).match(/country\/([A-Z]{2,3})$/i);
  return m ? m[1].toUpperCase() : '';
}

function activeOnVote(
  during: { startDate?: string; endDate?: string } | undefined,
  voteDay: string,
): boolean {
  if (!during) return false;
  const v = voteDay.slice(0, 10);
  const s = (during.startDate || '').slice(0, 10);
  const e = (during.endDate || '').slice(0, 10);
  if (s && v < s) return false;
  if (e && v > e) return false;
  return true;
}

function isCommitteeMembership(m: Record<string, unknown>): boolean {
  const c = String(m.membershipClassification ?? '');
  return c.includes('COMMITTEE_PARLIAMENTARY');
}

export async function enrichKeyMepProfiles(
  picks: Array<{
    memberId: number;
    name: string;
    party: string;
    country: string;
    vote: KeyMEP['vote'];
  }>,
  voteDateIso: string,
): Promise<{ keyMEPs: KeyMEP[]; mepProfiles: MEPProfile[] }> {
  const voteDay = voteDateIso.slice(0, 10);
  if (picks.length === 0) return { keyMEPs: [], mepProfiles: [] };

  // Use allSettled so a single EP API timeout doesn't wipe all profiles
  const mepSettled = await Promise.allSettled(
    picks.map(async p => {
      const j = await fetchJson(`${EP_V2}/meps/${p.memberId}`);
      const row = (j?.data as Record<string, unknown>[] | undefined)?.[0];
      return { pick: p, row: row ?? null };
    }),
  );
  const mepRows = mepSettled
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter((r): r is { pick: typeof picks[number]; row: Record<string, unknown> | null } => r !== null);

  const orgIds = new Set<string>();
  for (const { row } of mepRows) {
    if (!row?.hasMembership) continue;
    const mems = row.hasMembership as Record<string, unknown>[];
    for (const m of mems) {
      if (!isCommitteeMembership(m)) continue;
      if (!activeOnVote(m.memberDuring as { startDate?: string; endDate?: string }, voteDay)) continue;
      const oid = orgNumericId(m.organization as string);
      if (oid) orgIds.add(oid);
    }
  }

  const orgLabels = new Map<string, string>();
  await Promise.allSettled(
    [...orgIds].map(async oid => {
      const j = await fetchJson(`${EP_V2}/corporate-bodies/${oid}`);
      const d = (j?.data as Record<string, unknown>[] | undefined)?.[0];
      const label = d ? String(d.label ?? d.identifier ?? oid) : oid;
      orgLabels.set(oid, label);
    }),
  );

  const keyMEPs: KeyMEP[] = [];
  const mepProfiles: MEPProfile[] = [];

  for (const { pick, row } of mepRows) {
    const countryUi = formatCountryForUi(pick.country);
    const countryA2 = formatCountryAlpha2(pick.country);
    const rawName = row?.label ? String(row.label) : pick.name;
    const displayName = fixUtf8Mojibake(rawName);

    keyMEPs.push({
      name: displayName,
      party: pick.party,
      country: countryA2,
      vote: pick.vote,
    });

    if (!row) {
      mepProfiles.push(minimalProfile({ ...pick, name: displayName }, countryUi, countryA2));
      continue;
    }

    const committees: string[] = [];
    const mems = (row.hasMembership as Record<string, unknown>[]) ?? [];
    for (const m of mems) {
      if (!isCommitteeMembership(m)) continue;
      if (!activeOnVote(m.memberDuring as { startDate?: string; endDate?: string }, voteDay)) continue;
      const oid = orgNumericId(m.organization as string);
      if (!oid) continue;
      const lab = orgLabels.get(oid);
      if (lab && !committees.includes(lab)) committees.push(lab);
    }

    const citizenship = countryFromCitizenship(row.citizenship as string | undefined);
    const nationality = formatCountryForUi(citizenship || pick.country) || countryUi;

    const bday = String(row.bday ?? '').slice(0, 4);
    const bornParsed = Number.parseInt(bday, 10);
    const bornYear = bornParsed > 1900 && bornParsed <= 2100 ? bornParsed : 1970;

    const img = row.img ? String(row.img) : undefined;
    const home = row.homepage ? String(row.homepage) : undefined;
    const epPage = `https://www.europarl.europa.eu/meps/en/${pick.memberId}`;

    const place = row.placeOfBirth ? String(row.placeOfBirth) : '';
    const bio =
      place && nationality
        ? `MEP — born ${place}. ${committees.length ? `Committees: ${committees.join(', ')}.` : ''}`
        : `MEP — European Parliament.${committees.length ? ` Committees: ${committees.join(', ')}.` : ''}`;

    const emptyLobby: MEPConnection[] = [];

    mepProfiles.push({
      name: displayName,
      party: pick.party,
      country: countryA2,
      vote: pick.vote,
      bio,
      committees: committees.length ? committees : ['—'],
      bornYear: bornYear || 1970,
      nationality,
      photoUrl: img,
      officialPageUrl: home || epPage,
      lobbyConnections: emptyLobby,
      pastVotes: [],
    });
  }

  return { keyMEPs, mepProfiles };
}

function minimalProfile(
  pick: { name: string; party: string; vote: KeyMEP['vote'] },
  nationality: string,
  countryA2: string,
): MEPProfile {
  const emptyLobby: MEPConnection[] = [];
  return {
    name: pick.name,
    party: pick.party,
    country: countryA2,
    vote: pick.vote,
    bio: 'MEP — European Parliament.',
    committees: ['—'],
    bornYear: 1970,
    nationality,
    lobbyConnections: emptyLobby,
    pastVotes: [],
  };
}
