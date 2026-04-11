export function Header({ onLogoClick }: { onLogoClick?: () => void }) {
  return (
    <header
      style={{
        height: '48px',
        borderBottom: '1px solid rgba(26,26,24,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        flexShrink: 0,
      }}
    >
      {/* Wordmark */}
      <div
        onClick={onLogoClick}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '12px',
          cursor: onLogoClick ? 'pointer' : 'default',
        }}
      >
        <span
          style={{
            fontSize: '20px',
            fontWeight: 200,
            letterSpacing: '0.18em',
            color: '#1A1A18',
          }}
        >
          ALETHEIA
        </span>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 400,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(26,26,24,0.4)',
          }}
        >
          EU Political Intelligence
        </span>
      </div>

      {/* Right label */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(26,26,24,0.35)',
          }}
        >
          A (01)
        </span>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 400,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(26,26,24,0.25)',
          }}
        >
          Truth, unconcealed.
        </span>
      </div>
    </header>
  );
}
