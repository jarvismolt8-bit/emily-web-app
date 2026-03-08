const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true, legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true, legacyHeaders: false
});

const failedLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 3,
  message: { error: 'Too many failed login attempts, account locked for 15 minutes' },
  standardHeaders: true, legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 3,
  message: { error: 'Too many registration attempts' }
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
  message: { error: 'Too many refresh requests' },
  validate: false
});

const unauthenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 50
});

const verifyToken = (req, res, next) => next();

module.exports = {
  securityHeaders,
  apiRateLimiter,
  loginRateLimiter,
  failedLoginRateLimiter,
  registerLimiter,
  refreshLimiter,
  unauthenticatedLimiter,
  verifyToken
};
