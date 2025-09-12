const Redis = require('ioredis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  db: 0,
  retryStrategy: times => Math.min(times * 50, 2000), // tentative de reconnexion
});

redisClient.on('connect', () => {
  console.log('✅ Redis connecté');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

module.exports = redisClient;
