"use client";

import React, { useState, useRef, useEffect } from "react";

const COMMAND_SUGGESTIONS = [
  "SEARCH bill:\"AI Act\" lobbyist:*",
  "FINGERPRINT --bill=2024/0138 --entity=BusinessEurope",
  "NETWORK --entity=MicrosoftEU --depth=2",
  "ALERT --keyword=\"digital markets\" --threshold=0.85",
  "EXPORT --format=json --query=last_30d",
];

export function CommandBar() {
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      setHistory((h) => [value, ...h.slice(0, 49)]);
      setHistoryIdx(-1);
      // TODO: dispatch command to router
      console.log("[ARGOS CMD]", value);
      setValue("");
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(next);
      setValue(history[next] ?? "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setValue(next === -1 ? "" : history[next]);
    }
    if (e.key === "Escape") {
      setValue("");
      setHistoryIdx(-1);
      inputRef.current?.blur();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const suggestion = COMMAND_SUGGESTIONS.find((s) =>
        s.toLowerCase().startsWith(value.toLowerCase())
      );
      if (suggestion) setValue(suggestion);
    }
  };

  // Global shortcut: "/" focuses the command bar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="flex items-center gap-2 px-3 shrink-0"
      style={{
        height: "var(--cmdbar-h)",
        background: "var(--argos-panel)",
        borderBottom: "1px solid var(--argos-border)",
      }}
    >
      {/* Prompt sigil */}
      <span
        className="text-xs font-bold shrink-0 select-none"
        style={{ color: focused ? "var(--argos-amber)" : "var(--argos-amber-dim)" }}
      >
        ARGOS▶
      </span>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder='Type a command or press "/" to focus — Tab to autocomplete'
        spellCheck={false}
        autoComplete="off"
        className="flex-1 bg-transparent outline-none text-xs placeholder-shown:text-[var(--argos-muted)]"
        style={{
          color: "var(--argos-amber)",
          caretColor: "var(--argos-amber)",
          fontFamily: "var(--font-terminal)",
        }}
      />

      {/* Hints */}
      <div
        className="flex items-center gap-3 text-[0.6rem] shrink-0"
        style={{ color: "var(--argos-muted)" }}
      >
        {[
          ["↑↓", "HISTORY"],
          ["TAB", "COMPLETE"],
          ["ESC", "CLEAR"],
        ].map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <kbd
              className="px-1"
              style={{ border: "1px solid var(--argos-border)", color: "var(--argos-amber-dim)" }}
            >
              {k}
            </kbd>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
