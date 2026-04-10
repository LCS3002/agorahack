'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { VoteResult } from '@/lib/types';

interface VotingCardProps {
  data: VoteResult;
}

const STATUS_COLORS: Record<VoteResult['status'], string> = {
  PASSED:   'rgba(26,26,24,0.5)',
  REJECTED: '#C9A89A',
  PENDING:  '#8A8882',
};

export function VotingCard({ data }: VotingCardProps) {
  const total = data.votes.for + data.votes.against + data.votes.abstain;
  const forPct     = (data.votes.for     / total) * 100;
  const againstPct = (data.votes.against / total) * 100;
  const abstainPct = (data.votes.abstain / total) * 100;

  const partyData = data.partyBreakdown.map(p => ({
    party: p.party,
    for: p.for,
    against: p.against,
    abstain: p.abstain,
    color: p.color,
  }));

  return (
    <div className="aether-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="label-xs" style={{ marginBottom: '6px' }}>Voting Record</div>
          <div style={{ fontSize: '15px', fontWeight: 300, color: '#1A1A18', lineHeight: 1.3 }}>
            {data.lawName}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(26,26,24,0.45)', marginTop: '2px', letterSpacing: '0.04em' }}>
            {data.committee} · {data.date} · {data.reference}
          </div>
        </div>
        <span style={{
          border: '1px solid',
          borderColor: STATUS_COLORS[data.status],
          color: STATUS_COLORS[data.status],
          fontSize: '9px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          padding: '3px 10px',
          flexShrink: 0,
          marginTop: '2px',
        }}>
          {data.status}
        </span>
      </div>

      {/* Main stacked bar */}
      <div>
        <div style={{ display: 'flex', height: '8px', width: '100%', gap: '1px' }}>
          <div style={{ width: `${forPct}%`,     background: 'rgba(26,26,24,0.65)', transition: 'width 0.6s ease' }} />
          <div style={{ width: `${againstPct}%`, background: '#C9A89A',             transition: 'width 0.6s ease' }} />
          <div style={{ width: `${abstainPct}%`, background: 'rgba(26,26,24,0.15)', transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
          {[
            { label: 'FOR',     value: data.votes.for,     color: 'rgba(26,26,24,0.75)' },
            { label: 'AGAINST', value: data.votes.against, color: '#C9A89A' },
            { label: 'ABSTAIN', value: data.votes.abstain, color: 'rgba(26,26,24,0.3)' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: '18px', fontWeight: 200, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '8px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.4)', marginTop: '1px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Party breakdown */}
      <div>
        <div className="label-xs" style={{ marginBottom: '10px' }}>By Party Group</div>
        <div style={{ height: '100px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={partyData}
              layout="vertical"
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              barSize={5}
              barGap={1}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="party"
                width={32}
                tick={{ fontSize: 9, fill: 'rgba(26,26,24,0.5)', fontFamily: 'inherit', letterSpacing: '0.06em' }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="for" stackId="a" fill="rgba(26,26,24,0.65)" radius={0} />
              <Bar dataKey="against" stackId="a" fill="#C9A89A" radius={0} />
              <Bar dataKey="abstain" stackId="a" fill="rgba(26,26,24,0.12)" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key MEPs */}
      <div>
        <div className="label-xs" style={{ marginBottom: '10px' }}>Key MEPs</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.keyMEPs.map((mep) => (
            <div key={mep.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '8px',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: mep.vote === 'FOR' ? 'rgba(26,26,24,0.75)' : mep.vote === 'AGAINST' ? '#C9A89A' : 'rgba(26,26,24,0.35)',
                  border: '1px solid',
                  borderColor: mep.vote === 'FOR' ? 'rgba(26,26,24,0.25)' : mep.vote === 'AGAINST' ? 'rgba(201,168,154,0.5)' : 'rgba(26,26,24,0.12)',
                  padding: '1px 6px',
                  flexShrink: 0,
                }}>
                  {mep.vote}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 300, color: '#1A1A18' }}>{mep.name}</span>
                <span style={{ fontSize: '10px', color: 'rgba(26,26,24,0.4)' }}>{mep.party} · {mep.country}</span>
              </div>
              {mep.note && (
                <span style={{ fontSize: '10px', color: 'rgba(26,26,24,0.4)', fontStyle: 'italic', textAlign: 'right' }}>
                  {mep.note}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
