# Task 052: Host OpenCode Web Interface in Server

## Overview

Host OpenCode as a web-accessible interface on the server with a custom-built frontend that connects to the OpenCode API.

## Current Status

✅ **COMPLETED** - Custom React frontend deployed at `https://46.225.69.45/opencode/`

## What Worked

1. **OpenCode Server** - Running on PM2 at port 4096
2. **Nginx Reverse Proxy** - SSL termination with proper routing
3. **Custom React + Vite Frontend** - Built at `/var/www/opencode-ui/`
4. **shadcn/ui Components** - Button, Textarea, Card, Avatar integrated
5. **Message Parsing** - All part types handled (text, tool_use, tool_result, reasoning, etc.)
6. **Markdown Rendering** - Using react-markdown
7. **Permission UI** - Allow Once, Allow Always, Deny buttons
8. **Mode Selector** - Chat/Plan/Build buttons
9. **API Token Auth** - Working via nginx

## Issues Encountered & Solutions

| Issue | Solution |
|-------|----------|
| Mobile Safari scrolling (100dvh changes when toolbar hides) | Use `100dvh` + `-webkit-fill-available` fallback |
| Message bubbles touching screen edge on mobile | Add `px-2 sm:px-0` margin to MessageBubble |
| 401 Unauthorized on static files | Remove auth from `/opencode/` location - only API needs auth |
| Assets returning 404 | Set `base: '/opencode/'` in vite.config.ts to generate correct paths |
| Header scrolling away on mobile | Add `flex-shrink-0` to header element |
| AI thinking text showing italic | Remove `italic` class from MessageContent component |
| Syntax error in Chat.tsx | Fixed corrupted code `isLoadingsm"` |

## Recommendations for Future Projects

1. **Mobile-first testing**: Test on actual iPhone Safari early in development
2. **Vite base path**: Always set `base` in vite.config.ts when deploying to subdirectory
3. **Separate auth**: Only put authentication on API routes, not static files
4. **Use dvh + fallback**: `h-[100dvh]` with `style={{ minHeight: '-webkit-fill-available' }}`
5. **Avoid sticky on mobile**: Use `flex-shrink-0` for fixed headers instead of sticky positioning
6. **Check nginx locations first**: When assets 404, verify location paths match build output

## Requirements

- **URL**: `https://46.225.69.45/opencode/`
- **Authentication**: Token-based via query parameter
- **Interface**: Custom React web UI
- **Reliability**: PM2 for process management

## Technical Implementation

### 1. OpenCode Server

- **Command**: `opencode serve --port 4096 --hostname 127.0.0.1`
- **Port**: 4096 (localhost only)
- **Manager**: PM2 for auto-restart and reliability
- **Authentication**: Basic Auth (username: `opencode`, password: from env)

### 2. Nginx Reverse Proxy

- **Listen**: HTTPS (port 443) - existing SSL certificates
- **Path**: `/opencode/` → Custom React frontend
- **API Path**: `/opencode/api/` → OpenCode serve API
- **Auth**: Token validation via query parameter

### 3. Custom Frontend (To Build)

- **Framework**: React + Vite
- **API Client**: `@opencode-ai/sdk` or raw fetch
- **Features**:
  - Session management (list, create, delete)
  - Chat interface with real-time streaming (SSE)
  - Model/agent selection
  - Tool execution display

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (443)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nginx Proxy                            │
│  /opencode/         → Custom React Frontend (port 5173)    │
│  /opencode/api/     → OpenCode Serve API (localhost:4096)  │
│  Token validation via ?token= query param                  │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐
│  React Frontend    │    │  OpenCode Serve     │
│  (Vite dev/build)  │    │  (localhost:4096)   │
└─────────────────────┘    └─────────────────────┘
```

## OpenCode API Reference

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/global/health` | GET | Server health check |
| `/session` | GET | List all sessions |
| `/session` | POST | Create new session |
| `/session/:id/message` | POST | Send message (prompt) |
| `/event` | GET | SSE for real-time updates |
| `/provider` | GET | List available models |
| `/agent` | GET | List available agents |
| `/file/content` | GET | Read file content |

### Authentication

- **Method**: Basic Auth
- **Header**: `Authorization: Basic base64(opencode:PASSWORD)`
- **Alternative**: Via nginx proxy (token in query param)

### SDK Usage

```javascript
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096"
})

// Send a message
const result = await client.session.prompt({
  path: { id: sessionId },
  body: {
    parts: [{ type: "text", text: "Hello!" }]
  }
})
```

## Final Configuration

- **Frontend URL**: `https://46.225.69.45/opencode/`
- **API URL**: `https://46.225.69.45/opencode/api/`
- **Token**: `OPENCODE_SERVER_PASSWORD`
- **PM2**: Auto-restart enabled, state saved

## Files Created/Modified

### New Files
- `/var/www/opencode-ui/` - React frontend project (Vite + React + TypeScript)
- `/var/www/opencode-ui/src/components/Chat.tsx` - Main chat component
- `/var/www/opencode-ui/src/components/SessionList.tsx` - Session list component
- `/var/www/opencode-ui/src/services/api.ts` - OpenCode API client
- `/var/www/opencode-ui/src/components/ui/` - shadcn/ui components
- `/root/.openclaw/workspace/skills/pm2-skill/SKILL.md` - PM2 management skill for Emily

### Modified Files
- `/etc/nginx/sites-available/cashflow-manager.conf` - Added `/opencode/` and `/opencode/api/` routes

## Known Issues with Built-in Web UI (Why We Built Custom)

The OpenCode built-in web UI (`opencode web` / `opencode serve`) has known bugs:
- #10226: Serves stale frontend from CDN
- #6557: Black screen with MIME type errors
- #4402: Gets stuck at "thinking" indefinitely
- agent.filter is not a function error
