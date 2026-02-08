use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::Instruction, program::invoke_signed};
use crate::state::{Agent, YieldStrategy, YieldProtocol};
use crate::constants::{AGENT_SEED, VAULT_SEED};
use crate::error::BankError;
use crate::events::*;
use crate::instructions::agentic_hooks::YIELD_STRATEGY_SEED;

/// Yield CPI Module - Real JitoSOL Integration
/// 
/// Program ID (Devnet): DPoo15wWDqpPJJtS2MUZ49aRxqz5ZaaJCJP4z8bLuib
/// Stake Pool: JitoY5pcAxWX6iyP2QdFwTznGb8A99PRCUCVVxB46WZ

pub mod jito_constants {
    use super::*;
    // Hardcoded for Devnet Parity
    pub const PROGRAM_ID: &str = "DPoo15wWDqpPJJtS2MUZ49aRxqz5ZaaJCJP4z8bLuib";
    pub const POOL_ID: &str = "JitoY5pcAxWX6iyP2QdFwTznGb8A99PRCUCVVxB46WZ";
}

#[derive(Accounts)]
pub struct DeployToJito<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [AGENT_SEED.as_bytes(), authority.key().as_ref()],
        bump,
        constraint = agent.owner == authority.key() @ BankError::InvalidAuthority,
    )]
    pub agent: Account<'info, Agent>,

    /// CHECK: Vault PDA (Source of SOL)
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), agent.key().as_ref()],
        bump = agent.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        seeds = [YIELD_STRATEGY_SEED.as_bytes(), agent.key().as_ref()],
        bump = yield_strategy.bump,
    )]
    pub yield_strategy: Account<'info, YieldStrategy>,

    // Jito / SPL Stake Pool Accounts
    /// CHECK: Jito Stake Pool Program
    pub jito_program: UncheckedAccount<'info>,
    /// CHECK: Jito Stake Pool Account
    #[account(mut)]
    pub stake_pool: UncheckedAccount<'info>,
    /// CHECK: Pool Withdrawal Authority
    pub pool_withdraw_authority: UncheckedAccount<'info>,
    /// CHECK: Reserve Stake Account
    #[account(mut)]
    pub reserve_stake: UncheckedAccount<'info>,
    /// CHECK: Manager Fee Account
    #[account(mut)]
    pub manager_fee: UncheckedAccount<'info>,
    /// CHECK: Destination for JitoSOL (Must be owned by Agent Vault)
    #[account(mut)]
    pub destination_pool_account: UncheckedAccount<'info>,
    /// CHECK: JitoSOL Mint
    #[account(mut)]
    pub pool_mint: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
    /// CHECK: Token Program
    pub token_program: UncheckedAccount<'info>,
}

pub fn deploy_to_jito_handler(ctx: Context<DeployToJito>, amount: u64) -> Result<()> {
    let agent = &ctx.accounts.agent;
    let strategy = &ctx.accounts.yield_strategy;

    // Verify protocol configuration
    require!(strategy.protocol == YieldProtocol::JitoSOL, BankError::InvalidProtocol);
    
    // Verify funds
    require!(ctx.accounts.vault.lamports() >= amount, BankError::InsufficientFunds);

    msg!("JITO_DEPOSIT: amount={} vault={}", amount, ctx.accounts.vault.key());

    // Construct "Deposit Sol" instruction manually (Discriminator 14 for SPL Stake Pool)
    // 0x0e = 14
    let mut data = vec![14u8];
    data.extend_from_slice(&amount.to_le_bytes());

    let accounts = vec![
        AccountMeta::new(ctx.accounts.stake_pool.key(), false),
        AccountMeta::new(ctx.accounts.pool_withdraw_authority.key(), false),
        AccountMeta::new(ctx.accounts.reserve_stake.key(), false),
        AccountMeta::new(ctx.accounts.vault.key(), true), // Signer
        AccountMeta::new(ctx.accounts.manager_fee.key(), false),
        AccountMeta::new(ctx.accounts.destination_pool_account.key(), false),
        AccountMeta::new(ctx.accounts.pool_mint.key(), false),
        AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
    ];

    let ix = Instruction {
        program_id: ctx.accounts.jito_program.key(),
        accounts,
        data,
    };

    // Sign with Vault seeds
    let seeds = &[
        VAULT_SEED.as_bytes(),
        agent.to_account_info().key.as_ref(),
        &[agent.vault_bump],
    ];
    let signer = &[&seeds[..]];

    invoke_signed(
        &ix,
        &[
            ctx.accounts.stake_pool.to_account_info(),
            ctx.accounts.pool_withdraw_authority.to_account_info(),
            ctx.accounts.reserve_stake.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.manager_fee.to_account_info(),
            ctx.accounts.destination_pool_account.to_account_info(),
            ctx.accounts.pool_mint.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        signer,
    )?;

    msg!("JITO_DEPOSIT_SUCCESS: Minted JitoSOL to {}", ctx.accounts.destination_pool_account.key());

    emit!(YieldInteract {
        agent: agent.key(),
        protocol: YieldProtocol::JitoSOL,
        action: "deposit".to_string(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawFromJito<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [AGENT_SEED.as_bytes(), authority.key().as_ref()],
        bump,
        constraint = agent.owner == authority.key() @ BankError::InvalidAuthority,
    )]
    pub agent: Account<'info, Agent>,

    /// CHECK: Vault PDA (Destination for SOL)
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), agent.key().as_ref()],
        bump = agent.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        seeds = [YIELD_STRATEGY_SEED.as_bytes(), agent.key().as_ref()],
        bump = yield_strategy.bump,
    )]
    pub yield_strategy: Account<'info, YieldStrategy>,

    // Jito / SPL Stake Pool Accounts
    /// CHECK: Jito Stake Pool Program
    pub jito_program: UncheckedAccount<'info>,
    /// CHECK: Jito Stake Pool Account
    #[account(mut)]
    pub stake_pool: UncheckedAccount<'info>,
    /// CHECK: Pool Withdrawal Authority
    pub pool_withdraw_authority: UncheckedAccount<'info>,
    /// CHECK: Source JitoSOL Account (Owned by Vault)
    #[account(mut)]
    pub vault_jito_account: UncheckedAccount<'info>,
    /// CHECK: Reserve Stake Account (Source of SOL)
    #[account(mut)]
    pub reserve_stake: UncheckedAccount<'info>,
    /// CHECK: Manager Fee Account
    #[account(mut)]
    pub manager_fee: UncheckedAccount<'info>,
    /// CHECK: JitoSOL Mint
    #[account(mut)]
    pub pool_mint: UncheckedAccount<'info>,
    
    /// CHECK: Clock Sysvar
    pub clock: UncheckedAccount<'info>,
    /// CHECK: Stake History Sysvar
    pub stake_history: UncheckedAccount<'info>,
    
    /// CHECK: Stake Program
    pub stake_program: UncheckedAccount<'info>,
    /// CHECK: Token Program
    pub token_program: UncheckedAccount<'info>,
}

pub fn withdraw_from_jito_handler(ctx: Context<WithdrawFromJito>, amount: u64) -> Result<()> {
    let agent = &ctx.accounts.agent;
    let strategy = &ctx.accounts.yield_strategy;

    require!(strategy.protocol == YieldProtocol::JitoSOL, BankError::InvalidProtocol);
    
    msg!("JITO_WITHDRAW: amount={} vault={}", amount, ctx.accounts.vault.key());

    // Construct "Withdraw Sol" instruction manually (Discriminator 16)
    // 0x10 = 16
    let mut data = vec![16u8];
    data.extend_from_slice(&amount.to_le_bytes());

    let accounts = vec![
        AccountMeta::new(ctx.accounts.stake_pool.key(), false),
        AccountMeta::new(ctx.accounts.pool_withdraw_authority.key(), false),
        AccountMeta::new(ctx.accounts.vault.key(), true), // User Transfer Authority (Vault)
        AccountMeta::new(ctx.accounts.vault_jito_account.key(), false), // Source Pool Account
        AccountMeta::new(ctx.accounts.reserve_stake.key(), false),
        AccountMeta::new(ctx.accounts.vault.key(), false), // Destination System Account (Vault)
        AccountMeta::new(ctx.accounts.manager_fee.key(), false),
        AccountMeta::new(ctx.accounts.pool_mint.key(), false),
        AccountMeta::new_readonly(ctx.accounts.clock.key(), false),
        AccountMeta::new_readonly(ctx.accounts.stake_history.key(), false),
        AccountMeta::new_readonly(ctx.accounts.stake_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
    ];

    let ix = Instruction {
        program_id: ctx.accounts.jito_program.key(),
        accounts,
        data,
    };

    // Sign with Vault seeds
    let seeds = &[
        VAULT_SEED.as_bytes(),
        agent.to_account_info().key.as_ref(),
        &[agent.vault_bump],
    ];
    let signer = &[&seeds[..]];

    invoke_signed(
        &ix,
        &[
            ctx.accounts.stake_pool.to_account_info(),
            ctx.accounts.pool_withdraw_authority.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.vault_jito_account.to_account_info(),
            ctx.accounts.reserve_stake.to_account_info(),
            ctx.accounts.manager_fee.to_account_info(),
            ctx.accounts.pool_mint.to_account_info(),
            ctx.accounts.clock.to_account_info(),
            ctx.accounts.stake_history.to_account_info(),
            ctx.accounts.stake_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        signer,
    )?;

    msg!("JITO_WITHDRAW_SUCCESS: Burned JitoSOL, received SOL in Vault");

    emit!(YieldInteract {
        agent: agent.key(),
        protocol: YieldProtocol::JitoSOL,
        action: "withdraw".to_string(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
