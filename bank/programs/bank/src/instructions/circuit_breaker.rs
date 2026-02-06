use anchor_lang::prelude::*;
use crate::state::BankConfig;
use crate::constants::CONFIG_SEED;
use crate::error::BankError;

/// Reset the suspicious activity counter (admin only)
#[derive(Accounts)]
pub struct ResetSecurityCounter<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED.as_bytes()],
        bump,
        has_one = admin @ BankError::Unauthorized,
    )]
    pub config: Account<'info, BankConfig>,
}

pub fn reset_security_counter_handler(ctx: Context<ResetSecurityCounter>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let old_count = config.suspicious_activity_count;
    
    config.suspicious_activity_count = 0;
    config.last_security_check = Clock::get()?.unix_timestamp;
    
    msg!("🔄 Security counter reset by admin");
    msg!("   Previous count: {}", old_count);
    msg!("   New count: 0");
    
    Ok(())
}

/// Update auto-pause threshold (admin only)
#[derive(Accounts)]
pub struct UpdateAutoThreshold<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED.as_bytes()],
        bump,
        has_one = admin @ BankError::Unauthorized,
    )]
    pub config: Account<'info, BankConfig>,
}

pub fn update_auto_threshold_handler(
    ctx: Context<UpdateAutoThreshold>,
    new_threshold: u32,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let old_threshold = config.auto_pause_threshold;
    
    config.auto_pause_threshold = new_threshold;
    
    msg!("⚙️  Auto-pause threshold updated by admin");
    msg!("   Old threshold: {}", old_threshold);
    msg!("   New threshold: {}", new_threshold);
    msg!("   {} = disabled", if new_threshold == 0 { "Circuit breaker" } else { "" });
    
    Ok(())
}
