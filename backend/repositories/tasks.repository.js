const { getDb } = require('../db');

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const tasksRepo = {
  findAll({ sortBy, sortOrder } = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM tasks';

    if (sortBy === 'id') {
      sql += ` ORDER BY CAST(id AS INTEGER) ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (sortBy === 'date') {
      sql += ` ORDER BY CASE WHEN date = '' OR date IS NULL THEN 1 ELSE 0 END, date ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (sortBy === 'priority') {
      sql += ` ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 1 END ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    } else {
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
      INSERT INTO tasks (id, name, description, date, time, status, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      (data.name || '').trim(),
      data.description || '',
      data.date || '',
      data.time || '',
      data.status || 'backlog',
      data.priority || 'medium'
    );
    return this.findById(id);
  },

  update(id, data) {
    const existing = this.findById(id);
    if (!existing) return null;

    const fields = [];
    const params = [];
    for (const key of ['name', 'description', 'date', 'time', 'status', 'priority']) {
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
