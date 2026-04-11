import Image from 'next/image';

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
          alignItems: 'center',
          gap: '10px',
          cursor: onLogoClick ? 'pointer' : 'default',
        }}
      >
        <Image
          src="/logo_a.png"
          alt=""
          width={36}
          height={36}
          style={{ objectFit: 'contain' }}
          priority
        />
        <div style={{ width: 7, height: 7, background: '#C9A89A', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span
            style={{
              fontSize: '20px',
              fontWeight: 200,
              letterSpacing: '0.18em',
              color: '#1A1A18',
              lineHeight: 1,
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
              lineHeight: 1,
            }}
          >
            EU Political Intelligence
          </span>
        </div>
      </div>

    </header>
  );
}
