const dotenv = require("dotenv");
const path = require("path");

function loadPackage(packageName) {
  try {
    return require(packageName);
  } catch {
    return require(path.resolve(__dirname, "..", "apps", "web", "node_modules", packageName));
  }
}

const { Connection, PublicKey } = loadPackage("@solana/web3.js");

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
  const connection = new Connection(rpcUrl, "confirmed");

  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    PROGRAM_ID
  );

  console.log("GlobalState PDA:", globalStatePda.toBase58());

  const accountInfo = await connection.getAccountInfo(globalStatePda);
  if (!accountInfo) {
    console.log("⚠️ GlobalState NOT FOUND - init_global belum dijalankan di devnet.");
  } else {
    console.log("✅ GlobalState found, size:", accountInfo.data.length, "bytes");
    const usdcMintBytes = accountInfo.data.slice(72, 104);
    const usdcMint = new PublicKey(usdcMintBytes);
    console.log("USDC_MINT:", usdcMint.toBase58());
  }
}

main().catch(console.error);
