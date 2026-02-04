import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import idl from "../idl/idl.json";

export class AgentNeoBank {
    private program: Program;
    private provider: AnchorProvider;

    constructor(
        connection: Connection,
        wallet: anchor.Wallet,
        programId: string = process.env.NEXT_PUBLIC_PROGRAM_ID || "FiarvoTx8WkneMjqX4T7KEpzX2Ya1FeBL991qGi49kFd"
    ) {
        this.provider = new AnchorProvider(connection, wallet, {
            preflightCommitment: "processed",
        });
        this.program = new Program(idl as any, this.provider);
    }

    /**
     * Get the PDA for an agent account based on the owner's public key.
     */
    public getAgentPda(owner: PublicKey): PublicKey {
        const [agentPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("agent"), owner.toBuffer()],
            this.program.programId
        );
        return agentPda;
    }

    /**
     * Get the PDA for the vault associated with an agent.
     */
    public getVaultPda(agentPda: PublicKey): PublicKey {
        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), agentPda.toBuffer()],
            this.program.programId
        );
        return vaultPda;
    }

    /**
     * Register a new agent with a spending limit and period.
     */
    public async registerAgent(name: string, dailyLimitSol: number) {
        const spendingLimit = new BN(dailyLimitSol * anchor.web3.LAMPORTS_PER_SOL);
        const periodDuration = new BN(86400); // 1 day

        return await this.program.methods
            .registerAgent(name, spendingLimit, periodDuration)
            .rpc();
    }

    /**
     * Deposit funds into the agent's vault.
     */
    public async deposit(amountSol: number) {
        const amount = new BN(amountSol * anchor.web3.LAMPORTS_PER_SOL);
        return await this.program.methods
            .deposit(amount)
            .rpc();
    }

    /**
     * Initialize the global bank config.
     */
    public async initializeBank(feeBps: number) {
        return await this.program.methods
            .initializeBank(feeBps)
            .rpc();
    }

    /**
     * Withdraw funds from the vault to a destination (subject to limit).
     */
    public async withdraw(amountSol: number, destination: PublicKey) {
        const amount = new BN(amountSol * anchor.web3.LAMPORTS_PER_SOL);
        const [configPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            this.program.programId
        );
        const [treasuryPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("treasury")],
            this.program.programId
        );

        return await this.program.methods
            .withdraw(amount)
            .accounts({
                destination: destination,
                config: configPda,
                treasury: treasuryPda,
            })
            .rpc();
    }

    /**
     * Fetch agent account data.
     */
    public async getAgentData(owner: PublicKey) {
        const agentPda = this.getAgentPda(owner);
        return await (this.program.account as any).agent.fetch(agentPda);
    }

    /**
     * Accrue yield manually (Cranks/Agents can call this).
     */
    public async accrueYield(agentOwner: PublicKey) {
        const agentPda = this.getAgentPda(agentOwner);
        return await this.program.methods
            .accrueYield()
            .accounts({
                agent: agentPda
            })
            .rpc();
    }

    /**
     * 🧠 TRANSACTION INTENT VALIDATION
     * Pre-validate a withdrawal BEFORE committing to it.
     * 
     * CRITICAL for autonomous agents that need certainty before executing trades.
     * Returns validation result without modifying state.
     * 
     * @param agentOwner - The owner of the agent vault
     * @param amountSol - Amount in SOL the agent intends to withdraw
     * @param memo - Human/AI readable description (e.g., "Swap 1 SOL for USDC on Jupiter")
     * @param executionTime - Optional Unix timestamp for time-sensitive validation
     * @returns Promise<IntentValidationResult>
     * 
     * @example
     * // Before executing a trade, validate the intent:
     * const result = await bank.validateIntent(
     *   agentWallet.publicKey,
     *   1.5,
     *   "Swap 1.5 SOL for USDC on Jupiter",
     * );
     * if (result.valid) {
     *   // Safe to proceed with the trade
     *   await bank.withdraw(1.5, jupiterAddress);
     * } else {
     *   console.log("Cannot execute:", result.reason);
     * }
     */
    public async validateIntent(
        agentOwner: PublicKey,
        amountSol: number,
        memo: string,
        executionTime?: number
    ): Promise<IntentValidationResult> {
        const amount = new BN(amountSol * anchor.web3.LAMPORTS_PER_SOL);
        const agentPda = this.getAgentPda(agentOwner);
        const vaultPda = this.getVaultPda(agentPda);

        try {
            await this.program.methods
                .validateIntent({
                    amount,
                    memo,
                    executionTime: executionTime ? new BN(executionTime) : null,
                })
                .accounts({
                    requester: this.provider.wallet.publicKey,
                    agent: agentPda,
                    vault: vaultPda,
                })
                .rpc();

            // If we get here, intent is valid
            const agentData = await this.getAgentData(agentOwner);
            const vaultBalance = await this.provider.connection.getBalance(vaultPda);
            
            return {
                valid: true,
                remainingLimit: Number(agentData.spendingLimit) - Number(agentData.currentPeriodSpend),
                vaultBalance: vaultBalance,
                currentPeriodSpend: Number(agentData.currentPeriodSpend),
                periodResetsAt: Number(agentData.currentPeriodStart) + Number(agentData.periodDuration),
            };
        } catch (error: any) {
            // Parse the error to determine the reason
            const errorMessage = error.message || error.toString();
            let reason = "unknown_error";
            
            if (errorMessage.includes("IntentWouldExceedLimit") || errorMessage.includes("spending_limit")) {
                reason = "spending_limit_exceeded";
            } else if (errorMessage.includes("IntentInsufficientFunds") || errorMessage.includes("insufficient")) {
                reason = "insufficient_funds";
            }
            
            return {
                valid: false,
                reason,
                remainingLimit: 0,
                vaultBalance: 0,
                currentPeriodSpend: 0,
                periodResetsAt: 0,
            };
        }
    }

    /**
     * Get current spending status for the agent.
     * Useful for displaying limits and remaining budget.
     */
    public async getSpendingStatus(agentOwner: PublicKey): Promise<SpendingStatus> {
        const agentData = await this.getAgentData(agentOwner);
        const clock = await this.provider.connection.getSlot();
        const blockTime = await this.provider.connection.getBlockTime(clock) || Math.floor(Date.now() / 1000);
        
        const periodStart = Number(agentData.currentPeriodStart);
        const periodDuration = Number(agentData.periodDuration);
        const periodEnd = periodStart + periodDuration;
        const isPeriodActive = blockTime < periodEnd;
        
        return {
            spendingLimit: Number(agentData.spendingLimit),
            currentPeriodSpend: isPeriodActive ? Number(agentData.currentPeriodSpend) : 0,
            remainingBudget: isPeriodActive 
                ? Number(agentData.spendingLimit) - Number(agentData.currentPeriodSpend)
                : Number(agentData.spendingLimit),
            periodResetsAt: isPeriodActive ? periodEnd : blockTime + periodDuration,
            periodDuration: periodDuration,
        };
    }

    // ============ AGENTIC HOOKS ============

    /**
     * Get the PDA for a yield strategy account.
     */
    public getYieldStrategyPda(agentPda: PublicKey): PublicKey {
        const [strategyPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("yield_strategy"), agentPda.toBuffer()],
            this.program.programId
        );
        return strategyPda;
    }

    /**
     * 🪝 AGENTIC HOOKS: Configure automated yield strategy
     * 
     * Set up a hook that auto-deploys vault funds to DeFi protocols
     * when specified conditions are met.
     * 
     * @param condition - When to trigger (BalanceAbove, TimeElapsed, YieldAbove)
     * @param protocol - Where to deploy (Internal, Jupiter, Meteora, Marinade)
     * @param deployPercentage - Percentage of staked amount to deploy (0-100)
     * @param enabled - Whether the hook is active
     * 
     * @example
     * // Auto-deploy 50% to Marinade when balance exceeds 10 SOL
     * await bank.configureYieldStrategy(
     *   { balanceAbove: { threshold: new BN(10 * LAMPORTS_PER_SOL) } },
     *   { marinade: {} },
     *   50,
     *   true
     * );
     */
    public async configureYieldStrategy(
        condition: HookCondition,
        protocol: YieldProtocol,
        deployPercentage: number,
        enabled: boolean
    ) {
        const agentPda = this.getAgentPda(this.provider.wallet.publicKey);
        const strategyPda = this.getYieldStrategyPda(agentPda);

        return await this.program.methods
            .configureYieldStrategy(condition, protocol, deployPercentage, enabled)
            .accounts({
                owner: this.provider.wallet.publicKey,
                agent: agentPda,
                yieldStrategy: strategyPda,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
    }

    /**
     * 🔔 Trigger a yield hook (permissionless crank)
     * 
     * Anyone can call this when conditions are met.
     * Useful for keepers/bots to auto-execute yield strategies.
     * 
     * @param agentOwner - The owner of the agent whose hook to trigger
     */
    public async triggerYieldHook(agentOwner: PublicKey) {
        const agentPda = this.getAgentPda(agentOwner);
        const vaultPda = this.getVaultPda(agentPda);
        const strategyPda = this.getYieldStrategyPda(agentPda);

        return await this.program.methods
            .triggerYieldHook()
            .accounts({
                cranker: this.provider.wallet.publicKey,
                agent: agentPda,
                vault: vaultPda,
                yieldStrategy: strategyPda,
            })
            .rpc();
    }

    /**
     * 📊 Check if a yield hook would trigger (read-only)
     * 
     * Returns status without modifying state.
     * 
     * @param agentOwner - The owner of the agent to check
     */
    public async checkHookStatus(agentOwner: PublicKey): Promise<HookStatus> {
        const agentPda = this.getAgentPda(agentOwner);
        const strategyPda = this.getYieldStrategyPda(agentPda);

        try {
            // This will emit logs with the status
            await this.program.methods
                .checkHookStatus()
                .accounts({
                    agent: agentPda,
                    yieldStrategy: strategyPda,
                })
                .simulate();

            // Fetch strategy data for detailed status
            const strategyData = await (this.program.account as any).yieldStrategy.fetch(strategyPda);
            const agentData = await this.getAgentData(agentOwner);
            
            return {
                enabled: strategyData.enabled,
                protocol: strategyData.protocol,
                deployPercentage: strategyData.deployPercentage,
                lastTriggered: Number(strategyData.lastTriggered),
                triggerCount: Number(strategyData.triggerCount),
                stakedAmount: Number(agentData.stakedAmount),
            };
        } catch (error: any) {
            // Strategy may not exist yet
            return {
                enabled: false,
                protocol: null,
                deployPercentage: 0,
                lastTriggered: 0,
                triggerCount: 0,
                stakedAmount: 0,
            };
        }
    }
}

/**
 * Result of transaction intent validation
 */
export interface IntentValidationResult {
    valid: boolean;
    reason?: string;
    remainingLimit: number;
    vaultBalance: number;
    currentPeriodSpend: number;
    periodResetsAt: number;
}

/**
 * Current spending status for an agent
 */
export interface SpendingStatus {
    spendingLimit: number;
    currentPeriodSpend: number;
    remainingBudget: number;
    periodResetsAt: number;
    periodDuration: number;
}

// ============ AGENTIC HOOKS TYPES ============

/**
 * Conditions that can trigger an agentic hook
 */
export type HookCondition = 
    | { balanceAbove: { threshold: anchor.BN } }
    | { timeElapsed: { interval: anchor.BN } }
    | { yieldAbove: { threshold: anchor.BN } };

/**
 * Target DeFi protocols for yield deployment
 */
export type YieldProtocol = 
    | { internal: {} }
    | { jupiter: {} }
    | { meteora: {} }
    | { marinade: {} };

/**
 * Status of a yield hook
 */
export interface HookStatus {
    enabled: boolean;
    protocol: YieldProtocol | null;
    deployPercentage: number;
    lastTriggered: number;
    triggerCount: number;
    stakedAmount: number;
}

// ============ SECURE WITHDRAWAL HELPER ============

import { NeoBankSecurityLayer, SecurityCheckResult } from "./security-layer";

/**
 * Combined result of security check + intent validation
 */
export interface SecureWithdrawalCheck {
    canProceed: boolean;
    security: SecurityCheckResult;
    intent: IntentValidationResult | null;
    blockedReason?: string;
}

/**
 * Helper class for secure withdrawals with full validation
 */
export class SecureAgentBank {
    private bank: AgentNeoBank;
    private security: NeoBankSecurityLayer;

    constructor(bank: AgentNeoBank, securityConfig?: any) {
        this.bank = bank;
        this.security = new NeoBankSecurityLayer(securityConfig);
    }

    /**
     * Full validation before withdrawal:
     * 1. Security layer (scam detection, reputation)
     * 2. Intent validation (spending limits, balance)
     */
    async validateWithdrawal(
        owner: PublicKey,
        destination: PublicKey,
        amountSol: number
    ): Promise<SecureWithdrawalCheck> {
        // Step 1: Security checks
        const securityResult = await this.security.validateWithdrawal(
            destination,
            amountSol
        );

        if (!securityResult.approved) {
            return {
                canProceed: false,
                security: securityResult,
                intent: null,
                blockedReason: `Security: ${securityResult.blockedReason}`,
            };
        }

        // Step 2: Intent validation (on-chain limits)
        try {
            const intentResult = await this.bank.validateIntent(
                owner,
                amountSol,
                `Withdraw ${amountSol} SOL to ${destination.toBase58()}`
            );

            if (!intentResult.valid) {
                return {
                    canProceed: false,
                    security: securityResult,
                    intent: intentResult,
                    blockedReason: `Limit: ${intentResult.reason}`,
                };
            }

            return {
                canProceed: true,
                security: securityResult,
                intent: intentResult,
            };
        } catch (error: any) {
            return {
                canProceed: false,
                security: securityResult,
                intent: null,
                blockedReason: `Intent check failed: ${error.message}`,
            };
        }
    }

    /**
     * Execute withdrawal only if all checks pass
     */
    async safeWithdraw(
        owner: PublicKey,
        destination: PublicKey,
        amountSol: number
    ): Promise<{ success: boolean; signature?: string; error?: string }> {
        const check = await this.validateWithdrawal(owner, destination, amountSol);

        if (!check.canProceed) {
            return { success: false, error: check.blockedReason };
        }

        try {
            const signature = await this.bank.withdraw(amountSol, destination);
            return { success: true, signature };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
