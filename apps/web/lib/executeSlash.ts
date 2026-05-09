import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { ComputeBudgetProgram } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/esm/nodewallet';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from '@/lib/idl.json';

// --- Constants ---

const PROGRAM_ID = new PublicKey('3nrc4dPYdhztn9d82QmrznATBbYEi9hhvRyx6AnHVGk9');
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Max slash instructions per transaction.
// Each slash touches 3 unique accounts (commitment, userProfile, escrowVault)
// plus 4 shared accounts (authority, globalState, globalVault, tokenProgram).
// 5 slashes = 19 unique accounts, well within the 64-account tx limit.
const BATCH_SIZE = 5;

// Conservative compute unit estimate per slash instruction (includes CPI to Token Program).
const COMPUTE_UNITS_PER_SLASH = 120_000;

// Safety buffer added on top of the estimated total compute units.
const COMPUTE_UNITS_SAFETY_BUFFER = 50_000;

// PDA seed prefixes — must match the Rust program exactly.
const SEED_USER_PROFILE = Buffer.from('user_profile');
const SEED_GLOBAL_STATE = Buffer.from('global_state');
const SEED_ESCROW = Buffer.from('escrow');

// --- Types ---

export interface SlashTarget {
  /** Base58 address of the CommitmentAccount PDA to slash */
  commitmentPda: string;
  /** Base58 address of the commitment owner wallet */
  commitmentOwner: string;
  /** Human-readable reason string passed to the slash instruction */
  reason: string;
}

export interface BatchSlashResult {
  /** Confirmed Solana transaction signature */
  signature: string;
  /** PDAs successfully slashed in this transaction */
  slashedPdas: string[];
}

// --- Private Helpers ---

/**
 * Loads the protocol authority Keypair from the AUTHORITY_PRIVATE_KEY env var.
 * The key must be stored as a JSON uint8array string: "[6,145,...]".
 * Throws if the env var is missing or malformed.
 */
function loadAuthorityKeypair(): Keypair {
  const raw = process.env.AUTHORITY_PRIVATE_KEY;
  if (!raw) {
    throw new Error('AUTHORITY_PRIVATE_KEY is not set in environment variables');
  }
  try {
    const secretKey = Uint8Array.from(JSON.parse(raw));
    return Keypair.fromSecretKey(secretKey);
  } catch {
    throw new Error(
      'AUTHORITY_PRIVATE_KEY is malformed — expected a JSON uint8array string'
    );
  }
}

/**
 * Fetches the GlobalStateAccount PDA to retrieve the global vault token account address.
 * Cached per call — callers should pass the same program instance for efficiency.
 */
async function fetchGlobalVaultAddress(program: Program): Promise<PublicKey> {
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [SEED_GLOBAL_STATE],
    PROGRAM_ID
  );
  const globalState = await (program.account as any).globalStateAccount.fetch(
    globalStatePda
  );
  return globalState.globalVault as PublicKey;
}

// --- Public API ---

/**
 * Builds a Solana `TransactionInstruction` for the on-chain `slash` instruction.
 * Used internally to assemble batch transactions without sending them individually.
 *
 * @param program - Initialized Anchor Program instance
 * @param globalStatePda - Derived global state PDA
 * @param globalVault - Global vault token account address
 * @param authorityPubkey - Protocol authority public key (must match global_state.authority)
 * @param target - The commitment to slash
 */
async function buildSlashInstruction(
  program: Program,
  globalStatePda: PublicKey,
  globalVault: PublicKey,
  authorityPubkey: PublicKey,
  target: SlashTarget
) {
  const commitmentPdaKey = new PublicKey(target.commitmentPda);
  const ownerKey = new PublicKey(target.commitmentOwner);

  const [userProfilePda] = PublicKey.findProgramAddressSync(
    [SEED_USER_PROFILE, ownerKey.toBuffer()],
    PROGRAM_ID
  );

  const [escrowVaultPda] = PublicKey.findProgramAddressSync(
    [SEED_ESCROW, commitmentPdaKey.toBuffer()],
    PROGRAM_ID
  );

  return program.methods
    .slash(target.reason)
    .accounts({
      authority: authorityPubkey,
      commitment: commitmentPdaKey,
      userProfile: userProfilePda,
      globalState: globalStatePda,
      escrowVault: escrowVaultPda,
      globalVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

/**
 * Executes on-chain slash instructions for a list of commitments in batched transactions.
 *
 * Groups targets into batches of BATCH_SIZE (currently 5) and packs each batch
 * into a single Solana transaction to minimize network overhead and transaction fees.
 * A compute budget instruction is prepended to each transaction to ensure sufficient CUs.
 *
 * Each batch is sent independently — a failure in one batch does not cancel others.
 *
 * @param targets - Array of commitments that need to be slashed
 * @returns Array of BatchSlashResult, one entry per successfully confirmed batch transaction
 */
export async function executeBatchSlash(
  targets: SlashTarget[]
): Promise<BatchSlashResult[]> {
  if (targets.length === 0) return [];

  const authorityKeypair = loadAuthorityKeypair();
  const connection = new Connection(RPC_URL, 'confirmed');
  const authorityWallet = new NodeWallet(authorityKeypair);

  const provider = new AnchorProvider(connection, authorityWallet, {
    preflightCommitment: 'confirmed',
    commitment: 'confirmed',
  });
  const program = new Program(idl as any, provider);

  // Fetch shared accounts once — reused across all batches
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [SEED_GLOBAL_STATE],
    PROGRAM_ID
  );
  const globalVault = await fetchGlobalVaultAddress(program);

  // Split targets into chunks of BATCH_SIZE
  const batches: SlashTarget[][] = [];
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    batches.push(targets.slice(i, i + BATCH_SIZE));
  }

  const results: BatchSlashResult[] = [];

  for (const batch of batches) {
    try {
      // Build all slash instructions for this batch in parallel
      const instructions = await Promise.all(
        batch.map((target) =>
          buildSlashInstruction(
            program,
            globalStatePda,
            globalVault,
            authorityKeypair.publicKey,
            target
          )
        )
      );

      // Request compute units proportional to batch size plus a safety buffer
      const requiredComputeUnits =
        batch.length * COMPUTE_UNITS_PER_SLASH + COMPUTE_UNITS_SAFETY_BUFFER;

      const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: requiredComputeUnits,
      });

      // Assemble transaction: compute budget first, then all slash instructions
      const transaction = new Transaction();
      transaction.add(computeBudgetIx);
      instructions.forEach((ix) => transaction.add(ix));

      // Sign with authority keypair and send — waits for confirmation
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [authorityKeypair],
        { commitment: 'confirmed' }
      );

      results.push({
        signature,
        slashedPdas: batch.map((t) => t.commitmentPda),
      });

      console.log(
        `✅ Batch slash confirmed | tx: ${signature} | ${batch.length} commitment(s) slashed`
      );
    } catch (batchErr: any) {
      // Log and continue — a failed batch does not abort remaining batches
      console.error(
        `❌ Batch slash failed for PDAs [${batch.map((t) => t.commitmentPda.slice(0, 6)).join(', ')}]:`,
        batchErr.message
      );
    }
  }

  return results;
}
