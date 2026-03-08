const { getDb } = require('../db');

const LOCKOUT_ATTEMPTS = 5;
const BASE_LOCKOUT_MINUTES = 15;

const checkLockout = (email, callback) => {
  try {
    const db = getDb();
    const lockout = db.prepare(`
      SELECT locked_until, attempt_count 
      FROM account_lockouts 
      WHERE email = ?
    `).get(email);

    if (lockout && lockout.locked_until > Math.floor(Date.now() / 1000)) {
      const remaining = Math.ceil((lockout.locked_until - Math.floor(Date.now() / 1000)) / 60);
      return callback({ locked: true, remaining, attempts: lockout.attempt_count });
    }

    if (lockout && lockout.locked_until <= Math.floor(Date.now() / 1000)) {
      db.prepare('DELETE FROM account_lockouts WHERE email = ?').run(email);
    }

    callback({ locked: false, attempts: lockout?.attempt_count || 0 });
  } catch (error) {
    console.error('[Lockout] Check error:', error);
    callback({ locked: false, attempts: 0 });
  }
};

const recordAttempt = (email, success, callback) => {
  try {
    const db = getDb();
    
    if (success) {
      db.prepare('DELETE FROM account_lockouts WHERE email = ?').run(email);
      return callback();
    }

    const lockout = db.prepare('SELECT * FROM account_lockouts WHERE email = ?').get(email);
    const newAttempts = (lockout?.attempt_count || 0) + 1;
    
    if (newAttempts >= LOCKOUT_ATTEMPTS) {
      const lockoutMinutes = BASE_LOCKOUT_MINUTES * (Math.floor(newAttempts / LOCKOUT_ATTEMPTS));
      const lockedUntil = Math.floor(Date.now() / 1000) + (lockoutMinutes * 60);
      
      db.prepare(`
        INSERT OR REPLACE INTO account_lockouts (email, locked_until, attempt_count)
        VALUES (?, ?, ?)
      `).run(email, lockedUntil, newAttempts);
      
      console.log(`[Lockout] Email ${email} locked for ${lockoutMinutes} minutes`);
    } else {
      db.prepare(`
        INSERT OR REPLACE INTO account_lockouts (email, locked_until, attempt_count)
        VALUES (?, ?, ?)
      `).run(email, 0, newAttempts);
    }
    
    callback();
  } catch (error) {
    console.error('[Lockout] Record error:', error);
    callback();
  }
};

const requireNotLocked = async (req, res, next) => {
  const email = req.body.email || req.body.username;
  
  if (!email) {
    return res.status(400).json({ error: 'Email or username required' });
  }

  checkLockout(email, (lockoutInfo) => {
    if (lockoutInfo.locked) {
      return res.status(403).json({ 
        error: 'Account temporarily locked',
        remaining_minutes: lockoutInfo.remaining,
        attempts: lockoutInfo.attempts
      });
    }
    next();
  });
};

module.exports = { checkLockout, recordAttempt, requireNotLocked };
