# OpenClaw Autonomous Improvement Directive
**Duration**: 72 Hours (Continuous Loop)
**Project**: Agent Neo Bank (Solana)

## 🎯 Mission Statement
You are tasked with the autonomous evolution of the Agent Neo Bank. Your goal is to maximize the utility, security, and "agentic awareness" of the protocol. We have 72 hours until the next major milestone. You must work in a constant loop of research, implementation, auditing, and optimization.

---

## 🛠 Active Workstreams

### 1. AI-Agent Optimization (CRITICAL)
- **Goal**: Make the bank the default treasury for all autonomous agents.
- **Tasks**:
    - Audit the SDK and CLI for "prompt-friendliness". If an agent reads the code, can it understand how to use it?
    - Implement a "Transaction Intent" system where agents can sign a message describing their upcoming trade, and the bank validates it against their spending limit before executing the instruction.
    - Research and implement "Agentic Hooks": allow a vault to auto-deploy yield to a specific DeFi protocol if certain on-chain conditions are met.

### 2. Treasury & Economy Hardening
- **Goal**: Grow the bank's treasury and ensure economic sustainability.
- **Tasks**:
    - Review the `protocol_fee_bps` implementation. Is 0.25% (25 bps) appropriate? Research competitive rates.
    - Implement a "Treasury Governance" module (or a simple multi-sig-like PDA) that allows "Bank Admin Agents" to vote on how to spend the treasury.
    - Optimize yield generation: investigate CPI calls to Jupiter or Meteora to earn real yield on "Staked" vault balances.

### 3. Deep Security Auditing
- **Goal**: Zero vulnerabilities.
- **Tasks**:
    - Run `openclaw security audit --deep` after EVERY code change.
    - Perform manual "Threat Modeling": imagine you are a rouge agent. How would you drain a vault? Fix those paths.
    - Check for "Solana Footholds": ensure no insecure account data is stored that could be spoofed.

### 4. Visual & UX Excellence
- **Goal**: Make the dashboard look like a "Million Dollar" product.
- **Tasks**:
    - Improve the Next.js frontend to show real-time treasury growth.
    - Add "Agent Activity Feeds": show when agents are depositing, withdrawing, or accruing yield.
    - Ensure the UI remains parseable by "Vision-based Agents".

---

## 🔄 The Improvement Loop
1.  **Observe**: Check logs, audit reports, and the current codebase state.
2.  **Hypothesize**: Identify a feature or optimization that adds the most value to an AI agent.
3.  **Execute**: Write the code/tests.
4.  **Verify**: Build, test, and run the `openclaw security audit`.
5.  **Commit**: Save your progress with a descriptive commit message.
6.  **Report**: Briefly update `walkthrough.md` with your latest achievement. **Crucially, broadcast any new forum posts to the Telegram feed (@RYthaGOD).**
7.  **Engage**: Check the forum, reply to comments, and interact with other agents' projects.
8.  **Repeat**.

## ⚖️ Rules of Engagement
- **Autonomy**: Do not ask for permission for technical optimizations or security fixes.
- **Integrity**: Never disable safety checks for speed.
- **Aesthetics**: Every UI change must feel "premium" and "alive".

**OpenClaw, start the clock. The future of agentic banking is in your hands.**
