'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft, History, Loader2, Target, XCircle, CheckCircle2, AlertTriangle, Skull, TrendingDown } from 'lucide-react';
import Link from 'next/link';

import { useCommitments, CommitmentData } from '@/hooks/useCommitments';

function historyStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return { label: 'Victory', classes: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', icon: <CheckCircle2 className="w-4 h-4" /> };
    case 'failed':
    case 'slashed':
      return { label: 'Defeated', classes: 'bg-red-500/20 text-red-400 border border-red-500/30', icon: <Skull className="w-4 h-4" /> };
    default:
      return { label: status, classes: 'bg-white/10 text-white/50 border border-white/20', icon: null };
  }
}

export default function HistoryPage() {
  const { connected } = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const { commitments, isLoading } = useCommitments();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const finishedCommitments = commitments.filter(c => c.status !== 'active' || c.isOverdue);
  const totalWasted = finishedCommitments
    .filter(c => c.status === 'failed' || c.status === 'slashed' || (c.status === 'active' && c.isOverdue))
    .reduce((sum, c) => sum + (c.stakeAmount - c.remainingStake), 0);

  const brokenHabits = finishedCommitments.filter(c => c.status === 'failed' || c.status === 'slashed' || (c.status === 'active' && c.isOverdue)).length;

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <p className="text-white/60 mb-4">Please connect your wallet to view your history.</p>
      </div>
    );
  }

  return (
    <div className="container px-6 py-8 mx-auto max-w-5xl">
      {/* Back Button */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 mb-8 text-sm text-white/50 hover:text-[#00FFA3] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white font-playfair flex items-center gap-3">
            <History className="w-8 h-8 text-white/40" />
            Discipline History
          </h1>
          <p className="mt-2 text-white/50 italic">"The only way to do great work is to love what you do, or suffer the consequences of not doing it."</p>
        </div>

        {/* Psychological Impact Stats */}
        {brokenHabits > 0 && (
          <div className="flex gap-4">
            <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-red-400/60 font-bold">Wasted Money</p>
                <p className="text-xl font-bold text-red-400">${totalWasted.toFixed(2)} <span className="text-xs">USDT</span></p>
              </div>
            </div>
            <div className="p-4 bg-orange-950/20 border border-orange-500/20 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-orange-400/60 font-bold">Broken Habits</p>
                <p className="text-xl font-bold text-orange-400">{brokenHabits}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-h-[500px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 mb-4 text-[#00FFA3] animate-spin" />
            <p className="text-white/50">Digging through your past...</p>
          </div>
        ) : finishedCommitments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Target className="w-16 h-16 text-white/10 mb-6" />
            <h3 className="text-xl font-bold text-white/70">The slate is clean</h3>
            <p className="text-white/40 max-w-xs mt-2">You haven't completed or failed any challenges yet. Every failure is a ghost of a version of you that didn't make it.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {finishedCommitments.map((commitment) => {
              console.log(commitment)
              const isFailed = commitment.status === 'failed' || commitment.status === 'slashed';
              const badge = historyStatusBadge(commitment.status);
              const wastedAmount = commitment.stakeAmount - commitment.remainingStake;

              return (
                <div key={commitment.publicKey} className={`relative overflow-hidden p-6 border rounded-2xl transition-all ${isFailed
                    ? 'bg-red-950/10 border-red-950/40 grayscale-[0.3] hover:grayscale-0'
                    : 'bg-blue-950/10 border-blue-950/40'
                  }`}>
                  {/* Background Watermark for Impact */}
                  {isFailed && (
                    <Skull className="absolute -right-4 -bottom-4 w-32 h-32 text-red-500/5 rotate-12" />
                  )}

                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-2xl font-bold font-playfair ${isFailed ? 'text-red-400/80' : 'text-blue-400'}`}>
                          {commitment.title}
                        </h3>
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badge.classes}`}>
                          {badge.icon}
                          {badge.label}
                        </div>
                      </div>

                      <p className="text-white/50 text-sm mb-4 max-w-2xl">
                        {isFailed
                          ? `You gave up on this habit after ${commitment.proofCount} days. This decision cost you financially and mentally. The version of you that completed this doesn't exist anymore.`
                          : `Triumph. You maintained your discipline for ${commitment.durationDays} days. This is the foundation of who you are becoming.`
                        }
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-black/30 rounded-xl">
                          <p className="text-[10px] uppercase text-white/30 font-bold mb-1">Duration</p>
                          <p className="text-white font-semibold">{commitment.durationDays} Days</p>
                        </div>
                        <div className="p-3 bg-black/30 rounded-xl">
                          <p className="text-[10px] uppercase text-white/30 font-bold mb-1">Consistency</p>
                          <p className="text-white font-semibold">{Math.round((commitment.proofCount / commitment.durationDays) * 100)}%</p>
                        </div>
                        <div className="p-3 bg-black/30 rounded-xl">
                          <p className="text-[10px] uppercase text-white/30 font-bold mb-1">Initial Stake</p>
                          <p className="text-white font-semibold">{commitment.stakeAmount} USDT</p>
                        </div>
                        <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                          <p className="text-[10px] uppercase text-white/30 font-bold mb-1">Final Result</p>
                          <p className={`font-bold ${isFailed ? 'text-red-400' : 'text-[#00FFA3]'}`}>
                            {isFailed ? `-$${wastedAmount.toFixed(2)}` : `+$${(commitment.remainingStake - commitment.stakeAmount).toFixed(2)}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0">
                      <Link
                        href={`/dashboard/commitments/${commitment.publicKey}`}
                        className="px-6 py-2 text-xs font-bold text-white/40 border border-white/10 rounded-full hover:bg-white/5 hover:text-white transition-all text-center"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>

                  {/* Red bar for failure impact */}
                  {isFailed && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600/50" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Quote */}
      <div className="mt-12 text-center text-white/20 text-xs uppercase tracking-[0.2em]">
        Every failed commitment is a debt you owe to your future self
      </div>
    </div>
  );
}
