use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{CommitmentAccount, CommitmentStatus, GlobalStateAccount, UserProfile};
use crate::errors::AtomxError;
use crate::events::SlashExecuted;

/// Slash rate for first failure: 40%
const SLASH_RATE_FIRST: u64 = 40;

pub fn handler(ctx: Context<Slash>, _reason: String) -> Result<()> {
    // Extract AccountInfos BEFORE taking mutable references
    let escrow_info = ctx.accounts.escrow_vault.to_account_info();
    let global_vault_info = ctx.accounts.global_vault.to_account_info();
    let commitment_info = ctx.accounts.commitment.to_account_info();
    let token_program_info = ctx.accounts.token_program.to_account_info();
    let commitment_key = ctx.accounts.commitment.key();

    let commitment = &mut ctx.accounts.commitment;
    let user_profile = &mut ctx.accounts.user_profile;
    let global_state = &mut ctx.accounts.global_state;

    require!(commitment.status == CommitmentStatus::Active, AtomxError::CommitmentNotActive);
    require!(commitment.failed_count < 2, AtomxError::MaxFailuresReached);

    commitment.failed_count = commitment.failed_count
        .checked_add(1).ok_or(AtomxError::MathOverflow)?;

    // Determine slash amount
    let slash_amount: u64;
    let new_status: CommitmentStatus;

    if commitment.duration_days <= 7 {
        slash_amount = commitment.remaining_stake;
        new_status = CommitmentStatus::Failed;
    } else if commitment.failed_count == 1 {
        slash_amount = commitment.stake_amount
            .checked_mul(SLASH_RATE_FIRST).ok_or(AtomxError::MathOverflow)?
            .checked_div(100).ok_or(AtomxError::MathOverflow)?;
        new_status = CommitmentStatus::Active;
    } else {
        slash_amount = commitment.remaining_stake;
        new_status = CommitmentStatus::Failed;
    }

    require!(slash_amount > 0, AtomxError::InsufficientEscrow);
    require!(commitment.remaining_stake >= slash_amount, AtomxError::InsufficientEscrow);

    // Pool distribution (virtual)
    let charity_amount = slash_amount
        .checked_mul(GlobalStateAccount::CHARITY_BPS).ok_or(AtomxError::MathOverflow)?
        .checked_div(100).ok_or(AtomxError::MathOverflow)?;
    let rewards_amount = slash_amount
        .checked_mul(GlobalStateAccount::REWARDS_BPS).ok_or(AtomxError::MathOverflow)?
        .checked_div(100).ok_or(AtomxError::MathOverflow)?;
    let treasury_amount = slash_amount
        .checked_mul(GlobalStateAccount::TREASURY_BPS).ok_or(AtomxError::MathOverflow)?
        .checked_div(100).ok_or(AtomxError::MathOverflow)?;
    let backup_amount = slash_amount
        .checked_sub(charity_amount).ok_or(AtomxError::MathOverflow)?
        .checked_sub(rewards_amount).ok_or(AtomxError::MathOverflow)?
        .checked_sub(treasury_amount).ok_or(AtomxError::MathOverflow)?;

    // CPI: escrow → global vault (1 transfer)
    let owner_key = commitment.owner;
    let cid = commitment.commitment_id;
    let bump = commitment.bump;
    let signer_seeds: &[&[u8]] = &[
        CommitmentAccount::SEED_PREFIX,
        owner_key.as_ref(),
        cid.as_ref(),
        &[bump],
    ];
    let binding = [signer_seeds];

    token::transfer(CpiContext::new_with_signer(
        token_program_info,
        Transfer { from: escrow_info, to: global_vault_info, authority: commitment_info },
        &binding,
    ), slash_amount)?;

    // Update virtual balances
    global_state.charity_balance = global_state.charity_balance
        .checked_add(charity_amount).ok_or(AtomxError::MathOverflow)?;
    global_state.rewards_balance = global_state.rewards_balance
        .checked_add(rewards_amount).ok_or(AtomxError::MathOverflow)?;
    global_state.treasury_balance = global_state.treasury_balance
        .checked_add(treasury_amount).ok_or(AtomxError::MathOverflow)?;
    global_state.backup_balance = global_state.backup_balance
        .checked_add(backup_amount).ok_or(AtomxError::MathOverflow)?;
    global_state.total_slashed = global_state.total_slashed
        .checked_add(slash_amount).ok_or(AtomxError::MathOverflow)?;

    // Update commitment
    commitment.remaining_stake = commitment.remaining_stake
        .checked_sub(slash_amount).ok_or(AtomxError::MathOverflow)?;
    commitment.status = new_status;

    // Update user profile if failed
    if new_status == CommitmentStatus::Failed {
        user_profile.total_failed = user_profile.total_failed
            .checked_add(1).ok_or(AtomxError::MathOverflow)?;
        user_profile.active_commitments = user_profile.active_commitments
            .checked_sub(1).ok_or(AtomxError::MathOverflow)?;
    }

    emit!(SlashExecuted {
        commitment: commitment_key,
        slashed_amount: slash_amount,
        fail_count: commitment.failed_count,
        charity_amount,
        rewards_amount,
        treasury_amount,
        backup_amount,
        new_status: new_status as u8,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct Slash<'info> {
    /// Program authority (backend) — only authorized signer
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [CommitmentAccount::SEED_PREFIX, commitment.owner.as_ref(), commitment.commitment_id.as_ref()],
        bump = commitment.bump,
    )]
    pub commitment: Account<'info, CommitmentAccount>,

    #[account(
        mut,
        seeds = [UserProfile::SEED_PREFIX, commitment.owner.as_ref()],
        bump = user_profile.bump,
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        mut,
        seeds = [GlobalStateAccount::SEED_PREFIX],
        bump = global_state.bump,
        constraint = global_state.authority == authority.key() @ AtomxError::UnauthorizedAuthority,
    )]
    pub global_state: Account<'info, GlobalStateAccount>,

    #[account(
        mut,
        seeds = [b"escrow", commitment.key().as_ref()],
        bump,
        token::mint = global_state.usdc_mint,
        token::authority = commitment,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(mut, address = global_state.global_vault)]
    pub global_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
