import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const match = envContent.match(/AUTHORITY_PRIVATE_KEY='(\[.*?\])'/);

if (match) {
  const privateKey = JSON.parse(match[1]);
  const keypair = Keypair.fromSecretKey(new Uint8Array(privateKey));
  const pubkey = keypair.publicKey.toBase58();
  
  if (!envContent.includes('NEXT_PUBLIC_AUTHORITY_PUBKEY')) {
    fs.appendFileSync('.env.local', `\nNEXT_PUBLIC_AUTHORITY_PUBKEY="${pubkey}"\n`);
    console.log(`✅ Berhasil menambahkan NEXT_PUBLIC_AUTHORITY_PUBKEY="${pubkey}" ke .env.local`);
  } else {
    console.log(`ℹ️ NEXT_PUBLIC_AUTHORITY_PUBKEY sudah ada di .env.local`);
  }
} else {
  console.log('AUTHORITY_PRIVATE_KEY tidak ditemukan!');
}
