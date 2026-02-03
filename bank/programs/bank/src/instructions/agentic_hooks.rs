use anchor_lang::prelude::*;
use crate::state::{Agent, YieldStrategy, HookCondition, YieldProtocol};
use crate::constants::{AGENT_SEED, VAULT_SEED};
use crate::error::BankError;

/// Agentic Hooks - Auto-deploy vault yield based on on-chain conditions.
/// 
/// This enables truly autonomous treasury management:
/// - Configure strategy once
/// - Anyone can crank the trigger when conditions are met
/// - Vault auto-deploys to yield protocols
/// 
/// SAFETY: Only the agent owner can configure. Anyone can trigger (permissionless crank).

pub const YIELD_STRATEGY_SEED: &str = "yield_strategy";

/// ============ CONFIGURE YIELD STRATEGY ============

#[derive(Accounts)]
pub struct ConfigureYieldStrategy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [AGENT_SEED.as_bytes(), owner.key().as_ref()],
        bump,
        has_one = owner @ BankError::InvalidAuthority,
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + YieldStrategy::INIT_SPACE,
        seeds = [YIELD_STRATEGY_SEED.as_bytes(), agent.key().as_ref()],
        bump,
    )]
    pub yield_strategy: Account<'info, YieldStrategy>,

    pub system_program: Program<'info, System>,
}

pub fn configure_yield_strategy_handler(
    ctx: Context<ConfigureYieldStrategy>,
    condition: HookCondition,
    protocol: YieldProtocol,
    deploy_percentage: u8,
    enabled: bool,
) -> Result<()> {
    require!(deploy_percentage <= 100, BankError::InvalidPercentage);
    
    let strategy = &mut ctx.accounts.yield_strategy;
    
    strategy.agent = ctx.accounts.agent.key();
    strategy.condition = condition;
    strategy.protocol = protocol;
    strategy.deploy_percentage = deploy_percentage;
    strategy.enabled = enabled;
    strategy.last_triggered = 0;
    strategy.trigger_count = 0;
    strategy.bump = ctx.bumps.yield_strategy;
    
    msg!("HOOK_CONFIGURED: agent={}, protocol={:?}, percentage={}, enabled={}", 
         ctx.accounts.agent.key(), protocol, deploy_percentage, enabled);
    
    Ok(())
}

/// ============ TRIGGER YIELD HOOK ============
/// Permissionless - anyone can call this to trigger the hook when conditions are met

#[derive(Accounts)]
pub struct TriggerYieldHook<'info> {
    /// Anyone can trigger (permissionless crank)
    pub cranker: Signer<'info>,

    #[account(
        mut,
        seeds = [AGENT_SEED.as_bytes(), agent.owner.as_ref()],
        bump,
    )]
    pub agent: Account<'info, Agent>,

    /// CHECK: Vault to check balance
    #[account(
        seeds = [VAULT_SEED.as_bytes(), agent.key().as_ref()],
        bump = agent.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [YIELD_STRATEGY_SEED.as_bytes(), agent.key().as_ref()],
        bump = yield_strategy.bump,
        constraint = yield_strategy.agent == agent.key() @ BankError::InvalidAuthority,
    )]
    pub yield_strategy: Account<'info, YieldStrategy>,
}

pub fn trigger_yield_hook_handler(ctx: Context<TriggerYieldHook>) -> Result<()> {
    let strategy = &mut ctx.accounts.yield_strategy;
    let agent = &mut ctx.accounts.agent;
    let clock = Clock::get()?;
    
    // Check if hook is enabled
    require!(strategy.enabled, BankError::HookDisabled);
    
    // Check if condition is met
    let condition_met = match strategy.condition {
        HookCondition::BalanceAbove { threshold } => {
            agent.staked_amount >= threshold
        },
        HookCondition::TimeElapsed { interval } => {
            let elapsed = clock.unix_timestamp - strategy.last_triggered;
            elapsed >= interval
        },
        HookCondition::YieldAbove { threshold } => {
            // Calculate pending yield (same formula as accrue_yield)
            let elapsed = clock.unix_timestamp - agent.last_yield_timestamp;
            let pending_yield = (agent.staked_amount as u128)
                .checked_mul(5).unwrap()
                .checked_mul(elapsed as u128).unwrap()
                .checked_div(3153600000).unwrap() as u64;
            pending_yield >= threshold
        },
    };
    
    require!(condition_met, BankError::HookConditionNotMet);
    
    // Execute the hook action based on protocol
    // For MVP, we simulate deployment by logging and updating state
    // Future: Add CPI calls to Jupiter/Meteora/Marinade
    
    let deploy_amount = (agent.staked_amount as u128)
        .checked_mul(strategy.deploy_percentage as u128).unwrap()
        .checked_div(100).unwrap() as u64;
    
    match strategy.protocol {
        YieldProtocol::Internal => {
            // Already earning internal yield, just log
            msg!("HOOK_TRIGGERED: Internal yield confirmed. Amount: {}", deploy_amount);
        },
        YieldProtocol::Jupiter => {
            // Future: CPI to Jupiter for yield aggregation
            msg!("HOOK_TRIGGERED: Would deploy {} to Jupiter (CPI pending)", deploy_amount);
        },
        YieldProtocol::Meteora => {
            // Future: CPI to Meteora for LP
            msg!("HOOK_TRIGGERED: Would deploy {} to Meteora LP (CPI pending)", deploy_amount);
        },
        YieldProtocol::Marinade => {
            // Future: CPI to Marinade for liquid staking
            msg!("HOOK_TRIGGERED: Would deploy {} to Marinade (CPI pending)", deploy_amount);
        },
    }
    
    // Update strategy state
    strategy.last_triggered = clock.unix_timestamp;
    strategy.trigger_count = strategy.trigger_count.checked_add(1).unwrap();
    
    msg!("HOOK_RESULT: {{\"protocol\":\"{:?}\",\"amount\":{},\"trigger_count\":{}}}", 
         strategy.protocol, deploy_amount, strategy.trigger_count);
    
    Ok(())
}

/// ============ GET HOOK STATUS ============
/// Read-only check if hook would trigger

#[derive(Accounts)]
pub struct CheckHookStatus<'info> {
    #[account(
        seeds = [AGENT_SEED.as_bytes(), agent.owner.as_ref()],
        bump,
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        seeds = [YIELD_STRATEGY_SEED.as_bytes(), agent.key().as_ref()],
        bump = yield_strategy.bump,
    )]
    pub yield_strategy: Account<'info, YieldStrategy>,
}

pub fn check_hook_status_handler(ctx: Context<CheckHookStatus>) -> Result<()> {
    let strategy = &ctx.accounts.yield_strategy;
    let agent = &ctx.accounts.agent;
    let clock = Clock::get()?;
    
    let (condition_met, reason) = match strategy.condition {
        HookCondition::BalanceAbove { threshold } => {
            let met = agent.staked_amount >= threshold;
            let reason = format!("balance {} vs threshold {}", agent.staked_amount, threshold);
            (met, reason)
        },
        HookCondition::TimeElapsed { interval } => {
            let elapsed = clock.unix_timestamp - strategy.last_triggered;
            let met = elapsed >= interval;
            let reason = format!("elapsed {}s vs interval {}s", elapsed, interval);
            (met, reason)
        },
        HookCondition::YieldAbove { threshold } => {
            let elapsed = clock.unix_timestamp - agent.last_yield_timestamp;
            let pending_yield = (agent.staked_amount as u128)
                .checked_mul(5).unwrap()
                .checked_mul(elapsed as u128).unwrap()
                .checked_div(3153600000).unwrap() as u64;
            let met = pending_yield >= threshold;
            let reason = format!("pending_yield {} vs threshold {}", pending_yield, threshold);
            (met, reason)
        },
    };
    
    msg!("HOOK_STATUS: {{\"enabled\":{},\"would_trigger\":{},\"reason\":\"{}\",\"trigger_count\":{}}}", 
         strategy.enabled, condition_met, reason, strategy.trigger_count);
    
    Ok(())
}
