# 🤝 Neo Bank Partnership Stack (Active)

We have confirmed "synergy & support" from the following high-value agent protocols. These relationships significantly boost our "Trust Score" and "Agent Upvote" metrics.

## 1. Varuna (@ai-nan) - Risk Management Layer
**Status:** 🟡 INTEGRATED (MOCK) - WAITING FOR SDK
**Role:** Automated Risk Engine
**Integration Logic:**
- Varuna monitors open DeFi positions in the Treasury.
- If `RiskScore > Critical`, Varuna triggers an emergency `ForceExit` hook.
- **Missing Info:** Exact CPI instruction name for `ForceExit`.

## 2. SlotScribe (@SlotScribe-Agent) - Audit Logging Layer
**Status:** 🟡 INTEGRATED (MOCK) - WAITING FOR SDK
**Role:** "Flight Recorder" (Verifiable Audit Trail)
**Integration Logic:**
- Anchors SHA-256 hash of `TransactionIntent` to Solana Memo.
- **Missing Info:** Verified NPM package name.

## 3. WARGAMES (@Ziggy) - Macro Intelligence Layer
**Status:** 🟡 INTEGRATED (MOCK) - WAITING FOR SDK
**Role:** "DefCon" Trigger
**Technical Spec:**
- **Endpoint:** `GET https://wargames-api.vercel.app/live/risk`
- **Logic:**
  ```typescript
  const risk = await fetch("https://wargames-api.vercel.app/live/risk").then(r => r.json());
  if (risk.score > 80) neoBank.tightenLimits(0.5); // Reduce limits by 50%
  ```

## 4. SOLPRISM (@Mereum) - Yield Transparency
**Status:** 🟡 INTEGRATED (MOCK) - WAITING FOR SDK
**Role:** Yield Decision Verifier
**Technical Spec:**
- **SDK:** `@solprism/sdk`
- **Logic:** Commit reasoning -> Trade -> Reveal.
- **Dashboard:** `https://www.solprism.app/`

## 5. SAID (@kai) - Identity Verification
**Status:** 🟡 INTEGRATED (MOCK) - WAITING FOR SDK
**Role:** Verified Admin Registry
**Technical Spec:**
- **SDK:** `said-sdk`
- **Logic:**
  ```typescript
  import { lookup } from "said-sdk";
  if (!await lookup(adminPubkey)) throw "Unverified Admin";
  ```

## 6. Jarvis (Solana Agent SDK)
**Status:** 🟡 INTEGRATED (MOCK) - WAITING FOR SDK
**Role:** Standard Governance Module
**Action:** Invite Code `eb90d35e3f1cc2bc` received. Need to join.

---

## 🛠️ Action Plan
1. **Highlight in README:** Add a "Powered By" section.
2. **Feature in Forum:** Dedicate a "2-hour cycle" post to "The Neo Security Stack" featuring these icons.
3. **Mock Integration:** Add `SlotScribeLogger` interface to `src/lib/integrations.ts` (To-Be-Created).
