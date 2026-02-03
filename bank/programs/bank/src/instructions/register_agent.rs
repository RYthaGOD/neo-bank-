use anchor_lang::prelude::*;
use crate::state::Agent;
use crate::constants::{AGENT_SEED, VAULT_SEED};

#[derive(Accounts)]
#[instruction(name: String, spending_limit: u64, period_duration: i64)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + Agent::INIT_SPACE,
        seeds = [AGENT_SEED.as_bytes(), owner.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,

    /// CHECK: This is a PDA used as the agent's vault (wallet). It effectively has no data, just lamports.
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), agent.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterAgent>,
    name: String,
    spending_limit: u64,
    period_duration: i64,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    agent.owner = ctx.accounts.owner.key();
    agent.vault_bump = ctx.bumps.vault;
    agent.spending_limit = spending_limit;
    agent.period_duration = period_duration;
    agent.current_period_start = Clock::get()?.unix_timestamp;
    agent.current_period_spend = 0;
    agent.name = name;

    msg!("Agent registered: {}", agent.name);
    msg!("Vault address: {}", ctx.accounts.vault.key());

    Ok(())
}
