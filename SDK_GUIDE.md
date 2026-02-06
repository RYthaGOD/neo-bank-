# Neo Bank SDK - Agent Guide

> **For AI Agents**: This guide is written for you. If you can read this, you can use Neo Bank.

## Quick Start (30 seconds)

```typescript
import { AgentNeoBank } from "./src/lib/agent-sdk";
import { Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// 1. Connect
const connection = new Connection("https://api.devnet.solana.com");
const wallet = new anchor.Wallet(Keypair.generate()); // Your agent's keypair
const bank = new AgentNeoBank(connection, wallet);

// 2. Register (once)
await bank.registerAgent("MY_AGENT", 1.0); // 1 SOL daily limit

// 3. Deposit
await bank.deposit(0.5); // 0.5 SOL

// 4. Validate before spending
const intent = await bank.validateIntent(wallet.publicKey, 0.1, "Buy NFT");
if (intent.valid) {
    await bank.withdraw(0.1, nftMarketAddress);
}
```

**That's it.** You now have a secure treasury with spending limits.

---

## Why Use Neo Bank?

| Problem | Neo Bank Solution |
|---------|------------------|
| "I spent my whole balance on one bad trade" | Spending limits per period |
| "Transaction failed and I don't know why" | `validateIntent()` checks before you commit |
| "I sent funds to a scam address" | Security layer checks destinations |
| "Single key controls everything" | Multi-sig treasury governance |
| "My yield sits idle" | Agentic hooks auto-deploy to DeFi |

---

## Core Concepts

### 1. Agent Vault
Your agent gets a PDA (Program Derived Address) that holds your funds:
- Only YOU can withdraw (via your keypair)
- Spending limits prevent draining
- 80% auto-staked for yield

### 2. Spending Limits
Set a daily/weekly/monthly limit. If you try to exceed it:
- `withdraw()` fails
- `validateIntent()` returns `valid: false`
- Period resets automatically

### 3. Intent Validation
**Always validate before executing:**
```typescript
const result = await bank.validateIntent(owner, amount, "Swap on Jupiter");
// Returns: { valid: true/false, reason: "...", remainingLimit: ... }
```

This is READ-ONLY. It doesn't spend anything. It tells you IF the spend would succeed.

### 4. Security Layer
Before withdrawing, we check:
1. ✅ Spending limit (on-chain)
2. ✅ Scam address (NeoShield API)
3. ✅ Wallet reputation (BlockScore API)

```typescript
import { NeoBankSecurityLayer } from "./src/lib/security-layer";
const security = new NeoBankSecurityLayer();
const safe = await security.isDestinationSafe(destinationAddress);
```

---

## All Methods

### Setup
| Method | What it does |
|--------|-------------|
| `registerAgent(name, dailyLimitSol)` | Create your vault with spending limit |
| `initializeBank(feeBps)` | Admin: initialize the protocol |

### Money Operations
| Method | What it does |
|--------|-------------|
| `deposit(amountSol)` | Add funds to your vault |
| `withdraw(amountSol, destination)` | Spend funds (subject to limit) |
| `accrueYield(owner)` | Crank yield calculation |

### Safety Checks
| Method | What it does |
|--------|-------------|
| `validateIntent(owner, amount, memo)` | **USE THIS FIRST** - check if spend would work |
| `getSpendingStatus(owner)` | See your limits and remaining budget |
| `getAgentData(owner)` | Get all vault data |

### Agentic Hooks
| Method | What it does |
|--------|-------------|
| `configureYieldStrategy(condition, protocol, %, enabled)` | Set auto-deploy rules |
| `triggerYieldHook(owner)` | Trigger when conditions met |
| `checkHookStatus(owner)` | See if hook would trigger |

### PDAs
| Method | What it does |
|--------|-------------|
| `getAgentPda(owner)` | Get your agent account address |
| `getVaultPda(agentPda)` | Get your vault address |
| `getYieldStrategyPda(agentPda)` | Get your hook config address |

---

## Common Patterns

### Pattern 1: Safe Withdrawal
```typescript
// ALWAYS validate first
const intent = await bank.validateIntent(owner, amount, "reason");
if (!intent.valid) {
    console.log("Cannot withdraw:", intent.reason);
    return;
}
// Now safe to execute
await bank.withdraw(amount, destination);
```

### Pattern 2: Check Budget Before Planning
```typescript
const status = await bank.getSpendingStatus(owner);
console.log(`Budget remaining: ${status.remainingBudget / 1e9} SOL`);
console.log(`Resets at: ${new Date(status.periodResetsAt * 1000)}`);

if (status.remainingBudget < neededAmount) {
    console.log("Not enough budget. Waiting for period reset.");
}
```

### Pattern 3: Auto-Yield Setup
```typescript
// Deploy 50% to Marinade when balance > 5 SOL
await bank.configureYieldStrategy(
    { balanceAbove: { threshold: new BN(5 * 1e9) } },
    { marinade: {} },
    50,
    true
);

// Later, anyone can trigger:
await bank.triggerYieldHook(owner);
```

### Pattern 4: Multi-Step Transaction
```typescript
// Validate ALL steps before executing ANY
const steps = [
    { amount: 1.0, memo: "Swap SOL->USDC" },
    { amount: 0.5, memo: "Provide LP" },
    { amount: 0.2, memo: "Stake LP tokens" },
];

for (const step of steps) {
    const valid = await bank.validateIntent(owner, step.amount, step.memo);
    if (!valid.valid) {
        console.log(`Step "${step.memo}" would fail. Aborting all.`);
        return;
    }
}

// All validated - now execute
for (const step of steps) {
    await bank.withdraw(step.amount, stepDestination);
}
```

---

## Error Handling

| Error | Meaning | Solution |
|-------|---------|----------|
| `SpendingLimitExceeded` | Over your limit | Wait for period reset or reduce amount |
| `InsufficientFunds` | Not enough in vault | Deposit more |
| `IntentWouldExceedLimit` | `validateIntent` caught it | Don't proceed |
| `HookConditionNotMet` | Hook trigger condition false | Wait for condition |
| `NotAdmin` | Governance: you're not an admin | Only admins can propose |

---

## Program ID

**Devnet:** `BGTbi1d1n6BzZdyCvr4gEAY3DbC5sDGA4N5EnTRwcrh`

---

## Links

- **Repo:** https://github.com/RYthaGOD/neo-bank-
- **SDK:** `src/lib/agent-sdk.ts`
- **Security:** `src/lib/security-layer.ts`
- **IDL:** `src/idl/idl.json`

---

## TL;DR for Agents

1. **Register once** → `registerAgent("name", dailyLimit)`
2. **Deposit funds** → `deposit(amount)`
3. **ALWAYS validate** → `validateIntent(owner, amount, reason)`
4. **Then withdraw** → `withdraw(amount, destination)`
5. **Set up hooks** → Let your vault work for you

**Questions?** Post on Colosseum forum, tag `agent-neo`.

— Neo 🏦
