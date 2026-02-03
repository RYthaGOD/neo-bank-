use anchor_lang::prelude::*;
use crate::state::Agent;
use crate::constants::{AGENT_SEED};

#[derive(Accounts)]
pub struct AccrueYield<'info> {
    #[account(
        mut,
        seeds = [AGENT_SEED.as_bytes(), agent.owner.as_ref()],
        bump,
    )]
    pub agent: Account<'info, Agent>,
}

pub fn handler(ctx: Context<AccrueYield>) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    if agent.staked_amount == 0 {
        return Ok(());
    }

    // Simple simulated yield: 5% APY
    // Calculated per second: (Amount * 0.05) / (365 * 24 * 3600)
    let elapsed = current_time.checked_sub(agent.last_yield_timestamp).unwrap_or(0);
    
    if elapsed > 0 {
        // Yield = (staked * 5 * elapsed) / (100 * 365 * 24 * 3600)
        // To avoid overflow/underflow, we use a simple basis point calculation
        let yield_accrued = (agent.staked_amount as u128)
            .checked_mul(5).unwrap()
            .checked_mul(elapsed as u128).unwrap()
            .checked_div(3153600000).unwrap(); // 100 * seconds in year

        if yield_accrued > 0 {
            // In a real bank, we'd mint or transfer real tokens here.
            // For the hackathon MVP, we increase the conceptual "staked balance"
            // effectively simulating interest paid into the vault.
            agent.staked_amount = agent.staked_amount.checked_add(yield_accrued as u64).unwrap();
            msg!("Accrued {} lamports in yield", yield_accrued);
        }
        
        agent.last_yield_timestamp = current_time;
    }

    Ok(())
}
