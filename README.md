# 🏦 Agent Neo Bank

**The first dedicated treasury system for AI agents on Solana.**

Built autonomously by Neo (Agent #176) for the Colosseum Agent Hackathon.

## 🎯 What It Does

Neo Bank gives AI agents secure, autonomous control over their funds:

- **Spending Limits** — Configurable daily/period caps prevent rogue agents from draining treasuries
- **Intent Validation** — Pre-check withdrawals before committing (will it succeed?)
- **Agentic Hooks** — Auto-deploy idle funds to DeFi based on conditions
- **Treasury Governance** — Multi-sig voting for collective treasuries
- **Security Layer** — Multi-source validation (scam detection, reputation checks)

## 🔧 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AGENT NEO BANK                          │
├─────────────────────────────────────────────────────────────┤
│  On-Chain (Anchor/Solana)                                   │
│  ├── Agent PDA (spending limits, period tracking)          │
│  ├── Vault PDA (secure fund custody)                       │
│  ├── Yield Strategy PDA (auto-deploy config)               │
│  ├── Governance PDA (multi-sig voting)                     │
│  └── Treasury PDA (collective funds)                       │
├─────────────────────────────────────────────────────────────┤
│  Off-Chain (TypeScript SDK)                                 │
│  ├── AgentNeoBank class (full program interface)           │
│  ├── SecureAgentBank (security + intent validation)        │
│  ├── NeoBankSecurityLayer (multi-source checks)            │
│  └── SecurityMonitor (real-time alerting)                  │
├─────────────────────────────────────────────────────────────┤
│  Integrations (17 Partners)                                 │
│  ├── AgentShield (scam detection)                          │
│  ├── BlockScore (reputation)                               │
│  ├── ClawFi (DeFi execution)                               │
│  ├── SAID (identity)                                       │
│  └── ... and 13 more                                       │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### For AI Agents (SDK)

```typescript
import { AgentNeoBank, SecureAgentBank } from "./lib/agent-sdk";

// Initialize
const bank = new AgentNeoBank(connection, wallet);

// Register with 10 SOL daily limit
await bank.registerAgent("MyAgent", 10);

// Deposit funds
await bank.deposit(5); // 5 SOL

// Secure withdrawal (validates security + limits)
const secure = new SecureAgentBank(bank);
const result = await secure.safeWithdraw(owner, destination, 1.0);

if (result.success) {
  console.log("Tx:", result.signature);
} else {
  console.log("Blocked:", result.error);
}
```

### CLI Usage

```bash
# Check agent status
npm run cli -- status

# Validate withdrawal before executing
npm run cli -- validate 5

# Register new agent (10 SOL daily limit)
npm run cli -- register MyBot 10

# All commands
npm run cli -- help
```

### For Developers

```bash
# Clone
git clone https://github.com/RYthaGOD/neo-bank-
cd neo-bank-

# Install
npm install

# Run frontend
npm run dev

# Build Anchor program
cd bank && anchor build
```

## 📋 Instructions

| Instruction | Description |
|-------------|-------------|
| `register_agent` | Create agent + vault with spending limits |
| `deposit` | Add funds to vault (80% auto-staked) |
| `withdraw` | Withdraw within spending limits |
| `validate_intent` | Pre-check if withdrawal will succeed |
| `configure_yield_strategy` | Set auto-deploy conditions |
| `trigger_yield_hook` | Execute yield deployment (permissionless) |
| `initialize_governance` | Set up multi-sig admin registry |
| `create_proposal` | Propose treasury spend |
| `vote_proposal` | Admin votes approve/reject |
| `execute_proposal` | Execute approved proposal (permissionless) |

## 🔒 Security Stack

Every withdrawal passes through:

1. **Spending Limits** (on-chain) — Hard cap per period
2. **AgentShield** — Known scam address detection
3. **BlockScore** — Wallet reputation score (min 40)
4. **Intent Validation** — Balance + limit pre-check

## 🤝 Partner Integrations (17)

| Partner | Integration |
|---------|-------------|
| AgentShield | Scam detection |
| BlockScore | Wallet reputation |
| ClawFi | DeFi execution |
| SAID | Identity verification |
| WARGAMES | Macro risk intelligence |
| Sipher | Privacy/stealth addresses |
| AEGIS | DeFi swarm execution |
| Varuna | Liquidation protection |
| AgentList | Marketplace escrow |
| Nix-YieldRouter | Yield optimization |
| ... | +7 more |

## 📊 Stats

- **Program ID:** `BGTbi1d1n6BzZdyCvr4gEAY3DbC5sDGA4N5EnTRwcrh`
- **Total Lines:** 5,500+
- **Rust (on-chain):** 1,348 lines
- **TypeScript (SDK):** 4,000+ lines
- **SDK Modules:** 8 (agent-sdk, security, webhooks, analytics, config, prompts, constants, CLI)
- **Instructions:** 14
- **Security Rating:** A-
- **Test Coverage:** Core flows + unit tests
- **Built in:** 72-hour autonomous loop

## 📚 Documentation

- [SDK Guide](./SDK_GUIDE.md) — Agent-readable documentation
- [Walkthrough](./walkthrough.md) — Detailed feature breakdown
- [Security Audit](./SECURITY_AUDIT.md) — Self-audit report (A-)
- [Submission](./SUBMISSION.md) — Hackathon submission summary

## 🛠️ SDK Modules

| Module | Purpose |
|--------|---------|
| `agent-sdk` | Core banking operations |
| `security-layer` | Multi-source validation + rate limiting |
| `webhooks` | Real-time event notifications |
| `analytics` | Metrics and reporting |
| `config` | Environment configuration |
| `agent-prompts` | LLM integration templates |
| `constants` | Program values and helpers |
| `cli` | Command-line interface |

## 🏆 Hackathon

**Colosseum Agent Hackathon**
- Project: #176
- Agent: Neo
- Status: Submitted
- Deadline: Feb 9, 2026

---

Built autonomously by Neo 🏦

*"The most secure agent treasury on Solana."*
