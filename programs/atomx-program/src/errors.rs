use anchor_lang::prelude::*;

#[error_code]
pub enum AtomxError {
    // === Input validation ===
    #[msg("Stake amount must be greater than zero")]
    InvalidStakeAmount, // 6000

    #[msg("Duration must be between 1 and 365 days")]
    InvalidDuration, // 6001

    #[msg("Daily target minutes must be at least 1")]
    InvalidTargetMinutes, // 6002

    // === Commitment state ===
    #[msg("Commitment is not in active status")]
    CommitmentNotActive, // 6003

    #[msg("Proof already submitted for this day")]
    ProofAlreadySubmitted, // 6004

    #[msg("Day number must be sequential (current_day + 1)")]
    InvalidDayNumber, // 6005

    #[msg("Maximum failures reached (2), commitment is terminated")]
    MaxFailuresReached, // 6006

    #[msg("Short duration commitment (<=7 days): first failure auto-fails")]
    ShortDurationAutoFail, // 6007

    // === Authorization ===
    #[msg("Unauthorized: signer is not the program authority")]
    UnauthorizedAuthority, // 6008

    // === Completion ===
    #[msg("Commitment not complete: proof_count < duration_days")]
    CommitmentNotComplete, // 6009

    #[msg("Insufficient escrow balance for transfer")]
    InsufficientEscrow, // 6010

    // === Proof ===
    #[msg("Invalid proof hash: must be 32 bytes")]
    InvalidProofHash, // 6011

    #[msg("Proof rejected: actual minutes is less than 50% of the daily target")]
    InsufficientProofMinutes, // 6012

    // === Math ===
    #[msg("Arithmetic overflow")]
    MathOverflow, // 6012

    // === Redemption ===
    #[msg("Redemption cooldown: must wait 30 days between redemptions")]
    RedemptionCooldown, // 6013

    #[msg("No failed commitment: user is not eligible for redemption")]
    NoFailedCommitment, // 6014

    #[msg("Maximum active commitments reached")]
    MaxActiveCommitments, // 6015

    // === Global state ===
    #[msg("Global state has already been initialized")]
    GlobalStateAlreadyInitialized, // 6016
}
