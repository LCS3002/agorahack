/**
 * Downloads HowTheyVote votes.csv.gz and builds a compact JSON index:
 * one "main" row per procedure_reference (latest timestamp).
 *
 * https://github.com/HowTheyVote/data
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const { parse } = require('csv-parse/sync');

const SOURCE = 'https://github.com/HowTheyVote/data/releases/latest/download/votes.csv.gz';

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        { headers: { 'User-Agent': 'agorahack-data-build/1.0', Accept: '*/*' } },
        res => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const loc = res.headers.location;
            if (!loc) {
              reject(new Error('Redirect without Location'));
              return;
            }
            fetchBuffer(new URL(loc, url).href).then(resolve, reject);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            return;
          }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        },
      )
      .on('error', reject);
  });
}

(async () => {
  const gz = await fetchBuffer(SOURCE);
  const csv = zlib.gunzipSync(gz).toString('utf8');
  const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true });

  /** @type {Map<string, object>} */
  const best = new Map();

  for (const r of rows) {
    const isMain = String(r.is_main ?? '').toLowerCase() === 'true';
    if (!isMain) continue;
    const ref = String(r.procedure_reference ?? '').trim();
    if (!ref) continue;
    const ts = String(r.timestamp ?? '');
    const prev = best.get(ref);
    if (!prev || ts > prev.timestamp) {
      best.set(ref, {
        id: Number(r.id),
        timestamp: ts,
        displayTitle: r.display_title ?? '',
        reference: r.reference ?? '',
        procedureReference: ref,
        procedureTitle: r.procedure_title ?? '',
        procedureType: r.procedure_type ?? '',
        for: Number(r.count_for) || 0,
        against: Number(r.count_against) || 0,
        abstain: Number(r.count_abstention) || 0,
      });
    }
  }

  const out = Object.fromEntries(best);
  const outPath = path.join(__dirname, '../src/data/howtheyvote-main-by-procedure.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 0) + '\n');
  console.log('wrote', outPath, 'procedure keys:', Object.keys(out).length);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
