/**
 * Server-only: full MEP roll-call JSON files from `npm run data:howtheyvote`.
 * Not bundled for the client — only imported from API / merge paths.
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import type { KeyMEP } from '@/lib/types';
import { formatCountryAlpha2 } from '@/lib/countryDisplay';

export function loadHowTheyVoteRollCallFromDisk(voteId: number): KeyMEP[] | null {
  if (!Number.isFinite(voteId) || voteId <= 0) return null;
  try {
    const filePath = path.join(process.cwd(), 'data', 'howtheyvote-rollcall', `${voteId}.json`);
    if (!existsSync(filePath)) return null;
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as KeyMEP[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map(k => ({
      ...k,
      country: formatCountryAlpha2(k.country),
    }));
  } catch {
    return null;
  }
}
