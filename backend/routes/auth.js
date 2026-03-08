const jwt = require('jsonwebtoken');
const { logLoginAttempt } = require('../utils/security-logger');

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      logLoginAttempt(req, false);
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // In production, validate against user database
    // For now, use simple authentication
    const validUsers = [
      { id: '1', username: 'admin', password: 'admin123', email: 'admin@example.com', permissions: ['admin'] },
      { id: '2', username: 'user', password: 'user123', email: 'user@example.com', permissions: ['user'] }
    ];
    
    const user = validUsers.find(u => u.username === username && u.password === password);
    
    if (!user) {
      logLoginAttempt(req, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        permissions: user.permissions,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
      },
      jwtSecret,
      { algorithm: 'HS256' }
    );
    
    logLoginAttempt(req, true);
    
    return res.status(200).json({
      success: true,
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        permissions: user.permissions
      },
      message: 'Authentication successful'
    });
    
  } catch (error) {
    logLoginAttempt(req, false);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }
    
    // In production, check if user already exists
    // For now, create user
    const newUser = {
      id: Date.now().toString(),
      username,
      password,
      email,
      permissions: ['user']
    };
    
    const token = jwt.sign(
      {
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email,
        permissions: newUser.permissions,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
      },
      jwtSecret,
      { algorithm: 'HS256' }
    );
    
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        permissions: newUser.permissions
      },
      message: 'User registered successfully'
    });
    
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  login,
  register
};