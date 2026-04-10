'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ModuleData, ModuleType } from '@/lib/types';
import { VotingCard }   from './cards/VotingCard';
import { LobbyingCard } from './cards/LobbyingCard';
import { NewsCard }     from './cards/NewsCard';

interface DashboardPanelProps {
  moduleData: ModuleData;
  activeModules: ModuleType[];
  isLoading: boolean;
}

const cardVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

function EmptyState() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    }}>
      <div style={{
        fontSize: '9px',
        fontWeight: 500,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'rgba(26,26,24,0.2)',
      }}>
        A (01)
      </div>
      <div style={{
        fontSize: '11px',
        fontWeight: 300,
        color: 'rgba(26,26,24,0.3)',
        letterSpacing: '0.04em',
        textAlign: 'center',
        maxWidth: '240px',
        lineHeight: 1.7,
      }}>
        Intelligence modules will render here after each query.
      </div>
      {/* Decorative grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', opacity: 0.12 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width: '80px', height: '56px', border: '1px solid rgba(26,26,24,0.4)' }} />
        ))}
      </div>
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="aether-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: '120px' }}>
      <div className="label-xs">{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[100, 75, 88, 60].map((w, i) => (
          <div
            key={i}
            style={{
              height: '10px',
              width: `${w}%`,
              background: 'rgba(26,26,24,0.06)',
              animation: 'shimmer 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes shimmer {
          0%,100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function DashboardPanel({ moduleData, activeModules, isLoading }: DashboardPanelProps) {
  const count = activeModules.length;
  const hasData = count > 0 && !isLoading;

  // Grid layout based on active module count
  const getGridStyle = (): React.CSSProperties => {
    if (count === 1) return { display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr', gap: '1px', height: '100%' };
    if (count === 2) return { display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr 1fr', gap: '1px', height: '100%' };
    return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '1px', height: '100%' };
  };

  // 3-module layout: voting top-left, lobbying top-right, news full-width bottom
  function renderCards() {
    if (isLoading) {
      return activeModules.map(mod => (
        <motion.div
          key={`loading-${mod}`}
          style={count === 3 && mod === 'NEWS' ? { gridColumn: '1 / -1' } : {}}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <LoadingCard label={mod} />
        </motion.div>
      ));
    }

    const cards: React.ReactNode[] = [];

    if (moduleData.voting && activeModules.includes('VOTING')) {
      cards.push(
        <motion.div
          key="voting"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0 }}
          style={{ overflow: 'hidden' }}
        >
          <VotingCard data={moduleData.voting} />
        </motion.div>
      );
    }

    if (moduleData.lobbying && activeModules.includes('LOBBYING')) {
      cards.push(
        <motion.div
          key="lobbying"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.08 }}
          style={{ overflow: 'auto' }}
        >
          <LobbyingCard data={moduleData.lobbying} />
        </motion.div>
      );
    }

    if (moduleData.news && activeModules.includes('NEWS')) {
      cards.push(
        <motion.div
          key="news"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.16 }}
          style={count === 3 ? { gridColumn: '1 / -1', overflow: 'auto' } : { overflow: 'auto' }}
        >
          <NewsCard data={moduleData.news} />
        </motion.div>
      );
    }

    return cards;
  }

  if (!isLoading && count === 0) {
    return (
      <div style={{ height: '100%', overflow: 'hidden' }}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'hidden', padding: '1px' }}>
      <AnimatePresence mode="wait">
        <div key={activeModules.join('-')} style={{ ...getGridStyle(), height: '100%' }}>
          {(hasData || isLoading) && renderCards()}
        </div>
      </AnimatePresence>
    </div>
  );
}
