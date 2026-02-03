pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("BGTbi1d1n6BzZdyCvr4gEAY3DbC5sDGA4N5EnTRwcrh");

#[program]
pub mod bank {
    use super::*;

    pub fn initialize_bank(ctx: Context<InitializeBank>, fee_bps: u16) -> Result<()> {
        instructions::initialize_bank::handler(ctx, fee_bps)
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        spending_limit: u64,
        period_duration: i64,
    ) -> Result<()> {
        instructions::register_agent::handler(ctx, name, spending_limit, period_duration)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn accrue_yield(ctx: Context<AccrueYield>) -> Result<()> {
        instructions::accrue_yield::handler(ctx)
    }

    /// Validate a transaction intent BEFORE executing.
    /// Critical for autonomous agents that need certainty before committing to trades.
    /// This is a read-only check that returns Ok if the withdrawal would succeed.
    pub fn validate_intent(
        ctx: Context<ValidateIntent>,
        intent: instructions::validate_intent::TransactionIntent,
    ) -> Result<()> {
        instructions::validate_intent::handler(ctx, intent)
    }
}
