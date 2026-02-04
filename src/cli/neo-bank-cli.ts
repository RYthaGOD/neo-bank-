#!/usr/bin/env npx ts-node
/**
 * Neo Bank CLI - Command line interface for agent treasury management
 * 
 * Usage:
 *   npx ts-node src/cli/neo-bank-cli.ts status
 *   npx ts-node src/cli/neo-bank-cli.ts balance
 *   npx ts-node src/cli/neo-bank-cli.ts validate <amount>
 *   npx ts-node src/cli/neo-bank-cli.ts withdraw <amount> <destination>
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { AgentNeoBank, GovernanceHelper } from "../lib/agent-sdk";
import * as fs from "fs";
import * as path from "path";

// Config
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const KEYPAIR_PATH = process.env.KEYPAIR_PATH || path.join(process.env.HOME || "~", ".config/solana/id.json");

function loadKeypair(): Keypair {
    try {
        const secretKey = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf-8"));
        return Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } catch {
        console.error("❌ Could not load keypair from", KEYPAIR_PATH);
        console.error("   Set KEYPAIR_PATH env var or use default Solana CLI keypair");
        process.exit(1);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === "help") {
        printHelp();
        return;
    }

    const connection = new Connection(RPC_URL, "confirmed");
    const keypair = loadKeypair();
    const wallet = new anchor.Wallet(keypair);
    const bank = new AgentNeoBank(connection, wallet);

    console.log(`🏦 Neo Bank CLI`);
    console.log(`   Wallet: ${keypair.publicKey.toBase58().slice(0, 8)}...`);
    console.log(`   RPC: ${RPC_URL}\n`);

    switch (command) {
        case "status":
            await showStatus(bank, keypair.publicKey);
            break;

        case "balance":
            await showBalance(bank, keypair.publicKey);
            break;

        case "validate":
            const amount = parseFloat(args[1]);
            if (isNaN(amount)) {
                console.error("Usage: validate <amount>");
                process.exit(1);
            }
            await validateIntent(bank, keypair.publicKey, amount);
            break;

        case "withdraw":
            const withdrawAmount = parseFloat(args[1]);
            const dest = args[2];
            if (isNaN(withdrawAmount) || !dest) {
                console.error("Usage: withdraw <amount> <destination>");
                process.exit(1);
            }
            await withdraw(bank, withdrawAmount, new PublicKey(dest));
            break;

        case "deposit":
            const depositAmount = parseFloat(args[1]);
            if (isNaN(depositAmount)) {
                console.error("Usage: deposit <amount>");
                process.exit(1);
            }
            await deposit(bank, depositAmount);
            break;

        case "register":
            const name = args[1] || "Agent";
            const limit = parseFloat(args[2]) || 10;
            await register(bank, name, limit);
            break;

        case "governance":
            await showGovernance(bank);
            break;

        case "pause-status":
            await showPauseStatus(bank);
            break;

        default:
            console.error(`Unknown command: ${command}`);
            printHelp();
            process.exit(1);
    }
}

function printHelp() {
    console.log(`
🏦 Neo Bank CLI - Agent Treasury Management

Commands:
  status              Full agent status
  balance             Vault balance only
  validate <amount>   Check if withdrawal would succeed
  withdraw <amt> <dest>  Withdraw SOL to destination
  deposit <amount>    Deposit SOL into vault
  register [name] [limit]  Register new agent
  governance          Show governance info
  pause-status        Check if bank is paused

Environment:
  RPC_URL       Solana RPC endpoint (default: devnet)
  KEYPAIR_PATH  Path to keypair JSON

Examples:
  neo-bank-cli status
  neo-bank-cli validate 5
  neo-bank-cli withdraw 2 <pubkey>
  neo-bank-cli register MyBot 10
`);
}

async function showStatus(bank: AgentNeoBank, owner: PublicKey) {
    try {
        const status = await bank.getFullStatus(owner);
        console.log(`📊 Agent Status: ${status.agent.name}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`💰 Vault Balance:  ${status.vaultBalance.toFixed(4)} SOL`);
        console.log(`📈 Staked Amount:  ${status.agent.stakedAmount.toFixed(4)} SOL`);
        console.log(`💸 Total Deposited: ${status.agent.totalDeposited.toFixed(4)} SOL`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📅 Spending Period:`);
        console.log(`   Limit:     ${status.spending.limit.toFixed(2)} SOL`);
        console.log(`   Spent:     ${status.spending.spent.toFixed(4)} SOL`);
        console.log(`   Remaining: ${status.spending.remaining.toFixed(4)} SOL`);
        console.log(`   Resets:    ${status.spending.resetsAt}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`⚡ Yield Hook: ${status.hook.enabled ? "Enabled" : "Disabled"}`);
        if (status.hook.enabled) {
            console.log(`   Deploy: ${status.hook.deployPercentage}%`);
            console.log(`   Triggers: ${status.hook.triggerCount}`);
        }
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🚦 Bank Paused: ${status.paused.paused ? `Yes (${status.paused.reason})` : "No"}`);
    } catch (e: any) {
        console.error(`❌ Error: ${e.message}`);
        console.error("   Agent may not be registered. Try: neo-bank-cli register");
    }
}

async function showBalance(bank: AgentNeoBank, owner: PublicKey) {
    const balance = await bank.getBalance(owner);
    console.log(`💰 Vault Balance: ${balance.toFixed(4)} SOL`);
}

async function validateIntent(bank: AgentNeoBank, owner: PublicKey, amount: number) {
    console.log(`🔍 Validating withdrawal of ${amount} SOL...`);
    const result = await bank.validateIntent(owner, amount, "CLI validation");
    
    if (result.valid) {
        console.log(`✅ Valid - Withdrawal would succeed`);
        console.log(`   Remaining limit after: ${(result.remainingLimit / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    } else {
        console.log(`❌ Invalid - ${result.reason}`);
    }
}

async function withdraw(bank: AgentNeoBank, amount: number, destination: PublicKey) {
    console.log(`💸 Withdrawing ${amount} SOL to ${destination.toBase58().slice(0, 8)}...`);
    
    // Validate first
    const check = await bank.canAfford(bank as any, amount);
    if (!check) {
        console.log(`❌ Cannot afford this withdrawal`);
        return;
    }

    try {
        const sig = await bank.withdraw(amount, destination);
        console.log(`✅ Success! Signature: ${sig}`);
    } catch (e: any) {
        console.error(`❌ Failed: ${e.message}`);
    }
}

async function deposit(bank: AgentNeoBank, amount: number) {
    console.log(`💵 Depositing ${amount} SOL...`);
    try {
        const sig = await bank.deposit(amount);
        console.log(`✅ Success! Signature: ${sig}`);
    } catch (e: any) {
        console.error(`❌ Failed: ${e.message}`);
    }
}

async function register(bank: AgentNeoBank, name: string, limit: number) {
    console.log(`📝 Registering agent "${name}" with ${limit} SOL daily limit...`);
    try {
        const sig = await bank.registerAgent(name, limit);
        console.log(`✅ Success! Signature: ${sig}`);
    } catch (e: any) {
        if (e.message.includes("already in use")) {
            console.log(`ℹ️  Agent already registered`);
        } else {
            console.error(`❌ Failed: ${e.message}`);
        }
    }
}

async function showGovernance(bank: AgentNeoBank) {
    const helper = new GovernanceHelper(bank);
    const info = await helper.getGovernanceInfo();
    
    if (!info) {
        console.log(`ℹ️  Governance not initialized`);
        return;
    }

    console.log(`🏛️  Treasury Governance`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`💰 Treasury: ${info.treasuryBalance.toFixed(4)} SOL`);
    console.log(`👥 Admins: ${info.admins.length}`);
    console.log(`🎯 Threshold: ${info.threshold} votes`);
    console.log(`📋 Proposals: ${info.proposalCount}`);
    
    if (info.proposalCount > 0) {
        console.log(`\n📜 Recent Proposals:`);
        const proposals = await helper.getRecentProposals(3);
        for (const p of proposals) {
            const status = ["Pending", "Approved", "Rejected", "Executed", "Expired"][p.status];
            console.log(`   #${p.id}: ${p.amount} SOL → ${p.destination.slice(0, 8)}... [${status}]`);
        }
    }
}

async function showPauseStatus(bank: AgentNeoBank) {
    const status = await bank.getPauseStatus();
    if (status.paused) {
        console.log(`🚨 Bank is PAUSED (reason: ${status.reason})`);
    } else {
        console.log(`✅ Bank is operational`);
    }
}

main().catch(console.error);
