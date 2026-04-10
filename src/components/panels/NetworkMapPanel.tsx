"use client";

import React from "react";

const MOCK_NODES = [
  { id: "BusinessEurope", type: "FEDERATION", connections: 47, influence: 0.82 },
  { id: "DigitalEurope", type: "FEDERATION", connections: 31, influence: 0.71 },
  { id: "Google EMEA", type: "CORPORATE", connections: 28, influence: 0.68 },
  { id: "Microsoft EU", type: "CORPORATE", connections: 24, influence: 0.64 },
  { id: "ETUC", type: "UNION", connections: 19, influence: 0.51 },
  { id: "Pepsico EU Affairs", type: "CORPORATE", connections: 11, influence: 0.29 },
];

const TYPE_COLOR: Record<string, string> = {
  FEDERATION: "var(--argos-amber)",
  CORPORATE: "var(--argos-red)",
  UNION: "var(--argos-green)",
  NGO: "var(--argos-amber-dim)",
};

export function NetworkMapPanel() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.6rem]" style={{ color: "var(--argos-muted)" }}>
        TOP INFLUENCE ENTITIES — ranked by legislative contact frequency
      </p>

      <div className="flex flex-col gap-0.5">
        {MOCK_NODES.map((node, i) => (
          <div
            key={node.id}
            className="flex items-center gap-2 py-1.5"
            style={{ borderBottom: "1px solid var(--argos-border-dim)" }}
          >
            {/* Rank */}
            <span
              className="text-[0.6rem] tabular-nums w-4 shrink-0 text-right"
              style={{ color: "var(--argos-muted)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            {/* Name + type */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[0.65rem] font-semibold truncate"
                  style={{ color: TYPE_COLOR[node.type] }}
                >
                  {node.id}
                </span>
                <span
                  className="tag text-[0.5rem] shrink-0"
                  style={{ color: TYPE_COLOR[node.type], borderColor: TYPE_COLOR[node.type] }}
                >
                  {node.type}
                </span>
              </div>

              {/* Influence bar */}
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 h-0.5" style={{ background: "var(--argos-border)" }}>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${node.influence * 100}%`,
                      background: TYPE_COLOR[node.type],
                    }}
                  />
                </div>
                <span
                  className="text-[0.55rem] tabular-nums shrink-0"
                  style={{ color: "var(--argos-muted)" }}
                >
                  {(node.influence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Connections */}
            <div className="text-right shrink-0">
              <div
                className="text-sm font-bold tabular-nums"
                style={{ color: TYPE_COLOR[node.type] }}
              >
                {node.connections}
              </div>
              <div className="text-[0.5rem]" style={{ color: "var(--argos-muted)" }}>
                CONTACTS
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[0.55rem] mt-1" style={{ color: "var(--argos-muted)" }}>
        SOURCE: EU TRANSPARENCY REGISTER · UPDATED DAILY · FULL NETWORK GRAPH IN /NETWORK
      </p>
    </div>
  );
}
