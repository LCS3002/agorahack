'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VoteResult, PartyVote, MEPProfile } from '@/lib/types';

const PARTY_ORDER   = ['The Left', 'Greens', 'S&D', 'Renew', 'EPP', 'ECR', 'ID', 'ESN'];
const FOR_COLOR     = 'rgba(26,26,24,0.82)';
const AGAINST_COLOR = '#C9A89A';
const ABSTAIN_COLOR = 'rgba(26,26,24,0.13)';
const STATUS_COLORS = { PASSED: 'rgba(26,26,24,0.5)', REJECTED: '#C9A89A', PENDING: '#8A8882' };

type DrillLevel = 'overview' | 'party' | 'mep';

interface Props { data: VoteResult; onCollapse: () => void; }

const slide = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
  exit:    { opacity: 0, x: -10, transition: { duration: 0.16 } },
};

// ── Hemicycle ─────────────────────────────────────────────────────────────────
function Hemicycle({
  partyBreakdown,
  selectedParty,
  onSelectParty,
}: {
  partyBreakdown: PartyVote[];
  selectedParty: string | null;
  onSelectParty: (p: string) => void;
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
    const radii  = Array.from({ length: N_ROWS }, (_, i) => R_MIN + i * R_STEP);
    const radSum = radii.reduce((s, r) => s + r, 0);
    const counts = radii.map(r => Math.round((r / radSum) * total));
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
    <svg viewBox="0 0 600 295" width="100%" style={{ display: 'block', cursor: 'default' }}>
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
      {/* Invisible click regions per party arc — simplified as full SVG click */}
    </svg>
  );
}

// ── Network Graph ─────────────────────────────────────────────────────────────
function NetworkGraph({ profile }: { profile: MEPProfile }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const W = 520, H = 300;
  const cx = W / 2, cy = H / 2 + 10;
  const ringR = 118;

  const orgs = profile.lobbyConnections;
  const maxMtg = Math.max(...orgs.map(o => o.meetings), 1);

  const nodes = orgs.map((org, i) => {
    const angle = orgs.length === 1
      ? -Math.PI / 2
      : (Math.PI * 2 * i / orgs.length) - Math.PI / 2;
    return { ...org, x: cx + ringR * Math.cos(angle), y: cy + ringR * Math.sin(angle) };
  });

  const voteC = profile.vote === 'FOR' ? FOR_COLOR : profile.vote === 'AGAINST' ? AGAINST_COLOR : 'rgba(26,26,24,0.35)';

  return (
    <div>
      <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '12px' }}>
        Lobby Connection Network
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {/* Edges */}
        {nodes.map((n, i) => {
          const sw = 0.6 + (n.meetings / maxMtg) * 3.2;
          const isHov = hovered === n.org;
          return (
            <line
              key={`e${i}`}
              x1={cx} y1={cy} x2={n.x} y2={n.y}
              stroke={isHov ? '#C9A89A' : 'rgba(26,26,24,0.12)'}
              strokeWidth={isHov ? sw + 1 : sw}
              style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
            />
          );
        })}

        {/* Center node — MEP */}
        <circle cx={cx} cy={cy} r={20} fill="rgba(26,26,24,0.88)" />
        <circle cx={cx} cy={cy} r={20} fill="none" stroke={voteC} strokeWidth="1.5" opacity={0.6} />
        <text x={cx} y={cy - 1} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: '7px', fill: '#F0EDE8', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {profile.name.split(' ').slice(-1)[0]}
        </text>

        {/* Org nodes */}
        {nodes.map((n, i) => {
          const r = 8 + (n.meetings / maxMtg) * 10;
          const isHov = hovered === n.org;
          return (
            <g key={`n${i}`}
              onMouseEnter={() => setHovered(n.org)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'default' }}
            >
              <circle cx={n.x} cy={n.y} r={r + 4} fill="transparent" />
              <circle cx={n.x} cy={n.y} r={r}
                fill={isHov ? 'rgba(201,168,154,0.35)' : 'rgba(201,168,154,0.18)'}
                stroke={isHov ? '#C9A89A' : 'rgba(201,168,154,0.5)'}
                strokeWidth="1"
                style={{ transition: 'all 0.18s' }}
              />
              {/* Org label */}
              <text x={n.x} y={n.y - r - 6} textAnchor="middle"
                style={{ fontSize: '7.5px', fill: 'rgba(26,26,24,0.6)', fontFamily: 'inherit' }}>
                {n.org.length > 18 ? n.org.slice(0, 17) + '…' : n.org}
              </text>
              {/* Meeting count */}
              <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: '8px', fill: 'rgba(26,26,24,0.7)', fontFamily: 'inherit', fontWeight: 400 }}>
                {n.meetings}
              </text>
              <text x={n.x} y={n.y + r + 12} textAnchor="middle"
                style={{ fontSize: '6.5px', fill: 'rgba(26,26,24,0.35)', fontFamily: 'inherit', letterSpacing: '0.08em' }}>
                €{n.spend}M · {n.sector}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <text x={12} y={H - 10}
          style={{ fontSize: '7px', fill: 'rgba(26,26,24,0.3)', fontFamily: 'inherit' }}>
          Node size = meeting count · Hover to highlight
        </text>
      </svg>
    </div>
  );
}

// ── MEP Vote Badge ────────────────────────────────────────────────────────────
function VoteBadge({ vote }: { vote: 'FOR' | 'AGAINST' | 'ABSTAIN' }) {
  const c = vote === 'FOR' ? FOR_COLOR : vote === 'AGAINST' ? AGAINST_COLOR : 'rgba(26,26,24,0.3)';
  const bc = vote === 'FOR' ? 'rgba(26,26,24,0.22)' : vote === 'AGAINST' ? 'rgba(201,168,154,0.5)' : 'rgba(26,26,24,0.1)';
  return (
    <span style={{ fontSize: '7px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: c, border: `1px solid ${bc}`, padding: '2px 6px', flexShrink: 0 }}>
      {vote}
    </span>
  );
}

// ── MEP Profile View ──────────────────────────────────────────────────────────
function MEPView({ profile, data }: { profile: MEPProfile; data: VoteResult }) {
  const voteC = profile.vote === 'FOR' ? FOR_COLOR : profile.vote === 'AGAINST' ? AGAINST_COLOR : 'rgba(26,26,24,0.35)';

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: '100%' }}>

        {/* Left: profile card */}
        <div style={{ padding: '28px 24px', borderRight: '1px solid rgba(26,26,24,0.08)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Name + meta */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <VoteBadge vote={profile.vote} />
              {profile.note && (
                <span style={{ fontSize: '8px', color: 'rgba(26,26,24,0.4)', fontStyle: 'italic' }}>{profile.note}</span>
              )}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 200, color: '#1A1A18', lineHeight: 1.2, marginBottom: '4px' }}>{profile.name}</div>
            <div style={{ fontSize: '10px', color: 'rgba(26,26,24,0.45)' }}>
              {profile.nationality} · {profile.party} · b. {profile.bornYear}
            </div>
          </div>

          {/* Bio */}
          <p style={{ fontSize: '12px', fontWeight: 300, color: 'rgba(26,26,24,0.7)', lineHeight: 1.75, margin: 0 }}>
            {profile.bio}
          </p>

          {/* Committees */}
          <div>
            <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '8px' }}>
              Committees
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {profile.committees.map(c => (
                <span key={c} style={{ fontSize: '8.5px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid rgba(26,26,24,0.15)', color: 'rgba(26,26,24,0.55)', padding: '2px 8px' }}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Vote on this law */}
          <div style={{ padding: '14px 16px', border: `1px solid ${voteC}20`, background: `${voteC}06` }}>
            <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '6px' }}>
              Vote on {data.shortName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '20px', fontWeight: 200, color: voteC }}>{profile.vote}</div>
              <div style={{ fontSize: '9px', color: 'rgba(26,26,24,0.4)' }}>{data.date} · {data.committee}</div>
            </div>
          </div>

          {/* Past votes */}
          {profile.pastVotes.length > 0 && (
            <div>
              <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '10px' }}>
                Voting Record
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profile.pastVotes.map((pv, i) => {
                  const vc = pv.vote === 'FOR' ? FOR_COLOR : pv.vote === 'AGAINST' ? AGAINST_COLOR : 'rgba(26,26,24,0.3)';
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(26,26,24,0.06)' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 300, color: '#1A1A18' }}>{pv.law}</div>
                        <div style={{ fontSize: '8.5px', color: 'rgba(26,26,24,0.35)', marginTop: '1px' }}>{pv.year}</div>
                      </div>
                      <span style={{ fontSize: '8px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: vc, flexShrink: 0 }}>{pv.vote}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: network graph */}
        <div style={{ padding: '28px 24px' }}>
          {profile.lobbyConnections.length > 0 ? (
            <NetworkGraph profile={profile} />
          ) : (
            <div style={{ padding: '40px 0', fontSize: '11px', fontWeight: 300, color: 'rgba(26,26,24,0.3)' }}>
              No declared lobbying meetings on record for this file.
            </div>
          )}

          {/* Connections detail list */}
          {profile.lobbyConnections.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '10px' }}>
                Documented Meetings
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {profile.lobbyConnections.map((conn, i) => {
                  const maxMtg = Math.max(...profile.lobbyConnections.map(c => c.meetings));
                  return (
                    <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(26,26,24,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 300, color: '#1A1A18' }}>{conn.org}</span>
                          <span style={{ fontSize: '7.5px', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', border: '1px solid rgba(26,26,24,0.1)', padding: '1px 5px' }}>{conn.sector}</span>
                        </div>
                        <div style={{ height: '2px', background: 'rgba(26,26,24,0.06)' }}>
                          <div style={{ height: '100%', width: `${(conn.meetings / maxMtg) * 100}%`, background: '#C9A89A' }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 200, color: '#1A1A18' }}>{conn.meetings}</div>
                        <div style={{ fontSize: '8px', color: 'rgba(26,26,24,0.4)' }}>meetings</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 200, color: 'rgba(26,26,24,0.6)' }}>€{conn.spend}M</div>
                        <div style={{ fontSize: '8px', color: 'rgba(26,26,24,0.4)' }}>declared</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Party View ────────────────────────────────────────────────────────────────
function PartyView({
  party,
  data,
  onSelectMEP,
}: {
  party: string;
  data: VoteResult;
  onSelectMEP: (mep: MEPProfile) => void;
}) {
  const pv = data.partyBreakdown.find(p => p.party === party);
  const partyMEPs = data.keyMEPs.filter(m => m.party === party);
  const profiles  = (data.mepProfiles ?? []).filter(m => m.party === party);
  const total = pv ? pv.for + pv.against + pv.abstain : 0;

  function getProfile(name: string) {
    return profiles.find(p => p.name === name) ?? null;
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Party stats row */}
      {pv && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid rgba(26,26,24,0.08)' }}>
          {[
            { label: 'Total seats',  value: total.toString() },
            { label: 'Voted for',    value: pv.for.toString(),     color: FOR_COLOR },
            { label: 'Voted against',value: pv.against.toString(), color: AGAINST_COLOR },
            { label: 'Abstained',    value: pv.abstain.toString(), color: 'rgba(26,26,24,0.3)' },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: '18px 22px', borderRight: i < 3 ? '1px solid rgba(26,26,24,0.08)' : 'none' }}>
              <div style={{ fontSize: '26px', fontWeight: 200, color: s.color ?? '#1A1A18', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.38)', marginTop: '5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {pv && (
        <div style={{ display: 'flex', height: '4px' }}>
          <div style={{ width: `${(pv.for / total) * 100}%`,     background: FOR_COLOR }} />
          <div style={{ width: `${(pv.against / total) * 100}%`, background: AGAINST_COLOR }} />
          <div style={{ width: `${(pv.abstain / total) * 100}%`, background: 'rgba(26,26,24,0.1)' }} />
        </div>
      )}

      {/* MEP list */}
      <div style={{ padding: '20px 22px' }}>
        <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.38)', marginBottom: '14px' }}>
          Key MEPs — {party}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {partyMEPs.map(mep => {
            const profile = getProfile(mep.name);
            const hasProfile = profile !== null;
            return (
              <div
                key={mep.name}
                onClick={() => hasProfile && onSelectMEP(profile!)}
                style={{
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(26,26,24,0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: hasProfile ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (hasProfile) (e.currentTarget as HTMLElement).style.background = 'rgba(26,26,24,0.025)'; }}
                onMouseLeave={e => { if (hasProfile) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <VoteBadge vote={mep.vote} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 300, color: '#1A1A18' }}>{mep.name}</span>
                    <span style={{ fontSize: '9px', color: 'rgba(26,26,24,0.38)' }}>{mep.country}</span>
                    {mep.note && <span style={{ fontSize: '9px', color: 'rgba(26,26,24,0.4)', fontStyle: 'italic' }}>{mep.note}</span>}
                  </div>
                  {profile && (
                    <div style={{ fontSize: '9px', color: 'rgba(26,26,24,0.4)', marginTop: '2px' }}>
                      {profile.committees.join(' · ')} · {profile.lobbyConnections.length} lobby connection{profile.lobbyConnections.length !== 1 ? 's' : ''} on file
                    </div>
                  )}
                </div>
                {hasProfile && (
                  <span style={{ fontSize: '8px', color: 'rgba(26,26,24,0.3)', letterSpacing: '0.08em' }}>
                    Profile →
                  </span>
                )}
              </div>
            );
          })}
          {partyMEPs.length === 0 && (
            <div style={{ fontSize: '11px', fontWeight: 300, color: 'rgba(26,26,24,0.3)', padding: '20px 0' }}>
              No key MEPs on record for {party} on this file.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Overview (original hemicycle + party table) ───────────────────────────────
function OverviewView({
  data,
  onDrillParty,
}: {
  data: VoteResult;
  onDrillParty: (party: string) => void;
}) {
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
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', borderBottom: '1px solid rgba(26,26,24,0.08)' }}>

        {/* Hemicycle column */}
        <div style={{ padding: '22px 22px 16px', borderRight: '1px solid rgba(26,26,24,0.08)' }}>
          <div style={{ fontSize: '8px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '10px' }}>
            Hemicycle · {total} seats{selectedParty ? ` · ${selectedParty}` : ''} · click party to drill down
          </div>
          <Hemicycle partyBreakdown={data.partyBreakdown} selectedParty={selectedParty} onSelectParty={toggleParty} />
          <div style={{ display: 'flex', gap: '18px', marginTop: '6px', marginBottom: '14px' }}>
            {[['FOR', FOR_COLOR], ['AGAINST', AGAINST_COLOR], ['ABSTAIN', ABSTAIN_COLOR]].map(([l, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: c }} />
                <span style={{ fontSize: '8px', fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.38)' }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            <button onClick={() => setSelectedParty(null)} style={{ fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${!selectedParty ? 'rgba(26,26,24,0.55)' : 'rgba(26,26,24,0.12)'}`, background: !selectedParty ? 'rgba(26,26,24,0.07)' : 'transparent', color: !selectedParty ? '#1A1A18' : 'rgba(26,26,24,0.4)' }}>
              All
            </button>
            {parties.map(p => (
              <button key={p.name} onClick={() => toggleParty(p.name)} style={{ fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${selectedParty === p.name ? 'rgba(26,26,24,0.55)' : 'rgba(26,26,24,0.1)'}`, background: selectedParty === p.name ? 'rgba(26,26,24,0.07)' : 'transparent', color: selectedParty === p.name ? '#1A1A18' : 'rgba(26,26,24,0.38)' }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Summary + party table */}
        <div style={{ padding: '22px 20px' }}>
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

          {/* Party table — click row to drill in */}
          <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '8px' }}>
            Party Breakdown — click to drill down
          </div>
          {parties.map(p => (
            <div
              key={p.name}
              onClick={() => onDrillParty(p.name)}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,26,24,0.03)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              style={{
                padding: '7px 6px', borderBottom: '1px solid rgba(26,26,24,0.06)', cursor: 'pointer',
                opacity: selectedParty && selectedParty !== p.name ? 0.35 : 1,
                transition: 'opacity 0.2s, background 0.15s',
                borderRadius: '1px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 400, color: '#1A1A18' }}>{p.name}</span>
                  <span style={{ fontSize: '8px', color: 'rgba(26,26,24,0.3)', letterSpacing: '0.06em' }}>→</span>
                </div>
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
            const dimmed = !!selectedParty && mep.party !== selectedParty;
            const profile = (data.mepProfiles ?? []).find(p => p.name === mep.name);
            return (
              <div
                key={mep.name}
                onClick={() => profile && onDrillParty(mep.party)}
                style={{ background: '#F0EDE8', padding: '14px 16px', display: 'flex', gap: '10px', opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.22s', cursor: 'pointer' }}
              >
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
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function VotingExpanded({ data, onCollapse }: Props) {
  const [drillLevel,  setDrillLevel]  = useState<DrillLevel>('overview');
  const [drillParty,  setDrillParty]  = useState<string | null>(null);
  const [drillMEP,    setDrillMEP]    = useState<MEPProfile | null>(null);

  function goToParty(party: string) {
    setDrillParty(party);
    setDrillMEP(null);
    setDrillLevel('party');
  }

  function goToMEP(mep: MEPProfile) {
    setDrillMEP(mep);
    setDrillLevel('mep');
  }

  function goBack() {
    if (drillLevel === 'mep') {
      setDrillLevel('party');
      setDrillMEP(null);
    } else {
      setDrillLevel('overview');
      setDrillParty(null);
    }
  }

  // Breadcrumb
  const crumbs = ['Voting & Parliament'];
  if (drillParty) crumbs.push(drillParty);
  if (drillMEP)   crumbs.push(drillMEP.name);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F0EDE8' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, padding: '11px 22px', borderBottom: '1px solid rgba(26,26,24,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {i > 0 && <span style={{ fontSize: '9px', color: 'rgba(26,26,24,0.25)' }}>›</span>}
              <span style={{
                fontSize: i === 0 ? '8px' : '10px',
                fontWeight: i === crumbs.length - 1 ? 400 : 300,
                letterSpacing: i === 0 ? '0.18em' : '0.04em',
                textTransform: i === 0 ? 'uppercase' : 'none',
                color: i === crumbs.length - 1 ? 'rgba(26,26,24,0.7)' : 'rgba(26,26,24,0.38)',
              }}>
                {c}
              </span>
            </span>
          ))}
        </div>

        {drillLevel !== 'overview' ? (
          <button onClick={goBack} style={{ background: 'none', border: '1px solid rgba(26,26,24,0.14)', cursor: 'pointer', color: 'rgba(26,26,24,0.45)', fontSize: '8.5px', padding: '4px 12px', fontFamily: 'inherit', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ← Back
          </button>
        ) : (
          <button onClick={onCollapse} style={{ background: 'none', border: '1px solid rgba(26,26,24,0.14)', cursor: 'pointer', color: 'rgba(26,26,24,0.45)', fontSize: '8.5px', padding: '4px 12px', fontFamily: 'inherit', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ← Back
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          {drillLevel === 'overview' && (
            <motion.div key="overview" {...slide} style={{ height: '100%' }}>
              <OverviewView data={data} onDrillParty={goToParty} />
            </motion.div>
          )}
          {drillLevel === 'party' && drillParty && (
            <motion.div key={`party-${drillParty}`} {...slide} style={{ height: '100%' }}>
              <PartyView party={drillParty} data={data} onSelectMEP={goToMEP} />
            </motion.div>
          )}
          {drillLevel === 'mep' && drillMEP && (
            <motion.div key={`mep-${drillMEP.name}`} {...slide} style={{ height: '100%' }}>
              <MEPView profile={drillMEP} data={data} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
