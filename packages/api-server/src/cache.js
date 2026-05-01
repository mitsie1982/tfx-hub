// Azure Redis Cache integration
const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL;
const redis = createClient({ url: redisUrl });
redis.connect();

async function getCache(key) {
  return redis.get(key);
}

async function setCache(key, value, ttl = 3600) {
  return redis.set(key, value, { EX: ttl });
}

module.exports = { getCache, setCache };
