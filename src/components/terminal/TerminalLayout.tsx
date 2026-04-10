"use client";

import React, { useState, useEffect } from "react";
import { TerminalHeader } from "./TerminalHeader";
import { CommandBar } from "./CommandBar";
import { StatusBar } from "./StatusBar";

interface TerminalLayoutProps {
  children: React.ReactNode;
}

/**
 * ARGOS TERMINAL — Bloomberg-style shell.
 *
 * Vertical stack:
 *   ┌─────────────────────────────────┐  ← TerminalHeader  (44px)
 *   ├─────────────────────────────────┤  ← CommandBar      (36px)
 *   │                                 │
 *   │        4-pane grid area         │  ← flex-1 overflow
 *   │                                 │
 *   └─────────────────────────────────┘  ← StatusBar       (24px)
 */
export function TerminalLayout({ children }: TerminalLayoutProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Europe/Brussels",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex flex-col w-screen h-screen overflow-hidden"
      style={{ background: "var(--argos-black)" }}
    >
      <TerminalHeader time={time} />
      <CommandBar />

      {/* ── Main content area ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {children}
      </main>

      <StatusBar time={time} />
    </div>
  );
}
