"use client";

import React, { useState, useTransition } from "react";
import { computeFingerprint, type FingerprintResult } from "@/lib/fingerprint";

const TIER_COLOR: Record<string, string> = {
  LOW: "var(--argos-muted)",
  MODERATE: "var(--argos-amber-dim)",
  HIGH: "var(--argos-amber)",
  CRITICAL: "var(--argos-red)",
};

const SAMPLE_BILL = `The regulation establishes a risk-based framework for artificial intelligence systems placed on the Union market. High-risk AI systems must undergo conformity assessment prior to market placement. Providers shall implement quality management systems and maintain technical documentation. The regulation ensures that AI systems are transparent, traceable, and subject to human oversight. Fundamental rights impact assessments shall be conducted for certain AI applications in the public sector.`;

const SAMPLE_LOBBY = `BusinessEurope strongly advocates for a risk-based and proportionate framework for artificial intelligence in the European market. The conformity assessment procedures must be streamlined to avoid excessive compliance burdens. Quality management and technical documentation requirements should be aligned with existing ISO standards. Human oversight provisions should allow for flexible implementation by market operators. We support transparency and traceability as key principles while emphasizing innovation-friendly regulation.`;

export function FingerprintPanel() {
  const [billText, setBillText] = useState(SAMPLE_BILL);
  const [lobbyText, setLobbyText] = useState(SAMPLE_LOBBY);
  const [result, setResult] = useState<FingerprintResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAnalysis = () => {
    startTransition(() => {
      const r = computeFingerprint(billText, lobbyText);
      setResult(r);
    });
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Inputs */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[0.6rem] tracking-widest mb-1" style={{ color: "var(--argos-muted)" }}>
            BILL TEXT
          </label>
          <textarea
            value={billText}
            onChange={(e) => setBillText(e.target.value)}
            rows={4}
            className="w-full text-[0.6rem] p-2 resize-none outline-none"
            style={{
              background: "var(--argos-surface)",
              border: "1px solid var(--argos-border)",
              color: "var(--argos-amber-dim)",
              fontFamily: "var(--font-terminal)",
            }}
          />
        </div>
        <div>
          <label className="block text-[0.6rem] tracking-widest mb-1" style={{ color: "var(--argos-muted)" }}>
            LOBBYIST POSITION PAPER
          </label>
          <textarea
            value={lobbyText}
            onChange={(e) => setLobbyText(e.target.value)}
            rows={4}
            className="w-full text-[0.6rem] p-2 resize-none outline-none"
            style={{
              background: "var(--argos-surface)",
              border: "1px solid var(--argos-border)",
              color: "var(--argos-amber-dim)",
              fontFamily: "var(--font-terminal)",
            }}
          />
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={runAnalysis}
        disabled={isPending}
        className="self-start px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition-all glow-amber"
        style={{
          background: isPending ? "var(--argos-ghost)" : "var(--argos-amber-glow)",
          border: "1px solid var(--argos-amber)",
          color: "var(--argos-amber)",
          fontFamily: "var(--font-terminal)",
          cursor: isPending ? "wait" : "pointer",
        }}
      >
        {isPending ? "ANALYZING..." : "▶ RUN FINGERPRINT"}
      </button>

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-2">
          {/* Score header */}
          <div
            className="flex items-center justify-between p-2"
            style={{ background: "var(--argos-surface)", border: "1px solid var(--argos-border)" }}
          >
            <div>
              <div className="text-[0.55rem] tracking-widest" style={{ color: "var(--argos-muted)" }}>
                INFLUENCE SCORE
              </div>
              <div
                className="text-2xl font-black tabular-nums"
                style={{ color: TIER_COLOR[result.tier] }}
              >
                {(result.score * 100).toFixed(1)}%
              </div>
            </div>
            <span
              className="tag text-xs font-black tracking-widest"
              style={{ color: TIER_COLOR[result.tier], borderColor: TIER_COLOR[result.tier] }}
            >
              {result.tier}
            </span>
          </div>

          {/* Breakdown */}
          <div
            className="grid grid-cols-3 gap-px"
            style={{ background: "var(--argos-border)", border: "1px solid var(--argos-border)" }}
          >
            {[
              { label: "TRIGRAM", value: result.breakdown.trigram, weight: "45%" },
              { label: "COSINE", value: result.breakdown.cosine, weight: "35%" },
              { label: "LCS", value: result.breakdown.lcs, weight: "20%" },
            ].map((m) => (
              <div key={m.label} className="p-2" style={{ background: "var(--argos-surface)" }}>
                <div className="text-[0.5rem] tracking-widest" style={{ color: "var(--argos-muted)" }}>
                  {m.label} · w={m.weight}
                </div>
                <div className="text-sm font-bold tabular-nums" style={{ color: "var(--argos-amber)" }}>
                  {(m.value * 100).toFixed(1)}%
                </div>
                {/* Mini bar */}
                <div className="mt-1 h-0.5 w-full" style={{ background: "var(--argos-border)" }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${m.value * 100}%`,
                      background: "var(--argos-amber)",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Hotspots */}
          {result.hotspots.length > 0 && (
            <div>
              <div className="text-[0.55rem] tracking-widest mb-1" style={{ color: "var(--argos-muted)" }}>
                SHARED PHRASES (HOTSPOTS)
              </div>
              <div className="flex flex-wrap gap-1">
                {result.hotspots.map((phrase) => (
                  <span
                    key={phrase}
                    className="text-[0.55rem] px-1.5 py-0.5"
                    style={{
                      background: "var(--argos-red-glow)",
                      border: "1px solid var(--argos-red-dim)",
                      color: "var(--argos-red)",
                    }}
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="text-[0.55rem] tabular-nums" style={{ color: "var(--argos-muted)" }}>
            {result.meta.billTokens} bill tokens · {result.meta.lobbyistTokens} lobbyist tokens ·{" "}
            {result.meta.sharedTrigrams} shared trigrams / {result.meta.totalTrigrams} total
          </div>
        </div>
      )}
    </div>
  );
}
