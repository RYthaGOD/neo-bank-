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
    // Treasury Governance errors
    #[msg("Too many admins (max 5).")]
    TooManyAdmins,
    #[msg("Invalid threshold (must be > 0 and <= admin count).")]
    InvalidThreshold,
    #[msg("Not an admin.")]
    NotAdmin,
    #[msg("Insufficient treasury funds.")]
    InsufficientTreasuryFunds,
    #[msg("Proposal is not pending.")]
    ProposalNotPending,
    #[msg("Proposal has expired.")]
    ProposalExpired,
    #[msg("Proposal is not approved.")]
    ProposalNotApproved,
    #[msg("Invalid destination.")]
    InvalidDestination,
}
