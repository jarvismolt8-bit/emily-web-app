# 058 - Add Table Filter in Cashflow Tab

## Overview
Add date range filter functionality to the cashflow tab in the web app.

## Requirements
- Add date filter options:
  - This month (default)
  - Last month
  - Date range (custom start to end)

## Implementation

### Files Modified

1. **Frontend - FilterBar.tsx**
   - Added date range dropdown with 3 options
   - Added DatePicker components for custom date range
   - Added local timezone handling to prevent date shifting

2. **Frontend - App.tsx**
   - Added date range state management
   - Added `getDefaultDateRange()` function
   - Pass startDate/endDate to API calls

### Technical Details

#### Date Calculation (Fixed)
The original implementation used `toISOString()` which converts to UTC and causes date shifting. Fixed by using local date formatting:

```typescript
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

#### Filter Options
- **This month**: First day of current month → Last day of current month
- **Last month**: First day of last month → Last day of last month
- **Date range**: User selects custom start and end dates

### Backend
The backend already supported date filtering via `startDate` and `endDate` query parameters - no backend changes needed.

## Usage
1. Open Cashflow tab in web app
2. Use the date range dropdown to select filter option
3. For "Date range", pick start and end dates
4. Table filters automatically

## Emily/Telegram Integration
Emily can filter cashflow via Telegram using the existing filter API:
```bash
curl -X POST "http://localhost:3001/api/v1/cashflow/filter" \
  -H "Content-Type: application/json" \
  -H "X-Password: 10716255" \
  -d '{"category": "All", "currency": "All", "startDate": "2026-03-01", "endDate": "2026-03-31"}'
```

## Status
- [x] Implemented
- [x] Tested
- [x] Deployed

## Notes
- Default filter is "This month" to show current month's transactions
- Date filtering works alongside category, currency, and search filters
- Fixed UTC date shifting issue on 2026-03-04

---

*Created: 2026-03-04*
*Task ID: 058*