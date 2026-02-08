use anchor_lang::prelude::*;
use crate::state::YieldProtocol;

#[event]
pub struct DelegateAdded {
    pub agent: Pubkey,
    pub delegate: Pubkey,
    pub can_spend: bool,
    pub can_manage_yield: bool,
    pub valid_until: i64,
}

#[event]
pub struct DelegateRemoved {
    pub agent: Pubkey,
    pub delegate: Pubkey,
}

#[event]
pub struct Withdrawal {
    pub agent: Pubkey,
    pub authority: Pubkey,
    pub destination: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub period_spend: u64,
}

#[event]
pub struct YieldInteract {
    pub agent: Pubkey,
    pub protocol: YieldProtocol,
    pub action: String, // "deposit" or "withdraw"
    pub amount: u64,
    pub timestamp: i64,
}
