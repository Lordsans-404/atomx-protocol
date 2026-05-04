'use client';

import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN, utils } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { X, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import idl from '@/lib/idl.json';

const PROGRAM_ID = new PublicKey('3nrc4dPYdhztn9d82QmrznATBbYEi9hhvRyx6AnHVGk9');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg p-6 overflow-hidden border bg-[#111111] border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,255,163,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute p-2 text-white/50 transition-colors rounded-full top-4 right-4 hover:bg-white/10 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="mb-2 text-2xl font-bold text-white font-playfair">New Commitment</h2>
        <p className="mb-6 text-sm text-white/50">Lock your USDC to guarantee your discipline.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2 text-sm font-medium text-white/70">What habit do you want to build?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 text-white border outline-none bg-black/50 border-white/10 rounded-xl focus:border-[#00FFA3]/50 focus:ring-1 focus:ring-[#00FFA3]/50 transition-all"
              placeholder="e.g. Morning Run 5KM"
              maxLength={32}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-white/70">Habit Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 text-white border outline-none bg-black/50 border-white/10 rounded-xl focus:border-[#00FFA3]/50 transition-all"
              >
                <option value="Fitness">Fitness</option>
                <option value="Study">Study</option>
                <option value="Work">Work</option>
                <option value="Health">Health</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-white/70">Describe the specific activity</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 text-white border outline-none bg-black/50 border-white/10 rounded-xl focus:border-[#00FFA3]/50 transition-all"
                placeholder="Briefly describe your goal"
                maxLength={200}
              />
            </div>
          </div>
          <p className="text-xs text-blue-400/80 mt-[-10px]">
            🤖 <strong>Note:</strong> Title, Category, and Description will be used by our AI Auditor to validate your daily proofs. Please provide accurate details.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-white/70">Commitment Duration (Days)</label>
              <input
                type="number"
                value={daysTotal}
                onChange={(e) => setDaysTotal(Number(e.target.value))}
                className="w-full px-4 py-3 text-white border outline-none bg-black/50 border-white/10 rounded-xl focus:border-[#00FFA3]/50 transition-all"
                min={7}
                max={365}
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-white/70">Daily Target (Minutes)</label>
              <input
                type="number"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full px-4 py-3 text-white border outline-none bg-black/50 border-white/10 rounded-xl focus:border-[#00FFA3]/50 transition-all"
                min={10}
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-white/70">USDT Stake Amount</label>
            <div className="relative">
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                className="w-full px-4 py-3 pl-10 text-white border outline-none bg-black/50 border-white/10 rounded-xl focus:border-[#00FFA3]/50 transition-all"
                min={1}
                step={0.01}
                required
              />
              <span className="absolute text-[#00FFA3] transform -translate-y-1/2 left-4 top-1/2 font-bold">$</span>
            </div>
            <p className="mt-2 text-xs text-orange-400/80">
              *Warning: This amount will be locked in the smart contract. If you fail, it will be slashed.
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-400 border border-red-500/20 bg-red-500/10 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 mt-4 font-bold text-black uppercase transition-all bg-[#00FFA3] rounded-xl hover:bg-[#00FFA3]/90 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,255,163,0.4)] disabled:opacity-50 disabled:pointer-events-none"
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
