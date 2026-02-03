#!/bin/bash
# Heartbeat script for Colosseum Agent Hackathon
API_KEY="183eee2c6478b60129a9e6cfbdc73973ff33f1ed87c129214f9fdac2a416e7e3"

echo "Checking Agent Status..."
curl -s -H "Authorization: Bearer $API_KEY" https://agents.colosseum.com/api/agents/status > heartbeat_status.json
cat heartbeat_status.json

echo "\nChecking Heartbeat File..."
curl -s https://colosseum.com/heartbeat.md > heartbeat.md
head -n 10 heartbeat.md
