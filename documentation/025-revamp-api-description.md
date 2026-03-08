# Task 025: Revamp API
**Created:** Feb 20 2026
**Updated:** Mar 07, 2026
**Status:** PHASE 6 COMPLETE — Frontend + Emily migrated, X-Password still active (Phase 6.3 pending)

---

## Agent Instructions

- Reference this document at the start of every phase
- Update this document after every phase, fix, and adjustment
- File name: `task-025-revamp-api.md`
- Update checklist per change:
  - Phase status in roadmap table
  - Confirmed server state if new info gathered
  - Resolved issues table if new issue found/fixed
  - Timeline if dates shift
  - Next action at bottom of document
  - Success criteria checkboxes when items completed
hi
---

## Confirmed Server State

| Item | Value |
|------|-------|
| OS | Ubuntu 24.04.4 LTS |
| PM2 prod app | `cashflow-backend` (ID: 4) — online, 2 restarts, 0 unstable |
| PM2 staging app | `cashflow-staging` (ID: 2) — online, 133 restarts, 0 unstable |
| Production cwd | `/var/www/cashflow-manager/backend` |
| Staging cwd | `/var/www/cashflow-manager-staging/backend` |
| Production port | 3001 |
| Staging port | 3002 |
| Node | v22.22.0 |
| NPM | 10.9.4 |
| PM2 | 6.0.14 |
| Redis | 7.0.15 — running, PONG confirmed |
| Redis prod namespace | DB 0 |
| Redis staging namespace | DB 1 (`REDIS_URL=redis://127.0.0.1:6379/1`) |
| Disk free | 16G |
| RAM available | 1.0Gi — stable, monitor during Phase 6 |
| PM2 logrotate | Module ID 0, online |
| Module system | CommonJS — `require/module.exports` ONLY |
| Database path | `backend/db/cashflow.db` |
| Production DB users | admin, user — seeded with SHA256 hashed passwords |
| Emily API Key | `cfm_c8fca68bf28e3e272670211894d12fa00cef3993a22622a778b5c1523698c7d7` |
| Staging DB | `backend/db/cashflow.db` (isolated copy) |
| Production log dir | `/var/log/cashflow` |
| Staging log dir | `/var/log/cashflow-staging` |
| ecosystem.config.js | `/var/www/cashflow-manager/backend/ecosystem.config.js` |

> ⚠️ NO SWAP. OOM killer active if RAM exhausted.
> ⚠️ VSCode + opencode processes consume ~2.5Gi RAM when active. Monitor with `free -h`.
> ⚠️ ALL files must use CommonJS. Never use import/export.
> ⚠️ Always run `node -c <file>` before pm2 restart.
> ⚠️ Never use `cat << EOF` heredoc in terminal — always use nano for file writes.

---

## Environment Architecture

| | Production | Staging |
|-|------------|---------|
| Directory | `/var/www/cashflow-manager` | `/var/www/cashflow-manager-staging` |
| Port | 3001 | 3002 |
| PM2 name | `cashflow-backend` | `cashflow-staging` |
| PM2 ID | 4 (may change on restart) | 2 (may change on restart) |
| ENV file | `.env` | `.env.staging` |
| Database | `db/cashflow.db` | `db/cashflow.db` (isolated) |
| Redis | DB 0 | DB 1 |
| Logs | `/var/log/cashflow/` | `/var/log/cashflow-staging/` |
| Memory cap | None | 300MB PM2 |
| Module system | CommonJS | CommonJS |

> ⚠️ PM2 IDs change on stop/delete/restart cycles. Always use app NAME not ID.
> Use `pm2 restart cashflow-backend` not `pm2 restart 4`

---

## Feature Flag System — Current State

| Flag | Production | Staging |
|------|------------|---------|
| `FEATURE_JWT_ENABLED` | `true` ✅ | `true` ✅ |
| `FEATURE_LEGACY_PASSWORD` | `true` ✅ | `true` ✅ |
| `FEATURE_REDIS_REQUIRED` | `false` | `false` |
| `AUTH_REDIS_FALLBACK` | `closed` | `closed` |

Rollback = flip env var + `pm2 restart cashflow-backend`. No code revert needed.

---

## All Resolved Issues

| # | Issue | Resolution |
|---|-------|------------|
| 1 | generateRefreshToken not async | Fixed |
| 2 | Redis single point of failure | Fixed: fallback in lib/redis.js |
| 3 | AUTH_REDIS_FALLBACK=open dangerous | Fixed: always closed |
| 4 | Refresh token not fingerprinted | Fixed: ipHash + userAgent |
| 5 | tokenVersion unimplemented | Fixed: DB migration + increment |
| 6 | credentialsRequired: false | Fixed |
| 7 | No token revocation | Fixed: Redis blocklist with jti |
| 8 | No refresh token mechanism | Fixed: 15min access + 7d refresh |
| 9 | CORS callback bug | Fixed |
| 10 | Sunset date impossible | Fixed: gate-dependent |
| 11 | Sunset too long | Fixed: ~3 weeks |
| 12 | Log rotation missing | Fixed: pino-roll 10MB/30-file |
| 13 | Log directory not created | Fixed |
| 14 | Permission model unspecified | Fixed: read/write/admin DB-validated |
| 15 | Error responses leak info | Fixed: always generic 401 |
| 16 | No HTTPS enforcement | Fixed: Nginx redirect |
| 17 | Open register endpoint | Fixed: admin-provisioned only |
| 18 | Emily agent using JWT | Fixed: API key M2M |
| 19 | No account lockout | Fixed: progressive lockout |
| 20 | Rate limiting too coarse | Fixed: tiered per endpoint |
| 21 | Cookie flags missing | Fixed: httpOnly, secure, sameSite:strict |
| 22 | Helmet CSP not configured | Fixed: explicit directives |
| 23 | No dev environment | Fixed: isolated staging port 3002 |
| 24 | Rollback required code revert | Fixed: feature flags |
| 25 | Parallel client migration risky | Fixed: sequential |
| 26 | ESM import/export used | Fixed: CommonJS throughout |
| 27 | express-jwt v7 breaking change | Fixed: removed |
| 28 | routes/auth.js exported objects not Router | Fixed |
| 29 | authRoutes not imported in server.js | Fixed |
| 30 | cat heredoc ran as shell commands | Fixed: always use nano |
| 31 | verifyJwtOrApiKey missing X-Password fallback | Fixed: Phase 4 |
| 32 | PM2 env cache not clearing on restart | Fixed: stop/delete/start cycle |
| 33 | JWT_SECRET missing from production .env | Fixed: generated and added |
| 34 | v1/auth routes not registered in production server.js | Fixed: added with feature flag block |
| 35 | Production users table empty | Fixed: seeded admin + user with SHA256 passwords |
| 36 | users table column named password not password_hash | Fixed: used correct column name |

---

## Phase Roadmap

| Phase | Name | Production Touched? | Status |
|-------|------|---------------------|--------|
| **Phase 0** | Staging environment setup | ❌ Never | ✅ Complete |
| **Phase 1** | Security middleware | ❌ Never | ✅ Complete |
| **Phase 2** | JWT infrastructure | ❌ Never | ✅ Complete |
| **Phase 3** | Emily agent M2M API key | ❌ Never | ✅ Complete |
| **Phase 4** | Permissions + audit logging + health | ❌ Never | ✅ Complete + Fixed |
| **Phase 5** | Production deployment | ✅ Done | ✅ Complete |
| **Phase 6** | Client migration (frontend + Emily) | ✅ Done | ✅ Complete |
| **Phase 7** | Cleanup + X-Password removal | ✅ Final | ⏳ Pending |

---

## Target Timeline

| Milestone | Target | Status |
|-----------|--------|--------|
| Phase 0 complete | Mar 5, 2026 | ✅ |
| Phase 1 complete | Mar 5, 2026 | ✅ |
| Phase 2 complete | Mar 5, 2026 | ✅ |
| Phase 3 complete | Mar 5, 2026 | ✅ |
| Phase 4 complete | Mar 5, 2026 | ✅ |
| Phase 5 complete | Mar 5, 2026 | ✅ |
| Frontend migrated to JWT | Mar 6, 2026 | ✅ |
| Emily agent migrated to API key | Mar 6, 2026 | ✅ |
| X-Password disabled (gate) | ~Mar 8, 2026 | ⏳ |
| Phase 7 cleanup | Apr 6, 2026 | ⏳ |

---

## Production — Verified State (Mar 5, 2026)

| Test | Result |
|------|--------|
| Health endpoint | ✅ `{"status":"ok","redis":"healthy","jwt":true}` |
| X-Password auth | ✅ JSON cashflow data |
| JWT Bearer auth | ✅ JSON cashflow data |
| JWT login | ✅ Access token returned |
| Redis | ✅ Healthy, DB 0 |
| Rate limiting | ✅ Active |
| Security headers | ✅ CSP, HSTS, noSniff, Referrer-Policy |
| Production restarts | ✅ 2 restarts, 0 unstable |
| RAM | ✅ 1.0Gi available |

---

## Production .env — Required Keys

```env
PORT=3001
WEB_PASSWORD=<value>
DATABASE_PATH=/var/www/cashflow-manager/backend/db/cashflow.db
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=<value>
FEATURE_JWT_ENABLED=true
FEATURE_LEGACY_PASSWORD=true
FEATURE_REDIS_REQUIRED=false
AUTH_REDIS_FALLBACK=closed
REDIS_URL=redis://127.0.0.1:6379/0
CORS_ALLOWED_ORIGINS=https://46.225.69.45
JWT_SECRET=<64-char hex — production unique>
JWT_REFRESH_SECRET=<64-char hex — production unique>
```

> ⚠️ JWT secrets must be different from staging secrets.
> ⚠️ Never commit .env to git.

---

## PHASE 6 — Client Migration (COMPLETE)

**Sequential only. Frontend first, then Emily. Never parallel.**
**X-Password killed by condition, not date.**

### Phase 6.1 — Frontend migration ✅ COMPLETE

Done:
1. Created `frontend/src/api/auth.ts` with JWT login, logout, refresh
2. Updated `frontend/src/api/tasks.ts`, `cashflow.ts`, `activity.ts` to use Bearer token
3. Updated `frontend/src/hooks/useAuth.ts` with JWT auth state
4. Updated `frontend/src/components/PasswordGate.tsx` to accept username/password
5. Built and deployed to production

Tested: Login works, data loads with JWT ✅

### Phase 6.2 — Emily agent migration ✅ COMPLETE

Done:
1. Generated API key via `/api/v1/api-key/generate` (requires admin JWT)
2. Updated all skills to use `X-API-Key` header:
   - `task-skill/SKILL.md`
   - `cashflow-skill/SKILL.md`
   - `cashflow-skill/SKILL-ESSENTIAL.md`
   - `task-doc-skill/SKILL.md`

API Key: `cfm_c8fca68bf28e3e272670211894d12fa00cef3993a22622a778b5c1523698c7d7`

Tested: Read/write operations work with X-API-Key ✅

### Phase 6.3 — X-Password disable gate

```
CONDITION: ZERO X-Password requests for 48 consecutive hours
CHECK:     grep -i "x-password" /var/log/cashflow/audit.log | tail -5
TARGET:    ~March 8, 2026
```

Once gate passes:
```bash
sed -i 's/FEATURE_LEGACY_PASSWORD=true/FEATURE_LEGACY_PASSWORD=false/' \
  /var/www/cashflow-manager/backend/.env
pm2 restart cashflow-backend
# Monitor 24 hours — then proceed to Phase 7
```

---

## PHASE 7 — Cleanup

**Staging is permanent — do NOT teardown.**

1. Delete X-Password code from production `server.js`:
   - `verifyPassword` function (lines ~105-115)
   - `verifyLegacyPassword` function (lines ~126-136)
   - All `app.use` references to these functions
   - WebSocket password check
2. Remove `FEATURE_LEGACY_PASSWORD` flag and its conditionals
3. Remove `FEATURE_JWT_ENABLED` flag (JWT is now always on)
4. Remove `express-jwt` from package.json if still present
5. Final swagger.yaml cleanup
6. **Staging remains as permanent dev environment**
7. Final security checklist sign-off

---

## Rollback Procedures

### Staging — restore file from production
```bash
cp /var/www/cashflow-manager/backend/<file> \
   /var/www/cashflow-manager-staging/backend/<file>
pm2 restart cashflow-staging
```

### Production — under 60 seconds
```bash
# Edit /var/www/cashflow-manager/backend/.env
# Flip the relevant flag
pm2 restart cashflow-backend
```

### Emergency
```bash
pm2 restart cashflow-backend
pm2 logs cashflow-backend --lines 50 --nostream
```

---

## Success Criteria

- [x] All v1 endpoints secured (JWT or API key or legacy password during transition)
- [x] Access tokens expire in 15 minutes
- [x] Rotating refresh tokens in HttpOnly cookies
- [x] Token revocation via Redis blocklist (jti)
- [x] Token version increments invalidate all sessions
- [x] Tiered rate limiting per endpoint
- [x] Account lockout after 5 failed attempts (progressive)
- [x] CORS whitelist, no wildcard origins
- [x] Audit logging with 10MB rotation, 30 files retained
- [x] Generic error responses, no user/password distinction
- [x] Helmet CSP explicitly configured
- [x] Environment separation (separate secrets + Redis namespaces)
- [x] Redis fails closed (503), never open
- [x] Feature flags control all new functionality
- [x] JWT active in production
- [x] Emily agent authenticated via API key
- [x] Frontend authenticated via JWT
- [ ] X-Password disabled after 48hr zero-usage gate
- [ ] X-Password code deleted in Phase 7
- [x] Staging kept permanently as dev environment
- [x] Production never had uncontrolled downtime

---

## Next Action

**Phase 6 ✅ complete as of Mar 6, 2026.**

Production is running with:
- JWT enabled (`FEATURE_JWT_ENABLED=true`)
- Frontend using JWT authentication ✅
- Emily agent using X-API-Key ✅
- X-Password still active (`FEATURE_LEGACY_PASSWORD=true`) — backward compatible

**Next: Phase 6.3 — Monitor X-Password usage for 48 hours, then disable**

Check X-Password usage:
```bash
grep -i "x-password" /var/log/cashflow/audit.log | tail -5
```

*Last updated: Mar 6, 2026 — Phase 6 complete, Phase 6.3 pending*