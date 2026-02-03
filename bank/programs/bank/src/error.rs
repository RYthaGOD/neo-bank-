use anchor_lang::prelude::*;

#[error_code]
pub enum BankError {
    #[msg("Spending limit exceeded for the current period.")]
    SpendingLimitExceeded,
    #[msg("Invalid authority.")]
    InvalidAuthority,
    #[msg("Amount exceeds balance.")]
    InsufficientFunds,
    #[msg("Intent validation failed: would exceed spending limit.")]
    IntentWouldExceedLimit,
    #[msg("Intent validation failed: insufficient vault balance.")]
    IntentInsufficientFunds,
    #[msg("Hook is disabled.")]
    HookDisabled,
    #[msg("Hook condition not met.")]
    HookConditionNotMet,
    #[msg("Invalid percentage (must be 0-100).")]
    InvalidPercentage,
}
