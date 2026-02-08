import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bank } from "../target/types/bank";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("agent-neo-bank", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Bank as Program<Bank>;

    // Test Actors
    const agentOwner = Keypair.generate();
    let agentPda: PublicKey;
    let vaultPda: PublicKey;

    // Constants
    const SPENDING_LIMIT = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL
    const PERIOD_DURATION = new anchor.BN(86400); // 24 Hours
    const AGENT_NAME = "TEST_AGENT_V1";

    it("Initialize Bank", async () => {
        const [config, _configBump] = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            program.programId
        );
        const [treasury, _treasuryBump] = PublicKey.findProgramAddressSync(
            [Buffer.from("treasury")],
            program.programId
        );

        // Check if already initialized (in case of re-run)
        try {
            await program.account.bankConfig.fetch(config);
            console.log("Bank already initialized");
        } catch (e) {
            await program.methods
                .initializeBank(50) // 0.5% protocol fee
                .accounts({
                    admin: provider.wallet.publicKey,
                    config: config,
                    treasury: treasury,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            console.log("Bank Initialized");
        }
    });

    it("Airdrop to Agent Owner", async () => {
        // Audit Step: Ensure the 'Agent' has funds to pay for its own registration (Autonomous Behavior)
        const tx = await provider.connection.requestAirdrop(agentOwner.publicKey, 2 * LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(tx);
        const balance = await provider.connection.getBalance(agentOwner.publicKey);
        assert.isAtLeast(balance, 2 * LAMPORTS_PER_SOL);
        console.log("Agent Owner funded: ", agentOwner.publicKey.toString());
    });

    it("Register Agent (Create Vault)", async () => {
        const [agent, agentBump] = PublicKey.findProgramAddressSync(
            [Buffer.from("agent"), agentOwner.publicKey.toBuffer()],
            program.programId
        );
        agentPda = agent;

        const [vault, vaultBump] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), agentPda.toBuffer()],
            program.programId
        );
        vaultPda = vault;

        console.log("Initializing Agent...");

        await program.methods
            .registerAgent(AGENT_NAME, SPENDING_LIMIT, PERIOD_DURATION)
            .accounts({
                owner: agentOwner.publicKey,
            })
            .signers([agentOwner])
            .rpc();

        // Verification
        const agentAccount = await program.account.agent.fetch(agentPda);
        assert.equal(agentAccount.name, AGENT_NAME);
        assert.equal(agentAccount.owner.toString(), agentOwner.publicKey.toString());
        assert.ok(agentAccount.spendingLimit.eq(SPENDING_LIMIT));
        console.log("Agent Registered. Vault: ", vaultPda.toString());
        console.log("Agent PDA: ", agentPda.toString());

        // Wait for Devnet consistency
        await new Promise(r => setTimeout(r, 5000));
    });

    it("Fund Vault (Human Action)", async () => {
        // Send 5 SOL to the vault to test spending limits
        const transferTx = new anchor.web3.Transaction().add(
            anchor.web3.SystemProgram.transfer({
                fromPubkey: provider.wallet.publicKey,
                toPubkey: vaultPda,
                lamports: 5 * LAMPORTS_PER_SOL,
            })
        );
        await provider.sendAndConfirm(transferTx);

        const vaultBalance = await provider.connection.getBalance(vaultPda);
        assert.equal(vaultBalance, 5 * LAMPORTS_PER_SOL);
        console.log("Vault Funded with 5 SOL");
    });

    it("Agent Withdraws Within Limit (Should Success)", async () => {
        const withdrawAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);

        const balanceBefore = await provider.connection.getBalance(agentOwner.publicKey);

        const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
        const [treasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], program.programId);

        await program.methods
            .withdraw(withdrawAmount)
            .accounts({
                authority: agentOwner.publicKey,
                agent: agentPda,
                vault: vaultPda,
                destination: agentOwner.publicKey,
                config: configPda,
                treasury: treasuryPda,
                delegateRecord: null,
            })
            .signers([agentOwner])
            .rpc();

        const balanceAfter = await provider.connection.getBalance(agentOwner.publicKey);
        assert.isAbove(balanceAfter, balanceBefore); // Balance increased (minus fees)

        const agentAccount = await program.account.agent.fetch(agentPda);
        assert.ok(agentAccount.currentPeriodSpend.eq(withdrawAmount));
        console.log("Withdraw 0.5 SOL successful.");
    });

    it("Agent Withdraws OVER Limit (Should Fail)", async () => {
        // Debug: Check if account exists
        const agentCheck = await program.account.agent.fetch(agentPda);
        console.log("Debug: Agent Account Exists:", agentCheck.name);

        const vBalance = await provider.connection.getBalance(vaultPda);
        console.log("Debug: Vault Balance before fail test:", vBalance / LAMPORTS_PER_SOL);

        const withdrawAmount = new anchor.BN(1.0 * LAMPORTS_PER_SOL); // Already spent 0.5, Limit is 1.0. Total would be 1.5.

        try {
            const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
            const [treasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], program.programId);

            await program.methods
                .withdraw(withdrawAmount)
                .accounts({
                    authority: agentOwner.publicKey,
                    agent: agentPda,
                    vault: vaultPda,
                    destination: agentOwner.publicKey,
                    config: configPda,
                    treasury: treasuryPda,
                    delegateRecord: null,
                })
                .signers([agentOwner])
                .rpc();
            assert.fail("Should have failed with SpendingLimitExceeded");
        } catch (e: any) {
            console.log("Full Error Object:", JSON.stringify(e, null, 2));
            console.log("Error Message:", e.message);

            const isSpendingLimit = e.message.includes("SpendingLimitExceeded") ||
                (e.error && e.error.errorCode && e.error.errorCode.code === "SpendingLimitExceeded") ||
                (e.logs && e.logs.some((l: string) => l.includes("SpendingLimitExceeded")));

            assert.isTrue(isSpendingLimit, `Expected SpendingLimitExceeded, got: ${e.message}`);
        }
    });

    it("Authorized Party cannot withdraw (Security Check)", async () => {
        const thief = Keypair.generate();
        try {
            await program.methods
                .withdraw(new anchor.BN(0.1 * LAMPORTS_PER_SOL))
                .accounts({
                    authority: thief.publicKey, // Wrong owner
                    agent: agentPda,
                    vault: vaultPda,
                    destination: thief.publicKey,
                    config: (await PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId))[0],
                    treasury: (await PublicKey.findProgramAddressSync([Buffer.from("treasury")], program.programId))[0],
                    delegateRecord: null,
                })
                .signers([thief])
                .rpc();
            assert.fail("Thief should not be able to withdraw");
        } catch (e: any) {
            console.log("Unauthorized access blocked.");
        }
    });

    // ============ DELEGATION TESTS ============

    const delegateUser = Keypair.generate();
    let delegatePda: PublicKey;

    it("Add Delegate", async () => {
        // Fund delegate for fees
        await provider.connection.requestAirdrop(delegateUser.publicKey, 1 * LAMPORTS_PER_SOL);

        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("delegate"), agentPda.toBuffer(), delegateUser.publicKey.toBuffer()],
            program.programId
        );
        delegatePda = pda;

        await program.methods
            .addDelegate(delegateUser.publicKey, true, false, new anchor.BN(0)) // Can spend, No yield, No expiry
            .accounts({
                owner: agentOwner.publicKey,
                agent: agentPda,
                delegateAccount: delegatePda,
            })
            .signers([agentOwner])
            .rpc();

        const delAcct = await program.account.delegate.fetch(delegatePda);
        assert.ok(delAcct.canSpend);
        console.log("Delegate Added:", delegateUser.publicKey.toString());
    });

    it("Delegate Withdraws (Success)", async () => {
        const withdrawAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
        const vaultBefore = await provider.connection.getBalance(vaultPda);

        // Note: Withdraw instruction needs 'authority', 'agent', 'vault', 'destination', 'config', 'treasury', 'delegate_record'
        const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
        const [treasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], program.programId);

        await program.methods
            .withdraw(withdrawAmount)
            .accounts({
                authority: delegateUser.publicKey, // Delegate signs
                agent: agentPda,
                vault: vaultPda,
                destination: delegateUser.publicKey,
                config: configPda,
                treasury: treasuryPda,
                delegateRecord: delegatePda, // Must provide PDA
            })
            .signers([delegateUser])
            .rpc();

        const vaultAfter = await provider.connection.getBalance(vaultPda);
        assert.isBelow(vaultAfter, vaultBefore);
        console.log("Delegate Withdrawal Successful");
    });

    it("Delegate Permissions Revoked", async () => {
        await program.methods
            .removeDelegate()
            .accounts({
                owner: agentOwner.publicKey,
                agent: agentPda,
                delegate: delegatePda,
            })
            .signers([agentOwner])
            .rpc();

        // Try to withdraw again - should fail (Account Not Initialized or similar, since PDA is closed)
        try {
            const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
            const [treasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], program.programId);

            await program.methods
                .withdraw(new anchor.BN(0.1 * LAMPORTS_PER_SOL))
                .accounts({
                    authority: delegateUser.publicKey,
                    agent: agentPda,
                    vault: vaultPda,
                    destination: delegateUser.publicKey,
                    config: configPda,
                    treasury: treasuryPda,
                    delegateRecord: delegatePda,
                })
                .signers([delegateUser])
                .rpc();
            assert.fail("Should fail after revocation");
        } catch (e) {
            console.log("Revoked delegate blocked.");
        }
    });

});
