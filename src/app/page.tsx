'use client';

import { useState, useCallback, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header }           from '@/components/Header';
import { ChatPanel }        from '@/components/ChatPanel';
import { DashboardPanel }   from '@/components/DashboardPanel';
import { StatusBar }        from '@/components/StatusBar';
import { VotingExpanded }   from '@/components/expanded/VotingExpanded';
import { LobbyingExpanded } from '@/components/expanded/LobbyingExpanded';
import { NewsExpanded }     from '@/components/expanded/NewsExpanded';
import type {
  ClassificationResult,
  ModuleData,
  ModuleType,
  HistoryItem,
} from '@/lib/types';
import { selectMockData } from '@/lib/mockDataSelector';

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

              <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, position: 'relative' }}>
                <AnimatePresence mode="wait">
                  {expandedModule === 'VOTING' && moduleData.voting ? (
                    <motion.div key="voting-expanded" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.22, ease: 'easeOut' }} style={{ height: '100%' }}>
                      <VotingExpanded data={moduleData.voting} onCollapse={() => setExpandedModule(null)} />
                    </motion.div>
                  ) : expandedModule === 'LOBBYING' && moduleData.lobbying ? (
                    <motion.div key="lobbying-expanded" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.22, ease: 'easeOut' }} style={{ height: '100%' }}>
                      <LobbyingExpanded data={moduleData.lobbying} onCollapse={() => setExpandedModule(null)} />
                    </motion.div>
                  ) : expandedModule === 'NEWS' && moduleData.news ? (
                    <motion.div key="news-expanded" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.22, ease: 'easeOut' }} style={{ height: '100%' }}>
                      <NewsExpanded data={moduleData.news} onCollapse={() => setExpandedModule(null)} />
                    </motion.div>
                  ) : (
                    <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} style={{ height: '100%' }}>
                      <DashboardPanel
                        moduleData={moduleData}
                        activeModules={activeModules}
                        isLoading={isLoading}
                        onExpand={setExpandedModule}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <StatusBar activeModules={activeModules} timing={timing} isLoading={isLoading} />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
