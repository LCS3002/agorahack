'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from 'recharts';
import type { NewsResult } from '@/lib/types';

interface NewsCardProps {
  data: NewsResult;
}

const LEAN_COLORS: Record<'LEFT' | 'CENTRE' | 'RIGHT', string> = {
  LEFT:   'rgba(26,26,24,0.65)',
  CENTRE: '#8A8882',
  RIGHT:  '#C9A89A',
};

function SentimentScore({ score }: { score: number }) {
  const pct = ((score + 1) / 2) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ flex: 1, height: '3px', background: 'rgba(26,26,24,0.08)', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            background: score > 0.1 ? 'rgba(26,26,24,0.55)' : score < -0.1 ? '#C9A89A' : '#8A8882',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.5)', flexShrink: 0 }}>
        {score > 0.1 ? 'POSITIVE' : score < -0.1 ? 'NEGATIVE' : 'MIXED'}
      </span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val: number = payload[0].value;
  return (
    <div style={{
      background: '#F0EDE8',
      border: '1px solid rgba(26,26,24,0.12)',
      padding: '6px 10px',
      fontSize: '10px',
      color: '#1A1A18',
    }}>
      <div style={{ color: 'rgba(26,26,24,0.45)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontWeight: 400 }}>{val > 0 ? '+' : ''}{val.toFixed(2)}</div>
    </div>
  );
}

export function NewsCard({ data }: NewsCardProps) {
  const chartData = data.sentimentHistory.map(p => ({
    date: p.date.slice(5), // MM-DD
    score: parseFloat(p.score.toFixed(2)),
  }));

  return (
    <div className="aether-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Header */}
      <div>
        <div className="label-xs" style={{ marginBottom: '6px' }}>Media Intelligence</div>
        <div style={{ fontSize: '15px', fontWeight: 300, color: '#1A1A18', lineHeight: 1.3, marginBottom: '10px' }}>
          {data.topic}
        </div>
        <SentimentScore score={data.overallSentiment} />
      </div>

      {/* Sparkline */}
      <div>
        <div className="label-xs" style={{ marginBottom: '8px' }}>Sentiment — Last 30 days</div>
        <div style={{ height: '72px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="rgba(26,26,24,0.18)" stopOpacity={1} />
                  <stop offset="95%" stopColor="rgba(26,26,24,0)"    stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 8, fill: 'rgba(26,26,24,0.35)', fontFamily: 'inherit' }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <YAxis domain={[-1, 1]} hide />
              <ReferenceLine y={0} stroke="rgba(26,26,24,0.15)" strokeDasharray="2 2" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="rgba(26,26,24,0.55)"
                strokeWidth={1.5}
                fill="url(#sentGrad)"
                dot={false}
                activeDot={{ r: 3, fill: '#1A1A18', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Headlines */}
      <div>
        <div className="label-xs" style={{ marginBottom: '10px' }}>Headlines</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          {data.headlines.map((h, i) => (
            <div
              key={i}
              style={{
                padding: '10px 0',
                borderBottom: i < data.headlines.length - 1 ? '1px solid rgba(26,26,24,0.07)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{
                    fontSize: '8px',
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: LEAN_COLORS[h.lean],
                    border: '1px solid',
                    borderColor: LEAN_COLORS[h.lean],
                    padding: '1px 5px',
                    flexShrink: 0,
                  }}>
                    {h.lean}
                  </span>
                  <span style={{ fontSize: '9px', color: 'rgba(26,26,24,0.45)', letterSpacing: '0.04em' }}>
                    {h.source}
                  </span>
                  <span style={{ fontSize: '9px', color: 'rgba(26,26,24,0.3)' }}>{h.date}</span>
                </div>
                {h.url ? (
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12px', fontWeight: 300, color: '#1A1A18', lineHeight: 1.45,
                      textDecoration: 'none', display: 'block',
                      borderBottom: '1px solid rgba(26,26,24,0.15)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(26,26,24,0.6)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#1A1A18'; }}
                  >
                    {h.title}
                  </a>
                ) : (
                  <div style={{ fontSize: '12px', fontWeight: 300, color: '#1A1A18', lineHeight: 1.45 }}>
                    {h.title}
                  </div>
                )}
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: 400,
                color: h.sentiment > 0.1 ? 'rgba(26,26,24,0.65)' : h.sentiment < -0.1 ? '#C9A89A' : '#8A8882',
                flexShrink: 0,
                textAlign: 'right',
              }}>
                {h.sentiment > 0 ? '+' : ''}{h.sentiment.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Framing divergence */}
      <div>
        <div className="label-xs" style={{ marginBottom: '10px' }}>Framing Divergence</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(Object.entries(data.framingDivergence) as [string, string][]).map(([lean, text]) => (
            <div key={lean} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{
                fontSize: '8px',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: LEAN_COLORS[lean.toUpperCase() as 'LEFT' | 'CENTRE' | 'RIGHT'],
                border: '1px solid',
                borderColor: LEAN_COLORS[lean.toUpperCase() as 'LEFT' | 'CENTRE' | 'RIGHT'],
                padding: '1px 5px',
                flexShrink: 0,
                marginTop: '1px',
              }}>
                {lean}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 300, color: 'rgba(26,26,24,0.65)', lineHeight: 1.55, fontStyle: 'italic' }}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
