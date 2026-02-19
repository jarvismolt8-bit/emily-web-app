require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'cashflow.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

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

  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log('1. Creating tables...');
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  console.log('   Done.');

  const runMigration = db.transaction(() => {
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

    for (const jsonPath of [CASHFLOW_JSON, TASKS_JSON, ACTIVITY_JSON]) {
      if (fs.existsSync(jsonPath)) {
        const bakPath = jsonPath + '.bak';
        fs.copyFileSync(jsonPath, bakPath);
        console.log(`   ${jsonPath} -> ${bakPath}`);
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
