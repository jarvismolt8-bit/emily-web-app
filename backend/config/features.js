module.exports = {
  jwtEnabled: process.env.FEATURE_JWT_ENABLED === 'true',
  legacyPasswordEnabled: process.env.FEATURE_LEGACY_PASSWORD !== 'false',
  redisRequired: process.env.FEATURE_REDIS_REQUIRED === 'true'
};
