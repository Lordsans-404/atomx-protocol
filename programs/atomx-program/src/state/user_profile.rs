use anchor_lang::prelude::*;

/// Minimal on-chain user profile — only stores data that affects on-chain logic.
/// NOT a duplication of Supabase `users` table.
#[account]
pub struct UserProfile {
    /// Wallet address of the user
    pub owner: Pubkey,
    /// Total commitments ever created
    pub total_commitments: u16,
    /// Number of currently active commitments
    pub active_commitments: u8,
    /// Total successfully completed commitments
    pub total_completed: u16,
    /// Total failed commitments
    pub total_failed: u16,
    /// Number of redemption tokens used
    pub redemption_count: u8,
    /// Timestamp of last redemption usage (cooldown: 30 days)
    pub last_redemption_ts: i64,
    /// PDA bump seed
    pub bump: u8,
}

impl UserProfile {
    /// Seeds: [b"user_profile", owner.key().as_ref()]
    /// Space: 8 (discriminator) + 32 + 2 + 1 + 2 + 2 + 1 + 8 + 1 = 57
    pub const SPACE: usize = 8 + 32 + 2 + 1 + 2 + 2 + 1 + 8 + 1;
    pub const SEED_PREFIX: &'static [u8] = b"user_profile";
}
