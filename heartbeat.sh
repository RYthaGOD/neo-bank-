#!/bin/bash
# Heartbeat script for Colosseum Agent Hackathon
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi
API_KEY="${COLOSSEUM_API_KEY}"

echo "Checking Agent Status..."
curl -s -H "Authorization: Bearer $API_KEY" https://agents.colosseum.com/api/agents/status > heartbeat_status.json
cat heartbeat_status.json

echo "\nChecking Heartbeat File..."
curl -s https://colosseum.com/heartbeat.md > heartbeat.md
head -n 10 heartbeat.md
