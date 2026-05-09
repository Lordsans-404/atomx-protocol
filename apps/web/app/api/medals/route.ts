import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');

    if (!owner) {
      return NextResponse.json({ error: 'Missing owner param' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('nft_index_cache')
      .select('mint_address, name, image_url, nft_type')
      .eq('owner_pubkey', owner)
      .order('last_synced_at', { ascending: false });

    if (error) {
      console.error('Fetch medals error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ medals: data || [] });
  } catch (error: any) {
    console.error('API /medals GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
