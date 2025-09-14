# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Voice Calendar - A Next.js application with AI-powered calendar management through natural language, integrated with Flow blockchain for staking mechanics. Users connect Google Calendar, interact via an OpenAI-powered chat assistant, and stake FLOW tokens on meetings for accountability.

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
- **Contacts**: Google People API for contact resolution
- **AI Integration**: OpenAI API with GPT-4o-mini for tool calling
- **Database**: JSON file-based storage with encryption (calendar-connections.json)

### Project Structure

```
ai-calendar/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/
│   │   │   ├── calendar/        # Calendar API routes
│   │   │   │   ├── google/
│   │   │   │   │   ├── connect/     # OAuth flow initiation
│   │   │   │   │   ├── callback/    # OAuth callback handler
│   │   │   │   │   ├── events/      # Calendar events CRUD
│   │   │   │   │   └── disconnect/  # Disconnect calendar
│   │   │   │   └── status/          # Connection status check
│   │   │   └── assistant/
│   │   │       └── calendar/    # AI assistant endpoint for natural language processing
│   │   ├── layout.tsx           # Root layout with FlowProvider
│   │   └── page.tsx             # Main page with calendar UI and assistant
│   ├── components/
│   │   ├── FlowProvider.tsx     # Flow blockchain configuration wrapper
│   │   ├── GoogleCalendarConnect.tsx  # Calendar connection component
│   │   ├── CalendarAssistant.tsx      # ChatGPT-style AI assistant interface
│   │   ├── CalendarView.tsx     # Month/week calendar grid with event display
│   │   ├── ClientOnly.tsx       # Client-side rendering wrapper
│   │   └── ui/
│   │       ├── MessageBubble.tsx      # Chat message display component
│   │       └── ChatInput.tsx          # Enhanced chat input with multi-line support
│   ├── types/
│   │   └── openai.ts            # OpenAI tool definitions and types
│   └── lib/
│       ├── db/index.ts          # JSON database with encryption
│       ├── services/
│       │   ├── googleCalendar.ts      # Google Calendar service class
│       │   ├── googleContacts.ts      # Google Contacts/People API service
│       │   ├── openai.ts              # OpenAI service with tool calling
│       │   └── calendarAssistant.ts   # Calendar assistant conversation manager
│       ├── utils/
│       │   └── timezone.ts      # Timezone handling and date formatting utilities
│       └── flow/config.ts        # Flow blockchain configuration
```

### Key Integration Points

#### Google Calendar OAuth Flow
1. User initiates connection via `/api/calendar/google/connect` with wallet address
2. OAuth redirect to Google with calendar and contacts scopes
3. Callback to `/api/calendar/google/callback` stores encrypted tokens
4. Token refresh handled automatically by both `GoogleCalendarService` and `GoogleContactsService`

#### Google Contacts Integration
- **Contact Search**: Searches user's Google contacts by name using People API
- **Smart Resolution**: Automatically resolves contact names to email addresses when creating events
- **Confidence Scoring**: Ranks matches by confidence (exact, high, medium, low)
- **Mixed Input Support**: Handles both email addresses and contact names in attendee lists
- **Example**: "Schedule meeting with Tom" automatically finds Tom's email from contacts

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

#### OpenAI Tool Calling Architecture
1. **Tool Definitions** (`src/types/openai.ts`): 
   - Defines 5 calendar tools: get_events, create_event, update_event, delete_event, search_events
   - Each tool has typed parameters for OpenAI function calling
   - Create event tool uses structured time components (date, hour, minute, period) for accurate parsing
   - AttendeeEmails parameter accepts both email addresses and contact names

2. **OpenAI Service** (`src/lib/services/openai.ts`):
   - Processes natural language with GPT-4o-mini model
   - Executes tool calls by mapping to GoogleCalendarService methods
   - Automatically resolves contact names to emails via GoogleContactsService
   - Handles timezone-aware datetime formatting
   - Tool response formatting and error states

3. **Assistant Service** (`src/lib/services/calendarAssistant.ts`):
   - Manages conversation context with 30-minute timeout
   - Maintains message history for contextual responses
   - Handles conversation cleanup and session management

4. **API Flow**:
   - User message → `/api/assistant/calendar` → OpenAI with tools → Execute calendar operations → Return formatted response
   - Supports GET (conversation info), POST (process message), DELETE (clear conversation)

#### Timezone and Date Handling
The application includes comprehensive timezone support via `src/lib/utils/timezone.ts`:
- **getUserTimezone()**: Detects browser timezone automatically
- **formatDateTimeWithTimezone()**: Converts dates to RFC3339 format with timezone offsets
- **assembleDateTime()**: Builds proper datetime from structured components (handles AM/PM and 24-hour formats)
- **parseAndFormatDateTime()**: Parses natural language dates ("tomorrow at 3pm", "next Monday")
- **addDurationToDateTime()**: Calculates end times based on duration

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

Calendar API routes follow RESTful patterns:
- `GET /api/calendar/status` - Check connection status
- `GET /api/calendar/google/connect` - Initiate OAuth
- `GET /api/calendar/google/callback` - Handle OAuth callback
- `GET /api/calendar/google/events` - Fetch calendar events
- `POST /api/calendar/google/events` - Create calendar event
- `DELETE /api/calendar/google/disconnect` - Remove connection

Assistant API endpoints:
- `POST /api/assistant/calendar` - Process natural language calendar request
- `GET /api/assistant/calendar?conversation_id={id}` - Get conversation info
- `DELETE /api/assistant/calendar?conversation_id={id}` - Clear conversation

### UI Components

#### CalendarView Component
A full-featured calendar grid supporting month and week views:
- Month view with day cells showing up to 3 events
- Week view with hourly time slots
- Event click for detailed modal view
- Navigation controls (previous/next/today)
- Auto-refreshes when events are added/modified
- Highlights current day and differentiates current month days

#### Assistant Interface
ChatGPT-style conversational UI:
- Message bubbles with user/assistant distinction
- Multi-line input support with Enter to send
- Real-time event updates after assistant actions
- Conversation history maintained for context
- Automatic scroll to latest messages

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
- ✅ OpenAI integration with tool calling
- ✅ Natural language calendar management
- ✅ ChatGPT-style assistant UI
- ✅ Contact name resolution for event attendees
- ⏳ Voice interaction (speech-to-text)
- ⏳ FLOW staking mechanics
- ⏳ Meeting attendance verification