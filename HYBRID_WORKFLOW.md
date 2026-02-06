# Hybrid Development Workflow

## Division of Labor

### 🤖 Agent Neo (Forum Monitor)
**Runs:** `forum_monitor.sh` every 30 minutes
**Responsibilities:**
- Monitor Colosseum forum for new replies
- Identify trending topics relevant to Neo Bank
- Suggest engagement opportunities
- Post occasional status updates
- Report community questions

**Output:** Logs to `forum_monitor.log`

### 👨‍💻 Gemini (Development Lead)
**Works:** In focused development sessions
**Responsibilities:**
- Implement NeoShield integration
- Write and test Rust code
- Update SDK and documentation
- Commit code to GitHub
- Coordinate with agent on what to announce

## Workflow

### Daily Cycle

**Morning (Your timezone):**
1. Review `forum_monitor.log` for overnight activity
2. I implement 1-2 major features based on priorities
3. Run tests and commit code
4. Prepare forum post content

**Afternoon:**
1. Agent posts development update to forum
2. I continue feature development
3. Agent monitors for replies and engagement

**Evening:**
1. Review agent's forum activity report
2. Plan next day's development priorities
3. Agent continues monitoring overnight

### Communication Protocol

**Agent → You:**
- Forum activity summaries in `forum_monitor.log`
- Alerts for important community questions
- Suggestions for engagement

**You → Agent:**
- Development progress updates (via forum posts)
- New features to announce
- Responses to community questions

**Me → You:**
- Code changes and commits
- Test results
- Technical decisions needing input

## Current Priorities (Feb 4-9)

### High Priority
1. ✅ NeoShield on-chain CPI integration
2. ✅ Circuit breaker implementation
3. ✅ Live yield strategy CPIs
4. ✅ Comprehensive security tests

### Medium Priority
5. ⏳ BlockScore API integration
6. ⏳ AgentRep governance weight
7. ⏳ SOLPRISM transaction simulation
8. ⏳ AgentMemory audit logging

### Ongoing
- Forum engagement (Agent)
- Code quality improvements (Me)
- Documentation updates (Me)
- Community support (Agent + You)

## Quick Commands

**Start Forum Monitor:**
```bash
cd /home/craig/neo-bank-
nohup ./forum_monitor.sh > /dev/null 2>&1 &
```

**Check Forum Activity:**
```bash
tail -50 /home/craig/neo-bank-/forum_monitor.log
```

**Stop Forum Monitor:**
```bash
pkill -f forum_monitor.sh
```

**Request Development Work:**
Just tell me what feature to implement and I'll get it done!

## Success Metrics

- **Code:** Regular commits with working features
- **Forum:** Active presence, helpful responses
- **Community:** Positive engagement, growing interest
- **Progress:** Measurable advancement toward Feb 9th deadline

---

**Ready to build! 🏦** Let's coordinate and ship great code while staying engaged with the community.
