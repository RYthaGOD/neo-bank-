# Autonomous Agent Loop - Quick Start Guide

## 🚀 Starting the Agent

### Option 1: Run in Foreground (Recommended for Testing)
```bash
cd /home/craig/neo-bank-
./autonomous_loop.sh
```

### Option 2: Run in Background (For Continuous Operation)
```bash
cd /home/craig/neo-bank-
nohup ./autonomous_loop.sh &
```

### Option 3: Run with systemd (For Production)
```bash
# Create systemd service
sudo tee /etc/systemd/system/neo-agent.service > /dev/null <<EOF
[Unit]
Description=Neo Bank Autonomous Agent
After=network.target

[Service]
Type=simple
User=craig
WorkingDirectory=/home/craig/neo-bank-
ExecStart=/home/craig/neo-bank-/autonomous_loop.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable neo-agent
sudo systemctl start neo-agent

# Check status
sudo systemctl status neo-agent

# View logs
sudo journalctl -u neo-agent -f
```

## 📊 Monitoring the Agent

### View Live Logs
```bash
tail -f /home/craig/neo-bank-/autonomous_loop.log
```

### Check Current Cycle
```bash
grep "CYCLE" /home/craig/neo-bank-/autonomous_loop.log | tail -1
```

### View Latest Status
```bash
tail -50 /home/craig/neo-bank-/autonomous_loop.log
```

## 🛑 Stopping the Agent

### If Running in Foreground
Press `Ctrl+C`

### If Running in Background
```bash
pkill -f autonomous_loop.sh
```

### If Running as systemd Service
```bash
sudo systemctl stop neo-agent
```

## 📋 What the Agent Does Each Cycle (60 minutes)

1. **BUILD** - Implements NeoShield integration and partner APIs
2. **AUDIT** - Runs tests and simulates attack scenarios
3. **COMMIT** - Pushes code to GitHub
4. **FORUM** - Posts updates and engages with community
5. **REPORT** - Logs progress metrics

## 🎯 Expected Outputs

- **Code Changes:** Commits to `RYthaGOD/neo-bank` every hour
- **Forum Posts:** Status updates on Colosseum forum
- **Logs:** Detailed execution logs in `autonomous_loop.log`
- **Tests:** Automated test runs with results

## 🔧 Configuration

The agent reads from `/home/craig/neo-bank-/.env`:
- `COLOSSEUM_API_KEY` - For forum posting
- `OPENAI_API_KEY` - For agent intelligence
- `GEMINI_API_KEY` - Available for forum interactions

## 📈 Progress Tracking

Check `walkthrough.md` for cumulative progress updates after each cycle.

## ⚠️ Troubleshooting

### Agent Not Starting
```bash
# Check if gateway is running
systemctl --user status openclaw-gateway.service

# Start gateway manually
systemctl --user start openclaw-gateway.service
```

### API Key Errors
```bash
# Verify .env file
cat /home/craig/neo-bank-/.env | grep API_KEY
```

### Memory Issues
```bash
# The script automatically clears session memory each cycle
# If issues persist, manually clear:
rm -rf /home/craig/.openclaw/agents/neo-gpt/sessions/*
```

## 🎓 Understanding the Directive

The agent receives a detailed directive each cycle that includes:
- Current progress context
- Specific technical objectives
- Partner integration requirements
- Quality standards
- Forum engagement guidelines

See `AGENT_DIRECTIVE_V2.md` for the full specification.

## 🏆 Success Criteria

By February 9th, 2026, the agent should have:
- ✅ Full NeoShield on-chain integration
- ✅ All partner APIs integrated
- ✅ Comprehensive test coverage
- ✅ Active forum presence
- ✅ Production-ready codebase

---

**Ready to start?** Run `./autonomous_loop.sh` and let Neo build! 🏦
