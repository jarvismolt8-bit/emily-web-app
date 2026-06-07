const cors = require('cors');

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const monitorNoOrigin = (req, res, next) => {
  if (!req.headers.origin) {
    console.warn(`[CORS] No origin: ${req.method} ${req.url} from ${req.ip}`);
  }
  next();
};

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
});

module.exports = { monitorNoOrigin, corsMiddleware };
