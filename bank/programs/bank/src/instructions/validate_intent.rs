use anchor_lang::prelude::*;
use crate::state::Agent;
use crate::constants::AGENT_SEED;
use crate::error::BankError;

/// Transaction Intent - allows agents to pre-validate a withdrawal before committing.
/// This is CRITICAL for autonomous agents that need certainty before executing trades.
/// 
/// Returns Ok(()) if the intent would succeed, or an error explaining why it would fail.
/// Does NOT modify state - this is a read-only validation check.

#[derive(Accounts)]
pub struct ValidateIntent<'info> {
    /// The agent owner requesting validation (can be a delegate in the future)
    pub requester: Signer<'info>,

    #[account(
        seeds = [AGENT_SEED.as_bytes(), agent.owner.as_ref()],
        bump,
    )]
    pub agent: Account<'info, Agent>,

    /// CHECK: Vault to check balance
    #[account(
        seeds = [b"vault", agent.key().as_ref()],
        bump = agent.vault_bump,
    )]
    pub vault: SystemAccount<'info>,
}

/// The intent details an agent wants to validate
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TransactionIntent {
    /// Amount in lamports the agent intends to spend
    pub amount: u64,
    /// Human/AI readable description of the trade (e.g., "Swap 1 SOL for USDC on Jupiter")
    pub memo: String,
    /// Optional: Unix timestamp when the agent plans to execute (for time-sensitive checks)
    pub execution_time: Option<i64>,
}

/// Result of intent validation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IntentValidation {
    pub valid: bool,
    pub remaining_limit: u64,
    pub vault_balance: u64,
    pub current_period_spend: u64,
    pub period_resets_at: i64,
    pub reason: Option<String>,
}

pub fn validate_intent_handler(ctx: Context<ValidateIntent>, intent: TransactionIntent) -> Result<()> {
    let agent = &ctx.accounts.agent;
    let vault_balance = ctx.accounts.vault.lamports();
    let clock = Clock::get()?;
    
    // Determine the effective time for validation
    let check_time = intent.execution_time.unwrap_or(clock.unix_timestamp);
    
    // Calculate period state at the intended execution time
    let (period_spend, period_start) = if check_time > agent.current_period_start + agent.period_duration {
        // Period will have reset by execution time
        (0u64, check_time)
    } else {
        (agent.current_period_spend, agent.current_period_start)
    };
    
    let remaining_in_period = agent.spending_limit.saturating_sub(period_spend);
    let period_resets_at = period_start + agent.period_duration;
    
    // Check 1: Spending limit
    if intent.amount > remaining_in_period {
        msg!("INTENT_REJECTED: Amount {} exceeds remaining period limit {}", 
             intent.amount, remaining_in_period);
        msg!("INTENT_MEMO: {}", intent.memo);
        msg!("INTENT_RESULT: {{\"valid\":false,\"reason\":\"spending_limit_exceeded\",\"remaining\":{},\"requested\":{}}}", 
             remaining_in_period, intent.amount);
        return err!(BankError::IntentWouldExceedLimit);
    }
    
    // Check 2: Vault balance
    if intent.amount > vault_balance {
        msg!("INTENT_REJECTED: Amount {} exceeds vault balance {}", 
             intent.amount, vault_balance);
        msg!("INTENT_MEMO: {}", intent.memo);
        msg!("INTENT_RESULT: {{\"valid\":false,\"reason\":\"insufficient_funds\",\"balance\":{},\"requested\":{}}}", 
             vault_balance, intent.amount);
        return err!(BankError::IntentInsufficientFunds);
    }
    
    // Intent is valid!
    msg!("INTENT_APPROVED: {} lamports for '{}'", intent.amount, intent.memo);
    msg!("INTENT_RESULT: {{\"valid\":true,\"remaining_after\":{},\"period_resets_at\":{}}}", 
         remaining_in_period - intent.amount, period_resets_at);
    
    Ok(())
}
