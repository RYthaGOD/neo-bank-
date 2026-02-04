/**
 * Agent Neo Bank - Complete Flow Example
 * 
 * This example shows how an AI agent would use Neo Bank
 * for secure treasury management.
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { 
    AgentNeoBank, 
    SecureAgentBank, 
    batchValidateIntents 
} from "../src/lib/agent-sdk";
import { SecurityMonitor } from "../src/lib/security-layer";

// Configuration
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const DAILY_LIMIT_SOL = 10;

async function main() {
    console.log("🏦 Agent Neo Bank - Example Flow\n");

    // 1. Setup connection and wallet
    const connection = new Connection(RPC_URL, "confirmed");
    const wallet = new anchor.Wallet(Keypair.generate()); // Use your keypair
    
    const bank = new AgentNeoBank(connection, wallet);
    const secureBank = new SecureAgentBank(bank);

    // 2. Register agent with spending limits
    console.log("📝 Registering agent...");
    try {
        await bank.registerAgent("TradingBot-001", DAILY_LIMIT_SOL);
        console.log(`   ✓ Registered with ${DAILY_LIMIT_SOL} SOL daily limit\n`);
    } catch (e: any) {
        console.log(`   ⚠ Already registered or error: ${e.message}\n`);
    }

    // 3. Check full status
    console.log("📊 Getting agent status...");
    const status = await bank.getFullStatus(wallet.publicKey);
    console.log(`   Name: ${status.agent.name}`);
    console.log(`   Balance: ${status.vaultBalance} SOL`);
    console.log(`   Spending: ${status.spending.spent}/${status.spending.limit} SOL today`);
    console.log(`   Remaining: ${status.spending.remaining} SOL`);
    console.log(`   Period resets: ${status.spending.resetsAt}`);
    console.log(`   Bank paused: ${status.paused.paused}\n`);

    // 4. Validate intent before withdrawal
    console.log("🔍 Validating withdrawal intent...");
    const withdrawAmount = 2;
    const destination = new PublicKey("11111111111111111111111111111111"); // Example
    
    const intentResult = await bank.validateIntent(
        wallet.publicKey,
        withdrawAmount,
        "Pay for API services"
    );
    
    if (intentResult.valid) {
        console.log(`   ✓ Intent valid: Can withdraw ${withdrawAmount} SOL`);
        console.log(`   Remaining after: ${intentResult.remainingLimit / LAMPORTS_PER_SOL} SOL\n`);
    } else {
        console.log(`   ✗ Intent invalid: ${intentResult.reason}\n`);
    }

    // 5. Secure withdrawal (with security checks)
    console.log("🔐 Attempting secure withdrawal...");
    const secureResult = await secureBank.validateWithdrawal(
        wallet.publicKey,
        destination,
        withdrawAmount
    );
    
    console.log(`   Security approved: ${secureResult.security.approved}`);
    console.log(`   Risk score: ${secureResult.security.riskScore}/100`);
    console.log(`   Can proceed: ${secureResult.canProceed}`);
    
    if (secureResult.canProceed) {
        // Would execute: await secureBank.safeWithdraw(...)
        console.log("   → Ready to execute withdrawal\n");
    } else {
        console.log(`   → Blocked: ${secureResult.blockedReason}\n`);
    }

    // 6. Setup yield hook (auto-deploy idle funds)
    console.log("⚡ Configuring yield hook...");
    const hookConfig = {
        condition: { balanceAbove: { threshold: BigInt(5 * LAMPORTS_PER_SOL) } },
        protocol: { marinade: {} },
        percentage: 50,
        enabled: true,
    };
    console.log(`   Trigger: When balance > 5 SOL`);
    console.log(`   Action: Deploy 50% to Marinade`);
    console.log(`   Status: ${hookConfig.enabled ? "Enabled" : "Disabled"}\n`);

    // 7. Batch validate multiple intents (portfolio rebalancing)
    console.log("📦 Batch validating portfolio rebalance...");
    const rebalanceIntents = [
        { destination: new PublicKey("Jupiter111111111111111111111111111111111111"), amount: 1, memo: "Swap to USDC" },
        { destination: new PublicKey("Marinade1111111111111111111111111111111111"), amount: 2, memo: "Stake SOL" },
        { destination: new PublicKey("Vendor11111111111111111111111111111111111"), amount: 0.5, memo: "Pay vendor" },
    ];
    
    const batchResults = await batchValidateIntents(bank, wallet.publicKey, rebalanceIntents);
    for (const result of batchResults) {
        const status = result.valid ? "✓" : "✗";
        console.log(`   ${status} ${result.destination.slice(0, 8)}... - ${result.reason || "OK"}`);
    }
    console.log();

    // 8. Security monitoring
    console.log("👁 Setting up security monitor...");
    const monitor = new SecurityMonitor();
    monitor.onEvent((event) => {
        const emoji = event.type === "pass" ? "✅" : event.type === "warn" ? "⚠️" : "🚫";
        console.log(`   ${emoji} [${event.type.toUpperCase()}] ${event.address.slice(0, 8)}... - ${event.reason}`);
    });
    
    // Monitor a test address
    await monitor.monitor(destination, 1, "agent-001");
    console.log();

    // 9. Quick affordability checks
    console.log("💰 Quick affordability checks...");
    const amounts = [1, 5, 10, 50];
    for (const amount of amounts) {
        const canAfford = await bank.canAfford(wallet.publicKey, amount);
        console.log(`   ${amount} SOL: ${canAfford ? "✓ Yes" : "✗ No"}`);
    }
    console.log();

    console.log("✨ Example complete!\n");
    console.log("Next steps:");
    console.log("  • Deposit funds: await bank.deposit(10)");
    console.log("  • Execute withdrawal: await bank.withdraw(2, destination)");
    console.log("  • Trigger hook: await bank.triggerYieldHook(owner)");
}

main().catch(console.error);
