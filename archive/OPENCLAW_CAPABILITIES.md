# OpenClaw Agent Enhanced Configuration
# Enables code writing and terminal access for autonomous development

## Agent Capabilities Update

**Date:** February 4, 2026  
**Agent:** neo-gpt  
**Purpose:** Enable autonomous development capabilities

### Enabled Capabilities

1. **Code Writing**
   - Create new files
   - Modify existing code
   - Refactor and optimize
   - Write tests

2. **Terminal Access**
   - Run build commands
   - Execute tests
   - Deploy to devnet/mainnet
   - Install dependencies

3. **File System Operations**
   - Read/write project files
   - Create directories
   - Manage configuration files
   - Handle environment variables

### Safety Guardrails

1. **Workspace Restriction**
   - Limited to `/home/craig/neo-bank-` directory
   - Cannot modify system files
   - Cannot access sensitive directories

2. **Command Approval**
   - Destructive commands require confirmation
   - Deployment commands logged
   - API key operations restricted

3. **Code Review**
   - All changes logged
   - Git commits required
   - Security audit on changes

### Usage Instructions

The OpenClaw agent can now:

```bash
# Write code
openclaw agent --agent neo-gpt --message "Create a new component for X"

# Run terminal commands
openclaw agent --agent neo-gpt --message "Build and test the project"

# Deploy code
openclaw agent --agent neo-gpt --message "Deploy to devnet"
```

### Integration with Gemini

- **Gemini:** Handles complex development tasks, security audits
- **OpenClaw:** Handles forum monitoring, community engagement, routine updates
- **Handoff:** Via OPENCLAW_HANDOFF.md and alert files

### Permissions Matrix

| Action | Gemini | OpenClaw |
|--------|--------|----------|
| Write Rust code | ✅ | ✅ |
| Write TypeScript | ✅ | ✅ |
| Run tests | ✅ | ✅ |
| Deploy contracts | ✅ | ✅ |
| Modify security code | ✅ | ⚠️ (with review) |
| Access API keys | ✅ | ❌ |
| Post to forum | ⚠️ | ✅ |
| Monitor community | ❌ | ✅ |

### Security Audit Integration

OpenClaw should run security audits after code changes:

```bash
# After making changes
openclaw agent --agent neo-gpt --message "Run security audit on recent changes"
```

### Handoff Protocol

When OpenClaw needs Gemini's help:

1. Create alert file: `OPENCLAW_ALERT_[PRIORITY]_[TOPIC].md`
2. Include context and recommended action
3. Gemini reviews and responds

When Gemini hands off to OpenClaw:

1. Update `OPENCLAW_HANDOFF.md`
2. Specify action items
3. Set priorities and deadlines

---

**Status:** Configuration Enhanced  
**Next:** Pass audit report to OpenClaw for forum engagement
