import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Connection, PublicKey } from '@solana/web3.js';
import { BorshCoder, EventParser } from '@coral-xyz/anchor';
import { mintCompletionMedal } from '@/lib/mintCompletionMedal';
// Import the compiled IDL to parse on-chain Anchor events
import idl from '@/lib/idl.json';

const PROGRAM_ID = new PublicKey('3nrc4dPYdhztn9d82QmrznATBbYEi9hhvRyx6AnHVGk9');
const coder = new BorshCoder(idl as any);
const eventParser = new EventParser(PROGRAM_ID, coder);

// Use Helius RPC for stable tx detail fetching without rate limits
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        // --- PLUG & PLAY SYSTEM ---
        // Mode 1 (Production): Helius Webhook mengirimkan format Array `[{ signature: "..." }, ...]`
        // Mode 2 (Alternatif/Darurat): Frontend mengirimkan format Object `{ signature: "..." }`

        let transactionsToProcess: any[] = [];

        if (Array.isArray(payload)) {
            // Helius Mode
            transactionsToProcess = payload;
        } else if (payload && payload.signature) {
            // Frontend Client-Sync Mode
            transactionsToProcess = [payload];
        } else {
            return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 });
        }

        for (const tx of transactionsToProcess) {
            console.log('🔔 [Sync] Memproses Tx:', tx.signature);

            // Helius Enriched TX tidak selalu punya logMessages lengkap.
            // Solusi paling stabil: Fetch raw transaction dari RPC berdasarkan signature
            const txDetails = await connection.getTransaction(tx.signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0, // Support untuk v0 transactions
            });

            if (!txDetails || !txDetails.meta || !txDetails.meta.logMessages) {
                console.log('⚠️ Tidak ada logMessages ditemukan untuk tx:', tx.signature);
                continue;
            }

            // Parse logMessages untuk mencari Anchor Event menggunakan IDL
            const events = eventParser.parseLogs(txDetails.meta.logMessages);

            for (let event of events) {
                console.log(`\n✨ Event Terdeteksi: ${event.name}`);
                console.log('Data:', event.data);

                // --- MAPPING EVENT KE DATABASE SUPABASE --- //

                if (event.name === 'CommitmentCreated') {
                    // 1. Cari internal user_id dan commitment_id dari database berdasarkan Pubkey
                    const { data: user } = await supabaseAdmin.from('users').select('id').eq('solana_pubkey', event.data.owner.toString()).single();
                    const { data: commitment } = await supabaseAdmin.from('commitments').select('id').eq('pda_address', event.data.pda.toString()).single();

                    if (user && commitment) {
                        const rawAmount = event.data.stakeAmount || event.data.stake_amount;
                        const amount = rawAmount?.toNumber ? rawAmount.toNumber() : Number(rawAmount);

                        // 2. Insert riwayat staking ke commitment_stakes
                        await supabaseAdmin.from('commitment_stakes').insert({
                            commitment_id: commitment.id,
                            user_id: user.id,
                            amount: amount, // BN ke Number
                            spl_mint_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
                            tx_signature: tx.signature,
                            type: 'initial'
                        });
                        console.log('✅ Berhasil mencatat CommitmentStake di DB');
                    }
                }
                else if (event.name === 'SlashExecuted') {
                    // 1. Ambil commitment info
                    const { data: commitment } = await supabaseAdmin.from('commitments').select('id, user_id').eq('pda_address', event.data.commitment.toString()).single();

                    if (commitment) {
                        const rawSlashed = event.data.slashedAmount || event.data.slashed_amount;
                        const slashedAmt = rawSlashed?.toNumber ? rawSlashed.toNumber() : Number(rawSlashed);
                        const failCount = event.data.failCount !== undefined ? event.data.failCount : event.data.fail_count;

                        // 2. Insert ke slash_events
                        await supabaseAdmin.from('slash_events').insert({
                            commitment_id: commitment.id,
                            user_id: commitment.user_id,
                            slashed_amount: slashedAmt,
                            fail_count_at_slash: failCount,
                            tx_signature: tx.signature,
                            reason: 'Daily target not met / validation failed'
                        });
                        console.log('✅ Berhasil mencatat SlashEvent di DB');

                        // (TODO: Update saldo pool_balances virtual ledger dari charityAmount, rewardsAmount, dll)
                    }
                }
                else if (event.name === 'CommitmentCompleted') {
                    // Fetch full commitment details including user pubkey for minting
                    const { data: commitment } = await supabaseAdmin
                        .from('commitments')
                        .select('id, user_id, title, category, duration_days, users(solana_pubkey)')
                        .eq('pda_address', event.data.commitment.toString())
                        .single();

                    const rawReward = event.data.rewardAmount || event.data.reward_amount;
                    const rewardAmt = rawReward?.toNumber ? rawReward.toNumber() : Number(rawReward);
                    const earlyFinishCount = event.data.earlyFinishCount ?? event.data.early_finish_count ?? 0;

                    if (commitment) {
                        // Mark commitment as completed in Supabase
                        await supabaseAdmin.from('commitments').update({ status: 'completed' }).eq('id', commitment.id);
                        console.log('✅ Commitment status updated to completed in DB');

                        if (rewardAmt > 0) {
                            // Record the loyalty bonus reward for financial transparency
                            await supabaseAdmin.from('rewards').insert({
                                commitment_id: commitment.id,
                                user_id: commitment.user_id,
                                reward_type: 'loyalty_bonus',
                                amount: rewardAmt,
                                spl_mint_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                                tx_signature: tx.signature,
                                claimed_at: new Date().toISOString(),
                            });
                            console.log('✅ Reward claim recorded in DB');
                        }

                        // Mint a unique Champion Medal cNFT for completing the full commitment
                        const userPubkey = (commitment.users as any)?.solana_pubkey;
                        if (userPubkey && process.env.CROSSMINT_API_KEY) {
                            await mintCompletionMedal({
                                userPubkey,
                                commitmentId: commitment.id,
                                title: commitment.title ?? 'My Commitment',
                                category: commitment.category ?? 'other',
                                durationDays: commitment.duration_days ?? 0,
                                earlyFinishCount,
                                txSignature: tx.signature,
                            });
                        }
                    }
                }
                else if (event.name === 'ProofSubmitted') {
                    // 1. Ambil relasi dari database untuk mendapatkan solana_pubkey milik user
                    // Karena di event ini yang ada hanya pubkey komitmen-nya
                    const { data: commitmentInfo } = await supabaseAdmin.from('commitments')
                        .select('id, users(solana_pubkey, id)')
                        .eq('pda_address', event.data.commitment.toString())
                        .single();

                    if (commitmentInfo && commitmentInfo.users && process.env.CROSSMINT_API_KEY) {
                        const userPubkey = (commitmentInfo.users as any).solana_pubkey;
                        const userId = (commitmentInfo.users as any).id;
                        const dayNumber = event.data.dayNumber !== undefined ? event.data.dayNumber : event.data.day_number;

                        // Simpan image_hash ke Supabase untuk mencegah user pakai foto yang sama
                        const proofHashArray = event.data.proofHash || event.data.proof_hash;
                        if (proofHashArray) {
                            const imageHashHex = Buffer.from(proofHashArray).toString('hex');
                            await supabaseAdmin.from('proof_hashes').insert({
                                user_id: userId,
                                commitment_id: commitmentInfo.id,
                                image_hash: imageHashHex
                            });
                            console.log('✅ Berhasil mencatat anti-plagiat image_hash di DB');
                        }

                        console.log(`🚀 [Gamification] Minting daily badge cNFT for Day ${dayNumber} — wallet: ${userPubkey}`);

                        // Use placehold.co for fast, dependency-free badge images
                        const badgeImageUrl = `https://placehold.co/600x600/6366f1/ffffff/png?text=Day+${dayNumber}`;


                        // 2. Mint cNFT menggunakan Crossmint API (Staging/Devnet)
                        try {
                            const collectionId = process.env.CROSSMINT_COLLECTION_ID || 'default';
                            const crossmintRes = await fetch(
                                `https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}/nfts`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'x-api-key': process.env.CROSSMINT_API_KEY,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        recipient: `solana:${userPubkey}`,
                                        metadata: {
                                            name: `Atomx Daily Validator - Day ${dayNumber}`,
                                            image: badgeImageUrl,
                                            description: `Daily discipline badge awarded for completing Day ${dayNumber} of this commitment on Atomx Protocol.`,
                                        },
                                        compressed: true
                                    })
                                }
                            );

                            if (crossmintRes.ok) {
                                const mintData = await crossmintRes.json();
                                console.log('✅ [Gamification] Daily badge cNFT minted. ID:', mintData.id);

                                // Cache the new badge so the dashboard renders it instantly
                                await supabaseAdmin.from('nft_index_cache').insert({
                                    mint_address: mintData.id,
                                    owner_pubkey: userPubkey,
                                    name: `Atomx Daily Validator - Day ${dayNumber}`,
                                    image_url: badgeImageUrl,
                                    nft_type: 'daily_badge',
                                    commitment_id: commitmentInfo.id,
                                });
                            } else {
                                console.error('❌ [Gamification] Crossmint mint failed:', await crossmintRes.text());
                            }
                        } catch (err) {
                            console.error('❌ Error memanggil Crossmint:', err);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('❌ [Helius Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
