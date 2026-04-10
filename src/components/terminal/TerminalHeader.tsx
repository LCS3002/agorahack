"use client";

import React from "react";

const NAV_ITEMS = [
  { key: "F1", label: "OVERVIEW" },
  { key: "F2", label: "BILLS" },
  { key: "F3", label: "LOBBYISTS" },
  { key: "F4", label: "FINGERPRINT" },
  { key: "F5", label: "NETWORK" },
  { key: "F6", label: "ALERTS" },
];

interface TerminalHeaderProps {
  time: string;
}

export function TerminalHeader({ time }: TerminalHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-3 shrink-0"
      style={{
        height: "var(--header-h)",
        background: "var(--argos-void)",
        borderBottom: "1px solid var(--argos-amber-dim)",
      }}
    >
      {/* ── Left: wordmark ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Logo mark */}
        <div
          className="flex items-center justify-center w-7 h-7 shrink-0"
          style={{ border: "1px solid var(--argos-amber)", background: "var(--argos-amber-glow)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5" stroke="#FF8C00" strokeWidth="1.5" />
            <circle cx="7" cy="7" r="2" fill="#FF8C00" />
            <line x1="7" y1="1" x2="7" y2="0" stroke="#FF8C00" strokeWidth="1.5" />
            <line x1="7" y1="14" x2="7" y2="13" stroke="#FF8C00" strokeWidth="1.5" />
            <line x1="1" y1="7" x2="0" y2="7" stroke="#FF8C00" strokeWidth="1.5" />
            <line x1="14" y1="7" x2="13" y2="7" stroke="#FF8C00" strokeWidth="1.5" />
          </svg>
        </div>
        <div>
          <span
            className="font-black tracking-widest text-sm"
            style={{ color: "var(--argos-amber)", letterSpacing: "0.2em" }}
          >
            ARGOS
          </span>
          <span
            className="ml-2 tracking-widest text-xs"
            style={{ color: "var(--argos-amber-dim)" }}
          >
            TERMINAL
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: "var(--argos-border)" }} />

        {/* Nav items */}
        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className="flex items-center gap-1 px-2 h-7 text-xs transition-colors glow-amber"
              style={{ color: "var(--argos-amber-dim)", border: "1px solid transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--argos-amber)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--argos-border)";
                (e.currentTarget as HTMLButtonElement).style.background = "var(--argos-ghost)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--argos-amber-dim)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <span
                className="text-[0.55rem] font-bold"
                style={{ color: "var(--argos-red)" }}
              >
                {item.key}
              </span>
              <span className="tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Right: system indicators ────────────────────────────────────────── */}
      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--argos-amber-dim)" }}>
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "var(--argos-green)" }}
          />
          <span style={{ color: "var(--argos-green)" }}>LIVE</span>
        </div>
        <div className="flex items-center gap-1">
          <span>EUR-LEX</span>
          <span
            className="tag"
            style={{ color: "var(--argos-amber)", borderColor: "var(--argos-amber-dim)" }}
          >
            CONNECTED
          </span>
        </div>
        <div className="tabular-nums" style={{ color: "var(--argos-amber)", fontWeight: 600 }}>
          {time} CET
        </div>
      </div>
    </header>
  );
}
