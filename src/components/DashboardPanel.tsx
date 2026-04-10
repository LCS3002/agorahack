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

// ── Shimmer skeleton rows ─────────────────────────────────────────────────────
function SkeletonRows({ rows = 5 }: { rows?: number }) {
  const widths = [92, 78, 85, 65, 88];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '24px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '10px',
            width: `${widths[i % widths.length]}%`,
            background: 'rgba(26,26,24,0.06)',
            animation: 'shimmer 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.09}s`,
          }}
        />
      ))}
      <style>{`@keyframes shimmer{0%,100%{opacity:.35}50%{opacity:.9}}`}</style>
    </div>
  );
}

// ── Empty state per column ────────────────────────────────────────────────────
function EmptyColumn({ label, hint }: { label: string; hint: string }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      gap: '12px',
    }}>
      {/* Decorative placeholder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', opacity: 0.1 }}>
        {[100, 75, 88, 60, 78].map((w, i) => (
          <div key={i} style={{ height: '6px', width: `${w}%`, background: 'rgba(26,26,24,0.6)' }} />
        ))}
      </div>
      <div style={{
        fontSize: '9px',
        fontWeight: 500,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'rgba(26,26,24,0.22)',
        textAlign: 'center',
        marginTop: '8px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '11px',
        fontWeight: 300,
        color: 'rgba(26,26,24,0.28)',
        textAlign: 'center',
        lineHeight: 1.65,
        maxWidth: '180px',
      }}>
        {hint}
      </div>
    </div>
  );
}

// ── Panel column wrapper ──────────────────────────────────────────────────────
interface PanelColumnProps {
  id: ModuleType;
  title: string;
  subtitle: string;
  isActive: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  borderRight?: boolean;
}

function PanelColumn({ id, title, subtitle, isActive, isLoading, children, borderRight = true }: PanelColumnProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderRight: borderRight ? '1px solid rgba(26,26,24,0.10)' : 'none',
      overflow: 'hidden',
    }}>
      {/* Sticky column header */}
      <div style={{
        flexShrink: 0,
        padding: '14px 20px 12px',
        borderBottom: '1px solid rgba(26,26,24,0.08)',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        background: '#F0EDE8',
      }}>
        <div>
          <div style={{
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: isActive ? 'rgba(26,26,24,0.75)' : 'rgba(26,26,24,0.35)',
            transition: 'color 0.3s ease',
          }}>
            {title}
          </div>
          <div style={{
            fontSize: '9px',
            fontWeight: 400,
            letterSpacing: '0.08em',
            color: 'rgba(26,26,24,0.28)',
            marginTop: '1px',
          }}>
            {subtitle}
          </div>
        </div>
        {/* Active indicator dot */}
        <div style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: isActive
            ? (isLoading ? '#D4C4A8' : 'rgba(26,26,24,0.5)')
            : 'rgba(26,26,24,0.1)',
          transition: 'background 0.4s ease',
          flexShrink: 0,
          animation: isLoading && isActive ? 'dotpulse 1s ease-in-out infinite' : 'none',
        }} />
        <style>{`@keyframes dotpulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DashboardPanel({ moduleData, activeModules, isLoading }: DashboardPanelProps) {
  const isVotingActive   = activeModules.includes('VOTING');
  const isLobbyingActive = activeModules.includes('LOBBYING');
  const isNewsActive     = activeModules.includes('NEWS');

  const contentVariants = {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0,  transition: { duration: 0.38, ease: 'easeOut' as const } },
    exit:    { opacity: 0, y: -6, transition: { duration: 0.2 } },
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      height: '100%',
      overflow: 'hidden',
    }}>

      {/* ── Column 1: Voting & Parliament ───────────────────────────────── */}
      <PanelColumn
        id="VOTING"
        title="Voting & Parliament"
        subtitle="Roll-call records · MEP positions"
        isActive={isVotingActive}
        isLoading={isLoading && isVotingActive}
      >
        <AnimatePresence mode="wait">
          {isLoading && isVotingActive ? (
            <motion.div key="voting-loading" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
              <SkeletonRows rows={6} />
            </motion.div>
          ) : moduleData.voting && isVotingActive ? (
            <motion.div key="voting-data" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
              <VotingCard data={moduleData.voting} />
            </motion.div>
          ) : (
            <motion.div key="voting-empty" variants={contentVariants} initial="hidden" animate="visible" exit="exit" style={{ height: '100%' }}>
              <EmptyColumn
                label="Voting & Parliament"
                hint="Ask about a vote, MEP, or legislation to see roll-call records and party positions."
              />
            </motion.div>
          )}
        </AnimatePresence>
      </PanelColumn>

      {/* ── Column 2: Lobbying & Money ──────────────────────────────────── */}
      <PanelColumn
        id="LOBBYING"
        title="Lobbying & Money"
        subtitle="Declared spend · Donor networks"
        isActive={isLobbyingActive}
        isLoading={isLoading && isLobbyingActive}
      >
        <AnimatePresence mode="wait">
          {isLoading && isLobbyingActive ? (
            <motion.div key="lobbying-loading" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
              <SkeletonRows rows={6} />
            </motion.div>
          ) : moduleData.lobbying && isLobbyingActive ? (
            <motion.div key="lobbying-data" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
              <LobbyingCard data={moduleData.lobbying} />
            </motion.div>
          ) : (
            <motion.div key="lobbying-empty" variants={contentVariants} initial="hidden" animate="visible" exit="exit" style={{ height: '100%' }}>
              <EmptyColumn
                label="Lobbying & Money"
                hint="Ask about an industry, company, or regulation to surface declared lobbying spend and conflict flags."
              />
            </motion.div>
          )}
        </AnimatePresence>
      </PanelColumn>

      {/* ── Column 3: News & Sentiment ──────────────────────────────────── */}
      <PanelColumn
        id="NEWS"
        title="News & Sentiment"
        subtitle="Media framing · 30-day trend"
        isActive={isNewsActive}
        isLoading={isLoading && isNewsActive}
        borderRight={false}
      >
        <AnimatePresence mode="wait">
          {isLoading && isNewsActive ? (
            <motion.div key="news-loading" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
              <SkeletonRows rows={6} />
            </motion.div>
          ) : moduleData.news && isNewsActive ? (
            <motion.div key="news-data" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
              <NewsCard data={moduleData.news} />
            </motion.div>
          ) : (
            <motion.div key="news-empty" variants={contentVariants} initial="hidden" animate="visible" exit="exit" style={{ height: '100%' }}>
              <EmptyColumn
                label="News & Sentiment"
                hint="Ask about a topic or person to see media sentiment trends and cross-outlet framing analysis."
              />
            </motion.div>
          )}
        </AnimatePresence>
      </PanelColumn>

    </div>
  );
}
