import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { executeBatchSlash, SlashTarget } from '@/lib/executeSlash';
import idl from '@/lib/idl.json';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Minimum missed days threshold before a commitment is eligible for on-chain slash.
// check-deadlines (daily) marks status off-chain after 1 missed day.
// This batch job enforces it on-chain every 3 days as a batch sweep.
const MIN_MISSED_DAYS_FOR_SLASH = 1;

/**
 * GET /api/cron/batch-slash
 *
 * Scheduled every 3 days (see vercel.json).
 * Fetches all active commitments that have missed their daily proof deadline,
 * verifies eligibility against on-chain state, then executes on-chain `slash`
 * instructions in batches of 5 per transaction for gas efficiency.
 *
 * After each batch is confirmed:
 * - Supabase `commitments` record is updated with the real tx signature.
 * - Helius webhook is pinged to process the `SlashExecuted` event.
 *
 * Triggered by:
 * - Vercel Cron (every 3 days)
 * - Manual trigger for testing
 */
export async function GET(request: Request) {
  try {
    // Validate cron secret to prevent unauthorized calls
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = new Connection(RPC_URL, 'confirmed');

    // Fetch active and failed commitments from Supabase.
    // We MUST include 'failed' because the daily off-chain cron aggressively marks
    // them as failed. If we only search 'active', we'll miss the ones that need on-chain slashing.
    const { data: activeCommitments, error: fetchError } = await supabaseAdmin
      .from('commitments')
      .select(
        'id, pda_address, user_id, title, duration_days, stake_amount, failed_count'
      )
      .in('status', ['active', 'failed']);

    if (fetchError) {
      console.error('❌ Supabase fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!activeCommitments || activeCommitments.length === 0) {
      console.log('✅ No active commitments to evaluate for batch slash');
      return NextResponse.json({ evaluated: 0, slashed: 0, batches: 0 });
    }

    console.log(
      `🔍 Evaluating ${activeCommitments.length} active commitments for on-chain slash eligibility...`
    );

    // Fetch on-chain state for all commitments in parallel to minimize RPC round-trips
    const program = new Program(idl as any, { connection } as any);

    const onChainResults = await Promise.allSettled(
      activeCommitments.map(async (commitment) => {
        const onChainData = await (program.account as any).commitmentAccount.fetch(
          new PublicKey(commitment.pda_address)
        );
        return { commitment, onChainData };
      })
    );

    // Build the list of commitments eligible for on-chain slash
    const targets: SlashTarget[] = [];
    const eligibleMeta: Map<
      string,
      { commitmentId: string; userId: string; stakeAmount: number; failedCount: number; durationDays: number; slashPercent: number; expectedNewStatus: string }
    > = new Map();

    for (const result of onChainResults) {
      if (result.status === 'rejected') {
        console.warn('⚠️ Failed to fetch on-chain data for a commitment, skipping:', result.reason);
        continue;
      }

      const { commitment, onChainData } = result.value;

      // Only slash commitments that are Active on-chain
      const isOnChainActive = onChainData.status?.active !== undefined;
      if (!isOnChainActive) continue;

      // slash.rs requires failed_count < 2 — skip if already at max failures
      const onChainFailedCount = onChainData.failedCount as number;
      if (onChainFailedCount >= 2) continue;

      // Calculate how many proof days the user has missed
      const createdAt = onChainData.createdAt.toNumber();
      const nowUnix = Math.floor(Date.now() / 1000);
      const daysSinceCreation = Math.floor((nowUnix - createdAt) / 86400);
      const currentDay = onChainData.currentDay as number;
      const expectedDay = Math.min(daysSinceCreation, onChainData.durationDays as number);
      const missedDays = expectedDay - currentDay;

      if (missedDays < MIN_MISSED_DAYS_FOR_SLASH) continue;

      // Determine slash percentage — mirrors slash.rs logic exactly
      const durationDays = onChainData.durationDays as number;
      let slashPercent: number;
      let expectedNewStatus: string;

      if (durationDays <= 7) {
        slashPercent = 100;
        expectedNewStatus = 'failed';
      } else if (onChainFailedCount === 0) {
        // First failure on a long commitment: 40% slash, commitment stays Active on-chain
        slashPercent = 40;
        expectedNewStatus = 'active';
      } else {
        slashPercent = 100;
        expectedNewStatus = 'failed';
      }

      const reason = `Automated batch slash: missed Day ${expectedDay} (at Day ${currentDay})`;

      // Ensure the UserProfile PDA exists. Legacy commitments created before
      // the UserProfile feature was added will cause the transaction to fail
      // because slash.rs requires a mutable UserProfile account.
      const [userProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_profile'), onChainData.owner.toBuffer()],
        program.programId
      );
      
      try {
        await connection.getAccountInfo(userProfilePda);
        const profileAccount = await connection.getAccountInfo(userProfilePda);
        if (!profileAccount || profileAccount.lamports === 0) {
          console.warn(`⚠️ Skipping "${commitment.title}": UserProfile missing (legacy commitment)`);
          
          // Fallback: Just update Supabase to clean it up since we can't slash it on-chain
          await supabaseAdmin.from('commitments').update({
            status: expectedNewStatus,
            failed_count: onChainFailedCount + 1,
            updated_at: new Date().toISOString()
          }).eq('id', commitment.id);
          
          continue;
        }
      } catch (e) {
        console.warn(`⚠️ Skipping "${commitment.title}": Error fetching UserProfile`);
        continue;
      }

      targets.push({
        commitmentPda: commitment.pda_address,
        commitmentOwner: onChainData.owner.toBase58(),
        reason,
      });

      // Store metadata needed for Supabase update after slash confirmation
      eligibleMeta.set(commitment.pda_address, {
        commitmentId: commitment.id,
        userId: commitment.user_id,
        stakeAmount: commitment.stake_amount || 0,
        failedCount: onChainFailedCount,
        durationDays,
        slashPercent,
        expectedNewStatus,
      });

      console.log(
        `📋 Queued for slash: "${commitment.title}" — missed ${missedDays} day(s), ${slashPercent}% slash`
      );
    }

    if (targets.length === 0) {
      console.log('✅ No commitments are eligible for on-chain slash at this time');
      return NextResponse.json({ evaluated: activeCommitments.length, slashed: 0, batches: 0 });
    }

    console.log(`🔨 Executing batch slash for ${targets.length} commitment(s)...`);

    // Execute all slash instructions in batched transactions
    const batchResults = await executeBatchSlash(targets);

    const totalSlashed = batchResults.reduce((sum, b) => sum + b.slashedPdas.length, 0);
    console.log(
      `✅ Batch slash complete: ${totalSlashed} slashed across ${batchResults.length} transaction(s)`
    );

    // Sync Supabase and trigger webhook for each confirmed batch
    for (const batchResult of batchResults) {
      for (const pda of batchResult.slashedPdas) {
        const meta = eligibleMeta.get(pda);
        if (!meta) continue;

        const slashedAmount = Math.floor(
          meta.stakeAmount * (meta.slashPercent / 100) * 1e6
        );

        // Update commitment record with new status and failure count
        await supabaseAdmin
          .from('commitments')
          .update({
            failed_count: meta.failedCount + 1,
            status: meta.expectedNewStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', meta.commitmentId);

        // Insert slash event record with the real on-chain tx signature
        await supabaseAdmin.from('slash_events').insert({
          commitment_id: meta.commitmentId,
          user_id: meta.userId,
          slashed_amount: slashedAmount,
          fail_count_at_slash: meta.failedCount + 1,
          tx_signature: batchResult.signature,
          reason: targets.find((t) => t.commitmentPda === pda)?.reason ?? 'Batch slash',
        });
      }

      // Ping the Helius webhook handler using an absolute URL derived from the request
      const origin = new URL(request.url).origin;
      fetch(`${origin}/api/webhooks/helius`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: batchResult.signature }),
      }).catch((err) => console.error('Webhook sync error after batch slash:', err));
    }

    return NextResponse.json({
      evaluated: activeCommitments.length,
      eligible: targets.length,
      slashed: totalSlashed,
      batches: batchResults.length,
      transactions: batchResults.map((b) => ({
        signature: b.signature,
        count: b.slashedPdas.length,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Batch slash cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
