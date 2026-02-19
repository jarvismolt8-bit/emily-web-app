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
