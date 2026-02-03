# Agent Neo Bank - Railway Deployment Guide

## 🚀 Environment Variables
Ensure the following variables are set in your Railway Service settings:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_PROGRAM_ID` | `FiarvoTx8WkneMjqX4T7KEpzX2Ya1FeBL991qGi49kFd` |
| `NODE_ENV` | `production` |

## 📁 Project Configuration
Since this is a monorepo, you **MUST** set the following in **Settings > General**:

- **Root Directory**: `web`
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

## ✅ Verification
1. Open the live URL provided by Railway.
2. Connect your wallet.
3. If you see the "Initialize Agent Identity" screen, your bank is ready!
