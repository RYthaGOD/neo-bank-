use anchor_lang::prelude::*;

#[error_code]
pub enum BankError {
    #[msg("Spending limit exceeded for the current period.")]
    SpendingLimitExceeded,
    #[msg("Invalid authority.")]
    InvalidAuthority,
    #[msg("Amount exceeds balance.")]
    InsufficientFunds,
}
