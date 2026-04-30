use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

pub use instructions::*;

declare_id!("3nrc4dPYdhztn9d82QmrznATBbYEi9hhvRyx6AnHVGk9");

#[program]
pub mod atomx_program {
    use super::*;

    /// Initialize global protocol state + single USDC vault (once at deploy)
    pub fn init_global(ctx: Context<InitGlobal>) -> Result<()> {
        instructions::init_global::handler(ctx)
    }

    /// Create a new commitment: stake USDC into an escrow vault
    pub fn create_commitment(
        ctx: Context<CreateCommitment>,
        commitment_id: [u8; 16],
        stake_amount: u64,
        duration_days: u16,
        daily_target_minutes: u16,
    ) -> Result<()> {
        instructions::create_commitment::handler(ctx, commitment_id, stake_amount, duration_days, daily_target_minutes)
    }

    /// Submit a daily proof hash on-chain
    pub fn submit_proof(
        ctx: Context<SubmitProof>,
        day_number: u16,
        proof_hash: [u8; 32],
        actual_minutes: u16,
    ) -> Result<()> {
        instructions::submit_proof::handler(ctx, day_number, proof_hash, actual_minutes)
    }

    /// Slash a commitment (authority only)
    pub fn slash(ctx: Context<Slash>, reason: String) -> Result<()> {
        instructions::slash::handler(ctx, reason)
    }

    /// Complete a commitment and claim reward
    pub fn complete_commitment(ctx: Context<CompleteCommitment>) -> Result<()> {
        instructions::complete_commitment::handler(ctx)
    }

    /// Redeem a failed commitment (30-day cooldown)
    pub fn redeem(
        ctx: Context<Redeem>,
        commitment_id: [u8; 16],
        stake_amount: u64,
        duration_days: u16,
        daily_target_minutes: u16,
    ) -> Result<()> {
        instructions::redeem::handler(ctx, commitment_id, stake_amount, duration_days, daily_target_minutes)
    }
}
