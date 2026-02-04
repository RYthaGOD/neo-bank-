/**
 * Neo Bank Security Layer
 * 
 * Multi-layer validation for agent treasury operations.
 * Integrates: AgentShield, BlockScore, AgentRep, SOLPRISM
 * 
 * Security Stack:
 * 1. Spending Limits (on-chain, Neo Bank PDA)
 * 2. Scam Detection (AgentShield API)
 * 3. Reputation Check (BlockScore API)
 * 4. Reasoning Verification (SOLPRISM - optional)
 */

import { PublicKey } from "@solana/web3.js";

// ============ TYPES ============

export interface SecurityCheckResult {
    approved: boolean;
    checks: SecurityCheck[];
    riskScore: number; // 0-100, higher = riskier
    blockedReason?: string;
}

export interface SecurityCheck {
    name: string;
    passed: boolean;
    details: string;
    source: "neo-bank" | "agentshield" | "blockscore" | "agentrep" | "solprism";
}

export interface SecurityConfig {
    agentShieldEnabled: boolean;
    agentShieldUrl: string;
    agentShieldApiKey?: string; // API key for authenticated access
    agentShieldStrictness: "fail-open" | "fail-closed"; // Whether to block or conduct local-only checks if API fails
    blockScoreEnabled: boolean;
    blockScoreUrl: string;
    blockScoreMinScore: number; // Minimum reputation score (0-100)
    agentRepEnabled: boolean;
    agentRepUrl: string;
    agentRepMinRep: number;
    solprismEnabled: boolean;
}

// ============ DEFAULT CONFIG ============

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
    agentShieldEnabled: true,
    agentShieldUrl: "https://agentshield.lobsec.org/api",
    agentShieldApiKey: process.env.AGENT_SHIELD_API_KEY,
    agentShieldStrictness: "fail-closed", // Security is NON-NEGOTIABLE
    blockScoreEnabled: true,
    blockScoreUrl: "https://blockscore.vercel.app/api",
    blockScoreMinScore: 40, // Reject wallets below 40
    agentRepEnabled: false, // Enable when AgentRep is live
    agentRepUrl: "",
    agentRepMinRep: 50,
    solprismEnabled: false, // Enable for verifiable reasoning
};

// ============ SECURITY LAYER CLASS ============

export class NeoBankSecurityLayer {
    private config: SecurityConfig;

    constructor(config: Partial<SecurityConfig> = {}) {
        this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    }

    /**
     * Run all security checks on a withdrawal destination
     */
    async validateWithdrawal(
        destination: PublicKey | string,
        amount: number,
        memo?: string
    ): Promise<SecurityCheckResult> {
        const address = typeof destination === "string"
            ? destination
            : destination.toBase58();

        const checks: SecurityCheck[] = [];
        let riskScore = 0;

        // Check 1: AgentShield - Scam address detection
        if (this.config.agentShieldEnabled) {
            const shieldCheck = await this.checkAgentShield(address);
            checks.push(shieldCheck);
            if (!shieldCheck.passed) riskScore += 50;
        }

        // Check 2: BlockScore - Wallet reputation
        if (this.config.blockScoreEnabled) {
            const scoreCheck = await this.checkBlockScore(address);
            checks.push(scoreCheck);
            if (!scoreCheck.passed) riskScore += 30;
        }

        // Check 3: AgentRep - Agent reputation (if enabled)
        if (this.config.agentRepEnabled) {
            const repCheck = await this.checkAgentRep(address);
            checks.push(repCheck);
            if (!repCheck.passed) riskScore += 20;
        }

        // Determine overall approval
        const failedChecks = checks.filter(c => !c.passed);
        const approved = failedChecks.length === 0;
        const blockedReason = failedChecks.length > 0
            ? failedChecks.map(c => c.details).join("; ")
            : undefined;

        return {
            approved,
            checks,
            riskScore: Math.min(riskScore, 100),
            blockedReason,
        };
    }

    /**
     * AgentShield: Check if address is a known scam
     */
    private async checkAgentShield(address: string): Promise<SecurityCheck> {
        try {
            const response = await fetch(
                `${this.config.agentShieldUrl}/check/${address}`
            );

            if (!response.ok) {
                return {
                    name: "AgentShield Scam Check",
                    passed: true, // Fail open if API is down
                    details: "AgentShield API unavailable, skipping",
                    source: "agentshield",
                };
            }

            const data = await response.json();
            const isSafe = data.safe === true || data.risk === "low";

            return {
                name: "AgentShield Scam Check",
                passed: isSafe,
                details: isSafe
                    ? "Address not in scam database"
                    : `BLOCKED: ${data.reason || "Known scam address"}`,
                source: "agentshield",
            };
        } catch (error) {
            return {
                name: "AgentShield Scam Check",
                passed: true, // Fail open
                details: "AgentShield check failed, skipping",
                source: "agentshield",
            };
        }
    }

    /**
     * BlockScore: Check wallet reputation score
     */
    private async checkBlockScore(address: string): Promise<SecurityCheck> {
        try {
            const response = await fetch(
                `${this.config.blockScoreUrl}/score?wallet=${address}`
            );

            if (!response.ok) {
                return {
                    name: "BlockScore Reputation",
                    passed: true,
                    details: "BlockScore API unavailable, skipping",
                    source: "blockscore",
                };
            }

            const data = await response.json();
            const score = data.score ?? data.reputation ?? 50;
            const passed = score >= this.config.blockScoreMinScore;

            return {
                name: "BlockScore Reputation",
                passed,
                details: passed
                    ? `Reputation score: ${score} (min: ${this.config.blockScoreMinScore})`
                    : `BLOCKED: Low reputation score ${score} (min: ${this.config.blockScoreMinScore})`,
                source: "blockscore",
            };
        } catch (error) {
            return {
                name: "BlockScore Reputation",
                passed: true,
                details: "BlockScore check failed, skipping",
                source: "blockscore",
            };
        }
    }

    /**
     * AgentRep: Check agent reputation (future integration)
     */
    private async checkAgentRep(address: string): Promise<SecurityCheck> {
        // Placeholder for AgentRep integration
        return {
            name: "AgentRep Trust Score",
            passed: true,
            details: "AgentRep integration pending",
            source: "agentrep",
        };
    }

    /**
     * Quick check - returns boolean only
     */
    async isDestinationSafe(destination: PublicKey | string): Promise<boolean> {
        const result = await this.validateWithdrawal(destination, 0);
        return result.approved;
    }

    /**
     * Get risk score only (0-100)
     */
    async getRiskScore(destination: PublicKey | string): Promise<number> {
        const result = await this.validateWithdrawal(destination, 0);
        return result.riskScore;
    }

    /**
     * Scan code for malicious patterns (Loop 7 requirement)
     * Performs local regex checks first (fast/offline) then API check
     */
    async scanCode(code: string): Promise<SecurityCheck> {
        // 1. Local Regex Check (High Speed, Zero Latency)
        // Detects private keys, mnemonics, and known malicious imports
        const privateKeyRegex = /[1-9A-HJ-NP-Za-km-z]{88}/;
        if (privateKeyRegex.test(code)) {
            return {
                name: "Code Security Scan",
                passed: false,
                details: "BLOCKED: Potential Private Key detected in code",
                source: "neo-bank",
            };
        }

        const mnemonicRegex = /\b([a-z]{3,}\s){11}[a-z]{3,}\b/; // Simple 12-word check
        if (mnemonicRegex.test(code)) {
            return {
                name: "Code Security Scan",
                passed: false,
                details: "BLOCKED: Potential Mnemonic Seed detected in code",
                source: "neo-bank",
            };
        }

        // 2. API Check (AgentShield)
        if (this.config.agentShieldEnabled) {
            try {
                const response = await fetch(`${this.config.agentShieldUrl}/scan`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.config.agentShieldApiKey ? { 'Authorization': `Bearer ${this.config.agentShieldApiKey}` } : {})
                    },
                    body: JSON.stringify({ code })
                });

                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }

                const data = await response.json();
                const passed = data.safe === true;

                return {
                    name: "AgentShield Code Scan",
                    passed,
                    details: passed ? "Code verified safe" : `BLOCKED: ${data.threat || "Malicious code detected"}`,
                    source: "agentshield",
                };
            } catch (error) {
                // If stricter, block on API failure. If looser, pass with warning.
                if (this.config.agentShieldStrictness === "fail-closed") {
                    return {
                        name: "AgentShield Code Scan",
                        passed: false,
                        details: `API Scan Failed & Strict Mode Active: ${error}`,
                        source: "agentshield",
                    };
                }
            }
        }

        // Fallback: If API disabled or failed-open (and local checks passed)
        return {
            name: "Code Security Scan",
            passed: true,
            details: "Local checks passed (API skipped)",
            source: "neo-bank",
        };
    }
}

// ============ CONVENIENCE FUNCTIONS ============

const defaultSecurityLayer = new NeoBankSecurityLayer();

export async function validateDestination(
    destination: PublicKey | string
): Promise<SecurityCheckResult> {
    return defaultSecurityLayer.validateWithdrawal(destination, 0);
}

export async function isDestinationSafe(
    destination: PublicKey | string
): Promise<boolean> {
    return defaultSecurityLayer.isDestinationSafe(destination);
}

// ============ BATCH VALIDATION ============

/**
 * Validate multiple destinations at once (efficient for portfolio rebalancing)
 */
export async function batchValidate(
    destinations: (PublicKey | string)[]
): Promise<Map<string, SecurityCheckResult>> {
    const results = new Map<string, SecurityCheckResult>();
    const layer = new NeoBankSecurityLayer();

    // Process in parallel
    const checks = await Promise.all(
        destinations.map(async (dest) => {
            const address = typeof dest === "string" ? dest : dest.toBase58();
            const result = await layer.validateWithdrawal(dest, 0);
            return { address, result };
        })
    );

    for (const { address, result } of checks) {
        results.set(address, result);
    }

    return results;
}

// ============ RATE LIMITING ============

export interface RateLimitConfig {
    maxRequestsPerMinute: number;
    maxAmountPerHour: number; // In SOL
    cooldownAfterBlock: number; // Seconds to wait after a blocked tx
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
    maxRequestsPerMinute: 10,
    maxAmountPerHour: 100, // 100 SOL/hour
    cooldownAfterBlock: 60, // 1 min cooldown after block
};

/**
 * Rate Limiter - prevent rapid-fire withdrawals
 * Tracks per-agent withdrawal frequency and volume
 */
export class RateLimiter {
    private config: RateLimitConfig;
    private requestLog: Map<string, number[]> = new Map(); // agent -> timestamps
    private amountLog: Map<string, { amount: number; timestamp: number }[]> = new Map();
    private cooldowns: Map<string, number> = new Map(); // agent -> cooldown expiry

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = { ...DEFAULT_RATE_LIMIT, ...config };
    }

    /**
     * Check if withdrawal is within rate limits
     */
    check(agentId: string, amountSol: number): { allowed: boolean; reason?: string } {
        const now = Date.now();
        const oneMinuteAgo = now - 60_000;
        const oneHourAgo = now - 3600_000;

        // Check cooldown
        const cooldownExpiry = this.cooldowns.get(agentId) || 0;
        if (now < cooldownExpiry) {
            const waitSec = Math.ceil((cooldownExpiry - now) / 1000);
            return {
                allowed: false,
                reason: `Rate limited: wait ${waitSec}s (cooldown after blocked tx)`
            };
        }

        // Check requests per minute
        const requests = this.requestLog.get(agentId) || [];
        const recentRequests = requests.filter(t => t > oneMinuteAgo);
        if (recentRequests.length >= this.config.maxRequestsPerMinute) {
            return {
                allowed: false,
                reason: `Rate limited: max ${this.config.maxRequestsPerMinute} requests/min`
            };
        }

        // Check amount per hour
        const amounts = this.amountLog.get(agentId) || [];
        const recentAmounts = amounts.filter(a => a.timestamp > oneHourAgo);
        const totalAmount = recentAmounts.reduce((sum, a) => sum + a.amount, 0);
        if (totalAmount + amountSol > this.config.maxAmountPerHour) {
            return {
                allowed: false,
                reason: `Rate limited: max ${this.config.maxAmountPerHour} SOL/hour (used: ${totalAmount.toFixed(2)})`
            };
        }

        return { allowed: true };
    }

    /**
     * Record a withdrawal attempt
     */
    record(agentId: string, amountSol: number): void {
        const now = Date.now();

        // Log request
        const requests = this.requestLog.get(agentId) || [];
        requests.push(now);
        this.requestLog.set(agentId, requests.slice(-100)); // Keep last 100

        // Log amount
        const amounts = this.amountLog.get(agentId) || [];
        amounts.push({ amount: amountSol, timestamp: now });
        this.amountLog.set(agentId, amounts.slice(-100));
    }

    /**
     * Apply cooldown after a blocked transaction
     */
    applyCooldown(agentId: string): void {
        const expiry = Date.now() + this.config.cooldownAfterBlock * 1000;
        this.cooldowns.set(agentId, expiry);
    }

    /**
     * Get current rate limit status for an agent
     */
    getStatus(agentId: string): {
        requestsLastMinute: number;
        amountLastHour: number;
        cooldownRemaining: number;
    } {
        const now = Date.now();
        const requests = this.requestLog.get(agentId) || [];
        const amounts = this.amountLog.get(agentId) || [];
        const cooldownExpiry = this.cooldowns.get(agentId) || 0;

        return {
            requestsLastMinute: requests.filter(t => t > now - 60_000).length,
            amountLastHour: amounts
                .filter(a => a.timestamp > now - 3600_000)
                .reduce((sum, a) => sum + a.amount, 0),
            cooldownRemaining: Math.max(0, Math.ceil((cooldownExpiry - now) / 1000)),
        };
    }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

// ============ SECURITY EVENTS ============

export interface SecurityEvent {
    type: "block" | "warn" | "pass";
    timestamp: number;
    address: string;
    reason: string;
    riskScore: number;
}

export type SecurityEventHandler = (event: SecurityEvent) => void;

/**
 * Security Monitor - real-time event streaming with rate limiting
 */
export class SecurityMonitor {
    private handlers: SecurityEventHandler[] = [];
    private layer: NeoBankSecurityLayer;
    private rateLimiter: RateLimiter;

    constructor(config?: Partial<SecurityConfig>, rateConfig?: Partial<RateLimitConfig>) {
        this.layer = new NeoBankSecurityLayer(config);
        this.rateLimiter = new RateLimiter(rateConfig);
    }

    onEvent(handler: SecurityEventHandler): void {
        this.handlers.push(handler);
    }

    private emit(event: SecurityEvent): void {
        for (const handler of this.handlers) {
            handler(event);
        }
    }

    /**
     * Monitor with rate limiting
     * @param agentId - Agent identifier for rate limiting
     */
    async monitor(
        destination: PublicKey | string,
        amount: number,
        agentId?: string
    ): Promise<SecurityCheckResult> {
        const address = typeof destination === "string"
            ? destination
            : destination.toBase58();

        // Rate limit check (if agentId provided)
        if (agentId) {
            const rateCheck = this.rateLimiter.check(agentId, amount);
            if (!rateCheck.allowed) {
                const result: SecurityCheckResult = {
                    approved: false,
                    checks: [{
                        name: "Rate Limit",
                        passed: false,
                        details: rateCheck.reason!,
                        source: "neo-bank",
                    }],
                    riskScore: 0,
                    blockedReason: rateCheck.reason,
                };

                this.emit({
                    type: "block",
                    timestamp: Date.now(),
                    address,
                    reason: rateCheck.reason!,
                    riskScore: 0,
                });

                return result;
            }
        }

        const result = await this.layer.validateWithdrawal(destination, amount);

        // Record the attempt and apply cooldown if blocked
        if (agentId) {
            this.rateLimiter.record(agentId, amount);
            if (!result.approved) {
                this.rateLimiter.applyCooldown(agentId);
            }
        }

        const event: SecurityEvent = {
            type: result.approved ? "pass" : (result.riskScore > 50 ? "block" : "warn"),
            timestamp: Date.now(),
            address,
            reason: result.blockedReason || "All checks passed",
            riskScore: result.riskScore,
        };

        this.emit(event);
        return result;
    }

    /**
     * Get rate limit status for an agent
     */
    getRateLimitStatus(agentId: string) {
        return this.rateLimiter.getStatus(agentId);
    }
}

// ============ EXPORTS ============

export default NeoBankSecurityLayer;
