# CPU Optimization Plan - OpenCode & OpenClaw

**Date:** 2026-02-26  
**Author:** Emily (OpenClaw Agent)  
**Purpose:** Reduce CPU usage from 200% to acceptable levels

---

## Executive Summary

When running OpenCode via SSH tunnel, CPU usage spikes to 200%. Investigation revealed multiple contributing factors that can be optimized.

---

## Current System State

### Running Processes (CPU Usage)
| Process | CPU % | Status |
|---------|-------|--------|
| opencode (main) | ~50% | Main culprit when active |
| openclaw-gateway | ~12.5% | Always running |
| MCP servers (npx) | ~2-4% each | 4 inefficient processes |
| PM2 (cashflow-backend) | 0% | Normal |
| PM2 (find-your-seat) | 0% | Normal |
| pm2-logrotate | 0% | Normal |
| fail2ban | <1% | Normal (spikes during attacks) |

### System Resources
- **CPU Cores:** 2
- **Memory:** ~3.8GB total, ~686MB free

---

## Root Cause Analysis

### Primary Issues

1. **MCP Server Overhead**
   - `puppeteer` MCP spawns headless Chrome (extremely CPU intensive)
   - `sequential-thinking` MCP runs inefficiently via `npx -y`
   - Multiple MCPs spawning separate Node processes

2. **OpenClaw Configuration**
   - Two agents configured (main + ven) but only one typically used
   - Local browser enabled (headless Chrome) competing for resources

3. **Process Inefficiency**
   - Using `npx -y` instead of globally installed packages
   - Each MCP spawns separate process with full Node runtime

### Secondary Factors

- **fail2ban:** Normal operation, CPU spikes only during SSH attack bursts
- **PM2:** Both apps running with minimal footprint (0% CPU)
- **Browserless.io:** Already configured but not used as primary

---

## Optimization Actions

### Action 1: Disable High-CPU MCPs

**File:** `/root/.config/opencode/opencode.json`

**Changes:**
- ❌ Remove `puppeteer` MCP (use browserless.io instead)
- ❌ Remove `sequential-thinking` MCP (OpenCode has built-in reasoning)
- ✅ Keep `brave-search` MCP (primary search tool)
- ✅ Keep `context7` MCP (remote, low overhead)

### Action 2: Disable Unused Agent

**File:** `/root/.openclaw/openclaw.json`

**Changes:**
- ❌ Disable `ven` agent (set `enabled: false`)
- ✅ Keep `main` agent active

### Action 3: Disable Local Browser

**File:** `/root/.openclaw/openclaw.json`

**Changes:**
- ❌ Set `browser.enabled: false` (use browserless.io service)

---

## Configuration Changes Summary

### Before (Problematic)

```json
// /root/.config/opencode/opencode.json
{
  "mcp": {
    "brave-search": { "enabled": true },
    "context7": { "enabled": true },
    "sequential-thinking": { "enabled": true },  // ❌ Remove
    "puppeteer": { "enabled": true }              // ❌ Remove
  }
}

// /root/.openclaw/openclaw.json
{
  "agents": {
    "list": [
      { "id": "main" },     // ✅ Keep
      { "id": "ven" }       // ❌ Disable
    ]
  },
  "browser": {
    "enabled": true         // ❌ Disable local
  }
}
```

### After (Optimized)

```json
// /root/.config/opencode/opencode.json
{
  "mcp": {
    "brave-search": { "enabled": true },
    "context7": { "enabled": true }
  }
}

// /root/.openclaw/openclaw.json
{
  "agents": {
    "list": [
      { "id": "main", "enabled": true },
      { "id": "ven", "enabled": false }
    ]
  },
  "browser": {
    "enabled": false
  }
}
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| OpenCode CPU (idle) | ~50% | ~10-15% |
| OpenCode CPU (active) | ~100%+ | ~30-40% |
| MCP Processes | 4 | 2 |
| Headless Chrome | 1-2 instances | 0 (browserless.io) |

---

## Rollback Plan

If issues occur:
1. Restore `/root/.config/opencode/opencode.json` from backup
2. Restore `/root/.openclaw/openclaw.json` from backup
3. Restart OpenCode session

---

## Monitoring

After changes, monitor with:
```bash
ps aux --sort=-%cpu | head -10
top -bn1
```

---

## References

- OpenClaw Config: `/root/.openclaw/openclaw.json`
- OpenCode Config: `/root/.config/opencode/opencode.json`
- PM2 Status: `pm2 list`
- Fail2ban Status: `fail2ban-client status`
