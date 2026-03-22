# Task 089: Browser visible in my server

**Created:** Mar 22 2026 | **Updated:** Mar 22, 2026

## Plan Notes

- **Objective:** Run a persistent Chrome browser on the server, visible to humans at `/browser`, and controllable by OpenClaw agents via CDP.
- **Scope:** Shared Chrome process (PM2-managed), noVNC viewer, Nginx proxy, extended `browser-skill` with a `shared` profile.
- **Phases:** 1. Setup the browser, 2. Human testing & navigation, 3. Agent navigation
- **Complexity:** Medium
- **Git Branch:** `task/089-browser-visible-server`
- **Skill:** `/root/.openclaw/skills/novnc-skill/SKILL.md`

---

## Development Notes

### Affected Files

| Area | File | Change Type |
|------|------|-------------|
| Script | `/usr/local/bin/start-shared-chrome.sh` | Create — Chrome launcher wrapper |
| Process | `backend/ecosystem.config.js` | Modify — add 4 PM2 app entries |
| Nginx | `nginx/cashflow-manager.conf` | Modify — add `/browser/` location block |
| Skill | `/root/.openclaw/skills/novnc-skill/SKILL.md` | Create — new skill for shared browser control |

### Schema Changes

None.

### API Contract Changes

None. noVNC handles its own WebSocket server; no new backend routes needed.

### Security Considerations

- **CDP port:** Bind to `127.0.0.1` only via `--remote-debugging-address=127.0.0.1`. Never expose port 9222 externally.
- **noVNC:** Bind websockify to `127.0.0.1:6080`. Expose only via Nginx with HTTP Basic Auth.
- **Browser profile:** `/var/lib/openclaw/browser-profile` persists cookies/logins — treat as sensitive, do not back up to shared storage.
- **Agent guard:** The `shared` profile must never call `browser.close()` — this would kill the instance for everyone.

### Dependencies

| Dependency | Status | Install |
|-----------|--------|---------|
| `google-chrome` v144 | ✅ Already installed | — |
| `xvfb` | ✅ Already installed | — |
| `x11vnc` | ❌ Not installed | `apt install x11vnc -y` |
| `novnc` | ❌ Not installed | `apt install novnc -y` |
| `apache2-utils` (htpasswd) | Unknown | `apt install apache2-utils -y` |

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OOM kill — Chrome headed uses 400–600 MB, no swap | Medium | High | Check `free -h` before starting. Close VSCode/opencode if RAM is tight. |
| PM2 restart loop on crash | Low | Medium | Set `max_restarts: 5` and `restart_delay: 3000` in ecosystem config |
| CDP port exposed externally | Low | High | Always use `--remote-debugging-address=127.0.0.1`; verify with `ss -tlnp \| grep 9222` |
| Agent and human navigate simultaneously | Medium | Low | Cooperative by convention — last write wins; acceptable for personal use |

### Alternatives Considered

| Option | Verdict |
|--------|---------|
| systemd instead of PM2 | Rejected — whole stack uses PM2; one tool for all process management |
| New `shared-browser-skill` instead of extending existing | Rejected — `browser-skill` already has multi-profile design; adding `shared` is less surface area |
| Screenshot SSE stream instead of noVNC | Rejected — view-only, more backend code; noVNC gives true interactive control |
| Chrome DevTools UI at `/browser` (proxy `:9222`) | Rejected — shows DevTools, not a real browser view; complex CORS/WebSocket issues |

---

## Implementation Details

**Status:** Approved | **Author:** Architect (/architect)

### Overview

A single Chrome instance runs non-headlessly under Xvfb (virtual display), managed by PM2 alongside the existing backend. x11vnc mirrors the Xvfb display over VNC; noVNC (websockify) serves that VNC session as a web page at `/browser`. Agents connect to the same Chrome via CDP (`http://127.0.0.1:9222`) using a `shared` profile added to the existing `browser-skill`.

---

## Phase 1: Setup the Browser

**Goal:** Install all dependencies, create the Chrome launcher script, and get all four processes running persistently under PM2.

**Deliverable:** `pm2 list` shows `shared-xvfb`, `shared-chrome`, `shared-vnc`, `shared-novnc` all `online`.

---

### Step 1.1 — Install missing packages

```bash
apt install x11vnc novnc apache2-utils -y
```

Verify:
```bash
which x11vnc websockify
ls /usr/share/novnc/vnc.html
```

---

### Step 1.2 — Create the Chrome launcher script

Create `/usr/local/bin/start-shared-chrome.sh`:

```bash
#!/bin/bash
export DISPLAY=:99
mkdir -p /var/lib/openclaw/browser-profile
exec /usr/bin/google-chrome \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --remote-debugging-port=9222 \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir=/var/lib/openclaw/browser-profile \
  --window-size=1280,800
```

Make it executable:
```bash
chmod +x /usr/local/bin/start-shared-chrome.sh
```

---

### Step 1.3 — Add PM2 processes to ecosystem.config.js

Open `backend/ecosystem.config.js` and append the following four entries to the `apps` array:

```javascript
{
  name: 'shared-xvfb',
  script: 'Xvfb',
  args: ':99 -screen 0 1280x800x24',
  interpreter: 'none',
  autorestart: true,
  restart_delay: 2000,
  max_restarts: 5
},
{
  name: 'shared-chrome',
  script: '/usr/local/bin/start-shared-chrome.sh',
  interpreter: 'none',
  autorestart: true,
  restart_delay: 3000,
  max_restarts: 5
},
{
  name: 'shared-vnc',
  script: 'x11vnc',
  args: '-display :99 -nopw -listen 127.0.0.1 -rfbport 5900 -forever -noncache',
  interpreter: 'none',
  autorestart: true,
  restart_delay: 2000,
  max_restarts: 5
},
{
  name: 'shared-novnc',
  script: 'websockify',
  args: '--web /usr/share/novnc 127.0.0.1:6080 127.0.0.1:5900',
  interpreter: 'none',
  autorestart: true,
  restart_delay: 2000,
  max_restarts: 5
}
```

---

### Step 1.4 — Start processes in order

**Order matters:** Xvfb must be up before Chrome; VNC must be up before noVNC.

```bash
# Start Xvfb first and wait for it to be ready
pm2 start ecosystem.config.js --only shared-xvfb
sleep 3

# Start Chrome (needs Xvfb display :99 to exist)
pm2 start ecosystem.config.js --only shared-chrome
sleep 3

# Start x11vnc (mirrors the Xvfb display)
pm2 start ecosystem.config.js --only shared-vnc
sleep 2

# Start noVNC websockify (proxies VNC over WebSocket)
pm2 start ecosystem.config.js --only shared-novnc
```

Verify all are running:
```bash
pm2 list
```

Check RAM is still healthy:
```bash
free -h
```

Persist so they survive reboots:
```bash
pm2 save
```

---

### Step 1.5 — Set up Nginx proxy with auth

Create the htpasswd file (choose a strong password when prompted):
```bash
htpasswd -c /etc/nginx/.browser-htpasswd emily
```

Add the following `location` block to `nginx/cashflow-manager.conf` inside the `server {}` block, before the closing `}`:

```nginx
# Shared browser viewer (noVNC)
location /browser/ {
    auth_basic "Browser Access";
    auth_basic_user_file /etc/nginx/.browser-htpasswd;

    proxy_pass http://127.0.0.1:6080/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

Test and reload Nginx:
```bash
nginx -t && systemctl reload nginx
```

---

### Phase 1 — Exit Criteria

- [ ] `apt install x11vnc novnc` completed without errors
- [ ] `/usr/local/bin/start-shared-chrome.sh` exists and is executable
- [ ] `pm2 list` shows all 4 processes (`shared-xvfb`, `shared-chrome`, `shared-vnc`, `shared-novnc`) as `online`
- [ ] `curl http://127.0.0.1:9222/json` returns a JSON page list (Chrome CDP is live)
- [ ] `free -h` shows at least 400 MB free after all processes start
- [ ] `nginx -t` passes; Nginx reloaded successfully
- [ ] `pm2 save` run

**Rollback:** `pm2 delete shared-xvfb shared-chrome shared-vnc shared-novnc` + remove the `/browser/` Nginx block + `systemctl reload nginx`

---

## Phase 2: Human Testing & Navigation

**Goal:** Confirm the browser is reachable at `/browser`, visually correct, and fully interactive — you can type URLs, click, scroll, and log into websites.

**Prerequisite:** Phase 1 exit criteria all pass.

---

### Step 2.1 — Open the browser in your web browser

Navigate to:
```
https://YOUR_SERVER/browser/
```

Enter the credentials you set in Step 1.5 (`emily` + password).

You should see the noVNC canvas with Chrome open on a blank page.

> If the canvas is black or empty, check `pm2 logs shared-chrome` and `pm2 logs shared-vnc` for errors.

---

### Step 2.2 — Navigate to a URL

Click inside the Chrome address bar in the noVNC canvas and type a URL (e.g., `https://google.com`), then press Enter.

The page should load and be visible in the canvas.

> If clicks don't register: the VNC WebSocket connection may not be fully established. Refresh the `/browser/` page and try again.

---

### Step 2.3 — Test interactive controls

- **Type:** Click a text field on any page and type — verify keystrokes appear
- **Scroll:** Use the mouse wheel on the canvas — verify the page scrolls
- **Click links:** Click any link — verify navigation happens

---

### Step 2.4 — Test session persistence

1. Log into any website (e.g., a social media account) through the noVNC canvas
2. Run: `pm2 restart shared-chrome`
3. Refresh `/browser/` — you should still be logged in (profile is persisted in `/var/lib/openclaw/browser-profile`)

> If you are logged out after restart, the `--user-data-dir` flag is not working. Check `pm2 logs shared-chrome` for the exact command being run.

---

### Step 2.5 — Verify CDP is accessible

```bash
curl http://127.0.0.1:9222/json
```

Expected: JSON array of open Chrome tabs with `id`, `url`, `title`, `webSocketDebuggerUrl` fields.

```bash
# Also verify it is NOT accessible externally
curl http://0.0.0.0:9222/json  # should fail / refuse connection
```

---

### Phase 2 — Exit Criteria

- [ ] `/browser/` loads and shows Chrome UI after entering credentials
- [ ] Can navigate to URLs by typing in the address bar
- [ ] Clicks, typing, and scrolling all work inside the canvas
- [ ] Session (login cookies) survive a `pm2 restart shared-chrome`
- [ ] `curl http://127.0.0.1:9222/json` returns tab list
- [ ] CDP port is NOT reachable externally (bound to 127.0.0.1 only)
- [ ] `pm2 logs shared-chrome` shows no error loops

**Rollback:** No new changes in this phase — rollback is Phase 1 rollback.

---

## Phase 3: Agent Navigation

**Goal:** OpenClaw agents can control the shared Chrome browser via CDP using the `novnc-skill`, with their actions visible in real-time at `/browser`.

**Prerequisite:** Phase 2 exit criteria all pass.

---

### Step 3.1 — How agent CDP connection works

The `novnc-skill` (`/root/.openclaw/skills/novnc-skill/SKILL.md`) provides the CDP connection pattern. Agents use `chromium.connectOverCDP()` instead of launching a new Chrome.

The Playwright CDP connection call:
```javascript
// Instead of:
const browser = await playwright.chromium.launch();

// Use:
const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
```

This attaches to the running shared Chrome without launching a new process. All pages opened this way are visible in noVNC.

---

### Step 3.2 — Verify CDP connection works (manual test)

Before touching any skill files, validate the connection works from the server:

```bash
cd /tmp && node << 'EOF'
const { chromium } = require('/root/.openclaw/workspace/node_modules/playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const page = contexts[0].pages()[0];
  console.log('Connected. Current URL:', page.url());
  await page.goto('https://example.com');
  console.log('Navigated to example.com');
  await browser.close();  // NOTE: .close() on connectOverCDP only disconnects, does not kill Chrome
})();
EOF
```

Check `/browser/` while this runs — you should see the navigation happen in real-time.

> If `playwright` is not found at that path, find the correct path: `find /root/.openclaw -name "playwright" -type d | head -5`

---

### Step 3.3 — Create novnc-skill

Create `/root/.openclaw/skills/novnc-skill/SKILL.md` with documentation for connecting to the shared Chrome via CDP.

```markdown
### Shared Browser (profile: "shared")

Use this profile to control the persistent shared Chrome instance running on the server.
Human can watch agent actions in real-time at `/browser`.

- ✅ **Persistent session** — reuses the running shared Chrome; login cookies are preserved
- ✅ **Visible to human** — all navigation appears live at `/browser`
- ✅ **Session continuity** — cookies/logins set by the human at `/browser` are available to the agent
- ⚠️  **Cooperative** — only one agent should control at a time; avoid concurrent agent calls
- ⚠️  **Never close the browser** — `browser.close()` on a CDP-connected browser only disconnects; but do not call it anyway to avoid confusion

**CDP URL:** `http://127.0.0.1:9222`

#### Usage Examples

```javascript
// Open a URL in the shared browser (visible at /browser)
await browser.open("https://example.com", { profile: "shared" });

// Take a snapshot of what the shared browser is showing
await browser.snapshot({ profile: "shared" });

// Take a screenshot
await browser.screenshot({ profile: "shared" });

// Click an element
await browser.click("button#submit", { profile: "shared" });
```

#### When to use `shared` profile

- The human has already logged into a site at `/browser` and the agent needs to continue in that session
- You want the human to be able to watch what the agent is doing in real-time
- Any task where cookies/session state from a previous manual login matters

#### When NOT to use `shared` profile

- Parallel or background tasks where isolation is important — use `profile: "openclaw"` instead
- Tasks that involve multiple simultaneous browser sessions

#### How it connects

Instead of launching a new Chrome, `profile: "shared"` connects via:
```javascript
playwright.chromium.connectOverCDP('http://127.0.0.1:9222')
```
```

---

### Step 3.4 — Test agent navigation end-to-end

1. Open `/browser/` in your web browser so you can watch
2. Ask Emily (via Telegram or chat):
   ```
   Open https://example.com in the shared browser
   ```
3. Watch `/browser/` — the navigation should happen visibly
4. Ask Emily to take a screenshot with the shared profile and confirm it matches what you see at `/browser/`

---

### Step 3.5 — Test session handoff (login → agent continue)

1. Manually log into a website at `/browser/` (e.g., Twitter, GitHub)
2. Ask Emily:
   ```
   Using the shared browser, go to my profile page and take a screenshot
   ```
3. Emily should navigate to the profile page without being asked to log in — the session is shared

---

### Phase 3 — Exit Criteria

- [ ] `novnc-skill/SKILL.md` created at `/root/.openclaw/skills/novnc-skill/SKILL.md`
- [ ] Agent using novnc-skill successfully navigates to a URL
- [ ] Navigation is visible in real-time at `/browser/`
- [ ] Session set by the human (cookies/login) is accessible to the agent
- [ ] Agent using `profile: "openclaw"` still works normally (no regression)
- [ ] `pm2 logs shared-chrome` shows no errors after agent interaction

**Rollback:** Delete `/root/.openclaw/skills/novnc-skill/` (git checkout if in repo). No infrastructure changes in this phase.

---

## Post-Completion Checklist

- [ ] All 3 phases complete with exit criteria verified
- [ ] `pm2 save` run with all 4 browser processes online
- [ ] `pm2 startup` configured so processes survive server reboots
- [ ] `ss -tlnp | grep 9222` confirms CDP is bound to `127.0.0.1` only
- [ ] `/browser/` is protected by Basic Auth (no anonymous access)
- [ ] RAM usage is documented after all processes are running
- [ ] No debug console output left in any scripts
- [ ] Branch pushed and PR created before merging

---

## Progress Notes

- Mar 22 2026 11:35AM: Created initial documentation based on architecture plan (SHARED_BROWSER_ARCHITECTURE.md)
- Mar 22 2026 12:20PM: Architecture reviewed and revised by /architect — switched from systemd to PM2, consolidated to extend existing `browser-skill`, added OOM risk, specified Nginx WebSocket config, added phase exit criteria
- Mar 22 2026 12:45PM: Documentation restructured by /architect into 3 user-focused phases (setup → human test → agent navigation) with full step-by-step development instructions per phase
- Mar 22 2026 02:00PM: Phase 1 complete — all 4 PM2 processes online, nginx configured, /browser/ accessible with Basic Auth
- Mar 22 2026 02:20PM: Phase 2 complete — noVNC working, Chrome visible at /browser/
- Mar 22 2026 02:30PM: Phase 3 complete — novnc-skill created at /root/.openclaw/skills/novnc-skill/SKILL.md, agent navigation verified, screenshot policy added (no auto screenshots)
