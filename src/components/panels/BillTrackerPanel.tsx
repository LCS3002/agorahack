"use client";

import React from "react";

const MOCK_BILLS = [
  {
    id: "2024/0138(COD)",
    title: "AI Liability Directive",
    stage: "COMMITTEE",
    risk: "HIGH",
    lobbyists: 14,
    lastActivity: "2h ago",
  },
  {
    id: "2023/0428(COD)",
    title: "European Media Freedom Act",
    stage: "PLENARY",
    risk: "CRITICAL",
    lobbyists: 31,
    lastActivity: "4h ago",
  },
  {
    id: "2022/0394(COD)",
    title: "Data Act",
    stage: "ENACTED",
    risk: "MODERATE",
    lobbyists: 22,
    lastActivity: "1d ago",
  },
  {
    id: "2024/0257(COD)",
    title: "Critical Raw Materials Act II",
    stage: "COMMITTEE",
    risk: "HIGH",
    lobbyists: 8,
    lastActivity: "6h ago",
  },
  {
    id: "2023/0115(COD)",
    title: "Platform Workers Directive",
    stage: "TRILOGUES",
    risk: "MODERATE",
    lobbyists: 17,
    lastActivity: "12h ago",
  },
];

const RISK_COLOR: Record<string, string> = {
  LOW: "var(--argos-muted)",
  MODERATE: "var(--argos-amber-dim)",
  HIGH: "var(--argos-amber)",
  CRITICAL: "var(--argos-red)",
};

export function BillTrackerPanel() {
  return (
    <div className="flex flex-col gap-0.5">
      {/* Column headers */}
      <div
        className="grid text-[0.6rem] tracking-widest pb-1 mb-1"
        style={{
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          color: "var(--argos-muted)",
          borderBottom: "1px solid var(--argos-border)",
        }}
      >
        <span>BILL</span>
        <span>STAGE</span>
        <span>RISK</span>
        <span>ENTITIES</span>
        <span>UPDATED</span>
      </div>

      {MOCK_BILLS.map((bill) => (
        <div
          key={bill.id}
          className="grid items-center py-1.5 px-0 cursor-pointer transition-colors"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            borderBottom: "1px solid var(--argos-border-dim)",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLDivElement).style.background = "var(--argos-ghost)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLDivElement).style.background = "transparent")
          }
        >
          <div>
            <div
              className="text-[0.65rem] font-semibold"
              style={{ color: "var(--argos-amber)" }}
            >
              {bill.title}
            </div>
            <div className="text-[0.55rem]" style={{ color: "var(--argos-muted)" }}>
              {bill.id}
            </div>
          </div>
          <span
            className="text-[0.6rem] tracking-wider"
            style={{ color: "var(--argos-amber-dim)" }}
          >
            {bill.stage}
          </span>
          <span
            className="text-[0.6rem] font-bold tracking-wider"
            style={{ color: RISK_COLOR[bill.risk] }}
          >
            {bill.risk}
          </span>
          <span className="text-[0.65rem]" style={{ color: "var(--argos-amber)" }}>
            {bill.lobbyists}
          </span>
          <span className="text-[0.6rem]" style={{ color: "var(--argos-muted)" }}>
            {bill.lastActivity}
          </span>
        </div>
      ))}
    </div>
  );
}
