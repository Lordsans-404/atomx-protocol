'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CommitmentHeaderProps {
  title: string;
  category: string;
  description: string;
  targetMinutes: number;
  stakeAmount: number;
  daysCompleted: number;
  daysTotal: number;
  remainingStake: number;
  failedCount: number;
  earlyFinishCount: number;
  statusLabel: string;
}

/**
 * CommitmentHeader component displays the main information and progress of a commitment
 */
export const CommitmentHeader: React.FC<CommitmentHeaderProps> = ({
  title,
  category,
  description,
  targetMinutes,
  stakeAmount,
  daysCompleted,
  daysTotal,
  remainingStake,
  failedCount,
  earlyFinishCount,
  statusLabel,
}) => {
  const overallProgress = daysTotal > 0 ? Math.min((daysCompleted / daysTotal) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#00FFA3] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Main Info Card */}
      <div className="p-6 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-white font-playfair tracking-tight">{title}</h1>
              <span className="px-3 py-1 text-xs font-semibold text-white/70 bg-white/10 rounded-lg backdrop-blur-md border border-white/5">
                {category}
              </span>
            </div>
            {description && (
              <p className="mt-2 text-sm italic text-white/60 max-w-xl">"{description}"</p>
            )}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50">
              <span>{targetMinutes} mins/day</span>
              <span className="text-white/20">•</span>
              <span>{(stakeAmount / 1e6).toFixed(2)} USDT Staked</span>
              <span className="text-white/20">•</span>
              <span>Day {daysCompleted + 1} of {daysTotal}</span>
            </div>
          </div>
          
          <span className={`self-start px-4 py-1.5 text-xs font-bold uppercase rounded-full tracking-wider ${
            statusLabel === 'Active' ? 'bg-[#00FFA3]/20 text-[#00FFA3] border border-[#00FFA3]/30' :
            statusLabel === 'Completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
            'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {statusLabel}
          </span>
        </div>

        {/* Overall Progress Section */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-white font-medium">{daysCompleted} / {daysTotal} Days Completed</span>
            <span className="text-[#00FFA3] font-bold">{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full h-2.5 overflow-hidden bg-white/5 rounded-full border border-white/5 p-[1px]">
            <div 
              className="h-full bg-gradient-to-r from-[#00FFA3] via-emerald-400 to-teal-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,255,163,0.4)]"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <StatBox 
            label="Remaining Stake" 
            value={(remainingStake / 1e6).toFixed(2)} 
            unit="USDT" 
          />
          <StatBox 
            label="Failures" 
            value={`${failedCount} / 2`} 
            warning={failedCount > 0}
          />
          <StatBox 
            label="Early Finishes" 
            value={earlyFinishCount.toString()} 
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Helper component for displaying a single statistic
 */
const StatBox = ({ label, value, unit, warning }: { label: string; value: string; unit?: string; warning?: boolean }) => (
  <div className="p-4 transition-all bg-black/40 border border-white/5 rounded-2xl hover:bg-black/60 hover:border-white/10 group">
    <p className="text-xs font-medium uppercase tracking-widest text-white/40 mb-1">{label}</p>
    <p className={`text-xl font-bold ${warning ? 'text-orange-400' : 'text-white'}`}>
      {value} {unit && <span className="ml-1 text-sm font-medium text-[#00FFA3]/70">{unit}</span>}
    </p>
  </div>
);
