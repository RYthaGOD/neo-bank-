/**
 * Neo Bank - Core Type Definitions
 * 
 * Comprehensive types for the Neo Bank SDK.
 */

import { PublicKey } from "@solana/web3.js";

// ============ AGENT ============

/**
 * On-chain agent account data
 */
export interface AgentAccount {
    owner: PublicKey;
    vaultBump: number;
    spendingLimit: bigint;
    periodDuration: bigint;
    currentPeriodStart: bigint;
    currentPeriodSpend: bigint;
    name: string;
    totalDeposited: bigint;
    stakedAmount: bigint;
    lastYieldTimestamp: bigint;
}

/**
 * Parsed agent data (numbers instead of bigints)
 */
export interface AgentData {
    owner: string;
    name: string;
    spendingLimit: number;
    periodDuration: number;
    currentPeriodStart: number;
    currentPeriodSpend: number;
    totalDeposited: number;
    stakedAmount: number;
    lastYieldTimestamp: number;
}

// ============ BANK CONFIG ============

/**
 * On-chain bank config
 */
export interface BankConfigAccount {
    admin: PublicKey;
    protocolFeeBps: number;
    treasuryBump: number;
    totalFeesCollected: bigint;
    paused: boolean;
    pauseReason: number;
}

// ============ YIELD ============

/**
 * Hook condition types
 */
export type HookConditionType = 
    | { balanceAbove: { threshold: bigint } }
    | { timeElapsed: { interval: bigint } }
    | { yieldAbove: { threshold: bigint } };

/**
 * Yield protocol types
 */
export type YieldProtocolType =
    | { internal: {} }
    | { jupiter: {} }
    | { meteora: {} }
    | { marinade: {} };

/**
 * On-chain yield strategy account
 */
export interface YieldStrategyAccount {
    agent: PublicKey;
    condition: HookConditionType;
    protocol: YieldProtocolType;
    deployPercentage: number;
    enabled: boolean;
    lastTriggered: bigint;
    triggerCount: bigint;
    bump: number;
}

// ============ GOVERNANCE ============

/**
 * Proposal status
 */
export type ProposalStatusType =
    | { pending: {} }
    | { approved: {} }
    | { rejected: {} }
    | { executed: {} }
    | { expired: {} };

/**
 * On-chain treasury proposal
 */
export interface TreasuryProposalAccount {
    id: bigint;
    proposer: PublicKey;
    destination: PublicKey;
    amount: bigint;
    memo: string;
    status: ProposalStatusType;
    votesFor: number;
    votesAgainst: number;
    createdAt: bigint;
    expiresAt: bigint;
    executedAt: bigint | null;
    bump: number;
}

/**
 * On-chain admin registry
 */
export interface AdminRegistryAccount {
    admins: PublicKey[];
    threshold: number;
    proposalCount: bigint;
    bump: number;
}

// ============ TRANSACTIONS ============

/**
 * Transaction intent for validation
 */
export interface TransactionIntent {
    amount: number;
    destination: string;
    memo: string;
    executionTime?: number;
}

/**
 * Withdrawal request
 */
export interface WithdrawalRequest {
    amount: number;
    destination: PublicKey | string;
    memo?: string;
}

/**
 * Deposit request
 */
export interface DepositRequest {
    amount: number;
}

// ============ SDK RESPONSES ============

/**
 * Generic operation result
 */
export interface OperationResult<T = void> {
    success: boolean;
    data?: T;
    error?: string;
    signature?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    reason?: string;
    details?: Record<string, any>;
}

/**
 * Balance info
 */
export interface BalanceInfo {
    vault: number;
    staked: number;
    available: number;
    totalDeposited: number;
}

/**
 * Spending info
 */
export interface SpendingInfo {
    limit: number;
    spent: number;
    remaining: number;
    periodStart: number;
    periodEnd: number;
    periodDuration: number;
}

// ============ EVENTS ============

/**
 * Base event type
 */
export interface BaseEvent {
    type: string;
    timestamp: number;
    agentId: string;
}

/**
 * Withdrawal event
 */
export interface WithdrawalEvent extends BaseEvent {
    type: "withdrawal";
    amount: number;
    destination: string;
    signature: string;
    fee: number;
}

/**
 * Deposit event
 */
export interface DepositEvent extends BaseEvent {
    type: "deposit";
    amount: number;
    signature: string;
}

/**
 * Yield event
 */
export interface YieldEvent extends BaseEvent {
    type: "yield";
    amount: number;
    protocol: string;
}

/**
 * Security event
 */
export interface SecurityAlertEvent extends BaseEvent {
    type: "security";
    alertType: string;
    riskScore: number;
    blocked: boolean;
}

/**
 * Union of all events
 */
export type NeoBankEvent = 
    | WithdrawalEvent 
    | DepositEvent 
    | YieldEvent 
    | SecurityAlertEvent;

// ============ CONFIGURATION ============

/**
 * Network type
 */
export type NetworkType = "devnet" | "mainnet" | "localnet" | "custom";

/**
 * SDK initialization options
 */
export interface SDKOptions {
    network?: NetworkType;
    rpcUrl?: string;
    programId?: string;
    commitment?: "processed" | "confirmed" | "finalized";
}

/**
 * Security layer options
 */
export interface SecurityOptions {
    agentShieldEnabled?: boolean;
    blockScoreEnabled?: boolean;
    minReputationScore?: number;
    rateLimitEnabled?: boolean;
    maxRequestsPerMinute?: number;
    maxAmountPerHour?: number;
}
