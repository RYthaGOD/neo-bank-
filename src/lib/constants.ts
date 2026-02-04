/**
 * Neo Bank Constants
 * 
 * Central location for all program constants, defaults, and configuration values.
 */

// ============ PROGRAM ============

export const PROGRAM_ID = "BGTbi1d1n6BzZdyCvr4gEAY3DbC5sDGA4N5EnTRwcrh";
export const NEO_BANK_PROGRAM_ID = PROGRAM_ID; // Alias for backward compat

// ============ NETWORK ============

export const DEVNET_RPC = "https://api.devnet.solana.com";
export const MAINNET_RPC = "https://api.mainnet-beta.solana.com";
export const LOCALNET_RPC = "http://localhost:8899";

// ============ UNITS ============

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const SOL_DECIMALS = 9;

// ============ PDA SEEDS ============

export const SEEDS = {
    AGENT: "agent",
    VAULT: "vault",
    CONFIG: "config",
    YIELD_STRATEGY: "yield_strategy",
    GOVERNANCE: "governance",
    TREASURY: "treasury",
    PROPOSAL: "proposal",
    ADMIN: "admin",
} as const;

// ============ DEFAULTS ============

export const DEFAULT_DAILY_LIMIT_SOL = 10;
export const DEFAULT_PERIOD_SECONDS = 86400; // 24 hours

export const DEFAULTS = {
    PERIOD_DURATION: 86400, // 24 hours in seconds
    SPENDING_LIMIT_SOL: 10, // 10 SOL daily
    MIN_REPUTATION_SCORE: 40,
    YIELD_RATE_BPS: 500, // 5% APY
    STAKE_PERCENTAGE: 80, // 80% auto-staked
    PROPOSAL_EXPIRY: 259200, // 3 days in seconds
    MAX_ADMINS: 5,
    PROTOCOL_FEE_BPS: 25, // 0.25%
} as const;

// ============ RATE LIMITS ============

export const RATE_LIMITS = {
    MAX_REQUESTS_PER_MINUTE: 10,
    MAX_SOL_PER_HOUR: 100,
    COOLDOWN_AFTER_BLOCK_SECONDS: 60,
} as const;

// ============ SECURITY ============

export const SECURITY_ENDPOINTS = {
    AGENT_SHIELD: "https://agentshield.lobsec.org/api",
    BLOCK_SCORE: "https://blockscore.vercel.app/api",
} as const;

export const SECURITY_THRESHOLDS = {
    MIN_REPUTATION_SCORE: 40,
    HIGH_RISK_SCORE: 70,
    MEDIUM_RISK_SCORE: 50,
} as const;

// ============ PAUSE REASONS ============

export const PAUSE_REASONS = {
    NONE: 0,
    SECURITY: 1,
    MAINTENANCE: 2,
    UPGRADE: 3,
} as const;

export const PAUSE_REASON_NAMES: Record<number, string> = {
    0: "none",
    1: "security",
    2: "maintenance",
    3: "upgrade",
};

// ============ YIELD PROTOCOLS ============

export const YIELD_PROTOCOLS = {
    INTERNAL: "internal",
    JUPITER: "jupiter",
    METEORA: "meteora",
    MARINADE: "marinade",
} as const;

// ============ PROPOSAL STATUS ============

export const PROPOSAL_STATUS = {
    PENDING: 0,
    APPROVED: 1,
    REJECTED: 2,
    EXECUTED: 3,
    EXPIRED: 4,
} as const;

export const PROPOSAL_STATUS_NAMES: Record<number, string> = {
    0: "pending",
    1: "approved",
    2: "rejected",
    3: "executed",
    4: "expired",
};

// ============ ERROR CODES ============

export const ERROR_CODES = {
    SPENDING_LIMIT_EXCEEDED: 6000,
    INVALID_AUTHORITY: 6001,
    INSUFFICIENT_FUNDS: 6002,
    INTENT_WOULD_EXCEED_LIMIT: 6003,
    INTENT_INSUFFICIENT_FUNDS: 6004,
    HOOK_DISABLED: 6005,
    HOOK_CONDITION_NOT_MET: 6006,
    INVALID_PERCENTAGE: 6007,
    TOO_MANY_ADMINS: 6008,
    INVALID_THRESHOLD: 6009,
    NOT_ADMIN: 6010,
    INSUFFICIENT_TREASURY_FUNDS: 6011,
    PROPOSAL_NOT_PENDING: 6012,
    PROPOSAL_EXPIRED: 6013,
    PROPOSAL_NOT_APPROVED: 6014,
    INVALID_DESTINATION: 6015,
    INVALID_PROTOCOL: 6016,
    UNAUTHORIZED: 6017,
    BANK_PAUSED: 6018,
} as const;

// ============ HELPERS ============

export function solToLamports(sol: number): number {
    return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function lamportsToSol(lamports: number): number {
    return lamports / LAMPORTS_PER_SOL;
}

export function formatSol(lamports: number, decimals: number = 4): string {
    return (lamports / LAMPORTS_PER_SOL).toFixed(decimals);
}
