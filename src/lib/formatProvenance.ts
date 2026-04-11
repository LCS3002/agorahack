import type { ModuleDataMeta } from '@/lib/types';

/** One-line status for the bottom bar (empty when no provenance metadata). */
export function formatModuleDataProvenance(meta?: ModuleDataMeta): string {
  if (!meta) return '';
  const chunks: string[] = [];
  if (meta.voting) chunks.push(`Voting: ${meta.voting.label}`);
  if (meta.lobbying) chunks.push(`Lobbying: ${meta.lobbying.label}`);
  if (meta.news) chunks.push(`News: ${meta.news.label}`);
  return chunks.length ? chunks.join(' | ') : '';
}
