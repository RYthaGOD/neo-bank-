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
  
  # Run the agent and append output to log
  openclaw agent --agent main --message "STATUS CHECK: Continue 72-hour autonomous loop. Check forum, implement hooks, audit security. Report progress." >> "$LOG_FILE" 2>&1
  
  echo "[$(date)] Agent process exited. Restarting in 10 seconds..." >> "$LOG_FILE"
  sleep 10
done
