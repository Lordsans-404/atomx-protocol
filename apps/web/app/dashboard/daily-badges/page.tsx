'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft, Loader2, Medal } from 'lucide-react';
import Link from 'next/link';

export default function DailyBadgesPage() {
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
        <p className="text-white/60">Please connect your wallet to view your daily badges.</p>
      </div>
    );
  }

  const dailyBadges = medals.filter((m) => m.nft_type === 'daily_badge');

  return (
    <div className="container px-6 py-8 mx-auto max-w-6xl">
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
        <h1 className="flex items-center gap-3 text-4xl font-bold text-white font-playfair">
          <Medal className="w-8 h-8 text-yellow-400" />
          Daily Badges Collection
        </h1>
        <p className="mt-3 text-white/60 text-lg max-w-2xl">
          A showcase of your daily discipline. Every successful proof submission mints a unique cNFT badge.
        </p>
      </div>

      <div className="p-8 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-h-[500px]">
        {isLoadingMedals ? (
          <div className="flex flex-col items-center justify-center py-20 h-full">
            <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mb-4" />
            <p className="text-white/50">Loading your collection from blockchain...</p>
          </div>
        ) : dailyBadges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 h-full">
            <div className="w-24 h-24 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-dashed border-white/20">
              <span className="text-4xl text-white/20">?</span>
            </div>
            <p className="text-xl font-bold text-white/70 mb-2">No badges yet</p>
            <p className="text-white/40 text-center max-w-sm">Complete your daily commitments to start earning cNFT badges. Keep up the consistency!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {dailyBadges.map((medal) => (
              <div key={medal.mint_address} className="flex flex-col items-center group">
                <div className="relative w-full aspect-square p-2 transition-all duration-300 border-2 border-yellow-500/30 rounded-2xl bg-black/40 group-hover:-translate-y-2 group-hover:border-yellow-400 group-hover:shadow-[0_10px_30px_rgba(234,179,8,0.2)] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <img 
                    src={medal.image_url} 
                    alt={medal.name} 
                    className="w-full h-full object-cover rounded-xl bg-black/60 relative z-10" 
                  />
                </div>
                <div className="mt-4 w-full text-center">
                  <p className="text-sm font-semibold text-white/90 line-clamp-2 group-hover:text-yellow-400 transition-colors px-1" title={medal.name}>
                    {medal.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
