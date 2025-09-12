# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Voice Calendar - A Next.js application integrating voice-powered calendar management with Flow blockchain staking mechanics. Users connect Google Calendar and stake FLOW tokens on meetings for accountability.

## Development Commands

```bash
# Navigate to the Next.js app directory first
cd ai-calendar

# Install dependencies
pnpm install

# Run development server with Turbopack
pnpm dev

# Build for production with Turbopack
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15.5.3 with App Router, React 19.1.0, TypeScript
- **Styling**: Tailwind CSS v4
- **Authentication**: Flow blockchain wallet (via @onflow/react-sdk)
- **Calendar**: Google Calendar API (googleapis)
- **AI Integration**: OpenAI API (planned)
- **Database**: JSON file-based storage with encryption (calendar-connections.json)

### Project Structure

```
ai-calendar/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/calendar/        # Calendar API routes
│   │   │   ├── google/
│   │   │   │   ├── connect/     # OAuth flow initiation
│   │   │   │   ├── callback/    # OAuth callback handler
│   │   │   │   ├── events/      # Calendar events CRUD
│   │   │   │   └── disconnect/  # Disconnect calendar
│   │   │   └── status/          # Connection status check
│   │   ├── layout.tsx           # Root layout with FlowProvider
│   │   └── page.tsx             # Main page with calendar UI
│   ├── components/
│   │   ├── FlowProvider.tsx     # Flow blockchain configuration wrapper
│   │   ├── GoogleCalendarConnect.tsx  # Calendar connection component
│   │   └── ClientOnly.tsx       # Client-side rendering wrapper
│   └── lib/
│       ├── db/index.ts          # JSON database with encryption
│       ├── services/
│       │   └── googleCalendar.ts # Google Calendar service class
│       └── flow/config.ts        # Flow blockchain configuration
```

### Key Integration Points

#### Google Calendar OAuth Flow
1. User initiates connection via `/api/calendar/google/connect` with wallet address
2. OAuth redirect to Google with calendar scopes
3. Callback to `/api/calendar/google/callback` stores encrypted tokens
4. Token refresh handled automatically by `GoogleCalendarService`

#### Database Layer
- JSON file storage at `calendar-connections.json`
- AES-256-CBC encryption for tokens using JWT_SECRET
- Wallet address as primary key for calendar connections
- Automatic token refresh before expiry (5-minute buffer)

#### Flow Blockchain Integration
- Wallet connection via FCL (Flow Client Library)
- Testnet configuration by default
- Contract addresses configured for FungibleToken, FlowToken, FUSD
- FlowProvider wraps entire app for wallet access

### Environment Variables Required

```bash
# Google OAuth
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI

# Security
JWT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL

# OpenAI
OPENAI_API_KEY

# Flow Blockchain
NEXT_PUBLIC_FLOW_NETWORK
NEXT_PUBLIC_ACCESS_NODE_API
NEXT_PUBLIC_WALLET_DISCOVERY
NEXT_PUBLIC_APP_IDENTIFIER
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
```

### API Routes Pattern

All calendar API routes follow RESTful patterns:
- `GET /api/calendar/status` - Check connection status
- `GET /api/calendar/google/connect` - Initiate OAuth
- `GET /api/calendar/google/callback` - Handle OAuth callback
- `GET /api/calendar/google/events` - Fetch calendar events
- `POST /api/calendar/google/events` - Create event (planned)
- `DELETE /api/calendar/google/disconnect` - Remove connection

### Security Considerations

- Tokens encrypted at rest using AES-256-CBC
- Wallet address required for all calendar operations
- Automatic token refresh with expiry tracking
- Environment-based configuration for all secrets

### Current Implementation Status

- ✅ Flow wallet integration
- ✅ Google Calendar OAuth flow
- ✅ Token management with refresh
- ✅ Encrypted JSON database
- ⏳ Voice interaction (OpenAI integration pending)
- ⏳ FLOW staking mechanics
- ⏳ Meeting attendance verification