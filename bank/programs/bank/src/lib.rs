pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("FiarvoTx8WkneMjqX4T7KEpzX2Ya1FeBL991qGi49kFd");

#[program]
pub mod bank {
    use super::*;

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
}
