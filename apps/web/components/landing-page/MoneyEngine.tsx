'use client';

import { DollarSign, Zap, Sprout, ShieldCheck } from 'lucide-react';

/**
 * MoneyEngine component showing the protocol's economic model.
 * Includes an SVG donut chart representing slash distribution.
 */
export default function MoneyEngine() {
  const points = [
    { icon: <DollarSign className="w-5 h-5 text-secondary" />, title: 'Stakes Generate DeFi Yield', desc: 'Every USDT locked in commitments is deployed to external staking platforms. The yield fuels the rewards pool — so winners earn more than they staked.' },
    { icon: <Zap className="w-5 h-5 text-primary" />, title: 'Slash Creates Sustainable Rewards', desc: 'When users fail, their slashed stake is redistributed. 30% goes to those who succeed, creating a flywheel where discipline is financially rewarded.' },
    { icon: <Sprout className="w-5 h-5 text-[#34d399]" />, title: 'Redemption, Not Abandonment', desc: 'Failed users receive a Redemption Token to restart at a reduced stake. This creates second chances while maintaining accountability.' },
    { icon: <ShieldCheck className="w-5 h-5 text-tertiary" />, title: '10% Backup Fund Ensures Solvency', desc: 'A dedicated backup reserve guarantees reward payouts even in edge cases. Protocol stability is non-negotiable — winners always get paid.' },
  ];

  const legend = [
    { color: '#4edea3', label: 'Charity & Social Impact Pool', pct: '35%' },
    { color: '#ffb95f', label: 'Rewards Pool (Loyalists)', pct: '30%' },
    { color: '#ffb3af', label: 'Protocol Treasury', pct: '25%' },
    { color: '#fc7c78', label: 'Backup Reserve Fund', pct: '10%' },
  ];

  return (
    <div id="economy" className="w-full bg-surface-container/30 border-y border-white/5 py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col mb-16">
          <span className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-primary uppercase mb-4">
            // THE MONEY ENGINE
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair tracking-tight leading-[1.1] mb-6">
            Every Staked Dollar<br />Works While You Do
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl font-light leading-relaxed">
            Locked user stakes don&apos;t sit idle. They&apos;re deployed into DeFi yield strategies — generating protocol revenue that funds rewards and sustains the ecosystem indefinitely.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Donut Chart Visual */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-10">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
                {/* Charity 35% */}
                <circle cx="140" cy="140" r="100" fill="none" stroke="#4edea3" strokeWidth="36" strokeDasharray="219.9 628.3" strokeDashoffset="0" className="opacity-90" />
                {/* Rewards 30% */}
                <circle cx="140" cy="140" r="100" fill="none" stroke="#ffb95f" strokeWidth="36" strokeDasharray="188.5 628.3" strokeDashoffset="-219.9" className="opacity-90" />
                {/* Treasury 25% */}
                <circle cx="140" cy="140" r="100" fill="none" stroke="#ffb3af" strokeWidth="36" strokeDasharray="157.1 628.3" strokeDashoffset="-408.4" className="opacity-90" />
                {/* Backup 10% */}
                <circle cx="140" cy="140" r="100" fill="none" stroke="#fc7c78" strokeWidth="36" strokeDasharray="62.8 628.3" strokeDashoffset="-565.5" className="opacity-90" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-playfair text-2xl sm:text-3xl font-extrabold text-primary tracking-tighter uppercase">Slash</span>
                <span className="font-mono text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Distribution</span>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full max-w-sm space-y-4">
              {legend.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs sm:text-sm text-muted-foreground flex-1">{item.label}</span>
                  <span className="font-mono text-xs sm:text-sm font-medium text-foreground">{item.pct}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Points List */}
          <div className="space-y-10">
            {points.map((point, idx) => (
              <div key={idx} className="flex gap-6 group">
                <div className="w-12 h-12 rounded-xl bg-surface-container border border-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  {point.icon}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base sm:text-lg font-bold font-playfair mb-2 group-hover:text-primary transition-colors">
                    {point.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {point.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
