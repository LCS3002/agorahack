/**
 * Normalised row from an EU Transparency Register–style open snapshot.
 * Replace / extend `src/data/transparency-register-sample.json` with a full portal export when available.
 */
export interface TransparencyRegisterRecord {
  registration_id: string;
  organisation_name: string;
  category: string;
  country: string;
  website?: string;
  last_update: string;
  policy_areas: string[];
  activities_summary: string;
  financial_year: string;
  /** Human-readable band as published in register materials */
  cost_label: string;
  /** Declared annual cost range, EUR */
  value_min_eur: number;
  value_max_eur: number;
  eu_funding_note?: string;
  persons_involved?: number;
  clients_mentioned?: string[];
}

export interface ScoredRegisterOrg {
  record: TransparencyRegisterRecord;
  score: number;
  rationale: string;
}
