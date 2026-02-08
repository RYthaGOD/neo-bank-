use anchor_lang::prelude::*;
use crate::state::BankConfig;
use crate::constants::{CONFIG_SEED, TREASURY_SEED};

#[derive(Accounts)]
pub struct InitializeBank<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + BankConfig::INIT_SPACE,
        seeds = [CONFIG_SEED.as_bytes()],
        bump
    )]
    pub config: Account<'info, BankConfig>,

    /// CHECK: Treasury PDA to hold protocol fees
    #[account(
        mut,
        seeds = [TREASURY_SEED.as_bytes()],
        bump
    )]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_bank_handler(ctx: Context<InitializeBank>, fee_bps: u16) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.protocol_fee_bps = fee_bps;
    config.treasury_bump = ctx.bumps.treasury;
    config.total_fees_collected = 0;
    config.paused = false;
    config.pause_reason = 0;
    
    // Circuit breaker defaults
    config.suspicious_activity_count = 0;
    config.auto_pause_threshold = 10; // Auto-pause after 10 suspicious activities
    config.last_security_check = 0;

    msg!("Bank initialized. Admin: {}, Fee Bps: {}", config.admin, fee_bps);
    msg!("Circuit breaker enabled: auto-pause after {} suspicious activities", config.auto_pause_threshold);
    Ok(())
}
