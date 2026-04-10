'use client';

import { useRef, useEffect, FormEvent } from 'react';
import type { HistoryItem, ModuleType } from '@/lib/types';

interface ChatPanelProps {
  summary: string;
  isLoading: boolean;
  history: HistoryItem[];
  activeModules: ModuleType[];
  onSubmit: (query: string) => void;
  onDemoQuery: (query: string) => void;
  hasQuery: boolean;
}

const DEMO_QUERIES = [
  'Who lobbied against the Nature Restoration Law?',
  'How did MEPs vote on the AI Act?',
  'Is there a conflict of interest around von der Leyen and pharma?',
  'Show me everything on farm subsidies',
];

const MODULE_COLORS: Record<ModuleType, string> = {
  VOTING:   'rgba(26,26,24,0.6)',
  LOBBYING: '#C9A89A',
  NEWS:     '#8A8882',
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({
  summary,
  isLoading,
  history,
  activeModules: _activeModules,
  onSubmit,
  onDemoQuery,
  hasQuery,
}: ChatPanelProps) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.scrollTop = summaryRef.current.scrollHeight;
    }
  }, [summary]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (!val || isLoading) return;
    onSubmit(val);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderRight: '1px solid rgba(26,26,24,0.12)',
      overflow: 'hidden',
    }}>
      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 0' }}>

        {/* Empty state */}
        {!hasQuery && !isLoading && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(26,26,24,0.35)',
                marginBottom: '16px',
              }}>
                Suggested Queries
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {DEMO_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => onDemoQuery(q)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(26,26,24,0.12)',
                      padding: '10px 14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 300,
                      color: 'rgba(26,26,24,0.7)',
                      lineHeight: 1.4,
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s ease, color 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(26,26,24,0.35)';
                      (e.currentTarget as HTMLButtonElement).style.color = '#1A1A18';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(26,26,24,0.12)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(26,26,24,0.7)';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History items */}
        {history.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            {history.slice().reverse().map((item) => (
              <div
                key={item.id}
                style={{
                  borderBottom: '1px solid rgba(26,26,24,0.07)',
                  padding: '16px 0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'rgba(26,26,24,0.75)',
                    letterSpacing: '0.02em',
                  }}>
                    {item.query}
                  </span>
                  <span style={{ fontSize: '9px', color: 'rgba(26,26,24,0.3)', flexShrink: 0, marginLeft: '8px' }}>
                    {formatTime(item.timestamp)}
                  </span>
                </div>
                {/* Module tags */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  {item.modules.map(m => (
                    <span key={m} style={{
                      fontSize: '8px',
                      fontWeight: 500,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: MODULE_COLORS[m],
                      border: '1px solid',
                      borderColor: MODULE_COLORS[m],
                      padding: '1px 5px',
                      opacity: 0.7,
                    }}>
                      {m}
                    </span>
                  ))}
                </div>
                <p style={{
                  fontSize: '11px',
                  fontWeight: 300,
                  color: 'rgba(26,26,24,0.5)',
                  lineHeight: 1.65,
                  fontStyle: 'italic',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {item.summary}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Active summary */}
        {(isLoading || summary) && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              fontSize: '9px',
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(26,26,24,0.4)',
              marginBottom: '14px',
            }}>
              Intelligence Summary
            </div>

            {isLoading && !summary && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '8px 0' }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: '3px',
                      height: '3px',
                      borderRadius: '50%',
                      background: 'rgba(26,26,24,0.4)',
                      animation: 'pulse 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
                <style>{`
                  @keyframes pulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1); }
                  }
                `}</style>
              </div>
            )}

            {summary && (
              <div
                ref={summaryRef}
                style={{
                  fontSize: '13px',
                  fontWeight: 300,
                  lineHeight: 1.85,
                  color: '#1A1A18',
                  letterSpacing: '0.01em',
                }}
              >
                {summary}
                {isLoading && (
                  <span style={{
                    display: 'inline-block',
                    width: '1px',
                    height: '14px',
                    background: '#1A1A18',
                    marginLeft: '2px',
                    verticalAlign: 'middle',
                    animation: 'blink 1s step-end infinite',
                  }} />
                )}
                <style>{`@keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }`}</style>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input — pinned to bottom */}
      <div style={{ padding: '16px 24px 20px', borderTop: '1px solid rgba(26,26,24,0.07)', flexShrink: 0 }}>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="input-underline"
            placeholder="Ask about EU politics…"
            disabled={isLoading}
            autoFocus
            autoComplete="off"
          />
        </form>
        {isLoading && (
          <div style={{ marginTop: '6px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)' }}>
            Querying modules…
          </div>
        )}
      </div>
    </div>
  );
}
