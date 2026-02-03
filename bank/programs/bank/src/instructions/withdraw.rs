use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::Agent;
use crate::constants::{AGENT_SEED, VAULT_SEED};
use crate::error::BankError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [AGENT_SEED.as_bytes(), owner.key().as_ref()],
        bump,
        has_one = owner @ BankError::InvalidAuthority,
    )]
    pub agent: Account<'info, Agent>,

    /// CHECK: Validated via seeds
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), agent.key().as_ref()],
        bump = agent.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// CHECK: Arbitrary destination
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // reset period if needed
    if current_time > agent.current_period_start + agent.period_duration {
        agent.current_period_start = current_time;
        agent.current_period_spend = 0;
    }

    // check limits
    let new_spend = agent.current_period_spend.checked_add(amount).unwrap();
    if new_spend > agent.spending_limit {
        return err!(BankError::SpendingLimitExceeded);
    }
    
    // check balance
    if ctx.accounts.vault.lamports() < amount {
        return err!(BankError::InsufficientFunds);
    }

    // update state
    agent.current_period_spend = new_spend;

    // transfer
    let seeds = &[
        VAULT_SEED.as_bytes(),
        agent.to_account_info().key.as_ref(),
        &[agent.vault_bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.destination.to_account_info(),
    };
    let cpi_program = ctx.accounts.system_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

    transfer(cpi_ctx, amount)?;

    msg!("Withdrew {} lamports. Period spend: {}/{}", amount, agent.current_period_spend, agent.spending_limit);

    Ok(())
}
