/** ISO 3166-1 alpha-3 → alpha-2 (EU + common EP states). Fallback: return input. */
const A3_TO_A2: Record<string, string> = {
  AUT: 'AT',
  BEL: 'BE',
  BGR: 'BG',
  HRV: 'HR',
  CYP: 'CY',
  CZE: 'CZ',
  DNK: 'DK',
  EST: 'EE',
  FIN: 'FI',
  FRA: 'FR',
  DEU: 'DE',
  GRC: 'GR',
  HUN: 'HU',
  IRL: 'IE',
  ITA: 'IT',
  LVA: 'LV',
  LTU: 'LT',
  LUX: 'LU',
  MLT: 'MT',
  NLD: 'NL',
  POL: 'PL',
  PRT: 'PT',
  ROU: 'RO',
  SVK: 'SK',
  SVN: 'SI',
  ESP: 'ES',
  SWE: 'SE',
  GBR: 'GB',
  NOR: 'NO',
  ISL: 'IS',
  LIE: 'LI',
  CHE: 'CH',
  UKR: 'UA',
  MDA: 'MD',
  SRB: 'RS',
  TUR: 'TR',
  ALB: 'AL',
  MKD: 'MK',
  MNE: 'ME',
  BIH: 'BA',
  GEO: 'GE',
  ARM: 'AM',
  AZE: 'AZ',
};

/**
 * UI-friendly country: English name + alpha-2 in parentheses (e.g. `Germany (DE)`).
 * Accepts alpha-3 (HowTheyVote) or alpha-2.
 */
export function formatCountryForUi(code: string | undefined | null): string {
  if (!code || typeof code !== 'string') return '';
  const c = code.trim().toUpperCase();
  const a2 = (c.length === 2 ? c : A3_TO_A2[c] ?? c) as string;
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'region' });
    const name = dn.of(a2);
    if (name && name !== a2) return `${name} (${a2})`;
    return a2;
  } catch {
    return a2;
  }
}

/** Compact: `DE` or `CZ` only */
export function formatCountryAlpha2(code: string | undefined | null): string {
  if (!code || typeof code !== 'string') return '';
  const c = code.trim().toUpperCase();
  if (c.length === 2) return c;
  return A3_TO_A2[c] ?? c;
}
