use anchor_lang::prelude::*;

/// Global state PDA — virtual ledger for pool distribution.
/// Instead of 4 separate SPL Token Accounts, we use 1 Global Vault (physical)
/// + this PDA to track virtual balances via integers.
#[account]
pub struct GlobalStateAccount {
    /// Admin/deployer authority who can manage the protocol
    pub authority: Pubkey,
    /// USDC mint address
    pub usdc_mint: Pubkey,
    /// The single SPL Token Account that holds all protocol USDC
    pub global_vault: Pubkey,
    /// Virtual balance — charity pool portion
    pub charity_balance: u64,
    /// Virtual balance — rewards pool portion
    pub rewards_balance: u64,
    /// Virtual balance — treasury pool portion
    pub treasury_balance: u64,
    /// Virtual balance — backup pool portion
    pub backup_balance: u64,
    /// Total USDC ever slashed across all commitments
    pub total_slashed: u64,
    /// Total USDC ever rewarded to users
    pub total_rewarded: u64,
    /// PDA bump seed
    pub bump: u8,
    /// Global Vault token account PDA bump
    pub vault_bump: u8,
}

impl GlobalStateAccount {
    /// Seeds: [b"global_state"]
    /// Space: 8 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1 = 154
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1;
    pub const SEED_PREFIX: &'static [u8] = b"global_state";
    pub const VAULT_SEED: &'static [u8] = b"global_vault";

    /// Pool distribution ratios (must sum to 100)
    pub const CHARITY_BPS: u64 = 35;
    pub const REWARDS_BPS: u64 = 30;
    pub const TREASURY_BPS: u64 = 25;
    // Backup gets the remainder to avoid rounding loss
}
