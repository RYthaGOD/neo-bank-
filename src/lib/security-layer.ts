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

// ============ EXPORTS ============

export default NeoBankSecurityLayer;
