use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::{Agent, BankConfig};
use crate::constants::{AGENT_SEED, VAULT_SEED, CONFIG_SEED, TREASURY_SEED};

#[derive(Accounts)]
pub struct AccrueYield<'info> {
    #[account(
        mut,
        seeds = [AGENT_SEED.as_bytes(), agent.owner.as_ref()],
        bump,
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        seeds = [CONFIG_SEED.as_bytes()],
        bump,
    )]
    pub config: Account<'info, BankConfig>,

    /// CHECK: Validated via seeds
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), agent.key().as_ref()],
        bump = agent.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// CHECK: Treasury PDA to pay yield from
    #[account(
        mut,
        seeds = [TREASURY_SEED.as_bytes()],
        bump = config.treasury_bump,
    )]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn accrue_yield_handler(ctx: Context<AccrueYield>) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    if agent.staked_amount == 0 {
        // No funds marked as "staked", so no yield to accrue
        return Ok(());
    }

    // 5% APY (Fee-Funded)
    // Calculated per second: (Amount * 0.05) / (365 * 24 * 3600)
    let elapsed = current_time.checked_sub(agent.last_yield_timestamp).unwrap_or(0);
    
    if elapsed > 0 {
        // Yield = (staked * 5 * elapsed) / (100 * 365 * 24 * 3600)
        let yield_accrued = (agent.staked_amount as u128)
            .checked_mul(5).unwrap()
            .checked_mul(elapsed as u128).unwrap()
            .checked_div(3153600000).unwrap(); // 100 * seconds in year

        if yield_accrued > 0 {
            // Check if treasury has enough funds
            let treasury_balance = ctx.accounts.treasury.lamports();
            let payout = if treasury_balance >= yield_accrued as u64 {
                yield_accrued as u64
            } else {
                msg!("WARNING: Treasury running low, paying partial yield");
                treasury_balance
            };

            if payout > 0 {
                // Transfer REAL funds from Treasury to Agent Vault
                let seeds = &[
                    TREASURY_SEED.as_bytes(),
                    &[ctx.accounts.config.treasury_bump],
                ];
                let signer = &[&seeds[..]];

                let cpi_accounts = Transfer {
                    from: ctx.accounts.treasury.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                };
                let cpi_program = ctx.accounts.system_program.to_account_info();
                let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

                transfer(cpi_ctx, payout)?;

                // Update agent state
                agent.staked_amount = agent.staked_amount.checked_add(payout).unwrap();
                agent.total_deposited = agent.total_deposited.checked_add(payout).unwrap();
                
                msg!("YIELD_PAID: amount={} source=treasury agent={}", payout, agent.key());
            } else {
                msg!("YIELD_SKIPPED: Treasury empty");
            }
        }
        
        agent.last_yield_timestamp = current_time;
    }

    Ok(())
}
