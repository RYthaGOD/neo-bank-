use anchor_lang::prelude::*;
use crate::state::BankConfig;
use crate::error::BankError;

/// Pause reasons for emergency control
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum PauseReason {
    None = 0,
    Security = 1,       // Security incident detected
    Maintenance = 2,    // Scheduled maintenance
    Upgrade = 3,        // Protocol upgrade in progress
}

impl From<u8> for PauseReason {
    fn from(val: u8) -> Self {
        match val {
            1 => PauseReason::Security,
            2 => PauseReason::Maintenance,
            3 => PauseReason::Upgrade,
            _ => PauseReason::None,
        }
    }
}

/// Toggle emergency pause state (admin only)
#[derive(Accounts)]
pub struct TogglePause<'info> {
    #[account(
        mut,
        has_one = admin @ BankError::Unauthorized,
    )]
    pub bank_config: Account<'info, BankConfig>,
    
    pub admin: Signer<'info>,
}

/// Check if bank is paused (utility)
pub fn require_not_paused(bank_config: &BankConfig) -> Result<()> {
    require!(!bank_config.paused, BankError::BankPaused);
    Ok(())
}

pub fn toggle_pause_handler(
    ctx: Context<TogglePause>,
    paused: bool,
    reason: u8,
) -> Result<()> {
    let bank_config = &mut ctx.accounts.bank_config;
    
    bank_config.paused = paused;
    bank_config.pause_reason = if paused { reason } else { 0 };
    
    msg!(
        "Bank pause state: {} (reason: {})",
        paused,
        reason
    );
    
    Ok(())
}
