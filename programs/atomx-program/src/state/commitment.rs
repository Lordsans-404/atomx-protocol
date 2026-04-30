use anchor_lang::prelude::*;

/// On-chain commitment status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CommitmentStatus {
    Active,
    Completed,
    Failed,
    Redemption,
}

/// Commitment PDA — source of truth for stake, progress, and status.
#[account]
pub struct CommitmentAccount {
    /// Wallet owner of this commitment
    pub owner: Pubkey,
    /// UUID bytes generated client-side
    pub commitment_id: [u8; 16],
    /// Original USDC stake amount (6 decimals)
    pub stake_amount: u64,
    /// Remaining stake after partial slashing
    pub remaining_stake: u64,
    /// USDC mint address
    pub spl_mint: Pubkey,
    /// Duration of the commitment in days (1-365)
    pub duration_days: u16,
    /// Target minutes per day
    pub daily_target_minutes: u16,
    /// Last day number with a validated proof
    pub current_day: u16,
    /// Number of failures (max 2 = terminated)
    pub failed_count: u8,
    /// Number of early finishes (>50% but <100% of target)
    pub early_finish_count: u8,
    /// Number of validated proofs submitted
    pub proof_count: u16,
    /// Current status of the commitment
    pub status: CommitmentStatus,
    /// Whether this is a redemption commitment
    pub is_redemption: bool,
    /// Unix timestamp when commitment was created
    pub created_at: i64,
    /// PDA bump seed
    pub bump: u8,
}

impl CommitmentAccount {
    /// Seeds: [b"commitment", owner.key().as_ref(), commitment_id.as_ref()]
    /// Space: 8 + 32 + 16 + 8 + 8 + 32 + 2 + 2 + 2 + 1 + 1 + 2 + 1 + 1 + 8 + 1 = 125
    pub const SPACE: usize = 8 + 32 + 16 + 8 + 8 + 32 + 2 + 2 + 2 + 1 + 1 + 2 + 1 + 1 + 8 + 1;
    pub const SEED_PREFIX: &'static [u8] = b"commitment";
}
