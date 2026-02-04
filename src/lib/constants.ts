// Neo Bank Constants

export const NEO_BANK_PROGRAM_ID = "BGTbi1d1n6BzZdyCvr4gEAY3DbC5sDGA4N5EnTRwcrh";

export const SEEDS = {
    AGENT: "agent",
    VAULT: "vault", 
    YIELD_STRATEGY: "yield_strategy",
    GOVERNANCE: "governance",
    TREASURY: "treasury",
    PROPOSAL: "proposal",
} as const;

export const DEFAULTS = {
    PERIOD_DURATION: 86400, // 24 hours in seconds
    MIN_REPUTATION_SCORE: 40,
    YIELD_RATE_BPS: 500, // 5% APY
    STAKE_PERCENTAGE: 80,
    PROPOSAL_EXPIRY: 259200, // 3 days in seconds
} as const;

export const SECURITY_ENDPOINTS = {
    AGENT_SHIELD: "https://agentshield.lobsec.org/api",
    BLOCK_SCORE: "https://blockscore.vercel.app/api",
} as const;
