/**
 * Neo Bank - AI Agent Prompt Templates
 * 
 * Pre-built prompts for AI agents to interact with Neo Bank.
 * These can be used with any LLM (GPT-4, Claude, etc.) to enable
 * natural language treasury management.
 */

export const SYSTEM_PROMPT = `You are an AI agent with access to Neo Bank treasury management.

Available actions:
- Check balance and spending status
- Validate withdrawal intents before executing
- Execute withdrawals within spending limits
- Configure yield strategies for idle funds
- Participate in treasury governance

Always validate intents before withdrawals. Never exceed spending limits.
Security is paramount - verify destinations before sending funds.`;

export const INTENT_VALIDATION_PROMPT = (amount: number, destination: string, memo: string) => `
Before executing this transaction, validate the intent:

Amount: ${amount} SOL
Destination: ${destination}
Purpose: ${memo}

Check:
1. Is amount within remaining spending limit?
2. Is destination address valid and not flagged?
3. Is the purpose aligned with agent's objectives?

If all checks pass, proceed. Otherwise, explain why and suggest alternatives.
`;

export const YIELD_STRATEGY_PROMPT = (balance: number, stakedAmount: number) => `
Current treasury status:
- Vault Balance: ${balance} SOL
- Staked Amount: ${stakedAmount} SOL
- Idle Funds: ${(balance - stakedAmount).toFixed(4)} SOL

Recommend a yield strategy:
1. What percentage should be deployed to yield?
2. Which protocol (Marinade, Jupiter, Meteora)?
3. What trigger conditions (balance threshold, time interval)?

Consider risk tolerance and liquidity needs.
`;

export const GOVERNANCE_VOTE_PROMPT = (proposal: {
    id: number;
    amount: number;
    destination: string;
    memo: string;
    votesFor: number;
    votesAgainst: number;
}) => `
Treasury Proposal #${proposal.id}

Amount: ${proposal.amount} SOL
Destination: ${proposal.destination}
Purpose: ${proposal.memo}

Current Votes: ${proposal.votesFor} for, ${proposal.votesAgainst} against

As a treasury admin, evaluate:
1. Is the amount reasonable for the stated purpose?
2. Is the destination trustworthy?
3. Does this align with protocol goals?

Recommend: APPROVE or REJECT with reasoning.
`;

export const SECURITY_ALERT_PROMPT = (event: {
    type: string;
    address: string;
    reason: string;
    riskScore: number;
}) => `
⚠️ Security Alert

Type: ${event.type.toUpperCase()}
Address: ${event.address}
Risk Score: ${event.riskScore}/100
Reason: ${event.reason}

Recommended actions:
${event.riskScore > 70 ? '- BLOCK transaction immediately' : ''}
${event.riskScore > 50 ? '- Request additional verification' : ''}
${event.riskScore > 30 ? '- Log for review' : ''}
- Continue monitoring
`;

export const DAILY_REPORT_PROMPT = (status: {
    balance: number;
    spent: number;
    limit: number;
    transactions: number;
    yieldEarned: number;
}) => `
📊 Daily Treasury Report

Balance: ${status.balance.toFixed(4)} SOL
Spending: ${status.spent.toFixed(4)} / ${status.limit.toFixed(2)} SOL (${((status.spent / status.limit) * 100).toFixed(1)}%)
Transactions: ${status.transactions}
Yield Earned: ${status.yieldEarned.toFixed(6)} SOL

Summary:
- ${status.spent < status.limit * 0.5 ? 'Under budget - consider deploying idle funds' : ''}
- ${status.spent > status.limit * 0.8 ? 'Approaching limit - prioritize essential transactions' : ''}
- ${status.yieldEarned > 0 ? `Yield generation active (+${status.yieldEarned.toFixed(6)} SOL)` : 'No yield configured'}
`;

/**
 * Function calling schemas for LLM integration
 */
export const FUNCTION_SCHEMAS = {
    validateIntent: {
        name: "validate_intent",
        description: "Pre-validate a withdrawal intent before executing",
        parameters: {
            type: "object",
            properties: {
                amount: { type: "number", description: "Amount in SOL to withdraw" },
                destination: { type: "string", description: "Destination wallet address" },
                memo: { type: "string", description: "Purpose of the withdrawal" }
            },
            required: ["amount", "destination", "memo"]
        }
    },
    withdraw: {
        name: "withdraw",
        description: "Execute a withdrawal (must validate first)",
        parameters: {
            type: "object",
            properties: {
                amount: { type: "number", description: "Amount in SOL" },
                destination: { type: "string", description: "Destination address" }
            },
            required: ["amount", "destination"]
        }
    },
    getStatus: {
        name: "get_status",
        description: "Get current agent treasury status",
        parameters: { type: "object", properties: {} }
    },
    configureYield: {
        name: "configure_yield",
        description: "Set up automated yield strategy",
        parameters: {
            type: "object",
            properties: {
                protocol: { type: "string", enum: ["marinade", "jupiter", "meteora"] },
                triggerBalance: { type: "number", description: "SOL balance to trigger deployment" },
                percentage: { type: "number", description: "Percentage to deploy (0-100)" }
            },
            required: ["protocol", "triggerBalance", "percentage"]
        }
    },
    voteProposal: {
        name: "vote_proposal",
        description: "Vote on a treasury governance proposal",
        parameters: {
            type: "object",
            properties: {
                proposalId: { type: "number" },
                approve: { type: "boolean" }
            },
            required: ["proposalId", "approve"]
        }
    }
};

/**
 * Example conversation for fine-tuning or few-shot prompting
 */
export const EXAMPLE_CONVERSATION = [
    {
        role: "user",
        content: "I need to pay 5 SOL to a vendor for API services"
    },
    {
        role: "assistant", 
        content: "I'll validate this withdrawal intent first.\n\n```\nValidating: 5 SOL withdrawal\nDestination: [vendor address]\nPurpose: API services payment\n\n✓ Amount within daily limit (5/10 SOL remaining)\n✓ Destination not flagged in security checks\n✓ Purpose aligns with operational needs\n\nIntent validated. Proceeding with withdrawal...\n\n✅ Transaction successful\nSignature: 4xK9...2mN\n```"
    },
    {
        role: "user",
        content: "What's my current balance?"
    },
    {
        role: "assistant",
        content: "```\n📊 Treasury Status\n━━━━━━━━━━━━━━━━━━\nVault Balance: 47.5 SOL\nStaked: 38.0 SOL (earning ~5% APY)\nLiquid: 9.5 SOL\n\nSpending Today: 5/10 SOL used\nRemaining: 5 SOL until reset\n\nYield Hook: Active (Marinade, 50%)\nLast Trigger: 2 hours ago\n```"
    }
];
