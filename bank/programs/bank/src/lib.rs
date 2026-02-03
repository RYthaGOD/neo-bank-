pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("BGTbi1d1n6BzZdyCvr4gEAY3DbC5sDGA4N5EnTRwcrh");

#[program]
pub mod bank {
    use super::*;

    pub fn initialize_bank(ctx: Context<InitializeBank>, fee_bps: u16) -> Result<()> {
        instructions::initialize_bank::handler(ctx, fee_bps)
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        spending_limit: u64,
        period_duration: i64,
    ) -> Result<()> {
        instructions::register_agent::handler(ctx, name, spending_limit, period_duration)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn accrue_yield(ctx: Context<AccrueYield>) -> Result<()> {
        instructions::accrue_yield::handler(ctx)
    }

    /// Validate a transaction intent BEFORE executing.
    /// Critical for autonomous agents that need certainty before committing to trades.
    /// This is a read-only check that returns Ok if the withdrawal would succeed.
    pub fn validate_intent(
        ctx: Context<ValidateIntent>,
        intent: instructions::validate_intent::TransactionIntent,
    ) -> Result<()> {
        instructions::validate_intent::handler(ctx, intent)
    }

    /// Configure an agentic yield strategy hook.
    /// Set conditions that auto-deploy vault funds to DeFi protocols.
    pub fn configure_yield_strategy(
        ctx: Context<ConfigureYieldStrategy>,
        condition: state::HookCondition,
        protocol: state::YieldProtocol,
        deploy_percentage: u8,
        enabled: bool,
    ) -> Result<()> {
        instructions::agentic_hooks::configure_yield_strategy_handler(
            ctx, condition, protocol, deploy_percentage, enabled
        )
    }

    /// Trigger a yield hook (permissionless crank).
    /// Anyone can call this when conditions are met.
    pub fn trigger_yield_hook(ctx: Context<TriggerYieldHook>) -> Result<()> {
        instructions::agentic_hooks::trigger_yield_hook_handler(ctx)
    }

    /// Check if a yield hook would trigger (read-only status check).
    pub fn check_hook_status(ctx: Context<CheckHookStatus>) -> Result<()> {
        instructions::agentic_hooks::check_hook_status_handler(ctx)
    }

    // ============ TREASURY GOVERNANCE ============

    /// Initialize the treasury governance system with admin agents.
    pub fn initialize_governance(
        ctx: Context<InitializeGovernance>,
        initial_admins: Vec<Pubkey>,
        threshold: u8,
    ) -> Result<()> {
        instructions::treasury_governance::initialize_governance_handler(ctx, initial_admins, threshold)
    }

    /// Create a treasury spending proposal (admin only).
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        destination: Pubkey,
        amount: u64,
        memo: String,
    ) -> Result<()> {
        instructions::treasury_governance::create_proposal_handler(ctx, destination, amount, memo)
    }

    /// Vote on a treasury proposal (admin only).
    pub fn vote_proposal(
        ctx: Context<VoteProposal>,
        proposal_id: u64,
        approve: bool,
    ) -> Result<()> {
        instructions::treasury_governance::vote_proposal_handler(ctx, proposal_id, approve)
    }

    /// Execute an approved proposal (permissionless).
    pub fn execute_proposal(ctx: Context<ExecuteProposal>, proposal_id: u64) -> Result<()> {
        instructions::treasury_governance::execute_proposal_handler(ctx, proposal_id)
    }
}
