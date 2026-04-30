use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::GlobalStateAccount;
use crate::events::GlobalInitialized;

/// Initialize the global protocol state and the single USDC vault.
/// This should be called once after program deployment.
pub fn handler(ctx: Context<InitGlobal>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;

    global_state.authority = ctx.accounts.authority.key();
    global_state.usdc_mint = ctx.accounts.usdc_mint.key();
    global_state.global_vault = ctx.accounts.global_vault.key();
    global_state.charity_balance = 0;
    global_state.rewards_balance = 0;
    global_state.treasury_balance = 0;
    global_state.backup_balance = 0;
    global_state.total_slashed = 0;
    global_state.total_rewarded = 0;
    global_state.bump = ctx.bumps.global_state;
    global_state.vault_bump = ctx.bumps.global_vault;

    emit!(GlobalInitialized {
        authority: ctx.accounts.authority.key(),
        global_vault: ctx.accounts.global_vault.key(),
        usdc_mint: ctx.accounts.usdc_mint.key(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct InitGlobal<'info> {
    /// Deployer / admin — pays for account creation
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Global state PDA — initialized once
    #[account(
        init,
        payer = authority,
        space = GlobalStateAccount::SPACE,
        seeds = [GlobalStateAccount::SEED_PREFIX],
        bump,
    )]
    pub global_state: Account<'info, GlobalStateAccount>,

    /// Single USDC vault for the entire protocol
    #[account(
        init,
        payer = authority,
        seeds = [GlobalStateAccount::VAULT_SEED],
        bump,
        token::mint = usdc_mint,
        token::authority = global_state,
    )]
    pub global_vault: Account<'info, TokenAccount>,

    /// USDC mint
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
