use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::BankConfig;
use crate::constants::{CONFIG_SEED, TREASURY_SEED};
use crate::error::BankError;

/// Treasury Governance - Multi-sig style voting for treasury spending.
/// 
/// Allows "Bank Admin Agents" to propose and vote on treasury allocations.
/// This enables decentralized control of protocol fees without single points of failure.
/// 
/// Flow:
/// 1. Admin proposes a treasury spend (destination, amount, memo)
/// 2. Other admins vote (approve/reject)
/// 3. When threshold reached, anyone can execute
/// 4. Funds transfer from treasury to destination

pub const PROPOSAL_SEED: &str = "proposal";
pub const ADMIN_SEED: &str = "admin";

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum ProposalStatus {
    Pending,
    Approved,
    Rejected,
    Executed,
    Expired,
}

/// A treasury spending proposal
#[account]
#[derive(InitSpace)]
pub struct TreasuryProposal {
    pub id: u64,                      // Unique proposal ID
    pub proposer: Pubkey,             // Who created this proposal
    pub destination: Pubkey,          // Where to send funds
    pub amount: u64,                  // Amount in lamports
    #[max_len(64)]
    pub memo: String,                 // Description of the spend
    pub status: ProposalStatus,       // Current status
    pub votes_for: u8,                // Approval votes
    pub votes_against: u8,            // Rejection votes
    pub created_at: i64,              // Creation timestamp
    pub expires_at: i64,              // Expiration timestamp
    pub executed_at: Option<i64>,     // When executed (if approved)
    pub bump: u8,
}

/// Admin registry for governance
#[account]
#[derive(InitSpace)]
pub struct AdminRegistry {
    pub admins: [Pubkey; 5],          // Up to 5 admin agents
    pub admin_count: u8,              // Current number of admins
    pub threshold: u8,                // Votes needed to approve (e.g., 2 of 3)
    pub proposal_count: u64,          // Total proposals created
    pub bump: u8,
}

/// ============ INITIALIZE GOVERNANCE ============

#[derive(Accounts)]
pub struct InitializeGovernance<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED.as_bytes()],
        bump,
        constraint = config.admin == authority.key() @ BankError::InvalidAuthority,
    )]
    pub config: Account<'info, BankConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + AdminRegistry::INIT_SPACE,
        seeds = [ADMIN_SEED.as_bytes()],
        bump,
    )]
    pub admin_registry: Account<'info, AdminRegistry>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_governance_handler(
    ctx: Context<InitializeGovernance>,
    initial_admins: Vec<Pubkey>,
    threshold: u8,
) -> Result<()> {
    require!(initial_admins.len() <= 5, BankError::TooManyAdmins);
    require!(threshold > 0 && threshold <= initial_admins.len() as u8, BankError::InvalidThreshold);
    
    let registry = &mut ctx.accounts.admin_registry;
    
    // Initialize admin array with default pubkeys
    registry.admins = [Pubkey::default(); 5];
    for (i, admin) in initial_admins.iter().enumerate() {
        registry.admins[i] = *admin;
    }
    
    registry.admin_count = initial_admins.len() as u8;
    registry.threshold = threshold;
    registry.proposal_count = 0;
    registry.bump = ctx.bumps.admin_registry;
    
    msg!("GOVERNANCE_INITIALIZED: admins={}, threshold={}", registry.admin_count, threshold);
    
    Ok(())
}

/// ============ CREATE PROPOSAL ============

#[derive(Accounts)]
#[instruction(destination: Pubkey, amount: u64, memo: String)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,

    #[account(
        mut,
        seeds = [ADMIN_SEED.as_bytes()],
        bump = admin_registry.bump,
    )]
    pub admin_registry: Account<'info, AdminRegistry>,

    #[account(
        init,
        payer = proposer,
        space = 8 + TreasuryProposal::INIT_SPACE,
        seeds = [PROPOSAL_SEED.as_bytes(), &admin_registry.proposal_count.to_le_bytes()],
        bump,
    )]
    pub proposal: Account<'info, TreasuryProposal>,

    /// CHECK: Treasury to verify funds exist
    #[account(
        seeds = [TREASURY_SEED.as_bytes()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_proposal_handler(
    ctx: Context<CreateProposal>,
    destination: Pubkey,
    amount: u64,
    memo: String,
) -> Result<()> {
    let registry = &mut ctx.accounts.admin_registry;
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;
    
    // Verify proposer is an admin
    let is_admin = registry.admins[..registry.admin_count as usize]
        .contains(&ctx.accounts.proposer.key());
    require!(is_admin, BankError::NotAdmin);
    
    // Verify treasury has enough funds
    require!(ctx.accounts.treasury.lamports() >= amount, BankError::InsufficientTreasuryFunds);
    
    // Initialize proposal
    proposal.id = registry.proposal_count;
    proposal.proposer = ctx.accounts.proposer.key();
    proposal.destination = destination;
    proposal.amount = amount;
    proposal.memo = memo.chars().take(64).collect();
    proposal.status = ProposalStatus::Pending;
    proposal.votes_for = 1; // Proposer auto-votes for
    proposal.votes_against = 0;
    proposal.created_at = clock.unix_timestamp;
    proposal.expires_at = clock.unix_timestamp + 86400 * 3; // 3 day expiry
    proposal.executed_at = None;
    proposal.bump = ctx.bumps.proposal;
    
    // Increment proposal count
    registry.proposal_count = registry.proposal_count.checked_add(1).unwrap();
    
    msg!("PROPOSAL_CREATED: id={}, amount={}, destination={}", 
         proposal.id, amount, destination);
    msg!("PROPOSAL_RESULT: {{\"id\":{},\"status\":\"pending\",\"votes_for\":1,\"threshold\":{}}}", 
         proposal.id, registry.threshold);
    
    Ok(())
}

/// ============ VOTE ON PROPOSAL ============

#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct VoteProposal<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(
        seeds = [ADMIN_SEED.as_bytes()],
        bump = admin_registry.bump,
    )]
    pub admin_registry: Account<'info, AdminRegistry>,

    #[account(
        mut,
        seeds = [PROPOSAL_SEED.as_bytes(), &proposal_id.to_le_bytes()],
        bump = proposal.bump,
    )]
    pub proposal: Account<'info, TreasuryProposal>,
}

pub fn vote_proposal_handler(
    ctx: Context<VoteProposal>,
    _proposal_id: u64,
    approve: bool,
) -> Result<()> {
    let registry = &ctx.accounts.admin_registry;
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;
    
    // Verify voter is an admin
    let is_admin = registry.admins[..registry.admin_count as usize]
        .contains(&ctx.accounts.voter.key());
    require!(is_admin, BankError::NotAdmin);
    
    // Verify proposal is still pending
    require!(proposal.status == ProposalStatus::Pending, BankError::ProposalNotPending);
    
    // Check expiry
    if clock.unix_timestamp > proposal.expires_at {
        proposal.status = ProposalStatus::Expired;
        return err!(BankError::ProposalExpired);
    }
    
    // Record vote
    if approve {
        proposal.votes_for = proposal.votes_for.checked_add(1).unwrap();
    } else {
        proposal.votes_against = proposal.votes_against.checked_add(1).unwrap();
    }
    
    // Check if threshold reached
    if proposal.votes_for >= registry.threshold {
        proposal.status = ProposalStatus::Approved;
        msg!("PROPOSAL_APPROVED: id={}", proposal.id);
    } else if proposal.votes_against > registry.admin_count - registry.threshold {
        proposal.status = ProposalStatus::Rejected;
        msg!("PROPOSAL_REJECTED: id={}", proposal.id);
    }
    
    msg!("VOTE_RECORDED: id={}, approve={}, votes_for={}, votes_against={}", 
         proposal.id, approve, proposal.votes_for, proposal.votes_against);
    
    Ok(())
}

/// ============ EXECUTE PROPOSAL ============

#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct ExecuteProposal<'info> {
    /// Anyone can execute an approved proposal (permissionless)
    pub executor: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED.as_bytes()],
        bump,
    )]
    pub config: Account<'info, BankConfig>,

    #[account(
        mut,
        seeds = [PROPOSAL_SEED.as_bytes(), &proposal_id.to_le_bytes()],
        bump = proposal.bump,
    )]
    pub proposal: Account<'info, TreasuryProposal>,

    /// CHECK: Treasury PDA
    #[account(
        mut,
        seeds = [TREASURY_SEED.as_bytes()],
        bump = config.treasury_bump,
    )]
    pub treasury: SystemAccount<'info>,

    /// CHECK: Destination for funds
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn execute_proposal_handler(ctx: Context<ExecuteProposal>, _proposal_id: u64) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let config = &ctx.accounts.config;
    let clock = Clock::get()?;
    
    // Verify proposal is approved
    require!(proposal.status == ProposalStatus::Approved, BankError::ProposalNotApproved);
    
    // Verify destination matches
    require!(ctx.accounts.destination.key() == proposal.destination, BankError::InvalidDestination);
    
    // Verify treasury has funds
    require!(ctx.accounts.treasury.lamports() >= proposal.amount, BankError::InsufficientTreasuryFunds);
    
    // Execute transfer
    let seeds = &[
        TREASURY_SEED.as_bytes(),
        &[config.treasury_bump],
    ];
    let signer = &[&seeds[..]];
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.treasury.to_account_info(),
        to: ctx.accounts.destination.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        cpi_accounts,
        signer,
    );
    transfer(cpi_ctx, proposal.amount)?;
    
    // Update proposal status
    proposal.status = ProposalStatus::Executed;
    proposal.executed_at = Some(clock.unix_timestamp);
    
    msg!("PROPOSAL_EXECUTED: id={}, amount={}, destination={}", 
         proposal.id, proposal.amount, proposal.destination);
    msg!("TREASURY_SPEND: {{\"proposal_id\":{},\"amount\":{},\"destination\":\"{}\"}}", 
         proposal.id, proposal.amount, proposal.destination);
    
    Ok(())
}
