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
  windowMs: 15 * 60 * 1000, max: 1000,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true, legacyHeaders: false,
  validate: false
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 50,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true, legacyHeaders: false, validate: false
});

const failedLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: 'Too many failed login attempts, account locked for 15 minutes' },
  standardHeaders: true, legacyHeaders: false, validate: false
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 3,
  message: { error: 'Too many registration attempts' }, validate: false
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
  message: { error: 'Too many refresh requests' },
  validate: false
});

const unauthenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 50, validate: false
});

const sseLimiter = rateLimit({
  windowMs: 60 * 1000, max: 100,
  message: { error: 'Too many SSE connections' },
  standardHeaders: true, legacyHeaders: false, validate: false
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
  sseLimiter,
  verifyToken
};
