# 060 - Filter Web App from Telegram

**Updated:** Mar 03 2026

## Problem

When user asks Emily (on Telegram) to filter the cashflow table or task list, Emily was only showing the filtered results in Telegram instead of updating the web app's table.

## Solution

Implemented a filter sync system that allows Emily to send filter commands from Telegram to update the web app in real-time.

### Architecture

```
Emily (Telegram)
       ↓
POST /api/v1/cashflow/filter or /api/v1/tasks/filter
       ↓
Backend: Store filter (keyed by session)
       ↓
SSE event: filter:changed
       ↓
Web App: Receive SSE → Update filter → Auto-refresh
```

## Changes Made

### Backend

1. **server.js**
   - Added in-memory `filterStore` Map
   - Added SSE event emitters for `cashflow:filter` and `task:filter`

2. **routes/v1/cashflow.js**
   - Added `POST /filter` - Store cashflow filter
   - Added `DELETE /filter` - Clear cashflow filter

3. **routes/v1/tasks.js**
   - Added `POST /filter` - Store task filter
   - Added `DELETE /filter` - Clear task filter

### Frontend

1. **hooks/useRealtimeData.ts**
   - Added `onFilter` callback parameter
   - Added SSE event listeners for `cashflow:filter` and `task:filter`
   - When filter event received, triggers callback to update filter state

2. **App.tsx**
   - Added `handleCashflowFilter` callback to receive filter from SSE
   - Passes callback to `useRealtimeCashflow`

3. **components/Tasks.tsx**
   - Added `handleTaskFilter` callback
   - Added `priorityFilter` and `searchFilter` states
   - Passes callback to `useRealtimeTasks`

4. **api/tasks.ts**
   - Added `priority` and `search` to TaskFilters interface

### Skills

1. **cashflow-skill/SKILL.md**
   - Added "Filter Web App Table from Telegram" section
   - Documented API usage for set/clear filters

2. **task-skill/SKILL.md**
   - Added "Filter Web App Tasks from Telegram" section
   - Documented API usage for set/clear filters

## API Usage

### Set Filter (from Telegram)

```bash
# Cashflow filter
curl -X POST "http://localhost:3001/api/v1/cashflow/filter" \
  -H "Content-Type: application/json" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram" \
  -d '{"category":"Food","currency":"All","search":""}'

# Task filter
curl -X POST "http://localhost:3001/api/v1/tasks/filter" \
  -H "Content-Type: application/json" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram" \
  -d '{"status":"done","priority":"high","search":""}'
```

### Clear Filter

```bash
curl -X DELETE "http://localhost:3001/api/v1/cashflow/filter" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram"

curl -X DELETE "http://localhost:3001/api/v1/tasks/filter" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram"
```

## Behavior

- **User says "filter the web app"** → Emily calls filter API → Web app updates automatically → Emily confirms
- **Otherwise** → Emily shows filtered results in Telegram only

## Files Modified

| File | Change |
|------|--------|
| `backend/server.js` | Added filter store and SSE emitters |
| `backend/routes/v1/cashflow.js` | Added POST/DELETE /filter routes |
| `backend/routes/v1/tasks.js` | Added POST/DELETE /filter routes |
| `frontend/src/hooks/useRealtimeData.ts` | Added filter event handling |
| `frontend/src/App.tsx` | Added cashflow filter callback |
| `frontend/src/components/Tasks.tsx` | Added task filter callback |
| `frontend/src/api/tasks.ts` | Added priority/search to filters |
| `skills/cashflow-skill/SKILL.md` | Added filter documentation |
| `skills/task-skill/SKILL.md` | Added filter documentation |
