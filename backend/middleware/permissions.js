const { getDb } = require('../db');

const loadUserPermissions = (userId, callback) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT permissions FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      return callback(null, new Error('User not found'));
    }
    
    const permissions = JSON.parse(user.permissions || '[]');
    callback(null, permissions);
  } catch (error) {
    callback(error, null);
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    loadUserPermissions(userId, (err, permissions) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }

      const perms = Array.isArray(permission) ? permission : [permission];
      const hasAll = perms.every(p => permissions.includes(p));

      if (!hasAll) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    });
  };
};

const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    loadUserPermissions(userId, (err, userPerms) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }

      const hasAny = permissions.some(p => userPerms.includes(p));

      if (!hasAny) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    });
  };
};

const hasPermission = (userId, permission) => {
  return new Promise((resolve) => {
    loadUserPermissions(userId, (err, permissions) => {
      if (err) return resolve(false);
      resolve(permissions.includes(permission));
    });
  });
};

module.exports = { loadUserPermissions, requirePermission, requireAnyPermission, hasPermission };
