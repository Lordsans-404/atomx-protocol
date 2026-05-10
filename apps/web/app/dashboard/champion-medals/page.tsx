'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import Link from 'next/link';
import { ChampionMedalCard } from '@/components/dashboard/ChampionMedalCard';

export default function ChampionMedalsPage() {
  const { connected, publicKey } = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const [medals, setMedals] = useState<any[]>([]);
  const [isLoadingMedals, setIsLoadingMedals] = useState(true);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!publicKey) return;
    setIsLoadingMedals(true);
    fetch(`/api/medals?owner=${publicKey.toBase58()}`)
      .then(res => res.json())
      .then(data => {
        setMedals(data.medals || []);
      })
      .catch(err => console.error('Error fetching medals:', err))
      .finally(() => setIsLoadingMedals(false));
  }, [publicKey]);

  if (!isMounted) return null;

  if (!connected) {
    return (
      <div className="container px-6 py-12 mx-auto max-w-7xl flex justify-center">
        <p className="text-white/60">Please connect your wallet to view your champion medals.</p>
      </div>
    );
  }

  const championMedals = medals.filter((m) => m.nft_type === 'completion_medal');

  return (
    <div className="container px-6 py-8 mx-auto max-w-6xl">
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
        <h1 className="flex items-center gap-3 text-4xl font-bold text-white font-playfair">
          <Trophy className="w-8 h-8 text-secondary" />
          Champion Medals Collection
        </h1>
        <p className="mt-3 text-muted-foreground text-lg max-w-2xl">
          A showcase of your ultimate victories. Every successfully completed commitment mints a unique Champion cNFT.
        </p>
      </div>

      <div className="p-8 border bg-card/40 backdrop-blur-xl border-white/5 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-h-[500px]">
        {isLoadingMedals ? (
          <div className="flex flex-col items-center justify-center py-20 h-full">
            <Loader2 className="w-10 h-10 text-secondary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading your collection from blockchain...</p>
          </div>
        ) : championMedals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 h-full">
            <div className="w-24 h-24 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-dashed border-white/10">
              <span className="text-4xl text-muted-foreground/40">?</span>
            </div>
            <p className="text-xl font-bold text-white/80 mb-2">No medals yet</p>
            <p className="text-muted-foreground text-center max-w-sm">Complete your commitments to earn Champion Medals. Keep pushing!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {championMedals.map((medal) => (
              <ChampionMedalCard key={medal.mint_address} medal={medal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
