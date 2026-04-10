'use client';

import { useState, useCallback, useRef, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header }         from '@/components/Header';
import { ChatPanel }      from '@/components/ChatPanel';
import { DashboardPanel } from '@/components/DashboardPanel';
import { StatusBar }      from '@/components/StatusBar';
import { VotingCard }     from '@/components/cards/VotingCard';
import { LobbyingCard }   from '@/components/cards/LobbyingCard';
import { NewsCard }       from '@/components/cards/NewsCard';
import type {
  ClassificationResult,
  ModuleData,
  ModuleType,
  HistoryItem,
} from '@/lib/types';
import { selectMockData } from '@/lib/mockDataSelector';

// ── Expand icon ───────────────────────────────────────────────────────────────
function ExpandIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
      <path
        d="M6.5 1H10V4.5M4.5 10H1V6.5M10 1L6 5M5 6L1 10"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Expanded module overlay ───────────────────────────────────────────────────
const MODULE_TITLES: Record<ModuleType, string> = {
  VOTING:   'Voting & Parliament',
  LOBBYING: 'Lobbying & Money',
  NEWS:     'News & Sentiment',
};

function ExpandedOverlay({
  module,
  moduleData,
  onClose,
}: {
  module: ModuleType;
  moduleData: ModuleData;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hasData =
    (module === 'VOTING'   && moduleData.voting)   ||
    (module === 'LOBBYING' && moduleData.lobbying)  ||
    (module === 'NEWS'     && moduleData.news);

  return (
    <motion.div
      key="overlay-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,26,24,0.42)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{    opacity: 0, y: 8,  scale: 0.98 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#F0EDE8',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(26,26,24,0.12)',
        }}
      >
        <div style={{
          flexShrink: 0,
          padding: '14px 24px',
          borderBottom: '1px solid rgba(26,26,24,0.09)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(26,26,24,0.6)',
          }}>
            {MODULE_TITLES[module]}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid rgba(26,26,24,0.15)',
              cursor: 'pointer',
              color: 'rgba(26,26,24,0.5)',
              fontSize: '11px',
              padding: '3px 10px',
              fontFamily: 'inherit',
              letterSpacing: '0.08em',
            }}
          >
            ESC
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!hasData ? (
            <div style={{
              padding: '60px 32px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 300,
              color: 'rgba(26,26,24,0.35)',
            }}>
              No data yet — run a query first.
            </div>
          ) : (
            <>
              {module === 'VOTING'   && moduleData.voting   && <VotingCard   data={moduleData.voting}   />}
              {module === 'LOBBYING' && moduleData.lobbying  && <LobbyingCard data={moduleData.lobbying}  />}
              {module === 'NEWS'     && moduleData.news      && <NewsCard     data={moduleData.news}      />}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────
function LandingPage({
  onSubmit,
  isLoading,
}: {
  onSubmit: (q: string) => void;
  isLoading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (!val || isLoading) return;
    onSubmit(val);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F0EDE8',
        padding: '48px 24px',
      }}
    >
      {/* Wordmark */}
      <div style={{ marginBottom: '52px', textAlign: 'center' }}>
        <div style={{
          fontSize: '9px',
          fontWeight: 500,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'rgba(26,26,24,0.28)',
          marginBottom: '20px',
        }}>
          A (01)
        </div>
        <div style={{
          fontSize: '44px',
          fontWeight: 200,
          letterSpacing: '0.14em',
          color: '#1A1A18',
          lineHeight: 1,
        }}>
          ALETHEIA
        </div>
        <div style={{
          fontSize: '12px',
          fontWeight: 300,
          color: 'rgba(26,26,24,0.4)',
          marginTop: '16px',
          letterSpacing: '0.05em',
        }}>
          EU votes, money, and influence — in plain language.
        </div>
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '640px' }}>
        <div style={{
          border: `1px solid ${focused ? 'rgba(26,26,24,0.4)' : 'rgba(26,26,24,0.14)'}`,
          background: focused ? 'rgba(26,26,24,0.015)' : 'transparent',
          transition: 'border-color 0.2s ease, background 0.2s ease',
          padding: '18px 16px 14px 22px',
        }}>
          <input
            ref={inputRef}
            autoFocus
            disabled={isLoading}
            autoComplete="off"
            placeholder="Ask about EU politics…"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: '15px',
              fontWeight: 300,
              color: '#1A1A18',
              letterSpacing: '0.01em',
              lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '14px',
          }}>
            <span style={{
              fontSize: '9px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(26,26,24,0.2)',
            }}>
              {isLoading ? 'Processing…' : 'Return to submit'}
            </span>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: isLoading ? 'rgba(26,26,24,0.08)' : '#1A1A18',
                border: 'none',
                cursor: isLoading ? 'default' : 'pointer',
                color: '#F0EDE8',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (!isLoading) (e.currentTarget as HTMLElement).style.background = 'rgba(26,26,24,0.7)';
              }}
              onMouseLeave={e => {
                if (!isLoading) (e.currentTarget as HTMLElement).style.background = '#1A1A18';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 6.5h9M7.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </form>

      <div style={{
        position: 'absolute',
        bottom: '28px',
        fontSize: '9px',
        letterSpacing: '0.14em',
        color: 'rgba(26,26,24,0.18)',
        textTransform: 'uppercase',
      }}>
        Truth, unconcealed.
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Page() {
  const [summary,        setSummary]        = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [activeModules,  setActiveModules]  = useState<ModuleType[]>([]);
  const [moduleData,     setModuleData]     = useState<ModuleData>({});
  const [timing,         setTiming]         = useState<number | null>(null);
  const [history,        setHistory]        = useState<HistoryItem[]>([]);
  const [hasQuery,       setHasQuery]       = useState(false);
  const [expandedModule, setExpandedModule] = useState<ModuleType | null>(null);

  const runQuery = useCallback(async (query: string) => {
    if (!query.trim() || isLoading) return;

    const t0 = Date.now();
    setIsLoading(true);
    setHasQuery(true);
    setSummary('');
    setActiveModules([]);
    setModuleData({});
    setTiming(null);

    let classification: ClassificationResult;
    let data: ModuleData;

    try {
      const classRes = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      classification = await classRes.json();

      setActiveModules(classification.modules);
      data = selectMockData(classification, query);
      setModuleData(data);

      const sumRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, classification, moduleData: data }),
      });

      if (!sumRes.body) {
        const text = await sumRes.text();
        setSummary(text);
        setIsLoading(false);
        const elapsed = Date.now() - t0;
        setTiming(elapsed);
        setHistory(prev => [{ id: crypto.randomUUID(), query, summary: text, modules: classification.modules, timestamp: Date.now(), timing: elapsed }, ...prev]);
        return;
      }

      const reader  = sumRes.body.getReader();
      const decoder = new TextDecoder();
      let   full    = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setSummary(full);
      }

      const elapsed = Date.now() - t0;
      setTiming(elapsed);
      setIsLoading(false);
      setHistory(prev => [{ id: crypto.randomUUID(), query, summary: full, modules: classification.modules, timestamp: Date.now(), timing: elapsed }, ...prev]);

    } catch (err) {
      console.error('Query error:', err);
      setSummary('An error occurred. Please try again.');
      setIsLoading(false);
      setTiming(Date.now() - t0);
    }
  }, [isLoading]);

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: '#F0EDE8', position: 'relative' }}>

      <AnimatePresence mode="wait">
        {!hasQuery ? (
          <LandingPage key="landing" onSubmit={runQuery} isLoading={isLoading} />
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
            style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
          >
            <Header />

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
              <div style={{ width: '300px', minWidth: '260px', maxWidth: '340px', flexShrink: 0, overflow: 'hidden' }}>
                <ChatPanel
                  summary={summary}
                  isLoading={isLoading}
                  history={history.slice(1)}
                  activeModules={activeModules}
                  onSubmit={runQuery}
                  onDemoQuery={runQuery}
                  hasQuery={hasQuery}
                />
              </div>

              <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <DashboardPanel
                  moduleData={moduleData}
                  activeModules={activeModules}
                  isLoading={isLoading}
                  onExpand={setExpandedModule}
                />
              </div>
            </div>

            <StatusBar activeModules={activeModules} timing={timing} isLoading={isLoading} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expandedModule && (
          <ExpandedOverlay
            key="expanded"
            module={expandedModule}
            moduleData={moduleData}
            onClose={() => setExpandedModule(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
