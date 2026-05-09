import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import idl from '@/lib/idl.json';

const PROGRAM_ID = new PublicKey('3nrc4dPYdhztn9d82QmrznATBbYEi9hhvRyx6AnHVGk9');
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

/**
 * GET /api/cron/check-deadlines
 * 
 * Sistem pengecekan otomatis harian:
 * 1. Ambil semua commitment aktif dari Supabase
 * 2. Cek apakah hari ini sudah melewati deadline proof
 * 3. Jika user melewati 1 hari tanpa proof → tandai sebagai "missed"
 * 4. Update status di Supabase untuk ditampilkan di dashboard
 * 
 * Dipanggil oleh:
 * - Supabase pg_cron (production)
 * - Manual trigger (development)
 * - Vercel Cron (opsional)
 */
export async function GET(request: Request) {
  try {
    // Auth check: pakai secret header untuk prevent unauthorized calls
    const auth = request.headers.get('authorization');

    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = new Connection(RPC_URL, 'confirmed');

    // 1. Ambil semua commitment aktif dari Supabase
    const { data: activeCommitments, error: fetchError } = await supabaseAdmin
      .from('commitments')
      .select('id, pda_address, user_id, title, duration_days, daily_target_minutes, stake_amount, created_at, failed_count, status')
      .eq('status', 'active');

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!activeCommitments || activeCommitments.length === 0) {
      console.log('✅ No active commitments to check');
      return NextResponse.json({ checked: 0, missed: 0, slashed: 0 });
    }

    console.log(`🔍 Checking ${activeCommitments.length} active commitments...`);

    let missedCount = 0;
    let slashedCount = 0;
    const results: any[] = [];

    for (const commitment of activeCommitments) {
      try {
        // 2. Fetch on-chain data untuk akurasi
        const program = new Program(idl as any, {
          connection,
        } as any);

        let onChainData: any;
        try {
          onChainData = await (program.account as any).commitmentAccount.fetch(
            new PublicKey(commitment.pda_address)
          );
        } catch {
          console.log(`⚠️ Cannot fetch on-chain data for ${commitment.pda_address}, skipping`);
          continue;
        }

        // 3. Hitung hari ke berapa seharusnya
        const createdAt = onChainData.createdAt.toNumber();
        const nowUnix = Math.floor(Date.now() / 1000);
        const daysSinceCreation = Math.floor((nowUnix - createdAt) / 86400);
        const currentDay = onChainData.currentDay; // proof count terakhir
        const expectedDay = Math.min(daysSinceCreation, onChainData.durationDays);

        // 4. Cek apakah ada hari yang terlewat
        const missedDays = expectedDay - currentDay;

        if (missedDays <= 0) {
          // User on track
          results.push({
            pda: commitment.pda_address,
            title: commitment.title,
            status: 'on_track',
            currentDay,
            expectedDay,
          });
          continue;
        }

        // 5. User missed deadline!
        missedCount++;
        console.log(`⚠️ "${commitment.title}" missed ${missedDays} day(s)! (current: Day ${currentDay}, expected: Day ${expectedDay})`);

        const failedCount = onChainData.failedCount || 0;
        const durationDays = onChainData.durationDays;

        // 6. Tentukan aksi berdasarkan rules smart contract:
        //    - Durasi ≤ 7 hari: langsung fail (seluruh stake di-slash)
        //    - Gagal 1x: slash 40%, masih aktif
        //    - Gagal 2x: slash semua sisa, status → failed
        let action: string;
        let newStatus: string;
        let slashPercent: number;

        if (durationDays <= 7) {
          // Short commitment: langsung failed
          action = 'full_slash';
          newStatus = 'failed';
          slashPercent = 100;
        } else if (failedCount === 0) {
          // First failure: 40% slash, tapi kita bikin inactive (failed) sesuai request
          action = 'partial_slash_and_terminate';
          newStatus = 'failed';
          slashPercent = 40;
        } else {
          // Second failure: full slash, failed
          action = 'full_slash';
          newStatus = 'failed';
          slashPercent = 100;
        }

        // 7. Update Supabase (off-chain record)
        //    Catat missed day dan tentukan status
        const { error: updateError } = await supabaseAdmin
          .from('commitments')
          .update({
            failed_count: failedCount + 1,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', commitment.id);

        if (updateError) {
          console.error(`❌ Update error for ${commitment.title}:`, updateError);
        }

        // 8. Log ke slash_events di Supabase
        await supabaseAdmin.from('slash_events').insert({
          commitment_id: commitment.id,
          user_id: commitment.user_id,
          slashed_amount: (commitment.stake_amount || 0) * (slashPercent / 100),
          fail_count_at_slash: failedCount + 1,
          tx_signature: `cron_${Date.now()}_${commitment.pda_address.substring(0, 8)}`,
          reason: `Automated: Missed daily proof (Day ${expectedDay}). Action: ${action}`,
        });

        slashedCount++;
        results.push({
          pda: commitment.pda_address,
          title: commitment.title,
          status: 'missed',
          action,
          newStatus,
          slashPercent,
          currentDay,
          expectedDay,
          missedDays,
          failedCount: failedCount + 1,
        });

        console.log(`🔨 "${commitment.title}" → ${action} (${slashPercent}% slash, status: ${newStatus})`);

      } catch (err: any) {
        console.error(`❌ Error processing ${commitment.pda_address}:`, err.message);
        results.push({ pda: commitment.pda_address, error: err.message });
      }
    }

    console.log(`\n📊 Cron Summary: ${activeCommitments.length} checked, ${missedCount} missed, ${slashedCount} slashed`);

    return NextResponse.json({
      checked: activeCommitments.length,
      missed: missedCount,
      slashed: slashedCount,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error('❌ Cron check-deadlines error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
