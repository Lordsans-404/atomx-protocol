'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import { X, ArrowDownUp, Loader2, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

/** Fixed devnet exchange rate removed. We now fetch real-time from Jupiter API. */

/** Minimum SOL required per swap — enough to be meaningful but low for devnet testing */
const MIN_SOL_AMOUNT = 0.01;

/** SOL buffer kept in wallet so user can still pay future gas fees */
const GAS_RESERVE_SOL = 0.005;

/** Authority wallet that receives SOL and acts as USDT mint authority */
const AUTHORITY_PUBKEY = process.env.NEXT_PUBLIC_AUTHORITY_PUBKEY ?? '';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type SwapStatus = 'idle' | 'awaiting-signature' | 'confirming' | 'minting' | 'success' | 'error';

/**
 * SwapModal implements a two-phase devnet SOL → USDT exchange:
 *   Phase 1 — User signs a real SOL transfer to the authority wallet (on-chain proof of payment).
 *   Phase 2 — Backend verifies the transfer on-chain, then mints equivalent USDT to the user's ATA.
 *
 * This mirrors a real DEX flow without deploying a custom swap program.
 * Both transactions are visible and verifiable on Solana Explorer (Devnet).
 */
export default function SwapModal({ isOpen, onClose }: Props) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [solAmount, setSolAmount] = useState<string>('0.1');
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [mintTxSig, setMintTxSig] = useState<string | null>(null);
  const [solTxSig, setSolTxSig] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [solToUsdtRate, setSolToUsdtRate] = useState<number | null>(null);
  const [isFetchingRate, setIsFetchingRate] = useState<boolean>(true);

  /** Derived USDT output amount from the current SOL input */
  const usdtOutput = solToUsdtRate ? parseFloat(solAmount || '0') * solToUsdtRate : 0;

  const parsedSol = parseFloat(solAmount);
  const isValidAmount =
    !isNaN(parsedSol) &&
    parsedSol >= MIN_SOL_AMOUNT &&
    solBalance !== null &&
    parsedSol <= solBalance - GAS_RESERVE_SOL;

  /** Fetches the connected wallet's current SOL balance in SOL units */
  const fetchSolBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const lamports = await connection.getBalance(publicKey);
      setSolBalance(lamports / LAMPORTS_PER_SOL);
    } catch {
      setSolBalance(null);
    }
  }, [publicKey, connection]);

  /** Fetches the real-time SOL → USDT rate from CoinGecko API */
  const fetchRate = useCallback(async () => {
    try {
      setIsFetchingRate(true);
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      if (data?.solana?.usd) {
        setSolToUsdtRate(data.solana.usd);
      } else {
        throw new Error('Invalid data format from CoinGecko');
      }
    } catch (err) {
      console.error('Failed to fetch SOL price, using fallback rate 150:', err);
      // Fallback if API fails (e.g. rate limit, network error)
      setSolToUsdtRate(150);
    } finally {
      setIsFetchingRate(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRate();
      if (publicKey) {
        fetchSolBalance();
      }
    }
  }, [isOpen, publicKey, fetchSolBalance, fetchRate]);

  // Reset all state when modal is dismissed
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStatus('idle');
        setMintTxSig(null);
        setSolTxSig(null);
        setErrorMsg(null);
        setSolAmount('0.1');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  /**
   * Executes the two-phase swap:
   *   1. Build and send a SOL transfer transaction from user → authority wallet.
   *   2. Wait for on-chain confirmation.
   *   3. Pass the confirmed txSignature to /api/swap, which verifies it on-chain
   *      and mints the equivalent USDT to the user's ATA.
   */
  const handleSwap = async () => {
    if (!AUTHORITY_PUBKEY) {
      setErrorMsg('System Error: NEXT_PUBLIC_AUTHORITY_PUBKEY is not set in the environment variables.');
      setStatus('error');
      return;
    }
    
    if (!publicKey || !isValidAmount) return;

    setErrorMsg(null);
    setMintTxSig(null);
    setSolTxSig(null);

    try {
      // ── Phase 1: Transfer SOL from user to authority ──────────────────────
      setStatus('awaiting-signature');

      const lamportsToSend = Math.round(parsedSol * LAMPORTS_PER_SOL);
      const authorityPubkey = new PublicKey(AUTHORITY_PUBKEY);

      const transferIx = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: authorityPubkey,
        lamports: lamportsToSend,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(transferIx);

      // Wallet adapter prompts user to approve — this is the single wallet pop-up
      const signature = await sendTransaction(transaction, connection);
      setSolTxSig(signature);

      // ── Phase 2: Wait for on-chain confirmation ───────────────────────────
      setStatus('confirming');

      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      // ── Phase 3: Backend verifies transfer and mints USDT ─────────────────
      setStatus('minting');

      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          solTransferSignature: signature,
          usdtAmount: usdtOutput,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'USDT minting failed after SOL transfer.');
      }

      setMintTxSig(data.txSignature);
      setStatus('success');
      await fetchSolBalance();
    } catch (err: any) {
      // User rejected wallet pop-up or any step failed
      const message =
        err?.message?.includes('User rejected')
          ? 'Transaction cancelled. No SOL was transferred.'
          : err?.message || 'An unexpected error occurred.';
      setErrorMsg(message);
      setStatus('error');
    }
  };

  /** Human-readable label for each loading phase */
  const loadingLabel: Record<string, string> = {
    'awaiting-signature': 'Approve in wallet...',
    confirming: 'Confirming transfer...',
    minting: 'Minting USDT...',
  };

  const isLoading =
    status === 'awaiting-signature' || status === 'confirming' || status === 'minting';

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden border rounded-3xl bg-[#0d0d0d] border-white/10 shadow-[0_0_60px_rgba(0,255,163,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#00FFA3]/10 border border-[#00FFA3]/20">
              <ArrowDownUp className="w-4 h-4 text-[#00FFA3]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Get USDT</h2>
              <p className="text-xs text-white/40">Devnet · Real SOL Transfer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 transition-colors rounded-full hover:bg-white/10 hover:text-white"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Devnet info badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Zap className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-xs text-blue-300">
              <strong>Devnet.</strong> Your SOL is transferred to the protocol deployer wallet.
              Equivalent USDT is then minted to your wallet automatically.
            </p>
          </div>

          {/* ── SOL Input ──────────────────────────────────────────────────── */}
          <div className="p-4 border rounded-2xl bg-white/5 border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
                You Send
              </label>
              {solBalance !== null && (
                <button
                  className="text-xs text-[#00FFA3]/70 hover:text-[#00FFA3] transition-colors"
                  onClick={() =>
                    setSolAmount(Math.max(0, solBalance - GAS_RESERVE_SOL).toFixed(3))
                  }
                  disabled={isLoading}
                >
                  Max: {solBalance.toFixed(3)} SOL
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Solana logo */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#9945FF]/20 border border-[#9945FF]/30 shrink-0">
                <svg width="18" height="18" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.2 96.2L35.5 82.9C36.2 82.2 37.2 81.8 38.2 81.8H121.8C123.4 81.8 124.2 83.7 123.1 84.8L108.8 98.1C108.1 98.8 107.1 99.2 106.1 99.2H22.5C20.9 99.2 20.1 97.3 21.2 96.2Z" fill="#9945FF" />
                  <path d="M21.2 29.9L35.5 16.6C36.2 15.9 37.2 15.5 38.2 15.5H121.8C123.4 15.5 124.2 17.4 123.1 18.5L108.8 31.8C108.1 32.5 107.1 32.9 106.1 32.9H22.5C20.9 32.9 20.1 31 21.2 29.9Z" fill="#9945FF" />
                  <path d="M108.8 62.8L94.5 76.1C93.8 76.8 92.8 77.2 91.8 77.2H8.2C6.6 77.2 5.8 75.3 6.9 74.2L21.2 60.9C21.9 60.2 22.9 59.8 23.9 59.8H107.5C109.1 59.8 109.9 61.7 108.8 62.8Z" fill="#9945FF" />
                </svg>
                <span className="text-sm font-bold text-white">SOL</span>
              </div>
              <input
                type="number"
                value={solAmount}
                onChange={(e) => setSolAmount(e.target.value)}
                min={MIN_SOL_AMOUNT}
                step={0.01}
                className="flex-1 bg-transparent text-2xl font-bold text-white outline-none text-right appearance-none"
                placeholder="0.1"
                disabled={isLoading || status === 'success'}
              />
            </div>
          </div>

          {/* Arrow divider */}
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10">
              <ArrowDownUp className="w-4 h-4 text-white/30" />
            </div>
          </div>

          {/* ── USDT Output ────────────────────────────────────────────────── */}
          <div className="p-4 border rounded-2xl bg-[#00FFA3]/5 border-[#00FFA3]/15 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
              You Receive
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#00FFA3]/10 border border-[#00FFA3]/20 shrink-0">
                <span className="text-sm font-bold text-[#00FFA3]">$</span>
                <span className="text-sm font-bold text-white">USDT</span>
              </div>
              <span className="flex-1 text-2xl font-bold text-[#00FFA3] text-right">
                {usdtOutput > 0
                  ? usdtOutput.toLocaleString('en-US', { maximumFractionDigits: 2 })
                  : '0'}
              </span>
            </div>
          </div>

          {/* Rate */}
          <div className="flex items-center justify-center gap-2">
            <p className="text-center text-xs text-white/30">
              Rate: 1 SOL = {isFetchingRate ? '...' : solToUsdtRate?.toFixed(2)} USDT · Real-time (CoinGecko)
            </p>
            {isFetchingRate && <Loader2 className="w-3 h-3 text-white/30 animate-spin" />}
          </div>

          {/* ── Multi-step progress indicator ──────────────────────────────── */}
          {isLoading && (
            <div className="flex items-center justify-between px-2">
              {['awaiting-signature', 'confirming', 'minting'].map((step, i) => (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                      status === step
                        ? 'bg-[#00FFA3] border-[#00FFA3] text-black'
                        : ['awaiting-signature', 'confirming', 'minting'].indexOf(status) > i
                        ? 'bg-[#00FFA3]/30 border-[#00FFA3]/50 text-[#00FFA3]'
                        : 'bg-white/5 border-white/20 text-white/30'
                    }`}>
                      {i + 1}
                    </div>
                    <span className="text-[9px] text-white/30 text-center">
                      {['Sign', 'Confirm', 'Mint'][i]}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-px mx-1 transition-all ${
                      ['awaiting-signature', 'confirming', 'minting'].indexOf(status) > i
                        ? 'bg-[#00FFA3]/40'
                        : 'bg-white/10'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ── Success state ───────────────────────────────────────────────── */}
          {status === 'success' && mintTxSig && (
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#00FFA3]/10 border border-[#00FFA3]/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#00FFA3] shrink-0" />
                <p className="text-sm font-semibold text-[#00FFA3]">
                  {usdtOutput.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT minted to your wallet!
                </p>
              </div>
              <div className="space-y-1">
                {solTxSig && (
                  <a
                    href={`https://explorer.solana.com/tx/${solTxSig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors"
                  >
                    SOL Transfer: {solTxSig.slice(0, 24)}...
                  </a>
                )}
                <a
                  href={`https://explorer.solana.com/tx/${mintTxSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors"
                >
                  USDT Mint: {mintTxSig.slice(0, 24)}...
                </a>
              </div>
            </div>
          )}

          {/* ── Error state ─────────────────────────────────────────────────── */}
          {status === 'error' && errorMsg && (
            <div className="flex items-start gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          {/* Balance validation hint */}
          {!isValidAmount && status === 'idle' && parsedSol > 0 && (
            <p className="text-xs text-orange-400/80 text-center">
              {solBalance !== null && parsedSol > solBalance - GAS_RESERVE_SOL
                ? `Keep at least ${GAS_RESERVE_SOL} SOL for gas fees.`
                : `Minimum swap is ${MIN_SOL_AMOUNT} SOL.`}
            </p>
          )}

          {/* ── CTA Button ─────────────────────────────────────────────────── */}
          {status === 'success' ? (
            <button
              onClick={onClose}
              className="w-full py-4 font-bold text-black uppercase transition-all bg-[#00FFA3] rounded-2xl hover:bg-[#00FFA3]/90 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,255,163,0.4)]"
            >
              Done — USDT Added ✓
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={!publicKey || !isValidAmount || isLoading || isFetchingRate || solToUsdtRate === null}
              className="w-full flex items-center justify-center gap-2 py-4 font-bold text-black uppercase transition-all bg-[#00FFA3] rounded-2xl hover:bg-[#00FFA3]/90 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,255,163,0.4)] disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {loadingLabel[status]}
                </>
              ) : (
                <>
                  <ArrowDownUp className="w-5 h-5" />
                  Swap SOL → USDT
                </>
              )}
            </button>
          )}

          {!publicKey && (
            <p className="text-xs text-center text-white/30">Connect your wallet to swap.</p>
          )}
        </div>
      </div>
    </div>
  );
}
