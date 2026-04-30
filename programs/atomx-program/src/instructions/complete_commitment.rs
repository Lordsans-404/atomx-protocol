use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{CommitmentAccount, CommitmentStatus, GlobalStateAccount, UserProfile};
use crate::errors::AtomxError;
use crate::events::CommitmentCompleted;

pub fn handler(ctx: Context<CompleteCommitment>) -> Result<()> {
    // Extract AccountInfos BEFORE mutable borrows
    let escrow_info = ctx.accounts.escrow_vault.to_account_info();
    let user_token_info = ctx.accounts.user_token_account.to_account_info();
    let global_vault_info = ctx.accounts.global_vault.to_account_info();
    let commitment_info = ctx.accounts.commitment.to_account_info();
    let token_program_info = ctx.accounts.token_program.to_account_info();
    let commitment_key = ctx.accounts.commitment.key();

    let commitment = &mut ctx.accounts.commitment;
    let user_profile = &mut ctx.accounts.user_profile;
    let global_state = &mut ctx.accounts.global_state;

    require!(commitment.status == CommitmentStatus::Active, AtomxError::CommitmentNotActive);
    require!(commitment.owner == ctx.accounts.user.key(), AtomxError::UnauthorizedAuthority);
    require!(commitment.proof_count >= commitment.duration_days, AtomxError::CommitmentNotComplete);

    // Calculate reward with early-finish penalty (1% per early finish)
    let penalty_percent = commitment.early_finish_count as u64;
    let penalty_amount = commitment.remaining_stake
        .checked_mul(penalty_percent).ok_or(AtomxError::MathOverflow)?
        .checked_div(100).ok_or(AtomxError::MathOverflow)?;
    let base_reward = commitment.remaining_stake
        .checked_sub(penalty_amount).ok_or(AtomxError::MathOverflow)?;

    // Calculate extra bonus from the protocol's rewards pool
    // 3% if they have >=3 completed commitments, otherwise 1%
    let bonus_percent = if user_profile.total_completed >= 3 { 3 } else { 1 };
    let max_bonus = commitment.stake_amount
        .checked_mul(bonus_percent).ok_or(AtomxError::MathOverflow)?
        .checked_div(100).ok_or(AtomxError::MathOverflow)?;

    // Cap bonus to what is actually available in the global rewards pool
    let bonus_amount = std::cmp::min(max_bonus, global_state.rewards_balance);
    let total_user_receives = base_reward
        .checked_add(bonus_amount).ok_or(AtomxError::MathOverflow)?;

    let owner_key = commitment.owner;
    let cid = commitment.commitment_id;
    let bump = commitment.bump;
    let early_count = commitment.early_finish_count;
    let signer_seeds: &[&[u8]] = &[
        CommitmentAccount::SEED_PREFIX,
        owner_key.as_ref(),
        cid.as_ref(),
        &[bump],
    ];
    let binding = [signer_seeds];

    // CPI #1: Base reward (remaining stake - penalty) → user
    if base_reward > 0 {
        token::transfer(CpiContext::new_with_signer(
            token_program_info.clone(),
            Transfer { from: escrow_info.clone(), to: user_token_info.clone(), authority: commitment_info.clone() },
            &binding,
        ), base_reward)?;
    }

    // CPI #2: Penalty → global vault
    if penalty_amount > 0 {
        token::transfer(CpiContext::new_with_signer(
            token_program_info.clone(),
            Transfer { from: escrow_info.clone(), to: global_vault_info.clone(), authority: commitment_info.clone() },
            &binding,
        ), penalty_amount)?;
        global_state.rewards_balance = global_state.rewards_balance
            .checked_add(penalty_amount).ok_or(AtomxError::MathOverflow)?;
    }

    // CPI #3: Bonus reward → user (from global vault)
    if bonus_amount > 0 {
        let global_bump = global_state.bump;
        let global_seeds: &[&[u8]] = &[
            GlobalStateAccount::SEED_PREFIX,
            &[global_bump],
        ];
        let global_binding = [global_seeds];

        token::transfer(CpiContext::new_with_signer(
            token_program_info.clone(),
            Transfer { from: global_vault_info.clone(), to: user_token_info.clone(), authority: global_state.to_account_info() },
            &global_binding,
        ), bonus_amount)?;

        global_state.rewards_balance = global_state.rewards_balance
            .checked_sub(bonus_amount).ok_or(AtomxError::MathOverflow)?;
    }

    global_state.total_rewarded = global_state.total_rewarded
        .checked_add(total_user_receives).ok_or(AtomxError::MathOverflow)?;

    commitment.status = CommitmentStatus::Completed;
    commitment.remaining_stake = 0;

    user_profile.total_completed = user_profile.total_completed
        .checked_add(1).ok_or(AtomxError::MathOverflow)?;
    user_profile.active_commitments = user_profile.active_commitments
        .checked_sub(1).ok_or(AtomxError::MathOverflow)?;

    emit!(CommitmentCompleted {
        commitment: commitment_key,
        owner: ctx.accounts.user.key(),
        reward_amount: total_user_receives,
        penalty_percent: early_count,
        early_finish_count: early_count,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CompleteCommitment<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [CommitmentAccount::SEED_PREFIX, commitment.owner.as_ref(), commitment.commitment_id.as_ref()],
        bump = commitment.bump,
        constraint = commitment.owner == user.key() @ AtomxError::UnauthorizedAuthority,
    )]
    pub commitment: Account<'info, CommitmentAccount>,

    #[account(mut, seeds = [UserProfile::SEED_PREFIX, user.key().as_ref()], bump = user_profile.bump)]
    pub user_profile: Account<'info, UserProfile>,

    #[account(mut, seeds = [GlobalStateAccount::SEED_PREFIX], bump = global_state.bump)]
    pub global_state: Account<'info, GlobalStateAccount>,

    #[account(mut, seeds = [b"escrow", commitment.key().as_ref()], bump, token::mint = global_state.usdc_mint, token::authority = commitment)]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(mut, address = global_state.global_vault)]
    pub global_vault: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_token_account.mint == global_state.usdc_mint, constraint = user_token_account.owner == user.key())]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
