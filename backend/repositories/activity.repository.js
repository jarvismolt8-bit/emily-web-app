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
