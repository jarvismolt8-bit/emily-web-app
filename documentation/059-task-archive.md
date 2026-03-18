# Task 059: Task Archive
**Created:** Mar 13 2026 | **Updated:** Mar 13 2026

## Plan Notes
- **Objective:** Add an Archive column to the Kanban board with a 30-day auto-deletion policy, visibility toggle, and horizontal scroll layout.
- **Scope:** New `archive` status; `archived_at` DB field; `node-cron` cleanup job in `server.js`; Archive column in Kanban; status filter in Table view; `archive` option in TaskModal.
- **Phases:** DB Migration → Backend Repository → Cleanup Job → Frontend Types & Modal & Table → Kanban Board
- **Complexity:** Medium
- **Git Branch:** `task/059-task-archive`

## Development Notes

### Affected Files
| Area | File | Change Type |
|------|------|-------------|
| DB | `backend/db/index.js` | Modify — add idempotent `archived_at` column migration |
| DB | `backend/db/schema.sql` | Modify — add `archived_at TEXT NULL` to tasks table definition |
| Repository | `backend/repositories/tasks.repository.js` | Modify — handle `archived_at` in `update()`, add `deleteExpiredArchived()` |
| Backend | `backend/server.js` | Modify — add `node-cron` daily cleanup job |
| Frontend | `frontend/src/components/TaskKanban.tsx` | Modify — add Archive column, horizontal scroll layout, settings gear |
| Frontend | `frontend/src/components/Tasks.tsx` | Modify — update TaskStatus type, pass showArchive state, suppress confetti on archive |
| Frontend | `frontend/src/components/TaskModal.tsx` | Modify — add `archive` to STATUSES and STATUS_LABELS |
| Frontend | `frontend/src/components/TaskTable.tsx` | Modify — add `archive` to STATUS_CONFIG and status filter cycle |

### Schema Changes
```sql
-- Add to tasks table (idempotent migration, run on DB init):
ALTER TABLE tasks ADD COLUMN archived_at TEXT NULL;

-- schema.sql updated tasks CREATE TABLE definition:
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  description TEXT DEFAULT '',
  archived_at TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### API Contract Changes
No new endpoints. Existing `PUT /api/v1/tasks/:id` behavior extends:
- When `status` is set to `"archive"`: backend sets `archived_at = datetime('now')` automatically
- When `status` changes away from `"archive"`: backend clears `archived_at = null` automatically
- `archived_at` field included in all task responses (null for non-archived tasks)

`GET /api/v1/tasks` — no changes; archive tasks returned as normal records with `status: "archive"`.

### Security Considerations
- **Input validation:** `status` field in `PUT /api/v1/tasks/:id` accepts `archive` as a valid value — no additional validation needed beyond existing pattern; the whitelist in the repository controls which fields are writable.
- **Authentication:** No change — all existing auth methods (JWT, API key, legacy password) apply equally.
- **Data exposure:** `archived_at` is non-sensitive metadata; safe to return in all task responses.
- **Attack surface:** Cleanup job is internal (no HTTP endpoint); no new attack surface introduced.

## Implementation Details
**Status:** Draft | **Author:** Architect (/architect)

### Overview
The archive system adds a 4th Kanban status (`archive`) with a dedicated column positioned right of Done. Moving a task to archive sets `archived_at`; restoring it clears `archived_at`. A `node-cron` daily job inside `server.js` deletes tasks where `status = 'archive'` and `archived_at` is older than 30 days. The Kanban layout shifts from CSS grid to a horizontally scrollable flex container. A settings gear in the Kanban header toggles archive column visibility using shadcn `DropdownMenu` + `Switch`. All archive tasks remain visible and filterable in table view.

### Out of Scope
- Displaying "Will be deleted in X days" countdown on task cards — spec doesn't require it
- Bulk archive operations — not in spec
- Archive visibility preference persisted to backend/localStorage — in-memory toggle only
- Mobile drag-and-drop overhaul — existing `PointerSensor` handles touch; no deep rework
- Adding `archive` filter to the Telegram/Emily skill — separate concern
- `TaskTable.tsx` showing `archived_at` date in a column — not in spec

### Dependencies
- `node-cron` package — must be installed in backend (`npm install node-cron`)
- All shadcn/ui components required (`DropdownMenu`, `Switch`) are already installed

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `ALTER TABLE` fails on existing DB if column already exists | Low | High | Use `PRAGMA table_info(tasks)` check before running ALTER; idempotent |
| Tasks with `status='archive'` and `archived_at=NULL` (data inconsistency) | Low | Medium | Migration backfills: `UPDATE tasks SET archived_at = datetime('now') WHERE status = 'archive' AND archived_at IS NULL` |
| Kanban layout breaks DnD after grid→flex change | Medium | Medium | Test drag across all 4 columns after layout change; each column needs `min-w-[280px]` |
| `node-cron` silent failure (job doesn't run) | Low | Medium | Log job execution and any errors to console; PM2 captures stdout |
| Confetti triggered when dragging to archive via `handleStatusChange` | Low | Low | Add guard: `if (newStatus === 'done') triggerCelebration()` — `archive` won't match |
| TypeScript `TaskStatus` union mismatch across 3 files | Medium | Medium | Update all 3 files in one commit; confirm TS build passes before deploy |

### Alternatives Considered
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Separate `archived` boolean field instead of `archive` status | Clean separation | Breaks existing status-based filtering; two fields for state | Rejected |
| Separate PM2 worker script for cleanup | Isolated, restarts independently | Adds operational complexity; daily cron in server.js is sufficient | Rejected |
| `node-schedule` instead of `node-cron` | More flexible scheduling | Heavier API; cron syntax is sufficient for daily job | Rejected |
| `ScrollArea` (shadcn) for Kanban scroll | Styled scrollbar | Doesn't work well with DnD hit areas; native overflow is safer | Rejected |

---

### Phase 1: Database Migration
**Goal:** Add `archived_at TEXT NULL` column to the tasks table idempotently on server startup.

**Files:**
- `backend/db/index.js` — add column existence check + ALTER TABLE after DB open
- `backend/db/schema.sql` — update CREATE TABLE definition for new databases

**Steps:**
1. In `schema.sql`, add `archived_at TEXT NULL` to the `CREATE TABLE IF NOT EXISTS tasks` definition (after `priority` field).
2. In `db/index.js`, after the DB is opened and pragmas are set, add an inline migration:
   ```js
   // Check if archived_at column exists; add if missing
   const cols = db.pragma('table_info(tasks)');
   const hasArchivedAt = cols.some(c => c.name === 'archived_at');
   if (!hasArchivedAt) {
     db.exec('ALTER TABLE tasks ADD COLUMN archived_at TEXT NULL');
     // Backfill any tasks already in archive status
     db.exec("UPDATE tasks SET archived_at = datetime('now') WHERE status = 'archive' AND archived_at IS NULL");
   }
   ```
3. Validate: `node -c backend/db/index.js` — confirm no syntax errors.
4. Restart backend and verify column exists: `node -e "const {getDb}=require('./backend/db'); const db=getDb(); console.log(db.pragma('table_info(tasks)'))"` from `/var/www/cashflow-manager`.

**Risk:** Low — SQLite ALTER TABLE ADD COLUMN is safe and the PRAGMA check makes it idempotent.

**Rollback:** SQLite doesn't support DROP COLUMN in older versions. If rollback needed, restore DB from backup before server restart. The column being NULL-only means no data corruption if left in place.

**Exit Criteria:**
- [ ] `PRAGMA table_info(tasks)` shows `archived_at` column in both staging and production DBs
- [ ] Server restarts cleanly with no errors: `node -c backend/db/index.js && pm2 restart cashflow-staging`
- [ ] Tasks created before migration have `archived_at = null`
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 2: Backend Repository
**Goal:** Extend `tasks.repository.js` to auto-manage `archived_at` on status changes and expose a cleanup method.

**Files:**
- `backend/repositories/tasks.repository.js` — extend `update()` and add `deleteExpiredArchived()`

**Steps:**
1. In `update()`, add `archived_at` handling after the existing field iteration loop. The field should NOT be in the whitelist array (it's set automatically, never from user input directly):
   ```js
   // After the whitelist loop, before pushing updated_at:
   if (data.status === 'archive' && existing.status !== 'archive') {
     fields.push("archived_at = datetime('now')");
   } else if (data.status !== undefined && data.status !== 'archive' && existing.status === 'archive') {
     fields.push("archived_at = NULL");
   }
   ```
2. Add a new `deleteExpiredArchived()` method to `tasksRepo`:
   ```js
   deleteExpiredArchived() {
     const db = getDb();
     const result = db.prepare(
       "DELETE FROM tasks WHERE status = 'archive' AND archived_at IS NOT NULL AND archived_at <= datetime('now', '-30 days')"
     ).run();
     return result.changes; // number of deleted tasks
   }
   ```
3. Ensure `findAll()` returns `archived_at` in results — no change needed since `SELECT *` already covers it.
4. Validate: `node -c backend/repositories/tasks.repository.js`

**Risk:** Low — existing update flow is unchanged; new logic only fires on archive status transitions.

**Rollback:** Revert `tasks.repository.js` to previous version. `archived_at` column remains in DB harmlessly.

**Exit Criteria:**
- [ ] `PUT /api/v1/tasks/:id` with `{"status":"archive"}` → response includes `archived_at` timestamp
- [ ] `PUT /api/v1/tasks/:id` with `{"status":"backlog"}` on an archived task → response has `archived_at: null`
- [ ] `deleteExpiredArchived()` called manually deletes only tasks with `archived_at` > 30 days old
- [ ] No regressions in existing create/update/delete operations
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 3: Cleanup Job (node-cron)
**Goal:** Install `node-cron` and schedule daily deletion of tasks archived more than 30 days ago.

**Files:**
- `backend/server.js` — add cron job after server initialization
- `backend/package.json` — `node-cron` added via npm install

**Steps:**
1. Install: `cd /var/www/cashflow-manager/backend && npm install node-cron`
2. In `server.js`, add at the top with other requires:
   ```js
   const cron = require('node-cron');
   const tasksRepo = require('./repositories/tasks.repository');
   ```
   (If `tasksRepo` is already required elsewhere in `server.js`, don't duplicate.)
3. After the server starts listening, register the cron job:
   ```js
   // Daily cleanup: delete tasks archived > 30 days ago
   cron.schedule('0 0 * * *', () => {
     try {
       const deleted = tasksRepo.deleteExpiredArchived();
       if (deleted > 0) {
         console.log(`[cron] Deleted ${deleted} expired archived task(s)`);
       }
     } catch (err) {
       console.error('[cron] Archive cleanup failed:', err.message);
     }
   });
   ```
4. Validate: `node -c backend/server.js`
5. Restart: `pm2 restart cashflow-staging` and verify no startup errors.

**Risk:** Low — cron runs in-process; failure is caught and logged. Daily schedule means at most 1 day of stale data if job misses a run.

**Rollback:** Remove the `cron.schedule` block and the `require('node-cron')` line. Expired archived tasks accumulate but no data is lost.

**Exit Criteria:**
- [ ] `npm install node-cron` completes without errors
- [ ] Server starts cleanly; PM2 logs show no cron-related errors
- [ ] `node-cron` appears in `backend/package.json` dependencies
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 4: Frontend — Types, TaskModal, TaskTable
**Goal:** Propagate the new `archive` status across TypeScript types, the edit modal's status dropdown, and the table view's status filter.

**Files:**
- `frontend/src/components/TaskModal.tsx` — add `archive` to `STATUSES` and `STATUS_LABELS`
- `frontend/src/components/TaskTable.tsx` — add `archive` to `STATUS_CONFIG` and filter cycle
- `frontend/src/components/Tasks.tsx` — add `archive` to `TaskStatus` union type
- `frontend/src/components/TaskKanban.tsx` — add `archive` to `TaskStatus` union type (done in Phase 5)

**Steps:**

**TaskModal.tsx:**
1. Update `STATUSES` array: `['backlog', 'in_progress', 'done', 'archive']`
2. Update `STATUS_LABELS`: add `'archive': 'Archive'`

**TaskTable.tsx:**
1. Update `STATUS_CONFIG`: add `'archive': { label: 'Archive', variant: 'outline' }` (or a distinct visual like a muted/gray badge)
2. Update `Task` interface: `status: 'backlog' | 'in_progress' | 'done' | 'archive'`
3. Update `handleStatusFilter` cycle in the status column header:
   ```ts
   // Extend cycle: null → backlog → in_progress → done → archive → null
   } else if (statusFilter === 'done') {
     onStatusFilter('archive')
   } else {
     onStatusFilter(null)
   }
   ```
4. Update the `STATUS_ORDER` constant: `['backlog', 'in_progress', 'done', 'archive']`

**Tasks.tsx:**
1. Update `TaskStatus` type: `type TaskStatus = 'backlog' | 'in_progress' | 'done' | 'archive'`
2. Update `Task` interface `status` field to use `TaskStatus`
3. In `handleStatusChange`: confirm the existing guard `if (newStatus === 'done') triggerCelebration()` — `archive` won't trigger confetti (no change needed, just verify)

**Steps:**
5. Run `npm run build` in `frontend/` to confirm no TypeScript errors.

**Risk:** Low — additive changes only; existing status values are unchanged.

**Rollback:** Revert the three frontend files. No backend changes in this phase.

**Exit Criteria:**
- [ ] TaskModal status dropdown shows "Archive" as a selectable option
- [ ] Table view status filter cycles through archive when clicking the Status column header
- [ ] Tasks with `status: 'archive'` display correctly in the table with the Archive badge
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 5: Kanban Board — Archive Column, Scroll, Settings Gear
**Goal:** Add the Archive column with visibility toggle, convert the board to horizontal scroll, and ensure drag-and-drop works across all 4 columns.

**Files:**
- `frontend/src/components/TaskKanban.tsx` — full rework of layout + new column + settings UI

**Steps:**

1. **Update `TaskStatus` union:**
   ```ts
   type TaskStatus = 'backlog' | 'in_progress' | 'done' | 'archive'
   ```

2. **Update `COLUMNS` array** (add Archive as 4th entry):
   ```ts
   const COLUMNS: Column[] = [
     { id: 'backlog', title: 'Backlog' },
     { id: 'in_progress', title: 'In Progress' },
     { id: 'done', title: 'Done' },
     { id: 'archive', title: 'Archive' },
   ]
   ```

3. **Add `showArchive` state** inside `TaskKanban` component:
   ```ts
   const [showArchive, setShowArchive] = useState(true)
   ```

4. **Filter columns based on `showArchive`:**
   ```ts
   const visibleColumns = showArchive ? COLUMNS : COLUMNS.filter(c => c.id !== 'archive')
   const columnsWithTasks = visibleColumns.map(column => ({
     ...column,
     tasks: localTasks.filter(task => task.status === column.id)
   }))
   ```
   Note: tasks filtered out of Kanban view when archive is hidden still exist in `localTasks` — they are simply not rendered. The DnD context should only use `visibleColumns` for droppable targets.

5. **Change board layout from grid to flex horizontal scroll:**
   Replace:
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
   ```
   With:
   ```tsx
   <div className="flex gap-4 overflow-x-auto pb-2">
   ```
   And in `BoardColumn`, set a fixed minimum width:
   ```tsx
   <div
     ref={setNodeRef}
     className={`border rounded-lg p-4 bg-muted/30 min-h-[400px] min-w-[280px] flex-shrink-0 transition-colors ${isOver ? 'ring-2 ring-primary bg-muted/50' : ''}`}
   >
   ```

6. **Add Settings gear with archive visibility toggle** — in the `TaskKanban` component, the settings gear lives in a header bar above the board. Add a wrapping `div` around the `DndContext`:
   ```tsx
   import { Settings } from 'lucide-react'
   import {
     DropdownMenu,
     DropdownMenuContent,
     DropdownMenuTrigger,
   } from '@/components/ui/dropdown-menu'
   import { Switch } from '@/components/ui/switch'
   import { Label } from '@/components/ui/label'

   // In render, wrap the DndContext:
   <div>
     <div className="flex justify-end mb-3">
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button variant="outline" size="sm">
             <Settings className="h-4 w-4" />
           </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-52">
           <div className="flex items-center justify-between px-2 py-2">
             <Label htmlFor="show-archive" className="text-sm cursor-pointer">Show Archive Column</Label>
             <Switch
               id="show-archive"
               checked={showArchive}
               onCheckedChange={setShowArchive}
             />
           </div>
         </DropdownMenuContent>
       </DropdownMenu>
     </div>
     <DndContext ...>
       ...
     </DndContext>
   </div>
   ```

   **Important:** The Settings gear in `Tasks.tsx` currently shows an "Add Task" button. Per spec, the gear goes beside the Add Task button. The gear lives *inside* `TaskKanban` (only visible in Kanban mode) — no change to `Tasks.tsx` header required.

7. **Run build:** `cd /var/www/cashflow-manager/frontend && npm run build`
8. **Restart backend (no backend changes in this phase):** Verify frontend build artifacts are served by Nginx.

**Risk:** Medium — layout change from grid to flex affects DnD hit areas. The `pointerWithin` collision detector and `useDroppable` on each column should work correctly with flex layout, but requires manual drag testing across all column pairs.

**Rollback:** Revert `TaskKanban.tsx` to previous version. No DB or backend impact.

**Exit Criteria:**
- [ ] Archive column appears to the right of Done by default
- [ ] Dragging a task into Archive column → `PUT /api/v1/tasks/:id` called with `status: "archive"` → `archived_at` set
- [ ] Dragging a task out of Archive → `archived_at` cleared (null in API response)
- [ ] Settings gear opens dropdown with "Show Archive Column" toggle
- [ ] Toggling archive off hides the column; archived tasks remain in DB
- [ ] Board scrolls horizontally when 4 columns overflow the viewport
- [ ] Drag-and-drop works across all 4 columns
- [ ] No regressions on existing Backlog / In Progress / Done drag behavior
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Testing Strategy
- **Unit:** Isolate `tasksRepo.deleteExpiredArchived()` — call directly with known DB state; verify only tasks with `archived_at <= now - 30 days` are deleted.
- **Integration:** `PUT /api/v1/tasks/:id` with `{"status":"archive"}` → verify response `archived_at` is set. Follow-up `PUT` with `{"status":"backlog"}` → verify `archived_at` is null.
- **Manual:**
  1. Create a task → drag to Archive → verify `archived_at` appears in DB
  2. Drag same task to Backlog → verify `archived_at` is null in DB
  3. Toggle archive visibility off → column disappears; DB unchanged
  4. Toggle back on → column reappears with task
  5. Open task modal → confirm "Archive" option in status dropdown
  6. In table view: cycle status filter through to Archive → verify only archive tasks shown
  7. Verify horizontal scroll on a browser window narrower than 4 columns
- **Edge cases:**
  - Task archived multiple times (dragged in/out/in) → `archived_at` resets to latest timestamp each time
  - Archive column hidden → cron job still deletes expired tasks (no dependency on UI state)
  - No archived tasks → cleanup job runs silently with 0 deletions
  - Existing tasks with `status = 'archive'` and `archived_at = null` (pre-migration) → backfill assigns `datetime('now')`; these tasks will be eligible for deletion 30 days from the migration date

### Git Workflow
**Branch:** `task/059-task-archive`
1. Create branch from main at start of implementation
2. Commit per phase with conventional messages (e.g., `feat(db): add archived_at column migration`, `feat(repo): auto-manage archived_at on status change`, `feat(cron): daily cleanup job for expired archived tasks`, `feat(frontend): add archive status to modal and table`, `feat(kanban): archive column with scroll layout and visibility toggle`)
3. Push for review after all phases complete
4. Merge via PR; delete branch after merge
**Rollback:** New branch from main if issues arise. Never force push shared branches.

### Post-Completion Checklist
- [ ] All phases reviewed and approved
- [ ] No dead code / debug logs / console.log
- [ ] SSE events emitted for mutations (status changes via `PUT` already emit `task:updated` via eventBus when `source !== 'web_app'` — no change needed for web-initiated changes)
- [ ] Frontend handles `archive` status in all display paths
- [ ] `node-cron` added to `backend/package.json` dependencies
- [ ] PM2 restart tested: `node -c backend/server.js && pm2 restart cashflow-backend`
- [ ] Frontend production build tested: `npm run build` in `frontend/`
- [ ] Branch pushed + PR created
- [ ] Conventional commit format followed

## Progress Notes
- Mar 13 2026: Documentation produced by /architect
- Mar 13 2026: Phase 1 complete — Database migration applied (archived_at column added)
- Mar 13 2026: Phase 2 complete — Repository updated (auto-manage archived_at, deleteExpiredArchived method)
- Mar 13 2026: Phase 3 complete — Cleanup job added (node-cron daily at midnight)
- Mar 13 2026: Phase 4 complete — Frontend types, TaskModal, TaskTable updated (archive status)
- Mar 13 2026: Phase 5 complete — Kanban board updated (archive column, horizontal scroll, visibility toggle)
