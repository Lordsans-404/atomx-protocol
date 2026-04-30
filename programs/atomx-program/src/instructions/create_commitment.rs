use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::state::{CommitmentAccount, CommitmentStatus, UserProfile};
use crate::errors::AtomxError;
use crate::events::CommitmentCreated;

/// Create a new commitment: init PDA, init escrow vault, transfer USDC from user.
pub fn handler(
    ctx: Context<CreateCommitment>,
    commitment_id: [u8; 16],
    stake_amount: u64,
    duration_days: u16,
    daily_target_minutes: u16,
) -> Result<()> {
    // --- Validation ---
    require!(stake_amount > 0, AtomxError::InvalidStakeAmount);
    require!(
        duration_days >= 1 && duration_days <= 365,
        AtomxError::InvalidDuration
    );
    require!(daily_target_minutes >= 1, AtomxError::InvalidTargetMinutes);

    // --- Initialize UserProfile (init_if_needed handles first-time) ---
    let user_profile = &mut ctx.accounts.user_profile;
    if user_profile.owner == Pubkey::default() {
        // First-time initialization
        user_profile.owner = ctx.accounts.user.key();
        user_profile.bump = ctx.bumps.user_profile;
    }
    user_profile.total_commitments = user_profile
        .total_commitments
        .checked_add(1)
        .ok_or(AtomxError::MathOverflow)?;
    user_profile.active_commitments = user_profile
        .active_commitments
        .checked_add(1)
        .ok_or(AtomxError::MathOverflow)?;

    // --- Initialize CommitmentAccount ---
    let commitment = &mut ctx.accounts.commitment;
    let clock = Clock::get()?;

    commitment.owner = ctx.accounts.user.key();
    commitment.commitment_id = commitment_id;
    commitment.stake_amount = stake_amount;
    commitment.remaining_stake = stake_amount;
    commitment.spl_mint = ctx.accounts.usdc_mint.key();
    commitment.duration_days = duration_days;
    commitment.daily_target_minutes = daily_target_minutes;
    commitment.current_day = 0;
    commitment.failed_count = 0;
    commitment.early_finish_count = 0;
    commitment.proof_count = 0;
    commitment.status = CommitmentStatus::Active;
    commitment.is_redemption = false;
    commitment.created_at = clock.unix_timestamp;
    commitment.bump = ctx.bumps.commitment;

    // --- Transfer USDC from user → escrow vault ---
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.escrow_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, stake_amount)?;

    // --- Emit event ---
    emit!(CommitmentCreated {
        owner: ctx.accounts.user.key(),
        commitment_id,
        pda: ctx.accounts.commitment.key(),
        stake_amount,
        duration_days,
        daily_target_minutes,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(commitment_id: [u8; 16])]
pub struct CreateCommitment<'info> {
    /// User creating the commitment — signer and payer
    #[account(mut)]
    pub user: Signer<'info>,

    /// User profile PDA — created on first commitment
    #[account(
        init_if_needed,
        payer = user,
        space = UserProfile::SPACE,
        seeds = [UserProfile::SEED_PREFIX, user.key().as_ref()],
        bump,
    )]
    pub user_profile: Account<'info, UserProfile>,

    /// New commitment PDA
    #[account(
        init,
        payer = user,
        space = CommitmentAccount::SPACE,
        seeds = [CommitmentAccount::SEED_PREFIX, user.key().as_ref(), commitment_id.as_ref()],
        bump,
    )]
    pub commitment: Account<'info, CommitmentAccount>,

    /// Escrow vault for this commitment's USDC
    #[account(
        init,
        payer = user,
        seeds = [b"escrow", commitment.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = commitment,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    /// User's USDC token account (source of stake)
    #[account(
        mut,
        constraint = user_token_account.mint == usdc_mint.key(),
        constraint = user_token_account.owner == user.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// USDC mint
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
