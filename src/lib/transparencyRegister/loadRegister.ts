import fs from 'fs';
import path from 'path';
import type { TransparencyRegisterRecord } from './types';
import registerSample from '@/data/transparency-register-sample.json';

let cache: TransparencyRegisterRecord[] | null = null;
let cacheSource: 'full' | 'sample' = 'sample';

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
      if (Array.isArray(data) && data.length > 100) {
        cache = data as TransparencyRegisterRecord[];
        cacheSource = 'full';
        return cache;
      }
    }
  } catch {
    /* use sample */
  }

  cache = registerSample as TransparencyRegisterRecord[];
  cacheSource = 'sample';
  return cache;
}

export function getTransparencyRegisterSource(): 'full' | 'sample' {
  getTransparencyRegisterRecords();
  return cacheSource;
}
