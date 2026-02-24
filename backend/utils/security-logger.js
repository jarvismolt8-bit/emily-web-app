const fs = require('fs');
const path = require('path');

const SECURITY_LOG_DIR = '/var/www/cashflow-manager/logs/security';
const AUTH_LOG_FILE = path.join(SECURITY_LOG_DIR, 'auth.log');

function ensureLogDir() {
  if (!fs.existsSync(SECURITY_LOG_DIR)) {
    fs.mkdirSync(SECURITY_LOG_DIR, { recursive: true });
  }
}

function formatLogEntry(entry) {
  const timestamp = new Date().toISOString();
  return JSON.stringify({ ...entry, timestamp }) + '\n';
}

function logAuthEvent(event) {
  ensureLogDir();
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: event.type,
    ip: event.ip || 'unknown',
    user_agent: event.userAgent || 'unknown',
    endpoint: event.endpoint || 'unknown',
    success: event.success,
    details: event.details || {}
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(AUTH_LOG_FILE, logLine);
  } catch (err) {
    console.error('[SecurityLogger] Failed to write to auth log:', err.message);
  }
  
  if (event.success) {
    console.log(`[AUTH] ${event.type} from ${event.ip} - SUCCESS`);
  } else {
    console.log(`[AUTH] ${event.type} from ${event.ip} - FAILED`);
  }
}

function logLoginAttempt(req, success) {
  logAuthEvent({
    type: 'login_attempt',
    ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    endpoint: req.path,
    success: success,
    details: {
      method: req.method
    }
  });
}

module.exports = {
  logAuthEvent,
  logLoginAttempt
};
