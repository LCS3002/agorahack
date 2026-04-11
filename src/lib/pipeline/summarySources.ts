import type { ModuleData, SummarySourceLink } from '@/lib/types';

/** Human-facing EP procedure page from reference like `2021/0106(COD)` or `2021-0106`. */
export function epProcedureSourceUrl(reference: string): string | null {
  const ref = reference.trim();
  if (!ref) return null;
  const m = ref.match(/^(\d{4})\s*\/\s*(\d{4})/);
  if (m) return `https://data.europarl.europa.eu/procedure/${m[1]}-${m[2]}`;
  const m2 = ref.match(/\b(\d{4})-(\d{4})\b/);
  if (m2) return `https://data.europarl.europa.eu/procedure/${m2[1]}-${m2[2]}`;
  return `https://oeil.secure.europarl.europa.eu/oeil/popups/ficheprocedure.do?reference=${encodeURIComponent(ref)}`;
}

/**
 * Deterministic numbered sources aligned with prompt order: vote → register → news → Wikipedia.
 */
export function buildSummarySources(
  md: ModuleData,
  toolResults: { name: string; result: Record<string, unknown> }[],
): SummarySourceLink[] {
  const out: SummarySourceLink[] = [];
  let n = 1;

  const votingR = toolResults.find(t => t.name === 'fetch_voting_data')?.result as
    | {
        queryMatched?: boolean;
        matchedDocuments?: Array<{ reference?: string; title?: string }>;
      }
    | undefined;

  if (votingR?.queryMatched) {
    const ref = votingR.matchedDocuments?.[0]?.reference ?? md.voting?.reference;
    const title = md.voting?.lawName ?? votingR.matchedDocuments?.[0]?.title ?? ref;
    if (ref) {
      const url = epProcedureSourceUrl(ref);
      if (url) {
        out.push({
          num: n++,
          label: `${title ?? 'EU Parliament'} (${ref})`,
          url,
        });
      }
    }
  }

  if (md.lobbying?.registryUrl) {
    const raw = md.lobbying.registryUrl.trim();
    const url = raw.startsWith('http') ? raw : `https://${raw}`;
    out.push({
      num: n++,
      label: `EU Transparency Register — ${md.lobbying.topic}`,
      url,
    });
  }

  const headline = md.news?.headlines?.find(h => typeof h.url === 'string' && h.url.startsWith('http'));
  if (headline?.url) {
    const t = headline.title.length > 100 ? `${headline.title.slice(0, 100)}…` : headline.title;
    out.push({ num: n++, label: `${headline.source}: ${t}`, url: headline.url });
  }

  const wiki = toolResults.find(t => t.name === 'get_entity_background')?.result as
    | { found?: boolean; pageUrl?: string; title?: string }
    | undefined;
  if (wiki?.found && wiki.pageUrl) {
    out.push({
      num: n++,
      label: wiki.title ? `Wikipedia — ${wiki.title}` : 'Wikipedia (background)',
      url: wiki.pageUrl,
    });
  }

  return out;
}

export function withSummarySources(
  md: ModuleData,
  toolResults: { name: string; result: Record<string, unknown> }[],
): ModuleData {
  const summarySources = buildSummarySources(md, toolResults);
  if (!summarySources.length) return md;
  return { ...md, summarySources };
}
