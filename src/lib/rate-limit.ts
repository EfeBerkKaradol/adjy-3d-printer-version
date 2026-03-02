import { redis } from "./redis";

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60_000, max: 10 }
): Promise<{ success: boolean; remaining: number }> {
  const key = `rate-limit:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) || 0;
    return { success: count <= config.max, remaining: Math.max(0, config.max - count) };
  } catch {
    // Redis down — fail-open
    return { success: true, remaining: config.max };
  }
}
