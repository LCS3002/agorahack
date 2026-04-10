'use client';

import { useState, useMemo } from 'react';
import type { VoteResult, PartyVote } from '@/lib/types';

const PARTY_ORDER   = ['The Left', 'Greens', 'S&D', 'Renew', 'EPP', 'ECR', 'ID', 'ESN'];
const FOR_COLOR     = 'rgba(26,26,24,0.82)';
const AGAINST_COLOR = '#C9A89A';
const ABSTAIN_COLOR = 'rgba(26,26,24,0.13)';
const STATUS_COLORS = { PASSED: 'rgba(26,26,24,0.5)', REJECTED: '#C9A89A', PENDING: '#8A8882' };

interface Props { data: VoteResult; onCollapse: () => void; }

// ── Hemicycle (larger, interactive) ──────────────────────────────────────────
function Hemicycle({
  partyBreakdown,
  selectedParty,
}: {
  partyBreakdown: PartyVote[];
  selectedParty: string | null;
}) {
  const seats = useMemo(() => {
    const ordered: PartyVote[] = [
      ...PARTY_ORDER.map(n => partyBreakdown.find(p => p.party === n)).filter(Boolean) as PartyVote[],
      ...partyBreakdown.filter(p => !PARTY_ORDER.includes(p.party)),
    ];
    const list: { color: string; party: string }[] = [];
    for (const p of ordered) {
      for (let i = 0; i < p.for;     i++) list.push({ color: FOR_COLOR,     party: p.party });
      for (let i = 0; i < p.against; i++) list.push({ color: AGAINST_COLOR, party: p.party });
      for (let i = 0; i < p.abstain; i++) list.push({ color: ABSTAIN_COLOR, party: p.party });
    }
    return list;
  }, [partyBreakdown]);

  const positions = useMemo(() => {
    const total = seats.length;
    if (!total) return [];
    const CX = 300, CY = 285;
    const N_ROWS = 13, R_MIN = 52, R_STEP = 17;
    const radii    = Array.from({ length: N_ROWS }, (_, i) => R_MIN + i * R_STEP);
    const radSum   = radii.reduce((s, r) => s + r, 0);
    const counts   = radii.map(r => Math.round((r / radSum) * total));
    counts[N_ROWS - 1] += total - counts.reduce((s, c) => s + c, 0);
    const pts: { x: number; y: number; color: string; party: string }[] = [];
    let idx = 0;
    for (let row = 0; row < N_ROWS; row++) {
      const r = radii[row], n = counts[row];
      for (let j = 0; j < n && idx < total; j++) {
        const a = Math.PI * (1 - (j + 0.5) / n);
        pts.push({ x: CX + r * Math.cos(a), y: CY - r * Math.sin(a), color: seats[idx].color, party: seats[idx].party });
        idx++;
      }
    }
    return pts;
  }, [seats]);

  return (
    <svg viewBox="0 0 600 295" width="100%" style={{ display: 'block' }}>
      <line x1="8" y1="285" x2="592" y2="285" stroke="rgba(26,26,24,0.07)" strokeWidth="1" />
      {positions.map((p, i) => (
        <circle
          key={i}
          cx={p.x} cy={p.y} r={2.1}
          fill={p.color}
          opacity={!selectedParty || p.party === selectedParty ? 1 : 0.06}
          style={{ transition: 'opacity 0.22s ease' }}
        />
      ))}
    </svg>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function VotingExpanded({ data, onCollapse }: Props) {
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  const total  = data.votes.for + data.votes.against + data.votes.abstain;
  const forPct = (data.votes.for     / total) * 100;
  const agnPct = (data.votes.against / total) * 100;
  const absPct = (data.votes.abstain / total) * 100;

  const parties = useMemo(() => {
    const ordered: PartyVote[] = [
      ...PARTY_ORDER.map(n => data.partyBreakdown.find(p => p.party === n)).filter(Boolean) as PartyVote[],
      ...data.partyBreakdown.filter(p => !PARTY_ORDER.includes(p.party)),
    ];
    return ordered.map(p => ({
      name:    p.party,
      total:   p.for + p.against + p.abstain,
      for:     p.for,
      against: p.against,
      abstain: p.abstain,
    }));
  }, [data.partyBreakdown]);

  function toggleParty(name: string) {
    setSelectedParty(prev => prev === name ? null : name);
  }

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
            Voting & Parliament
          </span>
          <span style={{ fontSize: '11px', fontWeight: 300, color: 'rgba(26,26,24,0.55)' }}>
            {data.shortName || data.lawName}
          </span>
        </div>
        <button onClick={onCollapse} style={{
          background: 'none', border: '1px solid rgba(26,26,24,0.14)', cursor: 'pointer',
          color: 'rgba(26,26,24,0.45)', fontSize: '8.5px', padding: '4px 12px',
          fontFamily: 'inherit', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          ← Back
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Top grid: hemicycle + summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', borderBottom: '1px solid rgba(26,26,24,0.08)' }}>

          {/* Hemicycle column */}
          <div style={{ padding: '22px 22px 16px', borderRight: '1px solid rgba(26,26,24,0.08)' }}>
            <div style={{ fontSize: '8px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '10px' }}>
              Hemicycle · {total} seats · {selectedParty ? `filtered: ${selectedParty}` : 'all parties'}
            </div>

            <Hemicycle partyBreakdown={data.partyBreakdown} selectedParty={selectedParty} />

            {/* Vote legend */}
            <div style={{ display: 'flex', gap: '18px', marginTop: '6px', marginBottom: '14px' }}>
              {[['FOR', FOR_COLOR], ['AGAINST', AGAINST_COLOR], ['ABSTAIN', ABSTAIN_COLOR]].map(([l, c]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: c }} />
                  <span style={{ fontSize: '8px', fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.38)' }}>{l}</span>
                </div>
              ))}
            </div>

            {/* Party filter chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              <button
                onClick={() => setSelectedParty(null)}
                style={{
                  fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '3px 10px', fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
                  border: `1px solid ${!selectedParty ? 'rgba(26,26,24,0.55)' : 'rgba(26,26,24,0.12)'}`,
                  background: !selectedParty ? 'rgba(26,26,24,0.07)' : 'transparent',
                  color: !selectedParty ? '#1A1A18' : 'rgba(26,26,24,0.4)',
                }}
              >
                All
              </button>
              {parties.map(p => (
                <button
                  key={p.name}
                  onClick={() => toggleParty(p.name)}
                  style={{
                    fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '3px 10px', fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${selectedParty === p.name ? 'rgba(26,26,24,0.55)' : 'rgba(26,26,24,0.1)'}`,
                    background: selectedParty === p.name ? 'rgba(26,26,24,0.07)' : 'transparent',
                    color: selectedParty === p.name ? '#1A1A18' : 'rgba(26,26,24,0.38)',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Summary + party table */}
          <div style={{ padding: '22px 20px' }}>
            {/* Law info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 300, color: '#1A1A18', lineHeight: 1.3 }}>{data.lawName}</div>
                <div style={{ fontSize: '10px', color: 'rgba(26,26,24,0.38)', marginTop: '4px' }}>{data.committee} · {data.date}</div>
                <div style={{ fontSize: '9px', color: 'rgba(26,26,24,0.28)', marginTop: '1px' }}>{data.reference}</div>
              </div>
              <span style={{ border: `1px solid ${STATUS_COLORS[data.status]}`, color: STATUS_COLORS[data.status], fontSize: '7.5px', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '2px 8px', flexShrink: 0 }}>
                {data.status}
              </span>
            </div>

            {/* Vote bar */}
            <div style={{ display: 'flex', height: '5px', gap: '1px', marginBottom: '8px' }}>
              <div style={{ width: `${forPct}%`, background: 'rgba(26,26,24,0.72)' }} />
              <div style={{ width: `${agnPct}%`, background: '#C9A89A' }} />
              <div style={{ width: `${absPct}%`, background: 'rgba(26,26,24,0.1)' }} />
            </div>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '20px' }}>
              {[{ l: 'FOR', v: data.votes.for, c: 'rgba(26,26,24,0.8)' }, { l: 'AGAINST', v: data.votes.against, c: '#C9A89A' }, { l: 'ABSTAIN', v: data.votes.abstain, c: 'rgba(26,26,24,0.3)' }].map(x => (
                <div key={x.l}>
                  <div style={{ fontSize: '20px', fontWeight: 200, color: x.c }}>{x.v}</div>
                  <div style={{ fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginTop: '1px' }}>{x.l}</div>
                </div>
              ))}
            </div>

            {/* Party table — clickable, synced with hemicycle */}
            <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '8px' }}>
              Party Breakdown
            </div>
            {parties.map(p => (
              <div
                key={p.name}
                onClick={() => toggleParty(p.name)}
                style={{
                  padding: '7px 0', borderBottom: '1px solid rgba(26,26,24,0.06)', cursor: 'pointer',
                  opacity: selectedParty && selectedParty !== p.name ? 0.35 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 400, color: '#1A1A18' }}>{p.name}</span>
                  <span style={{ fontSize: '9px', color: 'rgba(26,26,24,0.38)' }}>{p.total}</span>
                </div>
                <div style={{ display: 'flex', height: '3px', gap: '1px', marginBottom: '3px' }}>
                  <div style={{ width: `${(p.for / p.total) * 100}%`, background: 'rgba(26,26,24,0.72)' }} />
                  <div style={{ width: `${(p.against / p.total) * 100}%`, background: '#C9A89A' }} />
                  <div style={{ width: `${(p.abstain / p.total) * 100}%`, background: 'rgba(26,26,24,0.1)' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontSize: '8.5px', color: 'rgba(26,26,24,0.55)' }}>{p.for} for</span>
                  <span style={{ fontSize: '8.5px', color: '#C9A89A' }}>{p.against} against</span>
                  {p.abstain > 0 && <span style={{ fontSize: '8.5px', color: 'rgba(26,26,24,0.28)' }}>{p.abstain} abs</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MEP grid */}
        <div style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.38)', marginBottom: '12px' }}>
            Key MEPs
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1px', background: 'rgba(26,26,24,0.07)' }}>
            {data.keyMEPs.map(mep => {
              const vc = mep.vote === 'FOR' ? 'rgba(26,26,24,0.8)' : mep.vote === 'AGAINST' ? '#C9A89A' : 'rgba(26,26,24,0.35)';
              const bc = mep.vote === 'FOR' ? 'rgba(26,26,24,0.22)' : mep.vote === 'AGAINST' ? 'rgba(201,168,154,0.5)' : 'rgba(26,26,24,0.1)';
              const dimmed = !!selectedParty && !data.partyBreakdown.find(p => p.party === mep.party && p.party === selectedParty);
              return (
                <div key={mep.name} style={{ background: '#F0EDE8', padding: '14px 16px', display: 'flex', gap: '10px', opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.22s' }}>
                  <span style={{ fontSize: '7px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: vc, border: `1px solid ${bc}`, padding: '2px 6px', flexShrink: 0, marginTop: '2px', height: 'fit-content' }}>
                    {mep.vote}
                  </span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 300, color: '#1A1A18' }}>{mep.name}</div>
                    <div style={{ fontSize: '9.5px', color: 'rgba(26,26,24,0.42)', marginTop: '2px' }}>{mep.party} · {mep.country}</div>
                    {mep.note && <div style={{ fontSize: '9.5px', color: 'rgba(26,26,24,0.38)', fontStyle: 'italic', marginTop: '3px' }}>{mep.note}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
