'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Flame, Trophy } from 'lucide-react';
import Link from 'next/link';

interface AIResult {
  isValid: boolean;
  confidenceScore: number;
  minutes: number;
  activity: string;
  relevance: string;
  reason: string;
}

interface ValidationResultProps {
  aiResult: AIResult;
  submitError: string | null;
  submitSuccess: boolean;
  isSubmitting: boolean;
  elapsedMinutes: number;
  formatTime: (seconds: number) => string;
  elapsedSeconds: number;
  /** Number of proofs completed after this submission */
  daysCompleted: number;
  /** Total commitment duration in days */
  daysTotal: number;
  onSubmit: () => void;
  onReupload: () => void;
}

/**
 * ValidationResult component displays AI analysis results and on-chain submission options
 */
export const ValidationResult: React.FC<ValidationResultProps> = ({
  aiResult,
  submitError,
  submitSuccess,
  isSubmitting,
  elapsedMinutes,
  formatTime,
  elapsedSeconds,
  daysCompleted,
  daysTotal,
  onSubmit,
  onReupload,
}) => {
  // Whether this proof submission completes the full commitment
  const isLastDay = daysCompleted >= daysTotal && daysTotal > 0;

  return (
    <div className="p-8 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-3 mb-8">
        <div className={`p-2 rounded-lg ${aiResult.isValid ? 'bg-[#00FFA3]/10' : 'bg-red-500/10'}`}>
          {aiResult.isValid ? (
            <CheckCircle2 className="w-7 h-7 text-[#00FFA3]" />
          ) : (
            <AlertTriangle className="w-7 h-7 text-red-400" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-white font-playfair">AI Validation Result</h2>
      </div>

      {/* Main Analysis Card */}
      <div className={`p-6 rounded-2xl border backdrop-blur-md transition-all duration-500 ${
        aiResult.isValid ? 'bg-[#00FFA3]/5 border-[#00FFA3]/20 shadow-[0_0_40px_rgba(0,255,163,0.05)]' : 'bg-red-500/5 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.05)]'
      }`}>
        
        {/* Confidence Score Visualizer */}
        <div className="mb-8 p-4 bg-black/30 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white">AI Confidence</p>
              <p className="text-xs text-white/40 mt-0.5">Threshold: 30/100</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-black ${(aiResult.confidenceScore ?? 0) >= 60 ? 'text-[#00FFA3]' : (aiResult.confidenceScore ?? 0) >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                {aiResult.confidenceScore ?? 0}<span className="text-base font-normal text-white/30">/100</span>
              </p>
            </div>
          </div>
          <div className="w-full h-3 overflow-hidden bg-white/10 rounded-full p-[1px]">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                (aiResult.confidenceScore ?? 0) >= 60 ? 'bg-gradient-to-r from-[#00FFA3] to-emerald-400 shadow-[0_0_15px_rgba(0,255,163,0.4)]' :
                (aiResult.confidenceScore ?? 0) >= 30 ? 'bg-gradient-to-r from-yellow-500 to-amber-400 shadow-[0_0_15px_rgba(241,196,15,0.3)]' :
                'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
              }`}
              style={{ width: `${aiResult.confidenceScore ?? 0}%` }}
            />
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <DetailItem label="Status" value={aiResult.isValid ? '✅ VALID' : '❌ REJECTED'} color={aiResult.isValid ? 'text-[#00FFA3]' : 'text-red-400'} />
          <DetailItem label="Minutes Detected" value={`${aiResult.minutes} min`} />
          <DetailItem label="Identified Activity" value={aiResult.activity} />
          <DetailItem label="Timer Duration" value={`${elapsedMinutes} min (${formatTime(elapsedSeconds)})`} />
        </div>

        {/* AI Commentary Sections */}
        <div className="space-y-6 pt-6 border-t border-white/10">
          {aiResult.relevance && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Relevance to Commitment</p>
              <p className="text-sm leading-relaxed text-white/80 italic">"{aiResult.relevance}"</p>
            </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">AI Reasoning</p>
            <p className="text-sm leading-relaxed text-white/70">{aiResult.reason}</p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {submitError && (
        <div className="flex items-center gap-3 p-4 mt-8 text-sm text-red-300 border rounded-xl bg-red-500/10 border-red-500/20 animate-bounce">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" /> {submitError}
        </div>
      )}

      {/* Success View */}
      {submitSuccess ? (
        <div className="flex flex-col items-center p-8 mt-8 text-center border rounded-3xl bg-[#00FFA3]/5 border-[#00FFA3]/20 shadow-[0_0_50px_rgba(0,255,163,0.1)] animate-in zoom-in-95 duration-500">
          <div className="p-4 bg-[#00FFA3]/20 rounded-full mb-4 shadow-[0_0_30px_rgba(0,255,163,0.3)]">
            <CheckCircle2 className="w-16 h-16 text-[#00FFA3]" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 font-playfair">Proof Submitted On-Chain!</h3>
          <p className="max-w-xs text-sm text-white/50 leading-relaxed mb-6">
            Congratulations! Your daily progress has been permanently recorded on the Solana blockchain.
          </p>

          {/* Champion medal teaser — shown only when this is the final day */}
          {isLastDay && (
            <div className="w-full max-w-xs mb-8 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-400/30 shadow-[0_0_30px_rgba(250,204,21,0.1)] animate-in fade-in duration-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/20">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-sm font-bold text-yellow-300">Champion Medal Incoming!</p>
              </div>
              <p className="text-xs text-yellow-400/70 leading-relaxed mb-3">
                You've completed all {daysTotal} days. A unique Champion Medal cNFT is being minted to your wallet right now.
              </p>
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-xl border-2 border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.3)] overflow-hidden animate-pulse">
                  <img
                    src={`https://placehold.co/80x80/facc15/1a1a1a/png?text=%F0%9F%8F%86`}
                    alt="Champion Medal Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          <Link 
            href="/dashboard" 
            className="px-10 py-3 font-bold text-black bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,255,163,0.3)]"
          >
            {isLastDay ? '🎉 Claim Your USDT Rewards!' : 'Return to Dashboard'}
          </Link>
        </div>
      ) : (
        /* Action Buttons */
        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          <button
            onClick={onReupload}
            className="px-8 py-3 font-semibold text-white/60 transition-all border border-white/10 rounded-full hover:text-white hover:bg-white/5 hover:border-white/20 order-2 sm:order-1"
          >
            ← Re-upload Proof
          </button>
          {aiResult.isValid && (
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-10 py-3 font-bold text-black uppercase bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all hover:scale-105 shadow-[0_0_30px_rgba(0,255,163,0.3)] order-1 sm:order-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Finalizing...</>
              ) : (
                <><Flame className="w-5 h-5 fill-current" /> Submit to Blockchain</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Helper component for structured detail display
 */
const DetailItem = ({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) => (
  <div className="space-y-1">
    <p className="text-xs font-bold uppercase tracking-widest text-white/30">{label}</p>
    <p className={`text-lg font-bold truncate ${color}`}>{value}</p>
  </div>
);
