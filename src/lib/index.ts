/**
 * Neo Bank SDK - Main Entry Point
 * 
 * The first dedicated treasury infrastructure for AI agents on Solana.
 * 
 * @example
 * ```typescript
 * import { AgentNeoBank, SecureAgentBank, config } from '@neo-bank/sdk';
 * 
 * // Configure
 * config.useNetwork('devnet');
 * 
 * // Initialize
 * const bank = new AgentNeoBank(connection, wallet);
 * const secure = new SecureAgentBank(bank);
 * 
 * // Use
 * await bank.registerAgent("MyBot", 10);
 * await secure.safeWithdraw(owner, destination, 5);
 * ```
 * 
 * @packageDocumentation
 */

// Core SDK
export {
    AgentNeoBank,
    SecureAgentBank,
    GovernanceHelper,
    batchValidateIntents,
} from './agent-sdk';

export type {
    IntentValidationResult,
    SpendingStatus,
    HookCondition,
    YieldProtocol,
    HookStatus,
    AgentFullStatus,
    SecureWithdrawalCheck,
    Proposal,
    ProposalStatus,
    GovernanceInfo,
} from './agent-sdk';

// Security Layer
export {
    NeoBankSecurityLayer,
    SecurityMonitor,
    RateLimiter,
    globalRateLimiter,
    batchValidate,
    DEFAULT_SECURITY_CONFIG,
    DEFAULT_RATE_LIMIT,
} from './security-layer';

export type {
    SecurityCheckResult,
    SecurityCheck,
    SecurityConfig,
    SecurityEvent,
    SecurityEventHandler,
    RateLimitConfig,
} from './security-layer';

// Webhooks
export {
    WebhookManager,
    webhooks,
    emitWithdrawalSuccess,
    emitWithdrawalBlocked,
    emitSpendingWarning,
    emitSpendingLimitReached,
    emitYieldTriggered,
    emitSecurityAlert,
    emitProposalCreated,
    emitPauseChange,
} from './webhooks';

export type {
    WebhookEvent,
    WebhookEventType,
    WebhookSubscription,
} from './webhooks';

// Analytics
export {
    AnalyticsTracker,
    analytics,
    trackWithdrawal,
    trackDeposit,
    trackYield,
    trackBlocked,
    trackSecurityAlert,
    generateReport,
} from './analytics';

export type {
    AgentMetrics,
    TreasuryMetrics,
    AnalyticsEvent,
} from './analytics';

// Configuration
export {
    config,
    DEFAULT_CONFIG,
    NETWORK_PRESETS,
    loadConfigFromEnv,
    mergeConfig,
    validateConfig,
} from './config';

export type {
    NeoBankConfig,
} from './config';

// AI Agent Prompts
export {
    SYSTEM_PROMPT,
    INTENT_VALIDATION_PROMPT,
    YIELD_STRATEGY_PROMPT,
    GOVERNANCE_VOTE_PROMPT,
    SECURITY_ALERT_PROMPT,
    DAILY_REPORT_PROMPT,
    FUNCTION_SCHEMAS,
    EXAMPLE_CONVERSATION,
} from './agent-prompts';

// Constants
export {
    PROGRAM_ID,
    DEVNET_RPC,
    MAINNET_RPC,
    DEFAULT_DAILY_LIMIT_SOL,
    DEFAULT_PERIOD_SECONDS,
    LAMPORTS_PER_SOL,
    solToLamports,
    lamportsToSol,
    formatSol,
} from './constants';

// Errors
export {
    NeoBankError,
    SpendingLimitError,
    InsufficientFundsError,
    BankPausedError,
    SecurityError,
    RateLimitError,
    GovernanceError,
    IntentValidationError,
    parseError,
    isSpendingLimitError,
    isInsufficientFundsError,
    isBankPausedError,
    isSecurityError,
    isRateLimitError,
    getUserMessage,
} from './errors';

// Utils
export {
    deriveAgentPda,
    deriveVaultPda,
    deriveConfigPda,
    deriveTreasuryPda,
    deriveYieldStrategyPda,
    deriveProposalPda,
    getAllPdas,
    isValidAddress,
    isValidAmount,
    isValidPercentage,
    truncateAddress,
    formatTimestamp,
    formatDuration,
    nowSeconds,
    isExpired,
    secondsUntil,
    retry,
    sleep,
    batch,
    parallel,
} from './utils';

// Types
export type {
    AgentAccount,
    AgentData,
    BankConfigAccount,
    HookConditionType,
    YieldProtocolType,
    YieldStrategyAccount,
    ProposalStatusType,
    TreasuryProposalAccount,
    AdminRegistryAccount,
    TransactionIntent,
    WithdrawalRequest,
    DepositRequest,
    OperationResult,
    ValidationResult,
    BalanceInfo,
    SpendingInfo,
    BaseEvent,
    WithdrawalEvent,
    DepositEvent,
    YieldEvent,
    SecurityAlertEvent,
    NeoBankEvent,
    NetworkType,
    SDKOptions,
    SecurityOptions,
} from './types';

// Version
export const VERSION = '1.0.0';
export const PROGRAM_VERSION = 'BGTbi1d1n6BzZdyCvr4gEAY3DbC5sDGA4N5EnTRwcrh';

/**
 * Quick start helper
 * TODO: Implement config module
 */
/*
export function quickStart(network: 'devnet' | 'mainnet' | 'localnet' = 'devnet') {
    config.useNetwork(network);
    console.log(`🏦 Neo Bank SDK v${VERSION}`);
    console.log(`   Network: ${network}`);
    console.log(`   Program: ${PROGRAM_VERSION.slice(0, 8)}...`);
    console.log(`   Ready to initialize AgentNeoBank`);
}
*/
