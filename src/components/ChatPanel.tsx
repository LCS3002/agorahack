'use client';

import { useRef, useEffect, useState, FormEvent } from 'react';
import Markdown, { type Components } from 'react-markdown';
import type { HistoryItem, ModuleType, SummarySourceLink, ToolStatusItem } from '@/lib/types';

/** Inline markdown for AI summary body; citations handled separately as [n] tokens. */
const SUMMARY_MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => (
    <p style={{
      margin: '0 0 0.6em 0',
      fontSize: 'inherit',
      fontWeight: 300,
      lineHeight: 1.85,
      color: 'inherit',
      letterSpacing: '0.01em',
    }}>
      {children}
    </p>
  ),
  strong: ({ children }) => <strong style={{ fontWeight: 600, color: '#1A1A18' }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  ul: ({ children }) => <ul style={{ margin: '0 0 0.6em 0', paddingLeft: '1.25em' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '0 0 0.6em 0', paddingLeft: '1.25em' }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: '0.35em' }}>{children}</li>,
  h1: ({ children }) => (
    <h1 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 0.45em 0', letterSpacing: '0.02em', color: '#1A1A18' }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: '14px', fontWeight: 600, margin: '0.65em 0 0.35em 0', letterSpacing: '0.02em', color: '#1A1A18' }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0.55em 0 0.3em 0', color: 'rgba(26,26,24,0.9)' }}>{children}</h3>
  ),
  code: ({ children }) => (
    <code style={{
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '0.92em',
      background: 'rgba(26,26,24,0.06)',
      padding: '0.12em 0.35em',
      borderRadius: 2,
    }}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre style={{
      margin: '0 0 0.6em 0',
      padding: '10px 12px',
      background: 'rgba(26,26,24,0.05)',
      overflow: 'auto',
      fontSize: '12px',
      lineHeight: 1.5,
    }}>
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      margin: '0 0 0.6em 0',
      paddingLeft: '12px',
      borderLeft: '2px solid rgba(201,168,154,0.5)',
      color: 'rgba(26,26,24,0.68)',
    }}>
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: '#C9A89A',
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
        textDecorationColor: 'rgba(201,168,154,0.45)',
      }}
    >
      {children}
    </a>
  ),
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(26,26,24,0.1)', margin: '0.85em 0' }} />,
};

const TOOL_LABELS: Record<string, string> = {
  fetch_voting_data: 'Voting records',
  fetch_news_data: 'News & sentiment',
  get_entity_background: 'Background',
};

interface ChatPanelProps {
  summary: string;
  isLoading: boolean;
  history: HistoryItem[];
  activeModules: ModuleType[];
  /** From merged module data — enables clickable [n] and Sources list */
  summarySources?: SummarySourceLink[];
  /** Live agent tool progress — shown while query is in-flight */
  toolStatus?: ToolStatusItem[];
  onSubmit: (query: string) => void;
  onDemoQuery: (query: string) => void;
  hasQuery: boolean;
  onHistoryRestore: (item: HistoryItem) => void;
  onClearHistory?: () => void;
}

const DEMO_QUERIES = [
  'Who lobbied against the Nature Restoration Law?',
  'How did MEPs vote on the AI Act?',
  'Is there a conflict of interest around von der Leyen and pharma?',
  'Tell me about MEP Axel Voss',
  'Show me everything on farm subsidies',
];

// ── Citation renderer ─────────────────────────────────────────────────────────
function SummaryWithCitations({
  text,
  isStreaming,
  linkedSources,
}: {
  text: string;
  isStreaming: boolean;
  linkedSources?: SummarySourceLink[];
}) {
  const sourcesIdx = text.indexOf('\nSOURCES\n');
  const body    = sourcesIdx !== -1 ? text.slice(0, sourcesIdx) : text;
  const sources = sourcesIdx !== -1 ? text.slice(sourcesIdx + 9) : '';

  const numToUrl = new Map<number, string>();
  for (const s of linkedSources ?? []) numToUrl.set(s.num, s.url);

  function renderBody(t: string) {
    const parts = t.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const cm = part.match(/^\[(\d+)\]$/);
      if (cm) {
        const num = parseInt(cm[1], 10);
        const url = numToUrl.get(num);
        const sup = (
          <sup
            style={{
              fontSize: '7.5px',
              color: '#C9A89A',
              marginLeft: '1px',
              fontWeight: 500,
              verticalAlign: 'super',
              lineHeight: 1,
              textDecoration: url ? 'underline' : 'none',
              textUnderlineOffset: '2px',
            }}
          >
            {part}
          </sup>
        );
        if (url) {
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open source"
              style={{ textDecoration: 'none' }}
            >
              {sup}
            </a>
          );
        }
        return <span key={i}>{sup}</span>;
      }
      if (part.trim() === '') return null;
      return (
        <Markdown key={i} components={SUMMARY_MARKDOWN_COMPONENTS} skipHtml>
          {part}
        </Markdown>
      );
    });
  }

  const sourceLines = sources
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^\[\d+\]/.test(l));

  const showStructured = (linkedSources?.length ?? 0) > 0;

  return (
    <>
      <div style={{ fontSize: '13px', fontWeight: 300, lineHeight: 1.85, color: '#1A1A18', letterSpacing: '0.01em' }}>
        {renderBody(body)}
        {isStreaming && (
          <span style={{ display: 'inline-block', width: '1px', height: '14px', background: '#1A1A18', marginLeft: '2px', verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
        )}
        <style>{`@keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }`}</style>
      </div>

      {showStructured && (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(26,26,24,0.08)' }}>
          <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '8px' }}>
            Sources
          </div>
          {linkedSources!.map(s => (
            <div key={s.num} style={{ display: 'flex', gap: '7px', marginBottom: '5px', alignItems: 'flex-start' }}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  gap: '7px',
                  alignItems: 'flex-start',
                  textDecoration: 'none',
                  color: 'inherit',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: '7.5px', color: '#C9A89A', fontWeight: 500, flexShrink: 0, lineHeight: 1.6 }}>[{s.num}]</span>
                <span style={{ fontSize: '9.5px', fontWeight: 300, color: 'rgba(26,26,24,0.55)', lineHeight: 1.6, textDecoration: 'underline', textDecorationColor: 'rgba(201,168,154,0.45)', textUnderlineOffset: '2px' }}>
                  {s.label}
                </span>
              </a>
            </div>
          ))}
        </div>
      )}

      {!showStructured && sourceLines.length > 0 && (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(26,26,24,0.08)' }}>
          <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '8px' }}>
            Sources
          </div>
          {sourceLines.map((line, i) => {
            const match = line.match(/^\[(\d+)\]\s*(.*)/);
            if (!match) return null;
            const [, num, cite] = match;
            return (
              <div key={i} style={{ display: 'flex', gap: '7px', marginBottom: '5px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '7.5px', color: '#C9A89A', fontWeight: 500, flexShrink: 0, lineHeight: 1.6 }}>[{num}]</span>
                <span style={{ fontSize: '9.5px', fontWeight: 300, color: 'rgba(26,26,24,0.5)', lineHeight: 1.6 }}>{cite}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

const MODULE_COLORS: Record<ModuleType, string> = {
  VOTING:   'rgba(26,26,24,0.6)',
  LOBBYING: '#C9A89A',
  NEWS:     '#8A8882',
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function groupHistoryByDate(items: HistoryItem[]): { label: string; items: HistoryItem[] }[] {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86_400_000).toDateString();

  const groups = new Map<string, HistoryItem[]>();
  for (const item of items) {
    const d = new Date(item.timestamp);
    const ds = d.toDateString();
    const label =
      ds === todayStr ? 'Today' :
      ds === yesterdayStr ? 'Yesterday' :
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export function ChatPanel({
  summary,
  isLoading,
  history,
  summarySources,
  toolStatus = [],
  onSubmit,
  onDemoQuery,
  hasQuery,
  onHistoryRestore,
  onClearHistory,
}: ChatPanelProps) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'CHAT' | 'HISTORY'>('CHAT');
  const [clearHistoryConfirmOpen, setClearHistoryConfirmOpen] = useState(false);

  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.scrollTop = summaryRef.current.scrollHeight;
    }
  }, [summary]);

  useEffect(() => {
    if (!clearHistoryConfirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setClearHistoryConfirmOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearHistoryConfirmOpen]);

  useEffect(() => {
    if (activeTab !== 'HISTORY') setClearHistoryConfirmOpen(false);
  }, [activeTab]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (!val || isLoading) return;
    onSubmit(val);
    if (inputRef.current) inputRef.current.value = '';
  }

  // History items shown in the inline CHAT view (all except the active one)
  const chatHistory = history.slice(1).reverse();
  // All items for HISTORY tab (newest first)
  const allHistory = [...history];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderRight: '1px solid rgba(26,26,24,0.12)',
      overflow: 'hidden',
    }}>
      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(26,26,24,0.09)',
        flexShrink: 0,
      }}>
        {(['CHAT', 'HISTORY'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: `1.5px solid ${activeTab === tab ? 'rgba(26,26,24,0.55)' : 'transparent'}`,
              marginBottom: '-1px',
              cursor: 'pointer',
              fontSize: '8.5px',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase' as const,
              color: activeTab === tab ? 'rgba(26,26,24,0.72)' : 'rgba(26,26,24,0.28)',
              fontFamily: 'inherit',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab}{tab === 'HISTORY' && history.length > 0 ? ` (${history.length})` : ''}
          </button>
        ))}
      </div>

      {/* ── HISTORY tab ── */}
      {activeTab === 'HISTORY' && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, position: 'relative' }}>
          {clearHistoryConfirmOpen && onClearHistory && (
            <>
              <div
                role="presentation"
                onClick={() => setClearHistoryConfirmOpen(false)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 20,
                  cursor: 'default',
                  background: 'rgba(26,26,24,0.18)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="clear-history-title"
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 'min(32%, 120px)',
                  transform: 'translateX(-50%)',
                  zIndex: 21,
                  width: 'calc(100% - 40px)',
                  maxWidth: 300,
                  padding: '22px 22px 18px',
                  background: 'linear-gradient(165deg, #F7F4EF 0%, #EDE9E2 100%)',
                  border: '1px solid rgba(26,26,24,0.1)',
                  boxShadow: '0 18px 48px rgba(26,26,24,0.12), 0 0 0 1px rgba(255,255,255,0.4) inset',
                  borderRadius: 2,
                }}
              >
                <div
                  id="clear-history-title"
                  style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase' as const,
                    color: 'rgba(26,26,24,0.45)',
                    marginBottom: '10px',
                  }}
                >
                  Clear history
                </div>
                <p style={{ margin: '0 0 20px', fontSize: '12px', fontWeight: 300, lineHeight: 1.65, color: 'rgba(26,26,24,0.72)' }}>
                  Remove all saved queries from this device. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setClearHistoryConfirmOpen(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(26,26,24,0.16)',
                      cursor: 'pointer',
                      color: 'rgba(26,26,24,0.5)',
                      fontSize: '7.5px',
                      padding: '8px 14px',
                      fontFamily: 'inherit',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase' as const,
                      borderRadius: 1,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClearHistory();
                      setClearHistoryConfirmOpen(false);
                    }}
                    style={{
                      background: 'rgba(26,26,24,0.88)',
                      border: '1px solid rgba(26,26,24,0.2)',
                      cursor: 'pointer',
                      color: '#F5F2ED',
                      fontSize: '7.5px',
                      padding: '8px 14px',
                      fontFamily: 'inherit',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase' as const,
                      borderRadius: 1,
                    }}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </>
          )}
          {allHistory.length > 0 && onClearHistory && (
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '8px 24px 6px',
              background: 'linear-gradient(to bottom, #F0EDE8 70%, transparent)',
            }}>
              <button
                type="button"
                onClick={() => setClearHistoryConfirmOpen(true)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(26,26,24,0.14)',
                  cursor: 'pointer',
                  color: 'rgba(26,26,24,0.4)',
                  fontSize: '7.5px',
                  padding: '3px 10px',
                  fontFamily: 'inherit',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                }}
              >
                Clear history
              </button>
            </div>
          )}
          {allHistory.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'rgba(26,26,24,0.3)', fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
                No history yet.{'\n'}Run a query to start.
              </p>
            </div>
          ) : (
            groupHistoryByDate(allHistory).map(({ label, items }) => (
              <div key={label}>
                <div style={{
                  padding: '10px 24px 6px',
                  fontSize: '8px',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase' as const,
                  color: 'rgba(26,26,24,0.28)',
                  background: 'rgba(26,26,24,0.015)',
                  borderBottom: '1px solid rgba(26,26,24,0.06)',
                }}>
                  {label}
                </div>
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { onHistoryRestore(item); setActiveTab('CHAT'); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(26,26,24,0.07)',
                      padding: '12px 24px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26,26,24,0.025)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(26,26,24,0.78)', lineHeight: 1.4 }}>
                        {item.query}
                      </span>
                      <span style={{ fontSize: '9px', color: 'rgba(26,26,24,0.3)', flexShrink: 0, lineHeight: 1.6 }}>
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      {item.modules.map(m => (
                        <span key={m} style={{
                          fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.12em',
                          textTransform: 'uppercase' as const, color: MODULE_COLORS[m],
                          border: '1px solid', borderColor: MODULE_COLORS[m],
                          padding: '1px 5px', opacity: 0.7,
                        }}>
                          {m}
                        </span>
                      ))}
                    </div>
                    <p style={{
                      fontSize: '10.5px', fontWeight: 300, color: 'rgba(26,26,24,0.45)',
                      lineHeight: 1.55, margin: 0,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                    }}>
                      {item.summary.split('\nSOURCES\n')[0]}
                    </p>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── CHAT tab ── */}
      {activeTab === 'CHAT' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 0', minHeight: 0 }}>

          {/* Empty state */}
          {!hasQuery && !isLoading && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  fontSize: '11px', fontWeight: 500, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '16px',
                }}>
                  Suggested Queries
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {DEMO_QUERIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => onDemoQuery(q)}
                      style={{
                        background: 'transparent', border: '1px solid rgba(26,26,24,0.12)',
                        padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 300, color: 'rgba(26,26,24,0.7)',
                        lineHeight: 1.4, fontFamily: 'inherit', transition: 'border-color 0.15s ease, color 0.15s ease',
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

          {/* Prior queries (all except the active one) */}
          {chatHistory.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              {chatHistory.map((item) => (
                <div key={item.id} style={{ borderBottom: '1px solid rgba(26,26,24,0.07)', padding: '16px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(26,26,24,0.75)', letterSpacing: '0.02em' }}>
                      {item.query}
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(26,26,24,0.3)', flexShrink: 0, marginLeft: '8px' }}>
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {item.modules.map(m => (
                      <span key={m} style={{
                        fontSize: '8px', fontWeight: 500, letterSpacing: '0.12em',
                        textTransform: 'uppercase' as const, color: MODULE_COLORS[m],
                        border: '1px solid', borderColor: MODULE_COLORS[m], padding: '1px 5px', opacity: 0.7,
                      }}>
                        {m}
                      </span>
                    ))}
                  </div>
                  <p style={{
                    fontSize: '11px', fontWeight: 300, color: 'rgba(26,26,24,0.5)',
                    lineHeight: 1.65, fontStyle: 'italic',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                  }}>
                    {item.summary.split('\nSOURCES\n')[0]}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Active summary */}
          {(isLoading || summary) && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                fontSize: '9px', fontWeight: 500, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: 'rgba(26,26,24,0.4)', marginBottom: '14px',
              }}>
                Intelligence Summary
              </div>

              {isLoading && !summary && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', padding: '4px 0' }}>
                  {toolStatus.length > 0 ? (
                    toolStatus.map(t => (
                      <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {t.phase === 'running' ? (
                          <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            border: '1.5px solid rgba(26,26,24,0.35)',
                            borderTopColor: 'rgba(26,26,24,0.7)',
                            animation: 'spin 0.7s linear infinite', flexShrink: 0,
                          }} />
                        ) : (
                          <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: t.matched ? 'rgba(26,26,24,0.55)' : 'rgba(26,26,24,0.15)',
                            flexShrink: 0,
                          }} />
                        )}
                        <span style={{
                          fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                          color: t.phase === 'running' ? 'rgba(26,26,24,0.55)' : 'rgba(26,26,24,0.28)',
                          transition: 'color 0.2s',
                        }}>
                          {TOOL_LABELS[t.name] ?? t.name}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: '3px', height: '3px', borderRadius: '50%',
                          background: 'rgba(26,26,24,0.4)', animation: 'pulse 1.2s ease-in-out infinite',
                          animationDelay: `${i * 0.2}s`,
                        }} />
                      ))}
                    </div>
                  )}
                  <style>{`
                    @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
                    @keyframes spin { to { transform: rotate(360deg); } }
                  `}</style>
                </div>
              )}

              {summary && (
                <div ref={summaryRef}>
                  <SummaryWithCitations text={summary} isStreaming={isLoading} linkedSources={summarySources} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Input — pinned to bottom ── */}
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
            {summary ? 'Generating summary…' : toolStatus.some(t => t.phase === 'running') ? 'Fetching data…' : 'Querying…'}
          </div>
        )}
      </div>
    </div>
  );
}
