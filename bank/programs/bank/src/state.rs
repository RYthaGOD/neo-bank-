use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Agent {
    pub owner: Pubkey,                // The authority (keypair) controlling this agent
    pub vault_bump: u8,               // Bump for the vault PDA
    pub spending_limit: u64,          // Max lamports spendable per period
    pub period_duration: i64,         // Duration of a period in seconds (e.g., 86400 for 1 day)
    pub current_period_start: i64,    // Timestamp when the current period started
    pub current_period_spend: u64,    // Amount spent in the current period
    #[max_len(32)]
    pub name: String,                 // Human-readable name for the agent
    pub total_deposited: u64,         // Total lamports ever deposited
    pub staked_amount: u64,           // Lamports currently in "yield" status
    pub last_yield_timestamp: i64,    // Last time yield was accrued
}
