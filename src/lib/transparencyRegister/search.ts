import type { ModuleSliceMeta, PartialLobbyingConflict } from '@/lib/types';
import type { LobbyingResult } from '@/lib/types';
import type { TransparencyRegisterRecord, ScoredRegisterOrg } from './types';
import { extractSearchTerms } from './keywords';
import { getTransparencyRegisterRecords, getTransparencyRegisterSource } from './loadRegister';

const REGISTRY_INFO_URL = 'https://ec.europa.eu/info/relations-with-citizens/transparency-register_en';

function isHighSpendMid(r: TransparencyRegisterRecord): boolean {
  const mid = (r.value_min_eur + r.value_max_eur) / 2;
  return mid >= 4_000_000;
}

function isCommercialCategory(cat: string): boolean {
  const c = cat.toLowerCase();
  return (
    c.includes('company') ||
    c.includes('business association') ||
    c.includes('consultancy') ||
    c.includes('law firms') ||
    c.includes('self-employed consultant')
  );
}

function scoreRecord(record: TransparencyRegisterRecord, terms: string[]): { score: number; rationale: string } {
  let score = 0;
  const reasons: string[] = [];

  const nameL = record.organisation_name.toLowerCase();
  const areasL = record.policy_areas.join(' ').toLowerCase();
  const actL = record.activities_summary.toLowerCase();
  const clientsL = (record.clients_mentioned ?? []).join(' ').toLowerCase();

  for (const t of terms) {
    if (t.length < 2) continue;
    if (nameL.includes(t)) {
      score += 4;
      reasons.push(`name match “${t}”`);
    }
    if (areasL.includes(t)) {
      score += 3;
      reasons.push(`policy area “${t}”`);
    }
    if (actL.includes(t)) {
      score += 2;
      reasons.push(`activity text “${t}”`);
    }
    if (clientsL.includes(t)) {
      score += 2;
      reasons.push(`client/member “${t}”`);
    }
  }

  if (isHighSpendMid(record)) {
    score += 1;
    reasons.push('high declared spend band');
  }

  const rationale = reasons.length
    ? `Matched: ${[...new Set(reasons)].slice(0, 4).join('; ')}`
    : 'No keyword overlap';

  return { score, rationale };
}

function buildPartialConflicts(top: ScoredRegisterOrg[], terms: string[]): PartialLobbyingConflict[] {
  const out: PartialLobbyingConflict[] = [];
  const best = top[0];
  if (!best) return out;

  const policyHits = terms.filter(t =>
    best.record.policy_areas.some(a => a.toLowerCase().includes(t)) ||
    best.record.activities_summary.toLowerCase().includes(t),
  ).length;

  if (isCommercialCategory(best.record.category) && policyHits >= 1) {
    out.push({
      label: 'Commercial actor with declared activity in matched policy areas',
      severity: 'medium',
      reason: 'Policy-area overlap with a company or business association; not evidence of wrongdoing.',
      partial: true,
    });
  }

  if (isHighSpendMid(best.record)) {
    out.push({
      label: 'High declared lobbying expenditure band',
      severity: 'low',
      reason: 'Large declared cost range increases salience; figures are self-reported bands.',
      partial: true,
    });
  }

  if (top.length >= 3 && top.slice(0, 3).every(o => o.score >= 6)) {
    out.push({
      label: 'Multiple aligned registrants on this topic',
      severity: 'low',
      reason: 'Several organisations score highly on the same keywords — typical for contested files.',
      partial: true,
    });
  }

  return out.slice(0, 3);
}

function mapToLobbyingResult(
  topicHint: string,
  scored: ScoredRegisterOrg[],
): LobbyingResult {
  const top = scored.slice(0, 5);
  const organizations = top
    .map((s) => {
      const midEur = (s.record.value_min_eur + s.record.value_max_eur) / 2;
      const spendM = midEur / 1_000_000;
      const meetings = Math.max(2, Math.round(spendM * 5));
      const pi = s.record.persons_involved;
      const peopleInvolved =
        typeof pi === 'number' && Number.isFinite(pi) && pi >= 0 ? Math.round(pi) : undefined;
      const sector = s.record.category.length > 28 ? `${s.record.category.slice(0, 26)}…` : s.record.category;
      return {
        rank: 0,
        name: s.record.organisation_name,
        spend: Math.round(spendM * 100) / 100,
        meetings,
        peopleInvolved,
        sector,
      };
    })
    .sort(
      (a, b) =>
        b.spend - a.spend ||
        (b.peopleInvolved ?? 0) - (a.peopleInvolved ?? 0) ||
        b.meetings - a.meetings,
    )
    .map((o, i) => ({ ...o, rank: i + 1 }));

  const totalDeclaredSpend =
    Math.round(
      organizations.reduce((sum, o) => sum + o.spend, 0) * 10,
    ) / 10;

  const years = [...new Set(top.map(s => s.record.financial_year))];
  const period = years.length === 1 ? `FY ${years[0]}` : `Declared ${years.join(' / ')}`;

  return {
    topic: topicHint,
    totalDeclaredSpend,
    organizations,
    conflictFlags: [],
    period,
    registryUrl: REGISTRY_INFO_URL,
  };
}

export interface RegisterLobbyingBuild {
  lobbying: LobbyingResult;
  usedRegister: boolean;
  sliceMeta: ModuleSliceMeta;
}

/**
 * Keyword search over bundled register snapshot. Swap JSON for a European data portal export for production.
 */
export function buildLobbyingFromRegisterSnapshot(
  query: string,
  entities: string[],
  fixture: LobbyingResult,
): RegisterLobbyingBuild {
  const terms = extractSearchTerms(query, entities);
  const records = getTransparencyRegisterRecords();
  const source = getTransparencyRegisterSource();

  const scored: ScoredRegisterOrg[] = records
    .map(record => {
      const { score, rationale } = scoreRecord(record, terms);
      return { record, score, rationale };
    })
    .filter(s => s.score >= 3)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      lobbying: fixture,
      usedRegister: false,
      sliceMeta: {
        source: 'mock',
        partial: true,
        label: 'Scenario fixture (no register snapshot match for this query)',
      },
    };
  }

  // Build a readable topic hint from the raw query, stripping common question-word prefixes
  const cleanedQuery = query
    .replace(/^(what|how|who|when|tell me about|explain|show me|give me)\s+(happened|is|are|was|were|about)?\s*/i, '')
    .trim();
  const topicHint =
    entities[0] ??
    (cleanedQuery ? `EU lobbying — ${cleanedQuery.slice(0, 55)}` : 'EU Transparency Register matches');

  const lobbying = mapToLobbyingResult(topicHint, scored);
  const partialConflicts = buildPartialConflicts(scored.slice(0, 5), terms);

  const freshness = new Date().toISOString().slice(0, 10);
  const n = records.length;
  const label =
    source === 'full'
      ? `EU Transparency Register (ODP, ${n.toLocaleString()} orgs) | keyword match | ${freshness}`
      : `Bundled sample (${n} orgs) | keyword match | add transparency-register.json`;

  return {
    lobbying: { ...lobbying, partialConflicts },
    usedRegister: true,
    sliceMeta: {
      source: 'register',
      partial: true,
      label,
    },
  };
}
