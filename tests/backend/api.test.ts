/**
 * AtomX Protocol — Backend Test Suite
 *
 * Covers:
 *   - API routes: input validation & auth guards (off-chain)
 *   - Business logic: slash %, swap rate, AI gating, missed days, NFT retry, image hashing
 *
 * All external services (Supabase, Groq, Crossmint, Solana) are mocked in setup.ts.
 * Run: bun run test:backend
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: any, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { method: 'GET', headers });
}

// =============================================================================
// SECTION 1: POST /api/commitments — Save commitment metadata to Supabase
// =============================================================================

describe('POST /api/commitments', () => {

  it('returns 400 when pda, owner, or title is missing', async () => {
    const { POST } = await import('../../apps/web/app/api/commitments/route');
    const res = await POST(makeRequest({ owner: 'wallet123', durationDays: 7, dailyTargetMinutes: 30 }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required fields/i);
  });

  it('returns 400 when durationDays < 7', async () => {
    const { POST } = await import('../../apps/web/app/api/commitments/route');
    const res = await POST(makeRequest({
      pda: 'pdaABC', owner: 'walletXYZ', title: 'Morning Run',
      durationDays: 3, dailyTargetMinutes: 30,
    }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least 7 days/i);
  });

  it('returns 400 when dailyTargetMinutes < 10', async () => {
    const { POST } = await import('../../apps/web/app/api/commitments/route');
    const res = await POST(makeRequest({
      pda: 'pdaABC', owner: 'walletXYZ', title: 'Morning Run',
      durationDays: 7, dailyTargetMinutes: 5,
    }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least 10 minutes/i);
  });

});

// =============================================================================
// SECTION 2: GET /api/commitments — Fetch metadata map by owner
// =============================================================================

describe('GET /api/commitments', () => {

  it('returns 400 when owner query param is missing', async () => {
    const { GET } = await import('../../apps/web/app/api/commitments/route');
    const res = await GET(makeGetRequest('http://localhost:3000/api/commitments') as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Missing owner/i);
  });

});

// =============================================================================
// SECTION 3: POST /api/validate-proof — AI image validation
// =============================================================================

describe('POST /api/validate-proof', () => {

  it('returns 400 when image field is absent', async () => {
    const { POST } = await import('../../apps/web/app/api/validate-proof/route');
    const res = await POST(makeRequest({ targetMinutes: 30, elapsedMinutes: 35 }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Image is required/i);
  });

});

// =============================================================================
// SECTION 4: POST /api/swap — SOL → USDT devnet swap
// =============================================================================

describe('POST /api/swap', () => {

  it('returns 400 when required fields are missing', async () => {
    const { POST } = await import('../../apps/web/app/api/swap/route');
    const res = await POST(makeRequest({ walletAddress: 'abc' }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Missing required fields/i);
  });

  it('returns 400 when usdtAmount is 0', async () => {
    const { POST } = await import('../../apps/web/app/api/swap/route');
    const res = await POST(makeRequest({
      walletAddress: 'GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW',
      solTransferSignature: 'fakeSig',
      usdtAmount: 0,
    }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when usdtAmount exceeds 10000', async () => {
    const { POST } = await import('../../apps/web/app/api/swap/route');
    const res = await POST(makeRequest({
      walletAddress: 'GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW',
      solTransferSignature: 'fakeSig',
      usdtAmount: 99999,
    }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/10000/);
  });

  it('returns 400 for invalid (non-base58) wallet address', async () => {
    const { POST } = await import('../../apps/web/app/api/swap/route');
    const res = await POST(makeRequest({
      walletAddress: 'NOT_VALID!!!',
      solTransferSignature: 'fakeSig',
      usdtAmount: 100,
    }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid wallet address/i);
  });

  it('returns 400 when SOL transfer tx is not found on-chain (mocked null)', async () => {
    // Connection.getTransaction returns null by default in mock (setup.ts)
    const { POST } = await import('../../apps/web/app/api/swap/route');
    const res = await POST(makeRequest({
      walletAddress: 'GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW',
      solTransferSignature: 'nonExistentSig',
      usdtAmount: 100,
    }) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/not found on-chain/i);
  });

});

// =============================================================================
// SECTION 5: GET /api/cron/check-deadlines — Daily off-chain deadline check
// =============================================================================

describe('GET /api/cron/check-deadlines', () => {

  it('returns 401 without Authorization header', async () => {
    const { GET } = await import('../../apps/web/app/api/cron/check-deadlines/route');
    const res = await GET(makeGetRequest('http://localhost:3000/api/cron/check-deadlines') as any);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Unauthorized');
  });

  it('returns 401 with wrong CRON_SECRET', async () => {
    const { GET } = await import('../../apps/web/app/api/cron/check-deadlines/route');
    const res = await GET(makeGetRequest(
      'http://localhost:3000/api/cron/check-deadlines',
      { authorization: 'Bearer totally-wrong-secret' }
    ) as any);
    expect(res.status).toBe(401);
  });

  it('accepts correct CRON_SECRET (returns 200)', async () => {
    const { GET } = await import('../../apps/web/app/api/cron/check-deadlines/route');
    const res = await GET(makeGetRequest(
      'http://localhost:3000/api/cron/check-deadlines',
      { authorization: `Bearer ${process.env.CRON_SECRET}` }
    ) as any);
    expect(res.status).toBe(200);
  });

});

// =============================================================================
// SECTION 6: GET /api/cron/batch-slash — On-chain batch slash
// =============================================================================

describe('GET /api/cron/batch-slash', () => {

  it('returns 401 without Authorization header', async () => {
    const { GET } = await import('../../apps/web/app/api/cron/batch-slash/route');
    const res = await GET(makeGetRequest('http://localhost:3000/api/cron/batch-slash') as any);
    expect(res.status).toBe(401);
  });

  it('returns 401 with incorrect CRON_SECRET', async () => {
    const { GET } = await import('../../apps/web/app/api/cron/batch-slash/route');
    const res = await GET(makeGetRequest(
      'http://localhost:3000/api/cron/batch-slash',
      { authorization: 'Bearer bad-secret' }
    ) as any);
    expect(res.status).toBe(401);
  });

  it('accepts correct CRON_SECRET (returns 200)', async () => {
    const { GET } = await import('../../apps/web/app/api/cron/batch-slash/route');
    const res = await GET(makeGetRequest(
      'http://localhost:3000/api/cron/batch-slash',
      { authorization: `Bearer ${process.env.CRON_SECRET}` }
    ) as any);
    expect(res.status).toBe(200);
  });

});

// =============================================================================
// SECTION 7: POST /api/webhooks/helius — Anchor event indexer
// =============================================================================

describe('POST /api/webhooks/helius', () => {

  it('returns 400 for empty object payload (no signature key)', async () => {
    const { POST } = await import('../../apps/web/app/api/webhooks/helius/route');
    const res = await POST(makeRequest({}) as any);
    expect(res.status).toBe(400);
  });

  it('accepts single signature object (client sync mode)', async () => {
    const { POST } = await import('../../apps/web/app/api/webhooks/helius/route');
    const res = await POST(makeRequest({ signature: 'fakeSig123' }) as any);
    // With mocked Connection returning null tx, it will still return 200 (no-op)
    expect(res.status).toBe(200);
  });

  it('accepts array payload (Helius production mode)', async () => {
    const { POST } = await import('../../apps/web/app/api/webhooks/helius/route');
    const res = await POST(makeRequest([{ signature: 'fakeSig123' }]) as any);
    expect(res.status).toBe(200);
  });

});

// =============================================================================
// SECTION 8: GET /api/medals — NFT index cache fetch
// =============================================================================

describe('GET /api/medals', () => {

  it('returns 400 when owner query param is missing', async () => {
    const { GET } = await import('../../apps/web/app/api/medals/route');
    const res = await GET(makeGetRequest('http://localhost:3000/api/medals') as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/owner/i);
  });

  it('returns 200 with medals array for valid owner', async () => {
    const { GET } = await import('../../apps/web/app/api/medals/route');
    const res = await GET(makeGetRequest(
      'http://localhost:3000/api/medals?owner=GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW'
    ) as any);
    expect(res.status).toBe(200);
  });

});

// =============================================================================
// SECTION 9: Slash percentage calculation — pure business logic
// =============================================================================

describe('Slash percentage calculation', () => {

  function calculateSlashAction(durationDays: number, failedCount: number) {
    if (durationDays <= 7) {
      return { slashPercent: 100, newStatus: 'failed', action: 'full_slash' };
    } else if (failedCount === 0) {
      return { slashPercent: 40, newStatus: 'failed', action: 'partial_slash_and_terminate' };
    } else {
      return { slashPercent: 100, newStatus: 'failed', action: 'full_slash' };
    }
  }

  it('slashes 100% for ≤7 day commitment on first failure', () => {
    expect(calculateSlashAction(7, 0).slashPercent).toBe(100);
    expect(calculateSlashAction(7, 0).newStatus).toBe('failed');
  });

  it('slashes 100% for 3-day commitment (below minimum, first failure)', () => {
    expect(calculateSlashAction(3, 0).slashPercent).toBe(100);
  });

  it('slashes 40% for 30-day commitment on first failure', () => {
    expect(calculateSlashAction(30, 0).slashPercent).toBe(40);
  });

  it('slashes 100% for 30-day commitment on second failure', () => {
    expect(calculateSlashAction(30, 1).slashPercent).toBe(100);
  });

  it('slashes 100% for 8-day commitment on second failure', () => {
    expect(calculateSlashAction(8, 1).slashPercent).toBe(100);
  });

  it('all outcomes result in failed status', () => {
    expect(calculateSlashAction(7, 0).newStatus).toBe('failed');
    expect(calculateSlashAction(30, 0).newStatus).toBe('failed');
    expect(calculateSlashAction(30, 1).newStatus).toBe('failed');
  });

});

// =============================================================================
// SECTION 10: Swap rate and lamport verification
// =============================================================================

describe('Swap rate and lamport verification', () => {

  const LAMPORTS_PER_SOL = 1_000_000_000;
  const SLIPPAGE_TOLERANCE = 0.05;

  function isTransferSufficient(authorityNetLamports: number, currentSolPrice: number, usdtAmount: number): boolean {
    const actualUsdtValue = (authorityNetLamports / LAMPORTS_PER_SOL) * currentSolPrice;
    const lowerBoundUsdt = usdtAmount * (1 - SLIPPAGE_TOLERANCE);
    return actualUsdtValue >= lowerBoundUsdt;
  }

  it('accepts exact transfer (0.1 SOL for 15 USDT at $150/SOL)', () => {
    expect(isTransferSufficient(100_000_000, 150, 15)).toBe(true);
  });

  it('accepts transfer with slight price drop within 5% slippage', () => {
    // User requested 15 USDT when price was $150 (sent 0.1 SOL)
    // Price drops to $145 -> actual value is $14.50
    // 5% of 15 is 0.75, so lower bound is 14.25. 14.50 >= 14.25 (should pass)
    expect(isTransferSufficient(100_000_000, 145, 15)).toBe(true);
  });

  it('rejects transfer if price dropped beyond 5% slippage', () => {
    // User requested 15 USDT (sent 0.1 SOL)
    // Price crashes to $140 -> actual value is $14.00
    // Lower bound is 14.25. 14.00 < 14.25 (should fail)
    expect(isTransferSufficient(100_000_000, 140, 15)).toBe(false);
  });

  it('accepts transfer if user sent more SOL than needed', () => {
    expect(isTransferSufficient(200_000_000, 150, 15)).toBe(true);
  });

  it('rejects zero lamports', () => {
    expect(isTransferSufficient(0, 150, 15)).toBe(false);
  });

});

// =============================================================================
// SECTION 11: AI confidence score enforcement
// =============================================================================

describe('AI confidence score server-side enforcement', () => {

  function enforceThreshold(aiResult: { isValid: boolean; confidenceScore: number }) {
    if (aiResult.confidenceScore < 30) aiResult.isValid = false;
    return aiResult;
  }

  it('forces isValid=false when confidenceScore is 0', () => {
    expect(enforceThreshold({ isValid: true, confidenceScore: 0 }).isValid).toBe(false);
  });

  it('forces isValid=false when confidenceScore is 29', () => {
    expect(enforceThreshold({ isValid: true, confidenceScore: 29 }).isValid).toBe(false);
  });

  it('preserves isValid=true at exactly confidenceScore 30', () => {
    expect(enforceThreshold({ isValid: true, confidenceScore: 30 }).isValid).toBe(true);
  });

  it('preserves isValid=true at confidenceScore 95', () => {
    expect(enforceThreshold({ isValid: true, confidenceScore: 95 }).isValid).toBe(true);
  });

  it('preserves isValid=false regardless of score (already false)', () => {
    expect(enforceThreshold({ isValid: false, confidenceScore: 0 }).isValid).toBe(false);
  });

  it('enforces false on edge score=1', () => {
    expect(enforceThreshold({ isValid: true, confidenceScore: 1 }).isValid).toBe(false);
  });

});

// =============================================================================
// SECTION 12: Missed day calculation
// =============================================================================

describe('Missed day calculation (deadline enforcement)', () => {

  function calculateMissedDays(createdAtUnix: number, currentDay: number, durationDays: number, nowUnix: number): number {
    const daysSinceCreation = Math.floor((nowUnix - createdAtUnix) / 86400);
    const expectedDay = Math.min(daysSinceCreation, durationDays);
    return expectedDay - currentDay;
  }

  const now = Math.floor(Date.now() / 1000);

  it('returns 0 when user is fully on track (submitted all expected days)', () => {
    const createdAt = now - (3 * 86400);
    expect(calculateMissedDays(createdAt, 3, 30, now)).toBe(0);
  });

  it('returns 1 when user skipped exactly one day', () => {
    const createdAt = now - (3 * 86400);
    expect(calculateMissedDays(createdAt, 2, 30, now)).toBe(1);
  });

  it('returns 0 when commitment is fully completed (all proofs submitted)', () => {
    const createdAt = now - (35 * 86400);
    expect(calculateMissedDays(createdAt, 30, 30, now)).toBe(0);
  });

  it('caps expectedDay at durationDays even if more time has passed', () => {
    const createdAt = now - (50 * 86400); // 50 days ago
    expect(calculateMissedDays(createdAt, 7, 7, now)).toBe(0); // All submitted, capped at 7
  });

  it('correctly detects 1 missed day at 24h boundary', () => {
    const createdAt = now - 86400; // exactly 1 day ago
    expect(calculateMissedDays(createdAt, 0, 30, now)).toBe(1);
  });

  it('returns multiple missed days for multi-day absence', () => {
    const createdAt = now - (10 * 86400);
    expect(calculateMissedDays(createdAt, 5, 30, now)).toBe(5);
  });

});

// =============================================================================
// SECTION 13: NFT mint queue retry logic
// =============================================================================

describe('NFT mint queue retry status escalation', () => {

  function getNextQueueStatus(currentRetryCount: number): { status: string; newRetryCount: number } {
    const newRetryCount = currentRetryCount + 1;
    const status = newRetryCount >= 5 ? 'failed' : 'pending';
    return { status, newRetryCount };
  }

  it('stays pending on first failure (0 → 1)', () => {
    expect(getNextQueueStatus(0).status).toBe('pending');
    expect(getNextQueueStatus(0).newRetryCount).toBe(1);
  });

  it('stays pending on 4th failure (3 → 4)', () => {
    expect(getNextQueueStatus(3).status).toBe('pending');
  });

  it('becomes failed on 5th failure (4 → 5)', () => {
    const result = getNextQueueStatus(4);
    expect(result.status).toBe('failed');
    expect(result.newRetryCount).toBe(5);
  });

  it('stays failed beyond max retries (5 → 6)', () => {
    expect(getNextQueueStatus(5).status).toBe('failed');
  });

  it('increments retry count correctly on each call', () => {
    expect(getNextQueueStatus(0).newRetryCount).toBe(1);
    expect(getNextQueueStatus(2).newRetryCount).toBe(3);
    expect(getNextQueueStatus(9).newRetryCount).toBe(10);
  });

});

// =============================================================================
// SECTION 14: Image SHA-256 hashing (anti-plagiarism)
// =============================================================================

describe('Image SHA-256 hashing for anti-plagiarism', () => {

  function hashImage(base64Data: string) {
    const hash = createHash('sha256').update(base64Data).digest();
    return {
      proofHash: Array.from(new Uint8Array(hash)),
      imageHashHex: hash.toString('hex'),
    };
  }

  it('proofHash array is exactly 32 bytes (SHA-256 output)', () => {
    expect(hashImage('dGVzdGltYWdlZGF0YQ==').proofHash).toHaveLength(32);
  });

  it('imageHashHex is a 64-character hex string', () => {
    expect(hashImage('dGVzdGltYWdlZGF0YQ==').imageHashHex).toHaveLength(64);
  });

  it('same input always produces same hash (deterministic)', () => {
    const input = 'aW1hZ2VkYXRhMTIz';
    expect(hashImage(input).imageHashHex).toBe(hashImage(input).imageHashHex);
  });

  it('different inputs produce different hashes', () => {
    expect(hashImage('imageA').imageHashHex).not.toBe(hashImage('imageB').imageHashHex);
  });

  it('strips data URL prefix correctly before hashing', () => {
    const raw = 'actualimagebytes';
    const withPrefix = `data:image/png;base64,${raw}`;
    const stripped = withPrefix.split(',')[1] || withPrefix;
    expect(hashImage(stripped).imageHashHex).toBe(hashImage(raw).imageHashHex);
  });

  it('produces valid hex characters only (0-9, a-f)', () => {
    const { imageHashHex } = hashImage('testdata');
    expect(imageHashHex).toMatch(/^[0-9a-f]{64}$/);
  });

});
