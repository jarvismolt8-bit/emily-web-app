# Ticket 056 - Temporary Disable Chat Widget Connection to Emily

## Date Created
March 1, 2026

## Purpose
Temporarily disabled the cashflow web app chat widget connection to Emily to investigate why Emily was typing unexpectedly in Telegram without user interaction.

## What Was Disabled

### 1. Gateway Connection (gateway-client.js)
**File:** `/var/www/cashflow-manager/backend/gateway-client.js`

**Status:** NOT modified (kept as reference)

**Original Code (lines 733-738 in server.js):**
```javascript
gatewayClient.connect().then(() => {
  console.log('[Gateway] Connected to OpenClaw');
}).catch(err => {
  console.error('[Gateway] Failed to connect:', err.message);
  console.log('[Gateway] Will retry on first chat message');
});
```

### 2. WebSocket Chat Server (server.js)
**File:** `/var/www/cashflow-manager/backend/server.js`

**Changes Made:**

1. **Commented out WebSocket server initialization (lines 612-695):**
```javascript
// TEMPORARILY DISABLED - Chat WebSocket server disabled
/*
const wss = new WebSocket.Server({
  server,
  path: '/api/chat',
  verifyClient: (info, cb) => {
    // ... verifyClient logic
  }
});
// ... all WebSocket connection logic
*/
```

2. **Commented out gatewayClient.connect() (lines 736-742):**
```javascript
// TEMPORARILY DISABLED - Chat to Emily via OpenClaw Gateway disabled
// gatewayClient.connect().then(() => {
//   console.log('[Gateway] Connected to OpenClaw');
// }).catch(err => {
//   console.error('[Gateway] Failed to connect:', err.message);
//   console.log('[Gateway] Will retry on first chat message');
// });
```

3. **Updated server startup log (lines 744-748):**
```javascript
server.listen(PORT, () => {
  console.log(`Cashflow API running on http://localhost:${PORT}`);
  // console.log(`WebSocket chat available at ws://localhost:${PORT}/api/chat`);
  console.log(`WebSocket chat DISABLED - TEMPORARILY`);
  console.log(`SQLite database at ${process.env.DATABASE_PATH}`);
});
```

4. **Commented out handleChatCommand function (lines 696-734):**
```javascript
/*
async function handleChatCommand(ws, message, sessionKey) {
  // ... all command handling logic
}
*/
```

## Files Modified

| File | Change Type | Lines |
|------|------------|-------|
| `/var/www/cashflow-manager/backend/server.js` | Commented out | 612-695, 696-734, 736-742, 744-748 |

## How to Revert/Enable

### Step 1: Uncomment WebSocket server initialization
Remove the `/*` and `*/` comments around lines 612-695:
```javascript
const wss = new WebSocket.Server({
  server,
  path: '/api/chat',
  // ... rest of the code
});
```

### Step 2: Uncomment handleChatCommand function
Remove the `/*` and `*/` comments around lines 696-734.

### Step 3: Uncomment gatewayClient.connect()
Remove the `//` comments around lines 736-742:
```javascript
gatewayClient.connect().then(() => {
  console.log('[Gateway] Connected to OpenClaw');
}).catch(err => {
  console.error('[Gateway] Failed to connect:', err.message);
  console.log('[Gateway] Will retry on first chat message');
});
```

### Step 4: Restore server log message
Change line 746-747 from:
```javascript
// console.log(`WebSocket chat available at ws://localhost:${PORT}/api/chat`);
console.log(`WebSocket chat DISABLED - TEMPORARILY`);
```
To:
```javascript
console.log(`WebSocket chat available at ws://localhost:${PORT}/api/chat`);
```

### Step 5: Restart the backend
```bash
pm2 restart cashflow-backend
```

## Investigation Notes

### Why This Was Done
- Emily was typing in Telegram without user interaction
- Suspected the cashflow web app chat widget was connecting to Emily via WebSocket
- Cashflow backend connects to OpenClaw gateway at `ws://127.0.0.1:18789`
- This connection allows chat messages from web app to reach Emily

### What Should Still Work
- ✅ Telegram bot (Emily in Telegram DM)
- ✅ Cashflow API (tasks, cashflow, activity-logs)
- ✅ Frontend web app (without chat widget)

### What Was Disabled
- ❌ WebSocket chat at `/api/chat`
- ❌ Gateway connection from cashflow-backend to OpenClaw

## Related Files

- `/var/www/cashflow-manager/backend/server.js` - Main server file
- `/var/www/cashflow-manager/backend/gateway-client.js` - Gateway WebSocket client (not modified)
- `/var/www/cashflow-manager/frontend/src/components/ChatWidget.tsx` - Frontend chat component
- `/var/www/cashflow-manager/frontend/src/hooks/useChat.ts` - Chat hook for SSE and WebSocket

## Status
**Temporarily Disabled** - Waiting for investigation to complete
