import { redis } from "./redis";

// Cache key prefix'leri
export const CACHE_KEYS = {
  PRODUCTS: "cache:products",
  CATEGORIES: "cache:categories",
  ADMIN_STATS: "cache:admin:stats",
  ADMIN_ANALYTICS: "cache:admin:analytics",
  PRODUCT_DETAIL: "cache:product:",
} as const;

// TTL değerleri (saniye)
export const CACHE_TTL = {
  PRODUCTS: 5 * 60,       // 5 dakika
  CATEGORIES: 10 * 60,    // 10 dakika
  ADMIN_STATS: 2 * 60,    // 2 dakika
  ADMIN_ANALYTICS: 10 * 60, // 10 dakika (Vercel API rate limit dostu)
  PRODUCT_DETAIL: 5 * 60, // 5 dakika
} as const;

/**
 * Cache'den veri oku. Redis bağlantısı yoksa veya key yoksa null döner.
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch {
    return null;
  }
}

/**
 * Cache'e veri yaz. Redis bağlantısı yoksa sessizce devam eder.
 */
export async function setCache(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch {
    // Redis kapalıysa sessizce devam et
  }
}

/**
 * Belirli cache key'lerini sil.
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis kapalıysa sessizce devam et
  }
}

/**
 * Tüm ürün cache'lerini temizle (SCAN ile pattern-safe).
 */
export async function invalidateProductCache(): Promise<void> {
  try {
    const keys = await redis.keys("cache:product*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.del(CACHE_KEYS.PRODUCTS);
  } catch {
    // Redis kapalıysa sessizce devam et
  }
}
