use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::state::{CommitmentAccount, CommitmentStatus, UserProfile};
use crate::errors::AtomxError;
use crate::events::RedemptionUsed;

/// 30-day cooldown in seconds
const REDEMPTION_COOLDOWN: i64 = 30 * 24 * 60 * 60; // 2_592_000

pub fn handler(
    ctx: Context<Redeem>,
    commitment_id: [u8; 16],
    stake_amount: u64,
    duration_days: u16,
    daily_target_minutes: u16,
) -> Result<()> {
    let user_profile = &mut ctx.accounts.user_profile;
    let old_commitment = &ctx.accounts.old_commitment;
    let clock = Clock::get()?;

    // --- Eligibility checks ---
    require!(old_commitment.status == CommitmentStatus::Failed, AtomxError::NoFailedCommitment);
    require!(old_commitment.owner == ctx.accounts.user.key(), AtomxError::UnauthorizedAuthority);
    require!(user_profile.total_failed > 0, AtomxError::NoFailedCommitment);

    // Cooldown: 30 days since last redemption
    if user_profile.redemption_count > 0 {
        let elapsed = clock.unix_timestamp
            .checked_sub(user_profile.last_redemption_ts).ok_or(AtomxError::MathOverflow)?;
        require!(elapsed >= REDEMPTION_COOLDOWN, AtomxError::RedemptionCooldown);
    }

    // --- Standard commitment validation ---
    require!(stake_amount > 0, AtomxError::InvalidStakeAmount);
    require!(duration_days >= 1 && duration_days <= 365, AtomxError::InvalidDuration);
    require!(daily_target_minutes >= 1, AtomxError::InvalidTargetMinutes);

    // --- Init new commitment ---
    let new_commitment = &mut ctx.accounts.new_commitment;
    new_commitment.owner = ctx.accounts.user.key();
    new_commitment.commitment_id = commitment_id;
    new_commitment.stake_amount = stake_amount;
    new_commitment.remaining_stake = stake_amount;
    new_commitment.spl_mint = ctx.accounts.usdc_mint.key();
    new_commitment.duration_days = duration_days;
    new_commitment.daily_target_minutes = daily_target_minutes;
    new_commitment.current_day = 0;
    new_commitment.failed_count = 0;
    new_commitment.early_finish_count = 0;
    new_commitment.proof_count = 0;
    new_commitment.status = CommitmentStatus::Redemption;
    new_commitment.is_redemption = true;
    new_commitment.created_at = clock.unix_timestamp;
    new_commitment.bump = ctx.bumps.new_commitment;

    // --- Transfer USDC from user → new escrow ---
    token::transfer(CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.escrow_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    ), stake_amount)?;

    // --- Update user profile ---
    user_profile.redemption_count = user_profile.redemption_count
        .checked_add(1).ok_or(AtomxError::MathOverflow)?;
    user_profile.last_redemption_ts = clock.unix_timestamp;
    user_profile.total_commitments = user_profile.total_commitments
        .checked_add(1).ok_or(AtomxError::MathOverflow)?;
    user_profile.active_commitments = user_profile.active_commitments
        .checked_add(1).ok_or(AtomxError::MathOverflow)?;

    emit!(RedemptionUsed {
        user: ctx.accounts.user.key(),
        old_commitment: ctx.accounts.old_commitment.key(),
        new_commitment: ctx.accounts.new_commitment.key(),
        redemption_count: user_profile.redemption_count,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(commitment_id: [u8; 16])]
pub struct Redeem<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [UserProfile::SEED_PREFIX, user.key().as_ref()],
        bump = user_profile.bump,
    )]
    pub user_profile: Account<'info, UserProfile>,

    /// The old failed commitment (reference)
    #[account(
        seeds = [CommitmentAccount::SEED_PREFIX, old_commitment.owner.as_ref(), old_commitment.commitment_id.as_ref()],
        bump = old_commitment.bump,
        constraint = old_commitment.owner == user.key() @ AtomxError::UnauthorizedAuthority,
        constraint = old_commitment.status == CommitmentStatus::Failed @ AtomxError::NoFailedCommitment,
    )]
    pub old_commitment: Account<'info, CommitmentAccount>,

    /// New redemption commitment PDA
    #[account(
        init, payer = user, space = CommitmentAccount::SPACE,
        seeds = [CommitmentAccount::SEED_PREFIX, user.key().as_ref(), commitment_id.as_ref()],
        bump,
    )]
    pub new_commitment: Account<'info, CommitmentAccount>,

    /// Escrow vault for the new commitment
    #[account(
        init, payer = user,
        seeds = [b"escrow", new_commitment.key().as_ref()],
        bump, token::mint = usdc_mint, token::authority = new_commitment,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_token_account.mint == usdc_mint.key(), constraint = user_token_account.owner == user.key())]
    pub user_token_account: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
