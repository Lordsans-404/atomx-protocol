import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Connection, PublicKey } from '@solana/web3.js';
import { BorshCoder, EventParser } from '@coral-xyz/anchor';
// Mengambil IDL langsung dari folder program yang kita buat
import idl from '../../../../../../target/idl/atomx_program.json';

const PROGRAM_ID = new PublicKey('5zP6RmfajRyLpRUAM5SCpPSdBin5d1TU9CN7APM6vzQt');
const coder = new BorshCoder(idl as any);
const eventParser = new EventParser(PROGRAM_ID, coder);

// Gunakan RPC Devnet public untuk fetch tx details (atau RPC dari Helius/Quicknode)
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

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
                        // 2. Insert riwayat staking ke commitment_stakes
                        await supabaseAdmin.from('commitment_stakes').insert({
                            commitment_id: commitment.id,
                            user_id: user.id,
                            amount: event.data.stakeAmount.toNumber(), // BN ke Number
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
                        // 2. Insert ke slash_events
                        await supabaseAdmin.from('slash_events').insert({
                            commitment_id: commitment.id,
                            user_id: commitment.user_id,
                            slashed_amount: event.data.slashedAmount.toNumber(),
                            fail_count_at_slash: event.data.failCount,
                            tx_signature: tx.signature,
                            reason: 'Daily target not met / validation failed'
                        });
                        console.log('✅ Berhasil mencatat SlashEvent di DB');

                        // (TODO: Update saldo pool_balances virtual ledger dari charityAmount, rewardsAmount, dll)
                    }
                }
                else if (event.name === 'CommitmentCompleted') {
                    const { data: commitment } = await supabaseAdmin.from('commitments').select('id, user_id').eq('pda_address', event.data.commitment.toString()).single();

                    if (commitment && event.data.rewardAmount.toNumber() > 0) {
                        // Insert reward log
                        await supabaseAdmin.from('rewards').insert({
                            commitment_id: commitment.id,
                            user_id: commitment.user_id,
                            reward_type: 'loyalty_bonus',
                            amount: event.data.rewardAmount.toNumber(),
                            spl_mint_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                            tx_signature: tx.signature,
                            claimed_at: new Date().toISOString()
                        });
                        console.log('✅ Berhasil mencatat Reward Claimed di DB');
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
                        const dayNumber = event.data.dayNumber;

                        console.log(`🚀 [Gamification] Minting cNFT Badge Day ${dayNumber} untuk ${userPubkey}...`);

                        // 2. Mint cNFT menggunakan Crossmint API (Staging/Devnet)
                        try {
                            const collectionId = process.env.CROSSMINT_COLLECTION_ID || 'default';
                            const crossmintRes = await fetch(`https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}/nfts`, {
                                method: 'POST',
                                headers: {
                                    'x-api-key': process.env.CROSSMINT_API_KEY,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    recipient: `solana:${userPubkey}`,
                                    metadata: {
                                        name: `Atomx Daily Validator - Day ${dayNumber}`,
                                        image: "https://arweave.net/NqP8Z6_xK7rL1L03vAovL0L0KkE1_WdY-m9Y0c7I79s", // Gambar dummy medali
                                        description: `Medali apresiasi karena telah konsisten menyelesaikan komitmen pada hari ke-${dayNumber}.`
                                    },
                                    compressed: true // INI YANG BIKIN JADI COMPRESSED NFT (MURAH MERIAH)
                                })
                            });

                            if (crossmintRes.ok) {
                                const mintData = await crossmintRes.json();
                                console.log('✅ [Gamification] cNFT berhasil dicetak! ID:', mintData.id);

                                // 3. Simpan ke database kita agar frontend bisa nampilin dengan cepat
                                await supabaseAdmin.from('nft_index_cache').insert({
                                    mint_address: mintData.id,
                                    owner_pubkey: userPubkey,
                                    name: `Atomx Daily Validator - Day ${dayNumber}`,
                                    image_url: "https://arweave.net/NqP8Z6_xK7rL1L03vAovL0L0KkE1_WdY-m9Y0c7I79s",
                                    nft_type: 'daily_badge',
                                    commitment_id: commitmentInfo.id
                                });
                            } else {
                                console.error('❌ Gagal mint cNFT dari Crossmint:', await crossmintRes.text());
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
