/**
 * Vitest global setup for backend tests.
 *
 * Mocks all external service calls (Supabase, Groq, Crossmint, Solana RPC)
 * so tests run fast and deterministically without network access or real credentials.
 *
 * All mocks use vi.mock() — Vitest's equivalent of Jest's module mocking system.
 */

import { vi, beforeAll } from 'vitest';

// ─── Environment variables (prevent "missing env" crashes in route handlers) ──
beforeAll(() => {
  process.env.CRON_SECRET = 'test-cron-secret-do-not-use-in-prod';
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://api.devnet.solana.com';
  process.env.AUTHORITY_PRIVATE_KEY = JSON.stringify(Array.from({ length: 64 }, (_, i) => i));
  process.env.GROQ_API_KEY = 'test-groq-key';
  process.env.CROSSMINT_API_KEY = 'test-crossmint-key';
  process.env.CROSSMINT_COLLECTION_ID = 'test-collection-id';
  process.env.NEXT_PUBLIC_AUTHORITY_PUBKEY = 'GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW';
});

// ─── Mock Supabase Admin client ───────────────────────────────────────────────
vi.mock('@/lib/supabaseAdmin', () => {
  const makeChain = (result = { data: null, error: null }): any => {
    const chain: any = {};
    const methods = ['from', 'select', 'insert', 'update', 'upsert', 'eq', 'in', 'order', 'limit'];
    methods.forEach((m) => { chain[m] = () => chain; });
    chain.single = () => Promise.resolve(result);
    // Make chain itself awaitable for operations that don't use .single()
    chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
    return chain;
  };

  return {
    supabaseAdmin: {
      from: (_table: string) => makeChain(),
    },
  };
});

// ─── Mock Groq SDK ────────────────────────────────────────────────────────────
vi.mock('groq-sdk', () => {
  return {
    default: class MockGroq {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  isValid: true,
                  confidenceScore: 75,
                  activity: 'Running',
                  relevance: 'Matches fitness commitment',
                  reason: 'Clear running activity with timer visible',
                }),
              },
            }],
          }),
        },
      };
    },
  };
});

// ─── Mock @solana/web3.js Connection + Keypair (prevent real RPC calls & validation) ─
vi.mock('@solana/web3.js', async (importOriginal: () => Promise<any>) => {
  const original = await importOriginal();

  class MockConnection {
    getTransaction = vi.fn().mockResolvedValue(null); // Default: tx not found
    getBalance = vi.fn().mockResolvedValue(2_000_000_000); // 2 SOL
    getLatestBlockhash = vi.fn().mockResolvedValue({
      blockhash: 'mockBlockhash123',
      lastValidBlockHeight: 999999,
    });
    getAccountInfo = vi.fn().mockResolvedValue({ lamports: 1000000, data: Buffer.alloc(0) });
    confirmTransaction = vi.fn().mockResolvedValue({ value: { err: null } });
  }

  /**
   * MockKeypair bypasses Solana's ed25519 secret key validation.
   * The real Keypair.fromSecretKey validates that the 64-byte input is a valid
   * keypair (last 32 bytes must be the derived public key). Our mock AUTHORITY_PRIVATE_KEY
   * is [0..63] which fails this check, causing routes to throw before reaching
   * the logic under test and returning 500 instead of 400.
   */
  class MockKeypair {
    publicKey = new original.PublicKey('GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW');
    secretKey = new Uint8Array(64);
    static fromSecretKey = vi.fn().mockReturnValue(new MockKeypair());
    static generate = vi.fn().mockReturnValue(new MockKeypair());
  }

  return {
    ...original,
    Connection: MockConnection,
    Keypair: MockKeypair,
  };
});

// ─── Mock @coral-xyz/anchor Program ──────────────────────────────────────────
vi.mock('@coral-xyz/anchor', async (importOriginal: () => Promise<any>) => {
  const original = await importOriginal();

  return {
    ...original,
    Program: class MockProgram {
      programId = new original.web3.PublicKey('3nrc4dPYdhztn9d82QmrznATBbYEi9hhvRyx6AnHVGk9');
      account = {
        commitmentAccount: {
          fetch: vi.fn().mockResolvedValue({
            status: { active: {} },
            createdAt: { toNumber: () => Math.floor(Date.now() / 1000) - 86400 * 5 },
            currentDay: 5,
            durationDays: 30,
            failedCount: 0,
            owner: new original.web3.PublicKey('GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW'),
          }),
          all: vi.fn().mockResolvedValue([]),
        },
      };
    },
  };
});

// ─── Mock @solana/spl-token ───────────────────────────────────────────────────
vi.mock('@solana/spl-token', async (importOriginal: () => Promise<any>) => {
  const original = await importOriginal();
  return {
    ...original,
    getOrCreateAssociatedTokenAccount: vi.fn().mockResolvedValue({
      address: new (await import('@solana/web3.js')).PublicKey(
        'GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW'
      ),
    }),
    mintTo: vi.fn().mockResolvedValue('mockMintTxSignature123'),
  };
});

// ─── Mock fetch (for Crossmint API calls) ────────────────────────────────────
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ id: 'mock-nft-id-abc123' }),
  text: () => Promise.resolve(''),
}));
