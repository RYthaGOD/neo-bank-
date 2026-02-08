use anchor_lang::prelude::*;
use crate::state::{Agent, Delegate};
use crate::constants::AGENT_SEED;
use crate::error::BankError;
use crate::events::*;

pub const DELEGATE_SEED: &str = "delegate";

// ... (Accounts structs remain same)

pub fn add_delegate_handler(
    ctx: Context<AddDelegate>,
    delegate_key: Pubkey,
    can_spend: bool,
    can_manage_yield: bool,
    valid_until: i64,
) -> Result<()> {
    let delegate = &mut ctx.accounts.delegate_account;
    
    delegate.agent = ctx.accounts.agent.key();
    delegate.delegate_key = delegate_key;
    delegate.can_spend = can_spend;
    delegate.can_manage_yield = can_manage_yield;
    delegate.valid_until = valid_until;
    delegate.bump = ctx.bumps.delegate_account;
    
    emit!(DelegateAdded {
        agent: delegate.agent,
        delegate: delegate.delegate_key,
        can_spend,
        can_manage_yield,
        valid_until,
    });
    
    msg!("DELEGATE_ADDED: agent={} delegate={} spend={} yield={}", 
         delegate.agent, delegate.delegate_key, can_spend, can_manage_yield);
    
    Ok(())
}

pub fn remove_delegate_handler(ctx: Context<RemoveDelegate>) -> Result<()> {
    emit!(DelegateRemoved {
        agent: ctx.accounts.delegate.agent,
        delegate: ctx.accounts.delegate.delegate_key,
    });

    msg!("DELEGATE_REMOVED: agent={} delegate={}", 
         ctx.accounts.delegate.agent, ctx.accounts.delegate.delegate_key);
    Ok(())
}

#[derive(Accounts)]
#[instruction(delegate_key: Pubkey)]
pub struct AddDelegate<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [AGENT_SEED.as_bytes(), owner.key().as_ref()],
        bump,
        has_one = owner @ BankError::InvalidAuthority,
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        init,
        payer = owner,
        space = 8 + Delegate::INIT_SPACE,
        seeds = [
            DELEGATE_SEED.as_bytes(), 
            agent.key().as_ref(), // Scope to this agent
            delegate_key.as_ref() // Scope to this specific delegate key
        ],
        bump,
    )]
    pub delegate_account: Account<'info, Delegate>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveDelegate<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [AGENT_SEED.as_bytes(), owner.key().as_ref()],
        bump,
        has_one = owner @ BankError::InvalidAuthority,
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        mut,
        close = owner,
        seeds = [
            DELEGATE_SEED.as_bytes(), 
            agent.key().as_ref(), 
            delegate.delegate_key.as_ref()
        ],
        bump = delegate.bump,
    )]
    pub delegate: Account<'info, Delegate>,
}


