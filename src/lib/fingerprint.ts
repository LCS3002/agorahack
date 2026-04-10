/**
 * ARGOS TERMINAL — Lobbyist Fingerprint Engine
 *
 * Measures linguistic influence: how much of a lobbyist's position paper
 * language has been absorbed into final bill text.
 *
 * Algorithms (composited into a final score):
 *   1. Trigram Jaccard Similarity     — n-gram overlap (lexical)
 *   2. Cosine Similarity (TF vectors) — term-frequency overlap (semantic-ish)
 *   3. Longest Common Subsequence     — structural phrasing similarity
 *
 * Usage:
 *   const result = computeFingerprint(billText, lobbyistPaper);
 *   result.score      // 0–1 composite influence score
 *   result.breakdown  // per-algorithm scores
 *   result.hotspots   // shared phrases (top 10)
 */

export interface FingerprintResult {
  /** Composite influence score, 0–1. Higher = more absorbed language. */
  score: number;
  /** Risk tier derived from score. */
  tier: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  breakdown: {
    trigram: number;
    cosine: number;
    lcs: number;
  };
  /** Top shared n-gram phrases between the two texts. */
  hotspots: string[];
  /** Metadata for display */
  meta: {
    billTokens: number;
    lobbyistTokens: number;
    sharedTrigrams: number;
    totalTrigrams: number;
  };
}

// ─── Tokenization ───────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function makeNgrams(tokens: string[], n: number): Map<string, number> {
  const ngrams = new Map<string, number>();
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).join(" ");
    ngrams.set(gram, (ngrams.get(gram) ?? 0) + 1);
  }
  return ngrams;
}

// ─── 1. Trigram Jaccard Similarity ──────────────────────────────────────────

function trigramJaccard(
  aTokens: string[],
  bTokens: string[]
): { score: number; sharedCount: number; totalCount: number; hotspots: string[] } {
  const aGrams = makeNgrams(aTokens, 3);
  const bGrams = makeNgrams(bTokens, 3);

  let intersection = 0;
  const shared: string[] = [];

  for (const [gram, count] of aGrams) {
    if (bGrams.has(gram)) {
      intersection += Math.min(count, bGrams.get(gram)!);
      shared.push(gram);
    }
  }

  const aTotal = [...aGrams.values()].reduce((a, b) => a + b, 0);
  const bTotal = [...bGrams.values()].reduce((a, b) => a + b, 0);
  const union = aTotal + bTotal - intersection;

  return {
    score: union === 0 ? 0 : intersection / union,
    sharedCount: intersection,
    totalCount: union,
    hotspots: shared.slice(0, 20),
  };
}

// ─── 2. Cosine Similarity (TF vectors) ──────────────────────────────────────

function cosineSimilarity(aTokens: string[], bTokens: string[]): number {
  const aFreq = makeNgrams(aTokens, 1);
  const bFreq = makeNgrams(bTokens, 1);

  const vocab = new Set([...aFreq.keys(), ...bFreq.keys()]);

  let dot = 0;
  let aMag = 0;
  let bMag = 0;

  for (const term of vocab) {
    const a = aFreq.get(term) ?? 0;
    const b = bFreq.get(term) ?? 0;
    dot += a * b;
    aMag += a * a;
    bMag += b * b;
  }

  const denom = Math.sqrt(aMag) * Math.sqrt(bMag);
  return denom === 0 ? 0 : dot / denom;
}

// ─── 3. Longest Common Subsequence (word-level, approximate) ────────────────

function lcsScore(aTokens: string[], bTokens: string[]): number {
  // For performance, cap at 500 tokens each (legislative texts can be huge)
  const a = aTokens.slice(0, 500);
  const b = bTokens.slice(0, 500);

  // DP table — single row rolling
  let prev = new Array(b.length + 1).fill(0);
  let curr = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1] + 1
          : Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  const lcsLength = prev[b.length];
  return lcsLength / Math.max(a.length, b.length, 1);
}

// ─── Composite scoring ───────────────────────────────────────────────────────

const WEIGHTS = { trigram: 0.45, cosine: 0.35, lcs: 0.2 };

function scoreTier(score: number): FingerprintResult["tier"] {
  if (score >= 0.65) return "CRITICAL";
  if (score >= 0.4) return "HIGH";
  if (score >= 0.2) return "MODERATE";
  return "LOW";
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute the Lobbyist Fingerprint between a bill and a position paper.
 *
 * @param billText         Full text of the legislative bill.
 * @param lobbyistPaper    Full text of the lobbyist's position paper.
 */
export function computeFingerprint(
  billText: string,
  lobbyistPaper: string
): FingerprintResult {
  const billTokens = tokenize(billText);
  const lobbyistTokens = tokenize(lobbyistPaper);

  const trigramResult = trigramJaccard(billTokens, lobbyistTokens);
  const cosineResult = cosineSimilarity(billTokens, lobbyistTokens);
  const lcsResult = lcsScore(billTokens, lobbyistTokens);

  const composite =
    WEIGHTS.trigram * trigramResult.score +
    WEIGHTS.cosine * cosineResult +
    WEIGHTS.lcs * lcsResult;

  // Hotspots: sort by length (longer shared phrases = more suspicious)
  const hotspots = trigramResult.hotspots
    .sort((a, b) => b.length - a.length)
    .slice(0, 10);

  return {
    score: Math.round(composite * 1000) / 1000,
    tier: scoreTier(composite),
    breakdown: {
      trigram: Math.round(trigramResult.score * 1000) / 1000,
      cosine: Math.round(cosineResult * 1000) / 1000,
      lcs: Math.round(lcsResult * 1000) / 1000,
    },
    hotspots,
    meta: {
      billTokens: billTokens.length,
      lobbyistTokens: lobbyistTokens.length,
      sharedTrigrams: trigramResult.sharedCount,
      totalTrigrams: trigramResult.totalCount,
    },
  };
}

// ─── Batch comparison ────────────────────────────────────────────────────────

export interface LobbyistEntry {
  id: string;
  name: string;
  paperText: string;
}

export interface BatchFingerprintResult extends FingerprintResult {
  lobbyistId: string;
  lobbyistName: string;
}

/**
 * Compare a bill against multiple lobbyist papers in one pass.
 * Returns results sorted by influence score descending.
 */
export function batchFingerprint(
  billText: string,
  lobbyists: LobbyistEntry[]
): BatchFingerprintResult[] {
  return lobbyists
    .map((l) => ({
      lobbyistId: l.id,
      lobbyistName: l.name,
      ...computeFingerprint(billText, l.paperText),
    }))
    .sort((a, b) => b.score - a.score);
}
