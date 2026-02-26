# Task Status Filter - Implementation Plan

## Overview

Add a toggle button filter to the Task Table view that allows users to filter tasks by status (backlog, in_progress, done) using server-side filtering.

## Requirements

1. **UI**: Toggle button group for status filtering (Table view only)
2. **Filter Options**: All, Backlog, In Progress, Done
3. **Default Behavior**: Show all tasks (no filter applied)
4. **Implementation**: Server-side filtering for scalability
5. **Multi-select**: Support filtering by multiple statuses

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  TaskTable     │────▶│  Tasks API        │────▶│  SQLite Repository   │
│  (Frontend)    │     │  (Backend)        │     │  (Filter by status) │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
        │                       │                          │
   Toggle buttons        ?status=backlog           WHERE status IN (...)
   filter UI             &status=in_progress
```

## Implementation Steps

### Step 1: Backend - Update Repository

**File**: `/var/www/cashflow-manager/backend/repositories/tasks.repository.js`

**Changes**:
- Add `status` parameter to `findAll` function
- Build SQL WHERE clause for status filtering
- Support comma-separated status values

**Code Changes**:
```javascript
findAll({ sortBy, sortOrder, status } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM tasks';
  const params = [];

  // Add status filter
  if (status) {
    const statusList = status.split(',').map(s => s.trim());
    const placeholders = statusList.map(() => '?').join(', ');
    sql += ` WHERE status IN (${placeholders})`;
    params.push(...statusList);
  }

  // Add sorting (existing logic)
  if (sortBy === 'id') {
    sql += ` ORDER BY CAST(id AS INTEGER) ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
  } else if (sortBy === 'date') {
    sql += ` ORDER BY CASE WHEN date = '' OR date IS NULL THEN 1 ELSE 0 END, date ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
  } else if (sortBy === 'priority') {
    sql += ` ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 1 END ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
  } else {
    sql += ` ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 1 END ASC`;
  }

  return db.prepare(sql).all(...params);
},
```

### Step 2: Backend - Update Route

**File**: `/var/www/cashflow-manager/backend/routes/v1/tasks.js`

**Changes**:
- Extract `status` query parameter
- Pass to repository

**Code Changes**:
```javascript
router.get('/', (req, res) => {
  try {
    const { sortBy, sortOrder, status } = req.query;
    const tasks = tasksRepo.findAll({ sortBy, sortOrder, status });
    sendSuccess(res, tasks);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});
```

### Step 3: Frontend - Update API

**File**: `/var/www/cashflow-manager/frontend/src/api/tasks.ts`

**Changes**:
- Add `status` to TaskFilters interface

**Code Changes**:
```typescript
interface TaskFilters {
  sortBy?: 'id' | 'date' | 'priority'
  sortOrder?: 'asc' | 'desc'
  status?: string  // comma-separated status values
}
```

### Step 4: Frontend - Update Tasks Component

**File**: `/var/www/cashflow-manager/frontend/src/components/Tasks.tsx`

**Changes**:
- Add `statusFilter` state
- Add toggle button UI (only in Table view)
- Pass status filter to API

**Code Changes**:
```tsx
// Add state
const [statusFilter, setStatusFilter] = useState<string | null>(null)

// Update fetchTasks to include status
const fetchTasks = useCallback(async () => {
  return tasksAPI.getAll({ 
    sortBy, 
    sortOrder,
    ...(statusFilter && { status: statusFilter })
  })
}, [sortBy, sortOrder, statusFilter])

// Toggle button group (add before TaskTable)
{viewMode === 'table' && (
  <div className="flex gap-1 mb-4">
    <Button
      variant={statusFilter === null ? 'default' : 'outline'}
      size="sm"
      onClick={() => setStatusFilter(null)}
    >
      All
    </Button>
    <Button
      variant={statusFilter === 'backlog' ? 'default' : 'outline'}
      size="sm"
      onClick={() => setStatusFilter('backlog')}
    >
      Backlog
    </Button>
    <Button
      variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
      size="sm"
      onClick={() => setStatusFilter('in_progress')}
    >
      In Progress
    </Button>
    <Button
      variant={statusFilter === 'done' ? 'default' : 'outline'}
      size="sm"
      onClick={() => setStatusFilter('done')}
    >
      Done
    </Button>
  </div>
)}
```

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `backend/repositories/tasks.repository.js` | Modify | Add status filter to SQL query |
| `backend/routes/v1/tasks.js` | Modify | Pass status param to repository |
| `frontend/src/api/tasks.ts` | Modify | Add status to TaskFilters |
| `frontend/src/components/Tasks.tsx` | Modify | Add toggle button filter UI |
| `documentation/TASK-STATUS-FILTER.md` | Create | This documentation |

## API Reference

### GET /api/v1/tasks

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sortBy | string | No | Sort field: `id`, `date`, `priority` |
| sortOrder | string | No | Sort order: `asc`, `desc` |
| status | string | No | Comma-separated status values: `backlog`, `in_progress`, `done` |

**Examples**:

```bash
# Get all tasks (default)
curl -X GET "http://localhost:3001/api/v1/tasks" \
  -H "X-Password: 10716255"

# Get only backlog tasks
curl -X GET "http://localhost:3001/api/v1/tasks?status=backlog" \
  -H "X-Password: 10716255"

# Get backlog and in_progress tasks
curl -X GET "http://localhost:3001/api/v1/tasks?status=backlog,in_progress" \
  -H "X-Password: 10716255"

# Get done tasks sorted by date
curl -X GET "http://localhost:3001/api/v1/tasks?status=done&sortBy=date&sortOrder=asc" \
  -H "X-Password: 10716255"
```

## Testing Checklist

- [ ] Toggle buttons appear only in Table view
- [ ] "All" button shows all tasks (default behavior)
- [ ] "Backlog" button filters to show only backlog tasks
- [ ] "In Progress" button filters to show only in_progress tasks
- [ ] "Done" button filters to show only done tasks
- [ ] Clicking a selected button again deselects it (shows all)
- [ ] Status filter persists when switching between Table/Kanban views
- [ ] Sorting works correctly with status filter applied
- [ ] API returns correct filtered results
- [ ] Loading state displays while fetching filtered results

## UI Mockup

```
┌────────────────────────────────────────────────────────────────────┐
│  [Table] [Kanban]                                [+ Add Task]    │
├────────────────────────────────────────────────────────────────────┤
│  Filter: [ All ] [ Backlog ] [ In Progress ] [ Done ]             │
├────────────────────────────────────────────────────────────────────┤
│  ID    │ Task              │ Due        │ Status      │ Priority  │
├────────┼───────────────────┼────────────┼─────────────┼───────────┤
│  043   │ Add filter...    │ Feb 26     │ [In Progress]│ Medium   │
│  042   │ Fix login bug    │ Feb 25     │ [Backlog]    │ High     │
│  041   │ Update docs      │ Feb 24     │ [Done]       │ Low      │
└────────┴───────────────────┴────────────┴─────────────┴───────────┘
```

## Implementation Notes

1. **Server-side filtering**: Filter is applied at the database level for better performance with large datasets
2. **Default behavior**: When no filter is selected (or "All" is selected), all tasks are returned
3. **View-specific**: Filter UI only appears in Table view, Kanban view retains its column-based organization
4. **Persistence**: Filter state is local only (not persisted to database)

## Future Enhancements

1. **Multi-select**: Allow selecting multiple statuses simultaneously (e.g., show both Backlog and In Progress)
2. **Persistence**: Save filter preferences to localStorage
3. **URL sync**: Sync filter state to URL query params for shareable links
4. **Quick filters**: Add keyboard shortcuts for quick filter switching
5. **Filter presets**: Allow saving commonly used filter combinations
