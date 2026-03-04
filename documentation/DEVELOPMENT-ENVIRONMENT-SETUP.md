# Cashflow Manager: Development Environment Setup

**DATE:** 2025-03-04  
**PURPOSE:** Document local development environment configuration for cashflow-manager  
**SCOPE:** Frontend + Backend architecture and tooling

---

## 📋 Overview

Cashflow Manager is a full-stack web application with:

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Realtime**: Server-Sent Events (SSE) + BroadcastChannel API
- **Authentication**: Password-based (X-Password header)
- **Deployment**: Nginx reverse proxy with SSL

---

## 🗂️ Directory Structure (Development)

```
/var/www/cashflow-manager/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── ui/          # shadcn/ui primitive components
│   │   │   ├── FilterBar.tsx
│   │   │   ├── SummaryCards.tsx
│   │   │   ├── CashflowTable.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── ActivityLogs.tsx
│   │   │   └── ...
│   │   ├── api/             # API clients (cashflow.ts, tasks.ts, activity.ts)
│   │   ├── hooks/           # Custom React hooks (useRealtimeData, useSSE)
│   │   ├── App.tsx          # Main app component with routing
│   │   ├── main.tsx         # Entry point
│   │   └── index.css
│   ├── dist/                # Production build output (generated)
│   ├── node_modules/        # NPM dependencies (including dev deps)
│   │   └── .vite/           # Vite cache (development only)
│   ├── .env                 # Frontend env: VITE_API_URL, VITE_PASSWORD
│   ├── package.json         # Dependencies: react, vite, tailwind, shadcn
│   ├── vite.config.ts       # Vite config (dev server port 5173, proxy)
│   ├── tsconfig.json        # TypeScript config
│   ├── tsconfig.node.json   # TypeScript config for Node
│   ├── components.json      # shadcn/ui component registry
│   └── index.html           # HTML template
├── backend/
│   ├── server.js            # Express server entry (port 3001)
│   ├── routes/v1/
│   │   ├── cashflow.js      # Cashflow CRUD endpoints
│   │   ├── tasks.js         # Tasks CRUD + filter endpoints
│   │   └── activity-logs.js # Activity logs with pagination
│   ├── repositories/
│   │   ├── cashflow.repository.js
│   │   └── tasks.repository.js
│   ├── db/
│   │   ├── schema.sql       # SQLite schema
│   │   └── cashflow.db      # SQLite database file
│   ├── .env                 # Backend env: PORT, WEB_PASSWORD, etc.
│   ├── package.json         # Dependencies: express, better-sqlite3, etc.
│   └── node_modules/
├── nginx/
│   └── sites-available/
│       └── cashflow-manager.conf  # Nginx virtual host (SSL)
├── logs/
│   ├── backend.log          # Backend output logs (PM2)
│   └── security/            # Security audit logs
├── documentation/           # Task documentation & plans
│   ├── 058-add-table-filter-cashflow.md
│   ├── TASK-SKILL-VERIFICATION-ENHANCEMENT.md
│   └── ...
├── .git/                    # Git repository (development VCS)
├── .gitignore
├── progress-reports/        # Development progress notes
│   └── 2026-02-23-openclaw-security-hardening.md
└── pm2 ecosystem file? (not present; using `pm2 start server.js`)

```

---

## 🚀 Development Workflow

### 1. Start Backend (Development Mode)

```bash
cd /var/www/cashflow-manager/backend
npm install  # if needed
npm run dev  # uses nodemon for hot reload
```

Backend starts on `http://localhost:3001` with live reload.

### 2. Start Frontend (Development Server)

```bash
cd /var/www/cashflow-manager/frontend
npm install  # if needed
npm run dev
```

Frontend starts on `http://localhost:5173/` with:
- Hot Module Replacement (HMR)
- Vite dev server with fast builds
- API requests proxied to `http://localhost:3001` via Vite config

### 3. Access Application

Open browser to: `http://localhost:5173/`
Login with password (default: `10716255`)

### 4. Build for Production

```bash
cd /var/www/cashflow-manager/frontend
npm run build
```

Output goes to `frontend/dist/` (static assets). Nginx serves these files.

---

## ⚙️ Configuration Files

### Frontend Environment (.env)
```
VITE_API_URL=/api/v1
VITE_PASSWORD=10716255
```

- `VITE_API_URL`: Base path for API calls (same-origin in production)
- `VITE_PASSWORD`: Shared secret for API authentication

### Backend Environment (.env)
```
PORT=3001
WEB_PASSWORD=10716255
# Optional: DATABASE_PATH, NODE_ENV, etc.
```

### Vite Configuration (vite.config.ts)

Key sections:
- `server.port: 5173` - Development server port
- `server.proxy` - Proxy `/api` to `http://localhost:3001` to avoid CORS
- `build.outDir` - Output directory for production build (`dist/`)
- `build.rollupOptions` - Asset handling

### Nginx Configuration

File: `/etc/nginx/sites-available/cashflow-manager.conf`

- Listens on 443 (HTTPS) with SSL certs
- Serves frontend from `/var/www/cashflow-manager/frontend/dist`
- Proxies `/api/` to `http://localhost:3001`
- Serves Swagger docs at `/api-docs`
- WebSocket support for SSE

---

## 🛠️ Key Technologies

### Frontend
- React 18 (functional components, hooks)
- TypeScript 5
- Vite 5 (build tool + dev server)
- Tailwind CSS 4 (utility-first styling)
- shadcn/ui (Radix UI primitives)
- React Router DOM 7 (routing)
- date-fns (date utilities)
- lucide-react (icons)

### Backend
- Express 4
- better-sqlite3 (SQLite driver)
- SSE + BroadcastChannel for realtime updates
- PM2 process manager (production)

---

## 🔌 API Architecture

### Base URL
- Development: `http://localhost:3001/api/v1`
- Production: `https://46.225.69.45/api/v1`

### Authentication
All API requests require headers:
```
X-Password: <WEB_PASSWORD>
X-Source: telegram | web_app | system
```

### Standard Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "optional"
}
```

### SSE Endpoint
`GET /api/v1/events?password=<password>`
- streams events: `cashflow:created`, `task:updated`, etc.
- Used by frontend BroadcastChannel hook for live updates

---

## 🧪 Database

SQLite database located at: `/var/www/cashflow-manager/backend/db/cashflow.db`

Schema (schema.sql):
- `cashflow` table: transaction entries
- `tasks` table: tasks with status/priority
- `activity_logs` table: audit trail

Indexes on date, category, currency, status, priority for performance.

---

## 🎯 Entry Points

| Component | Dev Command | Production |
|-----------|-------------|------------|
| Backend | `npm run dev` (nodemon) | `pm2 start server.js --name cashflow-backend` |
| Frontend | `npm run dev` (Vite) | Served by Nginx from `dist/` |
| Nginx | `systemctl reload nginx` | Same |

---

## 🧹 Development-Only Files (Not Needed in Production)

- `.git/` & `.gitignore` - version control
- `frontend/node_modules/.vite/` - dev cache
- `progress-reports/` - dev progress docs
- `documentation/cashflow-manager.code-workspace` - VSCode workspace
- `logs/backend.log` (rotated logs, keep dir but can clear)

These can be removed to create a lean production server.

---

## 🔒 Production Checklist

- [ ] Build frontend: `npm run build` (updates `dist/`)
- [ ] Backend running via PM2 (`pm2 list`)
- [ ] Nginx config points to correct `dist/` and proxy
- [ ] SSL certificates valid
- [ ] Environment variables set (`.env` files)
- [ ] Database initialized (`schema.sql` executed)
- [ ] Remove dev artifacts if desired (see above)

---

## 📚 References

- OpenClaw Docs: https://docs.openclaw.ai/
- shadcn/ui: https://ui.shadcn.com/
- Vite: https://vitejs.dev/
- Express: https://expressjs.com/

---

**Last Updated:** 2025-03-04  
**Maintained By:** OpenCode Assistant, Emily
