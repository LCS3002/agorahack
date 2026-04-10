"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PaneProps {
  id: string;
  title: string;
  badge?: string;
  badgeColor?: "amber" | "red" | "green";
  children: React.ReactNode;
  className?: string;
}

export function Pane({
  id,
  title,
  badge,
  badgeColor = "amber",
  children,
  className,
}: PaneProps) {
  const badgeColorMap = {
    amber: "var(--argos-amber)",
    red: "var(--argos-red)",
    green: "var(--argos-green)",
  };

  return (
    <section
      data-pane={id}
      className={cn("flex flex-col overflow-hidden", className)}
      style={{ background: "var(--argos-panel)" }}
    >
      {/* Pane title bar */}
      <div
        className="flex items-center justify-between px-2.5 shrink-0"
        style={{
          height: "1.75rem",
          background: "var(--argos-surface)",
          borderBottom: "1px solid var(--argos-border)",
        }}
      >
        <span
          className="text-[0.65rem] font-bold tracking-widest uppercase"
          style={{ color: "var(--argos-amber)" }}
        >
          {title}
        </span>
        {badge && (
          <span
            className="tag text-[0.55rem]"
            style={{ color: badgeColorMap[badgeColor], borderColor: badgeColorMap[badgeColor] }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Pane content */}
      <div className="flex-1 overflow-auto p-2.5">{children}</div>
    </section>
  );
}

interface PaneGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 4-pane bento grid.
 *
 *   ┌──────────────┬──────────────┐
 *   │   PANE A     │   PANE B     │
 *   │  (primary)   │  (secondary) │
 *   ├──────────────┼──────────────┤
 *   │   PANE C     │   PANE D     │
 *   │  (data feed) │  (analysis)  │
 *   └──────────────┴──────────────┘
 *
 * Pass exactly 4 <Pane> children.
 */
export function PaneGrid({ children, className }: PaneGridProps) {
  return (
    <div
      className={cn("grid h-full", className)}
      style={{
        gridTemplateColumns: "3fr 2fr",
        gridTemplateRows: "1fr 1fr",
        gap: "var(--panel-gap)",
        background: "var(--argos-border-dim)",
      }}
    >
      {children}
    </div>
  );
}
