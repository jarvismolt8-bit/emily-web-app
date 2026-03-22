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

    // Idempotent migration: add archived_at column if missing
    const cols = db.pragma('table_info(tasks)');
    const hasArchivedAt = cols.some(c => c.name === 'archived_at');
    if (!hasArchivedAt) {
      db.exec('ALTER TABLE tasks ADD COLUMN archived_at TEXT NULL');
      db.exec("UPDATE tasks SET archived_at = datetime('now') WHERE status = 'archive' AND archived_at IS NULL");
    }
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
