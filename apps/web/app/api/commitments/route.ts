import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/commitments
 * Simpan metadata commitment (title, dll) yang tidak ada on-chain ke Supabase.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pda, owner, title, category, description, txSignature, durationDays, dailyTargetMinutes, stakeAmount } = body;

    if (!pda || !owner || !title) {
      return NextResponse.json({ error: 'Missing required fields: pda, owner, title' }, { status: 400 });
    }

    if (durationDays < 7) {
      return NextResponse.json({ error: 'Commitment must be at least 7 days' }, { status: 400 });
    }

    if (dailyTargetMinutes < 10) {
      return NextResponse.json({ error: 'Daily target must be at least 10 minutes' }, { status: 400 });
    }

    // 1. Upsert user berdasarkan solana_pubkey
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .upsert(
        { solana_pubkey: owner },
        { onConflict: 'solana_pubkey' }
      )
      .select('id')
      .single();

    if (userError) {
      console.error('User upsert error:', userError);
      return NextResponse.json({ error: 'Failed to upsert user: ' + userError.message }, { status: 500 });
    }

    // 2. Upsert commitment — semua kolom NOT NULL harus diisi
    const { error: commitError } = await supabaseAdmin
      .from('commitments')
      .upsert({
        user_id: user.id,
        pda_address: pda,
        title: title,
        category: category,
        description: description,
        duration_days: durationDays || 7,
        daily_target_minutes: dailyTargetMinutes || 30,
        stake_amount: stakeAmount || 0,
        spl_mint_address: 'uFUq4dXUWfFVKzw6HzaUtqSb4Vs52QuYPmhasGT9Ruk', // Mock USDT Devnet
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + (durationDays || 7) * 86400000).toISOString().split('T')[0],
      }, { onConflict: 'pda_address' });

    if (commitError) {
      console.error('Commitment upsert error:', commitError);
      return NextResponse.json({ error: commitError.message }, { status: 500 });
    }

    console.log(`✅ Commitment "${title}" saved for user ${owner.substring(0, 8)}...`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API /commitments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/commitments?owner=<solana_pubkey>
 * Fetch commitment metadata dari Supabase untuk merge dengan data on-chain.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');

    if (!owner) {
      return NextResponse.json({ error: 'Missing owner param' }, { status: 400 });
    }

    // Cari user dulu, lalu fetch commitments-nya
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('solana_pubkey', owner)
      .single();

    if (!user) {
      return NextResponse.json({});
    }

    const { data, error } = await supabaseAdmin
      .from('commitments')
      .select('pda_address, title, category, description')
      .eq('user_id', user.id);

    if (error) {
      console.error('Fetch commitments error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return sebagai map: { pdaAddress: { title, category, description } }
    const metadataMap: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      metadataMap[row.pda_address] = {
        title: row.title,
        category: row.category,
        description: row.description
      };
    });

    return NextResponse.json(metadataMap);
  } catch (error: any) {
    console.error('API /commitments GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
