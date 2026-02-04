#!/bin/bash
# Neo Bank Night Shift Protocol
# Ensures the agent runs continuously and logs everything.

LOG_FILE="/home/craig/neo-bank-/night_shift.log"
ENV_FILE="/home/craig/neo-bank-/.env"

echo "Starting Night Shift Protocol..." > "$LOG_FILE"
echo "Target: Feb 9th Deadline" >> "$LOG_FILE"

# Ensure Gateway is up
systemctl --user start openclaw-gateway.service

while true; do
  echo "[$(date)] Starting Agent Loop..." >> "$LOG_FILE"
  
  # Load env and run agent
  # We use the 'embedded' flag or just standard agent run, ensuring it picks up the .env
  set -a
  source "$ENV_FILE"
  set +a
  
  # Wipe session memory to prevent token context bloat (Rate Limit Protection)
  rm -rf /home/craig/.openclaw/agents/neo-gpt/sessions/*
  
  # Run the agent and append output to log
  openclaw agent --agent neo-gpt --message "CRITICAL CONTEXT: You are Agent Neo. We are at Loop 7. COMPLETED: Loops 1-6 (Intents -> Dashboard). NEXT MISSION: Integrate AgentShield (Security API). Use it to scan all strategies. BANK SECURITY DOCTRINE IS ACTIVE: Trust no one, verify everything. Audit your hooks, integrate the shield, and secure the bank. Proceed." >> "$LOG_FILE" 2>&1
  
  echo "[$(date)] Agent process exited. Restarting in 5 minutes..." >> "$LOG_FILE"
  sleep 300
done
