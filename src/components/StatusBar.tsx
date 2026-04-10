import type { ModuleType } from '@/lib/types';

interface StatusBarProps {
  activeModules: ModuleType[];
  timing: number | null;
  isLoading: boolean;
}

const MODULE_LABELS: Record<ModuleType, string> = {
  VOTING:   'VOTING',
  LOBBYING: 'LOBBYING',
  NEWS:     'NEWS',
};

const ALL_MODULES: ModuleType[] = ['VOTING', 'LOBBYING', 'NEWS'];

export function StatusBar({ activeModules, timing, isLoading }: StatusBarProps) {
  return (
    <div
      style={{
        height: '32px',
        borderTop: '1px solid rgba(26,26,24,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        flexShrink: 0,
      }}
    >
      {/* Module indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {ALL_MODULES.map((mod, i) => {
          const isActive = activeModules.includes(mod);
          return (
            <span key={mod} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {i > 0 && (
                <span style={{ color: 'rgba(26,26,24,0.2)', fontSize: '10px' }}>·</span>
              )}
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: isActive ? '#1A1A18' : 'rgba(26,26,24,0.2)',
                  transition: 'color 0.3s ease',
                }}
              >
                {MODULE_LABELS[mod]}
              </span>
              <span
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: isActive
                    ? isLoading ? 'rgba(201,168,154,0.8)' : 'rgba(26,26,24,0.5)'
                    : 'rgba(26,26,24,0.1)',
                  display: 'inline-block',
                  transition: 'background 0.3s ease',
                }}
              />
            </span>
          );
        })}
      </div>

      {/* Centre — timing */}
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
        {timing !== null && !isLoading && (
          <span style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(26,26,24,0.35)' }}>
            {timing}ms
          </span>
        )}
        {isLoading && (
          <span style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(26,26,24,0.35)' }}>
            processing…
          </span>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(26,26,24,0.3)', textTransform: 'uppercase' }}>
          Mock data — v0.1
        </span>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(26,26,24,0.25)',
          }}
        >
          ALETHEIA A(01)
        </span>
      </div>
    </div>
  );
}
