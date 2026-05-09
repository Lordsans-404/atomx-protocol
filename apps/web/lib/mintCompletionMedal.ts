import { supabaseAdmin } from '@/lib/supabaseAdmin';



/** Color palette mapped by habit category for fallback or reference. */
const CATEGORY_COLORS: Record<string, string> = {
  reading: '4f46e5',
  exercise: '16a34a',
  coding: 'ea580c',
  meditation: '7c3aed',
  writing: '0891b2',
  diet: 'be185d',
  sleep: '1d4ed8',
  default: '0f172a',
};

export interface CompletionMedalParams {
  userPubkey: string;
  commitmentId: string;
  title: string;
  category: string;
  durationDays: number;
  earlyFinishCount: number;
  txSignature: string;
}

function getMedalTier(earlyFinishCount: number) {
  if (earlyFinishCount === 0) return { name: 'Gold' };
  if (earlyFinishCount <= 2) return { name: 'Silver' };
  return { name: 'Bronze' };
}

/**
 * Builds the Crossmint-compatible metadata for a Champion Medal cNFT.
 * Uses placehold.co for the image, styled according to the medal tier.
 */
export function buildMedalMetadata(params: CompletionMedalParams) {
  const { title, category, durationDays, earlyFinishCount } = params;
  const tier = getMedalTier(earlyFinishCount);

  // Use tier color for the background to make it instantly recognizable
  const imageUrl = `https://image-place.vercel.app/medal/${tier.name.toLowerCase()}?text=${encodeURIComponent(title)}+%7C+${durationDays}+Days&color=ffd700&bg=1a1a2e00&w=400&h=400&fontsize=48`;
  // Lanjutin yaa ini belum kelarrr


  const fullName = `Atomx ${tier.name} — ${title}`;

  // Crossmint API requires the name to be <= 32 bytes UTF-8 encoded
  let truncatedName = '';
  let bytesCount = 0;
  const encoder = new TextEncoder();
  for (const char of fullName) {
    const charBytes = encoder.encode(char).length;
    if (bytesCount + charBytes > 32) break;
    truncatedName += char;
    bytesCount += charBytes;
  }
  truncatedName = truncatedName.trim();

  return {
    name: truncatedName,
    symbol: 'ATOMX-CHAMP',
    description: `Awarded to a warrior who completed a ${durationDays}-day commitment on Atomx Protocol. A ${tier.name} medal achieved with ${earlyFinishCount} early finishes.`,
    image: imageUrl,
    attributes: [
      { trait_type: 'Type', value: 'Champion Medal' },
      { trait_type: 'Tier', value: tier.name },
      { trait_type: 'Duration', value: `${durationDays} Days` },
      { trait_type: 'Habit Category', value: category },
      { trait_type: 'Early Finishes', value: String(earlyFinishCount) },
    ],
  };
}

/**
 * Records a failed mint attempt into `nft_mint_queue` so the retry
 * system (cron/webhook) can pick it up later.
 */
async function enqueueFailedMint(params: CompletionMedalParams): Promise<void> {
  const { error } = await supabaseAdmin.from('nft_mint_queue').insert({
    commitment_id: params.commitmentId,
    owner_pubkey: params.userPubkey,
    nft_type: 'completion_medal',
    title: params.title,
    category: params.category,
    duration_days: params.durationDays,
    early_finish_count: params.earlyFinishCount,
    tx_signature: params.txSignature,
    status: 'pending',
    retry_count: 0,
  });

  if (error) {
    console.error('[mintCompletionMedal] Failed to enqueue retry record:', error.message);
  } else {
    console.warn('[mintCompletionMedal] Mint failed — queued for retry in nft_mint_queue');
  }
}

/**
 * Mints a unique Champion cNFT via Crossmint and caches the result in Supabase.
 * If minting fails, it records the attempt in `nft_mint_queue` for automatic retry.
 */
export async function mintCompletionMedal(params: CompletionMedalParams): Promise<void> {
  const collectionId = process.env.CROSSMINT_COLLECTION_ID;
  const apiKey = process.env.CROSSMINT_API_KEY;

  if (!collectionId || !apiKey) {
    console.error('[mintCompletionMedal] Missing CROSSMINT_COLLECTION_ID or CROSSMINT_API_KEY env vars');
    await enqueueFailedMint(params);
    return;
  }

  const metadata = buildMedalMetadata(params);

  let mintData: { id: string } | null = null;

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
          recipient: `solana:${params.userPubkey}`,
          metadata,
          compressed: true,
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error('[mintCompletionMedal] Crossmint API error:', body);
      await enqueueFailedMint(params);
      return;
    }

    mintData = await res.json();
  } catch (err) {
    console.error('[mintCompletionMedal] Network error calling Crossmint:', err);
    await enqueueFailedMint(params);
    return;
  }

  if (!mintData?.id) {
    console.error('[mintCompletionMedal] Unexpected response — no mint ID returned');
    await enqueueFailedMint(params);
    return;
  }

  // Cache the new Champion Medal in Supabase for instant dashboard rendering
  const { error: cacheError } = await supabaseAdmin.from('nft_index_cache').insert({
    mint_address: mintData.id,
    owner_pubkey: params.userPubkey,
    name: metadata.name,
    image_url: metadata.image,
    nft_type: 'completion_medal',
    commitment_id: params.commitmentId,
  });

  if (cacheError) {
    console.error('[mintCompletionMedal] Failed to cache medal in nft_index_cache:', cacheError.message);
  } else {
    console.log('[mintCompletionMedal] Champion medal minted and cached. ID:', mintData.id);
  }
}
