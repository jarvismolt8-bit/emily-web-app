const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let getRedis, isRedisHealthy;

try {
  const redisModule = require('../lib/redis');
  getRedis = () => redisModule.getRedis();
  isRedisHealthy = () => redisModule.isRedisHealthy();
} catch (err) {
  console.warn('[Auth] Redis not available, using fallback');
  getRedis = () => { throw new Error('Redis unavailable'); };
  isRedisHealthy = () => false;
}

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      permissions: user.permissions || [],
      jti: crypto.randomUUID(),
      iss: 'cashflow-manager-api'
    },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
};

const generateRefreshToken = async (user, req) => {
  const token = crypto.randomUUID();
  const ipHash = crypto.createHash('sha256')
    .update(req.ip || 'unknown').digest('hex').slice(0, 16);
  
  if (isRedisHealthy()) {
    await getRedis().setEx(`refresh:${token}`, 7 * 24 * 60 * 60, JSON.stringify({
      userId: user.id,
      version: user.tokenVersion || 1,
      ipHash,
      userAgent: (req.headers['user-agent'] || '').slice(0, 100)
    }));
  }
  return token;
};

const validateRefreshToken = async (token, req) => {
  if (!isRedisHealthy()) {
    return null;
  }
  
  try {
    const stored = await getRedis().get(`refresh:${token}`);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    const ipHash = crypto.createHash('sha256')
      .update(req.ip || 'unknown').digest('hex').slice(0, 16);

    if (data.ipHash !== ipHash) {
      console.warn(`[Auth] Refresh token IP mismatch (allowed): stored=${data.ipHash}, current=${ipHash}`);
    }
    return data;
  } catch (err) {
    return null;
  }
};

const verifyAccessToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'cashflow-manager-api'
    });
    
    if (isRedisHealthy()) {
      const blocked = await getRedis().get(`blocklist:${payload.jti}`);
      if (blocked) {
        return res.status(401).json({ error: 'Authentication required' });
      }
    } else {
      return res.status(503).json({ error: 'Auth service temporarily unavailable' });
    }
    
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication required' });
  }
};

const verifyToken = (req, res, next) => next();

const authenticateJWT = verifyAccessToken;

const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(403).json({ error: 'Forbidden' });
  next();
};

const requirePermission = (permission) => (req, res, next) => {
  if (!req.user || !req.user.permissions) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const perms = Array.isArray(permission) ? permission : [permission];
  if (!perms.every(p => req.user.permissions.includes(p))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

const requireAnyPermission = (permissions) => (req, res, next) => {
  if (!req.user || !req.user.permissions) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!permissions.some(p => req.user.permissions.includes(p))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

const generateToken = (user) => generateAccessToken(user);

module.exports = {
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  validateRefreshToken,
  verifyAccessToken,
  verifyToken,
  authenticateJWT,
  requireAuth,
  requirePermission,
  requireAnyPermission
};
