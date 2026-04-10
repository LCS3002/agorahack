'use client';

import { useState, useCallback } from 'react';
import { Header }         from '@/components/Header';
import { ChatPanel }      from '@/components/ChatPanel';
import { DashboardPanel } from '@/components/DashboardPanel';
import { StatusBar }      from '@/components/StatusBar';
import type {
  ClassificationResult,
  ModuleData,
  ModuleType,
  HistoryItem,
} from '@/lib/types';
import { selectMockData } from '@/lib/mockDataSelector';

export default function Page() {
  const [summary,       setSummary]       = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [activeModules, setActiveModules] = useState<ModuleType[]>([]);
  const [moduleData,    setModuleData]    = useState<ModuleData>({});
  const [timing,        setTiming]        = useState<number | null>(null);
  const [history,       setHistory]       = useState<HistoryItem[]>([]);
  const [hasQuery,      setHasQuery]      = useState(false);

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
      // ── Step 1: Classify query ──────────────────────────────────────────
      const classRes = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      classification = await classRes.json();

      // ── Step 2: Activate modules & select mock data (parallel) ─────────
      setActiveModules(classification.modules);
      data = selectMockData(classification, query);
      setModuleData(data);

      // ── Step 3: Stream summary ─────────────────────────────────────────
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
        setHistory(prev => [{
          id: crypto.randomUUID(),
          query,
          summary: text,
          modules: classification.modules,
          timestamp: Date.now(),
          timing: elapsed,
        }, ...prev]);
        return;
      }

      const reader  = sumRes.body.getReader();
      const decoder = new TextDecoder();
      let   full    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setSummary(full);
      }

      const elapsed = Date.now() - t0;
      setTiming(elapsed);
      setIsLoading(false);

      setHistory(prev => [{
        id: crypto.randomUUID(),
        query,
        summary: full,
        modules: classification.modules,
        timestamp: Date.now(),
        timing: elapsed,
      }, ...prev]);

    } catch (err) {
      console.error('Query error:', err);
      setSummary('An error occurred while processing your query. Please try again.');
      setIsLoading(false);
      setTiming(Date.now() - t0);
    }
  }, [isLoading]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: '#F0EDE8',
    }}>
      {/* Header */}
      <Header />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left: Chat panel ~35% */}
        <div style={{ width: '35%', minWidth: '280px', maxWidth: '420px', overflow: 'hidden' }}>
          <ChatPanel
            summary={summary}
            isLoading={isLoading}
            history={history.slice(1)} // exclude current (shown in main area)
            activeModules={activeModules}
            onSubmit={runQuery}
            onDemoQuery={runQuery}
            hasQuery={hasQuery}
          />
        </div>

        {/* Right: Dashboard panel ~65% */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <DashboardPanel
            moduleData={moduleData}
            activeModules={activeModules}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        activeModules={activeModules}
        timing={timing}
        isLoading={isLoading}
      />
    </div>
  );
}
