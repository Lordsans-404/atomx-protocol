'use client';

import { Check, Zap, Shield, Cpu, Trophy, Lock } from 'lucide-react';

/**
 * HowItWorks component explaining the protocol lifecycle.
 * Features a split layout with steps on one side and a sticky visual on the other for desktop.
 */
export default function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Define Your Commitment',
      badge: 'ON-CHAIN',
      badgeClass: 'bg-primary/10 text-primary border-primary/20',
      desc: 'Set a habit (reading, exercise, coding), duration in days, daily target in minutes, and stake an amount of USDT. Your stake is locked in an escrow vault — publicly verifiable on Solana.',
    },
    {
      num: '02',
      title: 'Execute Daily & Submit Proof',
      badge: 'AI VERIFIED',
      badgeClass: 'bg-tertiary/10 text-tertiary border-tertiary/20',
      desc: 'Complete your habit, hit the in-app timer, and upload a photo. AI analyzes your image against your commitment context — confidence score ≥30 = valid proof, submitted on-chain.',
    },
    {
      num: '03',
      title: 'Earn Daily Validator NFTs',
      badge: 'cNFT',
      badgeClass: 'bg-secondary/10 text-secondary border-secondary/20',
      desc: 'Every verified day mints a compressed NFT badge on Solana. Your on-chain habit history becomes a verifiable identity — a permanent track record of discipline.',
    },
    {
      num: '04',
      title: 'Claim Rewards + Champion Medal',
      desc: 'Complete all days → claim your full stake back, plus a loyalty bonus (1–3% from the global rewards pool), and a unique Champion Medal NFT.',
    },
    {
      num: '05',
      title: 'Miss a Day? Slash Happens.',
      desc: 'Miss your deadline: short commitments (≤7 days) get 100% slashed. Longer ones get 40% on first failure, 100% on second. Slashed funds are distributed into the ecosystem pools.',
    },
  ];

  return (
    <section id="how" className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col mb-16">
        <span className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-primary uppercase mb-4">
          // HOW IT WORKS
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair tracking-tight leading-[1.1] mb-6">
          Commit. Prove. Earn.<br />Or Pay the Price.
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl font-light leading-relaxed">
          A simple loop backed by behavioral science, smart contracts, and AI — that makes breaking your habits genuinely costly and keeping them genuinely rewarding.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
        {/* Steps List */}
        <div className="flex flex-col divide-y divide-white/5">
          {steps.map((step, idx) => (
            <div key={idx} className="group py-8 first:pt-0 last:pb-0 transition-all duration-300">
              <div className="flex gap-6">
                <span className="font-mono text-xs text-muted-foreground/50 tracking-widest pt-1">
                  {step.num}
                </span>
                <div className="flex flex-col flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="text-lg sm:text-xl font-bold font-playfair text-foreground group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    {step.badge && (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${step.badgeClass}`}>
                        {step.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual Lifecycle */}
        <div className="lg:sticky lg:top-32 p-6 sm:p-8 rounded-2xl bg-card border border-white/5 shadow-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />
          
          <div className="relative z-10 flex flex-col">
            <span className="font-mono text-[10px] text-muted-foreground tracking-[0.2em] uppercase mb-8 block">
              // COMMITMENT LIFECYCLE
            </span>

            <div className="space-y-4">
              <FlowNode icon={<Lock className="w-4 h-4 text-secondary" />} title="Stake USDT" sub="Escrow vault on Solana" color="bg-secondary/10" />
              <Arrow />
              <FlowNode icon={<Cpu className="w-4 h-4 text-tertiary" />} title="AI Proof Validation" sub="Vision-enabled AI Analysis" color="bg-tertiary/10" />
              <Arrow />
              <FlowNode icon={<Shield className="w-4 h-4 text-primary" />} title="On-Chain Proof Record" sub="Sequential day verification" color="bg-primary/10" />
              <Arrow />
              <FlowNode icon={<Trophy className="w-4 h-4 text-secondary" />} title="Daily Badge cNFT Minted" sub="Compressed NFT" color="bg-secondary/10" />
            </div>

            <div className="mt-8 grid gap-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-4">
                <Check className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <div className="text-xs font-bold text-primary uppercase tracking-wider">All Days Complete</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Claim stake + bonus + Champion Medal</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-error/5 border border-error/20 flex items-center gap-4">
                <Zap className="w-5 h-5 text-error shrink-0" />
                <div>
                  <div className="text-xs font-bold text-error uppercase tracking-wider">Missed Deadline</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Stake slashed → distributed to pools</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowNode({ icon, title, sub, color }: { icon: React.ReactNode; title: string; sub: string; color: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container border border-white/5 hover:border-white/10 transition-all group/node">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{sub}</div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center text-muted-foreground/30 py-1">
      <div className="w-px h-4 bg-gradient-to-b from-white/10 to-transparent" />
    </div>
  );
}
