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

  // updated, match the modal overlay with the new dashboard system
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* updated, restyle the swap modal container with Stitch tokens */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_0_60px_rgba(78,222,163,0.12)] backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border p-5 sm:p-6"> {/* updated, normalize modal header spacing and divider */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10"> {/* updated, map the swap icon chip to the shared primary accent */}
              <ArrowDownUp className="h-4 w-4 text-primary" /> {/* updated, reuse the dashboard primary color inside the swap icon chip */}
            </div>
            <div>
              <h2 className="font-playfair text-xl font-bold text-white">Get USDT</h2> {/* updated, align the modal title with the Stitch display type */}
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Devnet · Real SOL Transfer</p> {/* updated, convert helper copy into a label-style subtitle */}
            </div>
          </div>
          {/* updated, align the close button with the new focus and surface system */}
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6"> {/* updated, align modal content padding with the refreshed card system */}
          {/* Devnet info badge */}
          <div className="flex items-start gap-2 rounded-xl border border-secondary/20 bg-secondary/10 px-3 py-2.5"> {/* updated, present the devnet notice as a Stitch inline callout */}
            <Zap className="h-4 w-4 shrink-0 text-secondary" /> {/* updated, restyle the devnet icon with the secondary accent */}
            <p className="text-xs leading-5 text-secondary/90">
              <strong>Devnet.</strong> Your SOL is transferred to the protocol deployer wallet.
              Equivalent USDT is then minted to your wallet automatically.
            </p>
          </div>

          {/* ── SOL Input ──────────────────────────────────────────────────── */}
          <div className="space-y-3 rounded-2xl border border-border bg-surface-container-high/70 p-4"> {/* updated, restyle the send panel as a Stitch surface card */}
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"> {/* updated, use the shared label treatment for swap panels */}
                You Send
              </label>
              {solBalance !== null && (
                <button
                  className="text-xs font-medium text-primary/80 transition-colors hover:text-primary"
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
              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2"> {/* updated, tone down the token chip frame to match the new modal system */}
                <svg width="18" height="18" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.2 96.2L35.5 82.9C36.2 82.2 37.2 81.8 38.2 81.8H121.8C123.4 81.8 124.2 83.7 123.1 84.8L108.8 98.1C108.1 98.8 107.1 99.2 106.1 99.2H22.5C20.9 99.2 20.1 97.3 21.2 96.2Z" fill="#9945FF" />
                  <path d="M21.2 29.9L35.5 16.6C36.2 15.9 37.2 15.5 38.2 15.5H121.8C123.4 15.5 124.2 17.4 123.1 18.5L108.8 31.8C108.1 32.5 107.1 32.9 106.1 32.9H22.5C20.9 32.9 20.1 31 21.2 29.9Z" fill="#9945FF" />
                  <path d="M108.8 62.8L94.5 76.1C93.8 76.8 92.8 77.2 91.8 77.2H8.2C6.6 77.2 5.8 75.3 6.9 74.2L21.2 60.9C21.9 60.2 22.9 59.8 23.9 59.8H107.5C109.1 59.8 109.9 61.7 108.8 62.8Z" fill="#9945FF" />
                </svg>
                <span className="text-sm font-bold text-white">SOL</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={solAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setSolAmount(val);
                  }
                }}
                className="flex-1 w-full min-w-0 appearance-none bg-transparent text-right text-2xl font-bold text-white outline-none"
                placeholder="0.1"
                disabled={isLoading || status === 'success'}
              />
            </div>
          </div>

          {/* Arrow divider */}
          <div className="flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/70"> {/* updated, match the swap divider to the Stitch surface system */}
              <ArrowDownUp className="h-4 w-4 text-muted-foreground/70" /> {/* updated, soften the divider icon to secondary hierarchy */}
            </div>
          </div>

          {/* ── USDT Output ────────────────────────────────────────────────── */}
          <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/10 p-4"> {/* updated, give the receive panel a lighter primary treatment from Stitch */}
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"> {/* updated, keep panel labels consistent */}
              You Receive
            </label>
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2"> {/* updated, align the receive chip with the shared primary token */}
                <span className="text-sm font-bold text-primary">$</span>
                <span className="text-sm font-bold text-white">USDT</span>
              </div>
              <span className="flex-1 text-right text-2xl font-bold text-primary"> {/* updated, restyle the quoted output amount with the primary token */}
                {usdtOutput > 0
                  ? usdtOutput.toLocaleString('en-US', { maximumFractionDigits: 2 })
                  : '0'}
              </span>
            </div>
          </div>

          {/* Rate */}
          <div className="flex items-center justify-center gap-2">
            <p className="text-center text-xs text-muted-foreground"> {/* updated, move rate copy into the muted hierarchy */}
              Rate: 1 SOL = {isFetchingRate ? '...' : solToUsdtRate?.toFixed(2)} USDT · Real-time (CoinGecko)
            </p>
            {isFetchingRate && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />} {/* updated, align the spinner tone with supporting metadata */}
          </div>

          {/* ── Multi-step progress indicator ──────────────────────────────── */}
          {isLoading && (
            <div className="flex items-center justify-between px-2">
              {['awaiting-signature', 'confirming', 'minting'].map((step, i) => (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                      status === step
                        ? 'bg-primary border-primary text-primary-foreground'
                        : ['awaiting-signature', 'confirming', 'minting'].indexOf(status) > i
                        ? 'bg-primary/20 border-primary/45 text-primary'
                        : 'bg-surface-container-high/70 border-border text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>
                    <span className="text-center text-[9px] text-muted-foreground"> {/* updated, soften the inactive loading-step labels */}
                      {['Sign', 'Confirm', 'Mint'][i]}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-px mx-1 transition-all ${
                      ['awaiting-signature', 'confirming', 'minting'].indexOf(status) > i
                        ? 'bg-primary/35'
                        : 'bg-border'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ── Success state ───────────────────────────────────────────────── */}
          {status === 'success' && mintTxSig && (
            <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4"> {/* updated, map success state visuals to the shared primary system */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> {/* updated, use the primary token for success confirmation */}
                <p className="text-sm font-semibold text-primary">
                  {usdtOutput.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT minted to your wallet!
                </p>
              </div>
              <div className="space-y-1">
                {solTxSig && (
                  <>
                    {/* updated, keep explorer links readable within the new modal hierarchy */}
                  <a
                    href={`https://explorer.solana.com/tx/${solTxSig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-white"
                  >
                    SOL Transfer: {solTxSig.slice(0, 24)}...
                  </a>
                  </>
                )}
                {/* updated, match the success links to the refreshed metadata styling */}
                <a
                  href={`https://explorer.solana.com/tx/${mintTxSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-white"
                >
                  USDT Mint: {mintTxSig.slice(0, 24)}...
                </a>
              </div>
            </div>
          )}

          {/* ── Error state ─────────────────────────────────────────────────── */}
          {status === 'error' && errorMsg && (
            <div className="flex items-start gap-2 rounded-2xl border border-error/25 bg-error/10 p-4"> {/* updated, map error state styling to the shared error token */}
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" /> {/* updated, align the error icon with the shared palette */}
              <p className="text-sm text-error">{errorMsg}</p>
            </div>
          )}

          {/* Balance validation hint */}
          {!isValidAmount && status === 'idle' && parsedSol > 0 && (
            <p className="text-center text-xs text-secondary/90"> {/* updated, use the Stitch secondary tone for caution copy */}
              {solBalance !== null && parsedSol > solBalance - GAS_RESERVE_SOL
                ? `Keep at least ${GAS_RESERVE_SOL} SOL for gas fees.`
                : `Minimum swap is ${MIN_SOL_AMOUNT} SOL.`}
            </p>
          )}

          {/* ── CTA Button ─────────────────────────────────────────────────── */}
          {status === 'success' ? (
            <>
              {/* updated, restyle the success CTA with the shared button system */}
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-primary py-4 font-bold uppercase tracking-[0.12em] text-primary-foreground transition-[background-color,transform,box-shadow] hover:bg-primary/90 active:scale-[0.98] shadow-[0_0_20px_rgba(78,222,163,0.24)]"
            >
              Done — USDT Added ✓
            </button>
            </>
          ) : (
            <>
              {/* updated, restyle the swap CTA with the refreshed primary button treatment */}
            <button
              onClick={handleSwap}
              disabled={!publicKey || !isValidAmount || isLoading || isFetchingRate || solToUsdtRate === null}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold uppercase tracking-[0.12em] text-primary-foreground transition-[background-color,transform,box-shadow] hover:bg-primary/90 active:scale-[0.98] shadow-[0_0_20px_rgba(78,222,163,0.24)] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
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
            </>
          )}

          {!publicKey && (
            <>
              {/* updated, keep helper copy in the muted hierarchy */}
              <p className="text-center text-xs text-muted-foreground">Connect your wallet to swap.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
