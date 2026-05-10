'use client';

import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'; // updated, trim unused anchor helpers after the style-only refactor
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'; // updated, remove an unused token program import
import { X, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import idl from '@/lib/idl.json';

// updated, keep only the constants still used by the dashboard modal
// Mock USDT Mint di Devnet (dibuat via setup-devnet.mjs)
const USDT_MINT = new PublicKey('uFUq4dXUWfFVKzw6HzaUtqSb4Vs52QuYPmhasGT9Ruk');

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCommitmentModal({ isOpen, onClose, onSuccess }: Props) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Fitness');
  const [description, setDescription] = useState('');
  const [daysTotal, setDaysTotal] = useState(7);
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [stakeAmount, setStakeAmount] = useState(10);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError('Please connect your wallet first.');
      return;
    }

    if (daysTotal < 7) {
      setError('Commitment must be at least 7 days.');
      return;
    }

    if (dailyMinutes < 10) {
      setError('Daily target must be at least 10 minutes.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Setup Anchor Provider
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      // 2. Setup Parameters
      const uuidString = uuidv4(); // Generate a random UUID
      const titleBuffer = Buffer.from(title);
      // Ensure title is exactly 32 bytes (pad or truncate)
      const paddedTitle = Buffer.alloc(32);
      titleBuffer.copy(paddedTitle, 0, 0, Math.min(titleBuffer.length, 32));

      const seedBuffer = Buffer.alloc(16);
      uuidString.split('-').join('').match(/.{1,2}/g)?.forEach((byte, i) => {
        seedBuffer[i] = parseInt(byte, 16);
      });

      // Amount to stake (in USDC decimals: 6)
      const decimals = 6;
      const stakeAmountBn = new BN(stakeAmount * (10 ** decimals));

      // 3. Derive PDAs
      const [commitmentPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('commitment'),
          wallet.publicKey.toBuffer(),
          seedBuffer,
        ],
        program.programId
      );

      const [escrowVault] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          commitmentPda.toBuffer(),
        ],
        program.programId
      );

      const userTokenAccount = getAssociatedTokenAddressSync(USDT_MINT, wallet.publicKey);

      // 4. Send Transaction
      console.log('Sending transaction...', {
        commitment: commitmentPda.toBase58(),
        userTokenAccount: userTokenAccount.toBase58(),
      });

      const txBuilder = program.methods
        .createCommitment(
          Array.from(seedBuffer),
          stakeAmountBn,
          daysTotal,
          dailyMinutes
        )
        .accounts({
          user: wallet.publicKey,
          userProfile: PublicKey.findProgramAddressSync(
            [Buffer.from('user_profile'), wallet.publicKey.toBuffer()],
            program.programId
          )[0],
          commitment: commitmentPda,
          escrowVault: escrowVault,
          userTokenAccount: userTokenAccount,
          usdcMint: USDT_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        });

      // Simulate first to catch errors before asking wallet to sign
      console.log('⏳ Simulating transaction...');
      try {
        await txBuilder.simulate();
        console.log('✅ Simulation passed!');
      } catch (simErr: any) {
        console.error('❌ Simulation failed:', simErr);
        throw new Error('Transaction simulation failed: ' + (simErr.message || 'Unknown error'));
      }

      // Send with confirmation
      console.log('📝 Sending transaction for wallet approval...');
      const tx = await txBuilder.rpc({ commitment: 'confirmed' });

      console.log('Transaction success:', tx);

      // 5. Save title + metadata to Supabase (off-chain)
      fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pda: commitmentPda.toBase58(),
          owner: wallet.publicKey.toBase58(),
          title: title,
          category: category,
          description: description,
          txSignature: tx,
          durationDays: daysTotal,
          dailyTargetMinutes: dailyMinutes,
          stakeAmount: stakeAmount,
        })
      }).catch(err => console.error('Save title error:', err));

      // 6. Manual Webhook Sync (Client-Triggered)
      fetch('/api/webhooks/helius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: tx })
      }).catch(err => console.error('Webhook sync error:', err));

      onSuccess();
    } catch (err: any) {
      console.error('Error creating commitment:', err);
      setError(err.message || 'An error occurred while creating your commitment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"> {/* updated, keep the modal overlay consistent with the new dashboard shell */}
      {/* updated, restyle the modal frame with Stitch surfaces and mobile-safe scrolling */}
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card/95 p-5 shadow-[0_0_50px_rgba(78,222,163,0.12)] backdrop-blur-md sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* updated, align the close action with the new focus and surface system */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="mb-2 font-playfair text-2xl font-bold text-white sm:text-[28px]">New Commitment</h2> {/* updated, move the modal title onto the Stitch display scale */}
        <p className="mb-6 max-w-xl text-sm leading-6 text-muted-foreground">Lock your USDC to guarantee your discipline.</p> {/* updated, use muted system copy for the modal intro */}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">What habit do you want to build?</label> {/* updated, normalize modal labels to the Stitch label system */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-container-high/70 px-4 py-3 text-white outline-none transition-[border-color,background-color,box-shadow] focus:border-primary/50 focus:bg-surface-container focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Morning Run 5KM"
              maxLength={32}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Habit Category</label> {/* updated, keep label sizing consistent across split fields */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-container-high/70 px-4 py-3 text-white outline-none transition-[border-color,background-color,box-shadow] focus:border-primary/50 focus:bg-surface-container focus:ring-2 focus:ring-primary/20"
              >
                <option value="Fitness">Fitness</option>
                <option value="Study">Study</option>
                <option value="Work">Work</option>
                <option value="Health">Health</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Describe the specific activity</label> {/* updated, use the same Stitch field label treatment */}
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-container-high/70 px-4 py-3 text-white outline-none transition-[border-color,background-color,box-shadow] focus:border-primary/50 focus:bg-surface-container focus:ring-2 focus:ring-primary/20"
                placeholder="Briefly describe your goal"
                maxLength={200}
              />
            </div>
          </div>
          <p className="-mt-2 rounded-xl border border-secondary/20 bg-secondary/10 px-3 py-2 text-xs leading-5 text-secondary/90"> {/* updated, present the AI note as a Stitch inline callout */}
            🤖 <strong>Note:</strong> Title, Category, and Description will be used by our AI Auditor to validate your daily proofs. Please provide accurate details.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Commitment Duration (Days)</label> {/* updated, align numeric field labels with the new modal system */}
              <input
                type="number"
                value={daysTotal}
                onChange={(e) => setDaysTotal(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-surface-container-high/70 px-4 py-3 text-white outline-none transition-[border-color,background-color,box-shadow] focus:border-primary/50 focus:bg-surface-container focus:ring-2 focus:ring-primary/20"
                min={7}
                max={365}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Daily Target (Minutes)</label> {/* updated, normalize the numeric label styling */}
              <input
                type="number"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-surface-container-high/70 px-4 py-3 text-white outline-none transition-[border-color,background-color,box-shadow] focus:border-primary/50 focus:bg-surface-container focus:ring-2 focus:ring-primary/20"
                min={10}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">USDT Stake Amount</label> {/* updated, keep the stake label consistent with the modal label system */}
            <div className="relative">
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-surface-container-high/70 px-4 py-3 pl-10 text-white outline-none transition-[border-color,background-color,box-shadow] focus:border-primary/50 focus:bg-surface-container focus:ring-2 focus:ring-primary/20"
                min={1}
                step={0.01}
                required
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-primary">$</span> {/* updated, align the stake prefix with the shared primary accent */}
            </div>
            <p className="mt-2 text-xs leading-5 text-secondary/90"> {/* updated, move the stake warning into the Stitch caution tone */}
              *Warning: This amount will be locked in the smart contract. If you fail, it will be slashed.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-error/25 bg-error/10 p-3 text-sm text-error"> {/* updated, map validation errors to the shared error palette */}
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-bold uppercase tracking-[0.12em] text-primary-foreground transition-[background-color,transform,box-shadow] hover:bg-primary/90 active:scale-[0.98] shadow-[0_0_20px_rgba(78,222,163,0.24)] disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Lock Stake & Start'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
