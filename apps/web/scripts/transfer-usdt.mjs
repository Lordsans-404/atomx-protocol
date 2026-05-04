/**
 * Transfer Mock USDT ke wallet browser
 * 
 * Jalankan: cd apps/web && bun scripts/transfer-usdt.mjs
 */

const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const {
  getOrCreateAssociatedTokenAccount,
  transfer,
  getAssociatedTokenAddress,
} = require("@solana/spl-token");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

for (const envPath of [
  path.resolve(__dirname, ".env.local"),
  path.resolve(__dirname, "..", ".env.local"),
  path.resolve(__dirname, "..", "..", "..", ".env.local"),
]) {
  dotenv.config({ path: envPath, override: false });
}

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  const mintRaw = process.env.MOCK_USDT_MINT;
  const recipientRaw = process.env.TRANSFER_RECIPIENT;
  const amountRaw = process.env.TRANSFER_AMOUNT || "1000";

  if (!rpcUrl) {
    console.error('❌ NEXT_PUBLIC_SOLANA_RPC_URL belum di-set di .env.local');
    process.exit(1);
  }

  if (!mintRaw) {
    console.error('❌ MOCK_USDT_MINT belum di-set di .env.local');
    process.exit(1);
  }

  if (!recipientRaw) {
    console.error('❌ TRANSFER_RECIPIENT belum di-set di .env.local');
    process.exit(1);
  }

  const MOCK_USDT_MINT = new PublicKey(mintRaw);
  const RECIPIENT = new PublicKey(recipientRaw);
  const AMOUNT = Number(amountRaw);

  if (!Number.isFinite(AMOUNT) || AMOUNT <= 0) {
    console.error('❌ TRANSFER_AMOUNT harus berupa angka positif');
    process.exit(1);
  }

  // Load CLI wallet
  const keypairPath = path.join(require("os").homedir(), ".config", "solana", "id.json");
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  
  const connection = new Connection(rpcUrl, "confirmed");
  console.log("🔑 Sender:", payer.publicKey.toBase58());
  console.log("📬 Recipient:", RECIPIENT.toBase58());
  console.log("💵 Amount:", AMOUNT, "USDT\n");

  // Get or create sender's token account
  const senderAta = await getOrCreateAssociatedTokenAccount(
    connection, payer, MOCK_USDT_MINT, payer.publicKey
  );
  console.log("✅ Sender Token Account:", senderAta.address.toBase58());
  console.log("   Balance:", Number(senderAta.amount) / 1e6, "USDT");

  // Get or create recipient's token account (payer pays for creation)
  console.log("\n📂 Membuat Token Account untuk recipient...");
  const recipientAta = await getOrCreateAssociatedTokenAccount(
    connection, payer, MOCK_USDT_MINT, RECIPIENT
  );
  console.log("✅ Recipient Token Account:", recipientAta.address.toBase58());

  // Transfer
  console.log(`\n🚀 Mengirim ${AMOUNT} Mock USDT...`);
  const tx = await transfer(
    connection,
    payer,
    senderAta.address,
    recipientAta.address,
    payer,
    AMOUNT * 1e6 // 6 decimals
  );

  console.log("✅ Transfer berhasil!");
  console.log("   Tx:", tx);
  console.log(`\n🎉 ${RECIPIENT.toBase58()} sekarang punya ${AMOUNT} Mock USDT!`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message || err);
});
