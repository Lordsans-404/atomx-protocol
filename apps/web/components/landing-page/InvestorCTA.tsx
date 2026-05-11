'use client';

import Link from 'next/link';

/**
 * InvestorCTA component targeted at judges and investors.
 * Highlights the sustainability and production-readiness of the protocol.
 */
export default function InvestorCTA() {
  const metrics = [
    { num: 'Solana', label: 'Sub-second finality' },
    { num: 'Anchor v0.32', label: 'Smart contract framework' },
    { num: 'LLaMA 4', label: 'AI proof validator' },
    { num: 'Gas Only', label: 'No protocol fees' },
    { num: '100%', label: 'Transparent on-chain' },
  ];

  return (
    <div className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative w-full p-10 sm:p-20 rounded-3xl bg-surface-container border border-white/5 overflow-hidden group">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-secondary/5 blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <span className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-secondary uppercase mb-6">
            // FOR INVESTORS & JUDGES
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair tracking-tight leading-[1.1] mb-8">
            A Self-Sustaining Ecosystem<br />Built to Last
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl font-light leading-relaxed mb-12">
            Atomx isn&apos;t dependent on token inflation or VC runway. Every economic mechanism — staking yield, slash redistribution, and the redemption loop — creates a protocol that grows stronger as adoption grows.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <Link 
              href="/dashboard"
              className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(78,222,163,0.2)]"
            >
              Try the Demo App →
            </Link>
          </div>

          <div className="w-full pt-12 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
            {metrics.map((metric, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <span className="font-playfair text-lg sm:text-xl font-bold text-foreground mb-1 tracking-tight uppercase">
                  {metric.num}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
