# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Voice Calendar - A Next.js 15 application that combines natural language calendar management via OpenAI with Flow blockchain staking mechanics. Users authenticate via Flow wallet, connect their Google Calendar, interact through an AI chat assistant, and can stake FLOW tokens on meetings for accountability.

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Run development server with Turbopack
pnpm dev

# Build for production with Turbopack
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Type checking (no dedicated script, use IDE or manually)
npx tsc --noEmit
```

## High-Level Architecture

### Core Integration Flow
1. **Authentication**: Users connect Flow wallet via FCL → wallet address serves as primary identifier
2. **Google OAuth**: Calendar connection initiated with wallet address → tokens encrypted and stored in JSON database
3. **Natural Language Processing**: User messages → OpenAI with tool calling → calendar operations executed
4. **Contact Resolution**: Names mentioned in messages → Google People API search → email addresses for invites
5. **Blockchain Staking**: Meeting creation → optional FLOW token staking → attendance verification → reward distribution

### Service Layer Architecture
The application uses singleton service instances to manage stateful operations:

- **GoogleCalendarService**: Manages OAuth tokens, automatic refresh, and all calendar CRUD operations
- **GoogleContactsService**: Handles contact search, resolution, and creation with confidence scoring
- **OpenAIService**: Processes natural language, executes tool calls, manages timezone context
- **CalendarAssistantService**: Maintains conversation sessions with 30-minute timeout
- **FlowService**: Interfaces with Flow blockchain for wallet operations and meeting staking contracts
- **GmailContactSync**: Batch syncs contacts for improved performance (new service)

### Token Management Strategy
- Tokens stored encrypted (AES-256-CBC) in `calendar-connections.json`
- Automatic refresh 5 minutes before expiry in both Calendar and Contacts services
- Shared OAuth client configuration across services
- Graceful fallback when tokens expire

### OpenAI Tool Calling Implementation
Tool execution follows a specific pattern:
1. Natural language → OpenAI with tool definitions
2. OpenAI returns tool calls with structured parameters
3. Tool calls executed via service layer
4. Results formatted and returned to OpenAI for final response
5. Structured time components (hour, minute, period) ensure accurate datetime parsing

### Flow Blockchain Integration
- **Contract Addresses**: Configurable via environment variables for testnet/mainnet
- **Meeting Staking Contract**: Deployed at `NEXT_PUBLIC_MEETING_STAKING_ADDRESS`
- **Cadence Transactions**: Create meetings, join with stake, mark attendance, finalize, claim rewards
- **Meeting Manager**: Per-user resource stored in Flow account storage

## Key Technical Decisions

### Database Choice
JSON file storage (`calendar-connections.json`) chosen over traditional database for:
- Simplicity in proof-of-concept phase
- Easy encryption/decryption of sensitive tokens
- Direct file system access in serverless environment

### Contact Resolution Approach
Multi-tier resolution strategy:
1. Check if input is email address (regex validation)
2. Search Google Contacts with warmup request for cache
3. Score matches by confidence (exact > high > medium > low)
4. Return best match or null if ambiguous

### Timezone Handling
All datetime operations use explicit timezone:
- Browser timezone detected via `Intl.DateTimeFormat`
- Structured time components assembled with timezone offset
- RFC3339 format with offset for Google Calendar API
- Natural language parsing ("tomorrow at 3pm") with timezone context

### State Management
- No global state management (Redux/Zustand)
- Component-level state with React hooks
- Server-side session management for conversations
- Flow wallet state managed by FCL

## Environment Variables

Required for development:
```bash
# Google OAuth (obtain from Google Cloud Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback

# Security (generate random strings)
JWT_SECRET=           # For token encryption
NEXTAUTH_SECRET=      # For NextAuth.js
NEXTAUTH_URL=http://localhost:3000

# OpenAI (from platform.openai.com)
OPENAI_API_KEY=

# Flow Blockchain
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_ACCESS_NODE_API=https://access-testnet.onflow.org
NEXT_PUBLIC_WALLET_DISCOVERY=https://fcl-discovery.onflow.org/testnet/authn
NEXT_PUBLIC_APP_IDENTIFIER=ai-voice-calendar
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=  # From WalletConnect Cloud

# Flow Contract Addresses (testnet defaults)
NEXT_PUBLIC_MEETING_STAKING_ADDRESS=0x2c3e84f9de31e3c7
NEXT_PUBLIC_FLOW_TOKEN_ADDRESS=0x7e60df042a9c0868
```

## Testing Approach

### Manual Testing Points
1. **OAuth Flow**: `/api/calendar/google/connect` → Google consent → callback handling
2. **Contact Resolution**: `/test-contacts` page for testing search and creation
3. **Natural Language**: Test various date/time formats in chat assistant
4. **Token Refresh**: Set token expiry to near future and verify auto-refresh
5. **Flow Transactions**: Use Flow testnet faucet for testing stakes

### Debug Logging
Console logs are prefixed by service for filtering:
- `[Contacts]` - Contact operations
- `[OpenAI]` - AI processing
- `[Calendar]` - Event operations
- `[Flow]` - Blockchain transactions

## Common Development Tasks

### Adding New Calendar Tool
1. Define tool schema in `src/types/openai.ts`
2. Add tool to `CALENDAR_TOOLS` array
3. Implement execution in `OpenAIService.executeToolCall()`
4. Add corresponding method in `GoogleCalendarService`

### Modifying Contact Resolution Logic
1. Edit confidence calculation in `GoogleContactsService.calculateConfidence()`
2. Adjust search parameters in `searchContactsByName()`
3. Test with various name formats in `/test-contacts`

### Updating Flow Smart Contracts
1. Contracts located in parent `cadence-contracts` directory
2. Deploy updates to testnet via Flow CLI
3. Update contract addresses in environment variables
4. Modify `FlowService` transactions/scripts as needed

### Troubleshooting OAuth Issues
1. Check redirect URI matches exactly in Google Cloud Console
2. Verify scopes include both calendar and contacts
3. Check token encryption/decryption in database layer
4. Monitor token refresh logs for expiry issues

## Performance Considerations

### Current Bottlenecks
- Contact search API has ~2-3 second latency (warmup request helps)
- Multiple sequential API calls in natural language processing
- JSON file I/O for each database operation

### Optimization Opportunities
- Implement contact caching layer
- Batch API calls where possible
- Consider moving to proper database for production
- Add request queuing for rate limiting