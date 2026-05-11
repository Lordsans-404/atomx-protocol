'use client';

import { Globe, Trophy, Link as LinkIcon } from 'lucide-react';

/**
 * SocialImpact component highlighting the humanitarian and community benefits.
 */
export default function SocialImpact() {
  const cards = [
    { pct: '35%', label: 'Charity Pool', desc: 'Every slash contributes to verified global causes — environmental, humanitarian, and community development. Distributed transparently, on-chain.', icon: <Globe className="w-16 h-16 opacity-10 absolute -bottom-4 -right-4" />, color: 'text-primary' },
    { pct: '30%', label: 'Loyalty Rewards', desc: 'Those who keep their commitments earn bonuses funded by those who don\'t. A direct, fair transfer from quitters to champions.', icon: <Trophy className="w-16 h-16 opacity-10 absolute -bottom-4 -right-4" />, color: 'text-secondary' },
    { pct: '∞', label: 'On-Chain Identity', desc: 'Every completed commitment builds a permanent, verifiable reputation on Solana. Your discipline becomes your digital identity.', icon: <LinkIcon className="w-16 h-16 opacity-10 absolute -bottom-4 -right-4" />, color: 'text-tertiary' },
  ];

  return (
    <section id="impact" className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      <div className="flex flex-col items-center text-center mb-16">
        <span className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-primary uppercase mb-4">
          // SOCIAL IMPACT
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair tracking-tight leading-[1.1] mb-6">
          Every Failed Habit<br />Funds a Better World
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl font-light leading-relaxed">
          35% of all slashed stakes go directly to a transparent charity pool. Personal failure becomes collective impact — this is what makes Atomx a social protocol, not just a habit app.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mb-16">
        {cards.map((card, idx) => (
          <div key={idx} className="group relative p-8 rounded-2xl bg-surface-container border border-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden">
            <div className={`font-playfair text-5xl sm:text-6xl font-extrabold tracking-tighter mb-4 transition-transform group-hover:scale-110 duration-500 ${card.color}`}>
              {card.pct}
            </div>
            <h3 className="text-lg font-bold font-playfair text-foreground mb-3">{card.label}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed relative z-10">
              {card.desc}
            </p>
            {card.icon}
          </div>
        ))}
      </div>

      <div className="p-8 sm:p-12 rounded-2xl bg-card border border-white/5 relative overflow-hidden max-w-4xl mx-auto group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(78,222,163,0.05)_0%,transparent_70%)]" />
        <div className="relative z-10 text-center">
          <span className="font-mono text-[9px] text-muted-foreground tracking-[0.2em] uppercase mb-6 block">
            // THE NETWORK EFFECT
          </span>
          <p className="text-xl sm:text-2xl font-bold font-playfair tracking-tight leading-relaxed max-w-2xl mx-auto">
            The more people fail, the more charity gets funded. The more people succeed, the stronger their on-chain identity. <span className="text-primary">Both outcomes make the world better.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
