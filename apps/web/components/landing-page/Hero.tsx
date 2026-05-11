'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useCallback } from 'react';

// Import the WalletMultiButton dynamically to avoid SSR hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

const ORBITS = [
  { rx: 90, ry: 90, tiltX: Math.PI * 0.15, tiltY: 0, tiltZ: 0, speed: 0.008, angle: 0 },
  { rx: 90, ry: 90, tiltX: 0, tiltY: Math.PI * 0.5, tiltZ: 0, speed: 0.005, angle: 2.1 },
  { rx: 90, ry: 90, tiltX: Math.PI * 0.25, tiltY: 0, tiltZ: Math.PI * 0.75, speed: 0.003, angle: 4.2 },
];

function AtomBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const project = useCallback((x3: number, y3: number, z3: number, tX: number, tY: number, tZ: number) => {
    const x1 = x3 * Math.cos(tZ) - y3 * Math.sin(tZ);
    const y1 = x3 * Math.sin(tZ) + y3 * Math.cos(tZ);
    const y2 = y1 * Math.cos(tX) - z3 * Math.sin(tX);
    const z2 = y1 * Math.sin(tX) + z3 * Math.cos(tX);
    const xf = x1 * Math.cos(tY) + z2 * Math.sin(tY);
    const zf = -x1 * Math.sin(tY) + z2 * Math.cos(tY);
    return { x: xf, y: y2, z: zf };
  }, []);

  const getTilts = useCallback((o: (typeof ORBITS)[0], time: number) => ({
    tX: o.tiltX,
    tY: o.tiltY + time * o.speed * 0.3,
    tZ: o.tiltZ + time * o.speed * 0.15,
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let rafId: number;
    let startTs: number | null = null;

    // Breath state
    const breath = {
      phase: 0, speed: 0.018, baseR: 14, baseGlow: 50,
      targetSpeed: 0.018, targetAmplitude: 1.0, currentAmplitude: 1.0,
      changeTimer: 0, changeInterval: 180,
      pulseTimer: 0, pulseInterval: 220, pulseActive: false, pulsePhase: 0,
    };
    const particles: { x: number; y: number; vx: number; vy: number; life: number; decay: number; r: number }[] = [];
    let scrollInfluence = 0;
    let scrollTarget = 0;

    const nextBreathPattern = () => {
      breath.targetSpeed = 0.008 + Math.random() * 0.025;
      breath.targetAmplitude = 0.4 + Math.random() * 1.4;
      breath.changeInterval = 120 + Math.floor(Math.random() * 200);
      breath.changeTimer = 0;
    };
    nextBreathPattern();

    // Scroll handler
    const onScroll = () => {
      const rect = wrap.getBoundingClientRect();
      const viewH = window.innerHeight;
      const centre = rect.top + rect.height / 2;
      const raw = 1 - (centre / viewH);
      scrollTarget = Math.max(0, Math.min(1, raw * 2));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const draw = (ts: number) => {
      if (!startTs) startTs = ts;
      const time = (ts - startTs) * 0.05;

      // Get current size every frame (cheap)
      const rect = wrap.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w === 0 || h === 0) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      // Resize canvas if needed
      if (canvas.width !== Math.floor(w) || canvas.height !== Math.floor(h)) {
        canvas.width = Math.floor(w);
        canvas.height = Math.floor(h);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) / 240;

      // Smooth scroll influence
      scrollInfluence += (scrollTarget - scrollInfluence) * 0.06;
      const inf = scrollInfluence;

      // Breath
      breath.changeTimer++;
      if (breath.changeTimer >= breath.changeInterval) nextBreathPattern();
      breath.speed += (breath.targetSpeed - breath.speed) * 0.02;
      breath.currentAmplitude += (breath.targetAmplitude - breath.currentAmplitude) * 0.015;
      breath.phase += breath.speed * (1 + inf * 0.5);

      // Pulse
      breath.pulseTimer++;
      if (!breath.pulseActive && breath.pulseTimer > breath.pulseInterval) {
        if (Math.random() < 0.4 + inf * 0.4) {
          breath.pulseActive = true;
          breath.pulsePhase = 0;
          breath.pulseInterval = 80 + Math.floor(Math.random() * (250 - inf * 120));
        }
        breath.pulseTimer = 0;
      }
      if (breath.pulseActive) {
        breath.pulsePhase += 0.18 + inf * 0.08;
        if (breath.pulsePhase > Math.PI) breath.pulseActive = false;
      }

      // Spawn particles
      if (Math.random() < 0.15 + inf * 0.25) {
        const angle = Math.random() * Math.PI * 2;
        const dist = (12 + Math.random() * 10) * scale;
        particles.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          life: 1.0,
          decay: 0.012 + Math.random() * 0.018,
          r: (2 + Math.random() * 3) * scale,
        });
      }

      const breathSin = Math.sin(breath.phase);
      const breathVal = breathSin * breath.currentAmplitude;
      const r = (breath.baseR + breathVal * 3 + inf * 3) * scale;
      const glowR = (breath.baseGlow + breathVal * 15 + inf * 20) * scale;
      const glowAlpha = 0.15 + Math.abs(breathSin) * 0.12 * breath.currentAmplitude + inf * 0.1;
      const pulseExtra = breath.pulseActive ? Math.sin(breath.pulsePhase) * (10 + inf * 8) * scale : 0;
      const pulseAlpha = breath.pulseActive ? Math.sin(breath.pulsePhase) * (0.3 + inf * 0.2) : 0;

      ctx.clearRect(0, 0, w, h);

      // Ambient glow
      const ambient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR + pulseExtra);
      ambient.addColorStop(0, `rgba(78,222,163,${(glowAlpha + pulseAlpha).toFixed(3)})`);
      ambient.addColorStop(1, 'rgba(78,222,163,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, glowR + pulseExtra, 0, Math.PI * 2);
      ctx.fillStyle = ambient;
      ctx.fill();

      // Pulse ring
      if (breath.pulseActive) {
        const pulse = ctx.createRadialGradient(cx, cy, r, cx, cy, r + pulseExtra + 4 * scale);
        pulse.addColorStop(0, `rgba(78,222,163,${(pulseAlpha * 0.5).toFixed(3)})`);
        pulse.addColorStop(1, 'rgba(78,222,163,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, r + pulseExtra + 4 * scale, 0, Math.PI * 2);
        ctx.fillStyle = pulse;
        ctx.fill();
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(78,222,163,${(p.life * 0.6).toFixed(2)})`;
        ctx.fill();
      }

      // Draw orbits
      ORBITS.forEach(o => {
        const { tX, tY, tZ } = getTilts(o, time);
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const a = (i / 120) * Math.PI * 2;
          const p = project(Math.cos(a) * o.rx * scale, Math.sin(a) * o.ry * scale, 0, tX, tY, tZ);
          i === 0 ? ctx.moveTo(cx + p.x, cy + p.y) : ctx.lineTo(cx + p.x, cy + p.y);
        }
        ctx.strokeStyle = `rgba(78,222,163,${(0.18 + inf * 0.15).toFixed(3)})`;
        ctx.lineWidth = 1.2 + inf * 0.6;
        ctx.stroke();
      });

      // Electrons
      const electrons = ORBITS.map(o => {
        const a = o.angle + time * o.speed;
        const { tX, tY, tZ } = getTilts(o, time);
        const p = project(Math.cos(a) * o.rx * scale, Math.sin(a) * o.ry * scale, 0, tX, tY, tZ);
        return { x: cx + p.x, y: cy + p.y, z: p.z };
      });

      // Nucleus
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#4edea3';
      ctx.fill();
      const shine = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      shine.addColorStop(0, 'rgba(255,255,255,0.45)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = shine;
      ctx.fill();

      // Scroll progress arc
      if (inf > 0.02) {
        ctx.beginPath();
        ctx.arc(cx, cy, r + 6 * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * inf);
        ctx.strokeStyle = `rgba(78,222,163,${(inf * 0.5).toFixed(2)})`;
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
      }

      // Draw electrons (depth-sorted)
      electrons.sort((a, b) => a.z - b.z);
      electrons.forEach(e => {
        const bright = Math.min(1, 0.55 + (e.z / (90 * scale)) * 0.45);
        const glowSize = (14 + inf * 4) * scale;
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, glowSize);
        g.addColorStop(0, `rgba(78,222,163,${(bright * 0.5).toFixed(2)})`);
        g.addColorStop(1, 'rgba(78,222,163,0)');
        ctx.beginPath();
        ctx.arc(e.x, e.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(e.x, e.y, (5 + inf) * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(78,222,163,${bright.toFixed(2)})`;
        ctx.fill();
      });

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, [project, getTilts]);

  return (
    <div ref={wrapRef} className="absolute inset-0 z-0 overflow-hidden blur-[1px]">
      <canvas
        ref={canvasRef}
        className="block w-full h-full opacity-40"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 pt-46 pb-20 overflow-hidden w-full">
      {/* Dark background */}
      <div className="absolute inset-0 z-[-1] bg-[#09090b]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-[#09090b] to-[#09090b]"></div>
      </div>

      {/* Canvas atom background — behind all text */}
      <AtomBackground />

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-8 mb-20">
        <div className="space-y-2">
          <h1 className="text-[2.5rem] sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight uppercase leading-[1.1] font-playfair">
            Stake Your <br /> Crypto.
          </h1>
          <h2 className="text-[2.5rem] sm:text-6xl md:text-7xl font-extrabold text-primary tracking-tight uppercase leading-[1.1] drop-shadow-[0_0_20px_rgba(78,222,163,0.3)] font-playfair">
            Build Atomic <br /> Habits.
          </h2>
        </div>

        <p className="text-zinc-400 max-w-[22rem] sm:max-w-xl text-[0.95rem] sm:text-lg leading-relaxed">
          The first Web3 protocol that uses AI verification and loss aversion to guarantee you hit your goals. Put your money where your habits are.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link 
            href="#how"
            className="w-full sm:w-auto px-8 py-4 text-sm sm:text-base font-bold tracking-wider text-primary uppercase transition-all bg-[#111111] border border-white/5 rounded-xl hover:bg-[#1a1a1a] hover:border-white/10 hover:scale-[1.02] active:scale-[0.98] text-center"
          >
            See How It Works
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative z-10 w-full max-w-7xl mx-auto border-t border-white/10 pt-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-row justify-around items-center gap-4 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-2xl sm:text-4xl font-bold text-primary mb-1 tracking-tight drop-shadow-[0_0_10px_rgba(78,222,163,0.3)] font-playfair">
              $2.4M
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-widest font-mono">
              TVL Staked
            </div>
          </div>

          <div className="h-10 w-px bg-white/10"></div>

          <div className="text-center">
            <div className="text-2xl sm:text-4xl font-bold text-primary mb-1 tracking-tight drop-shadow-[0_0_10px_rgba(78,222,163,0.3)] font-playfair">
              94%
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-widest font-mono">
              Success Rate
            </div>
          </div>

          <div className="h-10 w-px bg-white/10"></div>

          <div className="text-center">
            <div className="text-2xl sm:text-4xl font-bold text-primary mb-1 tracking-tight drop-shadow-[0_0_10px_rgba(78,222,163,0.3)] font-playfair">
              12k+
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-widest font-mono">
              Active Habits
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}