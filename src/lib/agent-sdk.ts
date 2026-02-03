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
