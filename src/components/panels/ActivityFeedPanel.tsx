"use client";

import React from "react";

const MOCK_FEED = [
  {
    ts: "09:41:02",
    type: "MEETING",
    actor: "BusinessEurope",
    action: "Meeting with rapporteur on AI Liability",
    severity: "high",
  },
  {
    ts: "09:38:55",
    type: "DOCUMENT",
    actor: "DigitalEurope",
    action: "Position paper updated — Data Act amendments",
    severity: "moderate",
  },
  {
    ts: "09:22:11",
    type: "AMENDMENT",
    actor: "EP Committee JURI",
    action: "15 amendments filed — Platform Workers Directive",
    severity: "critical",
  },
  {
    ts: "08:57:33",
    type: "REGISTER",
    actor: "Google EMEA",
    action: "Transparency Register updated — new EU contact",
    severity: "low",
  },
  {
    ts: "08:44:09",
    type: "MEETING",
    actor: "ETUC",
    action: "Meeting with DG EMPL officials",
    severity: "moderate",
  },
  {
    ts: "08:30:00",
    type: "ALERT",
    actor: "ARGOS",
    action: "FINGERPRINT MATCH >0.72 — AI Act & MicrosoftEU paper",
    severity: "critical",
  },
];

const TYPE_COLOR: Record<string, string> = {
  MEETING: "var(--argos-amber)",
  DOCUMENT: "var(--argos-amber-dim)",
  AMENDMENT: "var(--argos-red)",
  REGISTER: "var(--argos-muted)",
  ALERT: "var(--argos-red)",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "var(--argos-red)",
  high: "var(--argos-amber)",
  moderate: "var(--argos-amber-dim)",
  low: "var(--argos-muted)",
};

export function ActivityFeedPanel() {
  return (
    <div className="flex flex-col gap-0.5">
      {MOCK_FEED.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-2 py-1.5"
          style={{ borderBottom: "1px solid var(--argos-border-dim)" }}
        >
          {/* Severity dot */}
          <div
            className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
            style={{ background: SEVERITY_DOT[item.severity] }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="tag text-[0.5rem] shrink-0"
                style={{ color: TYPE_COLOR[item.type], borderColor: TYPE_COLOR[item.type] }}
              >
                {item.type}
              </span>
              <span
                className="text-[0.65rem] font-semibold truncate"
                style={{ color: "var(--argos-amber)" }}
              >
                {item.actor}
              </span>
            </div>
            <p className="text-[0.6rem] mt-0.5 leading-relaxed" style={{ color: "var(--argos-amber-dim)" }}>
              {item.action}
            </p>
          </div>

          <span
            className="text-[0.55rem] tabular-nums shrink-0"
            style={{ color: "var(--argos-muted)" }}
          >
            {item.ts}
          </span>
        </div>
      ))}
    </div>
  );
}
