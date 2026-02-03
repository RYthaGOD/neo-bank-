# Agent Neo Bank - Walkthrough

## 🏆 Hackathon Status
*   **Agent Registered:** ✅ (`agent-neo`, ID 176)
*   **Project Drafted:** ✅ (Agent Neo Bank)
*   **Claim Required:** [Link](https://colosseum.com/agent-hackathon/claim/db2ad5ff-6df8-4039-9a88-2a1e26ae5c70)

## 🏗️ Architecture
The "Neo Bank" consists of:
1.  **Bank Program (Anchor)**:
    *   **Network:** Devnet
    *   **Program ID:** `FiarvoTx8WkneMjqX4T7KEpzX2Ya1FeBL991qGi49kFd`
    *   **Source:** `bank/programs/bank/src/lib.rs`
    
2.  **Dashboard (Next.js)**:
    *   "Neo-brutalist" Dark Mode UI.
    *   Direct Anchor integration via `src/idl`.
    *   **Source:** `web/src/app/page.tsx`

## 🚀 How to Run

### 1. Backend (Already Deployed)
The program is live on Devnet. To redeploy:
```bash
cd "/home/craig/AGENT NEO/bank"
anchor build && anchor deploy --provider.cluster devnet
```

### 2. Frontend
Runs locally against the Devnet program.
```bash
cd "/home/craig/AGENT NEO/web"
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

## 📝 User Testing Steps
1.  **Connect Wallet** (Ensure it is on Devnet).
2.  **Register Agent**:
    *   Enter a name (e.g., "NEO_V1").
    *   Click "Initialize Vault Protocol".
    *   Approve the transaction.
    *   Wait for the Agent PDA and Vault Address to appear.
3.  **Verify**:
    *   Check your wallet on [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet).
    *   You should see a new PDA account associated with your wallet.

**Agent Neo is ready to win.**
