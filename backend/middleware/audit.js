const pino = require('pino');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const logDir = process.env.NODE_ENV === 'staging'
  ? '/var/log/cashflow-staging'
  : '/var/log/cashflow';

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const auditLogger = pino({
  level: 'info',
  transport: {
    target: 'pino-roll',
    options: {
      file: `${logDir}/audit.log`,
      maxSize: '10m',
      maxFiles: 30,
      compress: true
    }
  }
});

const logAuthEvent = (event) => {
  auditLogger.info({
    type: 'auth_event',
    timestamp: new Date().toISOString(),
    correlationId: crypto.randomUUID(),
    env: process.env.NODE_ENV,
    ...event
  });
};

module.exports = { logAuthEvent };
