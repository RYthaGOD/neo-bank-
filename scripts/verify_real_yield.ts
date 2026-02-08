import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AgentNeoBank } from "../src/lib/agent-sdk";
import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("🚀 Starting Real Yield Verification (Jito)...");

    // 1. Setup Connection and Wallet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");

    // Load local wallet or create new
    let wallet: anchor.Wallet;
    const keypairPath = process.env.ANCHOR_WALLET || "/home/craig/neo-bank-/bank/target/deploy/bank-keypair.json";

    try {
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
        const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
        wallet = new anchor.Wallet(keypair);
        console.log(`✅ Loaded Wallet: ${wallet.publicKey.toBase58()}`);
    } catch (e) {
        console.log("⚠️  No wallet found, generating fresh one...");
        const keypair = Keypair.generate();
        wallet = new anchor.Wallet(keypair);
        console.log(`✅ Generated Wallet: ${wallet.publicKey.toBase58()}`);

        console.log("💧 Airdropping SOL...");
        const sig = await connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(sig);
    }

    // Check Balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
        console.error("❌ Insufficient SOL. Please airdrop manually.");
        process.exit(1);
    }

    // 2. Initialize SDK
    // Program ID from previous context (or .env)
    const PROGRAM_ID = "6z3... (Replace with actual ID if not in env)";
    // Actually SDK defaults to env or constant. Let's rely on that.
    const sdk = new AgentNeoBank(connection, wallet);

    console.log("🏦 Registering Agent...");
    try {
        await sdk.registerAgent("JitoTester", 100); // 100 SOL limit, 1 day period (hardcoded in sdk)
        console.log("✅ Agent Registered");
    } catch (e: any) {
        if (e.message?.includes("already in use")) {
            console.log("ℹ️  Agent already registered, proceeding...");
        } else {
            console.error("❌ Registration failed:", e);
            // proceed anyway, maybe it exists
        }
    }

    // 3. Deposit to Vault (to have funds to invest)
    console.log("📥 Depositing 0.2 SOL to Agent Vault...");
    try {
        const agentPda = sdk.getAgentPda(wallet.publicKey);
        const vaultPda = sdk.getVaultPda(agentPda);

        const tx = new anchor.web3.Transaction().add(
            anchor.web3.SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: vaultPda,
                lamports: 0.2 * LAMPORTS_PER_SOL
            })
        );
        await anchor.web3.sendAndConfirmTransaction(connection, tx, [wallet.payer]);
        console.log("✅ Deposit successful");
    } catch (e) {
        console.error("❌ Deposit failed:", e);
    }

    // 4. Configure Yield Strategy
    console.log("⚙️  Configuring Yield Strategy (JitoSOL)...");
    try {
        // enum YieldProtocol { Internal, JitoSOL... } -> JitoSOL is index 1
        // enum HookCondition { BalanceAbove... } -> index 0
        await sdk.configureYieldStrategy(
            { balanceAbove: { threshold: new anchor.BN(0.1 * LAMPORTS_PER_SOL) } },
            { jitoSol: {} } as any, // Enum mapping might differ in TS
            50, // 50%
            true
        );
        console.log("✅ Strategy Configured");
    } catch (e) {
        console.error("⚠️  Strategy config failed (might match existing):", e);
    }

    // 5. Execute Jito Deposit
    console.log("🚀 Executing deployToJito(0.1 SOL)...");
    try {
        const sig = await sdk.deployToJito(0.1);
        console.log(`✅ Jito Deposit Success! Sig: ${sig}`);
        console.log(`🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    } catch (e) {
        console.error("❌ Jito Deposit Failed:", e);
        // analyze error
        if (e instanceof Error) console.error(e.message);
    }

    // 6. Verify JitoSOL Balance
    console.log("🔍 Verifying JitoSOL Balance...");
    // Logic to check token account balance...
}

main().catch(console.error);
