# Agent Neo Bank - Walkthrough

## 🏆 Hackathon Status
*   **Agent Registered:** ✅ (ID 176)
*   **Yield Protocol:** ✅ (5% Simulated APY)
*   **Agent SDK:** ✅ (`src/lib/agent-sdk.ts`)
*   **Project Link:** [https://github.com/RYthaGOD/neo-bank-](https://github.com/RYthaGOD/neo-bank-)

---

## 🧠 NEW: Transaction Intent System (Loop 1)
**Added:** 2026-02-03 22:45 GMT+8

The **Transaction Intent System** lets AI agents pre-validate withdrawals BEFORE committing. This is CRITICAL for autonomous agents that need certainty before executing trades.

### How It Works
1. Agent describes their intended transaction (amount + memo)
2. Bank validates against spending limits and vault balance
3. Returns approval/rejection WITHOUT modifying state
4. Agent can safely proceed knowing the transaction will succeed

### SDK Usage
```typescript
// Before executing a trade, validate the intent:
const result = await bank.validateIntent(
  agentWallet.publicKey,
  1.5,  // SOL amount
  "Swap 1.5 SOL for USDC on Jupiter"
);

if (result.valid) {
  // Safe to proceed - transaction will succeed
  await bank.withdraw(1.5, jupiterAddress);
} else {
  console.log("Cannot execute:", result.reason);
  // reason: "spending_limit_exceeded" or "insufficient_funds"
}
```

### Program Instruction
- `validate_intent(intent: TransactionIntent)` - Read-only validation
- Logs structured JSON for agent parsing: `INTENT_RESULT: {...}`

---

## 🏗️ Core Architecture
1.  **Bank Program (Anchor)**:
    *   `initialize_bank`: Set up protocol with fee rate
    *   `register_agent`: Create agent vault with spending limits
    *   `deposit`: Move funds into agent's vault (80% auto-staked)
    *   `withdraw`: Spend funds (enforces period limits, takes fees)
    *   `accrue_yield`: Permissionless crank for interest
    *   `validate_intent`: Pre-validate transactions 🆕
2.  **Dashboard (Next.js)**:
    *   Live monitoring of Yield and Staked balance
    *   Manual "Accrue Yield" button for testing
    *   Integrated `AgentNeoBank` SDK

## 🚂 Railway Deployment
*   **Source Code:** Verified on GitHub
*   **Env Support:** `process.env.NEXT_PUBLIC_PROGRAM_ID`

## 🤖 AI Agent Integration
```typescript
import { AgentNeoBank } from "./lib/agent-sdk";
const bank = new AgentNeoBank(connection, agentWallet);

// Setup
await bank.registerAgent("AUTONOMOUS_ENTITY", 0.5);  // 0.5 SOL daily limit
await bank.deposit(1.0);

// Before any trade - ALWAYS validate first
const intent = await bank.validateIntent(
  agentWallet.publicKey,
  0.3,
  "Buy NFT on Magic Eden"
);

if (intent.valid) {
  await bank.withdraw(0.3, magicEdenAddress);
}

// Check spending status
const status = await bank.getSpendingStatus(agentWallet.publicKey);
console.log(`Budget remaining: ${status.remainingBudget} lamports`);
```

---

## 📋 Evolution Log
| Time | Loop | Feature |
|------|------|---------|
| 22:45 | 1 | Transaction Intent System |

## 🎯 Pending Workstreams
- [ ] Agentic Hooks (auto-yield deployment)
- [ ] Treasury Governance (multi-sig admin)
- [ ] Real Yield (Jupiter/Meteora CPI)
- [ ] Agent Activity Feeds (UI)
- [ ] SDK Prompt-Friendliness Audit
