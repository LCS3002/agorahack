import fs from 'fs';
import path from 'path';
import type { TransparencyRegisterRecord } from './types';
import registerSample from '@/data/transparency-register-sample.json';

/** Decode common HTML entities that appear in portal exports. */
function decodeEntities(str: string): string {
  if (!str || !str.includes('&')) return str;
  return str
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

function cleanRecord(r: TransparencyRegisterRecord): TransparencyRegisterRecord {
  return {
    ...r,
    organisation_name: decodeEntities(r.organisation_name),
    activities_summary: decodeEntities(r.activities_summary),
    policy_areas: r.policy_areas.map(decodeEntities),
  };
}

let cache: TransparencyRegisterRecord[] | null = null;
let cacheSource: 'full' | 'sample' = 'sample';

function isRegisterRow(x: unknown): x is TransparencyRegisterRecord {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.registration_id === 'string' && typeof o.organisation_name === 'string';
}

function isValidFullRegister(data: unknown): data is TransparencyRegisterRecord[] {
  return Array.isArray(data) && data.length > 0 && isRegisterRow(data[0]);
}

/**
 * Loads `src/data/transparency-register.json` when present (from `npm run data:transparency`),
 * otherwise the small bundled sample. Server-only (Node fs).
 */
export function getTransparencyRegisterRecords(): TransparencyRegisterRecord[] {
  if (cache) return cache;

  const fullPath = path.join(process.cwd(), 'src/data/transparency-register.json');
  try {
    if (fs.existsSync(fullPath)) {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const data = JSON.parse(raw) as unknown;
      if (isValidFullRegister(data)) {
        cache = data.map(cleanRecord);
        cacheSource = 'full';
        return cache;
      }
    }
  } catch {
    /* use sample */
  }

  cache = (registerSample as TransparencyRegisterRecord[]).map(cleanRecord);
  cacheSource = 'sample';
  return cache;
}

export function getTransparencyRegisterSource(): 'full' | 'sample' {
  getTransparencyRegisterRecords();
  return cacheSource;
}
