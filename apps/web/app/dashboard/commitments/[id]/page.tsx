'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { 
  ArrowLeft, Camera, CheckCircle2, Clock, Flame, Loader2, 
  Pause, Play, RotateCcw, Shield, Upload, X, AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';

import idl from '@/lib/idl.json';

const PROGRAM_ID = new PublicKey('3nrc4dPYdhztn9d82QmrznATBbYEi9hhvRyx6AnHVGk9');

// ─── Timer States ───
type TimerState = 'idle' | 'running' | 'paused' | 'completed';
type PageStep = 'timer' | 'upload' | 'validating' | 'result';

interface AIResult {
  isValid: boolean;
  confidenceScore: number;
  minutes: number;
  activity: string;
  relevance: string;
  reason: string;
}

export default function CommitmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pda = params.id as string;
  const { connection } = useConnection();
  const wallet = useWallet();

  // ─── Commitment Data ───
  const [commitment, setCommitment] = useState<any>(null);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // ─── Timer State (Date.now-based + localStorage persist) ───
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const storageKey = `atomx_timer_${pda}`;

  // ─── Upload / Proof State ───
  const [step, setStep] = useState<PageStep>('timer');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [proofHash, setProofHash] = useState<number[]>([]);
  const [actualMinutes, setActualMinutes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Save timer to localStorage ───
  const saveTimer = useCallback((state: TimerState, accumulated: number, startTime: number) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ state, accumulated, startTime }));
    } catch {}
  }, [storageKey]);

  const clearSavedTimer = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  // ─── Fetch commitment from chain ───
  useEffect(() => {
    async function fetchData() {
      if (!wallet.publicKey || !pda) return;
      try {
        setLoading(true);
        const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
        const program = new Program(idl as any, provider);
        const account = await (program.account as any).commitmentAccount.fetch(new PublicKey(pda));
        setCommitment(account);

        const res = await fetch(`/api/commitments?owner=${wallet.publicKey.toBase58()}`);
        if (res.ok) {
          const metadataMap = await res.json();
          const metadata = metadataMap[pda] || {};
          setTitle(metadata.title || `Commitment #${pda.substring(0, 6)}`);
          setCategory(metadata.category || 'Other');
          setDescription(metadata.description || '');
        }
      } catch (err) {
        console.error('Error fetching commitment:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [connection, wallet.publicKey, pda]);

  // ─── RAF-based tick ───
  const tick = useCallback(() => {
    const now = Date.now();
    const totalSeconds = accumulatedRef.current + Math.floor((now - startTimeRef.current) / 1000);
    setElapsedSeconds(totalSeconds);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ─── Restore timer from localStorage on mount ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const { state, accumulated, startTime } = JSON.parse(saved);

      if (state === 'running' && startTime > 0) {
        // Timer was running — calculate elapsed since saved startTime
        accumulatedRef.current = accumulated;
        startTimeRef.current = startTime;
        setTimerState('running');
        rafRef.current = requestAnimationFrame(tick);
      } else if (state === 'paused' && accumulated > 0) {
        accumulatedRef.current = accumulated;
        setElapsedSeconds(accumulated);
        setTimerState('paused');
      } else if (state === 'completed' && accumulated > 0) {
        accumulatedRef.current = accumulated;
        setElapsedSeconds(accumulated);
        setTimerState('completed');
        setStep('upload');
      }
    } catch {}
  }, [storageKey, tick]);

  const startTimer = useCallback(() => {
    setTimerState('running');
    startTimeRef.current = Date.now();
    accumulatedRef.current = 0;
    saveTimer('running', 0, startTimeRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, saveTimer]);

  const pauseTimer = useCallback(() => {
    setTimerState('paused');
    accumulatedRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    saveTimer('paused', accumulatedRef.current, 0);
  }, [saveTimer]);

  const resumeTimer = useCallback(() => {
    setTimerState('running');
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    saveTimer('running', accumulatedRef.current, startTimeRef.current);
  }, [tick, saveTimer]);

  const resetTimer = useCallback(() => {
    setTimerState('idle');
    setElapsedSeconds(0);
    accumulatedRef.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    clearSavedTimer();
  }, [clearSavedTimer]);

  const finishTimer = useCallback(() => {
    setTimerState('completed');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (startTimeRef.current > 0) {
      accumulatedRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(accumulatedRef.current);
    }
    saveTimer('completed', accumulatedRef.current, 0);
    setStep('upload');
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const targetMinutes = commitment?.dailyTargetMinutes || 30;
  const timerProgress = Math.min((elapsedMinutes / targetMinutes) * 100, 100);

  // ─── Image Upload Handler ───
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ─── AI Validation ───
  const handleValidateProof = async () => {
    if (!proofImage) return;
    setStep('validating');
    setSubmitError(null);

    try {
      const res = await fetch('/api/validate-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: proofImage,
          targetMinutes: targetMinutes,
          elapsedMinutes: elapsedMinutes,
          commitmentTitle: title,
          commitmentCategory: category,
          commitmentDescription: description,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiResult(data.aiResult);
        setProofHash(data.proofHash);
        setActualMinutes(data.actualMinutes);
        setStep('result');
      } else {
        setSubmitError(data.error || 'AI validation failed');
        setStep('upload');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Validation request failed');
      setStep('upload');
    }
  };

  // ─── Submit Proof On-Chain ───
  const handleSubmitOnChain = async () => {
    if (!wallet.publicKey || !commitment || !aiResult) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      const nextDay = (commitment.currentDay || 0) + 1;

      const [proofRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('proof'),
          new PublicKey(pda).toBuffer(),
          new BN(nextDay).toArrayLike(Buffer, 'le', 2),
        ],
        program.programId
      );

      const tx = await program.methods
        .submitProof(
          nextDay,
          proofHash,
          actualMinutes
        )
        .accounts({
          user: wallet.publicKey,
          commitment: new PublicKey(pda),
          proofRecord: proofRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: 'confirmed' });

      console.log('✅ Proof submitted on-chain:', tx);

      // Sync to webhook
      fetch('/api/webhooks/helius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: tx }),
      }).catch(err => console.error('Webhook sync error:', err));

      setSubmitSuccess(true);
      clearSavedTimer();
    } catch (err: any) {
      console.error('Submit proof error:', err);
      setSubmitError(err.message || 'Failed to submit proof on-chain');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="w-10 h-10 text-[#00FFA3] animate-spin" />
        <p className="mt-4 text-white/50">Loading commitment...</p>
      </div>
    );
  }

  if (!commitment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <AlertTriangle className="w-10 h-10 mb-4 text-orange-400" />
        <p className="text-white/70">Commitment not found</p>
        <Link href="/dashboard" className="mt-4 text-[#00FFA3] hover:underline">← Back to Dashboard</Link>
      </div>
    );
  }

  const daysCompleted = commitment.proofCount;
  const daysTotal = commitment.durationDays;
  const overallProgress = daysTotal > 0 ? Math.min((daysCompleted / daysTotal) * 100, 100) : 0;

  let statusLabel = 'Unknown';
  if (commitment.status.active !== undefined) statusLabel = 'Active';
  else if (commitment.status.completed !== undefined) statusLabel = 'Completed';
  else if (commitment.status.failed !== undefined) statusLabel = 'Failed';

  return (
    <div className="container px-6 py-8 mx-auto max-w-4xl">
      {/* Back Button */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 mb-8 text-sm text-white/50 hover:text-[#00FFA3] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="p-6 mb-8 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white font-playfair">{title}</h1>
              <span className="px-3 py-1 text-xs font-semibold text-white/70 bg-white/10 rounded-lg">{category}</span>
            </div>
            {description && (
              <p className="mt-2 text-sm italic text-white/60">"{description}"</p>
            )}
            <p className="mt-2 text-white/50">
              {targetMinutes} mins/day • {(commitment.stakeAmount.toNumber() / 1e6).toFixed(2)} USDT Staked • Day {daysCompleted + 1} of {daysTotal}
            </p>
          </div>
          <span className={`px-4 py-1.5 text-xs font-bold uppercase rounded-full ${
            statusLabel === 'Active' ? 'bg-[#00FFA3]/20 text-[#00FFA3] border border-[#00FFA3]/30' :
            statusLabel === 'Completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
            'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {statusLabel}
          </span>
        </div>

        {/* Overall Progress */}
        <div className="mt-6">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-white">{daysCompleted} / {daysTotal} Days Completed</span>
            <span className="text-white/50">{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full h-2 overflow-hidden bg-white/10 rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-[#00FFA3] to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-3 text-center bg-black/40 rounded-xl">
            <p className="text-xs text-white/40">Remaining Stake</p>
            <p className="text-lg font-bold text-white">{(commitment.remainingStake.toNumber() / 1e6).toFixed(2)} <span className="text-sm text-[#00FFA3]">USDT</span></p>
          </div>
          <div className="p-3 text-center bg-black/40 rounded-xl">
            <p className="text-xs text-white/40">Failed</p>
            <p className="text-lg font-bold text-white">{commitment.failedCount} / 2</p>
          </div>
          <div className="p-3 text-center bg-black/40 rounded-xl">
            <p className="text-xs text-white/40">Early Finish</p>
            <p className="text-lg font-bold text-white">{commitment.earlyFinishCount}</p>
          </div>
        </div>
      </div>

      {/* ═══════════ TIMER SECTION ═══════════ */}
      {step === 'timer' && (
        <div className="p-8 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <h2 className="flex items-center gap-2 mb-8 text-2xl font-bold text-center text-white font-playfair justify-center">
            <Clock className="w-6 h-6 text-[#00FFA3]" />
            Daily Timer — Day {daysCompleted + 1}
          </h2>

          {/* Timer Display */}
          <div className="flex flex-col items-center">
            {/* Circular Progress */}
            <div className="relative w-64 h-64 mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle 
                  cx="100" cy="100" r="90" fill="none" 
                  stroke={timerProgress >= 100 ? '#00FFA3' : timerProgress >= 50 ? '#facc15' : '#ef4444'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 90}`}
                  strokeDashoffset={`${2 * Math.PI * 90 * (1 - timerProgress / 100)}`}
                  className="transition-all duration-500"
                  style={{ filter: timerProgress >= 100 ? 'drop-shadow(0 0 8px rgba(0,255,163,0.5))' : 'none' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-5xl font-bold text-white font-mono tracking-wider">{formatTime(elapsedSeconds)}</p>
                <p className="mt-2 text-sm text-white/40">{elapsedMinutes} / {targetMinutes} min</p>
              </div>
            </div>

            {/* Timer hint */}
            {timerState === 'idle' && (
              <p className="mb-6 text-sm text-center text-white/40 max-w-sm">
                Start the timer when you begin your activity. You need at least <span className="text-[#00FFA3] font-semibold">{Math.ceil(targetMinutes * 0.5)} minutes</span> (50% of target) to pass.
              </p>
            )}
            {timerProgress >= 100 && timerState === 'running' && (
              <p className="mb-6 text-sm text-center text-[#00FFA3] font-medium animate-pulse">
                🎉 Target reached! You can finish the timer and upload your proof.
              </p>
            )}

            {/* Timer Controls */}
            <div className="flex gap-4">
              {timerState === 'idle' && (
                <button onClick={startTimer} className="flex items-center gap-2 px-8 py-4 text-lg font-bold text-black uppercase bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,255,163,0.3)]">
                  <Play className="w-5 h-5" /> Start Timer
                </button>
              )}
              {timerState === 'running' && (
                <>
                  <button onClick={pauseTimer} className="flex items-center gap-2 px-6 py-3 font-semibold text-white transition-all border border-white/20 rounded-full hover:bg-white/10">
                    <Pause className="w-5 h-5" /> Pause
                  </button>
                  <button onClick={finishTimer} className="flex items-center gap-2 px-6 py-3 font-bold text-black uppercase bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all shadow-[0_0_15px_rgba(0,255,163,0.3)]">
                    <CheckCircle2 className="w-5 h-5" /> Finish & Upload
                  </button>
                </>
              )}
              {timerState === 'paused' && (
                <>
                  <button onClick={resumeTimer} className="flex items-center gap-2 px-6 py-3 font-bold text-black uppercase bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all">
                    <Play className="w-5 h-5" /> Resume
                  </button>
                  <button onClick={resetTimer} className="flex items-center gap-2 px-6 py-3 font-semibold text-white/50 transition-all border border-white/10 rounded-full hover:text-white hover:border-white/30">
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                  <button onClick={finishTimer} className="flex items-center gap-2 px-6 py-3 font-semibold text-white transition-all border border-white/20 rounded-full hover:bg-white/10">
                    <CheckCircle2 className="w-5 h-5" /> Finish
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ UPLOAD SECTION ═══════════ */}
      {step === 'upload' && (
        <div className="p-8 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <h2 className="flex items-center gap-2 mb-2 text-2xl font-bold text-white font-playfair">
            <Camera className="w-6 h-6 text-[#00FFA3]" />
            Upload Proof
          </h2>
          <p className="mb-8 text-sm text-white/40">
            Upload a screenshot or photo showing your activity with a visible timer/duration. Timer: <span className="text-[#00FFA3] font-semibold">{formatTime(elapsedSeconds)}</span> ({elapsedMinutes} min)
          </p>

          {submitError && (
            <div className="flex items-center gap-2 p-4 mb-6 text-sm text-red-300 border rounded-xl bg-red-500/10 border-red-500/20">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {submitError}
            </div>
          )}

          {/* Upload Area */}
          <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />

          {!proofImage ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-full gap-4 py-16 transition-all border-2 border-dashed rounded-2xl border-white/20 hover:border-[#00FFA3]/50 hover:bg-[#00FFA3]/5 group"
            >
              <Upload className="w-12 h-12 text-white/30 group-hover:text-[#00FFA3] transition-colors" />
              <div>
                <p className="text-lg font-semibold text-white/70 group-hover:text-white">Click to upload proof</p>
                <p className="text-sm text-white/30">JPG, PNG • Max 5MB</p>
              </div>
            </button>
          ) : (
            <div className="relative">
              <img src={proofImage} alt="Proof" className="w-full max-h-96 object-contain rounded-2xl border border-white/10" />
              <button
                onClick={() => setProofImage(null)}
                className="absolute p-2 transition-colors bg-black/60 rounded-full top-3 right-3 hover:bg-red-500/80"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => { setStep('timer'); setProofImage(null); }}
              className="px-6 py-3 font-semibold text-white/50 transition-all border border-white/10 rounded-full hover:text-white hover:border-white/30"
            >
              ← Back to Timer
            </button>
            {proofImage && (
              <button
                onClick={handleValidateProof}
                className="flex items-center gap-2 px-8 py-3 font-bold text-black uppercase bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all shadow-[0_0_15px_rgba(0,255,163,0.3)]"
              >
                <Shield className="w-5 h-5" /> Validate with AI
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ VALIDATING STATE ═══════════ */}
      {step === 'validating' && (
        <div className="flex flex-col items-center justify-center p-16 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-[#00FFA3] animate-spin" />
            <Shield className="absolute w-6 h-6 text-white transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-white">AI Validating Your Proof...</h3>
          <p className="mt-2 text-sm text-white/40">Groq Vision is analyzing your image</p>
        </div>
      )}

      {/* ═══════════ RESULT SECTION ═══════════ */}
      {step === 'result' && aiResult && (
        <div className="p-8 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <h2 className="flex items-center gap-2 mb-6 text-2xl font-bold text-white font-playfair">
            {aiResult.isValid ? (
              <CheckCircle2 className="w-7 h-7 text-[#00FFA3]" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-red-400" />
            )}
            AI Validation Result
          </h2>

          {/* Result Card */}
          <div className={`p-6 rounded-2xl border ${aiResult.isValid ? 'bg-[#00FFA3]/5 border-[#00FFA3]/20' : 'bg-red-500/5 border-red-500/20'}`}>
            {/* Confidence Score Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">AI Confidence Score</p>
                <p className={`text-2xl font-bold ${(aiResult.confidenceScore ?? 0) >= 60 ? 'text-[#00FFA3]' : (aiResult.confidenceScore ?? 0) >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {aiResult.confidenceScore ?? 0}<span className="text-sm text-white/40">/100</span>
                </p>
              </div>
              <div className="w-full h-3 overflow-hidden bg-white/10 rounded-full">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    (aiResult.confidenceScore ?? 0) >= 60 ? 'bg-gradient-to-r from-[#00FFA3] to-emerald-400 shadow-[0_0_10px_rgba(0,255,163,0.5)]' :
                    (aiResult.confidenceScore ?? 0) >= 30 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                    'bg-gradient-to-r from-red-600 to-red-400'
                  }`}
                  style={{ width: `${aiResult.confidenceScore ?? 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-white/30">
                {(aiResult.confidenceScore ?? 0) < 30 ? '⛔ Below threshold (30) — Proof rejected' :
                 (aiResult.confidenceScore ?? 0) < 60 ? '⚠️ Low confidence — Proof accepted with caution' :
                 '✅ High confidence — Proof accepted'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-white/40">Status</p>
                <p className={`text-lg font-bold ${aiResult.isValid ? 'text-[#00FFA3]' : 'text-red-400'}`}>
                  {aiResult.isValid ? '✅ VALID' : '❌ REJECTED'}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40">Minutes Detected</p>
                <p className="text-lg font-bold text-white">{aiResult.minutes} min</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Activity</p>
                <p className="text-sm font-medium text-white">{aiResult.activity}</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Timer Duration</p>
                <p className="text-sm font-medium text-white">{elapsedMinutes} min ({formatTime(elapsedSeconds)})</p>
              </div>
            </div>
            {aiResult.relevance && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/40">Relevance to Commitment</p>
                <p className="mt-1 text-sm text-white/70">{aiResult.relevance}</p>
              </div>
            )}
            <div className={`pt-4 ${aiResult.relevance ? '' : 'border-t border-white/10'}`}>
              <p className="text-xs text-white/40">AI Reasoning</p>
              <p className="mt-1 text-sm text-white/70">{aiResult.reason}</p>
            </div>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 p-4 mt-6 text-sm text-red-300 border rounded-xl bg-red-500/10 border-red-500/20">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {submitError}
            </div>
          )}

          {submitSuccess ? (
            <div className="flex flex-col items-center p-6 mt-6 text-center border rounded-2xl bg-[#00FFA3]/5 border-[#00FFA3]/20">
              <CheckCircle2 className="w-12 h-12 text-[#00FFA3] mb-3" />
              <h3 className="text-xl font-bold text-white">Proof Submitted On-Chain!</h3>
              <p className="mt-2 text-sm text-white/50">Your progress has been recorded on the Solana blockchain.</p>
              <Link href="/dashboard" className="mt-4 px-6 py-2 text-sm font-semibold text-black bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all">
                ← Back to Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => { setStep('upload'); setAiResult(null); setProofImage(null); }}
                className="px-6 py-3 font-semibold text-white/50 transition-all border border-white/10 rounded-full hover:text-white hover:border-white/30"
              >
                ← Re-upload
              </button>
              {aiResult.isValid && (
                <button
                  onClick={handleSubmitOnChain}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 font-bold text-black uppercase bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all shadow-[0_0_15px_rgba(0,255,163,0.3)] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                  ) : (
                    <><Flame className="w-5 h-5" /> Submit Proof On-Chain</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
