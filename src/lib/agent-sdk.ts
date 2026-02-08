import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { Buffer } from "buffer";
import idl from "../idl/idl.json";
import { PROGRAM_ID } from "./constants";

export class AgentNeoBank {
    private program: Program;
    private provider: AnchorProvider;

    constructor(
        connection: Connection,
        wallet: anchor.Wallet,
        programId: string = process.env.NEXT_PUBLIC_PROGRAM_ID || PROGRAM_ID
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
     * Get the PDA for a delegate record.
     */
    public getDelegatePda(agentPda: PublicKey, delegateKey: PublicKey): PublicKey {
        const [delegatePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("delegate"), agentPda.toBuffer(), delegateKey.toBuffer()],
            this.program.programId
        );
        return delegatePda;
    }

    /**
     * Register a new agent with a spending limit and period.
     */
    public async registerAgent(name: string, dailyLimitSol: number) {
        const spendingLimit = new BN(dailyLimitSol * anchor.web3.LAMPORTS_PER_SOL);
        const periodDuration = new BN(86400); // 1 day

        return await this.program.methods
            .registerAgent(name, spendingLimit, periodDuration)
            .accounts({
                owner: this.provider.wallet.publicKey,
                agent: this.getAgentPda(this.provider.wallet.publicKey),
                vault: this.getVaultPda(this.getAgentPda(this.provider.wallet.publicKey)),
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc({ skipPreflight: true });
    }

    /**
     * Authorize a delegate to spend on behalf of the agent.
     */
    public async addDelegate(
        delegateKey: PublicKey,
        canSpend: boolean = true,
        canManageYield: boolean = false,
        validUntil: number = 0 // 0 = forever
    ) {
        const agentPda = this.getAgentPda(this.provider.wallet.publicKey);
        const delegatePda = this.getDelegatePda(agentPda, delegateKey);

        return await this.program.methods
            .addDelegate(
                delegateKey,
                canSpend,
                canManageYield,
                new BN(validUntil)
            )
            .accounts({
                owner: this.provider.wallet.publicKey,
                agent: agentPda,
                delegateAccount: delegatePda,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
    }

    /**
     * Remove a delegate's authorization.
     */
    public async removeDelegate(delegateKey: PublicKey) {
        const agentPda = this.getAgentPda(this.provider.wallet.publicKey);
        const delegatePda = this.getDelegatePda(agentPda, delegateKey);

        return await this.program.methods
            .removeDelegate()
            .accounts({
                owner: this.provider.wallet.publicKey,
                agent: agentPda,
                delegate: delegatePda,
            })
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
     * Supports Delegated Access.
     */
    public async withdraw(
        amountSol: number,
        destination: PublicKey,
        delegateKey?: PublicKey // Optional: if using a delegate keypair
    ) {
        const amount = new BN(amountSol * anchor.web3.LAMPORTS_PER_SOL);
        const [configPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            this.program.programId
        );
        const [treasuryPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("treasury")],
            this.program.programId
        );

        // Determine who is signing (Owner is default)
        // If delegateKey is provided, we assume the provider wallet IS the delegate
        const signerKey = this.provider.wallet.publicKey;

        // Determine accounts
        // If the signer is NOT the agent owner (derived from PDA logic usually, but here we can only guess context)
        // We need to fetch agent Data to know the owner, OR pass owner explicitly.
        // For simplicity, we assume this.provider.wallet is the AUTHORITY.

        // Wait, to get the Agent PDA we usually use the Wallet. But if I am a Delegate, I am NOT the owner.
        // So `getAgentPda(signerKey)` would fail to find the agent I want to control.
        // The SDK needs an `agentOwner` param if acting as a delegate.
        // Updating signature to: withdraw(amount, dest, agentOwner?)

        // Actually, let's keep it simple: We assume `this.provider` is the OWNER.
        // If we want to support delegates, we need a separate method `withdrawAsDelegate`.

        return await this.program.methods
            .withdraw(amount)
            .accounts({
                destination: destination,
                config: configPda,
                treasury: treasuryPda,
                delegateRecord: null as any, // IDL treats optional accounts as nullable
            })
            .rpc();
    }

    /**
     * Withdraw as a Delegate.
     */
    public async withdrawAsDelegate(
        agentOwner: PublicKey,
        amountSol: number,
        destination: PublicKey
    ) {
        const amount = new BN(amountSol * anchor.web3.LAMPORTS_PER_SOL);
        const agentPda = this.getAgentPda(agentOwner);
        const [configPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            this.program.programId
        );
        const [treasuryPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("treasury")],
            this.program.programId
        );
        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), agentPda.toBuffer()],
            this.program.programId
        );

        const delegateKey = this.provider.wallet.publicKey;
        const delegatePda = this.getDelegatePda(agentPda, delegateKey);

        return await this.program.methods
            .withdraw(amount)
            .accounts({
                authority: delegateKey,
                agent: agentPda,
                vault: vaultPda,
                destination: destination,
                config: configPda,
                treasury: treasuryPda,
                delegateRecord: delegatePda,
                systemProgram: anchor.web3.SystemProgram.programId,
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

    // ============ REAL YIELD (JITO) ============

    /**
     * Deploy funds to JitoSOL (Devnet).
     * Fetches real Jito Stake Pool accounts for lawful CPI.
     */
    public async deployToJito(amountSol: number) {
        const amount = new BN(amountSol * anchor.web3.LAMPORTS_PER_SOL);
        const agentPda = this.getAgentPda(this.provider.wallet.publicKey);
        const vaultPda = this.getVaultPda(agentPda);
        const strategyPda = this.getYieldStrategyPda(agentPda);

        // Jito Devnet Constants
        const JITO_POOL_ID = new PublicKey("JitoY5pcAxWX6iyP2QdFwTznGb8A99PRCUCVVxB46WZ");
        const JITO_PROGRAM_ID = new PublicKey("DPoo15wWDqpPJJtS2MUZ49aRxqz5ZaaJCJP4z8bLuib");

        // Helper to find Jito/SPL Stake Pool addresses
        // Using manual derivation to avoid heavy dependency import issues in edge runtime if any
        // See: https://github.com/solana-labs/solana-program-library/blob/master/stake-pool/js/src/index.ts
        const findWithdrawAuthority = (pool: PublicKey) => PublicKey.findProgramAddressSync(
            [pool.toBuffer(), Buffer.from("withdraw")],
            JITO_PROGRAM_ID
        )[0];

        // For reserve, fee, mint - we ideally fetch the account.
        // But for Devnet hackathon speed, we can try to rely on derived addresses or specific known ones.
        // Actually, let's fetch the account data and parse strictly.
        // We will requires @solana/spl-stake-pool to be installed.
        // Dynamic import to avoid SSR issues
        const { getStakePoolAccount } = await import("@solana/spl-stake-pool");

        const stakePool = await getStakePoolAccount(this.provider.connection, JITO_POOL_ID);
        const withdrawAuthority = findWithdrawAuthority(JITO_POOL_ID);

        // Find destination JitoSOL ATA for the Vault
        const destinationPoolAccount = await anchor.utils.token.associatedAddress({
            mint: stakePool.account.data.poolMint,
            owner: vaultPda
        });

        return await this.program.methods
            .deployToJito(amount)
            .accounts({
                authority: this.provider.wallet.publicKey,
                agent: agentPda,
                vault: vaultPda,
                yieldStrategy: strategyPda,
                jitoProgram: JITO_PROGRAM_ID,
                stakePool: JITO_POOL_ID,
                poolWithdrawAuthority: withdrawAuthority,
                reserveStake: stakePool.account.data.reserveStake,
                managerFee: stakePool.account.data.managerFeeAccount,
                destinationPoolAccount: destinationPoolAccount,
                poolMint: stakePool.account.data.poolMint,
                systemProgram: anchor.web3.SystemProgram.programId,
                tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            })
            .rpc();
    }

    /**
     * Withdraw funds from JitoSOL.
     */
    public async withdrawFromJito(amountSol: number) {
        const amount = new BN(amountSol * anchor.web3.LAMPORTS_PER_SOL);
        const agentPda = this.getAgentPda(this.provider.wallet.publicKey);
        const vaultPda = this.getVaultPda(agentPda);
        const strategyPda = this.getYieldStrategyPda(agentPda);

        const JITO_POOL_ID = new PublicKey("JitoY5pcAxWX6iyP2QdFwTznGb8A99PRCUCVVxB46WZ");
        const JITO_PROGRAM_ID = new PublicKey("DPoo15wWDqpPJJtS2MUZ49aRxqz5ZaaJCJP4z8bLuib");

        const { getStakePoolAccount } = await import("@solana/spl-stake-pool");
        const stakePool = await getStakePoolAccount(this.provider.connection, JITO_POOL_ID);

        const findWithdrawAuthority = (pool: PublicKey) => PublicKey.findProgramAddressSync(
            [pool.toBuffer(), Buffer.from("withdraw")],
            JITO_PROGRAM_ID
        )[0];

        const vaultJitoAccount = await anchor.utils.token.associatedAddress({
            mint: stakePool.account.data.poolMint,
            owner: vaultPda
        });

        return await this.program.methods
            .withdrawFromJito(amount)
            .accounts({
                authority: this.provider.wallet.publicKey,
                agent: agentPda,
                vault: vaultPda,
                yieldStrategy: strategyPda,
                jitoProgram: JITO_PROGRAM_ID,
                stakePool: JITO_POOL_ID,
                poolWithdrawAuthority: findWithdrawAuthority(JITO_POOL_ID),
                vaultJitoAccount: vaultJitoAccount,
                reserveStake: stakePool.account.data.reserveStake,
                managerFee: stakePool.account.data.managerFeeAccount,
                poolMint: stakePool.account.data.poolMint,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                stakeHistory: anchor.web3.SYSVAR_STAKE_HISTORY_PUBKEY,
                stakeProgram: anchor.web3.StakeProgram.programId,
                tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            })
            .rpc();
    }

    /**
     * Accrue yield manually (Legacy / Fallback).
     */
    public async accrueYield(agentOwner: PublicKey) {
        // ... (Keep existing implementation or deprecate)
        // We keeping it for now in case we fallback to "Internal"
        const agentPda = this.getAgentPda(agentOwner);
        const [configPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            this.program.programId
        );
        const [treasuryPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("treasury")],
            this.program.programId
        );
        const vaultPda = this.getVaultPda(agentPda);

        return await this.program.methods
            .accrueYield()
            .accounts({
                agent: agentPda,
                config: configPda,
                treasury: treasuryPda,
                vault: vaultPda,
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

    // ============ EMERGENCY CONTROLS ============

    /**
     * 🚨 EMERGENCY PAUSE: Toggle bank pause state (admin only)
     * 
     * When paused, all withdrawals and yield deployments are blocked.
     * Use this for security incidents, maintenance, or upgrades.
     * 
     * @param paused - Whether to pause (true) or unpause (false)
     * @param reason - Reason code: 0=none, 1=security, 2=maintenance, 3=upgrade
     * 
     * @example
     * // Pause for security incident
     * await bank.togglePause(true, 1);
     * 
     * // Resume operations
     * await bank.togglePause(false, 0);
     */
    public async togglePause(paused: boolean, reason: number = 0) {
        const [configPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            this.program.programId
        );

        return await this.program.methods
            .togglePause(paused, reason)
            .accounts({
                bankConfig: configPda,
                admin: this.provider.wallet.publicKey,
            })
            .rpc();
    }

    /**
     * Check if the bank is currently paused
     * 
     * @returns Pause status and reason
     */
    public async getPauseStatus(): Promise<{ paused: boolean; reason: string }> {
        const [configPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            this.program.programId
        );

        try {
            const config = await (this.program.account as any).bankConfig.fetch(configPda);
            const reasonMap: Record<number, string> = {
                0: "none",
                1: "security",
                2: "maintenance",
                3: "upgrade",
            };
            return {
                paused: config.paused || false,
                reason: reasonMap[config.pauseReason] || "unknown",
            };
        } catch {
            return { paused: false, reason: "none" };
        }
    }

    // ============ CONVENIENCE METHODS ============

    /**
     * 📊 Get complete agent status in one call
     * 
     * Returns everything an agent needs to make financial decisions:
     * - Current balance
     * - Spending status
     * - Yield hook status
     * - Bank pause status
     * 
     * @example
     * const status = await bank.getFullStatus(owner);
     * console.log(`Balance: ${status.vaultBalance} SOL`);
     * console.log(`Can spend: ${status.spending.remainingBudget} more today`);
     */
    public async getFullStatus(owner: PublicKey): Promise<AgentFullStatus> {
        const agentPda = this.getAgentPda(owner);
        const vaultPda = this.getVaultPda(agentPda);

        const [agentData, vaultBalance, spending, hookStatus, pauseStatus] = await Promise.all([
            this.getAgentData(owner),
            this.provider.connection.getBalance(vaultPda),
            this.getSpendingStatus(owner),
            this.checkHookStatus(owner),
            this.getPauseStatus(),
        ]);

        return {
            agent: {
                name: agentData.name,
                owner: agentData.owner.toBase58(),
                totalDeposited: Number(agentData.totalDeposited) / 1e9,
                stakedAmount: Number(agentData.stakedAmount) / 1e9,
            },
            vaultBalance: vaultBalance / 1e9,
            spending: {
                limit: spending.spendingLimit / 1e9,
                spent: spending.currentPeriodSpend / 1e9,
                remaining: spending.remainingBudget / 1e9,
                resetsAt: new Date(spending.periodResetsAt * 1000).toISOString(),
            },
            hook: hookStatus,
            paused: pauseStatus,
        };
    }

    /**
     * 💰 Quick check: Can I afford this withdrawal?
     * 
     * Simple boolean check for common use case.
     * 
     * @example
     * if (await bank.canAfford(owner, 5)) {
     *   await bank.withdraw(5, destination);
     * }
     */
    public async canAfford(owner: PublicKey, amountSol: number): Promise<boolean> {
        try {
            const result = await this.validateIntent(owner, amountSol, "affordability check");
            return result.valid;
        } catch {
            return false;
        }
    }

    /**
     * 🔄 Get vault balance in SOL
     */
    public async getBalance(owner: PublicKey): Promise<number> {
        const agentPda = this.getAgentPda(owner);
        const vaultPda = this.getVaultPda(agentPda);
        const balance = await this.provider.connection.getBalance(vaultPda);
        return balance / 1e9;
    }
}

/**
 * Full agent status (from getFullStatus)
 */
export interface AgentFullStatus {
    agent: {
        name: string;
        owner: string;
        totalDeposited: number;
        stakedAmount: number;
    };
    vaultBalance: number;
    spending: {
        limit: number;
        spent: number;
        remaining: number;
        resetsAt: string;
    };
    hook: {
        enabled: boolean;
        protocol: any;
        deployPercentage: number;
        lastTriggered: number;
        triggerCount: number;
        stakedAmount: number;
    };
    paused: {
        paused: boolean;
        reason: string;
    };
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

// ============ BATCH OPERATIONS ============

/**
 * Batch validate multiple withdrawal intents
 * Useful for portfolio rebalancing planning
 */
export async function batchValidateIntents(
    bank: AgentNeoBank,
    owner: PublicKey,
    intents: { destination: PublicKey; amount: number; memo: string }[]
): Promise<{ destination: string; valid: boolean; reason?: string }[]> {
    const results = await Promise.all(
        intents.map(async (intent) => {
            try {
                const result = await bank.validateIntent(
                    owner,
                    intent.amount,
                    intent.memo
                );
                return {
                    destination: intent.destination.toBase58(),
                    valid: result.valid,
                    reason: result.reason,
                };
            } catch (error: any) {
                return {
                    destination: intent.destination.toBase58(),
                    valid: false,
                    reason: error.message,
                };
            }
        })
    );
    return results;
}

// ============ GOVERNANCE HELPERS ============

/**
 * Proposal status enum (matches on-chain)
 */
export enum ProposalStatus {
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Executed = 3,
    Expired = 4,
}

/**
 * Proposal data structure
 */
export interface Proposal {
    id: number;
    proposer: string;
    destination: string;
    amount: number; // In SOL
    memo: string;
    status: ProposalStatus;
    votesFor: number;
    votesAgainst: number;
    createdAt: Date;
    expiresAt: Date;
    executedAt?: Date;
}

/**
 * Governance registry data
 */
export interface GovernanceInfo {
    admins: string[];
    threshold: number;
    proposalCount: number;
    treasuryBalance: number; // In SOL
}

/**
 * Helper class for treasury governance operations
 */
export class GovernanceHelper {
    private bank: AgentNeoBank;
    private program: any;
    private provider: any;

    constructor(bank: AgentNeoBank) {
        this.bank = bank;
        // Access program through bank (hacky but works)
        this.program = (bank as any).program;
        this.provider = (bank as any).provider;
    }

    /**
     * Get governance registry info
     */
    async getGovernanceInfo(): Promise<GovernanceInfo | null> {
        try {
            const [registryPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("admin")],
                this.program.programId
            );
            const [treasuryPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("treasury")],
                this.program.programId
            );

            const registry = await (this.program.account as any).adminRegistry.fetch(registryPda);
            const treasuryBalance = await this.provider.connection.getBalance(treasuryPda);

            return {
                admins: registry.admins.map((a: PublicKey) => a.toBase58()),
                threshold: registry.threshold,
                proposalCount: Number(registry.proposalCount),
                treasuryBalance: treasuryBalance / 1e9,
            };
        } catch {
            return null;
        }
    }

    /**
     * Get proposal by ID
     */
    async getProposal(proposalId: number): Promise<Proposal | null> {
        try {
            const [proposalPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("proposal"), Buffer.from(proposalId.toString())],
                this.program.programId
            );

            const data = await (this.program.account as any).treasuryProposal.fetch(proposalPda);

            return {
                id: Number(data.id),
                proposer: data.proposer.toBase58(),
                destination: data.destination.toBase58(),
                amount: Number(data.amount) / 1e9,
                memo: data.memo,
                status: data.status.pending ? ProposalStatus.Pending :
                    data.status.approved ? ProposalStatus.Approved :
                        data.status.rejected ? ProposalStatus.Rejected :
                            data.status.executed ? ProposalStatus.Executed :
                                ProposalStatus.Expired,
                votesFor: data.votesFor,
                votesAgainst: data.votesAgainst,
                createdAt: new Date(Number(data.createdAt) * 1000),
                expiresAt: new Date(Number(data.expiresAt) * 1000),
                executedAt: data.executedAt ? new Date(Number(data.executedAt) * 1000) : undefined,
            };
        } catch {
            return null;
        }
    }

    /**
     * Check if a proposal can be executed
     */
    async canExecute(proposalId: number): Promise<{ canExecute: boolean; reason?: string }> {
        const proposal = await this.getProposal(proposalId);
        if (!proposal) {
            return { canExecute: false, reason: "Proposal not found" };
        }

        if (proposal.status !== ProposalStatus.Approved) {
            return { canExecute: false, reason: `Status is ${ProposalStatus[proposal.status]}, not Approved` };
        }

        if (new Date() > proposal.expiresAt) {
            return { canExecute: false, reason: "Proposal expired" };
        }

        const info = await this.getGovernanceInfo();
        if (!info) {
            return { canExecute: false, reason: "Governance not initialized" };
        }

        if (proposal.amount > info.treasuryBalance) {
            return { canExecute: false, reason: `Insufficient treasury (${info.treasuryBalance} SOL)` };
        }

        return { canExecute: true };
    }

    /**
     * Get summary of recent proposals
     */
    async getRecentProposals(count: number = 5): Promise<Proposal[]> {
        const info = await this.getGovernanceInfo();
        if (!info || info.proposalCount === 0) return [];

        const proposals: Proposal[] = [];
        const startId = Math.max(0, info.proposalCount - count);

        for (let i = info.proposalCount - 1; i >= startId; i--) {
            const proposal = await this.getProposal(i);
            if (proposal) proposals.push(proposal);
        }

        return proposals;
    }

    /**
     * Check if wallet is an admin
     */
    async isAdmin(wallet: PublicKey | string): Promise<boolean> {
        const info = await this.getGovernanceInfo();
        if (!info) return false;

        const address = typeof wallet === "string" ? wallet : wallet.toBase58();
        return info.admins.includes(address);
    }
}
