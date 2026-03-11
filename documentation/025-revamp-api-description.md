# Task 025: Revamp API
**Created:** Feb 20 2026
**Updated:** Mar 10, 2026
**Status:** PHASE 7 COMPLETE — X-Password removed, JWT only

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
| PM2 prod app | `cashflow-backend` (ID: 4) — online, 6 restarts, 0 unstable |
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
| RAM available | ~1.0Gi — stable |
| PM2 logrotate | Module ID 0, online |
| Module system | CommonJS — `require/module.exports` ONLY |
| Database path | `backend/db/cashflow.db` |
| Production DB users | admin, user — seeded with SHA256 hashed passwords |
| Emily API Key | `cfm_c8fca68bf28e3e272670211894d12fa00cef3993a22622a778b5c1523698c7d7` |
| Staging DB | `backend/db/cashflow.db` (isolated copy) |
| Production log dir | `/var/log/cashflow` |
| Staging log dir | `/var/log/cashflow-staging` |
| ecosystem.config.js | `/var/www/cashflow-manager/backend/ecosystem.config.js` |
| Auth | JWT + API key only (X-Password removed) |

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
| `FEATURE_JWT_ENABLED` | Removed (always on) | Removed (always on) |
| `FEATURE_LEGACY_PASSWORD` | Removed | `true` ✅ |
| `FEATURE_REDIS_REQUIRED` | `false` | `false` |
| `AUTH_REDIS_FALLBACK` | `closed` | `closed` |

Rollback = requires code revert (no feature flag).

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
| **Phase 7** | Cleanup + X-Password removal | ✅ Done | ✅ Complete |

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
| X-Password disabled (gate) | Mar 10, 2026 | ✅ |
| Phase 7 cleanup | Mar 10, 2026 | ✅ |

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
FEATURE_REDIS_REQUIRED=false
AUTH_REDIS_FALLBACK=closed
REDIS_URL=redis://127.0.0.1:6379/0
CORS_ALLOWED_ORIGINS=https://46.225.69.45
JWT_SECRET=<64-char hex — production unique>
JWT_REFRESH_SECRET=<64-char hex — production unique>
```

> ⚠️ FEATURE_JWT_ENABLED and FEATURE_LEGACY_PASSWORD removed (JWT always on, X-Password removed)
> ⚠️ JWT secrets must be different from staging secrets.
> ⚠️ Never commit .env to git.

---

## PHASE 6 + 7 — Client Migration + Cleanup (COMPLETE)

**Staging is permanent — do NOT teardown.**

Done:
1. ✅ Disabled X-Password in production `.env` (`FEATURE_LEGACY_PASSWORD=false`)
2. ✅ Removed `verifyPassword` function from `server.js`
3. ✅ Removed `verifyLegacyPassword` function from `server.js`
4. ✅ Removed all `verifyPassword` references (15 occurrences)
5. ✅ Updated deprecated `/api/*` routes to use JWT/API key auth
6. ✅ Updated SSE endpoint to use JWT/API key auth
7. ✅ Removed `FEATURE_LEGACY_PASSWORD` flag from `config/features.js`
8. ✅ Removed `FEATURE_JWT_ENABLED` flag from `config/features.js` (JWT always on)
9. ✅ Cleaned up `.env` (removed both feature flags)
10. ✅ Staging remains as permanent dev environment (`FEATURE_LEGACY_PASSWORD=true`)

**Verified:**
- X-Password auth rejected: ✅ `{"error":"Authentication required"}`
- JWT auth works: ✅
- API key auth works: ✅
- Health endpoint: ✅

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

- [x] All v1 endpoints secured (JWT or API key)
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
- [x] Feature flag for Redis (FEATURE_REDIS_REQUIRED)
- [x] JWT active in production
- [x] Emily agent authenticated via API key
- [x] Frontend authenticated via JWT
- [x] X-Password disabled after 48hr zero-usage gate
- [x] X-Password code deleted in Phase 7
- [x] Staging kept permanently as dev environment
- [x] Production never had uncontrolled downtime

---

## Next Action

**Phase 7 ✅ complete as of Mar 10, 2026.**

Production is running with:
- JWT enabled (always on)
- Frontend using JWT authentication ✅
- Emily agent using X-API-Key ✅
- X-Password completely removed ✅

**Task 025 — Revamp API: COMPLETE**

All phases complete. The API is now secured with:
- JWT for web frontend
- API key for Emily agent
- No legacy X-Password authentication

*Last updated: Mar 10, 2026 — Phase 7 complete*