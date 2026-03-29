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
  description TEXT DEFAULT '',
  archived_at TEXT NULL,
  documentation TEXT DEFAULT '',
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

-- Insight Sessions and Charts (TASK-019)
CREATE TABLE IF NOT EXISTS insight_sessions (
  id TEXT PRIMARY KEY,
  requested_by TEXT NOT NULL,
  prompt TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS insight_charts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  x_axis_label TEXT DEFAULT '',
  y_axis_label TEXT DEFAULT '',
  chart_data TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES insight_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_insight_sessions_created ON insight_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_insight_charts_session ON insight_charts(session_id);
