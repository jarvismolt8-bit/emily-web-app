# API Swagger Migration Plan

**Created:** February 18, 2026  
**Status:** COMPLETED ✅  
**Author:** Kevin + OpenCode

---

## 1. Executive Summary

Migrate the Cashflow Manager API from ad-hoc Express routes to a standardized OpenAPI 3.0 (Swagger) specification. This includes consolidating duplicate endpoints, standardizing response formats, adding versioning, generating interactive docs, and updating all consumers (web app frontend and Emily OpenClaw skills).

---

## 2. Current State Assessment

### 2.1 Backend (17 endpoints on port 3001)

| Group | Endpoints | Notes |
|-------|-----------|-------|
| Cashflow | 5 (`GET/POST/PUT/DELETE /api/cashflow`, `GET /api/summary`) | Standard CRUD |
| Tasks (Web App) | 4 (`GET/POST/PUT/DELETE /api/tasks`) | Used by frontend |
| Tasks (Emily) | 4 (`POST /api/emily/tasks/*`) | Duplicate CRUD with activity logging wrapper |
| Activity Logs | 3 (`GET/POST /api/activity-logs`, `GET /api/activity-logs/stats`) | Search + stats |
| WebSocket | 1 (`/api/chat`) | Real-time chat |

### 2.2 Authentication
- Single shared password via `X-Password` header
- WebSocket auth via query parameter `?password=...`
- No tokens, sessions, or rate limiting

### 2.3 Known Issues
1. **Duplicate task endpoints** -- Web app uses `/api/tasks`, Emily uses `/api/emily/tasks/*`
2. **Inconsistent response formats** -- Some return raw data, Emily endpoints wrap in `{ success, task, activity_logged }`
3. **Missing error detail** -- Frontend discards backend error messages
4. **No API documentation** -- No Swagger spec, no docs endpoint
5. **No versioning** -- All routes on `/api/` with no version prefix
6. **Incomplete TypeScript types** -- Frontend interfaces miss fields from backend responses
7. **Dead code** -- `chat-commands.js` (573 lines) is never invoked
8. **Task ID conflicts** -- Two different ID generation strategies can collide
9. **No input validation** -- No schema validation on request bodies

---

## 3. Target Architecture

### 3.1 API Design Principles
- **OpenAPI 3.0** spec as single source of truth (`swagger.yaml`)
- **Version prefix**: `/api/v1/`
- **Consistent response envelope**:
  ```json
  // Success
  { "success": true, "data": { ... }, "message": "optional" }

  // Error
  { "success": false, "error": { "code": "RESOURCE_NOT_FOUND", "message": "Task not found" } }
  ```
- **Unified task endpoints** -- One set of CRUD with `source` field to track origin
- **Swagger UI** at `/api-docs`
- **Request validation** via middleware (against OpenAPI spec)

### 3.2 Unified Endpoint Map

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1 | `GET` | `/api/v1/cashflow` | List transactions (with filters) |
| 2 | `POST` | `/api/v1/cashflow` | Create transaction |
| 3 | `GET` | `/api/v1/cashflow/:id` | Get single transaction |
| 4 | `PUT` | `/api/v1/cashflow/:id` | Update transaction |
| 5 | `DELETE` | `/api/v1/cashflow/:id` | Delete transaction |
| 6 | `GET` | `/api/v1/cashflow/summary` | Get financial summary |
| 7 | `GET` | `/api/v1/tasks` | List tasks |
| 8 | `POST` | `/api/v1/tasks` | Create task |
| 9 | `GET` | `/api/v1/tasks/:id` | Get single task |
| 10 | `PUT` | `/api/v1/tasks/:id` | Update task |
| 11 | `DELETE` | `/api/v1/tasks/:id` | Delete task |
| 12 | `DELETE` | `/api/v1/tasks` | Delete task by name (query: `?name=...`) |
| 13 | `GET` | `/api/v1/activity-logs` | List activity logs (with filters) |
| 14 | `GET` | `/api/v1/activity-logs/stats` | Get activity stats |
| 15 | `POST` | `/api/v1/activity-logs` | Create activity log |
| 16 | `WS` | `/api/v1/chat` | WebSocket chat |

**Key changes from current:**
- `/api/summary` → `/api/v1/cashflow/summary` (grouped under cashflow)
- `/api/emily/tasks/*` → REMOVED (merged into `/api/v1/tasks` with `source` field)
- All endpoints return standard envelope
- New: `GET /api/v1/cashflow/:id` and `GET /api/v1/tasks/:id` for single resource fetch

### 3.3 Standard Request/Response Schemas

#### Headers
```
X-Password: <password>         # Required on all endpoints
Content-Type: application/json  # Required on POST/PUT
X-Source: telegram|web_app|system  # Optional, defaults to "web_app"
```

> **Note:** Moving `source` from request body to `X-Source` header standardizes it across all endpoints without polluting resource payloads.

#### Cashflow Transaction Schema
```yaml
CashflowTransaction:
  type: object
  properties:
    id:
      type: string
      readOnly: true
    item:
      type: string
      required: true
    amount:
      type: number
      required: true
      description: "Positive = income, negative = expense"
    currency:
      type: string
      enum: [PHP, USD, EUR, GBP]
      default: PHP
    date:
      type: string
      format: date
    time:
      type: string
      pattern: "^\\d{2}:\\d{2}$"
    timezone:
      type: string
      default: PHT
    category:
      type: string
      enum: [Income, Food, Transport, Utilities, Shopping, Entertainment, Health, Airbnb, Other]
    notes:
      type: string
```

#### Task Schema
```yaml
Task:
  type: object
  properties:
    id:
      type: string
      readOnly: true
    name:
      type: string
      required: true
    date:
      type: string
    time:
      type: string
    status:
      type: string
      enum: [active, done]
      default: active
    priority:
      type: string
      enum: [low, medium, high]
      default: medium
```

#### Activity Log Schema
```yaml
ActivityLog:
  type: object
  properties:
    id:
      type: string
      readOnly: true
    date:
      type: string
    time:
      type: string
    source:
      type: string
      enum: [telegram, web_app, system]
    action_type:
      type: string
    description:
      type: string
    status:
      type: string
      enum: [success, failed]
    error_message:
      type: string
```

#### Summary Schema
```yaml
CashflowSummary:
  type: object
  properties:
    totalIncome:
      type: number
    totalExpenses:
      type: number
    balance:
      type: number
    transactionCount:
      type: integer
```

---

## 4. Implementation Plan

### Phase 1: OpenAPI Spec + Swagger UI (Backend Only)
**Effort:** ~2 hours | **Risk:** Low

1. Create `backend/swagger.yaml` with full OpenAPI 3.0 spec
2. Install `swagger-ui-express` and `yamljs` packages
3. Mount Swagger UI at `/api-docs`
4. Verify spec renders correctly at `http://server:3001/api-docs`

**Files to create:**
- `backend/swagger.yaml`

**Files to modify:**
- `backend/server.js` (add swagger UI mount)
- `backend/package.json` (add dependencies)

**Acceptance criteria:**
- `/api-docs` shows interactive Swagger UI
- All current endpoints are documented

---

### Phase 2: Backend Refactor -- New Versioned Routes
**Effort:** ~4 hours | **Risk:** Medium

1. Create route modules:
   - `backend/routes/v1/cashflow.js`
   - `backend/routes/v1/tasks.js`
   - `backend/routes/v1/activity-logs.js`
2. Implement standard response envelope helper:
   ```js
   function sendSuccess(res, data, message, status = 200)
   function sendError(res, code, message, status)
   ```
3. Implement `X-Source` header parsing middleware
4. Unify task ID generation (use `max existing ID + 1`, zero-padded)
5. Add request body validation middleware (optional: `express-openapi-validator`)
6. Mount new routes at `/api/v1/`
7. **Keep old routes working** as compatibility layer (redirect or proxy to v1)

**Files to create:**
- `backend/routes/v1/cashflow.js`
- `backend/routes/v1/tasks.js`
- `backend/routes/v1/activity-logs.js`
- `backend/middleware/response.js` (envelope helpers)
- `backend/middleware/source.js` (X-Source parsing)
- `backend/middleware/validate.js` (optional: request validation)

**Files to modify:**
- `backend/server.js` (mount v1 routes, keep legacy routes)

**Acceptance criteria:**
- `/api/v1/*` endpoints work with new response format
- `/api/*` (legacy) endpoints still work (backward compatibility)
- All task operations use unified ID generation
- Activity logging works for all sources via `X-Source` header

---

### Phase 3: Frontend Migration
**Effort:** ~2 hours | **Risk:** Low

1. Update API base URL to `/api/v1`
2. Update response handling to unwrap `{ success, data }` envelope
3. Add proper error parsing (read `error.message` from response body)
4. Add `X-Source: web_app` header to all requests
5. Update TypeScript interfaces to match full response schemas
6. Fix missing filter support (`startDate`, `endDate` on cashflow)
7. Remove unused `activityAPI.add()` or wire it up

**Files to modify:**
- `frontend/src/api/cashflow.ts`
- `frontend/src/api/tasks.ts`
- `frontend/src/api/activity.ts`
- `frontend/src/hooks/useChat.ts` (WebSocket URL update)

**Acceptance criteria:**
- Frontend works against `/api/v1/` endpoints
- Error messages from backend are displayed to user
- TypeScript types match OpenAPI spec

---

### Phase 4: Emily Skills Migration
**Effort:** ~1 hour | **Risk:** Low

1. Update `cashflow-skill/SKILL.md`:
   - Change all curl URLs from `/api/cashflow` to `/api/v1/cashflow`
   - Add `X-Source: telegram` header to all curl commands
   - Update response parsing examples to handle envelope format
2. Update `task-skill/SKILL.md`:
   - Change from `/api/emily/tasks/*` to `/api/v1/tasks`
   - Switch from `POST` to proper HTTP methods (`POST`, `PUT`, `DELETE`)
   - Add `X-Source: telegram` header
   - Add delete-by-name example using `DELETE /api/v1/tasks?name=...`
   - Update response parsing examples

**Files to modify:**
- `/root/.openclaw/workspace/skills/cashflow-skill/SKILL.md`
- `/root/.openclaw/workspace/skills/task-skill/SKILL.md`

**Acceptance criteria:**
- Emily can create/read/update/delete cashflow entries via v1 API
- Emily can create/read/update/delete tasks via v1 API
- Activity logs show correct source as `telegram`

---

### Phase 5: Deprecation + Cleanup
**Effort:** ~1 hour | **Risk:** Low

1. Add deprecation warnings to legacy `/api/*` routes (log a warning)
2. Delete `backend/chat-commands.js` (dead code, 573 lines)
3. Remove `/api/emily/tasks/*` endpoints from `server.js`
4. Set timeline to remove legacy routes (e.g., 30 days after migration)
5. Update nginx config if WebSocket headers are missing
6. Final review of `swagger.yaml` against actual implementation

**Files to modify:**
- `backend/server.js` (add deprecation warnings, remove emily task routes)

**Files to delete:**
- `backend/chat-commands.js`

**Acceptance criteria:**
- Legacy routes log deprecation warning
- Dead code removed
- WebSocket chat works through nginx

---

## 5. Migration Strategy

### Backward Compatibility
- **Phase 2** keeps legacy routes working alongside v1
- **Phase 3-4** can happen in parallel (frontend and Emily skills are independent consumers)
- **Phase 5** deprecates legacy only after both consumers are migrated and tested

### Rollback Plan
- Git branch: `feature/api-swagger-migration`
- Each phase is a separate commit
- Legacy routes remain functional until Phase 5
- If issues arise: revert to legacy routes, consumers still work

### Testing Strategy
| What | How |
|------|-----|
| API endpoints | Manual testing via Swagger UI "Try it out" |
| Frontend | Manual testing of all CRUD operations |
| Emily skills | Test each skill command via Telegram |
| WebSocket | Test chat widget in browser |

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Emily skills break during migration | Medium | High | Keep legacy routes until skills are verified |
| Task ID conflict during transition | Low | Medium | Unify ID generation before anything else |
| WebSocket URL change breaks chat | Low | High | Test thoroughly, update nginx config |
| Response format change breaks frontend | Low | Medium | Update frontend API clients in same PR |

---

## 7. Out of Scope (Future Improvements)

These are NOT part of this migration but noted for future:

1. **JWT Authentication** -- Replace shared password with token-based auth
2. **Rate Limiting** -- Add express-rate-limit middleware
3. **Database Migration** -- Move from JSON files to SQLite/PostgreSQL
4. **Input Sanitization** -- Add XSS protection and input sanitization
5. **API Keys** -- Per-client API keys for Emily vs web app
6. **CORS Configuration** -- Proper CORS headers for production
7. **Health Check Endpoint** -- `GET /api/v1/health`
8. **Pagination** -- Add `page`, `limit`, `offset` to list endpoints

---

## 8. File Change Summary

### New Files
| File | Purpose |
|------|---------|
| `backend/swagger.yaml` | OpenAPI 3.0 specification |
| `backend/routes/v1/cashflow.js` | Cashflow v1 routes |
| `backend/routes/v1/tasks.js` | Task v1 routes |
| `backend/routes/v1/activity-logs.js` | Activity log v1 routes |
| `backend/middleware/response.js` | Response envelope helpers |
| `backend/middleware/source.js` | X-Source header parsing |

### Modified Files
| File | Changes |
|------|---------|
| `backend/server.js` | Mount v1 routes, swagger UI, deprecation warnings |
| `backend/package.json` | Add swagger-ui-express, yamljs |
| `frontend/src/api/cashflow.ts` | v1 URLs, envelope unwrap, error handling |
| `frontend/src/api/tasks.ts` | v1 URLs, envelope unwrap, error handling |
| `frontend/src/api/activity.ts` | v1 URLs, envelope unwrap, error handling |
| `frontend/src/hooks/useChat.ts` | v1 WebSocket URL |
| `skills/cashflow-skill/SKILL.md` | v1 URLs, X-Source header, response format |
| `skills/task-skill/SKILL.md` | v1 URLs, proper HTTP methods, X-Source header |

### Deleted Files
| File | Reason |
|------|--------|
| `backend/chat-commands.js` | Dead code (573 lines, never invoked) |

---

## 9. Completion Summary

**Completed:** February 18, 2026

### Phase 1: OpenAPI Spec + Swagger UI ✅
- Created `backend/swagger.yaml` with full OpenAPI 3.0 spec
- Installed `swagger-ui-express` and `yamljs` packages
- Mounted Swagger UI at `/api-docs`

### Phase 2: Backend Refactor - Versioned Routes ✅
- Created route modules:
  - `backend/routes/v1/cashflow.js`
  - `backend/routes/v1/tasks.js`
  - `backend/routes/v1/activity-logs.js`
- Implemented response envelope helpers (`middleware/response.js`)
- Implemented X-Source header middleware (`middleware/source.js`)
- Unified task ID generation
- Mounted v1 routes at `/api/v1/`
- Added deprecation warnings to legacy routes

### Phase 3: Frontend Migration ✅
- Updated all API clients to use `/api/v1`
- Implemented response envelope unwrapping
- Added proper error handling (reads `error.message`)
- Added `X-Source: web_app` header to all requests
- Frontend builds successfully

### Phase 4: Emily Skills Migration ✅
- Updated `cashflow-skill/SKILL.md` to v1 API with X-Source header
- Updated `task-skill/SKILL.md` to v1 API with proper REST methods
- Activity logging verified with correct source

### Phase 5: Deprecation + Cleanup ✅
- Removed dead code (`chat-commands.js` - 572 lines)
- Removed unused imports from server.js
- Swagger spec updated with v1 endpoints

### New Endpoints Available

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/cashflow` | List transactions |
| `POST` | `/api/v1/cashflow` | Create transaction |
| `GET` | `/api/v1/cashflow/:id` | Get single transaction |
| `PUT` | `/api/v1/cashflow/:id` | Update transaction |
| `DELETE` | `/api/v1/cashflow/:id` | Delete transaction |
| `GET` | `/api/v1/cashflow/summary` | Financial summary |
| `GET` | `/api/v1/tasks` | List tasks |
| `POST` | `/api/v1/tasks` | Create task |
| `GET` | `/api/v1/tasks/:id` | Get single task |
| `PUT` | `/api/v1/tasks/:id` | Update task |
| `DELETE` | `/api/v1/tasks/:id` | Delete task |
| `DELETE` | `/api/v1/tasks?name=...` | Delete by name |
| `GET` | `/api/v1/activity-logs` | List logs |
| `GET` | `/api/v1/activity-logs/stats` | Log statistics |
| `POST` | `/api/v1/activity-logs` | Create log |
| `GET` | `/api-docs` | Swagger UI |

