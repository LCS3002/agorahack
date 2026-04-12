'use client';

import { useMemo, useState, useEffect } from 'react';
import type { VoteResult, PartyVote } from '@/lib/types';

// ── Constants ─────────────────────────────────────────────────────────────────
// EU Parliament political order, left → right
const PARTY_ORDER = ['The Left', 'Greens', 'S&D', 'Renew', 'EPP', 'ECR', 'ID', 'ESN'];

const FOR_COLOR     = 'rgba(26,26,24,0.82)';
const AGAINST_COLOR = '#C9A89A';
const ABSTAIN_COLOR = 'rgba(26,26,24,0.14)';

const STATUS_COLORS: Record<VoteResult['status'], string> = {
  PASSED:   'rgba(26,26,24,0.5)',
  REJECTED: '#C9A89A',
  PENDING:  '#8A8882',
};

// ── Hemicycle ─────────────────────────────────────────────────────────────────
function Hemicycle({ partyBreakdown }: { partyBreakdown: PartyVote[] }) {
  // 1. Build flat seat list in political left→right order
  const seats = useMemo(() => {
    const ordered: PartyVote[] = [
      ...PARTY_ORDER.map(name => partyBreakdown.find(p => p.party === name)).filter(Boolean) as PartyVote[],
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

  // 2. Compute SVG circle positions
  const positions = useMemo(() => {
    const total = seats.length;
    if (total === 0) return [];

    const CX = 200, CY = 210;
    const N_ROWS = 11;
    const R_MIN  = 44;
    const R_STEP = 14;

    // Seats per row ∝ radius (longer arc = more seats)
    const radii      = Array.from({ length: N_ROWS }, (_, i) => R_MIN + i * R_STEP);
    const radiusSum  = radii.reduce((s, r) => s + r, 0);
    const rowCounts  = radii.map(r => Math.round((r / radiusSum) * total));
    // Fix rounding drift on last row
    rowCounts[N_ROWS - 1] += total - rowCounts.reduce((s, c) => s + c, 0);

    const pts: { x: number; y: number; color: string; party: string }[] = [];
    let idx = 0;

    for (let row = 0; row < N_ROWS; row++) {
      const r = radii[row];
      const n = rowCounts[row];
      for (let j = 0; j < n && idx < total; j++) {
        // Map j → angle: π (far left) … 0 (far right)
        const angle = Math.PI * (1 - (j + 0.5) / n);
        pts.push({
          x: CX + r * Math.cos(angle),
          y: CY - r * Math.sin(angle),
          color: seats[idx].color,
          party: seats[idx].party,
        });
        idx++;
      }
    }
    return pts;
  }, [seats]);

  // 3. Party strip: proportional widths in political order
  const partyStrip = useMemo(() => {
    const ordered: PartyVote[] = [
      ...PARTY_ORDER.map(name => partyBreakdown.find(p => p.party === name)).filter(Boolean) as PartyVote[],
      ...partyBreakdown.filter(p => !PARTY_ORDER.includes(p.party)),
    ];
    const total = ordered.reduce((s, p) => s + p.for + p.against + p.abstain, 0);
    return ordered.map(p => ({
      party: p.party,
      pct: ((p.for + p.against + p.abstain) / total) * 100,
    }));
  }, [partyBreakdown]);

  return (
    <div>
      <div className="label-xs" style={{ marginBottom: '8px' }}>Hemicycle · Vote distribution</div>

      {/* SVG hemicycle */}
      <svg
        viewBox="0 0 400 216"
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
        aria-label="EU Parliament hemicycle vote map"
      >
        {/* Faint base line */}
        <line x1="6" y1="210" x2="394" y2="210" stroke="rgba(26,26,24,0.08)" strokeWidth="1" />

        {/* Seat dots */}
        {positions.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={1.75}
            fill={p.color}
          />
        ))}
      </svg>

      {/* Party proportion strip */}
      <div style={{
        display: 'flex',
        height: '3px',
        gap: '1px',
        marginTop: '6px',
        background: 'rgba(26,26,24,0.06)',
      }}>
        {partyStrip.map(({ party, pct }) => (
          <div
            key={party}
            title={party}
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'rgba(26,26,24,0.28)',
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* Party labels */}
      <div style={{ display: 'flex', gap: '1px', marginTop: '4px' }}>
        {partyStrip.map(({ party, pct }) => (
          <div
            key={party}
            style={{
              width: `${pct}%`,
              overflow: 'hidden',
              flexShrink: 0,
              textAlign: 'center',
            }}
          >
            <span style={{
              fontSize: '7px',
              color: 'rgba(26,26,24,0.35)',
              letterSpacing: '0.06em',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>
              {pct > 6 ? party : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Vote legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
        {([
          ['FOR',     FOR_COLOR],
          ['AGAINST', AGAINST_COLOR],
          ['ABSTAIN', ABSTAIN_COLOR],
        ] as const).map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{
              fontSize: '8px',
              fontWeight: 500,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              color: 'rgba(26,26,24,0.4)',
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── VotingCard ────────────────────────────────────────────────────────────────
interface VotingCardProps {
  data: VoteResult;
}

export function VotingCard({ data }: VotingCardProps) {
  const total    = data.votes.for + data.votes.against + data.votes.abstain;
  const hasTally = total > 0;
  const forPct   = hasTally ? (data.votes.for     / total) * 100 : 0;
  const agnPct   = hasTally ? (data.votes.against / total) * 100 : 0;
  const absPct   = hasTally ? (data.votes.abstain / total) * 100 : 0;

  const [rollCallCount, setRollCallCount] = useState<number | null>(null);

  useEffect(() => {
    if (data.howTheyVoteVoteId == null) {
      setRollCallCount(null);
      return;
    }
    setRollCallCount(null);
    let cancelled = false;
    fetch(`/api/voting-rollcall?voteId=${data.howTheyVoteVoteId}&countOnly=1`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (cancelled) return;
        if (typeof j?.count === 'number') setRollCallCount(j.count);
        else setRollCallCount(null);
      })
      .catch(() => {
        if (!cancelled) setRollCallCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [data.howTheyVoteVoteId]);

  const mepSectionLabel =
    rollCallCount != null && rollCallCount > data.keyMEPs.length
      ? `Key MEPs · full roll-call ${rollCallCount.toLocaleString()} MEPs (expand panel for list)`
      : rollCallCount != null && rollCallCount > 0
        ? `Key MEPs · ${rollCallCount.toLocaleString()} MEPs on file`
        : 'Key MEPs';

  return (
    <div className="aether-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="label-xs" style={{ marginBottom: '6px' }}>Voting Record</div>
          <div style={{ fontSize: '14px', fontWeight: 300, color: '#1A1A18', lineHeight: 1.3 }}>
            {data.lawName}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(26,26,24,0.4)', marginTop: '3px', letterSpacing: '0.03em' }}>
            {data.committee} · {data.date} · {data.reference}
          </div>
        </div>
        <span style={{
          border: '1px solid',
          borderColor: STATUS_COLORS[data.status],
          color: STATUS_COLORS[data.status],
          fontSize: '8px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          padding: '3px 9px',
          flexShrink: 0,
          marginTop: '2px',
        }}>
          {data.status}
        </span>
      </div>

      {/* ── Vote totals + stacked bar ───────────────────────────────────── */}
      {hasTally ? (
        <div>
          <div style={{ display: 'flex', height: '6px', width: '100%', gap: '1px', marginBottom: '10px' }}>
            <div style={{ width: `${forPct}%`,  background: 'rgba(26,26,24,0.7)',  transition: 'width 0.6s ease' }} />
            <div style={{ width: `${agnPct}%`,  background: '#C9A89A',             transition: 'width 0.6s ease' }} />
            <div style={{ width: `${absPct}%`,  background: 'rgba(26,26,24,0.12)', transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            {[
              { label: 'FOR',     value: data.votes.for,     color: 'rgba(26,26,24,0.8)' },
              { label: 'AGAINST', value: data.votes.against, color: '#C9A89A' },
              { label: 'ABSTAIN', value: data.votes.abstain, color: 'rgba(26,26,24,0.3)' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: '20px', fontWeight: 200, color: item.color, lineHeight: 1 }}>
                  {item.value}
                </div>
                <div className="label-xs" style={{ marginTop: '3px' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '10px', color: 'rgba(26,26,24,0.38)', fontStyle: 'italic', letterSpacing: '0.03em' }}>
          Roll-call tallies not available for this vote — see summary for reported result.
        </div>
      )}

      {/* ── Hemicycle ─────────────────────────────────────────────────── */}
      <Hemicycle partyBreakdown={data.partyBreakdown} />

      {/* ── Key MEPs ──────────────────────────────────────────────────── */}
      <div>
        <div className="label-xs" style={{ marginBottom: '10px', lineHeight: 1.45 }}>{mepSectionLabel}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {data.keyMEPs.map((mep) => (
            <div
              key={mep.memberId != null ? `m${mep.memberId}` : mep.name}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={{
                  fontSize: '7.5px',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color:
                    mep.vote === 'FOR'     ? 'rgba(26,26,24,0.8)' :
                    mep.vote === 'AGAINST' ? '#C9A89A' :
                    'rgba(26,26,24,0.35)',
                  border: '1px solid',
                  borderColor:
                    mep.vote === 'FOR'     ? 'rgba(26,26,24,0.25)' :
                    mep.vote === 'AGAINST' ? 'rgba(201,168,154,0.5)' :
                    'rgba(26,26,24,0.12)',
                  padding: '1px 6px',
                  flexShrink: 0,
                }}>
                  {mep.vote}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 300, color: '#1A1A18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {mep.name}
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(26,26,24,0.38)', whiteSpace: 'nowrap' }}>
                  {mep.party} · {mep.country}
                </span>
              </div>
              {mep.note && (
                <span style={{ fontSize: '9.5px', color: 'rgba(26,26,24,0.38)', fontStyle: 'italic', textAlign: 'right', flexShrink: 0 }}>
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
