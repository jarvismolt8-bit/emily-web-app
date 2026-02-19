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
