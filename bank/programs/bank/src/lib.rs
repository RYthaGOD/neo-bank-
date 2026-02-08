pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod events;


use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;
pub use events::*;

declare_id!("BGTbi1d1n6BzZdyCvr4gEAY3DbC5sDGA4N5EnTRwcrh");

#[program]
pub mod bank {
    use super::*;

    pub fn initialize_bank(ctx: Context<InitializeBank>, fee_bps: u16) -> Result<()> {
        instructions::initialize_bank::initialize_bank_handler(ctx, fee_bps)
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        spending_limit: u64,
        period_duration: i64,
    ) -> Result<()> {
        instructions::register_agent::register_agent_handler(ctx, name, spending_limit, period_duration)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::withdraw_handler(ctx, amount)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::deposit_handler(ctx, amount)
    }

    pub fn accrue_yield(ctx: Context<AccrueYield>) -> Result<()> {
        instructions::accrue_yield::accrue_yield_handler(ctx)
    }

    /// Validate a transaction intent BEFORE executing.
    /// Critical for autonomous agents that need certainty before committing to trades.
    /// This is a read-only check that returns Ok if the withdrawal would succeed.
    pub fn validate_intent(
        ctx: Context<ValidateIntent>,
        intent: instructions::validate_intent::TransactionIntent,
    ) -> Result<()> {
        instructions::validate_intent::validate_intent_handler(ctx, intent)
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

    // ============ REAL YIELD (JITO) ============

    /// Deploy funds to JitoSOL Liquid Staking.
    /// Uses CPI to Jito Stake Pool (Devnet: DPoo15wWDqpPJJtS2MUZ49aRxqz5ZaaJCJP4z8bLuib)
    pub fn deploy_to_jito(ctx: Context<DeployToJito>, amount: u64) -> Result<()> {
        instructions::yield_cpi::deploy_to_jito_handler(ctx, amount)
    }

    /// Withdraw funds from JitoSOL.
    /// Burns JitoSOL and returns SOL from reserve stake.
    pub fn withdraw_from_jito(ctx: Context<WithdrawFromJito>, amount: u64) -> Result<()> {
        instructions::yield_cpi::withdraw_from_jito_handler(ctx, amount)
    }

    // ============ EMERGENCY CONTROLS ============

    /// Toggle emergency pause (admin only).
    /// When paused, withdrawals and yield deployments are blocked.
    /// Reason codes: 0=none, 1=security, 2=maintenance, 3=upgrade
    pub fn toggle_pause(ctx: Context<TogglePause>, paused: bool, reason: u8) -> Result<()> {
        instructions::emergency_pause::toggle_pause_handler(ctx, paused, reason)
    }

    // ============ CIRCUIT BREAKER ADMIN ============

    /// Reset suspicious activity counter (admin only).
    pub fn reset_security_counter(ctx: Context<ResetSecurityCounter>) -> Result<()> {
        instructions::circuit_breaker::reset_security_counter_handler(ctx)
    }

    /// Update auto-pause threshold (admin only).
    /// Set to 0 to disable circuit breaker.
    pub fn update_auto_threshold(ctx: Context<UpdateAutoThreshold>, new_threshold: u32) -> Result<()> {
        instructions::circuit_breaker::update_auto_threshold_handler(ctx, new_threshold)
    }

    // ============ DELEGATED ACCESS ============

    /// Authorize a new delegate keypair for an agent vault.
    pub fn add_delegate(
        ctx: Context<AddDelegate>,
        delegate_key: Pubkey,
        can_spend: bool,
        can_manage_yield: bool,
        valid_until: i64,
    ) -> Result<()> {
        instructions::delegate::add_delegate_handler(ctx, delegate_key, can_spend, can_manage_yield, valid_until)
    }

    /// Remove a delegate keypair.
    pub fn remove_delegate(ctx: Context<RemoveDelegate>) -> Result<()> {
        instructions::delegate::remove_delegate_handler(ctx)
    }
}
