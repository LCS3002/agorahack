'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
  ReferenceLine, Tooltip, CartesianGrid,
} from 'recharts';
import type { NewsResult } from '@/lib/types';

interface Props { data: NewsResult; onCollapse: () => void; }

type Lean = 'LEFT' | 'CENTRE' | 'RIGHT' | 'ALL';

const LEAN_COLORS: Record<'LEFT' | 'CENTRE' | 'RIGHT', string> = {
  LEFT:   'rgba(26,26,24,0.7)',
  CENTRE: '#8A8882',
  RIGHT:  '#C9A89A',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val: number = payload[0].value;
  return (
    <div style={{ background: '#F0EDE8', border: '1px solid rgba(26,26,24,0.12)', padding: '6px 10px', fontSize: '10px' }}>
      <div style={{ color: 'rgba(26,26,24,0.4)', fontSize: '8.5px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontWeight: 400, color: val > 0 ? 'rgba(26,26,24,0.8)' : '#C9A89A' }}>
        {val > 0 ? '+' : ''}{val.toFixed(2)}
      </div>
    </div>
  );
}

export function NewsExpanded({ data, onCollapse }: Props) {
  const [leanFilter, setLeanFilter] = useState<Lean>('ALL');

  const chartData = data.sentimentHistory.map(p => ({
    date: p.date.slice(5),
    score: parseFloat(p.score.toFixed(2)),
  }));

  const filtered = leanFilter === 'ALL'
    ? data.headlines
    : data.headlines.filter(h => h.lean === leanFilter);

  const sentColor = data.overallSentiment > 0.1 ? 'rgba(26,26,24,0.7)' : data.overallSentiment < -0.1 ? '#C9A89A' : '#8A8882';

  // Per-lean headline counts
  const leanCounts = {
    LEFT:   data.headlines.filter(h => h.lean === 'LEFT').length,
    CENTRE: data.headlines.filter(h => h.lean === 'CENTRE').length,
    RIGHT:  data.headlines.filter(h => h.lean === 'RIGHT').length,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F0EDE8' }}>

      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '11px 22px',
        borderBottom: '1px solid rgba(26,26,24,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontSize: '8px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.5)' }}>
            News & Sentiment
          </span>
          <span style={{ fontSize: '11px', fontWeight: 300, color: 'rgba(26,26,24,0.55)' }}>{data.topic}</span>
        </div>
        <button onClick={onCollapse} style={{
          background: 'none', border: '1px solid rgba(26,26,24,0.14)', cursor: 'pointer',
          color: 'rgba(26,26,24,0.45)', fontSize: '8.5px', padding: '4px 12px',
          fontFamily: 'inherit', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          ← Back
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Top: sentiment score + chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', borderBottom: '1px solid rgba(26,26,24,0.08)' }}>

          {/* Score panel */}
          <div style={{ padding: '24px', borderRight: '1px solid rgba(26,26,24,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '16px' }}>
              Overall Sentiment
            </div>
            <div style={{ fontSize: '52px', fontWeight: 200, color: sentColor, lineHeight: 1, marginBottom: '4px' }}>
              {data.overallSentiment > 0 ? '+' : ''}{data.overallSentiment.toFixed(2)}
            </div>
            <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: sentColor, marginBottom: '16px' }}>
              {data.sentimentLabel}
            </div>

            {/* Sentiment track */}
            <div style={{ height: '4px', background: 'rgba(26,26,24,0.07)', position: 'relative', marginBottom: '4px' }}>
              <div style={{
                position: 'absolute', top: 0, height: '100%',
                width: `${((data.overallSentiment + 1) / 2) * 100}%`,
                background: sentColor,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '8px', color: 'rgba(26,26,24,0.3)' }}>−1 Negative</span>
              <span style={{ fontSize: '8px', color: 'rgba(26,26,24,0.3)' }}>+1 Positive</span>
            </div>

            {/* Lean distribution */}
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(['LEFT', 'CENTRE', 'RIGHT'] as const).map(lean => (
                <div key={lean} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '7px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: LEAN_COLORS[lean], border: `1px solid ${LEAN_COLORS[lean]}`,
                    padding: '1px 5px', flexShrink: 0, width: '42px', textAlign: 'center',
                  }}>
                    {lean}
                  </span>
                  <div style={{ flex: 1, height: '3px', background: 'rgba(26,26,24,0.07)' }}>
                    <div style={{ height: '100%', width: `${(leanCounts[lean] / data.headlines.length) * 100}%`, background: LEAN_COLORS[lean] }} />
                  </div>
                  <span style={{ fontSize: '9px', color: 'rgba(26,26,24,0.38)', flexShrink: 0 }}>{leanCounts[lean]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div style={{ padding: '24px' }}>
            <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '14px' }}>
              30-Day Sentiment Trend
            </div>
            <div style={{ height: '160px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sentGradEx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="rgba(26,26,24,0.2)" stopOpacity={1} />
                      <stop offset="95%" stopColor="rgba(26,26,24,0)"   stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(26,26,24,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(26,26,24,0.32)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis domain={[-1, 1]} tick={{ fontSize: 8, fill: 'rgba(26,26,24,0.32)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} width={28} />
                  <ReferenceLine y={0} stroke="rgba(26,26,24,0.15)" strokeDasharray="3 3" />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="score" stroke="rgba(26,26,24,0.6)" strokeWidth={1.5} fill="url(#sentGradEx)" dot={false} activeDot={{ r: 3, fill: '#1A1A18', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Headlines + framing */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px' }}>

          {/* Headlines with lean filter */}
          <div style={{ padding: '20px 22px', borderRight: '1px solid rgba(26,26,24,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.38)' }}>
                Headlines ({filtered.length})
              </div>
              {/* Lean filter */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['ALL', 'LEFT', 'CENTRE', 'RIGHT'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLeanFilter(l)}
                    style={{
                      fontSize: '7px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '2px 8px', fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
                      border: `1px solid ${leanFilter === l
                        ? (l === 'ALL' ? 'rgba(26,26,24,0.5)' : LEAN_COLORS[l as 'LEFT' | 'CENTRE' | 'RIGHT'])
                        : 'rgba(26,26,24,0.1)'}`,
                      background: leanFilter === l ? 'rgba(26,26,24,0.04)' : 'transparent',
                      color: leanFilter === l
                        ? (l === 'ALL' ? '#1A1A18' : LEAN_COLORS[l as 'LEFT' | 'CENTRE' | 'RIGHT'])
                        : 'rgba(26,26,24,0.38)',
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map((h, i) => (
                <div key={i} style={{
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(26,26,24,0.07)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: LEAN_COLORS[h.lean], border: `1px solid ${LEAN_COLORS[h.lean]}`, padding: '1px 5px', flexShrink: 0,
                      }}>
                        {h.lean}
                      </span>
                      <span style={{ fontSize: '9px', color: 'rgba(26,26,24,0.4)' }}>{h.source}</span>
                      <span style={{ fontSize: '8.5px', color: 'rgba(26,26,24,0.28)' }}>{h.date}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 300, color: '#1A1A18', lineHeight: 1.45 }}>{h.title}</div>
                  </div>
                  <div style={{
                    fontSize: '13px', fontWeight: 300, flexShrink: 0,
                    color: h.sentiment > 0.1 ? 'rgba(26,26,24,0.7)' : h.sentiment < -0.1 ? '#C9A89A' : '#8A8882',
                  }}>
                    {h.sentiment > 0 ? '+' : ''}{h.sentiment.toFixed(2)}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ fontSize: '11px', fontWeight: 300, color: 'rgba(26,26,24,0.3)', padding: '20px 0' }}>
                  No headlines for this filter.
                </div>
              )}
            </div>
          </div>

          {/* Framing divergence */}
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.38)', marginBottom: '16px' }}>
              Framing Divergence
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(Object.entries(data.framingDivergence) as [string, string][]).map(([lean, text]) => {
                const key = lean.toUpperCase() as 'LEFT' | 'CENTRE' | 'RIGHT';
                return (
                  <div key={lean}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: LEAN_COLORS[key], border: `1px solid ${LEAN_COLORS[key]}`, padding: '2px 7px',
                      }}>
                        {lean}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: 300, color: 'rgba(26,26,24,0.68)', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
                      "{text}"
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Divergence score */}
            <div style={{ marginTop: '24px', padding: '16px', border: '1px solid rgba(26,26,24,0.08)' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '8px' }}>
                Polarisation Index
              </div>
              {(() => {
                const leftH  = data.headlines.filter(h => h.lean === 'LEFT');
                const rightH = data.headlines.filter(h => h.lean === 'RIGHT');
                const leftAvg  = leftH.length  ? leftH.reduce((s, h)  => s + h.sentiment, 0) / leftH.length  : 0;
                const rightAvg = rightH.length ? rightH.reduce((s, h) => s + h.sentiment, 0) / rightH.length : 0;
                const divergence = Math.abs(leftAvg - rightAvg);
                return (
                  <>
                    <div style={{ fontSize: '28px', fontWeight: 200, color: divergence > 0.5 ? '#C9A89A' : 'rgba(26,26,24,0.6)' }}>
                      {divergence.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(26,26,24,0.38)', marginTop: '2px' }}>
                      Left avg {leftAvg.toFixed(2)} vs Right avg {rightAvg.toFixed(2)}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
