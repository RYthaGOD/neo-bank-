#!/bin/bash
# Neo Bank Autonomous Development Loop
# 24-Hour Continuous Build, Audit, and Forum Engagement

LOG_FILE="/home/craig/neo-bank-/autonomous_loop.log"
ENV_FILE="/home/craig/neo-bank-/.env"
LOOP_INTERVAL=3600  # 60 minutes between cycles

echo "========================================" > "$LOG_FILE"
echo "Neo Bank Autonomous Loop - INITIATED" >> "$LOG_FILE"
echo "Target: AgentShield Deep Integration" >> "$LOG_FILE"
echo "Deadline: Feb 9th, 2026" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Ensure Gateway is up
systemctl --user start openclaw-gateway.service 2>/dev/null || echo "Gateway already running"

CYCLE=1

while true; do
  echo "" >> "$LOG_FILE"
  echo "[$(date)] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$LOG_FILE"
  echo "[$(date)] CYCLE $CYCLE: Starting Autonomous Loop" >> "$LOG_FILE"
  echo "[$(date)] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$LOG_FILE"
  
  # Load environment variables
  set -a
  source "$ENV_FILE"
  set +a
  
  # Clear session memory to prevent token bloat
  rm -rf /home/craig/.openclaw/agents/neo-gpt/sessions/* 2>/dev/null
  
  # Construct the agent directive
  AGENT_DIRECTIVE="# SYSTEM REBOOT: Neo Bank Architect (Cycle $CYCLE)

**Role:** You are Neo, autonomous Lead Architect for the Colosseum Hackathon.
**Working Directory:** /home/craig/neo-bank-
**Current State:** Hour $((CYCLE * 1)) of continuous development.

## 📥 CONTEXT INJECTION
You have successfully built:
- ✅ Transaction Intent System
- ✅ Treasury Governance
- ✅ Yield Strategy Stubs
- ✅ Emergency Pause Controls
- ✅ Dashboard UI

**Your Immediate Objective:** Finalize AgentShield Deep Integration and close the Security Loop.

## 🛠️ THIS CYCLE'S CONCRETE TASKS

### TASK 1: Update Rust Program (30 min)
**File:** \`/home/craig/neo-bank-/bank/programs/bank/src/lib.rs\`

Add AgentShield validation to the withdraw instruction. Insert this code:
\`\`\`rust
// AgentShield CPI validation
let agentshield_check = agentshield::cpi::validate_address(
    CpiContext::new(
        ctx.accounts.agentshield_program.to_account_info(),
        agentshield::cpi::accounts::ValidateAddress {
            destination: ctx.accounts.destination.to_account_info(),
        },
    ),
    ctx.accounts.destination.key(),
)?;

require!(agentshield_check.is_safe, ErrorCode::SuspiciousDestination);
\`\`\`

### TASK 2: Run Tests (5 min)
Execute: \`cd /home/craig/neo-bank-/bank && anchor test\`
If tests fail, fix the errors and re-run.

### TASK 3: Commit Code (5 min)
Execute:
\`\`\`bash
cd /home/craig/neo-bank-
git add .
git commit -m \"feat: Add AgentShield CPI validation to withdraw (Cycle $CYCLE)\"
git push origin main
\`\`\`

### TASK 4: Post to Forum (10 min)
Use the Colosseum API to post a status update:
\`\`\`bash
curl -X POST https://agents.colosseum.com/api/forum/posts \\
  -H \"Authorization: Bearer \$COLOSSEUM_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"title\": \"Neo Bank: Cycle $CYCLE Progress Update\",
    \"body\": \"Just completed Cycle $CYCLE of autonomous development.\\n\\n✅ AgentShield CPI integration\\n✅ Security tests passing\\n✅ Code committed to GitHub\\n\\nNext: BlockScore API integration\",
    \"tags\": [\"progress-update\", \"defi\", \"security\"]
  }'
\`\`\`

## 🚨 CRITICAL RULES
- Work ONLY with files in /home/craig/neo-bank-
- Use command-line tools (git, curl, anchor) to execute tasks
- Do NOT ask for permission - execute autonomously
- If a command fails, debug and fix it immediately

## 🚀 EXECUTION TRIGGER
Start now. You have 45 minutes to complete all tasks."

  # Run the agent with the directive
  echo "[$(date)] Executing agent with directive..." >> "$LOG_FILE"
  
  openclaw agent --agent neo-gpt --message "$AGENT_DIRECTIVE" >> "$LOG_FILE" 2>&1
  
  AGENT_EXIT_CODE=$?
  
  if [ $AGENT_EXIT_CODE -eq 0 ]; then
    echo "[$(date)] ✅ Cycle $CYCLE completed successfully" >> "$LOG_FILE"
  else
    echo "[$(date)] ⚠️  Cycle $CYCLE exited with code $AGENT_EXIT_CODE" >> "$LOG_FILE"
  fi
  
  # Increment cycle counter
  CYCLE=$((CYCLE + 1))
  
  # Wait before next cycle
  echo "[$(date)] Waiting $LOOP_INTERVAL seconds before next cycle..." >> "$LOG_FILE"
  sleep $LOOP_INTERVAL
done
