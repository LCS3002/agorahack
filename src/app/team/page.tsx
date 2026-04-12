export const metadata = { title: 'Aletheia — Team' };

const STACK = [
  ['LLM',         'TNG R1T2-Chimera-Speed — routing, agent briefing, entity extraction'],
  ['Frontend',    'Next.js 16 · React · Recharts · SSE streaming'],
  ['Voting data', 'HowTheyVote snapshot (1,995 EP votes) · EP Open Data API v2'],
  ['Lobbying',    'EU Transparency Register — 17,081 registered organisations'],
  ['News',        'Valyu API (primary) · GDELT v2 (fallback)'],
  ['MEP profiles','EP API v2 · Wikipedia entity pre-fetch'],
];

const TEAM = [
  {
    name: 'Yi-Chen Hsu',
    study: 'Computer Science',
    at: 'NTHU · exchange at TUM',
    github: 'https://github.com/gunjyo0817',
    linkedin: 'https://www.linkedin.com/in/yichenhsu/',
  },
  {
    name: 'Miloš Preradović',
    study: 'Economics and Engineering',
    at: 'TU Vienna',
    github: 'https://github.com/prmilos',
    linkedin: 'https://www.linkedin.com/in/milo%C5%A1-preradovi%C4%87-9a0329387/',
  },
  {
    name: 'Lorenz Huber',
    study: 'Architecture',
    at: 'UCL · London',
    github: 'https://github.com/LCS3002',
    linkedin: 'https://www.linkedin.com/in/huberlorenz',
  },
];

const GH_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const LI_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export default function TeamPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#F0EDE8',
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
    }}>

      {/* Header */}
      <div style={{ marginBottom: '64px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '10px' }}>
          AgoraHacks 2026
        </div>
        <div style={{ fontSize: '36px', fontWeight: 200, color: '#1A1A18', letterSpacing: '0.08em' }}>
          ALETHEIA
        </div>
        <div style={{ fontSize: '12px', fontWeight: 300, color: 'rgba(26,26,24,0.45)', marginTop: '8px', letterSpacing: '0.04em' }}>
          EU Political Intelligence · Truth through data
        </div>
      </div>

      {/* Team grid */}
      <div style={{ width: '100%', maxWidth: '840px', marginBottom: '64px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '20px' }}>
          The Team
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1px',
          background: 'rgba(26,26,24,0.08)',
        }}>
          {TEAM.map((p) => (
            <div key={p.name} style={{ background: '#F0EDE8', padding: '36px 32px 32px' }}>
              <div style={{ fontSize: '20px', fontWeight: 300, color: '#1A1A18', marginBottom: '10px', letterSpacing: '-0.2px' }}>
                {p.name}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 300, color: 'rgba(26,26,24,0.5)', lineHeight: 1.7, marginBottom: '28px', whiteSpace: 'pre-line' }}>
                {p.study}{'\n'}{p.at}
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <a
                  href={p.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(26,26,24,0.35)', fontSize: '11px', fontWeight: 400, letterSpacing: '0.06em', textDecoration: 'none' }}
                >
                  {LI_ICON} LinkedIn
                </a>
                {p.github && (
                  <a
                    href={p.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(26,26,24,0.35)', fontSize: '11px', fontWeight: 400, letterSpacing: '0.06em', textDecoration: 'none' }}
                  >
                    {GH_ICON} GitHub
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div style={{ width: '100%', maxWidth: '840px', marginBottom: '64px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.35)', marginBottom: '20px' }}>
          Tech Stack
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {STACK.map(([label, value], i) => (
            <div key={label} style={{
              display: 'flex',
              gap: '24px',
              padding: '10px 0',
              borderBottom: i < STACK.length - 1 ? '1px solid rgba(26,26,24,0.07)' : 'none',
              alignItems: 'baseline',
            }}>
              <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.38)', minWidth: '110px', flexShrink: 0 }}>
                {label}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 300, color: '#1A1A18' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer links */}
      <div style={{ fontSize: '10px', color: 'rgba(26,26,24,0.3)', letterSpacing: '0.06em', textAlign: 'center', lineHeight: 2 }}>
        <a href="https://github.com/LCS3002/agorahack" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
          github.com/LCS3002/agorahack
        </a>
        {'  ·  '}
        <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
          aletheia.app
        </a>
      </div>

    </main>
  );
}
