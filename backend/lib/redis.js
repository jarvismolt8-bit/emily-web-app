const { createClient } = require('redis');

let redisClient = null;
let redisConnected = false;

const initRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('[Redis] Reconnect failed after 10 attempts');
            return new Error('Redis reconnect failed');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
      redisConnected = false;
    });

    redisClient.on('ready', () => {
      redisConnected = true;
      console.log('[Redis] Client ready');
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connecting...');
    });

    await redisClient.connect();
    redisConnected = true;
    console.log('[Redis] Connected successfully');
  } catch (err) {
    console.error('[Redis] Init failed:', err.message);
    redisConnected = false;
  }
};

const getRedis = () => {
  if (!redisConnected || !redisClient) {
    throw new Error('Redis unavailable');
  }
  return redisClient;
};

const isRedisHealthy = () => redisConnected;

module.exports = { initRedis, getRedis, isRedisHealthy };
