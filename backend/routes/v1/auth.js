const express = require('express');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken, validateRefreshToken } = require('../../middleware/authentication');
const { failedLoginRateLimiter, loginRateLimiter, refreshLimiter } = require('../../middleware/security');
const { requireNotLocked, recordAttempt } = require('../../middleware/accountLockout');
const { getDb } = require('../../db');

const router = express.Router();

router.post('/login', failedLoginRateLimiter, loginRateLimiter, requireNotLocked, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const loginField = username || email;
    
    if (!loginField || !password) {
      recordAttempt(loginField, false, () => {});
      return res.status(400).json({ error: 'Username or email and password are required' });
    }
    
    const db = getDb();
    const user = db.prepare(`
      SELECT id, username, email, permissions, token_version 
      FROM users 
      WHERE (username = ? OR email = ?) AND password = ?
    `).get(loginField, loginField, crypto.createHash('sha256').update(password).digest('hex'));
    
    if (!user) {
      recordAttempt(loginField, false, () => {});
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Clear lockout on success
    recordAttempt(loginField, true, () => {});
    
    const userObj = {
      id: user.id,
      username: user.username,
      email: user.email,
      permissions: JSON.parse(user.permissions || '[]'),
      tokenVersion: user.token_version
    };
    
    const accessToken = generateAccessToken(userObj);
    const refreshToken = await generateRefreshToken(userObj, req);
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'staging',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth'
    });
    
    return res.status(200).json({
      success: true,
      accessToken,
      user: { id: user.id, username: user.username, email: user.email, permissions: JSON.parse(user.permissions || '[]') }
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    if (req.body?.username || req.body?.email) {
      const loginField = req.body.username || req.body.email;
      recordAttempt(loginField, false, () => {});
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    const data = await validateRefreshToken(refreshToken, req);
    
    if (!data) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    const db = getDb();
    const user = db.prepare('SELECT id, username, email, permissions, token_version FROM users WHERE id = ?').get(data.userId);
    
    if (!user || user.token_version !== data.version) {
      return res.status(401).json({ error: 'Token revoked or invalid' });
    }
    
    const userObj = {
      id: user.id,
      username: user.username,
      email: user.email,
      permissions: JSON.parse(user.permissions || '[]'),
      tokenVersion: user.token_version
    };
    
    const newAccessToken = generateAccessToken(userObj);
    const newRefreshToken = await generateRefreshToken(userObj, req);
    
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'staging',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth'
    });
    
    return res.status(200).json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (refreshToken) {
      try {
        const { getRedis } = require('../../lib/redis');
        await getRedis().del(`refresh:${refreshToken}`);
      } catch (err) {
        console.warn('[Auth] Redis not available for logout');
      }
    }
    
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    
    return res.status(200).json({ success: true, message: 'Logged out' });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/revoke', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    
    if (refreshToken) {
      try {
        const { getRedis } = require('../../lib/redis');
        await getRedis().del(`refresh:${refreshToken}`);
      } catch (err) {
        console.warn('[Auth] Redis not available for revoke');
      }
    }
    
    return res.status(200).json({ success: true, message: 'Token revoked' });
  } catch (error) {
    console.error('[Auth] Revoke error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
