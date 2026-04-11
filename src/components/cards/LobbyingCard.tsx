'use client';

import type { LobbyingResult } from '@/lib/types';

interface LobbyingCardProps {
  data: LobbyingResult;
}

export function LobbyingCard({ data }: LobbyingCardProps) {
  const maxSpend = Math.max(...data.organizations.map(o => o.spend));
  const registerPeople = data.organizations.some(o => o.peopleInvolved !== undefined);
  const peopleSum = data.organizations.reduce((s, o) => s + (o.peopleInvolved ?? 0), 0);
  const proxySum = data.organizations.reduce((s, o) => s + o.meetings, 0);

  return (
    <div className="aether-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Header */}
      <div>
        <div className="label-xs" style={{ marginBottom: '6px' }}>Money &amp; Influence</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: 300, color: '#1A1A18', lineHeight: 1.3 }}>
            {data.topic}
          </div>
        </div>
        <div style={{ marginTop: '8px', display: 'flex', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 200, color: '#1A1A18' }}>
              €{data.totalDeclaredSpend.toFixed(1)}M
            </div>
            <div style={{ fontSize: '8px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.4)', marginTop: '1px' }}>
              Total Declared Spend
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 200, color: '#1A1A18' }}>
              {registerPeople ? peopleSum : proxySum}
            </div>
            <div style={{ fontSize: '8px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.4)', marginTop: '1px' }}>
              {registerPeople ? 'People (decl., Σ)' : 'Total Meetings'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 200, color: '#1A1A18' }}>
              {data.period}
            </div>
            <div style={{ fontSize: '8px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.4)', marginTop: '1px' }}>
              Period
            </div>
          </div>
        </div>
      </div>

      {/* Ranked organizations */}
      <div>
        <div className="label-xs" style={{ marginBottom: '10px' }}>Top Actors by Declared Spend</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.organizations.map((org) => (
            <div key={org.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    color: 'rgba(26,26,24,0.35)',
                    width: '16px',
                  }}>
                    {String(org.rank).padStart(2, '0')}.
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 300, color: '#1A1A18' }}>{org.name}</span>
                  <span style={{
                    fontSize: '8px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(26,26,24,0.35)',
                    border: '1px solid rgba(26,26,24,0.12)',
                    padding: '1px 5px',
                  }}>
                    {org.sector}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 300, color: 'rgba(26,26,24,0.65)' }}>
                    {org.peopleInvolved != null
                      ? `${org.peopleInvolved} ppl · est. ${org.meetings}`
                      : `${org.meetings} mtgs`}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 400, color: '#1A1A18' }}>
                    €{org.spend.toFixed(2)}M
                  </span>
                </div>
              </div>
              {/* Proportional bar */}
              <div style={{ height: '3px', background: 'rgba(26,26,24,0.07)' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(org.spend / maxSpend) * 100}%`,
                    background: 'rgba(26,26,24,0.35)',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conflict flags */}
      {(data.partialConflicts?.length ?? 0) > 0 && (
        <div>
          <div className="label-xs" style={{ marginBottom: '10px', color: 'rgba(26,26,24,0.45)' }}>
            Heuristic signals (partial)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(data.partialConflicts ?? []).map((s) => (
              <div
                key={s.label}
                style={{
                  border: '1px solid rgba(26,26,24,0.1)',
                  padding: '8px 10px',
                  fontSize: '10px',
                  fontWeight: 300,
                  color: 'rgba(26,26,24,0.6)',
                  lineHeight: 1.45,
                }}
              >
                <span style={{ fontWeight: 500, color: '#1A1A18' }}>{s.label}</span>
                <span style={{ fontSize: '8px', marginLeft: '6px', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)' }}>
                  {s.severity}
                </span>
                <div style={{ marginTop: '4px' }}>{s.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.conflictFlags.length > 0 && (
        <div>
          <div className="label-xs" style={{ marginBottom: '10px', color: '#C9A89A' }}>
            ⚠ Conflict Flags
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.conflictFlags.map((flag) => (
              <div
                key={`${flag.mepName}-${flag.lobbyist}`}
                style={{
                  border: '1px solid rgba(201,168,154,0.35)',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 400, color: '#1A1A18' }}>
                    {flag.mepName}
                  </span>
                  <span style={{
                    fontSize: '8px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(201,168,154,0.4)',
                    color: '#C9A89A',
                    padding: '1px 6px',
                  }}>
                    {flag.party}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(26,26,24,0.55)', lineHeight: 1.5 }}>
                  {flag.meetings} meetings with {flag.lobbyist} (€{flag.amount}M) → voted{' '}
                  <span style={{ color: flag.votedFor ? 'rgba(26,26,24,0.8)' : '#C9A89A', fontWeight: 400 }}>
                    {flag.votedFor ? 'FOR' : 'AGAINST'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
