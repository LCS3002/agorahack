'use client';

import { useEffect, useRef } from 'react';

interface FreeParticle {
  x: number; y: number;
  vx: number; vy: number;
}

interface Group {
  cx: number; cy: number;
  vx: number; vy: number;
  cols: number; rows: number;
}

function freeParticleCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const COUNT = 110;
  const CONNECT = 120;
  const particles: FreeParticle[] = [];
  let active = false;

  function init(w: number, h: number) {
    particles.length = 0;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
      });
    }
  }

  const obs = new IntersectionObserver(
    (entries) => { active = entries[0].isIntersecting; },
    { threshold: 0.05 }
  );
  obs.observe(canvas);

  function draw() {
    if (!active) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
    }
    ctx.lineWidth = 0.6;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < CONNECT) {
          ctx.strokeStyle = `rgba(26,26,24,${((1 - d / CONNECT) * 0.12).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = 'rgba(26,26,24,0.22)';
    for (const p of particles) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  return { init, draw, cleanup: () => obs.disconnect() };
}

function groupedParticleCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const DOT = 3;   // dot size px
  const GAP = 2.5; // gap between dots
  const STEP = DOT + GAP;
  const NUM_GROUPS = 8;
  const groups: Group[] = [];
  let active = false;

  function init(w: number, h: number) {
    groups.length = 0;
    for (let i = 0; i < NUM_GROUPS; i++) {
      const cols = 10 + Math.floor(Math.random() * 10); // 10–19 cols
      const rows = 6 + Math.floor(Math.random() * 7);   // 6–12 rows
      groups.push({
        cx: 0.1 * w + Math.random() * 0.8 * w,
        cy: 0.1 * h + Math.random() * 0.8 * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        cols, rows,
      });
    }
  }

  const obs = new IntersectionObserver(
    (entries) => { active = entries[0].isIntersecting; },
    { threshold: 0.05 }
  );
  obs.observe(canvas);

  function draw() {
    if (!active) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);

    for (const g of groups) {
      // Drift
      g.cx += g.vx; g.cy += g.vy;
      // Soft bounce at edges
      const gw = g.cols * STEP;
      const gh = g.rows * STEP;
      if (g.cx - gw / 2 < -gw)      { g.cx = w + gw / 2; }
      else if (g.cx - gw / 2 > w)   { g.cx = -gw / 2; }
      if (g.cy - gh / 2 < -gh)      { g.cy = h + gh / 2; }
      else if (g.cy - gh / 2 > h)   { g.cy = -gh / 2; }

      // Draw dot grid
      const startX = g.cx - (g.cols * STEP) / 2;
      const startY = g.cy - (g.rows * STEP) / 2;
      ctx.fillStyle = 'rgba(26,26,24,0.18)';
      for (let r = 0; r < g.rows; r++) {
        for (let c = 0; c < g.cols; c++) {
          ctx.fillRect(startX + c * STEP, startY + r * STEP, DOT, DOT);
        }
      }
    }
  }

  return { init, draw, cleanup: () => obs.disconnect() };
}

export function ParticleCanvas({
  variant = 'free',
  style,
}: {
  variant?: 'free' | 'grouped';
  style?: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let disposed = false;

    const impl = variant === 'grouped'
      ? groupedParticleCanvas(canvas, ctx)
      : freeParticleCanvas(canvas, ctx);

    function resize() {
      const w = canvas!.offsetWidth || 800;
      const h = canvas!.offsetHeight || 400;
      canvas!.width = w;
      canvas!.height = h;
      impl.init(w, h);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function loop() {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      impl.draw();
    }
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      impl.cleanup();
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
    />
  );
}
