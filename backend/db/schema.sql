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

CREATE INDEX IF NOT EXISTS idx_cashflow_date ON cashflow(date);
CREATE INDEX IF NOT EXISTS idx_cashflow_category ON cashflow(category);
CREATE INDEX IF NOT EXISTS idx_cashflow_currency ON cashflow(currency);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_source ON activity_logs(source);
CREATE INDEX IF NOT EXISTS idx_activity_status ON activity_logs(status);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  token_version INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  user_id INTEGER NOT NULL,
  expires_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  last_used_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS account_lockouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  locked_until INTEGER NOT NULL,
  attempt_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_account_lockouts_email ON account_lockouts(email);
