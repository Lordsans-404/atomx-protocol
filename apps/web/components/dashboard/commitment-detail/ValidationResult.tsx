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
    <div className="w-full flex flex-col items-center justify-center">
      <div className="flex items-center gap-3 mb-8 w-full max-w-lg">
        <div className={`p-2 rounded-lg ${aiResult.isValid ? 'bg-primary/10' : 'bg-error/10'}`}>
          {aiResult.isValid ? (
            <CheckCircle2 className="w-7 h-7 text-primary" />
          ) : (
            <AlertTriangle className="w-7 h-7 text-error" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-foreground font-headline-card">AI Validation Result</h2>
      </div>

      {/* Main Analysis Card */}
      <div className={`w-full max-w-lg p-6 rounded-2xl border backdrop-blur-md transition-all duration-500 ${
        aiResult.isValid 
          ? 'bg-white/5 border-white/10 hover:border-primary/30 hover:bg-primary/5 hover:shadow-[0_0_40px_rgba(78,222,163,0.1)]' 
          : 'bg-white/5 border-white/10 hover:border-error/30 hover:bg-error/5 hover:shadow-[0_0_40px_rgba(255,180,171,0.1)]'
      }`}>
        
        {/* Confidence Score Visualizer */}
        <div className="mb-8 p-4 bg-black/30 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground font-body-main">AI Confidence</p>
              <p className="text-xs text-muted-foreground mt-0.5">Threshold: 30/100</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-black font-display-timer ${(aiResult.confidenceScore ?? 0) >= 60 ? 'text-primary' : (aiResult.confidenceScore ?? 0) >= 30 ? 'text-yellow-400' : 'text-error'}`}>
                {aiResult.confidenceScore ?? 0}<span className="text-base font-normal text-muted-foreground">/100</span>
              </p>
            </div>
          </div>
          <div className="w-full h-3 overflow-hidden bg-white/10 rounded-full p-[1px]">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                (aiResult.confidenceScore ?? 0) >= 60 ? 'bg-gradient-to-r from-primary to-emerald-400 shadow-[0_0_15px_rgba(78,222,163,0.4)]' :
                (aiResult.confidenceScore ?? 0) >= 30 ? 'bg-gradient-to-r from-yellow-500 to-amber-400 shadow-[0_0_15px_rgba(241,196,15,0.3)]' :
                'bg-gradient-to-r from-error to-red-400 shadow-[0_0_15px_rgba(255,180,171,0.3)]'
              }`}
              style={{ width: `${aiResult.confidenceScore ?? 0}%` }}
            />
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <DetailItem label="Status" value={aiResult.isValid ? '✅ VALID' : '❌ REJECTED'} color={aiResult.isValid ? 'text-primary' : 'text-error'} />
          <DetailItem label="Minutes Detected" value={`${aiResult.minutes} min`} />
          <DetailItem label="Identified Activity" value={aiResult.activity} />
          <DetailItem label="Timer Duration" value={`${elapsedMinutes} min (${formatTime(elapsedSeconds)})`} />
        </div>

        {/* AI Commentary Sections */}
        <div className="space-y-6 pt-6 border-t border-white/10">
          {aiResult.relevance && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 font-label-caps">Relevance to Commitment</p>
              <p className="text-sm leading-relaxed text-foreground/80 italic font-body-main">"{aiResult.relevance}"</p>
            </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 font-label-caps">AI Reasoning</p>
            <p className="text-sm leading-relaxed text-foreground/70 font-body-main">{aiResult.reason}</p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {submitError && (
        <div className="w-full max-w-lg flex items-center gap-3 p-4 mt-8 text-sm text-error bg-error/10 border border-error/20 rounded-xl animate-bounce">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {submitError}
        </div>
      )}

      {/* Success View */}
      {submitSuccess ? (
        <div className="w-full max-w-lg flex flex-col items-center p-8 mt-8 text-center border rounded-3xl bg-white/5 border-white/10 transition-all duration-500 hover:border-primary/30 hover:bg-primary/5 hover:shadow-[0_0_40px_rgba(78,222,163,0.1)] animate-in zoom-in-95">
          <div className="p-4 bg-primary/20 rounded-full mb-4 shadow-[0_0_30px_rgba(78,222,163,0.3)]">
            <CheckCircle2 className="w-16 h-16 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2 font-headline-card">Proof Submitted On-Chain!</h3>
          <p className="max-w-xs text-sm text-muted-foreground leading-relaxed mb-6 font-body-main">
            Congratulations! Your daily progress has been permanently recorded on the Solana blockchain.
          </p>

          {/* Champion medal teaser */}
          {isLastDay && (
            <div className="w-full max-w-xs mb-8 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-400/30 shadow-[0_0_30px_rgba(250,204,21,0.1)] animate-in fade-in duration-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/20">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-sm font-bold text-yellow-300 font-body-main">Champion Medal Incoming!</p>
              </div>
              <p className="text-xs text-yellow-400/70 leading-relaxed mb-3 font-body-main">
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
            className="px-10 py-4 font-headline-card text-lg text-on-primary bg-primary rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(78,222,163,0.3)]"
          >
            {isLastDay ? '🎉 Claim Your USDT Rewards!' : 'Return to Dashboard'}
          </Link>
        </div>
      ) : (
        /* Action Buttons */
        <div className="flex flex-col sm:flex-row gap-4 mt-10 w-full max-w-lg">
          <button
            onClick={onReupload}
            className="px-8 py-4 font-headline-card text-lg text-muted-foreground transition-all border border-white/10 rounded-xl hover:text-foreground hover:bg-white/5 order-2 sm:order-1 flex-1"
          >
            ← Re-upload
          </button>
          {aiResult.isValid && (
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-8 py-4 font-headline-card text-lg text-on-primary bg-primary rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(78,222,163,0.3)] order-1 sm:order-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Finalizing...</>
              ) : (
                <><Flame className="w-5 h-5" /> Submit to Chain</>
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
const DetailItem = ({ label, value, color = 'text-foreground' }: { label: string; value: string; color?: string }) => (
  <div className="space-y-1">
    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-label-caps">{label}</p>
    <p className={`text-lg font-bold truncate font-body-main ${color}`}>{value}</p>
  </div>
);
