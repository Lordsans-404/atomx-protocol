import { Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const raw = process.env.AUTHORITY_PRIVATE_KEY;
if(!raw) {
    console.log("No AUTHORITY_PRIVATE_KEY in .env.local");
    process.exit(1);
}
const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
console.log("Authority Keypair Pubkey:", keypair.publicKey.toBase58());
