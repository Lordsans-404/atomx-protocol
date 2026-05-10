import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';

/** The deployed Mock USDT mint on Devnet (created via setup-devnet.mjs) */
const USDT_MINT_ADDRESS = 'uFUq4dXUWfFVKzw6HzaUtqSb4Vs52QuYPmhasGT9Ruk';

/** USDT uses 6 decimal places, same as real USDC/USDT */
const USDT_DECIMALS = 6;

/** Maximum USDT mintable per single swap request (anti-abuse guard) */
const MAX_USDT_PER_SWAP = 10_000;


/**
 * POST /api/swap
 *
 * Two-phase devnet SOL → USDT swap handler:
 *   1. Receives a confirmed SOL transfer txSignature from the client.
 *   2. Verifies on-chain that:
 *      a. The transaction succeeded.
 *      b. SOL moved from the user's wallet to the authority wallet.
 *      c. The transferred lamports match the expected amount (within tolerance).
 *   3. If all checks pass, mints the equivalent USDT to the user's ATA.
 *
 * This prevents USDT from being minted without a real on-chain SOL payment.
 *
 * Request body:
 *   - walletAddress: string         — User's Solana public key
 *   - solTransferSignature: string  — Confirmed tx where user sent SOL to authority
 *   - usdtAmount: number            — USDT to mint (must match rate × sol sent)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, solTransferSignature, usdtAmount } = body as {
      walletAddress: string;
      solTransferSignature: string;
      usdtAmount: number;
    };

    // ── Input validation ────────────────────────────────────────────────────
    if (!walletAddress || !solTransferSignature || typeof usdtAmount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, solTransferSignature, usdtAmount.' },
        { status: 400 }
      );
    }

    if (usdtAmount <= 0 || usdtAmount > MAX_USDT_PER_SWAP) {
      return NextResponse.json(
        { error: `USDT amount must be between 1 and ${MAX_USDT_PER_SWAP}.` },
        { status: 400 }
      );
    }

    let userPubkey: PublicKey;
    try {
      userPubkey = new PublicKey(walletAddress);
    } catch {
      return NextResponse.json({ error: 'Invalid wallet address.' }, { status: 400 });
    }

    // ── Environment setup ───────────────────────────────────────────────────
    const authorityKeyRaw = process.env.AUTHORITY_PRIVATE_KEY;
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

    if (!authorityKeyRaw || !rpcUrl) {
      console.error('[Swap] Missing AUTHORITY_PRIVATE_KEY or NEXT_PUBLIC_SOLANA_RPC_URL');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const secretKeyArray = JSON.parse(authorityKeyRaw) as number[];
    const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
    const connection = new Connection(rpcUrl, 'confirmed');

    // ── Phase 1: Verify the SOL transfer on-chain ───────────────────────────
    const txInfo = await connection.getTransaction(solTransferSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo) {
      return NextResponse.json(
        { error: 'SOL transfer transaction not found on-chain. Please try again.' },
        { status: 400 }
      );
    }

    if (txInfo.meta?.err) {
      return NextResponse.json(
        { error: 'SOL transfer transaction failed on-chain.' },
        { status: 400 }
      );
    }

    // Resolve account keys from the versioned or legacy transaction
    const accountKeys =
      'accountKeys' in txInfo.transaction.message
        ? txInfo.transaction.message.accountKeys
        : txInfo.transaction.message.getAccountKeys().staticAccountKeys;

    const userIndex = accountKeys.findIndex(
      (k) => k.toBase58() === userPubkey.toBase58()
    );
    const authorityIndex = accountKeys.findIndex(
      (k) => k.toBase58() === authorityKeypair.publicKey.toBase58()
    );

    if (userIndex === -1 || authorityIndex === -1) {
      return NextResponse.json(
        { error: 'SOL transfer does not involve the expected accounts.' },
        { status: 400 }
      );
    }

    const preBalances = txInfo.meta?.preBalances ?? [];
    const postBalances = txInfo.meta?.postBalances ?? [];

    // Calculate net SOL movement: positive = received, negative = sent
    const authorityNetLamports = postBalances[authorityIndex] - preBalances[authorityIndex];

    // Fetch real-time SOL price to verify the exchange rate
    let currentSolPrice = 150; // fallback
    try {
      const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        if (priceData?.solana?.usd) {
          currentSolPrice = priceData.solana.usd;
        }
      }
    } catch (err) {
      console.warn('[Swap] Failed to fetch real-time price from CoinGecko, using fallback', err);
    }

    // Evaluate the actual USDT value of the SOL sent
    const actualUsdtValue = (authorityNetLamports / LAMPORTS_PER_SOL) * currentSolPrice;
    
    // Allow up to 5% slippage tolerance in case the price shifted between user click 
    // and backend verification, or due to slight floating point differences
    const slippageTolerance = 0.05;
    const lowerBoundUsdt = usdtAmount * (1 - slippageTolerance);

    if (actualUsdtValue < lowerBoundUsdt) {
      console.warn(
        `[Swap] Value mismatch — sent ${authorityNetLamports} lamports = ~$${actualUsdtValue.toFixed(2)}, ` +
        `but requested ${usdtAmount} USDT.`
      );
      return NextResponse.json(
        { error: 'SOL amount transferred does not cover the requested USDT amount.' },
        { status: 400 }
      );
    }

    // ── Phase 2: Mint USDT to user's ATA ───────────────────────────────────
    const usdtMint = new PublicKey(USDT_MINT_ADDRESS);

    // Get or create the user's ATA for USDT (authority pays for creation if needed)
    const userAta = await getOrCreateAssociatedTokenAccount(
      connection,
      authorityKeypair,
      usdtMint,
      userPubkey
    );

    const mintAmount = BigInt(Math.round(usdtAmount * 10 ** USDT_DECIMALS));
    const mintTxSig = await mintTo(
      connection,
      authorityKeypair,
      usdtMint,
      userAta.address,
      authorityKeypair,
      mintAmount
    );

    console.log(
      `[Swap] ✅ Swap complete | User: ${walletAddress} | ` +
      `SOL tx: ${solTransferSignature} | ` +
      `Minted: ${usdtAmount} USDT | Mint tx: ${mintTxSig}`
    );

    return NextResponse.json({
      success: true,
      txSignature: mintTxSig,
      usdtMinted: usdtAmount,
      ataAddress: userAta.address.toBase58(),
    });
  } catch (err: any) {
    console.error('[Swap] Unhandled error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during swap.' },
      { status: 500 }
    );
  }
}
