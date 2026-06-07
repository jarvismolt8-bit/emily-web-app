const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../../db');

const router = express.Router();

const API_KEY_PREFIX = 'cfm_';
const KEY_LENGTH = 32;

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

router.post('/generate', async (req, res) => {
  try {
    const { name, permissions, user_id, expires_in_days } = req.body;
    
    if (!name || !user_id) {
      return res.status(400).json({ error: 'Name and user_id are required' });
    }

    const db = getDb();
    
    const user = db.prepare('SELECT id, permissions FROM users WHERE id = ?').get(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const apiKey = API_KEY_PREFIX + crypto.randomBytes(KEY_LENGTH).toString('hex');
    const keyHash = hashApiKey(apiKey);
    const keyPermissions = permissions || user.permissions || ['read'];
    const expiresAt = expires_in_days 
      ? Math.floor(Date.now() / 1000) + (expires_in_days * 24 * 60 * 60)
      : null;

    db.prepare(`
      INSERT INTO api_keys (key_hash, name, permissions, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      keyHash,
      name,
      JSON.stringify(keyPermissions),
      user_id,
      expiresAt,
      Math.floor(Date.now() / 1000)
    );

    return res.status(201).json({
      success: true,
      apiKey,
      name,
      permissions: keyPermissions,
      expires_at: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
      message: 'Store this key securely - it cannot be retrieved again'
    });
  } catch (error) {
    console.error('[API-Key] Generate error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    const db = getDb();
    let keys;
    
    if (user_id) {
      keys = db.prepare(`
        SELECT id, key_hash, name, permissions, user_id, expires_at, created_at, last_used_at
        FROM api_keys WHERE user_id = ? ORDER BY created_at DESC
      `).all(user_id);
    } else {
      keys = db.prepare(`
        SELECT id, key_hash, name, permissions, user_id, expires_at, created_at, last_used_at
        FROM api_keys ORDER BY created_at DESC
      `).all();
    }

    return res.status(200).json({
      success: true,
      keys: keys.map(k => ({
        id: k.id,
        name: k.name,
        permissions: JSON.parse(k.permissions || '[]'),
        user_id: k.user_id,
        expires_at: k.expires_at,
        created_at: k.created_at,
        last_used_at: k.last_used_at
      }))
    });
  } catch (error) {
    console.error('[API-Key] List error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/revoke/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDb();
    const result = db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    return res.status(200).json({ success: true, message: 'API key revoked' });
  } catch (error) {
    console.error('[API-Key] Revoke error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const verifyApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const keyHash = hashApiKey(apiKey);
    const db = getDb();
    
    const key = db.prepare(`
      SELECT id, name, permissions, user_id, expires_at, last_used_at
      FROM api_keys WHERE key_hash = ?
    `).get(keyHash);

    if (!key) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    if (key.expires_at && key.expires_at < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'API key expired' });
    }

    db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?')
      .run(Math.floor(Date.now() / 1000), key.id);

    req.apiKey = {
      id: key.id,
      name: key.name,
      permissions: JSON.parse(key.permissions || '[]'),
      user_id: key.user_id
    };
    req.user = {
      id: key.user_id,
      permissions: JSON.parse(key.permissions || '[]')
    };
    
    next();
  } catch (error) {
    console.error('[API-Key] Verify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = router;
module.exports.verifyApiKey = verifyApiKey;
