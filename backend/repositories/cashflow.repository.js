const { getDb } = require('../db');
const eventBus = require('../events');

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

    if (sortBy === 'category') {
      sql += ` ORDER BY category ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (sortBy === 'amount') {
      sql += ` ORDER BY amount ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const rows = db.prepare(sql).all(...params);

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

  create(data, source = 'web_app') {
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
    const entry = this.findById(id);
    
    eventBus.emit('cashflow:created', { data: entry, source, timestamp: new Date().toISOString() });
    
    return entry;
  },

  update(id, data, source = 'web_app') {
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
    const entry = this.findById(id);
    
    eventBus.emit('cashflow:updated', { data: entry, source, timestamp: new Date().toISOString() });
    
    return entry;
  },

  delete(id, source = 'web_app') {
    const existing = this.findById(id);
    if (!existing) return null;
    getDb().prepare('DELETE FROM cashflow WHERE id = ?').run(id);
    
    eventBus.emit('cashflow:deleted', { data: existing, source, timestamp: new Date().toISOString() });
    
    return existing;
  }
};

module.exports = cashflowRepo;
