/**
 * Neo Bank - Utility Functions
 * 
 * Common helpers used across the SDK.
 */

import { PublicKey } from "@solana/web3.js";
import { SEEDS, PROGRAM_ID } from "./constants";

// ============ PDA DERIVATION ============

/**
 * Derive agent PDA from owner
 */
export function deriveAgentPda(owner: PublicKey, programId: string = PROGRAM_ID): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.AGENT), owner.toBuffer()],
        new PublicKey(programId)
    );
}

/**
 * Derive vault PDA from agent
 */
export function deriveVaultPda(agent: PublicKey, programId: string = PROGRAM_ID): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.VAULT), agent.toBuffer()],
        new PublicKey(programId)
    );
}

/**
 * Derive config PDA
 */
export function deriveConfigPda(programId: string = PROGRAM_ID): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.CONFIG)],
        new PublicKey(programId)
    );
}

/**
 * Derive treasury PDA
 */
export function deriveTreasuryPda(programId: string = PROGRAM_ID): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.TREASURY)],
        new PublicKey(programId)
    );
}

/**
 * Derive yield strategy PDA
 */
export function deriveYieldStrategyPda(agent: PublicKey, programId: string = PROGRAM_ID): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.YIELD_STRATEGY), agent.toBuffer()],
        new PublicKey(programId)
    );
}

/**
 * Derive proposal PDA
 */
export function deriveProposalPda(proposalId: number, programId: string = PROGRAM_ID): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.PROPOSAL), Buffer.from(proposalId.toString())],
        new PublicKey(programId)
    );
}

/**
 * Get all PDAs for an owner
 */
export function getAllPdas(owner: PublicKey, programId: string = PROGRAM_ID) {
    const [agent, agentBump] = deriveAgentPda(owner, programId);
    const [vault, vaultBump] = deriveVaultPda(agent, programId);
    const [config, configBump] = deriveConfigPda(programId);
    const [treasury, treasuryBump] = deriveTreasuryPda(programId);
    const [yieldStrategy, yieldBump] = deriveYieldStrategyPda(agent, programId);

    return {
        agent: { address: agent, bump: agentBump },
        vault: { address: vault, bump: vaultBump },
        config: { address: config, bump: configBump },
        treasury: { address: treasury, bump: treasuryBump },
        yieldStrategy: { address: yieldStrategy, bump: yieldBump },
    };
}

// ============ VALIDATION ============

/**
 * Validate Solana address
 */
export function isValidAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate amount is positive
 */
export function isValidAmount(amount: number): boolean {
    return typeof amount === "number" && amount > 0 && isFinite(amount);
}

/**
 * Validate percentage (0-100)
 */
export function isValidPercentage(value: number): boolean {
    return typeof value === "number" && value >= 0 && value <= 100;
}

// ============ FORMATTING ============

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, chars: number = 4): string {
    if (address.length <= chars * 2 + 3) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format timestamp to ISO string
 */
export function formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toISOString();
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

// ============ TIME ============

/**
 * Get current Unix timestamp in seconds
 */
export function nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
}

/**
 * Check if timestamp has expired
 */
export function isExpired(expiryTimestamp: number): boolean {
    return nowSeconds() > expiryTimestamp;
}

/**
 * Get seconds until timestamp
 */
export function secondsUntil(timestamp: number): number {
    return Math.max(0, timestamp - nowSeconds());
}

// ============ RETRY ============

/**
 * Retry async function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number;
        delayMs?: number;
        backoffMultiplier?: number;
        onRetry?: (attempt: number, error: any) => void;
    } = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        delayMs = 1000,
        backoffMultiplier = 2,
        onRetry,
    } = options;

    let lastError: any;
    let currentDelay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                onRetry?.(attempt, error);
                await sleep(currentDelay);
                currentDelay *= backoffMultiplier;
            }
        }
    }

    throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============ BATCH ============

/**
 * Process items in batches
 */
export async function batch<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
        const batchItems = items.slice(i, i + batchSize);
        const batchResults = await processor(batchItems);
        results.push(...batchResults);
    }
    
    return results;
}

/**
 * Run promises with concurrency limit
 */
export async function parallel<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number = 5
): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
        const p = task().then((result) => {
            results.push(result);
        });
        executing.push(p);

        if (executing.length >= concurrency) {
            await Promise.race(executing);
            executing.splice(
                executing.findIndex((e) => e === p),
                1
            );
        }
    }

    await Promise.all(executing);
    return results;
}
