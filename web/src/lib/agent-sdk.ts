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
     * Withdraw funds from the vault to a destination (subject to limit).
     */
    public async withdraw(amountSol: number, destination: PublicKey) {
        const amount = new BN(amountSol * anchor.web3.LAMPORTS_PER_SOL);
        return await this.program.methods
            .withdraw(amount)
            .accounts({
                destination: destination,
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
}
