'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertTriangle, Trophy, Coins } from 'lucide-react';
import Link from 'next/link';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import idl from '@/lib/idl.json';

// Import split components
import { CommitmentHeader } from '@/components/dashboard/commitment-detail/Header';
import { TimerSection } from '@/components/dashboard/commitment-detail/Timer';
import { ProofUpload } from '@/components/dashboard/commitment-detail/Upload';
import { ValidationResult } from '@/components/dashboard/commitment-detail/ValidationResult';
import { ValidationLoading } from '@/components/dashboard/commitment-detail/ValidationLoading';

// Import split hooks
import { useCommitmentData } from '@/components/dashboard/commitment-detail/useCommitmentData';
import { useCommitmentTimer } from '@/components/dashboard/commitment-detail/useCommitmentTimer';
import { useProofSubmission } from '@/components/dashboard/commitment-detail/useProofSubmission';

/** Seeds and program constants */
const PROGRAM_ID = new PublicKey('3nrc4dPYdhztn9d82QmrznATBbYEi9hhvRyx6AnHVGk9');
const GLOBAL_STATE_SEED = Buffer.from('global_state');
const GLOBAL_VAULT_SEED = Buffer.from('global_vault');
// Mock USDT mint on Devnet — same address used in CreateCommitmentModal
const USDT_MINT = new PublicKey('uFUq4dXUWfFVKzw6HzaUtqSb4Vs52QuYPmhasGT9Ruk');

type PageStep = 'timer' | 'upload' | 'validating' | 'result';

/**
 * CommitmentDetailPage manages the lifecycle of a daily commitment task.
 * When the user has completed all required days, it renders the Victory Panel
 * instead of the daily timer flow.
 */
export default function CommitmentDetailPage() {
  const params = useParams();
  const pda = params.id as string;

  const [step, setStep] = useState<PageStep>('timer');
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // --- 1. Data Fetching Hook ---
  const { commitment, title, category, description, loading, connection, wallet } = useCommitmentData(pda);

  // --- 2. Timer Hook ---
  const {
    timerState, setTimerState, elapsedSeconds, setElapsedSeconds,
    finishError, accumulatedRef, startTimer, pauseTimer, resumeTimer, resetTimer, finishTimer, clearSavedTimer
  } = useCommitmentTimer(pda, commitment);

  // Derived calculations
  const targetMinutes = commitment?.dailyTargetMinutes || 30;
  const minimumMinutes = Math.ceil(targetMinutes * 0.5);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const timerProgress = Math.min((elapsedMinutes / targetMinutes) * 100, 100);
  const canFinish = elapsedMinutes >= minimumMinutes;

  // Victory state: user has submitted proof for all required days
  const isFinished = !!commitment && commitment.proofCount >= commitment.durationDays;
  // Prevent double-claim if on-chain status already reflects completion
  const isAlreadyCompleted = commitment?.status?.completed !== undefined;

  /**
   * Validates if the user can proceed to the upload step based on
   * whether they have met the minimum duration requirement.
   */
  useEffect(() => {
    if (!commitment || timerState !== 'completed') return;
    const minimumSeconds = minimumMinutes * 60;

    if (accumulatedRef.current >= minimumSeconds) {
      setStep('upload');
    } else {
      setTimerState('idle');
      setElapsedSeconds(0);
      accumulatedRef.current = 0;
      clearSavedTimer();
    }
  }, [commitment, timerState, minimumMinutes, accumulatedRef, setTimerState, setElapsedSeconds, clearSavedTimer]);

  // --- 3. Proof Submission Hook ---
  const {
    proofImage, setProofImage, aiResult, setAiResult, isSubmitting,
    submitError, setSubmitError, submitSuccess, fileInputRef,
    handleImageSelect, handleValidateProof, handleSubmitOnChain
  } = useProofSubmission(
    pda, commitment, title, category, description,
    targetMinutes, minimumMinutes, elapsedMinutes,
    connection, wallet, clearSavedTimer
  );

  /**
   * Calls the `complete_commitment` on-chain instruction to release the
   * user's staked USDC plus any loyalty bonus from the protocol rewards pool.
   * Derives all required PDAs client-side to avoid extra RPC fetches.
   */
  const handleCompleteCommitment = async () => {
    if (!wallet?.publicKey || !commitment) return;

    setIsClaimingRewards(true);
    setClaimError(null);

    try {
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      const commitmentPubkey = new PublicKey(pda);

      // Derive PDAs
      const [userProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_profile'), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      const [globalStatePda] = PublicKey.findProgramAddressSync(
        [GLOBAL_STATE_SEED],
        PROGRAM_ID
      );
      const [globalVaultPda] = PublicKey.findProgramAddressSync(
        [GLOBAL_VAULT_SEED],
        PROGRAM_ID
      );
      const [escrowVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), commitmentPubkey.toBuffer()],
        PROGRAM_ID
      );

      // User's USDT Associated Token Account (destination for reward payout)
      const userTokenAccount = getAssociatedTokenAddressSync(USDT_MINT, wallet.publicKey);

      // Guard: create the ATA on-chain if it doesn't exist yet.
      // The smart contract requires user_token_account to already be initialized.
      const ataInfo = await connection.getAccountInfo(userTokenAccount);
      if (!ataInfo) {
        console.log('[completeCommitment] ATA not found — creating it first...');
        const createAtaTx = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,      // payer
            userTokenAccount,      // ATA address to create
            wallet.publicKey,      // owner
            USDT_MINT,             // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
        createAtaTx.feePayer = wallet.publicKey;
        createAtaTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signedAtaTx = await wallet.signTransaction!(createAtaTx);
        const ataSignature = await connection.sendRawTransaction(signedAtaTx.serialize());
        await connection.confirmTransaction(ataSignature, 'confirmed');
        console.log('[completeCommitment] ATA created:', userTokenAccount.toBase58());
      }

      const tx = await program.methods
        .completeCommitment()
        .accounts({
          user: wallet.publicKey,
          commitment: commitmentPubkey,
          userProfile: userProfilePda,
          globalState: globalStatePda,
          escrowVault: escrowVaultPda,
          globalVault: globalVaultPda,
          userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ commitment: 'confirmed' });

      // Ping webhook to sync CommitmentCompleted event → Supabase + mint Champion cNFT
      fetch('/api/webhooks/helius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: tx }),
      }).catch(err => console.error('[completeCommitment] Webhook sync failed:', err));

      setClaimSuccess(true);
    } catch (err: any) {
      console.error('[completeCommitment] Error:', err);
      setClaimError(err.message || 'Transaction failed. Please try again.');
    } finally {
      setIsClaimingRewards(false);
    }
  };

  /** Utility to format seconds into MM:SS or HH:MM:SS strings. */
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Render Helpers ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="w-12 h-12 text-[#00FFA3] animate-spin" />
        <p className="mt-6 text-white/40 font-medium tracking-wide">Retrieving commitment data...</p>
      </div>
    );
  }

  if (!commitment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="p-4 bg-orange-500/10 rounded-full mb-6">
          <AlertTriangle className="w-12 h-12 text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Commitment Not Found</h2>
        <p className="text-white/40 max-w-xs mb-8">We couldn't find the commitment record on the blockchain.</p>
        <Link href="/dashboard" className="px-6 py-2 text-sm font-semibold text-[#00FFA3] border border-[#00FFA3]/30 rounded-full hover:bg-[#00FFA3]/10 transition-all">
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  const statusLabel = commitment.status.active !== undefined ? 'Active' :
                    commitment.status.completed !== undefined ? 'Completed' : 'Failed';

  return (
    <div className="container px-6 py-12 mx-auto max-w-4xl animate-in fade-in duration-700">
      <CommitmentHeader
        title={title} category={category} description={description}
        targetMinutes={targetMinutes} stakeAmount={commitment.stakeAmount.toNumber()}
        daysCompleted={commitment.proofCount} daysTotal={commitment.durationDays}
        remainingStake={commitment.remainingStake.toNumber()} failedCount={commitment.failedCount}
        earlyFinishCount={commitment.earlyFinishCount} statusLabel={statusLabel}
      />

      <div className="mt-12">
        {/* Victory Panel — shown when all days are completed */}
        {isFinished ? (
          <div className="p-8 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {claimSuccess ? (
              /* Post-claim success state */
              <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                <div className="p-4 bg-yellow-400/20 rounded-full mb-4 shadow-[0_0_40px_rgba(250,204,21,0.4)]">
                  <Trophy className="w-16 h-16 text-yellow-400 animate-bounce" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 font-playfair">Champion!</h2>
                <p className="text-white/60 max-w-xs mb-4 leading-relaxed">
                  Your USDC has been returned. A Champion Medal cNFT is being minted to your wallet.
                </p>
                <div className="w-full max-w-xs mb-8 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-400/30">
                  <p className="text-xs text-yellow-400/80 leading-relaxed">
                    🏆 Check your <span className="font-bold text-yellow-300">Medal Showcase</span> on the dashboard — your unique Champion Medal will appear shortly.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="px-10 py-3 font-bold text-black bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,255,163,0.3)]"
                >
                  Go to Dashboard
                </Link>
              </div>
            ) : (
              /* Claim Rewards panel */
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-[#00FFA3]/10 rounded-full mb-6 shadow-[0_0_40px_rgba(0,255,163,0.2)]">
                  <Trophy className="w-14 h-14 text-[#00FFA3]" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 font-playfair">Mission Accomplished!</h2>
                <p className="text-white/60 max-w-sm mb-2 leading-relaxed">
                  You've completed all <span className="text-white font-semibold">{commitment.durationDays} days</span> of your commitment.
                  Claim your staked USDC back plus loyalty bonus.
                </p>
                <p className="text-sm text-yellow-400/80 mb-8">
                  🏆 A Champion Medal cNFT will be minted to your wallet upon claiming.
                </p>

                {/* Reward breakdown */}
                <div className="w-full max-w-sm p-4 mb-8 rounded-2xl bg-black/40 border border-white/10 text-left space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Remaining Stake</span>
                    <span className="font-bold text-white">{(commitment.remainingStake.toNumber() / 1_000_000).toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Early Finish Penalty</span>
                    <span className="font-bold text-red-400">-{commitment.earlyFinishCount}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Loyalty Bonus</span>
                    <span className="font-bold text-[#00FFA3]">+{commitment.proofCount >= 3 ? '3' : '1'}%</span>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex justify-between text-sm">
                    <span className="text-white font-semibold">Champion NFT</span>
                    <span className="font-bold text-yellow-400">🏆 1x Unique Medal</span>
                  </div>
                </div>

                {/* Error message */}
                {claimError && (
                  <div className="flex items-center gap-3 p-4 mb-6 w-full max-w-sm text-sm text-red-300 border rounded-xl bg-red-500/10 border-red-500/20">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" /> {claimError}
                  </div>
                )}

                {isAlreadyCompleted ? (
                  /* Already claimed on-chain */
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-[#00FFA3]/80">✅ Rewards already claimed on-chain.</p>
                    <Link href="/dashboard" className="px-10 py-3 font-bold text-black bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all hover:scale-105">
                      Back to Dashboard
                    </Link>
                  </div>
                ) : (
                  <button
                    id="claim-rewards-btn"
                    onClick={handleCompleteCommitment}
                    disabled={isClaimingRewards}
                    className="flex items-center gap-3 px-10 py-4 text-lg font-bold text-black uppercase bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(0,255,163,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isClaimingRewards ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                    ) : (
                      <><Coins className="w-5 h-5" /> Claim USDC &amp; Champion NFT</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Normal daily commitment flow */
          <>
            {step === 'timer' && (
              <TimerSection
                timerState={timerState} elapsedSeconds={elapsedSeconds} elapsedMinutes={elapsedMinutes}
                targetMinutes={targetMinutes} minimumMinutes={minimumMinutes} timerProgress={timerProgress}
                canFinish={canFinish} daysCompleted={commitment.proofCount} finishError={finishError}
                onStart={startTimer} onPause={pauseTimer} onResume={resumeTimer} onReset={resetTimer}
                onFinish={() => { if (finishTimer(targetMinutes)) setStep('upload'); }} formatTime={formatTime}
              />
            )}

            {step === 'upload' && (
              <ProofUpload
                proofImage={proofImage} submitError={submitError} elapsedSeconds={elapsedSeconds}
                elapsedMinutes={elapsedMinutes} fileInputRef={fileInputRef} formatTime={formatTime}
                onImageSelect={handleImageSelect} onRemoveImage={() => setProofImage(null)}
                onValidate={() => handleValidateProof(
                  () => setStep('validating'),
                  () => setStep('result'),
                  () => setStep('upload')
                )}
                onBack={() => { setStep('timer'); setProofImage(null); setSubmitError(null); }}
              />
            )}

            {step === 'validating' && <ValidationLoading />}

            {step === 'result' && aiResult && (
              <ValidationResult
                aiResult={aiResult} submitError={submitError} submitSuccess={submitSuccess}
                isSubmitting={isSubmitting} elapsedMinutes={elapsedMinutes} elapsedSeconds={elapsedSeconds}
                formatTime={formatTime} onSubmit={handleSubmitOnChain}
                daysCompleted={commitment.proofCount} daysTotal={commitment.durationDays}
                onReupload={() => { setStep('upload'); setAiResult(null); setProofImage(null); setSubmitError(null); }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
