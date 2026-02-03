use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct BankConfig {
    pub admin: Pubkey,
    pub protocol_fee_bps: u16,        // Fee in basis points (e.g., 25 = 0.25%)
    pub treasury_bump: u8,
    pub total_fees_collected: u64,
}

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

/// Conditions that can trigger an agentic hook
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum HookCondition {
    /// Trigger when staked_amount exceeds threshold (in lamports)
    BalanceAbove { threshold: u64 },
    /// Trigger when time since last deploy exceeds interval (in seconds)
    TimeElapsed { interval: i64 },
    /// Trigger when accrued yield exceeds threshold
    YieldAbove { threshold: u64 },
}

/// Target DeFi protocols for yield deployment
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum YieldProtocol {
    /// Simulated internal yield (current behavior)
    Internal,
    /// Jupiter aggregated yield (future CPI)
    Jupiter,
    /// Meteora LP positions (future CPI)
    Meteora,
    /// Marinade staked SOL (future CPI)
    Marinade,
}

/// Agentic Hook: Auto-deploy yield strategy configuration
#[account]
#[derive(InitSpace)]
pub struct YieldStrategy {
    pub agent: Pubkey,                // The agent this strategy belongs to
    pub condition: HookCondition,     // When to trigger the hook
    pub protocol: YieldProtocol,      // Where to deploy yield
    pub deploy_percentage: u8,        // Percentage of staked amount to deploy (0-100)
    pub enabled: bool,                // Is the hook active?
    pub last_triggered: i64,          // Last trigger timestamp
    pub trigger_count: u64,           // Number of times triggered
    pub bump: u8,                     // PDA bump
}
