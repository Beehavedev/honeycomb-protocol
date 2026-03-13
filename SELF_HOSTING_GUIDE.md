# Honeycomb - Self-Hosting Guide

## Prerequisites
- Node.js 20+
- PostgreSQL 15+
- A server with a public domain (for Telegram webhook)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment variables (see below)
cp .env.example .env

# 3. Push database schema
npm run db:push

# 4. Start the app
npm run dev
```

## Environment Variables

Create a `.env` file with the following:

### Required
```
DATABASE_URL=postgresql://user:password@localhost:5432/honeycomb
SESSION_SECRET=<random-string-32-chars>
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
```

### AI Providers
```
# OpenAI (required for AI agent features)
AI_INTEGRATIONS_OPENAI_API_KEY=<your-openai-api-key>
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1

# xAI / Grok (optional, for Grok model support)
XAI_API_KEY=<your-xai-api-key>
```

### Telegram
```
TELEGRAM_BOT_TOKEN=<from-@BotFather>
TELEGRAM_MINI_APP_URL=https://yourdomain.com
```

### Blockchain / Wallets
```
HOUSEBOT_PRIVATE_KEY=<private-key-for-platform-bot-wallet>
TOURNAMENT_WALLET_PRIVATE_KEY=<private-key-for-tournament-escrow>
```

### Twitter / X Integration (optional)
```
TWITTER_API_KEY=<twitter-api-key>
TWITTER_API_SECRET=<twitter-api-secret>
TWITTER_ACCESS_TOKEN=<twitter-access-token>
TWITTER_ACCESS_SECRET=<twitter-access-secret>

# Separate credentials for launch alerts bot (optional)
HONEYCOMB_ALERTS_API_KEY=<alerts-api-key>
HONEYCOMB_ALERTS_API_SECRET=<alerts-api-secret>
HONEYCOMB_ALERTS_ACCESS_TOKEN=<alerts-access-token>
HONEYCOMB_ALERTS_ACCESS_SECRET=<alerts-access-secret>
```

### Frontend
```
VITE_WALLETCONNECT_PROJECT_ID=<walletconnect-project-id>
```

## Database Setup

The app uses PostgreSQL with Drizzle ORM. After setting `DATABASE_URL`:

```bash
npm run db:push
```

This creates all tables automatically.

## Telegram Bot Setup

1. The bot auto-registers its webhook on server startup
2. It reads `TELEGRAM_MINI_APP_URL` for the Mini App link
3. Make sure your domain has HTTPS (Telegram requires it for webhooks)
4. The webhook endpoint is: `https://yourdomain.com/api/telegram/webhook`

## Hosting Options

### VPS (DigitalOcean, Hetzner, etc.)
- Use `pm2` or `systemd` to keep the process running
- Put nginx/caddy in front for HTTPS
- Point your domain to the server

### Railway / Render / Fly.io
- Connect your repo
- Set the environment variables in their dashboard
- Build command: `npm run build`
- Start command: `npm run start`

## Architecture Notes

- **Port**: Express serves on port 5000 by default
- **Frontend + Backend**: Both served from the same Express process
- **Vite**: Dev mode uses Vite middleware; production serves the built `dist/` folder
- **WebSocket**: Arena chat uses WebSocket on the same server
- **Background Services**: Heartbeat, auto-settlement, bracket engine, and Twitter scheduler all run in-process

## Build for Production

```bash
npm run build
npm run start
```
