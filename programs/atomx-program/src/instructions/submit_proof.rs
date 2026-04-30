use anchor_lang::prelude::*;

use crate::state::{CommitmentAccount, CommitmentStatus, ProofRecord};
use crate::errors::AtomxError;
use crate::events::ProofSubmitted;

pub fn handler(
    ctx: Context<SubmitProof>,
    day_number: u16,
    proof_hash: [u8; 32],
    actual_minutes: u16,
) -> Result<()> {
    let commitment = &mut ctx.accounts.commitment;
    let clock = Clock::get()?;

    require!(commitment.status == CommitmentStatus::Active, AtomxError::CommitmentNotActive);
    require!(day_number == commitment.current_day + 1, AtomxError::InvalidDayNumber);
    require!(actual_minutes > 0, AtomxError::InvalidTargetMinutes);

    // 50% target validation
    let half_target = commitment.daily_target_minutes / 2;
    require!(actual_minutes >= half_target, AtomxError::InsufficientProofMinutes);

    // Early finish: >= 50% but < 100% of daily target
    let is_early_finish = actual_minutes < commitment.daily_target_minutes;

    if is_early_finish {
        commitment.early_finish_count = commitment.early_finish_count
            .checked_add(1).ok_or(AtomxError::MathOverflow)?;
    }

    commitment.current_day = day_number;
    commitment.proof_count = commitment.proof_count
        .checked_add(1).ok_or(AtomxError::MathOverflow)?;

    let proof_record = &mut ctx.accounts.proof_record;
    proof_record.commitment = ctx.accounts.commitment.key();
    proof_record.day_number = day_number;
    proof_record.proof_hash = proof_hash;
    proof_record.actual_minutes = actual_minutes;
    proof_record.is_early_finish = is_early_finish;
    proof_record.submitted_at = clock.unix_timestamp;
    proof_record.bump = ctx.bumps.proof_record;

    emit!(ProofSubmitted {
        commitment: ctx.accounts.commitment.key(),
        day_number,
        proof_hash,
        actual_minutes,
        is_early_finish,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(day_number: u16)]
pub struct SubmitProof<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [CommitmentAccount::SEED_PREFIX, commitment.owner.as_ref(), commitment.commitment_id.as_ref()],
        bump = commitment.bump,
        constraint = commitment.owner == user.key() @ AtomxError::UnauthorizedAuthority,
    )]
    pub commitment: Account<'info, CommitmentAccount>,

    /// Proof record PDA — unique per (commitment, day_number).
    /// `init` constraint prevents duplicate proofs automatically.
    #[account(
        init, payer = user, space = ProofRecord::SPACE,
        seeds = [ProofRecord::SEED_PREFIX, commitment.key().as_ref(), &day_number.to_le_bytes()],
        bump,
    )]
    pub proof_record: Account<'info, ProofRecord>,

    pub system_program: Program<'info, System>,
}
