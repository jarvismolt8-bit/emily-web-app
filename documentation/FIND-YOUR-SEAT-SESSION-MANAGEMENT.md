# Find Your Seat - Session Management

## Overview

This document describes the session management implementation for the Find Your Seat wedding guest assistant application.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       SESSION LIFECYCLE                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User opens app ──▶ Generate new sessionId ──▶ Store in         │
│                     (fresh on load)             sessionStorage   │
│                                                                  │
│  User chats ──▶ POST /api/chat ──▶ Create/update session        │
│                                    in backend memory             │
│                                                                  │
│  User refreshes ──▶ New sessionId ──▶ Fresh session             │
│                    (old session deleted via beforeunload)        │
│                                                                  │
│  User idle 15min ──▶ Cleanup job deletes session                │
│                                                                  │
│  User hits 50 ──▶ 429 response with polite message              │
│  exchanges        to refresh                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `maxExchanges` | 50 | Maximum user-AI exchanges per session |
| `maxAge` | 15 minutes | Session inactivity timeout |
| `cleanupInterval` | 5 minutes | Background cleanup job frequency |

---

## Session Data Structure

### Backend (In-Memory)

```javascript
sessions = Map {
  "session-1739926800000-abc123": {
    history: [
      { role: "user", parts: [{ text: "..." }] },
      { role: "model", parts: [{ text: "..." }] }
    ],
    lastActivity: 1739926800000,
    exchangeCount: 5
  }
}
```

### Frontend (sessionStorage)

```javascript
sessionStorage.setItem('findYourSeatSessionId', 'session-1739926800000-abc123')
```

---

## API Endpoints

### POST /api/chat

**Request:**
```json
{
  "message": "Where is my seat?",
  "sessionId": "session-1739926800000-abc123",
  "eventName": "harrison-miller-wedding",
  "identity": "Elegant"
}
```

**Success Response (200):**
```json
{
  "reply": "Welcome! May I have your name?",
  "sessionId": "session-1739926800000-abc123",
  "tokens": { "input": 100, "output": 10, "total": 110 }
}
```

**Exchange Limit Response (429):**
```json
{
  "error": "I apologize, but I need to take a moment to assist other guests...",
  "code": "EXCHANGE_LIMIT_REACHED"
}
```

### DELETE /api/chat/:sessionId

Clears session from backend memory.

**Response:**
```json
{
  "success": true,
  "message": "Session cleared"
}
```

---

## Exchange Limit Messages

When a guest reaches 50 exchanges, one of these messages is randomly returned:

1. "I apologize, but I need to take a moment to assist other guests. Please refresh the page to continue our conversation - I'll be right here to help you!"

2. "The champagne is calling! 🥂 Please refresh the page to start a fresh conversation while I catch up with other guests."

3. "My apologies, I've gotten a bit chatty! Let's start fresh - please refresh the page and I'll be ready to assist you again."

4. "I'm being called to help with something at the welcome table. Please refresh the page to continue - I won't forget you!"

5. "How wonderful that we've had so much to discuss! Please refresh the page so I can give you my full attention again."

6. "I think I've talked your ear off! 🎉 Please refresh the page to start fresh - I'm always happy to help."

7. "The bride needs me for a moment! Please refresh the page and I'll be back at your service."

---

## Memory Estimation

| Metric | Value |
|--------|-------|
| Avg exchanges per session | 5-10 |
| Avg message size | ~200 tokens |
| Tokens per session (max) | ~10,000 (50 exchanges) |
| 100 concurrent sessions | ~1M tokens |
| Memory per token | ~4 bytes |
| **Total memory (worst case)** | **~4 MB** |

---

## Troubleshooting

### Session Not Persisting

**Symptom:** User has to re-enter name after refresh

**Expected Behavior:** Refresh creates fresh session (by design)

**If continuity needed:** User should not refresh, session persists for 15 min of inactivity

### 429 Exchange Limit Error

**Symptom:** User sees "Please refresh the page" message

**Cause:** User has sent 50+ messages in one session

**Solution:** User refreshes page to start fresh session

### Session Cleared Unexpectedly

**Possible causes:**
1. Server restarted (in-memory sessions lost)
2. 15 minutes of inactivity
3. User closed/refreshed tab

### Backend Not Receiving SessionId

**Check:**
1. Frontend generates sessionId on mount
2. sessionId included in every POST /api/chat request
3. Check browser console for errors

---

## Files Modified

| File | Purpose |
|------|---------|
| `/var/www/find-your-seat/backend/server.js` | Session management logic, cleanup job, exchange limits |
| `/var/www/find-your-seat/frontend/src/components/ChatPage.tsx` | Session lifecycle, beforeunload handler |
| `/var/www/cashflow-manager/documentation/FIND-YOUR-SEAT-SESSION-MANAGEMENT.md` | This documentation |

---

## Future Improvements

1. **Redis storage** - For persistence across server restarts (if needed for larger scale)
2. **Session analytics** - Track average exchanges, session duration
3. **Rate limiting per guest** - Prevent abuse from single IP
4. **Session restoration** - Allow users to resume after accidental refresh (within time limit)

---

## Changelog

| Date | Change |
|------|--------|
| 2025-02-23 | Initial implementation - session management with 50 exchange limit, 15 min timeout |
