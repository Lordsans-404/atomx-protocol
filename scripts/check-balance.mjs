import { Connection, Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const raw = process.env.AUTHORITY_PRIVATE_KEY;
    if(!raw) return console.log("NO KEY");
    const arr = JSON.parse(raw);
    const keypair = Keypair.fromSecretKey(Uint8Array.from(arr));
    
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const bal = await connection.getBalance(keypair.publicKey);
    console.log("Authority Pubkey:", keypair.publicKey.toBase58());
    console.log("SOL Balance:", bal / 1e9);
}
main();
