/**
 * Script Setup Devnet: Membuat Mock USDT + Init Global State
 * 
 * Jalankan dengan:
 *   cd apps/web && node ../../scripts/setup-devnet.mjs
 */

const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

function loadPackage(packageName) {
  try {
    return require(packageName);
  } catch {
    return require(path.resolve(__dirname, "..", "apps", "web", "node_modules", packageName));
  }
}

const anchor = loadPackage("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair } = loadPackage("@solana/web3.js");
const {
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddress,
} = loadPackage("@solana/spl-token");

for (const envPath of [path.resolve(".env.local"), path.resolve("apps/web/.env.local")]) {
  dotenv.config({ path: envPath, override: false });
}

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  const programIdRaw = process.env.PROGRAM_ID;

  if (!rpcUrl) {
    console.error("❌ NEXT_PUBLIC_SOLANA_RPC_URL belum di-set di .env.local");
    process.exit(1);
  }

  if (!programIdRaw) {
    console.error("❌ PROGRAM_ID belum di-set di .env.local");
    process.exit(1);
  }

  const PROGRAM_ID = new PublicKey(programIdRaw);

  // 1. Load wallet keypair dari file default Solana CLI
  const keypairPath = path.join(require("os").homedir(), ".config", "solana", "id.json");
  if (!fs.existsSync(keypairPath)) {
    console.error("❌ Keypair tidak ditemukan di", keypairPath);
    console.error("   Jalankan: solana-keygen new");
    return;
  }
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log("🔑 Wallet:", payer.publicKey.toBase58());

  // 2. Setup Connection
  const connection = new Connection(rpcUrl, "confirmed");
  const balance = await connection.getBalance(payer.publicKey);
  console.log("💰 SOL Balance:", balance / 1e9, "SOL");

  if (balance < 0.1 * 1e9) {
    console.error("⚠️  SOL tidak cukup! Ambil faucet dulu:");
    console.error("   solana airdrop 2 --url devnet");
    return;
  }

  // 3. Cek apakah init_global sudah pernah dijalankan
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    PROGRAM_ID
  );
  const existing = await connection.getAccountInfo(globalStatePda);
  if (existing) {
    console.log("✅ GlobalState sudah ada! init_global sudah pernah dijalankan.");
    const usdcMint = new PublicKey(existing.data.slice(72, 104));
    console.log("   Mock USDT Mint:", usdcMint.toBase58());
    console.log("   Tidak perlu setup ulang. Gunakan mint address di atas.");
    return;
  }

  console.log("\n📦 GlobalState belum ada. Mulai setup...\n");

  // 4. Buat Mock USDT Token (6 decimals, sama seperti USDT asli)
  console.log("🪙  Membuat Mock USDT Token...");
  const mockUsdtMint = await createMint(
    connection,
    payer,          // payer
    payer.publicKey, // mint authority
    null,            // freeze authority
    6                // decimals (USDT = 6)
  );
  console.log("✅ Mock USDT Mint:", mockUsdtMint.toBase58());

  // 5. Buat Associated Token Account untuk wallet user
  console.log("📂 Membuat Token Account untuk wallet...");
  const userTokenAccount = await createAssociatedTokenAccount(
    connection,
    payer,
    mockUsdtMint,
    payer.publicKey
  );
  console.log("✅ Token Account:", userTokenAccount.toBase58());

  // 6. Mint 10,000 Mock USDT ke wallet
  console.log("💵 Minting 10,000 Mock USDT...");
  await mintTo(
    connection,
    payer,
    mockUsdtMint,
    userTokenAccount,
    payer,
    10_000 * 1e6 // 10,000 USDT (6 decimals)
  );
  console.log("✅ 10,000 Mock USDT berhasil di-mint!");

  // 7. Panggil init_global di program Anchor
  console.log("\n🚀 Menjalankan init_global...");

  // Load IDL
  const idlPath = path.join(__dirname, "..", "target", "idl", "atomx_program.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  // Setup Anchor provider
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  const program = new anchor.Program(idl, provider);

  const [globalVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_vault")],
    PROGRAM_ID
  );

  const tx = await program.methods
    .initGlobal()
    .accountsPartial({
      authority: payer.publicKey,
      globalState: globalStatePda,
      globalVault: globalVaultPda,
      usdcMint: mockUsdtMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ init_global berhasil! Tx:", tx);

  // 8. Ringkasan
  console.log("\n" + "=".repeat(60));
  console.log("🎉 SETUP DEVNET SELESAI!");
  console.log("=".repeat(60));
  console.log("Mock USDT Mint  :", mockUsdtMint.toBase58());
  console.log("Token Account   :", userTokenAccount.toBase58());
  console.log("GlobalState PDA :", globalStatePda.toBase58());
  console.log("GlobalVault PDA :", globalVaultPda.toBase58());
  console.log("Tx Signature    :", tx);
  console.log("=".repeat(60));
  console.log("\n⚡ PENTING: Copy alamat Mock USDT Mint di atas!");
  console.log("   Tempel ke CreateCommitmentModal.tsx sebagai USDC_MINT\n");
}

main().catch((err) => {
  console.error("❌ Error:", err.message || err);
  if (err.logs) {
    console.error("Logs:", err.logs);
  }
});
