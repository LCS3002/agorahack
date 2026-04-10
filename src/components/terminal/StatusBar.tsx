"use client";

import React from "react";

interface StatusBarProps {
  time: string;
}

export function StatusBar({ time }: StatusBarProps) {
  return (
    <footer
      className="flex items-center justify-between px-3 shrink-0 text-[0.6rem] tabular-nums"
      style={{
        height: "var(--statusbar-h)",
        background: "var(--argos-void)",
        borderTop: "1px solid var(--argos-border)",
        color: "var(--argos-muted)",
      }}
    >
      <div className="flex items-center gap-4">
        <span style={{ color: "var(--argos-amber-dim)" }}>
          ARGOS TERMINAL v0.1.0-alpha
        </span>
        <span>|</span>
        <span>DATA: EUR-LEX SPARQL · EP OPEN DATA · EU TRANSPARENCY REGISTER</span>
        <span>|</span>
        <span>AI: MISTRAL LARGE [EU-WEST]</span>
      </div>
      <div className="flex items-center gap-4">
        <span>
          <span style={{ color: "var(--argos-amber-dim)" }}>SOVEREIGN</span>{" "}
          EU DATA RESIDENCY ACTIVE
        </span>
        <span>|</span>
        <span style={{ color: "var(--argos-amber-dim)" }}>BRUSSELS {time}</span>
      </div>
    </footer>
  );
}
