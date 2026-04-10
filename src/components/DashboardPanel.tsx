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

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
function Skeleton({ rows = 5 }: { rows?: number }) {
  const widths = [92, 70, 84, 58, 78, 66, 88];
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: '9px',
          width: `${widths[i % widths.length]}%`,
          background: 'rgba(26,26,24,0.055)',
          animation: 'sk 1.4s ease-in-out infinite',
          animationDelay: `${i * 0.08}s`,
        }} />
      ))}
      <style>{`@keyframes sk{0%,100%{opacity:.3}50%{opacity:.85}}`}</style>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function Empty({ hint }: { hint: string }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      gap: '14px',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', opacity: 0.08 }}>
        {[100, 72, 85, 58].map((w, i) => (
          <div key={i} style={{ height: '5px', width: `${w}%`, background: 'rgba(26,26,24,0.8)' }} />
        ))}
      </div>
      <p style={{
        fontSize: '10px',
        fontWeight: 300,
        color: 'rgba(26,26,24,0.3)',
        textAlign: 'center',
        lineHeight: 1.7,
        maxWidth: '200px',
        margin: 0,
      }}>
        {hint}
      </p>
    </div>
  );
}

// ── Bento cell wrapper ────────────────────────────────────────────────────────
interface BentoCellProps {
  title: string;
  sub: string;
  isActive: boolean;
  isLoading: boolean;
  gridArea: string;
  children: React.ReactNode;
}

function BentoCell({ title, sub, isActive, isLoading, gridArea, children }: BentoCellProps) {
  return (
    <div style={{
      gridArea,
      display: 'flex',
      flexDirection: 'column',
      background: '#F0EDE8',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Cell header */}
      <div style={{
        flexShrink: 0,
        padding: '12px 18px 10px',
        borderBottom: '1px solid rgba(26,26,24,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: '8.5px',
            fontWeight: 600,
            letterSpacing: '0.17em',
            textTransform: 'uppercase',
            color: isActive ? 'rgba(26,26,24,0.72)' : 'rgba(26,26,24,0.3)',
            transition: 'color 0.3s ease',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {title}
          </div>
          <div style={{
            fontSize: '8.5px',
            color: 'rgba(26,26,24,0.25)',
            marginTop: '1px',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {sub}
          </div>
        </div>
        {/* Status dot */}
        <div style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          flexShrink: 0,
          background: isActive
            ? (isLoading ? '#D4C4A8' : 'rgba(26,26,24,0.45)')
            : 'rgba(26,26,24,0.1)',
          transition: 'background 0.35s ease',
          animation: isLoading && isActive ? 'dp 1s ease-in-out infinite' : 'none',
        }} />
        <style>{`@keyframes dp{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ── Animated content switcher ─────────────────────────────────────────────────
const fade = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' as const } },
  exit:    { opacity: 0,       transition: { duration: 0.16 } },
};

interface SlotProps {
  id: string;
  isLoading: boolean;
  isActive: boolean;
  skeletonRows?: number;
  emptyHint: string;
  children: React.ReactNode;
}

function Slot({ id, isLoading, isActive, skeletonRows = 5, emptyHint, children }: SlotProps) {
  return (
    <AnimatePresence mode="wait">
      {isLoading && isActive ? (
        <motion.div key={`${id}-loading`} variants={fade} initial="hidden" animate="visible" exit="exit">
          <Skeleton rows={skeletonRows} />
        </motion.div>
      ) : isActive && children ? (
        <motion.div key={`${id}-data`} variants={fade} initial="hidden" animate="visible" exit="exit">
          {children}
        </motion.div>
      ) : (
        <motion.div key={`${id}-empty`} variants={fade} initial="hidden" animate="visible" exit="exit" style={{ height: '100%' }}>
          <Empty hint={emptyHint} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function DashboardPanel({ moduleData, activeModules, isLoading }: DashboardPanelProps) {
  const votingActive   = activeModules.includes('VOTING');
  const lobbyingActive = activeModules.includes('LOBBYING');
  const newsActive     = activeModules.includes('NEWS');

  return (
    /*
     * Bento grid:
     *   "voting  lobbying"   ← row 1 (55% height)
     *   "voting  news"       ← row 2 (45% height)
     *
     * Voting occupies the full left column (both rows).
     * Lobbying sits top-right, News bottom-right.
     * A 1px gap styled as a grid line separates the cells.
     */
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.15fr 0.85fr',
      gridTemplateRows: '55% 45%',
      gridTemplateAreas: `
        "voting lobbying"
        "voting news"
      `,
      height: '100%',
      gap: '1px',
      background: 'rgba(26,26,24,0.09)',
      overflow: 'hidden',
    }}>

      {/* ── VOTING ──────────────────────────────────────────────────────── */}
      <BentoCell
        title="Voting & Parliament"
        sub="Roll-call records · MEP positions · party breakdown"
        isActive={votingActive}
        isLoading={isLoading && votingActive}
        gridArea="voting"
      >
        <Slot
          id="voting"
          isLoading={isLoading}
          isActive={votingActive}
          skeletonRows={8}
          emptyHint="Ask about a vote, MEP, or legislation to see roll-call records and party positions."
        >
          {moduleData.voting && <VotingCard data={moduleData.voting} />}
        </Slot>
      </BentoCell>

      {/* ── LOBBYING ────────────────────────────────────────────────────── */}
      <BentoCell
        title="Lobbying & Money"
        sub="Declared spend · donor networks · conflict flags"
        isActive={lobbyingActive}
        isLoading={isLoading && lobbyingActive}
        gridArea="lobbying"
      >
        <Slot
          id="lobbying"
          isLoading={isLoading}
          isActive={lobbyingActive}
          skeletonRows={5}
          emptyHint="Ask about an industry, regulation, or person to surface lobbying spend and conflict flags."
        >
          {moduleData.lobbying && <LobbyingCard data={moduleData.lobbying} />}
        </Slot>
      </BentoCell>

      {/* ── NEWS ────────────────────────────────────────────────────────── */}
      <BentoCell
        title="News & Sentiment"
        sub="Media framing · 30-day trend · outlet divergence"
        isActive={newsActive}
        isLoading={isLoading && newsActive}
        gridArea="news"
      >
        <Slot
          id="news"
          isLoading={isLoading}
          isActive={newsActive}
          skeletonRows={4}
          emptyHint="Ask about a topic or person to see media sentiment trends and cross-outlet framing analysis."
        >
          {moduleData.news && <NewsCard data={moduleData.news} />}
        </Slot>
      </BentoCell>

    </div>
  );
}
