'use client';

import { Eye, Flame, Zap, Award, Brain, BarChart3, Handshake } from 'lucide-react';

/**
 * Science component explaining the behavioral science principles behind Atomx.
 * Uses a horizontal phase loop and detailed cards.
 */
export default function Science() {
  const phases = [
    { num: '01', icon: <Eye className="w-6 h-6" />, title: 'Cue', desc: 'Your commitment is public, on-chain, and financially at risk. Every day you open the app, you\'re reminded of what you\'ve staked.' },
    { num: '02', icon: <Flame className="w-6 h-6" />, title: 'Craving', desc: 'Loss aversion kicks in. Your USDT is locked — the fear of a slash creates powerful intrinsic motivation to execute daily.' },
    { num: '03', icon: <Zap className="w-6 h-6" />, title: 'Response', desc: 'You perform the habit, prove it with AI-verified photo evidence, and submit it on-chain within your daily window.' },
    { num: '04', icon: <Award className="w-6 h-6" />, title: 'Reward', desc: 'Instant dopamine: an NFT badge, a visible chain on your streak, and the compounding identity of someone who keeps their word.' },
  ];

  const cards = [
    { icon: <Brain className="w-6 h-6 text-primary" />, title: 'The Cardinal Rule', desc: 'What is immediately rewarded is repeated. What is immediately punished is avoided. Atomx creates both signals simultaneously through staking and instant NFT rewards.', source: 'REF: Atomic Habits, Ch.15' },
    { icon: <BarChart3 className="w-6 h-6 text-secondary" />, title: 'Visual Habit Tracking', desc: 'Your on-chain streak is visible proof of your identity. The compounding visual of consecutive daily badges creates the "never miss twice" psychological anchor.', source: 'REF: Atomic Habits, Ch.16' },
    { icon: <Handshake className="w-6 h-6 text-tertiary" />, title: 'Accountability Contract', desc: 'A smart contract is the ultimate accountability partner. It doesn\'t negotiate. It doesn\'t accept excuses. Your funds, your word, your identity — all on-chain.', source: 'REF: Atomic Habits, Ch.17' },
  ];

  return (
    <section id="science" className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/5">
      <div className="flex flex-col mb-16">
        <span className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-primary uppercase mb-4">
          // THE SCIENCE BEHIND IT
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair tracking-tight leading-[1.1] mb-6">
          Built on Behavioral<br />Neuroscience
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl font-light leading-relaxed">
          Atomx isn&apos;t just an app — it&apos;s an implementation of proven behavioral architecture from Atomic Habits applied to Web3 rails.
        </p>
      </div>

      {/* Loop Visual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-white/5 rounded-2xl overflow-hidden mb-16 shadow-xl">
        {phases.map((phase, idx) => (
          <div key={idx} className="relative p-8 border-b sm:border-b-0 sm:border-r border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
            <span className="font-mono text-[9px] text-muted-foreground tracking-[0.2em] uppercase mb-6 block">
              Phase {phase.num}
            </span>
            <div className="text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
              {phase.icon}
            </div>
            <h3 className="text-lg font-bold font-playfair mb-3">{phase.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {phase.desc}
            </p>
            {idx < 3 && (
              <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-white/10 group-hover:text-primary/30 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detail Cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="p-8 rounded-2xl bg-surface-container border border-white/5 hover:border-primary/20 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="mb-6">{card.icon}</div>
            <h4 className="text-base font-bold font-playfair mb-3">{card.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              {card.desc}
            </p>
            <div className="font-mono text-[9px] text-muted-foreground/50 tracking-wider">
              {card.source}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
