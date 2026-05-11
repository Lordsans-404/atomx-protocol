'use client';

import { Zap, Cpu, Palette, Radio, Database, Ghost, Lock, Clock } from 'lucide-react';

/**
 * TechStack component showing the technology infrastructure of the protocol.
 */
export default function TechStack() {
  const techItems = [
    { icon: <Zap className="w-5 h-5" />, name: 'Solana + Anchor', role: 'Smart contracts & escrow' },
    { icon: <Cpu className="w-5 h-5" />, name: 'Groq Vision', role: 'AI proof validation' },
    { icon: <Palette className="w-5 h-5" />, name: 'Crossmint API', role: 'Compressed NFT minting' },
    { icon: <Radio className="w-5 h-5" />, name: 'Helius Webhook', role: 'On-chain event indexer' },
    { icon: <Database className="w-5 h-5" />, name: 'Supabase', role: 'Off-chain metadata' },
    { icon: <Ghost className="w-5 h-5" />, name: 'Phantom Wallet', role: 'Auto-connect, SSR-safe' },
    { icon: <Lock className="w-5 h-5" />, name: 'SHA-256 Hashing', role: 'Anti-plagiarism registry' },
    { icon: <Clock className="w-5 h-5" />, name: 'Cron Engine', role: 'Automated slash enforcement' },
  ];

  return (
    <div id="tech" className="w-full bg-surface-container/30 border-y border-white/5 py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col mb-16">
          <span className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-primary uppercase mb-4">
            // TECHNOLOGY
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair tracking-tight leading-[1.1] mb-6">
            Production-Grade<br />Web3 Infrastructure
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl font-light leading-relaxed">
            Every component of Atomx is purpose-built — from the Rust smart contracts on Solana to the AI validator running on Groq.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {techItems.map((item, idx) => (
            <div key={idx} className="p-6 rounded-xl bg-surface-container border border-white/5 hover:border-white/10 transition-all text-center group">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <div className="font-mono text-[11px] text-primary uppercase tracking-wider mb-1">
                {item.name}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {item.role}
              </div>
            </div>
          ))}
        </div>

        {/* Security callouts */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-xl border border-primary/20 bg-primary/5">
            <div className="font-mono text-[9px] text-primary tracking-[0.15em] uppercase mb-3">ANTI-PLAGIARISM</div>
            <p className="text-xs text-muted-foreground leading-relaxed">Every proof image is SHA-256 hashed and stored on-chain. Reusing a photo is mathematically impossible.</p>
          </div>
          <div className="p-6 rounded-xl border border-secondary/20 bg-secondary/5">
            <div className="font-mono text-[9px] text-secondary tracking-[0.15em] uppercase mb-3">SEQUENTIAL VALIDATION</div>
            <p className="text-xs text-muted-foreground leading-relaxed">Smart contract enforces sequential day proofs. Day 3 can only be submitted after Day 2 — no skipping allowed.</p>
          </div>
          <div className="p-6 rounded-xl border border-tertiary/20 bg-tertiary/5">
            <div className="font-mono text-[9px] text-tertiary tracking-[0.15em] uppercase mb-3">50% MINIMUM RULE</div>
            <p className="text-xs text-muted-foreground leading-relaxed">Smart contract rejects proofs under 50% of daily target minutes. No gaming the timer — it&apos;s enforced in Rust.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
