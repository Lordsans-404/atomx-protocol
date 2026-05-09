'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Activity, Flame, Loader2, Medal, Plus, Target, Trophy, Wallet, TrendingDown } from 'lucide-react';
import Link from 'next/link';

import CreateCommitmentModal from '@/components/dashboard/CreateCommitmentModal';
import { ChampionMedalCard } from '@/components/dashboard/ChampionMedalCard';
import { useCommitments, CommitmentData } from '@/hooks/useCommitments';

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return { label: 'Active', classes: 'bg-[#00FFA3]/20 text-[#00FFA3] border border-[#00FFA3]/30' };
    case 'completed':
      return { label: 'Completed', classes: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
    case 'failed':
    case 'slashed':
      return { label: status === 'failed' ? 'Failed' : 'Slashed', classes: 'bg-red-500/20 text-red-400 border border-red-500/30' };
    default:
      return { label: 'Unknown', classes: 'bg-white/10 text-white/50 border border-white/20' };
  }
}

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { commitments, isLoading, refetch } = useCommitments();
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

  // Split medals into champion and daily badge categories for separate rendering
  const championMedals = medals.filter((m) => m.nft_type === 'completion_medal');
  const dailyBadges = medals.filter((m) => m.nft_type === 'daily_badge');

  // Computed stats from real on-chain data
  const activeCommitmentsList = commitments.filter(c => c.status === 'active' && !c.isOverdue);
  const totalActiveStaked = activeCommitmentsList.reduce((sum, c) => sum + c.remainingStake, 0);
  const completedCount = commitments.filter(c => c.status === 'completed').length;
  const failedCount = commitments.filter(c => c.status === 'failed' || c.status === 'slashed' || (c.status === 'active' && c.isOverdue)).length;
  const totalCount = commitments.length;
  const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-[#00FFA3]/10 flex items-center justify-center border border-[#00FFA3]/30 shadow-[0_0_30px_rgba(0,255,163,0.2)]">
          <Wallet className="w-12 h-12 text-[#00FFA3]" />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white font-playfair">
          Access Your Dashboard
        </h1>
        <p className="max-w-md mb-8 text-white/60">
          Connect your Solana wallet to view your active commitments, track your progress, and manage your staked USDT.
        </p>
        <div className="wallet-adapter-button-trigger">
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container px-6 py-8 mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col items-start justify-between mb-12 space-y-4 md:flex-row md:space-y-0 md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-white font-playfair">
              Welcome back, <span className="text-[#00FFA3]">{publicKey?.toBase58().substring(0, 4)}...{publicKey?.toBase58().substring(publicKey.toBase58().length - 4)}</span>
            </h1>
            <p className="mt-2 text-white/60">Here is your discipline overview.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/history"
              className="px-6 py-3 text-sm font-semibold text-white/70 transition-all border border-white/10 rounded-full hover:bg-white/5 hover:text-white"
            >
              View History
            </Link>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 font-bold text-black uppercase transition-all bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,255,163,0.3)]"
            >
              <Plus className="w-5 h-5" />
              New Commitment
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Left Column: Overview & Medals */}
          <div className="space-y-8 lg:col-span-1">
            {/* Overview Card */}
            <div className="p-6 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <h2 className="flex items-center gap-2 mb-6 text-xl font-semibold text-white">
                <Activity className="w-5 h-5 text-[#00FFA3]" />
                Account Overview
              </h2>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-white/50">Active Stake</p>
                  <p className="text-3xl font-bold text-white">
                    {isLoading ? '...' : totalActiveStaked.toFixed(2)} <span className="text-lg text-[#00FFA3]">USDT</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                    <Flame className="w-6 h-6 mb-2 text-[#00FFA3]" />
                    <p className="text-sm text-white/50">Success Rate</p>
                    <p className="text-xl font-bold text-white">{isLoading ? '...' : `${successRate}%`}</p>
                  </div>
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                    <TrendingDown className="w-6 h-6 mb-2 text-red-500" />
                    <p className="text-sm text-white/50">Failed Habits</p>
                    <p className="text-xl font-bold text-red-500">{isLoading ? '...' : failedCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Medal Showcase Card */}
            <div className="p-6 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <h2 className="flex items-center gap-2 mb-6 text-xl font-semibold text-white">
                <Medal className="w-5 h-5 text-yellow-400" />
                Medal Showcase
              </h2>
              {isLoadingMedals ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                </div>
              ) : medals.length === 0 ? (
                <div className="flex flex-col items-center py-4">
                  <p className="text-sm text-white/50 text-center">No medals yet.<br/>Complete challenges to earn cNFTs!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Champion Medals — featured row with gold treatment */}
                  {championMedals.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/80 mb-3">
                        🏆 Champion
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        {championMedals.map((medal) => (
                          <ChampionMedalCard key={medal.mint_address} medal={medal} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Daily Badges — standard grid */}
                  {dailyBadges.length > 0 && (
                    <div>
                      {championMedals.length > 0 && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">
                          Daily Badges
                        </p>
                      )}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        {dailyBadges.slice(0, 3).map((medal) => (
                          <div key={medal.mint_address} className="flex flex-col items-center group">
                            <div className="w-16 h-16 p-1 mb-2 transition-transform border-2 border-yellow-500/50 rounded-xl group-hover:scale-110 group-hover:border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                              <img src={medal.image_url} alt={medal.name} className="w-full h-full object-cover rounded-lg bg-black/50" />
                            </div>
                            <p className="text-xs text-center text-white/70 line-clamp-2" title={medal.name}>{medal.name}</p>
                          </div>
                        ))}
                        {/* Empty slot filler for aesthetics */}
                        {dailyBadges.length < 3 && Array.from({ length: 3 - dailyBadges.length }).map((_, i) => (
                          <div key={`empty-${i}`} className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-16 h-16 mb-2 border border-dashed rounded-xl border-white/20 bg-white/5">
                              <span className="text-2xl text-white/20">?</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {dailyBadges.length > 3 && (
                        <div className="flex justify-center mt-2">
                          <Link href="/dashboard/daily-badges" className="text-xs text-white/50 hover:text-white hover:underline transition-colors">
                            View all {dailyBadges.length} daily badges →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Commitments */}
          <div className="lg:col-span-2">
            <div className="p-6 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-h-[600px]">
              <h2 className="flex items-center gap-2 mb-8 text-2xl font-bold text-white font-playfair">
                <Target className="w-6 h-6 text-[#00FFA3]" />
                Your Commitments
              </h2>
              
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 mb-4 text-[#00FFA3] animate-spin" />
                  <p className="text-white/50">Loading commitments from blockchain...</p>
                </div>
              ) : activeCommitmentsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-20 h-20 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-dashed border-white/20">
                    <Target className="w-10 h-10 text-white/20" />
                  </div>
                  <p className="mb-2 text-lg font-semibold text-white/70">No active commitments</p>
                  <p className="mb-6 text-sm text-white/40">You don't have any ongoing challenges right now.</p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-black uppercase bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Start New Challenge
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeCommitmentsList.map((commitment) => {
                    const progressPercentage = commitment.durationDays > 0
                      ? Math.min((commitment.proofCount / commitment.durationDays) * 100, 100)
                      : 0;
                    const badge = statusBadge(commitment.status);
                    const createdDate = new Date(commitment.createdAt * 1000);

                    return (
                      <div key={commitment.publicKey} className={`p-6 transition-all border rounded-2xl group ${
                        commitment.isOverdue 
                          ? 'bg-red-950/30 border-red-500/30 hover:border-red-400/50' 
                          : 'bg-black/40 border-white/10 hover:border-[#00FFA3]/30'
                      }`}>
                        {/* Overdue Warning */}
                        {commitment.isOverdue && (
                          <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-300 border rounded-xl bg-red-500/10 border-red-500/20 animate-pulse">
                            <span className="text-lg">⚠️</span>
                            <div>
                              <p className="font-semibold">Overdue! {commitment.missedDays} day{commitment.missedDays > 1 ? 's' : ''} missed</p>
                              <p className="text-xs text-red-400/70">
                                {commitment.failedCount === 0 
                                  ? 'First miss → 40% stake at risk of being slashed'
                                  : 'Second miss → Full stake will be slashed!'}
                                {commitment.durationDays <= 7 && ' (Short commitment: full slash)'}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className={`text-xl font-bold transition-colors ${
                                commitment.isOverdue ? 'text-red-300 group-hover:text-red-200' : 'text-white group-hover:text-[#00FFA3]'
                              }`}>
                                {commitment.title}
                              </h3>
                              <span className="px-2 py-0.5 text-[10px] font-semibold text-white/60 border border-white/20 rounded-md">
                                {commitment.category || 'Other'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-white/50">
                              {commitment.dailyTargetMinutes} mins / day • {commitment.stakeAmount} USDT Staked
                            </p>
                            <p className="mt-1 text-xs text-white/30">
                              Created: {createdDate.toLocaleDateString()} • Day {commitment.currentDay + 1} of {commitment.durationDays}
                            </p>
                          </div>
                          <div className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${badge.classes}`}>
                            {badge.label}
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-6">
                          <div className="flex justify-between mb-2 text-sm">
                            <span className="font-medium text-white">{commitment.proofCount} / {commitment.durationDays} Days Proved</span>
                            <span className="text-white/50">
                              {commitment.remainingStake.toFixed(2)} USDT Remaining
                            </span>
                          </div>
                          <div className="w-full h-3 overflow-hidden bg-white/10 rounded-full">
                            <div 
                              className={`h-full rounded-full shadow-[0_0_10px_rgba(0,255,163,0.5)] transition-all duration-500 ${
                                commitment.isOverdue ? 'bg-gradient-to-r from-red-500 to-orange-400' : 'bg-gradient-to-r from-[#00FFA3] to-emerald-400'
                              }`}
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex gap-4 mt-4 text-xs text-white/40">
                          <span>⚡ Early finish: {commitment.earlyFinishCount}</span>
                          <span>❌ Failed: {commitment.failedCount}</span>
                          <span>📊 Progress: {Math.round(progressPercentage)}%</span>
                        </div>

                        {/* Action */}
                        <div className="flex justify-end mt-4">
                          <Link 
                            href={`/dashboard/commitments/${commitment.publicKey}`}
                            className={`px-6 py-2 text-sm font-semibold transition-all border rounded-full ${
                              commitment.isOverdue
                                ? 'text-red-300 border-red-500/30 hover:bg-red-500 hover:text-white hover:border-red-500 animate-pulse'
                                : commitment.proofCount >= commitment.durationDays && commitment.status === 'active'
                                ? 'text-black bg-[#00FFA3] hover:scale-105 shadow-[0_0_15px_rgba(0,255,163,0.3)]'
                                : 'text-white border-white/20 hover:bg-[#00FFA3] hover:text-black hover:border-[#00FFA3]'
                            }`}
                          >
                            {commitment.isOverdue ? '🔥 Submit Proof Now!' : commitment.proofCount >= commitment.durationDays && commitment.status === 'active' ? '🎉 Claim Rewards!' : 'Start Timer / Upload Proof'}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      
      <CreateCommitmentModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          // Refetch commitments from blockchain
          setTimeout(() => refetch(), 2000);
        }}
      />
    </>
  );
}
