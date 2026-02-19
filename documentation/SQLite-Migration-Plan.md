# SQLite Migration Plan

**Created:** February 18, 2026
**Status:** Ready for Implementation
**Author:** Kevin + OpenCode

---

## Overview

Migrate the Cashflow Manager backend from JSON flat files to SQLite using `better-sqlite3`. This is a non-destructive migration: JSON files are preserved as backups, the API contract (endpoints, request/response shapes) remains identical, and rollback is a single command.

### Why better-sqlite3

- Synchronous API (no async overhead for microsecond operations)
- 2-24x faster than node-sqlite3
- Prebuilt binaries for Linux x64 (no compilation needed)
- Built-in backup API
- WAL mode for concurrent reads + writes
- 3.2M weekly npm downloads, well maintained

### Current State

| Data | File Path | Size |
|------|-----------|------|
| Cashflow | `/root/.openclaw/workspace/cashflow.json` | ~15 entries |
| Tasks | `/root/.openclaw/workspace/tasks.json` | ~18 entries |
| Activity Logs | `/root/.openclaw/workspace/activity_logs.json` | ~150 entries |

### Known Issues Being Fixed

| Issue | Description |
|-------|-------------|
| Race condition | 3 copies of `logActivity()` write to same file without locking |
| Task ID collision | Legacy endpoint uses buggy `array.length + 1` for IDs |
| Hardcoded paths | `TASKS_FILE` and `ACTIVITY_LOGS_FILE` have no env var support |
| Code duplication | `logActivity()` duplicated in `server.js`, `routes/v1/cashflow.js`, `routes/v1/tasks.js` |
| Chokidar fragility | File watcher uses 1000ms setTimeout flag (race-prone) |

---

## Architecture

### Before

```
Frontend → Express Routes → fs.readFile/writeFile → JSON files
                                                     ├── cashflow.json
                                                     ├── tasks.json
                                                     └── activity_logs.json
```

### After

```
Frontend → Express Routes → Repository Layer → better-sqlite3 → cashflow.db
                                    │
                                    └── logActivity (single shared utility)
```

### Directory Structure (New Files)

```
backend/
├── db/
│   ├── index.js              # Database connection singleton
│   ├── schema.sql            # Table definitions + indexes
│   └── migrate.js            # JSON → SQLite migration script
├── repositories/
│   ├── cashflow.repository.js
│   ├── tasks.repository.js
│   └── activity.repository.js
├── utils/
│   └── activity-logger.js    # Single shared logActivity (replaces 3 copies)
```

---

## Phase 1: Database Foundation

### Goal

Install `better-sqlite3`, create the database connection, define the schema, and write the migration script.

### Step 1.1: Install Dependency

```bash
cd /var/www/cashflow-manager/backend
npm install better-sqlite3
```

### Step 1.2: Update `.env`

Add one line to `/var/www/cashflow-manager/backend/.env`:

```env
DATABASE_PATH=/var/www/cashflow-manager/backend/db/cashflow.db
```

**Keep all existing env vars unchanged.** They are still needed during migration and as fallback reference.

### Step 1.3: Create `db/index.js`

Create file: `/var/www/cashflow-manager/backend/db/index.js`

This is a singleton module. It opens ONE database connection on first call, reuses it for all subsequent calls, and closes it on process exit.

```javascript
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'cashflow.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    db.pragma('cache_size = -20000');
    db.pragma('temp_store = MEMORY');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

process.on('exit', closeDb);
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

module.exports = { getDb, closeDb };
```

**Key pragmas explained:**
- `journal_mode = WAL` — readers never block writers
- `synchronous = NORMAL` — safe with WAL, much faster than FULL
- `busy_timeout = 5000` — wait 5s on lock instead of failing immediately
- `cache_size = -20000` — 20MB page cache

### Step 1.4: Create `db/schema.sql`

Create file: `/var/www/cashflow-manager/backend/db/schema.sql`

```sql
-- Cashflow transactions
CREATE TABLE IF NOT EXISTS cashflow (
  id TEXT PRIMARY KEY,
  item TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  date TEXT NOT NULL,
  time TEXT DEFAULT '',
  timezone TEXT DEFAULT 'PHT',
  category TEXT DEFAULT 'Other',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  date TEXT,
  time TEXT,
  timezone TEXT DEFAULT 'PHT',
  actor TEXT DEFAULT 'System',
  source TEXT DEFAULT 'web_app',
  action_type TEXT NOT NULL,
  description TEXT,
  details TEXT DEFAULT '{}',
  status TEXT DEFAULT 'success',
  error_message TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cashflow_date ON cashflow(date);
CREATE INDEX IF NOT EXISTS idx_cashflow_category ON cashflow(category);
CREATE INDEX IF NOT EXISTS idx_cashflow_currency ON cashflow(currency);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_source ON activity_logs(source);
CREATE INDEX IF NOT EXISTS idx_activity_status ON activity_logs(status);
```

**Notes:**
- `id` is TEXT (not INTEGER) to match existing timestamp-based IDs from JSON
- `details` in activity_logs stores JSON as TEXT (SQLite has no native JSON column but supports JSON functions)
- All columns match the exact field names from the JSON files — no renaming

### Step 1.5: Create `db/migrate.js`

Create file: `/var/www/cashflow-manager/backend/db/migrate.js`

This script:
1. Creates tables from schema.sql
2. Reads existing JSON files
3. Inserts data into SQLite using `INSERT OR IGNORE` (idempotent)
4. Renames JSON files to `.json.bak` (preserves originals)
5. Wraps everything in a transaction (all-or-nothing)

```javascript
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'cashflow.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// JSON file locations (from current .env and hardcoded paths)
const CASHFLOW_JSON = process.env.DATA_FILE || '/root/.openclaw/workspace/cashflow.json';
const TASKS_JSON = '/root/.openclaw/workspace/tasks.json';
const ACTIVITY_JSON = '/root/.openclaw/workspace/activity_logs.json';

function readJsonSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.log(`  Skipped ${filePath}: ${err.message}`);
    return null;
  }
}

function migrate() {
  console.log('=== SQLite Migration ===');
  console.log(`Database: ${DB_PATH}`);
  console.log('');

  // Ensure db directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema
  console.log('1. Creating tables...');
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  console.log('   Done.');

  // Migrate inside a transaction
  const runMigration = db.transaction(() => {

    // --- Cashflow ---
    console.log('2. Migrating cashflow...');
    const cashflowData = readJsonSafe(CASHFLOW_JSON);
    if (cashflowData && Array.isArray(cashflowData)) {
      const insertCashflow = db.prepare(`
        INSERT OR IGNORE INTO cashflow (id, item, amount, currency, date, time, timezone, category, notes)
        VALUES (@id, @item, @amount, @currency, @date, @time, @timezone, @category, @notes)
      `);
      let count = 0;
      for (const entry of cashflowData) {
        insertCashflow.run({
          id: entry.id || Date.now().toString(),
          item: entry.item || '',
          amount: parseFloat(entry.amount) || 0,
          currency: entry.currency || 'PHP',
          date: entry.date || '',
          time: entry.time || '',
          timezone: entry.timezone || 'PHT',
          category: entry.category || 'Other',
          notes: entry.notes || ''
        });
        count++;
      }
      console.log(`   Migrated ${count} cashflow entries.`);
    } else {
      console.log('   No cashflow data found, skipped.');
    }

    // --- Tasks ---
    console.log('3. Migrating tasks...');
    const tasksData = readJsonSafe(TASKS_JSON);
    if (tasksData) {
      const tasksList = tasksData.tasks || tasksData;
      if (Array.isArray(tasksList)) {
        const insertTask = db.prepare(`
          INSERT OR IGNORE INTO tasks (id, name, date, time, status, priority)
          VALUES (@id, @name, @date, @time, @status, @priority)
        `);
        let count = 0;
        for (const task of tasksList) {
          insertTask.run({
            id: task.id || '',
            name: task.name || '',
            date: task.date || '',
            time: task.time || '',
            status: task.status || 'active',
            priority: task.priority || 'medium'
          });
          count++;
        }
        console.log(`   Migrated ${count} tasks.`);
      }
    } else {
      console.log('   No tasks data found, skipped.');
    }

    // --- Activity Logs ---
    console.log('4. Migrating activity logs...');
    const activityData = readJsonSafe(ACTIVITY_JSON);
    if (activityData) {
      const logsList = activityData.logs || activityData;
      if (Array.isArray(logsList)) {
        const insertLog = db.prepare(`
          INSERT OR IGNORE INTO activity_logs
            (id, timestamp, date, time, timezone, actor, source, action_type, description, details, status, error_message)
          VALUES
            (@id, @timestamp, @date, @time, @timezone, @actor, @source, @action_type, @description, @details, @status, @error_message)
        `);
        let count = 0;
        for (const log of logsList) {
          insertLog.run({
            id: log.id || Date.now().toString(),
            timestamp: log.timestamp || new Date().toISOString(),
            date: log.date || '',
            time: log.time || '',
            timezone: log.timezone || 'PHT',
            actor: log.actor || 'System',
            source: log.source || 'web_app',
            action_type: log.action_type || 'unknown',
            description: log.description || '',
            details: typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '{}'),
            status: log.status || 'success',
            error_message: log.error_message || null
          });
          count++;
        }
        console.log(`   Migrated ${count} activity logs.`);
      }
    } else {
      console.log('   No activity logs found, skipped.');
    }
  });

  try {
    runMigration();
    console.log('');
    console.log('5. Creating backups of JSON files...');

    // Rename JSON files to .bak (non-destructive)
    for (const jsonPath of [CASHFLOW_JSON, TASKS_JSON, ACTIVITY_JSON]) {
      if (fs.existsSync(jsonPath)) {
        const bakPath = jsonPath + '.bak';
        fs.copyFileSync(jsonPath, bakPath);
        console.log(`   ${jsonPath} → ${bakPath}`);
      }
    }

    console.log('');
    console.log('Migration complete!');
  } catch (err) {
    console.error('');
    console.error('Migration FAILED (rolled back):', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
```

**Run with:**
```bash
cd /var/www/cashflow-manager/backend
node db/migrate.js
```

**Idempotent:** Safe to run multiple times. `INSERT OR IGNORE` skips existing rows. `CREATE TABLE IF NOT EXISTS` won't recreate tables. JSON `.bak` files are copied (not moved), so originals remain intact.

### Step 1.6: Add npm script

Add to `package.json` scripts:

```json
"scripts": {
  "start": "node server.js",
  "dev": "node server.js",
  "migrate": "node db/migrate.js"
}
```

### Phase 1 Verification

```bash
# Run migration
npm run migrate

# Verify database exists
ls -la db/cashflow.db

# Verify data
sqlite3 db/cashflow.db "SELECT COUNT(*) FROM cashflow;"
sqlite3 db/cashflow.db "SELECT COUNT(*) FROM tasks;"
sqlite3 db/cashflow.db "SELECT COUNT(*) FROM activity_logs;"

# Verify JSON backups exist
ls -la /root/.openclaw/workspace/*.bak

# Verify originals still exist
ls -la /root/.openclaw/workspace/cashflow.json
```

---

## Phase 2: Shared Activity Logger + Repository Layer

### Goal

Create a single `logActivity` utility (replacing 3 duplicated copies) and repository modules for each data entity.

### Step 2.1: Create `utils/activity-logger.js`

Create file: `/var/www/cashflow-manager/backend/utils/activity-logger.js`

This replaces the 3 separate `logActivity()` functions in:
- `server.js` (lines 120-163)
- `routes/v1/cashflow.js` (lines 47-99)
- `routes/v1/tasks.js` (lines 31-81)

```javascript
const { getDb } = require('../db');

function logActivity({ source, actionType, description, details, status, errorMessage, actor }) {
  const now = new Date();
  const philippineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const date = `${months[philippineTime.getMonth()]} ${philippineTime.getDate()} ${philippineTime.getFullYear()}`;

  let hours = philippineTime.getHours();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = philippineTime.getMinutes().toString().padStart(2, '0');
  const time = `${hours}:${minutes}${ampm}`;

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO activity_logs (id, timestamp, date, time, timezone, actor, source, action_type, description, details, status, error_message)
    VALUES (?, ?, ?, ?, 'PHT', ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    Date.now().toString(),
    now.toISOString(),
    date,
    time,
    actor || 'System',
    source || 'web_app',
    actionType,
    description,
    typeof details === 'object' ? JSON.stringify(details) : (details || '{}'),
    status || 'success',
    errorMessage || null
  );
}

// Helper that extracts source from req (set by source middleware)
function logActivityFromReq(req, actionType, description, details, status, errorMessage) {
  logActivity({
    source: req.source || 'web_app',
    actionType,
    description,
    details,
    status,
    errorMessage
  });
}

module.exports = { logActivity, logActivityFromReq };
```

**Key improvements over old code:**
- Single function, no duplication
- No file read-modify-write race condition (SQLite handles concurrency)
- No 2000-log cap needed (SQLite handles large datasets efficiently; add cleanup query if needed)
- Synchronous (better-sqlite3), so no async/await needed

### Step 2.2: Create `repositories/cashflow.repository.js`

Create file: `/var/www/cashflow-manager/backend/repositories/cashflow.repository.js`

```javascript
const { getDb } = require('../db');

// Reusable time parser (handles both "7:11PM" and "00:33" formats)
function parseDateTime(dateStr, timeStr) {
  if (!dateStr) return 0;
  let time = timeStr || '';
  if (time) {
    const match = time.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const ampm = match[3].toLowerCase();
      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      time = `${String(hours).padStart(2, '0')}:${minutes}`;
    }
  }
  const date = new Date(`${dateStr} ${time}`);
  return isNaN(date.getTime()) ? 0 : date.getTime();
}

const cashflowRepo = {
  findAll({ category, currency, startDate, endDate, search, sortBy, sortOrder } = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM cashflow WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (currency && currency !== 'All') {
      sql += ' AND currency = ?';
      params.push(currency);
    }
    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }
    if (search) {
      sql += ' AND (item LIKE ? OR notes LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sorting: handled in JS for date (mixed time formats), SQL for category/amount
    if (sortBy === 'category') {
      sql += ` ORDER BY category ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (sortBy === 'amount') {
      sql += ` ORDER BY amount ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const rows = db.prepare(sql).all(...params);

    // Date sorting in JS (handles mixed 12h/24h time formats)
    if (sortBy === 'date' || !sortBy) {
      const order = sortBy ? sortOrder : 'desc';
      rows.sort((a, b) => {
        const diff = parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time);
        return order === 'desc' ? -diff : diff;
      });
    }

    return rows;
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM cashflow WHERE id = ?').get(id);
  },

  getSummary() {
    const db = getDb();
    const totalIncome = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM cashflow WHERE amount > 0').get().total;
    const totalExpenses = Math.abs(db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM cashflow WHERE amount < 0').get().total);
    const transactionCount = db.prepare('SELECT COUNT(*) as count FROM cashflow').get().count;
    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount
    };
  },

  create(data) {
    const id = Date.now().toString();
    getDb().prepare(`
      INSERT INTO cashflow (id, item, amount, currency, date, time, timezone, category, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.item,
      parseFloat(data.amount),
      data.currency || 'PHP',
      data.date,
      data.time || '',
      data.timezone || 'PHT',
      data.category || 'Other',
      data.notes || ''
    );
    return this.findById(id);
  },

  update(id, data) {
    const existing = this.findById(id);
    if (!existing) return null;

    const merged = { ...existing, ...data, id };
    getDb().prepare(`
      UPDATE cashflow SET item=?, amount=?, currency=?, date=?, time=?, timezone=?, category=?, notes=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      merged.item, parseFloat(merged.amount), merged.currency,
      merged.date, merged.time, merged.timezone,
      merged.category, merged.notes, id
    );
    return this.findById(id);
  },

  delete(id) {
    const existing = this.findById(id);
    if (!existing) return null;
    getDb().prepare('DELETE FROM cashflow WHERE id = ?').run(id);
    return existing;
  }
};

module.exports = cashflowRepo;
```

### Step 2.3: Create `repositories/tasks.repository.js`

Create file: `/var/www/cashflow-manager/backend/repositories/tasks.repository.js`

```javascript
const { getDb } = require('../db');

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const tasksRepo = {
  findAll({ sortBy, sortOrder } = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM tasks';

    if (sortBy === 'id') {
      // Cast TEXT id to integer for numeric sorting
      sql += ` ORDER BY CAST(id AS INTEGER) ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (sortBy === 'date') {
      // Tasks with no date sort to end
      sql += ` ORDER BY CASE WHEN date = '' OR date IS NULL THEN 1 ELSE 0 END, date ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (sortBy === 'priority') {
      sql += ` ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 1 END ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    } else {
      // Default: priority high to low
      sql += ` ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 1 END ASC`;
    }

    return db.prepare(sql).all();
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  },

  findByName(name) {
    return getDb().prepare('SELECT * FROM tasks WHERE LOWER(name) = LOWER(?)').get(name);
  },

  generateId() {
    const db = getDb();
    const row = db.prepare('SELECT MAX(CAST(id AS INTEGER)) as maxId FROM tasks').get();
    const maxId = row.maxId || 0;
    return String(maxId + 1).padStart(3, '0');
  },

  create(data) {
    const id = this.generateId();
    getDb().prepare(`
      INSERT INTO tasks (id, name, date, time, status, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      (data.name || '').trim(),
      data.date || '',
      data.time || '',
      data.status || 'active',
      data.priority || 'medium'
    );
    return this.findById(id);
  },

  update(id, data) {
    const existing = this.findById(id);
    if (!existing) return null;

    const fields = [];
    const params = [];
    for (const key of ['name', 'date', 'time', 'status', 'priority']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(key === 'name' ? data[key].trim() : data[key]);
      }
    }
    if (fields.length === 0) return existing;

    fields.push("updated_at = datetime('now')");
    params.push(id);

    getDb().prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  delete(id) {
    const existing = this.findById(id);
    if (!existing) return null;
    getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return existing;
  },

  deleteByName(name) {
    const existing = this.findByName(name);
    if (!existing) return null;
    getDb().prepare('DELETE FROM tasks WHERE id = ?').run(existing.id);
    return existing;
  }
};

module.exports = tasksRepo;
```

### Step 2.4: Create `repositories/activity.repository.js`

Create file: `/var/www/cashflow-manager/backend/repositories/activity.repository.js`

```javascript
const { getDb } = require('../db');

const activityRepo = {
  findAll({ search, action_type, status, source, date_from, date_to } = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (description LIKE ? OR details LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (action_type) {
      sql += ' AND action_type = ?';
      params.push(action_type);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (source) {
      sql += ' AND source = ?';
      params.push(source);
    }
    if (date_from) {
      sql += ' AND timestamp >= ?';
      params.push(new Date(date_from).toISOString());
    }
    if (date_to) {
      sql += ' AND timestamp <= ?';
      params.push(new Date(date_to).toISOString());
    }

    sql += ' ORDER BY timestamp DESC';

    const rows = db.prepare(sql).all(...params);

    // Parse details from JSON string back to object
    return rows.map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : {}
    }));
  },

  getStats() {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) as count FROM activity_logs').get().count;
    const successCount = db.prepare("SELECT COUNT(*) as count FROM activity_logs WHERE status = 'success'").get().count;
    const failedCount = db.prepare("SELECT COUNT(*) as count FROM activity_logs WHERE status = 'failed'").get().count;

    const actionTypes = {};
    db.prepare('SELECT action_type, COUNT(*) as count FROM activity_logs GROUP BY action_type').all()
      .forEach(row => { actionTypes[row.action_type] = row.count; });

    const sources = {};
    db.prepare('SELECT source, COUNT(*) as count FROM activity_logs GROUP BY source').all()
      .forEach(row => { sources[row.source] = row.count; });

    return {
      total_logs: total,
      success_count: successCount,
      failed_count: failedCount,
      action_types: actionTypes,
      sources: sources,
      last_cleanup: null
    };
  },

  create(data) {
    const now = new Date();
    const philippineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = `${months[philippineTime.getMonth()]} ${philippineTime.getDate()} ${philippineTime.getFullYear()}`;

    let hours = philippineTime.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = philippineTime.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}${ampm}`;

    const id = Date.now().toString();
    getDb().prepare(`
      INSERT INTO activity_logs (id, timestamp, date, time, timezone, actor, source, action_type, description, details, status, error_message)
      VALUES (?, ?, ?, ?, 'PHT', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      now.toISOString(),
      date,
      time,
      data.actor || 'System',
      data.source || 'web_app',
      data.action_type,
      data.description || '',
      typeof data.details === 'object' ? JSON.stringify(data.details) : (data.details || '{}'),
      data.status || 'success',
      data.error_message || null
    );

    const row = getDb().prepare('SELECT * FROM activity_logs WHERE id = ?').get(id);
    return { ...row, details: row.details ? JSON.parse(row.details) : {} };
  }
};

module.exports = activityRepo;
```

### Phase 2 Verification

```bash
# Verify all new files exist
ls -la utils/activity-logger.js repositories/*.js db/*.js db/*.sql

# Quick test: require each module (should not throw)
node -e "require('./db'); console.log('db/index.js OK')"
node -e "require('./utils/activity-logger'); console.log('activity-logger OK')"
node -e "require('./repositories/cashflow.repository'); console.log('cashflow repo OK')"
node -e "require('./repositories/tasks.repository'); console.log('tasks repo OK')"
node -e "require('./repositories/activity.repository'); console.log('activity repo OK')"
```

---

## Phase 3: Update v1 Routes

### Goal

Replace JSON file read/write operations in v1 route files with repository calls. The API response format stays **identical**.

### Step 3.1: Rewrite `routes/v1/cashflow.js`

Replace entire file content. Key changes:
- Remove `fs` import, `readData()`, `writeData()`, `parseDateTime()`, and `logActivity()` functions
- Import `cashflowRepo` and `logActivityFromReq`
- Route handlers call repo methods instead of file operations
- Response shapes remain identical

The route handler structure stays the same:
```
GET /          → cashflowRepo.findAll(filters)     → sendSuccess(res, data)
GET /summary   → cashflowRepo.getSummary()          → sendSuccess(res, data)
GET /:id       → cashflowRepo.findById(id)          → sendSuccess(res, data)
POST /         → cashflowRepo.create(body)           → sendSuccess(res, data, msg, 201)
PUT /:id       → cashflowRepo.update(id, body)       → sendSuccess(res, data, msg)
DELETE /:id    → cashflowRepo.delete(id)             → sendSuccess(res, data, msg)
```

Each mutating route also calls `logActivityFromReq()` for activity logging — same behavior as before but using the shared utility.

### Step 3.2: Rewrite `routes/v1/tasks.js`

Replace entire file content. Key changes:
- Remove `fs` import, `readTasks()`, `writeTasks()`, `generateTaskId()`, and `logActivity()` functions
- Import `tasksRepo` and `logActivityFromReq`
- Route handlers call repo methods

The route handler structure stays the same:
```
GET /              → tasksRepo.findAll(filters)         → sendSuccess(res, data)
GET /:id           → tasksRepo.findById(id)             → sendSuccess(res, data)
POST /             → tasksRepo.create(body)              → sendSuccess(res, data, msg, 201)
PUT /:id           → tasksRepo.update(id, body)          → sendSuccess(res, data, msg)
DELETE /:id        → tasksRepo.delete(id)                → sendSuccess(res, data, msg)
DELETE /?name=...  → tasksRepo.deleteByName(name)        → sendSuccess(res, data, msg)
```

### Step 3.3: Rewrite `routes/v1/activity-logs.js`

Replace entire file content. Key changes:
- Remove `fs` import, `readActivityLogs()`, `writeActivityLogs()` functions
- Import `activityRepo`
- Route handlers call repo methods

```
GET /          → activityRepo.findAll(filters)    → sendSuccess(res, data)
GET /stats     → activityRepo.getStats()           → sendSuccess(res, data)
POST /         → activityRepo.create(body)          → sendSuccess(res, data, msg, 201)
```

**Important:** The `GET /` response shape must wrap as `{ logs: [...], total_count: N, last_cleanup: null }` to match the current frontend expectation. This wrapping happens in the route, not the repository.

### Step 3.4: Initialize Database in `server.js`

Add near the top of `server.js` (after dotenv.config()):

```javascript
// Initialize SQLite database
const { getDb } = require('./db');
getDb(); // Opens connection, applies pragmas
```

This ensures the database connection is established at startup.

### Phase 3 Verification

```bash
# Restart backend
pm2 restart cashflow-backend

# Test each v1 endpoint
curl -s -H "X-Password: 10716255" http://localhost:3001/api/v1/cashflow | python3 -m json.tool | head -5
curl -s -H "X-Password: 10716255" http://localhost:3001/api/v1/cashflow/summary | python3 -m json.tool
curl -s -H "X-Password: 10716255" http://localhost:3001/api/v1/tasks | python3 -m json.tool | head -5
curl -s -H "X-Password: 10716255" http://localhost:3001/api/v1/activity-logs | python3 -m json.tool | head -5
curl -s -H "X-Password: 10716255" http://localhost:3001/api/v1/activity-logs/stats | python3 -m json.tool

# Test sorting
curl -s -H "X-Password: 10716255" "http://localhost:3001/api/v1/cashflow?sortBy=amount&sortOrder=desc" | python3 -c "import sys,json; d=json.load(sys.stdin); [print(e['amount']) for e in d['data'][:3]]"
curl -s -H "X-Password: 10716255" "http://localhost:3001/api/v1/tasks?sortBy=priority&sortOrder=desc" | python3 -c "import sys,json; d=json.load(sys.stdin); [print(e['priority']) for e in d['data'][:3]]"

# Test CRUD: create, read, delete
curl -s -X POST -H "X-Password: 10716255" -H "Content-Type: application/json" -H "X-Source: web_app" -d '{"name":"SQLite test task","priority":"low"}' http://localhost:3001/api/v1/tasks | python3 -m json.tool
# Note the ID from the response, then:
# curl -s -X DELETE -H "X-Password: 10716255" http://localhost:3001/api/v1/tasks/<ID>

# Check activity log captured the creation
curl -s -H "X-Password: 10716255" "http://localhost:3001/api/v1/activity-logs?search=SQLite%20test" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']['logs']), 'logs found')"

# Rebuild and reload frontend (no frontend code changes needed)
cd /var/www/cashflow-manager/frontend && npm run build
nginx -s reload

# Verify web app loads and displays data
```

---

## Phase 4: Remove Chokidar File Watcher

### Why Remove

The chokidar file watcher in `server.js` watches `tasks.json` for external changes (originally for when Emily wrote directly to the file). Since Emily now uses the API exclusively (`/api/v1/tasks`), this watcher serves no purpose and would fail anyway since `tasks.json` is no longer being written to.

### Step 4.1: Remove From `server.js`

Remove or comment out:
1. The `chokidar` require statement
2. The `initializeTaskWatcher()` function and its call
3. The `detectTaskChanges()` function
4. The `isManualWebAppChange` flag and its middleware
5. The `lastTaskContent` variable

### Step 4.2: Uninstall chokidar

```bash
npm uninstall chokidar
```

### Phase 4 Verification

```bash
pm2 restart cashflow-backend
pm2 logs cashflow-backend --lines 5 --nostream  # No chokidar errors
```

---

## Phase 5: Legacy Endpoints

### Current State

The 16 legacy HTTP endpoints in `server.js` (lines ~429-1199) still read/write JSON files directly. They are marked deprecated but still functional.

### Recommended Approach

**Update legacy endpoints to use repositories.** This is straightforward since:
- The repository methods return the same data shapes
- Only the data source changes (SQLite instead of JSON)
- The response format can remain as-is (legacy format, not v1 envelope)

### Step 5.1: Update Legacy Routes

For each legacy endpoint in `server.js`:
- Replace `readData()` / `readTasks()` / `readActivityLogs()` calls with repository equivalents
- Replace `writeData()` / `writeTasks()` / `writeActivityLogs()` calls with repository equivalents
- Remove the file-based helper functions from `server.js` once all references are updated

### Step 5.2: Remove Dead Code From `server.js`

After updating legacy routes, remove:
- `readData()`, `writeData()` functions
- `readTasks()`, `writeTasks()` functions
- `readActivityLogs()`, `writeActivityLogs()` functions
- `logActivity()` function (replaced by shared utility)
- `cleanupOldLogs()` function
- `generateTaskId()` function (legacy buggy version)
- `ensureDataFile()` function
- The `DATA_FILE`, `TASKS_FILE`, `ACTIVITY_LOGS_FILE` constants

### Phase 5 Verification

```bash
pm2 restart cashflow-backend

# Test a legacy endpoint still works
curl -s -H "X-Password: 10716255" http://localhost:3001/api/tasks | head -c 100
curl -s -H "X-Password: 10716255" http://localhost:3001/api/cashflow | head -c 100
```

---

## Phase 6: Environment Security

### Step 6.1: Generate Stronger Password

```bash
# Generate a random 32-char password
openssl rand -hex 16
```

### Step 6.2: Update Backend `.env`

```env
PORT=3001
WEB_PASSWORD=<new_password_here>
DATABASE_PATH=/var/www/cashflow-manager/backend/db/cashflow.db
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=a0cec356b67499e2a19027d920f838ae617315b1d08cb30c
```

### Step 6.3: Update Frontend `.env`

```env
VITE_API_URL=/api/v1
VITE_WS_URL=ws://localhost:3001/api/chat
VITE_PASSWORD=<new_password_here>
```

Then rebuild: `cd /var/www/cashflow-manager/frontend && npm run build`

### Step 6.4: Update Emily Skill Files

Replace all occurrences of `X-Password: 10716255` with the new password in:
- `/root/.openclaw/workspace/skills/cashflow-skill/SKILL.md`
- `/root/.openclaw/workspace/skills/task-skill/SKILL.md`

### Phase 6 Verification

```bash
# Test with new password
curl -s -H "X-Password: <new_password>" http://localhost:3001/api/v1/tasks | head -c 50

# Test old password is rejected
curl -s -H "X-Password: 10716255" http://localhost:3001/api/v1/tasks  # Should return 401
```

---

## Rollback Procedure

If anything goes wrong after migration:

### Quick Rollback (< 1 minute)

```bash
# 1. Restore JSON files from backups
cp /root/.openclaw/workspace/cashflow.json.bak /root/.openclaw/workspace/cashflow.json
cp /root/.openclaw/workspace/tasks.json.bak /root/.openclaw/workspace/tasks.json
cp /root/.openclaw/workspace/activity_logs.json.bak /root/.openclaw/workspace/activity_logs.json

# 2. Revert code changes using git
cd /var/www/cashflow-manager/backend
git checkout -- routes/v1/ server.js

# 3. Restart
pm2 restart cashflow-backend
```

### Full Rollback

```bash
# 1. Restore JSON files
cp /root/.openclaw/workspace/*.json.bak /root/.openclaw/workspace/
# Rename: remove .bak extension from each file

# 2. Revert all code (git)
cd /var/www/cashflow-manager
git checkout -- .

# 3. Uninstall better-sqlite3
cd backend && npm uninstall better-sqlite3

# 4. Remove SQLite database
rm -f db/cashflow.db db/cashflow.db-wal db/cashflow.db-shm

# 5. Restart
pm2 restart cashflow-backend
```

---

## File Change Summary

### New Files (Create)

| File | Purpose |
|------|---------|
| `backend/db/index.js` | Database connection singleton |
| `backend/db/schema.sql` | Table definitions |
| `backend/db/migrate.js` | JSON → SQLite migration script |
| `backend/repositories/cashflow.repository.js` | Cashflow data operations |
| `backend/repositories/tasks.repository.js` | Tasks data operations |
| `backend/repositories/activity.repository.js` | Activity log data operations |
| `backend/utils/activity-logger.js` | Shared activity logging utility |

### Modified Files

| File | Changes |
|------|---------|
| `backend/package.json` | Add `better-sqlite3`, add `migrate` script, remove `chokidar` |
| `backend/.env` | Add `DATABASE_PATH` |
| `backend/server.js` | Add db init, remove chokidar, remove file helpers, update legacy routes |
| `backend/routes/v1/cashflow.js` | Replace file ops with repository calls |
| `backend/routes/v1/tasks.js` | Replace file ops with repository calls |
| `backend/routes/v1/activity-logs.js` | Replace file ops with repository calls |
| `backend/swagger.yaml` | No changes needed (API contract unchanged) |
| `frontend/.env` | Update password (Phase 6 only) |
| `skills/cashflow-skill/SKILL.md` | Update password (Phase 6 only) |
| `skills/task-skill/SKILL.md` | Update password (Phase 6 only) |

### Unchanged Files

| File | Reason |
|------|--------|
| `backend/swagger.yaml` | API contract stays the same |
| `backend/gateway-client.js` | No data file references |
| `backend/middleware/response.js` | No data file references |
| `backend/middleware/source.js` | No data file references |
| `frontend/src/**` | No changes needed (API responses identical) |

### Backed Up Files

| Original | Backup |
|----------|--------|
| `/root/.openclaw/workspace/cashflow.json` | `/root/.openclaw/workspace/cashflow.json.bak` |
| `/root/.openclaw/workspace/tasks.json` | `/root/.openclaw/workspace/tasks.json.bak` |
| `/root/.openclaw/workspace/activity_logs.json` | `/root/.openclaw/workspace/activity_logs.json.bak` |

---

## Execution Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
  │          │          │          │          │          │
  │          │          │          │          │          └── Update passwords
  │          │          │          │          └── Update legacy routes in server.js
  │          │          │          └── Remove chokidar
  │          │          └── Update v1 routes to use repos
  │          └── Create repos + shared logger
  └── Install, schema, migrate
```

**Each phase is independently testable and reversible.**

**The server should be restarted after Phase 3 is complete. Phases 1-2 are code-only (no restart needed). Phase 3 is the cutover point.**

---

## Post-Migration Checklist

- [ ] `npm run migrate` completed successfully
- [ ] All v1 endpoints return correct data
- [ ] Sorting works on cashflow (date, category, amount)
- [ ] Sorting works on tasks (id, date, priority)
- [ ] CRUD operations work for cashflow
- [ ] CRUD operations work for tasks
- [ ] Activity logs capture all operations
- [ ] Web app loads and displays data correctly
- [ ] Emily can add/view/delete tasks via Telegram
- [ ] Emily can add/view/delete cashflow via Telegram
- [ ] Swagger UI at /api-docs still works
- [ ] JSON .bak files exist as backup
- [ ] No errors in `pm2 logs cashflow-backend`
