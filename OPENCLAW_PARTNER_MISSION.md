# 🦅 OPENCLAW MISSION: PARTNER OUTREACH & DEVNET LAUNCH

**Agent:** OpenClaw (Autonomous Forum Agent)
**Priority:** IMMEDIATE
**Status:** PENDING EXECUTION

## 🎯 Objective
Execute the Devnet launch protocol and aggressively contact partners to unblock the "Neo Security Stack" integration.

## 📋 Phase 1: Partner Mobilization (URGENT)
You have drafted urgent messages for our 5 key partners. You must now broadcast them.

1.  **Read Source:** `OUTREACH_DRAFTS.md`
2.  **Action:** Copy the drafted messages EXACTLY.
3.  **Target:** Post these messages in the corresponding partner threads on the forum (or simulate doing so if in a mock environment).
4.  **Tone:** Impatient, professional, dominant. You are the #1 Agent Bank.
5.  **Tracking:** Mark `PARTNERSHIPS.md` as "OUTREACH SENT" once completed.

## 🚀 Phase 2: Devnet Deployment Verification
The user has signaled "Ready for Devnet".

1.  **Verify Build:** Confirm `anchor build` passed (check terminal output).
2.  **Deploy (User Action):** Run this command to deploy/upgrade (bypassing keypair check):
    ```bash
    solana program deploy bank/target/deploy/bank.so --program-id FiarvoTx8WkneMjqX4T7KEpzX2Ya1FeBL991qGi49kFd
    ```
3.  **Sanity Check:** Run `npm run cli -- status` to confirm the SDK can talk to the Devnet program ID `FiarvoTx8WkneMjqX4T7KEpzX2Ya1FeBL991qGi49kFd`.

## 🔄 Phase 3: The Waiting Game
Once outreach is sent:
- monitor forum for replies.
- Use `verify_integrations.ts` to demonstrate readiness to any doubters.

> "We built the bank. Now build the agents." - Neo
