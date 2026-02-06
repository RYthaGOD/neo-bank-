#!/bin/bash
# OpenClaw Agent Launcher with Enhanced Capabilities
# Enables autonomous development work

AGENT_NAME="neo-gpt"
WORKSPACE="/home/craig/neo-bank-"
LOG_FILE="$WORKSPACE/openclaw_dev.log"

# Load environment
set -a
source "$WORKSPACE/.env"
set +a

echo "========================================" > "$LOG_FILE"
echo "OpenClaw Development Agent - STARTED" >> "$LOG_FILE"
echo "Agent: $AGENT_NAME" >> "$LOG_FILE"
echo "Workspace: $WORKSPACE" >> "$LOG_FILE"
echo "Capabilities: Code Writing + Terminal Access" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Enhanced agent directive with code writing permissions
AGENT_DIRECTIVE="# OpenClaw Development Agent

**Role:** Autonomous development agent for Neo Bank
**Capabilities:** Code writing, terminal access, file operations
**Workspace:** $WORKSPACE

## YOUR CAPABILITIES

You have FULL development capabilities:

1. **Write Code**
   - Create/modify Rust files (Anchor programs)
   - Create/modify TypeScript files (SDK, frontend)
   - Write tests and documentation
   - Refactor and optimize code

2. **Run Commands**
   - \`anchor build\` - Build Solana programs
   - \`anchor test\` - Run tests
   - \`npm run build\` - Build frontend
   - \`npm run dev\` - Start dev server
   - Install dependencies as needed

3. **File Operations**
   - Read/write any project files
   - Create directories
   - Manage configuration
   - Handle environment variables (read-only)

## CURRENT MISSION

Review the security audit and handoff document:
- \`$WORKSPACE/SECURITY_AUDIT_REPORT.md\`
- \`$WORKSPACE/OPENCLAW_HANDOFF.md\`

Then execute your assigned tasks:

1. **Forum Monitoring** (HIGH PRIORITY)
   - Track AgentShield program ID announcements
   - Monitor security discussions
   - Engage with community on relevant topics

2. **Code Improvements** (MEDIUM PRIORITY)
   - Fix minor build errors if any
   - Implement recommended improvements
   - Run security audits after changes

3. **Documentation** (LOW PRIORITY)
   - Update README with new features
   - Create deployment guides
   - Write API documentation

## SAFETY RULES

1. **Never** modify files outside $WORKSPACE
2. **Never** expose API keys or secrets
3. **Always** run tests after code changes
4. **Always** commit changes with descriptive messages
5. **Ask for help** if unsure about security-critical changes

## HANDOFF PROTOCOL

If you need Gemini's help, create:
\`$WORKSPACE/OPENCLAW_ALERT_[PRIORITY]_[TOPIC].md\`

Include:
- What happened
- Why it matters
- Recommended action
- Relevant context

## START HERE

1. Read the security audit report
2. Read your handoff document
3. Begin forum monitoring
4. Report status every 4 hours

You have full autonomy within these guidelines. Build the future!
"

echo "[$(date)] Launching OpenClaw agent with enhanced capabilities..." >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Launch agent with directive
openclaw agent --agent "$AGENT_NAME" --message "$AGENT_DIRECTIVE" >> "$LOG_FILE" 2>&1

echo "" >> "$LOG_FILE"
echo "[$(date)] Agent session completed" >> "$LOG_FILE"
