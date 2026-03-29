# Task 091: Revamp Ticket
**Created:** Mar 25 2026 | **Updated:** Mar 25 2026

## Plan Notes
- **Objective:** Move task documentation from flat files into the `tasks` DB table so one API call returns all ticket data including documentation.
- **Scope:** DB schema, repository layer, route rewiring, one-time file migration, Claude skill updates (architect-skill + engineer-skill).
- **Phases:** Schema Migration · Repository Update · Route Rewire · Migration Script · Skill Updates
- **Complexity:** Medium
- **Git Branch:** `task/091-revamp-ticket`

## Development Notes

### Affected Files
| Area | File | Change Type |
|------|------|-------------|
| DB Schema | `backend/db/schema.sql` | Modify — add `documentation` column |
| Repository | `backend/repositories/tasks.repository.js` | Modify — findAll excludes doc, findById includes doc, update/create accept doc |
| Route | `backend/routes/v1/tasks.js` | Modify — rewire GET/POST `/tasks/:id/documentation` to DB; PUT accepts `documentation` |
| Migration | `backend/db/migrate-docs.js` | Create — one-time script to import `.md` files into DB |
| Skill | `/root/.claude/skills/architect-skill/SKILL.md` | Modify — remove file path references, use task API |
| Skill | `/root/.claude/skills/engineer-skill/SKILL.md` | Modify — remove file path references, use task API |

### Schema Changes
```sql
ALTER TABLE tasks ADD COLUMN documentation TEXT DEFAULT '';
```
Also update `schema.sql` to include `documentation TEXT DEFAULT ''` in the CREATE TABLE statement for future reference.

### API Contract Changes
| Method | Path | Change |
|--------|------|--------|
| GET | `/api/v1/tasks` | No change — `documentation` intentionally excluded from list |
| GET | `/api/v1/tasks/:id` | Now includes `documentation` field in response |
| PUT | `/api/v1/tasks/:id` | Now accepts `documentation` as updatable field |
| GET | `/api/v1/tasks/:id/documentation` | Rewired: reads from DB column instead of file |
| POST | `/api/v1/tasks/:id/documentation` | Rewired: writes to DB column instead of file |

### Security Considerations
- **Input validation:** `documentation` is free-form markdown text — no special validation needed beyond existing sanitization. No SQL injection risk (parameterized queries).
- **Authentication:** All task routes already require auth; no new surface.
- **Data exposure:** `documentation` can contain sensitive planning notes — correctly excluded from list endpoint.
- **Attack surface:** No new endpoints introduced.

## Implementation Details
**Status:** Approved | **Author:** Architect (/architect-skill)

### Overview
The `documentation` field moves from flat `.md` files in `/documentation/` into the `tasks` SQLite table. This eliminates the file system dependency, enables atomic reads of full ticket data via `GET /tasks/:id`, and simplifies skill/agent code that previously had to manage file paths and slugs. The existing `/tasks/:id/documentation` API endpoints are preserved but rewired to DB — this keeps OpenClaw's `task-doc-skill` working with zero changes.

### Out of Scope
- Frontend `TaskModal` changes — the existing `/tasks/:id/documentation` endpoints remain, so no frontend changes are required.
- Deleting the `/documentation/` folder — kept as backup.
- Adding new UI fields — the task already stores name, description, date, time, status, priority; this change adds documentation storage only.
- `task-doc-skill` (OpenClaw) — no changes needed; it uses the API endpoints which are preserved.

### Dependencies
- `better-sqlite3` — already in use, no new packages.
- Existing `/documentation/*.md` files — read during migration, not deleted.

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ALTER TABLE on live DB fails | Low | High | SQLite ALTER TABLE ADD COLUMN is safe and non-blocking; test on staging first |
| Migration overwrites good data | Low | Medium | Migration script only updates rows where `documentation` is empty; skips if already set |
| Large doc content slows `GET /tasks/:id` | Low | Low | Single-row fetch with full content is negligible for SQLite |
| `findAll` accidentally includes `documentation` | Medium | Medium | Use explicit column list in SELECT, not `SELECT *` |

### Alternatives Considered
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Separate `task_documentation` table | Cleaner separation | Extra join, more complexity for no gain | Rejected — single column is sufficient |
| Keep files, add DB index | No migration needed | Dual source of truth problem persists | Rejected |
| Store docs in Redis | Fast reads | Volatile, not persistent by default | Rejected |

---

### Phase 1: Schema Migration
**Goal:** Add `documentation` column to the live DB and update `schema.sql`.
**Files:**
- `backend/db/schema.sql` — add column to CREATE TABLE definition
- Run `ALTER TABLE` directly on `backend/db/cashflow.db`

**Steps:**
1. Run on the live DB:
   ```sql
   ALTER TABLE tasks ADD COLUMN documentation TEXT DEFAULT '';
   ```
2. Verify with: `PRAGMA table_info(tasks);`
3. Update `backend/db/schema.sql` — add `documentation TEXT DEFAULT ''` to the `tasks` CREATE TABLE block.

**Risk:** Low — SQLite ADD COLUMN is non-destructive and instant.
**Rollback:** SQLite does not support DROP COLUMN directly (pre-3.35). If rollback needed: recreate table without the column and copy data. In practice, leaving an empty unused column is harmless.

**Exit Criteria:**
- [ ] `PRAGMA table_info(tasks)` shows `documentation` column
- [ ] `schema.sql` updated to match
- [ ] No PM2 restart required (schema change only)
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 2: Repository Layer Update
**Goal:** Update `tasks.repository.js` so `findAll` excludes `documentation`, `findById` includes it, and `update`/`create` accept the `documentation` field.
**Files:** `backend/repositories/tasks.repository.js`

**Steps:**
1. `findAll` — replace `SELECT *` with explicit column list (all columns except `documentation`):
   ```sql
   SELECT id, name, description, date, time, status, priority, created_at, updated_at, archived_at FROM tasks
   ```
2. `findById` — keep `SELECT *` (returns all columns including `documentation`).
3. `create` — add `documentation` to INSERT; accept `data.documentation || ''`.
4. `update` — add `'documentation'` to the allowed fields loop:
   ```js
   for (const key of ['name', 'description', 'date', 'time', 'status', 'priority', 'documentation']) {
   ```

**Risk:** Low — pure data layer change, no side effects.
**Rollback:** Revert `tasks.repository.js` to previous version.

**Exit Criteria:**
- [ ] `GET /api/v1/tasks` response objects do NOT contain `documentation` field
- [ ] `GET /api/v1/tasks/:id` response DOES contain `documentation` field (empty string initially)
- [ ] `PUT /api/v1/tasks/:id` with `{ "documentation": "test" }` persists and returns the value
- [ ] `node -c backend/repositories/tasks.repository.js` passes
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 3: Route Rewire — Documentation Endpoints
**Goal:** Rewire `GET/POST /tasks/:id/documentation` to read/write the DB column instead of the filesystem. Ensure `PUT /tasks/:id` also accepts `documentation`.
**Files:** `backend/routes/v1/tasks.js`

**Steps:**
1. Remove the `fs`, `path`, `DOCS_DIR`, and `getDocFilePath` declarations from the top of `tasks.js`.
2. Replace `GET /:id/documentation` handler — fetch task via repo, return `{ content: task.documentation || '', exists: !!(task.documentation) }`.
3. Replace `POST /:id/documentation` handler — call `tasksRepo.update(id, { documentation: content })`, return success. Keep the `logActivityFromReq` call.
4. Verify `PUT /:id` route already delegates to `tasksRepo.update` — it does; the repo change in Phase 2 handles `documentation` automatically.
5. Run `node -c backend/routes/v1/tasks.js` before PM2 restart.
6. Run `pm2 restart cashflow-backend`.

**Risk:** Medium — file-based code removed; if the repo isn't updated first (Phase 2), this will break. Must execute after Phase 2.
**Rollback:** Restore `tasks.js` from git, `pm2 restart cashflow-backend`.

**Exit Criteria:**
- [ ] `GET /api/v1/tasks/:id/documentation` returns `{ content: "", exists: false }` for a task with no doc
- [ ] `POST /api/v1/tasks/:id/documentation` with `{ "content": "# Test" }` saves to DB
- [ ] Subsequent `GET /api/v1/tasks/:id` returns `documentation: "# Test"`
- [ ] Subsequent `GET /api/v1/tasks/:id/documentation` returns `content: "# Test", exists: true`
- [ ] No `fs` or `path` references remain in `tasks.js`
- [ ] `node -c` passes, PM2 restarts cleanly
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 4: Migration Script — Import Existing Docs
**Goal:** For each `.md` file in `/documentation/`, if the task ID exists in the DB and `documentation` is empty, import the file content.
**Files:** `backend/db/migrate-docs.js` (new file)

**Steps:**
1. Create `backend/db/migrate-docs.js`:
   - Read all files from `/var/www/cashflow-manager/documentation/`
   - For each `.md` file, extract task ID from filename (prefix before first `-`)
   - `SELECT id, documentation FROM tasks WHERE id = ?`
   - If task exists AND `documentation` is empty/null: run `UPDATE tasks SET documentation = ? WHERE id = ?`
   - Log: imported / skipped (already has content) / not found
2. Run: `cd /var/www/cashflow-manager/backend && node db/migrate-docs.js`
3. Verify a few known tasks: `GET /api/v1/tasks/035` should return documentation content.

**Risk:** Low — script only updates rows with empty `documentation`; original files untouched.
**Rollback:** Run `UPDATE tasks SET documentation = '' WHERE id IN (...)` for any incorrectly migrated IDs. Original files remain as reference.

**Exit Criteria:**
- [ ] Script runs without errors
- [ ] Tasks with existing `.md` files show documentation content via `GET /api/v1/tasks/:id`
- [ ] Tasks without `.md` files unaffected (empty string)
- [ ] Script output shows correct imported/skipped/not-found counts
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 5: Skill Updates
**Goal:** Update `architect-skill` and `engineer-skill` to use the task API instead of file paths.
**Files:**
- `/root/.claude/skills/architect-skill/SKILL.md`
- `/root/.claude/skills/engineer-skill/SKILL.md`

**Changes to architect-skill:**
1. Step A1 — remove "Check `/var/www/cashflow-manager/documentation/` for existing file". Replace with: read `documentation` field from `GET /api/v1/tasks/:id`.
2. Step B4 — replace file write logic with: `PUT /api/v1/tasks/:id` with `{ documentation: <generated content> }`. Remove slug-based path logic.
3. Step B5 — update closing message: remove reference to `documentation/{id}-{slug}.md`. Say: *"Documentation saved to task 091. Run `/engineer TASK-[ID]` when ready to implement."*
4. Remove all references to `/var/www/cashflow-manager/documentation/` and slug-based filenames from the skill.
5. Update `Documentation File Template` section heading and path to reflect DB-based storage.

**Changes to engineer-skill:**
1. Activation Protocol step 1 — replace file read with: `GET /api/v1/tasks/:id` and read the `documentation` field.
2. Remove "list files in `/documentation/`" fallback.
3. `Documentation Update` section — replace file write with: `PUT /api/v1/tasks/:id` with updated `documentation` content (append to existing).
4. Remove all file path references.

**Risk:** Low — skill files only; no backend changes.
**Rollback:** Revert skill files from git.

**Exit Criteria:**
- [ ] architect-skill has no references to `/documentation/` path or slug-based filenames
- [ ] engineer-skill reads/writes documentation via task API only
- [ ] Both skills tested by invoking them on a test task
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Testing Strategy
- **Unit:** None — no isolated logic beyond SQL and file I/O removal.
- **Integration:** Use `curl` with the API key to verify each endpoint before/after each phase.
- **Manual:** Open TaskModal in the web app, edit documentation for a task, reload — verify it persists.
- **Edge cases:**
  - Task with no documentation: `exists: false`, content empty string
  - Very large documentation (>10KB): verify no truncation
  - `PUT /tasks/:id` with only `documentation` field (no other fields): verify only doc updates, rest unchanged
  - Task ID from `.md` file that no longer exists in DB: migration script skips cleanly

### Git Workflow
**Branch:** `task/091-revamp-ticket`
1. Create at start of Phase 1 · 2. One commit per phase · 3. Push for review after all phases · 4. Merge via PR · 5. Delete after merge
**Rollback:** New branch from main if issues arise. Never force push shared branches.

### Post-Completion Checklist
- [ ] All phases reviewed and approved
- [ ] No dead code / debug logs / `console.log`
- [ ] `fs` and `path` removed from `tasks.js` (no more file system access in routes)
- [ ] `findAll` confirmed to exclude `documentation`
- [ ] Migration script run and output verified
- [ ] TaskModal tested in browser — documentation loads and saves correctly
- [ ] `node -c` passed on all modified backend JS files
- [ ] PM2 restart tested cleanly
- [ ] Branch pushed + PR created
- [ ] Conventional commit format followed

## Progress Notes
- Mar 25 2026: Documentation produced by /architect-skill
- Mar 25 2026: Phase 1 complete — Added `documentation` column to tasks table and schema.sql
- Mar 25 2026: Phase 2 complete — Updated repository: findAll excludes doc, findById includes doc, create/update accept doc
- Mar 25 2026: Phase 3 complete — Rewired documentation endpoints to use DB, removed fs/path from tasks.js, PM2 restarted
- Mar 25 2026: Phase 4 complete — Migration script created and run: 21 tasks imported, 18 skipped (non-task docs), 0 errors
- Mar 25 2026: Phase 5 complete — Updated architect-skill and engineer-skill to use task API instead of file paths
