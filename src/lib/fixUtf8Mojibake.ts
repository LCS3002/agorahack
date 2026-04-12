import type {
  ConflictFlag,
  KeyMEP,
  LobbyingOrg,
  LobbyingResult,
  MEPConnection,
  MEPProfile,
  ModuleData,
  NewsHeadline,
  NewsResult,
  PartialLobbyingConflict,
  PartyVote,
  SummarySourceLink,
  VoteResult,
} from '@/lib/types';

/**
 * Fix text where UTF-8 bytes were interpreted as Latin-1 / Windows-1252 (mojibake).
 * e.g. "KateÅ™ina" → "Kateřina", "â‚¬10" → "€10".
 */
export function fixUtf8Mojibake(str: string): string {
  if (!str) return str;
  if (!/[\x80-\xFF]/.test(str)) return str;
  try {
    const bytes = Buffer.from(str.split('').map(c => c.charCodeAt(0) & 0xff));
    const decoded = bytes.toString('utf8');
    const origHigh = (str.match(/[\x80-\xFF]/g) ?? []).length;
    const decHigh = (decoded.match(/[\u0080-\uFFFF]/g) ?? []).length;
    return decHigh < origHigh ? decoded : str;
  } catch {
    return str.replace(/[\u0080-\u009F\uE000-\uF8FF\uFFFD]/g, '');
  }
}

function f(s: string | undefined): string {
  return s === undefined ? '' : fixUtf8Mojibake(s);
}

function fixKeyMep(k: KeyMEP): KeyMEP {
  return {
    ...k,
    name: f(k.name),
    party: f(k.party),
    country: f(k.country),
    note: k.note !== undefined ? f(k.note) : k.note,
  };
}

function fixMepProfile(p: MEPProfile): MEPProfile {
  return {
    ...p,
    name: f(p.name),
    party: f(p.party),
    country: f(p.country),
    note: p.note !== undefined ? f(p.note) : p.note,
    bio: f(p.bio),
    committees: p.committees.map(c => f(c)),
    nationality: f(p.nationality),
    officialPageUrl: p.officialPageUrl !== undefined ? f(p.officialPageUrl) : p.officialPageUrl,
    lobbyConnections: p.lobbyConnections.map(fixMepConnection),
    pastVotes: p.pastVotes.map(v => ({
      ...v,
      law: f(v.law),
      shortName: f(v.shortName),
    })),
  };
}

function fixMepConnection(c: MEPConnection): MEPConnection {
  return {
    ...c,
    org: f(c.org),
    sector: f(c.sector),
  };
}

function fixPartyVote(p: PartyVote): PartyVote {
  return { ...p, party: f(p.party) };
}

function fixVoteResult(v: VoteResult): VoteResult {
  return {
    ...v,
    lawName: f(v.lawName),
    shortName: f(v.shortName),
    committee: f(v.committee),
    reference: f(v.reference),
    date: f(v.date),
    partyBreakdown: v.partyBreakdown.map(fixPartyVote),
    keyMEPs: v.keyMEPs.map(fixKeyMep),
    mepProfiles: v.mepProfiles?.map(fixMepProfile),
  };
}

function fixLobbyingOrg(o: LobbyingOrg): LobbyingOrg {
  return {
    ...o,
    name: f(o.name),
    sector: f(o.sector),
  };
}

function fixConflictFlag(c: ConflictFlag): ConflictFlag {
  return {
    ...c,
    mepName: f(c.mepName),
    party: f(c.party),
    lobbyist: f(c.lobbyist),
  };
}

function fixPartialConflict(p: PartialLobbyingConflict): PartialLobbyingConflict {
  return { ...p, label: f(p.label), reason: f(p.reason) };
}

function fixLobbyingResult(l: LobbyingResult): LobbyingResult {
  return {
    ...l,
    topic: f(l.topic),
    period: f(l.period),
    registryUrl: f(l.registryUrl),
    organizations: l.organizations.map(fixLobbyingOrg),
    conflictFlags: l.conflictFlags.map(fixConflictFlag),
    partialConflicts: l.partialConflicts?.map(fixPartialConflict),
  };
}

function fixNewsHeadline(h: NewsHeadline): NewsHeadline {
  return {
    ...h,
    source: f(h.source),
    title: f(h.title),
    date: f(h.date),
    url: h.url !== undefined ? f(h.url) : h.url,
  };
}

function fixNewsResult(n: NewsResult): NewsResult {
  return {
    ...n,
    topic: f(n.topic),
    sentimentHistory: n.sentimentHistory.map(p => ({ ...p, date: f(p.date) })),
    headlines: n.headlines.map(fixNewsHeadline),
    framingDivergence: {
      left: f(n.framingDivergence.left),
      centre: f(n.framingDivergence.centre),
      right: f(n.framingDivergence.right),
    },
  };
}

function fixSummarySource(s: SummarySourceLink): SummarySourceLink {
  return { ...s, label: f(s.label), url: f(s.url) };
}

/** Apply to all user-visible strings before sending ModuleData to the client. */
export function sanitizeModuleDataMojibake(md: ModuleData): ModuleData {
  const out: ModuleData = { ...md };
  if (out.voting) out.voting = fixVoteResult(out.voting);
  if (out.lobbying) out.lobbying = fixLobbyingResult(out.lobbying);
  if (out.news) out.news = fixNewsResult(out.news);
  if (out.summarySources?.length)
    out.summarySources = out.summarySources.map(fixSummarySource);
  return out;
}
