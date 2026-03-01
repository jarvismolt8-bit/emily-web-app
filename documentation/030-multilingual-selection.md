# Task #030: Add Multilingual Selection for Find Your Seat App

## Overview
Add language selection dropdown with flag icons to the Find Your Seat web app. Users can select their preferred language and the AI will respond in that language.

## Requirements
- Language dropdown with flag icons (🇺🇸 English, 🇵🇭 Tagalog, 🇫🇷 French)
- Persist selection to localStorage
- Pass language to backend for AI context

## Status
- **Created**: 2026-02-27
- **Status**: ✅ Completed
- **Completed**: 2026-02-27

## Implementation Details

### Frontend Changes
1. **App.tsx**: Lift language state to parent, pass to components
2. **LandingPage.tsx**: Add language dropdown UI in header
3. **ChatPage.tsx**: Accept language prop, send to API
4. **i18n/translations.ts**: Create translations file (NEW)

### Backend Changes
1. **server.js**: Accept language parameter in chat API
2. Language instruction added to system prompt
3. Greeting prefix added based on selected language

## Files Modified
- `/var/www/find-your-seat/frontend/src/App.tsx`
- `/var/www/find-your-seat/frontend/src/components/LandingPage.tsx`
- `/var/www/find-your-seat/frontend/src/components/ChatPage.tsx`
- `/var/www/find-your-seat/frontend/src/api/chat.ts`
- `/var/www/find-your-seat/frontend/src/i18n/translations.ts` (NEW)
- `/var/www/find-your-seat/backend/server.js`

## Technical Notes
- Languages stored in localStorage for persistence
- Default language: English
- Language sent with session creation for AI context
- Language instructions added to system prompt for AI context

## Related
- Task: #030
- Project: Find Your Seat App
