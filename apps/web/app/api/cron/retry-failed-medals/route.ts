import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { buildMedalMetadata } from '@/lib/mintCompletionMedal';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Fetch pending mints from queue
  const { data: queueItems, error: fetchError } = await supabaseAdmin
    .from('nft_mint_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10); // Batch size 10 to avoid timeouts

  if (fetchError) {
    console.error('[cron/retry-failed-medals] Error fetching queue:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }

  if (!queueItems || queueItems.length === 0) {
    return NextResponse.json({ message: 'No pending mints in queue' });
  }

  const collectionId = process.env.CROSSMINT_COLLECTION_ID;
  const apiKey = process.env.CROSSMINT_API_KEY;

  if (!collectionId || !apiKey) {
    console.error('[cron/retry-failed-medals] Missing Crossmint credentials');
    return NextResponse.json({ error: 'Missing Crossmint credentials' }, { status: 500 });
  }

  let processedCount = 0;
  let successCount = 0;
  let failCount = 0;

  for (const item of queueItems) {
    processedCount++;
    
    // Reconstruct metadata using the shared helper
    const metadata = buildMedalMetadata({
      userPubkey: item.owner_pubkey,
      commitmentId: item.commitment_id,
      title: item.title,
      category: item.category,
      durationDays: item.duration_days,
      earlyFinishCount: item.early_finish_count,
      txSignature: item.tx_signature,
    });

    try {
      const res = await fetch(
        `https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}/nfts`,
        {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: `solana:${item.owner_pubkey}`,
            metadata,
            compressed: true,
          }),
        }
      );

      if (!res.ok) {
        const bodyText = await res.text();
        console.error(`[cron/retry-failed-medals] Crossmint API error for queue ${item.id}:`, bodyText);
        await updateFailedQueueItem(item);
        failCount++;
        continue;
      }

      const mintData = await res.json();
      
      if (!mintData?.id) {
        console.error(`[cron/retry-failed-medals] Unexpected response for queue ${item.id} — no mint ID`);
        await updateFailedQueueItem(item);
        failCount++;
        continue;
      }

      // Cache the new Champion Medal in Supabase
      const { error: cacheError } = await supabaseAdmin.from('nft_index_cache').insert({
        mint_address: mintData.id,
        owner_pubkey: item.owner_pubkey,
        name: metadata.name,
        image_url: metadata.image,
        nft_type: item.nft_type, // Typically 'completion_medal'
        commitment_id: item.commitment_id,
      });

      if (cacheError) {
        console.error(`[cron/retry-failed-medals] Failed to cache medal in nft_index_cache for queue ${item.id}:`, cacheError.message);
      }

      // Mark queue as minted
      await supabaseAdmin.from('nft_mint_queue').update({
        status: 'minted',
        last_attempted_at: new Date().toISOString(),
      }).eq('id', item.id);

      successCount++;

    } catch (err) {
      console.error(`[cron/retry-failed-medals] Network error calling Crossmint for queue ${item.id}:`, err);
      await updateFailedQueueItem(item);
      failCount++;
    }
  }

  return NextResponse.json({ processedCount, successCount, failCount });
}

/**
 * Helper to update retry_count and status if it exceeds max retries.
 */
async function updateFailedQueueItem(item: any) {
  const newRetryCount = (item.retry_count || 0) + 1;
  const status = newRetryCount >= 5 ? 'failed' : 'pending'; // Max 5 retries
  
  await supabaseAdmin.from('nft_mint_queue').update({
    status,
    retry_count: newRetryCount,
    last_attempted_at: new Date().toISOString()
  }).eq('id', item.id);
}
