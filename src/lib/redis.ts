import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || "redis://localhost:6379";

  const redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
    // Upstash TLS bağlantısı için (rediss:// protokolü)
    ...(url.startsWith("rediss://") ? { tls: { rejectUnauthorized: false } } : {}),
  });

  redis.on("error", (err) => {
    console.error("[Redis] Bağlantı hatası:", err.message);
  });

  return redis;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
