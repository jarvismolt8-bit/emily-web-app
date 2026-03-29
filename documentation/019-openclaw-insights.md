# Task 019: OpenClaw Insights Feature
**Created:** 2026-03-17 | **Updated:** 2026-03-17

## Plan Notes
- **Objective:** Allow Emily (Gemini 2.5 Flash via Telegram) to POST structured chart data to the web app, which renders it in a new Insights tab using Recharts.
- **Scope:** New Insights tab (between Tasks and Logs), new DB tables, new API endpoint with strict validation, SSE realtime push, 4 chart types (donut, bar, line, area), delete per session, Emily insights-skill.
- **Phases:** Tab Shell → Backend Data Layer → Frontend Chart Rendering → Emily Skill → Polish & Merge
- **Complexity:** Medium
- **Git Branch:** `task/019-openclaw-insights`

## Development Notes

### Affected Files
| Area | File | Change Type |
|------|------|-------------|
| Backend | `backend/db/schema.sql` | Modify — append 2 new tables |
| Backend | `backend/repositories/insights.repository.js` | Create |
| Backend | `backend/routes/v1/insights.js` | Create |
| Backend | `backend/server.js` | Modify — register route + SSE fan-out |
| Frontend | `frontend/package.json` | Modify — add `recharts` |
| Frontend | `frontend/src/components/ui/chart.tsx` | Create — shadcn/ui chart wrapper |
| Frontend | `frontend/src/api/insights.ts` | Create |
| Frontend | `frontend/src/components/Insights.tsx` | Create |
| Frontend | `frontend/src/components/InsightChart.tsx` | Create |
| Frontend | `frontend/src/App.tsx` | Modify — add Insights tab trigger + content |
| Emily | `/root/.openclaw/workspace/skills/insights-skill/SKILL.md` | Create |

### Schema Changes
```sql
-- Append to backend/db/schema.sql

CREATE TABLE IF NOT EXISTS insight_sessions (
  id TEXT PRIMARY KEY,            -- UUID from Emily's payload (session_id)
  requested_by TEXT NOT NULL,     -- telegram_user_id
  prompt TEXT NOT NULL,
  generated_at TEXT NOT NULL,     -- ISO 8601, stored as-is
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS insight_charts (
  id TEXT PRIMARY KEY,            -- UUID from Emily's payload (chart_id)
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,             -- donut | bar | line | area (enforced by CHECK)
  title TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  x_axis_label TEXT DEFAULT '',
  y_axis_label TEXT DEFAULT '',
  chart_data TEXT NOT NULL,       -- JSON array: [{label, value}], stored as TEXT
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES insight_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_insight_sessions_created ON insight_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_insight_charts_session ON insight_charts(session_id);
```

> **Note:** SQLite does not enforce CHECK constraints by default in older pragmas, so type validation is handled at the application layer (route). The FOREIGN KEY cascade is effective when `PRAGMA foreign_keys = ON` — verify `db/index.js` enables this.

### API Contract Changes

#### `POST /api/v1/insights`
Emily POSTs a new insight session with charts.

**Auth:** `X-API-Key` (same key used by all Emily skills)

**Request body:**
```json
{
  "session_id": "uuid-v4",
  "requested_by": "telegram_user_id",
  "generated_at": "2026-03-17T10:00:00Z",
  "prompt": "Graph my February 2026 expenses",
  "charts": [
    {
      "chart_id": "uuid-v4",
      "type": "donut",
      "title": "February 2026 Expenses by Category",
      "explanation": "Food dominates at 42% of total spending.",
      "x_axis_label": "",
      "y_axis_label": "",
      "data": [
        { "label": "Food", "value": 12500 },
        { "label": "Transport", "value": 4200 }
      ]
    }
  ]
}
```

**Strict validation rules (reject with 400 if violated):**
| Field | Rule |
|-------|------|
| `session_id` | Required, non-empty string |
| `requested_by` | Required, non-empty string |
| `generated_at` | Required, non-empty string |
| `prompt` | Required, non-empty string, max 500 chars |
| `charts` | Required, array, min length 1, max length 10 |
| `charts[].chart_id` | Required, non-empty string |
| `charts[].type` | Required, must be one of: `donut`, `bar`, `line`, `area` |
| `charts[].title` | Required, non-empty string, max 200 chars |
| `charts[].data` | Required, array, min length 1, max length 200 |
| `charts[].data[].label` | Required, non-empty string |
| `charts[].data[].value` | Required, finite number |
| `charts[].explanation` | Optional string, max 1000 chars |
| `charts[].x_axis_label` | Optional string, max 100 chars |
| `charts[].y_axis_label` | Optional string, max 100 chars |

**Duplicate guard:** If `session_id` already exists in DB, return `409 Conflict` — do not overwrite.

**Response (201):**
```json
{ "success": true, "data": { "session_id": "uuid-v4" } }
```

**SSE event emitted on success:**
```json
{ "event": "insights:created", "data": { "session_id": "uuid-v4" } }
```

---

#### `GET /api/v1/insights`
Returns all sessions with their charts, newest first.

**Auth:** JWT or `X-API-Key`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "requested_by": "telegram_user_id",
      "prompt": "...",
      "generated_at": "...",
      "created_at": "...",
      "charts": [
        {
          "id": "uuid",
          "type": "donut",
          "title": "...",
          "explanation": "...",
          "x_axis_label": "",
          "y_axis_label": "",
          "chart_data": [{ "label": "Food", "value": 12500 }],
          "sort_order": 0
        }
      ]
    }
  ]
}
```

---

#### `DELETE /api/v1/insights/:sessionId`
Deletes an insight session and all its charts (cascade).

**Auth:** JWT or `X-API-Key`

**Response (200):**
```json
{ "success": true }
```

### Security Considerations
- **Input validation:** Strict server-side validation on all POST fields (see table above). All string inputs trimmed and length-checked before DB insertion.
- **Authentication:** `POST /api/v1/insights` requires `X-API-Key` (same middleware as cashflow/task routes). GET and DELETE require JWT or `X-API-Key`.
- **Data exposure:** `insight_charts.chart_data` stores user financial patterns — access requires authentication. No public endpoint.
- **Attack surface:** The POST endpoint is the primary risk — strict validation + duplicate session_id guard + max chart count (10) + max data points (200) prevent payload abuse.
- **SQL injection:** All DB access via parameterized queries in the repository layer. No raw string interpolation in SQL.
- **XSS:** Chart `title`, `explanation`, `label` values are rendered in React (auto-escaped). No `dangerouslySetInnerHTML` usage.
- **No destructive overlap:** This feature adds new tables and routes only. Zero modifications to `cashflow`, `tasks`, or `activity_logs` tables.

## Implementation Details
**Status:** Draft | **Author:** Architect (/architect)

### Overview
Emily queries the cashflow and tasks APIs, decides which of 4 chart types best represents the data, compiles a structured JSON payload, and POSTs it to `POST /api/v1/insights`. The backend validates strictly, stores the session and charts in two new SQLite tables, and fires an SSE event. The frontend Insights tab (inserted between Tasks and Logs) receives the SSE event, refreshes, and renders each chart using the correct Recharts component template. Users can delete individual sessions from the web app. Insights are only ever created by Emily — there is no "Add" button on the web app.

### Out of Scope
- Chart types beyond `donut`, `bar`, `line`, `area` (scatter, histogram, radial, grouped-bar deferred to v2)
- Polymorphic data shapes — all chart types use `{ label, value }` in v1
- Pagination on the Insights tab (deferred; low volume expected)
- Editing or regenerating insights from the web app
- Per-insight comments or annotations
- Insights based on sources other than cashflow and tasks APIs

### Dependencies
- `recharts` npm package — install in `frontend/`
- shadcn/ui `chart.tsx` — manually created, not via CLI (CLI not configured)
- SQLite FOREIGN KEY cascade — requires `PRAGMA foreign_keys = ON` in `db/index.js`
- Existing SSE infrastructure (`backend/events/index.js`, `useSSE` hook)
- Existing `X-API-Key` auth middleware

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Malformed Emily payload inserts garbage | Medium | Medium | Strict validation layer in route, 400 on any violation |
| `recharts` bundle size (~400KB) increases load time | Low | Low | Recharts is tree-shaken by Vite; only used components are bundled |
| DB schema change breaks staging/production on deploy | Low | High | Schema is append-only; `IF NOT EXISTS` guards; validate on staging first |
| FOREIGN KEY cascade not enabled in SQLite | Medium | Medium | Verify `db/index.js` has `PRAGMA foreign_keys = ON`; add if missing |
| SSE event floods frontend if Emily spams endpoint | Low | Low | Duplicate session_id guard (409) prevents duplicate processing |
| `server.js` route registration edit breaks existing routes | Low | High | `node -c server.js` before every restart; staging test first |

### Alternatives Considered
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Chart.js + react-chartjs-2 | Smaller bundle, simpler API | Doesn't integrate with shadcn/ui theming | Rejected |
| Tremor | Pre-built Tailwind components | Another UI library, diverges from existing shadcn/ui | Rejected |
| Store full chart JSON blob (no `insight_charts` table) | Simpler schema | Can't query/filter individual charts later | Rejected |
| No SSE (polling instead) | Simpler | Already have SSE; polling is wasteful | Rejected |

---

### Phase 1: Tab Shell + Staging Setup
**Goal:** Create the `task/019-openclaw-insights` branch, deploy to staging, and add an empty-state Insights tab to the web app.

**Files:**
- `frontend/src/App.tsx` — add `TabsTrigger` and `TabsContent` for `insights`

**Steps:**
1. `git checkout main && git pull origin main`
2. `git checkout -b task/019-openclaw-insights`
3. In `App.tsx`, import `BarChart2` from `lucide-react`
4. Add to `TabsList` between Tasks and Logs:
   ```tsx
   <TabsTrigger value="insights" className="gap-2">
     <BarChart2 className="h-4 w-4" />
     Insights
   </TabsTrigger>
   ```
5. Add `TabsContent` block:
   ```tsx
   <TabsContent value="insights" className="mt-6">
     <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
       <BarChart2 className="h-8 w-8 opacity-30" />
       <p className="text-sm">No insights yet. Ask Emily on Telegram to get started.</p>
     </div>
   </TabsContent>
   ```
6. `cd frontend && npm run build`
7. Deploy to staging: copy `frontend/dist/` to staging static path, `pm2 restart cashflow-staging`
8. Verify staging at port 3002 — Insights tab visible, existing tabs unaffected

**Risk:** Low — additive only
**Rollback:** `git revert` the App.tsx change and rebuild

**Exit Criteria:**
- [ ] Insights tab appears between Tasks and Logs on staging
- [ ] Empty state message displays correctly
- [ ] Existing Cashflow, Tasks, Logs tabs are unaffected
- [ ] Build completes without errors
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 2: Backend Data Layer + API Endpoint
**Goal:** Add the two new DB tables, the insights repository, the validated API route, and SSE emission. No frontend changes yet.

**Files:**
- `backend/db/schema.sql` — append `insight_sessions` + `insight_charts` tables + indexes
- `backend/db/index.js` — verify/add `PRAGMA foreign_keys = ON`
- `backend/repositories/insights.repository.js` — create (CRUD operations)
- `backend/routes/v1/insights.js` — create (POST with validation, GET, DELETE)
- `backend/server.js` — register route + SSE fan-out for `insights:created`

**Steps:**

1. **Verify PRAGMA** in `backend/db/index.js`:
   ```js
   db.pragma('foreign_keys = ON');
   ```
   Add after DB open if not present.

2. **Append schema** (new tables as shown in Schema Changes section above).

3. **Create `insights.repository.js`:**
   - `createSession(session)` — insert into `insight_sessions`
   - `createChart(chart)` — insert into `insight_charts`
   - `findSessionById(id)` — lookup by `id`
   - `getAllSessions()` — SELECT all sessions + JOIN charts, ordered by `created_at DESC`
   - `deleteSession(id)` — DELETE from `insight_sessions` (cascade deletes charts)

4. **Create `routes/v1/insights.js`:**
   - Import `express`, `insightsRepository`, `eventBus` from `events/index.js`
   - `POST /` — validate payload (strict rules from API contract above), return 409 on duplicate session_id, insert session + charts in a transaction, emit `insights:created`, return 201
   - `GET /` — return all sessions with charts
   - `DELETE /:sessionId` — delete session by id, return 200

5. **Register route in `server.js`:**
   ```js
   const insightsRouter = require('./routes/v1/insights');
   app.use('/api/v1/insights', insightsRouter);
   ```
   Add alongside existing v1 route registrations.

6. **SSE fan-out in `server.js`:** Add listener:
   ```js
   eventBus.on('insights:created', (data) => {
     sseClients.forEach(client => client.write(`data: ${JSON.stringify({ type: 'insights:created', ...data })}\n\n`));
   });
   ```
   (Mirror the pattern used for `cashflow:*` and `task:*` events.)

7. `node -c backend/server.js && pm2 restart cashflow-staging`

8. **Smoke test with curl:**
   ```bash
   curl -X POST http://localhost:3002/api/v1/insights \
     -H "Content-Type: application/json" \
     -H "X-API-Key: cfm_9ebe271c5559514a3c33068bd470eb0b8cad214069beeff13a3df8342d48b57a" \
     -d '{
       "session_id": "test-session-001",
       "requested_by": "test_user",
       "generated_at": "2026-03-17T10:00:00Z",
       "prompt": "Test prompt",
       "charts": [{
         "chart_id": "test-chart-001",
         "type": "bar",
         "title": "Test Chart",
         "explanation": "This is a test.",
         "data": [{"label": "Food", "value": 1000}, {"label": "Transport", "value": 500}]
       }]
     }'
   ```
   Expect `{"success":true,"data":{"session_id":"test-session-001"}}`

9. Test validation rejections:
   - POST with invalid `type` (e.g., `"scatter"`) → expect 400
   - POST same `session_id` again → expect 409
   - POST without `charts` → expect 400
   - POST with `data[].value` as a string → expect 400

10. Test GET: `curl http://localhost:3002/api/v1/insights -H "X-API-Key: ..."` → sessions + charts returned

11. Test DELETE: `curl -X DELETE http://localhost:3002/api/v1/insights/test-session-001 -H "X-API-Key: ..."` → `{"success":true}`, verify charts also deleted

**Risk:** Medium — DB schema change + server.js edit
**Rollback:** Remove route registration from `server.js`, `pm2 restart cashflow-staging`. Schema tables are `IF NOT EXISTS` — safe to leave or drop manually.

**Exit Criteria:**
- [ ] `insight_sessions` and `insight_charts` tables exist in staging DB
- [ ] Valid POST creates session + charts in DB
- [ ] Invalid payload returns 400 with clear error message
- [ ] Duplicate session_id returns 409
- [ ] GET returns all sessions with charts nested
- [ ] DELETE removes session and its charts
- [ ] `node -c backend/server.js` passes
- [ ] No regressions on cashflow, tasks, activity-logs routes
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 3: Frontend Chart Rendering
**Goal:** Install Recharts, build the 4 chart components, wire up the Insights tab to fetch and render real data, and subscribe to SSE for auto-refresh.

**Files:**
- `frontend/package.json` — add `recharts`
- `frontend/src/components/ui/chart.tsx` — create shadcn/ui chart wrapper
- `frontend/src/api/insights.ts` — create API fetch wrappers
- `frontend/src/components/InsightChart.tsx` — renders one chart by type
- `frontend/src/components/Insights.tsx` — main tab: fetches sessions, renders list, delete button
- `frontend/src/App.tsx` — replace empty-state placeholder with `<Insights />`

**Steps:**

1. **Install Recharts:**
   ```bash
   cd /var/www/cashflow-manager/frontend && npm install recharts
   ```

2. **Create `chart.tsx`** — shadcn/ui-style chart context + `ChartContainer` + `ChartTooltip` + `ChartTooltipContent` components that apply the app's CSS variables for theming. This is the minimal wrapper needed for the 4 chart types.

3. **Create `api/insights.ts`:**
   ```ts
   export const insightsAPI = {
     getAll: () => fetch('/api/v1/insights', { headers: authHeaders() }).then(r => r.json()),
     deleteSession: (id: string) => fetch(`/api/v1/insights/${id}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json()),
   }
   ```

4. **Create `InsightChart.tsx`** — accepts `{ type, title, explanation, data, xAxisLabel, yAxisLabel }`. Switch on `type`:
   - `donut` → `PieChart` + `Pie` with `cx="50%"` and inner radius
   - `bar` → `BarChart` + `Bar`
   - `line` → `LineChart` + `Line`
   - `area` → `AreaChart` + `Area`
   All wrapped in `ChartContainer`, with `ChartTooltip`. Show `explanation` text below the chart.

5. **Create `Insights.tsx`** — fetches all sessions on mount, subscribes to `insights:created` SSE event (via `useSSE` hook) to trigger re-fetch, renders sessions newest-first, each with: prompt text, generated_at timestamp (formatted PHT), delete button, and all charts for that session.

6. **Replace placeholder in `App.tsx`:**
   ```tsx
   import Insights from './components/Insights'
   // ...
   <TabsContent value="insights" className="mt-6">
     <Insights />
   </TabsContent>
   ```

7. `npm run build && pm2 restart cashflow-staging`

8. Verify on staging with the test data from Phase 2 (or POST a new test payload).

**Risk:** Low-Medium — new dependency, isolated component
**Rollback:** Revert the `TabsContent` to empty-state placeholder. Recharts in `package.json` is harmless if unused.

**Exit Criteria:**
- [ ] All 4 chart types render correctly with mock data
- [ ] Chart explanation text displays below each chart
- [ ] Sessions show prompt + timestamp
- [ ] Delete button removes session from UI and DB
- [ ] SSE: POSTing a new insight from terminal causes the tab to refresh without page reload
- [ ] Charts visually consistent with app theme (dark/light mode)
- [ ] `npm run build` produces no TypeScript errors
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 4: Emily Skill — generate-insights
**Goal:** Build the `insights-skill` so Emily can interpret a Telegram message, query cashflow + tasks data, decide chart types, compile the JSON, and POST to the insights endpoint.

**Files:**
- `/root/.openclaw/workspace/skills/insights-skill/SKILL.md` — create

**Steps:**

1. **Create skill directory and SKILL.md.** The skill covers:
   - **Trigger phrases:** "graph my expenses", "chart my cashflow", "show me insights", "visualize my data", "analyze my spending"
   - **Step 1 — Parse request:** Extract time range (default: current month), data subject (expenses, income, tasks, all)
   - **Step 2 — Query data:**
     ```bash
     # Cashflow data
     curl -s "http://localhost:3001/api/v1/cashflow?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD" \
       -H "X-API-Key: cfm_9ebe271c5559514a3c33068bd470eb0b8cad214069beeff13a3df8342d48b57a" \
       -H "X-Source: telegram"
     # Tasks data
     curl -s "http://localhost:3001/api/v1/tasks" \
       -H "X-API-Key: cfm_9ebe271c5559514a3c33068bd470eb0b8cad214069beeff13a3df8342d48b57a" \
       -H "X-Source: telegram"
     ```
   - **Step 3 — Analyze + select chart type:**

     | Data pattern | Chart type |
     |---|---|
     | Proportions / category breakdown | `donut` |
     | Comparison across categories | `bar` |
     | Trend over time (daily/weekly amounts) | `line` |
     | Cumulative trend over time | `area` |

   - **Step 4 — Build JSON payload** with `session_id` (generate UUID via `uuidgen`), `chart_id` per chart
   - **Step 5 — POST to endpoint:**
     ```bash
     curl -s -X POST "http://localhost:3001/api/v1/insights" \
       -H "Content-Type: application/json" \
       -H "X-API-Key: cfm_9ebe271c5559514a3c33068bd470eb0b8cad214069beeff13a3df8342d48b57a" \
       -H "X-Source: telegram" \
       -d '...'
     ```
   - **Step 6 — Reply on Telegram:** "Done! Your insights are ready in the web app. Check the Insights tab. 📊"
   - **Error handling:**
     - Empty data → "I couldn't find any [cashflow/task] data for that period. Try a different date range."
     - Ambiguous request → ask one clarifying question before proceeding
     - API 400/409/500 → "Something went wrong generating your insights. Please try again."

2. **Test end-to-end on staging:** Update the skill to point at `http://localhost:3002` temporarily, send test message via Telegram, verify:
   - Correct data is queried
   - Valid JSON is constructed
   - Insights appear in web app staging

3. **Revert skill base URL** back to `:3001` (production) after staging validation.

**Risk:** Medium — Emily skill logic must generate valid JSON matching the strict contract
**Rollback:** Delete or rename the skill file. No production state is affected until Emily successfully POSTs.

**Exit Criteria:**
- [ ] Send "graph my expenses for March 2026" to Emily on Telegram
- [ ] Emily queries correct cashflow data
- [ ] Emily POSTs valid payload (check staging logs)
- [ ] Charts appear in web app Insights tab automatically via SSE
- [ ] Emily sends confirmation message on Telegram
- [ ] Empty data scenario handled gracefully
- [ ] Ambiguous request scenario handled gracefully
- [ ] API error scenario handled gracefully
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 5: Polish + Production Merge
**Goal:** Final QA, UI polish, cleanup, then merge to main and deploy to production.

**Files:** Primarily the components touched in Phases 1–4 for polish.

**Steps:**

1. Full end-to-end test on staging (phases 1–4 checklist)
2. UI review:
   - Loading state in Insights tab while fetching
   - Error state if GET fails
   - Responsive layout (mobile + desktop)
   - Empty state after all sessions deleted
   - Confirm dialog before delete
3. Remove any `console.log` or debug artifacts
4. Run `npm run build` — zero TypeScript errors, no warnings
5. `node -c backend/server.js` — syntax check passes
6. Soak staging for at least 1 session of real use
7. Final user approval
8. `git checkout main && git merge task/019-openclaw-insights`
9. `npm run build` in frontend (production build)
10. `pm2 restart cashflow-backend`
11. Smoke test production: visit web app, confirm Insights tab, ask Emily to generate one insight

**Risk:** Low (all work validated on staging)
**Rollback:** `git revert` the merge commit, rebuild frontend, `pm2 restart cashflow-backend`

**Exit Criteria:**
- [ ] Full flow works end-to-end in production
- [ ] Loading, error, and empty states display correctly
- [ ] Delete confirms before removing
- [ ] No regressions on Cashflow, Tasks, Logs tabs
- [ ] No console errors in browser DevTools
- [ ] Production PM2 stable after 5 minutes
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Testing Strategy
- **Unit:** Validate the `validateInsightPayload` function in the route (or extracted helper) against all edge cases: missing fields, wrong types, out-of-range values, invalid chart type.
- **Integration (curl):** Manual curl tests from Phase 2 checklist cover the full API surface.
- **Manual:** Each phase has a user test checklist. Phase 4 test is the full Telegram-to-web-app flow.
- **Edge cases:**
  - POST with 0 charts → 400
  - POST with 11 charts → 400
  - `data[].value` = `null` → 400
  - `data[].value` = `Infinity` / `NaN` → 400 (use `Number.isFinite`)
  - `type` = `"Donut"` (wrong case) → 400
  - `session_id` = empty string → 400
  - DELETE non-existent session → 404
  - GET with no data → `{ success: true, data: [] }`

### Git Workflow
**Branch:** `task/019-openclaw-insights`
1. Create at Phase 1 · 2. Commit per phase with conventional messages · 3. Push for review after each phase · 4. Merge to main only at Phase 5 with user approval · 5. Delete branch after merge
**Rollback:** Revert individual commits per phase. Never force push.

### Post-Completion Checklist
- [ ] All 5 phases reviewed and approved
- [ ] No dead code / debug logs / console.log
- [ ] SSE `insights:created` event emitted on POST
- [ ] Frontend Insights tab subscribes to `insights:created` SSE event
- [ ] Strict payload validation in POST route (400 on any violation, 409 on duplicate)
- [ ] `node -c backend/server.js && pm2 restart cashflow-backend` tested
- [ ] `npm run build` clean (no TS errors)
- [ ] Branch pushed + PR created
- [ ] Conventional commit format followed

## Progress Notes
- 2026-03-17: Documentation produced by /architect. Brainstorm clarified: Recharts chosen, 4 chart types for v1 (donut/bar/line/area), simple label/value schema, SSE realtime push included, task/019-openclaw-insights branch, delete-only (no add) from web app, Emily queries both cashflow and tasks APIs, strict JSON validation agreed due to production safety.
- 2026-03-17: Phase 1 complete — Insights tab shell added to App.tsx with empty state
- 2026-03-17: Phase 2 complete — Backend data layer and API endpoint implemented
- 2026-03-17: Phase 3 complete — Frontend chart rendering with recharts, 4 chart types
- 2026-03-17: Phase 4 complete — Emily insights-skill created
