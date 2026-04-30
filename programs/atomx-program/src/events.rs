use anchor_lang::prelude::*;

/// Emitted when global state and vault are initialized (once at deploy)
#[event]
pub struct GlobalInitialized {
    pub authority: Pubkey,
    pub global_vault: Pubkey,
    pub usdc_mint: Pubkey,
}

/// Emitted when a new commitment is created and USDC is staked
#[event]
pub struct CommitmentCreated {
    pub owner: Pubkey,
    pub commitment_id: [u8; 16],
    pub pda: Pubkey,
    pub stake_amount: u64,
    pub duration_days: u16,
    pub daily_target_minutes: u16,
}

/// Emitted when a daily proof is submitted on-chain
#[event]
pub struct ProofSubmitted {
    pub commitment: Pubkey,
    pub day_number: u16,
    pub proof_hash: [u8; 32],
    pub actual_minutes: u16,
    pub is_early_finish: bool,
}

/// Emitted when a slash is executed (partial or full)
#[event]
pub struct SlashExecuted {
    pub commitment: Pubkey,
    pub slashed_amount: u64,
    pub fail_count: u8,
    pub charity_amount: u64,
    pub rewards_amount: u64,
    pub treasury_amount: u64,
    pub backup_amount: u64,
    pub new_status: u8,
}

/// Emitted when a commitment is successfully completed
#[event]
pub struct CommitmentCompleted {
    pub commitment: Pubkey,
    pub owner: Pubkey,
    pub reward_amount: u64,
    pub penalty_percent: u8,
    pub early_finish_count: u8,
}

/// Emitted when a user redeems a failed commitment
#[event]
pub struct RedemptionUsed {
    pub user: Pubkey,
    pub old_commitment: Pubkey,
    pub new_commitment: Pubkey,
    pub redemption_count: u8,
}
