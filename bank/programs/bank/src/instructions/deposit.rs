use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::Agent;
use crate::constants::{AGENT_SEED, VAULT_SEED};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [AGENT_SEED.as_bytes(), owner.key().as_ref()],
        bump,
        has_one = owner
    )]
    pub agent: Account<'info, Agent>,

    /// CHECK: Validated via seeds
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), agent.key().as_ref()],
        bump = agent.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn deposit_handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let agent = &mut ctx.accounts.agent;

    // Transfer from owner to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.owner.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.system_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    transfer(cpi_ctx, amount)?;

    // Update state
    agent.total_deposited = agent.total_deposited.checked_add(amount).unwrap();
    // Conceptually "stake" 80% of all deposits for yield
    agent.staked_amount = agent.total_deposited.checked_mul(8) .unwrap() / 10;
    
    if agent.last_yield_timestamp == 0 {
        agent.last_yield_timestamp = Clock::get()?.unix_timestamp;
    }

    msg!("Deposited {} lamports. Total: {}", amount, agent.total_deposited);
    
    Ok(())
}
