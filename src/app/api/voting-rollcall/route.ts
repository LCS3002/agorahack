import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import type { KeyMEP } from '@/lib/types';
import { formatCountryAlpha2 } from '@/lib/countryDisplay';

const CACHE = 'public, max-age=86400, stale-while-revalidate=604800';

export async function GET(req: NextRequest) {
  const voteId = req.nextUrl.searchParams.get('voteId');
  if (!voteId || !/^\d+$/.test(voteId)) {
    return NextResponse.json({ error: 'voteId required' }, { status: 400 });
  }

  const countOnly = req.nextUrl.searchParams.get('countOnly') === '1';

  const filePath = path.join(process.cwd(), 'data', 'howtheyvote-rollcall', `${voteId}.json`);
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as KeyMEP[];
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'invalid roll-call file' }, { status: 500 });
    }
    const count = parsed.length;
    if (countOnly) {
      return NextResponse.json({ count }, { headers: { 'Cache-Control': CACHE } });
    }
    const rollCall = parsed.map(k => ({
      ...k,
      country: formatCountryAlpha2(k.country),
    }));
    return NextResponse.json(
      { rollCall, count },
      { headers: { 'Cache-Control': CACHE } },
    );
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return NextResponse.json(
        {
          error: 'not_found',
          hint: 'Run npm run data:howtheyvote to generate data/howtheyvote-rollcall/',
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }
}
