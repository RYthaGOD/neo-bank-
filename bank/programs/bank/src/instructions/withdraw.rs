use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::{Agent, BankConfig, Delegate};
use crate::constants::{AGENT_SEED, VAULT_SEED, CONFIG_SEED, TREASURY_SEED};
use crate::error::BankError;
use crate::instructions::delegate::DELEGATE_SEED;
use crate::events::*;
use crate::instructions::emergency_pause::require_not_paused;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // Can be Owner OR Delegate

    #[account(
        mut,
        seeds = [AGENT_SEED.as_bytes(), agent.owner.as_ref()],
        bump,
    )]
    pub agent: Account<'info, Agent>,

    /// CHECK: Validated via seeds
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), agent.key().as_ref()],
        bump = agent.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// CHECK: Arbitrary destination
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED.as_bytes()],
        bump
    )]
    pub config: Account<'info, BankConfig>,

    /// CHECK: Treasury PDA to hold protocol fees
    #[account(
        mut,
        seeds = [TREASURY_SEED.as_bytes()],
        bump = config.treasury_bump,
    )]
    pub treasury: SystemAccount<'info>,

    /// Optional Delegate Record
    /// Must be provided if authority != agent.owner
    #[account(
        seeds = [
            DELEGATE_SEED.as_bytes(), 
            agent.key().as_ref(), 
            authority.key().as_ref()
        ],
        bump,
        constraint = delegate_record.agent == agent.key() @ BankError::InvalidAuthority,
        constraint = delegate_record.delegate_key == authority.key() @ BankError::InvalidAuthority,
    )]
    pub delegate_record: Option<Account<'info, Delegate>>,

    pub system_program: Program<'info, System>,
}

pub fn withdraw_handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // Emergency pause check
    require_not_paused(&ctx.accounts.config)?;
    
    let agent = &mut ctx.accounts.agent;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // ============ AUTHORITY CHECK (Owner vs Delegate) ============
    if ctx.accounts.authority.key() != agent.owner {
        // Not the owner, must be a valid delegate
        match &ctx.accounts.delegate_record {
            Some(delegate) => {
                // Check permissions
                require!(delegate.can_spend, BankError::UnauthorizedDelegate);
                
                // Check expiry
                if delegate.valid_until > 0 {
                    require!(current_time < delegate.valid_until, BankError::DelegateExpired);
                }
                
                msg!("DELEGATED_WITHDRAWAL: delegate={}", ctx.accounts.authority.key());
            },
            None => return err!(BankError::InvalidAuthority), // No delegate record found
        }
    } else {
        msg!("OWNER_WITHDRAWAL: owner={}", ctx.accounts.authority.key());
    }

    // ============ SECURITY LAYER: NeoShield Validation ============
    // Validate destination address before processing withdrawal
    let validation_result = crate::instructions::security_cpi::validate_destination(
        ctx.accounts.destination.key,
    )?;
    
    // Log security check for audit trail
    crate::instructions::security_cpi::log_security_check(
        ctx.accounts.destination.key,
        &validation_result,
    );
    
    // Block transaction if destination is flagged
    if crate::instructions::security_cpi::should_block_transaction(&validation_result) {
        msg!("🚨 SECURITY ALERT: Withdrawal blocked by NeoShield");
        msg!("   Destination: {}", ctx.accounts.destination.key);
        msg!("   Risk Score: {}/100", validation_result.risk_score);
        msg!("   Reason Code: {}", validation_result.reason_code);
        
        // Increment suspicious activity counter for circuit breaker
        let config = &mut ctx.accounts.config;
        config.suspicious_activity_count = config.suspicious_activity_count.saturating_add(1);
        
        return err!(BankError::SuspiciousDestination);
    }
    
    msg!("✅ NeoShield: Destination validated (risk: {})", validation_result.risk_score);
    
    // ============ CIRCUIT BREAKER: Auto-Pause Check ============
    let config = &mut ctx.accounts.config;
    
    // Check if auto-pause threshold is reached
    if config.auto_pause_threshold > 0 && config.suspicious_activity_count >= config.auto_pause_threshold {
        config.paused = true;
        config.pause_reason = 1; // Security
        
        msg!("🚨 CIRCUIT BREAKER TRIGGERED: Bank auto-paused");
        msg!("   Suspicious activity count: {}", config.suspicious_activity_count);
        msg!("   Threshold: {}", config.auto_pause_threshold);
        msg!("   Admin must manually unpause");
        
        return err!(BankError::BankPaused);
    }
    // ============ END CIRCUIT BREAKER ============
    // ============ END SECURITY LAYER ============

    // reset period if needed
    if current_time > agent.current_period_start + agent.period_duration {
        agent.current_period_start = current_time;
        agent.current_period_spend = 0;
    }

    // check limits
    let new_spend = agent.current_period_spend.checked_add(amount).unwrap();
    if new_spend > agent.spending_limit {
        return err!(BankError::SpendingLimitExceeded);
    }
    
    // check balance
    if ctx.accounts.vault.lamports() < amount {
        return err!(BankError::InsufficientFunds);
    }

    // update state
    agent.current_period_spend = new_spend;

    let fee = (amount as u128)
        .checked_mul(ctx.accounts.config.protocol_fee_bps as u128).unwrap()
        .checked_div(10000).unwrap() as u64;
    let net_amount = amount.checked_sub(fee).unwrap();

    // sign for vault
    let seeds = &[
        VAULT_SEED.as_bytes(),
        agent.to_account_info().key.as_ref(),
        &[agent.vault_bump],
    ];
    let signer = &[&seeds[..]];
    let cpi_program = ctx.accounts.system_program.to_account_info();

    // Transfer fee to treasury
    if fee > 0 {
        let fee_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
        };
        let fee_ctx = CpiContext::new_with_signer(cpi_program.clone(), fee_accounts, signer);
        transfer(fee_ctx, fee)?;
        
        let config = &mut ctx.accounts.config;
        config.total_fees_collected = config.total_fees_collected.checked_add(fee).unwrap();
    }

    // Transfer net amount to destination
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.destination.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

    transfer(cpi_ctx, net_amount)?;

    msg!("Withdrew {} lamports (Fee: {}). Period spend: {}/{}", amount, fee, agent.current_period_spend, agent.spending_limit);

    emit!(Withdrawal {
        agent: agent.key(),
        authority: ctx.accounts.authority.key(),
        destination: ctx.accounts.destination.key(),
        amount,
        fee,
        period_spend: agent.current_period_spend,
    });

    Ok(())
}
