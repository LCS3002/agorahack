/**
 * Converts EU Transparency Register XLS export (e.g. ODP*-*.xls) to
 * src/data/transparency-register.json matching TransparencyRegisterRecord.
 *
 * Usage: node scripts/convert-transparency-register.cjs [path-to.xls]
 * Default input: src/data/ODP10-04-2026.xls
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const DEFAULT_XLS = path.join(ROOT, 'src/data/ODP10-04-2026.xls');
const OUT_JSON = path.join(ROOT, 'src/data/transparency-register.json');

const H = {
  id: 'Identification Number',
  regDate: 'Registration date',
  category: 'Category of registration',
  name: 'Name',
  website: 'Website URL',
  country: 'Head office country',
  goals: 'Goals',
  euLegislation: 'EU Legislative proposals/policies',
  fieldOfInterest: 'Field of interest',
  orgMembers: 'Organisation Members: List of organisations, networks and associations that are the members and/or affiliated with the organisation',
  interestsRepresented: 'Interests represented',
  annualCost: 'Annual cost for register activity or total budget',
  closedStart: 'Closed year start',
  closedEnd: 'Closed year end',
  closedEuGrants: 'Closed year total EU grants',
  currentEuTotal: 'Current year total',
  sourceFunding: 'Source of funding',
  membersFte: 'Members FTE',
  membersCount: 'Members',
};

function parseEuroNumber(str) {
  if (str == null || str === '') return null;
  const digits = String(str).replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

function parseCost(raw) {
  const s = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (!s) return { label: '—', min: 0, max: 0 };

  const lt = s.match(/^<\s*([\d\s.,']+)/i);
  if (lt) {
    const n = parseEuroNumber(lt[1]);
    return { label: s, min: 0, max: n ?? 0 };
  }

  if (!/[-–—]/.test(s)) {
    const n = parseEuroNumber(s);
    if (n != null) return { label: s, min: n, max: n };
  }

  const parts = s.split(/[-–—]/).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const a = parseEuroNumber(parts[0]);
    const b = parseEuroNumber(parts[1]);
    if (a != null && b != null) {
      return { label: s, min: Math.min(a, b), max: Math.max(a, b) };
    }
  }

  return { label: s, min: 0, max: 0 };
}

function clip(s, max) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function splitPolicyAreas(field) {
  if (!field || typeof field !== 'string') return [];
  return field
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitClients(orgMembers, interests) {
  const chunks = [];
  const raw = String(orgMembers ?? '').trim();
  const intText = String(interests ?? '').trim();

  const pieces = raw
    ? raw.split(/\n+|;\s+|(?<=\.)\s+(?=[A-Z])/g)
    : [];
  for (const line of pieces) {
    const t = line.trim();
    if (t.length >= 12 && t.length <= 220) chunks.push(clip(t, 220));
    if (chunks.length >= 12) break;
  }

  if (chunks.length < 2 && raw.length > 12) {
    chunks.push(clip(raw, 200));
  }
  if (intText.length >= 12 && intText.length <= 220 && chunks.length < 15) {
    chunks.push(clip(intText, 220));
  }

  return chunks.slice(0, 15);
}

function isoDateMaybe(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s || '—';
}

function financialYear(closedEnd, closedStart) {
  const d = isoDateMaybe(closedEnd);
  const y = d.match(/^(\d{4})/);
  if (y) return y[1];
  const d2 = isoDateMaybe(closedStart);
  const y2 = d2.match(/^(\d{4})/);
  return y2 ? y2[1] : '—';
}

function mapRow(row) {
  const policy_areas = splitPolicyAreas(row[H.fieldOfInterest]);
  const cost = parseCost(row[H.annualCost]);
  const goals = clip(row[H.goals], 420);
  const euLeg = clip(row[H.euLegislation], 480);
  const activities_summary = [goals, euLeg].filter(Boolean).join(' \n— \n');

  const fteRaw = row[H.membersFte];
  const fte = typeof fteRaw === 'number' ? fteRaw : parseFloat(String(fteRaw ?? '').replace(',', '.'));
  const membersN = typeof row[H.membersCount] === 'number' ? row[H.membersCount] : parseInt(String(row[H.membersCount] ?? ''), 10);
  const persons_involved = Number.isFinite(fte) && fte > 0
    ? Math.max(1, Math.round(fte))
    : Number.isFinite(membersN) && membersN > 0
      ? Math.min(membersN, 500)
      : undefined;

  const g1 = String(row[H.closedEuGrants] ?? '').trim();
  const g2 = String(row[H.currentEuTotal] ?? '').trim();
  const euGrant = [g1, g2].filter((x) => x && x !== '0').join('; ');
  const eu_funding_note = euGrant ? clip(euGrant, 240) : undefined;

  const clients_mentioned = splitClients(row[H.orgMembers], row[H.interestsRepresented]);
  const funding = clip(row[H.sourceFunding], 120);

  return {
    registration_id: String(row[H.id] ?? '').trim(),
    organisation_name: String(row[H.name] ?? '').trim(),
    category: String(row[H.category] ?? '').trim(),
    country: String(row[H.country] ?? '').trim(),
    website: String(row[H.website] ?? '').trim() || undefined,
    last_update: isoDateMaybe(row[H.closedEnd] || row[H.regDate]),
    policy_areas,
    activities_summary: activities_summary || '—',
    financial_year: financialYear(row[H.closedEnd], row[H.closedStart]),
    cost_label: cost.label,
    value_min_eur: cost.min,
    value_max_eur: cost.max,
    eu_funding_note: eu_funding_note || (funding ? `Funding: ${funding}` : undefined),
    persons_involved,
    clients_mentioned: clients_mentioned.length ? clients_mentioned : undefined,
  };
}

function main() {
  const xlsPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_XLS;
  if (!fs.existsSync(xlsPath)) {
    console.error('Missing file:', xlsPath);
    process.exit(1);
  }

  console.error('Reading', xlsPath, '…');
  const t0 = Date.now();
  const wb = XLSX.readFile(xlsPath, { cellDates: true, dense: true });
  const sn = wb.SheetNames[0];
  const ws = wb.Sheets[sn];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', blankrows: false });
  console.error(`Rows: ${rows.length} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  const out = [];
  for (const row of rows) {
    const rec = mapRow(row);
    if (!rec.registration_id || !rec.organisation_name) continue;
    out.push(rec);
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(out), 'utf8');
  const mb = (fs.statSync(OUT_JSON).size / (1024 * 1024)).toFixed(2);
  console.error(`Wrote ${out.length} records → ${OUT_JSON} (${mb} MiB)`);
}

main();
