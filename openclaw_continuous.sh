#!/bin/bash
# OpenClaw Continuous Development Agent
# Runs in a loop to autonomously work on Neo Bank

AGENT_NAME="neo-gpt"
WORKSPACE="/home/craig/neo-bank-"
LOG_FILE="$WORKSPACE/openclaw_continuous.log"
CHECK_INTERVAL=3600  # 1 hour between work cycles

# Load environment
set -a
source "$WORKSPACE/.env"
set +a

echo "========================================" > "$LOG_FILE"
echo "OpenClaw Continuous Agent - STARTED" >> "$LOG_FILE"
echo "Time: $(date)" >> "$LOG_FILE"
echo "Agent: $AGENT_NAME" >> "$LOG_FILE"
echo "Workspace: $WORKSPACE" >> "$LOG_FILE"
echo "Check Interval: ${CHECK_INTERVAL}s (1 hour)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

CYCLE=1

while true; do
  echo "" >> "$LOG_FILE"
  echo "[$(date)] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$LOG_FILE"
  echo "[$(date)] Work Cycle $CYCLE" >> "$LOG_FILE"
  echo "[$(date)] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$LOG_FILE"
  
  # Clear session memory for fresh context
  rm -rf /home/craig/.openclaw/agents/neo-gpt/sessions/* 2>/dev/null
  
  AGENT_DIRECTIVE="# OpenClaw Development Cycle $CYCLE

**Time:** $(date)
**Workspace:** $WORKSPACE

## YOUR MISSION

You are the autonomous development agent for Neo Bank. You have full code writing and terminal access.

## PRIORITY TASKS

### 1. Check for Alerts (URGENT)
Look for any alert files:
\`\`\`bash
ls -la $WORKSPACE/OPENCLAW_ALERT_*.md 2>/dev/null
\`\`\`

If found, read and act on them immediately.

### 2. Review Security Audit
Read: \`$WORKSPACE/SECURITY_AUDIT_REPORT.md\`

High-priority items to fix:
- Replace AgentShield mock program ID (when available)
- Add threshold validation to circuit breaker
- Check for any build errors

### 3. Monitor Forum Activity
Check: \`$WORKSPACE/forum_monitor.log\`

Look for:
- AgentShield program ID announcements
- Security discussions
- Community questions about Neo Bank
- Partnership opportunities

### 4. Implement Improvements
Based on audit recommendations:

**High Priority:**
- Fix any TypeScript build errors
- Add max threshold validation (1000) to circuit_breaker.rs
- Check if AgentShield program ID is available

**Medium Priority:**
- Add more heuristics to security_cpi.rs
- Implement counter auto-reset logic
- Update documentation

### 5. Run Tests
After any code changes:
\`\`\`bash
cd $WORKSPACE/bank && anchor build
cd $WORKSPACE && npm run build
\`\`\`

## WHAT TO DO THIS CYCLE

Choose ONE task to complete:
1. Fix build errors (if any)
2. Add threshold validation
3. Update documentation
4. Monitor forum and report findings

## OUTPUT FORMAT

Provide:
- **Task Chosen:** [what you're working on]
- **Actions Taken:** [what you did]
- **Results:** [build status, test results]
- **Next Steps:** [what should be done next cycle]
- **Alerts:** [anything urgent for Gemini]

## SAFETY RULES

- Test after code changes
- Commit with descriptive messages
- Create alert file if unsure
- Never expose secrets

Start working!"

  echo "[$(date)] Starting work cycle..." >> "$LOG_FILE"
  
  openclaw agent --agent "$AGENT_NAME" --message "$AGENT_DIRECTIVE" >> "$LOG_FILE" 2>&1
  
  echo "" >> "$LOG_FILE"
  echo "[$(date)] ✅ Cycle $CYCLE completed" >> "$LOG_FILE"
  
  CYCLE=$((CYCLE + 1))
  
  echo "[$(date)] Next cycle in $CHECK_INTERVAL seconds (1 hour)..." >> "$LOG_FILE"
  sleep $CHECK_INTERVAL
done
