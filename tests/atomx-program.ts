import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AtomxProgram } from "../target/types/atomx_program";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

describe("atomx-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AtomxProgram as Program<AtomxProgram>;
  const wallet = provider.wallet as anchor.Wallet;

  // Variables for the test environment
  let usdcMint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;

  // PDAs
  let globalStatePda: anchor.web3.PublicKey;
  let globalVaultPda: anchor.web3.PublicKey;
  let userProfilePda: anchor.web3.PublicKey;
  let commitmentPda: anchor.web3.PublicKey;
  let escrowVaultPda: anchor.web3.PublicKey;

  // Test data
  const DECIMALS = 6;
  const MULTIPLIER = 10 ** DECIMALS;
  const stakeAmount = new anchor.BN(100 * MULTIPLIER); // 100 USDC
  const durationDays = 14;
  const targetMinutes = 30;

  // Helper to convert UUID string to 16-byte array
  function uuidToBytes(uuid: string): number[] {
    const hex = uuid.replace(/-/g, "");
    const bytes = [];
    for (let i = 0; i < 32; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  // Use a fixed UUID for our test commitment
  const rawUuid = uuidv4();
  const commitmentId = uuidToBytes(rawUuid);

  before(async () => {
    // 1. Create a mock USDC mint
    usdcMint = await createMint(
      provider.connection,
      wallet.payer,
      wallet.publicKey,
      null,
      DECIMALS
    );

    // 2. Create user's USDC token account
    userTokenAccount = await createAccount(
      provider.connection,
      wallet.payer,
      usdcMint,
      wallet.publicKey
    );

    // 3. Mint 1,000 mock USDC to the user
    await mintTo(
      provider.connection,
      wallet.payer,
      usdcMint,
      userTokenAccount,
      wallet.payer,
      1000 * MULTIPLIER
    );

    // 4. Pre-calculate PDAs
    [globalStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      program.programId
    );

    [globalVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_vault")],
      program.programId
    );

    [userProfilePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile"), wallet.publicKey.toBuffer()],
      program.programId
    );

    [commitmentPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("commitment"),
        wallet.publicKey.toBuffer(),
        Buffer.from(commitmentId),
      ],
      program.programId
    );

    [escrowVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), commitmentPda.toBuffer()],
      program.programId
    );
  });

  it("Initializes Global State & Vault", async () => {
    await program.methods
      .initGlobal()
      .accountsPartial({
        authority: wallet.publicKey,
        globalState: globalStatePda,
        globalVault: globalVaultPda,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const state = await program.account.globalStateAccount.fetch(globalStatePda);
    assert.ok(state.authority.equals(wallet.publicKey));
    assert.ok(state.usdcMint.equals(usdcMint));
    assert.ok(state.globalVault.equals(globalVaultPda));
    assert.equal(state.charityBalance.toNumber(), 0);
  });

  it("Creates a Commitment", async () => {
    await program.methods
      .createCommitment(
        commitmentId,
        stakeAmount,
        durationDays,
        targetMinutes
      )
      .accountsPartial({
        user: wallet.publicKey,
        userProfile: userProfilePda,
        commitment: commitmentPda,
        escrowVault: escrowVaultPda,
        userTokenAccount: userTokenAccount,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Verify commitment state
    const commitment = await program.account.commitmentAccount.fetch(commitmentPda);
    assert.equal(commitment.stakeAmount.toNumber(), stakeAmount.toNumber());
    assert.equal(commitment.remainingStake.toNumber(), stakeAmount.toNumber());
    assert.equal(commitment.durationDays, durationDays);
    assert.deepEqual(commitment.status, { active: {} }); // enum

    // Verify UserProfile state
    const profile = await program.account.userProfile.fetch(userProfilePda);
    assert.equal(profile.totalCommitments, 1);
    assert.equal(profile.activeCommitments, 1);

    // Verify escrow balance
    const escrowInfo = await getAccount(provider.connection, escrowVaultPda);
    assert.equal(Number(escrowInfo.amount), stakeAmount.toNumber());
  });

  it("Submits a daily proof (Day 1 - Normal)", async () => {
    const dayNumber = 1;
    const actualMinutes = 35; // Target was 30

    // Fake SHA256 hash
    const fakeHash = crypto.createHash('sha256').update('test').digest();
    const proofHashArray = Array.from(fakeHash);

    const [proofRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("proof"),
        commitmentPda.toBuffer(),
        new anchor.BN(dayNumber).toArrayLike(Buffer, "le", 2),
      ],
      program.programId
    );

    await program.methods
      .submitProof(dayNumber, proofHashArray, actualMinutes)
      .accountsPartial({
        user: wallet.publicKey,
        commitment: commitmentPda,
        proofRecord: proofRecordPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const proofRecord = await program.account.proofRecord.fetch(proofRecordPda);
    assert.equal(proofRecord.dayNumber, dayNumber);
    assert.equal(proofRecord.actualMinutes, actualMinutes);
    assert.equal(proofRecord.isEarlyFinish, false);

    const commitment = await program.account.commitmentAccount.fetch(commitmentPda);
    assert.equal(commitment.currentDay, 1);
    assert.equal(commitment.proofCount, 1);
    assert.equal(commitment.earlyFinishCount, 0);
  });

  it("Submits a daily proof (Day 2 - Early Finish)", async () => {
    const dayNumber = 2;
    const actualMinutes = 20; // 20 >= (30/2) -> early finish penalty!

    const fakeHash = crypto.createHash('sha256').update('test2').digest();
    const proofHashArray = Array.from(fakeHash);

    const [proofRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("proof"),
        commitmentPda.toBuffer(),
        new anchor.BN(dayNumber).toArrayLike(Buffer, "le", 2),
      ],
      program.programId
    );

    await program.methods
      .submitProof(dayNumber, proofHashArray, actualMinutes)
      .accountsPartial({
        user: wallet.publicKey,
        commitment: commitmentPda,
        proofRecord: proofRecordPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const proofRecord = await program.account.proofRecord.fetch(proofRecordPda);
    assert.equal(proofRecord.isEarlyFinish, true);

    const commitment = await program.account.commitmentAccount.fetch(commitmentPda);
    assert.equal(commitment.currentDay, 2);
    assert.equal(commitment.proofCount, 2);
    assert.equal(commitment.earlyFinishCount, 1); // Increment early finish
  });

  it("Executes a Partial Slash (First Failure)", async () => {
    // Manually trigger slash
    await program.methods
      .slash("Missed deadline")
      .accountsPartial({
        authority: wallet.publicKey, // in test, wallet is authority
        commitment: commitmentPda,
        userProfile: userProfilePda,
        globalState: globalStatePda,
        escrowVault: escrowVaultPda,
        globalVault: globalVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const commitment = await program.account.commitmentAccount.fetch(commitmentPda);
    assert.equal(commitment.failedCount, 1);
    assert.deepEqual(commitment.status, { active: {} }); // Still active because duration > 7

    // 40% of 100 USDC = 40 USDC
    const expectedSlash = 40 * MULTIPLIER;
    const expectedRemaining = 60 * MULTIPLIER;
    assert.equal(commitment.remainingStake.toNumber(), expectedRemaining);

    const globalState = await program.account.globalStateAccount.fetch(globalStatePda);
    assert.equal(globalState.totalSlashed.toNumber(), expectedSlash);

    // Check virtual pools (35, 30, 25, 10)
    assert.equal(globalState.charityBalance.toNumber(), expectedSlash * 0.35);
    assert.equal(globalState.rewardsBalance.toNumber(), expectedSlash * 0.30);
    assert.equal(globalState.treasuryBalance.toNumber(), expectedSlash * 0.25);
    assert.equal(globalState.backupBalance.toNumber(), expectedSlash * 0.10);

    // Check physical global vault balance
    const globalVaultInfo = await getAccount(provider.connection, globalVaultPda);
    assert.equal(Number(globalVaultInfo.amount), expectedSlash);
  });

});
