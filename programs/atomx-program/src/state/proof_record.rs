use anchor_lang::prelude::*;

/// On-chain proof record — immutable once created.
/// SHA256(proof_url + timestamp + solana_pubkey)
#[account]
pub struct ProofRecord {
    /// Reference to the CommitmentAccount PDA
    pub commitment: Pubkey,
    /// Day number (1-indexed)
    pub day_number: u16,
    /// SHA256 hash of the proof content
    pub proof_hash: [u8; 32],
    /// Actual minutes spent on the activity
    pub actual_minutes: u16,
    /// Whether this was an early finish (>=50% but <100% of target)
    pub is_early_finish: bool,
    /// Unix timestamp when proof was submitted
    pub submitted_at: i64,
    /// PDA bump seed
    pub bump: u8,
}

impl ProofRecord {
    /// Seeds: [b"proof", commitment_pda.key().as_ref(), &day_number.to_le_bytes()]
    /// Space: 8 + 32 + 2 + 32 + 2 + 1 + 8 + 1 = 86
    pub const SPACE: usize = 8 + 32 + 2 + 32 + 2 + 1 + 8 + 1;
    pub const SEED_PREFIX: &'static [u8] = b"proof";
}
