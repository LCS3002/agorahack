/**
 * Downloads HowTheyVote datasets and builds:
 * 1) howtheyvote-main-by-procedure.json — one main vote per procedure_reference
 * 2) howtheyvote-vote-extras.json — per vote id: partyBreakdown[] + keyMEPs[] (from member_votes + members)
 *
 * https://github.com/HowTheyVote/data
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const { parse } = require('csv-parse');
const { parse: parseSync } = require('csv-parse/sync');

const VOTES_URL = 'https://github.com/HowTheyVote/data/releases/latest/download/votes.csv.gz';
const MEMBER_VOTES_URL = 'https://github.com/HowTheyVote/data/releases/latest/download/member_votes.csv.gz';
const MEMBERS_URL = 'https://github.com/HowTheyVote/data/releases/latest/download/members.csv.gz';

const PARTY_ORDER = ['The Left', 'Greens', 'S&D', 'Renew', 'EPP', 'ECR', 'ID', 'ESN'];

const PARTY_COLORS = {
  EPP: '#8B7355',
  'S&D': '#6B5B45',
  Renew: '#9C8B72',
  Greens: '#7A8B6B',
  'The Left': '#5C5650',
  ECR: '#B8A89A',
  ID: '#C9B8A8',
  ESN: '#A89888',
  PfE: '#B0A090',
  NI: '#888888',
};

function groupCodeToParty(code) {
  const m = {
    GUE_NGL: 'The Left',
    GUE_NGL_1995_0: 'The Left',
    GREEN_EFA: 'Greens',
    SD: 'S&D',
    RENEW: 'Renew',
    EPP: 'EPP',
    ECR: 'ECR',
    ID: 'ID',
    NI: 'NI',
    PFE: 'PfE',
    ESN: 'ESN',
  };
  return m[code] || code;
}

function partyOrderIndex(party) {
  const i = PARTY_ORDER.indexOf(party);
  return i === -1 ? 100 + String(party).charCodeAt(0) : i;
}

function positionToVote(pos) {
  if (pos === 'FOR') return 'FOR';
  if (pos === 'AGAINST') return 'AGAINST';
  return 'ABSTAIN';
}

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

function streamMemberVotes(voteIds, onRow, url = MEMBER_VOTES_URL) {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      { headers: { 'User-Agent': 'agorahack-data-build/1.0', Accept: '*/*' } },
      res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (!loc) {
            reject(new Error('Redirect without Location'));
            return;
          }
          res.resume();
          streamMemberVotes(voteIds, onRow, new URL(loc, url).href).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} member_votes`));
          return;
        }
        const parser = parse({ columns: true, relax_column_count: true, trim: true });
        res.pipe(zlib.createGunzip()).pipe(parser);
        parser.on('data', row => {
          const vid = Number(row.vote_id);
          if (!voteIds.has(vid)) return;
          onRow(vid, row);
        });
        parser.on('end', resolve);
        parser.on('error', reject);
      },
    ).on('error', reject);
  });
}

(async () => {
  const gz = await fetchBuffer(VOTES_URL);
  const csv = zlib.gunzipSync(gz).toString('utf8');
  const rows = parseSync(csv, { columns: true, skip_empty_lines: true, relax_column_count: true });

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

  const voteIds = new Set(Object.values(out).map(v => v.id));

  /** @type {Map<number, Map<string, Record<string, number>>>} */
  const aggByVote = new Map();
  /** @type {Map<number, Map<string, { member_id: number; position: string; country_code: string }>>} */
  const keyMin = new Map();
  /** Full roll-call per main vote (all MEP rows from member_votes). */
  /** @type {Map<number, Array<{ member_id: number; position: string; group_code: string; country_code: string }>>} */
  const rollByVote = new Map();

  await streamMemberVotes(voteIds, (vid, row) => {
    const gcode = String(row.group_code ?? '');
    const pos = String(row.position ?? '');
    const mid = Number(row.member_id);

    if (!aggByVote.has(vid)) aggByVote.set(vid, new Map());
    const gm = aggByVote.get(vid);
    if (!gm.has(gcode)) {
      gm.set(gcode, { FOR: 0, AGAINST: 0, ABSTENTION: 0, DID_NOT_VOTE: 0 });
    }
    const bucket = gm.get(gcode);
    bucket[pos] = (bucket[pos] || 0) + 1;

    if (!rollByVote.has(vid)) rollByVote.set(vid, []);
    rollByVote.get(vid).push({
      member_id: mid,
      position: pos,
      group_code: gcode,
      country_code: String(row.country_code ?? ''),
    });

    const party = groupCodeToParty(gcode);
    if (!keyMin.has(vid)) keyMin.set(vid, new Map());
    const pmap = keyMin.get(vid);
    const cur = pmap.get(party);
    if (!cur || mid < cur.member_id) {
      pmap.set(party, {
        member_id: mid,
        position: pos,
        country_code: String(row.country_code ?? ''),
      });
    }
  });

  console.log('streamed member_votes; votes with rows:', aggByVote.size);

  const memGz = await fetchBuffer(MEMBERS_URL);
  const memCsv = zlib.gunzipSync(memGz).toString('utf8');
  const memRows = parseSync(memCsv, { columns: true, skip_empty_lines: true });
  /** @type {Map<number, { first_name: string; last_name: string; country_code: string }>} */
  const members = new Map();
  for (const m of memRows) {
    members.set(Number(m.id), {
      first_name: m.first_name ?? '',
      last_name: m.last_name ?? '',
      country_code: m.country_code ?? '',
    });
  }

  const extras = {};
  for (const vid of voteIds) {
    const gm = aggByVote.get(vid);
    if (!gm) continue;

    const byParty = new Map();
    for (const [gcode, c] of gm) {
      const party = groupCodeToParty(gcode);
      if (!byParty.has(party)) {
        byParty.set(party, { for: 0, against: 0, abstain: 0 });
      }
      const t = byParty.get(party);
      t.for += c.FOR || 0;
      t.against += c.AGAINST || 0;
      t.abstain += (c.ABSTENTION || 0) + (c.DID_NOT_VOTE || 0);
    }

    const partyBreakdown = [...byParty.entries()].map(([party, v]) => ({
      party,
      for: v.for,
      against: v.against,
      abstain: v.abstain,
      color: PARTY_COLORS[party] || '#9A958D',
    }));
    partyBreakdown.sort((a, b) => partyOrderIndex(a.party) - partyOrderIndex(b.party));

    const pmap = keyMin.get(vid);
    const keyMEPs = [];
    if (pmap) {
      for (const p of PARTY_ORDER) {
        const pick = pmap.get(p);
        if (!pick) continue;
        const mem = members.get(pick.member_id);
        const name = mem
          ? `${mem.first_name} ${mem.last_name}`.trim()
          : `#${pick.member_id}`;
        keyMEPs.push({
          memberId: pick.member_id,
          name,
          party: p,
          country: mem?.country_code || pick.country_code || '',
          vote: positionToVote(pick.position),
        });
      }
    }

    extras[String(vid)] = { partyBreakdown, keyMEPs };
  }

  const extrasPath = path.join(__dirname, '../src/data/howtheyvote-vote-extras.json');
  fs.writeFileSync(extrasPath, JSON.stringify(extras, null, 0) + '\n');
  console.log('wrote', extrasPath, 'vote keys:', Object.keys(extras).length);

  const rollDir = path.join(__dirname, '../data/howtheyvote-rollcall');
  fs.mkdirSync(rollDir, { recursive: true });
  let rollFiles = 0;
  for (const vid of voteIds) {
    const rows = rollByVote.get(vid);
    if (!rows?.length) continue;
    const rollCall = rows.map(r => {
      const party = groupCodeToParty(r.group_code);
      const mem = members.get(r.member_id);
      const name = mem ? `${mem.first_name} ${mem.last_name}`.trim() : `#${r.member_id}`;
      return {
        memberId: r.member_id,
        name,
        party,
        country: mem?.country_code || r.country_code || '',
        vote: positionToVote(r.position),
      };
    });
    rollCall.sort(
      (a, b) =>
        partyOrderIndex(a.party) - partyOrderIndex(b.party) || a.name.localeCompare(b.name, 'en'),
    );
    fs.writeFileSync(path.join(rollDir, `${vid}.json`), JSON.stringify(rollCall) + '\n');
    rollFiles++;
  }
  console.log('wrote', rollDir, 'roll-call files:', rollFiles);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
