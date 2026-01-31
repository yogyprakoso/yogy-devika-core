# Scrum Poker

A real-time planning poker application built with Baseline Core to demonstrate full-stack capabilities.

## Quick Start

**Prerequisites:** Node 20+, pnpm 9+, AWS CLI, AWS Account

### First Time Setup

```bash
pnpm install
pnpm run deploy:staging          # Deploy to AWS (creates Cognito, DynamoDB, etc.)
pnpm run add:user:staging        # Create admin user (prompts for email/password)
pnpm run generate:env:local      # Generate .env files from deployed stack
```

### Admin Access

Admin dashboard requires users to be in the DynamoDB admin table.

**For Staging/Production:**
```bash
pnpm run add:user:staging        # Interactive: creates Cognito user + adds to admin table
```

**For Local Development:**
```bash
# 1. Start local DynamoDB first
pnpm run db:start

# 2. Get your Cognito userSub (after signing up on web app)
aws cognito-idp admin-get-user \
  --user-pool-id ap-southeast-2_KHyWzjPmY \
  --username your@email.com \
  --profile yogyprakoso \
  --region ap-southeast-2 \
  --query 'Username' --output text

# 3. Add to local admin table
aws dynamodb put-item \
  --endpoint-url http://localhost:8000 \
  --table-name scrum-poker-local-admin \
  --item '{"userSub": {"S": "YOUR_USER_SUB"}, "userEmail": {"S": "your@email.com"}}'
```

**Note:** Local admin app uses local DynamoDB (localhost:8000), not AWS. Users must be added to `scrum-poker-local-admin` table for local access.

### Option A: Use AWS Staging (Recommended)

```bash
# Terminal 1 - Web frontend
pnpm run start:web               # http://localhost:5173

# Terminal 2 - Admin frontend
pnpm run start:admin             # http://localhost:5174
```

Frontend connects to AWS staging API. Simple and reliable.

### Option B: Full Local Development

For API changes without deploying to AWS:

```bash
# Terminal 1 - Start DynamoDB (Docker)
pnpm run db:start                # http://localhost:8000
pnpm run db:setup                # Create tables (first time only)

# Terminal 2 - Local API (Express)
pnpm run start:local:api         # http://localhost:4000/local/

# Terminal 3 - Web frontend
pnpm run start:web               # http://localhost:5173
```

Then update `packages/web/.env.development`:
```
REACT_APP_API_URL=http://localhost:4000/local/
```

> **Note:** Local API uses mock authentication. Cognito features won't work locally.

## Development Plan

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project Setup - Local dev environment | ✅ Done |
| 2 | Room Baseblock - Backend API | ✅ Done |
| 3 | Frontend - Room UI pages & components | ✅ Done |
| 4 | Polling - Real-time room updates | ✅ Done |
| 5 | Polish - Error handling, UX, animations, dark mode | ✅ Done |
| 6 | Admin Dashboard - Room management | ✅ Done |

### Features Implemented

**Web App (User-facing):**
- User authentication with AWS Cognito (Amplify Authenticator)
- Create/join rooms with unique 6-character codes
- Real-time voting with planning poker cards (1, 2, 3, 5, 8, 13, 21, ?)
- Vote reveal with card flip animation
- Statistics (average, mode) after reveal
- Host-only controls (set topic, reveal, reset)
- Dark mode with CSS custom properties
- Copy room code with feedback
- Leave room detection from other sessions
- Mobile responsive design (iPhone SE and up)
- ARIA accessibility attributes for screen readers

**Admin Dashboard:**
- Room Management - view all active rooms
- Room Details - see participants in each room
- Delete Room - remove rooms and all participants

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  LOCAL                         │  AWS STAGING           │
├────────────────────────────────┼────────────────────────┤
│  Web (Vite :5173)    ──────────────►  API Gateway       │
│  Admin (Vite :5174)  ──────────────►  Lambda            │
│                                │      DynamoDB          │
│                                │      Cognito           │
└────────────────────────────────┴────────────────────────┘
```

### Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm run start:web` | Start web frontend |
| `pnpm run start:admin` | Start admin frontend |
| `pnpm run start:local:api` | Start local API (Express) |
| `pnpm run db:start` | Start local DynamoDB (Docker) |
| `pnpm run db:stop` | Stop local DynamoDB |
| `pnpm run deploy:staging` | Deploy API to AWS |
| `pnpm run generate:env:local` | Regenerate .env files |

## Known Issues

### serverless-offline Plugin Incompatibility (pnpm + Serverless v3)

**Issue:** The `serverless-offline` plugin has compatibility issues with pnpm's node_modules structure.

**Error:**
```
TypeError: Cannot redefine property: _serverlessExternalPluginName
```

**Root Cause:** pnpm uses content-addressable storage with symlinks, while Serverless plugins expect npm's flat node_modules structure.

**Workaround:** We created a local Express server (`src/local-server.ts`) that runs the API directly without serverless-offline. Use `pnpm run start:local:api` for local development.

**Impact:** This does NOT affect AWS deployment - only local development tooling.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + Lambda |
| Database | DynamoDB |
| Auth | AWS Cognito |
| Infra | Serverless Framework |
| Real-time | Polling (MVP) |

## Project Structure

```
yogy-devika-core/
├── packages/
│   ├── api/                 # Express + Lambda backend
│   │   └── src/baseblocks/  # Feature modules
│   ├── web/                 # React user-facing frontend
│   └── admin/               # React admin dashboard
├── shared/
│   ├── types/               # Shared TypeScript types
│   └── client-api/          # HTTP client wrapper
├── scripts/                 # Deployment & setup scripts
└── PLAN.md                  # Detailed planning document
```

## Architecture Decisions

### ADR-001: Polling over WebSocket for MVP

**Status:** Accepted

**Context:** Need real-time updates for voting status across users.

**Options Considered:**
- WebSocket via API Gateway - Instant updates, but complex setup
- Polling - Simple, works with Lambda, slight delay

**Decision:** Polling every 2 seconds

**Rationale:**
- Simpler implementation within time constraints
- Works seamlessly with Lambda (stateless)
- Acceptable delay for planning poker use case
- Can mention WebSocket as future improvement in interview

---

### ADR-002: Separate DynamoDB Tables

**Status:** Accepted

**Context:** Data model for rooms and participants.

**Options Considered:**
- Single table design - Complex queries, harder to reason about
- Separate tables - Simpler queries, clear separation

**Decision:** Separate tables for Rooms and Participants

**Rationale:**
- Easier querying patterns
- Clear data ownership
- TTL on rooms for auto-cleanup
- Follows Baseline Core patterns

---

### ADR-003: Amplify Authenticator for Auth UI

**Status:** Accepted

**Context:** Need login/signup UI for Cognito authentication.

**Options Considered:**
- Custom auth forms with Amplify Auth API - Full UX control, more code
- Amplify Authenticator component - Pre-built UI, less control

**Decision:** Use `@aws-amplify/ui-react` Authenticator component

**Rationale:**
- Follows existing Baseline Core pattern (admin app uses same approach)
- Handles all auth flows out of the box (sign in, sign up, forgot password, MFA)
- Official AWS library with Cognito integration
- Fast to implement for MVP

**Trade-offs:**
- Less control over UX (e.g., no "back" button on verification page)
- Default styling may not match custom design

---

### ADR-004: CSS Custom Properties for Dark Mode

**Status:** Accepted

**Context:** User requested dark mode support.

**Options Considered:**
- CSS-in-JS (styled-components) - Runtime theme switching, JS overhead
- CSS custom properties - Pure CSS, zero JS for colors
- Separate CSS files - No transitions, harder to maintain

**Decision:** CSS custom properties with `data-theme` attribute

**Rationale:**
- Zero JavaScript for color switching (pure CSS)
- Smooth transitions with CSS transition property
- Theme persists via localStorage
- Works with existing SCSS setup

---

### ADR-005: User Authentication Required

**Status:** Accepted

**Context:** Whether to allow anonymous users.

**Options Considered:**
- Anonymous with display names - Simpler UX, no auth needed
- Cognito auth required - Consistent identity, can track history

**Decision:** Require Cognito authentication

**Rationale:**
- Leverages existing Baseline Core auth
- Consistent user identity across sessions
- Demonstrates full-stack auth capability
- Prevents abuse (random room creation)

## Code Standards

### TypeScript

- Explicit return types on exported functions
- Interface over type for object shapes
- No `any` - use `unknown` with type guards if needed

### Backend (BaseBlock Pattern)

Each feature module contains:
```
src/baseblocks/{feature}/
├── {feature}-api.ts          # Express routes
├── {feature}.service.ts      # Business logic + DynamoDB
├── {feature}.ts              # Data mapping
├── {feature}-dynamodb.yml    # Table definition
└── {feature}-functions.yml   # Lambda function definition
```

### Frontend

- Functional components with hooks
- Co-located styles (CSS Modules or SCSS)
- Custom hooks for data fetching (`useRoom`, `usePolling`)

### Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `VoteCard.tsx` |
| Hooks | camelCase, `use` prefix | `useRoom.ts` |
| Services | camelCase | `roomService.ts` |
| Types | PascalCase | `RoomState` |

## API Endpoints

### Rooms
```
POST   /api/rooms              # Create room
GET    /api/rooms/:code        # Get room state (polling)
DELETE /api/rooms/:code        # Delete room (host only)
```

### Participants
```
POST   /api/rooms/:code/join   # Join room
DELETE /api/rooms/:code/leave  # Leave room
```

### Voting
```
POST   /api/rooms/:code/topic  # Set topic (host only)
POST   /api/rooms/:code/vote   # Submit vote
POST   /api/rooms/:code/reveal # Reveal votes (host only)
POST   /api/rooms/:code/reset  # Reset votes (host only)
```

### Admin Room Management
```
GET    /api/admin/rooms             # List all rooms (admin only)
GET    /api/admin/rooms/:code       # Get room details with participants
DELETE /api/admin/rooms/:code       # Delete room and participants
```

## Database Design

### Table: Rooms
```
Partition Key: roomCode (String)

{
  roomCode: "ABC123",
  hostId: "cognito-user-id",
  topic: "User login feature",
  revealed: false,
  createdAt: 1706600000,
  expiresAt: 1706686400  // TTL: 24h
}
```

### Table: Participants
```
Partition Key: roomCode (String)
Sort Key: odv (String)

{
  roomCode: "ABC123",
  odv: "cognito-user-id",
  displayName: "Yogy",
  vote: 5,
  joinedAt: 1706600000
}
```

## Quality Gates

Before any code is considered complete:

**Correctness**
- [ ] Meets functional requirements
- [ ] Edge cases handled
- [ ] Error states graceful

**Code Quality**
- [ ] TypeScript types explicit
- [ ] Follows baseblock patterns
- [ ] No unnecessary complexity

**User Experience**
- [ ] Loading states present
- [ ] Responsive design
- [ ] Host controls clearly marked

## AI-Assisted Development

### Decision Framework

```
1. UNDERSTAND  → What problem are we solving?
2. EXPLORE     → What patterns exist in the codebase?
3. PROPOSE     → What approach fits best?
4. VALIDATE    → Does this align with ADRs?
5. IMPLEMENT   → Write code following patterns
6. VERIFY      → Does it meet quality gates?
```

### Guiding Principles

| Principle | Description |
|-----------|-------------|
| **Verify First** | Read existing code before proposing changes |
| **Challenge Assumptions** | Consider alternatives before implementing |
| **Document Decisions** | Every architectural choice has rationale |
| **Incremental Delivery** | Small, testable changes over large rewrites |

## Development Workflow

1. **Develop** - `pnpm run start:web` + `pnpm run start:admin` (connects to AWS staging)
2. **Lint** - `pnpm run lint`
3. **Build** - `pnpm run build`
4. **Deploy** - `pnpm run deploy:staging`

### Commit Guidelines

- Atomic commits with clear messages
- Imperative mood: "Add room creation" not "Added room creation"
- No giant commits - break into logical steps

## Resources

- [Baseline Core Docs](https://github.com/Baseline-JS/core)
- [AWS DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
