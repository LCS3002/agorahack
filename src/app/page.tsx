'use client';

import { useState, useCallback, useRef, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header }           from '@/components/Header';
import { ChatPanel }        from '@/components/ChatPanel';
import { DashboardPanel }   from '@/components/DashboardPanel';
import { StatusBar }        from '@/components/StatusBar';
import { VotingExpanded }   from '@/components/expanded/VotingExpanded';
import { LobbyingExpanded } from '@/components/expanded/LobbyingExpanded';
import { NewsExpanded }     from '@/components/expanded/NewsExpanded';
import { ThreeBackground }  from '@/components/ThreeBackground';
import type {
  ClassificationResult,
  ModuleData,
  ModuleType,
  HistoryItem,
} from '@/lib/types';
import { selectMockData } from '@/lib/mockDataSelector';

// ── Cream input page (Claude-style, original ALETHEIA) ────────────────────────
function CreamLandingPage({
  onSubmit,
  isLoading,
  onBack,
}: {
  onSubmit: (q: string) => void;
  isLoading: boolean;
  onBack?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (!val || isLoading) return;
    onSubmit(val);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <motion.div
      key="cream-landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F0EDE8',
        padding: '48px 24px',
      }}
    >
      {/* Wordmark — click to go back to landing */}
      <div
        onClick={onBack}
        style={{ marginBottom: '52px', textAlign: 'center', cursor: onBack ? 'pointer' : 'default' }}
      >
        <div style={{
          fontSize: '9px',
          fontWeight: 500,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'rgba(26,26,24,0.28)',
          marginBottom: '20px',
        }}>
          A (01)
        </div>
        <div style={{
          fontSize: '44px',
          fontWeight: 200,
          letterSpacing: '0.14em',
          color: '#1A1A18',
          lineHeight: 1,
        }}>
          ALETHEIA
        </div>
        <div style={{
          fontSize: '12px',
          fontWeight: 300,
          color: 'rgba(26,26,24,0.4)',
          marginTop: '16px',
          letterSpacing: '0.05em',
        }}>
          EU votes, money, and influence — in plain language.
        </div>
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '640px' }}>
        <div style={{
          border: `1px solid ${focused ? 'rgba(26,26,24,0.4)' : 'rgba(26,26,24,0.14)'}`,
          background: focused ? 'rgba(26,26,24,0.015)' : 'transparent',
          transition: 'border-color 0.2s ease, background 0.2s ease',
          padding: '18px 16px 14px 22px',
        }}>
          <input
            ref={inputRef}
            autoFocus
            disabled={isLoading}
            autoComplete="off"
            placeholder="Ask about EU politics…"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: '15px',
              fontWeight: 300,
              color: '#1A1A18',
              letterSpacing: '0.01em',
              lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '14px',
          }}>
            <span style={{
              fontSize: '9px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(26,26,24,0.2)',
            }}>
              {isLoading ? 'Processing…' : 'Return to submit'}
            </span>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: isLoading ? 'rgba(26,26,24,0.08)' : '#1A1A18',
                border: 'none',
                cursor: isLoading ? 'default' : 'pointer',
                color: '#F0EDE8',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (!isLoading) (e.currentTarget as HTMLElement).style.background = 'rgba(26,26,24,0.7)';
              }}
              onMouseLeave={e => {
                if (!isLoading) (e.currentTarget as HTMLElement).style.background = '#1A1A18';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 6.5h9M7.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </form>

      <div style={{
        position: 'absolute',
        bottom: '28px',
        fontSize: '9px',
        letterSpacing: '0.14em',
        color: 'rgba(26,26,24,0.18)',
        textTransform: 'uppercase',
      }}>
        Truth, unconcealed.
      </div>
    </motion.div>
  );
}

// ── Marketing landing page (ALETHEIA cream palette + Three.js blob) ──────────
function LandingPage({
  onSubmit,
  isLoading,
  onLaunch,
}: {
  onSubmit: (q: string) => void;
  isLoading: boolean;
  onLaunch: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const numbersRef = useRef<HTMLDivElement>(null);

  // Count-up animation state for the numbers section
  const [cnt705,  setCnt705]  = useState(0);
  const [cnt19B,  setCnt19B]  = useState(0);
  const [cnt12k,  setCnt12k]  = useState(0);
  const [cnt27,   setCnt27]   = useState(0);

  useEffect(() => {
    const el = numbersRef.current;
    if (!el) return;
    function animateCount(to: number, setter: (n: number) => void, duration = 1400) {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        setter(Math.round(to * ease));
        if (t < 1) requestAnimationFrame(tick);
        else setter(to);
      };
      requestAnimationFrame(tick);
    }
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animateCount(705, setCnt705);
        animateCount(100, setCnt19B); // represents €1.9B+
        animateCount(12000, setCnt12k);
        animateCount(27, setCnt27);
        obs.disconnect();
      }
    }, { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (isLoading) return;
    onLaunch();
    if (val) onSubmit(val);
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    setNavScrolled((e.currentTarget as HTMLDivElement).scrollTop > 80);
  }

  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22 } }}
      transition={{ duration: 0.35 }}
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        position: 'absolute',
        inset: 0,
        background: '#F0EDE8',
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: 'var(--font-dm-sans), "DM Sans", system-ui, sans-serif',
      }}
    >
      {/* ── Three.js background (hero-only, cream mode) ── */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', pointerEvents: 'none', zIndex: 0, marginBottom: '-100vh' }}>
        <ThreeBackground cream />
        {/* bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '55%', background: 'linear-gradient(to top, #F0EDE8 0%, #F0EDE8 8%, transparent 100%)', zIndex: 5, pointerEvents: 'none' }} />
        {/* top fade */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '20%', background: 'linear-gradient(to bottom, #F0EDE8 0%, #F0EDE8 5%, transparent 100%)', zIndex: 5, pointerEvents: 'none' }} />
      </div>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
        transition: 'background 0.4s ease, backdrop-filter 0.4s ease',
        background: navScrolled ? 'rgba(240,237,232,0.88)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(20px)' : 'none',
        borderBottom: navScrolled ? '1px solid rgba(26,26,24,0.08)' : 'none',
      }}>
        {/* Logo — matches Header.tsx exactly */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, background: '#C9A89A' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 20, fontWeight: 200, letterSpacing: '0.18em', color: '#1A1A18', lineHeight: 1 }}>
              ALETHEIA
            </span>
            <span style={{ fontSize: 9, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.4)', lineHeight: 1 }}>
              EU Political Intelligence
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {['Voting', 'Lobbying', 'News'].map(label => (
            <span key={label} style={{ fontSize: 13, fontWeight: 400, color: 'rgba(26,26,24,0.4)', letterSpacing: '0.5px', cursor: 'default' }}>
              {label}
            </span>
          ))}
          <button
            onClick={onLaunch}
            style={{
              fontSize: 12, fontWeight: 500, color: '#F0EDE8', background: '#1A1A18',
              padding: '9px 22px', border: 'none', cursor: 'pointer',
              letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', width: '100%', height: '100vh', zIndex: 10 }}>
        {/* Hero content pinned to bottom — single flow, no overlapping abs positioned children */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0 48px 20px',
          display: 'flex', flexDirection: 'column', gap: 0,
        }}>
          <h1 style={{
            fontFamily: '"Instrument Serif", Georgia, "Times New Roman", serif',
            fontSize: 'clamp(56px, 11vw, 140px)',
            fontWeight: 400,
            color: '#1A1A18',
            lineHeight: 0.93,
            letterSpacing: '-3px',
            marginBottom: 12,
            userSelect: 'none',
          }}>
            EU power,<br />
            <span style={{ color: 'rgba(26,26,24,0.28)' }}>in plain language.</span>
          </h1>

          {/* Stats row — sits below the heading */}
          <div style={{ display: 'flex', gap: 48, marginBottom: 16, pointerEvents: 'none' }}>
            {[
              { val: '705', label: 'MEPs Tracked' },
              { val: '€1.9B+', label: 'Declared Spend' },
              { val: '27', label: 'Member States' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 18, fontWeight: 500, color: 'rgba(26,26,24,0.85)', letterSpacing: '-0.5px' }}>{s.val}</span>
                <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(26,26,24,0.3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40 }}>
            {/* Description */}
            <p style={{
              fontSize: 13, fontWeight: 300, color: 'rgba(26,26,24,0.5)',
              lineHeight: 1.8, maxWidth: 520,
              userSelect: 'text',
            }}>
              Ask any question about European Parliament votes, lobbying spend, or media sentiment.
              Get AI-cited, plain-language analysis in seconds.
            </p>

            {/* Search form */}
            <form onSubmit={handleSubmit} style={{ flexShrink: 0, width: 340 }}>
              <div style={{
                border: '1px solid rgba(26,26,24,0.18)',
                background: 'rgba(240,237,232,0.7)',
                backdropFilter: 'blur(12px)',
                padding: '14px 14px 12px 20px',
              }}>
                <input
                  ref={inputRef}
                  disabled={isLoading}
                  autoComplete="off"
                  placeholder="Ask about EU politics…"
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: 'inherit', fontSize: 14, fontWeight: 300,
                    color: '#1A1A18', letterSpacing: '0.01em', lineHeight: 1.5,
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.28)' }}>
                    {isLoading ? 'Processing…' : 'Return to submit'}
                  </span>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      background: isLoading ? 'rgba(26,26,24,0.08)' : '#1A1A18',
                      border: 'none', cursor: isLoading ? 'default' : 'pointer',
                      color: '#F0EDE8', width: 30, height: 30,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = 'rgba(26,26,24,0.7)'; }}
                    onMouseLeave={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = '#1A1A18'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 6.5h9M7.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── Intelligence Modules ── */}
      <section style={{ position: 'relative', zIndex: 10, background: '#F0EDE8', padding: '120px 48px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(26,26,24,0.35)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 24 }}>
            Intelligence Modules
          </div>
          <h2 style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 'clamp(36px, 5.5vw, 72px)',
            fontWeight: 400, color: '#1A1A18', lineHeight: 1.05,
            letterSpacing: '-1.5px', maxWidth: 700, marginBottom: 80,
          }}>
            Three lenses on <span style={{ color: 'rgba(26,26,24,0.28)' }}>EU power</span>
          </h2>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1, background: 'rgba(26,26,24,0.08)',
            border: '1px solid rgba(26,26,24,0.08)',
          }}>
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'rgba(26,26,24,0.4)', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
                title: 'Voting Intelligence',
                desc: 'Roll-call vote records, party breakdowns, MEP profiles, and live hemicycle visualization for every major EU bill.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'rgba(26,26,24,0.4)', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                ),
                title: 'Lobbying Tracker',
                desc: 'Declared spend and documented meetings from the EU Transparency Register, cross-referenced against MEP votes to flag potential conflicts.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'rgba(26,26,24,0.4)', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                ),
                title: 'News & Sentiment',
                desc: 'Real-time media sentiment across left, centre, and right outlets, with framing divergence analysis and polarisation index.',
              },
            ].map(card => (
              <div
                key={card.title}
                style={{ background: '#F0EDE8', padding: '48px 40px', display: 'flex', flexDirection: 'column', gap: 16, transition: 'background 0.3s ease', cursor: 'default' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,26,24,0.025)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F0EDE8'; }}
              >
                <div style={{ width: 40, height: 40, border: '1px solid rgba(26,26,24,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.icon}
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'rgba(26,26,24,0.85)', letterSpacing: '-0.3px' }}>{card.title}</div>
                <div style={{ fontSize: 13, fontWeight: 300, color: 'rgba(26,26,24,0.45)', lineHeight: 1.7 }}>{card.desc}</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ position: 'relative', zIndex: 10, background: '#F0EDE8', borderTop: '1px solid rgba(26,26,24,0.08)', padding: '120px 48px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(26,26,24,0.35)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 24 }}>
            How It Works
          </div>
          <h2 style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 'clamp(36px, 5.5vw, 72px)',
            fontWeight: 400, color: '#1A1A18', lineHeight: 1.05,
            letterSpacing: '-1.5px', maxWidth: 700, marginBottom: 64,
          }}>
            Three steps <span style={{ color: 'rgba(26,26,24,0.28)' }}>to clarity</span>
          </h2>
          <div style={{ display: 'flex', gap: 0, borderTop: '1px solid rgba(26,26,24,0.08)' }}>
            {[
              { num: '01', title: 'Ask in plain language', desc: 'Type any question about EU politics — a bill, a MEP, a lobbying org, or a topic. No structured query syntax required.' },
              { num: '02', title: 'AI classifies and routes', desc: 'Claude Haiku identifies which intelligence modules are relevant and extracts entities and timeframe from your question.' },
              { num: '03', title: 'Get cited analysis', desc: 'Claude Sonnet synthesises data across Voting, Lobbying, and News modules into a 3–4 sentence plain-language summary with numbered citations.' },
            ].map((item, i) => (
              <div key={item.num} style={{ flex: 1, display: 'flex', gap: 20, padding: '48px 40px 0', borderLeft: i > 0 ? '1px solid rgba(26,26,24,0.08)' : 'none' }}>
                <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 28, color: 'rgba(26,26,24,0.12)', lineHeight: 1, flexShrink: 0, width: 36 }}>{item.num}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(26,26,24,0.85)' }}>{item.title}</div>
                  <div style={{ fontSize: 13, fontWeight: 300, color: 'rgba(26,26,24,0.45)', lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Numbers ── */}
      <section style={{ position: 'relative', zIndex: 10, background: '#F0EDE8', borderTop: '1px solid rgba(26,26,24,0.08)', padding: '120px 48px', overflow: 'hidden' }}>
        <div ref={numbersRef} style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(26,26,24,0.35)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 24 }}>
            By The Numbers
          </div>
          <h2 style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 'clamp(36px, 5.5vw, 72px)',
            fontWeight: 400, color: '#1A1A18', lineHeight: 1.05,
            letterSpacing: '-1.5px', maxWidth: 700, marginBottom: 80,
          }}>
            Scale of <span style={{ color: 'rgba(26,26,24,0.28)' }}>EU accountability</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 48 }}>
            {[
              { val: cnt705 > 0 ? cnt705.toLocaleString() : '705', suffix: '', label: 'MEPs tracked across\n7 political groups' },
              { val: cnt19B > 0 ? `€${(cnt19B / 100 * 1.9).toFixed(1)}B` : '€1.9B', suffix: '+', label: 'Declared lobbying spend\nin the Transparency Register' },
              { val: cnt12k > 0 ? (cnt12k >= 1000 ? `${(cnt12k/1000).toFixed(0)},000` : cnt12k.toString()) : '12,000', suffix: '+', label: 'Registered lobbying\norganisations' },
              { val: cnt27 > 0 ? cnt27.toString() : '27', suffix: '', label: 'Member states,\none platform' },
            ].map(n => (
              <div key={n.label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  fontFamily: '"Instrument Serif", Georgia, serif',
                  fontSize: 'clamp(48px, 6vw, 80px)',
                  fontWeight: 400, color: '#1A1A18', letterSpacing: '-2px', lineHeight: 1,
                }}>{n.val}{n.suffix}</div>
                <div style={{ width: 32, height: 1, background: 'rgba(26,26,24,0.12)', margin: '8px 0' }} />
                <div style={{ fontSize: 13, fontWeight: 300, color: 'rgba(26,26,24,0.45)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{n.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        position: 'relative', zIndex: 10, background: '#F0EDE8',
        padding: '160px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', borderTop: '1px solid rgba(26,26,24,0.08)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(26,26,24,0.35)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 24 }}>
          Get Started
        </div>
        <h2 style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: 'clamp(40px, 6vw, 88px)',
          fontWeight: 400, color: '#1A1A18', lineHeight: 1.05,
          letterSpacing: '-2px', maxWidth: 800, marginBottom: 24,
        }}>
          The next question <span style={{ color: 'rgba(26,26,24,0.28)' }}>starts here.</span>
        </h2>
        <p style={{ fontSize: 14, fontWeight: 300, color: 'rgba(26,26,24,0.45)', lineHeight: 1.7, maxWidth: 480, marginBottom: 48 }}>
          EU politics is already loud enough. ALETHEIA cuts through it — one question at a time.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onLaunch}
            style={{
              position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '13px 28px', background: '#1A1A18', color: '#F0EDE8',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              border: 'none', cursor: 'pointer',
              letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            Launch ALETHEIA
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </button>
          <button
            onClick={() => (containerRef.current as HTMLElement | null)?.scrollTo({ top: (containerRef.current as HTMLElement | null)?.querySelector('section')?.offsetTop ?? 0, behavior: 'smooth' })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '13px 28px', background: 'transparent', color: 'rgba(26,26,24,0.45)',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 400,
              border: '1px solid rgba(26,26,24,0.18)', cursor: 'pointer',
              letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'border-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(26,26,24,0.45)'; el.style.color = 'rgba(26,26,24,0.85)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(26,26,24,0.18)'; el.style.color = 'rgba(26,26,24,0.45)'; }}
          >
            Learn More
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        position: 'relative', zIndex: 10, background: '#F0EDE8',
        borderTop: '1px solid rgba(26,26,24,0.08)',
        padding: '48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 6, height: 6, background: '#C9A89A' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 200, letterSpacing: '0.18em', color: '#1A1A18' }}>ALETHEIA</span>
            <span style={{ fontSize: 9, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,26,24,0.4)' }}>EU Political Intelligence</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(26,26,24,0.28)', letterSpacing: '0.3px' }}>
          Truth, unconcealed. · AgoraHacks 2026
        </div>
      </footer>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes aletheiaPulse { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
      `}</style>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Page() {
  const [summary,        setSummary]        = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [activeModules,  setActiveModules]  = useState<ModuleType[]>([]);
  const [moduleData,     setModuleData]     = useState<ModuleData>({});
  const [timing,         setTiming]         = useState<number | null>(null);
  const [history,        setHistory]        = useState<HistoryItem[]>([]);
  const [hasQuery,       setHasQuery]       = useState(false);
  const [showApp,        setShowApp]        = useState(false);
  const [expandedModule, setExpandedModule] = useState<ModuleType | null>(null);

  const runQuery = useCallback(async (query: string) => {
    if (!query.trim() || isLoading) return;

    const t0 = Date.now();
    setIsLoading(true);
    setHasQuery(true);
    setSummary('');
    setActiveModules([]);
    setModuleData({});
    setTiming(null);

    let classification: ClassificationResult;
    let data: ModuleData;

    try {
      const classRes = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      classification = await classRes.json();

      setActiveModules(classification.modules);
      data = selectMockData(classification, query);
      setModuleData(data); // show mock panels immediately while agent fetches real data

      // Agent fetches real data (EP API + GDELT) and writes the summary
      const sumRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, classification }),
      });

      // Real module data comes back in a header — update panels before streaming text
      const rawModuleData = sumRes.headers.get('X-Module-Data');
      if (rawModuleData) {
        try {
          const realData: ModuleData = JSON.parse(atob(rawModuleData));
          setModuleData(prev => ({
            voting: realData.voting ?? prev.voting,
            lobbying: prev.lobbying, // no real API — keep mock
            news: realData.news ?? prev.news,
          }));
        } catch { /* keep mock if header is malformed */ }
      }

      if (!sumRes.body) {
        const text = await sumRes.text();
        setSummary(text);
        setIsLoading(false);
        const elapsed = Date.now() - t0;
        setTiming(elapsed);
        setHistory(prev => [{ id: crypto.randomUUID(), query, summary: text, modules: classification.modules, timestamp: Date.now(), timing: elapsed }, ...prev]);
        return;
      }

      const reader  = sumRes.body.getReader();
      const decoder = new TextDecoder();
      let   full    = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setSummary(full);
      }

      const elapsed = Date.now() - t0;
      setTiming(elapsed);
      setIsLoading(false);
      setHistory(prev => [{ id: crypto.randomUUID(), query, summary: full, modules: classification.modules, timestamp: Date.now(), timing: elapsed }, ...prev]);

    } catch (err) {
      console.error('Query error:', err);
      setSummary('An error occurred. Please try again.');
      setIsLoading(false);
      setTiming(Date.now() - t0);
    }
  }, [isLoading]);

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: '#F0EDE8', position: 'relative' }}>

      <AnimatePresence mode="wait">
        {!showApp ? (
          <LandingPage key="dark-landing" onSubmit={runQuery} isLoading={isLoading} onLaunch={() => setShowApp(true)} />
        ) : !hasQuery ? (
          <CreamLandingPage
            key="cream-landing"
            onSubmit={runQuery}
            isLoading={isLoading}
            onBack={() => setShowApp(false)}
          />
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
            style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
          >
            <Header onLogoClick={() => { setShowApp(false); setHasQuery(false); setSummary(''); setActiveModules([]); setModuleData({}); setTiming(null); }} />

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
              <div style={{ width: '300px', minWidth: '260px', maxWidth: '340px', flexShrink: 0, overflow: 'hidden' }}>
                <ChatPanel
                  summary={summary}
                  isLoading={isLoading}
                  history={history.slice(1)}
                  activeModules={activeModules}
                  onSubmit={runQuery}
                  onDemoQuery={runQuery}
                  hasQuery={hasQuery}
                />
              </div>

              <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, position: 'relative' }}>
                <AnimatePresence mode="wait">
                  {expandedModule === 'VOTING' && moduleData.voting ? (
                    <motion.div key="voting-expanded" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.22, ease: 'easeOut' }} style={{ height: '100%' }}>
                      <VotingExpanded data={moduleData.voting} onCollapse={() => setExpandedModule(null)} />
                    </motion.div>
                  ) : expandedModule === 'LOBBYING' && moduleData.lobbying ? (
                    <motion.div key="lobbying-expanded" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.22, ease: 'easeOut' }} style={{ height: '100%' }}>
                      <LobbyingExpanded data={moduleData.lobbying} onCollapse={() => setExpandedModule(null)} />
                    </motion.div>
                  ) : expandedModule === 'NEWS' && moduleData.news ? (
                    <motion.div key="news-expanded" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.22, ease: 'easeOut' }} style={{ height: '100%' }}>
                      <NewsExpanded data={moduleData.news} onCollapse={() => setExpandedModule(null)} />
                    </motion.div>
                  ) : (
                    <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} style={{ height: '100%' }}>
                      <DashboardPanel
                        moduleData={moduleData}
                        activeModules={activeModules}
                        isLoading={isLoading}
                        onExpand={setExpandedModule}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <StatusBar activeModules={activeModules} timing={timing} isLoading={isLoading} />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
