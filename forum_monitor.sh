#!/bin/bash
# Neo Bank Forum Monitor
# Agent monitors Colosseum forum and reports activity

LOG_FILE="/home/craig/neo-bank-/forum_monitor.log"
ENV_FILE="/home/craig/neo-bank-/.env"
CHECK_INTERVAL=1800  # 30 minutes

echo "========================================" > "$LOG_FILE"
echo "Neo Bank Forum Monitor - STARTED" >> "$LOG_FILE"
echo "Monitoring Colosseum forum activity" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Load environment
set -a
source "$ENV_FILE"
set +a

CYCLE=1

while true; do
  echo "" >> "$LOG_FILE"
  echo "[$(date)] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$LOG_FILE"
  echo "[$(date)] Forum Check Cycle $CYCLE" >> "$LOG_FILE"
  echo "[$(date)] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$LOG_FILE"
  
  # Clear session memory
  rm -rf /home/craig/.openclaw/agents/neo-gpt/sessions/* 2>/dev/null
  
  AGENT_DIRECTIVE="# Forum Monitor: Cycle $CYCLE

**Role:** You are Neo's Forum Monitor for the Colosseum Hackathon.
**Mission:** Check forum activity and report what needs attention.

## TASKS FOR THIS CYCLE

### 1. Check Your Posts (5 min)
Use the Colosseum API to check for new replies on your posts:
\`\`\`bash
curl -H \"Authorization: Bearer \$COLOSSEUM_API_KEY\" \\
  \"https://agents.colosseum.com/api/forum/me/posts?sort=new&limit=10\"
\`\`\`

Look for posts with new \`commentCount\` since last check.

### 2. Check Hot Topics (5 min)
See what's trending in the forum:
\`\`\`bash
curl \"https://agents.colosseum.com/api/forum/posts?sort=hot&limit=20\"
\`\`\`

Identify 2-3 posts relevant to Neo Bank (security, DeFi, AI agents).

### 3. Generate Report (5 min)
Create a summary report with:
- Number of new replies on your posts
- Interesting projects to engage with
- Suggested forum post topics
- Any urgent community questions about Neo Bank

### 4. Post Update (Optional)
If there's significant progress to share, post a brief update:
\`\`\`bash
curl -X POST https://agents.colosseum.com/api/forum/posts \\
  -H \"Authorization: Bearer \$COLOSSEUM_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"title\": \"Neo Bank: Development Update\",
    \"body\": \"[Your update here]\",
    \"tags\": [\"progress-update\", \"defi\", \"security\"]
  }'
\`\`\`

## OUTPUT FORMAT
Provide a concise summary in this format:

**Forum Activity Summary - Cycle $CYCLE**
- New replies: [count]
- Hot topics: [list 2-3]
- Engagement opportunities: [list]
- Suggested next post: [topic idea]

Keep it brief and actionable."

  echo "[$(date)] Running forum check..." >> "$LOG_FILE"
  
  openclaw agent --agent neo-gpt --message "$AGENT_DIRECTIVE" >> "$LOG_FILE" 2>&1
  
  echo "[$(date)] ✅ Cycle $CYCLE completed" >> "$LOG_FILE"
  
  CYCLE=$((CYCLE + 1))
  
  echo "[$(date)] Next check in $CHECK_INTERVAL seconds..." >> "$LOG_FILE"
  sleep $CHECK_INTERVAL
done
