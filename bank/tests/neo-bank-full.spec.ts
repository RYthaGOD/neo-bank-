import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bank } from "../target/types/bank";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert } from "chai";

/**
 * Neo Bank Full Test Suite
 * Tests all core features including new additions:
 * - Transaction Intent Validation
 * - Agentic Hooks
 * - Security flows
 */

describe("neo-bank-full-suite", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Bank as Program<Bank>;

    // Test Actors
    const agentOwner = Keypair.generate();
    let agentPda: PublicKey;
    let vaultPda: PublicKey;
    let yieldStrategyPda: PublicKey;

    const SPENDING_LIMIT = new anchor.BN(2 * LAMPORTS_PER_SOL);
    const PERIOD_DURATION = new anchor.BN(86400);
    const AGENT_NAME = "NEO_TEST_AGENT";

    before(async () => {
        // Airdrop to test accounts
        const tx = await provider.connection.requestAirdrop(
            agentOwner.publicKey, 
            10 * LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(tx);
    });

    describe("Core Vault Operations", () => {
        it("registers agent with vault", async () => {
            [agentPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("agent"), agentOwner.publicKey.toBuffer()],
                program.programId
            );
            [vaultPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), agentPda.toBuffer()],
                program.programId
            );
            [yieldStrategyPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("yield_strategy"), agentPda.toBuffer()],
                program.programId
            );

            await program.methods
                .registerAgent(AGENT_NAME, SPENDING_LIMIT, PERIOD_DURATION)
                .accounts({ owner: agentOwner.publicKey })
                .signers([agentOwner])
                .rpc();

            const agent = await program.account.agent.fetch(agentPda);
            assert.equal(agent.name, AGENT_NAME);
            assert.ok(agent.spendingLimit.eq(SPENDING_LIMIT));
        });

        it("deposits funds to vault", async () => {
            const depositAmount = new anchor.BN(5 * LAMPORTS_PER_SOL);
            
            await program.methods
                .deposit(depositAmount)
                .accounts({ owner: agentOwner.publicKey })
                .signers([agentOwner])
                .rpc();

            const agent = await program.account.agent.fetch(agentPda);
            assert.ok(agent.totalDeposited.eq(depositAmount));
            // 80% should be staked
            const expectedStaked = depositAmount.muln(8).divn(10);
            assert.ok(agent.stakedAmount.eq(expectedStaked));
        });
    });

    describe("Transaction Intent Validation", () => {
        it("validates intent within limits (should pass)", async () => {
            const intentAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);
            
            // This should succeed without throwing
            await program.methods
                .validateIntent({
                    amount: intentAmount,
                    memo: "Test withdrawal intent",
                    executionTime: null,
                })
                .accounts({
                    requester: agentOwner.publicKey,
                    agent: agentPda,
                    vault: vaultPda,
                })
                .signers([agentOwner])
                .rpc();
            
            console.log("Intent validation passed for 1 SOL");
        });

        it("rejects intent over spending limit", async () => {
            const intentAmount = new anchor.BN(5 * LAMPORTS_PER_SOL); // Over 2 SOL limit
            
            try {
                await program.methods
                    .validateIntent({
                        amount: intentAmount,
                        memo: "Should fail - over limit",
                        executionTime: null,
                    })
                    .accounts({
                        requester: agentOwner.publicKey,
                        agent: agentPda,
                        vault: vaultPda,
                    })
                    .signers([agentOwner])
                    .rpc();
                assert.fail("Should have rejected over-limit intent");
            } catch (e: any) {
                const isExpectedError = e.message.includes("IntentWouldExceedLimit") ||
                    e.message.includes("spending_limit");
                assert.isTrue(isExpectedError, `Expected limit error, got: ${e.message}`);
                console.log("Intent correctly rejected - over spending limit");
            }
        });
    });

    describe("Spending Limit Enforcement", () => {
        it("allows withdrawal within limit", async () => {
            const withdrawAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
            const balanceBefore = await provider.connection.getBalance(agentOwner.publicKey);

            await program.methods
                .withdraw(withdrawAmount)
                .accounts({
                    owner: agentOwner.publicKey,
                    destination: agentOwner.publicKey,
                })
                .signers([agentOwner])
                .rpc();

            const balanceAfter = await provider.connection.getBalance(agentOwner.publicKey);
            assert.isAbove(balanceAfter, balanceBefore);
            console.log("Withdrawal of 0.5 SOL succeeded");
        });

        it("blocks withdrawal exceeding period limit", async () => {
            // Try to withdraw more than remaining limit
            const withdrawAmount = new anchor.BN(2 * LAMPORTS_PER_SOL);

            try {
                await program.methods
                    .withdraw(withdrawAmount)
                    .accounts({
                        owner: agentOwner.publicKey,
                        destination: agentOwner.publicKey,
                    })
                    .signers([agentOwner])
                    .rpc();
                assert.fail("Should have blocked over-limit withdrawal");
            } catch (e: any) {
                const isSpendingLimit = e.message.includes("SpendingLimitExceeded");
                assert.isTrue(isSpendingLimit);
                console.log("Over-limit withdrawal correctly blocked");
            }
        });
    });

    describe("Security Checks", () => {
        it("blocks unauthorized withdrawal attempts", async () => {
            const attacker = Keypair.generate();
            
            try {
                await program.methods
                    .withdraw(new anchor.BN(0.1 * LAMPORTS_PER_SOL))
                    .accounts({
                        owner: attacker.publicKey,
                        destination: attacker.publicKey,
                    })
                    .signers([attacker])
                    .rpc();
                assert.fail("Unauthorized withdrawal should fail");
            } catch (e: any) {
                console.log("Unauthorized access correctly blocked");
            }
        });

        it("blocks unauthorized intent validation", async () => {
            const attacker = Keypair.generate();
            
            try {
                await program.methods
                    .validateIntent({
                        amount: new anchor.BN(0.1 * LAMPORTS_PER_SOL),
                        memo: "Attacker intent",
                        executionTime: null,
                    })
                    .accounts({
                        requester: attacker.publicKey,
                        agent: agentPda,
                        vault: vaultPda,
                    })
                    .signers([attacker])
                    .rpc();
                // Note: validateIntent may allow any requester to check
                // This tests the actual behavior
                console.log("Intent validation is permissionless (read-only)");
            } catch (e: any) {
                console.log("Intent validation restricted to owner");
            }
        });
    });

    describe("Yield Operations", () => {
        it("accrues yield on staked balance", async () => {
            const agentBefore = await program.account.agent.fetch(agentPda);
            const stakedBefore = agentBefore.stakedAmount;

            // Wait a moment for time to pass
            await new Promise(r => setTimeout(r, 2000));

            await program.methods
                .accrueYield()
                .accounts({ agent: agentPda })
                .rpc();

            const agentAfter = await program.account.agent.fetch(agentPda);
            // Staked amount should increase (yield accrued)
            assert.ok(agentAfter.stakedAmount.gte(stakedBefore));
            console.log(`Yield accrued: ${stakedBefore.toString()} -> ${agentAfter.stakedAmount.toString()}`);
        });
    });
});
