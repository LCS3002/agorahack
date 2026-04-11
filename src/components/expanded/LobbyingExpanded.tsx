'use client';

import { useState, useMemo } from 'react';
import type { LobbyingResult } from '@/lib/types';

interface Props { data: LobbyingResult; onCollapse: () => void; }

export function LobbyingExpanded({ data, onCollapse }: Props) {
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);

  const sectors = useMemo(() => {
    const s = [...new Set(data.organizations.map(o => o.sector))];
    return s;
  }, [data.organizations]);

  const filtered = sectorFilter
    ? data.organizations.filter(o => o.sector === sectorFilter)
    : data.organizations;

  const maxSpend = Math.max(...data.organizations.map(o => o.spend));
  const proxyIndexSum = data.organizations.reduce((s, o) => s + o.meetings, 0);
  const registerPeople = data.organizations.some(o => o.peopleInvolved !== undefined);
  const peopleSum = data.organizations.reduce((s, o) => s + (o.peopleInvolved ?? 0), 0);
  const signalN = data.partialConflicts?.length ?? 0;

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
            Lobbying & Money
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

        {/* Headline stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: '1px solid rgba(26,26,24,0.08)',
        }}>
          {[
            { label: 'Total Declared Spend', value: `€${data.totalDeclaredSpend.toFixed(1)}M` },
            {
              label: registerPeople ? 'People (decl., Σ)' : 'Total Meetings Logged',
              value: registerPeople ? peopleSum.toString() : proxyIndexSum.toString(),
            },
            { label: 'Organisations', value: data.organizations.length.toString() },
            { label: 'Flags / Signals', value: `${data.conflictFlags.length} / ${signalN}` },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              padding: '20px 24px',
              borderRight: i < 3 ? '1px solid rgba(26,26,24,0.08)' : 'none',
            }}>
              <div style={{ fontSize: '28px', fontWeight: 200, color: '#1A1A18', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '8px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.38)', marginTop: '6px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main grid: org list + conflict analysis */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px' }}>

          {/* Left: Org list with sector filter */}
          <div style={{ padding: '20px 22px', borderRight: '1px solid rgba(26,26,24,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.38)' }}>
                Actors by Declared Spend
              </div>
              {/* Sector filter chips */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setSectorFilter(null)}
                  style={{
                    fontSize: '7px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '2px 8px', fontFamily: 'inherit', cursor: 'pointer',
                    border: `1px solid ${!sectorFilter ? 'rgba(26,26,24,0.5)' : 'rgba(26,26,24,0.1)'}`,
                    background: !sectorFilter ? 'rgba(26,26,24,0.06)' : 'transparent',
                    color: !sectorFilter ? '#1A1A18' : 'rgba(26,26,24,0.38)',
                    transition: 'all 0.15s',
                  }}
                >
                  All
                </button>
                {sectors.map(s => (
                  <button
                    key={s}
                    onClick={() => setSectorFilter(sectorFilter === s ? null : s)}
                    style={{
                      fontSize: '7px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '2px 8px', fontFamily: 'inherit', cursor: 'pointer',
                      border: `1px solid ${sectorFilter === s ? 'rgba(26,26,24,0.5)' : 'rgba(26,26,24,0.1)'}`,
                      background: sectorFilter === s ? 'rgba(26,26,24,0.06)' : 'transparent',
                      color: sectorFilter === s ? '#1A1A18' : 'rgba(26,26,24,0.38)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map(org => {
                const intensity = org.meetings / (org.spend || 1); // proxy “access units” per €M for register rows
                return (
                  <div key={org.name} style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(26,26,24,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 500, color: 'rgba(26,26,24,0.3)', width: '20px', textAlign: 'right', flexShrink: 0 }}>
                          {String(org.rank).padStart(2, '0')}.
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 300, color: '#1A1A18' }}>{org.name}</span>
                        <span style={{ fontSize: '7.5px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.32)', border: '1px solid rgba(26,26,24,0.1)', padding: '1px 5px' }}>
                          {org.sector}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', fontWeight: 400, color: '#1A1A18' }}>€{org.spend.toFixed(2)}M</div>
                          <div style={{ fontSize: '8px', color: 'rgba(26,26,24,0.35)' }}>
                            {org.peopleInvolved != null
                              ? `${org.peopleInvolved} ppl (decl.) · est. ${org.meetings}`
                              : `${org.meetings} meetings`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Spend bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '28px' }}>
                      <div style={{ flex: 1, height: '4px', background: 'rgba(26,26,24,0.06)' }}>
                        <div style={{ height: '100%', width: `${(org.spend / maxSpend) * 100}%`, background: 'rgba(26,26,24,0.4)', transition: 'width 0.4s ease' }} />
                      </div>
                      {/* Intensity score */}
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <span style={{ fontSize: '8px', color: 'rgba(26,26,24,0.35)', letterSpacing: '0.06em' }}>
                          {intensity.toFixed(1)}×
                        </span>
                        <span style={{ fontSize: '7px', color: 'rgba(26,26,24,0.25)', marginLeft: '3px' }}>
                          {registerPeople ? 'proxy/€M' : 'intensity'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Intensity note */}
            <div style={{ marginTop: '16px', fontSize: '9px', fontWeight: 300, color: 'rgba(26,26,24,0.3)', lineHeight: 1.6 }}>
              {registerPeople
                ? '“People” = register-declared headcount/FTE where available. The est. figure is a spend-based access proxy, not EP meeting logs. Ratio = proxy per €1M declared spend.'
                : 'Intensity = meetings per €1M declared spend. High intensity may indicate undeclared spend or disproportionate access relative to declared figures.'}
            </div>
          </div>

          {/* Right: Conflict analysis */}
          <div style={{ padding: '20px 20px' }}>
            {signalN > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.38)', marginBottom: '10px' }}>
                  Heuristic signals (not proven conflicts)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(data.partialConflicts ?? []).map((s) => (
                    <div key={s.label} style={{ border: '1px solid rgba(26,26,24,0.1)', padding: '12px 14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 400, color: '#1A1A18' }}>{s.label}</div>
                      <div style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(26,26,24,0.35)', marginTop: '4px' }}>
                        {s.severity} · partial
                      </div>
                      <p style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(26,26,24,0.55)', lineHeight: 1.55, margin: '8px 0 0' }}>{s.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: data.conflictFlags.length > 0 ? '#C9A89A' : 'rgba(26,26,24,0.38)', marginBottom: '14px' }}>
              {data.conflictFlags.length > 0 ? `⚠ ${data.conflictFlags.length} Conflict Flag${data.conflictFlags.length > 1 ? 's' : ''}` : 'Scenario conflict flags'}
            </div>

            {data.conflictFlags.length === 0 ? (
              <p style={{ fontSize: '11px', fontWeight: 300, color: 'rgba(26,26,24,0.35)', lineHeight: 1.65 }}>
                No documented conflict flags for this topic in the period {data.period}.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.conflictFlags.map((flag, i) => {
                  const org = data.organizations.find(o => o.name === flag.lobbyist);
                  const accessScore = org ? (flag.meetings / org.meetings * 100).toFixed(0) : null;
                  const orgUsesProxy = org != null && org.peopleInvolved !== undefined;
                  return (
                    <div key={i} style={{ border: '1px solid rgba(201,168,154,0.3)', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 300, color: '#1A1A18' }}>{flag.mepName}</div>
                          <div style={{ fontSize: '9.5px', color: 'rgba(26,26,24,0.4)', marginTop: '1px' }}>{flag.party}</div>
                        </div>
                        <span style={{ fontSize: '7.5px', letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(201,168,154,0.4)', color: '#C9A89A', padding: '2px 7px', flexShrink: 0 }}>
                          {flag.votedFor ? 'Voted FOR' : 'Voted AGAINST'}
                        </span>
                      </div>

                      {/* Meeting + spend detail */}
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 200, color: '#1A1A18' }}>{flag.meetings}</div>
                          <div style={{ fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)' }}>meetings</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 200, color: '#1A1A18' }}>€{flag.amount}M</div>
                          <div style={{ fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)' }}>declared spend</div>
                        </div>
                        {accessScore && (
                          <div>
                            <div style={{ fontSize: '18px', fontWeight: 200, color: '#C9A89A' }}>{accessScore}%</div>
                            <div style={{ fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)' }}>
                              of {flag.lobbyist} {orgUsesProxy ? 'access proxy' : 'mtgs'}
                            </div>
                          </div>
                        )}
                      </div>

                      <p style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(26,26,24,0.55)', lineHeight: 1.6, margin: 0 }}>
                        {flag.mepName} held {flag.meetings} documented meetings with {flag.lobbyist}
                        {' '}(declared spend: €{flag.amount}M) and subsequently voted{' '}
                        <strong style={{ fontWeight: 400 }}>{flag.votedFor ? 'in favour of' : 'against'}</strong> the legislation.
                        {accessScore &&
                          (orgUsesProxy
                            ? ` They map to ${accessScore}% of ${flag.lobbyist}'s modelled access index (scenario MEP count vs org proxy).`
                            : ` They accounted for ${accessScore}% of all ${flag.lobbyist}'s logged parliamentary access on this file.`)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Registry link */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(26,26,24,0.07)' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.3)', marginBottom: '6px' }}>
                Period
              </div>
              <div style={{ fontSize: '12px', fontWeight: 300, color: 'rgba(26,26,24,0.6)' }}>{data.period}</div>
              <div style={{ fontSize: '8.5px', color: 'rgba(26,26,24,0.28)', marginTop: '4px' }}>
                Source: EU Transparency Register
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
