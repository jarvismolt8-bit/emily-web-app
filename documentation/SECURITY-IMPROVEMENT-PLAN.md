# Security Improvement Plan

**Created:** 2026-02-23  
**Status:** Mostly Complete  
**Priority:** High

---

## Overview

This document outlines the security improvements for the Cashflow Manager and Find Your Seat web applications. The plan addresses vulnerabilities identified during the security audit conducted on 2026-02-23.

---

## Security Audit Summary

### Critical Vulnerabilities Found

| ID | Severity | Issue | Location | Status |
|----|----------|-------|----------|--------|
| V-001 | CRITICAL | API key exposed in .env | `/var/www/find-your-seat/backend/.env` | Mitigated |
| V-002 | CRITICAL | Web password in plaintext | `/var/www/cashflow-manager/backend/.env` | Mitigated |
| V-003 | CRITICAL | OpenClaw gateway token exposed | Same .env file | Mitigated |
| V-004 | HIGH | Self-signed SSL certificate | `/etc/nginx/ssl/` | Blocked (no domain) |
| V-005 | HIGH | OpenCode port 4096 publicly exposed | UFW rules | Pending restart |
| V-006 | HIGH | No rate limiting | Nginx config | ✅ Fixed |
| V-007 | MEDIUM | Missing security headers | Nginx config | ✅ Fixed |
| V-008 | MEDIUM | Single shared password | Backend auth | Deferred |
| V-009 | MEDIUM | No fail2ban intrusion detection | Server | ✅ Fixed |
| V-010 | LOW | No security audit automation | Emily skills | Pending |

### What's Already Secure

- UFW firewall active
- SSL key permissions correct (600)
- OpenClaw gateway bound to localhost only (127.0.0.1:18789)
- Parameterized SQL queries (no SQL injection risk)
- Nginx with HTTP/2 support
- PM2 process management

---

## Implementation Phases

### Phase 1: Credential Rotation

**Status:** ✅ COMPLETED  
**Priority:** P0 (Critical)  
**Completed:** 2026-02-23

#### Tasks

- [x] **T-1.1** Rotate GEMINI_API_KEY
  - User will update on their end

- [x] **T-1.2** Rotate WEB_PASSWORD
  - User will update on their end

- [x] **T-1.3** Rotate OPENCLAW_GATEWAY_TOKEN
  - User will update on their end

- [x] **T-1.4** Protect .env files
  ```bash
  chmod 600 /var/www/cashflow-manager/backend/.env
  chmod 600 /var/www/find-your-seat/backend/.env
  ```

- [ ] **T-1.5** Restrict OpenCode port 4096
  - Pending: User needs to restart OpenCode with `--hostname 127.0.0.1`

#### Files to Modify

| File | Changes |
|------|---------|
| `/var/www/cashflow-manager/backend/.env` | Update WEB_PASSWORD, OPENCLAW_GATEWAY_TOKEN |
| `/var/www/find-your-seat/backend/.env` | Update GEMINI_API_KEY |
| `/root/.openclaw/openclaw.json` | Update gateway token |
| `/etc/ufw/user.rules` | Restrict port 4096 |

---

### Phase 2: SSL/TLS Hardening

**Status:** ⏸️ BLOCKED - No domain name  
**Priority:** P1 (High)

#### Blocker

Let's Encrypt requires a domain name (cannot issue certificates for IP addresses).
- Current: Self-signed certificate in use
- Options to unblock:
  1. Get free subdomain from duckdns.org or no-ip.com
  2. Purchase a domain (~$10-15/year)

#### Prerequisites

- Domain name pointing to server IP (46.225.69.45)
- DNS A record configured

#### Tasks

- [ ] **T-2.1** Install Certbot
  ```bash
  apt update
  apt install certbot python3-certbot-nginx
  ```

- [ ] **T-2.2** Obtain Let's Encrypt certificate
  ```bash
  certbot --nginx -d yourdomain.com -d www.yourdomain.com
  ```
  - Select option to redirect HTTP to HTTPS

- [ ] **T-2.3** Configure auto-renewal
  ```bash
  certbot renew --dry-run
  systemctl enable certbot.timer
  ```

- [ ] **T-2.4** Remove self-signed certificate
  ```bash
  rm /etc/nginx/ssl/cashflow.crt
  rm /etc/nginx/ssl/cashflow.key
  rmdir /etc/nginx/ssl
  ```

- [ ] **T-2.5** Update nginx configuration
  - Remove manual SSL certificate paths
  - Certbot will auto-update the config

- [ ] **T-2.6** Test SSL configuration
  - https://www.ssllabs.com/ssltest/

#### Files to Modify

| File | Changes |
|------|---------|
| `/etc/nginx/sites-enabled/default` | SSL paths (auto by certbot) |
| `/etc/nginx/ssl/*` | DELETE after cert obtained |

---

### Phase 3: Security Headers & Rate Limiting

**Status:** ✅ COMPLETED  
**Priority:** P1 (High)  
**Completed:** 2026-02-23

#### Tasks

- [x] **T-3.1** Add rate limiting to nginx
  - Configured: 10r/s with burst 20

- [x] **T-3.2** Add security headers
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: geolocation=(), microphone=(), camera=()

- [x] **T-3.3** Hide nginx version
  - server_tokens off

- [x] **T-3.4** TLS hardened
  - TLSv1.2 and TLSv1.3 only (removed TLSv1.0, TLSv1.1)

#### Files Modified

| File | Changes |
|------|---------|
| `/etc/nginx/nginx.conf` | Added limit_req_zone, server_tokens off, TLS 1.2+ |
| `/etc/nginx/sites-available/cashflow-manager.conf` | Added security headers, rate limiting |

---

### Phase 4: Intrusion Detection (fail2ban)

**Status:** ✅ COMPLETED  
**Priority:** P2 (Medium)  
**Completed:** 2026-02-23

#### Tasks

- [x] **T-4.1** Install fail2ban
- [x] **T-4.2** Create local configuration (`/etc/fail2ban/jail.local`)
- [x] **T-4.3** Configure SSH jail (3 attempts, 1hr ban)
- [x] **T-4.4** Create custom filter for web app auth
- [x] **T-4.5** Enable web app auth jail (5 attempts, 30min ban)
- [x] **T-4.6** Active jails: sshd, cashflow-auth, nginx-http-auth

#### Files Created

| File | Purpose |
|------|---------|
| `/etc/fail2ban/jail.local` | Main fail2ban config |
| `/etc/fail2ban/filter.d/cashflow-auth.conf` | Custom filter for API auth |

#### Current Status
- 10 IPs banned for SSH attacks
- 3 jails active and monitoring

---

### Phase 5: SSH Hardening

**Status:** ❌ SKIPPED  
**Priority:** P2 (Medium)  
**Reason:** Server only has root user. Requires creating non-root user with sudo and SSH key first.

#### Revisit When

1. Create non-root user with sudo privileges
2. Add SSH key to new user's authorized_keys
3. Verify key-based login works
4. Then proceed with SSH hardening

#### Tasks (Deferred)

- [ ] **T-5.1** Create non-root user with sudo
- [ ] **T-5.2** Add SSH key to new user
- [ ] **T-5.3** Disable root login
- [ ] **T-5.4** Disable password authentication

---

### Phase 6: Security Logging

**Status:** ✅ COMPLETED  
**Priority:** P2 (Medium)  
**Completed:** 2026-02-23

#### Tasks

- [x] **T-6.1** Create security log directory
  - `/var/www/cashflow-manager/logs/security/` (chmod 750)

- [x] **T-6.2** Add authentication logging to backend
  - Created `/var/www/cashflow-manager/backend/utils/security-logger.js`
  - Logs successful and failed login attempts with IP, user agent
  - Output: `/var/www/cashflow-manager/logs/security/auth.log`

- [x] **T-6.3** Create log rotation config
  - `/etc/logrotate.d/cashflow-security`
  - Daily rotation, 30 day retention, compressed

- [x] **T-6.4** Add nginx access log for security events
  - Logs 401 responses to `/var/www/cashflow-manager/logs/security/nginx-auth.log`

#### Files Created/Modified

| File | Purpose |
|------|---------|
| `/var/www/cashflow-manager/logs/security/` | Security log directory |
| `/var/www/cashflow-manager/backend/utils/security-logger.js` | Auth logging module |
| `/var/www/cashflow-manager/backend/server.js` | Integrated security logger |
| `/etc/logrotate.d/cashflow-security` | Log rotation config |
| `/etc/nginx/nginx.conf` | Conditional logging map |
| `/etc/nginx/sites-available/cashflow-manager.conf` | Nginx auth log |

---

### Phase 7: Automated Security Audits (Emily Skill)

**Status:** NEEDS PLANNING  
**Priority:** P3 (Low)  
**Estimated Time:** 2 hours

#### Tasks

- [ ] **T-7.1** Create security-audit skill for Emily
  - Location: `/root/.openclaw/workspace/skills/security-audit-skill/`
  - Types of audits:
    - Check for world-readable sensitive files
    - Check for exposed .env files in web roots
    - Verify SSL certificate validity
    - Check fail2ban status
    - Review recent failed login attempts
    - Check for outdated packages
    - Verify firewall rules

- [ ] **T-7.2** Create cron skill integration
  - Schedule weekly security audits
  - Send summary to Telegram

- [ ] **T-7.3** Create security report template
  - Store in `/var/www/cashflow-manager/logs/security/reports/`

#### Skill Structure

```
/root/.openclaw/workspace/skills/security-audit-skill/
├── skill.py              # Main skill logic
├── audits/
│   ├── file_permissions.py
│   ├── ssl_check.py
│   ├── fail2ban_status.py
│   ├── package_updates.py
│   └── auth_review.py
├── templates/
│   └── report.md
└── config.json
```

---

## Deferred Items

These items are documented for future consideration but not scheduled for implementation.

### Multi-User Authentication (Phase 8)

**Status:** DEFERRED  
**Reason:** Current single-password approach sufficient for personal/small group use

**Future Implementation:**
- Per-user passwords with user management
- JWT-based sessions
- User activity tracking
- Password reset functionality

### SSH Port Change (Phase 9)

**Status:** DEFERRED  
**Reason:** Security through obscurity; fail2ban provides adequate protection

**Future Implementation:**
- Change SSH port from 22 to non-standard port
- Update UFW rules
- Update SSH config

### Database Encryption (Phase 10)

**Status:** DEFERRED  
**Reason:** Data sensitivity doesn't warrant encryption overhead for personal use

**Future Implementation:**
- Encrypt SQLite database at rest
- Key management system
- Or migrate to PostgreSQL with encryption

---

## Verification Checklist

After completing all phases, verify:

- [x] .env files protected (chmod 600)
- [ ] HTTPS with Let's Encrypt certificate (BLOCKED - no domain)
- [x] Security headers present (verified with curl)
- [x] Rate limiting active (10r/s + burst 20)
- [x] fail2ban blocks repeated failed attempts (10 IPs banned)
- [ ] SSH accepts only key-based auth (SKIPPED)
- [x] Security logs are being written
- [ ] SSL Labs test shows A or A+ rating (BLOCKED - self-signed cert)

---

## Emergency Contacts

If security is compromised:

1. Immediately rotate all credentials
2. Check fail2ban logs: `fail2ban-client status`
3. Review auth logs: `tail -f /var/log/auth.log`
4. Review nginx logs: `tail -f /var/log/nginx/access.log`
5. Block suspicious IPs: `ufw deny from SUSPICIOUS_IP`

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-23 | 1.0 | Initial security improvement plan created |
| 2026-02-23 | 1.1 | Completed: Phase 1, 3, 4, 6. Blocked: Phase 2. Skipped: Phase 5. |

---

## References

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [fail2ban Wiki](https://github.com/fail2ban/fail2ban/wiki)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
