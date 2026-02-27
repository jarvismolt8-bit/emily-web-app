# Task 038: add ssd to cashflow

**Created:** Feb 26 2026  
**Updated:** Feb 26 2026

## Plan Notes
- When user requests Emily to add/update/delete an expense or earning in cashflow, they need to manually refresh the cashflow tab
- Apply SSE (Server-Sent Events) so that whenever there's a change, it will update directly
- Similar to how it works for tasks

## Development Notes

### Analysis
- SSE infrastructure was already implemented:
  - Backend: `/api/v1/events` endpoint exists
  - Frontend: `useRealtimeCashflow` hook exists
  - Event emission was only triggered for non-web_app sources

### Fix Applied
- Modified `/var/www/cashflow-manager/backend/repositories/cashflow.repository.js`
- Removed condition `if (source !== 'web_app')` for all create/update/delete operations
- Now events are emitted for ALL sources:
  - Emily (telegram) adds cashflow → web app updates in real-time
  - Web app adds cashflow → other browsers also update in real-time
- Restarted backend server to apply changes

### How It Works
1. Emily calls API with `X-Source: telegram`
2. Backend creates/updates/deletes entry
3. EventBus emits `cashflow:created/updated/deleted`
4. SSE broadcasts to all connected clients
5. Frontend `useSSE` hook receives event
6. State updates automatically without refresh

### Key Files
- **Backend Repository**: `/var/www/cashflow-manager/backend/repositories/cashflow.repository.js`
- **Backend SSE**: `/var/www/cashflow-manager/backend/server.js` (lines 390-435)
- **Frontend Hook**: `/var/www/cashflow-manager/frontend/src/hooks/useSSE.ts`
- **Frontend Realtime**: `/var/www/cashflow-manager/frontend/src/hooks/useRealtimeData.ts`

## Progress Notes
- Feb 26 2026 10:57am: Analyzed existing SSE implementation
- Feb 26 2026 10:58am: Found that events only emit for non-web_app sources
- Feb 26 2026 10:59am: Modified cashflow.repository.js to emit events for all sources
- Feb 26 2026 11:00am: Restarted backend server
- Feb 26 2026 11:00am: Tested API - SSE should now work for cashflow
- Feb 26 2026 11:05am: Fixed documentation lookup - API now finds MD files by task ID prefix
